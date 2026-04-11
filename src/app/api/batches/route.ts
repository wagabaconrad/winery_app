import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessId } from "@/lib/auth";
import { calculateBatchCost, calculateCostPerUnit } from "@/lib/calculations";

export async function GET() {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const batches = await prisma.productionBatch.findMany({
      where: { businessId },
      include: {
        materials: { include: { stockItem: true } },
        expenses: true,
        finishedGoods: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("GET /api/batches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = await request.json();
    const { name, outputQuantity, materials, expenses: linkedExpenses = [], bottleCount, jerrycanCount, canCount } = body;

    if (!name || !outputQuantity) {
      return NextResponse.json(
        { error: "Batch name and output quantity are required" },
        { status: 400 }
      );
    }

    const parsedOutputQty = parseFloat(outputQuantity);
    if (isNaN(parsedOutputQty) || parsedOutputQty <= 0) {
      return NextResponse.json({ error: "Output quantity must be a positive number" }, { status: 400 });
    }

    for (const mat of materials) {
      const qty = parseFloat(mat.quantityUsed);
      const cost = parseFloat(mat.unitCost);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ error: "Material quantity must be a positive number" }, { status: 400 });
      }
      if (isNaN(cost) || cost < 0) {
        return NextResponse.json({ error: "Material unit cost must be a non-negative number" }, { status: 400 });
      }
    }

    // Validate stock availability
    for (const mat of materials) {
      const stock = await prisma.stockItem.findUnique({ where: { id: mat.stockItemId } });
      if (!stock) {
        return NextResponse.json({ error: `Stock item ${mat.stockItemId} not found` }, { status: 404 });
      }
      if (stock.quantity < mat.quantityUsed) {
        return NextResponse.json(
          { error: `Insufficient stock for ${stock.name}. Available: ${stock.quantity}, Required: ${mat.quantityUsed}` },
          { status: 400 }
        );
      }
    }

    // Calculate batch cost (parse strings to numbers in case form sent strings)
    const materialCosts = materials.map((m: { quantityUsed: string | number; unitCost: string | number }) => ({
      quantityUsed: parseFloat(String(m.quantityUsed)),
      unitCost: parseFloat(String(m.unitCost)),
    }));
    const expenseTotal = linkedExpenses.reduce((s: number, e: { amount: string | number }) => s + parseFloat(String(e.amount)), 0);
    const totalCost = calculateBatchCost({ materials: materialCosts, linkedExpenses: expenseTotal });
    const costPerUnit = calculateCostPerUnit(totalCost, parseFloat(outputQuantity));

    // Create batch in a transaction (increased timeout for accounts with many stock items)
    const batch = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Create the batch
      const parsedBottles = bottleCount ? parseInt(bottleCount) : null;
      const parsedJerrycans = jerrycanCount ? parseInt(jerrycanCount) : null;
      const parsedCans = canCount ? parseInt(canCount) : null;

      const newBatch = await tx.productionBatch.create({
        data: {
          businessId,
          name,
          outputQuantity: parseFloat(outputQuantity),
          totalCost,
          costPerUnit,
          bottleCount: parsedBottles && parsedBottles > 0 ? parsedBottles : null,
          jerrycanCount: parsedJerrycans && parsedJerrycans > 0 ? parsedJerrycans : null,
          canCount: parsedCans && parsedCans > 0 ? parsedCans : null,
        },
      });

      // Create material usage and deduct stock
      for (const mat of materials) {
        await tx.rawMaterialUsage.create({
          data: {
            batchId: newBatch.id,
            stockItemId: mat.stockItemId,
            quantityUsed: parseFloat(mat.quantityUsed),
            cost: parseFloat(mat.quantityUsed) * parseFloat(mat.unitCost),
          },
        });

        // Deduct raw material stock
        const stock = await tx.stockItem.findUnique({ where: { id: mat.stockItemId } });
        if (stock) {
          const newQty = stock.quantity - parseFloat(mat.quantityUsed);
          await tx.stockItem.update({
            where: { id: mat.stockItemId },
            data: {
              quantity: newQty,
              totalValue: newQty * stock.unitCost,
            },
          });
        }
      }

      // Create linked expenses
      for (const exp of linkedExpenses) {
        await tx.expense.create({
          data: {
            businessId,
            category: exp.category || "OTHER",
            description: exp.description || null,
            amount: parseFloat(exp.amount),
            linkedBatchId: newBatch.id,
          },
        });
      }

      // Create dedicated FINISHED stock items per batch (one per product form)
      const productForms = [
        { suffix: "Bottles", count: parsedBottles, unit: "bottles" },
        { suffix: "Jerrycans", count: parsedJerrycans, unit: "jerrycans" },
        { suffix: "Cans", count: parsedCans, unit: "cans" },
      ];

      for (const pf of productForms) {
        if (pf.count && pf.count > 0) {
          const itemName = `${name} — ${pf.suffix}`;
          await tx.stockItem.create({
            data: {
              businessId,
              name: itemName,
              category: "FINISHED",
              quantity: pf.count,
              unit: pf.unit,
              unitCost: costPerUnit,
              totalValue: pf.count * costPerUnit,
              sourceBatchId: newBatch.id,
            },
          });
        }
      }

      return newBatch;
    }, { timeout: 30000 });

    // Fetch full batch with relations
    const fullBatch = await prisma.productionBatch.findUnique({
      where: { id: batch.id },
      include: {
        materials: { include: { stockItem: true } },
        expenses: true,
        finishedGoods: true,
      },
    });

    return NextResponse.json(fullBatch, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/batches:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = await request.json();
    const { id, name, outputQuantity, bottleCount, jerrycanCount, canCount } = body;

    if (!id) return NextResponse.json({ error: "Batch ID required" }, { status: 400 });
    if (!name || !outputQuantity) return NextResponse.json({ error: "Name and output quantity required" }, { status: 400 });

    const existing = await prisma.productionBatch.findFirst({ where: { id, businessId } });
    if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const parsedOutputQty = parseFloat(outputQuantity);
    if (isNaN(parsedOutputQty) || parsedOutputQty <= 0) {
      return NextResponse.json({ error: "Output quantity must be a positive number" }, { status: 400 });
    }

    const updated = await prisma.productionBatch.update({
      where: { id },
      data: {
        name,
        outputQuantity: parsedOutputQty,
        costPerUnit: existing.totalCost > 0 ? calculateCostPerUnit(existing.totalCost, parsedOutputQty) : existing.costPerUnit,
        bottleCount: bottleCount ? parseInt(bottleCount) || null : null,
        jerrycanCount: jerrycanCount ? parseInt(jerrycanCount) || null : null,
        canCount: canCount ? parseInt(canCount) || null : null,
      },
      include: { materials: { include: { stockItem: true } }, expenses: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/batches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Batch ID required" }, { status: 400 });

    const existing = await prisma.productionBatch.findFirst({ where: { id, businessId } });
    if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    await prisma.productionBatch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/batches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

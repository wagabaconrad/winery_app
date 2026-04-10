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

    if (!name || !outputQuantity || !materials?.length) {
      return NextResponse.json(
        { error: "Name, output quantity, and at least one material are required" },
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

    // Calculate batch cost
    const materialCosts = materials.map((m: { quantityUsed: number; unitCost: number }) => ({
      quantityUsed: m.quantityUsed,
      unitCost: m.unitCost,
    }));
    const expenseTotal = linkedExpenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0);
    const totalCost = calculateBatchCost({ materials: materialCosts, linkedExpenses: expenseTotal });
    const costPerUnit = calculateCostPerUnit(totalCost, parseFloat(outputQuantity));

    // Create batch in a transaction
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

      // Auto-create/update FINISHED stock items for wine product forms
      const productForms = [
        { name: "Wine Bottles", count: parsedBottles, unit: "bottles" },
        { name: "Wine Jerrycans", count: parsedJerrycans, unit: "jerrycans" },
        { name: "Wine Cans", count: parsedCans, unit: "cans" },
      ];

      for (const pf of productForms) {
        if (pf.count && pf.count > 0) {
          const existing = await tx.stockItem.findFirst({
            where: { businessId, name: pf.name, category: "FINISHED" },
          });

          if (existing) {
            const newQty = existing.quantity + pf.count;
            await tx.stockItem.update({
              where: { id: existing.id },
              data: {
                quantity: newQty,
                unitCost: costPerUnit,
                totalValue: newQty * costPerUnit,
              },
            });
          } else {
            await tx.stockItem.create({
              data: {
                businessId,
                name: pf.name,
                category: "FINISHED",
                quantity: pf.count,
                unit: pf.unit,
                unitCost: costPerUnit,
                totalValue: pf.count * costPerUnit,
              },
            });
          }
        }
      }

      return newBatch;
    });

    // Fetch full batch with relations
    const fullBatch = await prisma.productionBatch.findUnique({
      where: { id: batch.id },
      include: {
        materials: { include: { stockItem: true } },
        expenses: true,
      },
    });

    return NextResponse.json(fullBatch, { status: 201 });
  } catch (error) {
    console.error("POST /api/batches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

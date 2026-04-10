// ─── Core Business Logic Engine ────────────────────────
// Pure functions for financial accuracy — no side effects.

export interface MaterialCost {
  quantityUsed: number;
  unitCost: number;
}

export interface BatchCostInput {
  materials: MaterialCost[];
  linkedExpenses: number; // sum of labor, packaging, other linked expenses
}

/**
 * Calculates total batch production cost.
 * totalBatchCost = Σ(rawMaterialQty × unitCost) + linkedExpenses
 */
export function calculateBatchCost(input: BatchCostInput): number {
  const materialTotal = input.materials.reduce(
    (sum, m) => sum + m.quantityUsed * m.unitCost,
    0
  );
  return round(materialTotal + input.linkedExpenses);
}

/**
 * Calculates cost per unit of output.
 */
export function calculateCostPerUnit(totalCost: number, outputQuantity: number): number {
  if (outputQuantity <= 0) return 0;
  return round(totalCost / outputQuantity);
}

/**
 * Calculates profit.
 * profit = totalRevenue - costOfGoodsSold - generalExpenses
 */
export function calculateProfit(
  totalRevenue: number,
  costOfGoodsSold: number,
  generalExpenses: number = 0
): number {
  return round(totalRevenue - costOfGoodsSold - generalExpenses);
}

/**
 * Calculates recommended selling price given cost and desired margin %.
 * sellingPrice = cost / (1 - margin/100)
 */
export function calculateSellingPrice(costPerUnit: number, marginPercent: number): number {
  if (marginPercent >= 100) return costPerUnit * 10; // safety cap
  return round(costPerUnit / (1 - marginPercent / 100));
}

/**
 * Calculates profit per unit.
 */
export function calculateProfitPerUnit(sellingPrice: number, costPerUnit: number): number {
  return round(sellingPrice - costPerUnit);
}

/**
 * Profit margin percentage.
 */
export function calculateMarginPercent(sellingPrice: number, costPerUnit: number): number {
  if (sellingPrice <= 0) return 0;
  return round(((sellingPrice - costPerUnit) / sellingPrice) * 100);
}

// ─── Unit Conversions ──────────────────────────────────

export function kgToGrams(kg: number): number {
  return round(kg * 1000);
}

export function gramsToKg(g: number): number {
  return round(g / 1000);
}

export function litersToBottles(liters: number, bottleSizeMl: number = 750): number {
  return Math.floor((liters * 1000) / bottleSizeMl);
}

export function bottlesToLiters(bottles: number, bottleSizeMl: number = 750): number {
  return round((bottles * bottleSizeMl) / 1000);
}

export function scaleRecipe(
  originalQty: number,
  originalYield: number,
  desiredYield: number
): number {
  if (originalYield <= 0) return 0;
  return round((originalQty * desiredYield) / originalYield);
}

// ─── Helpers ───────────────────────────────────────────

function round(n: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/**
 * Generates next invoice number with configurable prefix.
 * E.g. INV-0001, INV-0002, EVT-0001, etc.
 */
export function generateInvoiceNumber(lastNumber: string | null, prefix: string = "INV"): string {
  if (!lastNumber) return `${prefix}-0001`;
  const numPart = parseInt(lastNumber.replace(`${prefix}-`, ""), 10);
  return `${prefix}-${String(numPart + 1).padStart(4, "0")}`;
}

/**
 * Calculates event profit (budget minus total cost).
 */
export function calculateEventProfit(customerBudget: number, totalCost: number): number {
  return round(customerBudget - totalCost);
}

/**
 * Calculates cost per plate for catering events.
 */
export function calculatePlateCost(totalCost: number, plateCount: number): number {
  if (plateCount <= 0) return 0;
  return round(totalCost / plateCount);
}

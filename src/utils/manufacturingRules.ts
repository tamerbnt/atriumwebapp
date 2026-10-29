/**
 * Pure Mathematical and Regulatory Calculation Engines
 * Category 12: Light Manufacturing & Workshop Production (Algeria)
 */

import { ManufacturingBomComponent, ManufacturingRoutingStep, RawMaterialStockItem } from '../types';

export interface BomCostBreakdown {
  totalMaterialCostDzd: number;
  totalLaborMachineCostDzd: number;
  totalCostOfProductionDzd: number;
  unitCostDzd: number;
  suggestedSalePriceDzd: number;
}

/**
 * Calculates theoretical BOM cost with component scrap allowance and machine/operator routing rates
 */
export function calculateBomCost(
  components: ManufacturingBomComponent[],
  routingSteps: ManufacturingRoutingStep[] = [],
  batchYield: number = 1,
  targetMarginPercent: number = 35
): BomCostBreakdown {
  const yieldCount = Math.max(1, batchYield);

  // Material cost with scrap allowance: Q * (1 + Scrap%) * UnitCost
  const totalMaterialCostDzd = components.reduce((sum, comp) => {
    const scrapRate = (comp.scrapAllowancePercent || 0) / 100;
    const effectiveQty = comp.quantity * (1 + scrapRate);
    return sum + effectiveQty * comp.unitCostDzd;
  }, 0);

  // Labor & Machine cost from routing steps
  const totalLaborMachineCostDzd = routingSteps.reduce((sum, step) => {
    const setupMinutes = step.setupTimeMinutes || 0;
    const runMinutesTotal = (step.runTimePerUnitMinutes || 0) * yieldCount;
    const totalHours = (setupMinutes + runMinutesTotal) / 60;
    const hourlyRate = (step.operatorRateDzdPerHour || 0) + (step.machineRateDzdPerHour || 0);
    return sum + totalHours * hourlyRate;
  }, 0);

  const totalCostOfProductionDzd = Math.round((totalMaterialCostDzd + totalLaborMachineCostDzd) * 100) / 100;
  const unitCostDzd = Math.round((totalCostOfProductionDzd / yieldCount) * 100) / 100;

  // Margin calculation: Price = Cost / (1 - Margin%)
  const marginFraction = Math.min(0.9, Math.max(0.05, targetMarginPercent / 100));
  const suggestedSalePriceDzd = Math.round((unitCostDzd / (1 - marginFraction)) * 100) / 100;

  return {
    totalMaterialCostDzd: Math.round(totalMaterialCostDzd * 100) / 100,
    totalLaborMachineCostDzd: Math.round(totalLaborMachineCostDzd * 100) / 100,
    totalCostOfProductionDzd,
    unitCostDzd,
    suggestedSalePriceDzd,
  };
}

/**
 * Calculates finished yield percentage and scrap ratio
 */
export function computeScrapYield(
  targetQuantity: number,
  actualGoodQuantity: number,
  scrapQuantity: number
): {
  totalProcessed: number;
  yieldPercent: number;
  scrapPercent: number;
  isExcessiveScrap: boolean; // Flagged if scrap > 10%
} {
  const totalProcessed = Math.max(0, actualGoodQuantity + scrapQuantity);
  if (totalProcessed === 0) {
    return {
      totalProcessed: 0,
      yieldPercent: 0,
      scrapPercent: 0,
      isExcessiveScrap: false,
    };
  }

  const yieldPercent = Math.round((actualGoodQuantity / totalProcessed) * 1000) / 10;
  const scrapPercent = Math.round((scrapQuantity / totalProcessed) * 1000) / 10;

  return {
    totalProcessed,
    yieldPercent,
    scrapPercent,
    isExcessiveScrap: scrapPercent > 10.0,
  };
}

/**
 * Weighted Average Unit Cost (CMUP / PMP) after raw material supplier intake
 * Formula: ((ExistingStock * OldPmp) + (IncomingQty * IncomingPriceHT)) / (ExistingStock + IncomingQty)
 */
export function calculateCmupWeightedAverage(
  existingStock: number,
  existingPmpDzd: number,
  incomingQuantity: number,
  incomingPriceHtDzd: number
): number {
  const safeExistingStock = Math.max(0, existingStock);
  const safeIncomingQty = Math.max(0, incomingQuantity);

  const totalQuantity = safeExistingStock + safeIncomingQty;
  if (totalQuantity <= 0) {
    return Math.max(0, incomingPriceHtDzd);
  }

  const totalValuation = safeExistingStock * existingPmpDzd + safeIncomingQty * incomingPriceHtDzd;
  return Math.round((totalValuation / totalQuantity) * 100) / 100;
}

/**
 * Validates raw material warehouse stock availability prior to launching an OF
 */
export function validateStockAvailabilityForOf(
  components: ManufacturingBomComponent[],
  targetQuantity: number,
  stockInventory: RawMaterialStockItem[]
): {
  canFulfill: boolean;
  missingComponents: Array<{
    materialId: string;
    materialName: string;
    required: number;
    available: number;
    missing: number;
    unit: string;
  }>;
} {
  const inventoryMap = new Map<string, RawMaterialStockItem>();
  stockInventory.forEach((item) => {
    inventoryMap.set(item.id, item);
    inventoryMap.set(item.sku, item);
  });

  const missingComponents: Array<{
    materialId: string;
    materialName: string;
    required: number;
    available: number;
    missing: number;
    unit: string;
  }> = [];

  for (const comp of components) {
    const scrapMultiplier = 1 + (comp.scrapAllowancePercent || 0) / 100;
    const requiredQty = comp.quantity * targetQuantity * scrapMultiplier;

    const stockItem = inventoryMap.get(comp.rawProductId);
    const available = stockItem ? stockItem.availableStock : 0;

    if (available < requiredQty) {
      missingComponents.push({
        materialId: comp.rawProductId,
        materialName: comp.rawProductName,
        required: Math.round(requiredQty * 100) / 100,
        available: Math.round(available * 100) / 100,
        missing: Math.round((requiredQty - available) * 100) / 100,
        unit: comp.unit,
      });
    }
  }

  return {
    canFulfill: missingComponents.length === 0,
    missingComponents,
  };
}

/**
 * Overall Equipment Effectiveness (OEE / TRS) for Machine Work Centers
 */
export function calculateMachineEfficiencyOee(
  operatingMinutes: number,
  plannedMinutes: number,
  totalParts: number,
  scrapParts: number,
  idealCycleTimeMinutes: number
): {
  availabilityPercent: number;
  performancePercent: number;
  qualityPercent: number;
  oeePercent: number;
} {
  if (plannedMinutes <= 0 || operatingMinutes <= 0 || totalParts <= 0) {
    return {
      availabilityPercent: 0,
      performancePercent: 0,
      qualityPercent: 0,
      oeePercent: 0,
    };
  }

  const availability = Math.min(1.0, operatingMinutes / plannedMinutes);
  const performance = Math.min(1.0, (totalParts * idealCycleTimeMinutes) / operatingMinutes);
  const goodParts = Math.max(0, totalParts - scrapParts);
  const quality = goodParts / totalParts;

  const oee = availability * performance * quality * 100;

  return {
    availabilityPercent: Math.round(availability * 1000) / 10,
    performancePercent: Math.round(performance * 1000) / 10,
    qualityPercent: Math.round(quality * 1000) / 10,
    oeePercent: Math.round(oee * 10) / 10,
  };
}

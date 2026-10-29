import test from 'node:test';
import assert from 'node:assert';
import {
  calculateBomCost,
  computeScrapYield,
  calculateCmupWeightedAverage,
  validateStockAvailabilityForOf,
  calculateMachineEfficiencyOee,
} from './manufacturingRules';
import { ManufacturingBomComponent, ManufacturingRoutingStep, RawMaterialStockItem } from '../types';

test('Manufacturing: calculateBomCost with scrap allowance and routing labor/machine hours', () => {
  const components: ManufacturingBomComponent[] = [
    {
      rawProductId: 'raw_steel',
      rawProductName: 'Tôle Acier 15/10e',
      quantity: 2.0, // 2 m2
      unit: 'm2',
      scrapAllowancePercent: 10, // 10% scrap -> effective 2.2 m2
      unitCostDzd: 4000, // 2.2 * 4000 = 8800 DZD
    },
    {
      rawProductId: 'raw_lock',
      rawProductName: 'Serrure Multipoints',
      quantity: 1.0,
      unit: 'piece',
      scrapAllowancePercent: 0,
      unitCostDzd: 15000, // 1 * 15000 = 15000 DZD
    },
  ];

  const routingSteps: ManufacturingRoutingStep[] = [
    {
      id: 'step_1',
      stepNumber: 1,
      workCenterId: 'wc_laser',
      workCenterName: 'Découpe Laser',
      operationName: 'Découpe gabarit',
      setupTimeMinutes: 15,
      runTimePerUnitMinutes: 15, // Total 30 mins for 1 unit = 0.5 hour
      operatorRateDzdPerHour: 1000,
      machineRateDzdPerHour: 3000, // Combined 4000 DZD/h * 0.5h = 2000 DZD
    },
  ];

  const result = calculateBomCost(components, routingSteps, 1, 35);

  // Material: 8800 + 15000 = 23800
  assert.strictEqual(result.totalMaterialCostDzd, 23800);
  // Labor: 2000
  assert.strictEqual(result.totalLaborMachineCostDzd, 2000);
  // Total cost: 25800
  assert.strictEqual(result.totalCostOfProductionDzd, 25800);
  assert.strictEqual(result.unitCostDzd, 25800);
  // Price at 35% margin: 25800 / 0.65 = 39692.31
  assert.strictEqual(result.suggestedSalePriceDzd, 39692.31);
});

test('Manufacturing: calculateCmupWeightedAverage computes real-time PMP on stock receipt', () => {
  // Existing: 100 kg @ 500 DZD = 50,000 DZD
  // Incoming: 50 kg @ 800 DZD = 40,000 DZD
  // Total: 150 kg for 90,000 DZD -> PMP = 600 DZD
  const newPmp = calculateCmupWeightedAverage(100, 500, 50, 800);
  assert.strictEqual(newPmp, 600);

  // Edge case: zero existing stock
  const firstIntakePmp = calculateCmupWeightedAverage(0, 0, 20, 1250);
  assert.strictEqual(firstIntakePmp, 1250);
});

test('Manufacturing: computeScrapYield evaluates conforming pieces and excessive scrap alerts', () => {
  // 95 good, 5 scrap out of 100 total
  const normalRun = computeScrapYield(100, 95, 5);
  assert.strictEqual(normalRun.totalProcessed, 100);
  assert.strictEqual(normalRun.yieldPercent, 95);
  assert.strictEqual(normalRun.scrapPercent, 5);
  assert.strictEqual(normalRun.isExcessiveScrap, false);

  // 80 good, 20 scrap out of 100 total (> 10% scrap)
  const defectiveRun = computeScrapYield(100, 80, 20);
  assert.strictEqual(defectiveRun.yieldPercent, 80);
  assert.strictEqual(defectiveRun.scrapPercent, 20);
  assert.strictEqual(defectiveRun.isExcessiveScrap, true);
});

test('Manufacturing: validateStockAvailabilityForOf detects missing components before release', () => {
  const components: ManufacturingBomComponent[] = [
    {
      rawProductId: 'mat_resin',
      rawProductName: 'Résine Polypropylène',
      quantity: 5, // 5 kg per unit
      unit: 'kg',
      scrapAllowancePercent: 0,
      unitCostDzd: 400,
    },
    {
      rawProductId: 'mat_color',
      rawProductName: 'Colorant Masterbatch',
      quantity: 0.2, // 0.2 kg per unit
      unit: 'kg',
      scrapAllowancePercent: 0,
      unitCostDzd: 2500,
    },
  ];

  const inventory: RawMaterialStockItem[] = [
    {
      id: 'mat_resin',
      accountId: 'acc1',
      businessId: 'biz1',
      branchId: 'br1',
      staffId: 'st1',
      sku: 'RAW-RES-01',
      name: 'Résine Polypropylène',
      category: 'Plastics',
      currentStock: 100,
      allocatedStock: 20,
      availableStock: 80, // available 80 kg
      reorderThreshold: 20,
      unit: 'kg',
      unitCostPmpDzd: 400,
      totalValuationDzd: 40000,
      warehouseLocation: 'Allée A',
      createdAt: '2026-01-01',
    },
    {
      id: 'mat_color',
      accountId: 'acc1',
      businessId: 'biz1',
      branchId: 'br1',
      staffId: 'st1',
      sku: 'RAW-COL-01',
      name: 'Colorant Masterbatch',
      category: 'Chemicals',
      currentStock: 1,
      allocatedStock: 0,
      availableStock: 1, // available only 1 kg
      reorderThreshold: 2,
      unit: 'kg',
      unitCostPmpDzd: 2500,
      totalValuationDzd: 2500,
      warehouseLocation: 'Allée B',
      createdAt: '2026-01-01',
    },
  ];

  // Target 10 units:
  // Resin needed: 10 * 5 = 50 kg (available 80 -> OK)
  // Colorant needed: 10 * 0.2 = 2 kg (available 1 -> MISSING 1 kg)
  const check = validateStockAvailabilityForOf(components, 10, inventory);
  assert.strictEqual(check.canFulfill, false);
  assert.strictEqual(check.missingComponents.length, 1);
  assert.strictEqual(check.missingComponents[0].materialId, 'mat_color');
  assert.strictEqual(check.missingComponents[0].missing, 1);

  // Target 2 units:
  // Resin: 10 kg <= 80 kg, Colorant: 0.4 kg <= 1 kg -> can fulfill!
  const checkPass = validateStockAvailabilityForOf(components, 2, inventory);
  assert.strictEqual(checkPass.canFulfill, true);
  assert.strictEqual(checkPass.missingComponents.length, 0);
});

test('Manufacturing: calculateMachineEfficiencyOee calculates Availability x Performance x Quality', () => {
  // Planned: 480 mins (8 hours)
  // Operating: 420 mins (7 hours) -> Availability = 420 / 480 = 87.5%
  // Total parts: 400 parts with 1 min ideal cycle time in 420 mins -> Performance = 400 / 420 = 95.2%
  // Scrap parts: 20 -> Good: 380 -> Quality = 380 / 400 = 95.0%
  const oee = calculateMachineEfficiencyOee(420, 480, 400, 20, 1.0);
  assert.strictEqual(oee.availabilityPercent, 87.5);
  assert.strictEqual(oee.performancePercent, 95.2);
  assert.strictEqual(oee.qualityPercent, 95.0);
  // OEE: 0.875 * (400/420) * 0.95 = 79.166... -> 79.2%
  assert.strictEqual(oee.oeePercent, 79.2);
});

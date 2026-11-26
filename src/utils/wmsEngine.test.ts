import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateLandedCosts,
  buildDeterministicBarcodeBars,
  computeCycleCountVarianceLine,
  computeReorderSuggestions,
  convertQuantityUnit,
  evaluateFefoConsumption,
  summarizeConsignmentBalances,
  validateSerialAssignment,
} from './wmsEngine';
import type {
  Product,
  WmsConsignmentEntry,
  WmsReorderRule,
  WmsSerialNumber,
  WmsStockLot,
  WmsUnitConversion,
} from '../types/index';

const baseLot = (overrides: Partial<WmsStockLot>): WmsStockLot => ({
  id: 'lot_1',
  accountId: 'acc_demo',
  businessId: 'biz_1',
  branchId: 'br_1',
  warehouseId: 'wh_1',
  productId: 'prod_1',
  productName: 'Huile Moteur 5W40',
  lotNumber: 'LOT-A',
  qtyOnHand: 10,
  qtyReserved: 0,
  unitCostCentimes: 250000,
  recallStatus: 'active',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

test('FEFO picks earliest non-expired lot first and skips expired & recalled lots', () => {
  const lots: WmsStockLot[] = [
    baseLot({ id: 'lot_expired', lotNumber: 'LOT-EXP', expiryDate: '2026-10-15', qtyOnHand: 50 }),
    baseLot({ id: 'lot_recalled', lotNumber: 'LOT-REC', expiryDate: '2026-12-01', recallStatus: 'recalled', qtyOnHand: 50 }),
    baseLot({ id: 'lot_late', lotNumber: 'LOT-LATE', expiryDate: '2027-06-01', qtyOnHand: 15 }),
    baseLot({ id: 'lot_soon', lotNumber: 'LOT-SOON', expiryDate: '2026-12-10', qtyOnHand: 8 }),
  ];

  const res = evaluateFefoConsumption({
    lots,
    productOnHandQty: 123,
    requestedQty: 12,
    refDateIso: '2026-11-26',
    negativeStockPolicy: 'block',
  });

  assert.equal(res.ok, true);
  assert.equal(res.allocations.length, 2);
  assert.equal(res.allocations[0].lotNumber, 'LOT-SOON');
  assert.equal(res.allocations[0].quantity, 8);
  assert.equal(res.allocations[1].lotNumber, 'LOT-LATE');
  assert.equal(res.allocations[1].quantity, 4);
});

test('Explicit consumption of an expired or recalled lot is blocked even when policy is allow', () => {
  const lots: WmsStockLot[] = [
    baseLot({ id: 'lot_exp', lotNumber: 'LOT-EXP', expiryDate: '2026-11-01', qtyOnHand: 20 }),
    baseLot({ id: 'lot_rec', lotNumber: 'LOT-REC', expiryDate: '2027-01-01', recallStatus: 'recalled', qtyOnHand: 20 }),
  ];

  const expRes = evaluateFefoConsumption({
    lots,
    productOnHandQty: 40,
    requestedQty: 2,
    refDateIso: '2026-11-26',
    explicitLotId: 'lot_exp',
    negativeStockPolicy: 'allow',
  });
  assert.equal(expRes.ok, false);
  assert.equal(expRes.errorCode, 'EXPIRED_LOT_BLOCKED');

  const recRes = evaluateFefoConsumption({
    lots,
    productOnHandQty: 40,
    requestedQty: 2,
    refDateIso: '2026-11-26',
    explicitLotId: 'lot_rec',
    negativeStockPolicy: 'allow',
  });
  assert.equal(recRes.ok, false);
  assert.equal(recRes.errorCode, 'RECALLED_LOT_BLOCKED');
});

test('Negative stock policy enforces block vs warn vs allow', () => {
  const lots = [baseLot({ id: 'lot_1', qtyOnHand: 5, expiryDate: '2027-05-01' })];

  const blocked = evaluateFefoConsumption({
    lots,
    productOnHandQty: 5,
    requestedQty: 9,
    refDateIso: '2026-11-26',
    negativeStockPolicy: 'block',
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.errorCode, 'NEGATIVE_STOCK_BLOCKED');

  const warned = evaluateFefoConsumption({
    lots,
    productOnHandQty: 5,
    requestedQty: 9,
    refDateIso: '2026-11-26',
    negativeStockPolicy: 'warn',
  });
  assert.equal(warned.ok, true);
  assert.ok(warned.warningMessage?.includes('4'));
});

test('Unit conversions convert piece <-> carton <-> pallet accurately in both directions', () => {
  const conversions: WmsUnitConversion[] = [
    {
      id: 'uc_1',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      productId: 'prod_1',
      fromUnit: 'carton',
      toBaseUnit: 'piece',
      conversionFactor: 12,
      isDefaultPurchase: true,
      isDefaultSale: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'uc_2',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      fromUnit: 'pallet',
      toBaseUnit: 'piece',
      conversionFactor: 240,
      isDefaultPurchase: false,
      isDefaultSale: false,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const c2p = convertQuantityUnit({
    quantity: 3,
    fromUnit: 'carton',
    toUnit: 'piece',
    conversions,
    productId: 'prod_1',
  });
  assert.equal(c2p.ok, true);
  assert.equal(c2p.convertedQuantity, 36);

  const p2pal = convertQuantityUnit({
    quantity: 480,
    fromUnit: 'piece',
    toUnit: 'pallet',
    conversions,
    productId: 'prod_1',
  });
  assert.equal(p2pal.ok, true);
  assert.equal(p2pal.convertedQuantity, 2);
});

test('Cycle count variance accounts for active sales during count', () => {
  const line = computeCycleCountVarianceLine({
    id: 'cl_1',
    cycleCountId: 'cc_1',
    productId: 'prod_1',
    productName: 'Filtre à huile',
    systemQty: 50,
    activeSalesDeltaQty: 4, // 4 sold while counting
    countedQty: 45,         // 45 physically counted => true variance is -1, not -5
    varianceQty: 0,
    unitCostCentimes: 120000,
    varianceCentimes: 0,
  });

  assert.equal(line.varianceQty, -1);
  assert.equal(line.varianceCentimes, -120000);
});

test('Landed cost allocation conserves exact integer centimes across lines', () => {
  const res = allocateLandedCosts({
    lines: [
      { productId: 'p1', productName: 'Item A', quantity: 10, baseUnitCostCentimes: 100000 },
      { productId: 'p2', productName: 'Item B', quantity: 5, baseUnitCostCentimes: 200000 },
      { productId: 'p3', productName: 'Item C', quantity: 3, baseUnitCostCentimes: 33333 },
    ],
    freightCentimes: 50001,
    customsCentimes: 25000,
    insuranceCentimes: 10000,
    otherCentimes: 0,
    fxRate: 1,
    method: 'by_value',
  });

  const sumAllocated = res.lines.reduce((s, l) => s + l.allocatedExtraCentimes, 0);
  assert.equal(res.totalLandedCentimes, 85001);
  assert.equal(sumAllocated, 85001);
});

test('Reorder rules generate suggested purchase quantities when stock drops below minQty', () => {
  const rules: WmsReorderRule[] = [
    {
      id: 'rr_1',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      warehouseId: 'wh_1',
      productId: 'prod_1',
      productName: 'Huile 5W40',
      minQty: 15,
      maxQty: 60,
      reorderQty: 45,
      preferredSupplierName: 'Naftal Distribution',
      leadTimeDays: 4,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const lots = [baseLot({ id: 'lot_ok', qtyOnHand: 10, expiryDate: '2027-03-01' })];
  const products: Product[] = [];

  const suggestions = computeReorderSuggestions({
    rules,
    products,
    lots,
    refDateIso: '2026-11-26',
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].currentAvailableQty, 10);
  assert.equal(suggestions[0].suggestedOrderQty, 50);
});

test('Consignment ledger summarizes issued, returned, and lost returnable packaging balances', () => {
  const entries: WmsConsignmentEntry[] = [
    {
      id: 'c1',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      partyName: 'SARL Atlas Boissons',
      packagingCode: 'CASIER-24',
      packagingName: 'Casier Plastique 24',
      movementType: 'issued',
      quantity: 40,
      unitDepositCentimes: 50000,
      totalDepositCentimes: 2000000,
      movementDate: '2026-11-20',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c2',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      partyName: 'SARL Atlas Boissons',
      packagingCode: 'CASIER-24',
      packagingName: 'Casier Plastique 24',
      movementType: 'returned',
      quantity: 25,
      unitDepositCentimes: 50000,
      totalDepositCentimes: 1250000,
      movementDate: '2026-11-25',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const summary = summarizeConsignmentBalances(entries);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].netOutstandingQty, 15);
  assert.equal(summary[0].netDepositCentimes, 750000);
});

test('Serial validation rejects duplicate serial numbers and barcode bar builder produces deterministic bars', () => {
  const existing: WmsSerialNumber[] = [
    {
      id: 'sn_1',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      productId: 'prod_1',
      productName: 'Scanner',
      serialNumber: 'SN-2026-001',
      status: 'in_stock',
      createdAt: '',
      updatedAt: '',
    },
  ];
  const dup = validateSerialAssignment({
    existingSerials: existing,
    productId: 'prod_1',
    serialNumber: 'sn-2026-001',
  });
  assert.equal(dup.ok, false);

  const bars = buildDeterministicBarcodeBars('613000123456');
  assert.ok(bars.length > 10);
});

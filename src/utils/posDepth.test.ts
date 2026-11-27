import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canPerformPosActionBySubRole,
  classifyProductExpiry,
  computeKitchenOrderDelta,
  computeRecipeIngredientDeltas,
  computeSplitBillShares,
  evaluatePosVariantAndStock,
  parseScaleBarcodeOrPlu,
  snapshotPosOrderLine,
  summarizeCustomerCarnetBalance,
  validateOpticalPrescription,
  validateTableTransfer,
} from './posDepth.ts';
import type { PosFloorTable, PosKitchenOrder, Product } from '../types/index.ts';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod_1',
    tenantId: 'acc_1',
    facilityId: 'br_1',
    name: 'Tacos XL',
    description: 'Signature tacos',
    price: { amount: 850, currency: 'DZD' },
    cost: { amount: 400, currency: 'DZD' },
    stockQuantity: 25,
    sku: 'TAC-XL',
    category: 'Food',
    reorderLevel: 5,
    isActive: true,
    isPinned: true,
    ...overrides,
  };
}

test('snapshotPosOrderLine freezes unit price & modifier delta independently of later catalog changes', () => {
  const prod = makeProduct({
    price: { amount: 1200, currency: 'DZD' },
    variants: [{ id: 'v_lg', sku: 'TAC-LG', label: 'Large', priceDzd: 1400, stockQuantity: 10, isActive: true }],
  });

  const line = snapshotPosOrderLine({
    product: prod,
    quantity: 2,
    variant: prod.variants![0],
    modifiers: [{ groupId: 'g1', groupName: 'Sauce', optionId: 'o1', optionName: 'Algérienne', priceDeltaDzd: 100 }],
  });

  assert.equal(line.baseUnitPriceDzd, 1400);
  assert.equal(line.modifiersUnitDeltaDzd, 100);
  assert.equal(line.unitPriceDzd, 1500);
  assert.equal(line.lineTotalDzd, 3000);

  // Mutate catalog product price afterwards; snapshot line retains captured price
  prod.variants![0].priceDzd = 1900;
  assert.equal(line.unitPriceDzd, 1500);
  assert.equal(line.lineTotalDzd, 3000);
});

test('computeKitchenOrderDelta detects added, increased, decreased & removed lines cleanly', () => {
  const p1 = makeProduct({ id: 'p1', name: 'Pizza Margherita' });
  const p2 = makeProduct({ id: 'p2', name: 'Coca-Cola', price: { amount: 150, currency: 'DZD' } });
  const p3 = makeProduct({ id: 'p3', name: 'Tiramisu', price: { amount: 450, currency: 'DZD' } });

  const prev = [
    snapshotPosOrderLine({ product: p1, quantity: 2 }),
    snapshotPosOrderLine({ product: p2, quantity: 3 }),
  ];
  const next = [
    snapshotPosOrderLine({ product: p1, quantity: 3 }), // increased +1
    snapshotPosOrderLine({ product: p3, quantity: 1 }), // added +1
    // p2 removed -3
  ];

  const { deltas, hasChanges } = computeKitchenOrderDelta({ previousSnapshot: prev, nextItems: next });
  assert.equal(hasChanges, true);
  assert.equal(deltas.length, 3);
  assert.equal(deltas.find((d) => d.productId === 'p1')?.changeType, 'increased');
  assert.equal(deltas.find((d) => d.productId === 'p1')?.deltaQty, 1);
  assert.equal(deltas.find((d) => d.productId === 'p3')?.changeType, 'added');
  assert.equal(deltas.find((d) => d.productId === 'p2')?.changeType, 'removed');
  assert.equal(deltas.find((d) => d.productId === 'p2')?.deltaQty, -3);
});

test('computeRecipeIngredientDeltas computes BOM raw stock depletion for delta quantities only', () => {
  const bun = makeProduct({ id: 'ing_bun', name: 'Burger Bun', stockQuantity: 100, unit: 'pcs' });
  const patty = makeProduct({ id: 'ing_patty', name: 'Beef Patty', stockQuantity: 60, unit: 'pcs' });
  const burger = makeProduct({
    id: 'dish_burger',
    name: 'Classic Burger',
    stockQuantity: 0,
    recipeBom: [
      { ingredientProductId: 'ing_bun', ingredientName: 'Burger Bun', quantityPerUnit: 1, unit: 'pcs' },
      { ingredientProductId: 'ing_patty', ingredientName: 'Beef Patty', quantityPerUnit: 2, unit: 'pcs' },
    ],
  });

  const deltas = computeRecipeIngredientDeltas({
    products: [bun, patty, burger],
    lineDeltas: [{ productId: 'dish_burger', deltaQty: 3 }],
  });

  assert.equal(deltas.length, 2);
  assert.equal(deltas.find((d) => d.ingredientProductId === 'ing_bun')?.deltaQuantity, 3);
  assert.equal(deltas.find((d) => d.ingredientProductId === 'ing_patty')?.deltaQuantity, 6);
});

test('evaluatePosVariantAndStock enforces wmsNegativeStockPolicy block vs warn vs allow', () => {
  const prod = makeProduct({
    stockQuantity: 2,
    variants: [{ id: 'v_m', sku: 'S-M', label: 'M / Noir', stockQuantity: 2, isActive: true }],
  });

  const blocked = evaluatePosVariantAndStock({
    product: prod,
    variantId: 'v_m',
    requestedQty: 3,
    negativeStockPolicy: 'block',
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'INSUFFICIENT_STOCK');
  assert.equal(blocked.shortfallQty, 1);

  const warned = evaluatePosVariantAndStock({
    product: prod,
    variantId: 'v_m',
    requestedQty: 3,
    negativeStockPolicy: 'warn',
  });
  assert.equal(warned.allowed, true);
  assert.equal(warned.warning, true);
});

test('validateTableTransfer blocks transfer onto occupied table and permits available table', () => {
  const order: PosKitchenOrder = {
    id: 'ord_1',
    branchId: 'br_1',
    orderNumber: 'KDS-001',
    orderChannel: 'dine_in',
    tableId: 'tbl_1',
    tableLabel: 'Table 1',
    kdsStatus: 'sent',
    revision: 1,
    currentItems: [],
    sentSnapshotItems: [],
    deltaItems: [],
    deliveryFeeCentimes: 0,
    discountCentimes: 0,
    tipCentimes: 0,
    subtotalCentimes: 240000,
    totalCentimes: 240000,
    createdAt: '2026-11-27T10:00:00Z',
  };
  const occupiedTable: PosFloorTable = {
    id: 'tbl_2',
    branchId: 'br_1',
    tableCode: 'T2',
    label: 'Table 2',
    zone: 'Main Hall',
    seats: 4,
    status: 'occupied',
    currentOrderId: 'ord_other',
  };
  const freeTable: PosFloorTable = {
    id: 'tbl_3',
    branchId: 'br_1',
    tableCode: 'T3',
    label: 'Table 3',
    zone: 'Terrace',
    seats: 4,
    status: 'available',
  };

  assert.equal(validateTableTransfer({ order, targetTable: occupiedTable }).reason, 'TARGET_TABLE_OCCUPIED');
  assert.equal(validateTableTransfer({ order, targetTable: freeTable }).valid, true);
});

test('computeSplitBillShares preserves exact centimes sum across equal and item-based splits with tips', () => {
  const equal = computeSplitBillShares({
    billSubtotalDzd: 1000,
    tipDzd: 50,
    mode: 'equal',
    splitCount: 3,
  });
  assert.equal(equal.totalPayableCentimes, 105000);
  assert.equal(equal.isBalanced, true);
  assert.equal(equal.shares.reduce((s, x) => s + x.amountCentimes, 0), 105000);

  // Odd centime tie: 100.01 DZD split 2 ways -> 5001 + 5000 = 10001 centimes
  const oddEqual = computeSplitBillShares({
    billSubtotalDzd: 100.01,
    mode: 'equal',
    splitCount: 2,
  });
  assert.equal(oddEqual.isBalanced, true);
  assert.equal(oddEqual.shares[0].amountCentimes + oddEqual.shares[1].amountCentimes, 10001);
});

test('parseScaleBarcodeOrPlu parses EAN-13 weight/price barcodes and PLU*weight shorthand', () => {
  const wScan = parseScaleBarcodeOrPlu('2100452012508');
  assert.equal(wScan.matched, true);
  assert.equal(wScan.mode, 'scale_weight_ean13');
  assert.equal(wScan.pluCode, '00452');
  assert.equal(wScan.weightKg, 1.25);

  const pScan = parseScaleBarcodeOrPlu('2600105008502');
  assert.equal(pScan.matched, true);
  assert.equal(pScan.mode, 'scale_price_ean13');
  assert.equal(pScan.pluCode, '00105');
  assert.equal(pScan.priceDzd, 850);

  const manual = parseScaleBarcodeOrPlu('104*0.75');
  assert.equal(manual.matched, true);
  assert.equal(manual.mode, 'plu_multiplier');
  assert.equal(manual.pluCode, '104');
  assert.equal(manual.weightKg, 0.75);
});

test('classifyProductExpiry flags expired and <=30d expiring items', () => {
  const expiredProd = makeProduct({ expiryDate: '2026-11-20' });
  const soonProd = makeProduct({ expiryDate: '2026-12-10' });
  const freshProd = makeProduct({ expiryDate: '2027-06-01' });

  assert.equal(classifyProductExpiry({ product: expiredProd, todayIso: '2026-11-27' }).status, 'expired');
  assert.equal(classifyProductExpiry({ product: soonProd, todayIso: '2026-11-27' }).status, 'expiring_soon');
  assert.equal(classifyProductExpiry({ product: freshProd, todayIso: '2026-11-27' }).status, 'ok');
});

test('summarizeCustomerCarnetBalance nets repayments against charges and flags over-limit accounts', () => {
  const summaries = summarizeCustomerCarnetBalance([
    {
      id: 'c1',
      branchId: 'br_1',
      customerId: 'cust_a',
      customerName: 'Samir Grocery',
      entryType: 'charge',
      amountCentimes: 450000,
      creditLimitCentimes: 400000,
      reference: 'CARNET-1',
      occurredAt: '2026-11-25T10:00:00Z',
    },
    {
      id: 'c2',
      branchId: 'br_1',
      customerId: 'cust_a',
      customerName: 'Samir Grocery',
      entryType: 'repayment',
      amountCentimes: 100000,
      creditLimitCentimes: 400000,
      reference: 'PAY-1',
      occurredAt: '2026-11-26T10:00:00Z',
    },
  ]);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].currentBalanceCentimes, 350000);
  assert.equal(summaries[0].currentBalanceDzd, 3500);
  assert.equal(summaries[0].overLimit, false);
});

test('validateOpticalPrescription & canPerformPosActionBySubRole enforce optical bounds and sub-role PIN rules', () => {
  assert.equal(
    validateOpticalPrescription({ customerName: 'Lina', odSphere: -1.75, odAxis: 90, osAxis: 185, pdMm: 62 }).errors.includes('OS_AXIS_OUT_OF_RANGE'),
    true
  );
  assert.equal(
    validateOpticalPrescription({ customerName: 'Lina', odSphere: -1.75, odAxis: 90, osSphere: -2.0, osAxis: 85, pdMm: 62 }).valid,
    true
  );

  assert.equal(canPerformPosActionBySubRole('waiter', 'send_to_kitchen').allowed, true);
  assert.equal(canPerformPosActionBySubRole('waiter', 'collect_payment').allowed, false);
  assert.equal(canPerformPosActionBySubRole('kitchen', 'advance_kds_status').allowed, true);
  assert.equal(canPerformPosActionBySubRole('cashier', 'void_order', false).requiresPin, true);
  assert.equal(canPerformPosActionBySubRole('cashier', 'void_order', false).allowed, false);
  assert.equal(canPerformPosActionBySubRole('cashier', 'void_order', true).allowed, true);
});

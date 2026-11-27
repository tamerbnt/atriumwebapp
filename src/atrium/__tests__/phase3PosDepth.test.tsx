import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  selectCurrentPosCreditEntriesFromState,
  selectCurrentPosFloorTablesFromState,
  selectCurrentPosKitchenOrdersFromState,
  selectCurrentPosOpticalPrescriptionsFromState,
  selectCurrentProductsFromState,
  selectCurrentSalesFromState,
  selectCurrentStaffFromState,
  selectCurrentUnifiedPaymentsFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  canPerformPosActionBySubRole,
  classifyProductExpiry,
  computeSplitBillShares,
  parseScaleBarcodeOrPlu,
  snapshotPosOrderLine,
  summarizeCustomerCarnetBalance,
} from '../../utils/posDepth';
import { centimesToDzd } from '../../utils/money';
import { PosRegisterView } from '../../components/screens/pos/PosRegisterView';
import { PosInventoryView } from '../../components/screens/pos/PosInventoryView';
import { PosOrdersView } from '../../components/screens/pos/PosOrdersView';
import { PosFinanceView } from '../../components/screens/pos/PosFinanceView';
import { PosTablesKdsPanel } from '../../components/screens/pos/PosTablesKdsPanel';
import { PosCarnetOpticalPanel } from '../../components/screens/pos/PosCarnetOpticalPanel';
import { PosSplitTipModal } from '../../components/screens/pos/PosSplitTipModal';
import { PosVariantModifierModal } from '../../components/screens/pos/PosVariantModifierModal';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 3 Step 3 (7.3 pos_inventory) — Deep Retail, F&B, KDS, Carnet & Optical Integration', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('en');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
    const posBiz = getGlobalState().businesses.find((b) => b.category === 'pos_inventory');
    expect(posBiz).toBeTruthy();
    if (posBiz) {
      switchBusinessAction(posBiz.id);
    }
  });

  it('snapshots variants/modifiers, computes KDS REV deltas, depletes BOM only by incremental delta, and restores BOM on PIN void', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const rawBeef = actions.addProduct({
      name: 'Wagyu Patty Raw',
      description: 'Kitchen ingredient',
      category: 'Raw Material',
      sku: 'RAW-PATTY-01',
      barcode: 'RAW-PATTY-01',
      cost: { amount: 250, currency: 'DZD' },
      costPrice: 250,
      price: { amount: 0, currency: 'DZD' },
      stockQuantity: 20,
      reorderLevel: 5,
      unit: 'pcs',
      isPinned: false,
      isActive: true,
    });

    const burger = actions.addProduct({
      name: 'Signature Burger',
      description: 'Double smash',
      category: 'Burgers',
      sku: 'BRG-01',
      barcode: 'BRG-01',
      cost: { amount: 400, currency: 'DZD' },
      costPrice: 400,
      price: { amount: 900, currency: 'DZD' },
      stockQuantity: 0,
      reorderLevel: 0,
      unit: 'pcs',
      variants: [
        { id: 'v_single', label: 'Single', sku: 'BRG-01-S', priceDzd: 900, stockQuantity: 50, isActive: true },
        { id: 'v_double', label: 'Double', sku: 'BRG-01-D', priceDzd: 1200, stockQuantity: 50, isActive: true },
      ],
      modifierGroups: [
        {
          id: 'mg_sauce',
          name: 'Sauce',
          multiSelect: true,
          required: false,
          options: [{ id: 'opt_truffle', name: 'Truffle Mayo', priceDeltaDzd: 150 }],
        },
      ],
      recipeBom: [
        {
          ingredientProductId: rawBeef.id,
          ingredientName: rawBeef.name,
          quantityPerUnit: 2,
          unit: 'pcs',
        },
      ],
      isPinned: true,
      isActive: true,
    });

    const table1 = actions.upsertPosFloorTable({
      tableCode: 'T1',
      label: 'Terrace T1',
      zone: 'Terrace',
      seats: 4,
    });

    // Build initial snapshot line: Double (1200) + Truffle Mayo (150) = 1350 DZD x 2 = 2700 DZD
    const lineRev1 = snapshotPosOrderLine({
      product: burger,
      quantity: 2,
      variant: burger.variants![1],
      modifiers: [
        {
          groupId: 'mg_sauce',
          groupName: 'Sauce',
          optionId: 'opt_truffle',
          optionName: 'Truffle Mayo',
          priceDeltaDzd: 150,
        },
      ],
    });
    expect(lineRev1.unitPriceDzd).toBe(1350);
    expect(lineRev1.lineTotalDzd).toBe(2700);

    const kdsRev1 = actions.sendPosKitchenOrder({
      orderChannel: 'dine_in',
      tableId: table1.id,
      items: [lineRev1],
      notes: 'No pickles',
    });
    expect(kdsRev1.revision).toBe(1);
    expect(kdsRev1.tableLabel).toBe('Terrace T1');

    // Initial BOM depletion: 2 burgers * 2 patties = 4 patties used -> 16 left
    let pattyAfterRev1 = selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === rawBeef.id);
    expect(pattyAfterRev1?.stockQuantity).toBe(16);

    // Increase quantity to 3 on the same ticket -> REV #2 delta = +1 burger -> only +2 extra patties depleted (14 left)
    const lineRev2 = snapshotPosOrderLine({
      product: burger,
      quantity: 3,
      variant: burger.variants![1],
      modifiers: lineRev1.modifiers,
    });
    const kdsRev2 = actions.sendPosKitchenOrder({
      orderId: kdsRev1.id,
      orderChannel: 'dine_in',
      tableId: table1.id,
      items: [lineRev2],
    });
    expect(kdsRev2.revision).toBe(2);
    expect(kdsRev2.deltaItems.length).toBe(1);
    expect(kdsRev2.deltaItems[0].changeType).toBe('increased');
    expect(kdsRev2.deltaItems[0].deltaQty).toBe(1);

    const pattyAfterRev2 = selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === rawBeef.id);
    expect(pattyAfterRev2?.stockQuantity).toBe(14);

    // Historical line snapshot immutability even if catalog price rises later
    expect(kdsRev2.sentSnapshotItems[0].unitPriceDzd).toBe(1350);

    // Void without PIN must be rejected; with PIN restores full 6 patties -> 20 left and frees table
    const unverifiedVoid = actions.voidPosKitchenOrder({
      orderId: kdsRev2.id,
      reason: 'Customer left',
      pinVerified: false,
    });
    expect(unverifiedVoid.success).toBe(false);

    const verifiedVoid = actions.voidPosKitchenOrder({
      orderId: kdsRev2.id,
      reason: 'Kitchen mistake',
      pinVerified: true,
    });
    expect(verifiedVoid.success).toBe(true);

    const pattyRestored = selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === rawBeef.id);
    expect(pattyRestored?.stockQuantity).toBe(20);
    const freedTable = selectCurrentPosFloorTablesFromState(getGlobalState()).find((t) => t.id === table1.id);
    expect(freedTable?.status).toBe('available');
  });

  it('blocks table transfer onto occupied tables and frees source table on valid move', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const prod = actions.addProduct({
      name: 'Espresso',
      description: 'Hot drink',
      category: 'Drinks',
      sku: 'ESP-01',
      barcode: 'ESP-01',
      cost: { amount: 40, currency: 'DZD' },
      costPrice: 40,
      price: { amount: 200, currency: 'DZD' },
      stockQuantity: 100,
      reorderLevel: 5,
      unit: 'cup',
      isPinned: false,
      isActive: true,
    });

    const tA = actions.upsertPosFloorTable({ tableCode: 'TA', label: 'Table A', seats: 2 });
    const tB = actions.upsertPosFloorTable({ tableCode: 'TB', label: 'Table B', seats: 4 });
    const tC = actions.upsertPosFloorTable({ tableCode: 'TC', label: 'Table C', seats: 6 });

    const orderA = actions.sendPosKitchenOrder({
      orderChannel: 'dine_in',
      tableId: tA.id,
      items: [snapshotPosOrderLine({ product: prod, quantity: 2 })],
    });
    actions.sendPosKitchenOrder({
      orderChannel: 'dine_in',
      tableId: tB.id,
      items: [snapshotPosOrderLine({ product: prod, quantity: 1 })],
    });

    const blockedMove = actions.transferPosOrderTable(orderA.id, tB.id);
    expect(blockedMove.success).toBe(false);
    if (!blockedMove.success) {
      expect(blockedMove.error).toBe('TARGET_TABLE_OCCUPIED');
    }

    const okMove = actions.transferPosOrderTable(orderA.id, tC.id);
    expect(okMove.success).toBe(true);

    const tables = selectCurrentPosFloorTablesFromState(getGlobalState());
    expect(tables.find((t) => t.id === tA.id)?.status).toBe('available');
    expect(tables.find((t) => t.id === tC.id)?.status).toBe('occupied');
    expect(
      selectCurrentPosKitchenOrdersFromState(getGlobalState()).find((o) => o.id === orderA.id)?.tableId
    ).toBe(tC.id);
  });

  it('settles KDS delivery/tip/split bills without double-depleting BOM, writes Carnet ledger & repayment payment, and enforces PIN void on sales', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const flour = actions.addProduct({
      name: 'Pizza Flour 1kg',
      description: 'Raw material',
      category: 'Raw Material',
      sku: 'FLR-01',
      barcode: 'FLR-01',
      cost: { amount: 120, currency: 'DZD' },
      costPrice: 120,
      price: { amount: 0, currency: 'DZD' },
      stockQuantity: 30,
      reorderLevel: 5,
      unit: 'kg',
      isPinned: false,
      isActive: true,
    });

    const pizza = actions.addProduct({
      name: 'Margherita',
      description: 'Wood oven',
      category: 'Pizza',
      sku: 'PIZ-01',
      barcode: 'PIZ-01',
      cost: { amount: 300, currency: 'DZD' },
      costPrice: 300,
      price: { amount: 1100, currency: 'DZD' },
      stockQuantity: 10,
      reorderLevel: 2,
      unit: 'pcs',
      recipeBom: [{ ingredientProductId: flour.id, ingredientName: flour.name, quantityPerUnit: 0.5, unit: 'kg' }],
      isPinned: true,
      isActive: true,
    });

    const table = actions.upsertPosFloorTable({ tableCode: 'T9', label: 'VIP 9', seats: 4 });
    const kds = actions.sendPosKitchenOrder({
      orderChannel: 'dine_in',
      tableId: table.id,
      customerName: 'Karim Mansouri',
      customerPhone: '0550778899',
      items: [snapshotPosOrderLine({ product: pizza, quantity: 2 })],
    });
    // BOM depleted at send: 2 * 0.5kg = 1kg -> flour = 29
    expect(selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === flour.id)?.stockQuantity).toBe(29);

    const splitPreview = computeSplitBillShares({
      billSubtotalDzd: 2200,
      tipDzd: 300,
      mode: 'equal',
      splitCount: 2,
    });
    expect(splitPreview.isBalanced).toBe(true);
    expect(splitPreview.totalPayableDzd).toBe(2500);

    const settled = actions.settlePosKitchenOrder({
      orderId: kds.id,
      paymentMethod: 'Split',
      tipDzd: 300,
      payments: [
        { method: 'Cash', amount: 1500 },
        { method: 'Credit', amount: 1000 },
      ],
      customerName: 'Karim Mansouri',
      customerPhone: '0550778899',
    });
    expect(settled.success).toBe(true);
    if (!settled.success) return;

    // Settlement of a KDS order has recipeAlreadyDepleted=true so flour stays 29 (not 28), while finished pizza drops 10 -> 8
    expect(selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === flour.id)?.stockQuantity).toBe(29);
    expect(selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === pizza.id)?.stockQuantity).toBe(8);
    expect(settled.sale.tipAmount).toBe(300);

    // Split payment containing 'Credit' auto-records Carnet charge (1000 DZD), and repayment creates linked unifiedPayment
    actions.recordPosCarnetEntry({
      customerName: 'Karim Mansouri',
      customerPhone: '0550778899',
      entryType: 'repayment',
      amountDzd: 600,
      paymentMethod: 'Cash',
      notes: 'Partial settlement',
    });
    const carnetSummaries = summarizeCustomerCarnetBalance(
      selectCurrentPosCreditEntriesFromState(getGlobalState())
    );
    const karimSummary = carnetSummaries.find((c) => c.customerName === 'Karim Mansouri');
    expect(karimSummary).toBeTruthy();
    expect(centimesToDzd(karimSummary!.totalChargedCentimes)).toBe(1000);
    expect(centimesToDzd(karimSummary!.totalRepaidCentimes)).toBe(600);
    expect(karimSummary!.currentBalanceDzd).toBe(400);
    expect(
      selectCurrentUnifiedPaymentsFromState(getGlobalState()).some(
        (p) => p.sourceVertical === 'pos_inventory' && p.partyName === 'Karim Mansouri'
      )
    ).toBe(true);

    // Direct PIN-gated sale void rejects missing PIN and restores pizza + flour when PIN verified
    const blockedSaleVoid = actions.voidPosSaleWithPin({
      saleId: settled.sale.id,
      reason: 'Mistake',
      pinVerified: false,
    });
    expect(blockedSaleVoid.success).toBe(false);

    const okSaleVoid = actions.voidPosSaleWithPin({
      saleId: settled.sale.id,
      reason: 'Duplicate ticket',
      pinVerified: true,
    });
    expect(okSaleVoid.success).toBe(true);
    expect(selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === pizza.id)?.stockQuantity).toBe(10);
    expect(selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === flour.id)?.stockQuantity).toBe(30);
    expect(
      selectCurrentSalesFromState(getGlobalState()).find((s) => s.id === settled.sale.id)?.status
    ).toBe('Voided');
  });

  it('validates Optical Rx records, parses scale PLU barcodes, classifies expiry, and enforces Waiter/Kitchen/Cashier sub-role bounds', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const invalidRx = actions.upsertOpticalPrescription({
      customerName: 'Sonia Optique',
      odSphere: -2.25,
      odCylinder: -0.75,
      odAxis: 220, // invalid (> 180)
      pdMm: 63,
      prescribedAt: '2026-11-27',
      labStatus: 'measured',
    });
    expect(invalidRx.success).toBe(false);
    if (!invalidRx.success) {
      expect(invalidRx.errors).toContain('OD_AXIS_OUT_OF_RANGE');
    }

    const validRx = actions.upsertOpticalPrescription({
      customerName: 'Sonia Optique',
      customerPhone: '0551445566',
      odSphere: -2.25,
      odCylinder: -0.75,
      odAxis: 90,
      osSphere: -1.75,
      osCylinder: -0.5,
      osAxis: 85,
      pdMm: 63,
      frameModel: 'RAY-4021',
      lensType: 'Anti-Reflective Blue Cut',
      prescribedAt: '2026-11-27',
      labStatus: 'ordered_lab',
    });
    expect(validRx.success).toBe(true);
    expect(selectCurrentPosOpticalPrescriptionsFromState(getGlobalState()).length).toBe(1);

    const scaleWeight = parseScaleBarcodeOrPlu('2100104012508');
    expect(scaleWeight.matched).toBe(true);
    expect(scaleWeight.mode).toBe('scale_weight_ean13');
    expect(scaleWeight.pluCode).toBe('00104');
    expect(scaleWeight.weightKg).toBe(1.25);

    const pluStar = parseScaleBarcodeOrPlu('104*0.75');
    expect(pluStar.matched).toBe(true);
    expect(pluStar.weightKg).toBe(0.75);

    const expiringProd = actions.addProduct({
      name: 'Fresh Milk 1L',
      description: 'Dairy',
      category: 'Grocery',
      sku: 'MLK-01',
      barcode: 'MLK-01',
      cost: { amount: 90, currency: 'DZD' },
      costPrice: 90,
      price: { amount: 120, currency: 'DZD' },
      stockQuantity: 15,
      reorderLevel: 3,
      expiryDate: '2026-12-05',
      isWeighted: false,
      isPinned: false,
      isActive: true,
    });
    const expEval = classifyProductExpiry({
      product: expiringProd,
      todayIso: '2026-11-27',
      warningDays: 30,
    });
    expect(expEval.status).toBe('expiring_soon');

    // Operational POS sub-role permissions
    expect(canPerformPosActionBySubRole('waiter', 'send_to_kitchen').allowed).toBe(true);
    expect(canPerformPosActionBySubRole('waiter', 'collect_payment').allowed).toBe(false);
    expect(canPerformPosActionBySubRole('kitchen', 'advance_kds_status').allowed).toBe(true);
    expect(canPerformPosActionBySubRole('kitchen', 'collect_payment').allowed).toBe(false);
    expect(canPerformPosActionBySubRole('cashier', 'collect_payment').allowed).toBe(true);
    expect(canPerformPosActionBySubRole('cashier', 'void_order', false).allowed).toBe(false);
    expect(canPerformPosActionBySubRole('cashier', 'void_order', true).allowed).toBe(true);

    // Sub-role switcher updates state without mutating RBAC golden matrix
    actions.setActivePosSubRole('waiter');
    expect(getGlobalState().activePosSubRole).toBe('waiter');
  });

  it('renders all POS screens and Phase 3 modals/panels cleanly without NaN or crashes', () => {
    const state = getGlobalState();
    const products = selectCurrentProductsFromState(state);
    const tables = selectCurrentPosFloorTablesFromState(state);
    const orders = selectCurrentPosKitchenOrdersFromState(state);
    const entries = selectCurrentPosCreditEntriesFromState(state);
    const rxs = selectCurrentPosOpticalPrescriptionsFromState(state);
    const staff = selectCurrentStaffFromState(state);

    const regHtml = renderToStaticMarkup(<PosRegisterView />);
    expect(regHtml).toContain('Tables');
    expect(regHtml).not.toContain('NaN');

    const invHtml = renderToStaticMarkup(<PosInventoryView />);
    expect(invHtml).not.toContain('NaN');

    const ordHtml = renderToStaticMarkup(<PosOrdersView />);
    expect(ordHtml).toContain('Carnet');
    expect(ordHtml).not.toContain('NaN');

    const finHtml = renderToStaticMarkup(<PosFinanceView />);
    expect(finHtml).not.toContain('NaN');

    const kdsHtml = renderToStaticMarkup(
      <PosTablesKdsPanel
        floorTables={tables}
        kitchenOrders={orders}
        activeSubRole="cashier"
        selectedTableId=""
        onSelectTableForRegister={() => {}}
        onUpsertFloorTable={() => {}}
        onUpdateKdsStatus={() => {}}
        onTransferTable={() => ({ success: true })}
        onLoadOrderIntoRegister={() => {}}
        onOpenSettleOrder={() => {}}
        onVoidKitchenOrder={() => ({ success: true })}
      />
    );
    expect(kdsHtml).toContain('Floor Plan');
    expect(kdsHtml).not.toContain('NaN');

    const carnetHtml = renderToStaticMarkup(
      <PosCarnetOpticalPanel
        mode="carnet"
        entries={entries}
        prescriptions={rxs}
        members={[]}
        onRecordCarnetEntry={() => {}}
        onUpsertOpticalRx={() => ({ success: true })}
      />
    );
    expect(carnetHtml).toContain('Carnet');
    expect(carnetHtml).not.toContain('NaN');

    const splitHtml = renderToStaticMarkup(
      <PosSplitTipModal
        isOpen
        onClose={() => {}}
        subtotalDzd={2500}
        discountDzd={0}
        taxDzd={0}
        orderChannel="dine_in"
        hasCustomerSelected
        hasOpenCashSession
        onQuickOpenCashDrawer={() => {}}
        staff={staff}
        onConfirm={() => {}}
      />
    );
    expect(splitHtml).toContain('Tip');
    expect(splitHtml).not.toContain('NaN');

    if (products[0]) {
      const modHtml = renderToStaticMarkup(
        <PosVariantModifierModal
          isOpen
          onClose={() => {}}
          product={products[0]}
          onConfirm={() => {}}
        />
      );
      expect(modHtml).not.toContain('NaN');
    }
  });
});

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  loginWithPinAction,
  setLanguageAction,
  useAtriumStore,
} from '../../services/store';
import { summarizeConsignmentBalances } from '../../utils/wmsEngine';
import { WmsWorkspace } from '../../components/common/wms/WmsWorkspace';
import { WmsBarcodePrintModal } from '../../components/common/wms/WmsBarcodePrintModal';
import { TradingInventoryView } from '../../components/screens/trading/TradingInventoryView';
import { PosInventoryView } from '../../components/screens/pos/PosInventoryView';

function readStoreSnapshot() {
  let snap: ReturnType<typeof useAtriumStore> | null = null;
  const Probe: React.FC = () => {
    snap = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  return snap!;
}

describe('Phase 2 Step 5 (6.6): Shared Inventory / WMS Services', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    atriumActions.resetAllData();
    setLanguageAction('fr');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
  });

  it('enforces FEFO picking, skips expired/recalled lots, converts units, and applies negative stock policy', () => {
    atriumActions.addProduct({
      name: 'Amoxicilline 500mg',
      description: 'Antibiotique boîte',
      sku: 'AMX-500',
      category: 'Other',
      price: { amount: 450, currency: 'DZD' },
      cost: { amount: 250, currency: 'DZD' },
      stockQuantity: 0,
      reorderLevel: 5,
      unit: 'piece',
      isActive: true,
      isPinned: false,
    });

    const snap0 = readStoreSnapshot();
    const product = snap0.products.find((p) => p.sku === 'AMX-500')!;
    expect(product).toBeDefined();
    const wh1 = snap0.warehouses[0]?.id;

    // 1. Expired lot (2024-01-01) must be skipped
    const expiredLot = atriumActions.upsertWmsStockLot({
      warehouseId: wh1,
      productId: product.id,
      lotNumber: 'LOT-EXP',
      expiryDate: '2024-01-01',
      qtyOnHand: 20,
      unitCostCentimes: 20000,
    });
    // 2. Quarantined/recalled lot must be skipped
    const recalledLot = atriumActions.upsertWmsStockLot({
      warehouseId: wh1,
      productId: product.id,
      lotNumber: 'LOT-REC',
      expiryDate: '2027-06-01',
      qtyOnHand: 15,
      unitCostCentimes: 22000,
    });
    atriumActions.setWmsLotRecallStatus(recalledLot.id, 'recalled', 'Lot recall QA-01');

    // 3. Earliest sellable active lot
    const soonLot = atriumActions.upsertWmsStockLot({
      warehouseId: wh1,
      productId: product.id,
      lotNumber: 'LOT-SOON',
      expiryDate: '2027-08-15',
      qtyOnHand: 14,
      unitCostCentimes: 25000,
    });
    // 4. Later sellable active lot
    const laterLot = atriumActions.upsertWmsStockLot({
      warehouseId: wh1,
      productId: product.id,
      lotNumber: 'LOT-LATER',
      expiryDate: '2028-02-01',
      qtyOnHand: 20,
      unitCostCentimes: 26000,
    });

    // Register unit conversion: 1 carton = 12 piece
    atriumActions.upsertWmsUnitConversion({
      productId: product.id,
      fromUnit: 'carton',
      toBaseUnit: 'piece',
      conversionFactor: 12,
    });

    // Consume 1 carton (= 12 piece): should come exclusively from LOT-SOON (earliest valid expiry)
    const dispatchRes = atriumActions.consumeWmsStockAtomic({
      productId: product.id,
      quantity: 1,
      unit: 'carton',
      warehouseId: wh1,
      referenceDoc: 'BL-FEFO-1',
    });
    expect(dispatchRes.ok).toBe(true);
    expect(dispatchRes.convertedBaseQty).toBe(12);
    expect(dispatchRes.allocations).toHaveLength(1);
    expect(dispatchRes.allocations[0]?.lotId).toBe(soonLot.id);
    expect(dispatchRes.allocations[0]?.quantity).toBe(12);

    const afterConsume = readStoreSnapshot();
    expect(afterConsume.wmsStockLots.find((l) => l.id === expiredLot.id)?.qtyOnHand).toBe(20);
    expect(afterConsume.wmsStockLots.find((l) => l.id === recalledLot.id)?.qtyOnHand).toBe(15);
    expect(afterConsume.wmsStockLots.find((l) => l.id === soonLot.id)?.qtyOnHand).toBe(2);
    expect(afterConsume.wmsStockLots.find((l) => l.id === laterLot.id)?.qtyOnHand).toBe(20);

    // Block policy rejects consuming beyond remaining sellable lots (2 + 20 = 22)
    atriumActions.setWmsNegativeStockPolicy('block');
    const blockedRes = atriumActions.consumeWmsStockAtomic({
      productId: product.id,
      quantity: 50,
      warehouseId: wh1,
    });
    expect(blockedRes.ok).toBe(false);
    expect(blockedRes.errorCode).toBe('NEGATIVE_STOCK_BLOCKED');

    // Warn policy permits with warningMessage
    atriumActions.setWmsNegativeStockPolicy('warn');
    const warnRes = atriumActions.consumeWmsStockAtomic({
      productId: product.id,
      quantity: 25,
      warehouseId: wh1,
    });
    expect(warnRes.ok).toBe(true);
    expect(warnRes.warningMessage).toBeDefined();

    // Allow policy permits without error
    atriumActions.setWmsNegativeStockPolicy('allow');
    const allowRes = atriumActions.consumeWmsStockAtomic({
      productId: product.id,
      quantity: 3,
      warehouseId: wh1,
    });
    expect(allowRes.ok).toBe(true);
  });

  it('rejects duplicate serial numbers per product and tracks serial status lifecycle', () => {
    atriumActions.addProduct({
      name: 'Scanner Code-Barres Zebra',
      description: 'Douchette sans fil',
      sku: 'ZEBRA-1D',
      category: 'Equipment',
      price: { amount: 12000, currency: 'DZD' },
      cost: { amount: 8500, currency: 'DZD' },
      stockQuantity: 5,
      reorderLevel: 2,
      unit: 'piece',
      isActive: true,
      isPinned: false,
    });
    const snap0 = readStoreSnapshot();
    const product = snap0.products.find((p) => p.sku === 'ZEBRA-1D')!;
    expect(product).toBeDefined();

    const bin = atriumActions.upsertWmsBin({
      warehouseId: snap0.warehouses[0]?.id || 'wh_default',
      code: 'A-01-01',
      name: 'Allée A Rack 1',
      zone: 'Zone A',
      isDefault: true,
    });
    expect(bin.code).toBe('A-01-01');

    const firstReg = atriumActions.registerWmsSerialNumber({
      productId: product.id,
      serialNumber: 'SN-DZ-2026-0001',
      binId: bin.id,
    });
    expect(firstReg.ok).toBe(true);
    expect(firstReg.serial?.status).toBe('in_stock');

    const dupReg = atriumActions.registerWmsSerialNumber({
      productId: product.id,
      serialNumber: 'sn-dz-2026-0001',
    });
    expect(dupReg.ok).toBe(false);
    expect(dupReg.errorMessage).toBeTruthy();

    const soldSerial = atriumActions.updateWmsSerialStatus(
      firstReg.serial!.id,
      'sold',
      'sale_ref_1'
    );
    expect(soldSerial?.status).toBe('sold');
    expect(soldSerial?.saleId).toBe('sale_ref_1');
  });

  it('tracks live POS sales deltas during active cycle counts and adjusts stock upon posting', () => {
    atriumActions.addProduct({
      name: 'Café Moulu 250g',
      description: 'Café arabica',
      sku: 'CAFE-250',
      category: 'Food',
      price: { amount: 650, currency: 'DZD' },
      cost: { amount: 420, currency: 'DZD' },
      stockQuantity: 0,
      reorderLevel: 5,
      unit: 'piece',
      isActive: true,
      isPinned: false,
    });

    const snap0 = readStoreSnapshot();
    const product = snap0.products.find((p) => p.sku === 'CAFE-250')!;
    const wh1 = snap0.warehouses[0]?.id;

    const lot = atriumActions.upsertWmsStockLot({
      warehouseId: wh1,
      productId: product.id,
      lotNumber: 'LOT-CAFE-01',
      expiryDate: '2028-01-15',
      qtyOnHand: 30,
      unitCostCentimes: 42000,
    });

    const cycle = atriumActions.createWmsCycleCount({ warehouseId: wh1 });
    const line = cycle.lines.find((l) => l.lotId === lot.id)!;
    expect(line.systemQty).toBe(30);
    expect(line.activeSalesDeltaQty).toBe(0);

    // POS sale happens while cycle count is open -> FEFO decrements lot & updates activeSalesDeltaQty
    const refreshedProduct = readStoreSnapshot().products.find((p) => p.id === product.id)!;
    atriumActions.processSale([{ product: refreshedProduct, quantity: 4 }], 'Cash');

    const afterSale = readStoreSnapshot();
    const liveCycle = afterSale.wmsCycleCounts.find((c) => c.id === cycle.id)!;
    const liveLine = liveCycle.lines.find((l) => l.id === line.id)!;
    expect(liveLine.activeSalesDeltaQty).toBe(4);

    // Physical shelf count was 24 (expected after -4 live sale is 30 + (-4) = 26 -> variance = -2)
    atriumActions.updateWmsCycleCountLine({
      cycleCountId: cycle.id,
      lineId: line.id,
      countedQty: 24,
      reason: '2 damaged packs',
    });

    const posted = atriumActions.postWmsCycleCount(cycle.id);
    expect(posted?.status).toBe('posted');
    expect(posted?.totalVarianceUnits).toBe(-2);

    const afterPost = readStoreSnapshot();
    expect(afterPost.wmsStockLots.find((l) => l.id === lot.id)?.qtyOnHand).toBe(24);
    expect(
      afterPost.stockMovements.some(
        (m) => m.productId === product.id && m.type === 'Adjustment' && m.quantity === -2
      )
    ).toBe(true);
  });

  it('executes inter-warehouse stock transfers, reorder draft POs, landed costs, and consignment balances', () => {
    const baseSnap = readStoreSnapshot();
    const wh1 = atriumActions.createWarehouseDepot({
      businessId: baseSnap.currentBusinessId,
      branchId: baseSnap.currentBranchId,
      tenantId: baseSnap.account.id,
      facilityId: baseSnap.currentBranchId,
      code: 'DEP-NORTH',
      name: 'Entrepôt Nord',
      address: 'Zone Industrielle Rouiba',
      city: 'Alger',
      isMain: true,
      totalSkusCount: 0,
      totalValuationDzd: 0,
    });
    const wh2 = atriumActions.createWarehouseDepot({
      businessId: baseSnap.currentBusinessId,
      branchId: baseSnap.currentBranchId,
      tenantId: baseSnap.account.id,
      facilityId: baseSnap.currentBranchId,
      code: 'DEP-SOUTH',
      name: 'Entrepôt Sud',
      address: 'Zone Logistique Oran',
      city: 'Oran',
      isMain: false,
      totalSkusCount: 0,
      totalValuationDzd: 0,
    });

    atriumActions.addProduct({
      name: 'Huile Olive 5L',
      description: 'Huile vierge extra',
      sku: 'HUILE-5L',
      category: 'Food',
      price: { amount: 4200, currency: 'DZD' },
      cost: { amount: 3000, currency: 'DZD' },
      stockQuantity: 0,
      reorderLevel: 10,
      unit: 'bidon',
      isActive: true,
      isPinned: false,
    });
    const snap1 = readStoreSnapshot();
    const product = snap1.products.find((p) => p.sku === 'HUILE-5L')!;

    const srcLot = atriumActions.upsertWmsStockLot({
      warehouseId: wh1.id,
      productId: product.id,
      lotNumber: 'LOT-OIL-01',
      qtyOnHand: 20,
      unitCostCentimes: 300000,
    });

    // Inter-warehouse transfer in transit
    const trf = atriumActions.createWmsStockTransfer({
      fromWarehouseId: wh1.id,
      toWarehouseId: wh2.id,
      carrierName: 'Yalidine Freight',
      items: [
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          lotId: srcLot.id,
          lotNumber: srcLot.lotNumber,
          quantity: 12,
          unitCostCentimes: srcLot.unitCostCentimes,
        },
      ],
    });
    const dispatched = atriumActions.transitionWmsStockTransfer(trf.id, 'dispatch');
    expect(dispatched?.status).toBe('in_transit');
    expect(readStoreSnapshot().wmsStockLots.find((l) => l.id === srcLot.id)?.qtyOnHand).toBe(8);

    const received = atriumActions.transitionWmsStockTransfer(trf.id, 'receive');
    expect(received?.status).toBe('received');
    const destLot = readStoreSnapshot().wmsStockLots.find(
      (l) => l.warehouseId === wh2.id && l.productId === product.id && l.lotNumber === srcLot.lotNumber
    );
    expect(destLot?.qtyOnHand).toBe(12);

    // Reorder rule -> Draft PO creation (product total qty = 20; minQty = 25 triggers reorder)
    atriumActions.upsertWmsReorderRule({
      productId: product.id,
      minQty: 25,
      maxQty: 60,
      reorderQty: 40,
      preferredSupplierName: 'Huilerie Kabylie',
    });
    const createdPos = atriumActions.createPurchaseOrdersFromReorderSuggestions();
    expect(createdPos).toHaveLength(1);
    expect(createdPos[0]?.type).toBe('po');
    expect(createdPos[0]?.status).toBe('Draft');
    expect(createdPos[0]?.items[0]?.orderedQty).toBe(40);

    // Landed cost allocation in exact integer centimes applied immediately to srcLot (qty=8, base=300000 -> total base = 2,400,000)
    // Add 40,000 centimes (400 DA) freight -> +5,000 centimes per unit => 305,000 centimes
    const landed = atriumActions.createLandedCostAllocation({
      referenceNumber: 'IMP-2026-99',
      method: 'by_quantity',
      freightCentimes: 40000,
      customsCentimes: 0,
      insuranceCentimes: 0,
      otherCentimes: 0,
      lines: [
        {
          productId: product.id,
          productName: product.name,
          lotId: srcLot.id,
          lotNumber: srcLot.lotNumber,
          quantity: 8,
          baseUnitCostCentimes: 300000,
        },
      ],
      applyImmediately: true,
    });
    expect(landed.status).toBe('applied');
    expect(landed.lines[0]?.newUnitCostCentimes).toBe(305000);
    expect(readStoreSnapshot().wmsStockLots.find((l) => l.id === srcLot.id)?.unitCostCentimes).toBe(
      305000
    );

    // Returnable packaging / consignment ledger
    atriumActions.recordWmsConsignmentEntry({
      partyName: 'Client Grossiste Setif',
      packagingCode: 'CASIER-24',
      packagingName: 'Casier Plastique 24',
      movementType: 'issued',
      quantity: 30,
      unitDepositCentimes: 50000,
    });
    atriumActions.recordWmsConsignmentEntry({
      partyName: 'Client Grossiste Setif',
      packagingCode: 'CASIER-24',
      packagingName: 'Casier Plastique 24',
      movementType: 'returned',
      quantity: 12,
      unitDepositCentimes: 50000,
    });
    const balances = summarizeConsignmentBalances(readStoreSnapshot().wmsConsignmentEntries);
    expect(balances).toHaveLength(1);
    expect(balances[0]?.netOutstandingQty).toBe(18);
    expect(balances[0]?.netDepositCentimes).toBe(900000);
  });

  it('renders WmsWorkspace, WmsBarcodePrintModal, TradingInventoryView, and PosInventoryView cleanly', () => {
    atriumActions.addProduct({
      name: 'Produit Test UI',
      description: 'Article de démonstration',
      sku: 'UI-001',
      category: 'General',
      price: { amount: 500, currency: 'DZD' },
      cost: { amount: 300, currency: 'DZD' },
      stockQuantity: 10,
      reorderLevel: 3,
      unit: 'piece',
      isActive: true,
      isPinned: false,
    });
    const snap = readStoreSnapshot();
    const product = snap.products[0];
    if (product) {
      atriumActions.upsertWmsStockLot({
        warehouseId: snap.warehouses[0]?.id,
        productId: product.id,
        lotNumber: 'LOT-UI-1',
        expiryDate: '2027-12-31',
        qtyOnHand: 10,
        unitCostCentimes: 15000,
      });
    }

    const wmsHtml = renderToStaticMarkup(<WmsWorkspace />);
    expect(wmsHtml).toContain('data-testid="wms-workspace"');

    const barcodeHtml = renderToStaticMarkup(
      <WmsBarcodePrintModal
        isOpen={true}
        onClose={() => {}}
        target={{
          code: 'LOT-UI-1',
          productName: product?.name || 'Produit Test',
          lotNumber: 'LOT-UI-1',
          expiryDate: '2027-12-31',
          unitCostCentimes: 15000,
        }}
      />
    );
    expect(barcodeHtml).toContain('LOT-UI-1');
    expect(barcodeHtml).toContain('<svg');

    const tradingInvHtml = renderToStaticMarkup(<TradingInventoryView />);
    expect(tradingInvHtml).toBeTruthy();

    const posInvHtml = renderToStaticMarkup(<PosInventoryView />);
    expect(posInvHtml).toBeTruthy();
  });
});

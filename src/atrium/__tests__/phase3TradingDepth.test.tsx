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
  selectCurrentB2bClientsFromState,
  selectCurrentCommercialDocsFromState,
  selectCurrentJournalEntriesFromState,
  selectCurrentProductsFromState,
  selectCurrentStaffFromState,
  selectCurrentTradingDeliveryRoundsFromState,
  selectCurrentTradingPriceListsFromState,
  selectCurrentTradingRepCommissionsFromState,
  selectCurrentWarehousesFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  getProductStockInDepot,
  resolveClientTierPrice,
} from '../../utils/tradingDepth';
import type { CommercialDocument } from '../../types';
import { TradingDashboardView } from '../../components/screens/trading/TradingDashboardView';
import { TradingDirectoryView } from '../../components/screens/trading/TradingDirectoryView';
import { TradingCatalogView } from '../../components/screens/trading/TradingCatalogView';
import { TradingInventoryView } from '../../components/screens/trading/TradingInventoryView';
import { TradingSalesView } from '../../components/screens/trading/TradingSalesView';
import { TradingPurchasesView } from '../../components/screens/trading/TradingPurchasesView';
import { TradingFinanceView } from '../../components/screens/trading/TradingFinanceView';
import { TradingStaffView } from '../../components/screens/trading/TradingStaffView';
import { TradingHistoryView } from '../../components/screens/trading/TradingHistoryView';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 3 Step 8 (7.8 trading_commercial) — Deep Vertical Integration', () => {
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
    const tradingBiz = getGlobalState().businesses.find((b) => b.category === 'trading_commercial');
    expect(tradingBiz).toBeTruthy();
    if (tradingBiz) {
      switchBusinessAction(tradingBiz.id);
    }
  });

  function seedTradingScenario(actions: ReturnType<typeof useAtriumActions>) {
    const state = getGlobalState();
    const tenantId = state.account.id;
    const branchId = state.currentBranchId;
    const businessId = state.currentBusinessId;

    const existingStaff = selectCurrentStaffFromState(state);
    const rep =
      existingStaff.find((s) => !s.status || s.status === 'active') ||
      actions.createStaffMember({
        fullName: 'Karim Benali',
        role: 'manager',
        roleRank: 2,
        phoneNumber: '0550112233',
        email: 'karim@trading.dz',
        hireDate: '2025-01-01',
        salary: 75000,
        paymentDay: 28,
        isActive: true,
        allowedModules: ['all'],
        status: 'active',
        pinCode: '5678',
      });

    const depotMain =
      selectCurrentWarehousesFromState(getGlobalState())[0] ||
      actions.createWarehouseDepot({
        accountId: tenantId,
        tenantId,
        businessId,
        branchId,
        facilityId: branchId,
        code: 'DEP-01',
        name: 'Dépôt Central Alger',
        address: 'Zone Industrielle Oued Smar',
        city: 'Alger',
        isMain: true,
        totalSkusCount: 0,
        totalValuationDzd: 0,
      });

    const depotAnnex = actions.createWarehouseDepot({
      accountId: tenantId,
      tenantId,
      businessId,
      branchId,
      facilityId: branchId,
      code: 'DEP-02',
      name: 'Annexe Blida',
      address: 'Zone Logistique Blida',
      city: 'Blida',
      isMain: false,
      totalSkusCount: 0,
      totalValuationDzd: 0,
    });

    const product =
      selectCurrentProductsFromState(getGlobalState())[0] ||
      actions.addProduct({
        name: 'Palette Huile Végétale 5L',
        description: 'Huile alimentaire 5L',
        sku: 'HUILE-5L-PAL',
        category: 'Alimentaire',
        price: { amount: 12000, currency: 'DZD' },
        cost: { amount: 9500, currency: 'DZD' },
        taxRate: 19,
        stockQuantity: 40,
        depotStockMap: { [depotMain.id]: 30, [depotAnnex.id]: 10 },
        reorderLevel: 5,
        unit: 'palette',
        isActive: true,
        isPinned: false,
      });

    const client = actions.createB2bClient({
      tenantId,
      facilityId: branchId,
      companyName: 'SARL Atlas Distribution',
      email: 'achats@atlas-dist.dz',
      phone: '0550445566',
      address: 'Rue Didouche Mourad',
      city: 'Alger',
      country: 'Algérie',
      rc: '16/00-9911223B19',
      nif: '001916099112234',
      nis: '099116000012345',
      ai: '16012345678',
      contactName: 'Sofiane Mansouri',
      priceTier: 'vip',
      creditLimit: 100000,
      outstandingBalance: 40000,
      paymentTermsDays: 30,
    });

    return { tenantId, branchId, businessId, rep, depotMain, depotAnnex, product, client };
  }

  function buildBaseDocPayload(params: {
    tenantId: string;
    businessId: string;
    branchId: string;
    depotId: string;
    clientId: string;
    clientName: string;
    type: CommercialDocument['type'];
    docNumber: string;
    totalHt: number;
    tvaPercent?: number;
    retentionPercent?: number;
    linkedDocId?: string;
    linkedDocNumber?: string;
    itemId?: string;
    productId?: string;
    description?: string;
    quantity?: number;
    unitPriceHt?: number;
    status?: CommercialDocument['status'];
  }): Omit<CommercialDocument, 'id' | 'createdAt' | 'updatedAt'> {
    const tvaPct = params.tvaPercent ?? 0;
    const tvaAmt = Math.round((params.totalHt * tvaPct) / 100);
    const totalTtc = params.totalHt + tvaAmt;
    const retPct = params.retentionPercent ?? 0;
    const retAmt = Math.round((totalTtc * retPct) / 100);
    const netToPay = totalTtc - retAmt;
    const qty = params.quantity ?? 1;
    const unitHt = params.unitPriceHt ?? Math.round(params.totalHt / Math.max(1, qty));

    return {
      accountId: params.tenantId,
      tenantId: params.tenantId,
      businessId: params.businessId,
      branchId: params.branchId,
      facilityId: params.branchId,
      depotId: params.depotId,
      type: params.type,
      docNumber: params.docNumber,
      date: '2026-11-27',
      clientId: params.clientId,
      clientName: params.clientName,
      linkedDocId: params.linkedDocId,
      linkedDocNumber: params.linkedDocNumber,
      items: [
        {
          id: params.itemId || `li_${Date.now()}`,
          productId: params.productId,
          description: params.description || 'Lot Standard',
          isService: false,
          quantity: qty,
          unit: 'u',
          unitPriceHt: unitHt,
          tvaPercent: tvaPct,
          discountPercent: 0,
          totalHt: params.totalHt,
          totalTtc,
        },
      ],
      generalDiscountPercent: 0,
      totalHtRaw: params.totalHt,
      totalHtFinal: params.totalHt,
      totalTva: tvaAmt,
      timbreFiscal: 0,
      totalTtc,
      guaranteeRetentionPercent: retPct,
      guaranteeRetentionAmount: retAmt,
      netToPay,
      currency: 'DZD',
      paymentMethod: 'Virement bancaire',
      paymentTerms: '30 jours',
      includeStampSignature: true,
      status: params.status ?? 'Validated',
    };
  }

  it('resolves client tier pricing from effective-dated price lists with fallback to base product price', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { tenantId, branchId, businessId, product, client } = seedTradingScenario(actions);

    const priceList = actions.upsertTradingPriceList({
      accountId: tenantId,
      tenantId,
      businessId,
      branchId,
      facilityId: branchId,
      name: 'Tarif VIP Q4 2026',
      tier: 'vip',
      effectiveFrom: '2026-10-01',
      effectiveTo: '2026-12-31',
      isActive: true,
      items: [
        {
          id: 'tpli_1',
          productId: product.id,
          productName: product.name,
          unitPriceHt: 9500,
          minQty: 5,
          discountPercent: 10,
        },
      ],
    });
    expect(priceList.tier).toBe('vip');
    expect(selectCurrentTradingPriceListsFromState(getGlobalState()).some((p) => p.id === priceList.id)).toBe(true);

    const vipMatch = resolveClientTierPrice({
      priceLists: selectCurrentTradingPriceListsFromState(getGlobalState()),
      clientTier: client.priceTier,
      productId: product.id,
      qty: 6,
      docDate: '2026-11-27',
      fallbackUnitPriceHt: product.price.amount,
    });
    expect(vipMatch.isTierApplied).toBe(true);
    expect(vipMatch.unitPriceHt).toBe(9500);
    expect(vipMatch.discountPercent).toBe(10);

    const expiredMatch = resolveClientTierPrice({
      priceLists: selectCurrentTradingPriceListsFromState(getGlobalState()),
      clientTier: client.priceTier,
      productId: product.id,
      qty: 6,
      docDate: '2027-02-01',
      fallbackUnitPriceHt: product.price.amount,
    });
    expect(expiredMatch.isTierApplied).toBe(false);
    expect(expiredMatch.unitPriceHt).toBe(product.price.amount);
  });

  it('enforces client credit limits with manager PIN override and re-blocks when edited total rises', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { tenantId, branchId, businessId, depotMain, client } = seedTradingScenario(actions);

    const manager = actions.createStaffMember({
      fullName: 'Gérant Nabil',
      role: 'manager',
      roleRank: 2,
      phoneNumber: '0550998877',
      email: 'nabil@trading.dz',
      hireDate: '2025-01-01',
      salary: 90000,
      paymentDay: 28,
      isActive: true,
      allowedModules: ['all'],
      status: 'active',
      pinCode: '4321',
    });
    expect(manager.pinCode).toBe('4321');

    const payload = buildBaseDocPayload({
      tenantId,
      businessId,
      branchId,
      depotId: depotMain.id,
      clientId: client.id,
      clientName: client.companyName,
      type: 'facture',
      docNumber: 'FAC-2026-9001',
      totalHt: 80000,
    });

    // Outstanding 40,000 + new invoice 80,000 = 120,000 > creditLimit 100,000 -> blocked
    const blockedDoc = actions.createCommercialDoc(payload);
    expect(blockedDoc).toBeNull();

    // Retry with valid manager PIN + reason -> succeeds
    const overriddenDoc = actions.createCommercialDoc(payload, {
      managerPin: '4321',
      overrideReason: 'Bon de commande administratif reçu',
    });
    expect(overriddenDoc).toBeTruthy();
    expect(overriddenDoc?.creditOverrideByName).toBe('Gérant Nabil');

    // Editing to increase total without re-entering PIN must be blocked again
    if (overriddenDoc) {
      const blockedIncrease = actions.updateCommercialDoc(overriddenDoc.id, {
        totalHtRaw: 95000,
        totalHtFinal: 95000,
        totalTtc: 95000,
        netToPay: 95000,
      });
      expect(blockedIncrease).toBe(false);
    }
  });

  it('supports partial Devis -> BL conversion tracking line progress and blocking over-conversion', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { tenantId, branchId, businessId, depotMain, product, client } = seedTradingScenario(actions);

    const devis = actions.createCommercialDoc(
      buildBaseDocPayload({
        tenantId,
        businessId,
        branchId,
        depotId: depotMain.id,
        clientId: client.id,
        clientName: client.companyName,
        type: 'devis',
        docNumber: 'DEV-2026-8801',
        itemId: 'dl_1',
        productId: product.id,
        description: product.name,
        quantity: 10,
        unitPriceHt: 10000,
        totalHt: 100000,
        tvaPercent: 19,
      })
    );
    expect(devis).toBeTruthy();
    if (!devis) return;

    // Convert 4 out of 10 -> BL-1, source becomes 'Partial'
    const bl1 = actions.convertCommercialDocPartial(devis.id, 'bl', { dl_1: 4 });
    expect(bl1).toBeTruthy();
    expect(bl1?.totalHtFinal).toBe(40000);
    const afterFirst = selectCurrentCommercialDocsFromState(getGlobalState()).find((d) => d.id === devis.id);
    expect(afterFirst?.status).toBe('Partial');
    expect(afterFirst?.items[0].convertedQty).toBe(4);

    // Over-converting 7 remaining (> 6 left) is blocked
    const overConvert = actions.convertCommercialDocPartial(devis.id, 'bl', { dl_1: 7 });
    expect(overConvert).toBeNull();

    // Converting remaining 6 completes source
    const bl2 = actions.convertCommercialDocPartial(devis.id, 'bl', { dl_1: 6 });
    expect(bl2).toBeTruthy();
    const afterSecond = selectCurrentCommercialDocsFromState(getGlobalState()).find((d) => d.id === devis.id);
    expect(afterSecond?.status).toBe('Delivered');
    expect(afterSecond?.items[0].convertedQty).toBe(10);
  });

  it('prevents credit notes (Avoir) from exceeding linked invoice cumulative remaining balance', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { tenantId, branchId, businessId, depotMain, client } = seedTradingScenario(actions);

    const invoice = actions.createCommercialDoc(
      buildBaseDocPayload({
        tenantId,
        businessId,
        branchId,
        depotId: depotMain.id,
        clientId: client.id,
        clientName: client.companyName,
        type: 'facture',
        docNumber: 'FAC-2026-7701',
        totalHt: 50000,
      })
    );
    expect(invoice).toBeTruthy();
    if (!invoice) return;

    const avoir1 = actions.createCommercialDoc(
      buildBaseDocPayload({
        tenantId,
        businessId,
        branchId,
        depotId: depotMain.id,
        clientId: client.id,
        clientName: client.companyName,
        type: 'avoir',
        docNumber: 'AV-2026-7701',
        linkedDocId: invoice.id,
        linkedDocNumber: invoice.docNumber,
        totalHt: 30000,
      })
    );
    expect(avoir1).toBeTruthy();

    // Second avoir for 25,000 exceeds remaining 20,000 -> blocked
    const excessAvoir = actions.createCommercialDoc(
      buildBaseDocPayload({
        tenantId,
        businessId,
        branchId,
        depotId: depotMain.id,
        clientId: client.id,
        clientName: client.companyName,
        type: 'avoir',
        docNumber: 'AV-2026-7702',
        linkedDocId: invoice.id,
        linkedDocNumber: invoice.docNumber,
        totalHt: 25000,
      })
    );
    expect(excessAvoir).toBeNull();
  });

  it('tracks per-depot stock availability on sorties and preserves total stock across inter-depot transfers', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { tenantId, branchId, businessId, depotMain, depotAnnex, product } = seedTradingScenario(actions);

    const prodBefore = selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === product.id)!;
    const totalBefore = prodBefore.stockQuantity;
    const mainBefore = getProductStockInDepot(prodBefore, depotMain.id, depotMain.id);
    const annexBefore = getProductStockInDepot(prodBefore, depotAnnex.id, depotMain.id);

    // Sortie from annex exceeding annex stock must be rejected even if global stock is larger
    const overSortie = actions.createStockVoucher({
      accountId: tenantId,
      tenantId,
      businessId,
      branchId,
      facilityId: branchId,
      voucherNumber: 'BS-FAIL-01',
      type: 'sortie',
      date: '2026-11-27',
      reason: 'sortie_client',
      operatorName: 'Karim Benali',
      totalValuationDzd: (annexBefore + 5) * product.cost.amount,
      depotSourceId: depotAnnex.id,
      depotSourceName: depotAnnex.name,
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: annexBefore + 5,
          unitCostDzd: product.cost.amount,
          unit: product.unit || 'u',
        },
      ],
    });
    expect(overSortie).toBeNull();

    // Transfer 5 units from main depot to annex -> total global stock unchanged, per-depot shifted
    const transfer = actions.createStockVoucher({
      accountId: tenantId,
      tenantId,
      businessId,
      branchId,
      facilityId: branchId,
      voucherNumber: 'BT-2026-01',
      type: 'transfert',
      date: '2026-11-27',
      reason: 'transfert',
      operatorName: 'Karim Benali',
      totalValuationDzd: 5 * product.cost.amount,
      depotSourceId: depotMain.id,
      depotSourceName: depotMain.name,
      depotTargetId: depotAnnex.id,
      depotTargetName: depotAnnex.name,
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 5,
          unitCostDzd: product.cost.amount,
          unit: product.unit || 'u',
        },
      ],
    });
    expect(transfer).toBeTruthy();

    const prodAfter = selectCurrentProductsFromState(getGlobalState()).find((p) => p.id === product.id)!;
    expect(prodAfter.stockQuantity).toBe(totalBefore);
    expect(getProductStockInDepot(prodAfter, depotMain.id, depotMain.id)).toBe(mainBefore - 5);
    expect(getProductStockInDepot(prodAfter, depotAnnex.id, depotMain.id)).toBe(annexBefore + 5);
  });

  it('enforces bounded guarantee retention release and posts SCF journal lines (512000 / 411000)', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { tenantId, branchId, businessId, depotMain, client } = seedTradingScenario(actions);

    const invoice = actions.createCommercialDoc(
      buildBaseDocPayload({
        tenantId,
        businessId,
        branchId,
        depotId: depotMain.id,
        clientId: client.id,
        clientName: client.companyName,
        type: 'facture',
        docNumber: 'FAC-2026-RG01',
        totalHt: 50000,
        retentionPercent: 10,
      })
    );
    expect(invoice).toBeTruthy();
    expect(invoice?.guaranteeRetentionStatus).toBe('held');
    if (!invoice) return;

    // Exceeding held retention blocked
    expect(
      actions.releaseGuaranteeRetention({ docId: invoice.id, releaseAmountDzd: 6000 })
    ).toBe(false);

    // Partial release 2,000 DZD -> still 'held' with released amount tracked
    expect(
      actions.releaseGuaranteeRetention({
        docId: invoice.id,
        releaseAmountDzd: 2000,
        paymentMethod: 'Virement bancaire',
        reference: 'VIR-RG-1',
      })
    ).toBe(true);
    const partialDoc = selectCurrentCommercialDocsFromState(getGlobalState()).find((d) => d.id === invoice.id);
    expect(partialDoc?.guaranteeRetentionStatus).toBe('held');
    expect(partialDoc?.guaranteeReleasedAmount).toBe(2000);

    // Final release 3,000 DZD -> 'released' + SCF 512000 / 411000 entry
    expect(
      actions.releaseGuaranteeRetention({
        docId: invoice.id,
        releaseAmountDzd: 3000,
        paymentMethod: 'Virement bancaire',
        reference: 'VIR-RG-2',
      })
    ).toBe(true);
    const releasedDoc = selectCurrentCommercialDocsFromState(getGlobalState()).find((d) => d.id === invoice.id);
    expect(releasedDoc?.guaranteeRetentionStatus).toBe('released');
    expect(releasedDoc?.guaranteeReleasedAmount).toBe(5000);

    const entries = selectCurrentJournalEntriesFromState(getGlobalState());
    const rgEntry = entries.find(
      (e) => e.pieceRef === 'VIR-RG-2' || e.libelle.includes('FAC-2026-RG01')
    );
    expect(rgEntry).toBeTruthy();
  });

  it('closes delivery rounds with cash variance reconciliation, accrues rep commissions, and binds to staff payroll slips', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { rep, client } = seedTradingScenario(actions);

    const round = actions.createTradingDeliveryRound({
      roundNumber: 'TRN-2026-001',
      repStaffId: rep.id,
      repName: rep.fullName || 'Karim Benali',
      roundDate: '2026-11-27',
      vehicleLabel: 'Fourgon 01',
      status: 'in_progress',
      stops: [
        {
          id: 'st_1',
          clientId: client.id,
          clientName: client.companyName,
          expectedAmountDzd: 50000,
          collectedAmountDzd: 0,
          status: 'pending',
        },
      ],
    });
    expect(round.totalExpectedDzd).toBe(50000);

    actions.updateTradingDeliveryRound(round.id, {
      stops: [
        {
          id: 'st_1',
          clientId: client.id,
          clientName: client.companyName,
          expectedAmountDzd: 50000,
          collectedAmountDzd: 40000,
          status: 'partial',
        },
      ],
    });

    const completed = actions.completeTradingDeliveryRound(round.id, { commissionRateBps: 200 }); // 2% of 40,000 = 800 DZD
    expect(completed?.status).toBe('completed');
    expect(completed?.totalCollectedDzd).toBe(40000);

    const rounds = selectCurrentTradingDeliveryRoundsFromState(getGlobalState());
    expect(rounds.find((r) => r.id === round.id)?.status).toBe('completed');

    const comms = selectCurrentTradingRepCommissionsFromState(getGlobalState());
    const repComm = comms.find((c) => c.deliveryRoundId === round.id);
    expect(repComm).toBeTruthy();
    expect(repComm?.commissionAmountDzd).toBe(800);

    if (!repComm) return;
    const posted = actions.postTradingRepCommissionsToPayroll([repComm.id]);
    expect(posted).toHaveLength(1);
    expect(posted[0].status).toBe('posted_to_payroll');

    const run = actions.generateStaffPayrollRun(11, 2026, 'trading_commercial');
    expect(run).toBeTruthy();
    if (!run) return;
    const slips = (getGlobalState().staffPayrollSlips || []).filter((s) => s.payrollRunId === run.id);
    const repSlip = slips.find((s) => s.staffId === rep.id);
    expect(repSlip).toBeTruthy();
    expect(
      (repSlip?.primesCotisables || []).some(
        (p) => p.label === 'Commissions Ventes B2B' && p.amount === 800
      )
    ).toBe(true);
  });

  it('renders all Trading Commercial views cleanly via SSR without raw translation keys', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    seedTradingScenario(actions);

    const htmls = [
      renderToStaticMarkup(<TradingDashboardView />),
      renderToStaticMarkup(<TradingDirectoryView />),
      renderToStaticMarkup(<TradingCatalogView />),
      renderToStaticMarkup(<TradingInventoryView />),
      renderToStaticMarkup(<TradingSalesView />),
      renderToStaticMarkup(<TradingPurchasesView />),
      renderToStaticMarkup(<TradingFinanceView />),
      renderToStaticMarkup(<TradingStaffView />),
      renderToStaticMarkup(<TradingHistoryView />),
    ];

    for (const html of htmls) {
      expect(html.length).toBeGreaterThan(150);
      expect(html).not.toContain('trading_composer_');
      expect(html).not.toContain('trading_entity_price_tier');
    }
    expect(selectCurrentB2bClientsFromState(getGlobalState()).length).toBeGreaterThan(0);
  });
});

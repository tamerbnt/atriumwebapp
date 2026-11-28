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
  selectCurrentBranchFromState,
  selectCurrentMfgPieceRateEntriesFromState,
  selectCurrentStaffFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentUnifiedPaymentsFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  aggregateMfgPieceRatePayroll,
  applySessionToMachineRuntime,
  buildDimensionQuoteLineItems,
  buildLotTraceabilityGraph,
  captureBomSnapshot,
  computeLateReceiptCmupAdjustment,
  computeMultiOfPurchaseSuggestions,
  computeOrderActualVsStandardCosting,
  computePieceRateEarnings,
  evaluateMachineMaintenanceStatus,
  evaluateScrapToleranceAlert,
  forkBomNewVersion,
  formatMfgSequentialCode,
  isBomLockedByOrders,
  optimizeLinearBarCutting1D,
  optimizeSheetSlabCutting2D,
  validateWorkstationStartPrerequisites,
} from '../../utils/manufacturingDepth';
import { buildScrapNcrArtifacts } from '../../utils/step5Actions';
import { getAllowedRoutesForCategoryRole } from '../../utils/routePermissions';
import type {
  ManufacturingOrder,
  MfgFinishedGoodsLot,
  MfgMachineAsset,
  MfgMachineMaintenanceLog,
  MfgPieceRateEntry,
  RawMaterialStockItem,
} from '../../types/index';
import { ManufacturingDashboardView } from '../../components/screens/manufacturing/ManufacturingDashboardView';
import { ManufacturingOrdersView } from '../../components/screens/manufacturing/ManufacturingOrdersView';
import { ManufacturingBomView } from '../../components/screens/manufacturing/ManufacturingBomView';
import { ManufacturingMaterialsView } from '../../components/screens/manufacturing/ManufacturingMaterialsView';
import { ManufacturingWorkstationView } from '../../components/screens/manufacturing/ManufacturingWorkstationView';
import { ManufacturingQcView } from '../../components/screens/manufacturing/ManufacturingQcView';
import { ManufacturingStaffView } from '../../components/screens/manufacturing/ManufacturingStaffView';
import { ManufacturingPieceRatePanel } from '../../components/screens/manufacturing/ManufacturingPieceRatePanel';
import {
  INITIAL_BOMS,
  INITIAL_FINISHED_GOODS,
  INITIAL_MFG_MACHINES,
  INITIAL_MFG_MAINTENANCE,
  INITIAL_ORDERS,
  INITIAL_QC_RECORDS,
  INITIAL_RAW_MATERIALS,
  INITIAL_SESSION_LOGS,
  INITIAL_VOUCHERS,
} from '../../components/screens/manufacturing/manufacturingData';

function HookBridge({
  onActions,
}: {
  onActions: (a: ReturnType<typeof useAtriumActions>) => void;
}) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

function getActions(): ReturnType<typeof useAtriumActions> {
  let actions!: ReturnType<typeof useAtriumActions>;
  renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
  return actions;
}

describe('Phase 3 Step 12 (7.12 manufacturing_production) — BOM Pinning, Costing, GMAO, Traceability, Cutting, Piece-Rate Payroll & 6.1 Billing', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('fr');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
    const mfgBiz = getGlobalState().businesses.find(
      (b) => b.category === 'manufacturing_production'
    );
    expect(mfgBiz).toBeTruthy();
    if (mfgBiz) {
      switchBusinessAction(mfgBiz.id);
    }
  });

  it('generates sequential ANDN/MNT/PFG/CUT codes, pins BOM snapshots on OFs & forks active-locked BOMs cleanly', () => {
    expect(formatMfgSequentialCode('ANDN', ['ANDN-2026-00003', 'ANDN-2026-00009'], 2026)).toBe(
      'ANDN-2026-00010'
    );
    expect(formatMfgSequentialCode('MNT', ['MNT-2026-00001'], 2026)).toBe('MNT-2026-00002');
    expect(formatMfgSequentialCode('PFG', [], 2026)).toBe('PFG-2026-00001');
    expect(formatMfgSequentialCode('CUT', ['CUT-2026-00004'], 2026)).toBe('CUT-2026-00005');

    const baseBom = INITIAL_BOMS[0];
    expect(isBomLockedByOrders(baseBom.id, INITIAL_ORDERS)).toBe(true);

    const snapshot = captureBomSnapshot(baseBom, '2026-11-28T10:00:00Z');
    expect(snapshot.bomId).toBe(baseBom.id);
    expect(snapshot.version).toBe(Math.max(1, baseBom.version || 1));
    expect(snapshot.standardCostCentimes).toBeGreaterThan(0);
    expect(snapshot.components.length).toBe(baseBom.components.length);

    const { archivedSource, nextBom } = forkBomNewVersion(
      baseBom,
      { estimatedCostDzd: baseBom.estimatedCostDzd + 5000 },
      '2026-11-28T11:00:00Z'
    );
    expect(archivedSource.status).toBe('Archived');
    expect(archivedSource.isActive).toBe(false);
    expect(nextBom.version).toBe(Math.max(1, baseBom.version || 1) + 1);
    expect(nextBom.parentBomId).toBe(baseBom.id);
    expect(nextBom.status).toBe('Active');
    expect(nextBom.isActive).toBe(true);
  });

  it('aggregates multi-OF shortages, computes actual vs standard costing + late-receipt CMUP delta & builds traceability graphs', () => {
    const depletedMaterials: RawMaterialStockItem[] = INITIAL_RAW_MATERIALS.map((m, idx) =>
      idx === 0 ? { ...m, currentStock: 0, availableStock: 0, reorderThreshold: 2 } : m
    );
    const suggestions = computeMultiOfPurchaseSuggestions(
      INITIAL_ORDERS,
      INITIAL_BOMS,
      depletedMaterials
    );
    expect(suggestions.length).toBeGreaterThan(0);
    const topSuggestion = suggestions.find((s) => s.materialId === INITIAL_RAW_MATERIALS[0].id);
    expect(topSuggestion).toBeTruthy();
    expect(topSuggestion!.urgency).toBe('critical');
    expect(topSuggestion!.suggestedOrderQuantity).toBeGreaterThan(0);

    const targetOrder = INITIAL_ORDERS[0];
    const targetBom = INITIAL_BOMS.find((b) => b.id === targetOrder.bomId);
    const costing = computeOrderActualVsStandardCosting({
      order: targetOrder,
      bom: targetBom,
      vouchers: INITIAL_VOUCHERS,
      sessionLogs: INITIAL_SESSION_LOGS,
      materials: INITIAL_RAW_MATERIALS,
    });
    expect(costing.standardTotalCentimes).toBeGreaterThan(0);
    expect(costing.actualMaterialNetCentimes).toBeGreaterThanOrEqual(0);
    expect(['under_budget', 'on_budget', 'overrun']).toContain(costing.costVarianceFlag);

    const cmupAdjust = computeLateReceiptCmupAdjustment({
      material: INITIAL_RAW_MATERIALS[0],
      incomingQty: 10,
      incomingUnitCostDzd: INITIAL_RAW_MATERIALS[0].unitCostPmpDzd + 25000,
      vouchers: INITIAL_VOUCHERS,
      activeOrders: INITIAL_ORDERS,
    });
    expect(cmupAdjust.newCmupCentimes).toBeGreaterThan(cmupAdjust.previousCmupCentimes);
    expect(cmupAdjust.unitDeltaCentimes).toBeGreaterThan(0);

    const actions = getActions();
    const linkedDoc = actions.createUnifiedDocument({
      docType: 'bl',
      sourceVertical: 'manufacturing_production',
      partyName: targetOrder.clientName || 'Client Atelier',
      docDate: '2026-11-28',
      paymentMethod: 'bank_transfer',
      sourceEntityType: 'manufacturing_order',
      sourceEntityId: targetOrder.id,
      items: [
        {
          description: targetOrder.productName,
          isService: false,
          quantity: targetOrder.targetQuantity || 1,
          unitPriceHt: 250000,
          tvaPercent: 19,
        },
      ],
      issueImmediately: true,
    });

    const fgLots: MfgFinishedGoodsLot[] = INITIAL_FINISHED_GOODS.map((fg, i) =>
      i === 0 ? { ...fg, orderId: targetOrder.id, linkedUnifiedDocId: linkedDoc.id } : fg
    );

    const graph = buildLotTraceabilityGraph({
      order: targetOrder,
      materials: INITIAL_RAW_MATERIALS,
      vouchers: INITIAL_VOUCHERS,
      qcRecords: INITIAL_QC_RECORDS,
      ncrRecords: [],
      finishedGoodsLots: fgLots,
      unifiedDocuments: [linkedDoc],
    });
    expect(graph.orderNumber).toBe(targetOrder.orderNumber);
    expect(graph.finishedGoodsLots.length).toBeGreaterThan(0);
    expect(graph.downstreamDocuments.some((d) => d.id === linkedDoc.id)).toBe(true);
  });

  it('evaluates GMAO machine maintenance, enforces workstation PIN + Loi 88-07 PPE, >10% excess scrap NCR hold, and 1D/2D cutting optimizer', () => {
    const overdueMachine: MfgMachineAsset = {
      ...INITIAL_MFG_MACHINES[0],
      runningHours: 260,
      maintenanceIntervalHours: 250,
    };
    const logs: MfgMachineMaintenanceLog[] = INITIAL_MFG_MAINTENANCE.filter(
      (l) => l.machineId !== overdueMachine.id
    );
    const maintEvals = evaluateMachineMaintenanceStatus([overdueMachine], logs, '2026-11-28');
    expect(maintEvals[0].isOverdue).toBe(true);
    expect(maintEvals[0].isDueByHours).toBe(true);

    const updatedMachine = applySessionToMachineRuntime(overdueMachine, 3600, 12);
    expect(updatedMachine.runningHours).toBeCloseTo(261, 2);
    expect(updatedMachine.cycleCount).toBe(overdueMachine.cycleCount + 12);

    const operator = { id: 'op_01', fullName: 'Nabil Khelifi', pinCode: '4321' };
    const incompleteCheck = validateWorkstationStartPrerequisites({
      operator,
      enteredPin: '9999',
      ppeChecklist: { glasses: true, gloves: true, shoes: false, helmet: true },
      order: INITIAL_ORDERS[0],
      bom: INITIAL_BOMS[0],
      materials: INITIAL_RAW_MATERIALS,
    });
    expect(incompleteCheck.canStart).toBe(false);
    expect(incompleteCheck.pinValid).toBe(false);
    expect(incompleteCheck.ppeComplete).toBe(false);
    expect(incompleteCheck.errors).toContain('PIN_INVALID');
    expect(incompleteCheck.errors).toContain('PPE_INCOMPLETE');

    const depletedCheck = validateWorkstationStartPrerequisites({
      operator,
      enteredPin: '4321',
      ppeChecklist: { glasses: true, gloves: true, shoes: true, helmet: true },
      order: { ...INITIAL_ORDERS[0], status: 'InProduction' } as ManufacturingOrder,
      bom: INITIAL_BOMS[0],
      materials: INITIAL_RAW_MATERIALS.map((m) => ({ ...m, currentStock: 0 })),
    });
    expect(depletedCheck.canStart).toBe(true);
    expect(depletedCheck.shortageDetected).toBe(true);
    expect(depletedCheck.shortageMaterials.length).toBeGreaterThan(0);

    const scrapCheck = evaluateScrapToleranceAlert({ goodQty: 80, scrapQty: 20, maxTolerancePercent: 10 });
    expect(scrapCheck.scrapPercent).toBe(20);
    expect(scrapCheck.exceedsTolerance).toBe(true);
    expect(scrapCheck.requiresNcr).toBe(true);

    // Gate 1 Condition #2 invariance: scrapped NCR holds CMUP adjustment
    const activeBranch = selectCurrentBranchFromState(getGlobalState())!;
    const ncrArtifact = buildScrapNcrArtifacts({
      ncrId: 'ncr_test_1',
      qcId: 'qc_test_1',
      ncrNumber: 'NCR-2026-00999',
      inspectionNumber: 'CQ-2026-00999',
      accountId: activeBranch.accountId,
      businessId: activeBranch.businessId,
      branchId: activeBranch.id,
      staffId: 'op_01',
      orderId: INITIAL_ORDERS[0].id,
      orderNumber: INITIAL_ORDERS[0].orderNumber,
      batchLotNumber: INITIAL_ORDERS[0].batchLotNumber,
      productName: INITIAL_ORDERS[0].productName,
      inspectorName: 'Qualité',
      scrappedQuantity: 20,
      reason: 'Rebut >10%',
      inspectionDate: '2026-11-28',
    });
    expect(ncrArtifact.ncrRecord.cmupAdjustmentHeld).toBe(true);

    // 1D bar cutting + 2D sheet nesting + dimension-based 6.1 quote lines
    const cut1d = optimizeLinearBarCutting1D({
      stockLengthMm: 6000,
      kerfMm: 4,
      parts: [
        { id: 'part_1', label: 'Montant', lengthMm: 2100, quantity: 4 },
        { id: 'part_2', label: 'Traverse', lengthMm: 950, quantity: 4 },
      ],
      minReusableOffcutMm: 500,
    });
    expect(cut1d.stockUnitsRequired).toBeGreaterThanOrEqual(2);
    expect(cut1d.wastePercent).toBeLessThan(35);

    const quoteLines1d = buildDimensionQuoteLineItems({
      tradeCategory: 'Aluminum',
      cuttingMode: '1d_linear',
      parts: [{ id: 'part_1', label: 'Montant', lengthMm: 2100, quantity: 4 }],
      layoutResult: cut1d,
      unitPriceDzd: 3200,
      vatRatePercent: 19,
    });
    expect(quoteLines1d[0].unit).toBe('ml');
    expect(quoteLines1d[0].lineTotalHt).toBeCloseTo(26880, 1);

    const cut2d = optimizeSheetSlabCutting2D({
      stockLengthMm: 2440,
      stockWidthMm: 1220,
      kerfMm: 4,
      parts: [
        { id: 'part_2d_1', label: 'Plateau', lengthMm: 1200, widthMm: 600, quantity: 3, allowRotation: true },
        { id: 'part_2d_2', label: 'Côté', lengthMm: 800, widthMm: 500, quantity: 4, allowRotation: true },
      ],
    });
    expect(cut2d.stockUnitsRequired).toBeGreaterThanOrEqual(2);

    const quoteLines2d = buildDimensionQuoteLineItems({
      tradeCategory: 'Wood',
      cuttingMode: '2d_sheet',
      parts: [{ id: 'part_2d_1', label: 'Plateau', lengthMm: 1200, widthMm: 600, quantity: 3 }],
      layoutResult: cut2d,
      unitPriceDzd: 9500,
      vatRatePercent: 19,
    });
    expect(quoteLines2d[0].unit).toBe('m²');
    expect(quoteLines2d[0].quantity).toBeCloseTo(2.16, 2);
  });

  it('bridges piece-rate workshop earnings into payroll slips, creates 6.1/6.2 documents & payments, and preserves RBAC permissions', () => {
    const actions = getActions();
    let state = getGlobalState();
    const activeBranch = selectCurrentBranchFromState(state)!;
    let staff = selectCurrentStaffFromState(state);
    if (staff.length === 0) {
      actions.createStaffMember({
        fullName: 'Walid Benali',
        email: 'walid@atelier-dz.com',
        phoneNumber: '+213550445566',
        role: 'operateur',
        roleRank: 3,
        isActive: true,
        status: 'active',
        hireDate: '2026-02-01',
        salary: 52000,
        paymentDay: 28,
        pinCode: '1234',
        allowedModules: ['home', 'dashboard', 'scheduler', 'registrations'],
      });
      state = getGlobalState();
      staff = selectCurrentStaffFromState(state);
    }
    expect(staff.length).toBeGreaterThan(0);
    const operator = staff[0];

    const grossCentimes = computePieceRateEarnings({ goodUnits: 40, ratePerPieceCentimes: 25000 });
    expect(grossCentimes).toBe(1000000); // 10,000 DZD

    const pieceEntry: MfgPieceRateEntry = {
      id: 'mpr_test_1',
      accountId: activeBranch.accountId,
      businessId: activeBranch.businessId,
      branchId: activeBranch.id,
      staffId: operator.id,
      operatorStaffId: operator.id,
      operatorName: operator.fullName,
      orderId: INITIAL_ORDERS[0].id,
      orderNumber: INITIAL_ORDERS[0].orderNumber,
      goodUnits: 40,
      scrapUnits: 1,
      ratePerPieceCentimes: 25000,
      grossAmountCentimes: grossCentimes,
      periodMonth: '2026-11',
      status: 'accrued',
      createdAt: '2026-11-28T10:00:00Z',
      updatedAt: '2026-11-28T10:00:00Z',
    };
    actions.recordMfgPieceRateEntry(pieceEntry);
    const posted = actions.postMfgPieceRateToPayroll([pieceEntry.id]);
    expect(posted).toHaveLength(1);
    expect(posted[0].status).toBe('posted_to_payroll');

    const payrollAgg = aggregateMfgPieceRatePayroll(
      selectCurrentMfgPieceRateEntriesFromState(getGlobalState()),
      operator.id,
      '2026-11'
    );
    expect(payrollAgg.totalDzd).toBe(10000);

    const run = actions.generateStaffPayrollRun(11, 2026, 'manufacturing_production');
    expect(run).toBeTruthy();
    const slip = (getGlobalState().staffPayrollSlips || []).find(
      (s) => s.payrollRunId === run?.id && s.staffId === operator.id
    );
    expect(slip).toBeTruthy();
    expect(
      slip!.primesCotisables.some(
        (p) => p.label === 'Primes Rendement Atelier (Pièce)' && p.amount === 10000
      )
    ).toBe(true);

    // 6.1/6.2 Billing & Payment
    const party = actions.ensurePartyForEntity({
      sourceVertical: 'manufacturing_production',
      entityType: 'b2b_client',
      entityId: 'mfg_client_01',
      displayName: 'SARL Mobilier Oran',
      phone: '0550998877',
    });
    expect(party.party.id).toBeTruthy();

    const doc = actions.createUnifiedDocument({
      docType: 'facture',
      sourceVertical: 'manufacturing_production',
      partyId: party.party.id,
      partyName: 'SARL Mobilier Oran',
      docDate: '2026-11-28',
      paymentMethod: 'bank_transfer',
      sourceEntityType: 'manufacturing_order',
      sourceEntityId: INITIAL_ORDERS[0].id,
      items: [
        {
          description: 'Table Réunion Chêne Massif 3.2m (Lot PFG)',
          isService: false,
          quantity: 2,
          unitPriceHt: 185000,
          tvaPercent: 19,
        },
      ],
      issueImmediately: true,
    });
    expect(selectCurrentUnifiedDocumentsFromState(getGlobalState()).some((d) => d.id === doc.id)).toBe(
      true
    );

    const payment = actions.recordUnifiedPayment({
      sourceVertical: 'manufacturing_production',
      partyId: party.party.id,
      partyName: 'SARL Mobilier Oran',
      method: 'bank_transfer',
      direction: 'inflow',
      amountDzd: 440300,
      paymentDate: '2026-11-28',
      allocations: [{ documentId: doc.id, requestedDzd: 440300 }],
    });
    expect(payment).not.toBeNull();
    expect(
      selectCurrentUnifiedPaymentsFromState(getGlobalState()).some((p) => p.id === payment!.id)
    ).toBe(true);

    // Verify manufacturing_production RBAC routes
    const operateurRoutes = getAllowedRoutesForCategoryRole('manufacturing_production', {
      activeManufacturingRole: 'operateur',
      currentUser: { id: 'usr_op', role: 'operateur', roleRank: 3 },
    });
    expect(operateurRoutes.includes('scheduler')).toBe(true);
    expect(operateurRoutes.includes('registrations')).toBe(true);
    expect(operateurRoutes.includes('finance')).toBe(false);
    expect(operateurRoutes.includes('staff')).toBe(false);

    const magasinierRoutes = getAllowedRoutesForCategoryRole('manufacturing_production', {
      activeManufacturingRole: 'magasinier',
      currentUser: { id: 'usr_mag', role: 'magasinier', roleRank: 3 },
    });
    expect(magasinierRoutes.includes('shop')).toBe(true);
    expect(magasinierRoutes.includes('members')).toBe(true);
    expect(magasinierRoutes.includes('scheduler')).toBe(false);

    const gerantRoutes = getAllowedRoutesForCategoryRole('manufacturing_production', {
      activeManufacturingRole: 'gerant',
      currentUser: { id: 'usr_ger', role: 'gerant', roleRank: 1 },
    });
    expect(gerantRoutes.includes('settings')).toBe(true);
    expect(gerantRoutes.includes('staff')).toBe(true);
    expect(gerantRoutes.includes('finance')).toBe(true);
  });

  it('renders all 7.12 manufacturing_production screens & piece-rate panel via SSR cleanly without NaN', () => {
    const state = getGlobalState();
    const staff = selectCurrentStaffFromState(state);
    const html = [
      renderToStaticMarkup(<ManufacturingDashboardView />),
      renderToStaticMarkup(<ManufacturingOrdersView />),
      renderToStaticMarkup(<ManufacturingBomView />),
      renderToStaticMarkup(<ManufacturingMaterialsView />),
      renderToStaticMarkup(<ManufacturingWorkstationView />),
      renderToStaticMarkup(<ManufacturingQcView />),
      renderToStaticMarkup(<ManufacturingStaffView />),
      renderToStaticMarkup(
        <ManufacturingPieceRatePanel
          staffList={staff}
          payrollRuns={state.staffPayrollRuns || []}
          language="fr"
        />
      ),
    ].join('\n');

    expect(html.length).toBeGreaterThan(2500);
    expect(html).not.toContain('NaN');
  });
});

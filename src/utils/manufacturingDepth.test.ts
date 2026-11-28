import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMfgSequentialCode,
  isBomLockedByOrders,
  captureBomSnapshot,
  forkBomNewVersion,
  computeMultiOfPurchaseSuggestions,
  computeOrderActualVsStandardCosting,
  computeLateReceiptCmupAdjustment,
  buildLotTraceabilityGraph,
  evaluateMachineMaintenanceStatus,
  applySessionToMachineRuntime,
  validateWorkstationStartPrerequisites,
  evaluateScrapToleranceAlert,
  computePieceRateEarnings,
  aggregateMfgPieceRatePayroll,
  optimizeLinearBarCutting1D,
  optimizeSheetSlabCutting2D,
  buildDimensionQuoteLineItems,
} from './manufacturingDepth';
import type {
  ManufacturingBom,
  ManufacturingOrder,
  RawMaterialStockItem,
  MaterialTransferVoucher,
  WorkstationSessionLog,
  QualityInspectionRecord,
  MfgNcrRecord,
  MfgFinishedGoodsLot,
  MfgMachineAsset,
  MfgMachineMaintenanceLog,
  MfgPieceRateEntry,
} from '../types';

const baseBom: ManufacturingBom = {
  id: 'bom_test_01',
  accountId: 'acc_test',
  businessId: 'biz_mfg',
  branchId: 'br_mfg',
  staffId: 'st_01',
  finishedProductId: 'prod_01',
  finishedProductName: 'Châssis Aluminium Fenêtre',
  bomCode: 'BOM-ALU-01',
  version: 1,
  batchYield: 2,
  unit: 'Unité',
  standardLaborHours: 4,
  components: [
    {
      rawProductId: 'raw_alu',
      rawProductName: 'Profilé Aluminium 6m',
      quantity: 4,
      unit: 'Barre',
      scrapAllowancePercent: 10,
      unitCostDzd: 3500,
    },
  ],
  routingSteps: [
    {
      id: 'step_1',
      stepNumber: 1,
      workCenterId: 'wc_1',
      workCenterName: 'Banc Coupe Double Tête',
      operationName: 'Coupe Onglet 45°',
      setupTimeMinutes: 30,
      runTimePerUnitMinutes: 30,
      operatorRateDzdPerHour: 1000,
      machineRateDzdPerHour: 2000,
    },
  ],
  estimatedCostDzd: 19900,
  isActive: true,
  status: 'Active',
  createdAt: '2026-10-01T08:00:00Z',
};

const baseOrder: ManufacturingOrder = {
  id: 'of_test_01',
  accountId: 'acc_test',
  businessId: 'biz_mfg',
  branchId: 'br_mfg',
  staffId: 'st_01',
  orderNumber: 'OF-2026-0001',
  bomId: 'bom_test_01',
  bomCode: 'BOM-ALU-01',
  pinnedBomVersion: 1,
  productName: 'Châssis Aluminium Fenêtre',
  targetQuantity: 10,
  actualQuantityProduced: 0,
  scrapQuantity: 0,
  batchLotNumber: 'LOT-2026-0001',
  startDate: '2026-10-02',
  dueDate: '2026-10-10',
  status: 'InProduction',
  totalMaterialCostDzd: 77000,
  totalLaborCostDzd: 22500,
  totalCostDzd: 99500,
  createdAt: '2026-10-02T08:00:00Z',
};

const baseMaterials: RawMaterialStockItem[] = [
  {
    id: 'raw_alu',
    accountId: 'acc_test',
    businessId: 'biz_mfg',
    branchId: 'br_mfg',
    staffId: 'st_01',
    sku: 'ALU-6000',
    name: 'Profilé Aluminium 6m',
    category: 'Metals',
    currentStock: 10,
    allocatedStock: 2,
    availableStock: 8,
    reorderThreshold: 12,
    unit: 'Barre',
    unitCostPmpDzd: 3500,
    totalValuationDzd: 35000,
    warehouseLocation: 'Rack A1',
    supplierLotNumber: 'SUP-LOT-ALU-88',
    onmlCertificateRef: 'ONML-CERT-2026-09',
    createdAt: '2026-09-15T08:00:00Z',
  },
];

describe('7.12 manufacturingDepth engines', () => {
  it('formats sequential manufacturing codes without collision', () => {
    const nextAndn = formatMfgSequentialCode('ANDN', ['ANDN-2026-00001', 'ANDN-2026-00004'], 2026);
    assert.equal(nextAndn, 'ANDN-2026-00005');
    const firstPfg = formatMfgSequentialCode('PFG', [], 2026);
    assert.equal(firstPfg, 'PFG-2026-00001');
  });

  it('detects BOM lock on active orders, captures snapshot, and forks immutable v+1', () => {
    assert.equal(isBomLockedByOrders('bom_test_01', [baseOrder]), true);
    assert.equal(isBomLockedByOrders('bom_test_01', [{ ...baseOrder, status: 'Cancelled' }]), false);

    const snapshot = captureBomSnapshot(baseBom, '2026-10-02T08:00:00Z');
    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.components.length, 1);
    assert.ok(snapshot.standardCostCentimes > 0);

    const { archivedSource, nextBom } = forkBomNewVersion(baseBom, {
      batchYield: 4,
      notes: 'Optimisation chute coupe',
    });
    assert.equal(archivedSource.isActive, false);
    assert.equal(archivedSource.status, 'Archived');
    assert.equal(nextBom.version, 2);
    assert.equal(nextBom.parentBomId, baseBom.id);
    assert.equal(nextBom.bomFamilyId, baseBom.id);
    assert.equal(nextBom.isActive, true);
    assert.notEqual(nextBom.id, baseBom.id);
  });

  it('aggregates multi-OF component shortages and reorder threshold suggestions', () => {
    const secondOrder: ManufacturingOrder = {
      ...baseOrder,
      id: 'of_test_02',
      orderNumber: 'OF-2026-0002',
      targetQuantity: 4,
      status: 'Planned',
    };
    // Total target = 14 units / batchYield 2 = 7 batches * (4 * 1.1) = 30.8 barres required; available = 8 -> shortage = 22.8
    const suggestions = computeMultiOfPurchaseSuggestions([baseOrder, secondOrder], [baseBom], baseMaterials);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].materialId, 'raw_alu');
    assert.equal(suggestions[0].shortageQuantity, 22.8);
    assert.equal(suggestions[0].reason, 'both');
    assert.deepEqual(suggestions[0].impactedOrderNumbers, ['OF-2026-0001', 'OF-2026-0002']);
    assert.ok(suggestions[0].estimatedOrderTotalCentimes > 0);
  });

  it('computes actual vs standard costing (BSM - returns + session labor) and late-receipt CMUP delta', () => {
    const vouchers: MaterialTransferVoucher[] = [
      {
        id: 'v_1',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'st_01',
        voucherNumber: 'BSM-2026-01',
        voucherType: 'BonDeSortie',
        orderId: 'of_test_01',
        orderNumber: 'OF-2026-0001',
        recipientStaffName: 'Karim',
        transferDate: '2026-10-03',
        items: [
          { materialId: 'raw_alu', materialName: 'Profilé Aluminium 6m', quantity: 25, unit: 'Barre', unitCostDzd: 3500 },
        ],
        totalValueDzd: 87500,
      },
      {
        id: 'v_2',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'st_01',
        voucherNumber: 'BT-2026-01',
        voucherType: 'BonDeTransfert',
        orderId: 'of_test_01',
        orderNumber: 'OF-2026-0001',
        recipientStaffName: 'Karim',
        transferDate: '2026-10-04',
        items: [
          { materialId: 'raw_alu', materialName: 'Profilé Aluminium 6m', quantity: 3, unit: 'Barre', unitCostDzd: 3500 },
        ],
        totalValueDzd: 10500,
      },
    ];
    const logs: WorkstationSessionLog[] = [
      {
        id: 'log_1',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'st_01',
        operatorName: 'Karim',
        workCenterId: 'wc_1',
        workCenterName: 'Banc Coupe',
        orderId: 'of_test_01',
        orderNumber: 'OF-2026-0001',
        stepNumber: 1,
        operationName: 'Coupe',
        startTime: '2026-10-03T08:00:00Z',
        durationSeconds: 18000, // 5 hours
        pauseDurationSeconds: 0,
        goodQuantity: 10,
        scrapQuantity: 0,
        status: 'Submitted',
        createdAt: '2026-10-03T13:00:00Z',
      },
    ];

    const cmp = computeOrderActualVsStandardCosting({
      order: baseOrder,
      bom: baseBom,
      vouchers,
      sessionLogs: logs,
      materials: baseMaterials,
    });
    assert.equal(cmp.actualMaterialIssuedCentimes, 8_750_000);
    assert.equal(cmp.actualMaterialReturnedCentimes, 1_050_000);
    assert.equal(cmp.actualMaterialNetCentimes, 7_700_000);
    assert.equal(cmp.actualHoursLogged, 5);
    assert.equal(cmp.actualLaborMachineCentimes, 1_500_000); // 5h * 3000 DZD

    const lateCmup = computeLateReceiptCmupAdjustment({
      material: baseMaterials[0],
      incomingQty: 10,
      incomingUnitCostDzd: 4500,
      vouchers,
      activeOrders: [baseOrder],
    });
    assert.equal(lateCmup.previousCmupCentimes, 350_000);
    assert.equal(lateCmup.newCmupCentimes, 400_000);
    assert.equal(lateCmup.hasMaterialDeltaWarning, true);
    assert.equal(lateCmup.affectedOrders[0].consumedQty, 22);
    assert.equal(lateCmup.affectedOrders[0].recalcDeltaCentimes, 1_100_000);
  });

  it('builds complete end-to-end lot traceability graph', () => {
    const vouchers: MaterialTransferVoucher[] = [
      {
        id: 'v_1',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'st_01',
        voucherNumber: 'BSM-2026-01',
        voucherType: 'BonDeSortie',
        orderId: 'of_test_01',
        orderNumber: 'OF-2026-0001',
        recipientStaffName: 'Karim',
        transferDate: '2026-10-03',
        items: [{ materialId: 'raw_alu', materialName: 'Profilé Alu', quantity: 22, unit: 'Barre', unitCostDzd: 3500 }],
        totalValueDzd: 77000,
      },
    ];
    const qcs: QualityInspectionRecord[] = [
      {
        id: 'qc_1',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'st_01',
        inspectionNumber: 'QC-2026-01',
        orderId: 'of_test_01',
        orderNumber: 'OF-2026-0001',
        batchLotNumber: 'LOT-2026-0001',
        productName: 'Châssis Aluminium',
        sampleSize: 5,
        inspectedQuantity: 10,
        acceptedQuantity: 9,
        rejectedQuantity: 1,
        verdict: 'AcceptedWithDerogation',
        checkpoints: [],
        inspectorName: 'Nadia QC',
        inspectionDate: '2026-10-05',
        certificateOfConformityGenerated: true,
      },
    ];
    const ncrs: MfgNcrRecord[] = [
      {
        id: 'ncr_1',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'st_01',
        ncrNumber: 'NCR-2026-01',
        orderId: 'of_test_01',
        ofNumber: 'OF-2026-0001',
        lotNumber: 'LOT-2026-0001',
        productName: 'Châssis Aluminium',
        scrappedQuantity: 1,
        reason: 'Rayure profilé',
        disposition: 'Scrapped',
        status: 'Open',
        cmupAdjustmentHeld: true,
        createdAt: '2026-10-05T10:00:00Z',
      },
    ];
    const fgLots: MfgFinishedGoodsLot[] = [
      {
        id: 'fg_1',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'st_01',
        lotNumber: 'PFG-2026-00001',
        sku: 'FIN-ALU-01',
        productName: 'Châssis Aluminium Fenêtre',
        orderId: 'of_test_01',
        orderNumber: 'OF-2026-0001',
        qtyProduced: 9,
        qtyReserved: 0,
        qtyDelivered: 0,
        unit: 'Unité',
        unitCmupCentimes: 995000,
        warehouseLocation: 'Magasin PF',
        releaseStatus: 'Released',
        linkedUnifiedDocId: 'doc_bl_1',
        producedAt: '2026-10-05T11:00:00Z',
        createdAt: '2026-10-05T11:00:00Z',
      },
    ];

    const graph = buildLotTraceabilityGraph({
      order: baseOrder,
      materials: baseMaterials,
      vouchers,
      qcRecords: qcs,
      ncrRecords: ncrs,
      finishedGoodsLots: fgLots,
      unifiedDocuments: [
        {
          id: 'doc_bl_1',
          accountId: 'acc_test',
          businessId: 'biz_mfg',
          branchId: 'br_mfg',
          sourceVertical: 'manufacturing_production',
          docType: 'bl',
          draftNumber: 'DR-BL-00012',
          docNumber: 'BL-2026-00012',
          fiscalYear: 2026,
          status: 'Issued',
          partyName: 'SARL Bâtiment Nord',
          docDate: '2026-10-06',
          paymentMethod: 'bank_transfer',
          paymentTerms: 'À réception',
          currency: 'DZD',
          fxRate: 1,
          fxRateDate: '2026-10-06',
          timbreBasis: 'exempt',
          items: [],
          tvaBreakdown: [],
          totalHtRawCentimes: 14_500_000,
          generalDiscountPercent: 0,
          totalHtFinalCentimes: 14_500_000,
          totalTvaCentimes: 2_755_000,
          timbreFiscalCentimes: 0,
          totalTtcCentimes: 17_255_000,
          guaranteeRetentionPercent: 0,
          guaranteeRetentionCentimes: 0,
          netToPayCentimes: 17_255_000,
          paidCentimes: 0,
          balanceDueCentimes: 17_255_000,
          fiscalHeaderSnapshot: { companyName: 'Atelier Test' },
          totalsInWordsFr: 'Cent soixante-douze mille cinq cent cinquante dinars',
          totalsInWordsAr: '',
          includeStampSignature: true,
          printedCount: 0,
          createdAt: '2026-10-06T09:00:00Z',
          updatedAt: '2026-10-06T09:00:00Z',
        },
      ],
    });

    assert.equal(graph.upstreamMaterials[0].supplierLotNumber, 'SUP-LOT-ALU-88');
    assert.equal(graph.qualityGates[0].inspectionNumber, 'QC-2026-01');
    assert.equal(graph.ncrHolds[0].cmupAdjustmentHeld, true);
    assert.equal(graph.finishedGoodsLots[0].lotNumber, 'PFG-2026-00001');
    assert.equal(graph.downstreamDocuments[0].documentNumber, 'BL-2026-00012');
  });

  it('evaluates preventive maintenance overdue state and updates machine runtime', () => {
    const machine: MfgMachineAsset = {
      id: 'wc_1',
      accountId: 'acc_test',
      businessId: 'biz_mfg',
      branchId: 'br_mfg',
      staffId: 'st_01',
      code: 'CNC-01',
      name: 'Fraiseuse CNC 5 Axes',
      department: 'Usinage',
      machineType: 'CNC',
      hourlyCostDzd: 3500,
      status: 'Running',
      runningHours: 248,
      cycleCount: 1200,
      maintenanceIntervalHours: 250,
      maintenanceIntervalDays: 90,
      nextMaintenanceDueDate: '2026-12-01',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const updated = applySessionToMachineRuntime(machine, 14400, 15); // +4h
    assert.equal(updated.runningHours, 252);
    assert.equal(updated.cycleCount, 1215);

    const logs: MfgMachineMaintenanceLog[] = [];
    const evals = evaluateMachineMaintenanceStatus([updated], logs, '2026-10-15');
    assert.equal(evals[0].isDueByHours, true);
    assert.equal(evals[0].isOverdue, true);
  });

  it('enforces operator PIN, Loi 88-07 PPE checklist, excess scrap (>10%) NCR alert, and piece-rate payroll bridge', () => {
    const gateFail = validateWorkstationStartPrerequisites({
      operator: { id: 'op_1', name: 'Amine', pin: '4321' },
      enteredPin: '1111',
      ppeChecklist: { glasses: true, gloves: true, shoes: false, helmet: true },
      order: baseOrder,
      bom: baseBom,
      materials: baseMaterials,
    });
    assert.equal(gateFail.canStart, false);
    assert.deepEqual(gateFail.errors, ['PIN_INVALID', 'PPE_INCOMPLETE']);

    const gatePass = validateWorkstationStartPrerequisites({
      operator: { id: 'op_1', name: 'Amine', pin: '4321' },
      enteredPin: '4321',
      ppeChecklist: { glasses: true, gloves: true, shoes: true, helmet: true },
      order: baseOrder,
      bom: baseBom,
      materials: baseMaterials,
    });
    assert.equal(gatePass.canStart, true);

    const scrapCheck = evaluateScrapToleranceAlert({ goodQty: 18, scrapQty: 3 });
    assert.equal(scrapCheck.scrapPercent, 14.3);
    assert.equal(scrapCheck.exceedsTolerance, true);
    assert.equal(scrapCheck.requiresNcr, true);

    const grossCentimes = computePieceRateEarnings({ goodUnits: 120, ratePerPieceCentimes: 25_000 }); // 250 DZD/piece
    assert.equal(grossCentimes, 3_000_000); // 30,000 DZD

    const entries: MfgPieceRateEntry[] = [
      {
        id: 'pr_1',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'op_1',
        operatorStaffId: 'op_1',
        operatorName: 'Amine',
        orderNumber: 'OF-2026-0001',
        periodMonth: '2026-10',
        goodUnits: 120,
        scrapUnits: 2,
        ratePerPieceCentimes: 25_000,
        grossAmountCentimes: grossCentimes,
        status: 'posted_to_payroll',
        createdAt: '2026-10-10T10:00:00Z',
      },
      {
        id: 'pr_2',
        accountId: 'acc_test',
        businessId: 'biz_mfg',
        branchId: 'br_mfg',
        staffId: 'op_1',
        operatorStaffId: 'op_1',
        operatorName: 'Amine',
        orderNumber: 'OF-2026-0002',
        periodMonth: '2026-10',
        goodUnits: 20,
        scrapUnits: 0,
        ratePerPieceCentimes: 25_000,
        grossAmountCentimes: 500_000,
        status: 'accrued',
        createdAt: '2026-10-11T10:00:00Z',
      },
    ];
    const payBridge = aggregateMfgPieceRatePayroll(entries, 'op_1', '2026-10');
    assert.equal(payBridge.totalCentimes, 3_000_000);
    assert.equal(payBridge.totalDzd, 30000);
    assert.deepEqual(payBridge.matchedEntryIds, ['pr_1']);
  });

  it('optimizes 1D bar cutting & 2D sheet nesting with reusable offcuts and builds 6.1 quote lines', () => {
    const plan1d = optimizeLinearBarCutting1D({
      stockLengthMm: 6000,
      kerfMm: 4,
      minReusableOffcutMm: 500,
      parts: [
        { id: 'p1', label: 'Montant Vertical', lengthMm: 2200, quantity: 4 },
        { id: 'p2', label: 'Traverse Basse', lengthMm: 1200, quantity: 4 },
      ],
    });
    assert.equal(plan1d.mode, '1d_linear');
    assert.equal(plan1d.stockUnitsRequired, 3);
    assert.ok(plan1d.wastePercent < 25);
    assert.ok(plan1d.reusableOffcutsCount >= 1);

    const quoteLines1d = buildDimensionQuoteLineItems({
      tradeCategory: 'Aluminum',
      cuttingMode: '1d_linear',
      parts: [{ id: 'p1', label: 'Montant Vertical', lengthMm: 2200, quantity: 4 }],
      layoutResult: plan1d,
      unitPriceDzd: 1850,
    });
    assert.equal(quoteLines1d[0].unit, 'ml');
    assert.equal(quoteLines1d[0].quantity, 8.8);
    assert.equal(quoteLines1d[0].lineTotalHt, 16280);

    const plan2d = optimizeSheetSlabCutting2D({
      stockLengthMm: 2440,
      stockWidthMm: 1220,
      kerfMm: 4,
      parts: [
        { id: 's1', label: 'Porte Placard MDF', lengthMm: 2000, widthMm: 600, quantity: 2 },
        { id: 's2', label: 'Étagère Intérieure', lengthMm: 900, widthMm: 500, quantity: 4 },
      ],
    });
    assert.equal(plan2d.mode, '2d_sheet');
    assert.ok(plan2d.stockUnitsRequired >= 2);

    const quoteLines2d = buildDimensionQuoteLineItems({
      tradeCategory: 'Wood',
      cuttingMode: '2d_sheet',
      parts: [{ id: 's1', label: 'Porte Placard MDF', lengthMm: 2000, widthMm: 600, quantity: 2 }],
      layoutResult: plan2d,
      unitPriceDzd: 4500,
    });
    assert.equal(quoteLines2d[0].unit, 'm²');
    assert.equal(quoteLines2d[0].quantity, 2.4);
    assert.equal(quoteLines2d[0].lineTotalHt, 10800);
  });
});

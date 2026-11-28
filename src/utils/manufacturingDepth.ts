/**
 * Phase 3 Step 12 (7.12 manufacturing_production): Pure Business Logic Engines
 * - Sequential manufacturing codes (ANDN / MNT / PFG / CUT)
 * - Immutable BOM versioning & active-OF pinning
 * - Multi-OF raw-material shortage aggregation & reorder suggestions
 * - Actual vs. standard costing + late-receipt CMUP recalculation delta
 * - End-to-end lot traceability graph
 * - Preventive machine maintenance evaluation & runtime accounting
 * - Workstation operator PIN + Loi 88-07 PPE prerequisites + scrap >10% detection
 * - Operator piece-rate earnings & payroll slip aggregation
 * - 1D linear bar cutting optimization (First-Fit Decreasing with kerf & offcuts)
 * - 2D sheet/slab nesting optimization & dimension-based quote line builder
 */

import type {
  ManufacturingBom,
  ManufacturingBomSnapshot,
  ManufacturingOrder,
  WorkstationSessionLog,
  RawMaterialStockItem,
  MaterialTransferVoucher,
  QualityInspectionRecord,
  MfgNcrRecord,
  MfgFinishedGoodsLot,
  MfgMachineAsset,
  MfgMachineMaintenanceLog,
  MfgPieceRateEntry,
  MfgPpeChecklist,
  MfgCuttingPartInput,
  MfgCuttingLayoutResult,
  MfgCuttingStockBarOrSheet,
  MfgCuttingPlan,
  UnifiedDocument,
  UnifiedDocType,
} from '../types';
import { calculateBomCost } from './manufacturingRules';
import type { UnifiedLineInput } from './invoicingEngine';
import {
  dzdToCentimes,
  centimesToDzd,
  roundHalfAwayFromZero,
  addCentimes,
  subtractCentimes,
  multiplyCentimes,
} from './money';

export type MfgSequentialPrefix = 'ANDN' | 'MNT' | 'PFG' | 'CUT';

export function formatMfgSequentialCode(
  prefix: MfgSequentialPrefix,
  existingNumbers: string[],
  fiscalYear: number = new Date().getFullYear()
): string {
  const yearPrefix = `${prefix}-${fiscalYear}-`;
  let maxSeq = 0;
  for (const num of existingNumbers) {
    if (typeof num !== 'string') continue;
    if (num.startsWith(yearPrefix)) {
      const parsed = parseInt(num.slice(yearPrefix.length), 10);
      if (Number.isFinite(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(5, '0');
  return `${yearPrefix}${nextSeq}`;
}

// ---------------------------------------------------------------------------
// 1) BOM Versioning & Active-OF Pinning
// ---------------------------------------------------------------------------

export function isBomLockedByOrders(bomId: string, orders: ManufacturingOrder[]): boolean {
  if (!bomId) return false;
  return orders.some(
    (order) => order.bomId === bomId && order.status !== 'Cancelled'
  );
}

export function captureBomSnapshot(
  bom: ManufacturingBom,
  capturedAt: string = new Date().toISOString()
): ManufacturingBomSnapshot {
  const breakdown = calculateBomCost(
    bom.components || [],
    bom.routingSteps || [],
    Math.max(1, bom.batchYield || 1),
    bom.targetMarginPercent ?? 35
  );
  return {
    bomId: bom.id,
    bomCode: bom.bomCode,
    version: Math.max(1, bom.version || 1),
    capturedAt,
    batchYield: Math.max(1, bom.batchYield || 1),
    standardCostCentimes: dzdToCentimes(breakdown.totalCostOfProductionDzd),
    components: (bom.components || []).map((c) => ({ ...c })),
    routingSteps: (bom.routingSteps || []).map((s) => ({ ...s })),
  };
}

export function forkBomNewVersion(
  sourceBom: ManufacturingBom,
  updates: Partial<ManufacturingBom>,
  nowIso: string = new Date().toISOString()
): { archivedSource: ManufacturingBom; nextBom: ManufacturingBom } {
  const nextVersion = Math.max(1, sourceBom.version || 1) + 1;
  const familyId = sourceBom.bomFamilyId || sourceBom.id;
  const nextComponents = updates.components ?? sourceBom.components ?? [];
  const nextRouting = updates.routingSteps ?? sourceBom.routingSteps ?? [];
  const nextBatchYield = Math.max(1, updates.batchYield ?? sourceBom.batchYield ?? 1);
  const nextMargin = updates.targetMarginPercent ?? sourceBom.targetMarginPercent ?? 35;

  const cost = calculateBomCost(nextComponents, nextRouting, nextBatchYield, nextMargin);

  const archivedSource: ManufacturingBom = {
    ...sourceBom,
    bomFamilyId: familyId,
    isActive: false,
    status: 'Archived',
    updatedAt: nowIso,
  };

  const nextId =
    updates.id && updates.id !== sourceBom.id
      ? updates.id
      : `${familyId}_v${nextVersion}_${Date.now().toString(36)}`;

  const nextBom: ManufacturingBom = {
    ...sourceBom,
    ...updates,
    id: nextId,
    bomFamilyId: familyId,
    parentBomId: sourceBom.id,
    version: nextVersion,
    rowVersion: 1,
    components: nextComponents.map((c) => ({ ...c })),
    routingSteps: nextRouting.map((r) => ({ ...r })),
    batchYield: nextBatchYield,
    totalMaterialCostDzd: cost.totalMaterialCostDzd,
    totalLaborMachineCostDzd: cost.totalLaborMachineCostDzd,
    estimatedCostDzd: cost.totalCostOfProductionDzd,
    suggestedSalePriceDzd: cost.suggestedSalePriceDzd,
    isActive: true,
    status: 'Active',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return { archivedSource, nextBom };
}

// ---------------------------------------------------------------------------
// 2) Multi-OF Raw-Material Purchase Suggestions
// ---------------------------------------------------------------------------

export interface MfgPurchaseSuggestion {
  materialId: string;
  sku: string;
  materialName: string;
  unit: string;
  currentStock: number;
  allocatedStock: number;
  availableStock: number;
  reorderThreshold: number;
  totalRequiredAcrossOfs: number;
  shortageQuantity: number;
  suggestedOrderQuantity: number;
  estimatedUnitCostCentimes: number;
  estimatedOrderTotalCentimes: number;
  impactedOrderNumbers: string[];
  reason: 'of_shortage' | 'below_reorder_threshold' | 'both';
  urgency: 'critical' | 'high' | 'normal';
}

export function computeMultiOfPurchaseSuggestions(
  orders: ManufacturingOrder[],
  boms: ManufacturingBom[],
  materials: RawMaterialStockItem[]
): MfgPurchaseSuggestion[] {
  const activeOrders = orders.filter((o) =>
    ['Draft', 'Planned', 'Scheduled', 'MaterialsIssued', 'InProduction'].includes(o.status)
  );

  const bomById = new Map<string, ManufacturingBom>();
  boms.forEach((b) => bomById.set(b.id, b));

  const materialById = new Map<string, RawMaterialStockItem>();
  materials.forEach((m) => {
    materialById.set(m.id, m);
    materialById.set(m.sku, m);
  });

  const demandMap = new Map<
    string,
    { requiredQty: number; orderNumbers: Set<string>; fallbackName: string; fallbackUnit: string; fallbackCostDzd: number }
  >();

  for (const order of activeOrders) {
    const bom = bomById.get(order.bomId);
    const snapshot = order.bomSnapshot;
    const components = snapshot?.components?.length ? snapshot.components : bom?.components || [];
    const batchYield = Math.max(1, snapshot?.batchYield ?? bom?.batchYield ?? 1);
    const remainingTarget = Math.max(
      0,
      (order.targetQuantity || order.quantityOrdered || 0) -
        (order.status === 'InProduction' || order.status === 'MaterialsIssued'
          ? order.actualQuantityProduced || order.quantityProduced || 0
          : 0)
    );
    if (remainingTarget <= 0) continue;

    const batchFactor = remainingTarget / batchYield;
    for (const comp of components) {
      const scrapFactor = 1 + (comp.scrapAllowancePercent || 0) / 100;
      const qty = comp.quantity * batchFactor * scrapFactor;
      const mat = materialById.get(comp.rawProductId);
      const canonicalId = mat ? mat.id : comp.rawProductId;

      const existing = demandMap.get(canonicalId) || {
        requiredQty: 0,
        orderNumbers: new Set<string>(),
        fallbackName: mat?.name || comp.rawProductName,
        fallbackUnit: mat?.unit || comp.unit,
        fallbackCostDzd: mat?.unitCostPmpDzd || comp.unitCostDzd || 0,
      };
      existing.requiredQty += qty;
      existing.orderNumbers.add(order.orderNumber);
      demandMap.set(canonicalId, existing);
    }
  }

  const allMaterialIds = new Set<string>([
    ...materials.map((m) => m.id),
    ...Array.from(demandMap.keys()),
  ]);

  const suggestions: MfgPurchaseSuggestion[] = [];

  for (const matId of allMaterialIds) {
    const mat = materialById.get(matId);
    const demand = demandMap.get(matId);
    const currentStock = mat ? Math.max(0, mat.currentStock) : 0;
    const allocatedStock = mat ? Math.max(0, mat.allocatedStock) : 0;
    const availableStock = mat ? Math.max(0, mat.availableStock) : 0;
    const reorderThreshold = mat ? Math.max(0, mat.reorderThreshold) : 0;
    const requiredQty = demand ? Math.round(demand.requiredQty * 100) / 100 : 0;

    const shortageQuantity = Math.max(0, Math.round((requiredQty - availableStock) * 100) / 100);
    const belowThreshold = mat ? availableStock <= reorderThreshold : false;

    if (shortageQuantity <= 0 && !belowThreshold) continue;

    const safetyBuffer = Math.max(reorderThreshold - Math.max(0, availableStock - requiredQty), 0);
    const rawOrderQty = shortageQuantity > 0
      ? shortageQuantity + Math.round(reorderThreshold * 0.5 * 100) / 100
      : Math.max(reorderThreshold * 2 - availableStock, safetyBuffer, 1);

    const suggestedOrderQuantity = Math.max(1, Math.ceil(rawOrderQty * 100) / 100);
    const unitCostCentimes = dzdToCentimes(mat?.unitCostPmpDzd ?? demand?.fallbackCostDzd ?? 0);
    const estimatedOrderTotalCentimes = roundHalfAwayFromZero(unitCostCentimes * suggestedOrderQuantity);

    const reason: MfgPurchaseSuggestion['reason'] =
      shortageQuantity > 0 && belowThreshold
        ? 'both'
        : shortageQuantity > 0
        ? 'of_shortage'
        : 'below_reorder_threshold';

    const urgency: MfgPurchaseSuggestion['urgency'] =
      shortageQuantity > 0 && availableStock <= 0
        ? 'critical'
        : shortageQuantity > 0 || availableStock < reorderThreshold * 0.5
        ? 'high'
        : 'normal';

    suggestions.push({
      materialId: matId,
      sku: mat?.sku || matId,
      materialName: mat?.name || demand?.fallbackName || matId,
      unit: mat?.unit || demand?.fallbackUnit || 'U',
      currentStock,
      allocatedStock,
      availableStock,
      reorderThreshold,
      totalRequiredAcrossOfs: requiredQty,
      shortageQuantity,
      suggestedOrderQuantity,
      estimatedUnitCostCentimes: unitCostCentimes,
      estimatedOrderTotalCentimes,
      impactedOrderNumbers: demand ? Array.from(demand.orderNumbers) : [],
      reason,
      urgency,
    });
  }

  const urgencyRank = { critical: 0, high: 1, normal: 2 };
  return suggestions.sort(
    (a, b) =>
      urgencyRank[a.urgency] - urgencyRank[b.urgency] ||
      b.shortageQuantity - a.shortageQuantity ||
      a.materialName.localeCompare(b.materialName)
  );
}

// ---------------------------------------------------------------------------
// 3) Actual vs. Standard Costing & Late-Receipt CMUP Recalculation
// ---------------------------------------------------------------------------

export interface MfgOrderCostComparison {
  orderId: string;
  orderNumber: string;
  standardMaterialCentimes: number;
  standardLaborCentimes: number;
  standardTotalCentimes: number;
  actualMaterialIssuedCentimes: number;
  actualMaterialReturnedCentimes: number;
  actualMaterialNetCentimes: number;
  actualLaborMachineCentimes: number;
  actualTotalCentimes: number;
  materialVarianceCentimes: number;
  laborVarianceCentimes: number;
  totalVarianceCentimes: number;
  variancePercent: number;
  actualHoursLogged: number;
  cmupRecalcDeltaCentimes: number;
  costVarianceFlag: 'under_budget' | 'on_budget' | 'overrun';
}

export function computeOrderActualVsStandardCosting(params: {
  order: ManufacturingOrder;
  bom?: ManufacturingBom;
  vouchers: MaterialTransferVoucher[];
  sessionLogs: WorkstationSessionLog[];
  materials?: RawMaterialStockItem[];
}): MfgOrderCostComparison {
  const { order, bom, vouchers, sessionLogs, materials = [] } = params;
  const targetQty = Math.max(1, order.targetQuantity || order.quantityOrdered || 1);

  const snapshot = order.bomSnapshot;
  const components = snapshot?.components?.length ? snapshot.components : bom?.components || [];
  const routingSteps = snapshot?.routingSteps?.length ? snapshot.routingSteps : bom?.routingSteps || [];
  const batchYield = Math.max(1, snapshot?.batchYield ?? bom?.batchYield ?? 1);

  const bomBreakdown =
    components.length > 0 || routingSteps.length > 0
      ? calculateBomCost(components, routingSteps, batchYield, bom?.targetMarginPercent ?? 35)
      : null;

  const batchFactor = targetQty / batchYield;
  const standardMaterialCentimes = bomBreakdown
    ? dzdToCentimes(bomBreakdown.totalMaterialCostDzd * batchFactor)
    : dzdToCentimes(order.totalMaterialCostDzd || 0);
  const standardLaborCentimes = bomBreakdown
    ? dzdToCentimes(bomBreakdown.totalLaborMachineCostDzd * batchFactor)
    : dzdToCentimes(order.totalLaborCostDzd || 0);
  const standardTotalCentimes = addCentimes(standardMaterialCentimes, standardLaborCentimes);

  const orderVouchers = vouchers.filter(
    (v) => v.orderId === order.id || v.orderNumber === order.orderNumber
  );

  let issuedCentimes = 0;
  let returnedCentimes = 0;
  let currentCmupRevaluedNetCentimes = 0;
  const matMap = new Map(materials.map((m) => [m.id, m]));

  for (const v of orderVouchers) {
    const voucherCentimes = (v.items || []).reduce(
      (sum, item) => addCentimes(sum, roundHalfAwayFromZero(dzdToCentimes(item.unitCostDzd || 0) * (item.quantity || 0))),
      0
    );
    const voucherAtCurrentPmp = (v.items || []).reduce((sum, item) => {
      const mat = matMap.get(item.materialId);
      const pmpDzd = mat ? mat.unitCostPmpDzd : item.unitCostDzd || 0;
      return addCentimes(sum, roundHalfAwayFromZero(dzdToCentimes(pmpDzd) * (item.quantity || 0)));
    }, 0);

    if (v.voucherType === 'BonDeSortie') {
      issuedCentimes = addCentimes(issuedCentimes, voucherCentimes);
      currentCmupRevaluedNetCentimes = addCentimes(currentCmupRevaluedNetCentimes, voucherAtCurrentPmp);
    } else if (v.voucherType === 'BonDeTransfert') {
      returnedCentimes = addCentimes(returnedCentimes, voucherCentimes);
      currentCmupRevaluedNetCentimes = subtractCentimes(currentCmupRevaluedNetCentimes, voucherAtCurrentPmp);
    }
  }

  const actualMaterialNetCentimes =
    orderVouchers.length > 0
      ? Math.max(0, subtractCentimes(issuedCentimes, returnedCentimes))
      : order.actualMaterialCostCentimes && order.actualMaterialCostCentimes > 0
      ? order.actualMaterialCostCentimes
      : dzdToCentimes(order.totalMaterialCostDzd || 0);

  const orderLogs = sessionLogs.filter(
    (l) => l.orderId === order.id || l.orderNumber === order.orderNumber
  );

  const avgHourlyRateDzd =
    routingSteps.length > 0
      ? routingSteps.reduce(
          (acc, step) => acc + (step.operatorRateDzdPerHour || 0) + (step.machineRateDzdPerHour || 0),
          0
        ) / routingSteps.length
      : 2800;

  let actualSeconds = 0;
  for (const log of orderLogs) {
    actualSeconds += Math.max(0, log.durationSeconds || 0);
  }
  const actualHoursLogged = Math.round((actualSeconds / 3600) * 100) / 100;

  const actualLaborMachineCentimes =
    orderLogs.length > 0
      ? roundHalfAwayFromZero(dzdToCentimes(avgHourlyRateDzd) * actualHoursLogged)
      : order.actualLaborCostCentimes && order.actualLaborCostCentimes > 0
      ? order.actualLaborCostCentimes
      : dzdToCentimes(order.totalLaborCostDzd || 0);

  const actualTotalCentimes = addCentimes(actualMaterialNetCentimes, actualLaborMachineCentimes);
  const materialVarianceCentimes = subtractCentimes(actualMaterialNetCentimes, standardMaterialCentimes);
  const laborVarianceCentimes = subtractCentimes(actualLaborMachineCentimes, standardLaborCentimes);
  const totalVarianceCentimes = subtractCentimes(actualTotalCentimes, standardTotalCentimes);

  const variancePercent =
    standardTotalCentimes > 0
      ? Math.round((totalVarianceCentimes / standardTotalCentimes) * 1000) / 10
      : 0;

  const cmupRecalcDeltaCentimes =
    order.cmupRecalcDeltaCentimes && order.cmupRecalcDeltaCentimes !== 0
      ? order.cmupRecalcDeltaCentimes
      : orderVouchers.length > 0 && materials.length > 0
      ? subtractCentimes(Math.max(0, currentCmupRevaluedNetCentimes), actualMaterialNetCentimes)
      : 0;

  const costVarianceFlag: MfgOrderCostComparison['costVarianceFlag'] =
    variancePercent > 5 ? 'overrun' : variancePercent < -5 ? 'under_budget' : 'on_budget';

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    standardMaterialCentimes,
    standardLaborCentimes,
    standardTotalCentimes,
    actualMaterialIssuedCentimes: issuedCentimes,
    actualMaterialReturnedCentimes: returnedCentimes,
    actualMaterialNetCentimes,
    actualLaborMachineCentimes,
    actualTotalCentimes,
    materialVarianceCentimes,
    laborVarianceCentimes,
    totalVarianceCentimes,
    variancePercent,
    actualHoursLogged,
    cmupRecalcDeltaCentimes,
    costVarianceFlag,
  };
}

export interface MfgLateReceiptCmupResult {
  materialId: string;
  materialName: string;
  previousCmupCentimes: number;
  newCmupCentimes: number;
  unitDeltaCentimes: number;
  affectedOrders: Array<{
    orderId: string;
    orderNumber: string;
    consumedQty: number;
    recalcDeltaCentimes: number;
  }>;
  hasMaterialDeltaWarning: boolean;
}

export function computeLateReceiptCmupAdjustment(params: {
  material: RawMaterialStockItem;
  incomingQty: number;
  incomingUnitCostDzd: number;
  vouchers: MaterialTransferVoucher[];
  activeOrders: ManufacturingOrder[];
}): MfgLateReceiptCmupResult {
  const { material, incomingQty, incomingUnitCostDzd, vouchers, activeOrders } = params;
  const prevCentimes = dzdToCentimes(material.unitCostPmpDzd || 0);
  const safeExistingStock = Math.max(0, material.currentStock || 0);
  const safeIncomingQty = Math.max(0, incomingQty || 0);
  const incomingCentimes = dzdToCentimes(Math.max(0, incomingUnitCostDzd || 0));

  const totalQty = safeExistingStock + safeIncomingQty;
  const newCmupCentimes =
    totalQty <= 0
      ? incomingCentimes
      : roundHalfAwayFromZero((safeExistingStock * prevCentimes + safeIncomingQty * incomingCentimes) / totalQty);

  const unitDeltaCentimes = subtractCentimes(newCmupCentimes, prevCentimes);
  const activeOrderMap = new Map(
    activeOrders
      .filter((o) => o.status !== 'Cancelled')
      .map((o) => [o.id, o])
  );

  const affectedOrders: MfgLateReceiptCmupResult['affectedOrders'] = [];
  if (unitDeltaCentimes !== 0) {
    const consumedByOrder = new Map<string, number>();
    for (const v of vouchers) {
      if (!v.orderId || !activeOrderMap.has(v.orderId)) continue;
      for (const item of v.items || []) {
        if (item.materialId !== material.id) continue;
        const prevQty = consumedByOrder.get(v.orderId) || 0;
        const deltaQty =
          v.voucherType === 'BonDeSortie'
            ? item.quantity
            : v.voucherType === 'BonDeTransfert'
            ? -item.quantity
            : 0;
        consumedByOrder.set(v.orderId, Math.max(0, prevQty + deltaQty));
      }
    }

    for (const [orderId, consumedQty] of consumedByOrder.entries()) {
      if (consumedQty <= 0) continue;
      const ord = activeOrderMap.get(orderId)!;
      affectedOrders.push({
        orderId,
        orderNumber: ord.orderNumber,
        consumedQty,
        recalcDeltaCentimes: roundHalfAwayFromZero(unitDeltaCentimes * consumedQty),
      });
    }
  }

  return {
    materialId: material.id,
    materialName: material.name,
    previousCmupCentimes: prevCentimes,
    newCmupCentimes,
    unitDeltaCentimes,
    affectedOrders,
    hasMaterialDeltaWarning: unitDeltaCentimes !== 0 && affectedOrders.length > 0,
  };
}

// ---------------------------------------------------------------------------
// 4) End-to-End Lot Traceability Graph
// ---------------------------------------------------------------------------

export interface MfgLotTraceabilityGraph {
  orderId: string;
  orderNumber: string;
  batchLotNumber: string;
  productName: string;
  upstreamMaterials: Array<{
    materialId: string;
    materialName: string;
    supplierLotNumber: string;
    onmlCertificateRef?: string;
    voucherNumber: string;
    voucherType: MaterialTransferVoucher['voucherType'];
    quantity: number;
    unit: string;
    transferDate: string;
  }>;
  qualityGates: Array<{
    inspectionNumber: string;
    verdict: QualityInspectionRecord['verdict'];
    acceptedQuantity: number;
    rejectedQuantity: number;
    inspectionDate: string;
    certificateOfConformityGenerated: boolean;
  }>;
  ncrHolds: Array<{
    ncrNumber: string;
    scrappedQuantity: number;
    disposition: MfgNcrRecord['disposition'];
    status: MfgNcrRecord['status'];
    cmupAdjustmentHeld: boolean;
  }>;
  finishedGoodsLots: Array<{
    id: string;
    lotNumber: string;
    qtyProduced: number;
    qtyDelivered: number;
    releaseStatus: MfgFinishedGoodsLot['releaseStatus'];
    unitCmupCentimes: number;
  }>;
  downstreamDocuments: Array<{
    id: string;
    documentNumber: string;
    documentType: UnifiedDocType;
    customerName: string;
    totalCentimes: number;
    status: UnifiedDocument['status'];
  }>;
}

export function buildLotTraceabilityGraph(params: {
  order: ManufacturingOrder;
  materials: RawMaterialStockItem[];
  vouchers: MaterialTransferVoucher[];
  qcRecords: QualityInspectionRecord[];
  ncrRecords: MfgNcrRecord[];
  finishedGoodsLots: MfgFinishedGoodsLot[];
  unifiedDocuments?: UnifiedDocument[];
}): MfgLotTraceabilityGraph {
  const {
    order,
    materials,
    vouchers,
    qcRecords,
    ncrRecords,
    finishedGoodsLots,
    unifiedDocuments = [],
  } = params;

  const materialById = new Map(materials.map((m) => [m.id, m]));

  const upstreamMaterials: MfgLotTraceabilityGraph['upstreamMaterials'] = [];
  for (const v of vouchers) {
    if (v.orderId !== order.id && v.orderNumber !== order.orderNumber) continue;
    for (const item of v.items || []) {
      const mat = materialById.get(item.materialId);
      upstreamMaterials.push({
        materialId: item.materialId,
        materialName: item.materialName,
        supplierLotNumber: item.lotNumber || mat?.supplierLotNumber || 'N/A',
        onmlCertificateRef: mat?.onmlCertificateRef,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        quantity: item.quantity,
        unit: item.unit,
        transferDate: v.transferDate,
      });
    }
  }

  const qualityGates = qcRecords
    .filter(
      (qc) =>
        qc.orderId === order.id ||
        qc.orderNumber === order.orderNumber ||
        qc.batchLotNumber === order.batchLotNumber
    )
    .map((qc) => ({
      inspectionNumber: qc.inspectionNumber,
      verdict: qc.verdict,
      acceptedQuantity: qc.acceptedQuantity,
      rejectedQuantity: qc.rejectedQuantity,
      inspectionDate: qc.inspectionDate,
      certificateOfConformityGenerated: qc.certificateOfConformityGenerated,
    }));

  const ncrHolds = ncrRecords
    .filter(
      (n) =>
        n.orderId === order.id ||
        n.ofNumber === order.orderNumber ||
        n.lotNumber === order.batchLotNumber
    )
    .map((n) => ({
      ncrNumber: n.ncrNumber,
      scrappedQuantity: n.scrappedQuantity,
      disposition: n.disposition,
      status: n.status,
      cmupAdjustmentHeld: n.cmupAdjustmentHeld,
    }));

  const matchedFgLots = finishedGoodsLots.filter(
    (fg) =>
      fg.orderId === order.id ||
      fg.orderNumber === order.orderNumber ||
      fg.lotNumber === order.batchLotNumber
  );

  const fgDocIds = new Set(
    matchedFgLots.map((fg) => fg.linkedUnifiedDocId).filter(Boolean) as string[]
  );

  const downstreamDocuments = unifiedDocuments
    .filter(
      (doc) =>
        doc.id === order.linkedUnifiedDocId ||
        doc.sourceEntityId === order.id ||
        fgDocIds.has(doc.id)
    )
    .map((doc) => ({
      id: doc.id,
      documentNumber: doc.docNumber || doc.draftNumber,
      documentType: doc.docType,
      customerName: doc.partyName || order.clientName || 'Client',
      totalCentimes: doc.totalTtcCentimes || 0,
      status: doc.status,
    }));

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    batchLotNumber: order.batchLotNumber,
    productName: order.productName,
    upstreamMaterials,
    qualityGates,
    ncrHolds,
    finishedGoodsLots: matchedFgLots.map((fg) => ({
      id: fg.id,
      lotNumber: fg.lotNumber,
      qtyProduced: fg.qtyProduced,
      qtyDelivered: fg.qtyDelivered,
      releaseStatus: fg.releaseStatus,
      unitCmupCentimes: fg.unitCmupCentimes,
    })),
    downstreamDocuments,
  };
}

// ---------------------------------------------------------------------------
// 5) Preventive Machine Maintenance Evaluation
// ---------------------------------------------------------------------------

export interface MfgMachineMaintenanceEvaluation {
  machineId: string;
  code: string;
  name: string;
  runningHours: number;
  maintenanceIntervalHours: number;
  hoursRemaining: number;
  nextMaintenanceDueDate?: string;
  isDueByHours: boolean;
  isDueByDate: boolean;
  isOverdue: boolean;
  isWarning: boolean;
  hasOpenTicket: boolean;
}

export function evaluateMachineMaintenanceStatus(
  machines: MfgMachineAsset[],
  maintenanceLogs: MfgMachineMaintenanceLog[],
  todayIsoDate: string = new Date().toISOString().split('T')[0]
): MfgMachineMaintenanceEvaluation[] {
  return machines.map((machine) => {
    const intervalHours = Math.max(1, machine.maintenanceIntervalHours || 250);
    const hoursMod = machine.runningHours % intervalHours;
    const hoursRemaining =
      machine.runningHours > 0 && hoursMod === 0
        ? 0
        : Math.round((intervalHours - hoursMod) * 100) / 100;

    const completedLogs = maintenanceLogs.filter(
      (l) => l.machineId === machine.id && l.status === 'Completed'
    );
    const lastServiceHours =
      completedLogs.length > 0
        ? Math.max(...completedLogs.map((l) => l.runtimeHoursAtService || 0))
        : 0;
    const hoursSinceLastService = Math.max(0, machine.runningHours - lastServiceHours);

    const isDueByHours = hoursSinceLastService >= intervalHours;
    const isDueByDate = Boolean(
      machine.nextMaintenanceDueDate && machine.nextMaintenanceDueDate <= todayIsoDate
    );
    const isOverdue = isDueByHours || isDueByDate;
    const isWarning =
      !isOverdue &&
      (hoursSinceLastService >= intervalHours * 0.85 || hoursRemaining <= intervalHours * 0.15);

    const hasOpenTicket = maintenanceLogs.some(
      (l) => l.machineId === machine.id && (l.status === 'Scheduled' || l.status === 'InProgress' || l.status === 'Overdue')
    );

    return {
      machineId: machine.id,
      code: machine.code,
      name: machine.name,
      runningHours: machine.runningHours,
      maintenanceIntervalHours: intervalHours,
      hoursRemaining: Math.max(0, Math.round((intervalHours - hoursSinceLastService) * 100) / 100),
      nextMaintenanceDueDate: machine.nextMaintenanceDueDate,
      isDueByHours,
      isDueByDate,
      isOverdue,
      isWarning,
      hasOpenTicket,
    };
  });
}

export function applySessionToMachineRuntime(
  machine: MfgMachineAsset,
  durationSeconds: number,
  producedUnits: number
): MfgMachineAsset {
  const addedHours = Math.max(0, durationSeconds) / 3600;
  return {
    ...machine,
    runningHours: Math.round((machine.runningHours + addedHours) * 100) / 100,
    cycleCount: machine.cycleCount + Math.max(0, Math.round(producedUnits)),
    status: 'Idle',
    currentOrderCode: undefined,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 6) Workstation Security (PIN + Loi 88-07 PPE + Material & Scrap Gates)
// ---------------------------------------------------------------------------

export function isPpeChecklistComplete(ppe: MfgPpeChecklist): boolean {
  return Boolean(ppe.glasses && ppe.gloves && ppe.shoes && ppe.helmet);
}

export function validateWorkstationStartPrerequisites(params: {
  operator?: { id: string; fullName?: string; name?: string; pinCode?: string; pin?: string } | null;
  enteredPin: string;
  ppeChecklist: MfgPpeChecklist;
  order?: ManufacturingOrder | null;
  bom?: ManufacturingBom | null;
  materials: RawMaterialStockItem[];
}): {
  canStart: boolean;
  pinValid: boolean;
  ppeComplete: boolean;
  shortageDetected: boolean;
  shortageMaterials: string[];
  errors: string[];
} {
  const { operator, enteredPin, ppeChecklist, order, bom, materials } = params;
  const errors: string[] = [];

  const expectedPin = (operator?.pinCode || operator?.pin || '').trim();
  const normalizedEntered = (enteredPin || '').trim();
  const pinValid = Boolean(
    operator &&
      normalizedEntered.length >= 4 &&
      (expectedPin ? normalizedEntered === expectedPin : normalizedEntered === '0000' || normalizedEntered === '1234')
  );

  if (!operator) errors.push('OP_REQUIRED');
  else if (!pinValid) errors.push('PIN_INVALID');

  const ppeComplete = isPpeChecklistComplete(ppeChecklist);
  if (!ppeComplete) errors.push('PPE_INCOMPLETE');

  const shortageMaterials: string[] = [];
  if (order && order.status !== 'MaterialsIssued') {
    const components = order.bomSnapshot?.components?.length
      ? order.bomSnapshot.components
      : bom?.components || [];
    const matMap = new Map<string, RawMaterialStockItem>();
    materials.forEach((m) => {
      matMap.set(m.id, m);
      matMap.set(m.sku, m);
    });
    for (const c of components) {
      const m = matMap.get(c.rawProductId);
      if (m && m.currentStock <= 0) {
        shortageMaterials.push(m.name);
      }
    }
  }

  return {
    canStart: pinValid && ppeComplete,
    pinValid,
    ppeComplete,
    shortageDetected: shortageMaterials.length > 0,
    shortageMaterials,
    errors,
  };
}

export function evaluateScrapToleranceAlert(params: {
  goodQty: number;
  scrapQty: number;
  maxTolerancePercent?: number;
}): {
  totalQty: number;
  scrapPercent: number;
  exceedsTolerance: boolean;
  requiresNcr: boolean;
} {
  const { goodQty, scrapQty, maxTolerancePercent = 10 } = params;
  const safeGood = Math.max(0, goodQty);
  const safeScrap = Math.max(0, scrapQty);
  const totalQty = safeGood + safeScrap;
  if (totalQty <= 0) {
    return { totalQty: 0, scrapPercent: 0, exceedsTolerance: false, requiresNcr: false };
  }
  const scrapPercent = Math.round((safeScrap / totalQty) * 1000) / 10;
  const exceedsTolerance = scrapPercent > maxTolerancePercent;
  return {
    totalQty,
    scrapPercent,
    exceedsTolerance,
    requiresNcr: exceedsTolerance,
  };
}

// ---------------------------------------------------------------------------
// 7) Piece-Rate Operator Payroll Bridge
// ---------------------------------------------------------------------------

export function computePieceRateEarnings(params: {
  goodUnits: number;
  ratePerPieceCentimes: number;
}): number {
  const safeUnits = Math.max(0, params.goodUnits || 0);
  const safeRate = Math.max(0, roundHalfAwayFromZero(params.ratePerPieceCentimes || 0));
  return roundHalfAwayFromZero(safeUnits * safeRate);
}

export function aggregateMfgPieceRatePayroll(
  entries: MfgPieceRateEntry[],
  staffId: string,
  periodMonth: string,
  payrollRunId?: string
): {
  totalCentimes: number;
  totalDzd: number;
  matchedEntryIds: string[];
} {
  let totalCentimes = 0;
  const matchedEntryIds: string[] = [];

  for (const entry of entries) {
    const entryOperatorId = entry.operatorStaffId || entry.staffId;
    if (entryOperatorId !== staffId) continue;
    if (entry.periodMonth !== periodMonth) continue;
    const isEligibleStatus =
      entry.status === 'posted_to_payroll' && (!entry.payrollRunId || (payrollRunId && entry.payrollRunId === payrollRunId));
    if (!isEligibleStatus) continue;

    totalCentimes = addCentimes(totalCentimes, entry.grossAmountCentimes || 0);
    matchedEntryIds.push(entry.id);
  }

  return {
    totalCentimes,
    totalDzd: centimesToDzd(totalCentimes),
    matchedEntryIds,
  };
}

// ---------------------------------------------------------------------------
// 8) [trade gap] 1D Linear Bar & 2D Sheet/Slab Cutting Optimization + Quote
// ---------------------------------------------------------------------------

export function optimizeLinearBarCutting1D(params: {
  stockLengthMm: number;
  kerfMm?: number;
  parts: MfgCuttingPartInput[];
  minReusableOffcutMm?: number;
}): MfgCuttingLayoutResult {
  const stockLength = Math.max(100, params.stockLengthMm || 6000);
  const kerf = Math.max(0, params.kerfMm ?? 4);
  const minReusable = Math.max(100, params.minReusableOffcutMm ?? 500);

  const expandedCuts: Array<{ label: string; lengthMm: number }> = [];
  for (const part of params.parts || []) {
    const qty = Math.max(0, Math.round(part.quantity || 0));
    const len = Math.max(1, part.lengthMm || 0);
    if (len > stockLength) continue;
    for (let i = 0; i < qty; i++) {
      expandedCuts.push({ label: part.label, lengthMm: len });
    }
  }

  // First-Fit Decreasing
  expandedCuts.sort((a, b) => b.lengthMm - a.lengthMm);

  interface BarBin {
    usedMm: number;
    cuts: Array<{ label: string; xMm: number; lengthMm: number }>;
  }

  const bins: BarBin[] = [];

  for (const cut of expandedCuts) {
    let placed = false;
    for (const bin of bins) {
      const kerfAllowance = bin.cuts.length > 0 ? kerf : 0;
      if (bin.usedMm + kerfAllowance + cut.lengthMm <= stockLength) {
        const xMm = bin.usedMm + kerfAllowance;
        bin.cuts.push({ label: cut.label, xMm, lengthMm: cut.lengthMm });
        bin.usedMm = xMm + cut.lengthMm;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push({
        usedMm: cut.lengthMm,
        cuts: [{ label: cut.label, xMm: 0, lengthMm: cut.lengthMm }],
      });
    }
  }

  const reusableMap = new Map<number, number>();
  let totalDemandedLength = 0;

  const layouts: MfgCuttingStockBarOrSheet[] = bins.map((bin, idx) => {
    const offcutLen = Math.max(0, Math.round((stockLength - bin.usedMm) * 100) / 100);
    const reusable = offcutLen >= minReusable;
    if (reusable) {
      reusableMap.set(offcutLen, (reusableMap.get(offcutLen) || 0) + 1);
    }
    for (const c of bin.cuts) totalDemandedLength += c.lengthMm;

    return {
      stockIndex: idx + 1,
      usedMmOrArea: bin.usedMm,
      totalMmOrArea: stockLength,
      wasteMmOrArea: offcutLen,
      offcutsMm: offcutLen > 0 ? [{ lengthMm: offcutLen, reusable }] : [],
      cuts: bin.cuts,
    };
  });

  const stockUnitsRequired = layouts.length;
  const totalStockLength = stockUnitsRequired * stockLength;
  const wastePercent =
    totalStockLength > 0
      ? Math.round(((totalStockLength - totalDemandedLength) / totalStockLength) * 1000) / 10
      : 0;

  const reusableOffcutsSummary = Array.from(reusableMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([lengthMm, count]) => ({ lengthMm, count }));

  const reusableOffcutsCount = reusableOffcutsSummary.reduce((sum, o) => sum + o.count, 0);

  return {
    mode: '1d_linear',
    stockUnitsRequired,
    totalDemandedAreaOrLength: totalDemandedLength,
    totalStockAreaOrLength: totalStockLength,
    wastePercent,
    reusableOffcutsCount,
    reusableOffcutsSummary,
    layouts,
  };
}

export function optimizeSheetSlabCutting2D(params: {
  stockLengthMm: number;
  stockWidthMm: number;
  kerfMm?: number;
  parts: MfgCuttingPartInput[];
  minReusableAreaMm2?: number;
}): MfgCuttingLayoutResult {
  const sheetL = Math.max(100, params.stockLengthMm || 2440);
  const sheetW = Math.max(100, params.stockWidthMm || 1220);
  const kerf = Math.max(0, params.kerfMm ?? 4);
  const minReusableArea = Math.max(10_000, params.minReusableAreaMm2 ?? 150_000); // default 0.15 m2

  interface RectPart {
    label: string;
    lengthMm: number;
    widthMm: number;
    allowRotation: boolean;
  }

  const expanded: RectPart[] = [];
  for (const part of params.parts || []) {
    const qty = Math.max(0, Math.round(part.quantity || 0));
    const l = Math.max(1, part.lengthMm || 0);
    const w = Math.max(1, part.widthMm || 100);
    const rot = part.allowRotation !== false;
    const fitsNormal = l <= sheetL && w <= sheetW;
    const fitsRotated = rot && w <= sheetL && l <= sheetW;
    if (!fitsNormal && !fitsRotated) continue;
    for (let i = 0; i < qty; i++) {
      expanded.push({ label: part.label, lengthMm: l, widthMm: w, allowRotation: rot });
    }
  }

  // Sort by max dimension descending, then area descending
  expanded.sort(
    (a, b) =>
      b.lengthMm * b.widthMm - a.lengthMm * a.widthMm ||
      Math.max(b.lengthMm, b.widthMm) - Math.max(a.lengthMm, a.widthMm)
  );

  interface Shelf {
    yMm: number;
    heightMm: number;
    usedXMm: number;
  }

  interface SheetBin {
    shelves: Shelf[];
    usedY: number;
    cuts: Array<{ label: string; xMm: number; yMm: number; lengthMm: number; widthMm: number }>;
  }

  const sheets: SheetBin[] = [];

  for (const rect of expanded) {
    let placed = false;

    const tryOrientations = (allowRot: boolean) => {
      const candidates = [{ l: rect.lengthMm, w: rect.widthMm }];
      if (allowRot && rect.lengthMm !== rect.widthMm) {
        candidates.push({ l: rect.widthMm, w: rect.lengthMm });
      }
      return candidates;
    };

    const orientations = tryOrientations(rect.allowRotation);

    for (const sheet of sheets) {
      for (const shelf of sheet.shelves) {
        const kerfX = shelf.usedXMm > 0 ? kerf : 0;
        for (const ori of orientations) {
          if (ori.l <= sheetL - shelf.usedXMm - kerfX && ori.w <= shelf.heightMm) {
            const xMm = shelf.usedXMm + kerfX;
            sheet.cuts.push({
              label: rect.label,
              xMm,
              yMm: shelf.yMm,
              lengthMm: ori.l,
              widthMm: ori.w,
            });
            shelf.usedXMm = xMm + ori.l;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;

      // Try creating a new shelf on this sheet
      const kerfY = sheet.shelves.length > 0 ? kerf : 0;
      for (const ori of orientations) {
        if (ori.l <= sheetL && sheet.usedY + kerfY + ori.w <= sheetW) {
          const yMm = sheet.usedY + kerfY;
          const newShelf: Shelf = { yMm, heightMm: ori.w, usedXMm: ori.l };
          sheet.shelves.push(newShelf);
          sheet.usedY = yMm + ori.w;
          sheet.cuts.push({
            label: rect.label,
            xMm: 0,
            yMm,
            lengthMm: ori.l,
            widthMm: ori.w,
          });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) {
      const ori = orientations.find((o) => o.l <= sheetL && o.w <= sheetW) || orientations[0];
      sheets.push({
        shelves: [{ yMm: 0, heightMm: ori.w, usedXMm: ori.l }],
        usedY: ori.w,
        cuts: [{ label: rect.label, xMm: 0, yMm: 0, lengthMm: ori.l, widthMm: ori.w }],
      });
    }
  }

  const sheetArea = sheetL * sheetW;
  let totalDemandedArea = 0;
  const reusableMap = new Map<string, { lengthMm: number; widthMm: number; count: number }>();

  const layouts: MfgCuttingStockBarOrSheet[] = sheets.map((sheet, idx) => {
    const usedArea = sheet.cuts.reduce((sum, c) => sum + c.lengthMm * c.widthMm, 0);
    totalDemandedArea += usedArea;
    const remLength = sheetL;
    const remWidth = Math.max(0, sheetW - sheet.usedY);
    const remArea = remLength * remWidth;
    const reusable = remArea >= minReusableArea && remWidth >= 100;
    if (reusable) {
      const key = `${remLength}x${remWidth}`;
      const prev = reusableMap.get(key) || { lengthMm: remLength, widthMm: remWidth, count: 0 };
      prev.count += 1;
      reusableMap.set(key, prev);
    }
    return {
      stockIndex: idx + 1,
      usedMmOrArea: usedArea,
      totalMmOrArea: sheetArea,
      wasteMmOrArea: Math.max(0, sheetArea - usedArea),
      offcutsMm: remWidth > 0 ? [{ lengthMm: remLength, widthMm: remWidth, reusable }] : [],
      cuts: sheet.cuts,
    };
  });

  const stockUnitsRequired = layouts.length;
  const totalStockArea = stockUnitsRequired * sheetArea;
  const wastePercent =
    totalStockArea > 0
      ? Math.round(((totalStockArea - totalDemandedArea) / totalStockArea) * 1000) / 10
      : 0;

  const reusableOffcutsSummary = Array.from(reusableMap.values());
  const reusableOffcutsCount = reusableOffcutsSummary.reduce((sum, o) => sum + o.count, 0);

  return {
    mode: '2d_sheet',
    stockUnitsRequired,
    totalDemandedAreaOrLength: totalDemandedArea,
    totalStockAreaOrLength: totalStockArea,
    wastePercent,
    reusableOffcutsCount,
    reusableOffcutsSummary,
    layouts,
  };
}

export interface MfgDimensionQuoteLine extends UnifiedLineInput {
  id: string;
  lineTotalHt: number;
}

export function buildDimensionQuoteLineItems(params: {
  tradeCategory: MfgCuttingPlan['tradeCategory'];
  cuttingMode: MfgCuttingPlan['cuttingMode'];
  parts: MfgCuttingPartInput[];
  layoutResult: MfgCuttingLayoutResult;
  unitPriceDzd: number;
  vatRatePercent?: number;
}): MfgDimensionQuoteLine[] {
  const { tradeCategory, cuttingMode, parts, layoutResult, unitPriceDzd, vatRatePercent = 19 } = params;
  const unitPriceCentimes = dzdToCentimes(Math.max(0, unitPriceDzd || 0));

  if (cuttingMode === '1d_linear') {
    return parts
      .filter((p) => p.quantity > 0 && p.lengthMm > 0)
      .map((p, idx) => {
        const linearMeters = Math.round(((p.lengthMm * p.quantity) / 1000) * 100) / 100;
        const lineHtCentimes = roundHalfAwayFromZero(unitPriceCentimes * linearMeters);
        const lineHtDzd = centimesToDzd(lineHtCentimes);
        return {
          id: `cut_line_${idx + 1}`,
          description: `[${tradeCategory}] ${p.label} — ${p.quantity} × ${(p.lengthMm / 1000).toFixed(2)} ml (${layoutResult.stockUnitsRequired} barres, chute ${layoutResult.wastePercent}%)`,
          isService: false,
          quantity: linearMeters,
          unit: 'ml',
          unitPriceHt: centimesToDzd(unitPriceCentimes),
          tvaPercent: vatRatePercent,
          discountPercent: 0,
          lineTotalHt: lineHtDzd,
        };
      });
  }

  return parts
    .filter((p) => p.quantity > 0 && p.lengthMm > 0 && (p.widthMm || 0) > 0)
    .map((p, idx) => {
      const areaM2 = Math.round((((p.lengthMm * (p.widthMm || 100)) / 1_000_000) * p.quantity) * 1000) / 1000;
      const lineHtCentimes = roundHalfAwayFromZero(unitPriceCentimes * areaM2);
      const lineHtDzd = centimesToDzd(lineHtCentimes);
      return {
        id: `cut_line_${idx + 1}`,
        description: `[${tradeCategory}] ${p.label} (${p.lengthMm}×${p.widthMm}mm × ${p.quantity}) — ${layoutResult.stockUnitsRequired} plaques/panneaux`,
        isService: false,
        quantity: areaM2,
        unit: 'm²',
        unitPriceHt: centimesToDzd(unitPriceCentimes),
        tvaPercent: vatRatePercent,
        discountPercent: 0,
        lineTotalHt: lineHtDzd,
      };
    });
}

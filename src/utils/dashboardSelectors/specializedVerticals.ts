import type {
  AgriCropCycle,
  AgriDairyCow,
  AgriDailyPointage,
  AgriMilkingRecord,
  AgriParcel,
  AgriTreatmentLog,
  AgriWeighbridgeTicket,
  BonDeVisiteRecord,
  BuyerDemandProfile,
  CashReceipt,
  ChifaClaimRecord,
  ClinicConsumableItem,
  ConcretePourRecord,
  ContractorBoqItem,
  ContractorDailyLog,
  ContractorDgp,
  ContractorProject,
  ContractorServiceOrder,
  CourierCashDischarge,
  CPCADeadline,
  EquipmentLogRecord,
  EscrowAccount,
  LegalHearing,
  LegalMatter,
  LogisticsShipment,
  ManufacturingBom,
  ManufacturingOrder,
  MedicalAppointmentSlot,
  MedicalConsultation,
  MedicalLabRecord,
  MedicalPractitioner,
  MerchantRemittanceBatch,
  NotaryDeed,
  QualityInspectionRecord,
  RawMaterialStockItem,
  RealEstateLease,
  RealEstateMandate,
  RealEstateProperty,
  RentalQuittanceRecord,
  SCFJournalEntry,
  SubcontractorAgreement,
  SupportedLanguage,
} from '../../types/index';
import type {
  AreaPoint,
  BubbleGroup,
  BubblePoint,
  BulletItem,
  DonutSegment,
  DumbbellItem,
  FunnelStage,
  GaugeMetric,
  HistogramBin,
  RadarAxis,
  RankedItem,
  StackedBucket,
  TimelineBlock,
  TimelineResource,
  TreemapItem,
  WaterfallStep,
} from '@/atrium';
import type {
  CorporateFleetAccount,
  GarageInvoice,
  RepairOrder,
  SparePart,
  WorkshopBay,
} from '../../components/screens/garage/garageData';
import {
  buildBucketWeightedRateSeries,
  buildDailySparkSeries,
  buildHourlyWeekdayMatrix,
  buildPeriodRateSeries,
  filterByPeriod,
  getPeriodBuckets,
  parseIsoDay,
  pickText,
  type DashboardPeriodKey,
} from './common';

const PALETTE = ['#d4522f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b655f'];

function parseClockHour(clock?: string): number {
  if (!clock) return 10;
  const [hStr, mStr] = clock.split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (!Number.isFinite(h)) return 10;
  return Math.max(7, Math.min(20, h + (Number.isFinite(m) ? m / 60 : 0)));
}

/* ============================================================================
 * 9. MEDICAL CLINIC (medical_clinic)
 * ============================================================================ */
export interface MedicalDashboardInput {
  practitioners: MedicalPractitioner[];
  consultations: MedicalConsultation[];
  appointments: MedicalAppointmentSlot[];
  chifaClaims: ChifaClaimRecord[];
  consumables: ClinicConsumableItem[];
  labRecords: MedicalLabRecord[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectMedicalDashboard(input: MedicalDashboardInput) {
  const { practitioners, consultations, appointments, chifaClaims, consumables, labRecords, period, language, anchorDate = new Date() } = input;
  const revSeries = buildDailySparkSeries(
    consultations.filter((c) => c.status !== 'Cancelled'),
    (c) => c.consultationDate || c.createdAt,
    (c) => c.consultationFeeDzd || 0,
    period,
    language,
    anchorDate
  );

  const windowConsultations = filterByPeriod(consultations, (c) => c.consultationDate || c.createdAt, period, anchorDate);
  const windowAppointments = filterByPeriod(appointments, (a) => a.date, period, anchorDate);
  const windowClaims = filterByPeriod(chifaClaims, (c) => c.submissionDate || c.claimDate, period, anchorDate);
  const windowLabs = filterByPeriod(labRecords, (l) => l.testDate || l.date, period, anchorDate);

  const waitingQueue = consultations.filter((c) => c.status === 'InWaitingQueue' || c.status === 'TriageNurse').length;
  const lowConsumables = consumables.filter((c) => (c.currentStock ?? c.currentStockUnits ?? 0) <= (c.minStockAlert ?? c.reorderThresholdUnits ?? 5)).length;

  const funnelStages: FunnelStage[] =
    windowConsultations.length > 0
      ? [
          { id: 'queue', label: pickText(language, 'Accueil / Attente', 'Waiting Queue', 'الانتظار'), value: windowConsultations.length },
          { id: 'exam', label: pickText(language, 'En consultation', 'In Exam', 'قيد الفحص'), value: windowConsultations.filter((c) => ['InConsultation', 'Completed'].includes(c.status)).length },
          { id: 'done', label: pickText(language, 'Terminées', 'Completed', 'المكتملة'), value: windowConsultations.filter((c) => c.status === 'Completed').length },
          { id: 'paid', label: pickText(language, 'Encaissées', 'Paid', 'المدفوعة'), value: windowConsultations.filter((c) => c.isPaid).length },
        ]
      : [];

  const resources: TimelineResource[] = practitioners.slice(0, 6).map((p) => ({
    id: p.id,
    label: p.fullName,
    meta: p.roomNumber || p.specialty,
  }));

  const blocks: TimelineBlock[] = windowAppointments
    .filter((a) => a.status !== 'Cancelled')
    .map((a) => {
      const startHour = parseClockHour(a.startTime);
      const dur = Math.max(0.25, (a.durationMinutes || 30) / 60);
      return {
        id: a.id,
        resourceId: a.doctorId,
        label: `${a.patientName} · ${a.reason}`,
        startHour,
        endHour: Math.min(21, startHour + dur),
        tone: a.status === 'InRoom' ? 'primary' : a.status === 'Completed' ? 'secondary' : 'neutral',
        statusLabel: a.status,
      };
    });

  const specTotals = new Map<string, number>();
  for (const c of windowConsultations) {
    const key = c.ngapCode || c.doctorSpecialty || 'C';
    specTotals.set(key, (specTotals.get(key) || 0) + 1);
  }
  const donutSegments: DonutSegment[] = Array.from(specTotals.entries()).map(([label, value], i) => ({
    id: `med-act-${i}`,
    label,
    value,
    color: PALETTE[i % PALETTE.length],
  }));

  const chifaApprovalPct = windowClaims.length > 0
    ? Math.round((windowClaims.filter((c) => c.status === 'Reimbursed' || c.status === 'Approved').length / windowClaims.length) * 100)
    : 0;
  const labValidPct = windowLabs.length > 0 ? Math.round((windowLabs.filter((l) => l.status === 'Validé').length / windowLabs.length) * 100) : 0;
  const stockReadinessPct = consumables.length > 0 ? Math.round(((consumables.length - lowConsumables) / consumables.length) * 100) : 0;
  const completionPct = windowConsultations.length > 0 ? Math.round((windowConsultations.filter((c) => c.status === 'Completed').length / windowConsultations.length) * 100) : 0;
  const attendancePct = windowAppointments.length > 0 ? Math.round((windowAppointments.filter((a) => a.status !== 'NoShow').length / windowAppointments.length) * 100) : 0;

  const hasOpsData = windowConsultations.length > 0 || windowClaims.length > 0 || windowLabs.length > 0 || consumables.length > 0;
  const radarAxes: RadarAxis[] = hasOpsData
    ? [
        { id: 'exam', label: pickText(language, 'Clôture actes', 'Exam Completion', 'إتمام الفحوص'), value: completionPct, benchmark: 85 },
        { id: 'chifa', label: 'CHIFA', value: chifaApprovalPct, benchmark: 90 },
        { id: 'lab', label: pickText(language, 'Labo validé', 'Lab Turnaround', 'نتائج المخبر'), value: labValidPct, benchmark: 85 },
        { id: 'stock', label: pickText(language, 'Stock soins', 'Consumables', 'المستلزمات'), value: stockReadinessPct, benchmark: 90 },
        { id: 'show', label: pickText(language, 'Assiduité RDV', 'Show Rate', 'الالتزام بالموعد'), value: attendancePct, benchmark: 88 },
      ]
    : [];

  const heatmap = buildHourlyWeekdayMatrix(windowConsultations, (c) => c.consultationDate || c.createdAt, language);

  return {
    consultationRevenue: revSeries.currentTotal,
    revenueDelta: revSeries.deltaPercent,
    revenueSpark: revSeries.series,
    consultationsCount: windowConsultations.length,
    waitingQueue,
    lowConsumables,
    funnelStages,
    resources,
    blocks,
    donutSegments,
    radarAxes,
    heatmap,
  };
}

/* ============================================================================
 * 10. AUTO GARAGE & FLEET (auto_garage)
 * ============================================================================ */
export interface GarageDashboardInput {
  orders: RepairOrder[];
  bays: WorkshopBay[];
  parts: SparePart[];
  fleets: CorporateFleetAccount[];
  invoices: GarageInvoice[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectGarageDashboard(input: GarageDashboardInput) {
  const { orders, bays, parts, fleets, invoices, period, language, anchorDate = new Date() } = input;
  const revSeries = buildDailySparkSeries(invoices, (i) => i.issuedAt || '', (i) => i.totalTtc || 0, period, language, anchorDate);

  const windowOrders = filterByPeriod(orders, (o) => o.intakeDate, period, anchorDate);
  const windowInvoices = filterByPeriod(invoices, (i) => i.issuedAt, period, anchorDate);

  const blockedOrders = orders.filter((o) => o.status === 'WaitingParts').length;
  const lowParts = parts.filter((p) => (p.stockQuantity || 0) <= (p.minThreshold || 3)).length;
  const occupiedBays = bays.filter((b) => b.isOccupied).length;

  const resources: TimelineResource[] = bays.slice(0, 6).map((b) => ({
    id: b.id,
    label: b.name,
    meta: b.bayType,
  }));

  const bayCursor = new Map<string, number>();
  const blocks: TimelineBlock[] = windowOrders
    .filter((o) => o.status !== 'Delivered')
    .map((o, idx) => {
      const resourceId = o.assignedBayId || bays[idx % Math.max(1, bays.length)]?.id || 'bay_1';
      const dur = Math.max(1, o.laborHoursEstimated || 2);
      const parsedIntake = parseIsoDay(o.intakeDate);
      const hasClockTime = parsedIntake ? parsedIntake.getHours() > 0 || parsedIntake.getMinutes() > 0 : false;
      const defaultCursor = bayCursor.get(resourceId) ?? 8;
      const startHour = hasClockTime && parsedIntake
        ? Math.max(8, Math.min(18, parsedIntake.getHours() + parsedIntake.getMinutes() / 60))
        : Math.min(18, defaultCursor);
      bayCursor.set(resourceId, Math.max(defaultCursor, startHour) + dur);
      return {
        id: o.id,
        resourceId,
        label: `${o.vehiclePlate} · ${o.vehicleModel}`,
        startHour,
        endHour: Math.min(20, Math.max(startHour + 1, startHour + dur)),
        tone: o.status === 'InRepair' ? 'primary' : o.status === 'WaitingParts' ? 'secondary' : 'neutral',
        statusLabel: o.status,
      };
    });

  const stageCounts = [
    { id: 'intake', label: pickText(language, 'Réception', 'Intake', 'الاستقبال'), statuses: ['Intake', 'Diagnostic', 'WaitingApproval', 'WaitingParts', 'InRepair', 'Testing', 'ReadyForPickup', 'Delivered'] },
    { id: 'diag', label: pickText(language, 'Diagnostic', 'Diagnostic', 'التشخيص'), statuses: ['Diagnostic', 'WaitingApproval', 'WaitingParts', 'InRepair', 'Testing', 'ReadyForPickup', 'Delivered'] },
    { id: 'repair', label: pickText(language, 'En atelier', 'In Repair', 'قيد الإصلاح'), statuses: ['InRepair', 'Testing', 'ReadyForPickup', 'Delivered'] },
    { id: 'ready', label: pickText(language, 'Prêt / Livré', 'Ready / Delivered', 'جاهز / مسلم'), statuses: ['ReadyForPickup', 'Delivered'] },
  ];
  const funnelStages: FunnelStage[] =
    windowOrders.length > 0
      ? stageCounts.map((s) => ({
          id: s.id,
          label: s.label,
          value: windowOrders.filter((o) => s.statuses.includes(o.status)).length,
        }))
      : [];

  const partBuyById = new Map(parts.map((p) => [p.id, p.buyingPriceDzd || 0]));
  const partBuyBySku = new Map(parts.map((p) => [p.sku, p.buyingPriceDzd || 0]));
  const laborTotal = windowOrders.reduce((s, o) => s + (o.laborCostDzd || 0), 0);
  const partsRevTotal = windowOrders.reduce((s, o) => s + (o.partsCostDzd || 0), 0);
  const discountTotal = windowInvoices.reduce((s, i) => s + (i.discountHt || 0), 0);
  const partsCogs = windowOrders.reduce(
    (s, o) =>
      s +
      (o.partsUsed || []).reduce((ps, line) => {
        const unitBuy = partBuyById.get(line.partId) ?? partBuyBySku.get(line.sku) ?? 0;
        return ps + unitBuy * (line.quantity || 1);
      }, 0),
    0
  );
  const waterfallSteps: WaterfallStep[] =
    windowOrders.length > 0
      ? [
          { id: 'labor', label: pickText(language, 'Main-d’œuvre', 'Labor', 'اليد العاملة'), value: Math.round(laborTotal), kind: 'total' },
          { id: 'parts', label: pickText(language, 'Pièces HT', 'Parts Revenue', 'قطع الغيار'), value: Math.round(partsRevTotal), kind: 'delta' },
          { id: 'disc', label: pickText(language, 'Remises', 'Discounts', 'التخفيضات'), value: -Math.round(discountTotal), kind: 'delta' },
          { id: 'cogs', label: pickText(language, 'Coût pièces', 'Parts Cost', 'تكلفة القطع'), value: -Math.round(partsCogs), kind: 'delta' },
          { id: 'net', label: pickText(language, 'Marge atelier', 'Shop Margin', 'صافي الورشة'), value: Math.round(laborTotal + partsRevTotal - discountTotal - partsCogs), kind: 'total' },
        ]
      : [];

  const techAgg = new Map<string, { orders: number; total: number }>();
  for (const o of windowOrders) {
    const key = o.technicianName || 'Atelier';
    const cur = techAgg.get(key) || { orders: 0, total: 0 };
    cur.orders += 1;
    cur.total += o.finalCostDzd || o.estimatedCostDzd || 0;
    techAgg.set(key, cur);
  }
  const rankedMechanics: RankedItem[] = Array.from(techAgg.entries()).map(([label, v], i) => ({
    id: `mech-${i}`,
    label,
    values: { revenue: Math.round(v.total), orders: v.orders },
  }));

  return {
    workshopRevenue: revSeries.currentTotal,
    revenueDelta: revSeries.deltaPercent,
    revenueSpark: revSeries.series,
    blockedOrders,
    lowParts,
    occupiedBays,
    totalBays: bays.length,
    fleetsCount: fleets.length,
    resources,
    blocks,
    funnelStages,
    waterfallSteps,
    rankedMechanics,
  };
}

/* ============================================================================
 * 11. REAL ESTATE AGENCY (real_estate)
 * ============================================================================ */
export interface RealEstateDashboardInput {
  properties: RealEstateProperty[];
  mandates: RealEstateMandate[];
  leases: RealEstateLease[];
  quittances: RentalQuittanceRecord[];
  visits: BonDeVisiteRecord[];
  buyers: BuyerDemandProfile[];
  listingScope?: 'All' | 'Sale' | 'Rental';
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectRealEstateDashboard(input: RealEstateDashboardInput) {
  const { properties, mandates, leases, quittances, visits, buyers, listingScope = 'All', period, language, anchorDate = new Date() } = input;
  const quittanceSeries = buildDailySparkSeries(quittances, (q) => q.paymentDate || q.createdAt, (q) => q.totalCollectedDzd || 0, period, language, anchorDate);

  const windowQuittances = filterByPeriod(quittances, (q) => q.paymentDate || q.createdAt, period, anchorDate);
  const windowVisits = filterByPeriod(visits, (v) => v.visitTimestamp || v.createdAt, period, anchorDate);
  const windowMandates = filterByPeriod(mandates, (m) => m.startDate, period, anchorDate);

  const scopedProperties = listingScope === 'All'
    ? properties
    : properties.filter((p) => (listingScope === 'Sale' ? p.listingType === 'Sale' : p.listingType !== 'Sale'));
  const propMap = new Map(properties.map((p) => [p.id, p]));
  const scopedMandates = listingScope === 'All'
    ? windowMandates
    : windowMandates.filter((m) => {
        const prop = propMap.get(m.propertyId);
        if (!prop) return true;
        return listingScope === 'Sale' ? prop.listingType === 'Sale' : prop.listingType !== 'Sale';
      });

  const activeLeases = leases.filter((l) => l.status === 'Active');
  const expectedMonthlyRent = activeLeases.reduce((s, l) => s + (l.monthlyRentDzd || 0), 0);
  const expectedTarget = period === 'year' ? expectedMonthlyRent * 12 : expectedMonthlyRent;
  const collectedWindowRent = windowQuittances.reduce((s, q) => s + (q.rentAmountDzd || 0), 0);
  const arrearsTotal = activeLeases.reduce((s, l) => s + (l.arrearsDzd || 0), 0);
  const expiringMandates = mandates.filter((m) => m.status === 'Expiring' || m.status === 'Expired').length;

  const bubbleGroups: BubbleGroup[] = [
    { id: 'Sale', label: pickText(language, 'Vente', 'Sale', 'بيع'), color: '#d4522f' },
    { id: 'Rental', label: pickText(language, 'Location', 'Rental', 'كراء'), color: '#3b82f6' },
  ];
  const bubblePoints: BubblePoint[] = scopedProperties.map((p) => ({
    id: p.id,
    label: p.title,
    groupId: p.listingType === 'Sale' ? 'Sale' : 'Rental',
    x: p.surfaceM2 || 0,
    y: p.priceDzd || 0,
    size: Math.max(1, p.roomsCount || 1),
  }));

  const funnelStages: FunnelStage[] =
    buyers.length > 0 || windowVisits.length > 0 || scopedMandates.length > 0 || leases.length > 0
      ? [
          { id: 'buyers', label: pickText(language, 'Demandes acquéreurs', 'Buyer Leads', 'الطلبات'), value: buyers.length + windowVisits.length },
          { id: 'visits', label: pickText(language, 'Bons de visite', 'Site Visits', 'الزيارات'), value: windowVisits.length },
          { id: 'mandates', label: pickText(language, 'Mandats actifs', 'Mandates', 'التفويضات'), value: scopedMandates.filter((m) => m.status === 'Active' || m.status === 'Executed').length },
          { id: 'closed', label: pickText(language, 'Baux / Actes', 'Signed Leases', 'العقود المبرمة'), value: activeLeases.length + scopedProperties.filter((p) => p.status === 'Sold').length },
        ]
      : [];

  const priceDumbbell: DumbbellItem[] = scopedMandates.slice(0, 6).map((m) => ({
    id: m.id,
    label: m.propertyTitle,
    prev: m.minimumAcceptablePriceDzd || 0,
    value: m.askingPriceDzd || 0,
  }));

  const rentBullets: BulletItem[] =
    activeLeases.length > 0
      ? [
          {
            id: 'rent-roll',
            label: pickText(language, 'Quittances vs Loyers attendus', 'Collected vs Expected Rent', 'الإيجار المحصل'),
            value: Math.round(collectedWindowRent),
            target: Math.round(expectedTarget),
          },
        ]
      : [];

  const typeCounts = new Map<string, number>();
  for (const p of scopedProperties) typeCounts.set(p.propertyType, (typeCounts.get(p.propertyType) || 0) + 1);
  const donutSegments: DonutSegment[] = Array.from(typeCounts.entries()).map(([label, value], i) => ({
    id: `re-t-${i}`,
    label,
    value,
    color: PALETTE[i % PALETTE.length],
  }));

  return {
    collectedTotal: quittanceSeries.currentTotal,
    collectedDelta: quittanceSeries.deltaPercent,
    collectedSpark: quittanceSeries.series,
    arrearsTotal,
    expiringMandates,
    bubbleGroups,
    bubblePoints,
    funnelStages,
    priceDumbbell,
    rentBullets,
    donutSegments,
  };
}

/* ============================================================================
 * 12. MANUFACTURING & WORKSHOP (manufacturing_production)
 * ============================================================================ */
export interface ManufacturingDashboardInput {
  orders: ManufacturingOrder[];
  boms: ManufacturingBom[];
  materials: RawMaterialStockItem[];
  qcRecords: QualityInspectionRecord[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectManufacturingDashboard(input: ManufacturingDashboardInput) {
  const { orders, boms, materials, qcRecords, period, language, anchorDate = new Date() } = input;
  const prodSeries = buildDailySparkSeries(orders, (o) => o.startDate || o.createdAt, (o) => o.quantityProduced || o.actualQuantityProduced || 0, period, language, anchorDate);

  const windowOrders = filterByPeriod(orders, (o) => o.startDate || o.createdAt, period, anchorDate);
  const windowQc = filterByPeriod(qcRecords, (q) => q.inspectionDate, period, anchorDate);

  const totalGood = windowOrders.reduce((s, o) => s + (o.quantityProduced ?? o.actualQuantityProduced ?? 0), 0);
  const totalScrap = windowOrders.reduce((s, o) => s + (o.scrapQuantity ?? o.quantityScrapped ?? 0), 0);
  const scrapRate = totalGood + totalScrap > 0 ? Math.round((totalScrap / (totalGood + totalScrap)) * 1000) / 10 : 0;
  const scrapSpark = buildBucketWeightedRateSeries(
    orders,
    (o) => o.startDate || o.createdAt,
    (o) => o.scrapQuantity ?? o.quantityScrapped ?? 0,
    (o) => (o.quantityProduced ?? o.actualQuantityProduced ?? 0) + (o.scrapQuantity ?? o.quantityScrapped ?? 0),
    period,
    language,
    anchorDate
  );

  const qcPassPct = windowQc.length > 0
    ? Math.round((windowQc.filter((q) => q.verdict === 'Accepted' || q.verdict === 'AcceptedWithDerogation').length / windowQc.length) * 100)
    : 0;
  const yieldPct = totalGood + totalScrap > 0 ? Math.round((totalGood / (totalGood + totalScrap)) * 100) : 0;
  const lowMaterials = materials.filter((m) => (m.availableStock ?? m.currentStock) <= (m.reorderThreshold || 0)).length;

  const gauges: GaugeMetric[] = [
    { id: 'qc', label: pickText(language, 'Conformité QC', 'QC Pass Rate', 'مطابقة الجودة'), value: qcPassPct, target: 95, targetLabel: '95%', unit: '%' },
    { id: 'yield', label: pickText(language, 'Rendement net', 'First-Pass Yield', 'المردودية'), value: yieldPct, target: 92, targetLabel: '92%', unit: '%' },
  ];

  const orderBullets: BulletItem[] = windowOrders.slice(0, 6).map((o) => ({
    id: o.id,
    label: `${o.orderNumber} · ${o.productName}`,
    value: o.quantityProduced ?? o.actualQuantityProduced ?? 0,
    target: o.targetQuantity || 0,
  }));

  const matCost = windowOrders.reduce((s, o) => s + (o.totalMaterialCostDzd || 0), 0);
  const labCost = windowOrders.reduce((s, o) => s + (o.totalLaborCostDzd || 0), 0);
  const totalCost = windowOrders.reduce((s, o) => s + (o.totalCostDzd || 0), 0);
  const overhead = Math.max(0, totalCost - matCost - labCost);
  const waterfallSteps: WaterfallStep[] =
    windowOrders.length > 0
      ? [
          { id: 'mat', label: pickText(language, 'Matières 1ères', 'Materials', 'المواد الأولية'), value: Math.round(matCost), kind: 'total' },
          { id: 'labor', label: pickText(language, 'Main-d’œuvre', 'Direct Labor', 'اليد العاملة'), value: Math.round(labCost), kind: 'delta' },
          { id: 'ovh', label: pickText(language, 'Frais atelier', 'Overhead', 'أعباء الورشة'), value: Math.round(overhead), kind: 'delta' },
          { id: 'tot', label: pickText(language, 'Coût total OF', 'Total Batch Cost', 'التكلفة الإجمالية'), value: Math.round(matCost + labCost + overhead), kind: 'total' },
        ]
      : [];

  const stackedBuckets: StackedBucket[] = windowOrders.slice(0, 6).map((o) => ({
    label: o.orderNumber,
    values: {
      good: o.quantityProduced ?? o.actualQuantityProduced ?? 0,
      scrap: o.scrapQuantity ?? o.quantityScrapped ?? 0,
    },
  }));

  const onTimePct = windowOrders.length > 0 ? Math.round((windowOrders.filter((o) => o.status === 'Completed').length / windowOrders.length) * 100) : 0;
  const matReadyPct = materials.length > 0 ? Math.round(((materials.length - lowMaterials) / materials.length) * 100) : 0;
  const activeBomIds = new Set(boms.filter((b) => b.isActive).map((b) => b.id));
  const bomCoveragePct = windowOrders.length > 0
    ? Math.round((windowOrders.filter((o) => activeBomIds.has(o.bomId)).length / windowOrders.length) * 100)
    : boms.length > 0
      ? Math.round((activeBomIds.size / boms.length) * 100)
      : 0;

  const radarAxes: RadarAxis[] =
    windowOrders.length > 0 || materials.length > 0 || windowQc.length > 0
      ? [
          { id: 'yield', label: pickText(language, 'Rendement', 'Yield', 'المردود'), value: yieldPct, benchmark: 92 },
          { id: 'qc', label: 'QC', value: qcPassPct, benchmark: 95 },
          { id: 'of', label: pickText(language, 'OF clôturés', 'OF Done', 'الأوامر المنجزة'), value: onTimePct, benchmark: 85 },
          { id: 'mat', label: pickText(language, 'Stock MP', 'Materials', 'المخزون'), value: matReadyPct, benchmark: 90 },
          { id: 'bom', label: 'BOM', value: bomCoveragePct, benchmark: 80 },
        ]
      : [];

  return {
    totalProduced: prodSeries.currentTotal,
    producedDelta: prodSeries.deltaPercent,
    producedSpark: prodSeries.series,
    scrapRate,
    scrapSpark,
    lowMaterials,
    gauges,
    orderBullets,
    waterfallSteps,
    stackedBuckets,
    radarAxes,
  };
}

/* ============================================================================
 * 13. LEGAL, NOTARY & ACCOUNTING (legal_accounting)
 * ============================================================================ */
export interface LegalDashboardInput {
  matters: LegalMatter[];
  hearings: LegalHearing[];
  deadlines: CPCADeadline[];
  notaryDeeds: NotaryDeed[];
  escrowAccounts: EscrowAccount[];
  cashReceipts: CashReceipt[];
  scfEntries: SCFJournalEntry[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectLegalDashboard(input: LegalDashboardInput) {
  const { matters, deadlines, notaryDeeds, escrowAccounts, cashReceipts, scfEntries, period, language, anchorDate = new Date() } = input;
  const receiptSeries = buildDailySparkSeries(cashReceipts, (r) => r.createdAt, (r) => r.netCollectedDzd || 0, period, language, anchorDate);

  const windowReceipts = filterByPeriod(cashReceipts, (r) => r.createdAt, period, anchorDate);
  const windowMatters = filterByPeriod(matters, (m) => m.createdAt, period, anchorDate);
  const windowDeeds = filterByPeriod(notaryDeeds, (n) => n.signedAt || n.createdAt, period, anchorDate);
  const windowDeadlines = filterByPeriod(deadlines, (d) => d.terminalExpiryDate || d.notificationDate, period, anchorDate);
  const windowScfEntries = filterByPeriod(scfEntries, (e) => e.date, period, anchorDate);

  const criticalDeadlines = windowDeadlines.filter((d) => d.status === 'critical' || d.status === 'approaching' || d.status === 'forfeited').length;
  const escrowTotal = escrowAccounts.reduce((s, e) => s + (e.currentBalanceDzd || 0), 0);

  const scfEntriesCount = windowScfEntries.length;
  const scfBalancedCount = windowScfEntries.filter((e) => e.isBalanced).length;
  const scfBalancedPct = scfEntriesCount > 0 ? Math.round((scfBalancedCount / scfEntriesCount) * 100) : 0;

  const funnelStages: FunnelStage[] =
    windowMatters.length > 0 || windowDeeds.length > 0
      ? [
          { id: 'total', label: pickText(language, 'Dossiers & Actes', 'Matters & Deeds', 'الملفات والعقود'), value: windowMatters.length + windowDeeds.length },
          { id: 'active', label: pickText(language, 'En instruction', 'Active Docket', 'قيد الدراسة'), value: windowMatters.filter((m) => m.status === 'Active' || m.status === 'PendingHearing').length + windowDeeds.filter((n) => n.status === 'draft').length },
          { id: 'delib', label: pickText(language, 'Délibéré / Minute', 'Hearing / Minute', 'المداولة / التوقيع'), value: windowMatters.filter((m) => m.status === 'UnderDeliberation').length + windowDeeds.filter((n) => n.status === 'minute_signed').length },
          { id: 'closed', label: pickText(language, 'Clôturés / Publiés', 'Closed / Sealed', 'المغلقة / المشهرة'), value: windowMatters.filter((m) => m.status === 'Closed' || m.status === 'Archived').length + windowDeeds.filter((n) => n.status === 'enregistre_impots' || n.status === 'publie_conservation').length },
        ]
      : [];

  const escrowBullets: BulletItem[] = escrowAccounts.slice(0, 5).map((e) => ({
    id: e.id,
    label: `${e.matterReference} · ${e.clientName}`,
    value: Math.round(e.currentBalanceDzd || 0),
    target: Math.round(e.totalDepositedDzd || 0),
  }));

  const lawyerAgg = new Map<string, { count: number; retainer: number }>();
  for (const m of windowMatters) {
    const key = m.assignedLawyer || 'Cabinet';
    const cur = lawyerAgg.get(key) || { count: 0, retainer: 0 };
    cur.count += 1;
    cur.retainer += m.retainerAmountDzd || 0;
    lawyerAgg.set(key, cur);
  }
  const rankedLawyers: RankedItem[] = Array.from(lawyerAgg.entries()).map(([label, v], i) => ({
    id: `law-${i}`,
    label,
    values: { matters: v.count, retainer: Math.round(v.retainer) },
  }));

  const clientMatterCount = new Map<string, number>();
  for (const m of windowMatters) {
    clientMatterCount.set(m.clientName, (clientMatterCount.get(m.clientName) || 0) + 1);
  }
  const feeDumbbell: DumbbellItem[] = windowMatters.slice(0, 6).map((m) => {
    const singleMatterClient = (clientMatterCount.get(m.clientName) || 0) === 1;
    const paidForMatter = windowReceipts
      .filter((r) => (r.matterTitle ? r.matterTitle === m.title : singleMatterClient && r.clientName === m.clientName))
      .reduce((s, r) => s + (r.netCollectedDzd || 0), 0);
    return {
      id: m.id,
      label: m.matterNumber,
      prev: m.retainerAmountDzd || 0,
      value: paidForMatter,
    };
  });

  return {
    collectedHonoraires: receiptSeries.currentTotal,
    receiptDelta: receiptSeries.deltaPercent,
    receiptSpark: receiptSeries.series,
    areaPoints: receiptSeries.areaPoints as AreaPoint[],
    criticalDeadlines,
    escrowTotal,
    scfEntriesCount,
    scfBalancedCount,
    scfBalancedPct,
    funnelStages,
    escrowBullets,
    rankedLawyers,
    feeDumbbell,
  };
}

/* ============================================================================
 * 14. LOGISTICS & COURIERS (logistics_delivery)
 * ============================================================================ */
export interface LogisticsDashboardInput {
  shipments: LogisticsShipment[];
  discharges: CourierCashDischarge[];
  remittances: MerchantRemittanceBatch[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectLogisticsDashboard(input: LogisticsDashboardInput) {
  const { shipments, discharges, remittances, period, language, anchorDate = new Date() } = input;
  const allDelivered = shipments.filter((s) => s.status === 'Delivered');
  const codSeries = buildDailySparkSeries(allDelivered, (s) => s.createdAt, (s) => s.codAmountDzd || 0, period, language, anchorDate);

  const windowShipments = filterByPeriod(shipments, (s) => s.createdAt, period, anchorDate);
  const windowDischarges = filterByPeriod(discharges, (d) => d.timestamp, period, anchorDate);
  const windowRemittances = filterByPeriod(remittances, (r) => r.executedAt, period, anchorDate);

  const delivered = windowShipments.filter((s) => s.status === 'Delivered');
  const returnedCount = windowShipments.filter((s) => s.status === 'Returned' || s.status === 'Postponed').length;
  const returnRate = windowShipments.length > 0 ? Math.round((returnedCount / windowShipments.length) * 1000) / 10 : 0;
  const returnSpark = buildPeriodRateSeries(
    shipments,
    (s) => s.createdAt,
    (s) => s.status === 'Returned' || s.status === 'Postponed',
    period,
    language,
    anchorDate
  );

  const funnelStages: FunnelStage[] =
    windowShipments.length > 0
      ? [
          { id: 'hub', label: pickText(language, 'Colis reçus Hub', 'Hub Intake', 'استلام المركز'), value: windowShipments.length },
          { id: 'sorted', label: pickText(language, 'Triés / Ensachés', 'Sorted', 'الفرز'), value: windowShipments.filter((s) => ['Sorted', 'OutForDelivery', 'Delivered'].includes(s.status)).length },
          { id: 'out', label: pickText(language, 'En tournée', 'Out for Delivery', 'قيد التوصيل'), value: windowShipments.filter((s) => ['OutForDelivery', 'Delivered'].includes(s.status)).length },
          { id: 'del', label: pickText(language, 'Livrés COD', 'Delivered', 'تم التسليم'), value: delivered.length },
        ]
      : [];

  const grossCod = delivered.reduce((s, x) => s + (x.codAmountDzd || 0), 0);
  const shipFees = windowShipments.reduce((s, x) => s + (x.shippingFeeDzd || 0), 0);
  const stampFees = windowShipments.reduce((s, x) => s + (x.stampDutyDzd || 0), 0);
  const discrepancy = windowDischarges.reduce((s, d) => s + Math.abs(d.discrepancyDzd || 0), 0);
  const netRemittance = windowRemittances.length > 0
    ? windowRemittances.reduce((s, r) => s + (r.netPayoutDzd || 0), 0)
    : Math.max(0, grossCod - shipFees - stampFees - discrepancy);

  const waterfallSteps: WaterfallStep[] =
    windowShipments.length > 0
      ? [
          { id: 'cod', label: pickText(language, 'COD encaissé', 'Gross COD', 'تحصيل الدفع عند الاستلام'), value: Math.round(grossCod), kind: 'total' },
          { id: 'fees', label: pickText(language, 'Frais livraison', 'Shipping Fees', 'رسوم الشحن'), value: -Math.round(shipFees), kind: 'delta' },
          { id: 'stamp', label: pickText(language, 'Timbre & Écarts', 'Stamp / Diff', 'الطابع والفروقات'), value: -Math.round(stampFees + discrepancy), kind: 'delta' },
          { id: 'remit', label: pickText(language, 'Net marchands', 'Net Remittance', 'صافي التجار'), value: Math.round(netRemittance), kind: 'total' },
        ]
      : [];

  const wilayaAgg = new Map<string, { delivered: number; cod: number }>();
  for (const s of windowShipments) {
    const key = s.destinationWilaya || 'Alger';
    const cur = wilayaAgg.get(key) || { delivered: 0, cod: 0 };
    if (s.status === 'Delivered') {
      cur.delivered += 1;
      cur.cod += s.codAmountDzd || 0;
    }
    wilayaAgg.set(key, cur);
  }
  const rankedWilayas: RankedItem[] = Array.from(wilayaAgg.entries()).map(([label, v], i) => ({
    id: `wil-${i}`,
    label,
    values: { parcels: v.delivered, cod: Math.round(v.cod) },
  }));

  const { range: bucketRange, bucketCount, effectiveStart, bucketMs } = getPeriodBuckets(period, anchorDate);
  const deliveredCounts = new Array<number>(bucketCount).fill(0);
  const returnedCounts = new Array<number>(bucketCount).fill(0);
  for (const s of shipments) {
    const d = parseIsoDay(s.createdAt);
    if (!d) continue;
    const ms = d.getTime();
    if (ms < effectiveStart || ms > bucketRange.endMs) continue;
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - effectiveStart) / bucketMs)));
    if (s.status === 'Delivered') deliveredCounts[idx] += 1;
    else if (s.status === 'Returned' || s.status === 'Postponed') returnedCounts[idx] += 1;
  }

  const stackedBuckets: StackedBucket[] = codSeries.series.map((pt, idx) => ({
    label: pt.label,
    values: {
      delivered: deliveredCounts[idx] || 0,
      returned: returnedCounts[idx] || 0,
    },
  }));

  const weightBinsDef = [
    { id: 'w1', label: '0–1kg', min: 0, max: 1 },
    { id: 'w2', label: '1–3kg', min: 1.001, max: 3 },
    { id: 'w3', label: '3–5kg', min: 3.001, max: 5 },
    { id: 'w4', label: '5–10kg', min: 5.001, max: 10 },
    { id: 'w5', label: '>10kg', min: 10.001, max: Infinity },
  ];
  const weightBins: HistogramBin[] =
    windowShipments.length > 0
      ? weightBinsDef.map((b) => ({
          id: b.id,
          label: b.label,
          value: windowShipments.filter((s) => (s.weightKg || 0) >= b.min && (s.weightKg || 0) <= b.max).length,
        }))
      : [];

  return {
    codCollected: codSeries.currentTotal,
    codDelta: codSeries.deltaPercent,
    codSpark: codSeries.series,
    returnRate,
    returnedCount,
    returnSpark,
    funnelStages,
    waterfallSteps,
    rankedWilayas,
    stackedBuckets,
    weightBins,
  };
}

/* ============================================================================
 * 15. CONSTRUCTION & BTP (construction_contractor)
 * ============================================================================ */
export interface ContractorDashboardInput {
  projects: ContractorProject[];
  boqItems: ContractorBoqItem[];
  dailyLogs: ContractorDailyLog[];
  dgps: ContractorDgp[];
  serviceOrders: ContractorServiceOrder[];
  concretePours: ConcretePourRecord[];
  subcontractors: SubcontractorAgreement[];
  equipmentLogs: EquipmentLogRecord[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectContractorDashboard(input: ContractorDashboardInput) {
  const { projects, boqItems, dailyLogs, dgps, serviceOrders, concretePours, subcontractors, equipmentLogs, period, language, anchorDate = new Date() } = input;
  const dgpSeries = buildDailySparkSeries(dgps, (d) => d.issuedDate || d.createdAt, (d) => d.netPayableDzd || d.periodGrossDzd || 0, period, language, anchorDate);

  const windowDgps = filterByPeriod(dgps, (d) => d.issuedDate || d.createdAt, period, anchorDate);
  const windowDailyLogs = filterByPeriod(dailyLogs, (l) => l.logDate, period, anchorDate);
  const windowPours = filterByPeriod(concretePours, (c) => c.pourDate, period, anchorDate);
  const windowSubs = filterByPeriod(subcontractors, (s) => s.createdAt, period, anchorDate);
  const windowEquipLogs = filterByPeriod(equipmentLogs, (e) => e.date || e.createdAt, period, anchorDate);

  const totalRetention = windowDgps.length > 0
    ? windowDgps.reduce((s, d) => s + (d.retentionGuaranteeDzd || 0), 0)
    : projects.reduce((s, p) => s + (p.retentionAmountDzd || 0), 0);
  const activeStopOrders = serviceOrders.filter((os) => os.osType === 'Suspension' && os.status !== 'Executed').length;
  const overconsumptionAlerts = windowEquipLogs.filter((e) => e.hasOverconsumptionAlert).length;

  const ctcPassPct =
    windowPours.length > 0
      ? Math.round((windowPours.filter((c) => c.ctcClearanceObtained || c.status === 'Passed7D' || c.status === 'Passed28D').length / windowPours.length) * 100)
      : 0;
  const safeLogsPct =
    windowDailyLogs.length > 0
      ? Math.round((windowDailyLogs.filter((l) => !l.hasWorkStoppage).length / windowDailyLogs.length) * 100)
      : 0;

  const gauges: GaugeMetric[] = [
    { id: 'ctc', label: pickText(language, 'Conformité CTC Béton', 'CTC Concrete Pass', 'مطابقة الخرسانة'), value: ctcPassPct, target: 95, targetLabel: '95%', unit: '%' },
    { id: 'hse', label: pickText(language, 'Jours sans arrêt HSE', 'Safe Workdays', 'سلامة الورشة'), value: safeLogsPct, target: 95, targetLabel: '95%', unit: '%' },
  ];

  const boqBullets: BulletItem[] = boqItems.slice(0, 6).map((b) => ({
    id: b.id,
    label: b.lotTitle || b.designation,
    value: Math.round(b.totalExecutedDzd || 0),
    target: Math.round(b.totalPlannedDzd || 0),
  }));

  const treemapItems: TreemapItem[] = projects.map((p, i) => ({
    id: p.id,
    label: p.projectName,
    value: Math.round(p.contractAmountDzd || 0),
    color: PALETTE[i % PALETTE.length],
  }));

  const grossCert = windowDgps.reduce((s, d) => s + (d.periodGrossDzd || d.grossCompletedDzd || 0), 0);
  const retHold = windowDgps.reduce((s, d) => s + (d.retentionGuaranteeDzd || 0), 0);
  const subPaid = windowSubs.reduce((s, x) => s + (x.paidAmountDzd || 0), 0);
  const netPayable = windowDgps.reduce((s, d) => s + (d.netPayableDzd || 0), 0) || Math.max(0, grossCert - retHold - subPaid);
  const waterfallSteps: WaterfallStep[] =
    windowDgps.length > 0 || projects.length > 0
      ? [
          { id: 'gross', label: pickText(language, 'DGP brut certifié', 'Certified DGP', 'الوضع المعتمد'), value: Math.round(grossCert), kind: 'total' },
          { id: 'ret', label: pickText(language, 'Retenue garantie 5%', 'Retention 5%', 'اقتطاع الضمان'), value: -Math.round(retHold), kind: 'delta' },
          { id: 'sub', label: pickText(language, 'Sous-traitants', 'Subcontractors', 'المقاولون الثانويون'), value: -Math.round(subPaid), kind: 'delta' },
          { id: 'net', label: pickText(language, 'Net à mandater', 'Net Payable', 'الصافي للدفع'), value: Math.round(netPayable), kind: 'total' },
        ]
      : [];

  const progressDumbbell: DumbbellItem[] = projects.slice(0, 6).map((p) => {
    const start = parseIsoDay(p.startDate)?.getTime() ?? anchorDate.getTime();
    const end = parseIsoDay(p.targetEndDate)?.getTime() ?? anchorDate.getTime();
    const elapsedPct = end > start ? Math.min(100, Math.max(0, Math.round(((anchorDate.getTime() - start) / (end - start)) * 100))) : 0;
    return {
      id: p.id,
      label: p.projectName,
      prev: elapsedPct,
      value: Math.round(p.progressPercent || 0),
    };
  });

  return {
    dgpCertifiedTotal: dgpSeries.currentTotal,
    dgpDelta: dgpSeries.deltaPercent,
    dgpSpark: dgpSeries.series,
    totalRetention,
    activeStopOrders,
    overconsumptionAlerts,
    equipmentLogCount: windowEquipLogs.length,
    gauges,
    boqBullets,
    treemapItems: treemapItems.filter((t) => t.value > 0),
    waterfallSteps,
    progressDumbbell,
  };
}

/* ============================================================================
 * 16. AGRICULTURE & LIVESTOCK (agriculture_farming)
 * ============================================================================ */
export interface AgricultureDashboardInput {
  parcels: AgriParcel[];
  cropCycles: AgriCropCycle[];
  treatmentLogs: AgriTreatmentLog[];
  pointages: AgriDailyPointage[];
  dairyCows: AgriDairyCow[];
  milkingRecords: AgriMilkingRecord[];
  weighbridgeTickets: AgriWeighbridgeTicket[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectAgricultureDashboard(input: AgricultureDashboardInput) {
  const { parcels, cropCycles, treatmentLogs, pointages, dairyCows, milkingRecords, weighbridgeTickets, period, language, anchorDate = new Date() } = input;
  const harvestSeries = buildDailySparkSeries(
    weighbridgeTickets,
    (t) => t.date || t.harvestDate || t.createdAt,
    (t) => t.netWeightKg || 0,
    period,
    language,
    anchorDate
  );

  const nowMs = anchorDate.getTime();
  const lockedParcels = parcels.filter((p) =>
    cropCycles.some((c) => c.parcelId === p.id && c.currentPhase === 'treatment_locked') ||
    treatmentLogs.some((t) => {
      if (t.parcelId !== p.id) return false;
      const allow = parseIsoDay(t.harvestAllowedDate);
      return allow ? allow.getTime() > nowMs : false;
    })
  ).length;

  const waterBullets: BulletItem[] = parcels
    .filter((p) => (p.anrhAnnualQuotaM3 || 0) > 0)
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      label: p.name,
      value: Math.round(p.anrhConsumedM3 || 0),
      target: Math.round(p.anrhAnnualQuotaM3 || 0),
    }));

  const treemapItems: TreemapItem[] = parcels.map((p, i) => ({
    id: p.id,
    label: `${p.name}${p.currentCrop ? ` · ${p.currentCrop}` : ''}`,
    value: Math.round((p.surfaceHectares || 0) * 10) / 10,
    color: PALETTE[i % PALETTE.length],
  }));

  const milkSeries = buildDailySparkSeries(
    milkingRecords,
    (m) => m.sessionDate || m.createdAt,
    (m) => m.conformingLiters || 0,
    period,
    language,
    anchorDate
  );

  const windowPointages = filterByPeriod(pointages, (p) => p.date || p.createdAt, period, anchorDate);

  const waterMarginPct =
    parcels.reduce((s, p) => s + (p.anrhAnnualQuotaM3 || 0), 0) > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (1 -
                parcels.reduce((s, p) => s + (p.anrhConsumedM3 || 0), 0) /
                  parcels.reduce((s, p) => s + (p.anrhAnnualQuotaM3 || 0), 0)) *
                100
            )
          )
        )
      : 0;
  const darCompliancePct = parcels.length > 0 ? Math.round(((parcels.length - lockedParcels) / parcels.length) * 100) : 0;
  const herdHealthyPct = dairyCows.length > 0 ? Math.round((dairyCows.filter((c) => !c.isInWithholdingLockout && c.reproStatus !== 'Quarantaine').length / dairyCows.length) * 100) : 0;
  const cropReadyPct = cropCycles.length > 0 ? Math.round((cropCycles.filter((c) => c.currentPhase === 'ready_harvest' || c.currentPhase === 'closed').length / cropCycles.length) * 100) : 0;
  const pointagePaidPct = windowPointages.length > 0 ? Math.round((windowPointages.filter((p) => p.isPaid).length / windowPointages.length) * 100) : 0;

  const hasFarmData = parcels.length > 0 || cropCycles.length > 0 || dairyCows.length > 0;
  const radarAxes: RadarAxis[] = hasFarmData
    ? [
        { id: 'water', label: pickText(language, 'Marge ANRH', 'ANRH Water', 'مخزون المياه'), value: waterMarginPct, benchmark: 50 },
        { id: 'dar', label: pickText(language, 'Conformité DAR', 'DAR Safety', 'سلامة المعالجة'), value: darCompliancePct, benchmark: 95 },
        { id: 'herd', label: pickText(language, 'Santé cheptel', 'Herd Health', 'صحة القطيع'), value: herdHealthyPct, benchmark: 92 },
        { id: 'crop', label: pickText(language, 'Avancement cycles', 'Crop Progress', 'تقدم المحاصيل'), value: cropReadyPct, benchmark: 80 },
        { id: 'labor', label: pickText(language, 'Paie pointage', 'Labor Settled', 'أجور العمال'), value: pointagePaidPct, benchmark: 85 },
      ]
    : [];

  const yieldDumbbell: DumbbellItem[] = cropCycles.slice(0, 6).map((c) => ({
    id: c.id,
    label: `${c.cropName} (${c.variety})`,
    prev: c.projectedYieldQtx || 0,
    value: c.actualYieldQtx || 0,
  }));

  return {
    harvestKgTotal: harvestSeries.currentTotal,
    harvestDelta: harvestSeries.deltaPercent,
    harvestSpark: harvestSeries.series,
    lockedParcels,
    totalMilkLiters: milkSeries.currentTotal,
    waterBullets,
    treemapItems: treemapItems.filter((t) => t.value > 0),
    harvestAreaPoints: harvestSeries.areaPoints as AreaPoint[],
    milkAreaPoints: milkSeries.areaPoints as AreaPoint[],
    radarAxes,
    yieldDumbbell,
  };
}

import type {
  BonDeVisiteRecord,
  BuyerDemandProfile,
  DevVefaMilestone,
  MandateStatus,
  RealEstateAgentCommission,
  RealEstateLease,
  RealEstateMaintenanceTicket,
  RealEstateMandate,
  RealEstateOwnerLedgerEntry,
  RealEstateProperty,
  RealEstateSaleClosingChecklist,
  RealEstateSaleDeal,
  RealEstateSaleStage,
  SyndicFundCallAllocation,
  VacationRentalStay,
  VisitGpsStatus,
} from '../types/index';
import { centimesToDzd, dzdToCentimes, roundHalfAwayFromZero } from './money';
import { calculateMandateCommission, calculateSmartMatchScore, computeRentalTimbreFiscal } from './realEstateRules';

export function formatRealEstateSequentialCode(
  prefix: 'MND' | 'QTC' | 'BAIL' | 'DEAL' | 'MTK' | 'APP' | 'STAY' | 'PROG',
  existingCodes: Array<string | undefined | null>,
  year = new Date().getFullYear()
): string {
  const matcher = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let maxSeq = 0;
  for (const raw of existingCodes) {
    if (!raw) continue;
    const match = String(raw).trim().match(matcher);
    if (match) {
      const seq = Number.parseInt(match[1], 10);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${year}-${String(maxSeq + 1).padStart(5, '0')}`;
}

function normalizeDateStr(d?: string | null): string {
  return (d || '').slice(0, 10);
}

export function checkExclusiveMandateOverlap(
  existingMandates: RealEstateMandate[],
  candidate: {
    id?: string;
    propertyId: string;
    isExclusive: boolean;
    startDate: string;
    endDate: string;
    status?: MandateStatus;
  }
): { hasOverlap: boolean; conflictingMandate?: RealEstateMandate } {
  if (!candidate.isExclusive) return { hasOverlap: false };
  const cStatus = candidate.status || 'Active';
  if (cStatus !== 'Active' && cStatus !== 'Expiring') return { hasOverlap: false };

  const candStart = normalizeDateStr(candidate.startDate) || '0000-01-01';
  const candEnd = normalizeDateStr(candidate.endDate) || '9999-12-31';

  for (const m of existingMandates) {
    if (candidate.id && m.id === candidate.id) continue;
    if (m.propertyId !== candidate.propertyId) continue;
    if (!m.isExclusive) continue;
    if (m.status !== 'Active' && m.status !== 'Expiring') continue;

    const mStart = normalizeDateStr(m.startDate) || '0000-01-01';
    const mEnd = normalizeDateStr(m.endDate) || '9999-12-31';
    if (candStart <= mEnd && mStart <= candEnd) {
      return { hasOverlap: true, conflictingMandate: m };
    }
  }
  return { hasOverlap: false };
}

export function evaluateMandateExpiryStatus(
  mandate: Pick<RealEstateMandate, 'endDate' | 'status'>,
  asOfDate = new Date().toISOString().slice(0, 10)
): { derivedStatus: MandateStatus; daysRemaining: number } {
  if (mandate.status === 'Executed' || mandate.status === 'Revoked' || mandate.status === 'Draft') {
    return { derivedStatus: mandate.status, daysRemaining: 0 };
  }
  const endMs = Date.parse(`${normalizeDateStr(mandate.endDate)}T00:00:00Z`);
  const asOfMs = Date.parse(`${normalizeDateStr(asOfDate)}T00:00:00Z`);
  if (!Number.isFinite(endMs) || !Number.isFinite(asOfMs)) {
    return { derivedStatus: mandate.status, daysRemaining: 0 };
  }
  const daysRemaining = Math.round((endMs - asOfMs) / 86400000);
  if (daysRemaining < 0) return { derivedStatus: 'Expired', daysRemaining };
  if (daysRemaining <= 30) return { derivedStatus: 'Expiring', daysRemaining };
  return { derivedStatus: 'Active', daysRemaining };
}

export function computeAgentCommissionSplit(params: {
  grossCommissionDzd: number;
  primarySplitBps: number;
  secondarySplitBps?: number;
  hasSecondaryAgent?: boolean;
}): {
  valid: boolean;
  errorCode?: string;
  grossCommissionCentimes: number;
  primarySplitBps: number;
  secondarySplitBps: number;
  primaryShareCentimes: number;
  secondaryShareCentimes: number;
  primaryShareDzd: number;
  secondaryShareDzd: number;
} {
  const primaryBps = Math.round(Number(params.primarySplitBps ?? 10000));
  const secondaryBps = params.hasSecondaryAgent
    ? Math.round(Number(params.secondarySplitBps ?? 10000 - primaryBps))
    : 0;
  const effectivePrimaryBps = params.hasSecondaryAgent ? primaryBps : 10000;

  if (
    effectivePrimaryBps < 0 ||
    secondaryBps < 0 ||
    effectivePrimaryBps + secondaryBps !== 10000
  ) {
    return {
      valid: false,
      errorCode: 'RE_COMMISSION_SPLIT_SUM_MUST_EQUAL_10000_BPS',
      grossCommissionCentimes: 0,
      primarySplitBps: effectivePrimaryBps,
      secondarySplitBps: secondaryBps,
      primaryShareCentimes: 0,
      secondaryShareCentimes: 0,
      primaryShareDzd: 0,
      secondaryShareDzd: 0,
    };
  }

  const grossCentimes = dzdToCentimes(Math.max(0, Number(params.grossCommissionDzd) || 0));
  const primaryShareCentimes = roundHalfAwayFromZero((grossCentimes * effectivePrimaryBps) / 10000);
  const secondaryShareCentimes = params.hasSecondaryAgent
    ? grossCentimes - primaryShareCentimes
    : 0;

  return {
    valid: true,
    grossCommissionCentimes: grossCentimes,
    primarySplitBps: effectivePrimaryBps,
    secondarySplitBps: secondaryBps,
    primaryShareCentimes,
    secondaryShareCentimes,
    primaryShareDzd: centimesToDzd(primaryShareCentimes),
    secondaryShareDzd: centimesToDzd(secondaryShareCentimes),
  };
}

export function aggregateRealEstatePayrollCommissions(
  commissions: RealEstateAgentCommission[],
  agentStaffId: string,
  payrollRunId?: string
): { totalCentimes: number; totalDzd: number; count: number } {
  const matched = (commissions || []).filter(
    (c) =>
      c.agentStaffId === agentStaffId &&
      c.status === 'posted_to_payroll' &&
      (!payrollRunId || !c.payrollRunId || c.payrollRunId === payrollRunId)
  );
  const totalCentimes = matched.reduce((sum, c) => sum + Math.max(0, Math.round(c.agentShareCentimes || 0)), 0);
  return {
    totalCentimes,
    totalDzd: centimesToDzd(totalCentimes),
    count: matched.length,
  };
}

export function evaluatePortalReadiness(property: RealEstateProperty): {
  score: number;
  ready: boolean;
  missingFields: string[];
  activePortals: string[];
} {
  const missingFields: string[] = [];
  if (!property.title?.trim()) missingFields.push('title');
  if (!property.priceDzd || property.priceDzd <= 0) missingFields.push('priceDzd');
  if (!property.surfaceM2 || property.surfaceM2 <= 0) missingFields.push('surfaceM2');
  if (!property.cityWilaya?.trim()) missingFields.push('cityWilaya');
  if (!property.ownerPhone?.trim()) missingFields.push('ownerPhone');
  const photoCount = (property.photoUrls?.length || 0) + (property.featuredPhotoUrl ? 1 : 0);
  if (photoCount === 0) missingFields.push('photos');

  const activePortals: string[] = [];
  if (property.portalSync?.ouedkniss) activePortals.push('Ouedkniss');
  if (property.portalSync?.lkeria) activePortals.push('Lkeria');
  if (property.portalSync?.mubawab) activePortals.push('Mubawab');
  if (property.portalSync?.atriumPortal) activePortals.push('AtriumPortal');

  const score = Math.max(0, Math.round(((6 - missingFields.length) / 6) * 100));
  return {
    score,
    ready: missingFields.length === 0,
    missingFields,
    activePortals,
  };
}

export function buildBuyerMatchAlerts(
  property: RealEstateProperty,
  buyers: BuyerDemandProfile[],
  thresholdScore = 65
): Array<{
  buyer: BuyerDemandProfile;
  score: number;
  matchLevel: 'High' | 'Medium' | 'Low';
  highlights: string[];
  whatsappMessage: string;
  whatsappHref: string;
}> {
  return (buyers || [])
    .filter((b) => b.activeStatus !== 'Archived')
    .map((buyer) => {
      const res = calculateSmartMatchScore(
        {
          cityWilaya: property.cityWilaya,
          priceDzd: property.priceDzd,
          propertyType: property.propertyType,
          roomsCount: property.roomsCount,
          surfaceM2: property.surfaceM2,
        },
        {
          targetWilaya: buyer.targetWilaya,
          targetCommune: buyer.targetCommune,
          maxBudgetDzd: buyer.maxBudgetDzd,
          propertyType: buyer.propertyType,
          minRooms: buyer.minRooms,
          minSurfaceM2: buyer.minSurfaceM2,
        }
      );
      const cleanPhone = (buyer.clientPhone || '').replace(/[^\d+]/g, '').replace(/^0/, '213');
      const whatsappMessage = `Bonjour ${buyer.clientFullName}, un bien correspondant (${res.score}%) est disponible : ${property.title} (${property.cityWilaya}) — ${property.surfaceM2} m², ${property.priceDzd.toLocaleString('fr-FR')} DZD.`;
      const whatsappHref = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
      return {
        buyer,
        score: res.score,
        matchLevel: res.matchLevel,
        highlights: res.highlights,
        whatsappMessage,
        whatsappHref,
      };
    })
    .filter((m) => m.score >= thresholdScore)
    .sort((a, b) => b.score - a.score);
}

export const SALE_STAGE_ORDER: RealEstateSaleStage[] = [
  'Offer',
  'Promesse',
  'Notaire',
  'Enregistrement',
  'Acte',
  'Finalisé',
];

export function evaluateSaleClosingChecklist(checklist: RealEstateSaleClosingChecklist): {
  completedCount: number;
  totalCount: number;
  allCleared: boolean;
} {
  const flags = [
    Boolean(checklist.livretFoncierVerified),
    Boolean(checklist.certificatNegatifValid),
    Boolean(checklist.quitusFiscalCleared),
    Boolean(checklist.mainleveeBankCleared),
    Boolean(checklist.notaryActSigned),
  ];
  const completedCount = flags.filter(Boolean).length;
  return {
    completedCount,
    totalCount: flags.length,
    allCleared: completedCount === flags.length,
  };
}

export function transitionSaleDealStage(
  deal: RealEstateSaleDeal,
  nextStage: RealEstateSaleStage,
  tvaRatePercent = 19
): { ok: boolean; errorCode?: string; updatedDeal?: RealEstateSaleDeal } {
  if (nextStage === 'Finalisé') {
    const chk = evaluateSaleClosingChecklist(deal.closingChecklist);
    if (!chk.allCleared) {
      return { ok: false, errorCode: 'RE_SALE_CLOSING_CHECKLIST_INCOMPLETE' };
    }
  }
  const comm = calculateMandateCommission(deal.salePriceDzd, 'DecreeTranches', 0, 0, tvaRatePercent);
  const nowIso = new Date().toISOString();
  return {
    ok: true,
    updatedDeal: {
      ...deal,
      stage: nextStage,
      commissionHtDzd: deal.commissionHtDzd > 0 ? deal.commissionHtDzd : comm.baseHt,
      commissionTvaDzd: deal.commissionTvaDzd > 0 ? deal.commissionTvaDzd : comm.tva,
      commissionTtcDzd: deal.commissionTtcDzd > 0 ? deal.commissionTtcDzd : comm.totalTtc,
      closingDate: nextStage === 'Finalisé' ? (deal.closingDate || nowIso.slice(0, 10)) : deal.closingDate,
      updatedAt: nowIso,
    },
  };
}

export function allocatePartialRentPayment(params: {
  amountDueDzd: number;
  previouslyPaidDzd?: number;
  previousSeq?: number;
  paymentAmountDzd: number;
  paymentMethod: 'Cash' | 'Cheque' | 'Virement' | 'BaridiMob';
  applyTimbre?: boolean;
}): {
  ok: boolean;
  errorCode?: string;
  appliedPaymentDzd: number;
  totalPaidDzd: number;
  remainingDueDzd: number;
  isPartial: boolean;
  paymentStatus: 'Due' | 'Partial' | 'Paid';
  partialPaymentSeq: number;
  timbreFiscalDzd: number;
  totalCollectedWithTimbreDzd: number;
} {
  const dueCentimes = dzdToCentimes(Math.max(0, Number(params.amountDueDzd) || 0));
  const prevCentimes = dzdToCentimes(Math.max(0, Number(params.previouslyPaidDzd) || 0));
  const payCentimes = dzdToCentimes(Math.max(0, Number(params.paymentAmountDzd) || 0));

  if (dueCentimes <= 0 || payCentimes <= 0) {
    return {
      ok: false,
      errorCode: 'RE_INVALID_RENT_PAYMENT_AMOUNT',
      appliedPaymentDzd: 0,
      totalPaidDzd: centimesToDzd(prevCentimes),
      remainingDueDzd: centimesToDzd(Math.max(0, dueCentimes - prevCentimes)),
      isPartial: prevCentimes > 0 && prevCentimes < dueCentimes,
      paymentStatus: prevCentimes >= dueCentimes && dueCentimes > 0 ? 'Paid' : prevCentimes > 0 ? 'Partial' : 'Due',
      partialPaymentSeq: params.previousSeq || 0,
      timbreFiscalDzd: 0,
      totalCollectedWithTimbreDzd: 0,
    };
  }

  const outstandingCentimes = Math.max(0, dueCentimes - prevCentimes);
  const appliedCentimes = Math.min(outstandingCentimes, payCentimes);
  const nextTotalPaidCentimes = prevCentimes + appliedCentimes;
  const remainingCentimes = Math.max(0, dueCentimes - nextTotalPaidCentimes);
  const appliedDzd = centimesToDzd(appliedCentimes);
  const timbreFiscalDzd = params.applyTimbre !== false
    ? computeRentalTimbreFiscal(appliedDzd, params.paymentMethod)
    : 0;

  return {
    ok: true,
    appliedPaymentDzd: appliedDzd,
    totalPaidDzd: centimesToDzd(nextTotalPaidCentimes),
    remainingDueDzd: centimesToDzd(remainingCentimes),
    isPartial: remainingCentimes > 0,
    paymentStatus: remainingCentimes <= 0 ? 'Paid' : 'Partial',
    partialPaymentSeq: (params.previousSeq || 0) + 1,
    timbreFiscalDzd,
    totalCollectedWithTimbreDzd: centimesToDzd(appliedCentimes + dzdToCentimes(timbreFiscalDzd)),
  };
}

export function renewLeaseContract(
  lease: RealEstateLease,
  additionalMonths = 12,
  asOfDate = new Date().toISOString().slice(0, 10)
): RealEstateLease {
  const baseDateStr = normalizeDateStr(lease.endDate) || normalizeDateStr(asOfDate);
  const dt = new Date(`${baseDateStr}T00:00:00Z`);
  dt.setUTCMonth(dt.getUTCMonth() + Math.max(1, Math.round(additionalMonths)));
  const newEndDate = dt.toISOString().slice(0, 10);
  return {
    ...lease,
    status: 'Active',
    endDate: newEndDate,
    renewalCount: (lease.renewalCount || 0) + 1,
  };
}

export function applyLeaseIndexation(
  lease: RealEstateLease,
  ratePercent: number,
  asOfDate = new Date().toISOString().slice(0, 10),
  note?: string
): { ok: boolean; errorCode?: string; updatedLease?: RealEstateLease } {
  if (lease.status !== 'Active') {
    return { ok: false, errorCode: 'RE_INDEXATION_REQUIRES_ACTIVE_LEASE' };
  }
  if (lease.indexationFrequency === 'None') {
    return { ok: false, errorCode: 'RE_LEASE_INDEXATION_DISABLED' };
  }
  if (!Number.isFinite(ratePercent) || ratePercent <= 0) {
    return { ok: false, errorCode: 'RE_INVALID_INDEXATION_RATE' };
  }
  const normalizedAsOf = normalizeDateStr(asOfDate);
  const nextAllowed = normalizeDateStr(lease.nextIndexationDate);
  if (nextAllowed && normalizedAsOf < nextAllowed) {
    return { ok: false, errorCode: 'RE_INDEXATION_DATE_NOT_REACHED' };
  }

  const prevCentimes = dzdToCentimes(lease.monthlyRentDzd);
  const newCentimes = roundHalfAwayFromZero(prevCentimes * (1 + ratePercent / 100));
  const newRentDzd = centimesToDzd(newCentimes);

  const nextDt = new Date(`${normalizedAsOf}T00:00:00Z`);
  nextDt.setUTCFullYear(nextDt.getUTCFullYear() + (lease.indexationFrequency === 'Biennial' ? 2 : 1));
  const nextIndexationDate = nextDt.toISOString().slice(0, 10);

  return {
    ok: true,
    updatedLease: {
      ...lease,
      monthlyRentDzd: newRentDzd,
      indexationRatePercent: ratePercent,
      nextIndexationDate,
      indexationHistory: [
        ...(lease.indexationHistory || []),
        {
          appliedAt: normalizedAsOf,
          previousRentDzd: lease.monthlyRentDzd,
          newRentDzd,
          ratePercent,
          note: note?.trim() || undefined,
        },
      ],
    },
  };
}

export function buildRentDueReminderContext(
  lease: RealEstateLease,
  leadDays = 5,
  asOfDate = new Date().toISOString().slice(0, 10)
): {
  isEligible: boolean;
  dueDate: string;
  eventType: 'rent_due';
  recipientName: string;
  recipientPhone: string;
  amountDzd: number;
  message: string;
} {
  const year = normalizedYearMonth(asOfDate).year;
  const month = normalizedYearMonth(asOfDate).month;
  const dueDate = `${year}-${String(month).padStart(2, '0')}-05`;
  return {
    isEligible: lease.status === 'Active' && Boolean(lease.tenantPhone?.trim()),
    dueDate,
    eventType: 'rent_due',
    recipientName: lease.tenantName,
    recipientPhone: lease.tenantPhone,
    amountDzd: lease.monthlyRentDzd,
    message: `Rappel loyer (${lease.propertyTitle}) : échéance du ${dueDate} pour ${lease.monthlyRentDzd.toLocaleString('fr-FR')} DZD (préavis J-${leadDays}).`,
  };
}

function normalizedYearMonth(dateStr: string): { year: number; month: number } {
  const parts = normalizeDateStr(dateStr).split('-');
  return {
    year: Number.parseInt(parts[0], 10) || new Date().getFullYear(),
    month: Number.parseInt(parts[1], 10) || new Date().getMonth() + 1,
  };
}

export function createMaintenanceOwnerDebitEntry(
  ticket: RealEstateMaintenanceTicket
): RealEstateOwnerLedgerEntry | null {
  if (ticket.chargeTarget !== 'Owner') return null;
  const debitDzd = ticket.actualCostDzd > 0 ? ticket.actualCostDzd : ticket.estimatedCostDzd;
  if (debitDzd <= 0) return null;
  const nowIso = new Date().toISOString();
  return {
    id: `led_${ticket.id}`,
    accountId: ticket.accountId,
    businessId: ticket.businessId,
    branchId: ticket.branchId,
    staffId: ticket.staffId,
    leaseId: ticket.leaseId,
    propertyId: ticket.propertyId,
    ownerName: ticket.ownerName,
    propertyTitle: ticket.propertyTitle,
    entryType: 'MaintenanceDebit',
    amountDzd: debitDzd,
    entryDate: ticket.resolvedAt || nowIso.slice(0, 10),
    reference: ticket.ticketNumber,
    notes: `${ticket.title}${ticket.vendorName ? ` (${ticket.vendorName})` : ''}`,
    createdAt: nowIso,
  };
}

export function allocateSyndicFundCallByTantiemes(
  totalBudgetDzd: number,
  lots: Array<{ lotNumber: string; ownerName: string; tantiemes: number }>
): {
  totalBudgetCentimes: number;
  totalTantiemes: number;
  allocations: SyndicFundCallAllocation[];
} {
  const totalBudgetCentimes = dzdToCentimes(Math.max(0, Number(totalBudgetDzd) || 0));
  const totalTantiemes = lots.reduce((sum, l) => sum + Math.max(0, Math.round(l.tantiemes || 0)), 0);
  if (totalTantiemes <= 0 || lots.length === 0) {
    return { totalBudgetCentimes, totalTantiemes: 0, allocations: [] };
  }

  const rawRows = lots.map((l) => {
    const exact = (totalBudgetCentimes * Math.max(0, Math.round(l.tantiemes))) / totalTantiemes;
    const floorVal = Math.floor(exact);
    return {
      lot: l,
      floorVal,
      remainder: exact - floorVal,
    };
  });

  const allocatedSum = rawRows.reduce((sum, r) => sum + r.floorVal, 0);
  let leftoverCentimes = totalBudgetCentimes - allocatedSum;

  const sortedByRem = rawRows
    .map((r, idx) => ({ idx, remainder: r.remainder }))
    .sort((a, b) => b.remainder - a.remainder);

  const bonus = new Array<number>(lots.length).fill(0);
  let cursor = 0;
  while (leftoverCentimes > 0 && sortedByRem.length > 0) {
    bonus[sortedByRem[cursor % sortedByRem.length].idx] += 1;
    leftoverCentimes -= 1;
    cursor += 1;
  }

  const allocations: SyndicFundCallAllocation[] = rawRows.map((r, idx) => {
    const amountCentimes = r.floorVal + bonus[idx];
    return {
      lotNumber: r.lot.lotNumber,
      ownerName: r.lot.ownerName,
      tantiemes: Math.round(r.lot.tantiemes),
      amountCentimes,
      amountDzd: centimesToDzd(amountCentimes),
      paidDzd: 0,
      status: 'Due',
    };
  });

  return { totalBudgetCentimes, totalTantiemes, allocations };
}

export function evaluateSyndicAssemblyQuorum(
  presentTantiemes: number,
  representedTantiemes: number,
  totalTantiemes: number,
  assemblyType: 'AGO' | 'AGE'
): { quorumPercent: number; requiredPercent: number; quorumReached: boolean } {
  const safeTotal = Math.max(1, totalTantiemes);
  const combined = Math.max(0, presentTantiemes) + Math.max(0, representedTantiemes);
  const quorumPercent = Math.min(100, Math.round((combined / safeTotal) * 10000) / 100);
  const requiredPercent = assemblyType === 'AGE' ? 66.67 : 50;
  return {
    quorumPercent,
    requiredPercent,
    quorumReached: quorumPercent >= requiredPercent,
  };
}

export function validateVefaMilestones(
  milestones: DevVefaMilestone[],
  lotPriceDzd: number
): { valid: boolean; totalBps: number; errorCode?: string; normalizedMilestones: DevVefaMilestone[] } {
  const totalBps = milestones.reduce((sum, m) => sum + Math.round(m.percentBps || 0), 0);
  if (totalBps !== 10000) {
    return {
      valid: false,
      totalBps,
      errorCode: 'RE_VEFA_MILESTONES_MUST_SUM_TO_10000_BPS',
      normalizedMilestones: milestones,
    };
  }
  const priceCentimes = dzdToCentimes(Math.max(0, lotPriceDzd));
  let assignedCentimes = 0;
  const normalizedMilestones = milestones.map((m, idx) => {
    const isLast = idx === milestones.length - 1;
    const milestoneCentimes = isLast
      ? priceCentimes - assignedCentimes
      : roundHalfAwayFromZero((priceCentimes * m.percentBps) / 10000);
    assignedCentimes += milestoneCentimes;
    return {
      ...m,
      amountDzd: centimesToDzd(milestoneCentimes),
    };
  });
  return {
    valid: true,
    totalBps,
    normalizedMilestones,
  };
}

export function checkVacationStayOverlap(
  existingStays: VacationRentalStay[],
  candidate: {
    id?: string;
    propertyId: string;
    checkInDate: string;
    checkOutDate: string;
    status?: VacationRentalStay['status'];
  }
): { ok: boolean; errorCode?: string; conflictingStay?: VacationRentalStay; nightsCount: number } {
  const start = normalizeDateStr(candidate.checkInDate);
  const end = normalizeDateStr(candidate.checkOutDate);
  if (!start || !end || end <= start) {
    return { ok: false, errorCode: 'RE_VACATION_INVALID_DATE_RANGE', nightsCount: 0 };
  }
  const nightsCount = Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000
  );
  if (candidate.status === 'Cancelled') {
    return { ok: true, nightsCount };
  }

  for (const s of existingStays) {
    if (candidate.id && s.id === candidate.id) continue;
    if (s.propertyId !== candidate.propertyId) continue;
    if (s.status === 'Cancelled' || s.status === 'CheckedOut') continue;
    const sIn = normalizeDateStr(s.checkInDate);
    const sOut = normalizeDateStr(s.checkOutDate);
    // Half-open [checkIn, checkOut) intersection: sIn < end && start < sOut
    if (sIn < end && start < sOut) {
      return {
        ok: false,
        errorCode: 'RE_VACATION_STAY_OVERLAP',
        conflictingStay: s,
        nightsCount,
      };
    }
  }
  return { ok: true, nightsCount };
}

export function normalizeVisitGpsState(params: {
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  errorCode?: number | null;
}): {
  gpsStatus: VisitGpsStatus;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
} {
  const lat = params.latitude;
  const lng = params.longitude;
  if (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng)
  ) {
    return {
      gpsStatus: 'captured',
      gpsLatitude: Number(lat.toFixed(5)),
      gpsLongitude: Number(lng.toFixed(5)),
      gpsAccuracyMeters:
        typeof params.accuracyMeters === 'number' && Number.isFinite(params.accuracyMeters)
          ? Math.round(params.accuracyMeters)
          : undefined,
    };
  }
  if (params.errorCode === 1) return { gpsStatus: 'denied' };
  if (params.errorCode === 3) return { gpsStatus: 'timeout' };
  return { gpsStatus: 'unavailable' };
}

export function formatVisitGpsLabel(
  visit: Pick<BonDeVisiteRecord, 'gpsStatus' | 'gpsLatitude' | 'gpsLongitude'>,
  language: string
): string {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  if (
    visit.gpsStatus !== 'denied' &&
    visit.gpsStatus !== 'unavailable' &&
    visit.gpsStatus !== 'timeout' &&
    typeof visit.gpsLatitude === 'number' &&
    typeof visit.gpsLongitude === 'number'
  ) {
    return `${visit.gpsLatitude.toFixed(4)}°N, ${visit.gpsLongitude.toFixed(4)}°E`;
  }
  if (visit.gpsStatus === 'denied') {
    return isAr ? 'تم رفض GPS' : isEn ? 'GPS permission denied' : 'GPS refusé';
  }
  if (visit.gpsStatus === 'timeout') {
    return isAr ? 'انتهت مهلة GPS' : isEn ? 'GPS timeout' : 'Délai GPS expiré';
  }
  return isAr ? 'GPS غير متاح' : isEn ? 'GPS unavailable' : 'GPS indisponible';
}

export function buildRealEstateScfJournalDraft(params: {
  reference: string;
  label: string;
  grossCollectedDzd: number;
  agencyFeeHtDzd: number;
  agencyFeeTvaDzd: number;
  paymentMethod: 'Cash' | 'Cheque' | 'Virement' | 'BaridiMob';
}): {
  balanced: boolean;
  journalCode: 'CA' | 'BQ';
  totalDebitCentimes: number;
  totalCreditCentimes: number;
  lines: Array<{ accountCode: string; accountLabel: string; label: string; debitCentimes: number; creditCentimes: number }>;
} {
  const grossCentimes = dzdToCentimes(Math.max(0, params.grossCollectedDzd));
  const feeHtCentimes = dzdToCentimes(Math.max(0, params.agencyFeeHtDzd));
  const feeTvaCentimes = dzdToCentimes(Math.max(0, params.agencyFeeTvaDzd));
  const netOwnerCentimes = Math.max(0, grossCentimes - feeHtCentimes - feeTvaCentimes);

  const cashAccount = params.paymentMethod === 'Cash' ? '530' : '512';
  const lines = [
    {
      accountCode: cashAccount,
      accountLabel: `Encaissement ${params.reference} (${params.paymentMethod})`,
      label: `Encaissement ${params.reference} (${params.paymentMethod})`,
      debitCentimes: grossCentimes,
      creditCentimes: 0,
    },
    ...(feeHtCentimes > 0
      ? [
          {
            accountCode: '706',
            accountLabel: `Honoraires gestion/transaction ${params.label}`,
            label: `Honoraires gestion/transaction ${params.label}`,
            debitCentimes: 0,
            creditCentimes: feeHtCentimes,
          },
        ]
      : []),
    ...(feeTvaCentimes > 0
      ? [
          {
            accountCode: '4457',
            accountLabel: `TVA collectée sur honoraires ${params.reference}`,
            label: `TVA collectée sur honoraires ${params.reference}`,
            debitCentimes: 0,
            creditCentimes: feeTvaCentimes,
          },
        ]
      : []),
    ...(netOwnerCentimes > 0
      ? [
          {
            accountCode: '467',
            accountLabel: `Compte mandant bailleur net ${params.reference}`,
            label: `Compte mandant bailleur net ${params.reference}`,
            debitCentimes: 0,
            creditCentimes: netOwnerCentimes,
          },
        ]
      : []),
  ];

  const totalDebitCentimes = lines.reduce((s, l) => s + l.debitCentimes, 0);
  const totalCreditCentimes = lines.reduce((s, l) => s + l.creditCentimes, 0);
  return {
    balanced: totalDebitCentimes === totalCreditCentimes && totalDebitCentimes > 0,
    journalCode: params.paymentMethod === 'Cash' ? 'CA' : 'BQ',
    totalDebitCentimes,
    totalCreditCentimes,
    lines,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateRealEstatePayrollCommissions,
  allocatePartialRentPayment,
  allocateSyndicFundCallByTantiemes,
  applyLeaseIndexation,
  buildBuyerMatchAlerts,
  buildRealEstateScfJournalDraft,
  buildRentDueReminderContext,
  checkExclusiveMandateOverlap,
  checkVacationStayOverlap,
  computeAgentCommissionSplit,
  createMaintenanceOwnerDebitEntry,
  evaluateMandateExpiryStatus,
  evaluatePortalReadiness,
  evaluateSyndicAssemblyQuorum,
  formatRealEstateSequentialCode,
  formatVisitGpsLabel,
  normalizeVisitGpsState,
  renewLeaseContract,
  transitionSaleDealStage,
  validateVefaMilestones,
} from './realEstateDepth';
import type {
  BuyerDemandProfile,
  RealEstateAgentCommission,
  RealEstateLease,
  RealEstateMaintenanceTicket,
  RealEstateMandate,
  RealEstateProperty,
  RealEstateSaleDeal,
  VacationRentalStay,
} from '../types/index';

const BASE_PROP: RealEstateProperty = {
  id: 'prop_01',
  accountId: 'acc_01',
  businessId: 'biz_re',
  branchId: 'br_re',
  staffId: 'stf_01',
  title: 'Appartement F4 Hydra',
  propertyType: 'Apartment',
  listingType: 'Sale',
  surfaceM2: 145,
  roomsCount: 4,
  address: 'Hydra, Alger',
  cityWilaya: 'Hydra, Alger',
  priceDzd: 42000000,
  ownerName: 'Kamel Boumaza',
  ownerPhone: '0550112233',
  status: 'Available',
  photoUrls: ['https://example.com/photo1.jpg'],
  portalSync: { ouedkniss: true, atriumPortal: true },
  createdAt: '2026-01-01T00:00:00Z',
};

test('formatRealEstateSequentialCode increments deterministically without Math.random()', () => {
  assert.equal(formatRealEstateSequentialCode('MND', ['MND-2026-00011', 'MND-2026-00014'], 2026), 'MND-2026-00015');
  assert.equal(formatRealEstateSequentialCode('QTC', [], 2026), 'QTC-2026-00001');
  assert.equal(formatRealEstateSequentialCode('BAIL', ['BAIL-2025-00999'], 2026), 'BAIL-2026-00001');
});

test('checkExclusiveMandateOverlap blocks overlapping exclusive mandates on same property and evaluateMandateExpiryStatus detects expiring mandates', () => {
  const existing: RealEstateMandate[] = [
    {
      id: 'mnd_1',
      accountId: 'acc_01',
      businessId: 'biz_re',
      branchId: 'br_re',
      staffId: 'stf_01',
      mandateNumber: 'MND-2026-00001',
      mandateType: 'Vente_Exclusif',
      status: 'Active',
      propertyId: 'prop_01',
      propertyTitle: 'F4 Hydra',
      propertyAddress: 'Hydra',
      propertyType: 'Apartment',
      listingType: 'Sale',
      ownerFullName: 'Kamel',
      ownerPhone: '0550',
      ownerNationalId: '123',
      askingPriceDzd: 42000000,
      minimumAcceptablePriceDzd: 40000000,
      commissionCalculationMode: 'DecreeTranches',
      commissionEstimatedHtDzd: 480000,
      commissionEstimatedTtcDzd: 571200,
      commissionPayer: 'Seller',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      renewalCount: 0,
      isExclusive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const overlap = checkExclusiveMandateOverlap(existing, {
    propertyId: 'prop_01',
    isExclusive: true,
    startDate: '2026-04-01',
    endDate: '2026-09-01',
  });
  assert.equal(overlap.hasOverlap, true);
  assert.equal(overlap.conflictingMandate?.id, 'mnd_1');

  const nonExclusive = checkExclusiveMandateOverlap(existing, {
    propertyId: 'prop_01',
    isExclusive: false,
    startDate: '2026-04-01',
    endDate: '2026-09-01',
  });
  assert.equal(nonExclusive.hasOverlap, false);

  assert.equal(evaluateMandateExpiryStatus(existing[0], '2026-06-15').derivedStatus, 'Expiring');
  assert.equal(evaluateMandateExpiryStatus(existing[0], '2026-07-02').derivedStatus, 'Expired');
});

test('computeAgentCommissionSplit enforces 10000 bps conservation and aggregates payroll commissions', () => {
  const bad = computeAgentCommissionSplit({
    grossCommissionDzd: 100000,
    primarySplitBps: 7000,
    secondarySplitBps: 2000,
    hasSecondaryAgent: true,
  });
  assert.equal(bad.valid, false);
  assert.equal(bad.errorCode, 'RE_COMMISSION_SPLIT_SUM_MUST_EQUAL_10000_BPS');

  const good = computeAgentCommissionSplit({
    grossCommissionDzd: 100001,
    primarySplitBps: 6000,
    secondarySplitBps: 4000,
    hasSecondaryAgent: true,
  });
  assert.equal(good.valid, true);
  assert.equal(good.primaryShareCentimes + good.secondaryShareCentimes, good.grossCommissionCentimes);

  const list: RealEstateAgentCommission[] = [
    {
      id: 'rc_1',
      accountId: 'acc_01',
      businessId: 'biz_re',
      branchId: 'br_re',
      agentStaffId: 'stf_01',
      agentName: 'Yasmine',
      roleType: 'primary',
      sourceType: 'SaleDeal',
      referenceNumber: 'DEAL-2026-00001',
      periodMonth: '2026-11',
      grossCommissionCentimes: 5000000,
      splitBps: 6000,
      agentShareCentimes: 3000000,
      agentShareDzd: 30000,
      status: 'posted_to_payroll',
      createdAt: '2026-11-10',
      updatedAt: '2026-11-10',
    },
    {
      id: 'rc_2',
      accountId: 'acc_01',
      businessId: 'biz_re',
      branchId: 'br_re',
      agentStaffId: 'stf_01',
      agentName: 'Yasmine',
      roleType: 'secondary',
      sourceType: 'Lease',
      referenceNumber: 'BAIL-2026-00003',
      periodMonth: '2026-11',
      grossCommissionCentimes: 1000000,
      splitBps: 5000,
      agentShareCentimes: 500000,
      agentShareDzd: 5000,
      status: 'pending',
      createdAt: '2026-11-11',
      updatedAt: '2026-11-11',
    },
  ];
  const agg = aggregateRealEstatePayrollCommissions(list, 'stf_01');
  assert.equal(agg.totalDzd, 30000);
  assert.equal(agg.count, 1);
});

test('allocatePartialRentPayment tracks partial states & computes Art. 317 timbre on cash portion paid', () => {
  const first = allocatePartialRentPayment({
    amountDueDzd: 100000,
    previouslyPaidDzd: 0,
    previousSeq: 0,
    paymentAmountDzd: 50000,
    paymentMethod: 'Cash',
    applyTimbre: true,
  });
  assert.equal(first.ok, true);
  assert.equal(first.paymentStatus, 'Partial');
  assert.equal(first.remainingDueDzd, 50000);
  assert.equal(first.timbreFiscalDzd, 200);
  assert.equal(first.partialPaymentSeq, 1);

  const second = allocatePartialRentPayment({
    amountDueDzd: 100000,
    previouslyPaidDzd: 50000,
    previousSeq: 1,
    paymentAmountDzd: 50000,
    paymentMethod: 'Virement',
    applyTimbre: true,
  });
  assert.equal(second.paymentStatus, 'Paid');
  assert.equal(second.remainingDueDzd, 0);
  assert.equal(second.timbreFiscalDzd, 0);
  assert.equal(second.partialPaymentSeq, 2);
});

test('renewLeaseContract preserves Active status and applyLeaseIndexation enforces nextIndexationDate', () => {
  const lease: RealEstateLease = {
    id: 'l_1',
    accountId: 'acc_01',
    businessId: 'biz_re',
    branchId: 'br_re',
    staffId: 'stf_01',
    propertyId: 'prop_01',
    propertyTitle: 'F4 Hydra',
    tenantName: 'Sofiane',
    tenantPhone: '0555112233',
    startDate: '2025-01-01',
    endDate: '2026-01-01',
    monthlyRentDzd: 100000,
    securityDepositDzd: 200000,
    status: 'Active',
    indexationFrequency: 'Annual',
    nextIndexationDate: '2026-06-01',
  };

  const renewed = renewLeaseContract(lease, 12);
  assert.equal(renewed.status, 'Active');
  assert.equal(renewed.endDate, '2027-01-01');
  assert.equal(renewed.renewalCount, 1);

  const early = applyLeaseIndexation(renewed, 5, '2026-05-15');
  assert.equal(early.ok, false);
  assert.equal(early.errorCode, 'RE_INDEXATION_DATE_NOT_REACHED');

  const ok = applyLeaseIndexation(renewed, 5, '2026-06-15', 'Indexation IRL 5%');
  assert.equal(ok.ok, true);
  assert.equal(ok.updatedLease?.monthlyRentDzd, 105000);
  assert.equal(ok.updatedLease?.nextIndexationDate, '2027-06-15');
  assert.equal(ok.updatedLease?.indexationHistory?.length, 1);

  const reminder = buildRentDueReminderContext(ok.updatedLease!, 5, '2026-11-28');
  assert.equal(reminder.isEligible, true);
  assert.equal(reminder.eventType, 'rent_due');
});

test('portal readiness, buyer-match WhatsApp link, sales pipeline checklist & maintenance owner debit', () => {
  const readiness = evaluatePortalReadiness(BASE_PROP);
  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.activePortals, ['Ouedkniss', 'AtriumPortal']);

  const buyers: BuyerDemandProfile[] = [
    {
      id: 'buy_1',
      accountId: 'acc_01',
      businessId: 'biz_re',
      branchId: 'br_re',
      staffId: 'stf_01',
      clientFullName: 'Amine Rahmani',
      clientPhone: '0550 99 88 77',
      targetWilaya: 'Alger',
      targetCommune: 'Hydra',
      propertyType: 'Apartment',
      maxBudgetDzd: 45000000,
      minRooms: 4,
      minSurfaceM2: 120,
      financingType: 'Cash',
      searchUrgency: 'Immediate',
      activeStatus: 'Active',
      createdAt: '2026-02-01',
    },
  ];
  const matches = buildBuyerMatchAlerts(BASE_PROP, buyers);
  assert.equal(matches.length, 1);
  assert.ok(matches[0].whatsappHref.startsWith('https://wa.me/213550998877?text='));

  const deal: RealEstateSaleDeal = {
    id: 'deal_1',
    accountId: 'acc_01',
    businessId: 'biz_re',
    branchId: 'br_re',
    staffId: 'stf_01',
    dealNumber: 'DEAL-2026-00001',
    propertyId: 'prop_01',
    propertyTitle: 'F4 Hydra',
    buyerName: 'Amine',
    sellerName: 'Kamel',
    primarySplitBps: 10000,
    secondarySplitBps: 0,
    salePriceDzd: 42000000,
    commissionHtDzd: 480000,
    commissionTvaDzd: 91200,
    commissionTtcDzd: 571200,
    depositPaidDzd: 4200000,
    stage: 'Acte',
    closingChecklist: {
      livretFoncierVerified: true,
      certificatNegatifValid: true,
      quitusFiscalCleared: false,
      mainleveeBankCleared: true,
      notaryActSigned: true,
    },
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01',
  };
  const blockedFinal = transitionSaleDealStage(deal, 'Finalisé');
  assert.equal(blockedFinal.ok, false);
  assert.equal(blockedFinal.errorCode, 'RE_SALE_CLOSING_CHECKLIST_INCOMPLETE');

  const clearedFinal = transitionSaleDealStage(
    { ...deal, closingChecklist: { ...deal.closingChecklist, quitusFiscalCleared: true } },
    'Finalisé'
  );
  assert.equal(clearedFinal.ok, true);
  assert.equal(clearedFinal.updatedDeal?.stage, 'Finalisé');

  const ticket: RealEstateMaintenanceTicket = {
    id: 'mt_1',
    accountId: 'acc_01',
    businessId: 'biz_re',
    branchId: 'br_re',
    staffId: 'stf_01',
    ticketNumber: 'MTK-2026-00001',
    propertyId: 'prop_01',
    propertyTitle: 'F4 Hydra',
    ownerName: 'Kamel Boumaza',
    category: 'Plumbing',
    priority: 'High',
    title: 'Fuite colonne eau',
    estimatedCostDzd: 14000,
    actualCostDzd: 15500,
    chargeTarget: 'Owner',
    status: 'Resolved',
    reportedAt: '2026-11-10',
    resolvedAt: '2026-11-12',
    createdAt: '2026-11-10',
    updatedAt: '2026-11-12',
  };
  const debit = createMaintenanceOwnerDebitEntry(ticket);
  assert.equal(debit?.entryType, 'MaintenanceDebit');
  assert.equal(debit?.amountDzd, 15500);
});

test('syndic tantièmes centimes allocation, assembly quorum, VEFA 100% milestones, vacation half-open overlap & honest GPS', () => {
  const split = allocateSyndicFundCallByTantiemes(100001, [
    { lotNumber: 'A1', ownerName: 'Owner 1', tantiemes: 333 },
    { lotNumber: 'A2', ownerName: 'Owner 2', tantiemes: 333 },
    { lotNumber: 'A3', ownerName: 'Owner 3', tantiemes: 334 },
  ]);
  const sumCentimes = split.allocations.reduce((s, a) => s + a.amountCentimes, 0);
  assert.equal(sumCentimes, split.totalBudgetCentimes);

  const ageFail = evaluateSyndicAssemblyQuorum(500, 100, 1000, 'AGE');
  assert.equal(ageFail.quorumReached, false);
  const ageOk = evaluateSyndicAssemblyQuorum(550, 150, 1000, 'AGE');
  assert.equal(ageOk.quorumReached, true);

  const badVefa = validateVefaMilestones(
    [{ code: 'RESERVATION', label: 'Réservation', percentBps: 2000, amountDzd: 0, status: 'Pending' }],
    15000000
  );
  assert.equal(badVefa.valid, false);

  const goodVefa = validateVefaMilestones(
    [
      { code: 'RESERVATION', label: 'Réservation', percentBps: 2000, amountDzd: 0, status: 'Paid' },
      { code: 'FONDATIONS', label: 'Fondations', percentBps: 1500, amountDzd: 0, status: 'Called' },
      { code: 'GROS_OEUVRE', label: 'Gros oeuvre', percentBps: 3500, amountDzd: 0, status: 'Pending' },
      { code: 'CLOS_COUVERT', label: 'Clos couvert', percentBps: 2500, amountDzd: 0, status: 'Pending' },
      { code: 'LIVRAISON', label: 'Remise clés', percentBps: 500, amountDzd: 0, status: 'Pending' },
    ],
    15000000
  );
  assert.equal(goodVefa.valid, true);
  assert.equal(goodVefa.normalizedMilestones.reduce((s, m) => s + m.amountDzd, 0), 15000000);

  const stays: VacationRentalStay[] = [
    {
      id: 'st_1',
      accountId: 'acc_01',
      businessId: 'biz_re',
      branchId: 'br_re',
      staffId: 'stf_01',
      stayCode: 'STAY-2026-00001',
      propertyId: 'prop_01',
      propertyTitle: 'Villa Tipaza',
      guestName: 'Karim',
      guestPhone: '0550',
      checkInDate: '2026-07-10',
      checkOutDate: '2026-07-15',
      nightsCount: 5,
      nightlyRateDzd: 20000,
      cleaningFeeDzd: 5000,
      totalAmountDzd: 105000,
      depositDzd: 30000,
      cleaningStatus: 'CleanReady',
      status: 'Confirmed',
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
    },
  ];
  assert.equal(
    checkVacationStayOverlap(stays, { propertyId: 'prop_01', checkInDate: '2026-07-12', checkOutDate: '2026-07-16' }).ok,
    false
  );
  // Same-day turnover [2026-07-15, 2026-07-18) is valid because [in, out) is half-open
  assert.equal(
    checkVacationStayOverlap(stays, { propertyId: 'prop_01', checkInDate: '2026-07-15', checkOutDate: '2026-07-18' }).ok,
    true
  );

  // Honest GPS: zero fake Algiers coords on denied/error
  const denied = normalizeVisitGpsState({ errorCode: 1 });
  assert.equal(denied.gpsStatus, 'denied');
  assert.equal(denied.gpsLatitude, undefined);
  assert.equal(formatVisitGpsLabel(denied, 'fr'), 'GPS refusé');

  const scf = buildRealEstateScfJournalDraft({
    reference: 'QTC-2026-00001',
    label: 'Loyer Juin F4 Hydra',
    grossCollectedDzd: 100000,
    agencyFeeHtDzd: 7000,
    agencyFeeTvaDzd: 1330,
    paymentMethod: 'Virement',
  });
  assert.equal(scf.balanced, true);
});

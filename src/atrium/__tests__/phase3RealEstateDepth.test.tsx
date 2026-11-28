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
  selectCurrentJournalEntriesFromState,
  selectCurrentRealEstateAgentCommissionsFromState,
  selectCurrentStaffFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentUnifiedPaymentsFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  aggregateRealEstatePayrollCommissions,
  allocatePartialRentPayment,
  allocateSyndicFundCallByTantiemes,
  applyLeaseIndexation,
  buildBuyerMatchAlerts,
  buildRealEstateScfJournalDraft,
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
} from '../../utils/realEstateDepth';
import type {
  BuyerDemandProfile,
  RealEstateAgentCommission,
  RealEstateLease,
  RealEstateMaintenanceTicket,
  RealEstateMandate,
  RealEstateProperty,
  RealEstateSaleDeal,
  VacationRentalStay,
} from '../../types/index';
import { BonDeVisiteModal } from '../../components/screens/realestate/BonDeVisiteModal';
import { RealEstatePropertiesView } from '../../components/screens/realestate/RealEstatePropertiesView';
import { RealEstateMandatesView } from '../../components/screens/realestate/RealEstateMandatesView';
import { RealEstateLeasesView } from '../../components/screens/realestate/RealEstateLeasesView';
import { RealEstateFinanceView } from '../../components/screens/realestate/RealEstateFinanceView';
import { RealEstateInspectionsView } from '../../components/screens/realestate/RealEstateInspectionsView';
import { RealEstateStaffView } from '../../components/screens/realestate/RealEstateStaffView';
import { RealEstateBuyerMatchPanel } from '../../components/screens/realestate/RealEstateBuyerMatchPanel';
import { RealEstateSalesPipelinePanel } from '../../components/screens/realestate/RealEstateSalesPipelinePanel';
import { RealEstateMaintenancePanel } from '../../components/screens/realestate/RealEstateMaintenancePanel';
import { RealEstateTradeModesPanel } from '../../components/screens/realestate/RealEstateTradeModesPanel';
import {
  INITIAL_PROPERTIES,
  INITIAL_MANDATES,
  INITIAL_LEASES,
  INITIAL_BUYERS,
  INITIAL_SALE_DEALS,
  INITIAL_MAINTENANCE_TICKETS,
  INITIAL_OWNER_LEDGER,
} from '../../components/screens/realestate/realEstateData';
import { getAllowedRoutesForCategoryRole } from '../../utils/routePermissions';

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

describe('Phase 3 Step 11 (7.11 real_estate) — Mandates, Leases, GPS Honesty, Sales/Maintenance/Trades, Payroll & SCF', () => {
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
    const reBiz = getGlobalState().businesses.find((b) => b.category === 'real_estate');
    expect(reBiz).toBeTruthy();
    if (reBiz) {
      switchBusinessAction(reBiz.id);
    }
  });

  it('enforces sequential numbering, exclusive mandate overlap blocking, expiry derivation & co-agent splits', () => {
    expect(formatRealEstateSequentialCode('MND', ['MND-2026-00004', 'MND-2026-00012'], 2026)).toBe('MND-2026-00013');
    expect(formatRealEstateSequentialCode('QTC', ['QTC-2026-00001'], 2026)).toBe('QTC-2026-00002');
    expect(formatRealEstateSequentialCode('BAIL', [], 2026)).toBe('BAIL-2026-00001');

    const existingMandates: RealEstateMandate[] = [
      {
        ...INITIAL_MANDATES[0],
        id: 'm1',
        propertyId: 'prop_01',
        isExclusive: true,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        status: 'Active',
      },
    ];
    const overlap = checkExclusiveMandateOverlap(existingMandates, {
      propertyId: 'prop_01',
      isExclusive: true,
      startDate: '2026-04-01',
      endDate: '2026-09-30',
      status: 'Active',
    });
    expect(overlap.hasOverlap).toBe(true);
    expect(overlap.conflictingMandate?.id).toBe('m1');

    const noOverlapSimple = checkExclusiveMandateOverlap(existingMandates, {
      propertyId: 'prop_01',
      isExclusive: false,
      startDate: '2026-04-01',
      endDate: '2026-09-30',
      status: 'Active',
    });
    expect(noOverlapSimple.hasOverlap).toBe(false);

    expect(evaluateMandateExpiryStatus({ endDate: '2026-05-01', status: 'Active' }, '2026-05-10').derivedStatus).toBe('Expired');
    expect(evaluateMandateExpiryStatus({ endDate: '2026-05-25', status: 'Active' }, '2026-05-10').derivedStatus).toBe('Expiring');
    expect(evaluateMandateExpiryStatus({ endDate: '2026-08-01', status: 'Active' }, '2026-05-10').derivedStatus).toBe('Active');

    const badSplit = computeAgentCommissionSplit({
      grossCommissionDzd: 100000,
      primarySplitBps: 6000,
      secondarySplitBps: 3000,
      hasSecondaryAgent: true,
    });
    expect(badSplit.valid).toBe(false);

    const goodSplit = computeAgentCommissionSplit({
      grossCommissionDzd: 100000,
      primarySplitBps: 6500,
      secondarySplitBps: 3500,
      hasSecondaryAgent: true,
    });
    expect(goodSplit.valid).toBe(true);
    expect(goodSplit.primaryShareDzd).toBe(65000);
    expect(goodSplit.secondaryShareDzd).toBe(35000);
  });

  it('handles partial rent payments with Art. 317 cash timbre, genuine lease renewal, and date-guarded rent indexation', () => {
    const p1 = allocatePartialRentPayment({
      amountDueDzd: 180000,
      previouslyPaidDzd: 0,
      previousSeq: 0,
      paymentAmountDzd: 100000,
      paymentMethod: 'Cash',
    });
    expect(p1.ok).toBe(true);
    expect(p1.paymentStatus).toBe('Partial');
    expect(p1.remainingDueDzd).toBe(80000);
    expect(p1.timbreFiscalDzd).toBeGreaterThan(0);

    const p2 = allocatePartialRentPayment({
      amountDueDzd: 180000,
      previouslyPaidDzd: p1.totalPaidDzd,
      previousSeq: p1.partialPaymentSeq,
      paymentAmountDzd: 80000,
      paymentMethod: 'BaridiMob',
    });
    expect(p2.ok).toBe(true);
    expect(p2.paymentStatus).toBe('Paid');
    expect(p2.remainingDueDzd).toBe(0);
    expect(p2.timbreFiscalDzd).toBe(0);

    const lease: RealEstateLease = {
      ...INITIAL_LEASES[0],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRentDzd: 180000,
      renewalCount: 0,
      indexationFrequency: 'Annual',
      indexationRatePercent: 5,
      nextIndexationDate: '2027-01-01',
    };
    const renewed = renewLeaseContract(lease, 12);
    expect(renewed.status).toBe('Active');
    expect(renewed.endDate).toBe('2027-12-31');
    expect(renewed.renewalCount).toBe(1);

    const earlyIdx = applyLeaseIndexation(lease, 5, '2026-11-28');
    expect(earlyIdx.ok).toBe(false);
    expect(earlyIdx.errorCode).toBe('RE_INDEXATION_DATE_NOT_REACHED');

    const dueIdx = applyLeaseIndexation(lease, 5, '2027-01-01', 'IRL Annuel');
    expect(dueIdx.ok).toBe(true);
    expect(dueIdx.updatedLease?.monthlyRentDzd).toBe(189000);
    expect(dueIdx.updatedLease?.indexationHistory).toHaveLength(1);
  });

  it('enforces honest GPS states (never 36.7538/3.0588 fallback) and rejects missing BonDeVisite GPS fabrication', () => {
    const unavailable = normalizeVisitGpsState({});
    expect(unavailable.gpsStatus).toBe('unavailable');
    expect(unavailable.gpsLatitude).toBeUndefined();
    expect(formatVisitGpsLabel(unavailable, 'fr')).toBe('GPS indisponible');

    const denied = normalizeVisitGpsState({ errorCode: 1 });
    expect(denied.gpsStatus).toBe('denied');
    expect(formatVisitGpsLabel(denied, 'fr')).toBe('GPS refusé');

    const modalHtml = renderToStaticMarkup(
      <BonDeVisiteModal
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        properties={INITIAL_PROPERTIES}
      />
    );
    expect(modalHtml).not.toContain('36.7538');
    expect(modalHtml).not.toContain('3.0588');
    expect(modalHtml).toContain('GPS indisponible');
  });

  it('enforces sale closing checklist, owner maintenance ledger debit, portal readiness, buyer WhatsApp matching, and all 4 trade-gap modes', () => {
    const deal: RealEstateSaleDeal = { ...INITIAL_SALE_DEALS[0], stage: 'Acte' };
    const blocked = transitionSaleDealStage(deal, 'Finalisé');
    expect(blocked.ok).toBe(false);
    expect(blocked.errorCode).toBe('RE_SALE_CLOSING_CHECKLIST_INCOMPLETE');

    const clearedDeal: RealEstateSaleDeal = {
      ...deal,
      closingChecklist: {
        livretFoncierVerified: true,
        certificatNegatifValid: true,
        quitusFiscalCleared: true,
        mainleveeBankCleared: true,
        notaryActSigned: true,
      },
    };
    const finalized = transitionSaleDealStage(clearedDeal, 'Finalisé', 19);
    expect(finalized.ok).toBe(true);
    expect(finalized.updatedDeal?.stage).toBe('Finalisé');

    const mTicket: RealEstateMaintenanceTicket = { ...INITIAL_MAINTENANCE_TICKETS[0], chargeTarget: 'Owner' };
    const debit = createMaintenanceOwnerDebitEntry(mTicket);
    expect(debit?.entryType).toBe('MaintenanceDebit');
    expect(debit?.amountDzd).toBe(26500);

    const propWithPhoto: RealEstateProperty = {
      ...INITIAL_PROPERTIES[0],
      featuredPhotoUrl: 'https://cdn.example.com/prop_01.jpg',
      portalSync: { ouedkniss: true, lkeria: true },
    };
    const readiness = evaluatePortalReadiness(propWithPhoto);
    expect(readiness.ready).toBe(true);
    expect(readiness.score).toBe(100);
    expect(readiness.activePortals).toEqual(['Ouedkniss', 'Lkeria']);

    const matches = buildBuyerMatchAlerts(propWithPhoto, INITIAL_BUYERS as BuyerDemandProfile[], 40);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].whatsappHref).toContain('https://wa.me/');

    const syndic = allocateSyndicFundCallByTantiemes(100000, [
      { lotNumber: 'A1', ownerName: 'Owner 1', tantiemes: 333 },
      { lotNumber: 'A2', ownerName: 'Owner 2', tantiemes: 333 },
      { lotNumber: 'A3', ownerName: 'Owner 3', tantiemes: 334 },
    ]);
    const totalAllocated = syndic.allocations.reduce((s, a) => s + a.amountCentimes, 0);
    expect(totalAllocated).toBe(10000000);
    expect(evaluateSyndicAssemblyQuorum(510, 0, 1000, 'AGO').quorumReached).toBe(true);
    expect(evaluateSyndicAssemblyQuorum(600, 0, 1000, 'AGE').quorumReached).toBe(false);

    const badVefa = validateVefaMilestones(
      [
        { code: 'RESERVATION', label: 'Rés', percentBps: 2000, amountDzd: 0, status: 'Pending' },
        { code: 'LIVRAISON', label: 'Liv', percentBps: 5000, amountDzd: 0, status: 'Pending' },
      ],
      10000000
    );
    expect(badVefa.valid).toBe(false);

    const goodVefa = validateVefaMilestones(
      [
        { code: 'RESERVATION', label: 'Rés', percentBps: 2000, amountDzd: 0, status: 'Pending' },
        { code: 'GROS_OEUVRE', label: 'GO', percentBps: 5000, amountDzd: 0, status: 'Pending' },
        { code: 'LIVRAISON', label: 'Liv', percentBps: 3000, amountDzd: 0, status: 'Pending' },
      ],
      10000000
    );
    expect(goodVefa.valid).toBe(true);

    const stays: VacationRentalStay[] = [
      {
        id: 'stay_1',
        accountId: 'acc_01',
        businessId: 'biz_realestate',
        branchId: 'branch_realestate_main',
        staffId: 'staff_01',
        stayCode: 'STAY-2026-00001',
        propertyId: 'prop_01',
        propertyTitle: 'Villa',
        guestName: 'Karim',
        guestPhone: '0550112233',
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-15',
        nightsCount: 5,
        nightlyRateDzd: 15000,
        cleaningFeeDzd: 3000,
        totalAmountDzd: 78000,
        depositDzd: 20000,
        cleaningStatus: 'CleanReady',
        status: 'Confirmed',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
      },
    ];
    expect(
      checkVacationStayOverlap(stays, {
        propertyId: 'prop_01',
        checkInDate: '2026-07-14',
        checkOutDate: '2026-07-18',
      }).ok
    ).toBe(false);
    expect(
      checkVacationStayOverlap(stays, {
        propertyId: 'prop_01',
        checkInDate: '2026-07-15',
        checkOutDate: '2026-07-20',
      }).ok
    ).toBe(true);
  });

  it('bridges agent commission splits into payroll runs, posts 6.1-6.4 unified documents/payments/SCF entries & triggers rent reminders', () => {
    const actions = getActions();
    let state = getGlobalState();
    const activeBranch = selectCurrentBranchFromState(state)!;
    let staff = selectCurrentStaffFromState(state);
    if (staff.length === 0) {
      actions.createStaffMember({
        fullName: 'Yacine Mansouri',
        email: 'yacine@immo-dz.com',
        phoneNumber: '+213550112233',
        role: 'negociateur',
        roleRank: 2,
        isActive: true,
        status: 'active',
        hireDate: '2026-01-05',
        salary: 70000,
        paymentDay: 28,
        allowedModules: ['home', 'directory', 'registrations'],
      });
      state = getGlobalState();
      staff = selectCurrentStaffFromState(state);
    }
    expect(staff.length).toBeGreaterThan(0);
    const agent = staff[0];

    const commRecord: RealEstateAgentCommission = {
      id: 'recomm_test_1',
      accountId: activeBranch.accountId,
      businessId: activeBranch.businessId,
      branchId: activeBranch.id,
      agentStaffId: agent.id,
      agentName: agent.fullName,
      roleType: 'primary',
      sourceType: 'SaleDeal',
      sourceId: 'deal_01',
      referenceNumber: 'DEAL-2026-00001',
      periodMonth: '2026-11',
      grossCommissionCentimes: 20000000,
      splitBps: 5000,
      agentShareCentimes: 10000000,
      agentShareDzd: 100000,
      status: 'pending',
      createdAt: '2026-11-28T10:00:00Z',
      updatedAt: '2026-11-28T10:00:00Z',
    };
    actions.recordRealEstateAgentCommission(commRecord);
    const posted = actions.postRealEstateCommissionsToPayroll([commRecord.id]);
    expect(posted).toHaveLength(1);
    expect(posted[0].status).toBe('posted_to_payroll');

    const payrollAgg = aggregateRealEstatePayrollCommissions(
      selectCurrentRealEstateAgentCommissionsFromState(getGlobalState()),
      agent.id
    );
    expect(payrollAgg.totalDzd).toBe(100000);

    const run = actions.generateStaffPayrollRun(11, 2026, 'real_estate');
    expect(run).toBeTruthy();
    const slip = (getGlobalState().staffPayrollSlips || []).find(
      (s) => s.payrollRunId === run?.id && s.staffId === agent.id
    );
    expect(slip).toBeTruthy();
    expect(slip!.primesCotisables.some((p) => p.amount === 100000)).toBe(true);

    const party = actions.ensurePartyForEntity({
      sourceVertical: 'real_estate',
      entityType: 'owner',
      entityId: 'prop_01_owner',
      displayName: 'Kamel Boumaza',
      phone: '0550112233',
    });
    expect(party.party.id).toBeTruthy();

    const doc = actions.createUnifiedDocument({
      docType: 'facture',
      sourceVertical: 'real_estate',
      partyId: party.party.id,
      partyName: 'Kamel Boumaza',
      docDate: '2026-11-28',
      paymentMethod: 'bank_transfer',
      sourceEntityType: 're_owner_payout',
      sourceEntityId: 'lease_01',
      items: [{ description: 'Honoraires gestion', isService: true, quantity: 1, unitPriceHt: 18000, tvaPercent: 19 }],
      issueImmediately: true,
    });
    expect(selectCurrentUnifiedDocumentsFromState(getGlobalState()).some((d) => d.id === doc.id)).toBe(true);

    const payment = actions.recordUnifiedPayment({
      sourceVertical: 'real_estate',
      partyId: party.party.id,
      partyName: 'Kamel Boumaza',
      method: 'bank_transfer',
      direction: 'outflow',
      amountDzd: 162000,
      paymentDate: '2026-11-28',
      allocations: [{ documentId: doc.id, requestedDzd: 162000 }],
    });
    expect(payment).not.toBeNull();
    expect(selectCurrentUnifiedPaymentsFromState(getGlobalState()).some((p) => p.id === payment!.id)).toBe(true);

    const scf = buildRealEstateScfJournalDraft({
      reference: 'QTC-2026-00010',
      label: 'Loyer Hydra',
      grossCollectedDzd: 180000,
      agencyFeeHtDzd: 18000,
      agencyFeeTvaDzd: 3420,
      paymentMethod: 'Virement',
    });
    expect(scf.balanced).toBe(true);
    actions.postManualJournalEntry({
      journalCode: scf.journalCode,
      entryDate: '2026-11-28',
      pieceRef: 'QTC-2026-00010',
      libelle: 'Reversement bailleur Hydra',
      lines: scf.lines,
      sourceVertical: 'real_estate',
      sourceEventType: 'payment',
      sourceDocId: doc.id,
    });
    expect(selectCurrentJournalEntriesFromState(getGlobalState()).some((j) => j.pieceRef === 'QTC-2026-00010')).toBe(true);

    const reminderRes = actions.runReminderEngineScan({
      externalSources: {
        leases: INITIAL_LEASES,
        mandates: INITIAL_MANDATES,
      },
      showSummaryToast: false,
    });
    expect(reminderRes).toBeTruthy();

    // Verify 5.4/5.5 Real Estate route permissions untouched
    const negociateurRoutes = getAllowedRoutesForCategoryRole('real_estate', {
      activeRealEstateRole: 'negociateur',
      currentUser: { id: 'usr_re', role: 'negociateur', roleRank: 2 },
    });
    expect(negociateurRoutes.includes('finance')).toBe(false);
    expect(negociateurRoutes.includes('realestate_mandates')).toBe(true);
    expect(negociateurRoutes.includes('members')).toBe(true);
  });

  it('renders all 7.11 real_estate screens & modular panels via SSR cleanly without NaN or fabricated coordinates', () => {
    const html = [
      renderToStaticMarkup(<RealEstatePropertiesView />),
      renderToStaticMarkup(<RealEstateMandatesView />),
      renderToStaticMarkup(<RealEstateLeasesView />),
      renderToStaticMarkup(<RealEstateFinanceView />),
      renderToStaticMarkup(<RealEstateInspectionsView />),
      renderToStaticMarkup(<RealEstateStaffView />),
      renderToStaticMarkup(
        <RealEstateBuyerMatchPanel properties={INITIAL_PROPERTIES} buyers={INITIAL_BUYERS} onAddBuyer={() => {}} />
      ),
      renderToStaticMarkup(
        <RealEstateSalesPipelinePanel
          saleDeals={INITIAL_SALE_DEALS}
          properties={INITIAL_PROPERTIES}
          mandates={INITIAL_MANDATES}
          onAddSaleDeal={() => {}}
          onUpdateSaleDeal={() => {}}
          onAdvanceStage={() => ({ ok: true })}
        />
      ),
      renderToStaticMarkup(
        <RealEstateMaintenancePanel
          tickets={INITIAL_MAINTENANCE_TICKETS}
          properties={INITIAL_PROPERTIES}
          leases={INITIAL_LEASES}
          ownerLedger={INITIAL_OWNER_LEDGER}
          onAddTicket={() => {}}
          onUpdateTicket={() => {}}
        />
      ),
      renderToStaticMarkup(
        <RealEstateTradeModesPanel
          properties={INITIAL_PROPERTIES}
          syndicBuildings={[]}
          syndicFundCalls={[]}
          syndicAssemblies={[]}
          devPrograms={[]}
          devLots={[]}
          studentBeds={[]}
          vacationStays={[]}
          onAddSyndicBuilding={() => {}}
          onIssueSyndicFundCall={() => {}}
          onRecordSyndicAssembly={() => {}}
          onAddDevProgram={() => {}}
          onSaveDevLot={() => {}}
          onSaveStudentBed={() => {}}
          onSaveVacationStay={() => ({ ok: true })}
        />
      ),
    ].join('\n');

    expect(html.length).toBeGreaterThan(2500);
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('36.7538');
  });
});

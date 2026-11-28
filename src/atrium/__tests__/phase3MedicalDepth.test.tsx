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
  selectCurrentCrmPartiesFromState,
  selectCurrentJournalEntriesFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  aggregatePractitionerTurnovers,
  buildChifaBordereauBatch,
  buildChifaSettlementScfDraft,
  buildDoctorPayoutScfDraft,
  computeArretDeTravailSchedule,
  computeNgapFeeSplit,
  consumeConsumableFefo,
  evaluateAppointmentConflict,
  evaluateConsumableExpiryAlerts,
  evaluatePrescriptionAllergySafety,
  reconcileMedicalDailyCash,
  restockConsumableLot,
  validateClinicalVitalsBp,
} from '../../utils/medicalDepth';
import type {
  ChifaClaimRecord,
  ClinicConsumableItem,
  MedicalAppointmentSlot,
  MedicalChifaBordereau,
  MedicalConsultation,
  MedicalDoctorPayout,
  MedicalPatient,
  MedicalPractitioner,
} from '../../types';
import { MedicalDashboardView } from '../../components/screens/medical/MedicalDashboardView';
import { MedicalPatientsView } from '../../components/screens/medical/MedicalPatientsView';
import { MedicalQueueView } from '../../components/screens/medical/MedicalQueueView';
import { MedicalAgendaView } from '../../components/screens/medical/MedicalAgendaView';
import { MedicalPrescriptionsView } from '../../components/screens/medical/MedicalPrescriptionsView';
import { MedicalCertificatesView } from '../../components/screens/medical/MedicalCertificatesView';
import { MedicalBillingView } from '../../components/screens/medical/MedicalBillingView';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 3 Step 9 (7.9 medical_clinic) — Deep Vertical Integration', () => {
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
    const medicalBiz = getGlobalState().businesses.find((b) => b.category === 'medical_clinic');
    expect(medicalBiz).toBeTruthy();
    if (medicalBiz) {
      switchBusinessAction(medicalBiz.id);
    }
  });

  it('computes NGAP fee splits with 80% standard vs 100% ALD zero copay and validates clinical BP', () => {
    const stdCs = computeNgapFeeSplit({
      ngapCode: 'CS',
      hasChifa100PercentAld: false,
      isChifaInsured: true,
    });
    expect(stdCs.ngapCode).toBe('CS');
    expect(stdCs.totalFeeDzd).toBe(3500);
    expect(stdCs.insuranceShareDzd).toBe(2800);
    expect(stdCs.copayDzd).toBe(700);
    expect(stdCs.totalFeeCentimes).toBe(350000);

    const aldEcg = computeNgapFeeSplit({
      ngapCode: 'ECG',
      hasChifa100PercentAld: true,
    });
    expect(aldEcg.ngapCode).toBe('ECG');
    expect(aldEcg.totalFeeDzd).toBe(3000);
    expect(aldEcg.insuranceShareDzd).toBe(3000);
    expect(aldEcg.copayDzd).toBe(0);

    const invertedBp = validateClinicalVitalsBp('80/120');
    expect(invertedBp.isValid).toBe(false);
    expect(invertedBp.errorCode).toBe('MEDICAL_INVALID_BP_INVERTED');

    const malformedBp = validateClinicalVitalsBp('abc');
    expect(malformedBp.isValid).toBe(false);
    expect(malformedBp.errorCode).toBe('MEDICAL_INVALID_BP_FORMAT');

    const validBp = validateClinicalVitalsBp('125/80');
    expect(validBp.isValid).toBe(true);
    expect(validBp.systolic).toBe(125);
    expect(validBp.diastolic).toBe(80);
  });

  it('blocks overlapping doctor appointments and enforces justification on emergency bypass', () => {
    const existing: MedicalAppointmentSlot[] = [
      {
        id: 'apt_1',
        patientId: 'pat_1',
        patientName: 'Yacine Belkacemi',
        patientPhone: '0555123456',
        doctorId: 'doc_01',
        doctorName: 'Dr. Amine Benali',
        date: '2026-11-27',
        startTime: '09:00',
        durationMinutes: 30,
        reason: 'ECG Contrôle',
        status: 'Booked',
      },
    ];

    const overlap = evaluateAppointmentConflict({
      doctorId: 'doc_01',
      doctorName: 'Dr. Amine Benali',
      date: '2026-11-27',
      startTime: '09:15',
      durationMinutes: 30,
      existingAppointments: existing,
    });
    expect(overlap.ok).toBe(false);
    expect(overlap.errorCode).toBe('MEDICAL_APPOINTMENT_OVERLAP');

    const bypassNoReason = evaluateAppointmentConflict({
      doctorId: 'doc_01',
      doctorName: 'Dr. Amine Benali',
      date: '2026-11-27',
      startTime: '09:15',
      durationMinutes: 30,
      existingAppointments: existing,
      isEmergencyBypass: true,
      emergencyBypassReason: '   ',
    });
    expect(bypassNoReason.ok).toBe(false);
    expect(bypassNoReason.errorCode).toBe('MEDICAL_BYPASS_REASON_REQUIRED');

    const bypassValid = evaluateAppointmentConflict({
      doctorId: 'doc_01',
      doctorName: 'Dr. Amine Benali',
      date: '2026-11-27',
      startTime: '09:15',
      durationMinutes: 30,
      existingAppointments: existing,
      isEmergencyBypass: true,
      emergencyBypassReason: 'Douleur thoracique aiguë — ECG prioritaire',
    });
    expect(bypassValid.ok).toBe(true);
    expect(bypassValid.conflictingSlot?.id).toBe('apt_1');
  });

  it('enforces FEFO lot depletion, rejects expired batches, and tracks expiry alerts on restock', () => {
    const supply: ClinicConsumableItem = {
      id: 'con_gloves',
      itemCode: 'CON_01',
      name: "Gants d'examen stériles",
      category: 'Hygiène & Protection',
      unit: 'boîte',
      currentStock: 12,
      currentStockUnits: 12,
      minStockAlert: 5,
      unitCostDzd: 450,
      lots: [
        { lotNumber: 'LOT-OLD-EXP', expiryDate: '2026-01-01', quantity: 5 },
        { lotNumber: 'LOT-FEFO-1', expiryDate: '2026-12-20', quantity: 3 },
        { lotNumber: 'LOT-FEFO-2', expiryDate: '2027-06-15', quantity: 4 },
      ],
    };

    const expiredOnly: ClinicConsumableItem = {
      ...supply,
      currentStock: 5,
      currentStockUnits: 5,
      lots: [{ lotNumber: 'LOT-OLD-EXP', expiryDate: '2026-01-01', quantity: 5 }],
    };
    const blocked = consumeConsumableFefo({
      item: expiredOnly,
      quantity: 1,
      referenceDate: '2026-11-27',
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.errorCode).toBe('MEDICAL_BATCH_EXPIRED');

    // Should skip expired LOT-OLD-EXP and pull 3 from LOT-FEFO-1 + 1 from LOT-FEFO-2
    const consumed = consumeConsumableFefo({
      item: supply,
      quantity: 4,
      referenceDate: '2026-11-27',
    });
    expect(consumed.ok).toBe(true);
    expect(consumed.deductedLots).toEqual([
      { lotNumber: 'LOT-FEFO-1', qty: 3, expiryDate: '2026-12-20' },
      { lotNumber: 'LOT-FEFO-2', qty: 1, expiryDate: '2027-06-15' },
    ]);
    expect(consumed.updatedItem?.currentStock).toBe(8);

    const restocked = restockConsumableLot({
      item: consumed.updatedItem!,
      quantity: 20,
      lotNumber: 'LOT-NEW-27',
      expiryDate: '2028-03-01',
    });
    expect(restocked.currentStock).toBe(28);

    const alertSummary = evaluateConsumableExpiryAlerts(restocked, '2026-11-27');
    expect(alertSummary.expiredStockUnits).toBe(5);
    expect(alertSummary.validStockUnits).toBe(23);
  });

  it('batches Chifa claims, settles CNAS reimbursement into SCF 512000/411000, and pays practitioner splits into 631000/512000', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const state = getGlobalState();

    const claims: ChifaClaimRecord[] = [
      {
        id: 'ch_1',
        claimNumber: 'CHF-2026-001',
        patientId: 'pat_1',
        patientName: 'Meriem Haddad',
        chifaNumber: 'CHIFA-16-951120-02',
        consultationId: 'cons_1',
        ngapCode: 'CS',
        totalAmountDzd: 3500,
        cnasShareDzd: 3500,
        ticketModerateurDzd: 0,
        isTransmitted: false,
        status: 'Draft',
      },
      {
        id: 'ch_2',
        claimNumber: 'CHF-2026-002',
        patientId: 'pat_2',
        patientName: 'Yacine Belkacemi',
        chifaNumber: 'CHIFA-16-880614-01',
        consultationId: 'cons_2',
        ngapCode: 'ECG',
        totalAmountDzd: 3000,
        cnasShareDzd: 2400,
        ticketModerateurDzd: 600,
        isTransmitted: false,
        status: 'ReadyForSubmission',
      },
    ];

    const batch = buildChifaBordereauBatch({
      accountId: state.account.id,
      businessId: state.currentBusinessId,
      branchId: state.currentBranchId,
      claims,
      periodMonth: '2026-11',
      cnasCenterCode: '16-CNAS-ALGER',
      transmitted: true,
    });
    expect(batch.ok).toBe(true);
    expect(batch.bordereau?.claimsCount).toBe(2);
    expect(batch.bordereau?.totalFeeCentimes).toBe(650000);
    expect(batch.bordereau?.totalCnasCentimes).toBe(590000);

    const bordereau = batch.bordereau!;
    const settleDraft = buildChifaSettlementScfDraft({
      bordereau,
      settlementDate: '2026-11-27',
      settlementReference: 'VIR-CNAS-001',
    });
    const settlePosted = actions.postManualJournalEntry({ ...settleDraft, silentSuccessToast: true });
    expect(settlePosted.ok).toBe(true);
    expect(settlePosted.entry?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountCode: '512000', debitCentimes: 590000, creditCentimes: 0 }),
        expect.objectContaining({ accountCode: '411000', debitCentimes: 0, creditCentimes: 590000 }),
      ])
    );

    const practitioner: MedicalPractitioner = {
      id: 'doc_01',
      fullName: 'Dr. Amine Benali',
      specialty: 'Cardiologie',
      department: 'Médecine Spécialisée',
      licenseNumber: 'OM-16-04921',
      roomNumber: 'Cabinet 1',
      phone: '0550112233',
      commissionRatePercent: 70,
      color: '#0D9488',
      isAvailable: true,
    };
    const consultations: MedicalConsultation[] = [
      {
        id: 'cons_1',
        accountId: state.account.id,
        businessId: state.currentBusinessId,
        branchId: state.currentBranchId,
        patientId: 'pat_1',
        patientName: 'Meriem Haddad',
        staffId: 'doc_01',
        doctorName: 'Dr. Amine Benali',
        consultationDate: '2026-11-27',
        chiefComplaint: 'Suivi Cardiologie ALD',
        diagnosis: 'HTA stabilisée',
        ngapCode: 'CS',
        consultationFeeDzd: 3500,
        insuranceShareDzd: 3500,
        copayAmountDzd: 0,
        isPaid: true,
        paymentMethod: 'ChifaDirect',
        status: 'Completed',
        createdAt: '2026-11-27T09:00:00Z',
      },
      {
        id: 'cons_2',
        accountId: state.account.id,
        businessId: state.currentBusinessId,
        branchId: state.currentBranchId,
        patientId: 'pat_2',
        patientName: 'Yacine Belkacemi',
        staffId: 'doc_01',
        doctorName: 'Dr. Amine Benali',
        consultationDate: '2026-11-27',
        chiefComplaint: 'ECG 12 dérivations',
        diagnosis: 'Rythme sinusal normal',
        ngapCode: 'ECG',
        consultationFeeDzd: 3000,
        insuranceShareDzd: 2400,
        copayAmountDzd: 600,
        isPaid: true,
        paymentMethod: 'Cash',
        status: 'Completed',
        createdAt: '2026-11-27T10:00:00Z',
      },
    ];

    const [summary] = aggregatePractitionerTurnovers({
      practitioners: [practitioner],
      consultations,
      payouts: [],
      periodMonth: '2026-11',
    });
    expect(summary.grossTurnoverCentimes).toBe(650000);
    expect(summary.doctorPayoutCentimes).toBe(455000); // 70% of 6,500 DZD = 4,550 DZD
    expect(summary.polyclinicShareCentimes).toBe(195000);

    const payout: MedicalDoctorPayout = {
      id: 'pay_1',
      accountId: state.account.id,
      businessId: state.currentBusinessId,
      branchId: state.currentBranchId,
      practitionerId: practitioner.id,
      practitionerRef: practitioner.id,
      practitionerName: practitioner.fullName,
      periodMonth: '2026-11',
      consultationsCount: 2,
      grossTurnoverCentimes: summary.grossTurnoverCentimes,
      commissionRateBps: 7000,
      doctorPayoutCentimes: summary.pendingPayoutCentimes,
      polyclinicShareCentimes: summary.polyclinicShareCentimes,
      status: 'issued',
      issuedAt: '2026-11-27T12:00:00Z',
    };
    const payoutDraft = buildDoctorPayoutScfDraft({ payout, paymentMethod: 'bank_transfer' });
    const payoutPosted = actions.postManualJournalEntry({ ...payoutDraft, silentSuccessToast: true });
    expect(payoutPosted.ok).toBe(true);
    expect(
      selectCurrentJournalEntriesFromState(getGlobalState()).some(
        (e) => e.id === payoutPosted.entry?.id && e.totalDebitCentimes === 455000
      )
    ).toBe(true);

    // Confirm remaining balance becomes 0 after payout is included
    const [afterPayout] = aggregatePractitionerTurnovers({
      practitioners: [practitioner],
      consultations,
      payouts: [payout],
      periodMonth: '2026-11',
    });
    expect(afterPayout.pendingPayoutCentimes).toBe(0);
  });

  it('reconciles daily cash including 0 DZD ALD copay, computes Arrêt de Travail resumption across weekends, and guards drug allergies', () => {
    const consultations: MedicalConsultation[] = [
      {
        id: 'c_ald',
        accountId: 'acc_test',
        businessId: 'biz_med',
        branchId: 'br_med',
        patientId: 'p1',
        patientName: 'Patient ALD',
        staffId: 'doc_01',
        consultationDate: '2026-11-27',
        chiefComplaint: 'ALD',
        diagnosis: 'Stable',
        ngapCode: 'CS',
        consultationFeeDzd: 3500,
        insuranceShareDzd: 3500,
        copayAmountDzd: 0, // Must NOT fall back to 600 DZD
        isPaid: true,
        paymentMethod: 'ChifaDirect',
        status: 'Completed',
        createdAt: '2026-11-27T09:00:00Z',
      },
      {
        id: 'c_cash',
        accountId: 'acc_test',
        businessId: 'biz_med',
        branchId: 'br_med',
        patientId: 'p2',
        patientName: 'Patient Cash',
        staffId: 'doc_01',
        consultationDate: '2026-11-27',
        chiefComplaint: 'Visite',
        diagnosis: 'OK',
        ngapCode: 'C',
        consultationFeeDzd: 2500,
        insuranceShareDzd: 2000,
        copayAmountDzd: 500,
        isPaid: true,
        paymentMethod: 'Cash',
        status: 'Completed',
        createdAt: '2026-11-27T10:00:00Z',
      },
      {
        id: 'c_bmob',
        accountId: 'acc_test',
        businessId: 'biz_med',
        branchId: 'br_med',
        patientId: 'p3',
        patientName: 'Patient BaridiMob',
        staffId: 'doc_02',
        consultationDate: '2026-11-27',
        chiefComplaint: 'Visite',
        diagnosis: 'OK',
        ngapCode: 'CS',
        consultationFeeDzd: 3500,
        insuranceShareDzd: 2800,
        copayAmountDzd: 700,
        isPaid: true,
        paymentMethod: 'BaridiMob',
        status: 'Completed',
        createdAt: '2026-11-27T11:00:00Z',
      },
    ];
    const cash = reconcileMedicalDailyCash({
      targetDate: '2026-11-27',
      consultations,
      countedCashDzd: 400,
    });
    expect(cash.expectedCashDzd).toBe(500);
    expect(cash.totalBaridiMobCentimes).toBe(70000);
    expect(cash.totalChifaVouchersCentimes).toBe(830000);
    expect(cash.discrepancyDzd).toBe(-100);
    expect(cash.status).toBe('variance_flagged');

    // Start 2026-11-26 (Thu) for 2 days -> Thu 26 & Fri 27; next day is Sat 28 -> shifts to Sun 2026-11-29
    const sched = computeArretDeTravailSchedule('2026-11-26', '2026-11-27');
    expect(sched.ok).toBe(true);
    expect(sched.durationDays).toBe(2);
    expect(sched.resumptionDate).toBe('2026-11-29');

    const longLeave = computeArretDeTravailSchedule('2026-11-01', '2026-12-05');
    expect(longLeave.ok).toBe(true);
    expect(longLeave.requiresCnasControlCommission).toBe(true);

    const invertedLeave = computeArretDeTravailSchedule('2026-11-28', '2026-11-25');
    expect(invertedLeave.ok).toBe(false);

    // Allergy cross-reactivity & mandatory override reason
    const allergyBlocked = evaluatePrescriptionAllergySafety({
      patientAllergies: ['Pénicilline'],
      items: [
        { drugName: 'Augmentin 1g', dosage: '1 sachet', frequency: '2x/j', durationDays: 7 },
        { drugName: 'Augmentin 1g', dosage: '1 sachet', frequency: '2x/j', durationDays: 7 },
      ],
      overrideConfirmed: true,
      overrideReason: '   ',
    });
    expect(allergyBlocked.ok).toBe(false);
    expect(allergyBlocked.alerts.length).toBeGreaterThan(0);
    expect(allergyBlocked.warnings.length).toBeGreaterThan(0);
    expect(allergyBlocked.errorCode).toBe('MEDICAL_ALLERGY_REASON_REQUIRED');

    const allergyOverridden = evaluatePrescriptionAllergySafety({
      patientAllergies: ['Pénicilline'],
      items: [{ drugName: 'Augmentin 1g', dosage: '1 sachet', frequency: '2x/j', durationDays: 7 }],
      overrideConfirmed: true,
      overrideReason: 'Test cutané négatif validé par le chef de service',
    });
    expect(allergyOverridden.ok).toBe(true);
  });

  it('links medical patients to Unified CRM Party registry and renders all 7 medical views via SSR', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const state = getGlobalState();

    const patient: MedicalPatient = {
      id: 'pat_ssr_01',
      accountId: state.account.id,
      businessId: state.currentBusinessId,
      branchId: state.currentBranchId,
      staffId: 'doc_01',
      fullName: 'Meriem Haddad',
      nationalId: '19951604005678',
      phone: '0661 45 78 90',
      gender: 'Female',
      dateOfBirth: '1995-11-20',
      bloodGroup: 'A+',
      allergies: ['Pénicilline'],
      chronicConditions: ['Diabète Type 2'],
      chifaCardNumber: 'CHIFA-16-951120-02',
      socialSecurityNumber: '951604005678 44',
      hasChifa100PercentAld: true,
      createdAt: '2026-11-27T09:00:00Z',
    };

    const crmRes = actions.ensurePartyForEntity({
      sourceVertical: 'medical_clinic',
      entityType: 'patient',
      entityId: patient.id,
      partyKind: 'person',
      displayName: patient.fullName,
      phone: patient.phone,
    });
    expect(crmRes.party.displayName).toBe('Meriem Haddad');
    expect(
      selectCurrentCrmPartiesFromState(getGlobalState()).some((p) => p.id === crmRes.party.id)
    ).toBe(true);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('atrium_medical_patients_v2', JSON.stringify([patient]));
      const bordereau: MedicalChifaBordereau = {
        id: 'brd_ssr_1',
        accountId: state.account.id,
        businessId: state.currentBusinessId,
        branchId: state.currentBranchId,
        bordereauNumber: 'BRD-202611-01',
        periodMonth: '2026-11',
        cnasCenterCode: '16-CNAS',
        claimsCount: 1,
        claimIds: ['ch_ssr_1'],
        totalFeeCentimes: 350000,
        totalCnasCentimes: 350000,
        totalCopayCentimes: 0,
        status: 'Transmitted',
        transmittedAt: '2026-11-27T10:00:00Z',
      };
      localStorage.setItem('atrium_medical_bordereaux_v2', JSON.stringify([bordereau]));
    }

    const htmls = [
      renderToStaticMarkup(<MedicalDashboardView />),
      renderToStaticMarkup(<MedicalPatientsView />),
      renderToStaticMarkup(<MedicalQueueView />),
      renderToStaticMarkup(<MedicalAgendaView />),
      renderToStaticMarkup(<MedicalPrescriptionsView />),
      renderToStaticMarkup(<MedicalCertificatesView />),
      renderToStaticMarkup(<MedicalBillingView />),
    ];

    for (const html of htmls) {
      expect(html.length).toBeGreaterThan(150);
      expect(html).not.toContain('feature_not_available_phase2');
    }
  });
});

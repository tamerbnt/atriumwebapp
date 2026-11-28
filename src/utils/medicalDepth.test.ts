import test from 'node:test';
import assert from 'node:assert/strict';
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
} from './medicalDepth';
import type {
  ChifaClaimRecord,
  ClinicConsumableItem,
  MedicalAppointmentSlot,
  MedicalConsultation,
  MedicalDoctorPayout,
  MedicalPractitioner,
} from '../types';

test('computeNgapFeeSplit computes exact 100% ALD and 80% standard integer centime splits', () => {
  const aldSplit = computeNgapFeeSplit({
    ngapCode: 'CS',
    hasChifa100PercentAld: true,
  });
  assert.equal(aldSplit.totalFeeDzd, 3500);
  assert.equal(aldSplit.copayDzd, 0);
  assert.equal(aldSplit.insuranceShareDzd, 3500);
  assert.equal(aldSplit.coveragePercent, 100);

  const stdSplit = computeNgapFeeSplit({
    ngapCode: 'CS',
    hasChifa100PercentAld: false,
    isChifaInsured: true,
  });
  assert.equal(stdSplit.totalFeeDzd, 3500);
  assert.equal(stdSplit.copayDzd, 700);
  assert.equal(stdSplit.insuranceShareDzd, 2800);
  assert.equal(stdSplit.coveragePercent, 80);
});

test('validateClinicalVitalsBp rejects inverted or malformed blood pressure values', () => {
  assert.equal(validateClinicalVitalsBp('120/80').isValid, true);
  const inverted = validateClinicalVitalsBp('80/120');
  assert.equal(inverted.isValid, false);
  assert.equal(inverted.errorCode, 'MEDICAL_INVALID_BP_INVERTED');

  const malformed = validateClinicalVitalsBp('120');
  assert.equal(malformed.isValid, false);
  assert.equal(malformed.errorCode, 'MEDICAL_INVALID_BP_FORMAT');
});

test('computeArretDeTravailSchedule rejects inverted range and skips Algerian Fri/Sat weekend', () => {
  const invalid = computeArretDeTravailSchedule('2026-05-15', '2026-05-10');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errorCode, 'MEDICAL_INVALID_CERT_RANGE');

  // 2026-05-14 is Thursday -> next day is Friday -> skips to Sunday 2026-05-17
  const thuEnd = computeArretDeTravailSchedule('2026-05-10', '2026-05-14');
  assert.equal(thuEnd.ok, true);
  assert.equal(thuEnd.durationDays, 5);
  assert.equal(thuEnd.resumptionDate, '2026-05-17');
  assert.equal(thuEnd.requiresCnasControlCommission, false);

  const longLeave = computeArretDeTravailSchedule('2026-05-01', '2026-06-05');
  assert.equal(longLeave.ok, true);
  assert.equal(longLeave.requiresCnasControlCommission, true);
});

test('evaluatePrescriptionAllergySafety enforces cross-reactivity detection and clinical override reason', () => {
  const blocked = evaluatePrescriptionAllergySafety({
    patientAllergies: ['Pénicilline'],
    items: [
      {
        drugName: 'Augmentin 1g',
        dosage: '1 sachet',
        frequency: '2 fois par jour',
        durationDays: 7,
      },
    ],
    overrideConfirmed: false,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.errorCode, 'MEDICAL_ALLERGY_OVERRIDE_REQUIRED');
  assert.equal(blocked.alerts.length, 1);

  const missingReason = evaluatePrescriptionAllergySafety({
    patientAllergies: ['Pénicilline'],
    items: [
      {
        drugName: 'Augmentin 1g',
        dosage: '1 sachet',
        frequency: '2 fois par jour',
        durationDays: 7,
      },
    ],
    overrideConfirmed: true,
    overrideReason: '   ',
  });
  assert.equal(missingReason.ok, false);
  assert.equal(missingReason.errorCode, 'MEDICAL_ALLERGY_REASON_REQUIRED');

  const allowed = evaluatePrescriptionAllergySafety({
    patientAllergies: ['Pénicilline'],
    items: [
      {
        drugName: 'Augmentin 1g',
        dosage: '1 sachet',
        frequency: '2 fois par jour',
        durationDays: 7,
      },
    ],
    overrideConfirmed: true,
    overrideReason: 'Test tolérance négatif validé par cardiologue',
  });
  assert.equal(allowed.ok, true);
});

test('evaluateAppointmentConflict blocks overlapping slot unless emergency bypass has reason', () => {
  const existing: MedicalAppointmentSlot[] = [
    {
      id: 'apt_1',
      doctorId: 'doc_01',
      doctorName: 'Dr. Amine Benali',
      patientName: 'Yacine',
      date: '2026-05-12',
      startTime: '09:00',
      durationMinutes: 30,
      reason: 'Suivi',
      status: 'Booked',
    },
  ];

  const overlap = evaluateAppointmentConflict({
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    date: '2026-05-12',
    startTime: '09:15',
    durationMinutes: 30,
    existingAppointments: existing,
    isEmergencyBypass: false,
  });
  assert.equal(overlap.ok, false);
  assert.equal(overlap.errorCode, 'MEDICAL_APPOINTMENT_OVERLAP');

  const adjacent = evaluateAppointmentConflict({
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    date: '2026-05-12',
    startTime: '09:30',
    durationMinutes: 30,
    existingAppointments: existing,
  });
  assert.equal(adjacent.ok, true);

  const bypassOk = evaluateAppointmentConflict({
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    date: '2026-05-12',
    startTime: '09:15',
    durationMinutes: 15,
    existingAppointments: existing,
    isEmergencyBypass: true,
    emergencyBypassReason: 'Douleur thoracique aiguë',
  });
  assert.equal(bypassOk.ok, true);
});

test('consumeConsumableFefo blocks expired batches and depletes earliest valid lot first', () => {
  const item: ClinicConsumableItem = {
    id: 'c_01',
    itemCode: 'CON_02',
    name: 'Seringues stériles 5ml',
    category: 'Injection',
    currentStock: 20,
    currentStockUnits: 20,
    minStockAlert: 5,
    unit: 'Unités',
    unitCostDzd: 25,
    lots: [
      { lotNumber: 'LOT-OLD', expiryDate: '2026-01-01', quantity: 10 },
      { lotNumber: 'LOT-MAY', expiryDate: '2026-05-20', quantity: 4 },
      { lotNumber: 'LOT-DEC', expiryDate: '2026-12-31', quantity: 6 },
    ],
  };

  const alerts = evaluateConsumableExpiryAlerts(item, '2026-05-10');
  assert.equal(alerts.expiredStockUnits, 10);
  assert.equal(alerts.validStockUnits, 10);
  assert.equal(alerts.expiringSoonLots.length, 1);

  // Requesting 12 fails because only 10 unexpired units exist
  const tooMuch = consumeConsumableFefo({ item, quantity: 12, referenceDate: '2026-05-10' });
  assert.equal(tooMuch.ok, false);
  assert.equal(tooMuch.errorCode, 'MEDICAL_INSUFFICIENT_UNEXPIRED_STOCK');

  // Requesting 7 takes all 4 from LOT-MAY and 3 from LOT-DEC, never touching LOT-OLD
  const consumed = consumeConsumableFefo({ item, quantity: 7, referenceDate: '2026-05-10' });
  assert.equal(consumed.ok, true);
  assert.deepEqual(
    consumed.deductedLots?.map((d) => ({ lotNumber: d.lotNumber, qty: d.qty })),
    [
      { lotNumber: 'LOT-MAY', qty: 4 },
      { lotNumber: 'LOT-DEC', qty: 3 },
    ]
  );

  const restocked = restockConsumableLot({
    item: consumed.updatedItem!,
    quantity: 15,
    lotNumber: 'LOT-2027',
    expiryDate: '2027-03-01',
  });
  assert.equal(restocked.currentStock, 28); // 10 expired + 3 dec + 15 new
});

test('aggregatePractitionerTurnovers, CHIFA settlement SCF draft, and cash drawer reconciliation are exact in centimes', () => {
  const docs: MedicalPractitioner[] = [
    {
      id: 'doc_01',
      fullName: 'Dr. Amine Benali',
      specialty: 'Cardiologie',
      department: 'Médecine Spécialisée',
      licenseNumber: 'OM-1',
      roomNumber: 'Cab 1',
      phone: '0550',
      commissionRatePercent: 75,
      color: '#0D9488',
      isAvailable: true,
    },
  ];
  const consults: MedicalConsultation[] = [
    {
      id: 'cons_1',
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      staffId: 'doc_01',
      doctorName: 'Dr. Amine Benali',
      patientId: 'p1',
      patientName: 'Patient ALD',
      consultationDate: '2026-05-10',
      chiefComplaint: 'ECG',
      diagnosis: 'OK',
      status: 'Completed',
      consultationFeeDzd: 4000,
      copayAmountDzd: 0, // 100% ALD must stay 0 cash expected!
      insuranceShareDzd: 4000,
      isPaid: true,
      paymentMethod: 'ChifaDirect',
      createdAt: '2026-05-10T09:00:00Z',
    },
    {
      id: 'cons_2',
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      staffId: 'doc_01',
      doctorName: 'Dr. Amine Benali',
      patientId: 'p2',
      patientName: 'Patient Cash',
      consultationDate: '2026-05-10',
      chiefComplaint: 'Visite',
      diagnosis: 'OK',
      status: 'Completed',
      consultationFeeDzd: 3500,
      copayAmountDzd: 700,
      insuranceShareDzd: 2800,
      isPaid: true,
      paymentMethod: 'Cash',
      createdAt: '2026-05-10T10:00:00Z',
    },
    {
      id: 'cons_3',
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      staffId: 'doc_01',
      doctorName: 'Dr. Amine Benali',
      patientId: 'p3',
      patientName: 'Patient BaridiMob',
      consultationDate: '2026-05-10',
      chiefComplaint: 'Visite',
      diagnosis: 'OK',
      status: 'Completed',
      consultationFeeDzd: 2500,
      copayAmountDzd: 500,
      insuranceShareDzd: 2000,
      isPaid: true,
      paymentMethod: 'BaridiMob',
      createdAt: '2026-05-10T11:00:00Z',
    },
  ];

  // Cash expected must ONLY include cons_2's 700 DZD cash copay (NOT ALD 0, NOT BaridiMob 500)
  const cashRec = reconcileMedicalDailyCash({
    consultations: consults,
    targetDate: '2026-05-10',
    countedCashDzd: 700,
  });
  assert.equal(cashRec.expectedCashDzd, 700);
  assert.equal(cashRec.discrepancyDzd, 0);
  assert.equal(cashRec.status, 'balanced');
  assert.equal(cashRec.totalBaridiMobCentimes, 50000);

  const priorPayouts: MedicalDoctorPayout[] = [
    {
      id: 'pay_0',
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      practitionerId: 'doc_01',
      practitionerRef: 'doc_01',
      practitionerName: 'Dr. Amine Benali',
      periodMonth: '2026-05',
      consultationsCount: 1,
      grossTurnoverCentimes: 400000,
      commissionRateBps: 7500,
      doctorPayoutCentimes: 300000,
      polyclinicShareCentimes: 100000,
      status: 'issued',
      issuedAt: '2026-05-10T12:00:00Z',
    },
  ];
  const turnovers = aggregatePractitionerTurnovers({
    practitioners: docs,
    consultations: consults,
    payouts: priorPayouts,
    periodMonth: '2026-05',
  });
  // Total = 10,000 DZD = 1,000,000 centimes -> 75% = 750,000 -> minus 300,000 already paid = 450,000 pending
  assert.equal(turnovers[0].grossTurnoverCentimes, 1_000_000);
  assert.equal(turnovers[0].doctorPayoutCentimes, 750_000);
  assert.equal(turnovers[0].pendingPayoutCentimes, 450_000);

  const payoutDraft = buildDoctorPayoutScfDraft({ payout: priorPayouts[0] });
  assert.equal(payoutDraft.lines[0].debitCentimes, 300_000);
  assert.equal(payoutDraft.lines[1].creditCentimes, 300_000);

  const claims: ChifaClaimRecord[] = [
    {
      id: 'c1',
      consultationId: 'cons_1',
      patientName: 'Patient ALD',
      chifaNumber: 'CH-1',
      ngapCode: 'KE',
      totalAmountDzd: 4000,
      cnasShareDzd: 4000,
      ticketModerateurDzd: 0,
    },
    {
      id: 'c2',
      consultationId: 'cons_2',
      patientName: 'Patient Cash',
      chifaNumber: 'CH-2',
      ngapCode: 'CS',
      totalAmountDzd: 3500,
      cnasShareDzd: 2800,
      ticketModerateurDzd: 700,
    },
  ];
  const batch = buildChifaBordereauBatch({
    accountId: 'a1',
    businessId: 'b1',
    branchId: 'br1',
    claims,
    periodMonth: '2026-05',
    transmitted: true,
  });
  assert.equal(batch.ok, true);
  assert.equal(batch.bordereau?.totalFeeCentimes, 750_000);
  assert.equal(batch.bordereau?.totalCnasCentimes, 680_000);
  assert.equal(batch.bordereau?.totalCopayCentimes, 70_000);

  const settleScf = buildChifaSettlementScfDraft({
    bordereau: batch.bordereau!,
    settlementReference: 'VIR-CNAS-991',
  });
  assert.equal(settleScf.lines[0].accountCode, '512000');
  assert.equal(settleScf.lines[0].debitCentimes, 680_000);
  assert.equal(settleScf.lines[1].accountCode, '411000');
  assert.equal(settleScf.lines[1].creditCentimes, 680_000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REMINDER_EVENT_CATALOG,
  buildReminderIdempotencyKey,
  computeNextAllowedSendIso,
  getDefaultReminderQuietHours,
  getDefaultReminderRules,
  isWithinQuietHours,
  planReminderDispatches,
  scanStateForReminderCandidates,
} from './reminderEngine';
import type { CrmParty, ReminderDeliveryLog, ReminderRule } from '../types/index';

const ACC = 'acc_rem_test';
const BIZ = 'biz_rem_test';

test('REMINDER_EVENT_CATALOG covers all 13 required domain events', () => {
  assert.equal(REMINDER_EVENT_CATALOG.length, 13);
  const keys = new Set(REMINDER_EVENT_CATALOG.map((e) => e.eventType));
  for (const required of [
    'membership_expiring',
    'invoice_overdue',
    'installment_due',
    'rent_due',
    'appointment_tomorrow',
    'low_stock',
    'expiry_date',
    'service_due',
    'dar_lockout',
    'cheque_due',
    'deadline_cpca',
    'contract_expiry',
    'vehicle_documents_expiry',
  ] as const) {
    assert.ok(keys.has(required), `Missing event type ${required}`);
  }
});

test('scanStateForReminderCandidates detects all 13 event sources accurately', () => {
  const rules = getDefaultReminderRules(ACC, BIZ);
  const nowIso = '2026-11-26T10:00:00.000Z';

  const candidates = scanStateForReminderCandidates(
    {
      businessId: BIZ,
      members: [
        {
          id: 'mem_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          tenantId: ACC,
          facilityId: BIZ,
          fullName: 'Amira Cherif',
          email: 'amira@example.com',
          phoneNumber: '0550112233',
          membershipPlanId: 'p1',
          remainingSessions: 12,
          gender: 'Female',
          status: 'Active',
          startDate: '2026-10-26',
          expirationDate: '2026-11-30',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      unifiedDocuments: [
        {
          id: 'doc_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          sourceVertical: 'trading_commercial',
          docType: 'facture',
          draftNumber: 'DR-1',
          docNumber: 'FAC-2026-00010',
          fiscalYear: 2026,
          status: 'Issued',
          partyId: 'p_1',
          partyName: 'SARL Atlas',
          docDate: '2026-11-10',
          dueDate: '2026-11-20',
          paymentMethod: 'virement',
          paymentTerms: '30_jours',
          currency: 'DZD',
          fxRate: 1,
          fxRateDate: '2026-11-10',
          timbreBasis: 'exempt',
          items: [],
          tvaBreakdown: [],
          totalHtRawCentimes: 500000,
          generalDiscountPercent: 0,
          totalHtFinalCentimes: 500000,
          totalTvaCentimes: 0,
          timbreFiscalCentimes: 0,
          totalTtcCentimes: 500000,
          guaranteeRetentionPercent: 0,
          guaranteeRetentionCentimes: 0,
          netToPayCentimes: 500000,
          paidCentimes: 0,
          balanceDueCentimes: 500000,
          fiscalHeaderSnapshot: { companyName: 'Atrium' },
          totalsInWordsFr: '',
          totalsInWordsAr: '',
          includeStampSignature: true,
          printedCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      commercialDocs: [
        {
          id: 'cdoc_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          tenantId: ACC,
          facilityId: BIZ,
          docNumber: 'FAC-B2B-1',
          type: 'facture',
          clientId: 'cli_1',
          clientName: 'Client B2B',
          depotId: 'dep_1',
          date: '2026-11-01',
          dueDate: '2026-11-28',
          status: 'Validated',
          paymentMethod: 'Virement',
          paymentTerms: '30j',
          items: [],
          totalHtRaw: 10000,
          generalDiscountPercent: 0,
          totalHtFinal: 10000,
          totalTva: 1900,
          timbreFiscal: 0,
          totalTtc: 11900,
          guaranteeRetentionPercent: 0,
          guaranteeRetentionAmount: 0,
          netToPay: 11900,
          currency: 'DZD',
          includeStampSignature: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      eduEnrollments: [
        {
          id: 'enr_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          tenantId: ACC,
          facilityId: BIZ,
          studentId: 'stu_1',
          studentName: 'Yasmine K',
          cohortId: 'coh_1',
          cohortName: 'Bootcamp Dev',
          enrolledAt: '2026-10-01',
          agreedTuition: 40000,
          discountAmount: 0,
          paidAmount: 20000,
          balanceDue: 20000,
          currency: 'DZD',
          paymentStatus: 'Partial',
          status: 'Active',
          installments: [
            {
              dueDate: '2026-11-28',
              amount: 10000,
              isPaid: false,
            },
          ],
        },
      ],
      leases: [
        {
          id: 'lease_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          propertyId: 'prop_1',
          propertyTitle: 'Appart Hydra F4',
          tenantName: 'Karim Mansour',
          tenantPhone: '0661223344',
          startDate: '2026-01-01',
          endDate: '2027-01-01',
          monthlyRentDzd: 85000,
          securityDepositDzd: 170000,
          status: 'Active',
        },
      ],
      appointments: [
        {
          id: 'apt_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          tenantId: ACC,
          facilityId: BIZ,
          staffId: 'sty_1',
          staffName: 'Nadia',
          clientId: 'cli_apt_1',
          clientName: 'Lina Haddad',
          clientPhone: '0770123456',
          serviceId: 'srv_1',
          serviceName: 'Coupe & Brushing',
          date: '2026-11-27',
          startTime: '14:00',
          endTime: '15:00',
          durationMinutes: 60,
          price: 3500,
          status: 'Confirmed',
          createdAt: nowIso,
        },
      ],
      products: [
        {
          id: 'prod_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          tenantId: ACC,
          facilityId: BIZ,
          name: 'Whey Isolate 2kg',
          description: 'Whey protein',
          category: 'Supplement',
          sku: 'WHEY-2KG',
          price: { amount: 12000, currency: 'DZD' },
          cost: { amount: 8000, currency: 'DZD' },
          stockQuantity: 2,
          reorderLevel: 5,
          isActive: true,
          isPinned: false,
          expiryDate: '2026-12-02',
        } as any,
      ],
      garageVehicles: [
        {
          id: 'veh_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          licensePlate: '00123-116-16',
          vin: 'VF1RFB',
          brand: 'Renault',
          model: 'Clio 5',
          year: 2023,
          engineType: '1.5 dCi',
          ownerName: 'Omar Ziani',
          ownerPhone: '0550998877',
          currentOdometer: 59800,
          nextServiceOdometer: 60000,
          insuranceExpiry: '2026-12-05',
          createdAt: nowIso,
        },
      ],
      dairyCows: [
        {
          id: 'cow_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          earTagNumber: 'DZ-16-0091',
          nameOrNumber: 'Bella',
          breed: 'Holstein',
          birthDate: '2022-05-01',
          reproStatus: 'Quarantaine',
          lactationNumber: 2,
          dailyAvgLiters: 22,
          isInWithholdingLockout: true,
          withholdingLockoutUntil: '2026-11-28',
          withholdingReason: 'Antibiotique',
          createdAt: nowIso,
        },
      ],
      unifiedPayments: [
        {
          id: 'pay_chq_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          sourceVertical: 'trading_commercial',
          paymentNumber: 'REG-2026-0001',
          partyName: 'SARL Atlas',
          method: 'cheque',
          direction: 'inflow',
          amountCentimes: 500000,
          unallocatedCreditCentimes: 0,
          currency: 'DZD',
          fxRate: 1,
          paymentDate: '2026-11-20',
          status: 'pending_clearance',
          instrumentDueDate: '2026-11-27',
          instrumentNumber: 'CHQ-9912',
          allocations: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      cpcaDeadlines: [
        {
          id: 'cpca_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          matterId: 'mat_1',
          caseNumber: 'RG-2026-441',
          courtJurisdiction: 'Cour d Alger',
          chamber: 'Commerciale',
          recourseType: 'appel_commercial',
          notificationDate: '2026-11-01',
          bailiffName: 'Me Saidi',
          domicileCategory: 'local',
          statutoryBaseDays: 30,
          distanceExtensionDays: 0,
          terminalExpiryDate: '2026-11-30',
          isRolledOver: false,
          status: 'critical',
          createdAt: nowIso,
        },
      ],
      mandates: [
        {
          id: 'mnd_1',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          mandateNumber: 'MND-2026-001',
          mandateType: 'Vente_Exclusif',
          status: 'Active',
          propertyId: 'prop_1',
          propertyTitle: 'Villa El Biar',
          propertyAddress: 'El Biar',
          propertyType: 'Villa',
          listingType: 'Sale',
          ownerFullName: 'Mourad Khelifi',
          ownerPhone: '0551002233',
          ownerNationalId: '1000200030',
          askingPriceDzd: 95000000,
          minimumAcceptablePriceDzd: 90000000,
          commissionCalculationMode: 'DecreeTranches',
          commissionEstimatedHtDzd: 1900000,
          commissionEstimatedTtcDzd: 2261000,
          commissionPayer: 'Seller',
          startDate: '2026-09-01',
          endDate: '2026-12-05',
          renewalCount: 0,
          isExclusive: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
    },
    rules,
    nowIso
  );

  const detectedEvents = new Set(candidates.map((c) => c.eventType));
  assert.equal(detectedEvents.size, 13, `Expected all 13 events, got: ${[...detectedEvents].join(', ')}`);
});

test('quiet hours handles overnight wrap-around (21:00 -> 08:00 Africa/Algiers) and computes next allowed send', () => {
  const qh = getDefaultReminderQuietHours(ACC, BIZ);
  // 21:30 Algiers time = 20:30 UTC
  assert.equal(isWithinQuietHours('2026-11-26T20:30:00.000Z', qh), true);
  // 07:15 Algiers time = 06:15 UTC
  assert.equal(isWithinQuietHours('2026-11-27T06:15:00.000Z', qh), true);
  // 14:00 Algiers time = 13:00 UTC
  assert.equal(isWithinQuietHours('2026-11-26T13:00:00.000Z', qh), false);

  const nextAllowed = computeNextAllowedSendIso('2026-11-26T20:30:00.000Z', qh);
  // Next 08:00 Algiers = 07:00 UTC next day (2026-11-27T07:00:00.000Z)
  assert.equal(nextAllowed, '2026-11-27T07:00:00.000Z');
});

test('planReminderDispatches enforces idempotency (never sent twice), per-rule disable, quiet hours deferral, and CRM opt-out', () => {
  const rules: ReminderRule[] = getDefaultReminderRules(ACC, BIZ);
  const qh = getDefaultReminderQuietHours(ACC, BIZ);
  // Disable low_stock rule
  const customRules = rules.map((r) =>
    r.eventType === 'low_stock' ? { ...r, isEnabled: false } : r
  );

  const optedOutParty: CrmParty = {
    id: 'party_optout',
    accountId: ACC,
    businessId: BIZ,
    partyKind: 'person',
    displayName: 'Amira Cherif',
    phoneRaw: '0550112233',
    phoneE164: '+213550112233',
    phoneValid: true,
    preferredLanguage: 'fr',
    consentSms: false,
    consentWhatsapp: false,
    consentEmail: false,
    optOutAll: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };

  // Run during quiet hours (22:30 Algiers = 21:30 UTC)
  const quietNow = '2026-11-26T21:30:00.000Z';
  const candidates = scanStateForReminderCandidates(
    {
      businessId: BIZ,
      members: [
        {
          id: 'mem_optout',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          staffId: 'stf_1',
          tenantId: ACC,
          facilityId: BIZ,
          fullName: 'Amira Cherif',
          email: 'amira@example.com',
          phoneNumber: '0550112233',
          membershipPlanId: 'p1',
          remainingSessions: 12,
          gender: 'Female',
          status: 'Active',
          startDate: '2026-10-26',
          expirationDate: '2026-11-29',
          createdAt: quietNow,
          updatedAt: quietNow,
        },
      ],
      appointments: [
        {
          id: 'apt_q',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          tenantId: ACC,
          facilityId: BIZ,
          staffId: 'st1',
          staffName: 'Salim',
          clientId: 'cli_q',
          clientName: 'Yacine Ben',
          clientPhone: '0770998811',
          serviceId: 's1',
          serviceName: 'Consultation',
          date: '2026-11-27',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          price: 2000,
          status: 'Confirmed',
          createdAt: quietNow,
        },
      ],
      products: [
        {
          id: 'prod_disabled',
          accountId: ACC,
          businessId: BIZ,
          branchId: 'br_1',
          tenantId: ACC,
          facilityId: BIZ,
          name: 'Disabled Low Stock Item',
          description: 'Item',
          category: 'General',
          sku: 'ITEM-1',
          price: { amount: 500, currency: 'DZD' },
          cost: { amount: 300, currency: 'DZD' },
          stockQuantity: 1,
          reorderLevel: 5,
          isActive: true,
          isPinned: false,
        },
      ],
    },
    customRules,
    quietNow
  );

  // low_stock rule is disabled so it must produce 0 dispatches
  const existingLogs: ReminderDeliveryLog[] = [];
  const firstPlan = planReminderDispatches({
    candidates,
    rules: customRules,
    existingLogs,
    quietHours: qh,
    parties: [optedOutParty],
    nowIso: quietNow,
  });

  assert.equal(
    firstPlan.some((d) => d.candidate.eventType === 'low_stock'),
    false,
    'Disabled rule must not emit dispatches'
  );

  const memWhatsapp = firstPlan.find(
    (d) => d.candidate.eventType === 'membership_expiring' && d.channel === 'whatsapp'
  );
  assert.equal(memWhatsapp?.status, 'blocked_opt_out');

  const memInApp = firstPlan.find(
    (d) => d.candidate.eventType === 'membership_expiring' && d.channel === 'in_app'
  );
  assert.equal(memInApp?.status, 'sent');

  const aptWhatsapp = firstPlan.find(
    (d) => d.candidate.eventType === 'appointment_tomorrow' && d.channel === 'whatsapp'
  );
  assert.equal(aptWhatsapp?.status, 'deferred_quiet_hours');
  assert.ok(aptWhatsapp?.scheduledFor);

  // Second run with existingLogs populated -> strictly 0 duplicates!
  const recorded: ReminderDeliveryLog[] = firstPlan.map((d, i) => ({
    id: `log_${i}`,
    accountId: ACC,
    businessId: BIZ,
    ruleId: d.rule.id,
    eventType: d.candidate.eventType,
    entityType: d.candidate.entityType,
    entityId: d.candidate.entityId,
    channel: d.channel,
    idempotencyKey: d.idempotencyKey,
    status: d.status,
    title: d.title,
    message: d.message,
    attempts: 1,
    createdAt: quietNow,
    updatedAt: quietNow,
  }));

  const secondPlan = planReminderDispatches({
    candidates,
    rules: customRules,
    existingLogs: recorded,
    quietHours: qh,
    parties: [optedOutParty],
    nowIso: quietNow,
  });

  assert.equal(secondPlan.length, 0, 'Idempotency must guarantee zero duplicate reminders');
  assert.equal(
    buildReminderIdempotencyKey({
      ruleId: 'r1',
      eventType: 'cheque_due',
      entityId: 'p1',
      targetDate: '2026-11-27T12:00:00Z',
      channel: 'whatsapp',
    }),
    'r1:cheque_due:p1:2026-11-27:whatsapp'
  );
});

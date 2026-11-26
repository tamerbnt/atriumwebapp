import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildParty360Summary,
  detectPartyDuplicates,
  evaluateCommunicationDispatch,
  getDefaultCrmMessageTemplates,
  normalizeAlgerianPhoneForCrm,
  planPartyMerge,
  renderCrmTemplate,
} from './crmPartyEngine';
import type { CrmParty } from '../types/index';

const baseParty = (overrides: Partial<CrmParty> = {}): CrmParty => ({
  id: 'party_1',
  accountId: 'acc_test',
  businessId: 'biz_test',
  branchId: 'br_test',
  partyKind: 'person',
  displayName: 'Amira Cherif',
  phoneRaw: '+213 661 22 33 44',
  phoneE164: '+213661223344',
  phoneLocal: '0661223344',
  phoneValid: true,
  email: 'amira@example.dz',
  preferredLanguage: 'fr',
  consentSms: true,
  consentWhatsapp: true,
  consentEmail: true,
  optOutAll: false,
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  ...overrides,
});

test('CRM Engine: normalizes local, 00213, 213, and +213 Algerian phone numbers via validateAlgerianPhone', () => {
  const fromLocal = normalizeAlgerianPhoneForCrm('0661 22-33.44');
  assert.equal(fromLocal.valid, true);
  assert.equal(fromLocal.operator, 'Mobilis');
  assert.equal(fromLocal.e164, '+213661223344');
  assert.equal(fromLocal.local10, '0661223344');

  const from00213 = normalizeAlgerianPhoneForCrm('00213770112233');
  assert.equal(from00213.valid, true);
  assert.equal(from00213.operator, 'Djezzy');
  assert.equal(from00213.e164, '+213770112233');

  const invalid = normalizeAlgerianPhoneForCrm('12345');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.e164, null);
});

test('CRM Engine: detects NIF/email/phone duplicates and flags shared family phones without false hard blocks', () => {
  const p1 = baseParty({ id: 'p1', displayName: 'Amira Cherif', phoneE164: '+213661223344', nif: '199916010012345' });
  const p2 = baseParty({
    id: 'p2',
    displayName: 'Yacine Cherif',
    phoneRaw: '0661223344',
    phoneE164: '+213661223344',
    email: 'yacine@example.dz',
    nif: undefined,
    sharedPhoneGroup: true,
  });

  // Different named person sharing phone -> medium confidence shared family phone
  const familyMatches = detectPartyDuplicates(
    { businessId: 'biz_test', displayName: 'Nadia Cherif', phone: '0661223344' },
    [p1, p2]
  );
  assert.equal(familyMatches.length, 2);
  assert.equal(familyMatches[0].isSharedFamilyPhone, true);
  assert.equal(familyMatches[0].confidence, 'medium');

  // Matching NIF -> high confidence duplicate
  const nifMatches = detectPartyDuplicates(
    { businessId: 'biz_test', displayName: 'SARL Cherif', nif: '199916010012345' },
    [p1, p2]
  );
  assert.equal(nifMatches.length, 1);
  assert.equal(nifMatches[0].confidence, 'high');
  assert.deepEqual(nifMatches[0].reasons, ['nif']);
});

test('CRM Engine: plans transactional party merge preserving opt-out and coalescing missing identifiers', () => {
  const source = baseParty({
    id: 'p_src',
    displayName: 'Amira Duplicate',
    nif: '199916010099999',
    optOutAll: true,
    consentSms: false,
    notes: 'Second file note',
  });
  const target = baseParty({
    id: 'p_tgt',
    displayName: 'Amira Cherif',
    nif: undefined,
    optOutAll: false,
    consentSms: true,
    notes: 'Primary file note',
  });

  const plan = planPartyMerge(
    source,
    target,
    {
      links: [
        {
          id: 'lnk_1',
          accountId: 'acc_test',
          businessId: 'biz_test',
          partyId: 'p_src',
          sourceVertical: 'membership_session',
          entityType: 'member',
          entityId: 'mem_1',
          createdAt: '2026-11-01T10:00:00Z',
          updatedAt: '2026-11-01T10:00:00Z',
        },
      ],
      notes: [],
      tasks: [],
      comms: [],
    },
    'stf_1'
  );

  assert.equal(plan.linksMovedCount, 1);
  assert.equal(plan.mergedTarget.nif, '199916010099999');
  assert.equal(plan.mergedTarget.optOutAll, true);
  assert.equal(plan.mergedTarget.consentSms, false);
  assert.equal(plan.sourceParty.mergedIntoPartyId, 'p_tgt');
  assert.ok(plan.sourceParty.deletedAt);
});

test('CRM Engine: renders FR/AR/EN templates, catches missing variables, enforces opt-out & surfaces provider failure', () => {
  const templates = getDefaultCrmMessageTemplates('acc_test', 'biz_test');
  const paymentTpl = templates.find((t) => t.code === 'PAYMENT_FOLLOWUP')!;

  const missingRender = renderCrmTemplate(paymentTpl, 'ar', {
    name: 'أميرة',
    doc_number: 'FAC-2026-00010',
    amount: '',
    due_date: '2026-12-01',
    business_name: 'أتريوم',
  });
  assert.deepEqual(missingRender.missingVariables, ['amount']);
  assert.ok(missingRender.body.includes('[amount]'));

  const okRender = renderCrmTemplate(paymentTpl, 'fr', {
    name: 'Amira',
    doc_number: 'FAC-2026-00010',
    amount: '15 000 DZD',
    due_date: '2026-12-01',
    business_name: 'Atrium',
  });
  assert.equal(okRender.missingVariables.length, 0);

  // Opt-out blocks dispatch
  const optOutRes = evaluateCommunicationDispatch({
    party: baseParty({ optOutAll: true }),
    channel: 'whatsapp',
    renderedBody: okRender.body,
    missingVariables: [],
    providerConfigured: true,
  });
  assert.equal(optOutRes.allowed, false);
  assert.equal(optOutRes.status, 'blocked_opt_out');

  // Unconfigured provider surfaces failure honestly for retry
  const unconfiguredRes = evaluateCommunicationDispatch({
    party: baseParty(),
    channel: 'sms',
    renderedBody: okRender.body,
    missingVariables: [],
    providerConfigured: false,
  });
  assert.equal(unconfiguredRes.allowed, false);
  assert.equal(unconfiguredRes.status, 'failed');
  assert.equal(unconfiguredRes.errorCode, 'PROVIDER_NOT_CONFIGURED');

  // Configured provider succeeds
  const sentRes = evaluateCommunicationDispatch({
    party: baseParty(),
    channel: 'whatsapp',
    renderedBody: okRender.body,
    missingVariables: [],
    providerConfigured: true,
  });
  assert.equal(sentRes.allowed, true);
  assert.equal(sentRes.status, 'sent');
});

test('CRM Engine: builds Customer 360 summary across documents, payments, appointments, notes, tasks, and comms', () => {
  const party = baseParty({ id: 'party_360', displayName: 'Amira Cherif' });
  const summary = buildParty360Summary({
    party,
    links: [
      {
        id: 'l1',
        accountId: 'acc_test',
        businessId: 'biz_test',
        partyId: 'party_360',
        sourceVertical: 'membership_session',
        entityType: 'member',
        entityId: 'mem_1',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
      },
      {
        id: 'l2',
        accountId: 'acc_test',
        businessId: 'biz_test',
        partyId: 'party_360',
        sourceVertical: 'appointment_service',
        entityType: 'appointment_client',
        entityId: 'cli_1',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
      },
    ],
    unifiedDocuments: [
      {
        id: 'doc_1',
        accountId: 'acc_test',
        businessId: 'biz_test',
        branchId: 'br_test',
        sourceVertical: 'membership_session',
        docType: 'facture',
        draftNumber: 'BR-FAC-1',
        docNumber: 'FAC-2026-00001',
        fiscalYear: 2026,
        status: 'Issued',
        partyId: 'party_360',
        partyName: 'Amira Cherif',
        docDate: '2026-11-20',
        paymentMethod: 'cash',
        paymentTerms: 'comptant',
        currency: 'DZD',
        fxRate: 1,
        fxRateDate: '2026-11-20',
        timbreBasis: 'exempt',
        items: [],
        tvaBreakdown: [],
        totalHtRawCentimes: 1000000,
        generalDiscountPercent: 0,
        totalHtFinalCentimes: 1000000,
        totalTvaCentimes: 0,
        timbreFiscalCentimes: 0,
        totalTtcCentimes: 1000000,
        guaranteeRetentionPercent: 0,
        guaranteeRetentionCentimes: 0,
        netToPayCentimes: 1000000,
        paidCentimes: 400000,
        balanceDueCentimes: 600000,
        fiscalHeaderSnapshot: { companyName: 'Atrium' },
        totalsInWordsFr: '',
        totalsInWordsAr: '',
        includeStampSignature: true,
        printedCount: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
    ],
    unifiedPayments: [
      {
        id: 'pay_1',
        accountId: 'acc_test',
        businessId: 'biz_test',
        branchId: 'br_test',
        sourceVertical: 'membership_session',
        paymentNumber: 'REG-2026-00001',
        partyId: 'party_360',
        partyName: 'Amira Cherif',
        method: 'cash',
        direction: 'inflow',
        amountCentimes: 400000,
        currency: 'DZD',
        fxRate: 1,
        paymentDate: '2026-11-21',
        status: 'posted',
        allocations: [],
        unallocatedCreditCentimes: 0,
        createdAt: '2026-11-21T10:00:00Z',
        updatedAt: '2026-11-21T10:00:00Z',
      },
    ],
    tasks: [
      {
        id: 't1',
        accountId: 'acc_test',
        businessId: 'biz_test',
        partyId: 'party_360',
        title: 'Call for renewal',
        channel: 'call',
        dueAt: '2026-11-28T09:00:00Z',
        status: 'open',
        createdAt: '2026-11-25T10:00:00Z',
        updatedAt: '2026-11-25T10:00:00Z',
      },
    ],
    communications: [
      {
        id: 'c1',
        accountId: 'acc_test',
        businessId: 'biz_test',
        partyId: 'party_360',
        channel: 'sms',
        recipientAddress: '+213661223344',
        language: 'fr',
        renderedBody: 'Test',
        missingVariables: [],
        status: 'failed',
        attempts: 1,
        lastAttemptAt: '2026-11-25T11:00:00Z',
        createdAt: '2026-11-25T11:00:00Z',
        updatedAt: '2026-11-25T11:00:00Z',
      },
    ],
  });

  assert.deepEqual(summary.linkedVerticals, ['membership_session', 'appointment_service']);
  assert.equal(summary.totalBilledDzd, 10000);
  assert.equal(summary.totalPaidDzd, 4000);
  assert.equal(summary.openBalanceDzd, 6000);
  assert.equal(summary.openTasksCount, 1);
  assert.equal(summary.failedCommsCount, 1);
  assert.equal(summary.timeline.length, 4);
});

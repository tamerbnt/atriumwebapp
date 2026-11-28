import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSha256Hex,
  hashEscrowPin,
  calculateTimeEntryAmountCentimes,
  buildFeeInvoiceFromTimeEntries,
  detectLegalConflictOfInterest,
  filterMattersByRole,
  validateOrShiftHearingDate,
  recalculateDeadlinesWithHolidays,
  computeCarpaReconciliation,
  validateEscrowGuardedRelease,
  validateVaultUploadFile,
  DEFAULT_LEGAL_DOC_TEMPLATES,
  interpolateLegalTemplate,
  validateSignatureSvg,
  buildLegalPortalTokenAndUrl,
  prepareHearingOrDeadlineReminder,
  computeClientG50Declaration,
  summarizeMultiClientBooks,
  createBailiffActWithOptionalCpcaDeadline,
  createDefaultArbitrationMilestones,
  evaluateArbitrationTimelineStatus,
} from './legalDepth';
import type {
  LegalMatter,
  LegalTimeEntry,
  CrmParty,
} from '../types/index';

test('computeSha256Hex matches FIPS 180-4 test vectors deterministically', () => {
  assert.equal(
    computeSha256Hex(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  assert.equal(
    computeSha256Hex('hello'),
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  );
  const bytes = new Uint8Array([104, 101, 108, 108, 111]);
  assert.equal(computeSha256Hex(bytes), computeSha256Hex('hello'));
});

test('buildFeeInvoiceFromTimeEntries computes TVA + Art. 317 timbre in centimes and blocks double-billing', () => {
  const te1: LegalTimeEntry = {
    id: 'te_1',
    accountId: 'a1',
    businessId: 'b1',
    branchId: 'br1',
    staffId: 'st1',
    matterId: 'mat_1',
    matterNumber: 'DOS-2026-001',
    clientName: 'SARL Atlas',
    counselName: 'Maître Benali',
    activityType: 'redaction',
    description: 'Rédaction conclusions au fond',
    durationMinutes: 120, // 2h * 8,000 = 16,000 DA
    hourlyRateDzd: 8000,
    tvaRate: 19,
    amountHtCentimes: calculateTimeEntryAmountCentimes(120, 8000),
    isBillable: true,
    isBilled: false,
    entryDate: '2026-06-10',
    createdAt: '2026-06-10T09:00:00Z',
  };

  assert.equal(te1.amountHtCentimes, 1600000);

  const okRes = buildFeeInvoiceFromTimeEntries({
    accountId: 'a1',
    businessId: 'b1',
    branchId: 'br1',
    staffId: 'st1',
    matterId: 'mat_1',
    matterNumber: 'DOS-2026-001',
    clientName: 'SARL Atlas',
    selectedEntries: [te1],
    tvaRate: 19,
    disbursementDzd: 0,
    paymentMethod: 'especes',
    invoiceNumber: 'HNR-2026-00001',
    issueDate: '2026-06-10',
  });

  assert.equal(okRes.ok, true);
  if (okRes.ok) {
    assert.equal(okRes.invoice.feesHtDzd, 16000);
    assert.equal(okRes.invoice.tvaDzd, 3040); // 19% of 16,000
    assert.equal(okRes.invoice.timbreDzd, 100); // Art. 317 stamp for 19,040 DA in [10,001..50,000]
    assert.equal(okRes.invoice.totalTtcDzd, 19140);
    assert.equal(okRes.updatedTimeEntries[0].isBilled, true);
    assert.equal(okRes.updatedTimeEntries[0].invoiceId, okRes.invoice.id);

    // Re-billing the marked entry MUST fail with TIME_ENTRY_ALREADY_BILLED
    const dupRes = buildFeeInvoiceFromTimeEntries({
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      staffId: 'st1',
      clientName: 'SARL Atlas',
      selectedEntries: okRes.updatedTimeEntries,
      tvaRate: 19,
      invoiceNumber: 'HNR-2026-00002',
    });
    assert.equal(dupRes.ok, false);
    if (!dupRes.ok) {
      assert.equal(dupRes.code, 'TIME_ENTRY_ALREADY_BILLED');
    }
  }
});

test('detectLegalConflictOfInterest flags adverse/client reversals and filterMattersByRole hides secret files from secretaire_caisse', () => {
  const existing: LegalMatter[] = [
    {
      id: 'm1',
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      staffId: 's1',
      matterNumber: 'DOS-2026-101',
      title: 'Litige Bail',
      category: 'Commercial',
      clientName: 'SARL Atlas Distribution',
      clientPhone: '0550112233',
      adversePartyName: 'EURL Horizon',
      assignedLawyer: 'Maître Benali',
      retainerAmountDzd: 80000,
      trustEscrowBalanceDzd: 0,
      status: 'Active',
      confidentialityLevel: 'SecretDefense',
      allowedRoles: ['avocat_associe'],
      createdAt: '2026-05-01T10:00:00Z',
    },
    {
      id: 'm2',
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      staffId: 's1',
      matterNumber: 'DOS-2026-102',
      title: 'Constitution Société',
      category: 'NotaryAct',
      clientName: 'EURL Zénith',
      clientPhone: '0550998877',
      assignedLawyer: 'Maître Kaci',
      retainerAmountDzd: 45000,
      trustEscrowBalanceDzd: 0,
      status: 'Active',
      confidentialityLevel: 'PublicClient',
      createdAt: '2026-05-02T10:00:00Z',
    },
  ];

  // Adverse party matches an existing active client ("SARL Atlas Distribution")
  const conflict = detectLegalConflictOfInterest(
    {
      clientName: 'Nouveau Demandeur',
      adversePartyName: 'Atlas Distribution',
    },
    existing
  );
  assert.equal(conflict.hasConflict, true);
  assert.equal(conflict.status, 'conflict');

  const secMatters = filterMattersByRole(existing, 'secretaire_caisse');
  assert.equal(secMatters.length, 1);
  assert.equal(secMatters[0].id, 'm2');

  const partnerMatters = filterMattersByRole(existing, 'avocat_associe');
  assert.equal(partnerMatters.length, 2);
});

test('validateOrShiftHearingDate and recalculateDeadlinesWithHolidays respect Fri/Sat + Algerian holidays', () => {
  // 2026-06-19 is a Friday -> 2026-06-20 Saturday -> shifts to Sunday 2026-06-21
  const friCheck = validateOrShiftHearingDate('2026-06-19', []);
  assert.equal(friCheck.wasShifted, true);
  assert.equal(friCheck.adjustedDate, '2026-06-21');

  // Dynamic Eid holiday on Sunday 2026-06-21 shifts Monday 2026-06-22
  const eidCheck = validateOrShiftHearingDate('2026-06-19', [
    { holidayDate: '2026-06-21', label: 'Aïd Test', isActive: true },
  ]);
  assert.equal(eidCheck.adjustedDate, '2026-06-22');

  const recalc = recalculateDeadlinesWithHolidays(
    [
      {
        id: 'dl_1',
        notificationDate: '2026-05-16',
        recourseType: 'appel_civil',
        domicileCategory: 'local',
        terminalExpiryDate: '2026-06-15T16:30:00+01:00',
        status: 'running',
        isRolledOver: false,
      },
    ],
    [{ holidayDate: '2026-06-15', isActive: true }]
  );
  assert.equal(recalc.recalculatedCount, 1);
  assert.ok(recalc.updated[0].terminalExpiryDate.startsWith('2026-06-16'));
  assert.equal(recalc.updated[0].isRolledOver, true);
});

test('CARPA reconciliation & guarded escrow release enforce cadastre and hashed PIN', () => {
  const pinHash = hashEscrowPin('4815');
  const escrow = {
    currentBalanceDzd: 2500000,
    bankStatementBalanceDzd: 2450000,
    releasePinHash: pinHash,
    cadastralClearanceProof: undefined,
  };

  const reconMismatch = computeCarpaReconciliation(escrow);
  assert.equal(reconMismatch.isReconciled, false);
  assert.equal(reconMismatch.varianceCentimes, -5000000);

  const blockNoCadastre = validateEscrowGuardedRelease({
    account: escrow,
    payoutAmountDzd: 1000000,
    pinEntered: '4815',
    requireCadastre: true,
  });
  assert.equal(blockNoCadastre.allowed, false);
  assert.equal(blockNoCadastre.code, 'CADASTRE_CLEARANCE_REQUIRED');

  const withCadastre = {
    ...escrow,
    cadastralClearanceProof: { volume: 'Vol 19', number: '412', recordedAt: '2026-06-10' },
  };
  const blockBadPin = validateEscrowGuardedRelease({
    account: withCadastre,
    payoutAmountDzd: 1000000,
    pinEntered: '0000',
  });
  assert.equal(blockBadPin.allowed, false);
  assert.equal(blockBadPin.code, 'INVALID_ESCROW_PIN');

  const okRelease = validateEscrowGuardedRelease({
    account: withCadastre,
    payoutAmountDzd: 1000000,
    pinEntered: '4815',
  });
  assert.equal(okRelease.allowed, true);
});

test('Vault upload validation, template interpolation, SVG signature, portal link & CRM reminder quiet hours', () => {
  assert.equal(
    validateVaultUploadFile({ name: 'scan.pdf', size: 1024, type: 'application/pdf' }).ok,
    true
  );
  assert.equal(
    validateVaultUploadFile({ name: 'huge.pdf', size: 20 * 1024 * 1024, type: 'application/pdf' }).ok,
    false
  );
  assert.equal(
    validateVaultUploadFile({ name: 'bad.exe', size: 1024, type: 'application/x-msdownload' }).ok,
    false
  );

  const tpl = DEFAULT_LEGAL_DOC_TEMPLATES[0];
  const rendered = interpolateLegalTemplate(tpl.bodyTemplate, {
    cabinet_name: 'Benali',
    matter_number: 'DOS-2026-009',
    adverse_party: 'EURL Delta',
    client_name: 'SARL Atlas',
    amount_dzd: '450 000',
    due_days: '8',
  });
  assert.equal(rendered.unresolvedTokens.length, 0);
  assert.ok(rendered.rendered.includes('SARL Atlas'));

  assert.equal(validateSignatureSvg('<svg><path d="M 1 1 L 10 10"/></svg>').valid, true);
  assert.equal(validateSignatureSvg('<svg></svg>').valid, false);

  const portal = buildLegalPortalTokenAndUrl('mat_1', 'DOS-2026-009');
  assert.ok(portal.token.startsWith('lpr_'));
  assert.ok(portal.url.includes(portal.token));

  const partyOptOut: CrmParty = {
    id: 'p1',
    accountId: 'a1',
    businessId: 'b1',
    displayName: 'Client Refus',
    partyKind: 'person',
    phoneRaw: '0550112233',
    phoneE164: '+213550112233',
    phoneValid: true,
    optOutAll: true,
    consentSms: true,
    consentWhatsapp: true,
    consentEmail: true,
    preferredLanguage: 'fr',
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const blockedReminder = prepareHearingOrDeadlineReminder({
    party: partyOptOut,
    channel: 'whatsapp',
    subjectLabel: 'Audience Commerciale',
    targetDate: '2026-06-25',
    courtOrRef: 'Tribunal de Sidi M’hamed',
    nowIso: '2026-06-24T10:00:00+01:00',
  });
  assert.equal(blockedReminder.allowed, false);
  assert.equal(blockedReminder.dispatchEvaluation.errorCode, 'CRM_OPT_OUT_ALL');

  const partyConsent: CrmParty = { ...partyOptOut, optOutAll: false };
  const quietUnconfigured = prepareHearingOrDeadlineReminder({
    party: partyConsent,
    channel: 'whatsapp',
    subjectLabel: 'Audience Commerciale',
    targetDate: '2026-06-25',
    courtOrRef: 'Tribunal de Sidi M’hamed',
    nowIso: '2026-06-24T22:30:00+01:00',
    quietHours: { enabled: true, startTime: '21:00', endTime: '08:00', timezone: 'Africa/Algiers' },
  });
  assert.equal(quietUnconfigured.allowed, false);
  assert.equal(quietUnconfigured.dispatchEvaluation.errorCode, 'PROVIDER_NOT_CONFIGURED');
  assert.equal(quietUnconfigured.queuedForAfterQuietHours, true);

  const quietConfigured = prepareHearingOrDeadlineReminder({
    party: partyConsent,
    channel: 'whatsapp',
    subjectLabel: 'Audience Commerciale',
    targetDate: '2026-06-25',
    courtOrRef: 'Tribunal de Sidi M’hamed',
    nowIso: '2026-06-24T22:30:00+01:00', // Inside default 21:00-08:00 Algiers quiet hours
    quietHours: { enabled: true, startTime: '21:00', endTime: '08:00', timezone: 'Africa/Algiers' },
    providerConfigured: true,
  });
  assert.equal(quietConfigured.allowed, true);
  assert.equal(quietConfigured.queuedForAfterQuietHours, true);
});

test('G50 calculation, multi-client book summary, bailiff CPCA linking, and arbitration milestones work accurately', () => {
  const g50 = computeClientG50Declaration({
    tvaCollecteeCentimes: 5700000,
    tvaDeductibleCentimes: 1900000,
    creditTvaAnterieurCentimes: 300000,
    tapBaseCentimes: 0,
    irgSalairesCentimes: 850000,
    ibsAcompteCentimes: 1200000,
    timbreFiscalCentimes: 10000,
  });
  assert.equal(g50.tvaNetDueCentimes, 3500000);
  assert.equal(g50.totalG50DueCentimes, 5560000); // 55,600 DZD

  const bookSummary = summarizeMultiClientBooks([
    {
      id: 'l1',
      accountId: 'a1',
      businessId: 'b1',
      branchId: 'br1',
      staffId: 's1',
      dossierCode: 'EXP-2026-00001',
      clientName: 'SARL Alpha',
      fiscalRegime: 'Reel',
      fiscalPeriod: '2026-06',
      tvaCollecteeCentimes: 5700000,
      tvaDeductibleCentimes: 1900000,
      creditTvaAnterieurCentimes: 0,
      tvaNetDueCentimes: 3800000,
      tapBaseCentimes: 0,
      irgSalairesCentimes: 0,
      ibsAcompteCentimes: 0,
      timbreFiscalCentimes: 0,
      totalG50DueCentimes: 3800000,
      trialBalanceJson: [],
      g50Status: 'filed_dgi',
      liasseReady: true,
      createdAt: '2026-06-15T10:00:00Z',
    },
  ]);
  assert.equal(bookSummary.filedCount, 1);
  assert.equal(bookSummary.liasseReadyCount, 1);
  assert.equal(bookSummary.aggregateG50DueDzd, 38000);

  const bailiff = createBailiffActWithOptionalCpcaDeadline({
    accountId: 'a1',
    businessId: 'b1',
    branchId: 'br1',
    staffId: 's1',
    actNumber: 'HUI-2026-00001',
    matterNumber: 'DOS-2026-001',
    actKind: 'signification',
    bailiffName: 'Me Kaci Huissier',
    recipientName: 'EURL Horizon',
    serviceMode: 'a_personne',
    serviceDate: '2026-05-15',
    feeDzd: 6500,
    recourseToTrigger: 'appel_commercial',
    domicileCategory: 'local',
  });
  assert.equal(bailiff.act.feeCentimes, 650000);
  assert.ok(bailiff.cpcaCalculation);
  assert.equal(bailiff.cpcaCalculation?.baseDays, 30);

  const milestones = createDefaultArbitrationMilestones('2026-06-01');
  assert.equal(milestones.length, 5);
  const progress = evaluateArbitrationTimelineStatus({ milestones, status: 'active' });
  assert.equal(progress.completedCount, 1);
  assert.equal(progress.progressPercent, 20);
});

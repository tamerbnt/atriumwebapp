import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultFreelanceContractTemplates,
  buildRecurringDraftFromInvoice,
  canTransitionGalleryStage,
  computeAuthoritativeElapsedSeconds,
  computeInvoiceDzdEquivalent,
  computeInvoiceDzdEquivalentCentimes,
  computeTranslationQuote,
  detectPhotoShootOverlap,
  evaluateAutoEntrepreneurTurnover,
  evaluateFreelanceOverdueReminders,
  formatNextSwornRegisterNumber,
  renderFreelanceContractBody,
  splitCrossMidnightTimeSpan,
  validateInvoiceCurrencyUpdate,
  validateTimeLogMutation,
} from './freelanceDepth';
import type {
  FreelanceAutoEntrepreneurConfig,
  FreelanceInvoice,
  FreelancePhotoShoot,
  ReminderRule,
} from '../types/index';

test('computeAuthoritativeElapsedSeconds stays accurate across sleep/throttling and pause/resume', () => {
  const t0 = Date.parse('2026-11-27T10:00:00Z');
  const elapsedAfterSleep = computeAuthoritativeElapsedSeconds(
    {
      isRunning: true,
      isPaused: false,
      startedAt: '2026-11-27T10:00:00Z',
      accumulatedSeconds: 120,
      elapsedSeconds: 121, // stale tick counter ignored while running
    },
    t0 + 45 * 60 * 1000
  );
  assert.equal(elapsedAfterSleep, 120 + 2700);

  const paused = computeAuthoritativeElapsedSeconds(
    {
      isRunning: true,
      isPaused: true,
      startedAt: '2026-11-27T10:00:00Z',
      accumulatedSeconds: 2820,
      elapsedSeconds: 2820,
    },
    t0 + 120 * 60 * 1000
  );
  assert.equal(paused, 2820);
});

test('splitCrossMidnightTimeSpan splits multi-day intervals with zero lost seconds', () => {
  const twoDays = splitCrossMidnightTimeSpan('2026-11-27T23:30:00Z', '2026-11-28T01:15:00Z');
  assert.equal(twoDays.length, 2);
  assert.equal(twoDays[0].date, '2026-11-27');
  assert.equal(twoDays[0].durationSeconds, 1800);
  assert.equal(twoDays[1].date, '2026-11-28');
  assert.equal(twoDays[1].durationSeconds, 4500);

  const threeDays = splitCrossMidnightTimeSpan('2026-11-27T23:50:00Z', '2026-11-29T00:10:30Z');
  assert.equal(threeDays.length, 3);
  assert.deepEqual(
    threeDays.map((s) => s.date),
    ['2026-11-27', '2026-11-28', '2026-11-29']
  );
  const sumSecs = threeDays.reduce((acc, s) => acc + s.durationSeconds, 0);
  assert.equal(sumSecs, 600 + 86400 + 630);
});

test('validateTimeLogMutation blocks invoiced time logs unless explicitly uninvoicing', () => {
  assert.deepEqual(validateTimeLogMutation({ isInvoiced: false }), { allowed: true });
  assert.deepEqual(validateTimeLogMutation({ isInvoiced: true }), {
    allowed: false,
    code: 'INVOICED_TIME_LOG_IMMUTABLE',
  });
  assert.deepEqual(
    validateTimeLogMutation({ isInvoiced: true }, { allowUninvoicing: true }),
    { allowed: true }
  );
});

test('validateInvoiceCurrencyUpdate permits Draft currency/FX edits and locks Sent/Paid/Overdue', () => {
  assert.deepEqual(
    validateInvoiceCurrencyUpdate({ status: 'Draft', currency: 'EUR', fxRateToDzd: 145 }, 'USD', 135),
    { allowed: true }
  );
  assert.deepEqual(
    validateInvoiceCurrencyUpdate({ status: 'Sent', currency: 'EUR', fxRateToDzd: 145 }, 'USD', 145),
    { allowed: false, code: 'NON_DRAFT_INVOICE_CURRENCY_LOCKED' }
  );
  assert.deepEqual(
    validateInvoiceCurrencyUpdate({ status: 'Paid', currency: 'EUR', fxRateToDzd: 145 }, 'EUR', 150),
    { allowed: false, code: 'NON_DRAFT_INVOICE_CURRENCY_LOCKED' }
  );
  assert.deepEqual(
    validateInvoiceCurrencyUpdate({ status: 'Sent', currency: 'EUR', fxRateToDzd: 145 }, 'EUR', 145),
    { allowed: true }
  );
  assert.equal(computeInvoiceDzdEquivalentCentimes(100, 'EUR', 145), 1450000);
  assert.equal(computeInvoiceDzdEquivalent(100, 'EUR', 145), 14500);
});

test('Auto-Entrepreneur evaluation warns unverified by default and computes threshold/contributions in DZD', () => {
  const cfg: FreelanceAutoEntrepreneurConfig = {
    id: 'ae_1',
    effectiveFrom: '2026-01-01',
    annualTurnoverCeilingDzd: 5000000,
    contributionRatePct: 5,
    taxRatePct: 0.5,
    verificationStatus: 'unverified',
    createdAt: '2026-01-01T00:00:00Z',
  };
  const paidEur: FreelanceInvoice = {
    id: 'inv_1',
    tenantId: 'acc',
    facilityId: 'br',
    clientId: 'c1',
    clientName: 'Alpha',
    clientEmail: 'a@b.dz',
    invoiceNumber: 'INV-2026-001',
    currency: 'EUR',
    fxRateToDzd: 150,
    totalAmountDzdCentimes: 420000000, // 4,200,000 DZD (84% of 5M)
    issueDate: '2026-05-01',
    dueDate: '2026-05-15',
    status: 'Paid',
    paidAt: '2026-05-10T10:00:00Z',
    items: [],
    subtotal: 28000,
    taxPercent: 0,
    taxAmount: 0,
    totalAmount: 28000,
    createdAt: '2026-05-01T10:00:00Z',
  };

  const summary = evaluateAutoEntrepreneurTurnover({
    invoices: [paidEur],
    configs: [cfg],
    year: 2026,
    asOfDate: '2026-06-01',
  });

  assert.equal(summary.isUnverified, true);
  assert.equal(summary.collectedTurnoverDzd, 4200000);
  assert.equal(summary.utilizationPct, 84);
  assert.equal(summary.isApproachingCeiling, true);
  assert.equal(summary.isOverCeiling, false);
  assert.equal(summary.estimatedContributionDzd, 210000);
  assert.equal(summary.estimatedTaxDzd, 21000);
});

test('Recurring invoice draft generation & 6.5 overdue reminder evaluation', () => {
  const source: FreelanceInvoice = {
    id: 'inv_src',
    tenantId: 'acc',
    facilityId: 'br',
    clientId: 'c1',
    clientName: 'Nadia',
    clientEmail: 'nadia@dz.com',
    invoiceNumber: 'INV-2026-100',
    currency: 'DZD',
    issueDate: '2026-01-01',
    dueDate: '2026-01-16',
    status: 'Overdue',
    items: [{ id: 'i1', description: 'Retainer', quantity: 1, unitRate: 50000, total: 50000 }],
    subtotal: 50000,
    taxPercent: 0,
    taxAmount: 0,
    totalAmount: 50000,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const nextDraft = buildRecurringDraftFromInvoice(source, 'INV-2026-101', '2026-02-01');
  assert.equal(nextDraft.status, 'Draft');
  assert.equal(nextDraft.dueDate, '2026-02-16');
  assert.equal(nextDraft.nextRecurrenceDate, '2026-03-01');

  const rules: ReminderRule[] = [
    {
      id: 'rule_1',
      accountId: 'acc',
      businessId: 'biz',
      eventType: 'invoice_overdue',
      name: 'Overdue',
      isEnabled: true,
      leadDays: 3,
      channels: ['in_app'],
      respectQuietHours: true,
      cooldownHours: 24,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];
  const candidates = evaluateFreelanceOverdueReminders([source], rules, '2026-01-25');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].daysOverdue, 9);
});

test('Contract templates, translator sworn quotes/register & photographer overlap guard', () => {
  const templates = buildDefaultFreelanceContractTemplates();
  const { renderedBody, missingVariables } = renderFreelanceContractBody(templates[0].bodyTemplate, {
    provider_name: 'Atlas Studio',
    client_name: 'Karim',
    client_company: 'BTP Nord',
    scope_summary: 'Mobile Portal',
    contract_value: 120000,
    currency: 'DZD',
    effective_date: '2026-11-27',
  });
  assert.equal(missingVariables.length, 0);
  assert.ok(renderedBody.includes('Atlas Studio'));

  const quote = computeTranslationQuote({ pricingUnit: 'word', unitCount: 1250, unitRate: 4.5 });
  assert.equal(quote.totalAmount, 5625);
  assert.equal(
    formatNextSwornRegisterNumber([{ registerNumber: 'REG-2026-0007' }], 2026),
    'REG-2026-0008'
  );

  const existing: FreelancePhotoShoot[] = [
    {
      id: 'sh_1',
      clientId: 'c1',
      clientName: 'Meriem',
      shootTitle: 'Product Studio',
      shootDate: '2026-12-05',
      startTime: '10:00',
      endTime: '12:00',
      packageFee: 30000,
      currency: 'DZD',
      galleryStatus: 'scheduled',
      deliverablesCount: 40,
      selectedCount: 0,
      watermarkEnabled: true,
      createdAt: '2026-11-27T00:00:00Z',
    },
  ];
  // Adjacent end-to-start allowed (half-open)
  assert.equal(
    detectPhotoShootOverlap(
      { shootDate: '2026-12-05', startTime: '12:00', endTime: '14:00', galleryStatus: 'scheduled' },
      existing
    ).hasConflict,
    false
  );
  // Overlapping rejected
  assert.equal(
    detectPhotoShootOverlap(
      { shootDate: '2026-12-05', startTime: '11:30', endTime: '13:00', galleryStatus: 'scheduled' },
      existing
    ).hasConflict,
    true
  );
  assert.equal(canTransitionGalleryStage('watermarked_preview', 'final_delivered'), true);
});

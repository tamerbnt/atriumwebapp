import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateVoucherCode,
  checkQuota,
  calculateDaysRemaining,
  formatMoney,
  getStatusConfig,
  getCategoryTerminology,
} from './rules.ts';

test('voucher validator approves valid Starter, Pro, and Enterprise codes', () => {
  const proResult = validateVoucherCode('ATR-PRO-LIFE-A4B2-C9D1');
  assert.equal(proResult.isValid, true);
  assert.equal(proResult.tierRank, 2);
  assert.equal(proResult.tierName, 'Pro');

  const starterResult = validateVoucherCode('ATR-STARTER-LIFE-1122-3344');
  assert.equal(starterResult.isValid, true);
  assert.equal(starterResult.tierRank, 1);
  assert.equal(starterResult.tierName, 'Starter');

  const entResult = validateVoucherCode('ATR-ENTERPRISE-LIFE-FFFF-0000');
  assert.equal(entResult.isValid, true);
  assert.equal(entResult.tierRank, 3);
  assert.equal(entResult.tierName, 'Enterprise');
});

test('voucher validator rejects invalid or corrupted voucher codes', () => {
  const invalid1 = validateVoucherCode('INVALID-CODE');
  assert.equal(invalid1.isValid, false);

  const invalid2 = validateVoucherCode('ATR-UNKNOWN-LIFE-1234-5678');
  assert.equal(invalid2.isValid, false);

  const invalid3 = validateVoucherCode('');
  assert.equal(invalid3.isValid, false);
});

test('checkQuota correctly evaluates capacity and percentage', () => {
  const quotaUnder = checkQuota(2, 5);
  assert.equal(quotaUnder.isAllowed, true);
  assert.equal(quotaUnder.remaining, 3);
  assert.equal(quotaUnder.percentageUsed, 40);

  const quotaAtLimit = checkQuota(5, 5);
  assert.equal(quotaAtLimit.isAllowed, false);
  assert.equal(quotaAtLimit.remaining, 0);
  assert.equal(quotaAtLimit.percentageUsed, 100);

  const quotaUnlimited = checkQuota(10, -1);
  assert.equal(quotaUnlimited.isAllowed, true);
});

test('calculateDaysRemaining handles lifetime vs expiring dates', () => {
  assert.equal(calculateDaysRemaining(true), -1);
  assert.equal(calculateDaysRemaining(false, undefined), 0);
});

test('formatMoney adds currency and tabular format', () => {
  assert.equal(formatMoney(1500, 'DZD'), '1,500 DZD');
});

test('status config maps status to proper visual tokens', () => {
  const active = getStatusConfig('Active');
  assert.equal(active.label, 'Active');
  assert.equal(active.color, '#10B981');

  const expired = getStatusConfig('Expired');
  assert.equal(expired.label, 'Expired');
  assert.equal(expired.color, '#EF4444');
});

test('getCategoryTerminology dynamically adapts terms to vertical', () => {
  const gymTerms = getCategoryTerminology('membership_session', 'en');
  assert.equal(gymTerms.members, 'Members');
  assert.equal(gymTerms.scheduler, 'Class Schedule');

  const salonTerms = getCategoryTerminology('appointment_service', 'fr');
  assert.equal(salonTerms.members, 'Clients');
  assert.equal(salonTerms.registration, 'Rendez-vous');

  const restaurantTerms = getCategoryTerminology('pos_inventory', 'ar');
  assert.equal(restaurantTerms.members, 'الزبائن');
});

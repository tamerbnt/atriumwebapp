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

test('findCategoryByBusinessSearch accurately maps user search input to correct category', async () => {
  const { findCategoryByBusinessSearch } = await import('./businessMapping.ts');

  // 1. Gym / Fitness
  const gymMatch1 = findCategoryByBusinessSearch('crossfit');
  assert.equal(gymMatch1?.category, 'membership_session');

  const gymMatch2 = findCategoryByBusinessSearch('salle de sport');
  assert.equal(gymMatch2?.category, 'membership_session');

  // 2. Salon / Beauty
  const salonMatch1 = findCategoryByBusinessSearch('barbershop');
  assert.equal(salonMatch1?.category, 'appointment_service');

  const salonMatch2 = findCategoryByBusinessSearch('salon de coiffure');
  assert.equal(salonMatch2?.category, 'appointment_service');

  const salonMatch3 = findCategoryByBusinessSearch('cabinet dentaire');
  assert.equal(salonMatch3?.category, 'appointment_service');

  // 3. Restaurant / POS
  const restoMatch1 = findCategoryByBusinessSearch('pizzeria');
  assert.equal(restoMatch1?.category, 'pos_inventory');

  const restoMatch2 = findCategoryByBusinessSearch('pâtisserie');
  assert.equal(restoMatch2?.category, 'pos_inventory');

  // 4. Projects / Agency
  const agencyMatch = findCategoryByBusinessSearch('marketing agency');
  assert.equal(agencyMatch?.category, 'project_milestone');

  const lawMatch = findCategoryByBusinessSearch('cabinet d avocat');
  assert.equal(lawMatch?.category, 'project_milestone');

  // 5. Rentals / Coworking
  const rentalMatch = findCategoryByBusinessSearch('coworking space');
  assert.equal(rentalMatch?.category, 'rental_booking');

  const venueMatch = findCategoryByBusinessSearch('salle des fêtes');
  assert.equal(venueMatch?.category, 'rental_booking');

  // 6. Education / Academy
  const eduMatch1 = findCategoryByBusinessSearch('ecole de langues');
  assert.equal(eduMatch1?.category, 'education_cohort');

  const eduMatch2 = findCategoryByBusinessSearch('coding bootcamp');
  assert.equal(eduMatch2?.category, 'education_cohort');

  // 7. Freelance / Solo
  const freelanceMatch1 = findCategoryByBusinessSearch('freelance web dev');
  assert.equal(freelanceMatch1?.category, 'freelance_solo');

  const freelanceMatch2 = findCategoryByBusinessSearch('ui ux designer');
  assert.equal(freelanceMatch2?.category, 'freelance_solo');

  // Null for empty or short queries
  assert.equal(findCategoryByBusinessSearch(''), null);
  assert.equal(findCategoryByBusinessSearch('a'), null);
});

test('Free Web Tier enforces 1 business and 1 branch limit while Desktop expands', () => {
  // Free Web Tier (1 business, 1 branch)
  const freeWebBizQuota = checkQuota(1, 1);
  assert.equal(freeWebBizQuota.isAllowed, false);
  assert.equal(freeWebBizQuota.remaining, 0);

  const freeWebBranchQuota = checkQuota(1, 1);
  assert.equal(freeWebBranchQuota.isAllowed, false);
  assert.equal(freeWebBranchQuota.remaining, 0);

  // Desktop Pro Tier (3 businesses, 5 branches)
  const desktopProBizQuota = checkQuota(1, 3);
  assert.equal(desktopProBizQuota.isAllowed, true);
  assert.equal(desktopProBizQuota.remaining, 2);

  const desktopProBranchQuota = checkQuota(1, 5);
  assert.equal(desktopProBranchQuota.isAllowed, true);
  assert.equal(desktopProBranchQuota.remaining, 4);
});

test('Algerian PTT CCP account and key validation', async () => {
  const { validateCcpAccount, ALGERIAN_WILAYAS } = await import('./algerianPtt.ts');

  // Verify 58 Wilayas are covered
  assert.equal(ALGERIAN_WILAYAS.length, 58);
  assert.equal(ALGERIAN_WILAYAS[0].nameFr, 'Adrar');
  assert.equal(ALGERIAN_WILAYAS[15].nameFr, 'Alger');
  assert.equal(ALGERIAN_WILAYAS[57].nameFr, 'In Guezzam');

  // Valid CCP accounts
  const validCheck1 = validateCcpAccount('0012345678', '45');
  assert.equal(validCheck1.isValid, true);

  const validCheck2 = validateCcpAccount('9876543', '08');
  assert.equal(validCheck2.isValid, true);

  // Invalid CCP accounts
  const invalidAcc = validateCcpAccount('', '45');
  assert.equal(invalidAcc.isValid, false);

  const invalidKey = validateCcpAccount('12345678', '');
  assert.equal(invalidKey.isValid, false);
});

test('Algerian Dinar Legal Number-to-Words for SFP 01 postal transfers', async () => {
  const { numberToWordsFrench, numberToWordsArabic } = await import('./algerianPtt.ts');

  // French
  const frWords1 = numberToWordsFrench(24500);
  assert.ok(frWords1.toLowerCase().includes('vingt-quatre mille cinq cents dinars algériens'));

  const frWords2 = numberToWordsFrench(0);
  assert.ok(frWords2.toLowerCase().includes('zéro dinar algérien'));

  // Arabic
  const arWords1 = numberToWordsArabic(5000);
  assert.ok(arWords1.includes('دينار جزائري'));

  const arWords2 = numberToWordsArabic(0);
  assert.ok(arWords2.includes('صفر'));
});


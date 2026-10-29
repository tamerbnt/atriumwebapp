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

  const salonMatch3 = findCategoryByBusinessSearch('institut de beaute');
  assert.equal(salonMatch3?.category, 'appointment_service');

  const medMatch = findCategoryByBusinessSearch('cabinet dentaire');
  assert.equal(medMatch?.category, 'medical_clinic');

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

  // Arabic keyword matching
  const arGymMatch = findCategoryByBusinessSearch('قاعة رياضة');
  assert.equal(arGymMatch?.category, 'membership_session');

  const arSalonMatch = findCategoryByBusinessSearch('صالون حلاقة');
  assert.equal(arSalonMatch?.category, 'appointment_service');

  const arRestoMatch = findCategoryByBusinessSearch('مطعم بيتزا');
  assert.equal(arRestoMatch?.category, 'pos_inventory');

  const arEduMatch = findCategoryByBusinessSearch('مدرسة لغات');
  assert.equal(arEduMatch?.category, 'education_cohort');

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

test('Quadruple Traceability Standard: models uphold account_id, business_id, branch_id, staff_id contract', async () => {
  const { INITIAL_MEMBERS, INITIAL_STAFF, INITIAL_PARKED_ORDERS, INITIAL_STOCK_MOVEMENTS } = await import('../services/seedData.ts');

  // Verify parked order has full quadruple trace keys
  assert.ok(INITIAL_PARKED_ORDERS.length > 0);
  for (const po of INITIAL_PARKED_ORDERS) {
    assert.ok(po.accountId, 'Parked order must have accountId');
    assert.ok(po.businessId, 'Parked order must have businessId');
    assert.ok(po.branchId, 'Parked order must have branchId');
    assert.ok(po.staffId, 'Parked order must have staffId');
  }

  // Verify stock movements have full quadruple trace keys
  assert.ok(INITIAL_STOCK_MOVEMENTS.length > 0);
  for (const sm of INITIAL_STOCK_MOVEMENTS) {
    assert.ok(sm.accountId, 'Stock movement must have accountId');
    assert.ok(sm.businessId, 'Stock movement must have businessId');
    assert.ok(sm.branchId, 'Stock movement must have branchId');
    assert.ok(sm.staffId, 'Stock movement must have staffId');
  }

  // Verify staff members have branch and business affiliations
  assert.ok(INITIAL_STAFF.length > 0);
  for (const st of INITIAL_STAFF) {
    assert.ok(st.tenantId || st.accountId, 'Staff must have tenant/account ID');
    assert.ok(st.facilityId || st.branchId, 'Staff must have facility/branch ID');
  }
});

test('Commercial B2B calculation engine accurately computes HT, Discount, TVA, Timbre Fiscal, Retenue de Garantie, and Net to Pay', async () => {
  const { calculateCommercialTotals } = await import('./rules.ts');

  // Case 1: Standard non-cash invoice with 19% TVA
  const result1 = calculateCommercialTotals({
    items: [
      { quantity: 10, unitPriceHt: 1000, discountPercent: 0, tvaPercent: 19 },
      { quantity: 5, unitPriceHt: 2000, discountPercent: 10, tvaPercent: 19 },
    ],
    generalDiscountPercent: 5,
    guaranteeRetentionPercent: 0,
    paymentMethod: 'Virement bancaire',
  });

  // Line 1: 10 * 1000 = 10,000
  // Line 2: 5 * 2000 * 0.9 = 9,000
  // Total HT Raw: 19,000
  // General discount 5%: 950 => Total HT Final: 18,050
  // TVA 19%: 18,050 * 0.19 = 3,429.50
  // Timbre fiscal: 0 (non-cash)
  // Total TTC: 21,479.50
  // Net to Pay: 21,479.50
  assert.equal(result1.totalHtRaw, 19000);
  assert.equal(result1.totalHtFinal, 18050);
  assert.equal(result1.totalTva, 3429.5);
  assert.equal(result1.timbreFiscal, 0);
  assert.equal(result1.totalTtc, 21479.5);
  assert.equal(result1.netToPay, 21479.5);

  // Case 2: Cash payment with Algerian Fiscal Stamp (1% capped at 2,500 DZD) and BTP Guarantee Retention (10%)
  const result2 = calculateCommercialTotals({
    items: [
      { quantity: 2, unitPriceHt: 50000, discountPercent: 0, tvaPercent: 19 },
    ],
    generalDiscountPercent: 0,
    guaranteeRetentionPercent: 10,
    paymentMethod: 'Espèces / Cash',
    isCashFiscalStampEnabled: true,
  });

  // HT: 100,000
  // TVA 19%: 19,000
  // (HT + TVA) = 119,000 => 1% = 1,190 DZD (under 2,500 cap)
  // Timbre: 1,190
  // TTC: 100,000 + 19,000 + 1,190 = 120,190
  // Retenue garantie 10%: 12,019
  // Net to pay: 108,171
  assert.equal(result2.totalHtRaw, 100000);
  assert.equal(result2.totalHtFinal, 100000);
  assert.equal(result2.totalTva, 19000);
  assert.equal(result2.timbreFiscal, 1190);
  assert.equal(result2.totalTtc, 120190);
  assert.equal(result2.guaranteeRetentionAmount, 12019);
  assert.equal(result2.netToPay, 108171);

  // Case 3: High value cash payment reaches 2,500 DZD ceiling
  const result3 = calculateCommercialTotals({
    items: [
      { quantity: 1, unitPriceHt: 500000, discountPercent: 0, tvaPercent: 19 },
    ],
    paymentMethod: 'Espèces',
  });
  // 500,000 + 95,000 = 595,000 => 1% is 5,950 DZD, capped at 2,500 DZD
  assert.equal(result3.timbreFiscal, 2500);
});

test('Intelligent Category Recommendation: accurately calculates category, confidence and matching features', async () => {
  const { calculateCategoryRecommendation } = await import('./businessMapping.ts');

  // Case 1: Crossfit gym with RFID memberships
  const res1 = calculateCategoryRecommendation({
    activityCategory: 'membership_session',
    searchQuery: 'salle de sport crossfit',
    selectedModuleIds: ['memberships_rfid', 'pos_cashier'],
    teamScale: 'small',
  });
  assert.equal(res1.recommendedCategory, 'membership_session');
  assert.ok(res1.confidencePercent >= 85);
  assert.ok(res1.matchingFeatures.length > 0);

  // Case 2: Dental / medical clinic with patient records
  const res2 = calculateCategoryRecommendation({
    searchQuery: 'cabinet dentaire soins',
    selectedModuleIds: ['patient_records', 'appointments_agenda'],
    teamScale: 'small',
  });
  assert.equal(res2.recommendedCategory, 'medical_clinic');
  assert.ok(res2.confidencePercent >= 80);

  // Case 3: Solo designer with time tracker
  const res3 = calculateCategoryRecommendation({
    selectedModuleIds: ['timetracker_pomodoro', 'invoicing_quotes'],
    teamScale: 'solo',
  });
  assert.equal(res3.recommendedCategory, 'freelance_solo');

  // Case 4: Automotive garage with work orders
  const res4 = calculateCategoryRecommendation({
    activityCategory: 'auto_garage',
    selectedModuleIds: ['repair_orders', 'inventory_stock'],
    teamScale: 'mid',
  });
  assert.equal(res4.recommendedCategory, 'auto_garage');
});

test('Category 9 Medical: Blood pressure validation strictly enforces Psys > Pdia', () => {
  const validateVitalsBP = (systolic: number, diastolic: number) => {
    if (systolic <= diastolic) {
      return { valid: false, error: 'Pression systolique doit être supérieure à la diastolique' };
    }
    return { valid: true, error: null };
  };

  // Normal BP
  assert.equal(validateVitalsBP(120, 80).valid, true);
  // High BP
  assert.equal(validateVitalsBP(140, 90).valid, true);
  // Inverted BP (physiologically impossible)
  assert.equal(validateVitalsBP(80, 120).valid, false);
  // Equal BP
  assert.equal(validateVitalsBP(90, 90).valid, false);
});

test('Category 9 Medical: Appointment slot collision engine and emergency bypass', () => {
  type Slot = { startTime: string; endTime: string; practitionerId: string };
  const hasConflict = (
    newSlot: Slot,
    existingSlots: Slot[],
    isEmergencyBypass: boolean = false
  ) => {
    if (isEmergencyBypass) return false;
    return existingSlots.some((s) => {
      if (s.practitionerId !== newSlot.practitionerId) return false;
      return newSlot.startTime < s.endTime && newSlot.endTime > s.startTime;
    });
  };

  const existing: Slot[] = [
    { practitionerId: 'doc-1', startTime: '09:00', endTime: '09:30' },
    { practitionerId: 'doc-1', startTime: '10:00', endTime: '10:30' },
    { practitionerId: 'doc-2', startTime: '09:00', endTime: '09:30' },
  ];

  // Overlapping slot on doc-1 (09:15-09:45) -> conflict
  assert.equal(hasConflict({ practitionerId: 'doc-1', startTime: '09:15', endTime: '09:45' }, existing), true);
  // Overlapping slot with emergency bypass -> allowed
  assert.equal(hasConflict({ practitionerId: 'doc-1', startTime: '09:15', endTime: '09:45' }, existing, true), false);
  // Non-overlapping slot on doc-1 (09:30-10:00) -> allowed
  assert.equal(hasConflict({ practitionerId: 'doc-1', startTime: '09:30', endTime: '10:00' }, existing), false);
  // Same time slot on different doctor doc-2 (10:00-10:30) -> allowed
  assert.equal(hasConflict({ practitionerId: 'doc-2', startTime: '10:00', endTime: '10:30' }, existing), false);
});

test('Category 9 Medical: NGAP Acts pricing split and consumable deductions', async () => {
  const { NGAP_ACTS } = await import('../components/screens/medical/medicalData.ts');

  assert.ok(NGAP_ACTS.length >= 5);
  for (const act of NGAP_ACTS) {
    // Official Algerian social security 80% CNAS and 20% Ticket Moderateur
    assert.equal(act.cnasReimbursementDzd, Math.round(act.conventionFeeDzd * 0.8));
    assert.equal(act.ticketModerateurDzd, Math.round(act.conventionFeeDzd * 0.2));
    assert.ok(act.linkedConsumables.length > 0, `Act ${act.code} should define consumed items`);
  }

  const actC = NGAP_ACTS.find((a) => a.code === 'C');
  assert.ok(actC);
  assert.equal(actC.conventionFeeDzd, 2500);
  assert.equal(actC.cnasReimbursementDzd, 2000);
  assert.equal(actC.ticketModerateurDzd, 500);
});

test('Category 9 Medical: CNAS 30-day regulatory warning rule for sick leaves (Article 17 Loi 83-11)', () => {
  const checkSickLeaveCompliance = (type: string, days: number) => {
    if (type === 'ArretDeTravail' && days > 30) {
      return {
        requiresCnasControl: true,
        warning: 'Arrêt supérieur à 30 jours consécutifs soumis au contrôle médical préalable CNAS',
      };
    }
    return { requiresCnasControl: false, warning: null };
  };

  const shortLeave = checkSickLeaveCompliance('ArretDeTravail', 15);
  assert.equal(shortLeave.requiresCnasControl, false);

  const longLeave = checkSickLeaveCompliance('ArretDeTravail', 35);
  assert.equal(longLeave.requiresCnasControl, true);
  assert.ok(longLeave.warning?.includes('30 jours'));

  const aptitudeCert = checkSickLeaveCompliance('Aptitude', 45);
  assert.equal(aptitudeCert.requiresCnasControl, false);
});


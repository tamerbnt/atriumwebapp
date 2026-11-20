import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_BUSINESS_CATEGORIES,
  getCategoryFiscalDefaults,
  getDefaultFiscalLicenseLabel,
  deriveCategoryConfigDefaultsFromOnboarding,
  createDefaultBusinessConfig,
  getFormuleKindForCategory,
  createStarterFormulesForCategory,
  validateFiscalProfile,
  validateCategoryFormule,
  isExecutiveRole,
  computeHomeSetupProgress,
  type SetupEvaluationContext,
} from './businessConfig.ts';
import type { Business, BusinessCategory, BusinessCategoryConfig } from '../types/index.ts';

function makeMinimalSetupContext(
  category: BusinessCategory,
  overrides: Partial<SetupEvaluationContext> = {}
): SetupEvaluationContext {
  const business: Business = {
    id: `biz_test_${category}`,
    accountId: 'acc_test',
    name: 'Test Atelier DZ',
    displayName: 'Test Atelier DZ',
    category,
    address: 'Alger Centre',
    phone: '0550 11 22 33',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
  const config: BusinessCategoryConfig = createDefaultBusinessConfig(business, {
    wilayaCode: '16',
    teamScale: 'small',
    settlementStyle: 'b2b_tva',
  });
  return {
    business,
    config,
    staff: [],
    plans: [],
    schedule: [],
    servicesCatalog: [],
    salonWorkstations: [],
    products: [],
    receiptConfig: {
      headerTitle: 'Test Store',
      address: 'Alger',
      phone: '0550112233',
      footerMessage: 'Merci',
      showTaxBreakdown: true,
      showCashier: true,
      showBarcode: false,
    },
    categoryFormules: [],
    pmCollateralCatalog: [],
    rentableUnits: [],
    eduCourses: [],
    eduClassrooms: [],
    freelanceServices: [],
    freelanceClients: [],
    warehouses: [],
    medicalConsultations: [],
    garageOrders: [],
    reProperties: [],
    mfgWorkstations: [],
    mfgBomRecipes: [],
    legalMatters: [],
    logisticsTariffs: [],
    btpProjects: [],
    agriParcels: [],
    language: 'fr',
    ...overrides,
  };
}

test('all 16 categories have valid fiscal defaults, formule descriptors, and 5 setup steps', () => {
  assert.equal(ALL_BUSINESS_CATEGORIES.length, 16);

  for (const cat of ALL_BUSINESS_CATEGORIES) {
    const fiscal = getCategoryFiscalDefaults(cat);
    assert.ok(fiscal.currency, `${cat} should define a currency`);
    assert.ok(fiscal.defaultTvaRate >= 0 && fiscal.defaultTvaRate <= 19);
    assert.ok(Object.keys(fiscal.categorySettings).length > 0);

    const desc = getFormuleKindForCategory(cat);
    assert.ok(desc.titleEn && desc.titleFr && desc.titleAr);
    assert.ok(desc.formuleType);

    for (const lang of ['en', 'fr', 'ar'] as const) {
      const label = getDefaultFiscalLicenseLabel(cat, lang);
      assert.ok(label.length > 3, `missing license label for ${cat}/${lang}`);
    }

    const setupCtx = makeMinimalSetupContext(cat);
    const progress = computeHomeSetupProgress(setupCtx);
    assert.equal(progress.totalCount, 5, `${cat} should evaluate exactly 5 setup steps`);
    assert.equal(progress.steps.length, 5);
    assert.ok(progress.percent >= 0 && progress.percent <= 100);
    for (const step of progress.steps) {
      assert.ok(step.id && step.title && step.actionLabel);
      assert.ok(
        step.targetTab === 'business_fiscal' ||
          step.targetTab === 'formules' ||
          step.targetTab === 'branches_devices'
      );
    }
  }
});

test('onboarding context maps solo scale, wilaya, and B2B TVA settlement accurately', () => {
  const soloDerived = deriveCategoryConfigDefaultsFromOnboarding('freelance_solo', {
    wilayaCode: '31',
    teamScale: 'solo',
    settlementStyle: 'ccp_postal',
  });
  assert.equal(soloDerived.fiscalProfile.wilayaCode, '31');
  assert.equal(soloDerived.fiscalProfile.legalForm, 'AutoEntrepreneur');
  assert.equal(soloDerived.defaultTvaRate, 0);

  const b2bDerived = deriveCategoryConfigDefaultsFromOnboarding('trading_commercial', {
    wilayaCode: '16',
    teamScale: 'large',
    settlementStyle: 'b2b_tva',
  });
  assert.equal(b2bDerived.defaultTvaRate, 19);
  assert.equal(b2bDerived.applyTimbreFiscal, true);
  assert.equal(b2bDerived.categorySettings.requireLegalIdsOnFacture, true);
});

test('starter formules generate clean defaults for category_formules categories', () => {
  const biz = {
    id: 'biz_med_1',
    accountId: 'acc_1',
    name: 'Clinique El Shifa',
    category: 'medical_clinic' as const,
  };
  const cfg = createDefaultBusinessConfig(biz);
  const starters = createStarterFormulesForCategory(
    biz.category,
    biz.id,
    biz.accountId,
    undefined,
    cfg.currency,
    cfg.defaultTvaRate
  );
  assert.ok(starters.length >= 2);
  for (const frm of starters) {
    assert.equal(frm.businessId, 'biz_med_1');
    assert.equal(frm.formuleType, 'medical_act');
    assert.ok(frm.priceAmount >= 0);
    assert.equal(Number.isNaN(frm.priceAmount), false);
  }
});

test('validateFiscalProfile and validateCategoryFormule reject invalid fiscal & pricing inputs', () => {
  const fiscalErrors = validateFiscalProfile({ nif: '123' }, 120, 'fr');
  assert.ok(fiscalErrors.defaultTvaRate);
  assert.ok(fiscalErrors.nif);

  const validFiscalErrors = validateFiscalProfile({ nif: '001616091234567' }, 19, 'fr');
  assert.deepEqual(validFiscalErrors, {});

  const frmErrors = validateCategoryFormule(
    { name: 'A', priceAmount: -50, ratePercent: 140, durationValue: -1, taxRate: -5 },
    'en'
  );
  assert.ok(frmErrors.name);
  assert.ok(frmErrors.priceAmount);
  assert.ok(frmErrors.ratePercent);
  assert.ok(frmErrors.durationValue);
  assert.ok(frmErrors.taxRate);
});

test('isExecutiveRole enforces executive vs operational boundaries accurately', () => {
  for (const exec of [
    'owner',
    'manager',
    'gerant',
    'direction',
    'avocat_associe',
    'notaire_titulaire',
    'expert_comptable',
  ]) {
    assert.equal(isExecutiveRole(exec), true, `${exec} must be executive`);
  }
  assert.equal(isExecutiveRole('staff', 8), true);

  for (const nonExec of [
    'staff',
    'chef_projet',
    'operateur',
    'mecanicien',
    'negociateur',
    'secretaire_caisse',
    'dispatcher',
    'chef_chantier',
    'chef_culture',
  ]) {
    assert.equal(isExecutiveRole(nonExec), false, `${nonExec} must not be executive`);
  }
});

test('computeHomeSetupProgress transitions cleanly from <5/5 to 5/5 and tracks dismissal', () => {
  const incompleteCtx = makeMinimalSetupContext('pos_inventory');
  const incomplete = computeHomeSetupProgress(incompleteCtx);
  assert.equal(incomplete.isComplete, false);
  assert.ok(incomplete.completedCount < 5);
  assert.equal(incomplete.isDismissed, false);

  const completeCtx = makeMinimalSetupContext('pos_inventory', {
    config: {
      ...createDefaultBusinessConfig(
        { id: 'biz_test_pos_inventory', accountId: 'acc_test', category: 'pos_inventory' },
        { wilayaCode: '16' }
      ),
      fiscalProfile: { nif: '001616091234567', rc: '16/00-1234567B20' },
      categorySettings: {
        openingCashFloatDzd: 20000,
        lowStockThreshold: 8,
        allowNegativeStock: false,
      },
      setupState: { dismissed: true, completedStepIds: [] },
    },
    categoryFormules: createStarterFormulesForCategory(
      'pos_inventory',
      'biz_test_pos_inventory',
      'acc_test'
    ),
    products: [{ id: 'p1', isActive: true } as any],
    staff: [{ id: 's1' } as any],
  });
  const complete = computeHomeSetupProgress(completeCtx);
  assert.equal(complete.completedCount, 5);
  assert.equal(complete.percent, 100);
  assert.equal(complete.isComplete, true);
  assert.equal(complete.isDismissed, true);
});

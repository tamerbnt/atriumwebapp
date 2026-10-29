import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMandateCommission,
  computeRentalTimbreFiscal,
  calculateNotaryClosingCosts,
  calculateSmartMatchScore,
  calculateTitleStrengthScore,
} from './realEstateRules.ts';

test('Real Estate: Décret 09-18 Agency Mandate Commission Tranches', () => {
  // Case 1: Under 1,000,000 DZD (3%)
  const res1 = calculateMandateCommission(500_000, 'DecreeTranches');
  assert.equal(res1.baseHt, 15_000);
  assert.equal(res1.tva, 2_850);
  assert.equal(res1.totalTtc, 17_850);

  // Case 2: Exactly 5,000,000 DZD (3% on 1M = 30k + 2% on 4M = 80k -> 110k HT)
  const res2 = calculateMandateCommission(5_000_000, 'DecreeTranches');
  assert.equal(res2.baseHt, 110_000);
  assert.equal(res2.tva, 20_900);
  assert.equal(res2.totalTtc, 130_900);

  // Case 3: 20,000,000 DZD (30k + 80k + 1% on 15M = 150k -> 260k HT)
  const res3 = calculateMandateCommission(20_000_000, 'DecreeTranches');
  assert.equal(res3.baseHt, 260_000);
  assert.equal(res3.tva, 49_400);
  assert.equal(res3.totalTtc, 309_400);

  // Case 4: Flat percent (1.5% on 10,000,000 DZD = 150,000 DZD)
  const resFlat = calculateMandateCommission(10_000_000, 'FlatPercent', 1.5);
  assert.equal(resFlat.baseHt, 150_000);
  assert.equal(resFlat.tva, 28_500);
  assert.equal(resFlat.totalTtc, 178_500);
});

test('Real Estate: Article 317 Timbre Fiscal Gradué on Rent Receipts', () => {
  // Case 1: Under 500 DZD is exempt
  assert.equal(computeRentalTimbreFiscal(400, 'Cash'), 0);

  // Case 2: 2,500 DZD -> 20 DZD
  assert.equal(computeRentalTimbreFiscal(2500, 'Cash'), 20);

  // Case 3: 15,000 DZD -> 100 DZD
  assert.equal(computeRentalTimbreFiscal(15000, 'Cash'), 100);

  // Case 4: 75,000 DZD -> 400 DZD
  assert.equal(computeRentalTimbreFiscal(75000, 'Cash'), 400);

  // Case 5: 120,000 DZD -> 1% = 1,200 DZD
  assert.equal(computeRentalTimbreFiscal(120000, 'Cash'), 1200);

  // Case 6: Non-cash payments (Cheque, BaridiMob, Virement) are exempt
  assert.equal(computeRentalTimbreFiscal(120000, 'Cheque'), 0);
  assert.equal(computeRentalTimbreFiscal(120000, 'BaridiMob'), 0);
  assert.equal(computeRentalTimbreFiscal(120000, 'Virement'), 0);
});

test('Real Estate: Décret 08-243 Notary Closing Simulator', () => {
  // Residential property at 20,000,000 DZD
  const sim = calculateNotaryClosingCosts(20_000_000, 'Residential', 25_000);

  // Droits d'Enregistrement (2.5%) = 500,000 DZD
  assert.equal(sim.droitsEnregistrementDzd, 500_000);

  // Taxe de Publicité Foncière (1.0%) = 200,000 DZD
  assert.equal(sim.taxePubliciteFonciereDzd, 200_000);

  // Notary Emoluments:
  // 500k * 3% = 15k
  // 500k * 2% = 10k
  // 19M * 1% = 190k
  // Total = 215,000 DZD HT
  assert.equal(sim.notaryEmolumentsHtDzd, 215_000);

  // TVA on Notary = 19% of 215,000 = 40,850 DZD
  assert.equal(sim.notaryTvaDzd, 40_850);

  // Total closing costs = 500k + 200k + 215k + 40,850 + 25k = 980,850 DZD
  assert.equal(sim.totalClosingCostsDzd, 980_850);
  assert.equal(sim.totalAcquisitionBudgetDzd, 20_980_850);
});

test('Real Estate: Parametric Smart Matcher and Cadastral Title Score', () => {
  const property = {
    cityWilaya: 'Hydra, Alger',
    priceDzd: 25_000_000,
    propertyType: 'Apartment',
    roomsCount: 4,
    surfaceM2: 140,
  };

  const perfectBuyer = {
    targetWilaya: 'Alger',
    targetCommune: 'Hydra',
    maxBudgetDzd: 26_000_000,
    propertyType: 'Apartment',
    minRooms: 3,
    minSurfaceM2: 120,
  };

  const match = calculateSmartMatchScore(property, perfectBuyer);
  assert.ok(match.score >= 80, `Expected high match score, got ${match.score}`);
  assert.equal(match.matchLevel, 'High');

  // Title strength test
  const cleanTitle = calculateTitleStrengthScore('Acte_Individuel_Livret', true, true);
  assert.equal(cleanTitle.score, 100);
  assert.equal(cleanTitle.badgeColor, 'emerald');

  const paperTitle = calculateTitleStrengthScore('Papier_Timbre_Coutume', false, false);
  assert.equal(paperTitle.score, 30);
  assert.equal(paperTitle.badgeColor, 'rose');
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDecompteProvisoire,
  calculateDelayPenalties,
  calculateConcreteTheoreticalVolume,
  validateConcreteStrength,
  validateCacobatphWeatherStoppage,
  calculatePriceRevisionCoeff,
} from './contractorRules';

describe('Algerian Construction & BTP Rules (contractorRules)', () => {
  it('calculates Décompte Provisoire with 5% Retenue de Garantie and 19% TVA', () => {
    const result = calculateDecompteProvisoire({
      grossAmountCurrentHtDzd: 10_000_000,
      cumulativePreviousGrossHtDzd: 20_000_000,
      retentionPercent: 5,
      hasBankCautionReplacement: false,
      advanceReimbursementRate: 0.15, // 15% advance amortization
      penaltiesDeductedDzd: 0,
      vatRatePercent: 19,
    });

    assert.equal(result.grossAmountCurrentHtDzd, 10_000_000);
    assert.equal(result.cumulativeGrossHtDzd, 30_000_000);
    assert.equal(result.retentionGuaranteeDzd, 500_000); // 5% of 10M
    assert.equal(result.isRetentionCoveredByBankCaution, false);
    assert.equal(result.advanceReimbursementDzd, 1_500_000); // 15% of 10M
    assert.equal(result.netHtDzd, 8_000_000); // 10M - 500k - 1.5M
    assert.equal(result.vatAmountDzd, 1_900_000); // 19% of 10M
    assert.equal(result.netPayableDzd, 9_900_000); // 8M + 1.9M
  });

  it('bypasses 5% cash retention when bank caution guarantee is active', () => {
    const result = calculateDecompteProvisoire({
      grossAmountCurrentHtDzd: 10_000_000,
      cumulativePreviousGrossHtDzd: 0,
      retentionPercent: 5,
      hasBankCautionReplacement: true, // Bank guarantee
      advanceReimbursementRate: 0,
      penaltiesDeductedDzd: 0,
      vatRatePercent: 19,
    });

    assert.equal(result.retentionGuaranteeDzd, 0);
    assert.equal(result.isRetentionCoveredByBankCaution, true);
    assert.equal(result.netHtDzd, 10_000_000);
    assert.equal(result.netPayableDzd, 11_900_000); // 10M + 1.9M TVA
  });

  it('calculates delay penalties and enforces the statutory 10% maximum cap (Décret 15-247)', () => {
    const contractTotal = 50_000_000;
    // Standard daily penalty: 50,000 DZD per day.
    // 30 days late:
    const normalLate = calculateDelayPenalties(contractTotal, 30, 1000);
    assert.equal(normalLate.dailyPenaltyDzd, 50_000);
    assert.equal(normalLate.theoreticalPenaltiesDzd, 1_500_000);
    assert.equal(normalLate.cappedPenaltiesDzd, 1_500_000);
    assert.equal(normalLate.isCapped, false);

    // 150 days late (theoretical: 7,500,000 DZD):
    const severeLate = calculateDelayPenalties(contractTotal, 150, 1000);
    assert.equal(severeLate.theoreticalPenaltiesDzd, 7_500_000);
    assert.equal(severeLate.maxAllowedPenaltiesDzd, 5_000_000); // 10% of 50M
    assert.equal(severeLate.cappedPenaltiesDzd, 5_000_000); // strictly capped
    assert.equal(severeLate.isCapped, true);
  });

  it('computes concrete net and billable volume with standard formwork waste', () => {
    // 20m x 10m x 0.20m slab = 40.00 m3 net. 5% waste = 2.00 m3 -> 42.00 m3
    const vol = calculateConcreteTheoreticalVolume(20, 10, 0.2, 5);
    assert.equal(vol.netVolumeM3, 40.0);
    assert.equal(vol.wasteVolumeM3, 2.0);
    assert.equal(vol.billableExpectedM3, 42.0);
  });

  it('evaluates concrete compressive strength benchmarks at 7d and 28d', () => {
    // For B25, target is 25 MPa
    // 7 days: 70% of 25 = 17.5 MPa
    const ok7d = validateConcreteStrength(18.5, 25, 7);
    assert.equal(ok7d.isConforming, true);
    assert.equal(ok7d.alertLevel, 'OK');

    const low7d = validateConcreteStrength(15.5, 25, 7);
    assert.equal(low7d.isConforming, false);
    assert.equal(low7d.alertLevel, 'WARNING');

    // 28 days:
    const ok28d = validateConcreteStrength(26.2, 25, 28);
    assert.equal(ok28d.isConforming, true);
    assert.equal(ok28d.alertLevel, 'OK');

    const fail28d = validateConcreteStrength(23.1, 25, 28);
    assert.equal(fail28d.isConforming, false);
    assert.equal(fail28d.alertLevel, 'CRITICAL');
  });

  it('evaluates CACOBATPH bad-weather stoppage eligibility according to Décret Exécutif 97-47', () => {
    // Eligible: Heavy rain, 5 hours, with ONM bulletin
    const eligible = validateCacobatphWeatherStoppage(5, 'HeavyRain', 14, true);
    assert.equal(eligible.isEligibleForCacobatph, true);
    assert.equal(eligible.justificationCode, 'INDEMNISATION_VALIDEE');

    // Ineligible: sunny weather
    const notEligibleSun = validateCacobatphWeatherStoppage(6, 'Sunny', 24, true);
    assert.equal(notEligibleSun.isEligibleForCacobatph, false);

    // Ineligible: less than 4 hours
    const notEligibleShort = validateCacobatphWeatherStoppage(2.5, 'HeavyRain', 12, true);
    assert.equal(notEligibleShort.isEligibleForCacobatph, false);
    assert.equal(notEligibleShort.justificationCode, 'DUREE_INSUFFISANTE');

    // Ineligible: missing ONM certificate
    const notEligibleNoOnm = validateCacobatphWeatherStoppage(6, 'HeavyRain', 12, false);
    assert.equal(notEligibleNoOnm.isEligibleForCacobatph, false);
    assert.equal(notEligibleNoOnm.justificationCode, 'BULLETIN_ONM_MANQUANT');
  });

  it('computes parametric price revision formula under CCAG standard', () => {
    // Formula: P = P0 * [0.15 + 0.35*(S/S0) + 0.50*(M/M0)]
    // If labor index rose 10% (110 / 100) and materials rose 20% (120 / 100):
    // P = 0.15 + 0.35 * 1.10 + 0.50 * 1.20 = 0.15 + 0.385 + 0.60 = 1.135
    const revision = calculatePriceRevisionCoeff(110, 100, 120, 100, 0.15, 0.35, 0.5);
    assert.equal(revision.revisionCoefficient, 1.135);
    assert.equal(revision.priceAdjustmentRatio, 0.135); // +13.5% price revision
  });
});

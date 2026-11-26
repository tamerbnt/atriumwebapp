import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateIrg2022,
  calculateAlgerianGrossToNet,
  numberToAlgerianWordsFR,
} from './algerianPayroll.ts';

describe('Algerian Statutory Payroll Engine', () => {
  it('IRG 2022: Exempts incomes <= 30,000 DZD completely', () => {
    const resultLow = calculateIrg2022(20000);
    assert.strictEqual(resultLow.finalIrg, 0);

    const resultThirty = calculateIrg2022(30000);
    assert.strictEqual(resultThirty.finalIrg, 0);
  });

  it('IRG 2022: Correctly computes tax for standard taxable salary with 40% rebate', () => {
    // Taxable gross 50,000 DZD:
    // Tranche 1 (0 - 20k) = 0
    // Tranche 2 (20k - 40k) = 20k * 0.23 = 4,600 DZD
    // Tranche 3 (40k - 50k) = 10k * 0.27 = 2,700 DZD
    // Theoretical = 7,300 DZD
    // 40% rebate = 2,920 DZD -> capped at 1,500 DZD
    // Final IRG = 7,300 - 1,500 = 5,800 DZD
    const res = calculateIrg2022(50000);
    assert.strictEqual(res.theoreticalIrg, 7300);
    assert.strictEqual(res.rebate, 1500);
    assert.strictEqual(res.finalIrg, 5800);
  });

  it('calculateAlgerianGrossToNet: Computes full gross-to-net breakdown', () => {
    const result = calculateAlgerianGrossToNet({
      baseSalary: 60000,
      primesCotisables: [{ label: 'Prime Coaching', amount: 10000 }],
      unexcusedAbsenceDays: 0,
      advancesDeducted: 5000,
    });

    // Brut cotisable = 60,000 + 10,000 = 70,000 DZD
    assert.strictEqual(result.salaireBrutCotisable, 70000);

    // CNAS 9% = 6,300 DZD
    assert.strictEqual(result.cnasSalarial, 6300);

    // CNAS Patronal 26% = 18,200 DZD
    assert.strictEqual(result.cnasPatronal, 18200);

    // Brut imposable = 70,000 - 6,300 = 63,700 DZD
    assert.strictEqual(result.salaireBrutImposable, 63700);

    // Advances deducted = 5,000 DZD
    assert.strictEqual(result.acomptesDeduits, 5000);

    // Net à payer > 0 and accurately calculated
    assert.ok(result.netAPayer > 40000);
    assert.ok(result.coutTotalEmployeur > result.salaireBrutCotisable);
  });

  it('numberToAlgerianWordsFR: Converts dinar amounts to words accurately', () => {
    const words1 = numberToAlgerianWordsFR(45000);
    assert.strictEqual(words1, 'Quarante-cinq mille dinars algériens');

    const words2 = numberToAlgerianWordsFR(120500);
    assert.strictEqual(words2, 'Cent vingt mille cinq cents dinars algériens');
  });

  it('IRG 2022: Covers transitional band (30,001-34,999), min 1,000 rebate, and brackets 4 & 5', () => {
    // Transitional band: 32,500 DZD
    // Bracket tax = 12,500 * 0.23 = 2,875; 40% rebate = 1,150 -> afterRebate = 1,725
    // Transitional IRG = round(1725 * (32500 - 30000) / 5000) = round(862.5) = 863
    const trans = calculateIrg2022(32500);
    assert.strictEqual(trans.theoreticalIrg, 2875);
    assert.strictEqual(trans.finalIrg, 863);

    // 100,000 DZD -> 0 + 4600 (20k*23%) + 10800 (40k*27%) + 6000 (20k*30%) = 21,400; max rebate 1,500 -> 19,900
    const bracket4 = calculateIrg2022(100000);
    assert.strictEqual(bracket4.theoreticalIrg, 21400);
    assert.strictEqual(bracket4.rebate, 1500);
    assert.strictEqual(bracket4.finalIrg, 19900);

    // 200,000 DZD -> 4600 + 10800 + 24000 (80k*30%) + 14000 (40k*35%) = 53,400; max rebate 1,500 -> 51,900
    const bracket5 = calculateIrg2022(200000);
    assert.strictEqual(bracket5.theoreticalIrg, 53400);
    assert.strictEqual(bracket5.rebate, 1500);
    assert.strictEqual(bracket5.finalIrg, 51900);

    // Rebate floor 1,000 DZD around 35,000 DZD:
    // 35,000 DZD -> 15,000 * 0.23 = 3,450; 40% = 1,380 -> between 1,000 and 1,500
    const edge35k = calculateIrg2022(35000);
    assert.strictEqual(edge35k.rebate, 1380);
    assert.strictEqual(edge35k.finalIrg, 2070);
  });

  it('calculateAlgerianGrossToNet: Applies custom StatutoryRateSet, pro-rata overtime, SNMG checks, and advance carryover clamping', () => {
    const customRate = {
      id: '22222222-2222-4222-8222-222222222222',
      versionCode: 'DZ-2026-VERIFIED',
      effectiveFrom: '2026-01-01',
      isLegacyBaseline: false,
      verificationStatus: 'verified' as const,
      verifiedBy: null,
      verifiedAt: null,
      cnasSalarialRate: 0.09,
      cnasPatronalRate: 0.26,
      irgBrackets: null,
      irgAbatementRate: 0.4,
      irgAbatementMinDzd: 1000,
      irgAbatementMaxDzd: 1500,
      irgExemptionThresholdDzd: 30000,
      irgTransitionalMaxDzd: 35000,
      irgTransitionalConfig: null,
      snmgDzd: 24000,
      overtimeMultiplier50: 1.5,
      overtimeMultiplier100: 2.0,
      tvaRates: [0, 9, 19],
      timbreConfig: null,
      notes: null,
      createdBy: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const res = calculateAlgerianGrossToNet({
      baseSalary: 20000, // below SNMG 24,000
      workedDays: 22,
      standardDays: 22,
      unexcusedAbsenceDays: 2, // 20 worked days
      overtimeHours50: 4,
      overtimeHours100: 2,
      advancesDeducted: 80000, // exceeds net before advances -> clamped with carryover
      statutoryRateSet: customRate,
    });

    assert.strictEqual(res.workedDays, 20);
    assert.strictEqual(res.belowSnmgWarning, true);
    assert.deepStrictEqual(res.missingStatutoryParams, []);
    assert.strictEqual(res.rateBasis, 'versioned');
    assert.strictEqual(res.rateSetId, '22222222-2222-4222-8222-222222222222');
    assert.strictEqual(res.rateVerificationStatus, 'verified');
    assert.strictEqual(res.netAPayer, 0);
    assert.strictEqual(res.acomptesDeduits + res.advanceCarryover, 80000);
    assert.ok(res.advanceCarryover > 0);
    assert.ok(res.overtimeAmount > 0);

    // Null rate set falls back to legacy basis with snmg_dzd flagged missing
    const legacy = calculateAlgerianGrossToNet({ baseSalary: 45000 });
    assert.strictEqual(legacy.rateBasis, 'legacy');
    assert.strictEqual(legacy.rateSetId, null);
    assert.deepStrictEqual(legacy.missingStatutoryParams, ['snmg_dzd']);
  });
});

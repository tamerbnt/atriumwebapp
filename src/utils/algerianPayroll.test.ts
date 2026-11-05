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
});

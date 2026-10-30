import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAlgerianFiscalStamp,
  calculateVolumetricWeight,
  computeShipmentTariff,
  validateAlgerianPhone,
  calculateCcpKey,
  formatCcpSfp01Line,
  computeCourierDischargeBalance,
  calculateDriverPayout,
} from './logisticsRules';

describe('Logistics & Delivery Algerian Rules', () => {
  it('computes Article 317 graduated fiscal stamp duty on cash COD collections', () => {
    assert.equal(computeAlgerianFiscalStamp(450), 0); // <= 500 DZD exempt
    assert.equal(computeAlgerianFiscalStamp(2500), 20); // 501 - 3,000 -> 20 DZD
    assert.equal(computeAlgerianFiscalStamp(8500), 30); // 3,001 - 10,000 -> 30 DZD
    assert.equal(computeAlgerianFiscalStamp(14200), 40); // 10,001 - 20,000 -> 40 DZD
    assert.equal(computeAlgerianFiscalStamp(35000), 50); // 20,001 - 50,000 -> 50 DZD
    assert.equal(computeAlgerianFiscalStamp(75000), 750); // 1% for >50k (750 DZD)
    assert.equal(computeAlgerianFiscalStamp(350000), 2500); // 1% capped at 2,500 DZD ceiling
  });

  it('computes volumetric weight with road freight divisor 5000', () => {
    // 50 x 40 x 30 cm = 60,000 / 5000 = 12 kg
    const vol = calculateVolumetricWeight(50, 40, 30);
    assert.equal(vol, 12);

    // 25 x 20 x 10 cm = 5,000 / 5000 = 1 kg
    assert.equal(calculateVolumetricWeight(25, 20, 10), 1);
  });

  it('computes shipment tariff based on Algerian wilaya zone, delivery mode and overweight', () => {
    // Zone 1 Local Home delivery for 7kg (base is 5kg, overweight = 2kg @ 50 DZD)
    const res = computeShipmentTariff({
      actualWeightKg: 7.0,
      zone: 'Zone1_Local',
      deliveryType: 'HomeDelivery',
      codAmountDzd: 8500,
      isFragile: true, // +150 DZD
    });

    assert.equal(res.basePriceDzd, 500);
    assert.equal(res.weightOverageKg, 2);
    assert.equal(res.weightSurchargeDzd, 100);
    assert.equal(res.fragileSurchargeDzd, 150);
    assert.equal(res.totalDeliveryFeeDzd, 750); // 500 + 100 + 150
    assert.equal(res.stampDutyDzd, 30); // 8,500 -> 30 DZD stamp
    assert.equal(res.totalRecipientPayableDzd, 8530);
  });

  it('validates and formats Algerian phone numbers across Mobilis, Djezzy, Ooredoo, Fixe', () => {
    const mobilis = validateAlgerianPhone('+213661223344');
    assert.equal(mobilis.valid, true);
    assert.equal(mobilis.operator, 'Mobilis');
    assert.equal(mobilis.formatted, '0661 22 33 44');

    const djezzy = validateAlgerianPhone('0770112233');
    assert.equal(djezzy.valid, true);
    assert.equal(djezzy.operator, 'Djezzy');

    const ooredoo = validateAlgerianPhone('0555998877');
    assert.equal(ooredoo.valid, true);
    assert.equal(ooredoo.operator, 'Ooredoo');

    const invalid = validateAlgerianPhone('123456');
    assert.equal(invalid.valid, false);
  });

  it('calculates Algérie Poste Key 97 algorithm accurately', () => {
    // 0019842150
    const key = calculateCcpKey('0019842150');
    assert.ok(key >= 1 && key <= 97);
    // Key formula: 97 - ((CCP * 100) % 97)
    const expected = 97 - Number((19842150n * 100n) % 97n);
    assert.equal(key, expected);
  });

  it('formats Algérie Poste SFP 01 / B1 batch transfer record', () => {
    const line = formatCcpSfp01Line({
      centerCode: '16000',
      ccpAccount: '19842150',
      ccpKey: '45',
      amountCentimes: 850000, // 8500.00 DZD
      merchantName: 'BOUTIQUE TECH ALGER',
    });

    assert.equal(line.length, 59); // 5 + 10 + 2 + 12 + 30
    assert.ok(line.startsWith('16000001984215045'));
  });

  it('computes courier cash discharge balance with banknote tallies', () => {
    const discharge = computeCourierDischargeBalance({
      expectedAmountDzd: 22000,
      note2000Count: 10, // 20,000
      note1000Count: 2,  // 2,000
      note500Count: 0,
      note200Count: 0,
      coinsDzd: 0,
    });

    assert.equal(discharge.actualTotalDzd, 22000);
    assert.equal(discharge.discrepancyDzd, 0);
    assert.equal(discharge.status, 'Balanced');
  });

  it('computes driver payout for freelance auto-entrepreneur with 5% withholding tax', () => {
    const payout = calculateDriverPayout({
      employmentType: 'freelance_commission',
      completedDeliveries: 20, // 20 * 220 = 4400
      returnedDeliveries: 2,   // 2 * 50 = 100
      fuelAllowanceDzd: 500,   // Total gross = 5000
      commissionPerDeliveredDzd: 220,
      commissionPerReturnDzd: 50,
      withholdingTaxRatePercent: 5.0,
    });

    assert.equal(payout.grossCompensationDzd, 5000);
    assert.equal(payout.taxWithheldDzd, 250); // 5% of 5000
    assert.equal(payout.netPayoutDzd, 4750);
  });
});

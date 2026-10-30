import { test } from 'node:test';
import assert from 'node:assert';
import {
  calculateIrrigationRunTime,
  checkAnrhQuotaStatus,
  evaluateDarSafety,
  calculatePieceworkWage,
  computeOnilMilkSubsidy,
  calculateWeighbridgeNetWeight,
  calculateArt317Timbre,
} from './agriRules.ts';

test('calculateIrrigationRunTime computes exact hours based on daily ETC and pump flow', () => {
  // 12.5 ha, 5.2 mm/day, pump 65 m3/h
  // 12.5 * 52 = 650 m3 needed; 650 / 65 = 10.0 hours
  const hours = calculateIrrigationRunTime(12.5, 5.2, 65);
  assert.strictEqual(hours, 10.0);

  // Zero check
  assert.strictEqual(calculateIrrigationRunTime(0, 5.2, 65), 0);
  assert.strictEqual(calculateIrrigationRunTime(10, 0, 65), 0);
});

test('checkAnrhQuotaStatus accurately signals warning at 85% and exceeded at 100%', () => {
  const normal = checkAnrhQuotaStatus(50000, 100000);
  assert.strictEqual(normal.percentageUsed, 50);
  assert.strictEqual(normal.remainingM3, 50000);
  assert.strictEqual(normal.isWarning, false);
  assert.strictEqual(normal.isExceeded, false);

  const warning = checkAnrhQuotaStatus(88000, 100000);
  assert.strictEqual(warning.percentageUsed, 88);
  assert.strictEqual(warning.remainingM3, 12000);
  assert.strictEqual(warning.isWarning, true);
  assert.strictEqual(warning.isExceeded, false);

  const exceeded = checkAnrhQuotaStatus(105000, 100000);
  assert.strictEqual(exceeded.percentageUsed, 105);
  assert.strictEqual(exceeded.remainingM3, 0);
  assert.strictEqual(exceeded.isExceeded, true);
});

test('evaluateDarSafety enforces INPV chemical lockout until safety date', () => {
  const treatmentDate = '2026-05-10';
  const darDays = 14;

  // Check 5 days later: locked
  const midCheck = evaluateDarSafety(treatmentDate, darDays, '2026-05-15');
  assert.strictEqual(midCheck.isLocked, true);
  assert.strictEqual(midCheck.daysRemaining, 9);
  assert.strictEqual(midCheck.harvestAllowedDateStr, '2026-05-24');

  // Check on allowed date: unlocked
  const doneCheck = evaluateDarSafety(treatmentDate, darDays, '2026-05-24');
  assert.strictEqual(doneCheck.isLocked, false);
  assert.strictEqual(doneCheck.daysRemaining, 0);
});

test('calculatePieceworkWage computes crate earnings with advance deductions', () => {
  // 62 crates at 40 DZD with 500 DZD cash advance
  const wage = calculatePieceworkWage(62, 40, 500);
  assert.strictEqual(wage.grossWageDzd, 2480);
  assert.strictEqual(wage.advanceDzd, 500);
  assert.strictEqual(wage.netDueDzd, 1980);
});

test('computeOnilMilkSubsidy calculates 12 DZD/L excluding antibiotic withheld milk', () => {
  // 1,000 liters total, 120 liters rejected for antibiotics
  // Net 880 liters * 12 = 10,560 DZD
  const result = computeOnilMilkSubsidy(1000, 120, 12.0);
  assert.strictEqual(result.conformingLiters, 880);
  assert.strictEqual(result.rejectedLiters, 120);
  assert.strictEqual(result.subsidyAmountDzd, 10560);
});

test('calculateWeighbridgeNetWeight accurately deducts truck and crate tare', () => {
  // Gross: 18,450 kg, Truck Tare: 4,200 kg, 500 crates at 1.8 kg (900 kg)
  // Net = 18,450 - 4,200 - 900 = 13,350 kg (133.50 Quintaux)
  const result = calculateWeighbridgeNetWeight(18450, 4200, 500, 1.8);
  assert.strictEqual(result.totalCrateTareKg, 900);
  assert.strictEqual(result.netWeightKg, 13350);
  assert.strictEqual(result.netWeightQuintaux, 133.5);
  assert.strictEqual(result.isValid, true);
});

test('calculateArt317Timbre applies graduated fiscal stamp strictly to cash and caps at 2500 DZD', () => {
  // Cash under 5,000 DZD
  assert.strictEqual(calculateArt317Timbre(4500, 'cash'), 0);

  // Cash 8,000 DZD -> 50 DZD
  assert.strictEqual(calculateArt317Timbre(8000, 'cash'), 50);

  // Cash 35,000 DZD -> 200 DZD
  assert.strictEqual(calculateArt317Timbre(3500, 'cash'), 0);

  // Cash 867,750 DZD (wholesale truck) -> 1% is 8,677.50 -> CAPPED at 2,500 DZD
  assert.strictEqual(calculateArt317Timbre(867750, 'cash'), 2500);

  // Bank transfer / BaridiMob: 0 DZD even for large amounts
  assert.strictEqual(calculateArt317Timbre(867750, 'baridimob'), 0);
  assert.strictEqual(calculateArt317Timbre(867750, 'bank_transfer'), 0);
  assert.strictEqual(calculateArt317Timbre(867750, 'check'), 0);
});

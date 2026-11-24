import { describe, it, expect } from 'vitest';
import {
  CENTIMES_PER_DZD,
  HALF_AWAY_FROM_ZERO,
  MONEY_ROUNDING_MODE,
  roundHalfAwayFromZero,
  dzdToCentimes,
  centimesToDzd,
  addCentimes,
  subtractCentimes,
  multiplyCentimes,
  percentOfCentimes,
  allocateCentimesProRata,
  formatCentimes,
} from '../money';

describe('money.ts — HALF_AWAY_FROM_ZERO integer centimes helper', () => {
  it('declares 100 centimes per DZD and HALF_AWAY_FROM_ZERO policy', () => {
    expect(CENTIMES_PER_DZD).toBe(100);
    expect(HALF_AWAY_FROM_ZERO).toBe('HALF_AWAY_FROM_ZERO');
    expect(MONEY_ROUNDING_MODE).toBe('HALF_AWAY_FROM_ZERO');
  });

  it('rounds half ties away from zero for positive and negative amounts without float drift', () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(1.49999)).toBe(1);
    expect(roundHalfAwayFromZero(-1.49999)).toBe(-1);

    // Classic binary float traps: 1.005 * 100 === 100.49999999999999 in JS
    expect(dzdToCentimes(1.005)).toBe(101);
    expect(dzdToCentimes(19.995)).toBe(2000);
    expect(dzdToCentimes(100.505)).toBe(10051);
    expect(dzdToCentimes(-1.005)).toBe(-101);
    expect(dzdToCentimes(-19.995)).toBe(-2000);
    expect(dzdToCentimes(-100.505)).toBe(-10051);

    // Refunds mirror sales exactly
    expect(addCentimes(dzdToCentimes(19.995), dzdToCentimes(-19.995))).toBe(0);
    expect(addCentimes(dzdToCentimes(1.005), dzdToCentimes(-1.005))).toBe(0);

    expect(dzdToCentimes(0)).toBe(0);
    expect(dzdToCentimes(Number.NaN)).toBe(0);
  });

  it('converts between DZD and integer centimes accurately including negatives', () => {
    expect(dzdToCentimes(15000)).toBe(1500000);
    expect(dzdToCentimes(42.75)).toBe(4275);
    expect(centimesToDzd(1500000)).toBe(15000);
    expect(centimesToDzd(4275)).toBe(42.75);
    expect(centimesToDzd(-250)).toBe(-2.5);
    expect(centimesToDzd(-2000)).toBe(-20);
  });

  it('performs arithmetic and percentage math in integer centimes for positive and negative values', () => {
    expect(addCentimes(10050, 2025, -75)).toBe(12000);
    expect(subtractCentimes(50000, 12500)).toBe(37500);
    expect(subtractCentimes(12500, 50000)).toBe(-37500);
    expect(multiplyCentimes(1000, 1.5)).toBe(1500);
    expect(multiplyCentimes(-1005, 0.5)).toBe(-503);
    expect(percentOfCentimes(10000, 19)).toBe(1900);
    expect(percentOfCentimes(1005, 50)).toBe(503);
    expect(percentOfCentimes(-1005, 50)).toBe(-503);
  });

  it('allocates positive and negative centimes pro-rata while preserving exact total sum', () => {
    const splits = allocateCentimesProRata(1000, [1, 1, 1]);
    expect(splits).toEqual([334, 333, 333]);
    expect(splits.reduce((a, b) => a + b, 0)).toBe(1000);

    const negSplits = allocateCentimesProRata(-1000, [1, 1, 1]);
    expect(negSplits).toEqual([-334, -333, -333]);
    expect(negSplits.reduce((a, b) => a + b, 0)).toBe(-1000);

    const zeroWeights = allocateCentimesProRata(500, [0, 0]);
    expect(zeroWeights).toEqual([0, 0]);
  });

  it('formats centimes cleanly', () => {
    expect(formatCentimes(125050, 'DZD', 2)).toBe('1,250.50 DZD');
    expect(formatCentimes(-125050, 'DZD', 2)).toBe('-1,250.50 DZD');
    expect(formatCentimes(125000, 'DZD', 0)).toBe('1,250 DZD');
    expect(formatCentimes(5000, 'EUR', 2)).toBe('€50.00');
  });
});

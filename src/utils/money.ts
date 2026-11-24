/**
 * Shared integer-centimes money utility for Atrium ERP & CRM (Phase 1+).
 *
 * All new Phase 1 monetary columns store integer centimes (`bigint`, 1 DZD = 100 centimes).
 * Rounding policy: HALF_AWAY_FROM_ZERO (symmetric away-from-zero on exact .5 ties:
 * 2.5 -> 3, -2.5 -> -3) using exact decimal-string scaling so IEEE-754 binary float
 * representation (e.g. 1.005 * 100 = 100.49999999999999) never under-rounds half-centimes,
 * and refunds always mirror sales cleanly.
 *
 * Scope note: Applies to application money (POS, invoices, deposits, sales) ONLY.
 * Statutory payroll calculations (IRG, CNAS, taxable base rounding) follow Algerian
 * fiscal/social-security rules confirmed separately before Step 7.
 */

export const CENTIMES_PER_DZD = 100;
export const HALF_AWAY_FROM_ZERO = 'HALF_AWAY_FROM_ZERO' as const;
export const MONEY_ROUNDING_MODE = HALF_AWAY_FROM_ZERO;

function expandDecimalString(value: number): { negative: boolean; digits: string; exponent: number } {
  const negative = value < 0;
  const raw = Math.abs(value).toString();
  const [mantissa, expPart] = raw.toLowerCase().split('e');
  const exp = expPart ? parseInt(expPart, 10) : 0;
  const [intPart = '0', fracPart = ''] = mantissa.split('.');
  const digits = `${intPart}${fracPart}`;
  const decimalExponent = exp - fracPart.length;
  return { negative, digits, exponent: decimalExponent };
}

/**
 * Scales a finite number by `10^scaleDigits` and rounds to the nearest integer using
 * HALF_AWAY_FROM_ZERO (halfway values round away from zero: 0.5 -> 1, -0.5 -> -1, -2.5 -> -3).
 */
function scaleAndRoundHalfAwayFromZero(value: number, scaleDigits: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;

  const { negative, digits, exponent } = expandDecimalString(value);
  const shiftedExp = exponent + scaleDigits;

  let intStr: string;
  let fracStr: string;

  if (shiftedExp >= 0) {
    intStr = digits + '0'.repeat(shiftedExp);
    fracStr = '';
  } else {
    const fracLen = -shiftedExp;
    if (fracLen >= digits.length) {
      intStr = '0';
      fracStr = '0'.repeat(fracLen - digits.length) + digits;
    } else {
      const splitIdx = digits.length - fracLen;
      intStr = digits.slice(0, splitIdx);
      fracStr = digits.slice(splitIdx);
    }
  }

  let magnitude = Number(intStr || '0');
  if (fracStr.length > 0 && fracStr[0] >= '5') {
    magnitude += 1;
  }

  if (magnitude === 0) return 0;
  return negative ? -magnitude : magnitude;
}

/**
 * Rounds a number to an integer using HALF_AWAY_FROM_ZERO (half away from zero).
 */
export function roundHalfAwayFromZero(value: number): number {
  return scaleAndRoundHalfAwayFromZero(value, 0);
}

/**
 * Converts a DZD amount (e.g. 1250.50) to integer centimes (e.g. 125050).
 */
export function dzdToCentimes(amountDzd: number): number {
  return scaleAndRoundHalfAwayFromZero(amountDzd, 2);
}

/**
 * Converts integer centimes (e.g. 125050) to DZD numeric value (e.g. 1250.5).
 */
export function centimesToDzd(centimes: number): number {
  if (!Number.isFinite(centimes) || centimes === 0) return 0;
  const safeCentimes = roundHalfAwayFromZero(centimes);
  return safeCentimes / CENTIMES_PER_DZD;
}

export function addCentimes(...values: number[]): number {
  return values.reduce((sum, v) => sum + roundHalfAwayFromZero(v), 0);
}

export function subtractCentimes(a: number, b: number): number {
  return roundHalfAwayFromZero(a) - roundHalfAwayFromZero(b);
}

export function multiplyCentimes(centimes: number, factor: number): number {
  if (!Number.isFinite(centimes) || !Number.isFinite(factor)) return 0;
  return roundHalfAwayFromZero(roundHalfAwayFromZero(centimes) * factor);
}

export function percentOfCentimes(centimes: number, percent: number): number {
  if (!Number.isFinite(centimes) || !Number.isFinite(percent)) return 0;
  return roundHalfAwayFromZero((roundHalfAwayFromZero(centimes) * percent) / 100);
}

/**
 * Splits `totalCentimes` proportionally across non-negative `weights` using largest-remainder
 * allocation so the sum of returned integer centimes equals `roundHalfAwayFromZero(totalCentimes)` exactly.
 */
export function allocateCentimesProRata(totalCentimes: number, weights: number[]): number[] {
  const target = roundHalfAwayFromZero(totalCentimes);
  if (weights.length === 0) return [];
  const totalWeight = weights.reduce((acc, w) => acc + Math.max(0, Number.isFinite(w) ? w : 0), 0);
  if (totalWeight <= 0) {
    return weights.map(() => 0);
  }

  const sign = target < 0 ? -1 : 1;
  const absTarget = Math.abs(target);

  const shares = weights.map((rawWeight, idx) => {
    const w = Math.max(0, Number.isFinite(rawWeight) ? rawWeight : 0);
    const exact = (absTarget * w) / totalWeight;
    const floored = Math.floor(exact);
    return { idx, floored, remainder: exact - floored };
  });

  let remainderUnits = absTarget - shares.reduce((s, item) => s + item.floored, 0);
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || a.idx - b.idx);
  for (let i = 0; i < byRemainder.length && remainderUnits > 0; i++) {
    byRemainder[i].floored += 1;
    remainderUnits -= 1;
  }

  const result = new Array<number>(weights.length);
  for (const s of shares) {
    result[s.idx] = s.floored === 0 ? 0 : s.floored * sign;
  }
  return result;
}

export function formatCentimes(centimes: number, currency: 'DZD' | 'EUR' | 'USD' | string = 'DZD', decimals = 2): string {
  const amount = centimesToDzd(centimes);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  if (currency === 'EUR') return `€${formatted}`;
  if (currency === 'USD') return `$${formatted}`;
  return `${formatted} ${currency}`;
}

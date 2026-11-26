/**
 * Algerian Labor Code & Statutory Payroll Calculation Engine
 * 
 * Complies with:
 * - Loi 90-11 relative aux relations de travail (Algérie)
 * - Décret exécutif n° 21-507 (Barème de l'Impôt sur le Revenu Global - IRG 2022)
 * - Loi de Finances 2022 / 2024 (Exonération totale <= 30 000 DZD et abattement de 40%)
 * - Cotisations de Sécurité Sociale (CNAS): Salariale 9%, Patronale 26%
 */

import type { StatutoryRateSet } from '../lib/supabase/services/referenceDataService';
import type { StatutoryRateSnapshot } from '../types/index';

export interface AlgerianPayrollInput {
  baseSalary: number; // Contractual base salary (DZD)
  workedDays?: number; // Days worked in the month (default 22 working days)
  standardDays?: number; // Standard working days in month (default 22)
  primesCotisables?: { label: string; amount: number }[]; // Subject to CNAS & IRG (IEP, Rendement, Heures sup)
  primesNonImposables?: { label: string; amount: number }[]; // Non-taxable allowances (Panier, Transport)
  overtimeHours50?: number; // Overtime hours at +50%
  overtimeHours100?: number; // Overtime hours at +100%
  hourlyRate?: number; // Base hourly rate (if not given, computed from baseSalary / (22 * 8))
  unexcusedAbsenceDays?: number; // Absent days to deduct
  advancesDeducted?: number; // Cash advances (Acomptes) already paid
  otherDeductions?: number; // Other deductions (loans, etc.)
  statutoryRateSet?: StatutoryRateSet | null;
}

export interface AlgerianPayrollResult {
  baseSalary: number;
  actualBaseSalary: number; // Adjusted for worked/absent days
  workedDays: number;
  standardDays: number;
  hourlyRate: number;
  overtimeAmount: number;
  primesCotisables: { label: string; amount: number }[];
  totalPrimesCotisables: number;
  salaireBrutCotisable: number; // Base + Primes cotisables + Overtime
  cnasSalarial: number; // 9.0% default
  cnasPatronal: number; // 26.0% default
  salaireBrutImposable: number; // Brut Cotisable - CNAS Salarial
  irgTax: number; // Progressive IRG 2022 after 40% rebate
  theoreticalIrg: number; // IRG before abatement
  irgRebate: number; // 40% abatement applied (min 1000, max 1500)
  primesNonImposables: { label: string; amount: number }[];
  totalPrimesNonImposables: number; // Panier + Transport
  requestedAdvances: number;
  acomptesDeduits: number;
  advanceCarryover: number;
  autresRetenues: number;
  totalRetenues: number; // CNAS + IRG + Acomptes + Autres
  netAPayer: number; // Final take-home wage in DZD
  coutTotalEmployeur: number; // Brut Cotisable + CNAS Patronale + Primes Non Imposables
  rateSetId: string | null;
  rateBasis: 'legacy' | 'versioned';
  rateVersionCode: string;
  rateVerificationStatus: 'unverified' | 'verified' | 'superseded';
  rateSnapshot: StatutoryRateSnapshot | null;
  snmgDzd: number | null;
  belowSnmgWarning: boolean;
  missingStatutoryParams: string[];
}

export function buildStatutoryRateSnapshot(rate: StatutoryRateSet | null | undefined): StatutoryRateSnapshot | null {
  if (!rate) return null;
  return {
    versionId: rate.id,
    versionCode: rate.versionCode,
    effectiveFrom: rate.effectiveFrom ?? null,
    verificationStatus: rate.verificationStatus,
    cnasSalarialRate: rate.cnasSalarialRate,
    cnasPatronalRate: rate.cnasPatronalRate,
    irgBrackets: rate.irgBrackets ? rate.irgBrackets.map((b) => ({ ...b })) : null,
    irgAbatementRate: rate.irgAbatementRate,
    irgAbatementMinDzd: rate.irgAbatementMinDzd,
    irgAbatementMaxDzd: rate.irgAbatementMaxDzd,
    irgExemptionThresholdDzd: rate.irgExemptionThresholdDzd,
    irgTransitionalMaxDzd: rate.irgTransitionalMaxDzd,
    irgTransitionalConfig: rate.irgTransitionalConfig ? { ...rate.irgTransitionalConfig } : null,
    snmgDzd: rate.snmgDzd ?? null,
    overtimeMultiplier50: rate.overtimeMultiplier50,
    overtimeMultiplier100: rate.overtimeMultiplier100,
  };
}

/**
 * Calculates Algerian IRG (Impôt sur le Revenu Global) according to Barème 2022
 * (Décret exécutif n° 21-507 / Loi de Finances)
 */
export function calculateIrg2022(
  taxableGross: number,
  rateSet?: StatutoryRateSet | null
): {
  finalIrg: number;
  theoreticalIrg: number;
  rebate: number;
} {
  // Discard decimals, Algerian fiscal round to nearest integer
  const brutImp = Math.floor(Math.max(0, taxableGross));

  const exemptionThreshold = rateSet?.irgExemptionThresholdDzd ?? 30000;
  const transitionalMax = rateSet?.irgTransitionalMaxDzd ?? 35000;
  const abatementRate = rateSet?.irgAbatementRate ?? 0.40;
  const abatementMin = rateSet?.irgAbatementMinDzd ?? 1000;
  const abatementMax = rateSet?.irgAbatementMaxDzd ?? 1500;

  // 1. Exonération totale pour revenus <= threshold (default 30 000 DZD)
  if (brutImp <= exemptionThreshold) {
    return { finalIrg: 0, theoreticalIrg: 0, rebate: 0 };
  }

  // 2. Calcul par tranches progressives
  let tax = 0;
  const brackets =
    rateSet?.irgBrackets && rateSet.irgBrackets.length > 0
      ? rateSet.irgBrackets
      : [
          { min_dzd: 0, max_dzd: 20000, rate: 0 },
          { min_dzd: 20001, max_dzd: 40000, rate: 0.23 },
          { min_dzd: 40001, max_dzd: 80000, rate: 0.27 },
          { min_dzd: 80001, max_dzd: 160000, rate: 0.3 },
          { min_dzd: 160001, max_dzd: null, rate: 0.35 },
        ];

  for (const b of brackets) {
    const lowerFloor = b.min_dzd > 0 ? b.min_dzd - 1 : 0;
    if (brutImp > lowerFloor && b.rate > 0) {
      const capped = b.max_dzd != null ? Math.min(brutImp, b.max_dzd) : brutImp;
      const slice = Math.max(0, capped - lowerFloor);
      tax += slice * b.rate;
    }
  }

  const theoreticalIrg = Math.round(tax);

  // 3. Application de l'abattement fiscal (40% default, Min 1 000 DZD, Max 1 500 DZD)
  let rebate = theoreticalIrg * abatementRate;
  if (rebate < abatementMin) rebate = Math.min(abatementMin, theoreticalIrg);
  if (rebate > abatementMax) rebate = abatementMax;

  const irgAfterRebate = Math.max(0, theoreticalIrg - Math.round(rebate));

  // 4. Régime transitoire spécifique pour les salaires entre 30 001 et 35 000 DZD
  if (
    transitionalMax > exemptionThreshold &&
    brutImp > exemptionThreshold &&
    brutImp < transitionalMax
  ) {
    const span = transitionalMax - exemptionThreshold;
    const transitionalIrg = Math.max(
      0,
      Math.round((irgAfterRebate * (brutImp - exemptionThreshold)) / span)
    );
    return {
      finalIrg: transitionalIrg,
      theoreticalIrg,
      rebate: Math.round(theoreticalIrg - transitionalIrg),
    };
  }

  return {
    finalIrg: Math.round(irgAfterRebate),
    theoreticalIrg,
    rebate: Math.round(rebate),
  };
}

/**
 * Full Algerian Gross-to-Net Payroll Computation Engine
 */
export function calculateAlgerianGrossToNet(input: AlgerianPayrollInput): AlgerianPayrollResult {
  const rateSet = input.statutoryRateSet ?? null;
  const standardDays = input.standardDays ?? 22;
  const unexcusedAbsenceDays = input.unexcusedAbsenceDays ?? 0;
  const workedDays = Math.max(0, (input.workedDays ?? standardDays) - unexcusedAbsenceDays);

  const baseSalary = Math.max(0, input.baseSalary);
  const hourlyRate = input.hourlyRate ?? (baseSalary > 0 ? baseSalary / (standardDays * 8) : 250);

  // Adjusted base salary if there are unexcused absences
  const actualBaseSalary = standardDays > 0 ? Math.round((baseSalary / standardDays) * workedDays) : baseSalary;

  // Overtime calculations (50% for first 4 hours, 100% for rest/night)
  const ot50Hours = input.overtimeHours50 ?? 0;
  const ot100Hours = input.overtimeHours100 ?? 0;
  const ot50Mult = rateSet?.overtimeMultiplier50 ?? 1.5;
  const ot100Mult = rateSet?.overtimeMultiplier100 ?? 2.0;
  const overtimeAmount = Math.round((ot50Hours * hourlyRate * ot50Mult) + (ot100Hours * hourlyRate * ot100Mult));

  // Primes cotisables (coaching, bonus, seniority IEP)
  const primesCotisables = [...(input.primesCotisables ?? [])];
  if (overtimeAmount > 0) {
    primesCotisables.push({ label: 'Heures Supplémentaires', amount: overtimeAmount });
  }
  const totalPrimesCotisables = primesCotisables.reduce((sum, p) => sum + p.amount, 0);

  // 1. Salaire Brut Cotisable
  const salaireBrutCotisable = actualBaseSalary + totalPrimesCotisables;

  // 2. CNAS (Sécurité Sociale)
  const cnasSalarialRate = rateSet?.cnasSalarialRate ?? 0.09;
  const cnasPatronalRate = rateSet?.cnasPatronalRate ?? 0.26;
  const cnasSalarial = Math.round(salaireBrutCotisable * cnasSalarialRate);
  const cnasPatronal = Math.round(salaireBrutCotisable * cnasPatronalRate);

  // 3. Salaire Brut Imposable
  const salaireBrutImposable = Math.max(0, salaireBrutCotisable - cnasSalarial);

  // 4. IRG 2022
  const { finalIrg, theoreticalIrg, rebate } = calculateIrg2022(salaireBrutImposable, rateSet);

  // 5. Primes Non Imposables (Social Allowances: Panier, Transport)
  const primesNonImposables = input.primesNonImposables && input.primesNonImposables.length > 0
    ? [...input.primesNonImposables]
    : [
        { label: 'Indemnité de Panier', amount: Math.round(workedDays * 600) },
        { label: 'Indemnité de Transport', amount: 4000 },
      ];
  const totalPrimesNonImposables = primesNonImposables.reduce((sum, p) => sum + p.amount, 0);

  // 6. Retenues & Acomptes (cap advance deduction at available net before advances)
  const autresRetenues = Math.max(0, input.otherDeductions ?? 0);
  const netBeforeAdvances = Math.max(
    0,
    salaireBrutImposable - finalIrg + totalPrimesNonImposables - autresRetenues
  );
  const requestedAdvances = Math.max(0, input.advancesDeducted ?? 0);
  const acomptesDeduits = Math.min(requestedAdvances, netBeforeAdvances);
  const advanceCarryover = Math.max(0, requestedAdvances - acomptesDeduits);

  const totalRetenues = cnasSalarial + finalIrg + acomptesDeduits + autresRetenues;

  // 7. Net à Payer
  const netAPayer = Math.max(0, netBeforeAdvances - acomptesDeduits);

  // 8. Coût total employeur
  const coutTotalEmployeur = salaireBrutCotisable + cnasPatronal + totalPrimesNonImposables;

  const isUuidRate = Boolean(rateSet?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(rateSet.id));
  const snmgDzd = rateSet?.snmgDzd ?? null;
  const missingStatutoryParams = snmgDzd === null ? ['snmg_dzd'] : [];
  const belowSnmgWarning = snmgDzd !== null && baseSalary > 0 && baseSalary < snmgDzd;

  return {
    baseSalary,
    actualBaseSalary,
    workedDays,
    standardDays,
    hourlyRate: Math.round(hourlyRate),
    overtimeAmount,
    primesCotisables,
    totalPrimesCotisables,
    salaireBrutCotisable,
    cnasSalarial,
    cnasPatronal,
    salaireBrutImposable,
    irgTax: finalIrg,
    theoreticalIrg,
    irgRebate: rebate,
    primesNonImposables,
    totalPrimesNonImposables,
    requestedAdvances,
    acomptesDeduits,
    advanceCarryover,
    autresRetenues,
    totalRetenues,
    netAPayer,
    coutTotalEmployeur,
    rateSetId: isUuidRate ? rateSet!.id : null,
    rateBasis: isUuidRate && !rateSet?.isLegacyBaseline ? 'versioned' : 'legacy',
    rateVersionCode: rateSet?.versionCode ?? 'DZ-CODE-BASELINE-UNVERIFIED',
    rateVerificationStatus: rateSet?.verificationStatus ?? 'unverified',
    rateSnapshot: buildStatutoryRateSnapshot(rateSet),
    snmgDzd,
    belowSnmgWarning,
    missingStatutoryParams,
  };
}

/**
 * Converts a numeric DZD amount to formal legal French text for Algerian payslips
 */
export function numberToAlgerianWordsFR(amount: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  const n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zéro dinar algérien';

  function convertHundreds(val: number): string {
    let str = '';
    const h = Math.floor(val / 100);
    const r = val % 100;

    if (h === 1) str += 'cent ';
    else if (h > 1) str += units[h] + ' cents ';

    if (r >= 10 && r < 20) {
      str += teens[r - 10] + ' ';
    } else {
      const t = Math.floor(r / 10);
      const u = r % 10;
      if (t === 7 || t === 9) {
        str += tens[t - 1] + '-' + teens[u] + ' ';
      } else {
        if (t > 0) str += tens[t] + (u === 1 ? ' et ' : u > 0 ? '-' : ' ');
        if (u > 0 && u !== 1) str += units[u] + ' ';
        else if (u === 1 && t !== 1) str += 'un ';
      }
    }
    return str.trim();
  }

  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const remainder = n % 1000;

  let result = '';
  if (millions > 0) {
    result += (millions === 1 ? 'un million ' : convertHundreds(millions) + ' millions ');
  }
  if (thousands > 0) {
    result += (thousands === 1 ? 'mille ' : convertHundreds(thousands) + ' mille ');
  }
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }

  return result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' dinars algériens';
}

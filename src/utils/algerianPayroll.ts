/**
 * Algerian Labor Code & Statutory Payroll Calculation Engine
 * 
 * Complies with:
 * - Loi 90-11 relative aux relations de travail (Algérie)
 * - Décret exécutif n° 21-507 (Barème de l'Impôt sur le Revenu Global - IRG 2022)
 * - Loi de Finances 2022 / 2024 (Exonération totale <= 30 000 DZD et abattement de 40%)
 * - Cotisations de Sécurité Sociale (CNAS): Salariale 9%, Patronale 26%
 */

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
  cnasSalarial: number; // 9.0%
  cnasPatronal: number; // 26.0%
  salaireBrutImposable: number; // Brut Cotisable - CNAS Salarial
  irgTax: number; // Progressive IRG 2022 after 40% rebate
  theoreticalIrg: number; // IRG before abatement
  irgRebate: number; // 40% abatement applied (min 1000, max 1500)
  primesNonImposables: { label: string; amount: number }[];
  totalPrimesNonImposables: number; // Panier + Transport
  acomptesDeduits: number;
  autresRetenues: number;
  totalRetenues: number; // CNAS + IRG + Acomptes + Autres
  netAPayer: number; // Final take-home wage in DZD
  coutTotalEmployeur: number; // Brut Cotisable + CNAS Patronale + Primes Non Imposables
}

/**
 * Calculates Algerian IRG (Impôt sur le Revenu Global) according to Barème 2022
 * (Décret exécutif n° 21-507 / Loi de Finances)
 * 
 * Brackets:
 * - 0 à 20 000 DZD : 0%
 * - 20 001 à 40 000 DZD : 23%
 * - 40 001 à 80 000 DZD : 27%
 * - 80 001 à 160 000 DZD : 30%
 * - Plus de 160 000 DZD : 35%
 * 
 * Abattement:
 * - 40% sur l'IRG théorique
 * - Minimum d'abattement: 1 000 DZD / mois
 * - Maximum d'abattement: 1 500 DZD / mois
 * 
 * Exonération légale:
 * - Salaire imposable <= 30 000 DZD : Exonération totale (IRG = 0)
 * - Salaire imposable entre 30 001 et 35 000 DZD : Formule d'abattement dégressif
 */
export function calculateIrg2022(taxableGross: number): {
  finalIrg: number;
  theoreticalIrg: number;
  rebate: number;
} {
  // Discard decimals, Algerian fiscal round to nearest integer
  const brutImp = Math.floor(Math.max(0, taxableGross));

  // 1. Exonération totale pour revenus <= 30 000 DZD
  if (brutImp <= 30000) {
    return { finalIrg: 0, theoreticalIrg: 0, rebate: 0 };
  }

  // 2. Calcul par tranches progressives
  let tax = 0;

  // Tranche 1: 0 à 20 000 = 0%
  // Tranche 2: 20 001 à 40 000 = 23%
  if (brutImp > 20000) {
    const slice2 = Math.min(brutImp, 40000) - 20000;
    tax += slice2 * 0.23;
  }

  // Tranche 3: 40 001 à 80 000 = 27%
  if (brutImp > 40000) {
    const slice3 = Math.min(brutImp, 80000) - 40000;
    tax += slice3 * 0.27;
  }

  // Tranche 4: 80 001 à 160 000 = 30%
  if (brutImp > 80000) {
    const slice4 = Math.min(brutImp, 160000) - 80000;
    tax += slice4 * 0.30;
  }

  // Tranche 5: > 160 000 = 35%
  if (brutImp > 160000) {
    const slice5 = brutImp - 160000;
    tax += slice5 * 0.35;
  }

  const theoreticalIrg = Math.round(tax);

  // 3. Application de l'abattement fiscal de 40% (Min 1 000 DZD, Max 1 500 DZD)
  let rebate = theoreticalIrg * 0.40;
  if (rebate < 1000) rebate = Math.min(1000, theoreticalIrg);
  if (rebate > 1500) rebate = 1500;

  let irgAfterRebate = Math.max(0, theoreticalIrg - Math.round(rebate));

  // 4. Régime transitoire spécifique pour les salaires entre 30 001 et 35 000 DZD
  // Loi de finances: IRG = IRG_normal * (137/51) - (27925/51)
  if (brutImp > 30000 && brutImp < 35000) {
    // Calcul spécifique pour éviter l'effet de seuil
    const transitionalIrg = Math.max(0, Math.round(irgAfterRebate * (brutImp - 30000) / 5000));
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
  const overtimeAmount = Math.round((ot50Hours * hourlyRate * 1.5) + (ot100Hours * hourlyRate * 2.0));

  // Primes cotisables (coaching, bonus, seniority IEP)
  const primesCotisables = [...(input.primesCotisables ?? [])];
  if (overtimeAmount > 0) {
    primesCotisables.push({ label: 'Heures Supplémentaires', amount: overtimeAmount });
  }
  const totalPrimesCotisables = primesCotisables.reduce((sum, p) => sum + p.amount, 0);

  // 1. Salaire Brut Cotisable
  const salaireBrutCotisable = actualBaseSalary + totalPrimesCotisables;

  // 2. CNAS (Sécurité Sociale)
  // Retenue salariale = 9%
  const cnasSalarial = Math.round(salaireBrutCotisable * 0.09);
  // Quote-part patronale = 26%
  const cnasPatronal = Math.round(salaireBrutCotisable * 0.26);

  // 3. Salaire Brut Imposable
  const salaireBrutImposable = Math.max(0, salaireBrutCotisable - cnasSalarial);

  // 4. IRG 2022
  const { finalIrg, theoreticalIrg, rebate } = calculateIrg2022(salaireBrutImposable);

  // 5. Primes Non Imposables (Social Allowances: Panier, Transport)
  const primesNonImposables = input.primesNonImposables && input.primesNonImposables.length > 0
    ? [...input.primesNonImposables]
    : [
        { label: 'Indemnité de Panier', amount: Math.round(workedDays * 600) },
        { label: 'Indemnité de Transport', amount: 4000 },
      ];
  const totalPrimesNonImposables = primesNonImposables.reduce((sum, p) => sum + p.amount, 0);

  // 6. Retenues & Acomptes
  const acomptesDeduits = Math.max(0, input.advancesDeducted ?? 0);
  const autresRetenues = Math.max(0, input.otherDeductions ?? 0);

  const totalRetenues = cnasSalarial + finalIrg + acomptesDeduits + autresRetenues;

  // 7. Net à Payer
  const netAPayer = Math.max(
    0,
    salaireBrutImposable - finalIrg + totalPrimesNonImposables - acomptesDeduits - autresRetenues
  );

  // 8. Coût total employeur
  const coutTotalEmployeur = salaireBrutCotisable + cnasPatronal + totalPrimesNonImposables;

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
    acomptesDeduits,
    autresRetenues,
    totalRetenues,
    netAPayer,
    coutTotalEmployeur,
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

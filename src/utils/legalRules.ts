/**
 * Algerian Legal, Notarial & Financial Statutory Rules & Calculation Engines
 * 
 * Compliant with:
 * - Code de Procédure Civile et Administrative (CPCA - Loi n° 08-09 du 25 février 2008)
 * - Statut du Notariat & Tarif des Honoraires (Décret exécutif n° 08-243 du 27 juillet 2008)
 * - Code du Timbre Algérien (Article 317 - Droit de timbre fiscal gradué sur les espèces)
 * - Système Comptable Financier (SCF - Loi n° 07-11 du 25 novembre 2007)
 */

export type CPCARecourseType = 
  | 'appel_civil' 
  | 'appel_commercial' 
  | 'appel_social' 
  | 'opposition' 
  | 'pourvoi_cassation' 
  | 'appel_refere';

export type DomicileCategory = 'local' | 'grand_sud' | 'abroad';

export interface CPCADeadlineCalculationResult {
  notificationDate: string;
  recourseType: CPCARecourseType;
  domicileCategory: DomicileCategory;
  baseDays: number;
  distanceExtensionDays: number;
  initialCalculatedDate: string;
  terminalExpiryDate: string; // Factoring CPCA Art. 405 (Fridays, Saturdays, and holidays)
  isRolledOver: boolean;
  rolloverReason?: string;
  daysRemaining: number;
  isExpired: boolean;
  isCritical: boolean; // <= 48h
  statutoryReference: string;
}

// Official Algerian Public Statutory Holidays (Fixed Gregorian + Variable Islamic)
export const ALGERIAN_FIXED_HOLIDAYS = [
  '01-01', // Jour de l'An
  '05-01', // Fête du Travail
  '07-05', // Fête de l'Indépendance
  '11-01', // Fête de la Révolution
];

/**
 * Calculates statutory procedural deadlines under the Algerian CPCA.
 * Enforces CPCA Art. 336 (30d), Art. 329 (10d), Art. 568 (2 months), Art. 404 (Distance), and Art. 405 (Weekend/Holiday carryover).
 */
export function calculateCPCADeadline(
  notificationDateStr: string,
  recourseType: CPCARecourseType,
  domicileCategory: DomicileCategory = 'local',
  additionalHolidays: string[] = []
): CPCADeadlineCalculationResult {
  const notifDate = new Date(notificationDateStr);
  if (isNaN(notifDate.getTime())) {
    throw new Error('Date de signification invalide.');
  }

  // Base procedural delays in days (CPCA)
  let baseDays = 30;
  let statutoryRef = 'Art. 336 CPCA (30 jours)';

  if (recourseType === 'opposition') {
    baseDays = 10;
    statutoryRef = 'Art. 329 CPCA (10 jours)';
  } else if (recourseType === 'pourvoi_cassation') {
    baseDays = 60; // 2 calendar months standardized to 60 days
    statutoryRef = 'Art. 568 CPCA (2 mois)';
  } else if (recourseType === 'appel_refere') {
    baseDays = 15;
    statutoryRef = 'Art. 305 CPCA (15 jours)';
  } else if (recourseType === 'appel_social') {
    baseDays = 30;
    statutoryRef = 'Art. 336 CPCA & Droit Social (30 jours)';
  }

  // Distance Extension under CPCA Art. 404
  let distanceDays = 0;
  if (domicileCategory === 'grand_sud') {
    distanceDays = 15; // +15 days for southern Algerian wilayas
  } else if (domicileCategory === 'abroad') {
    distanceDays = 60; // +2 months (60 days) for residents abroad
  }

  // Delay begins the day after notification date (T+1)
  const totalDaysToAdd = baseDays + distanceDays;
  const targetDate = new Date(notifDate);
  targetDate.setDate(targetDate.getDate() + totalDaysToAdd);

  // Check CPCA Art. 405: Weekend (Friday=5, Saturday=6 in Algeria) and holidays
  let isRolledOver = false;
  let rolloverReason: string | undefined = undefined;

  const isHolidayOrWeekend = (d: Date): { blocked: boolean; reason?: string } => {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 5) return { blocked: true, reason: 'Vendredi (Jour de repos hebdomadaire - Art. 405 CPCA)' };
    if (dayOfWeek === 6) return { blocked: true, reason: 'Samedi (Jour chômé judiciaire - Art. 405 CPCA)' };

    const monthDay = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (ALGERIAN_FIXED_HOLIDAYS.includes(monthDay)) {
      return { blocked: true, reason: `Jour Férié Légal (${monthDay}) - Art. 405 CPCA` };
    }
    const fullIsoDate = d.toISOString().split('T')[0];
    if (additionalHolidays.includes(fullIsoDate)) {
      return { blocked: true, reason: `Fête Religieuse / Férié (${fullIsoDate}) - Art. 405 CPCA` };
    }
    return { blocked: false };
  };

  const initialCalculatedDate = targetDate.toISOString().split('T')[0];
  let check = isHolidayOrWeekend(targetDate);
  while (check.blocked) {
    isRolledOver = true;
    rolloverReason = check.reason;
    targetDate.setDate(targetDate.getDate() + 1);
    check = isHolidayOrWeekend(targetDate);
  }

  // Set court registry closing time: 16:30 Africa/Algiers (UTC+1)
  const terminalDateStr = `${targetDate.toISOString().split('T')[0]}T16:30:00+01:00`;
  const terminalDate = new Date(terminalDateStr);
  const now = new Date();
  const diffMs = terminalDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs < 0;
  const isCritical = !isExpired && diffMs <= 48 * 60 * 60 * 1000;

  return {
    notificationDate: notificationDateStr,
    recourseType,
    domicileCategory,
    baseDays,
    distanceExtensionDays: distanceDays,
    initialCalculatedDate,
    terminalExpiryDate: terminalDateStr,
    isRolledOver,
    rolloverReason,
    daysRemaining: isExpired ? 0 : daysRemaining,
    isExpired,
    isCritical,
    statutoryReference: statutoryRef,
  };
}

/**
 * Décret exécutif n° 08-243 du 27 juillet 2008
 * Fixant les honoraires des notaires en Algérie.
 * Calculates mandatory progressive 5-tranche fees for real estate and authentic acts.
 */
export interface NotaryTariffResult {
  actType: string;
  transactionValueDzd: number;
  honorairesHtDzd: number;
  tvaAmountDzd: number; // 19%
  totalHonorairesTtcDzd: number;
  droitsEnregistrementDzd: number; // 2.5%
  droitsPubliciteDzd: number; // 1.0%
  totalProvisionClientDzd: number;
  tranchesBreakdown: Array<{
    trancheName: string;
    rangeLabel: string;
    ratePercent: number;
    taxableAmountDzd: number;
    feeDzd: number;
  }>;
  colloquialCentimesLabel: string;
}

export function calculateNotaryDecret08243(
  actType: 'vente_immobiliere' | 'donation' | 'bail_commercial' | 'fredha' | 'statuts_societe' | 'procuration',
  transactionValueDzd: number
): NotaryTariffResult {
  let honorairesHt = 0;
  const tranches: NotaryTariffResult['tranchesBreakdown'] = [];

  if (actType === 'vente_immobiliere' || actType === 'donation') {
    const val = Math.max(0, transactionValueDzd);

    // Tranche 1: 0 to 500,000 DZD @ 3.0%
    const t1Amount = Math.min(val, 500000);
    const t1Fee = t1Amount * 0.03;
    tranches.push({
      trancheName: 'Tranche 1',
      rangeLabel: '0 à 500 000 DA',
      ratePercent: 3.0,
      taxableAmountDzd: t1Amount,
      feeDzd: Math.round(t1Fee),
    });
    honorairesHt += t1Fee;

    // Tranche 2: 500,001 to 1,000,000 DZD @ 2.0%
    if (val > 500000) {
      const t2Amount = Math.min(val - 500000, 500000);
      const t2Fee = t2Amount * 0.02;
      tranches.push({
        trancheName: 'Tranche 2',
        rangeLabel: '500 001 à 1 000 000 DA',
        ratePercent: 2.0,
        taxableAmountDzd: t2Amount,
        feeDzd: Math.round(t2Fee),
      });
      honorairesHt += t2Fee;
    }

    // Tranche 3: 1,000,001 to 5,000,000 DZD @ 1.0%
    if (val > 1000000) {
      const t3Amount = Math.min(val - 1000000, 4000000);
      const t3Fee = t3Amount * 0.01;
      tranches.push({
        trancheName: 'Tranche 3',
        rangeLabel: '1 000 001 à 5 000 000 DA',
        ratePercent: 1.0,
        taxableAmountDzd: t3Amount,
        feeDzd: Math.round(t3Fee),
      });
      honorairesHt += t3Fee;
    }

    // Tranche 4: 5,000,001 to 10,000,000 DZD @ 0.75%
    if (val > 5000000) {
      const t4Amount = Math.min(val - 5000000, 5000000);
      const t4Fee = t4Amount * 0.0075;
      tranches.push({
        trancheName: 'Tranche 4',
        rangeLabel: '5 000 001 à 10 000 000 DA',
        ratePercent: 0.75,
        taxableAmountDzd: t4Amount,
        feeDzd: Math.round(t4Fee),
      });
      honorairesHt += t4Fee;
    }

    // Tranche 5: Above 10,000,000 DZD @ 0.5%
    if (val > 10000000) {
      const t5Amount = val - 10000000;
      const t5Fee = t5Amount * 0.005;
      tranches.push({
        trancheName: 'Tranche 5',
        rangeLabel: 'Supérieur à 10 000 000 DA',
        ratePercent: 0.5,
        taxableAmountDzd: t5Amount,
        feeDzd: Math.round(t5Fee),
      });
      honorairesHt += t5Fee;
    }
  } else if (actType === 'bail_commercial') {
    // Fixed fee + duration percentage under Décret 08-243 Art. 9
    honorairesHt = Math.max(8000, transactionValueDzd * 0.01);
    tranches.push({
      trancheName: 'Forfait Bail Commercial',
      rangeLabel: 'Valeur locative',
      ratePercent: 1.0,
      taxableAmountDzd: transactionValueDzd,
      feeDzd: Math.round(honorairesHt),
    });
  } else if (actType === 'fredha') {
    // Succession certificate fixed tariff
    honorairesHt = 12000;
    tranches.push({
      trancheName: 'Acte de Frédha Charaïque',
      rangeLabel: 'Dévolution successorale',
      ratePercent: 0,
      taxableAmountDzd: 0,
      feeDzd: 12000,
    });
  } else if (actType === 'statuts_societe') {
    // Incorporation deed
    honorairesHt = Math.max(25000, transactionValueDzd * 0.005);
    tranches.push({
      trancheName: 'Statuts de Société',
      rangeLabel: 'Capital social',
      ratePercent: 0.5,
      taxableAmountDzd: transactionValueDzd,
      feeDzd: Math.round(honorairesHt),
    });
  } else {
    // Procuration
    honorairesHt = 2500;
    tranches.push({
      trancheName: 'Procuration Notariée',
      rangeLabel: 'Forfait fixe Décret 08-243',
      ratePercent: 0,
      taxableAmountDzd: 0,
      feeDzd: 2500,
    });
  }

  const roundedHonorairesHt = Math.round(honorairesHt);
  const tvaAmount = Math.round(roundedHonorairesHt * 0.19);
  const totalHonorairesTtc = roundedHonorairesHt + tvaAmount;

  // Real estate taxes (Enregistrement 2.5% + Conservation Foncière 1.0%)
  const isRealEstate = actType === 'vente_immobiliere' || actType === 'donation';
  const droitsEnregistrement = isRealEstate ? Math.round(transactionValueDzd * 0.025) : 0;
  const droitsPublicite = isRealEstate ? Math.round(transactionValueDzd * 0.01) : 0;
  const totalProvisionClient = totalHonorairesTtc + droitsEnregistrement + droitsPublicite;

  return {
    actType,
    transactionValueDzd,
    honorairesHtDzd: roundedHonorairesHt,
    tvaAmountDzd: tvaAmount,
    totalHonorairesTtcDzd: totalHonorairesTtc,
    droitsEnregistrementDzd: droitsEnregistrement,
    droitsPubliciteDzd: droitsPublicite,
    totalProvisionClientDzd: totalProvisionClient,
    tranchesBreakdown: tranches,
    colloquialCentimesLabel: formatCentimesColloquial(transactionValueDzd),
  };
}

/**
 * Formats an amount in Algerian Dinars into colloquial Algerian Centimes (Millions & Milliards)
 */
export function formatCentimesColloquial(dinars: number): string {
  const centimes = dinars * 100;
  if (centimes >= 1000000000) {
    const milliards = (centimes / 1000000000).toFixed(2);
    return `${milliards} Milliard(s) de Centimes (${dinars.toLocaleString('fr-DZ')} DA)`;
  }
  if (centimes >= 1000000) {
    const millions = (centimes / 1000000).toFixed(1);
    return `${millions} Million(s) de Centimes (${dinars.toLocaleString('fr-DZ')} DA)`;
  }
  return `${dinars.toLocaleString('fr-DZ')} DA`;
}

/**
 * Article 317 du Code du Timbre Algérien
 * Computes progressive fiscal stamp duty strictly on cash receipts.
 */
export function calculateArticle317Stamp(
  amountDzd: number,
  paymentMethod: 'especes' | 'cheque' | 'virement' | 'baridimob'
): number {
  if (paymentMethod !== 'especes') {
    return 0; // Legally exempt
  }
  const amt = Math.max(0, amountDzd);
  if (amt <= 500) return 0;
  if (amt <= 3000) return 20;
  if (amt <= 10000) return 50;
  if (amt <= 50000) return 100;
  if (amt <= 100000) return 200;

  // Above 100,000 DZD: 1% progressive capped at 2,500 DZD
  const progressive = Math.round(amt * 0.01);
  return Math.min(progressive, 2500);
}

/**
 * Validates a double-entry accounting entry under the Algerian SCF (Loi 07-11)
 * Enforces sum(Debit) == sum(Credit) with zero tolerance.
 */
export function validateAndBalanceSCFEntry(
  lines: Array<{ accountNumber: string; debitDzd: number; creditDzd: number }>
): {
  isBalanced: boolean;
  totalDebitDzd: number;
  totalCreditDzd: number;
  deltaDzd: number;
  error?: string;
} {
  const totalDebit = lines.reduce((acc, l) => acc + (Number(l.debitDzd) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (Number(l.creditDzd) || 0), 0);
  const delta = Math.round((totalDebit - totalCredit) * 100) / 100;
  const isBalanced = Math.abs(delta) < 0.001 && lines.length >= 2;

  let error: string | undefined = undefined;
  if (lines.length < 2) {
    error = 'Une écriture comptable SCF nécessite au moins deux lignes (un débit et un crédit).';
  } else if (!isBalanced) {
    error = `Écriture déséquilibrée de ${Math.abs(delta).toFixed(2)} DA (Débit: ${totalDebit.toFixed(2)}, Crédit: ${totalCredit.toFixed(2)}).`;
  }

  return {
    isBalanced,
    totalDebitDzd: Math.round(totalDebit),
    totalCreditDzd: Math.round(totalCredit),
    deltaDzd: delta,
    error,
  };
}

/**
 * Evaluates whether funds from an escrow account can be released.
 * Enforces proof of Cadastral registration and PIN security.
 */
export function canReleaseEscrow(
  currentBalanceDzd: number,
  payoutAmountDzd: number,
  hasCadastralClearance: boolean,
  pinEntered: string,
  requiredMasterPin: string = '2026'
): { allowed: boolean; reason?: string } {
  if (payoutAmountDzd <= 0) {
    return { allowed: false, reason: 'Le montant de déblocage doit être supérieur à zéro.' };
  }
  if (payoutAmountDzd > currentBalanceDzd) {
    return { allowed: false, reason: 'Solde séquestre insuffisant sur ce dossier.' };
  }
  if (!hasCadastralClearance) {
    return {
      allowed: false,
      reason: 'Déblocage interdit : En attente du Volume et Numéro de publication foncière (Conservation Foncière).',
    };
  }
  if (pinEntered !== requiredMasterPin) {
    return { allowed: false, reason: 'Code PIN de sécurité titulaire incorrect.' };
  }
  return { allowed: true };
}

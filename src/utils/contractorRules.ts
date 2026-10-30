/**
 * Atrium ERP & CRM - Algerian Construction & BTP Rules Engine
 * Regulated under:
 * - Décret Présidentiel n° 15-247 (Réglementation des Marchés Publics)
 * - CCAG Travaux (Cahier des Clauses Administratives Générales)
 * - Décret Exécutif n° 97-47 (CACOBATPH Chômage-Intempéries & ONM)
 * - Ordonnance n° 75-58 (Code Civil - Responsabilité Décennale & CTC)
 * - Code des Impôts Directs et Taxes Assimilées (TVA 19% / 9%)
 */

export interface DecompteProvisoireInput {
  grossAmountCurrentHtDzd: number;
  cumulativePreviousGrossHtDzd: number;
  retentionPercent?: number; // Standard 5%
  hasBankCautionReplacement?: boolean; // If true, cash RG = 0
  advanceReimbursementRate?: number; // e.g., 0.15 (15% amortization of startup advance)
  penaltiesDeductedDzd?: number;
  vatRatePercent?: number; // 19% standard or 9% social housing
}

export interface DecompteProvisoireResult {
  grossAmountCurrentHtDzd: number;
  cumulativeGrossHtDzd: number;
  retentionGuaranteeDzd: number;
  isRetentionCoveredByBankCaution: boolean;
  advanceReimbursementDzd: number;
  penaltiesDeductedDzd: number;
  netHtDzd: number;
  vatRatePercent: number;
  vatAmountDzd: number;
  netPayableDzd: number; // Montant Net à Mandater (Trésor Public / Client)
}

/**
 * Calculates official Décompte Provisoire according to Décret 15-247 (Art. 93-100).
 * Retenue de Garantie: exactly 5% on gross HT unless replaced by an approved Caution Bancaire.
 * TVA is calculated on gross period amount HT (or gross less RG if specified by contract).
 */
export function calculateDecompteProvisoire(input: DecompteProvisoireInput): DecompteProvisoireResult {
  const grossCurrent = Math.max(0, Math.round(input.grossAmountCurrentHtDzd));
  const cumulativePrevious = Math.max(0, Math.round(input.cumulativePreviousGrossHtDzd));
  const cumulativeGross = cumulativePrevious + grossCurrent;

  const retentionPercent = input.retentionPercent ?? 5;
  const isBankCaution = Boolean(input.hasBankCautionReplacement);
  const retentionGuaranteeDzd = isBankCaution ? 0 : Math.round(grossCurrent * (retentionPercent / 100));

  const advanceRate = input.advanceReimbursementRate ?? 0;
  const advanceReimbursementDzd = Math.round(grossCurrent * advanceRate);

  const penalties = Math.max(0, Math.round(input.penaltiesDeductedDzd ?? 0));

  const netHtDzd = Math.max(0, grossCurrent - retentionGuaranteeDzd - advanceReimbursementDzd - penalties);

  const vatRate = input.vatRatePercent ?? 19;
  const vatAmountDzd = Math.round(grossCurrent * (vatRate / 100));

  const netPayableDzd = netHtDzd + vatAmountDzd;

  return {
    grossAmountCurrentHtDzd: grossCurrent,
    cumulativeGrossHtDzd: cumulativeGross,
    retentionGuaranteeDzd,
    isRetentionCoveredByBankCaution: isBankCaution,
    advanceReimbursementDzd,
    penaltiesDeductedDzd: penalties,
    netHtDzd,
    vatRatePercent: vatRate,
    vatAmountDzd,
    netPayableDzd,
  };
}

/**
 * Calculates statutory liquidated delay penalties under Décret 15-247 (Art. 116).
 * Daily penalty = Contract Total / 1000 (standard Algerian BTP ratio).
 * Strict statutory cap: Accumulated delay penalties can never exceed 10% of total contract amount.
 */
export function calculateDelayPenalties(
  contractAmountHtDzd: number,
  contractualDaysLate: number,
  dailyPenaltyDivisor = 1000
): { dailyPenaltyDzd: number; theoreticalPenaltiesDzd: number; cappedPenaltiesDzd: number; isCapped: boolean; maxAllowedPenaltiesDzd: number } {
  if (contractAmountHtDzd <= 0 || contractualDaysLate <= 0) {
    return {
      dailyPenaltyDzd: 0,
      theoreticalPenaltiesDzd: 0,
      cappedPenaltiesDzd: 0,
      isCapped: false,
      maxAllowedPenaltiesDzd: Math.round(contractAmountHtDzd * 0.1),
    };
  }

  const dailyPenalty = Math.round(contractAmountHtDzd / dailyPenaltyDivisor);
  const theoreticalPenalties = Math.round(dailyPenalty * contractualDaysLate);
  const maxAllowedPenalties = Math.round(contractAmountHtDzd * 0.1); // 10% cap
  const isCapped = theoreticalPenalties > maxAllowedPenalties;
  const cappedPenalties = isCapped ? maxAllowedPenalties : theoreticalPenalties;

  return {
    dailyPenaltyDzd: dailyPenalty,
    theoreticalPenaltiesDzd: theoreticalPenalties,
    cappedPenaltiesDzd: cappedPenalties,
    isCapped,
    maxAllowedPenaltiesDzd: maxAllowedPenalties,
  };
}

/**
 * Calculates theoretical concrete volume from structural dimensions and standard waste allowance.
 * Standard Algerian structural concrete waste factor: 3% to 5% (formwork deflection & pump residue).
 */
export function calculateConcreteTheoreticalVolume(
  lengthM: number,
  widthM: number,
  thicknessM: number,
  wasteAllowancePercent = 5
): { netVolumeM3: number; billableExpectedM3: number; wasteVolumeM3: number } {
  if (lengthM <= 0 || widthM <= 0 || thicknessM <= 0) {
    return { netVolumeM3: 0, billableExpectedM3: 0, wasteVolumeM3: 0 };
  }

  const netVolume = lengthM * widthM * thicknessM;
  const wasteVolume = netVolume * (wasteAllowancePercent / 100);
  const billableExpected = netVolume + wasteVolume;

  return {
    netVolumeM3: Number(netVolume.toFixed(2)),
    billableExpectedM3: Number(billableExpected.toFixed(2)),
    wasteVolumeM3: Number(wasteVolume.toFixed(2)),
  };
}

/**
 * Evaluates concrete compressive strength at 7 and 28 days pursuant to Algerian CBA 93 / Eurocode 2.
 * Target characteristic strength f_c28 (e.g., 25 MPa for B25).
 * 7-day milestone threshold: expected >= 70% of 28-day target (~17.5 MPa for B25).
 */
export function validateConcreteStrength(
  testedMpa: number,
  targetCharacteristicMpa: number,
  ageInDays: 7 | 28
): { isConforming: boolean; alertLevel: 'OK' | 'WARNING' | 'CRITICAL'; requiredAction: string } {
  if (ageInDays === 7) {
    const minExpected7d = targetCharacteristicMpa * 0.7;
    if (testedMpa >= minExpected7d) {
      return { isConforming: true, alertLevel: 'OK', requiredAction: 'Poursuivre décoffrage selon planning.' };
    }
    if (testedMpa >= targetCharacteristicMpa * 0.6) {
      return {
        isConforming: false,
        alertLevel: 'WARNING',
        requiredAction: 'Maintien des étais en sous-œuvre jusqu au contrôle 28 jours.',
      };
    }
    return {
      isConforming: false,
      alertLevel: 'CRITICAL',
      requiredAction: 'Arrêt immédiat de la charge sur la structure. Information CTC.',
    };
  }

  // 28 days characteristic check
  if (testedMpa >= targetCharacteristicMpa) {
    return { isConforming: true, alertLevel: 'OK', requiredAction: 'Conformité validée. Dossier CTC prêt pour PV de récolement.' };
  }
  return {
    isConforming: false,
    alertLevel: 'CRITICAL',
    requiredAction: 'Non-conformité structurelle. Carottage contradictoire ou étude de renforcement exigée par le CTC.',
  };
}

/**
 * Evaluates bad-weather stoppage eligibility for CACOBATPH compensation (Décret Exécutif 97-47).
 * Conditions:
 * - Rain/Snow/Sandstorm or Sahara Extreme Heat (>44°C).
 * - Minimum duration: >= 4 hours on a regular work shift.
 * - Supported by ONM (Office National de la Météorologie) bulletin reference.
 */
export function validateCacobatphWeatherStoppage(
  stoppageHours: number,
  weatherCondition: 'Sunny' | 'Rain' | 'HeavyRain' | 'SandStorm' | 'ExtremeHeat' | 'Frost',
  temperatureMaxC: number,
  hasOnmBulletin: boolean
): { isEligibleForCacobatph: boolean; justificationCode: string; message: string } {
  const isSevereWeather =
    weatherCondition === 'HeavyRain' ||
    weatherCondition === 'SandStorm' ||
    weatherCondition === 'Frost' ||
    (weatherCondition === 'ExtremeHeat' && temperatureMaxC >= 44);

  if (!isSevereWeather) {
    return {
      isEligibleForCacobatph: false,
      justificationCode: 'METEO_NON_CRITIQUE',
      message: 'Conditions météorologiques ne justifiant pas le chômage-intempéries réglementaire.',
    };
  }

  if (stoppageHours < 4) {
    return {
      isEligibleForCacobatph: false,
      justificationCode: 'DUREE_INSUFFISANTE',
      message: 'Arrêt de travail inférieur au seuil minimal de 4 heures consécutives.',
    };
  }

  if (!hasOnmBulletin) {
    return {
      isEligibleForCacobatph: false,
      justificationCode: 'BULLETIN_ONM_MANQUANT',
      message: 'Certificat météorologique officiel de l ONM obligatoire pour indemnisation CACOBATPH.',
    };
  }

  return {
    isEligibleForCacobatph: true,
    justificationCode: 'INDEMNISATION_VALIDEE',
    message: 'Arrêt intempéries réglementaire éligible à la déclaration chômage CACOBATPH.',
  };
}

/**
 * Parametric price revision formula for Algerian public procurement contracts (CCAG):
 * Formula: P = P0 * [a + b * (S / S0) + c * (M / M0)]
 * Where:
 * a = fixed margin coefficient (usually 0.15)
 * b = labor weighting coefficient (e.g. 0.35)
 * c = material weighting coefficient (e.g. 0.50)
 * Note: a + b + c = 1.00
 */
export function calculatePriceRevisionCoeff(
  currentLaborIndex: number,
  baseLaborIndex: number,
  currentMaterialIndex: number,
  baseMaterialIndex: number,
  fixedCoeffA = 0.15,
  laborCoeffB = 0.35,
  materialCoeffC = 0.5
): { revisionCoefficient: number; priceAdjustmentRatio: number } {
  if (baseLaborIndex <= 0 || baseMaterialIndex <= 0) {
    return { revisionCoefficient: 1.0, priceAdjustmentRatio: 0 };
  }

  const laborRatio = currentLaborIndex / baseLaborIndex;
  const materialRatio = currentMaterialIndex / baseMaterialIndex;

  const coefficient = fixedCoeffA + laborCoeffB * laborRatio + materialCoeffC * materialRatio;
  const adjustmentRatio = coefficient - 1.0;

  return {
    revisionCoefficient: Number(coefficient.toFixed(4)),
    priceAdjustmentRatio: Number(adjustmentRatio.toFixed(4)),
  };
}

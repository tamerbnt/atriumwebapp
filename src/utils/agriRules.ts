/**
 * Pure Business Logic and Algerian Regulatory Rules for Category 17: Agriculture & Livestock Farming
 */

/**
 * Calculates required irrigation runtime (hours) based on crop evapotranspiration,
 * parcel surface, and pump flow rate.
 */
export function calculateIrrigationRunTime(
  surfaceHa: number,
  dailyEtcMm: number,
  pumpFlowM3h: number
): number {
  if (surfaceHa <= 0 || dailyEtcMm <= 0 || pumpFlowM3h <= 0) return 0;
  // 1 mm of rain/water over 1 ha = 10 m³
  const totalM3Needed = surfaceHa * (dailyEtcMm * 10);
  const runtimeHours = totalM3Needed / pumpFlowM3h;
  return Math.round(runtimeHours * 10) / 10;
}

/**
 * Evaluates ANRH borehole quota consumption status and remaining balance.
 */
export function checkAnrhQuotaStatus(
  consumedM3: number,
  annualQuotaM3: number
): {
  percentageUsed: number;
  remainingM3: number;
  isWarning: boolean; // >= 85%
  isExceeded: boolean; // >= 100%
} {
  if (annualQuotaM3 <= 0) {
    return { percentageUsed: 0, remainingM3: 0, isWarning: false, isExceeded: false };
  }
  const percentage = Math.round((consumedM3 / annualQuotaM3) * 100);
  const remaining = Math.max(0, annualQuotaM3 - consumedM3);
  return {
    percentageUsed: percentage,
    remainingM3: remaining,
    isWarning: percentage >= 85 && percentage < 100,
    isExceeded: consumedM3 >= annualQuotaM3,
  };
}

/**
 * Evaluates phytosanitary safety (INPV Délai Avant Récolte - DAR).
 * Determines if a parcel is chemically locked against harvest.
 */
export function evaluateDarSafety(
  treatmentDateStr: string,
  darDays: number,
  checkDateStr?: string
): {
  isLocked: boolean;
  harvestAllowedDateStr: string;
  daysRemaining: number;
} {
  const treatmentDate = new Date(treatmentDateStr);
  const allowedDate = new Date(treatmentDate);
  allowedDate.setDate(allowedDate.getDate() + darDays);

  const checkDate = checkDateStr ? new Date(checkDateStr) : new Date();

  // Reset time portions for pure day difference
  treatmentDate.setHours(0, 0, 0, 0);
  allowedDate.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);

  const diffMs = allowedDate.getTime() - checkDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isLocked = diffDays > 0;
  const daysRemaining = isLocked ? diffDays : 0;

  const harvestAllowedDateStr = allowedDate.toISOString().split('T')[0];

  return {
    isLocked,
    harvestAllowedDateStr,
    daysRemaining,
  };
}

/**
 * Calculates seasonal piecework wage for field harvesters (tâcherons).
 */
export function calculatePieceworkWage(
  cratesCollected: number,
  ratePerCrateDzd: number,
  cashAdvancePaidDzd: number = 0
): {
  grossWageDzd: number;
  advanceDzd: number;
  netDueDzd: number;
} {
  const grossWage = Math.max(0, cratesCollected * ratePerCrateDzd);
  const advance = Math.max(0, cashAdvancePaidDzd);
  const netDue = Math.max(0, grossWage - advance);
  return {
    grossWageDzd: grossWage,
    advanceDzd: advance,
    netDueDzd: netDue,
  };
}

export const calculateWorkerPieceworkWage = calculatePieceworkWage;

/**
 * Computes official ONIL raw cow milk subsidy (12 DZD/L standard)
 * excluding milk dumped under veterinary antibiotic withholding.
 */
export function computeOnilMilkSubsidy(
  totalLiters: number,
  rejectedWithholdingLiters: number = 0,
  subsidyRateDzd: number = 12.0
): {
  conformingLiters: number;
  rejectedLiters: number;
  subsidyAmountDzd: number;
} {
  const conforming = Math.max(0, totalLiters - rejectedWithholdingLiters);
  const subsidyAmount = Math.round(conforming * subsidyRateDzd);
  return {
    conformingLiters: conforming,
    rejectedLiters: rejectedWithholdingLiters,
    subsidyAmountDzd: subsidyAmount,
  };
}

/**
 * Calculates net merchantable weight on weighbridge (double pesée pont-bascule).
 * Net = Gross - Truck Tare - (Crates Count * Crate Unit Tare).
 */
export function calculateWeighbridgeNetWeight(
  grossWeightKg: number,
  truckTareKg: number,
  crateCount: number = 0,
  crateUnitTareKg: number = 1.8
): {
  totalCrateTareKg: number;
  netWeightKg: number;
  netWeightQuintaux: number;
  isValid: boolean;
} {
  const totalCrateTare = Math.round(crateCount * crateUnitTareKg);
  const netKg = grossWeightKg - truckTareKg - totalCrateTare;
  const netQuintaux = Math.round((netKg / 100) * 100) / 100;
  const isValid = grossWeightKg > truckTareKg && netKg > 0;
  return {
    totalCrateTareKg: totalCrateTare,
    netWeightKg: Math.max(0, netKg),
    netWeightQuintaux: Math.max(0, netQuintaux),
    isValid,
  };
}

/**
 * Computes Article 317 Timbre Fiscal Gradué as prescribed by Algerian Tax Law.
 * Strictly applies to cash (espèces) transactions over 5,000 DZD, capped at 2,500 DZD.
 * Non-cash payment methods (cheque, transfer, BaridiMob) are completely exempt (0 DZD).
 */
export function calculateArt317Timbre(
  amountDzd: number,
  paymentMethod: string = 'cash'
): number {
  if (paymentMethod !== 'cash' && paymentMethod !== 'especes') {
    return 0;
  }
  if (amountDzd <= 5000) {
    return 0;
  }
  if (amountDzd <= 10000) {
    return 50;
  }
  if (amountDzd <= 20000) {
    return 100;
  }
  if (amountDzd <= 50000) {
    return 200;
  }
  if (amountDzd <= 100000) {
    return 400;
  }
  // Above 100,000 DZD: 1% with statutory cap of 2,500 DZD
  const proportional = Math.round(amountDzd * 0.01);
  return Math.min(2500, proportional);
}

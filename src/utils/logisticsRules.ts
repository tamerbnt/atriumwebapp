/**
 * Logistics and Delivery Business Rules for Algeria
 * 
 * Complies with:
 * - Article 317 du Code du Timbre (Algérie): Progressive Stamp Duty on Cash Collections (COD).
 * - Algérie Poste SFP 01 / B1 Batch Transmission Formats: Cle CCP 97 formula.
 * - Road Freight Volumetric Ratio: Diviseur 5000 (L x W x H in cm / 5000).
 * - Décret exécutif N° 05-468: Conditions d'exploitation des services de transport de marchandises.
 */

export type WilayaZone =
  | 'Zone1_Local'      // Alger / Local intramuros (Zone 1)
  | 'Zone2_Proche'     // Blida, Tipaza, Boumerdès (Zone 2)
  | 'Zone3_Nord'       // Oran, Constantine, Sétif, Annaba, Béjaïa, Tlemcen (Zone 3)
  | 'Zone4_Plateaux'   // Batna, Djelfa, Tiaret, Bordj Bou Arréridj (Zone 4)
  | 'Zone5_Sud'        // Biskra, Ghardaïa, Ouargla, Béchar, El Oued (Zone 5)
  | 'Zone6_GrandSud';   // Tamanrasset, Adrar, Djanet, Tindouf, Illizi (Zone 6)

export interface TariffRule {
  zone: WilayaZone;
  homeBasePriceDzd: number;
  stopDeskBasePriceDzd: number;
  baseWeightKg: number;
  overweightPerKgDzd: number;
  fragileHandlingSurchargeDzd: number;
  insuranceRatePercent: number;
}

export const DEFAULT_TARIFF_RULES: Record<WilayaZone, TariffRule> = {
  Zone1_Local: {
    zone: 'Zone1_Local',
    homeBasePriceDzd: 500,
    stopDeskBasePriceDzd: 350,
    baseWeightKg: 5.0,
    overweightPerKgDzd: 50,
    fragileHandlingSurchargeDzd: 150,
    insuranceRatePercent: 1.0,
  },
  Zone2_Proche: {
    zone: 'Zone2_Proche',
    homeBasePriceDzd: 650,
    stopDeskBasePriceDzd: 450,
    baseWeightKg: 5.0,
    overweightPerKgDzd: 60,
    fragileHandlingSurchargeDzd: 150,
    insuranceRatePercent: 1.0,
  },
  Zone3_Nord: {
    zone: 'Zone3_Nord',
    homeBasePriceDzd: 850,
    stopDeskBasePriceDzd: 550,
    baseWeightKg: 5.0,
    overweightPerKgDzd: 70,
    fragileHandlingSurchargeDzd: 180,
    insuranceRatePercent: 1.0,
  },
  Zone4_Plateaux: {
    zone: 'Zone4_Plateaux',
    homeBasePriceDzd: 950,
    stopDeskBasePriceDzd: 650,
    baseWeightKg: 5.0,
    overweightPerKgDzd: 80,
    fragileHandlingSurchargeDzd: 200,
    insuranceRatePercent: 1.0,
  },
  Zone5_Sud: {
    zone: 'Zone5_Sud',
    homeBasePriceDzd: 1350,
    stopDeskBasePriceDzd: 850,
    baseWeightKg: 5.0,
    overweightPerKgDzd: 100,
    fragileHandlingSurchargeDzd: 250,
    insuranceRatePercent: 1.0,
  },
  Zone6_GrandSud: {
    zone: 'Zone6_GrandSud',
    homeBasePriceDzd: 1750,
    stopDeskBasePriceDzd: 1100,
    baseWeightKg: 5.0,
    overweightPerKgDzd: 120,
    fragileHandlingSurchargeDzd: 300,
    insuranceRatePercent: 1.0,
  },
};

/**
 * Calculates volumetric weight according to road freight divisor (5000)
 */
export function calculateVolumetricWeight(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) return 0;
  const vol = (lengthCm * widthCm * heightCm) / 5000;
  return Math.round(vol * 10) / 10;
}

/**
 * Computes Article 317 Code du Timbre (Algerian Progressive Stamp Duty on Cash Collections)
 * Applies to Cash-on-Delivery (espèces) settlements.
 */
export function computeAlgerianFiscalStamp(amountDzd: number): number {
  if (amountDzd <= 500) return 0;
  if (amountDzd <= 3000) return 20;
  if (amountDzd <= 10000) return 30;
  if (amountDzd <= 20000) return 40;
  if (amountDzd <= 50000) return 50;

  // Over 50,000 DZD: 1% with 2,500 DZD statutory ceiling
  const computed = Math.round(amountDzd * 0.01);
  return Math.min(computed, 2500);
}

export interface TariffCalculationResult {
  basePriceDzd: number;
  billableWeightKg: number;
  weightOverageKg: number;
  weightSurchargeDzd: number;
  fragileSurchargeDzd: number;
  insuranceFeeDzd: number;
  stampDutyDzd: number;
  totalDeliveryFeeDzd: number;
  totalRecipientPayableDzd: number; // COD + stamp (if cash)
}

/**
 * Computes exact shipment tariff based on Algerian parcel specifications
 */
export function computeShipmentTariff(params: {
  actualWeightKg: number;
  dimensionsCm?: { length: number; width: number; height: number };
  zone: WilayaZone;
  deliveryType: 'HomeDelivery' | 'StopDesk';
  codAmountDzd: number;
  isFragile?: boolean;
  hasInsurance?: boolean;
  customRules?: TariffRule;
}): TariffCalculationResult {
  const rule = params.customRules || DEFAULT_TARIFF_RULES[params.zone] || DEFAULT_TARIFF_RULES.Zone3_Nord;

  // Determine volumetric weight
  const volWeight = params.dimensionsCm
    ? calculateVolumetricWeight(
        params.dimensionsCm.length,
        params.dimensionsCm.width,
        params.dimensionsCm.height
      )
    : 0;

  const billableWeight = Math.max(params.actualWeightKg, volWeight);
  const basePrice = params.deliveryType === 'HomeDelivery' ? rule.homeBasePriceDzd : rule.stopDeskBasePriceDzd;

  // Overage calculation (rounded up to next full kg)
  let weightOverageKg = 0;
  let weightSurchargeDzd = 0;
  if (billableWeight > rule.baseWeightKg) {
    weightOverageKg = Math.ceil(billableWeight - rule.baseWeightKg);
    weightSurchargeDzd = weightOverageKg * rule.overweightPerKgDzd;
  }

  const fragileSurcharge = params.isFragile ? rule.fragileHandlingSurchargeDzd : 0;
  const insuranceFee = params.hasInsurance && params.codAmountDzd > 0
    ? Math.round((params.codAmountDzd * rule.insuranceRatePercent) / 100)
    : 0;

  const stampDuty = computeAlgerianFiscalStamp(params.codAmountDzd);

  const totalDeliveryFee = basePrice + weightSurchargeDzd + fragileSurcharge + insuranceFee;
  const totalRecipientPayable = params.codAmountDzd + stampDuty;

  return {
    basePriceDzd: basePrice,
    billableWeightKg: billableWeight,
    weightOverageKg,
    weightSurchargeDzd,
    fragileSurchargeDzd: fragileSurcharge,
    insuranceFeeDzd: insuranceFee,
    stampDutyDzd: stampDuty,
    totalDeliveryFeeDzd: totalDeliveryFee,
    totalRecipientPayableDzd: totalRecipientPayable,
  };
}

/**
 * Validates and normalizes Algerian recipient and courier phone numbers.
 * Identifies mobile operator (Mobilis 06, Djezzy 07, Ooredoo 05, or Fixe 02/03/04).
 */
export function validateAlgerianPhone(phone: string): {
  valid: boolean;
  operator: 'Mobilis' | 'Djezzy' | 'Ooredoo' | 'Fixe' | 'Unknown';
  formatted: string;
} {
  const cleaned = phone.replace(/[\s\-_.]/g, '');

  let normalized = cleaned;
  if (normalized.startsWith('+213')) {
    normalized = '0' + normalized.slice(4);
  } else if (normalized.startsWith('00213')) {
    normalized = '0' + normalized.slice(5);
  } else if (normalized.startsWith('213')) {
    normalized = '0' + normalized.slice(3);
  }

  if (normalized.length !== 10 || !/^\d{10}$/.test(normalized)) {
    return { valid: false, operator: 'Unknown', formatted: phone };
  }

  const prefix = normalized.substring(0, 3);
  let operator: 'Mobilis' | 'Djezzy' | 'Ooredoo' | 'Fixe' | 'Unknown' = 'Unknown';

  if (prefix === '06' || normalized.startsWith('06')) {
    operator = 'Mobilis';
  } else if (prefix === '07' || normalized.startsWith('07')) {
    operator = 'Djezzy';
  } else if (prefix === '05' || normalized.startsWith('05')) {
    operator = 'Ooredoo';
  } else if (prefix.startsWith('02') || prefix.startsWith('03') || prefix.startsWith('04')) {
    operator = 'Fixe';
  }

  const formatted = `${normalized.slice(0, 4)} ${normalized.slice(4, 6)} ${normalized.slice(6, 8)} ${normalized.slice(8, 10)}`;
  return { valid: true, operator, formatted };
}

/**
 * Algérie Poste CCP Key 97 Calculation
 * Cle = 97 - ((CCP * 100) % 97)
 */
export function calculateCcpKey(ccpNumber: string | number): number {
  const cleanNumber = String(ccpNumber).replace(/\D/g, '');
  if (!cleanNumber) return 0;
  const n = BigInt(cleanNumber);
  const remainder = Number((n * 100n) % 97n);
  const key = 97 - remainder;
  return key;
}

/**
 * Formats a single line for Algérie Poste SFP 01 / B1 batch text clearing
 */
export function formatCcpSfp01Line(item: {
  centerCode: string; // e.g. "20000"
  ccpAccount: string; // e.g. "12345678"
  ccpKey: string | number; // e.g. "45"
  amountCentimes: number; // e.g. 500000 (5000.00 DZD)
  merchantName: string; // e.g. "SARL BOUTIQUE ALGER"
}): string {
  const center = item.centerCode.padStart(5, '0').slice(0, 5);
  const account = item.ccpAccount.padStart(10, '0').slice(0, 10);
  const key = String(item.ccpKey).padStart(2, '0').slice(0, 2);
  const amt = String(item.amountCentimes).padStart(12, '0').slice(0, 12);
  const name = item.merchantName.padEnd(30, ' ').slice(0, 30);
  return `${center}${account}${key}${amt}${name}`;
}

/**
 * Courier Daily Cash Turn-in Reconciliation
 */
export function computeCourierDischargeBalance(params: {
  expectedAmountDzd: number;
  note2000Count: number;
  note1000Count: number;
  note500Count: number;
  note200Count: number;
  coinsDzd: number;
}): {
  actualTotalDzd: number;
  discrepancyDzd: number;
  status: 'Balanced' | 'Shortage' | 'Surplus';
} {
  const actualTotal =
    params.note2000Count * 2000 +
    params.note1000Count * 1000 +
    params.note500Count * 500 +
    params.note200Count * 200 +
    params.coinsDzd;

  const discrepancy = actualTotal - params.expectedAmountDzd;

  let status: 'Balanced' | 'Shortage' | 'Surplus' = 'Balanced';
  if (discrepancy < 0) {
    status = 'Shortage';
  } else if (discrepancy > 0) {
    status = 'Surplus';
  }

  return {
    actualTotalDzd: actualTotal,
    discrepancyDzd: discrepancy,
    status,
  };
}

/**
 * Driver Payout Computation (Salaried vs Freelance Auto-Entrepreneur)
 */
export function calculateDriverPayout(params: {
  employmentType: 'salaried' | 'freelance_commission';
  completedDeliveries: number;
  returnedDeliveries: number;
  baseSalaryMonthlyDzd?: number;
  commissionPerDeliveredDzd?: number; // e.g. 200 DZD
  commissionPerReturnDzd?: number;    // e.g. 50 DZD
  fuelAllowanceDzd?: number;
  withholdingTaxRatePercent?: number; // 5% for Auto-entrepreneur (loi 22-23)
}): {
  grossCompensationDzd: number;
  taxWithheldDzd: number;
  netPayoutDzd: number;
} {
  if (params.employmentType === 'salaried') {
    const monthlyBase = params.baseSalaryMonthlyDzd || 45000;
    const dailyBase = Math.round(monthlyBase / 26);
    const deliveryBonus = params.completedDeliveries * 50; // Performance incentive
    const gross = dailyBase + deliveryBonus + (params.fuelAllowanceDzd || 0);
    return {
      grossCompensationDzd: gross,
      taxWithheldDzd: 0, // IRG processed on monthly payroll
      netPayoutDzd: gross,
    };
  }

  // Freelance commission model (Statut de l'Auto-Entrepreneur Décret 23-197)
  const deliveryEarnings = params.completedDeliveries * (params.commissionPerDeliveredDzd || 220);
  const returnEarnings = params.returnedDeliveries * (params.commissionPerReturnDzd || 50);
  const gross = deliveryEarnings + returnEarnings + (params.fuelAllowanceDzd || 0);

  const taxRate = params.withholdingTaxRatePercent ?? 5.0; // 5% IFU auto-entrepreneur
  const taxWithheld = Math.round((gross * taxRate) / 100);
  const netPayout = gross - taxWithheld;

  return {
    grossCompensationDzd: gross,
    taxWithheldDzd: taxWithheld,
    netPayoutDzd: netPayout,
  };
}

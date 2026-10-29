/**
 * Algerian Real Estate Business Logic & Legal Calculators
 * - Décret exécutif n° 09-18 (Conditions d'exercice & Barème des honoraires d'agence)
 * - Article 317 du Code du Timbre (Droit de timbre fiscal gradué sur quittances en espèces)
 * - Décret exécutif n° 08-243 (Barème officiel des émoluments de notaire)
 * - Droits d'Enregistrement & Taxe de Publicité Foncière (Loi de Finances)
 */

export interface MandateCommissionResult {
  baseHt: number;
  tva: number;
  totalTtc: number;
  trancheBreakdown?: {
    tranche1: number; // 3% <= 1M
    tranche2: number; // 2% <= 5M
    tranche3: number; // 1% > 5M
  };
}

/**
 * Calculates agency brokerage commission based on Décret exécutif n° 09-18 (Art. 34)
 * or negotiated flat percentage / fixed amount.
 */
export function calculateMandateCommission(
  priceDzd: number,
  mode: 'DecreeTranches' | 'FlatPercent' | 'FixedAmount' = 'DecreeTranches',
  flatPercent = 1.0,
  fixedAmount = 0
): MandateCommissionResult {
  const safePrice = Math.max(0, Number(priceDzd) || 0);

  if (mode === 'FixedAmount') {
    const baseHt = Math.round(Math.max(0, fixedAmount));
    const tva = Math.round(baseHt * 0.19);
    return { baseHt, tva, totalTtc: baseHt + tva };
  }

  if (mode === 'FlatPercent') {
    const rate = Math.max(0, flatPercent) / 100;
    const baseHt = Math.round(safePrice * rate);
    const tva = Math.round(baseHt * 0.19);
    return { baseHt, tva, totalTtc: baseHt + tva };
  }

  // Décret 09-18 Article 34 Tranches:
  // - 3% on portion <= 1,000,000 DA
  // - 2% on portion from 1,000,001 to 5,000,000 DA
  // - 1% on portion > 5,000,000 DA
  let t1 = 0;
  let t2 = 0;
  let t3 = 0;

  if (safePrice <= 1_000_000) {
    t1 = safePrice * 0.03;
  } else if (safePrice <= 5_000_000) {
    t1 = 1_000_000 * 0.03;
    t2 = (safePrice - 1_000_000) * 0.02;
  } else {
    t1 = 1_000_000 * 0.03;
    t2 = 4_000_000 * 0.02;
    t3 = (safePrice - 5_000_000) * 0.01;
  }

  const baseHt = Math.round(t1 + t2 + t3);
  const tva = Math.round(baseHt * 0.19);

  return {
    baseHt,
    tva,
    totalTtc: baseHt + tva,
    trancheBreakdown: {
      tranche1: Math.round(t1),
      tranche2: Math.round(t2),
      tranche3: Math.round(t3),
    },
  };
}

/**
 * Computes Algerian Fiscal Stamp Duty (Article 317 du Code du Timbre) on rent receipts.
 * Strictly applies to CASH payments (Espèces).
 * Exempt for Bank Cheque, Virement, or BaridiMob.
 */
export function computeRentalTimbreFiscal(
  amountDzd: number,
  paymentMethod: 'Cash' | 'Cheque' | 'Virement' | 'BaridiMob' | string = 'Cash'
): number {
  const normMethod = (paymentMethod || '').toLowerCase();
  const isCash =
    normMethod === 'cash' ||
    normMethod === 'espèces' ||
    normMethod === 'especes' ||
    normMethod.includes('نقدا') ||
    normMethod.includes('كاش');

  if (!isCash) {
    return 0; // Legally exempt
  }

  const amount = Math.max(0, Number(amountDzd) || 0);

  if (amount <= 500) return 0;
  if (amount <= 3_000) return 20;
  if (amount <= 5_000) return 30;
  if (amount <= 10_000) return 50;
  if (amount <= 20_000) return 100;
  if (amount <= 50_000) return 200;
  if (amount <= 100_000) return 400;

  // Beyond 100,000 DA: 1% with 10 DA rounding step
  const rawStamp = amount * 0.01;
  return Math.ceil(rawStamp / 10) * 10;
}

export interface NotarySimulationResult {
  propertyPriceDzd: number;
  droitsEnregistrementDzd: number; // 2.5% (residential) or 5% (commercial/terrain)
  taxePubliciteFonciereDzd: number; // 1% (Conservation foncière)
  notaryEmolumentsHtDzd: number; // Décret 08-243 tranches
  notaryTvaDzd: number; // 19% on notary fees
  deboursAndStampsDzd: number; // Administrative costs estimate (approx 25,000 DZD)
  totalClosingCostsDzd: number;
  totalAcquisitionBudgetDzd: number;
  effectivePercentage: number;
}

/**
 * Simulates official Notary Closing Costs in Algeria
 * based on Décret exécutif n° 08-243 and Fiscal Codes.
 */
export function calculateNotaryClosingCosts(
  propertyPriceDzd: number,
  propertyType: 'Residential' | 'Commercial' | 'Land' | 'NewDevelopment' = 'Residential',
  customDebours = 25_000
): NotarySimulationResult {
  const price = Math.max(0, Number(propertyPriceDzd) || 0);

  // Droits d'Enregistrement (DGI)
  // 2.5% for residential built properties; 5% for commercial/unbuilt land
  const registrationRate = propertyType === 'Commercial' || propertyType === 'Land' ? 0.05 : 0.025;
  const droitsEnregistrementDzd = Math.round(price * registrationRate);

  // Taxe de Publicité Foncière (TPF - Conservation Foncière): 1%
  const taxePubliciteFonciereDzd = Math.round(price * 0.01);

  // Décret 08-243 Notary Fee Tranches:
  // - 1 to 500,000 DA: 3%
  // - 500,001 to 1,000,000 DA: 2%
  // - Above 1,000,000 DA: 1%
  let notaryEmoluments = 0;
  if (price <= 500_000) {
    notaryEmoluments = price * 0.03;
  } else if (price <= 1_000_000) {
    notaryEmoluments = 500_000 * 0.03 + (price - 500_000) * 0.02;
  } else {
    notaryEmoluments = 500_000 * 0.03 + 500_000 * 0.02 + (price - 1_000_000) * 0.01;
  }

  const notaryEmolumentsHtDzd = Math.round(notaryEmoluments);
  const notaryTvaDzd = Math.round(notaryEmolumentsHtDzd * 0.19);
  const deboursAndStampsDzd = Math.round(Math.max(0, customDebours));

  const totalClosingCostsDzd =
    droitsEnregistrementDzd +
    taxePubliciteFonciereDzd +
    notaryEmolumentsHtDzd +
    notaryTvaDzd +
    deboursAndStampsDzd;

  const totalAcquisitionBudgetDzd = price + totalClosingCostsDzd;
  const effectivePercentage = price > 0 ? Math.round((totalClosingCostsDzd / price) * 1000) / 10 : 0;

  return {
    propertyPriceDzd: price,
    droitsEnregistrementDzd,
    taxePubliciteFonciereDzd,
    notaryEmolumentsHtDzd,
    notaryTvaDzd,
    deboursAndStampsDzd,
    totalClosingCostsDzd,
    totalAcquisitionBudgetDzd,
    effectivePercentage,
  };
}

export interface BuyerMatchCriteria {
  targetWilaya?: string;
  targetCommune?: string;
  maxBudgetDzd: number;
  propertyType?: string;
  minRooms?: number;
  minSurfaceM2?: number;
}

export interface PropertyMatchTarget {
  cityWilaya: string;
  priceDzd: number;
  propertyType: string;
  roomsCount: number;
  surfaceM2: number;
}

/**
 * Calculates parametric match affinity score (0 to 100)
 * between a property and a buyer's inquiry criteria.
 */
export function calculateSmartMatchScore(
  property: PropertyMatchTarget,
  buyer: BuyerMatchCriteria
): { score: number; matchLevel: 'High' | 'Medium' | 'Low'; highlights: string[] } {
  let score = 0;
  const highlights: string[] = [];

  // 1. Location match (35 pts)
  const propLocation = (property.cityWilaya || '').toLowerCase();
  const targetCommune = (buyer.targetCommune || '').toLowerCase();
  const targetWilaya = (buyer.targetWilaya || '').toLowerCase();

  if (targetCommune && propLocation.includes(targetCommune)) {
    score += 35;
    highlights.push('Même commune / quartier');
  } else if (targetWilaya && propLocation.includes(targetWilaya)) {
    score += 25;
    highlights.push('Même wilaya');
  } else if (!targetCommune && !targetWilaya) {
    score += 20; // No strict location filter
  }

  // 2. Budget match (30 pts)
  const budget = buyer.maxBudgetDzd || 0;
  if (budget > 0) {
    if (property.priceDzd <= budget) {
      score += 30;
      highlights.push('Budget respecté à 100%');
    } else if (property.priceDzd <= budget * 1.1) {
      score += 20;
      highlights.push('Dans la marge de négociation (<= +10%)');
    } else if (property.priceDzd <= budget * 1.2) {
      score += 10;
    }
  } else {
    score += 15;
  }

  // 3. Typology match (20 pts)
  if (buyer.propertyType) {
    if (property.propertyType.toLowerCase() === buyer.propertyType.toLowerCase()) {
      score += 20;
      highlights.push('Type de bien correspondant');
    }
  } else {
    score += 10;
  }

  // 4. Rooms and Surface (15 pts)
  let surfacePts = 0;
  if (buyer.minRooms && property.roomsCount >= buyer.minRooms) {
    surfacePts += 8;
    highlights.push(`Pièces suffisantes (${property.roomsCount} >= ${buyer.minRooms})`);
  }
  if (buyer.minSurfaceM2 && property.surfaceM2 >= buyer.minSurfaceM2) {
    surfacePts += 7;
    highlights.push(`Superficie valide (${property.surfaceM2}m²)`);
  }
  score += surfacePts;

  const finalScore = Math.min(100, Math.round(score));
  const matchLevel = finalScore >= 75 ? 'High' : finalScore >= 50 ? 'Medium' : 'Low';

  return { score: finalScore, matchLevel, highlights };
}

/**
 * Evaluates cadastral title strength out of 100
 */
export function calculateTitleStrengthScore(titleType: string, hasLivretFoncier = false, hasNegative = false): {
  score: number;
  labelFr: string;
  labelAr: string;
  badgeColor: 'emerald' | 'amber' | 'rose';
} {
  if (titleType === 'Acte_Individuel_Livret' && hasLivretFoncier) {
    return {
      score: hasNegative ? 100 : 90,
      labelFr: 'Titre Foncier Pur & Publié',
      labelAr: 'سند ملكية مشهر ودائم',
      badgeColor: 'emerald',
    };
  }

  if (titleType === 'Bien_Dans_Indivision') {
    return {
      score: 70,
      labelFr: 'Indivision (Fridha requise)',
      labelAr: 'ملكية على الشيوع (فريضة مطلوبة)',
      badgeColor: 'amber',
    };
  }

  if (titleType === 'Cession_OPGI_EPLF') {
    return {
      score: 60,
      labelFr: 'Cession OPGI / Logement Public',
      labelAr: 'تنازل ديوان الترقية والتسيير العقاري',
      badgeColor: 'amber',
    };
  }

  return {
    score: 30,
    labelFr: 'Papier Timbré / Régularisation Cadastrale',
    labelAr: 'عقد عرفي / تسوية مسحية مطلوبة',
    badgeColor: 'rose',
  };
}

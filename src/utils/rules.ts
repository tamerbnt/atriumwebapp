import type { BusinessCategory, MemberStatus, SupportedLanguage } from '../types/index.ts';

/**
 * Validates lifetime voucher format: ATR-{TIER}-LIFE-{XXXX}-{XXXX}
 * Valid TIERs: STARTER, PRO, ENTERPRISE
 */
export function validateVoucherCode(code: string): {
  isValid: boolean;
  tierRank?: 1 | 2 | 3;
  tierName?: 'Starter' | 'Pro' | 'Enterprise';
  error?: string;
} {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Voucher code is required' };
  }

  const cleanCode = code.trim().toUpperCase();
  const pattern = /^ATR-(STARTER|PRO|ENTERPRISE)-LIFE-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  const match = cleanCode.match(pattern);

  if (!match) {
    return {
      isValid: false,
      error: 'Invalid voucher format. Expected: ATR-{TIER}-LIFE-XXXX-XXXX (e.g. ATR-PRO-LIFE-A4B2-C9D1)',
    };
  }

  const tier = match[1];
  switch (tier) {
    case 'STARTER':
      return { isValid: true, tierRank: 1, tierName: 'Starter' };
    case 'PRO':
      return { isValid: true, tierRank: 2, tierName: 'Pro' };
    case 'ENTERPRISE':
      return { isValid: true, tierRank: 3, tierName: 'Enterprise' };
    default:
      return { isValid: false, error: 'Unknown tier in voucher' };
  }
}

/**
 * Checks resource quota against plan allowance
 */
export function checkQuota(
  currentCount: number,
  maxAllowed: number
): {
  isAllowed: boolean;
  remaining: number;
  percentageUsed: number;
} {
  // -1 indicates unlimited
  if (maxAllowed < 0) {
    return {
      isAllowed: true,
      remaining: 9999,
      percentageUsed: 0,
    };
  }

  const remaining = Math.max(0, maxAllowed - currentCount);
  const percentageUsed = maxAllowed > 0 ? Math.min(100, Math.round((currentCount / maxAllowed) * 100)) : 100;

  return {
    isAllowed: currentCount < maxAllowed,
    remaining,
    percentageUsed,
  };
}

/**
 * Calculates remaining days from an ISO date string
 * Returns -1 for perpetual lifetime licenses
 */
export function calculateDaysRemaining(isLifetime: boolean, expiresAt?: string): number {
  if (isLifetime) return -1;
  if (!expiresAt) return 0;

  const now = new Date().getTime();
  const target = new Date(expiresAt).getTime();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Format currency with tabular figures
 */
export function formatMoney(amount: number, currency = 'DZD'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export const STATUS_TRANSLATIONS: Record<MemberStatus, Record<SupportedLanguage, string>> = {
  Active: { en: 'Active', fr: 'Actif', ar: 'نشط' },
  Expired: { en: 'Expired', fr: 'Expiré', ar: 'منتهي' },
  Frozen: { en: 'Frozen', fr: 'Gelé', ar: 'مجمد' },
  Suspended: { en: 'Suspended', fr: 'Suspendu', ar: 'معلق' },
  Pending: { en: 'Pending', fr: 'En attente', ar: 'قيد الانتظار' },
  Lead: { en: 'Lead', fr: 'Prospect', ar: 'محتمل' },
  Banned: { en: 'Banned', fr: 'Banni', ar: 'محظور' },
  Unknown: { en: 'Unknown', fr: 'Inconnu', ar: 'غير معروف' },
};

/**
 * Localizes any status string into French, Arabic, or English
 */
export function localizeStatus(status: string, lang: SupportedLanguage = 'en'): string {
  const match = STATUS_TRANSLATIONS[status as MemberStatus];
  if (match) return match[lang] || match.en;
  if (status === 'Approved') return lang === 'ar' ? 'معتمد' : lang === 'fr' ? 'Validé' : 'Approved';
  if (status === 'Declined') return lang === 'ar' ? 'مرفوض' : lang === 'fr' ? 'Refusé' : 'Declined';
  if (status === 'Confirmed') return lang === 'ar' ? 'مؤكد' : lang === 'fr' ? 'Confirmé' : 'Confirmed';
  if (status === 'InChair') return lang === 'ar' ? 'على الكرسي' : lang === 'fr' ? 'Au fauteuil' : 'In Chair';
  if (status === 'Completed') return lang === 'ar' ? 'مكتمل' : lang === 'fr' ? 'Terminé' : 'Completed';
  if (status === 'Cancelled') return lang === 'ar' ? 'ملغى' : lang === 'fr' ? 'Annulé' : 'Cancelled';
  if (status === 'NoShow') return lang === 'ar' ? 'لم يحضر' : lang === 'fr' ? 'Absent' : 'No Show';
  if (status === 'Settled') return lang === 'ar' ? 'مسدد' : lang === 'fr' ? 'Encaissé' : 'Settled';
  if (status === 'Refunded') return lang === 'ar' ? 'مسترجع' : lang === 'fr' ? 'Remboursé' : 'Refunded';
  return status;
}

/**
 * Status visual mapping for MemberStatus with multilingual support
 */
export function getStatusConfig(status: MemberStatus, lang: SupportedLanguage = 'en'): {
  label: string;
  color: string;
  bg: string;
} {
  const label = STATUS_TRANSLATIONS[status] ? STATUS_TRANSLATIONS[status][lang] || STATUS_TRANSLATIONS[status].en : status;
  switch (status) {
    case 'Active':
      return { label, color: '#10B981', bg: '#ECFDF5' };
    case 'Expired':
      return { label, color: '#EF4444', bg: '#FEF2F2' };
    case 'Frozen':
      return { label, color: '#3B82F6', bg: '#EFF6FF' };
    case 'Suspended':
      return { label, color: '#F59E0B', bg: '#FFFBEB' };
    case 'Pending':
      return { label, color: '#6B7280', bg: '#F3F4F6' };
    case 'Lead':
      return { label, color: '#8B5CF6', bg: '#F5F3FF' };
    case 'Banned':
      return { label, color: '#991B1B', bg: '#FEE2E2' };
    default:
      return { label: lang === 'ar' ? 'غير معروف' : lang === 'fr' ? 'Inconnu' : 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
  }
}

/**
 * Category-specific localized terminology dictionary
 */
export const TERMINOLOGY_STORE: Record<
  BusinessCategory,
  {
    members: Record<SupportedLanguage, string>;
    memberSingle: Record<SupportedLanguage, string>;
    registration: Record<SupportedLanguage, string>;
    plan: Record<SupportedLanguage, string>;
    shop: Record<SupportedLanguage, string>;
    scheduler: Record<SupportedLanguage, string>;
    facility: Record<SupportedLanguage, string>;
  }
> = {
  membership_session: {
    members: { en: 'Members', fr: 'Adhérents', ar: 'المشتركون' },
    memberSingle: { en: 'Member', fr: 'Adhérent', ar: 'مشترك' },
    registration: { en: 'Registrations', fr: 'Inscriptions', ar: 'التسجيلات' },
    plan: { en: 'Plans', fr: 'Abonnements', ar: 'الاشتراكات' },
    shop: { en: 'Pro Shop', fr: 'Boutique', ar: 'المتجر' },
    scheduler: { en: 'Schedule', fr: 'Séances', ar: 'الحصص' },
    facility: { en: 'Gym', fr: 'Salle', ar: 'القاعة' },
  },
  appointment_service: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'عميل' },
    registration: { en: 'Bookings', fr: 'Rendez-vous', ar: 'المواعيد' },
    plan: { en: 'Packages', fr: 'Forfaits', ar: 'الباقات' },
    shop: { en: 'Store', fr: 'Boutique', ar: 'المتجر' },
    scheduler: { en: 'Calendar', fr: 'Calendrier', ar: 'التقويم' },
    facility: { en: 'Salon', fr: 'Salon', ar: 'الصالون' },
  },
  pos_inventory: {
    members: { en: 'Customers', fr: 'Clients', ar: 'الزبائن' },
    memberSingle: { en: 'Customer', fr: 'Client', ar: 'زبون' },
    registration: { en: 'Sales', fr: 'Ventes', ar: 'المبيعات' },
    plan: { en: 'Categories', fr: 'Catégories', ar: 'التصنيفات' },
    shop: { en: 'Register', fr: 'Caisse', ar: 'الصندوق' },
    scheduler: { en: 'Shifts', fr: 'Horaires', ar: 'الورديات' },
    facility: { en: 'Store', fr: 'Magasin', ar: 'المتجر' },
  },
  project_milestone: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    memberSingle: { en: 'Contact', fr: 'Contact', ar: 'عميل' },
    registration: { en: 'Leads', fr: 'Prospects', ar: 'الاستفسارات' },
    plan: { en: 'Contracts', fr: 'Contrats', ar: 'العقود' },
    shop: { en: 'Items', fr: 'Articles', ar: 'البنود' },
    scheduler: { en: 'Timeline', fr: 'Échéancier', ar: 'الجدول' },
    facility: { en: 'Agency', fr: 'Agence', ar: 'الوكالة' },
  },
  rental_booking: {
    members: { en: 'Renters', fr: 'Locataires', ar: 'المستأجرون' },
    memberSingle: { en: 'Renter', fr: 'Locataire', ar: 'مستأجر' },
    registration: { en: 'Bookings', fr: 'Demandes', ar: 'الحجوزات' },
    plan: { en: 'Rates', fr: 'Tarifs', ar: 'الأسعار' },
    shop: { en: 'Equipment', fr: 'Équipements', ar: 'المعدات' },
    scheduler: { en: 'Calendar', fr: 'Calendrier', ar: 'التقويم' },
    facility: { en: 'Venue', fr: 'Espace', ar: 'الموقع' },
  },
  education_cohort: {
    members: { en: 'Students', fr: 'Étudiants', ar: 'الطلاب' },
    memberSingle: { en: 'Student', fr: 'Étudiant', ar: 'طالب' },
    registration: { en: 'Enrollments', fr: 'Inscriptions', ar: 'التسجيلات' },
    plan: { en: 'Programs', fr: 'Programmes', ar: 'البرامج' },
    shop: { en: 'Supplies', fr: 'Fournitures', ar: 'اللوازم' },
    scheduler: { en: 'Timetable', fr: 'Emploi', ar: 'الجدول' },
    facility: { en: 'Campus', fr: 'Campus', ar: 'المركز' },
  },
  freelance_solo: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'عميل' },
    registration: { en: 'Proposals', fr: 'Devis', ar: 'العروض' },
    plan: { en: 'Packages', fr: 'Forfaits', ar: 'الباقات' },
    shop: { en: 'Invoices', fr: 'Factures', ar: 'الفواتير' },
    scheduler: { en: 'Tasks', fr: 'Livrables', ar: 'المهام' },
    facility: { en: 'Studio', fr: 'Studio', ar: 'المكتب' },
  },
  trading_commercial: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'عميل' },
    registration: { en: 'Quotes', fr: 'Devis', ar: 'العروض' },
    plan: { en: 'Catalog', fr: 'Catalogue', ar: 'المنتجات' },
    shop: { en: 'Warehouse', fr: 'Stock', ar: 'المخزون' },
    scheduler: { en: 'Purchases', fr: 'Achats', ar: 'المشتريات' },
    facility: { en: 'Depot', fr: 'Entrepôt', ar: 'المستودع' },
  },
  medical_clinic: {
    members: { en: 'Patients', fr: 'Patients', ar: 'المرضى' },
    memberSingle: { en: 'Patient', fr: 'Patient', ar: 'مريض' },
    registration: { en: 'Queue', fr: 'File', ar: 'الانتظار' },
    plan: { en: 'Care', fr: 'Soins', ar: 'العلاج' },
    shop: { en: 'Pharmacy', fr: 'Pharmacie', ar: 'الصيدلية' },
    scheduler: { en: 'Doctors', fr: 'Médecins', ar: 'الأطباء' },
    facility: { en: 'Clinic', fr: 'Clinique', ar: 'العيادة' },
  },
  auto_garage: {
    members: { en: 'Vehicles', fr: 'Véhicules', ar: 'المركبات' },
    memberSingle: { en: 'Owner', fr: 'Client', ar: 'العميل' },
    registration: { en: 'Repairs', fr: 'Réparations', ar: 'التصليح' },
    plan: { en: 'Labor', fr: "Main-d'œuvre", ar: 'الأعمال' },
    shop: { en: 'Parts', fr: 'Pièces', ar: 'القطع' },
    scheduler: { en: 'Bays', fr: 'Ponts', ar: 'الورشة' },
    facility: { en: 'Garage', fr: 'Atelier', ar: 'الورشة' },
  },
  real_estate: {
    members: { en: 'Tenants', fr: 'Locataires', ar: 'المستأجرون' },
    memberSingle: { en: 'Contact', fr: 'Contact', ar: 'طرف' },
    registration: { en: 'Leases', fr: 'Baux', ar: 'العقود' },
    plan: { en: 'Properties', fr: 'Biens', ar: 'العقارات' },
    shop: { en: 'Inspections', fr: 'Visites', ar: 'المعاينة' },
    scheduler: { en: 'Visits', fr: 'Visites', ar: 'الزيارات' },
    facility: { en: 'Agency', fr: 'Agence', ar: 'الوكالة' },
  },
  manufacturing_production: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'عميل' },
    registration: { en: 'Production', fr: 'Fabrication', ar: 'التصنيع' },
    plan: { en: 'Recipes', fr: 'Recettes', ar: 'الوصفات' },
    shop: { en: 'Materials', fr: 'Matières', ar: 'المواد' },
    scheduler: { en: 'Stations', fr: 'Postes', ar: 'المحطات' },
    facility: { en: 'Factory', fr: 'Usine', ar: 'المصنع' },
  },
  legal_accounting: {
    members: { en: 'Clients', fr: 'Clients', ar: 'الموكلون' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'موكل' },
    registration: { en: 'Cases', fr: 'Dossiers', ar: 'القضايا' },
    plan: { en: 'Fees', fr: 'Honoraires', ar: 'الأتعاب' },
    shop: { en: 'Archives', fr: 'Actes', ar: 'الوثائق' },
    scheduler: { en: 'Hearings', fr: 'Audiences', ar: 'الجلسات' },
    facility: { en: 'Firm', fr: 'Cabinet', ar: 'المكتب' },
  },
  logistics_delivery: {
    members: { en: 'Merchants', fr: 'Marchands', ar: 'التجار' },
    memberSingle: { en: 'Merchant', fr: 'Marchand', ar: 'تاجر' },
    registration: { en: 'Shipments', fr: 'Colis', ar: 'الطرود' },
    plan: { en: 'Rates', fr: 'Tarifs', ar: 'الأسعار' },
    shop: { en: 'Sorting', fr: 'Tri', ar: 'الفرز' },
    scheduler: { en: 'Routes', fr: 'Tournées', ar: 'المسارات' },
    facility: { en: 'Hub', fr: 'Centre', ar: 'المركز' },
  },
  construction_contractor: {
    members: { en: 'Partners', fr: 'Partenaires', ar: 'الشركاء' },
    memberSingle: { en: 'Partner', fr: 'Intervenant', ar: 'شريك' },
    registration: { en: 'Billings', fr: 'Décomptes', ar: 'الكشوفات' },
    plan: { en: 'Estimates', fr: 'Devis', ar: 'التقديرات' },
    shop: { en: 'Supplies', fr: 'Matériaux', ar: 'المواد' },
    scheduler: { en: 'Schedule', fr: 'Planning', ar: 'المخطط' },
    facility: { en: 'Site', fr: 'Chantier', ar: 'الورشة' },
  },
  agriculture_farming: {
    members: { en: 'Buyers', fr: 'Acheteurs', ar: 'المشترون' },
    memberSingle: { en: 'Buyer', fr: 'Acheteur', ar: 'مشتري' },
    registration: { en: 'Harvest', fr: 'Récoltes', ar: 'المحاصيل' },
    plan: { en: 'Parcels', fr: 'Parcelles', ar: 'القطع' },
    shop: { en: 'Inputs', fr: 'Intrants', ar: 'المدخلات' },
    scheduler: { en: 'Calendar', fr: 'Travaux', ar: 'الروزنامة' },
    facility: { en: 'Farm', fr: 'Domaine', ar: 'المزرعة' },
  },
};

export function getCategoryTerminology(category: BusinessCategory, lang: SupportedLanguage) {
  const dict = TERMINOLOGY_STORE[category] || TERMINOLOGY_STORE.membership_session;
  return {
    members: dict.members[lang] || dict.members.en,
    memberSingle: dict.memberSingle[lang] || dict.memberSingle.en,
    registration: dict.registration[lang] || dict.registration.en,
    plan: dict.plan[lang] || dict.plan.en,
    shop: dict.shop[lang] || dict.shop.en,
    scheduler: dict.scheduler[lang] || dict.scheduler.en,
    facility: dict.facility[lang] || dict.facility.en,
  };
}

/**
 * Format elapsed seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format currency with proper symbol and decimal placement
 */
export function formatCurrencyAmount(amount: number, currency: 'DZD' | 'EUR' | 'USD' | string = 'DZD'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  switch (currency) {
    case 'EUR':
      return `€${formatted}`;
    case 'USD':
      return `$${formatted}`;
    case 'DZD':
    default:
      return `${formatted} DZD`;
  }
}

/**
 * Commercial Document Financial Calculation Engine (Category 8: B2B Trading & Distribution)
 * Computes:
 * - Total HT Raw (sum of line qty * unitPrice * (1 - lineDiscount%))
 * - Total HT Final (after general discount)
 * - Proportional VAT (TVA) distribution across items
 * - Algerian Cash Fiscal Stamp Duty (Droit de timbre fiscal: 1% capped at 2,500 DZD, min 20 DZD when paying in cash)
 * - Guarantee Retention (Retenue de garantie BTP: deducted from TTC)
 * - Net Payable (Net à Payer)
 */
export interface CommercialCalculationItem {
  quantity: number;
  unitPriceHt: number;
  discountPercent?: number;
  tvaPercent?: number;
}

export interface CommercialCalculationInput {
  items: CommercialCalculationItem[];
  generalDiscountPercent?: number;
  guaranteeRetentionPercent?: number;
  paymentMethod?: string;
  isCashFiscalStampEnabled?: boolean;
}

export interface CommercialCalculationResult {
  totalHtRaw: number;
  totalHtFinal: number;
  totalTva: number;
  timbreFiscal: number;
  totalTtc: number;
  guaranteeRetentionAmount: number;
  netToPay: number;
}

export function calculateCommercialTotals(input: CommercialCalculationInput): CommercialCalculationResult {
  const generalDiscountPercent = input.generalDiscountPercent || 0;
  const guaranteeRetentionPercent = input.guaranteeRetentionPercent || 0;
  const isCash =
    Boolean(input.isCashFiscalStampEnabled) ||
    Boolean(
      input.paymentMethod &&
        (input.paymentMethod.toLowerCase().includes('espèces') ||
          input.paymentMethod.toLowerCase().includes('especes') ||
          input.paymentMethod.toLowerCase().includes('cash') ||
          input.paymentMethod.includes('نقدا') ||
          input.paymentMethod.includes('كاش'))
    );

  let totalHtRaw = 0;
  const computedLines = (input.items || []).map((item) => {
    const qty = Number(item.quantity) || 0;
    const pu = Number(item.unitPriceHt) || 0;
    const lineDisc = Number(item.discountPercent) || 0;
    const lineHt = qty * pu * (1 - lineDisc / 100);
    totalHtRaw += lineHt;
    return {
      lineHt,
      tvaPercent: Number(item.tvaPercent) || 0,
    };
  });

  const genDiscAmount = totalHtRaw * (generalDiscountPercent / 100);
  const totalHtFinal = Math.max(0, totalHtRaw - genDiscAmount);

  // Proportional TVA distribution
  let totalTva = 0;
  computedLines.forEach((line) => {
    const lineFraction = totalHtRaw > 0 ? line.lineHt / totalHtRaw : 0;
    const adjustedLineHt = totalHtFinal * lineFraction;
    const lineTva = adjustedLineHt * (line.tvaPercent / 100);
    totalTva += lineTva;
  });

  let timbreFiscal = 0;
  if (isCash && totalHtFinal + totalTva > 0) {
    // Algerian Finance Law: 1% stamp capped at 2,500 DZD, min 20 DZD
    const calculatedStamp = (totalHtFinal + totalTva) * 0.01;
    timbreFiscal = Math.min(2500, Math.max(20, Math.round(calculatedStamp)));
  }

  const totalTtc = totalHtFinal + totalTva + timbreFiscal;
  const guaranteeRetentionAmount = totalTtc * (guaranteeRetentionPercent / 100);
  const netToPay = totalTtc - guaranteeRetentionAmount;

  return {
    totalHtRaw: Math.round(totalHtRaw * 100) / 100,
    totalHtFinal: Math.round(totalHtFinal * 100) / 100,
    totalTva: Math.round(totalTva * 100) / 100,
    timbreFiscal,
    totalTtc: Math.round(totalTtc * 100) / 100,
    guaranteeRetentionAmount: Math.round(guaranteeRetentionAmount * 100) / 100,
    netToPay: Math.round(netToPay * 100) / 100,
  };
}

/**
 * Article 317 du Code du Timbre Algérien
 * Computes progressive fiscal stamp duty strictly on cash receipts.
 */
export function calculateArt317Timbre(amountDzd: number): number {
  const amt = Math.max(0, amountDzd);
  if (amt <= 500) return 0;
  if (amt <= 3000) return 20;
  if (amt <= 10000) return 50;
  if (amt <= 50000) return 100;
  if (amt <= 100000) return 200;
  return Math.min(2500, Math.round(amt * 0.01));
}


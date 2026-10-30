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
    members: { en: 'Members', fr: 'Adhérents', ar: 'المشتركين' },
    memberSingle: { en: 'Member', fr: 'Adhérent', ar: 'مشترك' },
    registration: { en: 'Registrations', fr: 'Inscriptions', ar: 'التسجيلات' },
    plan: { en: 'Membership Plans', fr: 'Abonnements', ar: 'الاشتراكات' },
    shop: { en: 'Pro Shop', fr: 'Boutique Pro-Shop', ar: 'المتجر الرياضي' },
    scheduler: { en: 'Class Schedule', fr: 'Planning des séances', ar: 'جدول الحصص التدريبية' },
    facility: { en: 'Fitness Club', fr: 'Salle de sport', ar: 'القاعة الرياضية' },
  },
  appointment_service: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'عميل' },
    registration: { en: 'Appointments', fr: 'Rendez-vous', ar: 'المواعيد' },
    plan: { en: 'Service Packages', fr: 'Forfaits services', ar: 'باقات الخدمات' },
    shop: { en: 'Beauty Store', fr: 'Boutique soins', ar: 'منتجات التجميل' },
    scheduler: { en: 'Booking Calendar', fr: 'Calendrier réservations', ar: 'تقويم الحجوزات' },
    facility: { en: 'Salon Location', fr: 'Salon', ar: 'فرع الصالون' },
  },
  pos_inventory: {
    members: { en: 'Customers', fr: 'Clients', ar: 'الزبائن' },
    memberSingle: { en: 'Customer', fr: 'Client', ar: 'زبون' },
    registration: { en: 'Sales & Invoices', fr: 'Ventes & Factures', ar: 'المبيعات والفواتير' },
    plan: { en: 'Categories & Bundles', fr: 'Catégories & Lots', ar: 'التصنيفات والباقات' },
    shop: { en: 'POS Register & Inventory', fr: 'Caisse & Stock', ar: 'نقطة البيع والمخزون' },
    scheduler: { en: 'Shifts & Schedule', fr: 'Horaires & Équipe', ar: 'الورديات وجداول العمل' },
    facility: { en: 'Store / Branch', fr: 'Point de vente', ar: 'الفرع / المتجر' },
  },
  project_milestone: {
    members: { en: 'Contacts & Clients', fr: 'Contacts & Clients', ar: 'جهات الاتصال' },
    memberSingle: { en: 'Contact', fr: 'Contact', ar: 'جهة اتصال' },
    registration: { en: 'Inquiries & Leads', fr: 'Demandes & Prospects', ar: 'الاستفسارات' },
    plan: { en: 'Retainer Packages', fr: 'Contrats de service', ar: 'عقود الخدمات' },
    shop: { en: 'Billable Items', fr: 'Articles facturables', ar: 'بنود الفوترة' },
    scheduler: { en: 'Milestone Timeline', fr: 'Échéancier', ar: 'الجدول الزمني' },
    facility: { en: 'Agency Office', fr: 'Agence', ar: 'مكتب الوكالة' },
  },
  rental_booking: {
    members: { en: 'Renters & Guests', fr: 'Locataires & Invités', ar: 'المستأجرون والضيوف' },
    memberSingle: { en: 'Renter', fr: 'Locataire', ar: 'مستأجر' },
    registration: { en: 'Booking Requests', fr: 'Demandes de location', ar: 'طلبات الحجز' },
    plan: { en: 'Rental Tiers', fr: 'Tarifs de location', ar: 'باقات الإيجار' },
    shop: { en: 'Add-on Equipment', fr: 'Équipements optionnels', ar: 'المعدات الإضافية' },
    scheduler: { en: 'Occupancy Calendar', fr: 'Calendrier d\'occupation', ar: 'تقويم الإشغال' },
    facility: { en: 'Venue Location', fr: 'Espace', ar: 'الموقع' },
  },
  education_cohort: {
    members: { en: 'Students', fr: 'Étudiants', ar: 'الطلاب' },
    memberSingle: { en: 'Student', fr: 'Étudiant', ar: 'طالب' },
    registration: { en: 'Enrollments', fr: 'Inscriptions', ar: 'طلبات التسجيل' },
    plan: { en: 'Tuition Programs', fr: 'Programmes de cours', ar: 'البرامج الدراسية' },
    shop: { en: 'Books & Supplies', fr: 'Fournitures & Livres', ar: 'الكتب واللوازم' },
    scheduler: { en: 'Class Timetable', fr: 'Emploi du temps', ar: 'جدول الحصص' },
    facility: { en: 'Campus Branch', fr: 'Campus', ar: 'المركز الدراسي' },
  },
  freelance_solo: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'عميل' },
    registration: { en: 'Proposals & Inquiries', fr: 'Devis & Prospections', ar: 'العروض والاستفسارات' },
    plan: { en: 'Service Packages & Retainers', fr: 'Forfaits & Abonnements', ar: 'باقات الخدمات والاشتراكات' },
    shop: { en: 'Invoices & Billing', fr: 'Facturation & Règlements', ar: 'الفواتير والمدفوعات' },
    scheduler: { en: 'Deliverables & Deadlines', fr: 'Livrables & Délais', ar: 'المشاريع والمواعيد' },
    facility: { en: 'Studio / Workspace', fr: 'Studio / Espace', ar: 'مساحة العمل' },
  },
  trading_commercial: {
    members: { en: 'B2B Clients', fr: 'Clients B2B', ar: 'الزبائن والشركات' },
    memberSingle: { en: 'B2B Client', fr: 'Client B2B', ar: 'زبون تجاري' },
    registration: { en: 'Sales & Quotations', fr: 'Devis & Bons de Vente', ar: 'العروض وطلبيات البيع' },
    plan: { en: 'Catalog & Services', fr: 'Catalogue & Services', ar: 'كتالوج المنتجات والخدمات' },
    shop: { en: 'Warehouse & Stock', fr: 'Dépôts & Stock', ar: 'المستودعات والمخزون' },
    scheduler: { en: 'Purchases & Receiving', fr: 'Achats & Réceptions', ar: 'المشتريات والاستلام' },
    facility: { en: 'Distribution Depot', fr: 'Dépôt / Entrepôt', ar: 'المستودع الرئيسي' },
  },
  medical_clinic: {
    members: { en: 'Patients', fr: 'Patients', ar: 'المرضى' },
    memberSingle: { en: 'Patient', fr: 'Patient', ar: 'مريض' },
    registration: { en: 'Consultations & Queue', fr: 'Consultations & File', ar: 'الفحوصات وقائمة الانتظار' },
    plan: { en: 'Medical Acts & Care', fr: 'Actes & Soins médicaux', ar: 'الأعمال والخدمات الطبية' },
    shop: { en: 'Pharmacy & Supplies', fr: 'Pharmacie & Consommables', ar: 'الصيدلية والمستلزمات' },
    scheduler: { en: 'Doctor Roster', fr: 'Planning des Médecins', ar: 'جدول الأطباء والمواعيد' },
    facility: { en: 'Medical Center', fr: 'Cabinet / Clinique', ar: 'العيادة / المركز الطبي' },
  },
  auto_garage: {
    members: { en: 'Vehicle Owners', fr: 'Propriétaires & Flottes', ar: 'أصحاب المركبات' },
    memberSingle: { en: 'Vehicle Owner', fr: 'Client / Propriétaire', ar: 'صاحب المركبة' },
    registration: { en: 'Work Orders & OR', fr: 'Ordres de Réparation (OR)', ar: 'أوامر التصليح (OR)' },
    plan: { en: 'Labor Rates & Tasks', fr: 'Forfaits Main d\'œuvre', ar: 'باقات المصنعية واليد العاملة' },
    shop: { en: 'Spare Parts Depot', fr: 'Magasin Pièces Détachées', ar: 'مستودع قطع الغيار' },
    scheduler: { en: 'Bay & Lift Schedule', fr: 'Planning des Ponts & Lifts', ar: 'جدول الرافعات والورشة' },
    facility: { en: 'Garage Workshop', fr: 'Atelier Mécanique', ar: 'ورشة الميكانيك' },
  },
  real_estate: {
    members: { en: 'Tenants & Landlords', fr: 'Locataires & Propriétaires', ar: 'المستأجرون والملاك' },
    memberSingle: { en: 'Party', fr: 'Partie prenante', ar: 'طرف العقد' },
    registration: { en: 'Leases & Rent Roll', fr: 'Baux & Quittances', ar: 'عقود الإيجار والوصولات' },
    plan: { en: 'Property Listings', fr: 'Biens Immobiliers', ar: 'العقارات المعروضة' },
    shop: { en: 'Inspections & Repairs', fr: 'États des Lieux & Travaux', ar: 'معاينات الدخول والأشغال' },
    scheduler: { en: 'Visits & Key Handover', fr: 'Visites & Remise des Clés', ar: 'مواعيد المعاينة والمفاتيح' },
    facility: { en: 'Real Estate Agency', fr: 'Agence Immobilière', ar: 'الوكالة العقارية' },
  },
  manufacturing_production: {
    members: { en: 'Clients & Distributors', fr: 'Clients & Distributeurs', ar: 'الزبائن والموزعون' },
    memberSingle: { en: 'Client', fr: 'Client', ar: 'زبون' },
    registration: { en: 'Production Orders (OF)', fr: 'Ordres de Fabrication (OF)', ar: 'أوامر التصنيع (OF)' },
    plan: { en: 'BOM & Recipes', fr: 'Nomenclatures (BOM)', ar: 'قوائم المواد والوصفات' },
    shop: { en: 'Raw Materials & Parts', fr: 'Matières Premières', ar: 'المواد الأولية والمخزون' },
    scheduler: { en: 'Workstation Schedule', fr: 'Planning Postes de Travail', ar: 'جدول محطات التشغيل' },
    facility: { en: 'Production Plant', fr: 'Usine / Manufacture', ar: 'المصنع / الورشة' },
  },
  legal_accounting: {
    members: { en: 'Clients & Principals', fr: 'Clients & Mandants', ar: 'الموكلون والعملاء' },
    memberSingle: { en: 'Client', fr: 'Client / Mandant', ar: 'موكل' },
    registration: { en: 'Dockets & Matters', fr: 'Dossiers & Affaires', ar: 'الملفات والقضايا' },
    plan: { en: 'Fee Schedules & Trusts', fr: 'Honoraires & Séquestres', ar: 'الأتعاب وحسابات الأمانة' },
    shop: { en: 'Legal Vault & Docs', fr: 'Actes & Pièces du Dossier', ar: 'خزينة الوثائق والمستندات' },
    scheduler: { en: 'Court Hearings Diary', fr: 'Rôle des Audiences', ar: 'جدول الجلسات القضائية' },
    facility: { en: 'Cabinet / Law Firm', fr: 'Cabinet d\'Avocats / Conseil', ar: 'مكتب المحاماة والاستشارات' },
  },
  logistics_delivery: {
    members: { en: 'Merchants & Senders', fr: 'E-commerçants & Expéditeurs', ar: 'التجار والمرسلون' },
    memberSingle: { en: 'Merchant', fr: 'Commerçant', ar: 'تاجر' },
    registration: { en: 'Shipments & Waybills', fr: 'Bordereaux d\'Expédition', ar: 'الطرود وبوالص الشحن' },
    plan: { en: 'Delivery Tariffs & Zones', fr: 'Grille Tarifaire Wilayas', ar: 'تعريفات التوصيل والولايات' },
    shop: { en: 'Hub Sorting & Storage', fr: 'Dépôt & Tri Hub', ar: 'مستودع الفرز والتخزين' },
    scheduler: { en: 'Driver Manifests & Runs', fr: 'Feuilles de Route Chauffeurs', ar: 'جولات وسائقي التوصيل' },
    facility: { en: 'Logistics Hub', fr: 'Centre de Tri / Hub', ar: 'مركز الفرز اللوجستي' },
  },
  construction_contractor: {
    members: { en: 'Clients & Subcontractors', fr: 'Maîtres d\'Ouvrage & Sous-traitants', ar: 'أصحاب المشاريع والمقاولون' },
    memberSingle: { en: 'Stakeholder', fr: 'Intervenant Chantier', ar: 'متدخل' },
    registration: { en: 'Progress & Decomptes', fr: 'Attachements & Décomptes (DGP)', ar: 'كشوفات الأشغال والفواتير (DGP)' },
    plan: { en: 'Bill of Quantities (BOQ)', fr: 'Devis Quantitatif (BPU)', ar: 'جدول الكميات والأسعار (BOQ)' },
    shop: { en: 'Site Depot & Materials', fr: 'Matériaux & Équipements', ar: 'مواد البناء ومعدات الورشة' },
    scheduler: { en: 'Site Gantt & Milestones', fr: 'Planning Chantier', ar: 'مخطط سير الأشغال' },
    facility: { en: 'Construction Site', fr: 'Direction Chantier', ar: 'إدارة الورشة والمشاريع' },
  },
  agriculture_farming: {
    members: { en: 'Buyers & Cooperatives', fr: 'Acheteurs & Coopératives', ar: 'المشترون والتعاونيات' },
    memberSingle: { en: 'Buyer', fr: 'Acheteur', ar: 'مشتري' },
    registration: { en: 'Harvests & Public Scale', fr: 'Récoltes & Poids Public', ar: 'المحاصيل وميزان القبان' },
    plan: { en: 'Crops & Parcel Registry', fr: 'Parcelles & Assolement', ar: 'القطع الفلاحية والمحاصيل' },
    shop: { en: 'Farm Inputs & Seeds', fr: 'Engrais, Semences & Intrants', ar: 'الأسمدة والبذور والمدخلات' },
    scheduler: { en: 'Cultural Calendar', fr: 'Calendrier des Travaux', ar: 'الروزنامة الفلاحية' },
    facility: { en: 'Agricultural Estate', fr: 'Exploitation Agricole', ar: 'المستثمرة الفلاحية' },
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


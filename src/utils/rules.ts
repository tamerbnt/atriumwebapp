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
  if (status === 'InChair') return lang === 'ar' ? 'في الجلسة' : lang === 'fr' ? 'Au fauteuil' : 'In Chair';
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


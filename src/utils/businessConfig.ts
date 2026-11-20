import type {
  Business,
  BusinessCategory,
  BusinessCategoryConfig,
  CategoryFormule,
  CategoryFormuleType,
  CategorySpecificSettings,
  CurrencyCode,
  FiscalProfile,
  HomeSetupProgress,
  HomeSetupStep,
  OnboardingContext,
  SupportedLanguage,
  MembershipPlan,
  ServiceItem,
  SalonWorkstation,
  Product,
  ReceiptConfig,
  StaffMember,
  FreelanceClient,
  RentableUnit,
  EduCourse,
  EduClassroom,
  PMCollateralItem,
  WarehouseDepot,
  MedicalConsultation,
  RealEstateProperty,
  ManufacturingBom,
  LegalMatter,
  ContractorProject,
  AgriParcel,
  ScheduleEvent,
} from '../types/index';

export function isExecutiveRole(role?: string | null, roleRank?: number): boolean {
  if (typeof roleRank === 'number' && roleRank >= 8) return true;
  const r = String(role || '').toLowerCase();
  return (
    r === 'owner' ||
    r === 'manager' ||
    r === 'agencydirector' ||
    r === 'agency_director' ||
    r === 'gerant' ||
    r === 'direction' ||
    r === 'directeur' ||
    r === 'avocat_associe' ||
    r === 'notaire_titulaire' ||
    r === 'expert_comptable'
  );
}

export const ALL_BUSINESS_CATEGORIES: BusinessCategory[] = [
  'membership_session',
  'appointment_service',
  'pos_inventory',
  'project_milestone',
  'rental_booking',
  'education_cohort',
  'freelance_solo',
  'trading_commercial',
  'medical_clinic',
  'auto_garage',
  'real_estate',
  'manufacturing_production',
  'legal_accounting',
  'logistics_delivery',
  'construction_contractor',
  'agriculture_farming',
];

export function getDefaultFiscalLicenseLabel(
  category: BusinessCategory,
  language: SupportedLanguage = 'fr'
): string {
  const isAr = language === 'ar';
  const isFr = language === 'fr';
  switch (category) {
    case 'medical_clinic':
      return isAr ? 'رقم التسجيل في عمادة الأطباء (CNOM)' : isFr ? 'N° Ordre / Agrément Sanitaire (CNOM)' : 'Medical Board / CNOM License N°';
    case 'real_estate':
      return isAr ? 'البطاقة المهنية للوكيل العقاري' : isFr ? 'Carte Professionnelle Agent Immobilier' : 'Real Estate Broker License N°';
    case 'legal_accounting':
      return isAr ? 'رقم القيد في نقابة المحامين / الموثقين' : isFr ? 'N° Barreau / Ordre / Chambre Notariale' : 'Bar / Chamber Registration N°';
    case 'construction_contractor':
      return isAr ? 'شهادة التأهيل / رقم CACOBATPH' : isFr ? 'Qualification BTP / N° CACOBATPH' : 'BTP Qualification / CACOBATPH N°';
    case 'agriculture_farming':
      return isAr ? 'بطاقة الفلاح / امتياز ANRH' : isFr ? 'Carte Fellah / Concession ANRH' : 'Fellah Card / ANRH Concession N°';
    case 'logistics_delivery':
      return isAr ? 'رخصة النقل وتوصيل الطرود' : isFr ? 'Agrément Transport & Messagerie' : 'Transport & Courier Permit N°';
    case 'education_cohort':
      return isAr ? 'اعتماد التكوين المهني / التربوي' : isFr ? 'N° Agrément Formation / Éducation' : 'Academy Accreditation N°';
    case 'auto_garage':
      return isAr ? 'اعتماد الورشة الميكانيكية' : isFr ? 'Agrément Atelier Mécanique' : 'Workshop Operating License N°';
    default:
      return isAr ? 'رقم الرخصة أو الاعتماد المهني' : isFr ? 'N° Agrément / Licence professionnelle' : 'Professional License / Permit N°';
  }
}

export function getCategoryFiscalDefaults(category: BusinessCategory): {
  currency: CurrencyCode;
  defaultTvaRate: number;
  applyTimbreFiscal: boolean;
  categorySettings: CategorySpecificSettings;
} {
  switch (category) {
    case 'membership_session':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          rfidExpiryWarningDays: 5,
          maxFreezeDaysPerYear: 30,
          defaultDayPassDzd: 1000,
          studioCapacity: 45,
        },
      };
    case 'appointment_service':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          defaultCommissionPercent: 35,
          slotIntervalMinutes: 30,
          cancellationWindowHours: 12,
        },
      };
    case 'pos_inventory':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          openingCashFloatDzd: 15000,
          lowStockThreshold: 10,
          allowNegativeStock: false,
        },
      };
    case 'project_milestone':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          directionApprovalThresholdDzd: 100000,
          targetMarginPercent: 28,
          requireBatBeforePrint: true,
        },
      };
    case 'rental_booking':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          defaultSecurityDepositPercent: 30,
          turnoverBufferHours: 2,
          overtimeHourlyFeeDzd: 3500,
        },
      };
    case 'education_cohort':
      return {
        currency: 'DZD',
        defaultTvaRate: 0,
        applyTimbreFiscal: true,
        categorySettings: {
          registrationFeeDzd: 2500,
          passingGradeOutOf20: 10,
          minAttendancePercentForCertificate: 80,
        },
      };
    case 'freelance_solo':
      return {
        currency: 'EUR',
        defaultTvaRate: 0,
        applyTimbreFiscal: false,
        categorySettings: {
          defaultHourlyRate: 45,
          taxReservePercent: 20,
          invoicePaymentTermsDays: 15,
        },
      };
    case 'trading_commercial':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          defaultCreditLimitDzd: 500000,
          defaultNetDays: 30,
          requireLegalIdsOnFacture: true,
        },
      };
    case 'medical_clinic':
      return {
        currency: 'DZD',
        defaultTvaRate: 0,
        applyTimbreFiscal: false,
        categorySettings: {
          cnasChifaEnabled: true,
          ordonnancePaperSize: 'A5',
          queueTicketPrefix: 'M-',
        },
      };
    case 'auto_garage':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          workshopHourlyRateDzd: 2500,
          warrantyDays: 90,
          warrantyKm: 5000,
        },
      };
    case 'real_estate':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          defaultAgencyManagementFeePercent: 7,
          defaultSaleCommissionPercent: 2,
          quittanceBillingDay: 5,
        },
      };
    case 'manufacturing_production':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          overheadPercent: 12,
          scrapTolerancePercent: 3,
          batchCodePrefix: 'LOT-',
        },
      };
    case 'legal_accounting':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          legalPracticeMode: 'Avocat',
          cpcaAlertDays: 10,
          defaultRetainerPercent: 40,
        },
      };
    case 'logistics_delivery':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          codRemittanceFeePercent: 1.5,
          baseWeightThresholdKg: 5,
          parcelTrackingPrefix: 'ATR-',
        },
      };
    case 'construction_contractor':
      return {
        currency: 'DZD',
        defaultTvaRate: 19,
        applyTimbreFiscal: true,
        categorySettings: {
          retenueGarantiePercent: 5,
          avanceForfaitairePercent: 15,
          defaultSituationsUnit: 'm2',
        },
      };
    case 'agriculture_farming':
      return {
        currency: 'DZD',
        defaultTvaRate: 0,
        applyTimbreFiscal: false,
        categorySettings: {
          waterQuotaM3PerHa: 4500,
          onilMilkPricePerLiterDzd: 48,
          onilSubsidyPerLiterDzd: 12,
        },
      };
  }
}

export function deriveCategoryConfigDefaultsFromOnboarding(
  category: BusinessCategory,
  ctx?: OnboardingContext
): {
  currency: CurrencyCode;
  defaultTvaRate: number;
  applyTimbreFiscal: boolean;
  fiscalProfile: FiscalProfile;
  categorySettings: CategorySpecificSettings;
} {
  const base = getCategoryFiscalDefaults(category);
  let defaultTvaRate = base.defaultTvaRate;
  let applyTimbreFiscal = base.applyTimbreFiscal;
  const currency = base.currency;
  const categorySettings: CategorySpecificSettings = { ...base.categorySettings };
  const fiscalProfile: FiscalProfile = {
    wilayaCode: ctx?.wilayaCode || '16',
    legalForm:
      ctx?.teamScale === 'solo'
        ? 'AutoEntrepreneur'
        : category === 'medical_clinic' || category === 'legal_accounting'
        ? 'Liberal'
        : 'SARL',
  };

  if (ctx?.settlementStyle === 'b2b_tva') {
    defaultTvaRate = 19;
    applyTimbreFiscal = true;
    if (category === 'trading_commercial') {
      categorySettings.requireLegalIdsOnFacture = true;
    }
  } else if (ctx?.settlementStyle === 'pos_cash') {
    applyTimbreFiscal = true;
  } else if (ctx?.settlementStyle === 'ccp_postal') {
    if (category === 'project_milestone') {
      categorySettings.directionApprovalThresholdDzd = 80000;
    }
  } else if (ctx?.settlementStyle === 'recurring_retainer') {
    if (category === 'rental_booking') {
      categorySettings.defaultSecurityDepositPercent = 30;
    }
  }

  return {
    currency,
    defaultTvaRate,
    applyTimbreFiscal,
    fiscalProfile,
    categorySettings,
  };
}

export function createDefaultBusinessConfig(
  business: Pick<Business, 'id' | 'accountId' | 'category'>,
  onboardingContext?: OnboardingContext,
  branchId?: string
): BusinessCategoryConfig {
  const derived = deriveCategoryConfigDefaultsFromOnboarding(business.category, onboardingContext);
  return {
    id: `cfg_${business.id}`,
    accountId: business.accountId,
    businessId: business.id,
    branchId,
    category: business.category,
    currency: derived.currency,
    defaultTvaRate: derived.defaultTvaRate,
    applyTimbreFiscal: derived.applyTimbreFiscal,
    fiscalProfile: derived.fiscalProfile,
    onboardingContext: onboardingContext ? { ...onboardingContext } : {},
    categorySettings: derived.categorySettings,
    setupState: { dismissed: false, completedStepIds: [] },
    updatedAt: new Date().toISOString(),
  };
}

export interface FormuleKindDescriptor {
  mode:
    | 'gym_plans'
    | 'salon_services'
    | 'freelance_services'
    | 'edu_courses'
    | 'rental_units'
    | 'pm_collateral'
    | 'mfg_bom'
    | 'logistics_tariffs'
    | 'category_formules';
  formuleType: CategoryFormuleType;
  titleEn: string;
  titleFr: string;
  titleAr: string;
  subtitleEn: string;
  subtitleFr: string;
  subtitleAr: string;
  supportsPrice: boolean;
  supportsRate: boolean;
  supportsDuration: boolean;
  primaryRateLabelEn: string;
  primaryRateLabelFr: string;
  primaryRateLabelAr: string;
}

export function getFormuleKindForCategory(category: BusinessCategory): FormuleKindDescriptor {
  switch (category) {
    case 'membership_session':
      return {
        mode: 'gym_plans',
        formuleType: 'membership_plan',
        titleEn: 'Membership Formules & Passes',
        titleFr: "Formules d'Abonnement",
        titleAr: 'صيغ وباقات الاشتراك',
        subtitleEn: 'Configure club tiers, weekly quotas, durations, and walk-in eligibility.',
        subtitleFr: 'Gérez vos formules mensuelles, trimestrielles, carnets de séances et pass.',
        subtitleAr: 'إدارة باقات الاشتراك، الحصص الأسبوعية، المدة، وبطاقات الدخول اليومية.',
        supportsPrice: true,
        supportsRate: false,
        supportsDuration: true,
        primaryRateLabelEn: 'Sessions / Week',
        primaryRateLabelFr: 'Séances / Sem.',
        primaryRateLabelAr: 'الحصص / أسبوع',
      };
    case 'appointment_service':
      return {
        mode: 'salon_services',
        formuleType: 'salon_service',
        titleEn: 'Service Menu & Treatment Formules',
        titleFr: 'Carte des Prestations & Formules',
        titleAr: 'قائمة الخدمات وصيغ العناية',
        subtitleEn: 'Manage salon/spa services, chair durations, prices, and stylist commission rates.',
        subtitleFr: 'Prestations coiffure/esthétique, durées, tarifs et commissions coiffeurs.',
        subtitleAr: 'خدمات التجميل والحلاقة، المدة الزمنية، الأسعار ونسبة العمولة.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Commission (%)',
        primaryRateLabelFr: 'Commission (%)',
        primaryRateLabelAr: 'نسبة العمولة (%)',
      };
    case 'pos_inventory':
      return {
        mode: 'category_formules',
        formuleType: 'pos_combo',
        titleEn: 'Menu Combos, Happy Hour & Receipt Formules',
        titleFr: 'Formules Menu, Combos & Remises POS',
        titleAr: 'الوجبات المركبة وصيغ نقاط البيع',
        subtitleEn: 'Configure combo menus, bundle pricing, TVA rates, and POS thermal ticket settings.',
        subtitleFr: 'Formules déjeuner, menus combinés, remises caisse et configuration ticket thermique.',
        subtitleAr: 'إدارة القوائم المركبة، تخفيضات الصندوق، وإعدادات وصل الدفع الحراري.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: false,
        primaryRateLabelEn: 'Discount (%)',
        primaryRateLabelFr: 'Remise (%)',
        primaryRateLabelAr: 'نسبة الخصم (%)',
      };
    case 'project_milestone':
      return {
        mode: 'category_formules',
        formuleType: 'agency_retainer',
        titleEn: 'Agency Retainer & Deliverable Formules',
        titleFr: 'Formules Retainer & Livrables Agence',
        titleAr: 'صيغ التعاقد الشهري ومخرجات الوكالة',
        subtitleEn: 'Standardize monthly retainers, campaign packs, and print/event collateral fees.',
        subtitleFr: 'Forfaits mensuels, packs activation terrain et catalogue de supports imprimés.',
        subtitleAr: 'توحيد باقات التعاقد الشهري، الحملات الإعلانية وأسعار المطبوعات.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Target Margin (%)',
        primaryRateLabelFr: 'Marge Cible (%)',
        primaryRateLabelAr: 'هامش الربح المستهدف (%)',
      };
    case 'rental_booking':
      return {
        mode: 'rental_units',
        formuleType: 'venue_addon',
        titleEn: 'Venues, Spaces & Rental Formules',
        titleFr: 'Espaces, Salles & Options Locatives',
        titleAr: 'القاعات وصيغ الكراء والملحقات',
        subtitleEn: 'Manage hourly/daily room rates, capacities, security deposits, and add-on packs.',
        subtitleFr: 'Tarifs horaires/journaliers des salles, capacités, cautions et options.',
        subtitleAr: 'أسعار القاعات بالساعة أو اليوم، السعة الاستيعابية، الضمان والخدمات الإضافية.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Deposit (%)',
        primaryRateLabelFr: 'Caution (%)',
        primaryRateLabelAr: 'نسبة الضمان (%)',
      };
    case 'education_cohort':
      return {
        mode: 'edu_courses',
        formuleType: 'tuition_installment',
        titleEn: 'Courses & Tuition Formules',
        titleFr: 'Formations & Échéanciers Scolaires',
        titleAr: 'البرامج التكوينية وصيغ التقسيط',
        subtitleEn: 'Manage academy courses, cohort pricing, installment schedules, and certificate rules.',
        subtitleFr: 'Modules de formation, frais de scolarité, plans en tranches et seuils.',
        subtitleAr: 'المسارات التكوينية، رسوم التسجيل، دفعات التقسيط وشروط الشهادات.',
        supportsPrice: true,
        supportsRate: false,
        supportsDuration: true,
        primaryRateLabelEn: 'Hours',
        primaryRateLabelFr: 'Volume (h)',
        primaryRateLabelAr: 'الساعات',
      };
    case 'freelance_solo':
      return {
        mode: 'category_formules',
        formuleType: 'freelance_package',
        titleEn: 'Consulting & Sprint Service Formules',
        titleFr: 'Forfaits Prestations & TJM Solo',
        titleAr: 'باقات الخدمات والتسعير الحر',
        subtitleEn: 'Define hourly/daily TJM rates, fixed-scope sprints, and monthly maintenance retainers.',
        subtitleFr: 'Tarifs TJM, sprints au forfait et maintenances mensuelles.',
        subtitleAr: 'تحديد سعر الساعة/اليوم، باقات المشاريع الثابتة، وعقود المتابعة الشهرية.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Reserve (%)',
        primaryRateLabelFr: 'Réserve (%)',
        primaryRateLabelAr: 'الاحتياط الضريبي (%)',
      };
    case 'trading_commercial':
      return {
        mode: 'category_formules',
        formuleType: 'wholesale_tier',
        titleEn: 'Wholesale Pricing Tiers (Grossiste / Détail)',
        titleFr: 'Grilles Tarifaires B2B & Remises Volume',
        titleAr: 'سلالم أسعار الجملة ونصف الجملة',
        subtitleEn: 'Manage Grossiste, Demi-Gros, and Détaillant margin tiers and credit rules.',
        subtitleFr: 'Paliers Grossiste, Demi-Gros, Détaillant et plafonds d’encours.',
        subtitleAr: 'إدارة هوامش الجملة ونصف الجملة والتجزئة وشروط الدفع الآجل.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Margin / Disc (%)',
        primaryRateLabelFr: 'Marge / Remise (%)',
        primaryRateLabelAr: 'الهامش / الخصم (%)',
      };
    case 'medical_clinic':
      return {
        mode: 'category_formules',
        formuleType: 'medical_act',
        titleEn: 'Medical Consultation & NGAP / Chifa Acts',
        titleFr: 'Tarifs Consultations & Actes NGAP / Chifa',
        titleAr: 'تعريفات الفحص الطبي والأعمال (NGAP / الشفاء)',
        subtitleEn: 'Manage consultation fees, echography/care acts, Chifa coverage, and ordonnance header.',
        subtitleFr: 'Consultations spécialisées, actes techniques, prise en charge Chifa et ordonnance.',
        subtitleAr: 'تسعير الاستشارات الطبية، الفحوصات المتخصصة، تعويض بطاقة الشفاء وترويسة الوصفة.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Chifa Cover (%)',
        primaryRateLabelFr: 'Taux Chifa (%)',
        primaryRateLabelAr: 'تغطية الشفاء (%)',
      };
    case 'auto_garage':
      return {
        mode: 'category_formules',
        formuleType: 'garage_pack',
        titleEn: 'Maintenance Packs & Fleet Labor Formules',
        titleFr: 'Forfaits Entretien, Vidange & Barèmes Flotte',
        titleAr: 'باقات الصيانة السريعة وتعريفات الأسطول',
        subtitleEn: 'Standardize Vidange, Diagnostic OBD, Freinage packs and fleet discount contracts.',
        subtitleFr: 'Packs Vidange, Diagnostic valise, Kit distribution et tarifs flottes.',
        subtitleAr: 'توحيد باقات تغيير الزيت، الفحص الإلكتروني، الفرامل، وعقود صيانة الأساطيل.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Discount (%)',
        primaryRateLabelFr: 'Remise (%)',
        primaryRateLabelAr: 'نسبة الخصم (%)',
      };
    case 'real_estate':
      return {
        mode: 'category_formules',
        formuleType: 'realestate_commission',
        titleEn: 'Agency Commission & Management Formules',
        titleFr: 'Barèmes Commissions Vente & Gestion Locative',
        titleAr: 'سلالم العمولات العقارية وإدارة الإيجار',
        subtitleEn: 'Configure Décret 09-18 sale brackets, rental management fee %, and quittance rules.',
        subtitleFr: 'Honoraires de vente, taux de gestion locative (%) et frais d’état des lieux.',
        subtitleAr: 'تحديد نسب عمولات البيع، عمولة التسيير الإيجاري، ورسوم وصولات الكراء.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Fee Rate (%)',
        primaryRateLabelFr: 'Taux (%)',
        primaryRateLabelAr: 'النسبة (%)',
      };
    case 'manufacturing_production':
      return {
        mode: 'category_formules',
        formuleType: 'mfg_preset',
        titleEn: 'Production Presets & Overhead Cost Formules',
        titleFr: 'Formules de Coûts Atelier & Gammes Production',
        titleAr: 'صيغ تكاليف الورشات ومعايير التصنيع',
        subtitleEn: 'Configure machine hourly cost rates, indirect overhead allocation, and QC presets.',
        subtitleFr: 'Coûts horaires machines, frais généraux indirects et seuils contrôle qualité.',
        subtitleAr: 'تكلفة الساعة للآلات، المصاريف غير المباشرة، ومعايير مراقبة الجودة.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Overhead (%)',
        primaryRateLabelFr: 'Frais Généraux (%)',
        primaryRateLabelAr: 'المصاريف (%)',
      };
    case 'legal_accounting':
      return {
        mode: 'category_formules',
        formuleType: 'legal_honoraire',
        titleEn: 'Honoraires, Acts & Retainer Formules',
        titleFr: "Barèmes d'Honoraires, Actes & Forfaits Cabinet",
        titleAr: 'أتعاب المحاماة والعقود التوثيقية والمحاسبة',
        subtitleEn: 'Standardize consultation fees, pleading provisions, Bilan SCF, and notarized acts.',
        subtitleFr: 'Consultations, provisions de plaidoirie, bilans SCF, G50 et actes notariés.',
        subtitleAr: 'الاستشارات القانونية، المرافعات، الميزانية السنوية G50، والعقود التوثيقية.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Provision (%)',
        primaryRateLabelFr: 'Provision (%)',
        primaryRateLabelAr: 'التسبيق (%)',
      };
    case 'logistics_delivery':
      return {
        mode: 'logistics_tariffs',
        formuleType: 'courier_tier',
        titleEn: 'Wilaya Tariff Matrix & Courier Tiers',
        titleFr: 'Grilles Tarifaires 58 Wilayas & Offres Coursiers',
        titleAr: 'تعريفات التوصيل 58 ولاية وصيغ الموزعين',
        subtitleEn: 'Configure Domicile / Stop-Desk / Retour pricing across 58 wilayas and COD tiers.',
        subtitleFr: 'Tarifs Domicile, Stop-Desk, Retour par wilaya et remises e-commerçants.',
        subtitleAr: 'تسعيرة التوصيل للمنزل ونقطة الاستلام والمرتجعات لـ 58 ولاية وعقود التجار.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'COD Fee (%)',
        primaryRateLabelFr: 'Frais COD (%)',
        primaryRateLabelAr: 'عمولة التحصيل (%)',
      };
    case 'construction_contractor':
      return {
        mode: 'category_formules',
        formuleType: 'btp_boq_rate',
        titleEn: "Corps d'État & BOQ Unit Rate Formules",
        titleFr: 'Bibliothèque Prix Unitaires BTP (Bordereau / DQE)',
        titleAr: 'مكتبة الأسعار الوحدوية للأشغال (DQE / البناء)',
        subtitleEn: 'Standardize concrete, rebar, masonry, and finishing unit rates for Situations de Travaux.',
        subtitleFr: 'Prix unitaires béton, ferraillage, maçonnerie et lots techniques.',
        subtitleAr: 'الأسعار المرجعية للخرسانة، الحديد، البناء والتهيئة لحساب وضعيات الأشغال.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Retenue (%)',
        primaryRateLabelFr: 'Retenue (%)',
        primaryRateLabelAr: 'اقتطاع الضمان (%)',
      };
    case 'agriculture_farming':
      return {
        mode: 'category_formules',
        formuleType: 'agri_piecework',
        titleEn: 'Piecework Harvest & ONIL Dairy Formules',
        titleFr: 'Barèmes Cueillette, Journaliers & Laiterie ONIL',
        titleAr: 'تعريفات الجني اليومي وحصص الحليب ONIL',
        subtitleEn: 'Configure crate/kg picking rates, seasonal worker daily rates, and ONIL milk pricing.',
        subtitleFr: 'Prix par caisse/kg cueilli, forfait journalier saisonniers et barème lait ONIL.',
        subtitleAr: 'أجرة الصندوق والكيلوغرام، أجر العامل الموسمي، وتسعيرة جمع الحليب.',
        supportsPrice: true,
        supportsRate: true,
        supportsDuration: true,
        primaryRateLabelEn: 'Bonus / Subsidy (%)',
        primaryRateLabelFr: 'Prime / Subv. (%)',
        primaryRateLabelAr: 'المنحة / الدعم (%)',
      };
  }
}

export function createStarterFormulesForCategory(
  category: BusinessCategory,
  businessId: string,
  accountId?: string,
  branchId?: string,
  currency: CurrencyCode = 'DZD',
  taxRate = 19
): CategoryFormule[] {
  const base = {
    accountId,
    businessId,
    branchId,
    category,
    currency,
    taxRate,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  switch (category) {
    case 'pos_inventory':
      return [
        {
          ...base,
          id: `frm_${businessId}_pos_1`,
          formuleType: 'pos_combo',
          code: 'COMBO-MID',
          name: 'Formule Déjeuner Express',
          description: 'Plat du jour + Boisson fraîche + Café',
          priceAmount: 950,
          ratePercent: 10,
          durationValue: 1,
          durationUnit: 'unit',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_pos_2`,
          formuleType: 'pos_combo',
          code: 'HAPPY-16',
          name: 'Pack Café & Pâtisserie',
          description: 'Espresso + Viennoiserie artisanale (remise comptoir)',
          priceAmount: 350,
          ratePercent: 15,
          durationValue: 1,
          durationUnit: 'unit',
          sortOrder: 2,
        },
      ];
    case 'project_milestone':
      return [
        {
          ...base,
          id: `frm_${businessId}_pm_1`,
          formuleType: 'agency_retainer',
          code: 'RET-360',
          name: 'Retainer Social & Création Mensuel',
          description: 'Production contenu mensuel, DA, suivi print & reporting KPI',
          priceAmount: 240000,
          ratePercent: 30,
          durationValue: 30,
          durationUnit: 'days',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_pm_2`,
          formuleType: 'agency_retainer',
          code: 'ACT-TERRAIN',
          name: 'Pack Activation Terrain (5 Jours)',
          description: 'Superviseur + brigade promoteurs + dotation PLV',
          priceAmount: 420000,
          ratePercent: 25,
          durationValue: 5,
          durationUnit: 'days',
          sortOrder: 2,
        },
      ];
    case 'rental_booking':
      return [
        {
          ...base,
          id: `frm_${businessId}_rent_1`,
          formuleType: 'venue_addon',
          code: 'OPT-SONO',
          name: 'Pack Sonorisation & Vidéoprojecteur 4K',
          description: 'Installation complète micro sans fil + écran motorisé',
          priceAmount: 12000,
          ratePercent: 0,
          durationValue: 1,
          durationUnit: 'days',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_rent_2`,
          formuleType: 'venue_addon',
          code: 'OPT-PAUSE',
          name: 'Pause Café & Viennoiseries (Par personne)',
          description: 'Service traiteur matin & après-midi inclus',
          priceAmount: 900,
          ratePercent: 0,
          durationValue: 1,
          durationUnit: 'unit',
          sortOrder: 2,
        },
      ];
    case 'education_cohort':
      return [
        {
          ...base,
          id: `frm_${businessId}_edu_1`,
          formuleType: 'tuition_installment',
          code: 'PAY-1X',
          name: 'Paiement Comptant Intégral (-10%)',
          description: 'Règlement complet à l’inscription avec remise immédiate',
          priceAmount: 0,
          ratePercent: 10,
          durationValue: 1,
          durationUnit: 'months',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_edu_2`,
          formuleType: 'tuition_installment',
          code: 'PAY-3X',
          name: 'Échéancier 3 Tranches (40% / 30% / 30%)',
          description: 'Acompte inscription puis 2 versements mensuels',
          priceAmount: 2500,
          ratePercent: 0,
          durationValue: 3,
          durationUnit: 'months',
          sortOrder: 2,
        },
      ];
    case 'freelance_solo':
      return [
        {
          ...base,
          id: `frm_${businessId}_frl_1`,
          formuleType: 'freelance_package',
          code: 'TJM-STD',
          name: 'TJM Conseil & Développement',
          description: 'Journée complète d’intervention dédiée (7h)',
          priceAmount: currency === 'EUR' ? 350 : 45000,
          ratePercent: 20,
          durationValue: 1,
          durationUnit: 'days',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_frl_2`,
          formuleType: 'freelance_package',
          code: 'SPRINT-14',
          name: 'Sprint Livraison MVP (2 Semaines)',
          description: 'Cadrage, design système & livraison prête en production',
          priceAmount: currency === 'EUR' ? 2400 : 320000,
          ratePercent: 20,
          durationValue: 14,
          durationUnit: 'days',
          sortOrder: 2,
        },
      ];
    case 'trading_commercial':
      return [
        {
          ...base,
          id: `frm_${businessId}_trd_1`,
          formuleType: 'wholesale_tier',
          code: 'GROS-A',
          name: 'Tarif Grossiste (Palettes / ≥ 500k DZD)',
          description: 'Remise volume B2B avec paiement 30 jours fin de mois',
          priceAmount: 500000,
          ratePercent: 12,
          durationValue: 30,
          durationUnit: 'days',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_trd_2`,
          formuleType: 'wholesale_tier',
          code: 'DEMI-GROS',
          name: 'Tarif Demi-Gros (Cartons)',
          description: 'Conditions distributeurs régionaux',
          priceAmount: 150000,
          ratePercent: 7,
          durationValue: 15,
          durationUnit: 'days',
          sortOrder: 2,
        },
      ];
    case 'medical_clinic':
      return [
        {
          ...base,
          id: `frm_${businessId}_med_1`,
          formuleType: 'medical_act',
          code: 'CS-GEN',
          name: 'Consultation Médecine Générale',
          description: 'Examen clinique complet + ordonnance sécurisée',
          priceAmount: 2000,
          ratePercent: 80,
          durationValue: 20,
          durationUnit: 'minutes',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_med_2`,
          formuleType: 'medical_act',
          code: 'CS-SPEC',
          name: 'Consultation Spécialisée + Échographie',
          description: 'Consultation spécialisée avec imagerie diagnostique',
          priceAmount: 4500,
          ratePercent: 80,
          durationValue: 30,
          durationUnit: 'minutes',
          sortOrder: 2,
        },
      ];
    case 'auto_garage':
      return [
        {
          ...base,
          id: `frm_${businessId}_gar_1`,
          formuleType: 'garage_pack',
          code: 'PACK-VID',
          name: 'Forfait Vidange Complète 5W40 + 3 Filtres',
          description: 'Huile synthétique + filtre huile/air/habitacle + 25 pts contrôle',
          priceAmount: 11500,
          ratePercent: 0,
          durationValue: 60,
          durationUnit: 'minutes',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_gar_2`,
          formuleType: 'garage_pack',
          code: 'DIAG-OBD',
          name: 'Diagnostic Électronique Valise Multi-Marques',
          description: 'Lecture codes défauts calculateurs + rapport imprimé',
          priceAmount: 3000,
          ratePercent: 0,
          durationValue: 30,
          durationUnit: 'minutes',
          sortOrder: 2,
        },
      ];
    case 'real_estate':
      return [
        {
          ...base,
          id: `frm_${businessId}_re_1`,
          formuleType: 'realestate_commission',
          code: 'COM-GEST',
          name: 'Mandat de Gestion Locative Standard',
          description: 'Encaissement loyers, quittances mensuelles & suivi maintenance',
          priceAmount: 0,
          ratePercent: 7,
          durationValue: 12,
          durationUnit: 'months',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_re_2`,
          formuleType: 'realestate_commission',
          code: 'COM-VENTE',
          name: 'Mandat Vente (Barème Décret 09-18)',
          description: 'Transaction immobilière complète jusqu’à l’acte notarié',
          priceAmount: 0,
          ratePercent: 2,
          durationValue: 3,
          durationUnit: 'months',
          sortOrder: 2,
        },
      ];
    case 'manufacturing_production':
      return [
        {
          ...base,
          id: `frm_${businessId}_mfg_1`,
          formuleType: 'mfg_preset',
          code: 'COST-STD',
          name: 'Gamme Usinage Standard (Frais généraux 12%)',
          description: 'Paramètre de coût atelier incluant amortissement machine',
          priceAmount: 2800,
          ratePercent: 12,
          durationValue: 1,
          durationUnit: 'hours',
          sortOrder: 1,
        },
      ];
    case 'legal_accounting':
      return [
        {
          ...base,
          id: `frm_${businessId}_leg_1`,
          formuleType: 'legal_honoraire',
          code: 'HON-CONS',
          name: 'Consultation Juridique / Fiscale Cabinet',
          description: 'Étude du dossier + avis motivé écrit',
          priceAmount: 8000,
          ratePercent: 40,
          durationValue: 45,
          durationUnit: 'minutes',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_leg_2`,
          formuleType: 'legal_honoraire',
          code: 'FORF-G50',
          name: 'Forfait Déclarations G50 & Suivi Comptable Mensuel',
          description: 'Tenue comptable SCF, G50 et états CNAS/CACOBATPH',
          priceAmount: 25000,
          ratePercent: 0,
          durationValue: 1,
          durationUnit: 'months',
          sortOrder: 2,
        },
      ];
    case 'construction_contractor':
      return [
        {
          ...base,
          id: `frm_${businessId}_btp_1`,
          formuleType: 'btp_boq_rate',
          code: 'BET-C25',
          name: 'Béton Armé Dosé à 350 kg/m³ (Ouvrages)',
          description: 'Fourniture, coffrage, ferraillage et mise en œuvre',
          priceAmount: 24500,
          ratePercent: 5,
          durationValue: 1,
          durationUnit: 'unit',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_btp_2`,
          formuleType: 'btp_boq_rate',
          code: 'MAC-BR15',
          name: 'Maçonnerie Double Cloison Brique 15+10',
          description: 'Pose au mortier de ciment avec isolation lame d’air',
          priceAmount: 3200,
          ratePercent: 5,
          durationValue: 1,
          durationUnit: 'unit',
          sortOrder: 2,
        },
      ];
    case 'agriculture_farming':
      return [
        {
          ...base,
          id: `frm_${businessId}_agr_1`,
          formuleType: 'agri_piecework',
          code: 'PICK-CRATE',
          name: 'Récolte Maraîchage / Agrumes (Par caisse 20kg)',
          description: 'Barème ouvrier à la tâche contrôlé au pont-bascule',
          priceAmount: 180,
          ratePercent: 0,
          durationValue: 1,
          durationUnit: 'unit',
          sortOrder: 1,
        },
        {
          ...base,
          id: `frm_${businessId}_agr_2`,
          formuleType: 'agri_piecework',
          code: 'ONIL-LAIT',
          name: 'Livraison Lait Cru Collecte ONIL (Litre)',
          description: 'Prix référence laiterie + prime qualité sanitaire',
          priceAmount: 48,
          ratePercent: 25,
          durationValue: 1,
          durationUnit: 'unit',
          sortOrder: 2,
        },
      ];
    default:
      return [];
  }
}

export function validateFiscalProfile(
  profile: FiscalProfile,
  defaultTvaRate: number,
  language: SupportedLanguage = 'fr'
): Record<string, string> {
  const errors: Record<string, string> = {};
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  if (Number.isNaN(defaultTvaRate) || defaultTvaRate < 0 || defaultTvaRate > 100) {
    errors.defaultTvaRate = isAr
      ? 'يجب أن تكون نسبة الضريبة بين 0 و 100%'
      : isFr
      ? 'Le taux TVA doit être compris entre 0% et 100%.'
      : 'TVA rate must be between 0% and 100%.';
  }

  if (profile.nif && profile.nif.trim().length > 0 && !/^[A-Za-z0-9\-\s]{8,22}$/.test(profile.nif.trim())) {
    errors.nif = isAr
      ? 'الرقم الجبائي NIF غير صالح (8 إلى 22 رمزاً)'
      : isFr
      ? 'Le NIF doit contenir entre 8 et 22 caractères alphanumériques.'
      : 'NIF must be 8–22 alphanumeric characters.';
  }

  return errors;
}

export function validateCategoryFormule(
  input: {
    name: string;
    priceAmount: number;
    ratePercent: number;
    durationValue: number;
    taxRate: number;
  },
  language: SupportedLanguage = 'fr'
): Record<string, string> {
  const errors: Record<string, string> = {};
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  if (!input.name || input.name.trim().length < 2) {
    errors.name = isAr
      ? 'الاسم مطلوب (حرفان على الأقل)'
      : isFr
      ? 'Le nom de la formule est obligatoire (min. 2 caractères).'
      : 'Formule name is required (min 2 chars).';
  }
  if (Number.isNaN(input.priceAmount) || input.priceAmount < 0) {
    errors.priceAmount = isAr
      ? 'السعر لا يمكن أن يكون سالباً'
      : isFr
      ? 'Le tarif ne peut pas être négatif.'
      : 'Price cannot be negative.';
  }
  if (Number.isNaN(input.ratePercent) || input.ratePercent < 0 || input.ratePercent > 100) {
    errors.ratePercent = isAr
      ? 'النسبة يجب أن تكون بين 0 و 100%'
      : isFr
      ? 'Le pourcentage doit être entre 0% et 100%.'
      : 'Rate must be between 0% and 100%.';
  }
  if (Number.isNaN(input.taxRate) || input.taxRate < 0 || input.taxRate > 100) {
    errors.taxRate = isAr
      ? 'نسبة الضريبة يجب أن تكون بين 0 و 100%'
      : isFr
      ? 'La TVA doit être entre 0% et 100%.'
      : 'Tax rate must be between 0% and 100%.';
  }
  if (Number.isNaN(input.durationValue) || input.durationValue < 0) {
    errors.durationValue = isAr
      ? 'المدة غير صالحة'
      : isFr
      ? 'La durée doit être positive.'
      : 'Duration cannot be negative.';
  }

  return errors;
}

export interface SetupEvaluationContext {
  business: Business;
  config: BusinessCategoryConfig;
  staff: StaffMember[];
  plans: MembershipPlan[];
  schedule: ScheduleEvent[];
  servicesCatalog: ServiceItem[];
  salonWorkstations: SalonWorkstation[];
  products: Product[];
  receiptConfig: ReceiptConfig;
  categoryFormules: CategoryFormule[];
  pmCollateralCatalog: PMCollateralItem[];
  rentableUnits: RentableUnit[];
  eduCourses: EduCourse[];
  eduClassrooms: EduClassroom[];
  freelanceServices?: Array<{ id: string }>;
  freelanceClients: FreelanceClient[];
  warehouses: WarehouseDepot[];
  medicalConsultations: MedicalConsultation[];
  garageOrders: Array<{ id: string }>;
  reProperties: RealEstateProperty[];
  mfgWorkstations: Array<{ id: string }>;
  mfgBomRecipes: ManufacturingBom[];
  legalMatters: LegalMatter[];
  logisticsTariffs: Array<{ id: string }>;
  btpProjects: ContractorProject[];
  agriParcels: AgriParcel[];
  language: SupportedLanguage;
}

export function computeHomeSetupProgress(ctx: SetupEvaluationContext): HomeSetupProgress {
  const { business, config, language } = ctx;
  const isAr = language === 'ar';
  const isFr = language === 'fr';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isFr ? fr : en);

  const hasIdentity = Boolean(business.name?.trim() && (business.address?.trim() || business.phone?.trim()));
  const hasFiscalIds = Boolean(
    config.fiscalProfile.nif?.trim() ||
      config.fiscalProfile.rc?.trim() ||
      config.fiscalProfile.ifu?.trim() ||
      config.fiscalProfile.licenseNumber?.trim()
  );
  const hasTeam = ctx.staff.length > 0;
  const activeCatFormules = ctx.categoryFormules.filter(
    (f) => f.businessId === business.id && f.isActive
  );

  let steps: HomeSetupStep[] = [];

  switch (business.category) {
    case 'membership_session':
      steps = [
        {
          id: 'club_fiscal',
          title: L('Club Fiscal & Identity', 'Identité & Régime Fiscal', 'هوية النادي والملف الضريبي'),
          description: L('Address, RC/NIF & day-pass pricing', 'Adresse, RC/NIF & tarif pass journalier', 'العنوان، السجل التجاري وتسعيرة الدخول اليومي'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'club_formules',
          title: L('Membership Formules', "Formules d'Abonnement", 'صيغ الاشتراك'),
          description: L('Active monthly/session passes', 'Formules mensuelles & carnets actifs', 'باقات الاشتراك النشطة'),
          completed: ctx.plans.filter((p) => p.isActive).length >= 1,
          targetTab: 'formules',
          actionLabel: L('Manage Formules', 'Gérer Formules', 'إدارة الباقات'),
        },
        {
          id: 'club_schedule',
          title: L('Class Timetable', 'Planning des Cours', 'جدول الحصص'),
          description: L('Group sessions & studio capacity', 'Cours collectifs & capacité studios', 'الحصص الجماعية وسعة القاعات'),
          completed: ctx.schedule.length >= 1,
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Capacity', 'Régler', 'ضبط'),
        },
        {
          id: 'club_staff',
          title: L('Coaches & Desk Staff', 'Coachs & Accueil', 'المدربون والاستقبال'),
          description: L('Access roles & kiosk PINs', 'Rôles accès & codes PIN', 'أدوار الفريق ورموز PIN'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Review Team', 'Équipe', 'الفريق'),
        },
        {
          id: 'club_turnstile',
          title: L('RFID & Freeze Rules', 'Règles RFID & Gel', 'قواعد البطاقة والتجميد'),
          description: L('Expiry alert days & max freeze quota', 'Jours alerte RFID & quota gel annuel', 'تنبيه انتهاء الصلاحية والحد السنوي للتجميد'),
          completed: Boolean(config.categorySettings.rfidExpiryWarningDays && config.categorySettings.maxFreezeDaysPerYear),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Rules', 'Règles', 'القواعد'),
        },
      ];
      break;

    case 'appointment_service':
      steps = [
        {
          id: 'salon_identity',
          title: L('Salon Profile & TVA', 'Profil Salon & TVA', 'ملف الصالون والضريبة'),
          description: L('Identity, fiscal ID & TVA regime', 'Nom, adresse, NIF & régime TVA', 'الاسم، العنوان والنظام الجبائي'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Edit Profile', 'Éditer', 'تعديل'),
        },
        {
          id: 'salon_services',
          title: L('Service Menu Formules', 'Carte des Prestations', 'قائمة الخدمات'),
          description: L('Hair, spa & beauty pricing menu', 'Prestations, durées & tarifs', 'الخدمات، المدة والأسعار'),
          completed: ctx.servicesCatalog.filter((s) => s.isActive !== false).length >= 1,
          targetTab: 'formules',
          actionLabel: L('Edit Menu', 'Carte', 'القائمة'),
        },
        {
          id: 'salon_chairs',
          title: L('Chairs & Cabins', 'Fauteuils & Cabines', 'الكراسي وغرف العناية'),
          description: L('Active styling stations', 'Postes de coiffage & cabines actifs', 'محطات العمل النشطة'),
          completed: ctx.salonWorkstations.length >= 1,
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Booking Rules', 'Paramètres', 'إعدادات'),
        },
        {
          id: 'salon_commissions',
          title: L('Stylist Commissions', 'Commissions Équipe', 'عمولات الحلاقين'),
          description: L('Default commission % & slot interval', 'Commission par défaut & créneaux', 'نسبة العمولة وفواصل المواعيد'),
          completed: Boolean(config.categorySettings.defaultCommissionPercent !== undefined && config.categorySettings.slotIntervalMinutes),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Configure', 'Configurer', 'ضبط'),
        },
        {
          id: 'salon_receipt',
          title: L('Checkout & Timbre', 'Encaissement & Timbre', 'التحصيل والطابع'),
          description: L('Timbre fiscal & cancellation window', 'Timbre DGI & délai annulation', 'الطابع الجبائي ومهلة الإلغاء'),
          completed: Boolean(config.categorySettings.cancellationWindowHours !== undefined),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Set Tax', 'Fiscalité', 'الضرائب'),
        },
      ];
      break;

    case 'pos_inventory':
      steps = [
        {
          id: 'pos_fiscal',
          title: L('Storefront Fiscal IDs', 'Identité & RC/NIF', 'الهوية والسجل التجاري'),
          description: L('RC, NIF & TVA 19% / 9% setting', 'RC, NIF & taux TVA par défaut', 'السجل التجاري والرقم الجبائي ونسبة TVA'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'pos_receipt',
          title: L('Thermal Ticket Header', 'Ticket Thermique 80mm', 'ترويسة الوصل الحراري'),
          description: L('Header, tax breakdown & footer message', 'En-tête, détail TVA & pied de ticket', 'العنوان، تفاصيل الضريبة وتذييل الوصل'),
          completed: Boolean(ctx.receiptConfig.headerTitle?.trim()),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Edit Receipt', 'Ticket', 'الوصل'),
        },
        {
          id: 'pos_combos',
          title: L('Menu Combos & Formules', 'Formules & Menus POS', 'الوجبات المركبة'),
          description: L('Combo bundles & counter discounts', 'Menus combinés & remises caisse', 'العروض المجمعة وتخفيضات الصندوق'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Manage Combos', 'Formules', 'الصيغ'),
        },
        {
          id: 'pos_float',
          title: L('Cash Drawer & Stock Alerts', 'Fond de Caisse & Alertes', 'رصيد الصندوق وتنبيه المخزون'),
          description: L('Opening cash float & reorder threshold', 'Fond de caisse & seuil alerte stock', 'رصيد الافتتاح وحد إعادة الطلب'),
          completed: Boolean(config.categorySettings.openingCashFloatDzd !== undefined && config.categorySettings.lowStockThreshold),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Float', 'Caisse', 'الصندوق'),
        },
        {
          id: 'pos_catalog',
          title: L('Active POS Catalog', 'Catalogue Produits POS', 'المنتجات النشطة'),
          description: L('At least 1 sellable item in stock', 'Au moins 1 article actif en rayon', 'منتج واحد نشط على الأقل'),
          completed: ctx.products.filter((p) => p.isActive).length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Terminals', 'Caisses', 'الأجهزة'),
        },
      ];
      break;

    case 'project_milestone':
      steps = [
        {
          id: 'pm_legal',
          title: L('Agency Legal & RC/NIF', 'Identité Légale Agence', 'الهوية القانونية للوكالة'),
          description: L('RC, NIF, CCP/RIB & TVA 19%', 'RC, NIF, RIB/CCP & TVA', 'السجل التجاري والرقم الجبائي والحساب البريدي'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'pm_retainers',
          title: L('Retainer & Pack Formules', 'Formules Retainer Agence', 'باقات الوكالة'),
          description: L('Standard agency retainers & collateral', 'Forfaits mensuels & activations', 'باقات التعاقد الشهري والمطبوعات'),
          completed: activeCatFormules.length >= 1 || ctx.pmCollateralCatalog.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Formules', 'Formules', 'الصيغ'),
        },
        {
          id: 'pm_thresholds',
          title: L('Direction Approval Rules', 'Seuils Validation Direction', 'سقف موافقة الإدارة'),
          description: L('Budget threshold, target margin & BAT lock', 'Plafond dépenses, marge & blocage BAT', 'سقف المصاريف، الهامش وقفلة BAT'),
          completed: Boolean(config.categorySettings.directionApprovalThresholdDzd && config.categorySettings.targetMarginPercent),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Rules', 'Règles', 'القواعد'),
        },
        {
          id: 'pm_team',
          title: L('Agency Roles & Talents', 'Équipe & Rôles Agence', 'فريق العمل والمواهب'),
          description: L('Direction, CP, Créa, Superviseur, Compta', 'Direction, CP, Créa, Terrain, Compta', 'الإدارة، المشاريع، الإبداع، الميدان والمحاسبة'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Branches', 'Sites', 'الفروع'),
        },
        {
          id: 'pm_ccp',
          title: L('CCP / RIB Payout Account', 'Compte CCP / RIB Paie', 'حساب CCP للدفع'),
          description: L('Required for SFP 01 slips', 'Requis pour bordereaux CCP SFP 01', 'مطلوب لإصدار صكوك SFP 01'),
          completed: Boolean(config.fiscalProfile.ccp?.trim() || config.fiscalProfile.rib?.trim()),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Add RIB/CCP', 'CCP / RIB', 'الحساب'),
        },
      ];
      break;

    case 'rental_booking':
      steps = [
        {
          id: 'rent_identity',
          title: L('Venue Identity & Fiscal IDs', 'Identité Lieu & Fiscalité', 'هوية القاعة والملف الضريبي'),
          description: L('Address, RC/NIF & TVA rules', 'Adresse, RC/NIF & régime TVA', 'العنوان، السجل والضريبة'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'rent_units',
          title: L('Rentable Spaces & Add-ons', 'Salles & Options Locatives', 'القاعات والإضافات'),
          description: L('At least 1 space + add-on formules', 'Salles/espaces & options facturables', 'قاعة واحدة على الأقل وصيغ الإضافات'),
          completed: ctx.rentableUnits.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Spaces', 'Espaces', 'القاعات'),
        },
        {
          id: 'rent_deposit',
          title: L('Security Deposit & Buffer', 'Caution & Délai Remise', 'نسبة الضمان ومهلة التجهيز'),
          description: L('Deposit % & cleaning turnover hours', 'Taux caution (%) & heures battement', 'نسبة الضمان وساعات التحضير بين الحجوزات'),
          completed: Boolean(config.categorySettings.defaultSecurityDepositPercent !== undefined && config.categorySettings.turnoverBufferHours !== undefined),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Deposit', 'Caution', 'الضمان'),
        },
        {
          id: 'rent_overtime',
          title: L('Overtime Hourly Rate', 'Tarif Heure Supplémentaire', 'تعريفة الساعة الإضافية'),
          description: L('Automatic surcharge after slot end', 'Majoration automatique dépassement', 'التسعيرة الإضافية عند تجاوز الموعد'),
          completed: Boolean((config.categorySettings.overtimeHourlyFeeDzd ?? 0) > 0),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Fee', 'Tarif', 'التسعيرة'),
        },
        {
          id: 'rent_team',
          title: L('Hosts & Access Terminals', 'Régisseurs & Postes', 'الفريق والمحطات'),
          description: L('Staff & check-in terminal ready', 'Personnel & poste d’accueil actifs', 'الموظفون ونقطة الاستقبال'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Review', 'Voir', 'عرض'),
        },
      ];
      break;

    case 'education_cohort':
      steps = [
        {
          id: 'edu_accred',
          title: L('Academy Accreditation & IDs', 'Agrément & Identité École', 'اعتماد المؤسسة وهويتها'),
          description: L('Address, accreditation N° & TVA exemption', 'Agrément, NIF & régime TVA (0%/9%)', 'الاعتماد التربوي والإعفاء الضريبي'),
          completed: hasIdentity && Boolean(config.fiscalProfile.licenseNumber?.trim() || hasFiscalIds),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'edu_courses',
          title: L('Courses & Tuition Formules', 'Formations & Échéanciers', 'البرامج وأقساط التسجيل'),
          description: L('Syllabus catalog & payment installments', 'Programmes de cours & tranches de paiement', 'البرامج التدريبية وصيغ التقسيط'),
          completed: ctx.eduCourses.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Courses', 'Cours', 'البرامج'),
        },
        {
          id: 'edu_rooms',
          title: L('Classrooms & Labs', 'Salles de Classe', 'القاعات الدراسية'),
          description: L('Configured physical rooms', 'Salles équipées & capacité places', 'القاعات وسعة الاستيعاب'),
          completed: ctx.eduClassrooms.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Rooms', 'Salles', 'القاعات'),
        },
        {
          id: 'edu_grading',
          title: L('Passing & Certificate Thresholds', 'Seuils Notes & Attestations', 'شروط النجاح والشهادة'),
          description: L('Min grade (/20) & attendance %', 'Note passage (/20) & assiduité minimale', 'معدل النجاح ونسبة الحضور المطلوبة'),
          completed: Boolean(config.categorySettings.passingGradeOutOf20 && config.categorySettings.minAttendancePercentForCertificate),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Rules', 'Règles', 'القواعد'),
        },
        {
          id: 'edu_regfee',
          title: L('Registration Fee', "Frais d'Inscription", 'رسوم التسجيل'),
          description: L('Default enrollment dossier fee', 'Montant dossier d’inscription par défaut', 'رسوم فتح الملف السنوي'),
          completed: Boolean(config.categorySettings.registrationFeeDzd !== undefined),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Fee', 'Montant', 'الرسوم'),
        },
      ];
      break;

    case 'freelance_solo':
      steps = [
        {
          id: 'frl_ifu',
          title: L('Solo Studio & IFU / NIF', 'Profil Solo & Carte IFU', 'ملف النشاط الحر والرقم الضريبي'),
          description: L('Studio name, IFU/NIF & currency', 'Nom commercial, IFU/NIF & devise', 'الاسم المهني، IFU والعملة'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Edit Profile', 'Profil', 'الملف'),
        },
        {
          id: 'frl_packages',
          title: L('Service Packages & TJM', 'Forfaits & TJM Solo', 'باقات الخدمات والتسعيرة'),
          description: L('Hourly, sprint & retainer formules', 'Tarifs horaires, sprints & retainers', 'السعر بالساعة وباقات المشاريع'),
          completed: activeCatFormules.length >= 1 || (ctx.freelanceServices?.length ?? 0) >= 1,
          targetTab: 'formules',
          actionLabel: L('Packages', 'Forfaits', 'الباقات'),
        },
        {
          id: 'frl_tax',
          title: L('Tax Reserve & Hourly Rate', 'Réserve Fiscale & Taux Horaire', 'الاحتياط الضريبي وسعر الساعة'),
          description: L('Default IRG/IFU reserve % & rate', 'Taux de provision (%) & tarif horaire', 'نسبة الاقتطاع الضريبي والسعر المرجعي'),
          completed: Boolean((config.categorySettings.taxReservePercent ?? 0) >= 0 && (config.categorySettings.defaultHourlyRate ?? 0) > 0),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Rate', 'Barème', 'التسعيرة'),
        },
        {
          id: 'frl_rib',
          title: L('Invoice RIB / CCP Payout', 'RIB / CCP sur Factures', 'الحساب البنكي / البريدي بالفواتير'),
          description: L('Payment destination & Net terms', 'Coordonnées virement & délai paiement', 'بيانات الدفع وآجال الاستحقاق'),
          completed: Boolean(config.fiscalProfile.rib?.trim() || config.fiscalProfile.ccp?.trim()),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Add RIB', 'RIB/CCP', 'الحساب'),
        },
        {
          id: 'frl_clients',
          title: L('First Client Onboarded', 'Premier Client Enregistré', 'إضافة أول عميل'),
          description: L('Ready for proposals & time billing', 'Prêt pour devis & suivi horaire', 'جاهز لإرسال العروض والفواتير'),
          completed: ctx.freelanceClients.length >= 1,
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Review', 'Voir', 'عرض'),
        },
      ];
      break;

    case 'trading_commercial':
      steps = [
        {
          id: 'trd_legal',
          title: L('B2B Legal IDs (RC/NIF/NIS/AI)', 'Identifiants Légaux B2B', 'المعرفات القانونية B2B'),
          description: L('Mandatory mentions on Algerian Factures', 'Mentions obligatoires sur factures DGI', 'البيانات الإلزامية في الفواتير الرسمية'),
          completed: Boolean(config.fiscalProfile.rc?.trim() && config.fiscalProfile.nif?.trim()),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Edit Legal IDs', 'RC / NIF', 'المعرفات'),
        },
        {
          id: 'trd_tiers',
          title: L('Wholesale Pricing Formules', 'Grilles Grossiste / Demi-Gros', 'سلالم أسعار الجملة'),
          description: L('Volume discount & margin tiers', 'Remises palettes, cartons & détail', 'تخفيضات الجملة ونصف الجملة'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Tiers', 'Grilles', 'السلالم'),
        },
        {
          id: 'trd_depots',
          title: L('Warehouses & Depots', 'Dépôts & Entrepôts', 'المستودعات والمخازن'),
          description: L('Active stock locations', 'Au moins 1 dépôt de stockage actif', 'مستودع نشط واحد على الأقل'),
          completed: ctx.warehouses.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Branches', 'Sites', 'الفروع'),
        },
        {
          id: 'trd_credit',
          title: L('B2B Credit & Net Days', 'Plafonds Crédit & Échéances', 'سقف القروض وآجال الدفع'),
          description: L('Default client credit limit & Net days', 'Plafond encours client & délai règlement', 'سقف تعامل العميل وأيام السداد'),
          completed: Boolean(config.categorySettings.defaultCreditLimitDzd && config.categorySettings.defaultNetDays),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Credit Rules', 'Crédit', 'الائتمان'),
        },
        {
          id: 'trd_tva',
          title: L('TVA & Cash Timbre Fiscal', 'TVA 19% & Timbre Espèces', 'الرسم على القيمة المضافة والطابع'),
          description: L('Facture TVA & DGI stamp configuration', 'Taux TVA & calcul timbre DGI', 'نسبة TVA واحتساب الطابع الجبائي'),
          completed: config.defaultTvaRate >= 0,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Fiscal Rules', 'TVA', 'الضريبة'),
        },
      ];
      break;

    case 'medical_clinic':
      steps = [
        {
          id: 'med_cnom',
          title: L('Clinic Identity & N° Ordre', 'Identité & N° Ordre (CNOM)', 'هوية العيادة ورقم العمادة'),
          description: L('Header, address & medical license', 'En-tête clinique & agrément sanitaire', 'الاسم، العنوان واعتماد الأطباء'),
          completed: hasIdentity && Boolean(config.fiscalProfile.licenseNumber?.trim() || hasFiscalIds),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Edit License', 'Agrément', 'الاعتماد'),
        },
        {
          id: 'med_acts',
          title: L('Consultation & NGAP Tariffs', 'Tarifs Actes & NGAP / Chifa', 'تعريفات الفحص والأعمال الطبية'),
          description: L('Consultation fees & Chifa rates', 'Consultations, actes & taux Chifa', 'تسعير الفحوصات وتغطية بطاقة الشفاء'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Manage Acts', 'Tarifs', 'التعريفات'),
        },
        {
          id: 'med_ordonnance',
          title: L('Ordonnance Paper & Chifa', 'Ordonnance A4/A5 & Chifa', 'حجم الوصفة الطبية والشفاء'),
          description: L('Prescription layout & CNAS mode', 'Format ordonnance & convention CNAS', 'تنسيق الوصفة وتفعيل CNAS'),
          completed: Boolean(config.categorySettings.ordonnancePaperSize && config.categorySettings.queueTicketPrefix),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Ordonnance', 'Format', 'الوصفة'),
        },
        {
          id: 'med_team',
          title: L('Practitioners & Nurses', 'Praticiens & Infirmiers', 'الأطباء والطاقم المساعد'),
          description: L('Medical staff & reception access', 'Équipe médicale & secrétariat', 'الطاقم الطبي والاستقبال'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Staff', 'Équipe', 'الطاقم'),
        },
        {
          id: 'med_flow',
          title: L('Active Consultation Queue', 'Salle d’Attente Configurée', 'تجهيز قاعة الانتظار'),
          description: L('Waiting room ticket prefix ready', 'Préfixe tickets TV & flux patients', 'رمز تذاكر الانتظار وتدفق المرضى'),
          completed: Boolean(config.categorySettings.queueTicketPrefix) || ctx.medicalConsultations.length >= 1,
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Queue Prefix', 'Tickets', 'التذاكر'),
        },
      ];
      break;

    case 'auto_garage':
      steps = [
        {
          id: 'gar_fiscal',
          title: L('Garage Identity & DGI IDs', 'Identité Garage & NIF/RC', 'هوية الورشة والملف الضريبي'),
          description: L('RC, NIF & TVA 19% settings', 'RC, NIF & TVA facturation atelier', 'السجل التجاري والرقم الجبائي وTVA'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'gar_packs',
          title: L('Maintenance Formules', 'Forfaits Vidange & Diag', 'باقات الصيانة والفحص'),
          description: L('Standard service packs & fleet tiers', 'Forfaits vidange, freins & valise OBD', 'باقات تغيير الزيت، الفرامل والفحص'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Manage Packs', 'Forfaits', 'الباقات'),
        },
        {
          id: 'gar_labor',
          title: L('Workshop Hourly Labor Rate', 'Taux Horaire Main-d’Œuvre', 'سعر ساعة اليد العاملة'),
          description: L('Default DZD/h used in Work Orders', 'Tarif horaire DZD appliqué aux OR', 'السعر المعتمد في أوامر الإصلاح'),
          completed: Boolean((config.categorySettings.workshopHourlyRateDzd ?? 0) > 0),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Labor', 'Taux/h', 'الساعة'),
        },
        {
          id: 'gar_warranty',
          title: L('Repair Warranty Policy', 'Garantie Réparations', 'ضمان الإصلاحات'),
          description: L('Warranty days & km coverage', 'Durée garantie (jours & km)', 'أيام وكيلومترات الضمان'),
          completed: Boolean(config.categorySettings.warrantyDays && config.categorySettings.warrantyKm),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Warranty', 'Garantie', 'الضمان'),
        },
        {
          id: 'gar_ops',
          title: L('Mechanics & First OR', 'Mécaniciens & Ordres', 'الميكانيكيون وأوامر العمل'),
          description: L('Atelier team & work order flow', 'Équipe atelier & ponts actifs', 'فريق الورشة والرافعات'),
          completed: hasTeam || ctx.garageOrders.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Atelier', 'Équipe', 'الورشة'),
        },
      ];
      break;

    case 'real_estate':
      steps = [
        {
          id: 're_card',
          title: L('Broker License & Agency IDs', 'Carte Professionnelle & NIF', 'البطاقة المهنية للوكالة'),
          description: L('Décret 09-18 license & fiscal IDs', 'Agrément immobilier & NIF/RC', 'اعتماد الوكالة العقارية والرقم الجبائي'),
          completed: hasIdentity && Boolean(config.fiscalProfile.licenseNumber?.trim() || hasFiscalIds),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Edit License', 'Agrément', 'الاعتماد'),
        },
        {
          id: 're_comm',
          title: L('Commission Formules', 'Barèmes Commissions & Gestion', 'سلالم العمولات'),
          description: L('Sale % & rental management formules', 'Commissions vente & honoraires gestion', 'عمولات البيع والتسيير الإيجاري'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Commissions', 'Barèmes', 'العمولات'),
        },
        {
          id: 're_quittance',
          title: L('Quittance & Fee Rules', 'Règles Quittances & TVA', 'قواعد الوصولات والعمولة'),
          description: L('Default fee % & billing day', 'Taux gestion (%) & jour d’échéance', 'نسبة التسيير ويوم الفوترة'),
          completed: Boolean((config.categorySettings.defaultAgencyManagementFeePercent ?? 0) > 0 && config.categorySettings.quittanceBillingDay),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Rules', 'Règles', 'القواعد'),
        },
        {
          id: 're_portfolio',
          title: L('Property Portfolio', 'Portefeuille Biens', 'محفظة العقارات'),
          description: L('Listed apartments, villas & locals', 'Biens enregistrés en portefeuille', 'العقارات المسجلة بالوكالة'),
          completed: ctx.reProperties.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Review', 'Voir', 'عرض'),
        },
        {
          id: 're_agents',
          title: L('Negotiators & Roles', 'Négociateurs & Direction', 'الوسطاء العقاريون'),
          description: L('Direction, agents & accounting roles', 'Direction, négociateurs & compta', 'الإدارة، الوسطاء والمحاسبة'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Team', 'Équipe', 'الفريق'),
        },
      ];
      break;

    case 'manufacturing_production':
      steps = [
        {
          id: 'mfg_fiscal',
          title: L('Factory Identity & Fiscal IDs', 'Identité Usine & NIF/RC', 'هوية المصنع والملف الضريبي'),
          description: L('Industrial zone address & TVA 19%', 'Adresse ZI, RC/NIF & TVA', 'عنوان المنطقة الصناعية والضريبة'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'mfg_formules',
          title: L('Production Cost Formules', 'Formules Coûts & Gammes', 'صيغ التكلفة والإنتاج'),
          description: L('Machine cost & overhead presets', 'Coûts machines & frais généraux', 'تكاليف الآلات والمصاريف غير المباشرة'),
          completed: activeCatFormules.length >= 1 || ctx.mfgBomRecipes.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Formules', 'Formules', 'الصيغ'),
        },
        {
          id: 'mfg_overhead',
          title: L('Overhead & Scrap Tolerance', 'Frais Généraux & Rebuts', 'المصاريف ونسبة التالف'),
          description: L('Overhead % & QC scrap tolerance', 'Frais indirects (%) & tolérance rebut', 'هامش المصاريف ونسبة التالف المسموحة'),
          completed: Boolean(config.categorySettings.overheadPercent !== undefined && config.categorySettings.scrapTolerancePercent !== undefined),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Costs', 'Paramètres', 'المعايير'),
        },
        {
          id: 'mfg_stations',
          title: L('Workstations & Machines', 'Postes & Machines Atelier', 'محطات العمل والآلات'),
          description: L('Configured shop-floor lines', 'Lignes & postes d’usinage actifs', 'خطوط الإنتاج والآلات النشطة'),
          completed: ctx.mfgWorkstations.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Workshop', 'Atelier', 'الورشة'),
        },
        {
          id: 'mfg_batches',
          title: L('Batch Traceability Prefix', 'Traçabilité Numéros de Lot', 'بادئة تتبع الدفعات'),
          description: L('LOT prefix for finished goods', 'Préfixe LOT pour expéditions', 'رمز الدفعة للمنتجات الجاهزة'),
          completed: Boolean(config.categorySettings.batchCodePrefix?.trim()),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Prefix', 'Préfixe', 'الرمز'),
        },
      ];
      break;

    case 'legal_accounting':
      steps = [
        {
          id: 'leg_bar',
          title: L('Cabinet & Bar / Order N°', 'Cabinet & N° Barreau / Ordre', 'المكتب ورقم النقابة'),
          description: L('Practice mode, license & fiscal IDs', 'Mode (Avocat/Notaire/Compta) & agrément', 'التخصص، رقم القيد والملف الجبائي'),
          completed: hasIdentity && Boolean(config.fiscalProfile.licenseNumber?.trim() || hasFiscalIds),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'leg_honoraires',
          title: L('Honoraires & Act Formules', "Barèmes d'Honoraires & Actes", 'سلالم الأتعاب والعقود'),
          description: L('Consultations, G50, Bilan SCF & acts', 'Honoraires, bilans SCF, G50 & actes', 'الاستشارات، الميزانية والعقود'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Manage Fees', 'Barèmes', 'الأتعاب'),
        },
        {
          id: 'leg_cpca',
          title: L('CPCA & Retainer Rules', 'Délais CPCA & Provisions', 'تنبيهات الآجال والتسبيقات'),
          description: L('Deadline alert window & provision %', 'Fenêtre alerte délais & taux provision', 'مهلة التنبيه القانوني ونسبة التسبيق'),
          completed: Boolean(config.categorySettings.cpcaAlertDays && config.categorySettings.defaultRetainerPercent !== undefined),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Alerts', 'Délais', 'الآجال'),
        },
        {
          id: 'leg_matters',
          title: L('Active Client Matters', 'Dossiers & Mandats Actifs', 'الملفات القضائية والمحاسبية'),
          description: L('Dossiers tracked in workspace', 'Dossiers enregistrés au cabinet', 'الملفات المسجلة بالمكتب'),
          completed: ctx.legalMatters.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Review', 'Voir', 'عرض'),
        },
        {
          id: 'leg_team',
          title: L('Associates & Clerks', 'Associés & Clercs', 'الشركاء والمساعدون'),
          description: L('Access roles & Carpa/Escrow rights', 'Rôles associés, collaborateurs & compta', 'صلاحيات الشركاء وحساب الأمانات'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Team', 'Équipe', 'الفريق'),
        },
      ];
      break;

    case 'logistics_delivery':
      steps = [
        {
          id: 'log_hub',
          title: L('Hub Identity & Permit', 'Hub & Agrément Transport', 'المركز اللوجستي والترخيص'),
          description: L('Hub address, RC/NIF & transport permit', 'Adresse hub, NIF & agrément messagerie', 'عنوان المركز ورخصة النقل'),
          completed: hasIdentity && hasFiscalIds,
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'log_tariffs',
          title: L('58-Wilaya Tariff Matrix', 'Grille Tarifaire 58 Wilayas', 'تعريفات التوصيل 58 ولاية'),
          description: L('Domicile, Stop-Desk & Retour rates', 'Tarifs Domicile, Stop-Desk & Retour', 'أسعار التوصيل للمنزل ونقطة الاستلام'),
          completed: ctx.logisticsTariffs.length >= 1 || activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Wilaya Grid', 'Grille 58W', 'التعريفات'),
        },
        {
          id: 'log_cod',
          title: L('COD Fee & Weight Rules', 'Commission COD & Poids Base', 'عمولة التحصيل وحد الوزن'),
          description: L('COD remittance % & base kg threshold', 'Frais COD (%) & seuil poids de base', 'نسبة التحصيل عند الاستلام والوزن المرجعي'),
          completed: Boolean(config.categorySettings.codRemittanceFeePercent !== undefined && config.categorySettings.baseWeightThresholdKg),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Rules', 'Règles', 'القواعد'),
        },
        {
          id: 'log_prefix',
          title: L('Parcel Tracking Prefix', 'Préfixe Bordereaux Colis', 'بادئة تتبع الطرود'),
          description: L('Barcode prefix for waybills & scans', 'Préfixe codes-barres étiquettes', 'بادئة الباركود لملصقات الشحن'),
          completed: Boolean(config.categorySettings.parcelTrackingPrefix?.trim()),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Prefix', 'Préfixe', 'الرمز'),
        },
        {
          id: 'log_fleet',
          title: L('Drivers & Dispatch Desk', 'Livreurs & Dispatch', 'السائقون ومركز الفرز'),
          description: L('Fleet drivers & hub scanner terminals', 'Équipe livraison & terminaux scan', 'طاقم التوصيل وأجهزة المسح'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Terminals', 'Postes', 'الأجهزة'),
        },
      ];
      break;

    case 'construction_contractor':
      steps = [
        {
          id: 'btp_caco',
          title: L('BTP Enterprise & CACOBATPH', 'Entreprise BTP & CACOBATPH', 'المؤسسة ورقم CACOBATPH'),
          description: L('Qualification, CACOBATPH N° & RC/NIF', 'N° CACOBATPH, qualification & NIF/RC', 'رقم التأهيل، الصندوق والملف الضريبي'),
          completed: hasIdentity && Boolean(config.fiscalProfile.licenseNumber?.trim() || hasFiscalIds),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Edit IDs', 'Identifiants', 'المعرفات'),
        },
        {
          id: 'btp_boq',
          title: L('BOQ / DQE Unit Rate Library', 'Bibliothèque Prix Unitaires DQE', 'مكتبة الأسعار الوحدوية'),
          description: L('Standard masonry, concrete & finishing rates', 'Prix unitaires béton, gros œuvre & CES', 'أسعار الخرسانة والبناء للوضعيات'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('BOQ Rates', 'Prix DQE', 'الأسعار'),
        },
        {
          id: 'btp_retenue',
          title: L('TVA & Retenue de Garantie', 'TVA (19%/9%) & Retenue Garantie', 'الضريبة واقتطاع الضمان'),
          description: L('Retenue %, Avance % & billing unit', 'Retenue 5%/10%, avance & TVA marché', 'نسبة اقتطاع الضمان والتسبيق'),
          completed: Boolean(config.categorySettings.retenueGarantiePercent !== undefined && config.categorySettings.avanceForfaitairePercent !== undefined),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Rules', 'Marchés', 'الصفقات'),
        },
        {
          id: 'btp_sites',
          title: L('Active Chantiers', 'Chantiers Actifs', 'الورشات النشطة'),
          description: L('Construction sites tracked in workspace', 'Chantiers & marchés en cours', 'المشاريع المفتوحة بالمنصة'),
          completed: ctx.btpProjects.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Sites', 'Chantiers', 'الورشات'),
        },
        {
          id: 'btp_team',
          title: L('Conducteurs & Safety Officers', 'Conducteurs Travaux & HSE', 'المهندسون ومسؤولو السلامة'),
          description: L('Site managers & accounting access', 'Conducteurs, pointage & compta BTP', 'مهندسو الموقع والمحاسبة'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Team', 'Équipe', 'الفريق'),
        },
      ];
      break;

    case 'agriculture_farming':
      steps = [
        {
          id: 'agr_concession',
          title: L('Estate & ANRH Concession', 'Exploitation & Concession ANRH', 'المستثمرة وامتياز ANRH'),
          description: L('Fellah card, ANRH water N° & fiscal IDs', 'Carte Fellah, titre ANRH & NIF/IFU', 'بطاقة الفلاح، رخصة السقي والملف الجبائي'),
          completed: hasIdentity && Boolean(config.fiscalProfile.licenseNumber?.trim() || hasFiscalIds),
          targetTab: 'business_fiscal',
          targetSection: 'fiscal_profile',
          actionLabel: L('Configure', 'Configurer', 'إعداد'),
        },
        {
          id: 'agr_formules',
          title: L('Piecework & ONIL Formules', 'Barèmes Cueillette & Lait ONIL', 'تعريفات الجني وحليب ONIL'),
          description: L('Crate/kg picking rates & ONIL milk tariff', 'Prix caisse cueillette & barème laiterie', 'أجرة الصندوق وتسعيرة الحليب'),
          completed: activeCatFormules.length >= 1,
          targetTab: 'formules',
          actionLabel: L('Manage Rates', 'Barèmes', 'التعريفات'),
        },
        {
          id: 'agr_quotas',
          title: L('Water Quota & ONIL Subsidy', 'Quota Eau ANRH & Prime ONIL', 'حصة المياه ودعم الحليب'),
          description: L('m³/ha irrigation limit & milk liter price', 'Seuil m³/ha & prix litre + prime État', 'سقف الري ومنحة الدولة للتر'),
          completed: Boolean(config.categorySettings.waterQuotaM3PerHa && config.categorySettings.onilMilkPricePerLiterDzd),
          targetTab: 'business_fiscal',
          targetSection: 'category_rules',
          actionLabel: L('Set Quotas', 'Quotas', 'الحصص'),
        },
        {
          id: 'agr_parcels',
          title: L('Parcels & Agricultural Zones', 'Parcelles & Serres Configurées', 'القطع الفلاحية والبيوت البلاستيكية'),
          description: L('Mapped farm parcels & cold storage', 'Parcelles enregistrées & chambres froides', 'الأراضي الزراعية وغرف التبريد'),
          completed: ctx.agriParcels.length >= 1,
          targetTab: 'branches_devices',
          actionLabel: L('Review', 'Voir', 'عرض'),
        },
        {
          id: 'agr_workers',
          title: L('Field Crew & Weighbridge', 'Équipes Terrain & Bascule', 'العمال الميدانيون والميزان'),
          description: L('Supervisors, pickers & terminal access', 'Chefs de parcelle & saisie récolte', 'المشرفون وتسجيل المحاصيل'),
          completed: hasTeam,
          targetTab: 'branches_devices',
          actionLabel: L('Team', 'Équipe', 'الفريق'),
        },
      ];
      break;
  }

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length || 5;
  return {
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    isComplete: completedCount >= totalCount,
    isDismissed: Boolean(config.setupState?.dismissed),
    steps,
  };
}

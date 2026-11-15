import type { SupportedLanguage } from '../../types/index';
import { pickText } from './common';
import type { TrilingualText } from './dashboardHelpText';

export const DASHBOARD_POD_TITLES = {
  membership: {
    kpis: {
      fr: 'Revenus & Rétention',
      en: 'Revenue & Retention',
      ar: 'المداخيل والاحتفاظ',
    },
    floor: {
      fr: 'Offres & Capacité salle',
      en: 'Plans Mix & Floor Capacity',
      ar: 'توزيع المداخيل وإشغال القاعة',
    },
    pipeline: {
      fr: 'Affluence, Cohortes & Acquisition',
      en: 'Attendance, Cohorts & Funnel',
      ar: 'الحضور والدفعات ومسار التسجيل',
    },
  },
  medical: {
    kpis: {
      fr: 'Recettes & File d’attente',
      en: 'Clinic Revenue & Triage Alerts',
      ar: 'مداخيل العيادة وحالة الانتظار',
    },
    schedule: {
      fr: 'Affluence clinique & Planning praticiens',
      en: 'Patient Flow & Practitioner Schedule',
      ar: 'توافد المرضى وجدول الأطباء',
    },
    pipeline: {
      fr: 'Actes NGAP & Parcours patient',
      en: 'NGAP Mix & Care Pipeline',
      ar: 'توزيع الفحوصات ومسار المريض',
    },
  },
  pos: {
    kpis: {
      fr: 'Caisse & Alertes stock',
      en: 'Register Revenue & Stock Alerts',
      ar: 'مبيعات الصندوق وتنبيهات المخزون',
    },
    margins: {
      fr: 'Ventes & Marge nette',
      en: 'Sales Trajectory & Net Margin',
      ar: 'مسار المبيعات وصافي الهامش',
    },
    merchandising: {
      fr: 'Stocks, Meilleurs articles & Heures de pointe',
      en: 'Inventory, Top SKUs & Peak Hours',
      ar: 'المخزون وأفضل المنتجات وساعات الذروة',
    },
  },
  agriculture: {
    kpis: {
      fr: 'Récoltes & Délais sanitaires',
      en: 'Harvest Output & Safety Lockouts',
      ar: 'الحصاد والالتزام الصحي',
    },
    production: {
      fr: 'Production & Équilibre agronomique',
      en: 'Production & Agronomic Balance',
      ar: 'الإنتاج والتوازن الفلاحي',
    },
    resources: {
      fr: 'Eau ANRH, Foncier & Rendements',
      en: 'Water Quotas, Parcels & Crop Yields',
      ar: 'المياه والمساحة والمردودية',
    },
  },
  appointment: {
    kpis: {
      fr: 'Recettes & Taux d’annulation',
      en: 'Revenue & Cancellation Watch',
      ar: 'الإيرادات ونسبة الغياب',
    },
    streams: {
      fr: 'Prestations & Répartition services',
      en: 'Service Streams & Category Mix',
      ar: 'تدفقات الدخل وفئات الخدمات',
    },
    floor: {
      fr: 'Planning fauteuils & Équipe',
      en: 'Stylist Schedule & Chair Utilization',
      ar: 'جدول الكراسي وأداء المصففين',
    },
  },
  contractor: {
    kpis: {
      fr: 'Situations DGP & Retenues',
      en: 'DGP Billing & Guarantee Watch',
      ar: 'كشوف الأشغال واقتطاعات الضمان',
    },
    compliance: {
      fr: 'Décomptes & Contrôle qualité HSE',
      en: 'Net Mandate & Quality Compliance',
      ar: 'التدفق المالي ومطابقة الجودة',
    },
    execution: {
      fr: 'Lots DQE, Marchés & Avancement',
      en: 'BOQ Lots, Portfolio & Site Progress',
      ar: 'تنفيذ الحصص والصفقات والتقدم',
    },
  },
  education: {
    kpis: {
      fr: 'Scolarité & Absentéisme',
      en: 'Tuition & Absence Watch',
      ar: 'الرسوم الدراسية ومعدل الغياب',
    },
    cohorts: {
      fr: 'Assiduité & Capacité des cohortes',
      en: 'Cohort Attendance & Capacity',
      ar: 'المواظبة وسعة الأفواج',
    },
    academics: {
      fr: 'Résultats, Présences & Admissions',
      en: 'Grades, Consistency & Admissions',
      ar: 'النتائج والالتزام ومسار القبول',
    },
  },
  project: {
    kpis: {
      fr: 'Portefeuille & Approbations',
      en: 'Committed Portfolio & Approvals',
      ar: 'محفظة المشاريع والموافقات',
    },
    sla: {
      fr: 'Marge portefeuille & Santé SLA',
      en: 'Margin Bridge & Delivery SLA',
      ar: 'هامش المحفظة ومؤشر الإنجاز',
    },
    delivery: {
      fr: 'Budgets, Pipeline & Rentabilité',
      en: 'Budget Control, Pipeline & Margins',
      ar: 'الميزانية ومسار التسليم والترتيب',
    },
  },
  freelance: {
    kpis: {
      fr: 'Honoraires & Créances clients',
      en: 'Collected Fees & Unpaid Invoices',
      ar: 'الأتعاب المحصلة والفواتير المعلقة',
    },
    utilization: {
      fr: 'Encaissements & Ratio facturable',
      en: 'Cashflow & Billable Utilization',
      ar: 'التحصيل النقدي ونسبة الفوترة',
    },
    clients: {
      fr: 'Charge horaire, Clients & Devis',
      en: 'Time Variance, Clients & Pipeline',
      ar: 'الساعات والعملاء ومسار العروض',
    },
  },
  garage: {
    kpis: {
      fr: 'Facturation atelier & Pièces',
      en: 'Workshop Billing & Parts Alerts',
      ar: 'فوترة الورشة وتنبيهات القطع',
    },
    margins: {
      fr: 'Marges atelier & Pipeline OR',
      en: 'Workshop Margins & Repair Funnel',
      ar: 'هوامش الورشة ومسار الإصلاح',
    },
    bays: {
      fr: 'Planning des ponts & Techniciens',
      en: 'Bay Schedule & Technician Output',
      ar: 'تخطيط الجسور وأداء الفنيين',
    },
  },
  legal: {
    kpis: {
      fr: 'Honoraires & Échéances CPCA',
      en: 'Fees Collected & CPCA Deadlines',
      ar: 'الأتعاب والآجال الحاسمة',
    },
    escrow: {
      fr: 'Flux honoraires & Comptes CARPA',
      en: 'Fee Trend & CARPA Escrow',
      ar: 'منحنى الأتعاب وحسابات الضمان',
    },
    dockets: {
      fr: 'Dossiers, Provisions & Charge avocats',
      en: 'Dockets, Retainers & Caseload',
      ar: 'مسار القضايا والمستحقات وتوزيع المحامين',
    },
  },
  logistics: {
    kpis: {
      fr: 'COD encaissé & Taux de retour',
      en: 'Collected COD & Return Rate',
      ar: 'مبالغ COD ونسبة الإرجاع',
    },
    remittance: {
      fr: 'Livraisons & Réconciliation COD',
      en: 'Delivery Mix & COD Remittance',
      ar: 'التسليم وتسوية أموال COD',
    },
    network: {
      fr: 'Poids colis, Hub & Wilayas',
      en: 'Weight Tiers, Hub Flow & Wilayas',
      ar: 'الأوزان ومسار المحطة والولايات',
    },
  },
  manufacturing: {
    production: {
      fr: 'Production, Rebuts & Qualité QC',
      en: 'Output, Scrap & Quality Yield',
      ar: 'الإنتاج والهدر ومطابقة الجودة',
    },
    operations: {
      fr: 'Coûts OF, Avancement & Équilibre usine',
      en: 'Production Costs, Orders & Plant Health',
      ar: 'التكاليف وتقدم التصنيع وتوازن المصنع',
    },
  },
  realestate: {
    kpis: {
      fr: 'Loyers perçus & Impayés / Mandats',
      en: 'Rent Collected & Arrears / Mandates',
      ar: 'الإيجارات والمتأخرات والتفويضات',
    },
    portfolio: {
      fr: 'Valorisation m² & Typologie biens',
      en: 'Valuation & Portfolio Breakdown',
      ar: 'الأسعار وتصنيف المحفظة العقارية',
    },
    brokerage: {
      fr: 'Recouvrement, Négociation & Courtage',
      en: 'Collection Rate, Spreads & Brokerage',
      ar: 'التحصيل والتفاوض ومسار الصفقات',
    },
  },
  trading: {
    commercial: {
      fr: 'Ventes B2B, Encours & Marges négoce',
      en: 'B2B Turnover, Credit & Trade Margin',
      ar: 'المبيعات والائتمان وهامش التجارة',
    },
    risk: {
      fr: 'Distributeurs, Dépôts & Plafonds crédit',
      en: 'Distributors, Depots & Credit Caps',
      ar: 'الموزعون والمستودعات وسقف الائتمان',
    },
  },
  venue: {
    kpis: {
      fr: 'Réservations & Soldes dus',
      en: 'Booking Revenue & Balances',
      ar: 'مداخيل الحجوزات والمستحقات',
    },
    occupancy: {
      fr: 'Encaissements & Occupation contrats',
      en: 'Rental Cashflow & Occupancy',
      ar: 'التدفق النقدي ومعدل الإشغال',
    },
    spaces: {
      fr: 'Planning des espaces & Revenus par type',
      en: 'Space Calendar & Revenue Mix',
      ar: 'جدول القاعات وتوزيع العائدات',
    },
  },
} as const satisfies Record<string, Record<string, TrilingualText>>;

export type DashboardCategoryPodKey = keyof typeof DASHBOARD_POD_TITLES;

export function getDashboardPodTitle<C extends DashboardCategoryPodKey>(
  category: C,
  podKey: keyof (typeof DASHBOARD_POD_TITLES)[C],
  language: SupportedLanguage
): string {
  const entry = DASHBOARD_POD_TITLES[category]?.[podKey] as TrilingualText | undefined;
  if (!entry) return '';
  return pickText(language, entry.fr, entry.en, entry.ar);
}

import React from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Lock,
} from 'lucide-react';
import { SupportedLanguage } from '../../types/index';
import { AtriumButton } from '../ui/AtriumButton';

export type UniversalStrategicGoalId =
  | 'goal_structure_processes'
  | 'goal_connect_team'
  | 'goal_secure_cashflow'
  | 'goal_client_retention'
  | 'goal_billing_dzd'
  | 'goal_zero_scheduling_delays'
  | 'goal_total_inventory_traceability'
  | 'goal_secure_milestones_ccp'
  | 'goal_digitize_medical_records'
  | 'goal_multisite_roles_governance';

export interface FeatureBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: UniversalStrategicGoalId | string | null;
  onApplyAndContinue: () => void;
  language: SupportedLanguage;
}

interface BlueprintData {
  title: { fr: string; ar: string; en: string };
  subtitle: { fr: string; ar: string; en: string };
  screenBadge: { fr: string; ar: string; en: string };
  mechanisms: Array<{
    title: { fr: string; ar: string; en: string };
    desc: { fr: string; ar: string; en: string };
  }>;
  result: {
    stat: string;
    label: { fr: string; ar: string; en: string };
  };
}

const BLUEPRINTS: Record<string, BlueprintData> = {
  goal_structure_processes: {
    title: {
      fr: 'Structuration Opérationnelle & Processus d’Entreprise',
      ar: 'هيكلة وتنظيم النشاط والعمليات اليومية',
      en: 'Operational Structuring & Core Workflows',
    },
    subtitle: {
      fr: 'Centralisation des dossiers, standardisation des flux et zéro dispersion administrative',
      ar: 'توحيد الملفات والمعاملات في نظام مركزي متكامل دون تشتت',
      en: 'Unified customer records, streamlined operational pipelines, zero clutter',
    },
    screenBadge: {
      fr: 'Écrans : Tableaux de Bord & Collections 360°',
      ar: 'الشاشات: لوحة القيادة الموحدة وملفات 360°',
      en: 'Modules: Unified Dashboards & 360° Hubs',
    },
    mechanisms: [
      {
        title: {
          fr: 'Dossiers Clients & Passports Métiers 360°',
          ar: 'ملف شامل 360° لكل زبون ومؤسسة',
          en: '360° Unified Customer Passports',
        },
        desc: {
          fr: 'Consolidation immédiate des coordonnées, historique complet des transactions, soldes en cours et documents rattachés en un seul écran.',
          ar: 'تجميع فوري للبيانات، المعاملات السابقة، المستحقات المالية والوثائق في ملف واحد دون تكرار.',
          en: 'Consolidates contact details, purchase history, outstanding balances, and attachments in one clean drawer.',
        },
      },
      {
        title: {
          fr: 'Canvas Opérationnel à Élévation Unique',
          ar: 'واجهة تشغيل موحدة ذات عمق بصري واحد',
          en: 'Single-Elevation Operational Canvas',
        },
        desc: {
          fr: 'Élimination des cartes imbriquées et de la surcharge visuelle : bascule rapide entre vue Liste dense et vue Grille avec tiroir inspecteur latéral.',
          ar: 'تصميم نظيف بدون تداخل بطاقات مربكة، مع إمكانية التبديل الفوري بين عرض القائمة وعرض البطاقات.',
          en: 'Clean layout without nested card clutter, featuring fast toggle between dense list view and inspection drawers.',
        },
      },
      {
        title: {
          fr: 'Moteur de Recherche Seek & Command Palette',
          ar: 'محرك بحث فوري Seek مع اختصارات سريعة',
          en: 'Instant Seek Search & Global Command Palette',
        },
        desc: {
          fr: 'Accès en moins de 100 ms à n’importe quel client, facture ou écran via le raccourci global Ctrl+K ou la loupe cinétique Seek.',
          ar: 'وصول في أقل من 100 ملي ثانية لأي عميل، سجل أو فاتورة عبر الاختصار الشامل Ctrl+K أو محرك Seek التفاعلي.',
          en: 'Sub-100ms instant lookup across clients, documents, and tools via global Ctrl+K or expanding Seek search.',
        },
      },
    ],
    result: {
      stat: '100%',
      label: {
        fr: 'Visibilité totale sur votre activité et zéro document égaré',
        ar: 'رؤية شاملة ومباشرة على كافة مفاصل نشاطك التجاري',
        en: 'Total operational clarity with zero lost paperwork or mislaid records',
      },
    },
  },

  goal_connect_team: {
    title: {
      fr: 'Coordination d’Équipe & Espaces Métiers Dédiés',
      ar: 'تنسيق فريق العمل ومساحات الأدوار المتخصصة',
      en: 'Team Coordination & Role-Tailored Workspaces',
    },
    subtitle: {
      fr: 'Espaces par rôle (Gérant, Caisse, Terrain, Compta), codes PIN rapides et journal d’audit',
      ar: 'مساحات مخصصة لكل دور، كود PIN السريع وتتبع كامل لعمليات الموظفين',
      en: 'Role-adaptive workspaces, fast operator PIN switching, and complete audit trails',
    },
    screenBadge: {
      fr: 'Écrans : Multi-rôles, Switcher PIN & Journal d’Audit',
      ar: 'الشاشات: مصفوفة الصلاحيات، تسجيل الدخول بـ PIN وسجل العمليات',
      en: 'Modules: Multi-Role Hubs, PIN Fast-Switch & Audit Log',
    },
    mechanisms: [
      {
        title: {
          fr: 'Espaces Métiers Dédiés par Profil Opérationnel',
          ar: 'مساحات عمل مفصلة حسب وظيفة كل موظف',
          en: 'Role-Adaptive Dedicated Workspaces',
        },
        desc: {
          fr: 'Chaque collaborateur (Gérant, Réceptionniste, Caissier, Opérateur de terrain, Comptable) dispose d’une barre latérale adaptée à ses tâches exactes.',
          ar: 'كل موظف (المسؤول، الموظف الميداني، أمين الصندوق، المحاسب) يرى فقط الأدوات اللازمة لمهامه دون تشويش.',
          en: 'Each staff member (Owner, Cashier, Field Supervisor, Accountant) receives a focused sidebar tailored to their job.',
        },
      },
      {
        title: {
          fr: 'Bascule Ultra-Rapide par Code PIN Opérateur',
          ar: 'تبديل فوري بين الموظفين عبر كود PIN السريع',
          en: 'Sub-Second Staff Switching via 4-Digit PIN',
        },
        desc: {
          fr: 'Sur le terminal de caisse ou la tablette d’atelier, changez d’opérateur en 1 seconde par code PIN à 4 chiffres sans déconnecter la session générale.',
          ar: 'على أجهزة الصندوق أو الأجهزة اللوحية، يمكن التبديل بين الموظفين في ثانية واحدة عبر كود PIN دون تسجيل خروج.',
          en: 'Switch between team operators in 1 second at the POS or tablet via 4-digit PIN without breaking the session.',
        },
      },
      {
        title: {
          fr: 'Traçabilité Quadruple & Journal d’Audit Infalsifiable',
          ar: 'توثيق رقابي رباعي وسجل عمليات غير قابل للتعديل',
          en: 'Quadruple Traceability & Immutable Audit Trail',
        },
        desc: {
          fr: 'Chaque création de facture, remise accordée, ou modification de statut est scellée avec l’identifiant précis du collaborateur émetteur (staff_id).',
          ar: 'كل عملية تحصيل، تخفيض، أو تعديل تسجل فوراً بهوية الموظف المنفذ لمنع التلاعب وتحديد المسؤوليات.',
          en: 'Every single invoice, discount, or record change is permanently stamped with the author’s staff_id.',
        },
      },
    ],
    result: {
      stat: '0 conflit',
      label: {
        fr: 'Zéro chevauchement de responsabilités et traçabilité interne totale',
        ar: 'انعدام تداخل الصلاحيات وتوثيق دقيق لكل عملية يقوم بها الفريق',
        en: 'Zero role ambiguity and airtight accountability across your entire team',
      },
    },
  },

  goal_secure_cashflow: {
    title: {
      fr: 'Sécurisation de la Trésorerie & Encaissements',
      ar: 'تأمين المقابيض والسيولة المالية وإغلاق الصناديق',
      en: 'Securing Cashflow, Daily Revenue & Fiscal Compliance',
    },
    subtitle: {
      fr: 'Clôtures de caisse journalières (Z), multi-devises locales et conformité légale DZD',
      ar: 'إغلاق الصندوق اليومي Z، قبول الدفع المتعدد واحترام القوانين الجبائية',
      en: 'Daily cash drawer Z-reports, multi-tender tenders, and DZD tax stamp automation',
    },
    screenBadge: {
      fr: 'Écrans : Caisse Tactile, Clôtures Z & Mandats CCP',
      ar: 'الشاشات: الصندوق السريع، تقارير الإغلاق والجبايات',
      en: 'Modules: POS Checkout, Z-Reports & CCP Vouchers',
    },
    mechanisms: [
      {
        title: {
          fr: 'Rapprochement & Clôture de Caisse Z Journalière',
          ar: 'مطابقة دقيقة وإغلاق الصندوق اليومي Z',
          en: 'Daily Cash Drawer Balance & Z-Close Reports',
        },
        desc: {
          fr: 'Contrôle systématique des écarts de caisse, comptage des billets physiques et verrouillage infalsifiable en fin de journée.',
          ar: 'مطابقة دقيقة بين السيولة الفعلية وسجلات النظام، وتوليد تقرير إغلاق Z نهائي يومياً.',
          en: 'Enforces cash drawer counting, calculates balance differences, and prints tamper-proof daily Z-reports.',
        },
      },
      {
        title: {
          fr: 'Encaissements Multi-Canaux & BaridiMob QR',
          ar: 'تحصيل سريع نقداً، بريدي موب وبطاقات CIB',
          en: 'Multi-Tender Cash, BaridiMob QR & CIB Cards',
        },
        desc: {
          fr: 'Ventilation fluide entre Espèces, BaridiMob, Carte CIB et chèque bancaire avec ouverture automatique du tiroir et reçu instantané.',
          ar: 'توزيع فوري للمقبوضات بين الدفع نقداً، بريدي موب، البطاقات البنكية والصكوك مع طباعة الوصل فوراً.',
          en: 'Seamlessly accepts Cash, BaridiMob QR, CIB bank cards, and checks with automated drawer pop and receipt print.',
        },
      },
      {
        title: {
          fr: 'Timbre Fiscal Art. 317 & Mentions Réglementaires',
          ar: 'حساب تلقائي للرسم الجبائي والبيانات الإلزامية',
          en: 'Algerian Art. 317 Stamp Duty & Fiscal Rules',
        },
        desc: {
          fr: 'Application automatique du droit de timbre fiscal gradué sur les paiements en espèces avec mention du NIF, NIS, RC et Article d’Imposition.',
          ar: 'حساب آلي للرسم الجبائي على المبالغ النقدية وتضمين المعرف الجبائي والسجل التجاري على كافة الفواتير.',
          en: 'Automatically applies graduated fiscal stamp duty to cash tenders with legal NIF, NIS, and RC fields.',
        },
      },
    ],
    result: {
      stat: '0 DZD',
      label: {
        fr: 'Zéro fuite de recettes et rapprochement bancaire sans surprise',
        ar: 'انعدام أي فارق غير مبرر في الصندوق ومطابقة مالية يومية مؤكدة',
        en: 'Zero unexplained cash discrepancies and exact financial control',
      },
    },
  },

  goal_client_retention: {
    title: {
      fr: 'Fidélisation Clients & Radar de Performance',
      ar: 'تعزيز ولاء الزبائن ومؤشرات الأداء في الوقت الحقيقي',
      en: 'Customer Retention & Real-Time Business Radar',
    },
    subtitle: {
      fr: 'Historique d’interactions, relances proactives et pilotage de la rentabilité',
      ar: 'سجل كامل للتعاملات، تنبيهات استباقية ومتابعة دقيقة لمؤشرات النمو',
      en: 'Interaction history, proactive follow-ups, and live profitability metrics',
    },
    screenBadge: {
      fr: 'Écrans : Répertoire Clients 360°, Alertes & KPI Radar',
      ar: 'الشاشات: سجل الزبائن، التنبيهات ورادار الأداء',
      en: 'Modules: 360° Client CRM, Proactive Alerts & Radar',
    },
    mechanisms: [
      {
        title: {
          fr: 'Passeport Client & Historique des Visites',
          ar: 'سجل الزبون التراكمي وتاريخ الزيارات والمعاملات',
          en: 'Customer Passports & Longitudinal History',
        },
        desc: {
          fr: 'Consultez en un clin d’œil l’ensemble des prestations passées, fréquentation, préférences et dates clés pour personnaliser chaque accueil.',
          ar: 'معرفة فورية لكافة المشتريات والزيارات والملاحظات الخاصة بكل عميل لتخصيص الخدمة بدقة.',
          en: 'Instant lookup of client preferences, past visits, purchases, and key anniversary dates.',
        },
      },
      {
        title: {
          fr: 'Alertes Automatiques & Détection d’Inactivité',
          ar: 'تنبيهات تلقائية لاستعادة الزبائن الغائبين',
          en: 'Smart Inactivity Triggers & Proactive Reminders',
        },
        desc: {
          fr: 'Repérez immédiatement les clients fidèles qui n’ont pas réservé ou commandé depuis plus de 30 jours pour déclencher une relance ciblée.',
          ar: 'كشف تلقائي للزبائن المنتظمين الذين انقطعوا لأكثر من 30 يوماً لإعادة تفعيل التواصل معهم.',
          en: 'Instantly identifies churn risks and past-due accounts for timely WhatsApp, SMS, or phone follow-up.',
        },
      },
      {
        title: {
          fr: 'Radar de Performance Opérationnel Sans Latence',
          ar: 'رادار حي لمتابعة وتيرة العمل والإيرادات',
          en: 'Real-Time Operational Pulse & Business Radar',
        },
        desc: {
          fr: 'Suivi en direct du panier moyen, de la rentabilité par jour et du taux de fréquentation sans calculs manuels sur tableur.',
          ar: 'متابعة مباشرة لمتوسط الفاتورة، الإيراد اليومي ونسب الإقبال دون الحاجة لأي جداول خارجية.',
          en: 'Real-time calculation of average ticket, daily volume, and peak hours without spreadsheet export.',
        },
      },
    ],
    result: {
      stat: '+35%',
      label: {
        fr: 'Augmentation mesurée du taux de récurrence et de fidélité',
        ar: 'زيادة ملموسة في تكرار الزيارات واستعادة الزبائن غير النشطين',
        en: 'Proven lift in repeat transactions and customer lifetime engagement',
      },
    },
  },
  goal_billing_dzd: {
    title: {
      fr: 'Automatisation de la Facturation & Encaissements en Dinar',
      ar: 'أتمتة الفوترة والتحصيل بالدينار الجزائري',
      en: 'Automated DZD Invoicing & Instant Cash Settlement',
    },
    subtitle: {
      fr: 'Calcul du Timbre Fiscal légal, multi-devises locales et caisse tactile certifiée',
      ar: 'حساب الرسم الجبائي القانوني، الدفع عبر بريدي موب وإيصالات الصندوق المعتمدة',
      en: 'Algerian tax stamp automation, BaridiMob QR flow & daily Z-reports',
    },
    screenBadge: {
      fr: 'Écrans : Caisse Tactile & Ventes B2B',
      ar: 'الشاشات: الصندوق السريع والمبيعات التجارية',
      en: 'Modules: POS Register & Commercial Sales',
    },
    mechanisms: [
      {
        title: {
          fr: 'Timbre Fiscal & TVA Algérienne Automatisés',
          ar: 'حساب تلقائي للرسم الجبائي وضريبة TVA',
          en: 'Automated Timbre Fiscal & VAT Math',
        },
        desc: {
          fr: 'Application automatique du droit de timbre fiscal (1% ou 2% avec plancher et plafond légal) sur chaque devis, bon de livraison et facture.',
          ar: 'تطبيق تلقائي للرسم الجبائي وفق القانون الجزائري على كافة الفواتير وسندات التسليم مع احترام السقوف المحددة.',
          en: 'Applies legal Algerian fiscal stamp rules (1% or 2% with statutory floors and ceilings) across invoices and delivery notes.',
        },
      },
      {
        title: {
          fr: 'Encaissement Multi-Canaux & BaridiMob QR',
          ar: 'تحصيل فوري عبر بريدي موب والبطاقات البنكية',
          en: 'Instant BaridiMob QR & Multi-Tender Checkout',
        },
        desc: {
          fr: 'Ventilation instantanée entre Espèces, BaridiMob, Carte CIB et chèque, avec ouverture automatique du tiroir-caisse et impression thermique.',
          ar: 'فرز فوري للمدفوعات بين نقداً، بريدي موب، وبطاقات الدفع مع طباعة إيصالات حرارية سريعة.',
          en: 'Instant split tenders across Cash, BaridiMob, and CIB cards with automated thermal receipt printing.',
        },
      },
      {
        title: {
          fr: 'Mentions Légales & Clôture Z Journalière',
          ar: 'البيانات الجبائية الإلزامية وتقرير الإغلاق Z',
          en: 'Mandatory Fiscal Data & Daily Z-Reports',
        },
        desc: {
          fr: 'Intégration automatique du NIF, NIS, RC, et Article d’Imposition avec rapprochement de caisse infalsifiable en fin de journée.',
          ar: 'تضمين السجل التجاري والرقم الجبائي مع تقرير محاسبي دقيق لمطابقة الصندوق عند نهاية اليوم.',
          en: 'Prints NIF, NIS, RC, and tax articles with tamper-proof end-of-day balance reconciliations.',
        },
      },
    ],
    result: {
      stat: '100%',
      label: {
        fr: 'Conformité légale garantie et clôture en 60 secondes',
        ar: 'مطابقة تامة للقوانين الجبائية وإغلاق في أقل من دقيقة',
        en: 'Guaranteed fiscal compliance with 60-second end-of-day close',
      },
    },
  },

  goal_zero_scheduling_delays: {
    title: {
      fr: 'Synchronisation des Agendas & Élimination des Conflits',
      ar: 'مزامنة الجداول الزمنية والقضاء على تضارب المواعيد',
      en: 'Conflict-Free Scheduling & Real-Time Team Rostering',
    },
    subtitle: {
      fr: 'Allocation multi-postes, gestion des temps de battement et fiches clientes',
      ar: 'توزيع الكراسي والغرف بدقة مع فترات راحة وتعقيم بين الحصص',
      en: 'Multi-column resource allocation with buffer times and customer logs',
    },
    screenBadge: {
      fr: 'Écrans : Planning Stylistes & Calendrier des Salles',
      ar: 'الشاشات: جدول المواعيد وحجوزات القاعات',
      en: 'Modules: Appointment Schedule & Resource Timeline',
    },
    mechanisms: [
      {
        title: {
          fr: 'Détection Algorithmique des Chevauchements',
          ar: 'كشف فوري لتداخل الأوقات والحجوزات المزدوجة',
          en: 'Algorithmic Overlap & Double-Booking Shield',
        },
        desc: {
          fr: 'Vérification en temps réel de la disponibilité du collaborateur, du fauteuil ou de la salle avec avertissement visuel immédiat en cas de conflit.',
          ar: 'فحص فوري لتوافر الموظف، الكرسي أو القاعة مع تنبيه بصري لمنع أي حجز مزدوج.',
          en: 'Real-time resource verification preventing double-bookings across staff and physical stations.',
        },
      },
      {
        title: {
          fr: 'Temps de Battement & Préparation',
          ar: 'فترات تعقيم وتجهيز تلقائية بين الحصص',
          en: 'Configurable Buffer & Disinfection Intervals',
        },
        desc: {
          fr: 'Insertion automatique d’un battement paramétrable (10 à 30 min) pour la désinfection du matériel, la préparation ou la pause praticien.',
          ar: 'إدراج فترات فاصلة تلقائية للتعقيم والتجهيز بين كل موعدين لضمان جودة الخدمة.',
          en: 'Automates 10-30 minute buffer slots between client sessions for sterilization and prep.',
        },
      },
      {
        title: {
          fr: 'Fiche Technique & Historique Rattaché',
          ar: 'سجل تفضيلات الزبون وتاريخ المعاملات',
          en: 'Integrated Client Technical & Preference Card',
        },
        desc: {
          fr: 'Chaque rendez-vous affiche les préférences passées du client, formules choisies, formules d’allergies ou prestations favorites.',
          ar: 'عرض تفاصيل تفضيلات الزبون، المنتجات المستخدمة وسجل الزيارات السابقة فور النقر على الموعد.',
          en: 'Instant access to prior visit history, technical hair/skin formulas, and custom client notes.',
        },
      },
    ],
    result: {
      stat: '94%',
      label: {
        fr: 'Taux d’occupation optimisé et réduction drastique des no-shows',
        ar: 'تحسين نسبة إشغال الكراسي والقضاء على غياب الزبائن دون إشعار',
        en: 'Optimized chair utilization with dramatic no-show reductions',
      },
    },
  },

  goal_total_inventory_traceability: {
    title: {
      fr: 'Traçabilité Totale des Stocks, Dépôts & Matières Premières',
      ar: 'تتبع شامل للمخزون، المستودعات والمواد الأولية',
      en: 'End-to-End Inventory, Multi-Warehouse & Raw Material Control',
    },
    subtitle: {
      fr: 'Décrémentation temps réel, alertes seuil critique et valorisation PMP',
      ar: 'خصم فوري للمخزون مع الباركود، رادار التنبيه وتقييم التكلفة الحقيقية',
      en: 'Real-time barcode deduction, low-stock radar, and weighted cost math',
    },
    screenBadge: {
      fr: 'Écrans : Inventaire Caisse & Entrepôts B2B',
      ar: 'الشاشات: مخزون نقطة البيع ومستودعات التوزيع',
      en: 'Modules: POS Inventory & B2B Depot Warehouse',
    },
    mechanisms: [
      {
        title: {
          fr: 'Décrémentation Automatique par Code-Barres',
          ar: 'خصم تلقائي للمخزون عند البيع أو الصرف',
          en: 'Instant Barcode & Usage Auto-Deduction',
        },
        desc: {
          fr: 'Chaque vente en caisse, bon de livraison ou ordre de fabrication déduit instantanément les articles et composants de la base centrale.',
          ar: 'خصم الكميات فور مسح الباركود أو تأكيد سند التسليم دون الحاجة إلى تعديل يدوي.',
          en: 'Real-time deduction across sales, job cards, and bills of materials upon barcode scan.',
        },
      },
      {
        title: {
          fr: 'Radar de Réapprovisionnement & Seuil Critique',
          ar: 'رادار إنذار ذكي عند اقتراب نفاذ السلع',
          en: 'Predictive Low-Stock & Safety Threshold Radar',
        },
        desc: {
          fr: 'Notification proactive dès qu’un article descend sous son seuil de sécurité avec génération automatique du bon de commande fournisseur.',
          ar: 'تنبيه استباقي عند وصول الصنف إلى الحد الأدنى مع تجهيز طلبية تموين تلقائية.',
          en: 'Proactive warnings before stockouts occur with auto-prepared vendor purchase orders.',
        },
      },
      {
        title: {
          fr: 'Valorisation PMP & Multi-Dépôts',
          ar: 'إدارة المستودعات المتعددة وحساب متوسط التكلفة',
          en: 'Weighted Average Cost (CMUP) & Multi-Depot Transfers',
        },
        desc: {
          fr: 'Suivi des stocks répartis sur plusieurs dépôts ou rayons avec calcul précis du prix moyen pondéré pour une marge nette exacte.',
          ar: 'توزيع المخزون بين عدة مستودعات وفروع مع احتساب دقيق لهوامش الربح الصافية.',
          en: 'Seamless stock transfers across depots with precise gross profit margin calculations.',
        },
      },
    ],
    result: {
      stat: '0%',
      label: {
        fr: 'Zéro rupture imprévue et traçabilité financière intégrale',
        ar: 'انعدام النفاذ المفاجئ مع شفافية مالية مطلقة للمخزون',
        en: 'Zero unexpected stockouts and airtight financial margins',
      },
    },
  },

  goal_secure_milestones_ccp: {
    title: {
      fr: 'Sécurisation des Jalons Clients, BAT & Mandats CCP SFP 01',
      ar: 'تأمين مراحل المشاريع، موافقة BAT وحوالات CCP',
      en: 'Milestone Governance, Client BAT Sign-Off & CCP SFP 01',
    },
    subtitle: {
      fr: 'Double verrouillage contractuel et bordereaux légaux Algérie Poste',
      ar: 'توثيق قانوني للتسليمات وحوالات بريد الجزائر بالأحرف العربية',
      en: 'Contractual double-lock with automated legal Arabic postal vouchers',
    },
    screenBadge: {
      fr: 'Écrans : Jalons Agence & Comptabilité CCP',
      ar: 'الشاشات: مراحل المشاريع والمحاسبة البريدية',
      en: 'Modules: Agency Milestones & CCP SFP 01 Ledger',
    },
    mechanisms: [
      {
        title: {
          fr: 'Validation Client BAT (Bon à Tirer)',
          ar: 'موافقة الزبون الموثقة قبل بدء التنفيذ',
          en: 'Client BAT Proof & Execution Sign-Off',
        },
        desc: {
          fr: 'Les équipes créatives ou techniques soumettent le livrable ; les étapes suivantes sont verrouillées jusqu’à l’approbation formelle du client.',
          ar: 'قفل مراحل الإنتاج تلقائياً حتى يتم اعتماد العينة أو التصميم رسمياً من العميل.',
          en: 'Locks down production until formal client sign-off on creative or engineering proofs.',
        },
      },
      {
        title: {
          fr: 'Algorithme Chiffres en Lettres Arabes Légales',
          ar: 'تحويل المبالغ كتابة بالحروف العربية القانونية',
          en: 'Legal Arabic Number-to-Words Algorithm',
        },
        desc: {
          fr: 'Conversion automatique et infaillible des montants en dinars en lettres arabes officielles requises par les mandats SFP 01 d’Algérie Poste.',
          ar: 'خوارزمية ذكية لكتابة المبالغ المالية بالحروف العربية بدقة متناهية وفق معايير بريد الجزائر.',
          en: 'Zero-mistake Arabic textual conversion required by official postal money orders.',
        },
      },
      {
        title: {
          fr: 'Bordereaux Certifiés & Traçabilité Quadruple',
          ar: 'صكوك SFP 01 معتمدة وتتبع رباعي للعمليات',
          en: 'Certified SFP 01 Slips & Quadruple Traceability',
        },
        desc: {
          fr: 'Chaque mandat est scellé avec le numéro de compte CCP, la clé de contrôle, et l’identifiant de l’opérateur émetteur.',
          ar: 'توثيق كل حوالة برقم الحساب، مفتاح CCP وهوية الموظف المسؤول مع إمكانية الطباعة الفورية.',
          en: 'Prints compliant SFP 01 postal vouchers sealed with staff author, branch ID, and key checks.',
        },
      },
    ],
    result: {
      stat: '100%',
      label: {
        fr: 'Acceptation administrative sans rejet et levée de litiges',
        ar: 'قبول فوري لدى مراكز البريد وانعدام النزاعات مع الزبائن',
        en: 'Zero postal voucher rejections and bulletproof client sign-offs',
      },
    },
  },

  goal_digitize_medical_records: {
    title: {
      fr: 'Numérisation des Dossiers Métiers (Santé, Éducation, Baux)',
      ar: 'رقمنة شاملة للملفات والسجلات المهنية المتخصصة',
      en: 'Complete Dossier & Record Digitization (EMR, Leases, Students)',
    },
    subtitle: {
      fr: 'Triage en temps réel, recherche instantanée en 2s et confidentialité',
      ar: 'فرز حي للحالات، وصول فوري للمعلومات وسرية تامة للبيانات',
      en: 'Live triage queues, 2-second full record lookups, and strict privacy',
    },
    screenBadge: {
      fr: 'Écrans : File d’Attente & Dossier Patient 360°',
      ar: 'الشاشات: قاعة الانتظار والملف الطبي الشامل',
      en: 'Modules: Triage Queue & 360° Medical Record',
    },
    mechanisms: [
      {
        title: {
          fr: 'File d’Attente avec Statut de Triage Dynamique',
          ar: 'قاعة انتظار ذكية مع تصنيف أولوية الفحص',
          en: 'Smart Queue with Dynamic Triage Statuses',
        },
        desc: {
          fr: 'Visualisation immédiate des arrivées, consultations en cours et cas prioritaires avec calcul du temps d’attente moyen.',
          ar: 'عرض حي للوافدين مع تحديد الحالات المستعجلة واحتساب متوسط وقت الانتظار بدقة.',
          en: 'Live waiting room monitors with triage priorities (Waiting, In Consultation, Discharged).',
        },
      },
      {
        title: {
          fr: 'Dossier 360° & Historique Médical / Scolaire',
          ar: 'ملف شامل 360° للسوابق والمتابعات السابقة',
          en: '360° Chronological Consultation History',
        },
        desc: {
          fr: 'Centralisation des constantes vitales, antécédents, diagnostics antérieurs et comptes-rendus avec recherche instantanée par nom ou numéro.',
          ar: 'تجميع العلامات الحيوية، الفحوصات والتشخيصات السابقة في سجل واحد يبحث في ثانيتين.',
          en: 'Consolidates vitals, past diagnoses, treatment notes, and lab attachments in one drawer.',
        },
      },
      {
        title: {
          fr: 'Ordonnances & Documents Imprimables en 1 Clic',
          ar: 'وصفات طبية وشهادات مطبوعة بضغطة زر',
          en: '1-Click Standardized Digital Prescriptions',
        },
        desc: {
          fr: 'Génération instantanée d’ordonnances avec posologie, contre-indications et entête officiel certifié de l’établissement.',
          ar: 'طباعة فورية للوصفات الطبية مع الجرعات الدقيقة والختم الرسمي للمؤسسة.',
          en: 'Prints formatted Rx documents, treatment plans, and certificates with clinic seals.',
        },
      },
    ],
    result: {
      stat: '2 sec',
      label: {
        fr: 'Temps d’accès à n’importe quel dossier historique',
        ar: 'سرعة الوصول لأي ملف أرشيفي مهما كان حجم السجلات',
        en: 'Instant retrieval time for any historical record',
      },
    },
  },

  goal_multisite_roles_governance: {
    title: {
      fr: 'Pilotage Multi-Établissements & Gouvernance des Rôles',
      ar: 'إدارة الفروع المتعددة والتحكم الصارم في الصلاحيات',
      en: 'Multi-Branch Management & Role-Based Security Governance',
    },
    subtitle: {
      fr: 'Standard Quadruple Traceability, bascule FastSwitch et pistes d’audit',
      ar: 'عزل أمني رباعي، تنقل سريع بين الفروع وسجل رقابي كامل',
      en: 'Quadruple traceability, FastSwitch multi-facility access, and audit trails',
    },
    screenBadge: {
      fr: 'Écrans : FastSwitch & Administration Paramètres',
      ar: 'الشاشات: التبديل السريع وإدارة الفروع',
      en: 'Modules: FastSwitch & System Administration',
    },
    mechanisms: [
      {
        title: {
          fr: 'Standard Quadruple Traceability',
          ar: 'معيار الأمان والتوثيق الرباعي المعتمد',
          en: 'Quadruple Traceability Contract',
        },
        desc: {
          fr: 'Chaque écriture comptable, modification de prix ou transaction est scellée avec account_id, business_id, branch_id et staff_id.',
          ar: 'كل حركة مالية أو تعديل في النظام يتم تسجيله برباعية: الحساب، المؤسسة، الفرع والموظف.',
          en: 'Every single record is permanently stamped with account, business, branch, and staff author IDs.',
        },
      },
      {
        title: {
          fr: 'Bascule FastSwitch en Moins d’Une Seconde',
          ar: 'تنقل فوري بين الفروع دون إعادة تسجيل الدخول',
          en: 'Sub-Second FastSwitch Facility Hopping',
        },
        desc: {
          fr: 'Passez d’une succursale à une autre ou changez de rôle (Directeur, Caissier, Praticien) sans déconnexion ni perte de session.',
          ar: 'التبديل بين الفروع أو تغيير دور المستخدم بنقرة واحدة ودون الحاجة لتسجيل الخروج.',
          en: 'Hop between clinics, depots, or venues instantaneously without relogging.',
        },
      },
      {
        title: {
          fr: 'Piste d’Audit Chronologique & Séparation des Pouvoirs',
          ar: 'سجل تدقيق زمني وحماية ضد التلاعب المالي',
          en: 'Immutable Chronological Audit Trail',
        },
        desc: {
          fr: 'Journal infalsifiable consignant les suppressions, remises accordées, réouvertures de caisse et ajustements d’inventaire.',
          ar: 'سجل غير قابل للتعديل يوثق كل عمليات الحذف، التخفيضات الاستثنائية وتعديلات المخزون.',
          en: 'Permanent ledger tracking every price discount, voided sale, and permission escalation.',
        },
      },
    ],
    result: {
      stat: '100%',
      label: {
        fr: 'Étanchéité des données entre établissements et zéro fraude interne',
        ar: 'عزل تام لبيانات الفروع وحماية كاملة من الأخطاء والتلاعب',
        en: 'Airtight multi-branch data isolation with zero internal leakage',
      },
    },
  },
};

export const FeatureBlueprintModal: React.FC<FeatureBlueprintModalProps> = ({
  isOpen,
  onClose,
  goalId,
  onApplyAndContinue,
  language,
}) => {
  if (!isOpen || !goalId) return null;

  const data = BLUEPRINTS[goalId] || BLUEPRINTS.goal_billing_dzd;
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-2xl bg-[#141416] border border-[#C4785A]/40 rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C4785A 0%, transparent 70%)' }}
        />

        {/* Modal Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 border-b border-white/10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C4785A] flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C4785A]/15 border border-[#C4785A]/30">
                <Sparkles className="w-3 h-3 text-[#C4785A]" />
                {isAr ? 'ميزات حقيقية مثبتة' : isFr ? 'Fonctionnalités réelles & certifiées' : 'Verifiable Built-in Capabilities'}
              </span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                {data.screenBadge[language] || data.screenBadge.en}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
              {data.title[language] || data.title.en}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 3 Mechanisms + Measurable Result */}
        <div className="relative z-10 px-6 py-5 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-3">
            {data.mechanisms.map((mech, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-neutral-900/80 border border-white/5 space-y-1.5 hover:border-white/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#C4785A]/20 flex items-center justify-center text-[#E09070] font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {mech.title[language] || mech.title.en}
                  </h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-8">
                  {mech.desc[language] || mech.desc.en}
                </p>
              </div>
            ))}
          </div>

          {/* Quantifiable Result Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1C1A18] to-neutral-900 border border-[#C4785A]/30 flex items-center gap-4">
            <div className="text-2xl sm:text-3xl font-black text-[#C4785A] font-mono shrink-0">
              {data.result.stat}
            </div>
            <div className="text-xs text-neutral-300 font-medium leading-relaxed">
              {data.result.label[language] || data.result.label.en}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 px-6 py-4 border-t border-white/10 flex items-center justify-between bg-neutral-950/60">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {isAr ? 'إلغاء' : isFr ? 'Fermer' : 'Close'}
          </button>

          <AtriumButton
            variant="primary"
            size="md"
            onClick={onApplyAndContinue}
            className="flex items-center gap-2"
          >
            <span>{isAr ? 'اعتماد هذا الهدف والمتابعة' : isFr ? 'Appliquer & Continuer' : 'Apply & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </AtriumButton>
        </div>

      </div>
    </div>
  );
};

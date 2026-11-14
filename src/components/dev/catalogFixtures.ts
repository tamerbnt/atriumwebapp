import { ChartLocale } from '@/atrium';

export type CatalogStressPreset = 'nominal' | 'partial' | 'extreme' | 'zeros';

export function buildCatalogFixtures(preset: CatalogStressPreset, locale: ChartLocale) {
  const isAr = locale === 'ar';
  const isEn = locale === 'en';
  const mul = preset === 'extreme' ? 1_250_000 : preset === 'zeros' ? 0 : 1;

  const lbl = (fr: string, en: string, ar: string) =>
    isAr ? ar : isEn ? en : fr;

  const longSuffix =
    preset === 'extreme'
      ? ' — Direction Générale & Pôle Opérationnel Multi-Wilayas Alger Centre'
      : '';

  return {
    kpiPositive: {
      title: lbl('Revenus mensuels', 'Monthly Revenue', 'الإيرادات الشهرية') + longSuffix,
      subtitle: lbl(
        'Encaissements consolidés TTC vs période N-1',
        'Consolidated receipts vs previous period',
        'الإيرادات المجمعة مقارنة بالفترة السابقة'
      ),
      helpText: lbl(
        'Inclut les renouvellements, ventes comptoir et acomptes validés.',
        'Includes renewals, counter sales and cleared deposits.',
        'يشمل التجديدات ومبيعات المتجر والدفعات المؤكدة.'
      ),
      value: preset === 'zeros' ? 0 : 2_840_000 * (preset === 'extreme' ? 420 : 1),
      deltaPercent: preset === 'zeros' ? 0 : preset === 'extreme' ? 142.8 : 14.6,
      series:
        preset === 'zeros'
          ? [{ label: 'J1', value: 0 }]
          : [
              { label: 'S1', value: 410000 * mul, previous: preset === 'partial' ? undefined : 365000 * mul },
              { label: 'S2', value: 590000 * mul, previous: preset === 'partial' ? undefined : 480000 * mul },
              { label: 'S3', value: 520000 * mul, previous: preset === 'partial' ? undefined : 510000 * mul },
              { label: 'S4', value: 685000 * mul, previous: preset === 'partial' ? undefined : 540000 * mul },
              { label: 'S5', value: 635000 * mul, previous: preset === 'partial' ? undefined : 585000 * mul },
            ],
    },

    kpiInverse: {
      title: lbl('Taux d’attrition & impayés', 'Churn & Unpaid Rate', 'معدل التسرب والمتأخرات'),
      subtitle: lbl(
        'Indicateur inversé : une baisse indique une amélioration',
        'Inverse KPI: downward delta signals improvement',
        'مؤشر عكسي: الانخفاض يعني تحسناً'
      ),
      helpText: lbl(
        'Mesure la part des abonnements ou dossiers expirés sans renouvellement à 14 jours.',
        'Tracks expired memberships or files not renewed within 14 days.',
        'يقيس نسبة الاشتراكات المنتهية دون تجديد خلال 14 يوماً.'
      ),
      value: preset === 'zeros' ? 0 : preset === 'extreme' ? 18.4 : 4.2,
      deltaPercent: preset === 'zeros' ? 0 : preset === 'extreme' ? 6.5 : -2.1,
      series:
        preset === 'zeros'
          ? [{ label: 'M1', value: 0 }]
          : [
              { label: 'S1', value: 6.8 },
              { label: 'S2', value: 6.1 },
              { label: 'S3', value: 5.4 },
              { label: 'S4', value: 4.9 },
              { label: 'S5', value: preset === 'extreme' ? 18.4 : 4.2 },
            ],
    },

    stackedBar: {
      title: lbl('Flux d’encaissements par canal', 'Collections by Channel', 'التحصيلات حسب القناة'),
      subtitle: lbl(
        'Ventilation quotidienne et avoirs/annulations sous ligne zéro',
        'Daily breakdown with refunds hatched below zero baseline',
        'التوزيع اليومي مع المرتجعات أسفل خط الصفر'
      ),
      helpText: lbl(
        'Cliquez sur une série de la légende pour la masquer ou l’afficher.',
        'Click any legend item to toggle its series visibility.',
        'انقر على أي عنصر في المفتاح لإخفائه أو إظهاره.'
      ),
      series: [
        { id: 'subs', label: lbl('Forfaits', 'Plans', 'الاشتراكات') },
        { id: 'pos', label: lbl('Boutique / Extras', 'Shop / Add-ons', 'المتجر') },
        { id: 'corp', label: lbl('Entreprises', 'Corporate', 'الشركات') },
      ],
      periods: [
        {
          id: '7d',
          label: lbl('7 jours', '7 days', '7 أيام'),
          buckets: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, idx) => ({
            label: d,
            values: {
              subs: preset === 'zeros' ? 0 : (120000 + idx * 18000) * mul,
              pos: preset === 'zeros' ? 0 : (45000 + (idx % 3) * 14000) * mul,
              corp: preset === 'zeros' ? 0 : (32000 + idx * 9000) * mul,
            },
            cancelled:
              preset === 'partial' || preset === 'zeros'
                ? undefined
                : (idx % 2 === 0 ? 18000 : 8500) * mul,
          })),
        },
        {
          id: '4w',
          label: lbl('4 sem.', '4 wks', '4 أسابيع'),
          buckets: ['S-3', 'S-2', 'S-1', 'Cour.'].map((d, idx) => ({
            label: d,
            values: {
              subs: preset === 'zeros' ? 0 : (780000 + idx * 65000) * mul,
              pos: preset === 'zeros' ? 0 : (240000 + idx * 22000) * mul,
              corp: preset === 'zeros' ? 0 : (195000 + idx * 35000) * mul,
            },
            cancelled: preset === 'partial' || preset === 'zeros' ? undefined : 42000 * mul,
          })),
        },
      ],
    },

    donut: {
      title: lbl('Répartition du portefeuille', 'Portfolio Mix', 'توزيع المحفظة'),
      subtitle: lbl(
        'Part des revenus par offre active sur la période',
        'Share of revenue across active plans and services',
        'حصة الإيرادات حسب الباقات النشطة'
      ),
      segments:
        preset === 'zeros'
          ? [{ id: 'only', label: lbl('Offre unique', 'Single Plan', 'عرض وحيد'), value: 100 }]
          : [
              { id: 'pro', label: lbl('Accès Annuel Premium', 'Annual Premium', 'اشتراك سنوي') + longSuffix, value: 1480000 * mul },
              { id: 'qtr', label: lbl('Trimestriel Pro', 'Quarterly Pro', 'اشتراك فصلي'), value: 890000 * mul },
              { id: 'coach', label: lbl('Coaching Individuel', 'Private Coaching', 'تدريب خاص'), value: 520000 * mul },
              { id: 'day', label: lbl('Pass Séance', 'Day Passes', 'تذاكر يومية'), value: 310000 * mul },
              { id: 'shop', label: lbl('Produits & Packs', 'Retail Packs', 'المنتجات'), value: 195000 * mul },
            ],
    },

    areaTrend: {
      title: lbl('Courbe de tendance comparée', 'Comparative Trend Curve', 'منحنى الاتجاه المقارن'),
      subtitle: lbl(
        'Évolution lissée vs période précédente avec moyenne et pic',
        'Smoothed trend vs prior period with average & peak callouts',
        'الاتجاه الممهد مقارنة بالفترة السابقة مع المتوسط والذروة'
      ),
      ranges: [
        {
          id: '12m',
          label: lbl('6 mois', '6 mo', '6 أشهر'),
          points: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'].map((m, idx) => ({
            label: m,
            value: preset === 'zeros' ? 0 : (380000 + idx * 75000 + (idx % 2) * 55000) * mul,
            previous:
              preset === 'partial' || preset === 'zeros'
                ? undefined
                : (340000 + idx * 52000) * mul,
          })),
        },
        {
          id: '30d',
          label: '10j',
          points: Array.from({ length: 10 }).map((_, idx) => ({
            label: `J${idx + 1}`,
            value: preset === 'zeros' ? 0 : (82000 + Math.sin(idx) * 28000 + idx * 6000) * mul,
            previous:
              preset === 'partial' || preset === 'zeros'
                ? undefined
                : (74000 + idx * 4500) * mul,
          })),
        },
      ],
    },

    radialGauge: {
      title: lbl('Taux d’atteinte opérationnelle', 'Operational Target Attainment', 'نسبة تحقيق الأهداف'),
      subtitle: lbl(
        'Jauge multi-indicateurs sur 270° avec repère d’objectif',
        '270° multi-metric gauge with target marker',
        'مؤشر قياس دائري بزاوية 270 درجة'
      ),
      metrics: [
        {
          id: 'occ',
          label: lbl('Occupation', 'Occupancy', 'الإشغال'),
          value: preset === 'zeros' ? 0 : preset === 'extreme' ? 100 : 78,
          target: preset === 'partial' ? undefined : 85,
          delta: preset === 'partial' ? undefined : 6.4,
        },
        {
          id: 'sla',
          label: lbl('Ponctualité', 'On-Time SLA', 'الالتزام'),
          value: preset === 'zeros' ? 0 : 91,
          target: preset === 'partial' ? undefined : 90,
          delta: preset === 'partial' ? undefined : 3.2,
        },
      ],
    },

    heatmap: {
      title: lbl('Charge horaire hebdomadaire', 'Weekly Hourly Load', 'توزيع النشاط الأسبوعي'),
      subtitle: lbl(
        'Intensité par jour et créneau horaire (navigation clavier 2D)',
        'Traffic intensity across days and time slots',
        'كثافة الحضور حسب الأيام والساعات'
      ),
      rows: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      cols: ['08h', '10h', '12h', '14h', '16h', '18h', '20h'],
      cells: [
        [14, 28, 34, 22, 46, 68, 52],
        [18, 31, 41, 25, 52, 74, 58],
        [16, 26, 38, 29, 48, 71, 55],
        [20, 35, 44, 31, 59, 82, 64],
        [12, 19, 24, 36, 54, 62, 40],
        [32, 58, 66, 48, 63, 72, 46],
        [24, 42, 49, 35, 41, 38, 22],
      ].map((r) => r.map((v) => (preset === 'zeros' ? 0 : v * (preset === 'extreme' ? 1200 : 1)))),
    },

    radar: {
      title: lbl('Équilibre opérationnel 360°', 'Operational Balance Radar', 'توازن الأداء التشغيلي'),
      subtitle: lbl(
        'Performance du site comparée à la référence secteur',
        'Site performance vs optional sector benchmark',
        'أداء الوحدة مقارنة بالمعيار المرجعي'
      ),
      axes: [
        { id: 'qual', label: lbl('Qualité', 'Quality', 'الجودة'), value: 86, benchmark: preset === 'partial' ? undefined : 78 },
        { id: 'deliv', label: lbl('Délais', 'Lead Time', 'الآجال'), value: 74, benchmark: preset === 'partial' ? undefined : 80 },
        { id: 'yield', label: lbl('Rendement', 'Yield', 'المردودية'), value: 91, benchmark: preset === 'partial' ? undefined : 82 },
        { id: 'ret', label: lbl('Fidélité', 'Retention', 'الولاء'), value: 79, benchmark: preset === 'partial' ? undefined : 72 },
        { id: 'margin', label: lbl('Marge', 'Margin', 'الهامش'), value: 83, benchmark: preset === 'partial' ? undefined : 75 },
      ],
    },

    ranked: {
      title: lbl('Classement des pôles & équipes', 'Team & Pole Ranking', 'ترتيب الفرق والأقطاب'),
      subtitle: lbl(
        'Basculez le critère pour réordonner en douceur sans recalcul de mise en page',
        'Switch criteria for smooth GPU rank reordering',
        'بدّل المعيار لإعادة الترتيب بسلاسة'
      ),
      criteria: [
        { id: 'rev', label: lbl('Revenus', 'Revenue', 'الإيراد'), format: 'currency' as const, currency: 'DZD' },
        { id: 'vol', label: lbl('Dossiers', 'Cases', 'الملفات'), format: 'number' as const },
      ],
      items: (
        preset === 'extreme'
          ? Array.from({ length: 18 }).map((_, i) => ({
              id: `rk-${i}`,
              label: `Équipe Opérationnelle Pôle #${i + 1}${longSuffix}`,
              values: { rev: (2400000 - i * 95000) * 180, vol: 420 - i * 19 },
            }))
          : [
              { id: 'k1', label: 'Amira Cherif', values: { rev: 940000, vol: 112 } },
              { id: 'k2', label: 'Karim Mansouri', values: { rev: 815000, vol: 148 } },
              { id: 'k3', label: 'Sara Bouzid', values: { rev: 760000, vol: 98 } },
              { id: 'k4', label: 'Yacine Belkacem', values: { rev: 620000, vol: 134 } },
              { id: 'k5', label: 'Lina Haddad', values: { rev: 510000, vol: 89 } },
            ]
      ),
    },

    waffle: {
      title: lbl('Capacité mobilisée', 'Utilized Capacity', 'القدرة المستغلة'),
      subtitle: lbl(
        'Grille 100 unités (r=7,5) avec projection interactive au survol',
        '100-dot grid with interactive projection preview',
        'شبكة 100 نقطة مع معاينة تفاعلية'
      ),
      occupied: preset === 'zeros' ? 0 : 73,
      capacity: 100,
    },

    timeline: {
      title: lbl('Planning des ressources (08h–18h)', 'Resource Schedule (08–18h)', 'جدول الموارد اليومي'),
      subtitle: lbl(
        'Occupation horaire des postes et repère temps réel',
        'Hourly allocation lanes with optional live time hairline',
        'إشغال القاعات والمحطات بالساعة'
      ),
      startHour: 8,
      endHour: 18,
      nowHour: preset === 'partial' ? undefined : 13.5,
      resources: [
        { id: 'r1', label: lbl('Salle A / Poste 1', 'Room A / Bay 1', 'قاعة أ') },
        { id: 'r2', label: lbl('Salle B / Poste 2', 'Room B / Bay 2', 'قاعة ب') },
        { id: 'r3', label: lbl('Studio C / Poste 3', 'Studio C / Bay 3', 'استوديو ج') },
        { id: 'r4', label: lbl('Cabine VIP', 'VIP Suite', 'جناح خاص') },
      ],
      blocks: [
        { id: 'b1', resourceId: 'r1', label: 'Audit S1', startHour: 8.5, endHour: 11, tone: 'primary' as const },
        { id: 'b2', resourceId: 'r1', label: 'Livraison', startHour: 13, endHour: 16.5, tone: 'neutral' as const },
        { id: 'b3', resourceId: 'r2', label: 'Atelier Collectif', startHour: 9.5, endHour: 12.5, tone: 'secondary' as const },
        { id: 'b4', resourceId: 'r2', label: 'Maintenance', startHour: 14, endHour: 17, tone: 'primary' as const },
        { id: 'b5', resourceId: 'r3', label: 'Session Pro', startHour: 10, endHour: 14, tone: 'primary' as const },
        { id: 'b6', resourceId: 'r4', label: 'Client Privé', startHour: 11.5, endHour: 15.5, tone: 'secondary' as const },
      ],
    },

    funnel: {
      title: lbl('Entonnoir de transformation', 'Conversion Funnel', 'قمع التحويل'),
      subtitle: lbl(
        'Rétention étape par étape entre prospection et encaissement',
        'Step-by-step retention from inquiry to cleared revenue',
        'معدل التحويل عبر كل مرحلة'
      ),
      stages: [
        { id: 'f1', label: lbl('Demandes entrantes', 'Leads', 'الطلبات الواردة'), value: preset === 'zeros' ? 0 : 1240 * (preset === 'extreme' ? 100 : 1) },
        { id: 'f2', label: lbl('Devis / Essais', 'Trials / Quotes', 'التجارب والعروض'), value: preset === 'zeros' ? 0 : 810 * (preset === 'extreme' ? 100 : 1) },
        { id: 'f3', label: lbl('Validés', 'Qualified', 'المؤكدة'), value: preset === 'zeros' ? 0 : 495 * (preset === 'extreme' ? 100 : 1) },
        { id: 'f4', label: lbl('Convertis payés', 'Paid Conversions', 'المدفوعة'), value: preset === 'zeros' ? 0 : 348 * (preset === 'extreme' ? 100 : 1) },
      ],
    },

    waterfall: {
      title: lbl('Pont Revenus → Résultat Net', 'Revenue to Net Bridge', 'جسر الإيرادات إلى صافي الربح'),
      subtitle: lbl(
        'Décomposition en cascade des charges et produits exceptionnels',
        'Cumulative waterfall across costs, adjustments and net margin',
        'التدفق التراكمي للتكاليف والهامش الصافي'
      ),
      steps:
        preset === 'extreme'
          ? [
              { id: 'w1', label: lbl('Chiffre brut', 'Gross Sales', 'إجمالي المبيعات'), value: 420_000_000, kind: 'total' as const },
              { id: 'w2', label: lbl('Achats', 'COGS', 'المشتريات'), value: -295_000_000, kind: 'delta' as const },
              { id: 'w3', label: lbl('Masse sal.', 'Payroll', 'الأجور'), value: -148_000_000, kind: 'delta' as const },
              { id: 'w4', label: lbl('Subvention', 'Rebate', 'استرداد'), value: 18_500_000, kind: 'delta' as const },
              { id: 'w5', label: lbl('Résultat net', 'Net', 'الصافي'), value: 0, kind: 'total' as const },
            ]
          : [
              { id: 'w1', label: lbl('CA Brut', 'Gross Rev.', 'الإيراد الخام'), value: 4_850_000, kind: 'total' as const },
              { id: 'w2', label: lbl('Achats', 'Purchases', 'المشتريات'), value: -1_920_000, kind: 'delta' as const },
              { id: 'w3', label: lbl('Salaires', 'Payroll', 'الرواتب'), value: -1_150_000, kind: 'delta' as const },
              { id: 'w4', label: lbl('Extras', 'Add-ons', 'إضافات'), value: 380_000, kind: 'delta' as const },
              { id: 'w5', label: lbl('Charges', 'OpEx', 'المصاريف'), value: -490_000, kind: 'delta' as const },
              { id: 'w6', label: lbl('Net', 'Net', 'الصافي'), value: 0, kind: 'total' as const },
            ],
    },

    cohort: {
      title: lbl('Rétention des cohortes', 'Cohort Retention Matrix', 'مصفوفة الاحتفاظ بالعملاء'),
      subtitle: lbl(
        'Part des comptes encore actifs mois après mois (M0 → M5)',
        'Share of accounts remaining active by join month',
        'نسبة الحسابات النشطة شهراً بعد شهر'
      ),
      cohorts: [
        { label: 'Jan', values: [100, 88, 79, 72, 68, 65] },
        { label: 'Fév', values: [100, 91, 82, 76, 71] },
        { label: 'Mar', values: [100, 86, 78, 74] },
        { label: 'Avr', values: [100, 93, 85] },
        { label: 'Mai', values: [100, 90] },
      ],
    },

    bubble: {
      title: lbl('Fréquence × Panier × Volume', 'Frequency × Basket × Volume', 'التكرار × السلة × الحجم'),
      subtitle: lbl(
        'Segmentation comportementale par catégorie client',
        'Behavioral segment scatter with revenue-encoded radius',
        'توزيع الشرائح حسب التكرار وقيمة السلة'
      ),
      groups: [
        { id: 'vip', label: 'Premium' },
        { id: 'reg', label: lbl('Réguliers', 'Regular', 'منتظم') },
        { id: 'new', label: lbl('Nouveaux', 'New', 'جدد') },
      ],
      points: [
        { id: 'p1', label: 'B2B Alger', groupId: 'vip', x: 18, y: 185000, size: 3_200_000 },
        { id: 'p2', label: 'Oran Centre', groupId: 'vip', x: 15, y: 152000, size: 2_450_000 },
        { id: 'p3', label: 'Abonnés Pro', groupId: 'reg', x: 12, y: 84000, size: 1_540_000 },
        { id: 'p4', label: 'Fidèles Sétif', groupId: 'reg', x: 9, y: 92000, size: 1_120_000 },
        { id: 'p5', label: 'Packs Découv.', groupId: 'new', x: 4, y: 41000, size: 420_000 },
        { id: 'p6', label: 'Web Direct', groupId: 'new', x: 6, y: 58000, size: 680_000 },
      ],
    },

    bullet: {
      title: lbl('Réalisé vs Objectif par pôle', 'Actual vs Target Bullet', 'المحقق مقابل الهدف'),
      subtitle: lbl(
        'Zone neutre à 80%, repère vertical cible et badge d’atteinte',
        '80% zone track, optional target marker and achievement pill',
        'منطقة 80٪ مع علامة الهدف وشارة التحقيق'
      ),
      items: [
        { id: 'bl1', label: lbl('Abonnements', 'Memberships', 'الاشتراكات') + longSuffix, value: 1_940_000 * mul, target: preset === 'partial' ? undefined : 1_800_000 * mul },
        { id: 'bl2', label: lbl('Prestations', 'Services', 'الخدمات'), value: 1_120_000 * mul, target: preset === 'partial' ? undefined : 1_350_000 * mul },
        { id: 'bl3', label: lbl('Ventes B2B', 'Wholesale', 'مبيعات الجملة'), value: 2_450_000 * mul, target: preset === 'partial' ? undefined : 2_100_000 * mul },
        { id: 'bl4', label: lbl('Boutique', 'Retail', 'المتجر'), value: 640_000 * mul, target: preset === 'partial' ? undefined : 640_000 * mul },
      ],
    },

    treemap: {
      title: lbl('Treemap squarifié des revenus', 'Squarified Revenue Treemap', 'خريطة شجرية للإيرادات'),
      subtitle: lbl(
        'Subdivision proportionnelle (ratio d’or φ=1,618) et masquage progressif',
        'Golden-ratio squarified tiles with progressive labels',
        'تقسيم تناسبي بنسبة ذهبية'
      ),
      items: [
        { id: 't1', label: lbl('Gros & Distribution', 'Wholesale', 'الجملة') + longSuffix, value: 4_200_000 * (preset === 'extreme' ? 85 : 1) },
        { id: 't2', label: lbl('Contrats Annuels', 'Annual Plans', 'العقود السنوية'), value: 2_650_000 },
        { id: 't3', label: lbl('Maintenance', 'Maintenance', 'الصيانة'), value: 1_480_000 },
        { id: 't4', label: lbl('Pièces & Stock', 'Parts & Stock', 'قطع الغيار'), value: 920_000 },
        { id: 't5', label: lbl('Formation', 'Training', 'التكوين'), value: 540_000 },
        { id: 't6', label: lbl('Divers', 'Misc', 'متفرقات'), value: 210_000 },
      ],
    },

    histogram: {
      title: lbl('Distribution des montants (panier)', 'Ticket Size Distribution', 'توزيع قيمة الفواتير'),
      subtitle: lbl(
        'Histogramme des tranches avec mise en avant automatique de la médiane',
        'Frequency histogram highlighting the cumulative median bin',
        'مدرج تكراري يبرز الفئة الوسيطة تلقائياً'
      ),
      bins: [
        { id: 'h1', label: '< 2k', value: 42 },
        { id: 'h2', label: '2–5k', value: 118 },
        { id: 'h3', label: '5–10k', value: 184 },
        { id: 'h4', label: '10–20k', value: 136 },
        { id: 'h5', label: '20–50k', value: 64 },
        { id: 'h6', label: '50k+', value: 21 },
      ],
    },

    dumbbell: {
      title: lbl('Évolution N-1 → N par segment', 'Period-over-Period Dumbbell', 'المقارنة بين الفترتين'),
      subtitle: lbl(
        'Anneau creux (période précédente) vers point plein (période actuelle)',
        'Hollow prior ring to filled current dot with semantic delta badge',
        'من الدائرة الفارغة إلى النقطة الممتلئة مع فارق الأداء'
      ),
      items: [
        { id: 'db1', label: lbl('Alger Centre', 'Algiers Hub', 'الجزائر الوسطى') + longSuffix, prev: 1_120_000 * mul, value: 1_490_000 * mul },
        { id: 'db2', label: lbl('Oran Ouest', 'Oran West', 'وهران غرب'), prev: 980_000 * mul, value: 860_000 * mul },
        { id: 'db3', label: lbl('Constantine', 'Constantine', 'قسنطينة'), prev: 710_000 * mul, value: 940_000 * mul },
        { id: 'db4', label: lbl('Sétif Pro', 'Setif Pro', 'سطيف'), prev: 540_000 * mul, value: 540_000 * mul },
      ],
    },
  };
}

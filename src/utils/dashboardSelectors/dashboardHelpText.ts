import type { SupportedLanguage } from '../../types/index';
import { pickText } from './common';

export interface TrilingualText {
  fr: string;
  en: string;
  ar: string;
}

export const DASHBOARD_HELP_TEXT = {
  membership: {
    revenue: {
      fr: 'Total des abonnements et ventes comptoir validés (hors annulations et avoirs). La courbe pointillée compare la période N-1.',
      en: 'Validated membership plans and counter sales (excluding voids/refunds). Dashed line compares the prior period.',
      ar: 'إجمالي الاشتراكات والمبيعات المؤكدة باستثناء الملغاة. الخط المتقطع يقارنها بالفترة السابقة.',
    },
    risk: {
      fr: 'Indicateur inversé : part des adhérents expirant sous 14 jours, expirés ou gelés. Une baisse traduit une meilleure rétention.',
      en: 'Inverse KPI: share of members expiring within 14 days, expired, or frozen. A downward shift signals stronger retention.',
      ar: 'مؤشر عكسي يقيس نسبة الاشتراكات القريبة من الانتهاء أو المنتهية أو المجمدة؛ انخفاضه يعني تحسّن الاحتفاظ بالأعضاء.',
    },
    mix: {
      fr: 'Ventile les encaissements entre forfaits/boutique et coaching privé. Cliquez sur une pastille de légende pour isoler un flux.',
      en: 'Splits collections between plans/shop and private coaching. Click legend pills to isolate either revenue stream.',
      ar: 'يوزع المداخيل بين الاشتراكات والتدريب الخاص. انقر على عناصر المفتاح لعزل كل تدفق.',
    },
    capacity: {
      fr: 'Grille à 100 points mesurant l’occupation du plateau selon les passages badgés. Survolez la grille pour simuler un palier.',
      en: '100-dot grid tracking floor occupancy from turnstile check-ins. Hover dots to preview utilization thresholds.',
      ar: 'شبكة من 100 نقطة تقيس إشغال القاعة حسب عمليات الدخول المسجلة. مرّر المؤشر لمعاينة مستويات الامتلاء.',
    },
    heatmap: {
      fr: 'Densité des passages scannés par jour et heure. Les cellules foncées indiquent l’affluence et le contour marque le pic.',
      en: 'Check-in density by weekday and hour. Darker cells show heavier floor traffic and the outline marks peak rush.',
      ar: 'كثافة الدخول حسب اليوم والساعة. الخلايا الداكنة تعكس الذروة والإطار يحدد أعلى ساعة إقبال.',
    },
    cohorts: {
      fr: 'Suit le maintien actif de chaque promotion mensuelle depuis son mois d’inscription (M0 = 100%) jusqu’à M+3.',
      en: 'Tracks active member retention for each monthly signup cohort from join month (M0 = 100%) through M+3.',
      ar: 'يتتبع استمرار كل دفعة شهرية منذ شهر التسجيل (M0 = 100%) عبر الأشهر اللاحقة.',
    },
    funnel: {
      fr: 'Mesure la conversion étape par étape des demandes entrantes vers les dossiers validés et adhérents actifs.',
      en: 'Measures step-by-step conversion from incoming leads through review and approval to active club members.',
      ar: 'يقيس معدل التحويل خطوة بخطوة من الطلبات الواردة والمراجعة إلى الأعضاء النشطين.',
    },
  },

  medical: {
    revenue: {
      fr: 'Honoraires des consultations non annulées sur la période. La courbe pointillée compare l’activité à la fenêtre précédente.',
      en: 'Consultation fees earned (excluding cancelled visits). Dashed sparkline compares the prior window.',
      ar: 'إجمالي رسوم الاستشارات غير الملغاة. الخط المتقطع يقارن الأداء بالفترة السابقة.',
    },
    queueWait: {
      fr: 'Indicateur inversé : patients actuellement en salle d’attente ou au triage infirmier. Moins d’attente accélère la prise en charge.',
      en: 'Inverse KPI: patients currently waiting or in nurse triage. A lower count speeds up clinical turnaround.',
      ar: 'مؤشر عكسي لعدد المرضى في قاعة الانتظار أو الفرز التمريضي؛ انخفاضه يعني تسريع وتيرة الفحص.',
    },
    queueLowStock: {
      fr: 'Indicateur inversé : consommables médicaux sous le seuil d’alerte. Réduire ce chiffre évite les ruptures en salle de soins.',
      en: 'Inverse KPI: clinical consumables at or below reorder threshold. Lowering this count prevents care supply shortages.',
      ar: 'مؤشر عكسي للمستلزمات الطبية التي بلغت حد التنبيه؛ خفضه يضمن عدم انقطاع المواد أثناء العلاج.',
    },
    heatmap: {
      fr: 'Concentration des consultations par jour et créneau horaire ; utile pour ajuster la permanence des praticiens.',
      en: 'Consultation density by weekday and hour; highlights rush periods to balance practitioner shifts.',
      ar: 'توزيع توافد المرضى حسب الأيام والساعات؛ يساعد على تنظيم مناوبات الأطباء خلال ساعات الذروة.',
    },
    radar: {
      fr: 'Compare 5 axes cliniques (clôture actes, CHIFA, labo validé, stock soins, assiduité RDV) au contour pointillé cible.',
      en: 'Compares 5 clinic pillars (exam completion, CHIFA claims, lab sign-off, stock readiness, show rate) against target contour.',
      ar: 'يقارن خمسة محاور طبية (إتمام الفحوص، ملفات الشفاء، المخبر، المستلزمات، الالتزام بالمواعيد) بالهدف المرجعي المتقطع.',
    },
    timeline: {
      fr: 'Créneaux horaires par praticien et cabinet avec fil rouge temps réel (en cabinet, terminé, prévu).',
      en: 'Hourly room blocks per practitioner with live time hairline (in room, completed, scheduled).',
      ar: 'توزيع المواعيد بالساعة لكل طبيب وقاعة مع مؤشر التوقيت الحالي وحالة كل كشف.',
    },
    donut: {
      fr: 'Volume des consultations ventilé par code acte NGAP ou spécialité. Survolez un secteur pour lire sa part exacte.',
      en: 'Consultation volume grouped by NGAP act code or specialty. Hover any slice to inspect exact share.',
      ar: 'حجم الفحوصات موزعاً حسب رمز العمل الطبي NGAP أو التخصص. مرّر المؤشر لعرض الحصة الدقيقة.',
    },
    funnel: {
      fr: 'Parcours complet du patient de l’accueil à l’examen médical, la clôture et l’encaissement des honoraires.',
      en: 'Patient care progression from arrival and waiting queue through consultation exam to completion and settlement.',
      ar: 'مسار المريض من الاستقبال والانتظار إلى الفحص الطبي ثم الإتمام وتحصيل الرسوم.',
    },
  },

  pos: {
    revenue: {
      fr: 'Recette nette caisse hors tickets annulés ou remboursés, avec panier moyen et comparaison à la période précédente.',
      en: 'Net register sales excluding voided/refunded tickets, paired with average basket vs prior period.',
      ar: 'صافي مداخيل الصندوق باستثناء الفواتير الملغاة، مع متوسط السلة والمقارنة بالفترة السابقة.',
    },
    stock: {
      fr: 'Indicateur inversé : références en rupture ou sous seuil de réapprovisionnement. Une baisse sécurise les ventes rayon.',
      en: 'Inverse KPI: catalog SKUs out of stock or below reorder point. A decrease keeps shelves ready to sell.',
      ar: 'مؤشر عكسي للمنتجات النافدة أو القريبة من النفاد؛ انخفاضه يضمن توفر البضاعة في المتجر.',
    },
    trend: {
      fr: 'Courbe lissée du chiffre d’affaires caisse (trait plein) face à la fenêtre N-1 (pointillés), avec moyenne et pic.',
      en: 'Smoothed register turnover curve (solid) vs prior period (dashed), marking period average and peak.',
      ar: 'منحنى مبيعات الصندوق (الخط المتصل) مقارنة بالفترة السابقة (المتقطع) مع إبراز المتوسط والذروة.',
    },
    waterfall: {
      fr: 'Décompose les ventes brutes en déduisant remises, coût d’achat des articles vendus (COGS) et TVA jusqu’à la marge nette.',
      en: 'Bridges gross register sales through discounts, COGS, and TVA taxes down to true net retail margin.',
      ar: 'يتتبع التدفق من إجمالي المبيعات مروراً بالتخفيضات وتكلفة الشراء والضرائب وصولاً إلى صافي هامش الربح.',
    },
    treemap: {
      fr: 'Surface proportionnelle au capital immobilisé par rayon (au coût d’achat ou au prix de vente).',
      en: 'Tile area shows inventory value per category, toggled between purchase cost basis and retail valuation.',
      ar: 'مساحة كل فئة تتناسب مع قيمة المخزون المحتجز فيها، مع إمكانية التبديل بين سعر التكلفة وسعر البيع.',
    },
    ranked: {
      fr: 'Classe les meilleurs articles par chiffre d’affaires ou unités vendues ; barres normalisées sur le 1er SKU.',
      en: 'Ranks top-moving SKUs by net revenue or unit volume, scaled relative to the #1 item.',
      ar: 'يرتب المنتجات الأكثر رواجاً حسب الإيراد أو عدد الوحدات المبيعة مقارنة بالمنتج المتصدر.',
    },
    heatmap: {
      fr: 'Intensité des passages en caisse par jour et heure. Le contour identifie le créneau de pointe pour planifier les caissiers.',
      en: 'Checkout ticket density across weekdays and hours; the outlined cell marks peak traffic for shift staffing.',
      ar: 'كثافة الفواتير حسب اليوم والساعة؛ الإطار يحدد وقت الذروة لتنظيم مناوبات الصندوق.',
    },
  },

  project: {
    budget: {
      fr: 'Plafond cumulé des contrats projets engagés sur la période, comparé à la fenêtre précédente.',
      en: 'Total committed contract budget across portfolio projects compared against the prior window.',
      ar: 'إجمالي الأسقف المالية للعقود المرتبطة بالمشاريع مقارنة بالفترة السابقة.',
    },
    approvals: {
      fr: 'Indicateur inversé : lots de paie talents et notes de frais terrain en attente de validation Direction.',
      en: 'Inverse KPI: talent payroll batches and field expense claims awaiting executive sign-off.',
      ar: 'مؤشر عكسي لدفعات الأجور ومصاريف الميدان التي تنتظر اعتماد الإدارة؛ تصفيره يسرّع التنفيذ.',
    },
    waterfall: {
      fr: 'Relie le montant des contrats engagés à la marge nette après déduction des paies talents (CCP) et frais terrain.',
      en: 'Bridges committed contract caps minus crew payroll batches and field expenses to net agency margin.',
      ar: 'يربط قيمة العقود بالهامش الصافي بعد خصم أجور الفرق الميدانية ومصاريف التنفيذ.',
    },
    gauges: {
      fr: 'Jauge 270° mesurant le respect des jalons livrés (cible 90%) et la marge nette globale (cible 35%) face au repère.',
      en: '270° gauge tracking milestone SLA attainment (90% target) and net portfolio margin (35% target).',
      ar: 'مؤشر دائري يقيس نسبة إنجاز المراحل (الهدف 90%) وصافي هامش المحفظة (الهدف 35%).',
    },
    bullets: {
      fr: 'Compare les dépenses engagées (paie + terrain) au plafond contrat de chaque projet ; le trait vertical marque 100% du budget.',
      en: 'Tracks actual payroll and field spend vs project budget cap; the vertical tick marks the contract ceiling.',
      ar: 'يقارن الإنفاق الفعلي (الأجور والميدان) بسقف كل مشروع؛ الخط العمودي يمثل الحد التعاقدي.',
    },
    funnel: {
      fr: 'Suit l’avancement du portefeuille du cadrage initial jusqu’à la créa/BAT, le déploiement terrain et la clôture.',
      en: 'Follows campaign progression from scoping to creative/print validation, active field ops, and final closure.',
      ar: 'يتتبع انتقال المشاريع من التأطير والتصميم إلى التنفيذ الميداني ثم الإغلاق النهائي.',
    },
    ranked: {
      fr: 'Classe les campagnes selon la marge brute cible (%) ou le plafond contrat (DZD) pour prioriser le suivi.',
      en: 'Ranks active projects by target gross margin (%) or contract cap (DZD) relative to the leading campaign.',
      ar: 'يرتب المشاريع حسب نسبة الهامش المستهدف أو سقف العقد لتحديد أولويات المتابعة.',
    },
  },

  agriculture: {
    harvest: {
      fr: 'Tonnage net pesé au pont-bascule (kg) sur la fenêtre active. La courbe pointillée suit la période précédente.',
      en: 'Net crop tonnage weighed at the farm weighbridge (kg) compared with the prior period dashed curve.',
      ar: 'الوزن الصافي للمحاصيل المسجل في جسر الوزن (كغ) مقارنة بالمنحنى المتقطع للفترة السابقة.',
    },
    darParcels: {
      fr: 'Indicateur inversé : parcelles bloquées par le délai avant récolte (DAR) après traitement phytosanitaire INPV.',
      en: 'Inverse KPI: parcels locked under pre-harvest interval (DAR) safety lockout after INPV crop treatment.',
      ar: 'مؤشر عكسي للقطع المحظورة مؤقتاً بسبب فترة ما قبل الحصاد (DAR) بعد المعالجة الفلاحية.',
    },
    darHerd: {
      fr: 'Indicateur inversé : vaches laitières en quarantaine sanitaire ou délai d’attente ; baisser ce nombre sécurise la collecte ONIL.',
      en: 'Inverse KPI: dairy cows currently under veterinary withholding lockout; lower counts protect conforming ONIL milk.',
      ar: 'مؤشر عكسي للأبقار الموضوعة في الحجر الصحي؛ انخفاضه يحافظ على سلامة وإنتاج الحليب المطابق.',
    },
    trend: {
      fr: 'Superpose les récoltes pesées (kg) et la collecte laitière conforme (L), ou isole chaque filière via le sélecteur.',
      en: 'Plots weighbridge crop output alongside conforming dairy milk liters, or isolates either stream via toggle.',
      ar: 'يعرض تطور الحصاد (كغ) مقارنة بجمع الحليب المطابق (لتر) مع إمكانية عزل كل نشاط.',
    },
    radar: {
      fr: 'Équilibre de l’exploitation sur 5 axes (réserve eau ANRH, DAR, santé cheptel, maturité cycles, paie pointage) vs cible.',
      en: '5-axis farm balance (ANRH water margin, DAR safety, herd health, crop progress, settled labor) vs target contour.',
      ar: 'يقيم توازن المزرعة عبر خمسة محاور (المياه، السلامة، القطيع، المحاصيل، الأجور) مقارنة بالهدف المرجعي.',
    },
    bullets: {
      fr: 'Volume d’irrigation consommé (m³) par parcelle face au quota annuel autorisé par l’ANRH (trait vertical).',
      en: 'Irrigation water drawn (m³) per parcel compared against the annual ANRH authorized quota tick.',
      ar: 'حجم المياه المستهلكة للري (م³) لكل قطعة مقارنة بالحصة السنوية المرخصة من ANRH.',
    },
    treemapSurface: {
      fr: 'Surface proportionnelle aux hectares cultivés par parcelle pour visualiser la répartition foncière.',
      en: 'Tile area represents cultivated hectares per parcel to visualize land allocation across crops.',
      ar: 'تتناسب مساحة كل مربع مع المساحة المزروعة بالهكتار لتوضيح توزيع الأراضي والمحاصيل.',
    },
    treemapWater: {
      fr: 'Surface proportionnelle au volume d’eau consommé (m³) afin de repérer immédiatement les parcelles les plus irrigantes.',
      en: 'Tile area reflects m³ water consumption per parcel to pinpoint irrigation-intensive crops immediately.',
      ar: 'تتناسب مساحة كل مربع مع استهلاك المياه (م³) لاكتشاف القطع الأكثر استهلاكاً للري بسرعة.',
    },
    dumbbell: {
      fr: 'Relie le rendement prévu (anneau creux) au rendement réel récolté (point plein) en quintaux par cycle cultural.',
      en: 'Connects projected yield (hollow ring) to realized harvest (filled dot) in quintals; green signals outperformance.',
      ar: 'يربط المردود المتوقع (الحلقة) بالمحقق فعلياً (النقطة) بالقنطار لكل دورة؛ الأخضر يدل على تجاوز الهدف.',
    },
  },

  appointment: {
    revenue: {
      fr: 'Additionne les prestations honorées au fauteuil et les ventes boutique (hors annulations et absences) vs N-1.',
      en: 'Combines completed chair services and retail sales (excluding cancelled/no-show) vs prior period.',
      ar: 'يجمع عائدات الخدمات المنجزة ومبيعات المتجر باستثناء الملغاة والغيابات مقارنة بالفترة السابقة.',
    },
    noshow: {
      fr: 'Indicateur inversé : part des rendez-vous manqués ou annulés. Sa diminution libère du temps facturable au fauteuil.',
      en: 'Inverse KPI: share of no-show and cancelled bookings. Lowering this recovers billable chair capacity.',
      ar: 'مؤشر عكسي لنسبة الغياب والإلغاء؛ انخفاضه يستعيد ساعات العمل القابلة للفوترة.',
    },
    mix: {
      fr: 'Compare chaque jour l’apport des soins au fauteuil et des ventes produits. Cliquez la légende pour filtrer.',
      en: 'Daily split between chair treatments and retail product checkout. Click legend items to toggle series.',
      ar: 'يوضح المساهمة اليومية للخدمات ومبيعات التجزئة. انقر على المفتاح لإخفاء أو إظهار أي سلسلة.',
    },
    donut: {
      fr: 'Part du chiffre d’affaires générée par catégorie de soin (coupe, coloration, esthétique). Survolez pour le détail.',
      en: 'Revenue share across service categories. Hover any slice or legend row to isolate its contribution.',
      ar: 'حصة الإيرادات حسب فئة الخدمة التجميلية. مرّر المؤشر على أي شريحة لمعرفة نسبتها.',
    },
    timeline: {
      fr: 'Planning horaire des rendez-vous par praticien avec repère de l’heure en cours et code couleur par statut.',
      en: 'Time-slotted stylist bookings with a live clock hairline and color-coded status (in chair, completed, booked).',
      ar: 'جدول المواعيد بالساعة لكل مصفف مع مؤشر التوقيت الحالي وتلوين حسب حالة الموعد.',
    },
    capacity: {
      fr: 'Indique la part des fauteuils et cabines actuellement occupés en salon ; survolez la grille pour simuler un taux cible.',
      en: 'Shows active chair and booth occupancy vs total workstations; hover the grid to preview occupancy tiers.',
      ar: 'يعرض نسبة الكراسي المشغولة حالياً مقارنة بإجمالي محطات العمل؛ مرّر المؤشر لمعاينة مستويات الإشغال.',
    },
    ranked: {
      fr: 'Classe les membres de l’équipe salon par chiffre d’affaires généré, volume de RDV ou pourboires encaissés.',
      en: 'Ranks stylists relative to the top performer across billed revenue, completed bookings, or tips.',
      ar: 'يرتب فريق الصالون مقارنة بالمتصدر حسب الإيرادات أو عدد المواعيد أو الإكراميات.',
    },
  },

  contractor: {
    dgp: {
      fr: 'Montant des situations de travaux (DGP) certifiées sur la période, comparé à la fenêtre N-1 (courbe pointillée).',
      en: 'Certified DGP progress billing over the period compared against the prior window dashed trend.',
      ar: 'إجمالي كشوف الأشغال المعتمدة (DGP) خلال الفترة مقارنة بالمنحنى المتقطع للفترة السابقة.',
    },
    retentionHeld: {
      fr: 'Indicateur inversé : cumul des retenues de garantie (5%) immobilisées dans l’attente des réceptions définitives.',
      en: 'Inverse KPI: cumulative 5% contractual retention held pending final site handover and defect clearance.',
      ar: 'مؤشر عكسي لاقتطاعات الضمان (5%) المحتجزة إلى غاية الاستلام النهائي للأشغال.',
    },
    retentionStops: {
      fr: 'Indicateur inversé : ordres de service d’arrêt (OS) non encore levés. Résorber ces arrêts évite les pénalités de retard.',
      en: 'Inverse KPI: active suspension Service Orders (OS) not yet cleared; reducing stops protects site deadlines.',
      ar: 'مؤشر عكسي لأوامر التوقف النشطة (OS)؛ تقليصها يسرّع وتيرة الإنجاز ويجنّب غرامات التأخير.',
    },
    waterfall: {
      fr: 'Part du DGP brut certifié puis déduit la retenue 5% et la sous-traitance pour dégager le net à mandater.',
      en: 'Bridges gross certified DGP billing minus 5% retention and subcontractor payouts to net payable.',
      ar: 'ينطلق من الكشف الإجمالي المعتمد ويخصم اقتطاع الضمان (5%) ومستحقات المناولين للوصول إلى الصافي للدفع.',
    },
    gauges: {
      fr: 'Jauge 270° vérifiant l’agrément béton laboratoire CTC et les jours sans arrêt HSE face à l’objectif 95%.',
      en: '270° compliance gauge tracking CTC concrete lab passes and incident-free HSE workdays vs 95% target.',
      ar: 'مؤشر دائري يقيس مطابقة اختبارات الخرسانة CTC وأيام العمل الآمنة HSE مقابل هدف 95%.',
    },
    bullets: {
      fr: 'Suit les montants exécutés par lot DQE face au budget prévu (trait vertical) ; la bande claire situe le palier 80%.',
      en: 'Compares executed BOQ/DQE lot value against planned budget tick; shaded track marks the 80% threshold.',
      ar: 'يقارن قيمة الأشغال المنجزة لكل حصة DQE بالميزانية المخططة (الخط العمودي) مع منطقة 80%.',
    },
    treemap: {
      fr: 'Surface proportionnelle au montant total du marché par chantier afin d’identifier les sites à plus fort enjeu financier.',
      en: 'Tile area mirrors each project contract cap so capital concentration across BTP sites is visible at a glance.',
      ar: 'مساحة كل ورشة تتناسب مع القيمة التعاقدية للصفقة لإبراز المشاريع ذات الثقل المالي الأكبر.',
    },
    dumbbell: {
      fr: 'Compare le délai contractuel écoulé (anneau creux) à l’avancement physique réel (point plein) ; corail signale un retard.',
      en: 'Compares elapsed contract time % (hollow ring) to physical site progress % (filled dot); coral flags schedule slip.',
      ar: 'يقارن المدة الزمنية المنقضية (الحلقة) بنسبة الإنجاز الميداني (النقطة)؛ اللون المرجاني ينبّه إلى التأخر.',
    },
  },

  education: {
    tuition: {
      fr: 'Frais d’inscription et mensualités encaissés sur la période (hors soldes restants dus affichés en sous-titre).',
      en: 'Tuition fees collected from enrollments over the window (with remaining overdue balance shown in subtitle).',
      ar: 'رسوم التسجيل والدراسة المحصلة خلال الفترة، مع توضيح الرصيد المتبقي في العنوان الفرعي.',
    },
    absence: {
      fr: 'Indicateur inversé : part des absences sur l’ensemble des appels effectués. Une baisse reflète une meilleure assiduité.',
      en: 'Inverse KPI: percentage of absent marks across recorded roll calls. Lower values reflect stronger attendance.',
      ar: 'مؤشر عكسي لنسبة الغيابات من إجمالي التحضير المسجل؛ انخفاضه يعكس التزاماً أعلى بالحضور.',
    },
    attendance: {
      fr: 'Empile les statuts Présent, Retard et Absent pour chaque promotion. Cliquez la légende pour isoler un statut.',
      en: 'Stacks Present, Late, and Absent counts per cohort. Click legend items to isolate tardiness or absences.',
      ar: 'يعرض أعداد الحضور والتأخر والغياب لكل فوج. انقر على المفتاح لعزل أي حالة.',
    },
    bullets: {
      fr: 'Nombre d’élèves inscrits face à la capacité maximale de la promotion (trait vertical) pour piloter les ouvertures.',
      en: 'Enrolled headcount against max seat capacity tick per cohort to guide admissions and class balancing.',
      ar: 'عدد الطلاب المسجلين مقارنة بالسعة القصوى لكل فوج (الخط العمودي) لتنظيم التسجيلات.',
    },
    grades: {
      fr: 'Répartit les évaluations ramenées sur 20 ; la barre corail identifie automatiquement la tranche contenant la note médiane.',
      en: 'Distributes normalized /20 scores into brackets; the coral bar highlights the cumulative 50% median band.',
      ar: 'يوزع النتائج الموحدة على 20؛ العمود البرتقالي يبرز تلقائياً الفئة التي تضم النقطة الوسيطة (50%).',
    },
    cohorts: {
      fr: 'Évolution hebdomadaire du taux de présence (%) par promotion sur les dernières semaines d’appel.',
      en: 'Weekly attendance percentage (%) per cohort over the latest weeks to spot early disengagement.',
      ar: 'تطور نسبة المواظبة الأسبوعية (%) لكل فوج خلال الأسابيع الأخيرة لاكتشاف التراجع مبكراً.',
    },
    funnel: {
      fr: 'Suit le parcours académique depuis les demandes d’admission et candidats admis jusqu’aux inscrits et diplômés.',
      en: 'Traces the learner funnel from admission inquiries and admitted applicants to active students and certificates.',
      ar: 'يتتبع المسار الأكاديمي من طلبات القبول والمقبولين إلى المسجلين النشطين ثم المتخرجين.',
    },
  },

  freelance: {
    revenue: {
      fr: 'Total des factures client réglées sur la période face aux dépenses engagées et à la période précédente.',
      en: 'Paid client invoices over the window vs prior period, alongside recorded studio expenses.',
      ar: 'إجمالي فواتير العملاء المدفوعة خلال الفترة مقارنة بالفترة السابقة وبالمصاريف المسجلة.',
    },
    unpaid: {
      fr: 'Indicateur inversé : montant cumulé des factures envoyées ou échues en attente de règlement client.',
      en: 'Inverse KPI: cumulative sent and overdue invoices awaiting client payment. Lower balance frees cashflow.',
      ar: 'مؤشر عكسي لإجمالي الفواتير المرسلة أو المتأخرة قيد الانتظار؛ خفضه يحسن السيولة النقدية.',
    },
    trend: {
      fr: 'Évolution lissée des honoraires encaissés (trait plein) comparée à la période N-1 (pointillés) avec moyenne et pic.',
      en: 'Smoothed cash inflow curve (solid) vs prior period (dashed), displaying average and peak milestones.',
      ar: 'تطور منحنى التحصيل النقدي (متصل) مقارنة بالفترة السابقة (متقطع) مع علامتي المتوسط والذروة.',
    },
    gauges: {
      fr: 'Jauge 270° mesurant le ratio d’heures facturables pointées (cible 75%) et le taux d’encaissement des factures (cible 90%).',
      en: '270° gauge measuring billable share of logged hours (75% target) and paid invoice ratio (90% target).',
      ar: 'مؤشر دائري يقيس نسبة الساعات القابلة للفوترة (الهدف 75%) ومعدل تحصيل الفواتير (الهدف 90%).',
    },
    dumbbell: {
      fr: 'Relie les heures devisées (anneau creux) aux heures réellement pointées (point plein) ; vert indique un respect du forfait.',
      en: 'Links estimated hours (hollow ring) to logged hours (filled dot); green confirms delivery within estimate.',
      ar: 'يربط الساعات المقدرة (الحلقة) بالساعات المسجلة فعلياً (النقطة)؛ الأخضر يعني الالتزام بالتقدير.',
    },
    donut: {
      fr: 'Part de facturation par client pour évaluer la diversification de votre portefeuille et le risque de dépendance.',
      en: 'Share of billed revenue per client to monitor portfolio diversification and single-client dependency.',
      ar: 'حصة الفوترة حسب كل عميل لتقييم تنوع المحفظة وتجنب الاعتماد على عميل واحد.',
    },
    funnel: {
      fr: 'Conversion commerciale des devis émis et acceptés vers les factures générées puis effectivement encaissées.',
      en: 'Commercial pipeline tracking proposals sent and accepted through invoices issued to cleared payments.',
      ar: 'مسار التحويل التجاري من عروض الأسعار المرسلة والمقبولة إلى الفواتير الصادرة ثم المدفوعة.',
    },
  },

  garage: {
    revenue: {
      fr: 'Total des factures atelier TTC émises pour les particuliers et flottes B2B vs période précédente.',
      en: 'Total workshop TTC invoices issued across retail vehicles and B2B fleets vs prior window.',
      ar: 'إجمالي فواتير الورشة الصادرة للأفراد وأساطيل الشركات مقارنة بالفترة السابقة.',
    },
    alertsBlocked: {
      fr: 'Indicateur inversé : ordres de réparation (OR) immobilisés en attente de pièces détachées. Moins de blocages libère les ponts.',
      en: 'Inverse KPI: repair orders stalled waiting on spare parts. Fewer blocked ORs speed up bay turnover.',
      ar: 'مؤشر عكسي لأوامر الإصلاح المتوقفة بانتظار قطع الغيار؛ تقليصها يسرّع إخلاء الجسور.',
    },
    alertsParts: {
      fr: 'Indicateur inversé : références de pièces sous seuil critique de stock ; réapprovisionner évite l’arrêt des OR.',
      en: 'Inverse KPI: spare part SKUs at or below minimum stock threshold; restocking prevents bay delays.',
      ar: 'مؤشر عكسي لقطع الغيار التي بلغت حد التنبيه؛ إعادة تموينها يمنع تعطل أوامر الإصلاح.',
    },
    waterfall: {
      fr: 'Additionne main-d’œuvre et pièces facturées puis déduit remises et prix d’achat des pièces pour révéler la marge atelier.',
      en: 'Combines labor and billed parts, then subtracts discounts and parts cost to isolate net workshop margin.',
      ar: 'يجمع اليد العاملة وقطع الغيار المفوترة ثم يخصم التخفيضات وتكلفة القطع لاستخراج صافي هامش الورشة.',
    },
    capacity: {
      fr: 'Taux d’occupation en direct des baies et ponts élévateurs ; survolez la grille pour simuler une saturation atelier.',
      en: 'Live utilization across service bays and hydraulic lifts; hover dots to preview workshop saturation levels.',
      ar: 'نسبة إشغال جسور الصيانة في الوقت الفعلي؛ مرّر المؤشر لمعاينة مستويات ضغط الورشة.',
    },
    timeline: {
      fr: 'Affectation horaire des véhicules par pont technique avec repère temps réel et statut (réparation, attente pièces, diag).',
      en: 'Hourly repair orders mapped across workshop bays with live clock line and status tone (repair, parts hold, diag).',
      ar: 'جدولة المركبات بالساعة على الجسور التقنية مع مؤشر الوقت الحالي وحالة كل أمر إصلاح.',
    },
    funnel: {
      fr: 'Fluidité de passage en atelier : réception véhicule, diagnostic, réparation sur pont et livraison client.',
      en: 'Shop throughput from vehicle intake and diagnostic through active bay repair to ready/delivered pickup.',
      ar: 'انسيابية العمل داخل الورشة من الاستقبال والتشخيص إلى الإصلاح ثم التسليم النهائي.',
    },
    ranked: {
      fr: 'Classe les mécaniciens et techniciens selon le montant facturé (DZD) ou le nombre d’OR pris en charge.',
      en: 'Ranks technicians against the top performer by billed repair revenue (DZD) or repair order count.',
      ar: 'يرتب الفنيين والميكانيكيين حسب قيمة الفوترة أو عدد أوامر الإصلاح المنجزة.',
    },
  },

  legal: {
    honoraires: {
      fr: 'Total net des honoraires, provisions et émoluments encaissés sur dossiers et actes notariés vs période N-1.',
      en: 'Net collected legal fees, retainers, and notary receipts vs prior period dashed benchmark.',
      ar: 'صافي الأتعاب والتسبيقات المحصلة من القضايا والعقود التوثيقية مقارنة بالفترة السابقة.',
    },
    deadlines: {
      fr: 'Indicateur inversé : délais procéduraux CPCA critiques, imminents ou forclos. Zéro alerte sécurise la conformité.',
      en: 'Inverse KPI: critical, approaching, or forfeited CPCA procedural deadlines. Keeping this low avoids lapse risk.',
      ar: 'مؤشر عكسي للآجال الإجرائية الحرجة أو الوشيكة (CPCA)؛ إبقاء الرقم منخفضاً يجنّب سقوط الحق.',
    },
    trend: {
      fr: 'Trajectoire des encaissements d’honoraires (courbe pleine) comparée à la période précédente (pointillés).',
      en: 'Smoothed fee collection curve (solid) vs prior period (dashed), marking period average and peak.',
      ar: 'منحنى تحصيل الأتعاب (متصل) مقارنة بالفترة السابقة (متقطع) مع إبراز المتوسط والذروة.',
    },
    bullets: {
      fr: 'Compare le solde CARPA disponible à la provision initiale déposée (trait vertical) pour garantir la couverture des débours.',
      en: 'Checks remaining CARPA escrow balance against initial deposited funds tick to ensure zero overdraft.',
      ar: 'يقارن الرصيد المتاح في حساب الضمان CARPA بالإيداع الأولي (الخط العمودي) لضمان تغطية المصاريف.',
    },
    funnel: {
      fr: 'Regroupe dossiers contentieux et actes notariés depuis l’ouverture/projet jusqu’au délibéré/minute et clôture.',
      en: 'Tracks combined matters and notary deeds from intake/draft through hearing/minute to closure and registry seal.',
      ar: 'يتتبع القضايا والعقود التوثيقية من الفتح والمسودة إلى الجلسة/التوقيع ثم الإغلاق والشهر.',
    },
    dumbbell: {
      fr: 'Relie la provision convenue (anneau creux) aux encaissements cumulés (point plein) pour détecter les restes dus.',
      en: 'Links agreed matter retainer (hollow ring) to cumulative paid receipts (filled dot) to highlight unpaid balances.',
      ar: 'يربط الأتعاب المتفق عليها (الحلقة) بالمبالغ المحصلة (النقطة) لرصد المستحقات المتبقية.',
    },
    ranked: {
      fr: 'Ventile la charge du cabinet par avocat en nombre de dossiers suivis ou en valeur des provisions engagées.',
      en: 'Ranks advocates by assigned matter count or total agreed retainer fees relative to the top caseload.',
      ar: 'يقيس عبء العمل حسب كل محامٍ بناءً على عدد القضايا أو قيمة الأتعاب المتفق عليها.',
    },
  },

  logistics: {
    cod: {
      fr: 'Montant COD collecté sur les colis livrés avec succès sur la période, comparé à la fenêtre précédente.',
      en: 'Cash-on-Delivery (COD) collected across successfully delivered parcels vs prior timeframe.',
      ar: 'إجمالي مبالغ الدفع عند الاستلام (COD) المحصلة من الطرود المسلمة مقارنة بالفترة السابقة.',
    },
    returns: {
      fr: 'Indicateur inversé : part des colis retournés ou reportés. Sa réduction abaisse les coûts de logistique inverse.',
      en: 'Inverse KPI: percentage of returned or postponed parcels. Lowering this reduces reverse-logistics cost.',
      ar: 'مؤشر عكسي لنسبة الطرود المرتجعة أو المؤجلة؛ خفضه يقلل تكاليف الإرجاع وإعادة التوجيه.',
    },
    stacked: {
      fr: 'Volume quotidien des colis livrés face aux retours/reports. Cliquez sur une pastille pour isoler une série.',
      en: 'Daily delivered vs returned/postponed parcel counts. Click legend pills to isolate delivery or return spikes.',
      ar: 'العدد اليومي للطرود المسلمة مقابل المرتجعة أو المؤجلة. انقر على المفتاح لعزل أي فئة.',
    },
    waterfall: {
      fr: 'Part du COD brut encaissé puis déduit frais de livraison, droit de timbre et écarts de décharge jusqu’au net marchands.',
      en: 'Bridges gross COD collected minus shipping fees, stamp duty, and driver cash gaps to net merchant payout.',
      ar: 'ينطلق من إجمالي تحصيل COD ويخصم رسوم الشحن والطابع وفروقات التفريغ لاستخراج صافي مستحقات التجار.',
    },
    weight: {
      fr: 'Répartition des expéditions par tranche de poids tarifaire (kg) ; la barre corail repère le palier médian (50%).',
      en: 'Groups shipments by tariff weight tier (kg); the coral bar highlights the cumulative 50% median bracket.',
      ar: 'يصنف الشحنات حسب شرائح الوزن التعريفية؛ العمود البرتقالي يبرز الشريحة الوسيطة التراكمية 50%.',
    },
    funnel: {
      fr: 'Suit l’acheminement depuis la réception hub et le tri/ensachage jusqu’à la tournée livreur et la remise COD.',
      en: 'Follows parcel transit from hub intake and sorting through courier dispatch to final COD delivery.',
      ar: 'يتتبع مسار الطرود من الاستلام والفرز في المحطة إلى جولة التوزيع ثم التسليم وتحصيل المبلغ.',
    },
    ranked: {
      fr: 'Classe les wilayas destinataires par montant COD livré ou volume de colis afin d’optimiser les lignes inter-hubs.',
      en: 'Ranks destination wilayas by delivered COD value or parcel count to optimize regional hub routing.',
      ar: 'يرتب الولايات المستلمة حسب قيمة COD أو عدد الطرود لتحسين خطوط النقل بين المحطات.',
    },
  },

  manufacturing: {
    produced: {
      fr: 'Quantité d’unités conformes produites sur les ordres de fabrication (OF), comparée à la fenêtre précédente.',
      en: 'Total conforming units produced across manufacturing orders vs prior period benchmark.',
      ar: 'إجمالي الوحدات المطابقة المصنعة ضمن أوامر التصنيع مقارنة بالفترة السابقة.',
    },
    scrap: {
      fr: 'Indicateur inversé : taux de rebut pondéré par volume produit. Une baisse préserve la matière première et le rendement.',
      en: 'Inverse KPI: volume-weighted scrap rate across batches. Reducing scrap preserves raw materials and margin.',
      ar: 'مؤشر عكسي لنسبة الهدر الموزونة بالإنتاج؛ خفضه يحافظ على المواد الأولية ويرفع المردودية.',
    },
    stacked: {
      fr: 'Compare pièces conformes et quantités rebutées pour chaque OF afin d’isoler les lots défectueux.',
      en: 'Stacks conforming output vs scrap count per manufacturing order (OF) to spot problematic runs.',
      ar: 'يعرض الإنتاج المطابق مقابل الهدر لكل أمر تصنيع لرصد الدفعات التي تشهد تلفاً مرتفعاً.',
    },
    gauges: {
      fr: 'Jauge 270° comparant le taux d’acceptation contrôle qualité QC (cible 95%) et le rendement net premier passage (cible 92%).',
      en: '270° gauge comparing QC inspection pass rate (95% target) and first-pass yield (92% target).',
      ar: 'مؤشر دائري يقارن نسبة اجتياز فحوصات الجودة QC (هدف 95%) والمردودية الصافية (هدف 92%).',
    },
    waterfall: {
      fr: 'Cumule coûts matières premières, main-d’œuvre directe et frais d’atelier pour obtenir le coût complet des OF.',
      en: 'Accumulates raw materials, direct labor, and plant overhead to reveal total manufacturing batch cost.',
      ar: 'يجمع تكلفة المواد الأولية واليد العاملة وأعباء الورشة لتحديد التكلفة الإجمالية لأوامر التصنيع.',
    },
    bullets: {
      fr: 'Quantités fabriquées face à la quantité commandée par OF (trait vertical) pour suivre les encours de production.',
      en: 'Produced units compared against each order target quantity tick; shaded zone marks 80% completion.',
      ar: 'الكميات المنتجة مقابل الكمية المستهدفة لكل أمر تصنيع (الخط العمودي) لمتابعة تقدم الإنتاج.',
    },
    radar: {
      fr: 'Équilibre usine sur 5 axes (rendement, QC, clôture OF, disponibilité MP, couverture BOM) face au contour cible.',
      en: '5-axis factory health (yield, QC, order completion, raw material stock, active BOM coverage) vs target.',
      ar: 'يقيم صحة المصنع عبر خمسة محاور (المردود، الجودة، إنجاز الأوامر، المواد الأولية، الوصفات) مقابل الهدف.',
    },
  },

  realestate: {
    collected: {
      fr: 'Total des quittances locatives et loyers encaissés sur la période, comparé à la fenêtre N-1 (pointillés).',
      en: 'Collected rental quittances over the period compared against the prior window dashed curve.',
      ar: 'إجمالي وصولات الإيجار المحصلة خلال الفترة مقارنة بالمنحنى المتقطع للفترة السابقة.',
    },
    arrearsDebt: {
      fr: 'Indicateur inversé : cumul des impayés locatifs sur les baux actifs. Réduire cet encours sécurise les flux propriétaires.',
      en: 'Inverse KPI: cumulative overdue rent across active leases. Lower arrears protect landlord cashflow.',
      ar: 'مؤشر عكسي لمتأخرات الإيجار على العقود السارية؛ تقليصه يحمي التدفق النقدي للملاك.',
    },
    arrearsMandates: {
      fr: 'Indicateur inversé : mandats de vente ou gestion expirés ou arrivant à échéance à renouveler rapidement.',
      en: 'Inverse KPI: expiring or expired brokerage mandates requiring renewal to keep listings active.',
      ar: 'مؤشر عكسي للتفويضات العقارية المنتهية أو القريبة من الانتهاء والتي تتطلب التجديد.',
    },
    bubble: {
      fr: 'Positionne les biens selon la surface m² (X), le prix (Y) et le nombre de pièces (rayon), filtrables Vente/Location.',
      en: 'Plots listings by area m² (X), price (Y), and room count (radius), separated by Sale vs Rental.',
      ar: 'يوزع العقارات حسب المساحة (أفقياً) والسعر (عمودياً) وعدد الغرف (الحجم) مع التمييز بين البيع والكراء.',
    },
    donut: {
      fr: 'Répartition du portefeuille immobilier par typologie (appartement, villa, local, terrain) avec filtre Vente/Location.',
      en: 'Portfolio breakdown by property type (apartment, villa, commercial, land), filterable by Sale or Rental.',
      ar: 'توزيع المحفظة العقارية حسب الصنف (شقة، فيلا، محل، أرض) مع إمكانية التصفية بين البيع والكراء.',
    },
    bullets: {
      fr: 'Compare les loyers effectivement encaissés au total théorique des baux actifs (trait vertical attendu 30J ou Année).',
      en: 'Compares collected rent receipts against expected active lease roll (30D or annual target tick).',
      ar: 'يقارن الإيجار المحصل فعلياً بالإجمالي المتوقع من العقود السارية (شهرياً أو سنوياً).',
    },
    dumbbell: {
      fr: 'Écart entre le prix plancher vendeur (anneau creux) et le prix demandé au mandat (point plein) ; indique la marge de négo.',
      en: 'Shows spread from seller minimum floor price (hollow ring) to asking price (filled dot) for negotiation margin.',
      ar: 'يوضح الفارق بين الحد الأدنى المقبول (الحلقة) والسعر المطلوب في التفويض (النقطة) لقياس هامش التفاوض.',
    },
    funnel: {
      fr: 'Suit le courtage des demandes acquéreurs et bons de visite signés jusqu’aux mandats actifs et baux/actes conclus.',
      en: 'Traces brokerage deals from buyer leads and signed site visits through active mandates to signed leases/sales.',
      ar: 'يتتبع الصفقات من طلبات المشترين ووصلات المعاينة إلى التفويضات النشطة ثم العقود المبرمة.',
    },
  },

  trading: {
    turnover: {
      fr: 'Chiffre d’affaires B2B net (factures et BL moins avoirs et retours) sur la période face à la fenêtre N-1.',
      en: 'Net B2B wholesale turnover (invoices/dispatches net of credit notes & returns) vs prior period.',
      ar: 'صافي رقم أعمال الجملة (الفواتير وسندات الشحن ناقص المرتجعات والإشعارات الدائنة) مقارنة بالفترة السابقة.',
    },
    receivables: {
      fr: 'Indicateur inversé : total des créances clients B2B ouvertes (ou comptes dépassant 75% de leur plafond crédit).',
      en: 'Inverse KPI: total wholesale receivables (or accounts exceeding 75% of credit cap). Lower exposure reduces risk.',
      ar: 'مؤشر عكسي لمستحقات العملاء الآجلة (أو الحسابات المتجاوزة 75% من سقف الائتمان)؛ خفضه يقلل المخاطر.',
    },
    flow: {
      fr: 'Met en regard les ventes B2B sortantes et les réceptions fournisseurs pour piloter la rotation des stocks.',
      en: 'Contrasts outbound B2B billing against inbound supplier purchases to balance inventory replenishment.',
      ar: 'يقارن فوترة المبيعات الصادرة بمشتريات التموين الواردة لضبط توازن المخزون والسيولة.',
    },
    waterfall: {
      fr: 'Enchaîne ventes HT, remises commerciales et achats/COGS pour afficher la marge nette de négoce dégagée.',
      en: 'Bridges B2B sales HT minus trade discounts and supplier purchase costs to reveal net trading margin.',
      ar: 'يربط المبيعات الصافية بالتخفيضات وتكلفة المشتريات لإظهار صافي هامش النشاط التجاري.',
    },
    bubble: {
      fr: 'Croise fréquence de commande (X), volume (Y) et encours client (rayon) ; alerte en corail dès 75% du plafond atteint.',
      en: 'Maps order frequency (X), volume (Y), and credit exposure (radius); coral marks accounts at >=75% credit cap.',
      ar: 'يربط عدد الطلبات وحجم المعاملات بمبلغ الائتمان (الحجم)؛ اللون المرجاني ينبّه لتجاوز 75% من السقف.',
    },
    treemap: {
      fr: 'Valorisation proportionnelle du capital stocké par entrepôt ou par produit pour repérer la concentration de valeur.',
      en: 'Proportional stock capital across warehouses or top SKUs to reveal where working capital sits.',
      ar: 'توزيع نسبي لقيمة المخزون حسب المستودعات أو المنتجات لتحديد أماكن تركز رأس المال.',
    },
    bullets: {
      fr: 'Encours actuel de chaque distributeur comparé à son plafond autorisé (trait vertical) avec seuil d’alerte à 80%.',
      en: 'Client outstanding balance compared to approved credit limit tick; 80% track highlights watch-list accounts.',
      ar: 'الرصيد المستحق على كل موزع مقارنة بالحد الائتماني المسموح (الخط العمودي) مع منطقة تحذير 80%.',
    },
  },

  venue: {
    revenue: {
      fr: 'Recette des réservations confirmées (hors annulations) sur la période ; le sous-titre indique les cautions détenues.',
      en: 'Revenue from active venue bookings (excluding cancellations) vs prior period, with held deposits noted.',
      ar: 'مداخيل الحجوزات النشطة باستثناء الملغاة مقارنة بالفترة السابقة، مع عرض الودائع المحتجزة.',
    },
    balance: {
      fr: 'Indicateur inversé : reliquats locatifs restant à encaisser avant remise des clés ou déjà échus.',
      en: 'Inverse KPI: outstanding booking balances due prior to check-in or already overdue. Lower balance prevents leakage.',
      ar: 'مؤشر عكسي للمبالغ المتبقية للتحصيل قبل تسليم المفاتيح أو المتأخرة؛ خفضه يضمن التحصيل الكامل.',
    },
    trend: {
      fr: 'Courbe lissée des revenus de location (trait plein) face à la période précédente (pointillés) avec moyenne et pic.',
      en: 'Smoothed venue rental revenue curve (solid) vs prior period (dashed), showing average and peak.',
      ar: 'منحنى عائدات التأجير (متصل) مقارنة بالفترة السابقة (متقطع) مع علامتي المتوسط والذروة.',
    },
    gauges: {
      fr: 'Jauge 270° suivant le taux d’occupation des espaces (cible 80%) et la part de contrats signés (cible 100%).',
      en: '270° gauge tracking live space occupancy (80% target) and signed contract compliance (100% target).',
      ar: 'مؤشر دائري يقيس نسبة إشغال المساحات (هدف 80%) ونسبة العقود الموقعة (هدف 100%).',
    },
    timeline: {
      fr: 'Occupation horaire des salles et postes cowork avec fil temps réel et statut (en cours, confirmé, option).',
      en: 'Hourly room and cowork allocation lanes with live time hairline (checked in, confirmed, pending).',
      ar: 'توزيع الحجوزات بالساعة على القاعات ومساحات العمل مع خط التوقيت الحالي وحالة كل حجز.',
    },
    capacity: {
      fr: 'Grille 100 points mesurant les unités actuellement occupées face au parc disponible (tous, cowork ou salles).',
      en: '100-dot grid showing occupied units vs available pool across all spaces, cowork desks, or rooms.',
      ar: 'شبكة 100 نقطة توضح الوحدات المشغولة مقابل المتاحة عبر كامل المساحات أو مكاتب العمل المشترك أو القاعات.',
    },
    donut: {
      fr: 'Part du chiffre d’affaires générée par catégorie d’espace (salle réunion, conférence, cowork) sur la fenêtre.',
      en: 'Revenue share split by space category (meeting rooms, halls, coworking desks). Hover slices for exact %.',
      ar: 'حصة الإيرادات حسب نوع المساحة (قاعات اجتماعات، مدرجات، مكاتب مشتركة). مرّر المؤشر لعرض النسبة.',
    },
  },
} as const satisfies Record<string, Record<string, TrilingualText>>;

export type DashboardCategoryHelpKey = keyof typeof DASHBOARD_HELP_TEXT;

export function getDashboardHelpText(
  category: DashboardCategoryHelpKey,
  cardKey: keyof (typeof DASHBOARD_HELP_TEXT)[typeof category] | string,
  language: SupportedLanguage
): string {
  const categoryMap = DASHBOARD_HELP_TEXT[category] as Record<string, TrilingualText>;
  const entry = categoryMap[String(cardKey)];
  if (!entry) return '';
  return pickText(language, entry.fr, entry.en, entry.ar);
}

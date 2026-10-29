import React, { useState, useMemo } from 'react';
import {
  Building2,
  Check,
  ChevronRight,
  ChevronLeft,
  Rocket,
  MapPin,
  Sparkles,
  Users,
  CheckCircle2,
  Search,
  KeyRound,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Calendar,
  Clock,
  Boxes,
  Receipt,
  FileText,
  CreditCard,
  Building,
  RotateCcw,
  Target,
  ArrowRight,
  Eye,
  Compass,
  Laptop,
  Utensils,
  Scissors,
  Dumbbell,
  Briefcase,
  Stethoscope,
  Truck,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { BusinessCategory, OnboardingParams } from '../../types/index';
import { validateVoucherCode } from '../../utils/rules';
import {
  CATEGORY_METADATA,
  FULL_16_VERTICAL_CATALOG,
  searchBusinessCatalog,
  CatalogBusinessTrade,
  OnboardingTeamScale,
} from '../../utils/businessMapping';
import {
  FeatureBlueprintModal,
  UniversalStrategicGoalId,
} from '../modals/FeatureBlueprintModal';
import { AtriumMonolith, FiveCubesLogo } from './AtriumMonolith';

interface PowerOnboardingScreenProps {
  onComplete: () => void;
  onSkipToDashboard: () => void;
}

const ALGERIA_WILAYAS = [
  '16 - Alger',
  '31 - Oran',
  '25 - Constantine',
  '09 - Blida',
  '15 - Tizi Ouzou',
  '19 - Sétif',
  '06 - Béjaïa',
  '13 - Tlemcen',
  '23 - Annaba',
  '05 - Batna',
  '35 - Boumerdès',
  '42 - Tipaza',
  '44 - Aïn Defla',
  '10 - Bouira',
  '14 - Tiaret',
  '17 - Djelfa',
  '26 - Médéa',
  '27 - Mostaganem',
  '28 - M\'Sila',
  '29 - Mascara',
  '30 - Ouargla',
  '34 - Bordj Bou Arréridj',
  '38 - Tissemsilt',
  '39 - El Oued',
  '40 - Khenchela',
  '41 - Souk Ahras',
  '43 - Mila',
  '47 - Ghardaïa',
  '48 - Relizane',
  'Autre / International',
];

const REFERRAL_SOURCES = [
  { id: 'instagram', labelFr: 'Instagram', labelAr: 'إنستغرام', labelEn: 'Instagram' },
  { id: 'tiktok', labelFr: 'TikTok', labelAr: 'تيك توك', labelEn: 'TikTok' },
  { id: 'linkedin', labelFr: 'LinkedIn', labelAr: 'لينكد إن', labelEn: 'LinkedIn' },
  { id: 'word_of_mouth', labelFr: 'Bouche-à-oreille', labelAr: 'توصية زميل / شريك', labelEn: 'Word of mouth' },
  { id: 'google_search', labelFr: 'Recherche Google', labelAr: 'بحث جوجل', labelEn: 'Google search' },
  { id: 'ai_assistant', labelFr: 'Assistant IA (Claude, GPT)', labelAr: 'مساعد ذكاء اصطناعي', labelEn: 'AI Assistant' },
  { id: 'youtube', labelFr: 'YouTube', labelAr: 'يوتيوب', labelEn: 'YouTube' },
  { id: 'facebook', labelFr: 'Facebook', labelAr: 'فيسبوك', labelEn: 'Facebook' },
  { id: 'news_press', labelFr: 'Presse & Médias DZ', labelAr: 'الصحافة والإعلام', labelEn: 'Press & Media' },
  { id: 'events', labelFr: 'Salons & Événements', labelAr: 'معارض وملتقيات', labelEn: 'Events & Expos' },
  { id: 'other', labelFr: 'Autre source', labelAr: 'مصدر آخر', labelEn: 'Other' },
];

export const PowerOnboardingScreen: React.FC<PowerOnboardingScreenProps> = ({
  onComplete,
}) => {
  const { completeOnboarding, language, setLanguage } = useAtriumStore();

  // Stage 1: Cinematic Intro Animation & Seamless Dissolve
  const [showIntroAnimation, setShowIntroAnimation] = useState(true);
  const [isIntroDissolving, setIsIntroDissolving] = useState(false);
  const [introReplayKey, setIntroReplayKey] = useState(0);

  const handleIntroCompleteOrSkip = () => {
    setIsIntroDissolving(true);
    setTimeout(() => {
      setShowIntroAnimation(false);
      setIsIntroDissolving(false);
    }, 600);
  };

  // Stage 2: 9 Conversational Question Cards (Indices 0 to 8)
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Step 0 State: Owner Account & Workspace Identity
  const [workspaceName, setWorkspaceName] = useState('Atlas Creative Studio');
  const [fullName, setFullName] = useState('Mehdi Samih');
  const [email, setEmail] = useState('mehdisamih79@gmail.com');
  const [phone, setPhone] = useState('+213 550 12 34 56');
  const [password, setPassword] = useState('Atrium2026!');
  const [selectedWilaya, setSelectedWilaya] = useState('16 - Alger');
  const [branchAddress] = useState('14 Boulevard Didouche Mourad, Alger');
  const [voucherCode, setVoucherCode] = useState('');
  const [showVoucherDrawer, setShowVoucherDrawer] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Step 1 State: Operational Challenge / Frustration
  const [primaryFrustration, setPrimaryFrustration] = useState<
    'scheduling' | 'inventory' | 'billing_creep' | 'postal_payments' | 'paper_records' | 'commercial_invoicing'
  >('billing_creep');

  // Step 2 State: Strategic Goal & Feature Blueprint Modal
  const [selectedGoalId, setSelectedGoalId] = useState<UniversalStrategicGoalId>('goal_billing_dzd');
  const [activeGoalModalId, setActiveGoalModalId] = useState<UniversalStrategicGoalId | null>(null);

  // Step 3 State: Daily Customer & Operational Interaction
  const [dailyWorkflow, setDailyWorkflow] = useState<
    'walkin_pos' | 'appointment_schedule' | 'membership_turnstile' | 'project_deliverables' | 'patient_queue' | 'wholesale_dispatch'
  >('project_deliverables');

  // Step 4 State: Team Scale & Working Hierarchy
  const [teamScale, setTeamScale] = useState<OnboardingTeamScale>('small');

  // Step 5 State: Primary Payment & Settlement Flow
  const [settlementStyle, setSettlementStyle] = useState<
    'pos_cash' | 'b2b_tva' | 'ccp_postal' | 'recurring_retainer'
  >('ccp_postal');

  // Step 6 State: Specific Business Domain & Catalog
  const [selectedTradeId, setSelectedTradeId] = useState<string>('agency_com');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [selectedCatalogCategoryFilter, setSelectedCatalogCategoryFilter] = useState<string>('all');

  // Step 7 State: Referral Source
  const [referralSource, setReferralSource] = useState<string>('linkedin');

  // Step 8 State: Category Recommendation & Manual Override
  const [manualCategoryOverride, setManualCategoryOverride] = useState<BusinessCategory | null>(null);
  const [isOverrideSelectorOpen, setIsOverrideSelectorOpen] = useState(false);

  // Auto-advancement transitions (Higgsfield single-selection UX: select & jump smoothly)
  const handleSelectFrustration = (id: typeof primaryFrustration) => {
    setPrimaryFrustration(id);
    setTimeout(() => {
      setCurrentStep(2);
    }, 220);
  };

  const handleOpenGoalModal = (goalId: UniversalStrategicGoalId) => {
    setSelectedGoalId(goalId);
    setActiveGoalModalId(goalId);
  };

  const handleConfirmGoalAndContinue = (goalId: UniversalStrategicGoalId) => {
    setSelectedGoalId(goalId);
    setActiveGoalModalId(null);
    setTimeout(() => {
      setCurrentStep(3);
    }, 150);
  };

  const handleSelectWorkflow = (id: typeof dailyWorkflow) => {
    setDailyWorkflow(id);
    setTimeout(() => {
      setCurrentStep(4);
    }, 220);
  };

  const handleSelectTeamScale = (id: typeof teamScale) => {
    setTeamScale(id);
    setTimeout(() => {
      setCurrentStep(5);
    }, 220);
  };

  const handleSelectSettlement = (id: typeof settlementStyle) => {
    setSettlementStyle(id);
    setTimeout(() => {
      setCurrentStep(6);
    }, 220);
  };

  const handleSelectTrade = (trade: CatalogBusinessTrade) => {
    setSelectedTradeId(trade.id);
    setTimeout(() => {
      setCurrentStep(7);
    }, 220);
  };

  const handleSelectReferral = (sourceId: string) => {
    setReferralSource(sourceId);
    setTimeout(() => {
      setCurrentStep(8);
    }, 220);
  };

  // Find currently selected trade in catalog
  const selectedTrade = useMemo(() => {
    return FULL_16_VERTICAL_CATALOG.find((t) => t.id === selectedTradeId) || null;
  }, [selectedTradeId]);

  // Filter catalog items
  const filteredCatalogTrades = useMemo(() => {
    let list = catalogSearchQuery.trim()
      ? searchBusinessCatalog(catalogSearchQuery.trim())
      : FULL_16_VERTICAL_CATALOG;

    if (selectedCatalogCategoryFilter !== 'all') {
      list = list.filter((t) => t.category === selectedCatalogCategoryFilter);
    }
    return list;
  }, [catalogSearchQuery, selectedCatalogCategoryFilter]);

  // Derive modules and recommended vertical from interview selections
  const { derivedCategory, matchConfidence } = useMemo(() => {
    if (selectedTrade) {
      return {
        derivedCategory: selectedTrade.category,
        matchConfidence: 99,
      };
    }

    let bestCategory: BusinessCategory = 'project_milestone';
    if (dailyWorkflow === 'walkin_pos') {
      bestCategory = 'pos_inventory';
    } else if (dailyWorkflow === 'appointment_schedule') {
      bestCategory = 'appointment_service';
    } else if (dailyWorkflow === 'membership_turnstile') {
      bestCategory = 'membership_session';
    } else if (dailyWorkflow === 'patient_queue') {
      bestCategory = 'medical_clinic';
    } else if (dailyWorkflow === 'wholesale_dispatch') {
      bestCategory = 'trading_commercial';
    } else if (dailyWorkflow === 'project_deliverables') {
      bestCategory = teamScale === 'solo' ? 'freelance_solo' : 'project_milestone';
    }

    return {
      derivedCategory: bestCategory,
      matchConfidence: 96,
    };
  }, [selectedTrade, dailyWorkflow, teamScale]);

  const activeCategory = manualCategoryOverride || derivedCategory;
  const activeCategoryMeta = CATEGORY_METADATA[activeCategory];

  // Voucher validation
  const voucherValidation = useMemo(() => {
    if (!voucherCode.trim()) return null;
    return validateVoucherCode(voucherCode.trim());
  }, [voucherCode]);

  // Final submission handler
  const handleLaunchWorkspace = () => {
    const finalBusinessName = workspaceName.trim() || 'Mon Entreprise Atrium';
    const finalBranchName = 'Siège Principal';

    const params: OnboardingParams = {
      fullName: fullName.trim(),
      email: email.trim(),
      password: password.trim(),
      phone: phone.trim(),
      businessName: finalBusinessName,
      category: activeCategory,
      branchName: finalBranchName,
      branchAddress: `${branchAddress.trim()} (${selectedWilaya})`,
      voucherCode: voucherValidation?.isValid ? voucherCode.trim() : undefined,
    };

    completeOnboarding(params);
    onComplete();
  };

  // Trilingual copy dictionaries
  const isAr = language === 'ar';
  const isFr = language === 'fr';



  // Question metadata
  const questionsMeta = [
    {
      title: isAr ? 'أنشئ مساحة عملك الخاصة' : isFr ? 'Configurez votre espace de travail' : 'Claim your workspace name',
      subtext: isAr
        ? 'أدخل اسم مؤسستك وبيانات المسؤول والمقر للبدء الفوري'
        : isFr
        ? 'Entrez le nom de votre établissement, vos identifiants et votre wilaya'
        : 'Enter your business title, admin credentials, and headquarters',
    },
    {
      title: isAr ? 'ما هو التحدي التشغيلي الأكبر لك؟' : isFr ? 'Quel défi opérationnel souhaitez-vous résoudre ?' : 'Which operational challenge do you want to solve?',
      subtext: isAr
        ? 'سنقوم بتخصيص لوحة القيادة والمؤشرات الحيوية وفقاً لأولوياتك'
        : isFr
        ? 'Nous adapterons les widgets et indicateurs de votre tableau de bord'
        : "We'll tailor your real-time widgets and radar to target your biggest bottlenecks",
    },
    {
      title: isAr ? 'ما الذي تريد تحقيقه مع أتريوم؟' : isFr ? 'Que souhaitez-vous accomplir avec Atrium ?' : 'What do you want to achieve with Atrium?',
      subtext: isAr
        ? 'انقر على أي خيار لمعاينة المخطط التشغيلي والآليات الحقيقية المفعّلة'
        : isFr
        ? 'Cliquez pour ouvrir le schéma directeur et voir comment nous le réalisons'
        : 'Click any goal to inspect the concrete feature blueprint and automation engine',
    },
    {
      title: isAr ? 'كيف يتعامل عملاؤك معك يومياً؟' : isFr ? 'Comment vos clients interagissent-ils au quotidien ?' : 'How do customers interact with you daily?',
      subtext: isAr
        ? 'يحدد هذا محطات الصندوق السريع، جداول الحجوزات أو بوابات العبور'
        : isFr
        ? 'Cela configure vos écrans de caisse tactile, plannings ou portails de livraison'
        : 'This determines your front-desk terminals, schedule columns, or delivery manifests',
    },
    {
      title: isAr ? 'ما هو حجم فريق العمل في مؤسستك؟' : isFr ? "Quelle est la taille de votre équipe ?" : 'How large is your operational team?',
      subtext: isAr
        ? 'سنقوم بضبط مصفوفة الصلاحيات، أدوار الموظفين وحدود الأجهزة'
        : isFr
        ? 'Nous configurerons les rôles (Compta, Terrain, Direction) et quotas de postes'
        : "We'll configure permission gates, role access, and terminal quotas",
    },
    {
      title: isAr ? 'كيف يتم تحصيل أموالك وتسوية المعاملات؟' : isFr ? 'Comment encaissez-vous vos recettes ?' : 'How do you collect revenue & settle balances?',
      subtext: isAr
        ? 'ستتوافق دفاتر الحسابات ونماذج الفواتير فوراً مع طريقتك'
        : isFr
        ? 'Vos journaux comptables et modèles de factures se synchroniseront automatiquement'
        : 'Your ledgers, invoice formats, and tax rules will align instantly',
    },
    {
      title: isAr ? 'ما هو مجال عملك بالتحديد؟' : isFr ? 'Quelle est votre activité précise ?' : 'What is your specific business trade?',
      subtext: isAr
        ? 'اختر من دليل المهن الشامل (160+ نشاط جزائري) أو ابحث بالاسم'
        : isFr
        ? 'Recherchez ou sélectionnez parmi 160+ métiers et verticaux réels'
        : 'Search or select your exact trade from our exhaustive 160+ business catalog',
    },
    {
      title: isAr ? 'كيف سمعت عن منصة أتريوم؟' : isFr ? 'Comment avez-vous entendu parler d’Atrium ?' : 'How did you hear about Atrium?',
      subtext: isAr
        ? 'يساعدنا هذا في تخصيص موارد الدعم وشركاء التكوين في ولايتك'
        : isFr
        ? 'Cette information nous aide à orienter nos ateliers et accompagnements locaux'
        : 'This helps us connect you with relevant local ecosystem guides and resources',
    },
    {
      title: isAr ? 'نظام أتريوم المخصص لمؤسستك جاهز' : isFr ? 'Votre environnement Atrium est prêt' : 'Your tailored Atrium system is ready',
      subtext: isAr
        ? 'تم تكوين وتفعيل كافة الوحدات المناسبة لنشاطك، يمكنك البدء بنقرة واحدة'
        : isFr
        ? 'Architecture opérationnelle calibrée selon vos réponses. Lancez votre espace en 1 clic'
        : 'Based on your answers, here is your bespoke vertical operating system',
    },
  ];

  return (
    <div
      className="h-screen max-h-screen w-screen overflow-hidden bg-[#0C0C0E] text-white flex flex-col justify-between selection:bg-[#C4785A] selection:text-white relative"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Seamless Dissolving Cinematic Intro Monolith Overlay */}
      {showIntroAnimation && (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-600 ease-out ${
            isIntroDissolving ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
        >
          <AtriumMonolith
            isIntroActive={true}
            replayKey={introReplayKey}
            onIntroComplete={handleIntroCompleteOrSkip}
            onSkip={handleIntroCompleteOrSkip}
          />
        </div>
      )}

      {/* Top Bar: Replay Intro Button & Minimal Language Switcher */}
      <header className="w-full max-w-7xl mx-auto px-6 py-2.5 sm:py-3 flex items-center justify-between z-30 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <FiveCubesLogo size={28} cubeColor="#C4785A" />
          <span className="font-bold tracking-tight text-sm text-neutral-200 uppercase font-sans">
            Atrium <span className="text-[#C4785A] font-medium text-xs">OS</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsIntroDissolving(false);
              setIntroReplayKey((k) => k + 1);
              setShowIntroAnimation(true);
            }}
            title={isAr ? 'إعادة مشاهدة العرض الحركي' : isFr ? "Revoir l'animation" : 'Replay Animation'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3 h-3 text-[#C4785A]" />
            <span className="hidden sm:inline">
              {isAr ? 'إعادة العرض' : isFr ? 'Rejouer intro' : 'Replay Intro'}
            </span>
          </button>

          {/* Tri-Lingual Language Switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 text-xs">
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                language === 'fr'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                language === 'ar'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                language === 'en'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Workstation Canvas (Fit to Viewport, Zero Document Scroll) */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2 flex-1 min-h-0 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center w-full max-h-full">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: THE FOCUSED SINGLE QUESTION CARD (HIGGSFIELD SPECIFICATION)  */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col justify-center max-w-xl mx-auto w-full py-1">
            
            {/* Top Micro-Dash Indicators (9 clickable dashes for 0 to 8) */}
            <div className="flex items-center gap-1.5 mb-3 sm:mb-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
                const isActive = currentStep === idx;
                const isCompleted = currentStep > idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    title={`Étape ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'w-7 sm:w-8 bg-[#C4785A] shadow-[0_0_10px_rgba(196,120,90,0.6)]'
                        : isCompleted
                        ? 'w-3.5 sm:w-4 bg-neutral-500 hover:bg-neutral-400'
                        : 'w-3.5 sm:w-4 bg-white/15 hover:bg-white/30'
                    }`}
                  />
                );
              })}
            </div>

            {/* Question Card Header (Compact, Responsive, No Multiline Sprawl) */}
            <div className="mb-3 sm:mb-4">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1 leading-snug">
                {questionsMeta[currentStep]?.title}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed line-clamp-1 sm:line-clamp-none">
                {questionsMeta[currentStep]?.subtext}
              </p>
            </div>

            {/* Active Question Content (Compact & Sized to Fit Screen) */}
            <div className="min-h-0 flex-1 flex flex-col justify-center">
              
              {/* ------------------------------------------------------------- */}
              {/* STEP 0: CLAIM WORKSPACE NAME & OWNER CREDENTIALS              */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 0 && (
                <div className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      {isAr ? 'اسم المؤسسة أو العلامة التجارية *' : isFr ? "Nom de l'entreprise ou marque *" : 'Business or Workspace Name *'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                        <Building2 className="w-4 h-4 text-[#C4785A]" />
                      </div>
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="Ex: Atlas Creative Studio, Clinique El Chifa..."
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#C4785A] focus:ring-1 focus:ring-[#C4785A] rounded-xl py-2 sm:py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-neutral-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                        {isAr ? 'اسم المسؤول *' : isFr ? 'Nom du responsable *' : 'Owner Name *'}
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#C4785A] rounded-xl py-2 px-3 text-xs sm:text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                        {isAr ? 'الولاية (المقر الرئيسي) *' : isFr ? 'Wilaya (Siège) *' : 'Wilaya / Location *'}
                      </label>
                      <select
                        value={selectedWilaya}
                        onChange={(e) => setSelectedWilaya(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#C4785A] rounded-xl py-2 px-3 text-xs sm:text-sm text-white outline-none cursor-pointer"
                      >
                        {ALGERIA_WILAYAS.map((w) => (
                          <option key={w} value={w} className="bg-neutral-900 text-white">
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                        {isAr ? 'البريد الإلكتروني المهني *' : isFr ? 'Email professionnel *' : 'Work Email *'}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#C4785A] rounded-xl py-2 px-3 text-xs sm:text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                        {isAr ? 'رقم الهاتف *' : isFr ? 'Téléphone *' : 'Phone *'}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/15 focus:border-[#C4785A] rounded-xl py-2 px-3 text-xs sm:text-sm text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      {isAr ? 'كلمة المرور *' : isFr ? 'Mot de passe *' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#C4785A] rounded-xl py-2 px-3 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>

                  {/* Promo Code / Voucher Drawer (Collapsible) */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowVoucherDrawer(!showVoucherDrawer)}
                      className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#C4785A]" />
                      <span>
                        {isAr
                          ? 'هل تمتلك رمز قسيمة أو ترخيص مدى الحياة؟'
                          : isFr
                          ? 'Vous possédez un voucher ou une licence à vie ?'
                          : 'Have a promo code or lifetime license voucher?'}
                      </span>
                      {showVoucherDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showVoucherDrawer && (
                      <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <input
                          type="text"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          placeholder="EX: ATR-PRO-2026-X89K"
                          className="flex-1 bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase tracking-wider font-mono outline-none focus:border-[#C4785A]"
                        />
                        {voucherValidation?.isValid && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            {(voucherValidation.tierName || 'ACTIVE').toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Terms Checkbox */}
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="rounded border-white/20 bg-neutral-900 text-[#C4785A] focus:ring-[#C4785A] cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-[11px] text-neutral-400 cursor-pointer">
                      {isAr
                        ? 'أوافق على شروط الاستخدام وسياسة الخصوصية لمنصة أتريوم'
                        : isFr
                        ? "J'accepte les conditions d'utilisation et la politique de confidentialité"
                        : 'I agree to the Terms of Use and Privacy Policy'}
                    </label>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 1: OPERATIONAL FRUSTRATION / CHALLENGE                   */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {[
                    {
                      id: 'scheduling' as const,
                      icon: Calendar,
                      title: isAr ? 'فوضى المواعيد وغياب الزبائن' : isFr ? 'Rendez-vous manqués & Agendas' : 'Chaotic Scheduling & No-Shows',
                      desc: isAr ? 'تزامن الأجندة، كراسي التجميل ورسائل التذكير' : isFr ? 'Plannings multiples, attribution fauteuils & rappels' : 'Multi-staff calendars, chair slots & automated alerts',
                    },
                    {
                      id: 'inventory' as const,
                      icon: Boxes,
                      title: isAr ? 'ضياع المخزون وصعوبة الجرد' : isFr ? 'Pertes de stock & Multi-dépôts' : 'Inventory Leaks & Stockout',
                      desc: isAr ? 'قارئ الباركود، تنبيهات النفاذ وتتبع المستودعات' : isFr ? 'Scanners codes-barres, alertes seuil & entrepôts' : 'Barcode scanner, reorder thresholds & multi-bays',
                    },
                    {
                      id: 'billing_creep' as const,
                      icon: Clock,
                      title: isAr ? 'ساعات غير مفوترة وضياع المشاريع' : isFr ? 'Heures non facturées & Dérive' : 'Unbilled Hours & Scope Creep',
                      desc: isAr ? 'عداد الوقت المباشر، تسليم المراحل وإثبات الإنجاز' : isFr ? 'Chronomètre temps réel, jalons & validation BAT' : 'Live stopwatch, milestones & client proof approvals',
                    },
                    {
                      id: 'postal_payments' as const,
                      icon: Receipt,
                      title: isAr ? 'تأخر التحصيل وحوالات CCP' : isFr ? 'Retards & Chèques CCP SFP 01' : 'Payment Delays & Postal CCP',
                      desc: isAr ? 'مطابقة صكوك SFP 01 الرسمية والتحصيل بالدينار' : isFr ? 'Mandats postaux SFP 01 & bordereaux certifiés' : 'Algerian Post CCP SFP 01 automated slips & audit',
                    },
                    {
                      id: 'paper_records' as const,
                      icon: Stethoscope,
                      title: isAr ? 'الملفات الورقية وقاعات الانتظار' : isFr ? "Dossiers papier & Salle d'attente" : 'Paper Files & Patient Queue',
                      desc: isAr ? 'فرز المرضى، الوصفات الرقمية وسجلات الاستشارة' : isFr ? "File d'attente, ordonnances & consultations EMR" : 'Triage status, digital Rx & consultation records',
                    },
                    {
                      id: 'commercial_invoicing' as const,
                      icon: FileText,
                      title: isAr ? 'الفواتير المعقدة ونزاعات الضريبة' : isFr ? 'Devis, BL & Litiges Fiscaux' : 'Complex B2B Quotes & BL',
                      desc: isAr ? 'سندات التسليم، الرسم الجبائي وحساب TVA التلقائي' : isFr ? 'Bons de livraison, timbre fiscal & retenue garantie' : 'Delivery notes, stamp duty & Algerian TVA math',
                    },
                  ].map((item) => {
                    const isSelected = primaryFrustration === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectFrustration(item.id)}
                        className={`flex flex-col text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-[#1F1D1B] border-[#C4785A] shadow-[0_0_14px_rgba(196,120,90,0.25)]'
                            : 'bg-[#18181B] border-white/10 hover:border-white/25 hover:bg-[#1C1C1F]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[#C4785A] text-white' : 'bg-white/5 text-neutral-400 group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#C4785A] bg-[#C4785A]' : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-white mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-neutral-400 leading-snug">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 2: WHAT DO YOU WANT TO ACHIEVE (FEATURE BLUEPRINT MODAL) */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 2 && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {[
                      {
                        id: 'goal_billing_dzd' as const,
                        icon: Receipt,
                        badge: 'Fiscalité Algérienne',
                        title: isAr ? 'فوترة قانونية مطابقة 100%' : isFr ? 'Facturation Légale DZ & DZD' : 'Compliant Algerian Invoicing',
                        summary: isAr ? 'حساب TVA التلقائي، صكوك SFP 01 والرسم الجبائي' : isFr ? 'Calcul automatique TVA, Timbre fiscal & Mandats CCP' : 'Automated TVA calculation, tax stamps & CCP slips',
                      },
                      {
                        id: 'goal_zero_scheduling_delays' as const,
                        icon: Calendar,
                        badge: 'Fluidité & Ponctualité',
                        title: isAr ? 'صفر تأخير ومواعيد منضبطة' : isFr ? 'Zéro Retard & Plannings Intelligents' : 'Zero Scheduling Delays',
                        summary: isAr ? 'تزامن الأجندة، كراسي التجميل، ورسائل تذكير تلقائية' : isFr ? 'Rappels SMS/WhatsApp, attribution fauteuils & anti-doublon' : 'Multi-staff agendas, slot collision lock & alerts',
                      },
                      {
                        id: 'goal_total_inventory_traceability' as const,
                        icon: Boxes,
                        badge: 'Stock & Entrepôt',
                        title: isAr ? 'تتبع المخزون بالباركود' : isFr ? 'Traçabilité Totale des Stocks' : 'End-to-End Stock Traceability',
                        summary: isAr ? 'جرد فوري بالباركود، خصم FIFO وتنبيهات النفاذ' : isFr ? 'Scanners codes-barres, déduction FIFO & alertes rupture' : 'Barcode POS, FIFO batch deduction & low-stock triggers',
                      },
                      {
                        id: 'goal_secure_milestones_ccp' as const,
                        icon: Target,
                        badge: 'Projets & Encaissement',
                        title: isAr ? 'تسليم المراحل وإثبات الإنجاز' : isFr ? 'Jalons Sécurisés & Règlements CCP' : 'Deliverable Milestones & CCP',
                        summary: isAr ? 'موافقة الزبون BAT، تحويل المبالغ كتابة بالحروف' : isFr ? 'Validation BAT, chiffres en lettres arabes & acomptes' : 'Client proof approvals, legal text math & milestones',
                      },
                      {
                        id: 'goal_digitize_medical_records' as const,
                        icon: Stethoscope,
                        badge: 'Clinique & Santé',
                        title: isAr ? 'رقمنة الملفات والوصفات' : isFr ? 'Dossiers Médicaux & File de Soin' : 'Digital EMR & Clinical Triage',
                        summary: isAr ? 'سجلات المريض، فرز الاستشارات والوصفات الرقمية' : isFr ? 'Dossier patient 360°, ordonnances DCI & triage actif' : 'Patient history, DCI prescriptions & priority queue',
                      },
                      {
                        id: 'goal_multisite_roles_governance' as const,
                        icon: ShieldCheck,
                        badge: 'Gouvernance & Multi-sites',
                        title: isAr ? 'صلاحيات دقيقة وتدقيق مالي' : isFr ? 'Gouvernance & Sécurité Multi-rôles' : 'Multi-Role Governance & Audit',
                        summary: isAr ? 'عزل صلاحيات الصندوق والمحاسبة وسجل التدقيق' : isFr ? 'Cloisonnement caissier/comptable & piste d’audit 100%' : 'Role-based access, cash limits & immutable audit log',
                      },
                    ].map((goal) => {
                      const isSelected = selectedGoalId === goal.id;
                      const Icon = goal.icon;
                      return (
                        <div
                          key={goal.id}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#1F1D1B] border-[#C4785A] shadow-[0_0_12px_rgba(196,120,90,0.25)]'
                              : 'bg-[#18181B] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-[#C4785A] text-white' : 'bg-white/5 text-neutral-400'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-semibold text-neutral-400 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                                {goal.badge}
                              </span>
                            </div>
                            <h3 className="font-bold text-xs sm:text-sm text-white mb-0.5">{goal.title}</h3>
                            <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2 mb-2">{goal.summary}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenGoalModal(goal.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-[#C4785A] hover:text-white text-neutral-300 text-xs font-semibold border border-white/10 hover:border-transparent transition-all cursor-pointer group"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C4785A] group-hover:text-white" />
                            <span>{isAr ? 'عرض المخطط التنفيذي' : isFr ? 'Voir le schéma directeur' : 'Inspect Blueprint'}</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-[10px] text-neutral-400 pt-0.5">
                    {isAr
                      ? '💡 انقر على "عرض المخطط التنفيذي" لتأكيد هذا الهدف والانتقال للخطوة التالية'
                      : isFr
                      ? '💡 Cliquez sur "Voir le schéma directeur" pour inspecter et continuer'
                      : '💡 Click "Inspect Blueprint" to view real screens and proceed to the next step'}
                  </p>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 3: DAILY CUSTOMER & OPERATIONAL INTERACTION              */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {[
                    {
                      id: 'walkin_pos' as const,
                      icon: Utensils,
                      title: isAr ? 'صندوق سريع عند المنضدة' : isFr ? 'Caisse comptoir & Scan code' : 'Walk-in Counter & Fast POS',
                      desc: isAr ? 'دفع فوري، طابعات إيصالات وحركة زبائن مستمرة' : isFr ? 'Vente directe, tickets de caisse & flux continu' : 'Direct sale checkout, thermal printer & barcode register',
                    },
                    {
                      id: 'appointment_schedule' as const,
                      icon: Scissors,
                      title: isAr ? 'حجز مسبق وتوزيع كراسي' : isFr ? 'Rendez-vous & Fauteuils' : 'Reserved Appointments',
                      desc: isAr ? 'صالونات، سبا، خدمات تجميل وجداول زمنية' : isFr ? 'Salons de coiffure, esthétique & créneaux dédiés' : 'Stylist columns, time slots & salon treatment cards',
                    },
                    {
                      id: 'membership_turnstile' as const,
                      icon: Dumbbell,
                      title: isAr ? 'اشتراكات دورية وبوابات RFID' : isFr ? "Abonnements & Accès RFID" : 'Memberships & Turnstiles',
                      desc: isAr ? 'نوادي رياضية، حصص لياقة ومتابعة الاشتراكات' : isFr ? 'Salles de sport, abonnements mensuels & tourniquet' : 'Gym turnstile logs, active memberships & pass renewals',
                    },
                    {
                      id: 'project_deliverables' as const,
                      icon: Briefcase,
                      title: isAr ? 'عقود خدمات ومراحل عمل BAT' : isFr ? 'Projets, BAT & Livrables' : 'Retainers & Deliverables',
                      desc: isAr ? 'وكالات إشهار، استشارات، وموافقة الزبون' : isFr ? 'Agences com, studios, validation client & jalons' : 'Agencies, studios, milestone approvals & deliverables',
                    },
                    {
                      id: 'patient_queue' as const,
                      icon: Stethoscope,
                      title: isAr ? 'استشارات طبية وفرز المرضى' : isFr ? 'Consultations & Triage' : 'Medical Queue & Patients',
                      desc: isAr ? 'عيادات، أطباء أسنان، تاريخ مرضي ووصفات' : isFr ? 'Cabinets médicaux, dossiers patients & ordonnances' : 'Clinics, dentists, clinical triage & digital prescriptions',
                    },
                    {
                      id: 'wholesale_dispatch' as const,
                      icon: Truck,
                      title: isAr ? 'طلبيات جملة وشاحنات نقل' : isFr ? 'Commerce de gros & Livraisons' : 'Wholesale Orders & COD',
                      desc: isAr ? 'توزيع B2B، مذكرات تسليم وتحصيل عند الاستلام' : isFr ? 'Distribution B2B, bons de livraison & flux COD' : 'B2B trading, warehouse manifests & cash on delivery',
                    },
                  ].map((item) => {
                    const isSelected = dailyWorkflow === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectWorkflow(item.id)}
                        className={`flex flex-col text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-[#1F1D1B] border-[#C4785A] shadow-[0_0_14px_rgba(196,120,90,0.25)]'
                            : 'bg-[#18181B] border-white/10 hover:border-white/25 hover:bg-[#1C1C1F]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[#C4785A] text-white' : 'bg-white/5 text-neutral-400 group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#C4785A] bg-[#C4785A]' : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-white mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-neutral-400 leading-snug">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 4: TEAM SCALE & WORKING HIERARCHY                        */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'solo' as const,
                      icon: Laptop,
                      title: isAr ? 'مستقل / ممارس فردي' : isFr ? 'Praticien Solo / Freelance' : 'Solo Practitioner / Freelance',
                      badge: isAr ? 'أنا فقط' : isFr ? 'Moi uniquement' : 'Just me',
                      desc: isAr ? 'واجهة خفيفة، دون تعقيدات الصلاحيات أو الحسابات المتعددة' : isFr ? 'Zéro friction administrative, pas de gestion de rôles' : 'Lightweight setup with zero role bureaucracy',
                    },
                    {
                      id: 'small' as const,
                      icon: Users,
                      title: isAr ? 'فريق عمل مصغر' : isFr ? 'Équipe agile (2 à 5)' : 'Small Agile Team (2 to 5)',
                      badge: '2 - 5 staff',
                      desc: isAr ? 'صندوق مشترك، تقاسم المهام ونسب العمولات' : isFr ? 'Caisse partagée, attribution des tâches & pourcentages' : 'Shared cashier, staff commission split & agile workflow',
                    },
                    {
                      id: 'mid' as const,
                      icon: Building2,
                      title: isAr ? 'مؤسسة متوسطة' : isFr ? 'Entreprise structurée (6 à 20)' : 'Established Team (6 to 20)',
                      badge: '6 - 20 staff',
                      desc: isAr ? 'أدوار متخصصة: محاسبة، إشراف، إنتاج وإدارة' : isFr ? 'Rôles dédiés : Compta, Chef de Projet, Direction' : 'Dedicated departmental roles: Compta, Leads, Exec',
                    },
                    {
                      id: 'large' as const,
                      icon: Building,
                      title: isAr ? 'شبكة أو منشأة كبرى' : isFr ? 'Multi-sites / Entreprise (20+)' : 'Multi-Branch Enterprise (20+)',
                      badge: '20+ staff',
                      desc: isAr ? 'فروع متعددة، سجل تدقيق العمليات وحدود ترخيص موسعة' : isFr ? 'Multi-établissements, pistes d’audit & quotas illimités' : 'Multi-campus switching, audit logs & high quotas',
                    },
                  ].map((item) => {
                    const isSelected = teamScale === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTeamScale(item.id)}
                        className={`flex flex-col text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-[#1F1D1B] border-[#C4785A] shadow-[0_0_14px_rgba(196,120,90,0.25)]'
                            : 'bg-[#18181B] border-white/10 hover:border-white/25 hover:bg-[#1C1C1F]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[#C4785A] text-white' : 'bg-white/5 text-neutral-400 group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isSelected
                                ? 'bg-[#C4785A]/20 border-[#C4785A]/40 text-[#E09070]'
                                : 'bg-white/5 border-white/10 text-neutral-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-white mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-neutral-400 leading-snug">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 5: PRIMARY PAYMENT & SETTLEMENT FLOW                     */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 5 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'pos_cash' as const,
                      icon: Receipt,
                      title: isAr ? 'نقداً وبريدي موب بالصندوق' : isFr ? 'Espèces & BaridiMob au comptoir' : 'Instant Cash & BaridiMob',
                      desc: isAr ? 'إيصالات حرارية سريعة، دروج الصندوق والتحصيل المباشر' : isFr ? 'Tickets thermiques en DZD, tiroir caisse & clôture Z' : 'Thermal receipts in DZD, cash drawer & daily Z-reports',
                    },
                    {
                      id: 'b2b_tva' as const,
                      icon: FileText,
                      title: isAr ? 'فواتير رسمية B2B مع الضريبة' : isFr ? 'Factures B2B (TVA & Timbre)' : 'Official B2B Invoices & TVA',
                      desc: isAr ? 'سجل تجاري، رقم جبائي NIF، وسندات التسليم القانونية' : isFr ? 'Mentions légales (RC, NIF, NIS), timbre & retenue' : 'Algerian fiscal compliance, RC, NIF, NIS & tax stamps',
                    },
                    {
                      id: 'ccp_postal' as const,
                      icon: CreditCard,
                      title: isAr ? 'حوالات بريدية CCP وصكوك SFP 01' : isFr ? 'Virements CCP & Mandats SFP 01' : 'Postal CCP & SFP 01 Slips',
                      desc: isAr ? 'تحويل المبالغ كتابة بالحروف العربية وأختام البريد' : isFr ? 'Chiffres en lettres arabes légaux & bordereaux PTT' : 'Automated Arabic legal amount in words & PTT stamps',
                    },
                    {
                      id: 'recurring_retainer' as const,
                      icon: ShieldCheck,
                      title: isAr ? 'أقساط، ودائع ضمان واشتراكات' : isFr ? 'Acomptes, Cautions & Forfaits' : 'Installments & Escrows',
                      desc: isAr ? 'إيداعات تأمين القاعات، أقساط دورات أو دفعات مسبقة' : isFr ? 'Dépôts de garantie, règlements échelonnés & forfaits' : 'Caution deposits, multi-tranche billing & retainers',
                    },
                  ].map((item) => {
                    const isSelected = settlementStyle === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSettlement(item.id)}
                        className={`flex flex-col text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-[#1F1D1B] border-[#C4785A] shadow-[0_0_14px_rgba(196,120,90,0.25)]'
                            : 'bg-[#18181B] border-white/10 hover:border-white/25 hover:bg-[#1C1C1F]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[#C4785A] text-white' : 'bg-white/5 text-neutral-400 group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#C4785A] bg-[#C4785A]' : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-white mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-neutral-400 leading-snug">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 6: SPECIFIC BUSINESS DOMAIN & 160+ CATALOG SEARCH        */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 6 && (
                <div className="space-y-2.5">
                  {/* Search Input Box */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      placeholder={
                        isAr
                          ? 'ابحث عن نشاطك: صيدلية، عيادة أسنان، مطعم، صالون، وكالة، مقاولات...'
                          : isFr
                          ? 'Recherchez votre métier : cabinet dentaire, imprimerie, agence, salle de sport...'
                          : 'Search trade: dental clinic, bakery, gym, agency, farm, auto repair...'
                      }
                      className="w-full bg-[#18181B] border border-white/15 focus:border-[#C4785A] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                  </div>

                  {/* Vertical Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedCatalogCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer font-medium ${
                        selectedCatalogCategoryFilter === 'all'
                          ? 'bg-[#C4785A] text-white shadow-xs'
                          : 'bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {isAr ? 'الكل (160+ نشاط)' : isFr ? 'Tous (160+ métiers)' : 'All 160+ Trades'}
                    </button>
                    {(Object.keys(CATEGORY_METADATA) as BusinessCategory[]).map((catKey) => {
                      const meta = CATEGORY_METADATA[catKey];
                      const isFilterActive = selectedCatalogCategoryFilter === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setSelectedCatalogCategoryFilter(catKey)}
                          className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer font-medium ${
                            isFilterActive
                              ? 'bg-[#C4785A] text-white shadow-xs'
                              : 'bg-white/5 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {meta.title}
                        </button>
                      );
                    })}
                  </div>

                  {/* Trades Grid (Internal Scroll Only, Controlled Height) */}
                  <div className="max-h-48 sm:max-h-56 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 scrollbar-thin">
                    {filteredCatalogTrades.map((trade) => {
                      const isSelected = selectedTradeId === trade.id;
                      const title = isAr ? trade.name.ar : isFr ? trade.name.fr : trade.name.en;
                      const badgeText = isAr ? trade.badge.ar : isFr ? trade.badge.fr : trade.badge.en;
                      return (
                        <button
                          key={trade.id}
                          type="button"
                          onClick={() => handleSelectTrade(trade)}
                          className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-[#1F1D1B] border-[#C4785A] shadow-[0_0_12px_rgba(196,120,90,0.3)]'
                              : 'bg-[#18181B] border-white/10 hover:border-white/20 hover:bg-[#1E1E22]'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-semibold text-white truncate">{title}</span>
                            <span className="text-[10px] text-neutral-400 truncate">{badgeText}</span>
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'border-[#C4785A] bg-[#C4785A]' : 'border-white/20 group-hover:border-white/40'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 7: HOW DID YOU HEAR ABOUT ATRIUM? (HIGGSFIELD PILLS)     */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 7 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {REFERRAL_SOURCES.map((src) => {
                      const isSelected = referralSource === src.id;
                      const label = isAr ? src.labelAr : isFr ? src.labelFr : src.labelEn;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => handleSelectReferral(src.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#C4785A] border-[#C4785A] text-white shadow-[0_0_12px_rgba(196,120,90,0.4)]'
                              : 'bg-[#18181B] border-white/10 text-neutral-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <Compass className="w-3.5 h-3.5 opacity-70" />
                          <span>{label}</span>
                          {isSelected && <Check className="w-3 h-3 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 8: BESPOKE OPERATING SYSTEM REVEAL & 1-CLICK LAUNCH      */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 8 && (
                <div className="space-y-3">
                  {/* Synthesis Reveal Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1F1D1B] to-[#141416] border border-[#C4785A]/40 shadow-[0_0_20px_rgba(196,120,90,0.2)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#C4785A] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
                        {isAr ? 'التهيئة المقترحة بالذكاء الاصطناعي' : isFr ? 'Configuration recommandée' : 'AI-Tailored Recommendation'}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {matchConfidence}% Match
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-black text-white mb-0.5 flex items-center gap-2">
                      <span>{activeCategoryMeta.title}</span>
                    </h2>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-3 line-clamp-2 sm:line-clamp-none">
                      {isAr
                        ? `تم ضبط بيئة العمل خصيصاً لمؤسستك "${workspaceName}" مع تفعيل ميزات التحصيل والمراقبة المناسبة لنشاطك (${selectedTrade ? (isAr ? selectedTrade.name.ar : selectedTrade.name.fr) : activeCategoryMeta.title}).`
                        : isFr
                        ? `Environnement calibré pour "${workspaceName}" avec activation des modules métier pour "${selectedTrade ? selectedTrade.name.fr : activeCategoryMeta.title}" et conformité fiscale DZD.`
                        : `Workspace optimized for "${workspaceName}" with tailored operational screens and compliance tools.`}
                    </p>

                    {/* Pre-configured Modules Checklist */}
                    <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        {isAr ? 'الوحدات المفعّلة فورياً في مساحة عملك:' : isFr ? 'Modules activés dès le lancement :' : 'Active Modules Ready on Launch:'}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C4785A] shrink-0" />
                          <span className="truncate">{isAr ? 'لوحة القيادة والمؤشرات الحية' : isFr ? 'Tableau de bord & Pulse' : 'Dashboard & Live Pulse'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C4785A] shrink-0" />
                          <span className="truncate">{isAr ? 'إدارة العملاء وقاعدة البيانات' : isFr ? 'CRM Clients & Historique' : '360° Client Directory'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C4785A] shrink-0" />
                          <span className="truncate">{isAr ? 'الفوترة والمطابقة المالية بالدينار' : isFr ? 'Facturation & Caisse DZD' : 'Financial Ledger in DZD'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C4785A] shrink-0" />
                          <span className="truncate">{isAr ? 'سجل العمليات والتدقيق الإداري' : isFr ? 'Piste d’audit & Droits' : 'Full Audit Trail & Roles'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manual Category Override Expander (Full User Control) */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsOverrideSelectorOpen(!isOverrideSelectorOpen)}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
                      <span>
                        {isAr
                          ? 'هل ترغب في تغيير أو اختيار فئة عمل أخرى يدوياً؟'
                          : isFr
                          ? "Choisir manuellement une autre catégorie d'activité ?"
                          : 'Prefer to manually pick a different vertical?'}
                      </span>
                      {isOverrideSelectorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isOverrideSelectorOpen && (
                      <div className="mt-2 p-2 rounded-xl bg-white/5 border border-white/10 max-h-36 overflow-y-auto space-y-1 text-xs">
                        {(Object.keys(CATEGORY_METADATA) as BusinessCategory[]).map((catKey) => {
                          const meta = CATEGORY_METADATA[catKey];
                          const isPicked = activeCategory === catKey;
                          return (
                            <button
                              key={catKey}
                              type="button"
                              onClick={() => {
                                setManualCategoryOverride(catKey);
                                setIsOverrideSelectorOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                isPicked
                                  ? 'bg-[#C4785A] text-white font-semibold'
                                  : 'hover:bg-white/5 text-neutral-300'
                              }`}
                            >
                              <span>{meta.title}</span>
                              {isPicked && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions (Unified Navigation Contract: Back on all, Continue only when needed) */}
            <div className="mt-3 sm:mt-4 pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{isAr ? 'السابق' : isFr ? 'Précédent' : 'Back'}</span>
                </button>
              ) : (
                <div />
              )}

              {/* Step 0: Needs Continue button for multi-field form */}
              {currentStep === 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C4785A] hover:bg-[#b3684a] shadow-[0_4px_16px_rgba(196,120,90,0.35)] transition-all cursor-pointer active:scale-95 ml-auto"
                >
                  <span>{isAr ? 'متابعة' : isFr ? 'Continuer' : 'Continue'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 6: Shows Continue in case user uses search without clicking chip */}
              {currentStep === 6 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(7)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#C4785A] hover:bg-[#b3684a] shadow-[0_4px_16px_rgba(196,120,90,0.35)] transition-all cursor-pointer active:scale-95 ml-auto"
                >
                  <span>{isAr ? 'متابعة' : isFr ? 'Continuer' : 'Continue'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 8: Final Launch Workspace Button */}
              {currentStep === 8 && (
                <button
                  type="button"
                  onClick={handleLaunchWorkspace}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C4785A] hover:bg-[#b3684a] shadow-[0_6px_20px_rgba(196,120,90,0.4)] transition-all cursor-pointer active:scale-95 ml-auto"
                >
                  <Rocket className="w-4 h-4" />
                  <span>
                    {isAr ? 'إطلاق مساحة العمل الآن' : isFr ? 'Lancer mon espace Atrium' : 'Launch My Workspace'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: ATRIUM BRAND IDENTITY & LIVE ADAPTING WORKSPACE PREVIEW      */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 hidden lg:flex flex-col items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-md p-4 sm:p-5 rounded-2xl bg-[#141416] border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.6)] overflow-hidden">
              
              {/* Ambient Warm Terracotta Glow */}
              <div
                className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #C4785A 0%, transparent 70%)' }}
              />

              {/* Header: Brand Mark & Live Status */}
              <div className="relative z-10 flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FiveCubesLogo size={22} cubeColor="#C4785A" />
                  <span className="text-xs font-extrabold tracking-wider uppercase text-neutral-300">
                    Atrium <span className="text-[#C4785A]">OS</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isAr ? 'مباشر' : isFr ? 'En direct' : 'Live Preview'}</span>
                </div>
              </div>

              {/* Dynamic Identity Card */}
              <div className="relative z-10 mb-3 p-3 rounded-xl bg-neutral-900/80 border border-white/5 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {isAr ? 'مؤسستك المخصصة' : isFr ? 'Établissement' : 'Configured Entity'}
                </div>
                <div className="text-sm font-extrabold text-white truncate">
                  {workspaceName || 'Atlas Creative Studio'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <MapPin className="w-3 h-3 text-[#C4785A] shrink-0" />
                  <span className="truncate text-[11px]">{selectedWilaya} • {branchAddress}</span>
                </div>
              </div>

              {/* Live Adaptive Vertical Badge & Match Score */}
              <div className="relative z-10 mb-3 p-2.5 rounded-xl bg-[#1C1A18] border border-[#C4785A]/30 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#C4785A]">
                    {isAr ? 'الفئة المختارة' : isFr ? 'Catégorie Métier' : 'Vertical Engine'}
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {selectedTrade ? (isFr ? selectedTrade.name.fr : isAr ? selectedTrade.name.ar : selectedTrade.name.en) : activeCategoryMeta.title}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#C4785A] px-2 py-0.5 rounded-md bg-[#C4785A]/15">
                  {matchConfidence}% Match
                </span>
              </div>

              {/* Live Mini-Mockup Snapshot of the Vertical Screen */}
              <div className="relative z-10 p-3 rounded-xl bg-neutral-900/90 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400">
                  <span>{isAr ? 'محاكاة واجهة الاستخدام' : isFr ? "Aperçu de l'interface" : 'Interface Snapshot'}</span>
                  <span className="text-[9px] text-neutral-500 font-mono">v4.3 Production</span>
                </div>

                {/* Vertical Specific Micro Mockup Tile */}
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-white/5 space-y-1.5 text-xs">
                  {activeCategory === 'pos_inventory' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Caisse Tactile #01</span>
                        <span className="text-emerald-400 font-bold font-mono">14,250 DZD</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[9px] text-center text-neutral-400">
                        <div className="p-1 rounded bg-white/5">Espèces</div>
                        <div className="p-1 rounded bg-[#C4785A]/20 text-[#E09070]">BaridiMob</div>
                        <div className="p-1 rounded bg-white/5">Carte CIB</div>
                      </div>
                    </>
                  )}

                  {activeCategory === 'appointment_service' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Planning Fauteuils</span>
                        <span className="text-[#C4785A] font-semibold text-[10px]">8 Réservations</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Fauteuil VIP 1 : Soin & Brushing (14:30)</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'membership_session' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Portique Tourniquet RFID</span>
                        <span className="text-emerald-400 font-semibold text-[10px]">Accès Autorisé</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Adhérent #4892 • Abonnement Actif</span>
                      </div>
                    </>
                  )}

                  {(activeCategory === 'project_milestone' || activeCategory === 'freelance_solo') && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Jalon & Validation Client</span>
                        <span className="text-[#C4785A] font-semibold text-[10px]">BAT Validé</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C4785A]" />
                        <span>Campagne 5G • Mandat CCP SFP 01</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'medical_clinic' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>File d'Attente Médicale</span>
                        <span className="text-emerald-400 font-semibold text-[10px]">4 Patients</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Dossier #104 • Consultation & Ordonnance</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'trading_commercial' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Bordereau d'Expédition COD</span>
                        <span className="text-emerald-400 font-semibold text-[10px]">185,000 DZD</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>BL #2026-08 • Timbre fiscal & RC</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'auto_garage' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Ordre Réparation #412</span>
                        <span className="text-amber-400 font-semibold text-[10px]">En Diagnostic</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>Pièces : Courroie + Filtre</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'real_estate' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Mandat Vente/Location #89</span>
                        <span className="text-emerald-400 font-semibold text-[10px]">Dossier Notarié</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Appartement F4 Hydra • Visites OK</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'construction_contractor' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Chantier Résidence El Bahdja</span>
                        <span className="text-sky-400 font-semibold text-[10px]">Attachement #03</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span>Situation validée avec 5% retenue</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'agriculture_farming' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Parcelle Olivier Nord #B2</span>
                        <span className="text-emerald-400 font-semibold text-[10px]">Récolte Validée</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Pesée : 4,200 Kg • Traçabilité lot DZ</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'education_cohort' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Session Masterclass Design</span>
                        <span className="text-indigo-400 font-semibold text-[10px]">16 Inscrits</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>Attestations & émargement actifs</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'legal_accounting' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Dossier Contentieux #882</span>
                        <span className="text-[#C4785A] font-semibold text-[10px]">Tribunal</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C4785A]" />
                        <span>Provision d'honoraires enregistrée</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'rental_booking' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Location Matériel Audio/Vidéo</span>
                        <span className="text-amber-400 font-semibold text-[10px]">Caution Reçue</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>État des lieux validé avec signature</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'logistics_delivery' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Messagerie & Colis COD</span>
                        <span className="text-purple-400 font-semibold text-[10px]">58 Wilayas</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <span>Tournée #08 • 14 colis livrés</span>
                      </div>
                    </>
                  )}

                  {activeCategory === 'manufacturing_production' && (
                    <>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span>Ordre de Fabrication OF-99</span>
                        <span className="text-cyan-400 font-semibold text-[10px]">Ligne #2 En Cours</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>BOM consommée • Contrôle qualité</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Quote & Trust Seal */}
              <div className="relative z-10 mt-3 text-center">
                <p className="text-[10px] text-neutral-400 italic">
                  {isAr
                    ? '"نظام إدارة أعمال متكامل صُمم ليتماشى مع بيئة الأعمال الوطنية والتحصيل الفوري"'
                    : isFr
                    ? '"Le système de gestion unifié pensé pour la réalité du terrain et la conformité nationale."'
                    : '"The unified operating system tailored for real-world operations & instant settlement."'}
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Feature Blueprint Modal */}
      <FeatureBlueprintModal
        isOpen={Boolean(activeGoalModalId)}
        onClose={() => setActiveGoalModalId(null)}
        goalId={activeGoalModalId}
        onApplyAndContinue={() => {
          if (activeGoalModalId) {
            handleConfirmGoalAndContinue(activeGoalModalId);
          }
        }}
        language={language}
      />

      {/* Footer Branding Bar (Compact, Single-Line, Viewport Budget) */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-[11px] text-neutral-400 border-t border-white/5 shrink-0">
        <span>© 2026 Atrium ERP & CRM. All rights reserved.</span>
        <span>Version 4.3 • Algeria & MENA</span>
      </footer>
    </div>
  );
};

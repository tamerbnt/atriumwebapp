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
  Copy,
  ExternalLink,
  MessageCircle,
  X,
  Phone,
  Mail,
  Lock,
  User,
  AlertCircle,
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
import { LabelInput } from '../ui/LabelInput';

interface PowerOnboardingScreenProps {
  onComplete: () => void;
  onSkipToDashboard: () => void;
}

export type SubscriptionPlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PlanMeta {
  tier: SubscriptionPlanTier;
  tierRank: 0 | 1 | 2 | 3;
  name: string;
  badgeFr: string;
  badgeAr: string;
  badgeEn: string;
  priceFr: string;
  priceAr: string;
  priceEn: string;
  descFr: string;
  descAr: string;
  descEn: string;
  isRecommended?: boolean;
}

export const SUBSCRIPTION_PLANS: PlanMeta[] = [
  {
    tier: 'free',
    tierRank: 0,
    name: 'Free Web',
    badgeFr: 'Gratuit à vie',
    badgeAr: 'مجاني دائماً',
    badgeEn: 'Free Forever',
    priceFr: '0 DZD',
    priceAr: '0 د.ج',
    priceEn: '0 DZD',
    descFr: '1 Établissement • 1 Caisse • 5 Staff',
    descAr: '1 مؤسسة • 1 نقطة بيع • 5 موظفين',
    descEn: '1 Entity • 1 Terminal • 5 Staff',
  },
  {
    tier: 'starter',
    tierRank: 1,
    name: 'Starter',
    badgeFr: 'TPE & Artisans',
    badgeAr: 'للمهنيين المستقلين',
    badgeEn: 'Small Businesses',
    priceFr: '19 000 DZD',
    priceAr: '19,000 د.ج',
    priceEn: '19,000 DZD',
    descFr: '1 Entreprise • 2 Branches • 10 Staff',
    descAr: '1 مؤسسة • 2 فروع • 10 موظفين',
    descEn: '1 Business • 2 Branches • 10 Staff',
  },
  {
    tier: 'pro',
    tierRank: 2,
    name: 'Pro',
    isRecommended: true,
    badgeFr: 'Recommandé',
    badgeAr: 'الأكثر طلباً',
    badgeEn: 'Most Popular',
    priceFr: '49 000 DZD',
    priceAr: '49,000 د.ج',
    priceEn: '49,000 DZD',
    descFr: '3 Sociétés • 5 Branches • Staff illimité',
    descAr: '3 مؤسسات • 5 فروع • موظفين غير محدود',
    descEn: '3 Businesses • 5 Branches • Unlimited Staff',
  },
  {
    tier: 'enterprise',
    tierRank: 3,
    name: 'Enterprise',
    badgeFr: 'Grand Réseau',
    badgeAr: 'للشركات الكبرى',
    badgeEn: 'Multi-Sites',
    priceFr: '99 000 DZD',
    priceAr: '99,000 د.ج',
    priceEn: '99,000 DZD',
    descFr: 'Sociétés illimitées • Multi-dépôts • VIP',
    descAr: 'مؤسسات غير محدودة • مستودعات متعددة',
    descEn: 'Unlimited Businesses • Multi-depots • VIP',
  },
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

  // Step 0 State: Admin Account & Authentication
  const [fullName, setFullName] = useState('Mehdi Samih');
  const [email, setEmail] = useState('mehdisamih79@gmail.com');
  const [password, setPassword] = useState('Atrium2026!');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Step 8 State: Deferred Workspace Naming, Phone & Subscription Plan Switcher
  const [workspaceName, setWorkspaceName] = useState('Atlas Creative Studio');
  const [phone, setPhone] = useState('+213 550 12 34 56');
  const [branchAddress] = useState('14 Boulevard Didouche Mourad, Alger');
  const [selectedPlanTier, setSelectedPlanTier] = useState<SubscriptionPlanTier>('free');
  const [voucherCode, setVoucherCode] = useState('');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [testVoucherCopied, setTestVoucherCopied] = useState(false);
  const [paidVoucherError, setPaidVoucherError] = useState<string | null>(null);

  // One-Click Google Authentication Simulator for Step 0
  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setFullName('Mehdi Samih');
    setEmail('mehdisamih79@gmail.com');
    setTimeout(() => {
      setIsGoogleLoading(false);
      setCurrentStep(1);
    }, 350);
  };

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
    // If a paid tier is chosen without a valid voucher, prompt user
    if (selectedPlanTier !== 'free' && (!voucherValidation || !voucherValidation.isValid)) {
      setPaidVoucherError(
        isAr
          ? 'يرجى إدخال رمز قسيمة ترخيص صالح للخطة المختارة، أو تفعيل الخطة المجانية Free Web للمتابعة الفورية.'
          : isFr
          ? 'Veuillez saisir un code voucher valide pour la formule choisie, ou activer l’édition Free Web.'
          : 'Please enter a valid license voucher for the selected paid plan, or switch to Free Web.'
      );
      return;
    }

    setPaidVoucherError(null);
    const finalBusinessName = workspaceName.trim() || 'Mon Entreprise Atrium';
    const finalBranchName = 'Siège Principal';

    const params: OnboardingParams = {
      fullName: fullName.trim() || 'Admin Atrium',
      email: email.trim() || 'contact@atrium-dz.com',
      password: password.trim() || 'Atrium2026!',
      phone: phone.trim() || '+213 550 12 34 56',
      businessName: finalBusinessName,
      category: activeCategory,
      branchName: finalBranchName,
      branchAddress: branchAddress.trim(),
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
      title: isAr
        ? 'أنشئ حساب المسؤول الرئيسي'
        : isFr
        ? 'Créez votre compte administrateur'
        : 'Create your administrator account',
      subtext: isAr
        ? 'سجّل الدخول عبر جوجل أو باستخدام بريدك الإلكتروني المهني'
        : isFr
        ? 'Connectez-vous via Google ou utilisez votre e-mail professionnel'
        : 'Sign in with Google or continue with your work email',
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
      title: isAr
        ? 'تخصيص المساحة واختيار الخطة'
        : isFr
        ? 'Finalisez votre espace & choisissez votre forfait'
        : 'Finalize your workspace & select your plan',
      subtext: isAr
        ? 'حدد اسم مؤسستك، رقم هاتفك وخطة التشغيل المناسبة لبدء العمل فوراً'
        : isFr
        ? 'Nommez votre établissement, renseignez votre contact et choisissez votre formule'
        : 'Name your workspace, provide your contact number, and select your Atrium tier',
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
              {/* STEP 0: GOOGLE SSO OR WORK EMAIL VIA PROPRIETARY LABELINPUT   */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 0 && (
                <div className="space-y-3">
                  {/* Primary Google SSO One-Click Experience */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full h-11 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-75 active:scale-[0.99]"
                  >
                    {isGoogleLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-700 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>
                      {isGoogleLoading
                        ? (isAr ? 'جارِ التحقق...' : isFr ? 'Connexion en cours...' : 'Connecting...')
                        : (isAr ? 'المتابعة باستخدام حساب Google' : isFr ? 'Continuer avec Google' : 'Continue with Google')}
                    </span>
                  </button>

                  {/* Elegant Divider */}
                  <div className="relative flex items-center justify-center my-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <span className="relative px-3 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-[#0C0C0E]">
                      {isAr ? 'أو باستخدام بريدك المهني' : isFr ? 'OU AVEC UN E-MAIL PROFESSIONNEL' : 'OR WITH WORK EMAIL'}
                    </span>
                  </div>

                  {/* Proprietary LabelInput Text Boxes */}
                  <div className="space-y-3 pt-1">
                    <LabelInput
                      field="fullName"
                      label={isAr ? 'الاسم واللقب للمسؤول' : isFr ? 'Nom & prénom du responsable' : 'Full Name'}
                      value={fullName}
                      onChange={(val) => setFullName(String(val))}
                      prefix={<User className="w-3.5 h-3.5" />}
                      height={42}
                      corner={12}
                    />

                    <LabelInput
                      field="email"
                      type="email"
                      label={isAr ? 'البريد الإلكتروني المهني' : isFr ? 'E-mail professionnel' : 'Work Email'}
                      value={email}
                      onChange={(val) => setEmail(String(val))}
                      prefix={<Mail className="w-3.5 h-3.5" />}
                      height={42}
                      corner={12}
                    />

                    <LabelInput
                      field="password"
                      type="password"
                      label={isAr ? 'كلمة المرور' : isFr ? 'Mot de passe sécurisé' : 'Secure Password'}
                      value={password}
                      onChange={(val) => setPassword(String(val))}
                      prefix={<Lock className="w-3.5 h-3.5" />}
                      height={42}
                      corner={12}
                    />
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
              {/* STEP 8: WORKSPACE IDENTITY & SUBSCRIPTION PLAN SWITCHER       */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 8 && (
                <div className="space-y-2.5 sm:space-y-3">
                  {/* Synthesis Vertical Match Pill */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#1F1D1B] to-[#141416] border border-[#C4785A]/35 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#C4785A]/20 border border-[#C4785A]/30 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-[#C4785A]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4785A] truncate">
                          {isAr ? 'النظام المقترح وفق نشاطك' : isFr ? 'Système Métier Calibré' : 'Calibrated Vertical Engine'}
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-white truncate">
                          {selectedTrade ? (isAr ? selectedTrade.name.ar : isFr ? selectedTrade.name.fr : selectedTrade.name.en) : activeCategoryMeta.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {matchConfidence}% Match
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOverrideSelectorOpen(!isOverrideSelectorOpen)}
                        className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title={isAr ? 'تغيير يدوي' : isFr ? 'Changer' : 'Change'}
                      >
                        {isOverrideSelectorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Manual Category Override Dropdown (If expanded) */}
                  {isOverrideSelectorOpen && (
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 max-h-32 overflow-y-auto space-y-1 text-xs">
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
                            className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-left transition-colors cursor-pointer ${
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

                  {/* Section 1: Final Workspace Identity Fields using LabelInput */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <LabelInput
                      field="workspaceName"
                      label={isAr ? 'اسم المؤسسة / مساحة العمل' : isFr ? "Nom de l'entreprise ou marque" : 'Workspace / Business Name'}
                      value={workspaceName}
                      onChange={(val) => setWorkspaceName(String(val))}
                      prefix={<Building2 className="w-3.5 h-3.5" />}
                      height={42}
                      corner={12}
                    />

                    <LabelInput
                      field="phone"
                      type="tel"
                      label={isAr ? 'رقم هاتف الاتصال' : isFr ? 'Téléphone de contact' : 'Contact Phone'}
                      value={phone}
                      onChange={(val) => setPhone(String(val))}
                      prefix={<Phone className="w-3.5 h-3.5" />}
                      height={42}
                      corner={12}
                    />
                  </div>

                  {/* Section 2: Subscription Plan Switcher */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {isAr ? 'اختر خطة التشغيل المناسبة :' : isFr ? 'Choisissez votre plan Atrium OS :' : 'Select your Atrium OS Plan:'}
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        {isAr ? 'ترخيص دائم مدى الحياة' : isFr ? 'Licence perpétuelle sans abonnement mensuel' : 'Perpetual lifetime license'}
                      </span>
                    </div>

                    {/* 4 Plan Tier Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SUBSCRIPTION_PLANS.map((plan) => {
                        const isSelected = selectedPlanTier === plan.tier;
                        const badge = isAr ? plan.badgeAr : isFr ? plan.badgeFr : plan.badgeEn;
                        const price = isAr ? plan.priceAr : isFr ? plan.priceFr : plan.priceEn;

                        return (
                          <button
                            key={plan.tier}
                            type="button"
                            onClick={() => {
                              setSelectedPlanTier(plan.tier);
                              setPaidVoucherError(null);
                            }}
                            className={`flex flex-col text-left p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer relative group ${
                              isSelected
                                ? 'bg-[#221F1C] border-[#C4785A] shadow-[0_0_14px_rgba(196,120,90,0.35)]'
                                : 'bg-[#18181B] border-white/10 hover:border-white/20 hover:bg-[#1C1C1F]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  plan.isRecommended
                                    ? 'bg-[#C4785A] text-white'
                                    : plan.tier === 'free'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-white/10 text-neutral-300'
                                }`}
                              >
                                {badge}
                              </span>
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                                  isSelected ? 'border-[#C4785A] bg-[#C4785A]' : 'border-white/20'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </div>
                            <span className="font-extrabold text-xs sm:text-sm text-white">{plan.name}</span>
                            <span className="font-mono text-xs font-bold text-[#E09070] mt-0.5">{price}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tier Context & Voucher Form */}
                    {selectedPlanTier === 'free' ? (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-[11px]">
                            {isAr
                              ? 'خطة Free Web مفعّلة فورياً • لا تتطلب أي رمز قسيمة أو دفع مالي.'
                              : isFr
                              ? 'Édition Free Web incluse • Lancement immédiat sans code voucher ni paiement.'
                              : 'Free Web edition included • Instant launch with zero payment or voucher required.'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex-1">
                            <LabelInput
                              field="voucherCode"
                              label={
                                isAr
                                  ? `رمز قسيمة ترخيص (${selectedPlanTier.toUpperCase()})`
                                  : isFr
                                  ? `Code voucher licence (${selectedPlanTier.toUpperCase()})`
                                  : `License voucher code (${selectedPlanTier.toUpperCase()})`
                              }
                              value={voucherCode}
                              onChange={(val) => {
                                setVoucherCode(String(val).toUpperCase());
                                setPaidVoucherError(null);
                              }}
                              prefix={<KeyRound className="w-3.5 h-3.5" />}
                              height={40}
                              corner={10}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowLicenseModal(true)}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
                            <span>
                              {isAr ? 'طلب ترخيص رسمي' : isFr ? 'Demander une licence' : 'Request License'}
                            </span>
                          </button>
                        </div>

                        {/* Voucher Status Indicator */}
                        {voucherValidation?.isValid && (
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                              <Check className="w-3.5 h-3.5" />
                              {isAr ? 'قسيمة ترخيص صالحة مدى الحياة :' : isFr ? 'Voucher valide à vie :' : 'Valid Lifetime Voucher:'}{' '}
                              <span className="font-mono uppercase">{voucherValidation.tierName}</span>
                            </span>
                            <span className="text-[10px] text-emerald-300">100% Validé</span>
                          </div>
                        )}

                        {/* Error notice if user tried to launch without entering voucher */}
                        {paidVoucherError && (
                          <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              <span className="text-[11px]">{paidVoucherError}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlanTier('free');
                                setPaidVoucherError(null);
                              }}
                              className="text-[10px] font-bold text-white underline hover:text-neutral-200 cursor-pointer shrink-0"
                            >
                              {isAr ? 'تفعيل الخطة المجانية' : isFr ? 'Activer Free Web' : 'Use Free Web'}
                            </button>
                          </div>
                        )}
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
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {isAr ? 'مؤسستك المخصصة' : isFr ? 'Établissement' : 'Configured Entity'}
                  </div>
                  <span className="text-[10px] font-bold text-[#E09070] bg-[#C4785A]/15 px-2 py-0.5 rounded">
                    {SUBSCRIPTION_PLANS.find((p) => p.tier === selectedPlanTier)?.name || 'Free Web'}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-white truncate">
                  {workspaceName || 'Atlas Creative Studio'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <MapPin className="w-3 h-3 text-[#C4785A] shrink-0" />
                  <span className="truncate text-[11px]">{branchAddress}</span>
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

      {/* Commercial License & Voucher Request Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#18181B] border border-[#C4785A]/40 shadow-2xl p-5 text-white animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/20 border border-[#C4785A]/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#C4785A]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {isAr ? 'الحصول على ترخيص Atrium OS' : isFr ? 'Obtenir une licence Atrium OS' : 'Get an Atrium OS License'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {isAr ? 'ترخيص دائم مدى الحياة بدون رسوم دورية' : isFr ? 'Licence perpétuelle à vie • Facture proforma & convention' : 'Perpetual lifetime license • Official invoice'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLicenseModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Plan Recap Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#221F1C] to-[#171618] border border-[#C4785A]/30 mb-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#C4785A] tracking-wider">
                  {isAr ? 'الخطة المطلوبة' : isFr ? 'Formule sélectionnée' : 'Selected Tier'}
                </span>
                <div className="text-base font-black text-white">
                  {SUBSCRIPTION_PLANS.find((p) => p.tier === selectedPlanTier)?.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold font-mono text-[#E09070]">
                  {SUBSCRIPTION_PLANS.find((p) => p.tier === selectedPlanTier)?.[isAr ? 'priceAr' : isFr ? 'priceFr' : 'priceEn']}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {isAr ? 'دفعة واحدة لمدى الحياة' : isFr ? 'Paiement unique à vie' : 'One-time payment'}
                </div>
              </div>
            </div>

            {/* Contact & Settlement Channels */}
            <div className="space-y-2 mb-3.5 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/5 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#C4785A]" />
                  <span>{isAr ? 'قنوات الدفع المعتمدة بالدينار' : isFr ? 'Canaux de règlement en Algérie' : 'Algerian Payment Options'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                  <div>• Virement Postal CCP / SFP 01</div>
                  <div>• Virement Bancaire (BNA, BEA, CPA)</div>
                  <div>• Application BaridiMob</div>
                  <div>• Règlement espèces en agence</div>
                </div>
              </div>

              {/* Commercial hotline & WhatsApp */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://wa.me/213550123456?text=${encodeURIComponent(
                    `Bonjour, je souhaite acquérir la licence Atrium OS ${selectedPlanTier.toUpperCase()} pour mon établissement "${workspaceName}".`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'مراسلة عبر واتساب' : isFr ? 'Commander via WhatsApp' : 'Order via WhatsApp'}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>

                <a
                  href="tel:+213550123456"
                  className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <Phone className="w-3.5 h-3.5 text-[#C4785A]" />
                  <span>+213 (0) 550 12 34 56</span>
                </a>
              </div>
            </div>

            {/* 1-Click Instant Demo Voucher generator */}
            <div className="p-3 rounded-xl bg-[#201D1A] border border-dashed border-[#C4785A]/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C4785A] flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#C4785A]" />
                  {isAr ? 'التقييم والتجربة الفورية' : isFr ? 'Évaluation & Essai immédiat' : 'Instant Evaluation Mode'}
                </span>
                <span className="text-[10px] text-neutral-400">Sandbox Code</span>
              </div>
              <p className="text-[11px] text-neutral-300 mb-2 leading-relaxed">
                {isAr
                  ? 'يمكنك تفعيل قسيمة ترخيص تجريبية معتمدة لهذا المستوى فوراً ومتابعة الإعداد:'
                  : isFr
                  ? 'Vous pouvez insérer automatiquement un voucher de démonstration actif pour ce niveau :'
                  : 'You can instantly insert an active demonstration voucher for this tier:'}
              </p>
              <button
                type="button"
                onClick={() => {
                  const demoCode =
                    selectedPlanTier === 'starter'
                      ? 'ATR-STARTER-LIFE-2026-X89K'
                      : selectedPlanTier === 'enterprise'
                      ? 'ATR-ENTERPRISE-LIFE-2026-X89K'
                      : 'ATR-PRO-LIFE-2026-X89K';
                  setVoucherCode(demoCode);
                  setTestVoucherCopied(true);
                  setPaidVoucherError(null);
                  setTimeout(() => {
                    setShowLicenseModal(false);
                    setTestVoucherCopied(false);
                  }, 450);
                }}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  testVoucherCopied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#C4785A] hover:bg-[#b3684a] text-white shadow-md'
                }`}
              >
                {testVoucherCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تم تطبيق القسيمة بنجاح!' : isFr ? 'Voucher appliqué avec succès !' : 'Voucher Applied!'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isAr
                        ? `تطبيق رمز تجريبي: ATR-${selectedPlanTier.toUpperCase()}-LIFE-2026-X89K`
                        : isFr
                        ? `Appliquer le voucher test ATR-${selectedPlanTier.toUpperCase()}-LIFE-2026-X89K`
                        : `Apply demo voucher ATR-${selectedPlanTier.toUpperCase()}-LIFE-2026-X89K`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding Bar (Compact, Single-Line, Viewport Budget) */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-[11px] text-neutral-400 border-t border-white/5 shrink-0">
        <span>© 2026 Atrium ERP & CRM. All rights reserved.</span>
        <span>Version 4.3 • Algeria & MENA</span>
      </footer>
    </div>
  );
};

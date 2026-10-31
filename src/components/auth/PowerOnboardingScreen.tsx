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
  Image as ImageIcon,
  Upload,
  Maximize2,
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
  TrendingUp,
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
import { FiveCubesLogo } from './AtriumMonolith';
import { LabelInput } from '../ui/LabelInput';
import { OnboardingBackdrop } from './OnboardingBackdrop';

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
    badgeFr: 'Essai 14j • Starter',
    badgeAr: 'تجربة 14 يوم • بداية',
    badgeEn: '14d Trial • Starter',
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
    badgeFr: 'Recommandé • Essai 14j',
    badgeAr: 'الأكثر طلباً • تجربة 14 يوم',
    badgeEn: 'Popular • 14d Trial',
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
    badgeFr: 'Essai 14j • Grand Réseau',
    badgeAr: 'تجربة 14 يوم • كبرى',
    badgeEn: '14d Trial • Multi-Sites',
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
  const { completeOnboarding, language } = useAtriumStore();

  // Image Showcase / Placeholder State for Right Column
  const PREVIEW_SLIDES = useMemo(
    () => [
      {
        id: 'slide_1',
        src: '/slides/slide_1.jpg',
        labelFr: 'Équipe & Direction Opérationnelle',
        labelAr: 'الفريق والإدارة التشغيلية',
        labelEn: 'Team & Operations',
        tag: '01',
      },
      {
        id: 'slide_2',
        src: '/slides/slide_2.jpg',
        labelFr: 'Cockpit & Espaces de Travail',
        labelAr: 'لوحة القيادة ومساحة العمل',
        labelEn: 'Workspace & Cockpit',
        tag: '02',
      },
      {
        id: 'slide_3',
        src: '/slides/slide_3.jpg',
        labelFr: 'Point de Vente & Encaissements',
        labelAr: 'نقطة البيع والتحصيل',
        labelEn: 'Smart POS & Settlement',
        tag: '03',
      },
      {
        id: 'placeholder',
        src: '',
        labelFr: 'Emplacement Libre / Mockup Frame',
        labelAr: 'إطار مخصص لإضافة صورة',
        labelEn: 'Custom Image Placeholder',
        tag: '04',
      },
    ],
    []
  );

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [customUploadedImage, setCustomUploadedImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setCustomUploadedImage(evt.target.result as string);
          setActiveSlideIndex(3);
        }
      };
      reader.readAsDataURL(file);
    }
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
  const [selectedGoalId, setSelectedGoalId] = useState<UniversalStrategicGoalId>('goal_structure_processes');
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
    setPaidVoucherError(null);
    const finalBusinessName = workspaceName.trim() || 'Mon Entreprise Atrium';
    const finalBranchName = 'Siège Principal';

    const isVoucherValid = voucherValidation && voucherValidation.isValid;
    const isTrial = selectedPlanTier !== 'free' && !isVoucherValid;

    const params: OnboardingParams = {
      fullName: fullName.trim() || 'Admin Atrium',
      email: email.trim() || 'contact@atrium-dz.com',
      password: password.trim() || 'Atrium2026!',
      phone: phone.trim() || '+213 550 12 34 56',
      businessName: finalBusinessName,
      category: activeCategory,
      branchName: finalBranchName,
      branchAddress: branchAddress.trim(),
      voucherCode: isVoucherValid ? voucherCode.trim() : undefined,
      planTier: selectedPlanTier,
      isTrial,
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
    <OnboardingBackdrop
      variant="dark"
      ribPitch={14}
      ribOpacity={0.12}
      blur={3}
      dir={isAr ? 'rtl' : 'ltr'}
      className="dark selection:bg-[#E64A19] selection:text-white"
    >

      {/* Main Two-Column Workstation Canvas — Spread Out to the Sides */}
      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-20 py-4 flex-1 min-h-0 flex items-center justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-20 items-center w-full max-h-full">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: THE FOCUSED SINGLE QUESTION CARD (HIGGSFIELD SPECIFICATION)  */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center max-w-xl w-full lg:mr-auto justify-self-start p-4 sm:p-5 rounded-3xl onboarding-glass-card">
            
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
                        ? 'w-7 sm:w-8 bg-gradient-to-r from-[#F4511E] to-[#E64A19] shadow-[0_0_12px_rgba(230,74,25,0.7)]'
                        : isCompleted
                        ? 'w-3.5 sm:w-4 bg-[#F0DACF]/50 hover:bg-[#F0DACF]/80'
                        : 'w-3.5 sm:w-4 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                );
              })}
            </div>

            {/* Question Card Header (Compact, Responsive, No Multiline Sprawl) */}
            <div className="mb-3 sm:mb-4">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#FFF5EE] mb-1 leading-snug">
                {questionsMeta[currentStep]?.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#F0DACF] leading-relaxed line-clamp-1 sm:line-clamp-none">
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

                  {/* Elegant Glass-Matching Divider */}
                  <div className="relative flex items-center justify-center my-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[rgba(232,98,44,0.18)]" />
                    </div>
                    <span className="relative px-3.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-[#F0DACF] bg-[rgba(20,17,15,0.7)] border border-[rgba(232,98,44,0.25)] rounded-full backdrop-blur-md shadow-xs">
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
                      prefix={<User className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={42}
                      corner={12}
                    />

                    <LabelInput
                      field="email"
                      type="email"
                      label={isAr ? 'البريد الإلكتروني المهني' : isFr ? 'E-mail professionnel' : 'Work Email'}
                      value={email}
                      onChange={(val) => setEmail(String(val))}
                      prefix={<Mail className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={42}
                      corner={12}
                    />

                    <LabelInput
                      field="password"
                      type="password"
                      label={isAr ? 'كلمة المرور' : isFr ? 'Mot de passe sécurisé' : 'Secure Password'}
                      value={password}
                      onChange={(val) => setPassword(String(val))}
                      prefix={<Lock className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={42}
                      corner={12}
                    />
                  </div>

                  {/* Terms Checkbox with High-Contrast Warm Text */}
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="rounded border-[rgba(232,98,44,0.3)] bg-[rgba(20,17,15,0.6)] text-[#E8622C] focus:ring-[#E8622C] cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-[#D9BEB0] cursor-pointer select-none">
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
                            ? 'bg-[rgba(232,98,44,0.14)] border-[#E8622C] shadow-[0_0_16px_rgba(232,98,44,0.3)]'
                            : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] hover:border-[rgba(232,98,44,0.35)] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-[rgba(232,98,44,0.3)]'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-[#FFF5EE] mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-[#D9BEB0] leading-snug">{item.desc}</span>
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
                        id: 'goal_structure_processes' as const,
                        icon: Building2,
                        badge: isAr ? 'تنظيم وهيكلة' : isFr ? 'Organisation & Clarté' : 'Structure & Workflows',
                        title: isAr ? 'هيكلة النشاط والعمليات اليومية' : isFr ? 'Structurer mon activité & mes flux' : 'Structuring Your Business & Workflows',
                        summary: isAr
                          ? 'توحيد ملفات الزبائن 360°، مساحات عمل مركزية ومتابعة دقيقة دون تشتت إداري.'
                          : isFr
                          ? 'Standardisation des flux, fiches clients 360° et pilotage centralisé sans dispersion.'
                          : 'Standardize workflows, 360° customer records & centralized control without clutter.',
                      },
                      {
                        id: 'goal_connect_team' as const,
                        icon: Users,
                        badge: isAr ? 'تنسيق الفريق والصلاحيات' : isFr ? 'Équipe & Multi-rôles' : 'Team & Roles',
                        title: isAr ? 'ربط وتنسيق فريق العمل' : isFr ? 'Connecter & coordonner mon équipe' : 'Connecting & Coordinating My Team',
                        summary: isAr
                          ? 'مساحات مخصصة لكل دور (المسؤول، الصندوق، الميدان، المحاسبة)، كود PIN وسجل العمليات.'
                          : isFr
                          ? 'Espaces dédiés par rôle (Gérant, Caisse, Terrain, Compta), bascule rapide par code PIN et journal d’audit.'
                          : 'Role-based workspaces (Manager, Cashier, Field, Accounting), fast PIN codes & operator audit logs.',
                      },
                      {
                        id: 'goal_secure_cashflow' as const,
                        icon: Receipt,
                        badge: isAr ? 'المالية والمطابقة' : isFr ? 'Finances & Rapprochement' : 'Cashflow & Treasury',
                        title: isAr ? 'تأمين المقابيض والسيولة المالية' : isFr ? 'Sécuriser mes encaissements & trésorerie' : 'Securing Cashflow & Daily Revenue',
                        summary: isAr
                          ? 'إغلاق الصندوق اليومي Z، قبول الدفع المتعدد (نقداً، بريدي موب، CIB) والرسم الجبائي.'
                          : isFr
                          ? 'Clôture journalière de caisse (Z), encaissements multi-canaux (Espèces, BaridiMob, CIB) et timbre fiscal.'
                          : 'Daily cash drawer Z-reports, multi-tender payments (Cash, BaridiMob, CIB) and fiscal compliance.',
                      },
                      {
                        id: 'goal_client_retention' as const,
                        icon: TrendingUp,
                        badge: isAr ? 'الولاء ومؤشرات الأداء' : isFr ? 'Fidélisation & Croissance' : 'Retention & Growth',
                        title: isAr ? 'تعزيز ولاء الزبائن والنمو' : isFr ? 'Fidéliser mes clients & croissance' : 'Customer Retention & Growth Radar',
                        summary: isAr
                          ? 'سجل كامل للتعاملات، تنبيهات استباقية للعملاء ورادار مباشر لمتابعة الأداء.'
                          : isFr
                          ? 'Historique complet des interactions, alertes proactives et radar de performance en direct.'
                          : 'Complete interaction history, smart inactivity reminders, and real-time business health radar.',
                      },
                    ].map((goal) => {
                      const isSelected = selectedGoalId === goal.id;
                      const Icon = goal.icon;
                      return (
                        <div
                          key={goal.id}
                          onClick={() => handleConfirmGoalAndContinue(goal.id)}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group ${
                            isSelected
                              ? 'bg-[rgba(232,98,44,0.14)] border-[#E8622C] shadow-[0_0_16px_rgba(232,98,44,0.3)]'
                              : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] hover:border-[rgba(232,98,44,0.35)] hover:bg-white/[0.07]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-semibold text-[#D9BEB0] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                                {goal.badge}
                              </span>
                            </div>
                            <h3 className="font-bold text-xs sm:text-sm text-[#FFF5EE] mb-0.5">{goal.title}</h3>
                            <p className="text-[11px] text-[#D9BEB0] leading-snug line-clamp-2 mb-2">{goal.summary}</p>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGoalModal(goal.id);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-gradient-to-r hover:from-[#C4785A] hover:to-[#E8622C] hover:text-white text-[#F0DACF] text-xs font-semibold border border-[rgba(232,98,44,0.2)] hover:border-transparent transition-all cursor-pointer group/btn"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#FF8A4C] group-hover/btn:text-white" />
                              <span>{isAr ? 'عرض المخطط التنفيذي' : isFr ? 'Voir le schéma directeur' : 'Inspect Blueprint'}</span>
                            </button>
                            <div
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'border-[#E8622C] bg-[#E8622C] text-white' : 'border-[rgba(232,98,44,0.3)] bg-white/5 text-[#D9BEB0]'
                              }`}
                              title={isAr ? 'اختيار ومتابعة' : isFr ? 'Sélectionner & continuer' : 'Select & continue'}
                            >
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-[10px] text-[#D9BEB0] pt-0.5">
                    {isAr
                      ? '💡 انقر على البطاقة للمتابعة الفورية، أو اضغط "عرض المخطط التنفيذي" لمعاينة الآليات والأدوات المدمجة'
                      : isFr
                      ? '💡 Cliquez sur une carte pour continuer, ou sur "Voir le schéma directeur" pour inspecter les outils réels'
                      : '💡 Click any card to proceed, or click "Inspect Blueprint" to examine real platform tools and mechanisms'}
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
                            ? 'bg-[rgba(232,98,44,0.14)] border-[#E8622C] shadow-[0_0_16px_rgba(232,98,44,0.3)]'
                            : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] hover:border-[rgba(232,98,44,0.35)] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-[rgba(232,98,44,0.3)]'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-[#FFF5EE] mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-[#D9BEB0] leading-snug">{item.desc}</span>
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
                            ? 'bg-[rgba(232,98,44,0.14)] border-[#E8622C] shadow-[0_0_16px_rgba(232,98,44,0.3)]'
                            : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] hover:border-[rgba(232,98,44,0.35)] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isSelected
                                ? 'bg-[rgba(232,98,44,0.2)] border-[rgba(232,98,44,0.4)] text-[#FF8A4C]'
                                : 'bg-white/5 border-white/10 text-[#D9BEB0]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-[#FFF5EE] mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-[#D9BEB0] leading-snug">{item.desc}</span>
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
                            ? 'bg-[rgba(232,98,44,0.14)] border-[#E8622C] shadow-[0_0_16px_rgba(232,98,44,0.3)]'
                            : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] hover:border-[rgba(232,98,44,0.35)] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-[rgba(232,98,44,0.3)]'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-[#FFF5EE] mb-0.5">{item.title}</span>
                        <span className="text-[11px] text-[#D9BEB0] leading-snug">{item.desc}</span>
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
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#FF8A4C] pointer-events-none" />
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
                      className="w-full bg-white/[0.05] border border-[rgba(232,98,44,0.22)] focus:border-[#E8622C] rounded-xl py-2 pl-9 pr-3 text-xs text-[#FFF5EE] placeholder-[#D9BEB0]/60 outline-none"
                    />
                  </div>

                  {/* Vertical Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedCatalogCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer font-medium ${
                        selectedCatalogCategoryFilter === 'all'
                          ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white shadow-xs'
                          : 'bg-white/5 text-[#D9BEB0] hover:text-white'
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
                              ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white shadow-xs'
                              : 'bg-white/5 text-[#D9BEB0] hover:text-white'
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
                              ? 'bg-[rgba(232,98,44,0.14)] border-[#E8622C] shadow-[0_0_16px_rgba(232,98,44,0.3)]'
                              : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] hover:border-[rgba(232,98,44,0.35)] hover:bg-white/[0.07]'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-semibold text-[#FFF5EE] truncate">{title}</span>
                            <span className="text-[10px] text-[#D9BEB0] truncate">{badgeText}</span>
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-[rgba(232,98,44,0.3)] group-hover:border-[rgba(232,98,44,0.5)]'
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
                              ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] border-[#E8622C] text-white shadow-[0_0_14px_rgba(232,98,44,0.4)]'
                              : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] text-[#F0DACF] hover:border-[rgba(232,98,44,0.35)] hover:text-white'
                          }`}
                        >
                          <Compass className="w-3.5 h-3.5 opacity-80 text-[#FF8A4C]" />
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
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-[rgba(232,98,44,0.25)] backdrop-blur-sm flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(232,98,44,0.18)] border border-[rgba(232,98,44,0.3)] flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-[#FF8A4C]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF8A4C] truncate">
                          {isAr ? 'النظام المقترح وفق نشاطك' : isFr ? 'Système Métier Calibré' : 'Calibrated Vertical Engine'}
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-[#FFF5EE] truncate">
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
                        className="p-1 text-[#D9BEB0] hover:text-white transition-colors cursor-pointer"
                        title={isAr ? 'تغيير يدوي' : isFr ? 'Changer' : 'Change'}
                      >
                        {isOverrideSelectorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Manual Category Override Dropdown (If expanded) */}
                  {isOverrideSelectorOpen && (
                    <div className="p-2 rounded-xl bg-black/40 border border-[rgba(232,98,44,0.2)] max-h-32 overflow-y-auto space-y-1 text-xs backdrop-blur-md">
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
                                ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white font-semibold'
                                : 'hover:bg-white/5 text-[#F0DACF]'
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
                      prefix={<Building2 className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={42}
                      corner={12}
                    />

                    <LabelInput
                      field="phone"
                      type="tel"
                      label={isAr ? 'رقم هاتف الاتصال' : isFr ? 'Téléphone de contact' : 'Contact Phone'}
                      value={phone}
                      onChange={(val) => setPhone(String(val))}
                      prefix={<Phone className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={42}
                      corner={12}
                    />
                  </div>

                  {/* Section 2: Subscription Plan Switcher */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#D9BEB0]">
                        {isAr ? 'اختر خطة التشغيل المناسبة :' : isFr ? 'Choisissez votre plan Atrium OS :' : 'Select your Atrium OS Plan:'}
                      </label>
                      <span className="text-[10px] text-[#D9BEB0]">
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
                                ? 'bg-[rgba(232,98,44,0.14)] border-[#E8622C] shadow-[0_0_16px_rgba(232,98,44,0.35)]'
                                : 'bg-white/[0.04] border-[rgba(232,98,44,0.18)] hover:border-[rgba(232,98,44,0.35)] hover:bg-white/[0.07]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  plan.isRecommended
                                    ? 'bg-gradient-to-r from-[#C4785A] to-[#E8622C] text-white shadow-xs'
                                    : plan.tier === 'free'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-white/10 text-[#F0DACF]'
                                }`}
                              >
                                {badge}
                              </span>
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                                  isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-[rgba(232,98,44,0.3)]'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </div>
                            <span className="font-extrabold text-xs sm:text-sm text-[#FFF5EE]">{plan.name}</span>
                            <span className="font-mono text-xs font-bold text-[#FF8A4C] mt-0.5">{price}</span>
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
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[rgba(232,98,44,0.2)] space-y-2">
                        {/* 14-Day Free Trial Notice Banner */}
                        <div className="p-2 rounded-lg bg-[rgba(232,98,44,0.15)] border border-[rgba(232,98,44,0.3)] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-[#FFF5EE]">
                            <Sparkles className="w-4 h-4 text-[#FF8A4C] shrink-0" />
                            <span className="text-[11px]">
                              {isAr
                                ? `✨ نمط تجريبي مجاني 14 يوماً مفعل تلقائياً لخطة ${selectedPlanTier.toUpperCase()} • دخول مباشر بدون بطاقة بنكية.`
                                : isFr
                                ? `✨ Mode Essai Gratuit 14 Jours inclus (${selectedPlanTier.toUpperCase()}) • Accès direct illimité sans carte bancaire.`
                                : `✨ 14-Day Free Trial included (${selectedPlanTier.toUpperCase()}) • Direct full access with zero credit card required.`}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex-1">
                            <LabelInput
                              field="voucherCode"
                              label={
                                isAr
                                  ? `رمز قسيمة ترخيص دائم (${selectedPlanTier.toUpperCase()}) - اختياري`
                                  : isFr
                                  ? `Code voucher licence à vie (${selectedPlanTier.toUpperCase()}) - optionnel`
                                  : `Lifetime license voucher (${selectedPlanTier.toUpperCase()}) - optional`
                              }
                              value={voucherCode}
                              onChange={(val) => {
                                setVoucherCode(String(val).toUpperCase());
                                setPaidVoucherError(null);
                              }}
                              prefix={<KeyRound className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                              height={40}
                              corner={10}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowLicenseModal(true)}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[#F0DACF] hover:text-white text-xs font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#FF8A4C]" />
                            <span>
                              {isAr ? 'طلب ترخيص دائم' : isFr ? 'Demander une licence' : 'Request License'}
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
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions (Unified Navigation Contract: Back on all, Continue only when needed) */}
            <div className="mt-3 sm:mt-4 pt-3 border-t border-[rgba(232,98,44,0.18)] flex items-center justify-between shrink-0">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#D9BEB0] hover:text-[#FFF5EE] hover:bg-white/5 transition-all cursor-pointer active:scale-95"
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
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C4552A] to-[#E64A19] hover:from-[#d84315] hover:to-[#f4511e] shadow-[0_4px_20px_rgba(230,74,25,0.45)] transition-all cursor-pointer active:scale-95 ml-auto"
                >
                  <span>{isAr ? 'متابعة' : isFr ? 'Continuer' : 'Continue'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 2: Continue button with selected goal */}
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C4552A] to-[#E64A19] hover:from-[#d84315] hover:to-[#f4511e] shadow-[0_4px_20px_rgba(230,74,25,0.45)] transition-all cursor-pointer active:scale-95 ml-auto"
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
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C4552A] to-[#E64A19] hover:from-[#d84315] hover:to-[#f4511e] shadow-[0_4px_20px_rgba(230,74,25,0.45)] transition-all cursor-pointer active:scale-95 ml-auto"
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
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C4552A] to-[#E64A19] hover:from-[#d84315] hover:to-[#f4511e] shadow-[0_6px_24px_rgba(230,74,25,0.5)] transition-all cursor-pointer active:scale-95 ml-auto"
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
          {/* RIGHT COLUMN: TALL IMAGE PLACEHOLDER PREVIEW (PRESERVED WIDTH, TALLER)    */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 xl:col-span-5 hidden lg:flex flex-col items-end justify-center w-full">
            <div className="relative w-full max-w-sm lg:max-w-md lg:ml-auto justify-self-end p-5 rounded-3xl onboarding-glass-card overflow-hidden min-h-[660px] xl:min-h-[720px] flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              
              {/* Ambient Radiant Glow */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-35 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #F4511E 0%, #E64A19 32%, #782307 65%, transparent 80%)' }}
              />

              {/* Header: Brand Mark & Status */}
              <div className="relative z-10 flex items-center justify-between pb-3 mb-2 border-b border-[rgba(230,74,25,0.20)]">
                <div className="flex items-center gap-2">
                  <FiveCubesLogo size={22} cubeColor="#F4511E" />
                  <span className="text-xs font-extrabold tracking-wider uppercase text-[#FFF5EE]">
                    Atrium <span className="text-[#F4511E]">OS</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(230,74,25,0.14)] border border-[rgba(230,74,25,0.28)] text-[#F4511E] text-[10px] font-semibold">
                  <ImageIcon className="w-3 h-3 text-[#F4511E]" />
                  <span>{isAr ? 'معاينة الصور' : isFr ? "Aperçu d'images" : 'Image Showcase'}</span>
                </div>
              </div>

              {/* Central Tall Image Frame & Interactive Placeholder */}
              <div className="relative z-10 flex-1 my-2 flex flex-col justify-center">
                {(() => {
                  const activeSlide = PREVIEW_SLIDES[activeSlideIndex];
                  const hasCustom = activeSlideIndex === 3 && customUploadedImage;
                  const displaySrc = hasCustom ? customUploadedImage! : activeSlide.src;

                  return (
                    <div className="relative w-full h-[460px] xl:h-[500px] rounded-2xl overflow-hidden border border-[rgba(230,74,25,0.28)] bg-[rgba(12,10,9,0.75)] p-2.5 flex flex-col justify-between group">
                      {displaySrc ? (
                        <>
                          <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-black/60">
                            <img
                              src={displaySrc}
                              alt={activeSlide.labelFr}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                            {/* Subtle dark gradient overlay for legible text badges */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                            {/* Top Floating Badge */}
                            <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[rgba(230,74,25,0.3)] text-[10px] font-semibold text-[#FFF5EE]">
                                {isAr ? activeSlide.labelAr : isFr ? activeSlide.labelFr : activeSlide.labelEn}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[rgba(230,74,25,0.25)] backdrop-blur-md text-[#F4511E] text-[10px] font-mono font-bold">
                                {activeSlideIndex + 1} / {PREVIEW_SLIDES.length}
                              </span>
                            </div>

                            {/* Interactive Prev/Next Navigation Arrows */}
                            <div className="absolute inset-y-0 left-2 flex items-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : PREVIEW_SLIDES.length - 1));
                                }}
                                title={isAr ? 'الصورة السابقة' : isFr ? 'Image précédente' : 'Previous image'}
                                className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-[#F0DACF] hover:text-white border border-white/10 transition-all cursor-pointer backdrop-blur-md active:scale-95"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute inset-y-0 right-2 flex items-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSlideIndex((prev) => (prev < PREVIEW_SLIDES.length - 1 ? prev + 1 : 0));
                                }}
                                title={isAr ? 'الصورة التالية' : isFr ? 'Image suivante' : 'Next image'}
                                className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-[#F0DACF] hover:text-white border border-white/10 transition-all cursor-pointer backdrop-blur-md active:scale-95"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Bottom Label & Format Info */}
                            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-[10px] pointer-events-none">
                              <span className="text-[#F0DACF] font-medium truncate max-w-[200px]">
                                {isAr ? activeSlide.labelAr : isFr ? activeSlide.labelFr : activeSlide.labelEn}
                              </span>
                              <span className="text-[#F4511E] font-mono text-[9px] uppercase tracking-wider">
                                1280×800 HD
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Architectural Empty Placeholder Frame */
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-full rounded-xl border-2 border-dashed border-[rgba(230,74,25,0.38)] bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group/placeholder"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-[rgba(230,74,25,0.14)] border border-[rgba(230,74,25,0.32)] flex items-center justify-center mb-4 group-hover/placeholder:scale-110 transition-transform">
                            <ImageIcon className="w-8 h-8 text-[#F4511E]" />
                          </div>
                          <div className="text-sm font-bold text-[#FFF5EE] mb-1.5">
                            {isAr ? 'مساحة مخصصة للصور والمعاينات' : isFr ? "Emplacement d'Image & Maquette" : 'Image & Mockup Placeholder'}
                          </div>
                          <p className="text-xs text-[#D9BEB0] max-w-xs mb-4 leading-relaxed">
                            {isAr
                              ? 'انقر لتحميل لقطة شاشة، نموذج واجهة أو صورة مخصصة بالحجم الكامل'
                              : isFr
                              ? 'Cliquez pour insérer une capture d’écran, maquette ou visuel produit haute résolution'
                              : 'Click to upload a high-resolution screenshot, UI mockup or product visual'}
                          </p>
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[rgba(230,74,25,0.22)] border border-[rgba(230,74,25,0.38)] text-[#F4511E] text-xs font-semibold group-hover/placeholder:bg-[rgba(230,74,25,0.32)] transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isAr ? 'رفع صورة' : isFr ? 'Téléverser une image' : 'Upload Image'}</span>
                          </div>
                          <div className="mt-4 text-[10px] text-[#BFA395]/70 font-mono">
                            Ratio 16:10 / 4:5 • PNG, JPG, WebP
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Hidden File Input for Custom Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  className="hidden"
                />
              </div>

              {/* Bottom Thumbnail Strip & Controls */}
              <div className="relative z-10 pt-3 border-t border-[rgba(230,74,25,0.18)] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#D9BEB0]">
                  <span className="font-semibold text-[#F0DACF]">
                    {isAr ? 'معارض الشاشات' : isFr ? "Galerie d'écrans" : 'Screen Gallery'}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-semibold text-[#F4511E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{isAr ? 'صورة مخصصة' : isFr ? 'Personnaliser' : 'Custom Image'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {PREVIEW_SLIDES.map((slide, idx) => {
                    const isActive = activeSlideIndex === idx;
                    const hasCustom = idx === 3 && customUploadedImage;
                    const src = hasCustom ? customUploadedImage! : slide.src;

                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`relative rounded-xl overflow-hidden h-14 border transition-all cursor-pointer ${
                          isActive
                            ? 'border-[#F4511E] ring-2 ring-[rgba(230,74,25,0.45)] shadow-[0_0_12px_rgba(230,74,25,0.4)]'
                            : 'border-white/10 hover:border-[rgba(230,74,25,0.3)] opacity-70 hover:opacity-100'
                        }`}
                      >
                        {src ? (
                          <img src={src} alt={slide.tag} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/[0.04] flex flex-col items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-[#F4511E]/80" />
                            <span className="text-[9px] text-[#D9BEB0] font-mono mt-0.5">Mockup</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/75 py-0.5 text-center text-[8px] font-semibold text-[#FFF5EE]">
                          {slide.tag}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Full-Bleed Plain Low-Opacity Text Footer */}
      <footer className="relative z-10 w-full text-center py-3 shrink-0 pointer-events-none">
        <p className="text-[11px] text-[#BFA395]/60 font-medium tracking-wide">
          {isAr
            ? 'أتريوم لنظم التشغيل المؤسسية • منصة متكاملة ومرخصة لبيئة الأعمال الوطنية • إصدار الإنتاج 2026'
            : isFr
            ? 'Atrium OS • Plateforme de Gestion Unifiée & Conformité Réglementaire • Version Production 2026'
            : 'Atrium OS • Unified Operating System & Multi-Vertical Cockpit • Production Edition 2026'}
        </p>
      </footer>

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

    </OnboardingBackdrop>
  );
};

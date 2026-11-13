import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { AtriumMonolith, FiveCubesLogo } from './AtriumMonolith';
import { LabelInput } from '../ui/LabelInput';
import { OnboardingBackdrop } from './OnboardingBackdrop';
import { LiquidContinueButton } from '../ui/liquid/LiquidContinueButton';
import { AtriumButton } from '../ui/AtriumButton';

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
  featuresFr: string[];
  featuresAr: string[];
  featuresEn: string[];
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
    featuresFr: ['1 Établissement & 1 Caisse', '5 Collaborateurs inclus', 'Moteur de vente & Encaissements', 'Bordereaux postaux CCP SFP 01'],
    featuresAr: ['1 مؤسسة و1 نقطة بيع', '5 مستخدمين مشمولين', 'محطة مبيعات وتحصيل سريع', 'حوالات بريدية CCP SFP 01'],
    featuresEn: ['1 Entity & 1 Terminal', '5 Team members included', 'Sales engine & settlements', 'CCP SFP 01 postal slips'],
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
    featuresFr: ['1 Entreprise • 2 Branches', '10 Collaborateurs inclus', 'Facturation B2B & Timbre Fiscal', 'Inventaire & alertes de seuil'],
    featuresAr: ['1 شركة • 2 فروع تشغيلية', '10 موظفين مشمولين', 'الفواتير والدمغة الجبائية', 'تتبع المخزون وتنبيهات النفاذ'],
    featuresEn: ['1 Business • 2 Branches', '10 Team members included', 'B2B invoicing & Stamp duty', 'Stock alerts & inventory log'],
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
    featuresFr: ['3 Sociétés • 5 Branches', 'Collaborateurs illimités', 'Multi-dépôts & transferts inter-sites', 'Rapports en temps réel'],
    featuresAr: ['3 مؤسسات • 5 فروع', 'موظفون غير محدودين', 'مستودعات وتحويلات بين الفروع', 'لوحة قيادة وتحليل فوري'],
    featuresEn: ['3 Businesses • 5 Branches', 'Unlimited team members', 'Multi-depots & inter-branch sync', 'Real-time reports'],
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
    featuresFr: ['Sociétés & Branches illimitées', 'Journal d’audit complet', 'Export fiscal CNAS & TVA', 'Support prioritaire VIP & SLA'],
    featuresAr: ['مؤسسات وفروع غير محدودة', 'سجل تدقيق ومطابقة شامل', 'تصدير جبائي وقانوني كامل', 'دعم فني VIP مخصص وسريع'],
    featuresEn: ['Unlimited Businesses & Branches', 'Full audit log', 'Full CNAS & TVA fiscal exports', 'Dedicated VIP SLA support'],
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

const CATALOG_SECTORS: { id: BusinessCategory | 'all'; labelFr: string; labelAr: string; labelEn: string }[] = [
  { id: 'all', labelFr: 'Tous (160+)', labelAr: 'الكل (160+)', labelEn: 'All (160+)' },
  { id: 'pos_inventory', labelFr: 'Commerce & POS', labelAr: 'تجارة ومطاعم', labelEn: 'Retail & POS' },
  { id: 'appointment_service', labelFr: 'Beauté & Salons', labelAr: 'صالونات وتجميل', labelEn: 'Salon & Beauty' },
  { id: 'medical_clinic', labelFr: 'Santé & Médical', labelAr: 'صحة وعيادات', labelEn: 'Medical Clinic' },
  { id: 'construction_contractor', labelFr: 'BTP & Travaux', labelAr: 'مقاولات وبناء', labelEn: 'Construction' },
  { id: 'freelance_solo', labelFr: 'Freelance & Studio', labelAr: 'مهن حرة واستشارات', labelEn: 'Freelance' },
  { id: 'membership_session', labelFr: 'Sport & Fitness', labelAr: 'رياضة ولياقة', labelEn: 'Fitness & Gym' },
  { id: 'auto_garage', labelFr: 'Garages Auto', labelAr: 'ميكانيك وسيارات', labelEn: 'Auto & Repair' },
  { id: 'trading_commercial', labelFr: 'Négoce & Gros', labelAr: 'تجارة جملة وتوزيع', labelEn: 'Wholesale & Trade' },
  { id: 'project_milestone', labelFr: 'Agences & Projets', labelAr: 'وكالات ومشاريع', labelEn: 'Agencies & Projects' },
  { id: 'education_cohort', labelFr: 'Éducation & Cours', labelAr: 'تعليم وتدريب', labelEn: 'Education' },
  { id: 'legal_accounting', labelFr: 'Droit & Comptabilité', labelAr: 'قانون ومحاسبة', labelEn: 'Legal & Accounting' },
  { id: 'real_estate', labelFr: 'Immobilier', labelAr: 'عقارات', labelEn: 'Real Estate' },
  { id: 'logistics_delivery', labelFr: 'Logistique & Colis', labelAr: 'لوجستيك وتوصيل', labelEn: 'Logistics' },
  { id: 'manufacturing_production', labelFr: 'Ateliers & Industrie', labelAr: 'صناعة وورشات', labelEn: 'Manufacturing' },
  { id: 'rental_booking', labelFr: 'Location & Salles', labelAr: 'تأجير وقاعات', labelEn: 'Rentals & Venues' },
  { id: 'agriculture_farming', labelFr: 'Agriculture & Élevage', labelAr: 'فلاحة وتربية مواشي', labelEn: 'Agri & Farming' },
];

export const PowerOnboardingScreen: React.FC<PowerOnboardingScreenProps> = ({
  onComplete,
  onSkipToDashboard,
}) => {
  const { completeOnboarding, language, isAuthenticated, currentUser, logout } = useAtriumStore();


  const handleReplayIntro = () => {
    try {
      sessionStorage.removeItem('atrium-intro-seen');
    } catch {}
    window.dispatchEvent(new CustomEvent('atrium:replayintro'));
  };

  // Curated Brand Marketing Showcase Imagery (High-Speed Optimized WebP)
  const PREVIEW_SLIDES = useMemo(
    () => [
      {
        id: 'chaos_archives',
        src: '/assets/aistudio/chaos_archives.webp',
        alt: 'Chaos des archives et paperasse manuelle',
      },
      {
        id: 'souvenirs_velours',
        src: '/assets/aistudio/souvenirs_velours.webp',
        alt: 'Surcharge et processus administratifs fragmentés',
      },
      {
        id: 'chaos_vers_serenite',
        src: '/assets/aistudio/du_chaos_vers_serenite.webp',
        alt: 'Du chaos vers la sérénité avec Atrium OS',
      },
      {
        id: 'reseau_futuriste',
        src: '/assets/aistudio/reseau_futuriste.webp',
        alt: 'Réseau futuriste d’espaces de travail interconnectés',
      },
    ],
    []
  );

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Instant browser cache preloading to eliminate initial load latency
  useEffect(() => {
    PREVIEW_SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.src;
    });
  }, [PREVIEW_SLIDES]);

  // Auto-swipe marketing showcase images smoothly every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % PREVIEW_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [PREVIEW_SLIDES.length]);

  // Stage 2: 10 Conversational Question Cards (Indices 0 to 9)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [step9WideView, setStep9WideView] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        if (isAr) {
          setCurrentStep((prev) => Math.max(0, prev - 1));
        } else {
          setCurrentStep((prev) => Math.min(9, prev + 1));
        }
      } else {
        if (isAr) {
          setCurrentStep((prev) => Math.min(9, prev + 1));
        } else {
          setCurrentStep((prev) => Math.max(0, prev - 1));
        }
      }
    }
    setTouchStartX(null);
  };

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
    }, 60);
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
    }, 60);
  };

  const handleSelectWorkflow = (id: typeof dailyWorkflow) => {
    setDailyWorkflow(id);
    setTimeout(() => {
      setCurrentStep(4);
    }, 60);
  };

  const handleSelectTeamScale = (id: typeof teamScale) => {
    setTeamScale(id);
    setTimeout(() => {
      setCurrentStep(5);
    }, 60);
  };

  const handleSelectSettlement = (id: typeof settlementStyle) => {
    setSettlementStyle(id);
    setTimeout(() => {
      setCurrentStep(6);
    }, 60);
  };

  const [customTradeObject, setCustomTradeObject] = useState<CatalogBusinessTrade | null>(null);

  const handleSelectTrade = (trade: CatalogBusinessTrade) => {
    setSelectedTradeId(trade.id);
    if (trade.id.startsWith('custom_')) {
      setCustomTradeObject(trade);
    }
    setManualCategoryOverride(trade.category);
    setTimeout(() => {
      setCurrentStep(7);
    }, 120);
  };

  const handleSelectReferral = (sourceId: string) => {
    setReferralSource(sourceId);
    setTimeout(() => {
      setCurrentStep(8);
    }, 60);
  };

  // Find currently selected trade in catalog
  const selectedTrade = useMemo(() => {
    if (customTradeObject && selectedTradeId === customTradeObject.id) {
      return customTradeObject;
    }
    return FULL_16_VERTICAL_CATALOG.find((t) => t.id === selectedTradeId) || null;
  }, [selectedTradeId, customTradeObject]);

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
        : "We'll tailor your dashboard and reports to your priorities",
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
        ? 'تخصيص مساحة العمل وهوية المؤسسة'
        : isFr
        ? 'Finalisez votre espace de travail'
        : 'Finalize your workspace identity',
      subtext: isAr
        ? 'حدد اسم مؤسستك ورقم هاتفك لتكوين السجلات والفرع الرئيسي'
        : isFr
        ? 'Nommez votre entreprise et confirmez votre secteur d’activité'
        : 'Name your business and confirm your primary operating vertical',
    },
    {
      title: isAr
        ? 'اختر خطة التشغيل المناسبة لمؤسستك'
        : isFr
        ? 'Choisissez votre forfait Atrium OS'
        : 'Select your Atrium OS Plan',
      subtext: isAr
        ? 'ترخيص دائم لمدى الحياة • إمكانية التقييم والتجربة المجانية 14 يوماً'
        : isFr
        ? 'Licence perpétuelle sans abonnement mensuel • Essai 14 jours inclus'
        : 'Perpetual lifetime license • 14-day full evaluation trial included',
    },
  ];

  // Helper Renderer: Left Card that holds ONLY the marketing showcase images with smooth auto-swipe (no switcher, no upload button, zero text)
  const renderLeftImageCard = () => {
    const activeSlide = PREVIEW_SLIDES[activeSlideIndex] || PREVIEW_SLIDES[0];

    return (
      <div className="bg-[#181512]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-2 sm:p-2.5 flex flex-col justify-between h-full min-h-0 overflow-hidden relative group/card">
        {/* Main Image Viewport with Spatial Momentum Transition */}
        <div className="relative flex-1 min-h-0 w-full h-full rounded-xl overflow-hidden bg-[#100D0B] border border-white/10 select-none">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={activeSlide.id}
              initial={{
                opacity: 0,
                x: isAr ? -50 : 50,
                scale: 1.04,
                filter: 'blur(6px)',
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                filter: 'blur(0px)',
              }}
              exit={{
                opacity: 0,
                x: isAr ? 40 : -40,
                scale: 0.96,
                filter: 'blur(6px)',
              }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1], // Apple fluid deceleration curve
              }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={activeSlide.src}
                alt={activeSlide.alt || 'Atrium OS Showcase'}
                className="w-full h-full object-cover object-center"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </motion.div>
          </AnimatePresence>

          {/* Luxury Edge Lighting Vignette */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.55)] rounded-xl" />

          {/* Sleek Minimal Progress Indicators (Floating Glass Dots, Zero Text) */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
            {PREVIEW_SLIDES.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-500 ${
                  activeSlideIndex === idx
                    ? 'w-6 bg-[#FF8A4C] shadow-[0_0_8px_rgba(255,138,76,0.8)]'
                    : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Helper Renderer: Standalone SaaS Plan Tier Cards
  const renderPlanCards = (isWide: boolean) => (
    <div className={`grid ${isWide ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3' : 'grid-cols-2 gap-2 sm:gap-2.5'} w-full`}>
      {SUBSCRIPTION_PLANS.map((plan) => {
        const isSelected = selectedPlanTier === plan.tier;
        const badge = isAr ? plan.badgeAr : isFr ? plan.badgeFr : plan.badgeEn;
        const price = isAr ? plan.priceAr : isFr ? plan.priceFr : plan.priceEn;
        const features = isAr ? plan.featuresAr : isFr ? plan.featuresFr : plan.featuresEn;

        return (
          <div
            key={plan.tier}
            onClick={() => {
              setSelectedPlanTier(plan.tier);
              setPaidVoucherError(null);
            }}
            className={`flex flex-col justify-between ${isWide ? 'p-3 sm:p-3.5 rounded-2xl' : 'p-2 sm:p-2.5 rounded-xl'} border transition-all duration-200 cursor-pointer relative group text-left ${
              isSelected
                ? 'bg-[rgba(232,98,44,0.12)] border-[#F4511E] shadow-[0_0_20px_rgba(244,81,30,0.25)] ring-1 ring-[#F4511E]'
                : 'bg-white/[0.035] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
            }`}
          >
            {/* Recommended Ribbon */}
            {plan.isRecommended && (
              <div className="absolute -top-2 inset-x-0 flex justify-center pointer-events-none">
                <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-[#C4552A] to-[#E8622C] text-white shadow-md tracking-wider">
                  {badge}
                </span>
              </div>
            )}

            <div>
              {/* Header row */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  isSelected ? 'text-[#FF8A4C]' : 'text-[#D9BEB0]'
                }`}>
                  {plan.isRecommended ? (isAr ? 'الأكثر اختياراً' : isFr ? 'Plus Populaire' : 'Most Popular') : badge}
                </span>
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-white/25'
                  }`}
                >
                  {isSelected && <Check className="w-2 h-2 text-white" />}
                </div>
              </div>

              {/* Plan Name & Pricing */}
              <h3 className={`font-extrabold ${isWide ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} text-[#FFF5EE] tracking-tight`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mt-0.5 mb-0.5">
                <span className={`font-mono ${isWide ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} font-black text-[#FF8A4C] tracking-tight tabular-nums`}>
                  {price}
                </span>
                <span className="text-[9px] text-[#D9BEB0]/70 font-medium">
                  {isAr ? '• مدى الحياة' : isFr ? '• à vie' : '• lifetime'}
                </span>
              </div>
              <p className="text-[9.5px] text-[#D9BEB0]/80 font-medium mb-1.5 line-clamp-1">
                {isAr ? plan.descAr : isFr ? plan.descFr : plan.descEn}
              </p>

              {/* Feature Checklist */}
              <div className="space-y-0.5 pt-1 border-t border-white/10">
                {features.slice(0, isWide ? 4 : 3).map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-1 text-[9.5px] text-[#F0DACF]">
                    <CheckCircle2 className={`w-2.5 h-2.5 shrink-0 mt-0.5 ${
                      isSelected ? 'text-[#FF8A4C]' : 'text-emerald-400'
                    }`} />
                    <span className="leading-tight truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Activation Status */}
            <div className="mt-1.5 pt-1">
              <span className={`w-full py-0.5 rounded-lg text-[10px] font-bold flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-gradient-to-r from-[#C4552A] to-[#E64A19] text-white shadow-xs'
                  : 'bg-white/5 group-hover:bg-white/10 text-[#F0DACF]'
              }`}>
                {isSelected
                  ? (isAr ? 'الخطة المحددة' : isFr ? 'Formule sélectionnée' : 'Selected Plan')
                  : (isAr ? 'اختيار' : isFr ? 'Choisir ce plan' : 'Select tier')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Helper Renderer: Voucher & Free Trial Bar
  const renderVoucherBar = () => (
    <div className="w-full mt-2">
      {selectedPlanTier === 'free' ? (
        <div className="p-1.5 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10.5px]">
              {isAr
                ? 'خطة Free Web مفعّلة فورياً • لا تتطلب أي رمز قسيمة أو دفع مالي لبدء التشغيل.'
                : isFr
                ? 'Édition Free Web incluse • Lancement immédiat sans code voucher ni règlement.'
                : 'Free Web edition included • Instant launch with zero payment or voucher required.'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-1.5 px-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-[#FFF5EE] text-xs">
            <Sparkles className="w-3 h-3 text-[#FF8A4C] shrink-0" />
            <span className="text-[10.5px]">
              {isAr
                ? `نمط تجريبي مجاني 14 يوماً مفعل تلقائياً (${selectedPlanTier.toUpperCase()}) • دخول مباشر دون دفع.`
                : isFr
                ? `Mode Essai Gratuit 14 Jours inclus (${selectedPlanTier.toUpperCase()}) • Accès direct illimité.`
                : `14-Day Free Trial included (${selectedPlanTier.toUpperCase()}) • Direct full access.`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-40 sm:w-48">
              <LabelInput
                field="voucherCode"
                label={
                  isAr
                    ? `قسيمة (${selectedPlanTier.toUpperCase()})`
                    : isFr
                    ? `Voucher (${selectedPlanTier.toUpperCase()})`
                    : `Voucher (${selectedPlanTier.toUpperCase()})`
                }
                value={voucherCode}
                onChange={(val) => {
                  setVoucherCode(String(val).toUpperCase());
                  setPaidVoucherError(null);
                }}
                prefix={<KeyRound className="w-3 h-3 text-[#FF8A4C]" />}
                height={28}
                corner={6}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowLicenseModal(true)}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 text-[#F0DACF] hover:text-white text-[10px] font-semibold border border-white/10 flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#FF8A4C]" />
              <span>
                {isAr ? 'طلب ترخيص' : isFr ? 'Demander licence' : 'Request License'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Helper Renderer: Bottom Navigation Bar
  const renderBottomNavigation = (withMtAuto = false) => (
    <div className={`${withMtAuto ? 'mt-auto' : 'mt-4 sm:mt-5'} pt-3 border-t border-white/10 flex items-center justify-between shrink-0 w-full`}>
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

        {/* Step 0: Continue button */}
        {currentStep === 0 && (
          <div className="ml-auto">
            <LiquidContinueButton
              size="md"
              onClick={() => setCurrentStep(1)}
              id="onb-step-0-continue"
            />
          </div>
        )}

        {/* Step 2: Continue button */}
        {currentStep === 2 && (
          <div className="ml-auto">
            <LiquidContinueButton
              size="md"
              onClick={() => setCurrentStep(3)}
              id="onb-step-2-continue"
            />
          </div>
        )}

        {/* Step 6: Continue button */}
        {currentStep === 6 && (
          <div className="ml-auto">
            <LiquidContinueButton
              size="md"
              onClick={() => setCurrentStep(7)}
              id="onb-step-6-continue"
            />
          </div>
        )}

        {/* Step 8: Workspace Identity Configured -> Advance to Dedicated Step 9 (Subscription Plans) */}
        {currentStep === 8 && (
          <div className="ml-auto">
            <LiquidContinueButton
              size="md"
              onClick={() => setCurrentStep(9)}
              label={isAr ? 'متابعة لاختيار الخطة' : isFr ? 'CONTINUER (FORFAITS)' : 'CONTINUE TO PLANS'}
              id="onb-step-8-continue"
            />
          </div>
        )}

        {/* Step 9: Final Launch Workspace Button */}
        {currentStep === 9 && (
          <div className="ml-auto">
            <LiquidContinueButton
              size="md"
              onClick={handleLaunchWorkspace}
              label={isAr ? 'إطلاق مساحة العمل' : isFr ? 'LANCER MON ESPACE' : 'LAUNCH WORKSPACE'}
              id="onb-step-9-launch"
            />
          </div>
        )}
    </div>
  );

  return (
    <OnboardingBackdrop
      variant="dark"
      ribPitch={14}
      ribOpacity={0.12}
      blur={3}
      dir={isAr ? 'rtl' : 'ltr'}
      className="dark selection:bg-[#E64A19] selection:text-white"
    >

      {/* Main Responsive Workstation Canvas */}
      <main className="relative z-10 w-full max-w-[1600px] 2xl:max-w-[1780px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-2 sm:py-2.5 flex-1 min-h-0 flex flex-col justify-between items-center h-[min(94vh,880px)] min-h-[620px] max-h-[880px] overflow-hidden">
        
        {/* Workstation Body */}
        {currentStep === 9 && step9WideView ? (
          /* Step 9 Wide View: Full-Width 4-Column Layout */
          <div className="w-full flex-1 min-h-0 flex flex-col justify-between overflow-hidden max-w-6xl xl:max-w-7xl mx-auto">
            {/* Authenticated Operator Quick Return & Switch Account Banner */}
            {isAuthenticated && (
              <div className="flex items-center justify-between gap-3 p-2.5 mb-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-medium text-white/85 truncate">
                    {isAr ? 'أنت متصل حالياً:' : isFr ? 'Connecté en tant que :' : 'Signed in as:'}{' '}
                    <strong className="text-white font-semibold">{currentUser?.fullName}</strong>
                  </span>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                    }}
                    className="text-[11px] text-[#FF8A4C] hover:text-[#FFA675] hover:underline cursor-pointer"
                  >
                    {isAr ? 'تسجيل الدخول بحساب آخر' : isFr ? 'Se connecter avec un autre compte' : 'Login with another account'}
                  </button>
                </div>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (onSkipToDashboard) onSkipToDashboard();
                    else onComplete();
                  }}
                  icon={<ArrowRight size={13} className={isAr ? 'rotate-180' : ''} />}
                  iconPosition="right"
                  className="shrink-0"
                >
                  {isAr ? 'العودة لمساحة العمل' : isFr ? "Retour à l'espace" : 'Return to Workspace'}
                </AtriumButton>
              </div>
            )}

            {/* Step Tab / Swipe Indicators (10 Steps: 0 to 9) */}
            <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => {
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
                        ? 'w-10 bg-gradient-to-r from-[#F4511E] to-[#E64A19] shadow-[0_0_12px_rgba(230,74,25,0.7)]'
                        : isCompleted
                        ? 'w-4 bg-[#F0DACF]/50 hover:bg-[#F0DACF]/80'
                        : 'w-4 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between mb-3 shrink-0">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#FF7A30]">
                  {isAr ? 'المرحلة 10 من 10' : isFr ? 'Étape 10 sur 10' : 'Step 10 of 10'}
                </span>
                <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white leading-snug">
                  {questionsMeta[9]?.title}
                </h1>
                {questionsMeta[9]?.subtext && (
                  <p className="mt-1 text-xs sm:text-[13px] text-[#D9BEB0]/80 font-normal leading-relaxed">
                    {questionsMeta[9]?.subtext}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep9WideView(false)}
                className="text-[11px] font-medium text-[#D9BEB0] hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#FF8A4C]" />
                <span>{isFr ? 'Vue avec carte visuelle' : isAr ? 'عرض مع البطاقة المرئية' : 'View with visual card'}</span>
              </button>
            </div>

            <div className="w-full flex-1 min-h-0 overflow-hidden flex flex-col justify-center py-1">
              {renderPlanCards(true)}
              {renderVoucherBar()}
            </div>

            {renderBottomNavigation(true)}
          </div>
        ) : (
          /* Standard 2-Column Workstation: Left Image Card + Right Questionnaire */
          <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row justify-between items-stretch gap-6 lg:gap-10 xl:gap-16 2xl:gap-24 overflow-hidden">
            
            {/* Left Column: Left Card Holding the Images - Docked to the Side */}
            <div className="hidden lg:flex w-full lg:w-[430px] xl:w-[480px] 2xl:w-[520px] shrink-0 h-full min-h-0 flex-col">
              {renderLeftImageCard()}
            </div>

            {/* Right Column: Questionnaire - Vertically Centralized & Balanced */}
            <div
              className="w-full lg:w-[540px] xl:w-[590px] 2xl:w-[640px] shrink-0 h-full min-h-0 flex flex-col justify-center overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-full my-auto flex flex-col max-h-full overflow-hidden py-3 sm:py-5 pr-1">
                {/* Authenticated Operator Quick Return & Switch Account Banner */}
                {isAuthenticated && (
                  <div className="flex items-center justify-between gap-3 p-2.5 mb-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium text-white/85 truncate">
                        {isAr ? 'أنت متصل حالياً:' : isFr ? 'Connecté en tant que :' : 'Signed in as:'}{' '}
                        <strong className="text-white font-semibold">{currentUser?.fullName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                        }}
                        className="text-[11px] text-[#FF8A4C] hover:text-[#FFA675] hover:underline text-left rtl:text-right cursor-pointer mt-0.5"
                      >
                        {isAr ? 'تسجيل الدخول بحساب آخر' : isFr ? 'Se connecter avec un autre compte' : 'Login with another account'}
                      </button>
                    </div>
                    <AtriumButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (onSkipToDashboard) onSkipToDashboard();
                        else onComplete();
                      }}
                      icon={<ArrowRight size={13} className={isAr ? 'rotate-180' : ''} />}
                      iconPosition="right"
                      className="shrink-0"
                    >
                      {isAr ? 'العودة لمساحة العمل' : isFr ? "Retour à l'espace" : 'Return to Workspace'}
                    </AtriumButton>
                  </div>
                )}

                {/* Step Tab / Swipe Indicators (10 Steps: 0 to 9) - Aligned with Right Area Text Boxes */}
                <div className="flex items-center gap-1.5 mb-3 shrink-0">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => {
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
                            ? 'w-10 bg-gradient-to-r from-[#F4511E] to-[#E64A19] shadow-[0_0_12px_rgba(230,74,25,0.7)]'
                            : isCompleted
                            ? 'w-4 bg-[#F0DACF]/50 hover:bg-[#F0DACF]/80'
                            : 'w-4 bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Right Column Header: Title and Step Badge */}
                <div className="mb-3.5 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#FF7A30]">
                      {isAr ? `المرحلة ${currentStep + 1} من 10` : isFr ? `Étape ${currentStep + 1} sur 10` : `Step ${currentStep + 1} of 10`}
                    </span>
                    {currentStep === 9 && (
                      <button
                        type="button"
                        onClick={() => setStep9WideView(true)}
                        className="text-[11px] font-medium text-[#D9BEB0] hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3 text-[#FF8A4C]" />
                        <span>{isFr ? 'Plein écran (4 colonnes)' : isAr ? 'شاشة كاملة (4 أعمدة)' : 'Full screen (4 columns)'}</span>
                      </button>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight leading-snug">
                    {questionsMeta[currentStep]?.title}
                  </h1>
                  {questionsMeta[currentStep]?.subtext && (
                    <p className="mt-1 text-xs sm:text-[13px] text-[#D9BEB0]/80 font-normal leading-relaxed">
                      {questionsMeta[currentStep]?.subtext}
                    </p>
                  )}
                </div>

                {/* Right Column Active Question Content Canvas */}
                <div className="w-full py-1">
              
              {/* ------------------------------------------------------------- */}
              {/* STEP 0: GOOGLE SSO OR WORK EMAIL VIA PROPRIETARY LABELINPUT   */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 0 && (
                <div className="space-y-3 w-full mt-1 sm:mt-2">
                  {/* Primary Google SSO One-Click Experience */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full h-10 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-75 active:scale-[0.99]"
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
                  <div className="relative flex items-center justify-center my-0.5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <span className="relative px-3 py-0.5 text-[9.5px] uppercase font-bold tracking-wider text-[#F0DACF] bg-[rgba(20,17,15,0.7)] border border-white/10 rounded-full backdrop-blur-md shadow-xs">
                      {isAr ? 'أو باستخدام بريدك المهني' : isFr ? 'OU AVEC UN E-MAIL PROFESSIONNEL' : 'OR WITH WORK EMAIL'}
                    </span>
                  </div>

                  {/* Proprietary LabelInput Text Boxes */}
                  <div className="space-y-2.5 pt-0.5">
                    <LabelInput
                      field="fullName"
                      label={isAr ? 'الاسم واللقب للمسؤول' : isFr ? 'Nom & prénom du responsable' : 'Full Name'}
                      value={fullName}
                      onChange={(val) => setFullName(String(val))}
                      prefix={<User className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={38}
                      corner={10}
                    />

                    <LabelInput
                      field="email"
                      type="email"
                      label={isAr ? 'البريد الإلكتروني المهني' : isFr ? 'E-mail professionnel' : 'Work Email'}
                      value={email}
                      onChange={(val) => setEmail(String(val))}
                      prefix={<Mail className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={38}
                      corner={10}
                    />

                    <LabelInput
                      field="password"
                      type="password"
                      label={isAr ? 'كلمة المرور' : isFr ? 'Mot de passe sécurisé' : 'Secure Password'}
                      value={password}
                      onChange={(val) => setPassword(String(val))}
                      prefix={<Lock className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={38}
                      corner={10}
                    />
                  </div>

                  {/* Terms Checkbox with High-Contrast Warm Text */}
                  <div className="pt-0.5 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="rounded border-white/20 bg-[rgba(20,17,15,0.6)] text-[#E8622C] focus:ring-[#E8622C] cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-[11px] text-[#D9BEB0] cursor-pointer select-none">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full mt-1.5 sm:mt-2.5">
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
                        className={`flex flex-col text-left p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ease-out cursor-pointer relative group hover:scale-[1.015] active:scale-[0.99] min-h-[88px] sm:min-h-[94px] justify-between ${
                          isSelected
                            ? 'bg-[rgba(232,98,44,0.08)] border-white/[0.16] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                            : 'bg-white/[0.04] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[rgba(232,98,44,0.18)] text-[#E8622C]' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-white/20 group-hover:border-white/40'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className={`font-semibold text-xs sm:text-[13px] mb-0.5 transition-colors ${
                          isSelected ? 'text-[#E8622C]' : 'text-[#FFF5EE]'
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[10.5px] text-[#D9BEB0] leading-tight line-clamp-2">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 2: WHAT DO YOU WANT TO ACHIEVE (FEATURE BLUEPRINT MODAL) */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 2 && (
                <div className="space-y-2 w-full mt-1 sm:mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {[
                      {
                        id: 'goal_structure_processes' as const,
                        icon: Building2,
                        badge: isAr ? 'تنظيم وهيكلة' : isFr ? 'Organisation & Clarté' : 'Structure & Workflows',
                        title: isAr ? 'هيكلة النشاط والعمليات اليومية' : isFr ? 'Structurer mon activité & mes flux' : 'Structuring Your Business & Workflows',
                        summary: isAr
                          ? 'توحيد ملفات الزبائن، مساحات عمل مركزية ومتابعة دقيقة دون تشتت إداري.'
                          : isFr
                          ? 'Standardisation des flux, fiches clients unifiées et pilotage centralisé sans dispersion.'
                          : 'Standardize workflows, unified customer records & centralized control without clutter.',
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
                        title: isAr ? 'تعزيز ولاء الزبائن والنمو' : isFr ? 'Fidéliser mes clients & croissance' : 'Customer Retention & Growth',
                        summary: isAr
                          ? 'سجل كامل للتعاملات، تنبيهات استباقية للعملاء ومتابعة مباشرة للأداء.'
                          : isFr
                          ? 'Historique complet des interactions, alertes proactives et suivi de performance en direct.'
                          : 'Complete interaction history, smart reminders, and live business health insights.',
                      },
                    ].map((goal) => {
                      const isSelected = selectedGoalId === goal.id;
                      const Icon = goal.icon;
                      return (
                        <div
                          key={goal.id}
                          onClick={() => handleConfirmGoalAndContinue(goal.id)}
                          className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer group hover:scale-[1.015] active:scale-[0.99] ${
                            isSelected
                              ? 'bg-[rgba(232,98,44,0.08)] border-white/[0.16] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                              : 'bg-white/[0.04] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-[rgba(232,98,44,0.18)] text-[#E8622C]' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[9.5px] font-semibold text-[#D9BEB0] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                                {goal.badge}
                              </span>
                            </div>
                            <h3 className={`font-bold text-xs sm:text-[13px] mb-0.5 transition-colors ${
                              isSelected ? 'text-[#E8622C]' : 'text-[#FFF5EE]'
                            }`}>
                              {goal.title}
                            </h3>
                            <p className="text-[10.5px] text-[#D9BEB0] leading-tight line-clamp-2 mb-1.5">{goal.summary}</p>
                          </div>

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGoalModal(goal.id);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#F0DACF] hover:text-white text-[11px] font-semibold border border-white/10 hover:border-white/25 transition-all cursor-pointer group/btn"
                            >
                              <Eye className="w-3 h-3 text-[#FF8A4C] group-hover/btn:text-white" />
                              <span>{isAr ? 'عرض المخطط التنفيذي' : isFr ? 'Voir le schéma directeur' : 'Inspect Blueprint'}</span>
                            </button>
                            <div
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'border-[#E8622C] bg-[#E8622C] text-white' : 'border-white/15 bg-white/5 text-[#D9BEB0] group-hover:border-white/30'
                              }`}
                              title={isAr ? 'اختيار ومتابعة' : isFr ? 'Sélectionner & continuer' : 'Select & continue'}
                            >
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-[9.5px] text-[#D9BEB0] pt-0.5">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full mt-1 sm:mt-2">
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
                        className={`flex flex-col text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 ease-out cursor-pointer relative group hover:scale-[1.015] active:scale-[0.99] ${
                          isSelected
                            ? 'bg-[rgba(232,98,44,0.08)] border-white/[0.16] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                            : 'bg-white/[0.04] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[rgba(232,98,44,0.18)] text-[#E8622C]' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-white/20 group-hover:border-white/40'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className={`font-semibold text-xs sm:text-[13px] mb-0.5 transition-colors ${
                          isSelected ? 'text-[#E8622C]' : 'text-[#FFF5EE]'
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[10.5px] text-[#D9BEB0] leading-tight line-clamp-2">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 4: TEAM SCALE & WORKING HIERARCHY                        */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full mt-1 sm:mt-2">
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
                        className={`flex flex-col text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 ease-out cursor-pointer relative group hover:scale-[1.015] active:scale-[0.99] ${
                          isSelected
                            ? 'bg-[rgba(232,98,44,0.08)] border-white/[0.16] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                            : 'bg-white/[0.04] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[rgba(232,98,44,0.18)] text-[#E8622C]' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                              isSelected
                                ? 'bg-[rgba(232,98,44,0.18)] border-transparent text-[#E8622C]'
                                : 'bg-white/5 border-white/10 text-[#D9BEB0]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <span className={`font-semibold text-xs sm:text-[13px] mb-0.5 transition-colors ${
                          isSelected ? 'text-[#E8622C]' : 'text-[#FFF5EE]'
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[10.5px] text-[#D9BEB0] leading-tight line-clamp-2">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 5: PRIMARY PAYMENT & SETTLEMENT FLOW                     */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 5 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full mt-1 sm:mt-2">
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
                        className={`flex flex-col text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 ease-out cursor-pointer relative group hover:scale-[1.015] active:scale-[0.99] ${
                          isSelected
                            ? 'bg-[rgba(232,98,44,0.08)] border-white/[0.16] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                            : 'bg-white/[0.04] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[rgba(232,98,44,0.18)] text-[#E8622C]' : 'bg-white/5 text-[#F0DACF] group-hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-white/20 group-hover:border-white/40'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <span className={`font-semibold text-xs sm:text-[13px] mb-0.5 transition-colors ${
                          isSelected ? 'text-[#E8622C]' : 'text-[#FFF5EE]'
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[10.5px] text-[#D9BEB0] leading-tight line-clamp-2">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 6: SPECIFIC BUSINESS DOMAIN & 160+ CATALOG SEARCH        */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 6 && (
                <div className="space-y-2.5 w-full mt-1 sm:mt-2 flex flex-col">
                  {/* Search Input Box & Live Match Counter */}
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
                      className="w-full bg-white/[0.05] border border-white/15 focus:border-[#E8622C] rounded-xl py-2 pl-9 pr-28 text-xs text-[#FFF5EE] placeholder-[#D9BEB0]/60 outline-none transition-colors"
                    />
                    <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                      {catalogSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCatalogSearchQuery('')}
                          className="text-[#D9BEB0] hover:text-white p-1 text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                      <span className="text-[10px] font-semibold text-[#FF8A4C] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 pointer-events-none">
                        {filteredCatalogTrades.length} {isAr ? 'نشاط' : isFr ? 'métiers' : 'trades'}
                      </span>
                    </div>
                  </div>

                  {/* Curated Sector Filter Chips (All 16 Verticals, Fluid Scrollable Bar) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-none shrink-0">
                    {CATALOG_SECTORS.map((cat) => {
                      const isFilterActive = selectedCatalogCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCatalogCategoryFilter(cat.id)}
                          className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer font-medium shrink-0 ${
                            isFilterActive
                              ? 'bg-gradient-to-r from-[#d4522f] to-[#E8622C] text-white shadow-xs scale-[1.02]'
                              : 'bg-white/5 border border-white/5 text-[#D9BEB0] hover:text-white hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          {isAr ? cat.labelAr : isFr ? cat.labelFr : cat.labelEn}
                        </button>
                      );
                    })}
                  </div>

                  {/* Trades Grid Container (Scrollable Multi-column, Custom Scrollbar) */}
                  <div className="overflow-y-auto pr-1 h-[210px] max-h-[210px] rounded-xl space-y-1.5 focus:outline-none scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
                    {filteredCatalogTrades.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                        {filteredCatalogTrades.map((trade) => {
                          const isSelected = selectedTradeId === trade.id;
                          const title = isAr ? trade.name.ar : isFr ? trade.name.fr : trade.name.en;
                          const badgeText = isAr ? trade.badge.ar : isFr ? trade.badge.fr : trade.badge.en;
                          return (
                            <button
                              key={trade.id}
                              type="button"
                              onClick={() => handleSelectTrade(trade)}
                              className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all duration-200 ease-out cursor-pointer group hover:scale-[1.015] active:scale-[0.98] min-h-[46px] ${
                                isSelected
                                  ? 'bg-[rgba(232,98,44,0.12)] border-[#E8622C] ring-1 ring-[#E8622C]/40 shadow-[0_4px_20px_rgba(232,98,44,0.3)]'
                                  : 'bg-white/[0.04] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07]'
                              }`}
                            >
                              <div className="flex flex-col min-w-0 pr-1.5">
                                <span className={`text-xs font-semibold truncate transition-colors ${
                                  isSelected ? 'text-[#E8622C]' : 'text-[#FFF5EE]'
                                }`}>
                                  {title}
                                </span>
                                <span className="text-[9.5px] text-[#D9BEB0] truncate">{badgeText}</span>
                              </div>
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'border-[#E8622C] bg-[#E8622C]' : 'border-white/20 group-hover:border-white/40'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty state fallback with option to use custom trade */
                      <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-white/10 flex flex-col items-center justify-center gap-3">
                        <p className="text-xs text-[#D9BEB0]">
                          {isAr
                            ? `لم يتم العثور على أي نشاط مطابق لـ "${catalogSearchQuery}"`
                            : isFr
                            ? `Aucun métier standard trouvé pour "${catalogSearchQuery}"`
                            : `No standard trade found matching "${catalogSearchQuery}"`}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const customTrade: CatalogBusinessTrade = {
                              id: `custom_${Date.now()}`,
                              category: 'project_milestone',
                              name: { fr: catalogSearchQuery, ar: catalogSearchQuery, en: catalogSearchQuery },
                              badge: { fr: 'Sur mesure', ar: 'مخصص', en: 'Custom' },
                              keywords: [catalogSearchQuery.toLowerCase()],
                            };
                            handleSelectTrade(customTrade);
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4522f] to-[#E8622C] text-white text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-md"
                        >
                          {isAr
                            ? `متابعة باستخدام "${catalogSearchQuery}" كنشاط رئيسي`
                            : isFr
                            ? `Continuer avec "${catalogSearchQuery}" comme activité`
                            : `Continue with "${catalogSearchQuery}" as custom trade`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 7: HOW DID YOU HEAR ABOUT ATRIUM? (ZERO SCROLL 3x2 GRID) */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 7 && (
                <div className="w-full mt-1 sm:mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {REFERRAL_SOURCES.map((src) => {
                      const isSelected = referralSource === src.id;
                      const label = isAr ? src.labelAr : isFr ? src.labelFr : src.labelEn;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => handleSelectReferral(src.id)}
                          className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-xl border text-xs font-medium transition-all duration-200 ease-out cursor-pointer hover:scale-[1.015] active:scale-[0.99] ${
                            isSelected
                              ? 'bg-[rgba(232,98,44,0.12)] border-white/[0.16] text-[#E8622C] shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                              : 'bg-white/[0.04] border-white/[0.07] text-[#F0DACF] hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <Compass className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSelected ? 'text-[#E8622C]' : 'text-[#FF8A4C] opacity-80'}`} />
                          <span className="truncate">{label}</span>
                          {isSelected && <Check className="w-3 h-3 ml-auto shrink-0" />}
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
                <div className="space-y-2 w-full mt-1 sm:mt-2">
                  {/* Synthesis Vertical Match Pill */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(232,98,44,0.12)] border border-white/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF8A4C]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#FF8A4C] truncate">
                          {isAr ? 'النظام المقترح وفق نشاطك' : isFr ? 'Système Métier Calibré' : 'Calibrated Vertical Engine'}
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-[#FFF5EE] truncate">
                          {selectedTrade ? (isAr ? selectedTrade.name.ar : isFr ? selectedTrade.name.fr : selectedTrade.name.en) : activeCategoryMeta.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {matchConfidence}% Match
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOverrideSelectorOpen(!isOverrideSelectorOpen)}
                        className="p-1 text-[#D9BEB0] hover:text-white transition-colors cursor-pointer"
                        title={isAr ? 'تغيير يدوي' : isFr ? 'Changer' : 'Change'}
                      >
                        {isOverrideSelectorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Manual Category Override Dropdown (If expanded, Zero Scroll Grid) */}
                  {isOverrideSelectorOpen && (
                    <div className="p-2 rounded-xl bg-black/80 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] backdrop-blur-md">
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
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors cursor-pointer ${
                              isPicked
                                ? 'bg-gradient-to-r from-[#d4522f] to-[#E8622C] text-white font-semibold'
                                : 'hover:bg-white/10 text-[#F0DACF]'
                            }`}
                          >
                            <span className="truncate">{meta.title}</span>
                            {isPicked && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Section 1: Final Workspace Identity Fields using LabelInput */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <LabelInput
                      field="workspaceName"
                      label={isAr ? 'اسم المؤسسة / مساحة العمل' : isFr ? "Nom de l'entreprise ou marque" : 'Workspace / Business Name'}
                      value={workspaceName}
                      onChange={(val) => setWorkspaceName(String(val))}
                      prefix={<Building2 className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={38}
                      corner={10}
                    />

                    <LabelInput
                      field="phone"
                      type="tel"
                      label={isAr ? 'رقم هاتف الاتصال' : isFr ? 'Téléphone de contact' : 'Contact Phone'}
                      value={phone}
                      onChange={(val) => setPhone(String(val))}
                      prefix={<Phone className="w-3.5 h-3.5 text-[#FF8A4C]" />}
                      height={38}
                      corner={10}
                    />
                  </div>

                  {/* Branch Address Summary */}
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#D9BEB0]">
                      <MapPin className="w-3.5 h-3.5 text-[#FF8A4C] shrink-0" />
                      <span className="text-[11px] truncate">
                        {isAr ? 'الفرع التشغيلي الرئيسي :' : isFr ? 'Siège & Établissement principal :' : 'Headquarters & Branch :'}{' '}
                        <strong className="text-[#FFF5EE] font-medium">{branchAddress}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      {isAr ? 'معتمد' : isFr ? 'Siège Actif' : 'Active Site'}
                    </span>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 9: STANDALONE SAAS SUBSCRIPTION PLANS MATRIX (2x2 GRID)   */}
              {/* ------------------------------------------------------------- */}
              {currentStep === 9 && (
                <div className="space-y-1.5 w-full mt-1 sm:mt-2">
                  {renderPlanCards(false)}
                  {renderVoucherBar()}
                </div>
              )}
                </div>

                {/* Right Column Bottom Footer Actions */}
                {renderBottomNavigation(false)}
              </div>
            </div>
          </div>
    )}
    </main>

      {/* Full-Bleed Plain Low-Opacity Text Footer with Replay Intro Trigger */}
      <footer className="relative z-10 w-full text-center py-1.5 shrink-0 flex items-center justify-center gap-4">
        <p className="text-[10px] text-[#BFA395]/60 font-medium tracking-wide pointer-events-none">
          {isAr
            ? 'أتريوم • منصة إدارة الأعمال • 2026'
            : isFr
            ? 'Atrium • Plateforme de Gestion d’Entreprise • 2026'
            : 'Atrium • Business Management Platform • 2026'}
        </p>
        <button
          type="button"
          onClick={handleReplayIntro}
          className="text-[9.5px] text-[#d4522f]/70 hover:text-[#FF8A4C] transition-colors cursor-pointer flex items-center gap-1 font-mono tracking-wider uppercase px-2 py-0.5 rounded border border-[#d4522f]/20 hover:border-[#d4522f]/50 bg-black/30 hover:bg-black/50"
        >
          <span>↺ Replay</span>
        </button>
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
          <div className="relative w-full max-w-lg rounded-2xl bg-[#18181B] border border-[#d4522f]/40 shadow-2xl p-5 text-white animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#d4522f]/20 border border-[#d4522f]/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#d4522f]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {isAr ? 'الحصول على ترخيص Atrium OS' : isFr ? 'Obtenir une licence Atrium OS' : 'Get an Atrium OS License'}
                  </h3>
                  <p className="text-[11px] text-white/70">
                    {isAr ? 'ترخيص دائم مدى الحياة بدون رسوم دورية' : isFr ? 'Licence perpétuelle à vie • Facture proforma & convention' : 'Perpetual lifetime license • Official invoice'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLicenseModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Plan Recap Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#221F1C] to-[#171618] border border-[#d4522f]/30 mb-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#d4522f] tracking-wider">
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
                <div className="text-[10px] text-white/70">
                  {isAr ? 'دفعة واحدة لمدى الحياة' : isFr ? 'Paiement unique à vie' : 'One-time payment'}
                </div>
              </div>
            </div>

            {/* Contact & Settlement Channels */}
            <div className="space-y-2 mb-3.5 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/5 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#d4522f]" />
                  <span>{isAr ? 'قنوات الدفع المعتمدة بالدينار' : isFr ? 'Canaux de règlement en Algérie' : 'Algerian Payment Options'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-white/85">
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
                  className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <Phone className="w-3.5 h-3.5 text-[#d4522f]" />
                  <span>+213 (0) 550 12 34 56</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </OnboardingBackdrop>
  );
};

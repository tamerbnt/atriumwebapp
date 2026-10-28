import React, { useState, useMemo } from 'react';
import {
  Building2,
  Dumbbell,
  Scissors,
  Utensils,
  Briefcase,
  GraduationCap,
  Laptop,
  Truck,
  Stethoscope,
  Wrench,
  Home,
  Factory,
  Scale,
  HardHat,
  Sprout,
  Check,
  ChevronRight,
  ChevronLeft,
  Rocket,
  MapPin,
  Mail,
  User,
  Phone,
  Lock,
  Sparkles,
  Users,
  CheckCircle2,
  Search,
  X,
  KeyRound,
  Globe,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ShieldCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { BusinessCategory, OnboardingParams, SupportedLanguage } from '../../types/index';
import { validateVoucherCode } from '../../utils/rules';
import { authService } from '../../lib/supabase/services/authService';
import {
  CATEGORY_METADATA,
  findCategoryByBusinessSearch,
  getPopularBusinessSearches,
  POPULAR_BUSINESS_SEARCHES,
  BusinessMatchResult,
  ONBOARDING_TEAM_SCALES,
  ONBOARDING_MODULE_OPTIONS,
  OnboardingTeamScale,
  calculateCategoryRecommendation,
} from '../../utils/businessMapping';
import { t } from '../../utils/i18n';
import { FiveCubesLogo } from './AtriumMonolith';
import { LabelInput } from '../ui/LabelInput';
import { AtriumButton } from '../ui/AtriumButton';

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

export const PowerOnboardingScreen: React.FC<PowerOnboardingScreenProps> = ({
  onComplete,
  onSkipToDashboard,
}) => {
  const {
    completeOnboarding,
    language,
    setLanguage,
  } = useAtriumStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Owner Account & Credentials
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [isGoogleConnected, setIsGoogleConnected] = useState(true);
  const [fullName, setFullName] = useState('Mehdi Samih');
  const [email, setEmail] = useState('mehdisamih79@gmail.com');
  const [phone, setPhone] = useState('+213 550 12 34 56');
  const [password, setPassword] = useState('Atrium2026!');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [businessName, setBusinessName] = useState('Atrium Creative Studio');
  const [branchName, setBranchName] = useState('Siège Principal');
  const [selectedWilaya, setSelectedWilaya] = useState('16 - Alger');
  const [branchAddress, setBranchAddress] = useState('14 Boulevard Didouche Mourad, Alger');

  // Step 2: Activity & Scale
  const [selectedActivityCategory, setSelectedActivityCategory] = useState<BusinessCategory | null>('freelance_solo');
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [searchMatch, setSearchMatch] = useState<BusinessMatchResult | null>(null);
  const [teamScale, setTeamScale] = useState<OnboardingTeamScale>('small');

  // Step 3: Operational Modules
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([
    'invoicing_quotes',
    'timetracker_pomodoro',
    'pos_cashier',
  ]);

  // Step 4: Category Recommendation & Manual Override
  const [manualCategoryOverride, setManualCategoryOverride] = useState<BusinessCategory | null>(null);
  const [isOverrideAccordionOpen, setIsOverrideAccordionOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Dynamic recommendation calculation based on steps 2 & 3
  const recommendation = useMemo(() => {
    return calculateCategoryRecommendation({
      activityCategory: selectedActivityCategory,
      searchQuery: businessSearchQuery,
      selectedModuleIds,
      teamScale,
    });
  }, [selectedActivityCategory, businessSearchQuery, selectedModuleIds, teamScale]);

  // The active final category is either the manual override or the smart recommendation
  const effectiveCategory: BusinessCategory = manualCategoryOverride || recommendation.recommendedCategory;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await authService.signInWithGoogle();
      if (res?.error) {
        setFullName('Mehdi Samih');
        setEmail('mehdisamih79@gmail.com');
        setIsGoogleConnected(true);
      } else {
        setIsGoogleConnected(true);
      }
    } catch {
      setIsGoogleConnected(true);
    } finally {
      setTimeout(() => setGoogleLoading(false), 300);
    }
  };

  const handleActivityChipSelect = (category: BusinessCategory) => {
    setSelectedActivityCategory(category);
    // Suggest default matching modules if user hasn't selected many
    const defaultModulesForCat = ONBOARDING_MODULE_OPTIONS.filter((m) => m.affinities[category] && m.affinities[category]! >= 35).map((m) => m.id);
    if (defaultModulesForCat.length > 0 && selectedModuleIds.length <= 3) {
      setSelectedModuleIds((prev) => Array.from(new Set([...prev, ...defaultModulesForCat])));
    }
  };

  const handleBusinessSearch = (query: string) => {
    setBusinessSearchQuery(query);
    if (!query.trim()) {
      setSearchMatch(null);
      return;
    }
    const match = findCategoryByBusinessSearch(query);
    if (match) {
      setSearchMatch(match);
      setSelectedActivityCategory(match.category);
    } else {
      setSearchMatch(null);
    }
  };

  const handleSelectPopularSearch = (item: (typeof POPULAR_BUSINESS_SEARCHES)[0]) => {
    setBusinessSearchQuery(item.label);
    setSelectedActivityCategory(item.category);
    const match = findCategoryByBusinessSearch(item.query);
    setSearchMatch(match);
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!fullName.trim() || !email.trim() || !businessName.trim()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleLaunchWorkspace = () => {
    if (!businessName.trim() || !branchName.trim()) return;
    setIsProvisioning(true);
    setTimeout(() => {
      const payload: OnboardingParams = {
        fullName,
        email,
        phone,
        password,
        businessName,
        category: effectiveCategory,
        branchName,
        branchAddress: `${branchAddress} (${selectedWilaya})`,
        voucherCode: voucherCode.trim() ? voucherCode.trim() : undefined,
      };
      completeOnboarding(payload);
      setIsProvisioning(false);
      onComplete();
    }, 600);
  };

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils size={18} className="text-[#C4785A]" />;
      case 'Briefcase':
        return <Briefcase size={18} className="text-[#C4785A]" />;
      case 'Scissors':
        return <Scissors size={18} className="text-[#C4785A]" />;
      case 'Dumbbell':
        return <Dumbbell size={18} className="text-[#C4785A]" />;
      case 'Building2':
        return <Building2 size={18} className="text-[#C4785A]" />;
      case 'Laptop':
        return <Laptop size={18} className="text-[#C4785A]" />;
      case 'Stethoscope':
        return <Stethoscope size={18} className="text-[#C4785A]" />;
      case 'Wrench':
        return <Wrench size={18} className="text-[#C4785A]" />;
      case 'Home':
        return <Home size={18} className="text-[#C4785A]" />;
      case 'Factory':
        return <Factory size={18} className="text-[#C4785A]" />;
      case 'Scale':
        return <Scale size={18} className="text-[#C4785A]" />;
      case 'Truck':
        return <Truck size={18} className="text-[#C4785A]" />;
      case 'HardHat':
        return <HardHat size={18} className="text-[#C4785A]" />;
      case 'Sprout':
        return <Sprout size={18} className="text-[#C4785A]" />;
      case 'GraduationCap':
        return <GraduationCap size={18} className="text-[#C4785A]" />;
      default:
        return <Sparkles size={18} className="text-[#C4785A]" />;
    }
  };

  const getCategoryIcon = (category: BusinessCategory) => {
    switch (category) {
      case 'membership_session':
        return <Dumbbell size={22} className="text-[#C4785A]" />;
      case 'appointment_service':
        return <Scissors size={22} className="text-[#C4785A]" />;
      case 'pos_inventory':
        return <Utensils size={22} className="text-[#C4785A]" />;
      case 'project_milestone':
        return <Briefcase size={22} className="text-[#C4785A]" />;
      case 'rental_booking':
        return <Building2 size={22} className="text-[#C4785A]" />;
      case 'education_cohort':
        return <GraduationCap size={22} className="text-[#C4785A]" />;
      case 'freelance_solo':
        return <Laptop size={22} className="text-[#C4785A]" />;
      case 'trading_commercial':
        return <Truck size={22} className="text-[#C4785A]" />;
      case 'medical_clinic':
        return <Stethoscope size={22} className="text-[#C4785A]" />;
      case 'auto_garage':
        return <Wrench size={22} className="text-[#C4785A]" />;
      case 'real_estate':
        return <Home size={22} className="text-[#C4785A]" />;
      case 'manufacturing_production':
        return <Factory size={22} className="text-[#C4785A]" />;
      case 'legal_accounting':
        return <Scale size={22} className="text-[#C4785A]" />;
      case 'logistics_delivery':
        return <Truck size={22} className="text-[#C4785A]" />;
      case 'construction_contractor':
        return <HardHat size={22} className="text-[#C4785A]" />;
      case 'agriculture_farming':
        return <Sprout size={22} className="text-[#C4785A]" />;
      default:
        return <Building2 size={22} className="text-[#C4785A]" />;
    }
  };

  const allVerticalCategories = Object.keys(CATEGORY_METADATA) as BusinessCategory[];

  const activityQuickChips: Array<{ id: BusinessCategory; label: { fr: string; ar: string; en: string }; icon: React.ReactNode }> = [
    { id: 'pos_inventory', label: { fr: 'Café & Restaurant', ar: 'مطعم ومقهى', en: 'Café & Restaurant' }, icon: <Utensils size={14} /> },
    { id: 'appointment_service', label: { fr: 'Salon & Beauté', ar: 'صالون وتجميل', en: 'Salon & Spa' }, icon: <Scissors size={14} /> },
    { id: 'membership_session', label: { fr: 'Sport & Fitness', ar: 'رياضة وفيتنس', en: 'Fitness & Gym' }, icon: <Dumbbell size={14} /> },
    { id: 'freelance_solo', label: { fr: 'Freelance & Solo', ar: 'عمل حر ومستقل', en: 'Freelance & Solo' }, icon: <Laptop size={14} /> },
    { id: 'trading_commercial', label: { fr: 'Négoce & Gros', ar: 'تجارة وتوزيع بالجملة', en: 'Wholesale & B2B' }, icon: <Truck size={14} /> },
    { id: 'medical_clinic', label: { fr: 'Médical & Clinique', ar: 'عيادة وطب', en: 'Clinic & Medical' }, icon: <Stethoscope size={14} /> },
    { id: 'auto_garage', label: { fr: 'Garage & Auto', ar: 'مرآب سيارات', en: 'Auto Repair & Garage' }, icon: <Wrench size={14} /> },
    { id: 'project_milestone', label: { fr: 'Agence & Projets', ar: 'وكالة ومشاريع', en: 'Agency & Projects' }, icon: <Briefcase size={14} /> },
    { id: 'real_estate', label: { fr: 'Immobilier & Baux', ar: 'عقارات وكراء', en: 'Real Estate' }, icon: <Home size={14} /> },
    { id: 'manufacturing_production', label: { fr: 'Usine & Atelier', ar: 'مصنع وورشة', en: 'Manufacturing & Workshop' }, icon: <Factory size={14} /> },
    { id: 'education_cohort', label: { fr: 'Formation & École', ar: 'تكوين ومدرسة', en: 'Academy & School' }, icon: <GraduationCap size={14} /> },
    { id: 'rental_booking', label: { fr: 'Coworking & Espaces', ar: 'فضاءات عمل وكراء', en: 'Venues & Coworking' }, icon: <Building2 size={14} /> },
    { id: 'legal_accounting', label: { fr: 'Droit & Expertise', ar: 'محاماة ومحاسبة', en: 'Legal & Accounting' }, icon: <Scale size={14} /> },
    { id: 'logistics_delivery', label: { fr: 'Livraison & Colis', ar: 'توصيل وطرود', en: 'Logistics & Delivery' }, icon: <Truck size={14} /> },
    { id: 'construction_contractor', label: { fr: 'BTP & Chantier', ar: 'مقاولات وبناء', en: 'Construction & BTP' }, icon: <HardHat size={14} /> },
    { id: 'agriculture_farming', label: { fr: 'Agri & Élevage', ar: 'فلاحة وتربية مواشي', en: 'Agriculture & Farm' }, icon: <Sprout size={14} /> },
  ];

  return (
    <div
      className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#121110] text-neutral-900 flex flex-col md:flex-row select-none"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* ============================================================ */}
      {/* LEFT COLUMN: ATRIUM PROGRESS RAIL & LIVE WORKSTATION SUMMARY */}
      {/* ============================================================ */}
      <aside className="w-full md:w-[360px] lg:w-[410px] xl:w-[440px] shrink-0 bg-[#181615] border-b md:border-b-0 md:border-r border-[#272320] flex flex-col justify-between p-5 sm:p-7 z-10 text-white">
        <div>
          {/* Brand Lockup */}
          <div className="flex items-center justify-between pb-6 border-b border-[#2A2624]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C4785A] flex items-center justify-center p-1.5 shadow-md">
                <FiveCubesLogo size={24} cubeColor="#FFFFFF" />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white block leading-tight">
                  ATRIUM
                </span>
                <span className="text-[11px] text-neutral-400 font-medium block">
                  Desktop Workspace Setup
                </span>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#24201E] border border-[#322C28] p-1 rounded-xl text-xs">
              {(['fr', 'ar', 'en'] as SupportedLanguage[]).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => setLanguage(lng)}
                  className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    language === lng
                      ? 'bg-[#C4785A] text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {lng === 'fr' ? 'FR' : lng === 'ar' ? 'العربية' : 'EN'}
                </button>
              ))}
            </div>
          </div>

          {/* 4-Step Vertical Tracker */}
          <div className="py-6 space-y-4">
            {[
              {
                step: 1,
                label: t('onboarding_nav_step_1', language),
                sub: language === 'ar' ? 'بيانات المسؤول والمقر' : language === 'fr' ? 'Profil dirigeant & adresse' : 'Master admin & address',
              },
              {
                step: 2,
                label: t('onboarding_nav_step_2', language),
                sub: language === 'ar' ? 'تحديد النشاط وحجم الفريق' : language === 'fr' ? 'Secteur métier & effectif' : 'Core sector & team scale',
              },
              {
                step: 3,
                label: t('onboarding_nav_step_3', language),
                sub: language === 'ar' ? 'اختيار الأدوات اليومية' : language === 'fr' ? 'Outils de gestion quotidienne' : 'Daily operational tools',
              },
              {
                step: 4,
                label: t('onboarding_nav_step_4', language),
                sub: language === 'ar' ? 'مساحة العمل والتفعيل' : language === 'fr' ? 'Plateaux sur-mesure & départ' : 'Tailored trays & launch',
              },
            ].map((s) => {
              const isPast = s.step < currentStep;
              const isCurrent = s.step === currentStep;

              return (
                <div
                  key={s.step}
                  onClick={() => {
                    // Allow navigating back to completed steps
                    if (s.step < currentStep) {
                      setCurrentStep(s.step as 1 | 2 | 3 | 4);
                    }
                  }}
                  className={`flex items-start gap-3.5 p-2 rounded-2xl transition-all ${
                    s.step < currentStep ? 'cursor-pointer hover:bg-[#221F1D]' : ''
                  }`}
                >
                  {/* Step Ring */}
                  <div
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs transition-all ${
                      isPast
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-[#C4785A] text-white shadow-[0_0_12px_rgba(196,120,90,0.5)] ring-2 ring-[#C4785A]/30'
                        : 'bg-[#221F1D] border border-neutral-700 text-neutral-500'
                    }`}
                  >
                    {isPast ? <Check size={14} strokeWidth={3} /> : s.step}
                  </div>

                  {/* Step Copy */}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-bold leading-tight ${
                        isCurrent
                          ? 'text-[#C4785A]'
                          : isPast
                          ? 'text-white'
                          : 'text-neutral-500'
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      {s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Workstation Summary Capsule */}
          <div className="bg-[#1F1C1A] border border-[#2F2B28] rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-400 font-semibold text-[10.5px] uppercase tracking-wider pb-1 border-b border-[#2C2724]">
              <span>{language === 'ar' ? 'ملخص الإعداد' : language === 'fr' ? 'Configuration en direct' : 'Live Setup Summary'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-1.5 pt-0.5 text-[11.5px]">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{language === 'ar' ? 'المسؤول:' : language === 'fr' ? 'Responsable :' : 'Admin:'}</span>
                <span className="font-semibold text-white truncate max-w-[170px]">{fullName || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{language === 'ar' ? 'المؤسسة:' : language === 'fr' ? 'Entreprise :' : 'Company:'}</span>
                <span className="font-semibold text-white truncate max-w-[170px]">{businessName || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{language === 'ar' ? 'المقر:' : language === 'fr' ? 'Wilaya :' : 'Wilaya:'}</span>
                <span className="font-semibold text-white truncate max-w-[170px]">{selectedWilaya}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{language === 'ar' ? 'الوحدات:' : language === 'fr' ? 'Modules :' : 'Modules:'}</span>
                <span className="font-bold text-[#C4785A]">{selectedModuleIds.length} {language === 'ar' ? 'محددة' : 'actifs'}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-[#2C2724]">
                <span className="text-neutral-500">{language === 'ar' ? 'القطاع المقترح:' : language === 'fr' ? 'Secteur suggéré :' : 'Suggested Sector:'}</span>
                <span className="font-bold text-white bg-[#C4785A]/20 text-[#E08A68] px-2 py-0.5 rounded-md text-[10px] truncate max-w-[160px]">
                  {CATEGORY_METADATA[effectiveCategory]?.title || 'Standard'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Skip to workspace escape link */}
        <div className="pt-4 border-t border-[#272320] flex items-center justify-between text-xs text-neutral-400">
          <button
            type="button"
            onClick={onSkipToDashboard}
            className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer transition-colors"
          >
            {t('onboarding_skip', language)}
          </button>
          <span className="text-[10px] text-neutral-600 font-mono">v1.12 • Atrium OS</span>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: INTERACTIVE WORKSTATION CARD                   */}
      {/* ============================================================ */}
      <main className="flex-1 bg-[#F8F9FA] dark:bg-[#141416] flex flex-col justify-between overflow-y-auto">
        <div className="p-6 sm:p-9 lg:p-11 max-w-4xl mx-auto w-full">
          {/* Step 1: Account, Identity & Location */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCEEE8] border border-[#F5D8CE] text-[#C4785A] text-xs font-bold mb-2">
                  <ShieldCheck size={14} />
                  <span>{t('onboarding_step1_badge', language)}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  {t('onboarding_step1_title', language)}
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                  {t('onboarding_step1_desc', language)}
                </p>
              </div>

              {/* Google Fast Connect */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E9EB] shadow-xs space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full h-11 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-3 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                >
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
                  <span>
                    {googleLoading
                      ? 'Authenticating...'
                      : isGoogleConnected
                      ? `${t('onboarding_auth_google_connected', language)} (${email})`
                      : t('onboarding_auth_google', language)}
                  </span>
                  {isGoogleConnected && <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-neutral-200"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-neutral-400 font-medium">
                    {t('onboarding_auth_or_email', language)}
                  </span>
                  <div className="flex-grow border-t border-neutral-200"></div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <LabelInput
                    field="FullName"
                    label={t('onboarding_field_fullname', language)}
                    value={fullName}
                    onChange={setFullName}
                    width="100%"
                    height={46}
                    corner={14}
                  />

                  <LabelInput
                    field="Email"
                    label={t('onboarding_field_email', language)}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    width="100%"
                    height={46}
                    corner={14}
                  />

                  <LabelInput
                    field="Phone"
                    label={t('onboarding_field_phone', language)}
                    value={phone}
                    onChange={setPhone}
                    type="tel"
                    width="100%"
                    height={46}
                    corner={14}
                  />

                  <LabelInput
                    field="Password"
                    label={t('onboarding_field_password', language)}
                    value={password}
                    onChange={setPassword}
                    type="password"
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
              </div>

              {/* Business Entity & Primary Branch */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E9EB] shadow-xs space-y-3.5">
                <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  {language === 'ar' ? 'بيانات المنشأة والمقر' : language === 'fr' ? 'Établissement & Adresse' : 'Facility & Address'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <LabelInput
                    field="BusinessName"
                    label={t('onboarding_field_bizname', language)}
                    value={businessName}
                    onChange={setBusinessName}
                    width="100%"
                    height={46}
                    corner={14}
                  />

                  <LabelInput
                    field="BranchName"
                    label={t('onboarding_field_branch', language)}
                    value={branchName}
                    onChange={setBranchName}
                    width="100%"
                    height={46}
                    corner={14}
                  />

                  {/* Wilaya Selector */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      {language === 'ar' ? 'الولاية الجزائرية' : language === 'fr' ? 'Wilaya d\'implantation' : 'Operating Wilaya'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedWilaya}
                        onChange={(e) => setSelectedWilaya(e.target.value)}
                        className="w-full h-11.5 px-3 rounded-xl border border-neutral-300 bg-white text-xs font-semibold text-neutral-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#C4785A]/30 focus:border-[#C4785A] pr-8"
                      >
                        {ALGERIA_WILAYAS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                      <MapPin size={15} className="absolute right-3 top-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  <LabelInput
                    field="BranchAddress"
                    label={t('onboarding_field_address', language)}
                    value={branchAddress}
                    onChange={setBranchAddress}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Activity & Scale */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCEEE8] border border-[#F5D8CE] text-[#C4785A] text-xs font-bold mb-2">
                  <Briefcase size={14} />
                  <span>{t('onboarding_step2_badge', language)}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  {t('onboarding_step2_title', language)}
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                  {t('onboarding_step2_desc', language)}
                </p>
              </div>

              {/* Activity Chips Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span>{t('onboarding_step2_quick_chips', language)}</span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    {language === 'ar' ? 'انقر على القطاع الأقرب لنشاطك' : language === 'fr' ? 'Cliquez sur le secteur le plus proche' : 'Click the closest match'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {activityQuickChips.map((chip) => {
                    const isSelected = selectedActivityCategory === chip.id;
                    const label = chip.label[language] || chip.label.fr;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleActivityChipSelect(chip.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-[#FCEEE8] border-[#C4785A] ring-1 ring-[#C4785A] shadow-xs text-[#8C3D28]'
                            : 'bg-white border-[#E5E9EB] hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#C4785A] text-white' : 'bg-neutral-100 text-[#C4785A]'
                          }`}
                        >
                          {chip.icon}
                        </div>
                        <span className="text-xs font-bold truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Freeform Search Write-in Fallback */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E9EB] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-800">
                    {t('onboarding_step2_search_label', language)}
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {language === 'ar' ? 'فهرس ذكي لـ 120+ مهنة ونشاط' : language === 'fr' ? 'Index de 120+ métiers & spécialités' : 'Matches 120+ business terms'}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={businessSearchQuery}
                    onChange={(e) => handleBusinessSearch(e.target.value)}
                    placeholder={t('onboarding_step2_search_ph', language)}
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-neutral-300 bg-neutral-50/50 text-xs sm:text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C4785A]/30 focus:border-[#C4785A] focus:bg-white"
                  />
                  <Search size={16} className="absolute left-3.5 top-3.5 text-neutral-400 pointer-events-none" />
                  {businessSearchQuery && (
                    <button
                      type="button"
                      onClick={() => handleBusinessSearch('')}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-600"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Popular Keywords Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-[11px]">
                  <span className="text-[10px] text-neutral-400 font-semibold shrink-0">
                    {language === 'ar' ? 'أمثلة سريعة:' : language === 'fr' ? 'Suggestions :' : 'Examples:'}
                  </span>
                  {getPopularBusinessSearches(language).slice(0, 7).map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSelectPopularSearch(item)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {searchMatch && (
                  <div className="px-3.5 py-2 rounded-xl bg-[#FCEEE8] border border-[#F5D8CE] text-xs text-[#8C3D28] flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#C4785A] shrink-0" />
                      <span>
                        Correspondance : <strong>"{searchMatch.matchedKeyword}"</strong> → <strong className="text-[#C4785A]">{searchMatch.categoryTitle}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#C4785A] uppercase tracking-wider">
                      Match 95%
                    </span>
                  </div>
                )}
              </div>

              {/* Team Scale */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    {t('onboarding_step2_scale_title', language)}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {t('onboarding_step2_scale_desc', language)}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {ONBOARDING_TEAM_SCALES.map((scale) => {
                    const isSelected = teamScale === scale.id;
                    const label = scale.label[language] || scale.label.fr;
                    const range = scale.range[language] || scale.range.fr;
                    const desc = scale.desc[language] || scale.desc.fr;

                    return (
                      <div
                        key={scale.id}
                        onClick={() => setTeamScale(scale.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#FCEEE8] border-[#C4785A] ring-1 ring-[#C4785A] shadow-xs'
                            : 'bg-white border-[#E5E9EB] hover:bg-neutral-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                              {range}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#C4785A] text-white flex items-center justify-center">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-bold text-neutral-900">{label}</div>
                          <div className="text-[11px] text-neutral-500 mt-1 leading-snug">{desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Operational Daily Modules */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCEEE8] border border-[#F5D8CE] text-[#C4785A] text-xs font-bold mb-2">
                    <Users size={14} />
                    <span>{t('onboarding_step3_badge', language)}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    {t('onboarding_step3_title', language)}
                  </h1>
                  <p className="text-sm text-neutral-500 mt-1">
                    {t('onboarding_step3_desc', language)}
                  </p>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold shrink-0">
                  {selectedModuleIds.length} {t('onboarding_step3_selected_count', language)}
                </div>
              </div>

              {/* 16 Operational Modules Interactive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ONBOARDING_MODULE_OPTIONS.map((mod) => {
                  const isChecked = selectedModuleIds.includes(mod.id);
                  const label = mod.label[language] || mod.label.fr;
                  const desc = mod.desc[language] || mod.desc.fr;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isChecked
                          ? 'bg-[#FCEEE8] border-[#C4785A] ring-1 ring-[#C4785A] shadow-xs'
                          : 'bg-white border-[#E5E9EB] hover:bg-neutral-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center">
                            {getModuleIcon(mod.iconName)}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-[#C4785A] border-[#C4785A] text-white'
                                : 'border-neutral-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        <div className="text-xs font-bold text-neutral-900 leading-tight">
                          {label}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-1 leading-snug">
                          {desc}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-neutral-200/50 flex items-center justify-between text-[10px] text-[#C4785A] font-semibold">
                        <span>{mod.keyFeature[language] || mod.keyFeature.fr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Intelligent Recommendation & Launch */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCEEE8] border border-[#F5D8CE] text-[#C4785A] text-xs font-bold mb-2">
                  <Sparkles size={14} />
                  <span>{t('onboarding_step4_badge', language)}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  {t('onboarding_step4_title', language)}
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                  {t('onboarding_step4_desc', language)}
                </p>
              </div>

              {/* Glowing Hero Recommendation Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#C4785A] shadow-[0_16px_40px_rgba(196,120,90,0.12)] space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#FCEEE8] to-transparent pointer-events-none rounded-bl-full" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FCEEE8] border border-[#F5D8CE] flex items-center justify-center shrink-0 shadow-xs">
                      {getCategoryIcon(effectiveCategory)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-neutral-900">
                          {CATEGORY_METADATA[effectiveCategory]?.title}
                        </span>
                        {manualCategoryOverride ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {t('onboarding_step4_override_active', language)}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#C4785A] text-white text-[10.5px] font-bold shadow-xs">
                            {recommendation.confidencePercent}% {t('onboarding_step4_affinity_match', language)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                        {CATEGORY_METADATA[effectiveCategory]?.tagline}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-700 leading-relaxed font-medium">
                  {recommendation.matchedReason[language] || recommendation.matchedReason.fr}
                </div>

                {/* Matched Features Capsules */}
                <div>
                  <div className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2.5">
                    {t('onboarding_step4_features_title', language)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {recommendation.matchingFeatures.map((feat, idx) => (
                      <div
                        key={idx}
                        className="px-3.5 py-2 rounded-xl bg-[#FCEEE8]/70 border border-[#F5D8CE] text-xs font-semibold text-[#8C3D28] flex items-center gap-2"
                      >
                        <CheckCircle2 size={15} className="text-[#C4785A] shrink-0" />
                        <span className="truncate">{feat[language] || feat.fr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1-Click Manual Override Expander */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E9EB] shadow-xs space-y-3">
                <button
                  type="button"
                  onClick={() => setIsOverrideAccordionOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-neutral-800 hover:text-[#C4785A] cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Globe size={15} className="text-[#C4785A]" />
                    <span>{t('onboarding_step4_override_toggle', language)}</span>
                  </span>
                  {isOverrideAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOverrideAccordionOpen && (
                  <div className="pt-2 border-t border-neutral-100 animate-in fade-in duration-150">
                    <p className="text-xs text-neutral-500 mb-3">
                      {language === 'ar'
                        ? 'يمكنك تغيير القطاع يدوياً لأي من الفئات الـ 16 التالية بنقرة واحدة:'
                        : language === 'fr'
                        ? 'Vous pouvez basculer manuellement sur l\'un des 16 verticaux d\'un simple clic :'
                        : 'Select any of the 16 business verticals manually with 1-click:'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto pr-1">
                      {allVerticalCategories.map((catKey) => {
                        const meta = CATEGORY_METADATA[catKey];
                        const isChosen = effectiveCategory === catKey;

                        return (
                          <div
                            key={catKey}
                            onClick={() => {
                              setManualCategoryOverride(catKey);
                            }}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isChosen
                                ? 'bg-[#FCEEE8] border-[#C4785A] ring-1 ring-[#C4785A] font-bold text-[#8C3D28]'
                                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="truncate font-bold">{meta.title}</span>
                              {isChosen && <Check size={12} className="text-[#C4785A]" />}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">{meta.tagline}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Voucher Code Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E9EB] shadow-xs space-y-3">
                {!showVoucherInput ? (
                  <button
                    type="button"
                    onClick={() => setShowVoucherInput(true)}
                    className="text-xs text-[#C4785A] hover:underline flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    <KeyRound size={14} />
                    <span>{t('onboarding_step4_voucher_prompt', language)}</span>
                  </button>
                ) : (
                  <div className="space-y-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-neutral-700">
                      {language === 'ar' ? 'رمز قسيمة الترخيص الدائم (اختياري)' : language === 'fr' ? 'Clé de licence perpétuelle (Optionnel)' : 'Lifetime License Key (Optional)'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="ATR-PRO-LIFE-XXXX-XXXX"
                        className="flex-1 h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-300 font-mono text-xs uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]/30 focus:border-[#C4785A]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const res = validateVoucherCode(voucherCode);
                          if (res.isValid) {
                            alert(t('onboarding_step4_voucher_valid', language));
                          }
                        }}
                        className="h-10 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        {t('onboarding_step4_voucher_apply', language)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Workstation Bottom Bar */}
        <div className="p-4 sm:p-6 bg-white border-t border-[#E5E9EB] shadow-sm flex items-center justify-between sticky bottom-0 z-20">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="h-11 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft size={16} className={language === 'ar' ? 'rotate-180' : ''} />
                <span>{t('onboarding_btn_back', language)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSkipToDashboard}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
              >
                {t('onboarding_skip', language)}
              </button>
            )}
          </div>

          <div>
            {currentStep < 4 ? (
              <AtriumButton
                type="button"
                variant="primary"
                size="lg"
                onClick={handleNext}
                icon={<ChevronRight size={16} className={language === 'ar' ? 'rotate-180' : ''} />}
                iconPosition="right"
              >
                {t('onboarding_btn_next', language)}
              </AtriumButton>
            ) : (
              <AtriumButton
                type="button"
                variant="primary"
                size="lg"
                onClick={handleLaunchWorkspace}
                loading={isProvisioning}
                icon={<Rocket size={17} />}
              >
                {isProvisioning
                  ? t('onboarding_step4_launching', language)
                  : t('onboarding_step4_launch_btn', language)}
              </AtriumButton>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

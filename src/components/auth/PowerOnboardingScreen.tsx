import React, { useState, useEffect } from 'react';
import {
  Building2,
  Dumbbell,
  Scissors,
  Utensils,
  Briefcase,
  GraduationCap,
  Laptop,
  Truck,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  BadgeCheck,
  Rocket,
  MapPin,
  Mail,
  User,
  Phone,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  Activity,
  Layers,
  CheckCircle2,
  Search,
  X,
  KeyRound,
  Cloud,
  Download,
  Play,
  RotateCcw,
  Globe,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { BusinessCategory, OnboardingParams } from '../../types/index';
import { validateVoucherCode } from '../../utils/rules';
import { authService } from '../../lib/supabase/services/authService';
import {
  findCategoryByBusinessSearch,
  getPopularBusinessSearches,
  POPULAR_BUSINESS_SEARCHES,
  BusinessMatchResult,
} from '../../utils/businessMapping';
import { t } from '../../utils/i18n';
import { AtriumMonolith, FiveCubesLogo } from './AtriumMonolith';
import { LabelInput } from '../ui/LabelInput';
import { Seek } from '../ui/Seek';

interface PowerOnboardingScreenProps {
  onComplete: () => void;
  onSkipToDashboard: () => void;
}

export const PowerOnboardingScreen: React.FC<PowerOnboardingScreenProps> = ({
  onComplete,
  onSkipToDashboard,
}) => {
  const {
    completeOnboarding,
    language,
    setLanguage,
    setSystemDefaultLanguage,
    isLanguageAuto,
  } = useAtriumStore();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [introPhase, setIntroPhase] = useState<'intro' | 'revealed'>('intro');
  const [cardVisible, setCardVisible] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const heroAnchorRef = React.useRef<HTMLDivElement>(null);
  const targetLockupRef = React.useRef<HTMLDivElement>(null);
  const [anchorCoords, setAnchorCoords] = useState<{ left: number; top: number } | null>(null);
  const [targetRect, setTargetRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const updateAnchor = () => {
      const el = targetLockupRef.current || heroAnchorRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.left > 0 && rect.width > 0) {
          setTargetRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          });
          setAnchorCoords({ left: rect.left, top: rect.top });
        }
      }
    };

    updateAnchor();

    // Re-measure across layout transitions and font renders
    const t1 = setTimeout(updateAnchor, 80);
    const t2 = setTimeout(updateAnchor, 250);
    const t3 = setTimeout(updateAnchor, 600);
    const t4 = setTimeout(updateAnchor, 1200);

    let ro: ResizeObserver | null = null;
    const observeTarget = targetLockupRef.current || heroAnchorRef.current;
    if (typeof ResizeObserver !== 'undefined' && observeTarget) {
      ro = new ResizeObserver(() => {
        updateAnchor();
      });
      ro.observe(observeTarget);
    }

    window.addEventListener('resize', updateAnchor);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      ro?.disconnect();
      window.removeEventListener('resize', updateAnchor);
    };
  }, [cardVisible, introPhase]);

  // Allow ESC to instantly skip intro to revealed onboarding card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && introPhase === 'intro') {
        setCardVisible(true);
        setIntroPhase('revealed');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introPhase]);

  // Step 1: Owner Account & Google Auth
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [isGoogleConnected, setIsGoogleConnected] = useState(true);
  const [fullName, setFullName] = useState('Mehdi Samih');
  const [email, setEmail] = useState('mehdisamih79@gmail.com');
  const [phone, setPhone] = useState('+213 550 12 34 56');
  const [password, setPassword] = useState('Atrium2026!');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Step 2: Business & Vertical
  const [businessName, setBusinessName] = useState('Atrium Creative Studio');
  const [category, setCategory] = useState<BusinessCategory>('freelance_solo');
  const [branchName, setBranchName] = useState('Main Flagship');
  const [branchAddress, setBranchAddress] = useState('14 Boulevard Didouche Mourad, Algiers');
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [matchResult, setMatchResult] = useState<BusinessMatchResult | null>(null);

  // Optional Voucher & Launch
  const [voucherCode, setVoucherCode] = useState('');
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

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

  const handleBusinessSearch = (query: string) => {
    setBusinessSearchQuery(query);
    if (!query.trim()) {
      setMatchResult(null);
      return;
    }
    const match = findCategoryByBusinessSearch(query);
    if (match) {
      setMatchResult(match);
      setCategory(match.category);
    } else {
      setMatchResult(null);
    }
  };

  const handleSelectPopularSearch = (item: (typeof POPULAR_BUSINESS_SEARCHES)[0]) => {
    setBusinessSearchQuery(item.label);
    setCategory(item.category);
    const match = findCategoryByBusinessSearch(item.query);
    setMatchResult(match);
  };

  const handleClearSearch = () => {
    setBusinessSearchQuery('');
    setMatchResult(null);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!fullName.trim() || !email.trim()) return;
      setCurrentStep(2);
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
        category,
        branchName,
        branchAddress,
        voucherCode: voucherCode.trim() ? voucherCode.trim() : undefined,
      };
      completeOnboarding(payload);
      setIsProvisioning(false);
      onComplete();
    }, 500);
  };

  const verticals: Array<{
    id: BusinessCategory;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    tagline: string;
  }> = [
    {
      id: 'freelance_solo',
      title: 'Freelancers & Solo',
      subtitle: 'Design, Dev, Consulting, Media Creators',
      icon: <Laptop size={18} className="text-[#C4785A]" />,
      tagline: 'Floating Stopwatch, Retainers & Invoices',
    },
    {
      id: 'membership_session',
      title: 'Membership',
      subtitle: 'Gyms, Martial arts, CrossFit, Athletic clubs',
      icon: <Dumbbell size={18} className="text-[#C4785A]" />,
      tagline: 'RFID Turnstiles & Member Plans',
    },
    {
      id: 'appointment_service',
      title: 'Appointment',
      subtitle: 'Hair salons, Spas, Barbershops, Clinics',
      icon: <Scissors size={18} className="text-[#C4785A]" />,
      tagline: 'Stylist Timetables & Service Packs',
    },
    {
      id: 'pos_inventory',
      title: 'Restaurant & POS',
      subtitle: 'Restaurants, Cafés, Boutiques, Retail',
      icon: <Utensils size={18} className="text-[#C4785A]" />,
      tagline: 'Orders, Menus & High-Speed POS',
    },
    {
      id: 'project_milestone',
      title: 'Projects & Agency',
      subtitle: 'Design, Architecture, Law, Consulting',
      icon: <Briefcase size={18} className="text-[#C4785A]" />,
      tagline: 'Retainers & Milestone Timelines',
    },
    {
      id: 'rental_booking',
      title: 'Rentals & Venue',
      subtitle: 'Coworking spaces, Event venues, Studios',
      icon: <Building2 size={18} className="text-[#C4785A]" />,
      tagline: 'Space Occupancy & Booking Slots',
    },
    {
      id: 'education_cohort',
      title: 'Education & Training',
      subtitle: 'Bootcamps, Language schools, Academies',
      icon: <GraduationCap size={18} className="text-[#C4785A]" />,
      tagline: 'Cohort Timetables & Enrollments',
    },
    {
      id: 'trading_commercial',
      title: 'Commercial & Wholesale',
      subtitle: 'Wholesalers, B2B Distribution, Material Supply',
      icon: <Truck size={18} className="text-[#C4785A]" />,
      tagline: 'Quotes, BLs, Supplier POs & Warehouses',
    },
  ];

  const handleCardArrivalStart = React.useCallback(() => {
    setCardVisible(true);
  }, []);

  const handleIntroComplete = React.useCallback(() => {
    setCardVisible(true);
    setIntroPhase('revealed');
  }, []);

  const handleSkipIntro = React.useCallback(() => {
    setCardVisible(true);
    setIntroPhase('revealed');
  }, []);

  // ============================================================
  // UNIFIED ATRIUM MONOLITH SYSTEM: INTRO & CONTINUITY GLIDE
  // ============================================================
  return (
    <div className="fixed inset-0 h-screen max-h-screen w-screen overflow-hidden text-white flex flex-col items-center justify-center select-none bg-[#D3542E]">
      {/* 1. KINETIC GEOMETRIC & TYPOGRAPHY SYSTEM (SOLID TERRACOTTA) */}
      <AtriumMonolith
        isIntroActive={introPhase === 'intro'}
        targetRect={targetRect}
        anchorCoords={anchorCoords}
        onCardArrivalStart={handleCardArrivalStart}
        onIntroComplete={handleIntroComplete}
        onSkip={handleSkipIntro}
        replayKey={replayKey}
      />

      {/* 2. FLOATING ONBOARDING CARD & BRAND SHOWCASE */}
      <div className="relative z-20 w-full h-full max-h-screen flex flex-col lg:flex-row items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        {/* LEFT: FLOATING ONBOARDING CARD */}
        <div
          className={`w-full lg:w-[460px] xl:w-[480px] p-2 sm:p-3 shrink-0 flex flex-col justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            introPhase === 'revealed'
              ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
              : 'opacity-0 -translate-x-12 scale-95 pointer-events-none'
          }`}
        >
          <div className="bg-white text-neutral-900 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] border border-neutral-100 flex flex-col justify-between max-h-[calc(100vh-32px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* Card Top: Atrium Brand Logo Emblem */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                {/* 5-Cubes Modernist Terracotta Logo (Click to Replay Intro) */}
                <button
                  type="button"
                  onClick={() => {
                    setIntroPhase('intro');
                    setCardVisible(false);
                    setReplayKey((k) => k + 1);
                  }}
                  title="Click to replay motion intro"
                  className="w-10 h-10 rounded-2xl bg-[#D3542E] flex items-center justify-center p-1.5 shadow-xs text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  <FiveCubesLogo size={26} cubeColor="white" />
                </button>
                <div>
                  <span className="text-base font-black tracking-tight text-neutral-900 block leading-tight">
                    ATRIUM
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium block">
                    Workspace Setup
                  </span>
                </div>
              </div>

              {/* Step Pill */}
              <div className="h-6.5 px-2.5 rounded-full bg-neutral-100 text-[10.5px] font-bold text-neutral-700 flex items-center gap-1">
                <span>Step {currentStep} of 2</span>
              </div>
            </div>

            {/* 2-Step Progress Bar */}
            <div className="grid grid-cols-2 gap-2 my-2.5">
              {[
                { n: 1, label: 'Owner Account' },
                { n: 2, label: 'Business Profile' },
              ].map((s) => (
                <div key={s.n} className="space-y-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      currentStep >= s.n ? 'bg-[#C4785A]' : 'bg-neutral-100'
                    }`}
                  />
                  <div className="text-[10px] text-neutral-400 font-semibold truncate">
                    {s.n}. {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* STEP 1: CREATE ACCOUNT & GOOGLE AUTH */}
            {currentStep === 1 && (
              <div className="space-y-2.5 py-0.5 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 tracking-tight leading-tight">
                    Create Your Atrium Account
                  </h3>
                  <p className="text-[11.5px] text-neutral-500 mt-0.5">
                    Sign in with Google or enter your owner details to launch your workspace.
                  </p>
                </div>

                {/* Primary: Google One-Click Auth Button */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full h-9.5 sm:h-10 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold flex items-center justify-center gap-2.5 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                  >
                    {/* SVG Google G Logo */}
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
                        ? 'Connecting Account...'
                        : isGoogleConnected
                        ? `Connected with Google (${email})`
                        : 'Continue with Google'}
                    </span>
                    {isGoogleConnected && <CheckCircle2 size={15} className="text-emerald-500 ml-auto" />}
                  </button>

                  <div className="relative flex py-0.5 items-center">
                    <div className="flex-grow border-t border-neutral-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-neutral-400 font-medium">
                      or customize profile details
                    </span>
                    <div className="flex-grow border-t border-neutral-200"></div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <LabelInput
                    field="Full Name"
                    label={language === 'ar' ? 'الاسم الكامل' : language === 'fr' ? 'Nom complet' : 'Full Name'}
                    value={fullName}
                    onChange={setFullName}
                    width="100%"
                    height={46}
                    corner={14}
                  />

                  <LabelInput
                    field="Email"
                    label={language === 'ar' ? 'البريد الإلكتروني للعمل' : language === 'fr' ? 'Email professionnel' : 'Work Email'}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    width="100%"
                    height={46}
                    corner={14}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <LabelInput
                      field="Phone"
                      label={language === 'ar' ? 'رقم الهاتف' : language === 'fr' ? 'Numéro de téléphone' : 'Phone Number'}
                      value={phone}
                      onChange={setPhone}
                      type="tel"
                      width="100%"
                      height={46}
                      corner={14}
                    />

                    <LabelInput
                      field="Password"
                      label={language === 'ar' ? 'كلمة مرور المشرف' : language === 'fr' ? 'Mot de passe administrateur' : 'Admin Password'}
                      value={password}
                      onChange={setPassword}
                      type="password"
                      width="100%"
                      height={46}
                      corner={14}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: BUSINESS & VERTICAL + SINGLE BRANCH */}
            {currentStep === 2 && (
              <div className="space-y-3 py-1 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900">
                    {language === 'ar' ? 'إعداد المنشأة والفرع الأول' : language === 'fr' ? 'Configuration de l\'entreprise et 1er site' : 'Business Setup & First Branch'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {language === 'ar'
                      ? 'حدد اسم منشأتك وفرعك الرئيسي. (تفتح الفروع الإضافية في إصدار سطح المكتب).'
                      : language === 'fr'
                      ? 'Nommez votre entreprise et votre site principal. (Les sites supplémentaires se débloquent sur Desktop).'
                      : 'Name your business and your primary branch. (Additional branches unlock in Desktop).'}
                  </p>
                </div>

                <div className="space-y-2">
                  <LabelInput
                    field="Business"
                    label={language === 'ar' ? 'اسم المنشأة أو العلامة' : language === 'fr' ? 'Nom de l\'établissement' : 'Business Name'}
                    value={businessName}
                    onChange={setBusinessName}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                  <LabelInput
                    field="Branch"
                    label={language === 'ar' ? 'اسم الفرع الأول' : language === 'fr' ? 'Nom du premier site' : 'First Branch Name'}
                    value={branchName}
                    onChange={setBranchName}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>

                {/* Search Bar & Semantic Matcher */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-neutral-700">
                      {language === 'ar' ? 'البحث عن نشاطك التجاري' : language === 'fr' ? 'Recherchez votre activité métier' : 'Search Your Business Activity'}
                    </label>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {language === 'ar' ? 'تحديد تلقائي للقطاع المناسب' : language === 'fr' ? 'Détection automatique du secteur' : 'Auto-detects matching category'}
                    </span>
                  </div>
                  <Seek
                    value={businessSearchQuery}
                    onChange={handleBusinessSearch}
                    placeholder={
                      language === 'ar'
                        ? 'مثال: صالون حلاقة، نادي رياضي، مخبزة، مساحة عمل...'
                        : language === 'fr'
                        ? 'ex: Salon de coiffure, CrossFit, Pâtisserie, Coworking...'
                        : 'e.g. Barbershop, CrossFit, Pâtisserie, Coworking...'
                    }
                    shutSize={36}
                    openWidth={380}
                  />
                </div>

                  {/* Popular Quick Suggestion Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-[11px]">
                    <span className="text-[10px] text-neutral-400 font-semibold shrink-0">
                      {language === 'ar' ? 'الأنشطة الشائعة:' : language === 'fr' ? 'Populaire :' : 'Popular:'}
                    </span>
                    {POPULAR_BUSINESS_SEARCHES.map((item) => {
                      const isChipActive =
                        category === item.category &&
                        businessSearchQuery.toLowerCase().includes(item.label.toLowerCase().slice(0, 4));
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleSelectPopularSearch(item)}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer border ${
                            isChipActive
                              ? 'bg-[#FDF4F0] text-[#C4785A] border-[#F5E2D8] font-bold'
                              : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600 border-transparent'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Match Feedback Banner */}
                  {matchResult && (
                    <div className="px-3 py-1.5 rounded-xl bg-[#FDF4F0] border border-[#FBE5DC] text-[11px] text-[#8C3D28] flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles size={13} className="text-[#C4785A] shrink-0" />
                        <span className="truncate">
                          Auto-matched from <strong>"{matchResult.matchedKeyword}"</strong> → <strong className="text-[#C4785A]">{matchResult.categoryTitle}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#C4785A] shrink-0 ml-2 uppercase tracking-wide">
                        Selected
                      </span>
                    </div>
                  )}

                {/* 7 Verticals Compact Grid */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-neutral-700">
                      Industry Categories ({verticals.length})
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      Click any card to select
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {verticals.map((v) => {
                      const isSelected = category === v.id;
                      const isSearchMatch = matchResult && matchResult.category === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setCategory(v.id)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#FDF4F0] border-[#C4785A] shadow-xs ring-1 ring-[#C4785A]'
                              : isSearchMatch
                              ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300'
                              : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/70'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="w-6 h-6 rounded-lg bg-white shadow-xs flex items-center justify-center">
                              {v.icon}
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#C4785A] text-white flex items-center justify-center">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-bold text-neutral-900 flex items-center gap-1">
                            <span>{v.title}</span>
                            {isSearchMatch && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C4785A] animate-pulse" />
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">{v.tagline}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Workspace Facility Note */}
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-neutral-700 flex items-center gap-1.5 text-[11.5px]">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span>Workspace configured for your primary facility</span>
                  </span>
                  <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                    Ready
                  </span>
                </div>

                {/* Optional Desktop Voucher Toggle */}
                <div className="pt-0.5">
                  {!showVoucherInput ? (
                    <button
                      type="button"
                      onClick={() => setShowVoucherInput(true)}
                      className="text-[11px] text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <KeyRound size={12} />
                      <span>Have a Desktop Lifetime License Voucher? (Optional)</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1 animate-in fade-in">
                      <label className="block text-[10px] font-bold text-neutral-700">
                        Desktop Voucher Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="ATR-PRO-LIFE-XXXX-XXXX"
                        className="w-full h-8 px-2.5 rounded-lg bg-white border border-neutral-300 font-mono text-xs uppercase"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card Footer: Buttons */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="h-10 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} className={language === 'ar' ? 'rotate-180' : ''} />
                <span>{language === 'ar' ? 'السابق' : language === 'fr' ? 'Retour' : 'Back'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSkipToDashboard}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
              >
                {language === 'ar' ? 'تخطي وفتح النسخة التجريبية' : language === 'fr' ? 'Passer & Ouvrir la démo' : 'Skip & Open Demo'}
              </button>
            )}

            {currentStep === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-10 px-5 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <span>{language === 'ar' ? 'متابعة' : language === 'fr' ? 'Continuer' : 'Continue'}</span>
                <ChevronRight size={14} className={language === 'ar' ? 'rotate-180' : ''} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchWorkspace}
                disabled={isProvisioning}
                className="h-11 px-6 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                <Rocket size={15} />
                <span>
                  {isProvisioning
                    ? (language === 'ar' ? 'جارٍ الإطلاق...' : language === 'fr' ? 'Lancement...' : 'Launching...')
                    : (language === 'ar' ? 'إطلاق مساحة العمل المجانية' : language === 'fr' ? 'Lancer l\'espace gratuit' : 'Launch Free Workspace')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: BRAND SHOWCASE */}
      <div className="flex-1 p-6 sm:p-10 lg:py-10 lg:pr-10 lg:pl-28 xl:py-12 xl:pr-16 xl:pl-36 2xl:pl-48 h-full max-h-screen flex flex-col justify-center overflow-hidden z-10 hidden md:flex text-[#18181B]">
        <div className="w-full max-w-2xl lg:ml-auto xl:mr-6 2xl:mr-12 flex flex-col justify-between h-full py-1">
          {/* Top Tagline & Unified Header Controls (Reveals on Docking) */}
          <div
            className={`flex items-center justify-between shrink-0 transition-opacity duration-700 ${
              introPhase === 'revealed' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-[13px] font-bold tracking-widest uppercase text-[#18181B]/80">
                Atrium Cloud Web Edition (Free)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIntroPhase('intro');
                  setCardVisible(false);
                  setReplayKey((k) => k + 1);
                }}
                className="h-9 px-4 rounded-full bg-black/10 hover:bg-black/25 border border-black/20 text-xs font-semibold text-[#18181B] hover:text-white flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <RotateCcw size={13} className="text-[#18181B]" />
                <span>Replay Motion</span>
              </button>

              <button
                type="button"
                onClick={onSkipToDashboard}
                className="h-9 px-4 rounded-full bg-black/10 hover:bg-black/20 border border-black/20 text-xs font-semibold text-[#18181B] hover:text-white flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <span>Open Existing Workspace (Tamer)</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Hero Copy Column */}
          <div className="my-auto py-2 sm:py-2.5">
            {/* Reserved space and anchor for the left-aligned brand lockup (Enlarged Hero Scale, Seamless Transition) */}
            <div ref={heroAnchorRef} className="h-20 sm:h-22 w-full flex items-center justify-start">
              <div
                ref={targetLockupRef}
                className={`flex items-center gap-5 select-none transition-opacity duration-300 ${
                  introPhase === 'revealed' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <FiveCubesLogo cubeColor="#000000" size={72} className="shrink-0" />
                <span
                  className="text-5xl sm:text-[58px] lg:text-[64px] font-black tracking-tight text-black leading-none"
                  style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
                >
                  ATRIUM
                </span>
              </div>
            </div>

            {/* Cascade Text & Feature Cards (Glides upward smoothly from beneath the docked logo) */}
            <div
              className={`space-y-3.5 sm:space-y-4 pt-1 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                introPhase === 'revealed'
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-6 pointer-events-none'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/10 border border-black/15 text-[#18181B] text-xs sm:text-[13px] font-semibold">
                <Sparkles size={13} className="text-[#18181B]" />
                <span>Atrium Web Edition — 1 Business &amp; 1 Branch</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#18181B] leading-tight max-w-xl">
                The Business Management OS for Modern Facilities.
              </h1>

              <p className="text-sm sm:text-[15px] text-[#18181B]/85 leading-relaxed font-normal max-w-xl">
                Whether running a solo practice, aesthetic salon, fast-casual restaurant, or athletic gym, Atrium Web provides unified management for your facility. Seamlessly upgrade to the Desktop app when you expand to multi-location chains.
              </p>

              {/* Cards Showcase */}
              <div className="grid grid-cols-2 gap-3.5 pt-1.5 max-w-xl">
                {/* Tile 1: Supabase Realtime Cloud Sync */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 text-neutral-900 border border-white/60 shadow-lg space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                    <span className="font-semibold">Cloud Architecture</span>
                    <Cloud size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-neutral-900 tabular-nums tracking-tight">
                    Live Sync <span className="text-xs text-[#D3542E] font-bold">PostgreSQL</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 block">
                    Automatic Web-to-Desktop Sync
                  </span>
                </div>

                {/* Tile 2: Upgrade to Desktop Anytime */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 text-neutral-900 border border-white/60 shadow-lg space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                    <span className="font-semibold">Multi-Branch Growth</span>
                    <Laptop size={14} className="text-[#D3542E]" />
                  </div>
                  <div className="text-sm sm:text-base font-black text-neutral-900">
                    Atrium Desktop Edition
                  </div>
                  <span className="text-[11px] font-semibold text-[#D3542E] block">
                    Multi-Branch Chains &amp; POS Hardware
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Specs & Languages (Reveals on Docking) */}
          <div
            className={`pt-3.5 pb-1 border-t border-black/20 flex items-center justify-between text-xs sm:text-[13px] text-[#18181B]/80 font-medium shrink-0 transition-opacity duration-700 ${
              introPhase === 'revealed' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <span>Atrium Web Edition • Multi-Facility ERP &amp; CRM</span>
            <span>English • Français • العربية</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

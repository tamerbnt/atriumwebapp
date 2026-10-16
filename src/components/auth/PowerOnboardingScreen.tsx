import React, { useState } from 'react';
import {
  Building2,
  Dumbbell,
  Scissors,
  Utensils,
  Briefcase,
  GraduationCap,
  Laptop,
  KeyRound,
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
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { BusinessCategory, OnboardingParams } from '../../types/index';
import { validateVoucherCode } from '../../utils/rules';
import {
  findCategoryByBusinessSearch,
  POPULAR_BUSINESS_SEARCHES,
  BusinessMatchResult,
} from '../../utils/businessMapping';

interface PowerOnboardingScreenProps {
  onComplete: () => void;
  onSkipToDashboard: () => void;
}

export const PowerOnboardingScreen: React.FC<PowerOnboardingScreenProps> = ({
  onComplete,
  onSkipToDashboard,
}) => {
  const { completeOnboarding, businesses } = useAtriumStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Owner Account
  const [fullName, setFullName] = useState('Amine Bentouati');
  const [email, setEmail] = useState('bentouatitamer@gmail.com');
  const [phone, setPhone] = useState('+213 550 12 34 56');
  const [password, setPassword] = useState('Atrium2026!');

  // Step 2: Business & Vertical
  const [businessName, setBusinessName] = useState('Atrium Elite Fitness');
  const [category, setCategory] = useState<BusinessCategory>('membership_session');
  const [branchName, setBranchName] = useState('Downtown Flagship');
  const [branchAddress, setBranchAddress] = useState('14 Boulevard Didouche Mourad, Algiers');
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [matchResult, setMatchResult] = useState<BusinessMatchResult | null>(null);

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

  // Step 3: License & Voucher
  const [licenseOption, setLicenseOption] = useState<'trial' | 'voucher'>('voucher');
  const [voucherCode, setVoucherCode] = useState('ATR-PRO-LIFE-A4B2-C9D1');
  const [voucherValidation, setVoucherValidation] = useState<{
    isValid: boolean;
    tierName?: 'Starter' | 'Pro' | 'Enterprise';
    error?: string;
  }>({ isValid: true, tierName: 'Pro' });

  // Step 4: Provisioning State
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleVoucherInput = (val: string) => {
    const clean = val.toUpperCase().trim();
    setVoucherCode(clean);
    if (!clean) {
      setVoucherValidation({ isValid: false });
      return;
    }
    const res = validateVoucherCode(clean);
    setVoucherValidation(res);
  };

  const handleQuickVoucher = (code: string) => {
    setLicenseOption('voucher');
    handleVoucherInput(code);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!fullName.trim() || !email.trim()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!businessName.trim() || !branchName.trim()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (licenseOption === 'voucher' && !voucherValidation.isValid) return;
      setCurrentStep(4);
    }
  };

  const handleLaunchWorkspace = () => {
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
        voucherCode: licenseOption === 'voucher' ? voucherCode : undefined,
      };
      completeOnboarding(payload);
      setIsProvisioning(false);
      onComplete();
    }, 600);
  };

  const verticals: Array<{
    id: BusinessCategory;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    tagline: string;
  }> = [
    {
      id: 'membership_session',
      title: 'Gym & Fitness',
      subtitle: 'Gyms, Martial arts, CrossFit, Athletic clubs',
      icon: <Dumbbell size={18} className="text-[#C4785A]" />,
      tagline: 'RFID Turnstiles & Session Plans',
    },
    {
      id: 'appointment_service',
      title: 'Salon & Beauty',
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
      id: 'freelance_solo',
      title: 'Freelancers & Solo',
      subtitle: 'Design, Dev, Consulting, Media Creators',
      icon: <Laptop size={18} className="text-[#C4785A]" />,
      tagline: 'Floating Stopwatch, Retainers & Invoices',
    },
  ];

  return (
    <div className="min-h-screen w-screen bg-[#11100F] text-white flex flex-col lg:flex-row overflow-hidden relative select-none">
      {/* Background Ambient Radial Glows */}
      <div className="absolute -top-32 -right-32 w-[650px] h-[650px] bg-[#C4785A]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-[#8C3D28]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* LEFT: FLOATING PURE WHITE CARD (The Onboarding happens directly here!) */}
      <div className="w-full lg:w-[560px] xl:w-[600px] p-4 sm:p-6 lg:p-7 shrink-0 flex flex-col justify-center z-20">
        <div className="bg-white text-neutral-900 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-neutral-100 flex flex-col justify-between max-h-[calc(100vh-48px)] overflow-y-auto">
          {/* Card Top: Atrium Brand Logo Emblem */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                {/* 4-Square Terracotta Logo */}
                <div className="w-11 h-11 rounded-2xl bg-[#2A2420] flex items-center justify-center p-2.5 shadow-xs">
                  <div className="grid grid-cols-2 gap-1 w-5 h-5">
                    <div className="w-2 h-2 rounded-xs bg-[#C4785A]" />
                    <div className="w-2 h-2 rounded-xs bg-[#C4785A]" />
                    <div className="w-2 h-2 rounded-xs bg-[#C4785A]" />
                    <div className="w-2 h-2 rounded-xs bg-[#C4785A]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black tracking-tight text-neutral-900">
                      ATRIUM
                    </span>
                    <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full uppercase">
                      Setup
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 block -mt-0.5">
                    Business Management OS
                  </span>
                </div>
              </div>

              {/* Step Pill */}
              <div className="h-7 px-3 rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                <span>Step {currentStep} of 4</span>
              </div>
            </div>

            {/* 4-Step Progress Bar */}
            <div className="grid grid-cols-4 gap-1.5 my-4">
              {[
                { n: 1, label: 'Owner' },
                { n: 2, label: 'Vertical' },
                { n: 3, label: 'License' },
                { n: 4, label: 'Launch' },
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

            {/* STEP 1: OWNER ACCOUNT CREATION */}
            {currentStep === 1 && (
              <div className="space-y-3.5 py-1 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900">
                    Create Owner Profile
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Configure your root administrator credentials for this facility.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Amine Bentouati"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#C4785A] transition-colors"
                      />
                      <User size={14} className="absolute left-3 top-3 text-neutral-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Work Email *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@myfacility.dz"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#C4785A] transition-colors"
                      />
                      <Mail size={14} className="absolute left-3 top-3 text-neutral-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+213 550 00 00"
                          className="w-full h-10 pl-8 pr-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#C4785A] transition-colors"
                        />
                        <Phone size={13} className="absolute left-2.5 top-3 text-neutral-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Admin Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full h-10 pl-8 pr-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#C4785A] transition-colors"
                        />
                        <Lock size={13} className="absolute left-2.5 top-3 text-neutral-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FDF4F0] border border-[#FBE5DC] text-xs text-[#8C3D28] flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#C4785A] shrink-0" />
                  <span>
                    Your account is equipped with full multi-tenant encryption & owner rights.
                  </span>
                </div>
              </div>
            )}

            {/* STEP 2: BUSINESS & VERTICAL */}
            {currentStep === 2 && (
              <div className="space-y-3 py-1 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900">
                    Business Setup & Vertical
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select your business archetype to adapt layouts and workflows.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Atrium Club"
                      className="w-full h-9 px-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#C4785A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      First Branch *
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Flagship Location"
                      className="w-full h-9 px-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#C4785A]"
                    />
                  </div>
                </div>

                {/* Search Bar & Semantic Matcher */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-neutral-700">
                      Search Your Business Activity
                    </label>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      Auto-detects matching category
                    </span>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      value={businessSearchQuery}
                      onChange={(e) => handleBusinessSearch(e.target.value)}
                      placeholder="e.g. Barbershop, CrossFit, Pâtisserie, Coworking, UI Designer..."
                      className="w-full h-9 pl-9 pr-8 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#C4785A] transition-all"
                    />
                    {businessSearchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        title="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Popular Quick Suggestion Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-[11px]">
                    <span className="text-[10px] text-neutral-400 font-semibold shrink-0">Popular:</span>
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
                </div>

                {/* 7 Verticals Compact Grid */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-neutral-700">
                      Industry Categories ({verticals.length})
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      Click any card to override
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {verticals.map((v) => {
                      const isSelected = category === v.id;
                      const isSearchMatch = matchResult && matchResult.category === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            setCategory(v.id);
                            // Keep search context or clear if manually overridden
                          }}
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
              </div>
            )}

            {/* STEP 3: LICENSE & CASH VOUCHER */}
            {currentStep === 3 && (
              <div className="space-y-3 py-1 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900">
                    License & Activation
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Activate with cash voucher or begin with a 30-day trial.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setLicenseOption('trial')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      licenseOption === 'trial'
                        ? 'bg-[#FDF4F0] border-[#C4785A] ring-1 ring-[#C4785A]'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-neutral-900">Free Trial</span>
                      {licenseOption === 'trial' && <Check size={14} className="text-[#C4785A]" />}
                    </div>
                    <p className="text-[11px] text-neutral-500">30 days full access</p>
                    <span className="text-[10px] font-bold text-emerald-600 block mt-2">
                      Zero commitment
                    </span>
                  </div>

                  <div
                    onClick={() => setLicenseOption('voucher')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      licenseOption === 'voucher'
                        ? 'bg-[#FDF4F0] border-[#C4785A] ring-1 ring-[#C4785A]'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-neutral-900">Cash Voucher</span>
                      {licenseOption === 'voucher' && <Check size={14} className="text-[#C4785A]" />}
                    </div>
                    <p className="text-[11px] text-neutral-500">Perpetual lifetime</p>
                    <span className="text-[10px] font-bold text-[#C4785A] block mt-2">
                      Never expires
                    </span>
                  </div>
                </div>

                {/* Voucher code input */}
                {licenseOption === 'voucher' && (
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                    <label className="block text-xs font-bold text-neutral-700">
                      Enter 24-character Voucher Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => handleVoucherInput(e.target.value)}
                        placeholder="ATR-PRO-LIFE-XXXX-XXXX"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-[#C4785A]"
                      />
                      <KeyRound size={14} className="absolute left-3 top-3 text-neutral-400" />
                    </div>

                    {voucherValidation.isValid ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                        <BadgeCheck size={14} />
                        <span>Valid {voucherValidation.tierName} Lifetime Code</span>
                      </div>
                    ) : (
                      <span className="text-rose-500 text-[10px] block">
                        {voucherValidation.error || 'Enter a valid ATR-{TIER}-LIFE-XXXX-XXXX code'}
                      </span>
                    )}

                    {/* Quick codes */}
                    <div className="pt-2 border-t border-neutral-200 flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 font-bold">Test:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickVoucher('ATR-STARTER-LIFE-1122-3344')}
                        className="px-2 py-0.5 rounded bg-white border border-neutral-200 text-[10px] font-mono hover:border-[#C4785A]"
                      >
                        Starter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickVoucher('ATR-PRO-LIFE-A4B2-C9D1')}
                        className="px-2 py-0.5 rounded bg-white border border-[#C4785A] text-[10px] font-mono text-[#C4785A] font-bold"
                      >
                        Pro
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickVoucher('ATR-ENTERPRISE-LIFE-FFFF-0000')}
                        className="px-2 py-0.5 rounded bg-white border border-neutral-200 text-[10px] font-mono hover:border-[#C4785A]"
                      >
                        Enterprise
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: REVIEW & LAUNCH */}
            {currentStep === 4 && (
              <div className="space-y-3.5 py-1 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900">
                    Ready to Launch Workspace
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Your facility instance is primed with category-tailored models.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5 text-xs">
                  <div className="flex justify-between pb-1.5 border-b border-neutral-200">
                    <span className="text-neutral-500">Business & Vertical:</span>
                    <span className="font-bold text-neutral-900 capitalize">
                      {businessName} ({category.replace('_', ' ')})
                    </span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-neutral-200">
                    <span className="text-neutral-500">Primary Branch:</span>
                    <span className="font-bold text-neutral-900">{branchName}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-neutral-200">
                    <span className="text-neutral-500">Owner Admin:</span>
                    <span className="font-bold text-neutral-900">{fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">License Entitlement:</span>
                    <span className="font-bold text-emerald-600">
                      {licenseOption === 'voucher'
                        ? `${voucherValidation.tierName || 'Pro'} Lifetime License`
                        : 'Free Trial (30 Days)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Database partition isolated and secured with multi-tenant rules</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Sample plans, members, and POS retail items populated</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Footer: Buttons */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="h-10 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSkipToDashboard}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
              >
                Skip & Open Demo
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-10 px-5 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <span>Continue</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchWorkspace}
                disabled={isProvisioning}
                className="h-11 px-6 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                <Rocket size={15} />
                <span>{isProvisioning ? 'Launching...' : 'Launch Workspace'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: POWERFUL BRAND SHOWCASE & SPATIAL VISUAL CANVAS */}
      <div className="flex-1 p-6 sm:p-10 lg:p-14 flex flex-col justify-between overflow-y-auto z-10 hidden md:flex">
        {/* Top Tagline */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-neutral-400">
              Atrium Cloud & Local Runtime v2.4
            </span>
          </div>

          <button
            type="button"
            onClick={onSkipToDashboard}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-neutral-900/60 border border-neutral-800 cursor-pointer transition-colors"
          >
            <span>Open Existing Workspace (Tamer)</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Hero Copy */}
        <div className="my-auto py-8 max-w-xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C4785A]/15 border border-[#C4785A]/30 text-[#C4785A] text-xs font-bold">
            <Sparkles size={13} />
            <span>Multi-Tenant & Multi-Vertical Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            The Operating System for Modern Facilities.
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-normal">
            Whether running a high-footfall gym, aesthetic clinic, fast-casual restaurant, or creative agency, Atrium adapts terminology, workflows, and terminal POS to your exact domain.
          </p>

          {/* Spatial Cards Showcase */}
          <div className="grid grid-cols-2 gap-3.5 pt-3">
            {/* Tile 1: Live RFID Turnstile & Footfall */}
            <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Live Footfall</span>
                <Activity size={14} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white tabular-nums tracking-tight">
                48 <span className="text-xs text-neutral-500 font-semibold">/ 100 inside</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 block">
                1-Second RFID Check-in
              </span>
            </div>

            {/* Tile 2: Cash Lifetime Licensing */}
            <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Cash Licensing</span>
                <KeyRound size={14} className="text-[#C4785A]" />
              </div>
              <div className="text-xs font-mono font-bold text-neutral-200">
                ATR-PRO-LIFE-XXXX
              </div>
              <span className="text-[11px] font-semibold text-[#C4785A] block">
                Perpetual • Zero Monthly Fee
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof / Spec Badge */}
        <div className="pt-6 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
          <span>Engineered with Apple Spatial & Clean Architecture precision</span>
          <span>English • Français • العربية</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Building2,
  Dumbbell,
  Scissors,
  Utensils,
  Briefcase,
  KeyRound,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
  Rocket,
  MapPin,
  Mail,
  User,
  Phone,
  Lock,
  Search,
  Laptop,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { BusinessCategory, OnboardingParams } from '../../types/index';
import { validateVoucherCode } from '../../utils/rules';
import {
  findCategoryByBusinessSearch,
  POPULAR_BUSINESS_SEARCHES,
  BusinessMatchResult,
} from '../../utils/businessMapping';
import { LabelInput } from '../ui/LabelInput';
import { Seek } from '../ui/Seek';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onClose }) => {
  const { completeOnboarding, language } = useAtriumStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Account
  const [fullName, setFullName] = useState('Amine Bentouati');
  const [email, setEmail] = useState('bentouatitamer@gmail.com');
  const [phone, setPhone] = useState('+213 550 12 34 56');
  const [password, setPassword] = useState('SecretPass123!');

  // Step 2: Business & Category
  const [businessName, setBusinessName] = useState('Atrium Elite Center');
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
  const [licenseOption, setLicenseOption] = useState<'trial' | 'voucher'>('trial');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherValidation, setVoucherValidation] = useState<{
    isValid: boolean;
    tierName?: 'Starter' | 'Pro' | 'Enterprise';
    error?: string;
  }>({ isValid: false });

  // Step 4: Launching state
  const [isProvisioning, setIsProvisioning] = useState(false);

  if (!isOpen) return null;

  const handleVoucherChange = (val: string) => {
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
    handleVoucherChange(code);
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

  const handleCompleteLaunch = () => {
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
      onClose();
    }, 700);
  };

  const categories: Array<{
    id: BusinessCategory;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    tagline: string;
  }> = [
    {
      id: 'membership_session',
      title: 'Gym & Fitness',
      subtitle: 'Gyms, Martial arts, CrossFit clubs',
      icon: <Dumbbell size={20} className="text-[#C4785A]" />,
      tagline: 'RFID Access & Class Timetables',
    },
    {
      id: 'appointment_service',
      title: 'Salon & Beauty',
      subtitle: 'Spas, Hair salons, Barbershops',
      icon: <Scissors size={20} className="text-[#C4785A]" />,
      tagline: 'Stylist Bookings & Treatment Packs',
    },
    {
      id: 'pos_inventory',
      title: 'Restaurant & POS',
      subtitle: 'Restaurants, Cafés, Retail shops',
      icon: <Utensils size={20} className="text-[#C4785A]" />,
      tagline: 'Orders, Menus & High-Speed POS',
    },
    {
      id: 'project_milestone',
      title: 'Projects & Agency',
      subtitle: 'Design, Architecture, Law, Consulting',
      icon: <Briefcase size={20} className="text-[#C4785A]" />,
      tagline: 'Client Retainers & Timeline Tracking',
    },
    {
      id: 'rental_booking',
      title: 'Rentals & Venue',
      subtitle: 'Coworking, Event venues, Gear rentals',
      icon: <Building2 size={20} className="text-[#C4785A]" />,
      tagline: 'Space Occupancy & Time Slots',
    },
    {
      id: 'education_cohort',
      title: 'Education & Academy',
      subtitle: 'Bootcamps, Language schools, Tutoring',
      icon: <GraduationCap size={20} className="text-[#C4785A]" />,
      tagline: 'Cohort Enrollment & Course Schedules',
    },
    {
      id: 'freelance_solo',
      title: 'Freelancers & Solo',
      subtitle: 'Design, Dev, Consulting, Media Creators',
      icon: <Laptop size={20} className="text-[#C4785A]" />,
      tagline: 'Floating Stopwatch, Retainers & Invoices',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-[30px] bg-[#1E1B19] border border-[#3E3832] shadow-2xl text-white p-6 sm:p-8 overflow-hidden">
        {/* Top Header Row with Step Indicator & Close */}
        <div className="flex items-center justify-between pb-5 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A2420] border border-[#483B33] flex items-center justify-center">
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
                <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
                <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
                <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Atrium Setup Wizard</span>
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/15 px-2 py-0.5 rounded-full">
                  {language === 'ar' ? `المرحلة ${currentStep} من 4` : language === 'fr' ? `Étape ${currentStep} sur 4` : `Step ${currentStep} of 4`}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {currentStep === 1 && (language === 'ar' ? 'إنشاء الملف الشخصي للمالك والمسؤول' : language === 'fr' ? 'Créez votre profil d\'administrateur propriétaire' : 'Create your owner administrator profile')}
                {currentStep === 2 && (language === 'ar' ? 'تهيئة قطاع النشاط والفرع الأول للمنشأة' : language === 'fr' ? 'Configurez l\'activité métier et le premier établissement' : 'Configure business vertical & first facility branch')}
                {currentStep === 3 && (language === 'ar' ? 'اختر خطة الترخيص أو أدخل قسيمة الدفع المسبق' : language === 'fr' ? 'Choisissez votre licence ou saisissez votre code bon' : 'Choose your license or enter cash voucher code')}
                {currentStep === 4 && (language === 'ar' ? 'تأكيد البيانات وتهيئة مساحة العمل' : language === 'fr' ? 'Confirmez les détails et initialisez l\'espace de travail' : 'Confirm details and provision workspace')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* 4-Step Progress Indicator Bar */}
        <div className="grid grid-cols-4 gap-2 my-5">
          {[
            { num: 1, label: language === 'ar' ? 'الحساب' : language === 'fr' ? 'Compte' : 'Account' },
            { num: 2, label: language === 'ar' ? 'النشاط' : language === 'fr' ? 'Activité' : 'Business' },
            { num: 3, label: language === 'ar' ? 'الترخيص' : language === 'fr' ? 'Licence' : 'License' },
            { num: 4, label: language === 'ar' ? 'الإطلاق' : language === 'fr' ? 'Lancement' : 'Launch' },
          ].map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isDone || isCurrent ? 'bg-[#C4785A]' : 'bg-neutral-800'
                  }`}
                />
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
                  {isDone ? (
                    <Check size={11} className="text-[#C4785A]" />
                  ) : (
                    <span>{s.num}.</span>
                  )}
                  <span className={isCurrent ? 'text-white font-bold' : ''}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* STEP 1: Account Setup */}
        {currentStep === 1 && (
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                label={language === 'ar' ? 'كلمة المرور للمحطة' : language === 'fr' ? 'Mot de passe du terminal' : 'Terminal Password'}
                value={password}
                onChange={setPassword}
                type="password"
                width="100%"
                height={46}
                corner={14}
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2 mt-2">
              <ShieldCheck size={16} className="text-[#C4785A] shrink-0" />
              <span>
                Your owner account will have super-admin privileges over all businesses, branches, staff, and financial reports.
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: Business Setup & Category Selection */}
        {currentStep === 2 && (
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="Business"
                label={language === 'ar' ? 'اسم المنشأة أو العلامة' : language === 'fr' ? 'Nom de l\'établissement' : 'Business / Brand Name'}
                value={businessName}
                onChange={setBusinessName}
                width="100%"
                height={46}
                corner={14}
              />
              <LabelInput
                field="Branch"
                label={language === 'ar' ? 'مقر الفرع الأول' : language === 'fr' ? 'Emplacement du 1er site' : 'First Branch Location'}
                value={branchName}
                onChange={setBranchName}
                width="100%"
                height={46}
                corner={14}
              />
            </div>

            {/* Search Bar & Semantic Matcher */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-neutral-300">
                  Search Your Business Activity
                </label>
                <span className="text-[11px] text-neutral-400 font-medium">
                  Auto-maps to vertical
                </span>
              </div>
              <Seek
                value={businessSearchQuery}
                onChange={handleBusinessSearch}
                placeholder="e.g. Barbershop, CrossFit, Pâtisserie, Coworking, UI Designer..."
                openWidth={380}
                shutSize={38}
              />

              {/* Popular Quick Suggestion Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] text-neutral-500 font-semibold shrink-0">Popular:</span>
                {POPULAR_BUSINESS_SEARCHES.map((item) => {
                  const isChipActive =
                    category === item.category &&
                    businessSearchQuery.toLowerCase().includes(item.label.toLowerCase().slice(0, 4));
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSelectPopularSearch(item)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer border ${
                        isChipActive
                          ? 'bg-[#2A2420] text-[#C4785A] border-[#483B33] font-bold'
                          : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-transparent'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Match Feedback Banner */}
              {matchResult && (
                <div className="px-3.5 py-2 rounded-xl bg-[#2A2420] border border-[#483B33] text-xs text-[#E5A186] flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={14} className="text-[#C4785A] shrink-0" />
                    <span className="truncate">
                      Auto-matched from <strong>"{matchResult.matchedKeyword}"</strong> → <strong className="text-white">{matchResult.categoryTitle}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#C4785A] shrink-0 ml-2 uppercase tracking-wide">
                    Selected
                  </span>
                </div>
              )}
            </div>

            {/* 7 Business Category Cards Grid */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-neutral-300">
                  Industry Verticals ({categories.length})
                </label>
                <span className="text-[11px] text-neutral-500">
                  Click any card to override
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {categories.map((cat) => {
                  const isSelected = category === cat.id;
                  const isSearchMatch = matchResult && matchResult.category === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#2A2420] border-[#C4785A] shadow-md ring-1 ring-[#C4785A]'
                          : isSearchMatch
                          ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/60'
                          : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center">
                          {cat.icon}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#C4785A] text-white flex items-center justify-center">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{cat.title}</span>
                        {isSearchMatch && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4785A] animate-pulse" />
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                        {cat.subtitle}
                      </div>
                      <div className="text-[9px] font-semibold text-[#C4785A] mt-2 block truncate">
                        {cat.tagline}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <LabelInput
                field="Address"
                label={language === 'ar' ? 'عنوان المنشأة (اختياري)' : language === 'fr' ? 'Adresse de l\'établissement (Facultatif)' : 'Facility Address (Optional)'}
                value={branchAddress}
                onChange={setBranchAddress}
                width="100%"
                height={46}
                corner={14}
              />
            </div>
          </div>
        )}

        {/* STEP 3: License & Subscription */}
        {currentStep === 3 && (
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Free Trial */}
              <div
                onClick={() => setLicenseOption('trial')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  licenseOption === 'trial'
                    ? 'bg-[#2A2420] border-[#C4785A] shadow-md ring-1 ring-[#C4785A]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">
                    {language === 'ar' ? 'فترة تقييم مجانية (30 يوماً)' : language === 'fr' ? 'Essai gratuit (30 jours)' : 'Free Trial (30 Days)'}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      licenseOption === 'trial'
                        ? 'border-[#C4785A] bg-[#C4785A]'
                        : 'border-neutral-600'
                    }`}
                  >
                    {licenseOption === 'trial' && <Check size={11} className="text-white" />}
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {language === 'ar'
                    ? 'ابدأ مباشرة بدون أي التزام. منشأة واحدة، فرع واحد، جهاز بيع واحد، وحتى 3 موظفين.'
                    : language === 'fr'
                    ? 'Démarrez sans engagement. 1 entreprise, 1 succursale, 1 caisse et jusqu\'à 3 collaborateurs.'
                    : 'Start immediately with zero commitment. 1 Business, 1 Branch, 1 Device, and up to 3 staff members.'}
                </p>
                <div className="mt-3 text-[11px] font-bold text-emerald-400">
                  {language === 'ar' ? 'تفعيل فوري — بدون بطاقة دفع' : language === 'fr' ? 'Activation immédiate — Sans carte bancaire' : 'Instant activation — No credit card required'}
                </div>
              </div>

              {/* Option B: Lifetime Cash Voucher */}
              <div
                onClick={() => setLicenseOption('voucher')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  licenseOption === 'voucher'
                    ? 'bg-[#2A2420] border-[#C4785A] shadow-md ring-1 ring-[#C4785A]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">
                    {language === 'ar' ? 'قسيمة دفع مسبق مدى الحياة' : language === 'fr' ? 'Bon prépayé à vie' : 'Prepaid Lifetime Voucher'}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      licenseOption === 'voucher'
                        ? 'border-[#C4785A] bg-[#C4785A]'
                        : 'border-neutral-600'
                    }`}
                  >
                    {licenseOption === 'voucher' && <Check size={11} className="text-white" />}
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {language === 'ar'
                    ? 'تفعيل قسيمة تم شراؤها مسبقاً لدى نقاط التوزيع. تمنحك ترخيصاً دائماً مدى الحياة.'
                    : language === 'fr'
                    ? 'Activez un code acheté en point de vente. Débloque un accès perpétuel à vie.'
                    : 'Redeem a cash voucher code purchased at point of sale. Unlocks perpetual lifetime access.'}
                </p>
                <div className="mt-3 text-[11px] font-bold text-[#C4785A]">
                  {language === 'ar' ? 'لا تنتهي الصلاحية — ترخيص دائم' : language === 'fr' ? 'Sans expiration — Licence perpétuelle' : 'Never expires — Perpetual license'}
                </div>
              </div>
            </div>

            {/* Voucher Code Input Block */}
            {licenseOption === 'voucher' && (
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3 animate-in fade-in">
                <LabelInput
                  field="Voucher"
                  label={language === 'ar' ? 'رمز قسيمة التفعيل' : language === 'fr' ? 'Code du bon d\'activation' : 'Voucher Code'}
                  value={voucherCode}
                  onChange={handleVoucherChange}
                  placeholder="ATR-PRO-LIFE-XXXX-XXXX"
                  width="100%"
                  height={46}
                  corner={14}
                />

                {voucherCode && (
                  <div className="flex items-center justify-between text-xs">
                    {voucherValidation.isValid ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <BadgeCheck size={15} />
                        <span>Valid {voucherValidation.tierName} Perpetual Lifetime Code</span>
                      </div>
                    ) : (
                      <span className="text-rose-400 text-[11px]">
                        {voucherValidation.error || 'Invalid code format. Expected: ATR-{TIER}-LIFE-XXXX-XXXX'}
                      </span>
                    )}
                  </div>
                )}

                {/* Sample Test Codes for rapid demo */}
                <div className="pt-2 border-t border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">
                    Quick Sample Test Vouchers:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickVoucher('ATR-STARTER-LIFE-1122-3344')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300 cursor-pointer"
                    >
                      Starter
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickVoucher('ATR-PRO-LIFE-A4B2-C9D1')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-[#C4785A] font-bold cursor-pointer"
                    >
                      Pro Lifetime
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickVoucher('ATR-ENTERPRISE-LIFE-FFFF-0000')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-amber-400 cursor-pointer"
                    >
                      Enterprise
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review & Launch */}
        {currentStep === 4 && (
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {language === 'ar' ? 'ملخص التهيئة والإعداد' : language === 'fr' ? 'Résumé de la configuration' : 'Configuration Summary'}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">
                    {language === 'ar' ? 'المالك والمسؤول:' : language === 'fr' ? 'Administrateur propriétaire :' : 'Owner Administrator:'}
                  </span>
                  <span className="font-bold text-white">{fullName}</span>
                  <span className="text-neutral-400 text-[11px] block">{email}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">
                    {language === 'ar' ? 'المنشأة والقطاع:' : language === 'fr' ? 'Entreprise & Activité :' : 'Business & Vertical:'}
                  </span>
                  <span className="font-bold text-white">{businessName}</span>
                  <span className="text-[#C4785A] font-semibold text-[11px] block capitalize">
                    {category.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">
                    {language === 'ar' ? 'الفرع الأول:' : language === 'fr' ? 'Première succursale :' : 'First Branch:'}
                  </span>
                  <span className="font-bold text-white">{branchName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">
                    {language === 'ar' ? 'حالة الترخيص:' : language === 'fr' ? 'Statut de licence :' : 'License Status:'}
                  </span>
                  <span className="font-bold text-emerald-400">
                    {licenseOption === 'voucher'
                      ? (language === 'ar'
                        ? `${voucherValidation.tierName || 'Pro'} مدى الحياة دائم`
                        : language === 'fr'
                        ? `${voucherValidation.tierName || 'Pro'} Licence perpétuelle`
                        : `${voucherValidation.tierName || 'Pro'} Perpetual Lifetime`)
                      : (language === 'ar' ? 'فترة تجريبية (30 يوماً)' : language === 'fr' ? 'Essai gratuit (30 jours)' : 'Free Trial (30 Days)')}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist of Auto-provisioned amenities */}
            <div className="space-y-2 text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>
                  {language === 'ar'
                    ? 'تمت تهيئة قسم البيانات المخصص للمنشأة مع تعيين الفرع الرئيسي'
                    : language === 'fr'
                    ? 'Partition multi-locataire initialisée avec rattachement du site principal'
                    : 'Multi-tenant partition initialized with primary branch assignment'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>
                  {language === 'ar'
                    ? 'تم تجهيز خطط الاشتراكات الافتراضية وكتالوج المنتجات للقطاع المحدد'
                    : language === 'fr'
                    ? 'Plans d\'adhésion métier et catalogue d\'articles initialisés'
                    : 'Initial category-specific membership plans and retail catalog bootstrapped'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>
                  {language === 'ar'
                    ? 'تم تعيين بيانات اعتماد المالك ورمز PIN للمحطة المكون من 4 أرقام'
                    : language === 'fr'
                    ? 'Identifiants du propriétaire et code PIN à 4 chiffres configurés'
                    : 'Owner credentials and 4-digit terminal access PIN configured'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-5 mt-4 border-t border-neutral-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="h-10 px-4 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft size={14} className={language === 'ar' ? 'rotate-180' : ''} />
              <span>{language === 'ar' ? 'السابق' : language === 'fr' ? 'Précédent' : 'Previous'}</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="h-10 px-5 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>{language === 'ar' ? 'متابعة' : language === 'fr' ? 'Continuer' : 'Continue'}</span>
              <ChevronRight size={14} className={language === 'ar' ? 'rotate-180' : ''} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteLaunch}
              disabled={isProvisioning}
              className="h-11 px-6 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Rocket size={15} />
              <span>
                {isProvisioning
                  ? (language === 'ar' ? 'جارٍ الإطلاق...' : language === 'fr' ? 'Initialisation...' : 'Provisioning...')
                  : (language === 'ar' ? 'إطلاق مساحة عمل Atrium ERP' : language === 'fr' ? 'Lancer l\'espace Atrium ERP' : 'Launch Atrium ERP Workspace')}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { BusinessCategory, OnboardingParams } from '../../types/index';
import { validateVoucherCode } from '../../utils/rules';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onClose }) => {
  const { completeOnboarding } = useAtriumStore();

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
                  Step {currentStep} of 4
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {currentStep === 1 && 'Create your owner administrator profile'}
                {currentStep === 2 && 'Configure business vertical & first facility branch'}
                {currentStep === 3 && 'Choose your license or enter cash voucher code'}
                {currentStep === 4 && 'Confirm details and provision workspace'}
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
            { num: 1, label: 'Account' },
            { num: 2, label: 'Business' },
            { num: 3, label: 'License' },
            { num: 4, label: 'Launch' },
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
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Amine Bentouati"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs focus:outline-none focus:border-[#C4785A]"
                  />
                  <User size={14} className="absolute left-3 top-3.5 text-neutral-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Work Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@mybusiness.dz"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs focus:outline-none focus:border-[#C4785A]"
                  />
                  <Mail size={14} className="absolute left-3 top-3.5 text-neutral-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+213 550 00 00 00"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs focus:outline-none focus:border-[#C4785A]"
                  />
                  <Phone size={14} className="absolute left-3 top-3.5 text-neutral-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Owner Terminal Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs focus:outline-none focus:border-[#C4785A]"
                  />
                  <Lock size={14} className="absolute left-3 top-3.5 text-neutral-500" />
                </div>
              </div>
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
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Business / Brand Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Atrium Fitness Club"
                  className="w-full h-10 px-3 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs focus:outline-none focus:border-[#C4785A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  First Branch Location Name *
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Hydra Main Branch"
                  className="w-full h-10 px-3 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs focus:outline-none focus:border-[#C4785A]"
                />
              </div>
            </div>

            {/* 6 Business Category Cards Grid */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Select Business Category (Vertical)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {categories.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#2A2420] border-[#C4785A] shadow-md ring-1 ring-[#C4785A]'
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
                      <div className="text-xs font-bold text-white">{cat.title}</div>
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
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Facility Address (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Street address, city"
                  className="w-full h-10 pl-8 pr-3 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs focus:outline-none focus:border-[#C4785A]"
                />
                <MapPin size={13} className="absolute left-3 top-3 text-neutral-500" />
              </div>
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
                  <span className="text-xs font-bold text-white">Free Trial (30 Days)</span>
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
                  Start immediately with zero commitment. 1 Business, 1 Branch, 1 Device, and up to 3 staff members.
                </p>
                <div className="mt-3 text-[11px] font-bold text-emerald-400">
                  Instant activation — No credit card required
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
                  <span className="text-xs font-bold text-white">Prepaid Lifetime Voucher</span>
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
                  Redeem a cash voucher code purchased at point of sale. Unlocks perpetual lifetime access.
                </p>
                <div className="mt-3 text-[11px] font-bold text-[#C4785A]">
                  Never expires — Perpetual license
                </div>
              </div>
            </div>

            {/* Voucher Code Input Block */}
            {licenseOption === 'voucher' && (
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3 animate-in fade-in">
                <label className="block text-xs font-semibold text-neutral-300">
                  Enter 24-character Voucher Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => handleVoucherChange(e.target.value)}
                    placeholder="ATR-PRO-LIFE-XXXX-XXXX"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/60 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-[#C4785A]"
                  />
                  <KeyRound size={15} className="absolute left-3.5 top-3.5 text-neutral-500" />
                </div>

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
                Configuration Summary
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Owner Administrator:</span>
                  <span className="font-bold text-white">{fullName}</span>
                  <span className="text-neutral-400 text-[11px] block">{email}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Business & Vertical:</span>
                  <span className="font-bold text-white">{businessName}</span>
                  <span className="text-[#C4785A] font-semibold text-[11px] block capitalize">
                    {category.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">First Branch:</span>
                  <span className="font-bold text-white">{branchName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">License Status:</span>
                  <span className="font-bold text-emerald-400">
                    {licenseOption === 'voucher'
                      ? `${voucherValidation.tierName || 'Pro'} Perpetual Lifetime`
                      : 'Free Trial (30 Days)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist of Auto-provisioned amenities */}
            <div className="space-y-2 text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Multi-tenant partition initialized with primary branch assignment</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Initial category-specific membership plans and retail catalog bootstrapped</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Owner credentials and 4-digit terminal access PIN configured</span>
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
              <ChevronLeft size={14} />
              <span>Previous</span>
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
              <span>Continue</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteLaunch}
              disabled={isProvisioning}
              className="h-11 px-6 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Rocket size={15} />
              <span>{isProvisioning ? 'Provisioning...' : 'Launch Atrium ERP Workspace'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

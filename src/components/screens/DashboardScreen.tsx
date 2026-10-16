import React, { useState } from 'react';
import {
  Home,
  Plus,
  ArrowDown,
  ArrowUp,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  TrendingUp,
  Sparkles,
  UserCheck,
  CreditCard,
  KeyRound,
  Check,
  Building2,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';

interface DashboardScreenProps {
  onAddMember: () => void;
  onOpenVoucherModal?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const {
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    currentBranchId,
    switchBusiness,
    switchBranch,
    setScreen,
  } = useAtriumStore();

  const [activityTab, setActivityTab] = useState<'Tous' | 'Passages' | 'Ventes'>('Tous');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(2); // Step 3 / 5
  const [peopleInside, setPeopleInside] = useState(0);
  const [entreesJour, setEntreesJour] = useState(48);

  const tips = [
    {
      step: 'STEP 1 / 5',
      title: 'Conseil Atrium',
      text: 'Configure RFID key fobs or NFC cards for rapid 1-second front desk access.',
      buttonText: 'Configurer RFID',
      action: onAddMember,
    },
    {
      step: 'STEP 2 / 5',
      title: 'Conseil Atrium',
      text: 'Enable automated SMS/WhatsApp renewal alerts 3 days prior to expiration.',
      buttonText: 'Gérer les alertes',
      action: () => setScreen('members'),
    },
    {
      step: 'STEP 3 / 5',
      title: 'Conseil Atrium',
      text: "Track daily visitors who aren't members using the Walk-in quick action module.",
      buttonText: 'Enregistrer un passage',
      action: () => {
        setPeopleInside((p) => Math.min(100, p + 1));
        setEntreesJour((e) => e + 1);
      },
    },
    {
      step: 'STEP 4 / 5',
      title: 'Conseil Atrium',
      text: 'Review daily POS product inventory to optimize supplement and retail margins.',
      buttonText: 'Ouvrir la Boutique',
      action: () => setScreen('shop'),
    },
    {
      step: 'STEP 5 / 5',
      title: 'Conseil Atrium',
      text: 'Activate your perpetual cash voucher to unlock multi-branch management.',
      buttonText: 'Activer la Licence',
      action: onOpenVoucherModal || onAddMember,
    },
  ];

  // Pillar chart mock data matching desktop screenshot
  const pillarHeights = [38, 55, 75, 70, 95, 62, 40, 78, 30, 48];
  const pillarColors = [
    '#C4785A',
    '#C4785A',
    '#C4785A',
    '#C4785A',
    '#C4785A',
    '#E59E80',
    '#EADCD2',
    '#EADCD2',
    '#EADCD2',
    '#EADCD2',
  ];

  const pillarHours = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '14:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
  ];

  const allActivities = [
    {
      id: 'act_01',
      type: 'Ventes',
      member: 'amira - A1',
      operation: 'Sale (1,500 DA)',
      status: 'completed',
      time: '20h ago',
    },
    {
      id: 'act_02',
      type: 'Ventes',
      member: 'Guest - water',
      operation: 'Sale (100 DA)',
      status: 'completed',
      time: '1d ago',
    },
    {
      id: 'act_03',
      type: 'Ventes',
      member: 'Guest - water',
      operation: 'Sale (100 DA)',
      status: 'completed',
      time: '2d ago',
    },
    {
      id: 'act_04',
      type: 'Ventes',
      member: 'Guest - protine',
      operation: 'Sale (1,000 DA)',
      status: 'completed',
      time: '2d ago',
    },
    {
      id: 'act_05',
      type: 'Passages',
      member: 'amira - A1',
      operation: 'Check-in (Entrée Badge)',
      status: 'admitted',
      time: '2h ago',
    },
    {
      id: 'act_06',
      type: 'Passages',
      member: 'saraa - A1',
      operation: 'Check-in (Entrée Badge)',
      status: 'admitted',
      time: '4h ago',
    },
  ];

  const filteredActivities = allActivities.filter((item) => {
    if (activityTab === 'Tous') return true;
    return item.type === activityTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching Desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Welcome back, Tamer!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Here is what's happening at your facility today.
          </p>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Facility Dropdown Menu */}
            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Switch Facility / Vertical
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Quick Actions Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Quick Actions</span>
            </button>

            {/* Quick Actions Dropdown Menu */}
            {isQuickActionsOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onAddMember();
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                >
                  <Plus size={14} className="text-[#C4785A]" />
                  <span className="font-semibold">Add New Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setPeopleInside((p) => Math.min(100, p + 1));
                    setEntreesJour((e) => e + 1);
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                >
                  <UserCheck size={14} className="text-emerald-500" />
                  <span className="font-semibold">Quick Walk-in Passage</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setScreen('shop');
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                >
                  <ShoppingCart size={14} className="text-blue-500" />
                  <span className="font-semibold">Record POS Sale</span>
                </button>
                {onOpenVoucherModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onOpenVoucherModal();
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-[#C4785A] hover:bg-[#FCEEE8] dark:hover:bg-neutral-700/50 cursor-pointer"
                  >
                    <KeyRound size={14} />
                    <span className="font-semibold">Redeem Lifetime Voucher</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Summary Column + Right Activity Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Summary Card + Metrics + Tip (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Summary Group Container */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            {/* Summary Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Summary
                </h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Track live facility performance.
                </p>
              </div>
              <div className="h-7 px-3 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer shadow-2xs">
                <span>Daily</span>
                <ChevronDown size={12} className="text-neutral-400" />
              </div>
            </div>

            {/* People Inside & Entrées Jour — Pure White Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                  <ArrowDown size={13} className="text-[#C4785A]" />
                  <span>People Inside</span>
                </div>
                <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1 tabular-nums">
                  {peopleInside}{' '}
                  <span className="text-xs font-semibold text-neutral-400">/ 100</span>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                  <ArrowUp size={13} className="text-emerald-500" />
                  <span>Entrées Jour</span>
                </div>
                <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1 tabular-nums">
                  {entreesJour}{' '}
                  <span className="text-xs font-semibold text-neutral-400">entrées</span>
                </div>
              </div>
            </div>

            {/* Signature Rounded Pillar Bar Chart */}
            <div className="space-y-1.5 pt-1">
              <div className="h-28 flex items-end justify-between gap-2.5 px-1 pt-3">
                {pillarHeights.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end items-center h-full group relative"
                    title={`${pillarHours[i]}: ${Math.round((height / 100) * 80)} entrées`}
                  >
                    <div
                      style={{
                        height: `${height}%`,
                        backgroundColor: pillarColors[i],
                      }}
                      className="w-full rounded-full transition-all group-hover:opacity-80 group-hover:scale-y-105"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-neutral-400 px-1 font-mono">
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>19:00</span>
              </div>
            </div>
          </div>

          {/* Bottom 2 Metrics (Moyenne Semaine & Objectif Mensuel) — Separate White Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <div className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 flex items-center gap-1.5">
                <Clock size={13} className="text-neutral-400" />
                <span>Moyenne Semaine</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ +8.5%
                </span>
              </div>
              <div className="text-xl font-black text-neutral-900 dark:text-white mt-1 tabular-nums">
                18,400 DA
              </div>
            </div>

            <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <div className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-neutral-400" />
                <span>Objectif Mensuel</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ On Track
                </span>
              </div>
              <div className="text-xl font-black text-neutral-900 dark:text-white mt-1 tabular-nums">
                84.5%
              </div>
            </div>
          </div>

          {/* Conseil Atrium Tip Card — Pure White Card with Soft Border */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-md uppercase">
                  {tips[currentTipIndex].step}
                </span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {tips[currentTipIndex].title}
                </span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : tips.length - 1))
                  }
                  className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] font-semibold text-neutral-500">
                  {currentTipIndex + 1} / {tips.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentTipIndex((prev) => (prev < tips.length - 1 ? prev + 1 : 0))
                  }
                  className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <p className="text-xs text-[#52525B] dark:text-neutral-300 leading-relaxed min-h-[34px]">
              {tips[currentTipIndex].text}
            </p>

            <button
              type="button"
              onClick={tips[currentTipIndex].action}
              className="w-full h-10 rounded-xl bg-[#FDF4F0] dark:bg-neutral-700/70 text-[#C4785A] hover:bg-[#FBECE6] text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>{tips[currentTipIndex].buttonText}</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Activity Metrics & Recent Activity Table (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Activity Card with 3 Metrics */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Activity
              </h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Track your daily operational activity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tile 1: Revenue Today — Pure White Card with Soft Border */}
              <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                    Revenue Today
                  </span>
                  <div className="mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      ↗ 0%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                    0 DA
                  </div>
                  {/* Subtle terracotta baseline */}
                  <div className="w-full h-0.5 bg-[#C4785A] mt-2.5 rounded-full opacity-80" />
                </div>
              </div>

              {/* Tile 2: Active Members with Green Wave Curve — Pure White Card */}
              <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                    Active Members
                  </span>
                  <div className="mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      vs yesterday
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                    2
                  </div>
                  {/* Smooth green wave sparkline matching screenshot */}
                  <svg
                    className="w-full h-7 mt-1 text-emerald-500"
                    viewBox="0 0 100 25"
                    fill="none"
                  >
                    <path
                      d="M0 20 Q 25 24 50 14 T 100 5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Tile 3: Expiring Soon in Dark Obsidian (#18181B) */}
              <div className="p-4 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[126px] shadow-sm">
                <div>
                  <span className="text-[11px] font-medium text-neutral-300">
                    Expiring Soon
                  </span>
                  <div className="mt-0.5">
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                      ↘ 0%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-white tabular-nums">
                    0
                  </div>
                  <div className="w-full h-0.5 bg-amber-500 mt-2.5 rounded-full opacity-80" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card: Recent Activity Table Group */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Recent Activity
                </h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Track your daily operational activity.
                </p>
              </div>

              {/* Activity Filter Tabs: Tous | Passages | Ventes */}
              <div className="h-8 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center gap-0.5 text-xs font-semibold shadow-2xs">
                {(['Tous', 'Passages', 'Ventes'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivityTab(tab)}
                    style={{
                      backgroundColor:
                        activityTab === tab ? '#FDF4F0' : 'transparent',
                      color:
                        activityTab === tab ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      activityTab === tab ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Header and White Row Cards matching Screenshot_880 */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                <div className="col-span-5 flex items-center gap-1">
                  <span>Membre</span>
                  <span className="text-[10px]">↕</span>
                </div>
                <div className="col-span-4">Opération</div>
                <div className="col-span-1 text-center">Statut</div>
                <div className="col-span-2 text-right">Heure</div>
              </div>

              <div className="space-y-2">
                {filteredActivities.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 items-center px-4 py-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs hover:border-[#D5DFE3] dark:hover:border-neutral-600 transition-all"
                  >
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-full bg-[#FDF4F0] dark:bg-neutral-700/80 text-[#C4785A] flex items-center justify-center font-bold text-[11px] shrink-0 border border-[#F5E2D8] dark:border-neutral-600">
                        {row.type === 'Ventes' ? '$$' : 'IN'}
                      </div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {row.member}
                      </span>
                    </div>

                    <div className="col-span-4 text-xs text-[#52525B] dark:text-neutral-300 font-medium truncate pr-2">
                      {row.operation}
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        {row.type === 'Ventes' ? (
                          <ShoppingCart size={13} />
                        ) : (
                          <UserCheck size={13} />
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 text-right text-xs text-neutral-400 font-mono tabular-nums">
                      {row.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

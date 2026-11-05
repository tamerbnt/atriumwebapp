import React, { useState, useMemo } from 'react';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  Receipt,
  DoorOpen,
  ArrowDown,
  FileText,
  DollarSign,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney, calculateDaysRemaining } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardGym } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
  DashboardHeader,
  DashboardPod,
  DashboardMetricCard,
  DarkEspressoCard,
  HourlyCurveChart,
  PillBarHistogram,
  MonthlyAreaChart,
  DonutChart,
  GuardianCard,
} from '../../common/dashboard';

export interface MembershipDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const MembershipDashboardView: React.FC<MembershipDashboardViewProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBusiness,
    sales,
    staff,
    members,
    setScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: members.length > 0 || sales.length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Metrics
  const activeMembers = useMemo(() => members.filter((m) => m.status === 'Active'), [members]);
  const pendingMembers = useMemo(() => members.filter((m) => m.status === 'Pending' || m.status === 'Lead'), [members]);
  const expiringMembers = useMemo(
    () => activeMembers.filter((m) => calculateDaysRemaining(false, m.expirationDate) <= 14),
    [activeMembers]
  );

  const todayRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const targetDailyRevenue = 50000;
  const targetRevenueProgress = Math.min(100, Math.round((todayRevenue / targetDailyRevenue) * 100));

  const totalCapacity = 100;
  const peopleInsideCount = Math.min(totalCapacity, Math.max(12, activeMembers.length * 2));

  // Hourly curve
  const hourlyOccupancy = [0, 4, 18, 38, 55, 68, 82, 75, 48, 22];

  // 4-Week Trend
  const weeklyTrendBars = useMemo(
    () => [
      { label: 'week 1', value: Math.max(2, Math.round(activeMembers.length * 0.7)) },
      { label: 'week 2', value: Math.max(3, Math.round(activeMembers.length * 0.85)) },
      { label: 'week 3', value: Math.max(4, Math.round(activeMembers.length * 0.95)) },
      { label: 'week 4', value: Math.max(5, activeMembers.length), highlight: true },
    ],
    [activeMembers]
  );

  // 30-day cash curve
  const monthlyCashCurve = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const base = todayRevenue > 0 ? todayRevenue / 30 : 25000;
      return Math.round(base * (0.7 + Math.sin(i * 0.5) * 0.4 + (i / 30) * 0.5));
    });
  }, [todayRevenue]);

  // Acquisition Sources
  const acquisitionSegments = useMemo(
    () => [
      { label: 'Facebook', value: 45, color: '#8B5CF6' },
      { label: 'Walk-In', value: 35, color: '#3B82F6' },
      { label: 'Referral', value: 20, color: '#d4522f' },
    ],
    []
  );

  // Visit frequency
  const visitFrequencyBars = [
    { label: '0 visits', value: 8 },
    { label: '2 visits', value: 3 },
    { label: '4 visits', value: 1 },
  ];

  if (showSkeleton && (members.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonDashboardGym
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      {/* Row 0: Standardized Dashboard Header */}
      <DashboardHeader
        title={language === 'ar' ? 'لوحة القيادة' : language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
        subtitle={
          language === 'ar'
            ? 'النشاط التشغيلي ومؤشرات الأداء اللحظية للمنشأة اليوم'
            : language === 'fr'
            ? "Suivi de l'occupation, des encaissements et fidélisation des adhérents."
            : "Here's what's happening in your facility today."
        }
        categoryName={language === 'ar' ? 'قاعة رياضية' : language === 'fr' ? 'Club de Sport' : 'Fitness Facility'}
      />

      {/* Two-Column Pod Canvas matching Screenshots 90, 91, 92 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ================= LEFT COLUMN (~42% - lg:col-span-5) ================= */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          {/* POD 1: REAL-TIME CAPACITY & FLOW (Screenshot 90 Top-Left) */}
          <DashboardPod
            title={language === 'ar' ? 'الموجودون بالقاعة' : language === 'fr' ? 'People Inside' : 'People Inside'}
            subtitle={
              language === 'ar'
                ? 'تحليل السعة الاستيعابية اللحظية'
                : language === 'fr'
                ? 'Real-time capacity analysis'
                : 'Real-time capacity analysis'
            }
            icon={<DoorOpen size={17} />}
            headerRight={
              <div className="h-8 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center text-xs font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  className={`h-7 px-3 rounded-full transition-all cursor-pointer ${
                    timeFilter === 'today'
                      ? 'bg-[#d4522f] text-white shadow-xs font-bold'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : language === 'fr' ? 'Today' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  className={`h-7 px-3 rounded-full transition-all cursor-pointer ${
                    timeFilter === 'yesterday'
                      ? 'bg-[#d4522f] text-white shadow-xs font-bold'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {language === 'ar' ? 'الأمس' : language === 'fr' ? 'Yesterday' : 'Yesterday'}
                </button>
              </div>
            }
          >
            {/* Split Inset Metric Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
              <div className="grid grid-cols-2 gap-4 divide-x rtl:divide-x-reverse divide-[#EDF1F3] dark:divide-neutral-700">
                {/* Left Metric: People Inside */}
                <div className="pr-3 rtl:pr-0 rtl:pl-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-[18px] h-[18px] rounded-full bg-[#FCEEE8] dark:bg-neutral-700 flex items-center justify-center text-[#d4522f]">
                      <ArrowDown size={11} />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {language === 'ar' ? 'الموجودون حالياً' : language === 'fr' ? 'People Inside' : 'People Inside'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                      {peopleInsideCount}
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold tabular-nums">
                      / {totalCapacity}
                    </span>
                  </div>
                </div>

                {/* Right Metric: Pending Regs */}
                <div className="pl-4 rtl:pl-0 rtl:pr-4 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-[18px] h-[18px] rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
                      <FileText size={11} />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {language === 'ar' ? 'الملفات المعلقة' : language === 'fr' ? 'Pending Regs' : 'Pending Regs'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                      {pendingMembers.length}
                    </span>
                    <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {language === 'ar' ? 'قيد الانتظار' : 'En attente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 24-Hour Velocity Curve */}
              <HourlyCurveChart
                data={hourlyOccupancy}
                labels={['00:00', '05:00', '10:00', '15:00', '20:00']}
                color="#10B981"
                height={85}
              />
            </div>

            {/* Daily Revenue Progress Strip */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FCEEE8] dark:bg-neutral-700 flex items-center justify-center text-[#d4522f]">
                    <DollarSign size={13} />
                  </div>
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    {language === 'ar' ? 'مداخيل اليوم' : language === 'fr' ? 'Revenue Today' : 'Revenue Today'}
                  </span>
                </div>
                <span className="text-sm font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                  {formatMoney(todayRevenue)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                <div
                  style={{ width: `${Math.max(5, targetRevenueProgress)}%` }}
                  className="h-full bg-[#d4522f] rounded-full transition-all duration-500"
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                <span>{targetRevenueProgress}% {language === 'ar' ? 'من الهدف اليومي' : "d'objectif journalier"}</span>
                <span>{formatMoney(targetDailyRevenue)}</span>
              </div>
            </div>
          </DashboardPod>

          {/* POD 3: FINANCIAL TRAJECTORY & P&L (Screenshot 91 Bottom-Left) */}
          <DashboardPod
            title={language === 'ar' ? 'اتجاه الإيرادات والربحية' : language === 'fr' ? 'Revenue Trend' : 'Revenue Trend'}
            subtitle={
              language === 'ar'
                ? 'متابعة صافي الربحية وتطور المقبوضات الشهرية'
                : language === 'fr'
                ? 'Suivi de la rentabilité nette et tendance des encaissements.'
                : 'Net profitability and cash inflow trajectory.'
            }
            icon={<TrendingUp size={17} />}
            headerRight={
              <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 rounded-xl px-2.5 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))}
                  className="p-0.5 hover:text-[#d4522f]"
                >
                  <ChevronLeft size={13} className="rtl:rotate-180" />
                </button>
                <span className="uppercase text-[11px] font-mono">
                  {months[currentMonthIndex]} 2026
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))}
                  className="p-0.5 hover:text-[#d4522f]"
                >
                  <ChevronRight size={13} className="rtl:rotate-180" />
                </button>
              </div>
            }
          >
            {/* Top Inset P&L Card with 3 Metrics and 30-Day Curve */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {/* Net Profit Today */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'صافي الربح اليوم' : language === 'fr' ? 'Net Profit Today' : 'Net Profit Today'}
                  </span>
                  <span className="text-base lg:text-lg font-black text-neutral-900 dark:text-white tabular-nums font-mono block">
                    {formatMoney(Math.round(todayRevenue * 0.72))}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full inline-block">
                    +8.4% {language === 'ar' ? 'مقارنة بالأمس' : 'vs hier'}
                  </span>
                </div>

                {/* Revenue */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'المداخيل' : language === 'fr' ? 'Revenue' : 'Revenue'}
                  </span>
                  <span className="text-base lg:text-lg font-black text-neutral-900 dark:text-white tabular-nums font-mono block">
                    {formatMoney(todayRevenue)}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full inline-block">
                    +10.2% vs hier
                  </span>
                </div>

                {/* Expenses */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'المصاريف' : language === 'fr' ? 'Expenses' : 'Expenses'}
                  </span>
                  <span className="text-base lg:text-lg font-black text-neutral-900 dark:text-white tabular-nums font-mono block">
                    {formatMoney(Math.round(todayRevenue * 0.28))}
                  </span>
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full inline-block">
                    -1.5% vs hier
                  </span>
                </div>
              </div>

              {/* 30-Day Cash Trajectory Curve */}
              <MonthlyAreaChart
                data={monthlyCashCurve}
                color="#8B5CF6"
                height={90}
              />
            </div>

            {/* 4 Critical Domain KPIs (2x2 Grid) */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                <span>{language === 'ar' ? 'مؤشرات الأداء الرئيسية' : language === 'fr' ? 'Indicateurs de Performance Clés' : 'Key Performance Indicators'}</span>
                <Info size={13} className="text-neutral-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* KPI 1: Churn Rate */}
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/80 border border-[#EDF1F3] dark:border-neutral-700/60 flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                      {language === 'ar' ? 'معدل الانسحاب' : language === 'fr' ? 'Taux de Churn' : 'Churn Rate'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/40">
                      MO
                    </span>
                  </div>
                  <span className="text-lg font-black text-neutral-900 dark:text-white tabular-nums">
                    2.1%
                  </span>
                </div>

                {/* KPI 2: Peak Occupancy */}
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/80 border border-[#EDF1F3] dark:border-neutral-700/60 flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                      {language === 'ar' ? 'ذروة الإشغال' : language === 'fr' ? "Taux d'Occupation Pic" : 'Peak Occupancy'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      Optimal
                    </span>
                  </div>
                  <span className="text-lg font-black text-neutral-900 dark:text-white tabular-nums">
                    85%
                  </span>
                </div>

                {/* KPI 3: Coaching Conversion */}
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/80 border border-[#EDF1F3] dark:border-neutral-700/60 flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                      {language === 'ar' ? 'تحويل التدريب الخاص' : language === 'fr' ? 'Conversion Coaching' : 'Coaching Conversion'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                      Ce Mois
                    </span>
                  </div>
                  <span className="text-lg font-black text-neutral-900 dark:text-white tabular-nums">
                    18.5%
                  </span>
                </div>

                {/* KPI 4: Trial Conversion */}
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/80 border border-[#EDF1F3] dark:border-neutral-700/60 flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                      {language === 'ar' ? 'تحويل الحصص التجريبية' : language === 'fr' ? 'Conversion Essais' : 'Trial Conversion'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      ↗ 84%
                    </span>
                  </div>
                  <span className="text-lg font-black text-neutral-900 dark:text-white tabular-nums">
                    100%
                  </span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* ================= RIGHT COLUMN (~58% - lg:col-span-7) ================= */}
        <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
          {/* POD 2: BASE GROWTH & ASSETS (Screenshot 90 Top-Right) */}
          <DashboardPod
            title={language === 'ar' ? 'تطور المشتركين' : language === 'fr' ? 'Member Development' : 'Member Development'}
            subtitle={
              language === 'ar'
                ? 'نمو المشتركين النشطين ومعدل التجديدات'
                : language === 'fr'
                ? 'Total active members trend'
                : 'Total active members trend'
            }
            icon={<Users size={17} />}
            headerRight={
              <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 rounded-xl px-2.5 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-300 shadow-2xs">
                <ChevronLeft size={13} className="rtl:rotate-180 text-neutral-400 cursor-pointer" />
                <span className="text-[11px]">
                  {language === 'ar' ? 'هذا الشهر' : language === 'fr' ? 'This Month' : 'This Month'}
                </span>
                <ChevronRight size={13} className="rtl:rotate-180 text-neutral-400 cursor-pointer" />
              </div>
            }
          >
            {/* 3 Metric Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Active Members */}
              <DashboardMetricCard
                label={language === 'ar' ? 'المشتركون النشطون' : language === 'fr' ? 'Active Members' : 'Active Members'}
                value={activeMembers.length}
                badgeLabel={language === 'ar' ? 'ساري' : '▲ Actifs'}
                badgeVariant="green"
              />

              {/* Card 2: Pending Regs */}
              <DashboardMetricCard
                label={language === 'ar' ? 'الملفات المعلقة' : language === 'fr' ? 'Pending Regs' : 'Pending Regs'}
                value={pendingMembers.length}
                badgeLabel={language === 'ar' ? 'ملفات' : 'Dossiers'}
                badgeVariant="amber"
              />

              {/* Card 3: Dark Espresso Alert Card */}
              <DarkEspressoCard
                title={language === 'ar' ? 'تجديدات وشيكة' : language === 'fr' ? 'Expiring Soon' : 'Expiring Soon'}
                value={expiringMembers.length}
                badgeLabel={language === 'ar' ? 'تنبيه التجديد' : 'Alerte Churn'}
                badgeVariant="orange"
                subtitle="< 14j"
              />
            </div>

            {/* Total Active Members Trend (4 Rounded Pill Bars with Y-Axis) */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">
                {language === 'ar' ? 'اتجاه نمو المشتركين النشطين (أسابيع)' : language === 'fr' ? 'Total active members trend' : 'Total active members trend'}
              </span>
              <PillBarHistogram
                bars={weeklyTrendBars}
                height={125}
                activeColor="#d4522f"
              />
            </div>
          </DashboardPod>

          {/* POD 4: DOMAIN GUARDIAN & INTELLIGENCE (Screenshot 91 Bottom-Right) */}
          <DashboardPod
            title={language === 'ar' ? 'ذكاء المشتركين والحماية' : language === 'fr' ? 'Intelligence Membres & Rétention' : 'Intelligence & Retention'}
            subtitle={
              language === 'ar'
                ? 'قنوات الاستقطاب، دورية الزيارات ومحرك الوقاية من الانسحاب'
                : language === 'fr'
                ? 'Canaux d’acquisition, régularité des visites et prévention du churn.'
                : 'Acquisition channels, visit regularity, and churn prevention.'
            }
            icon={<AlertCircle size={17} />}
          >
            {/* Top Split: Donut + Bar Histogram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left: Member Sources Donut */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[160px]">
                <DonutChart
                  title={language === 'ar' ? 'مصادر المشتركين' : language === 'fr' ? 'Member Sources' : 'Member Sources'}
                  segments={acquisitionSegments}
                  size={95}
                />
              </div>

              {/* Right: Visit Frequency */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[160px]">
                <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block">
                  {language === 'ar' ? 'تكرار الزيارات (7 أيام)' : language === 'fr' ? 'Visit Frequency (7d)' : 'Visit Frequency (7d)'}
                </span>
                <PillBarHistogram
                  bars={visitFrequencyBars}
                  height={100}
                  showYAxis={false}
                  activeColor="#3B82F6"
                />
              </div>
            </div>

            {/* Middle: Signature Dark Espresso Retention Guardian Card */}
            <GuardianCard
              title={language === 'ar' ? 'حارس ولاء المشتركين' : language === 'fr' ? 'Retention Guardian' : 'Retention Guardian'}
              subtitle={
                language === 'ar'
                  ? 'مؤشر صحة مجتمع النادي ممتاز جداً!'
                  : language === 'fr'
                  ? 'Your community health looks great!'
                  : 'Your community health looks great!'
              }
              score={94}
              scoreLabel={language === 'ar' ? 'صحة النادي' : 'Health'}
              gaugeColor="#10B981"
            />

            {/* Bottom: Operational Shortcuts & Reports */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-3">
              <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block">
                {language === 'ar' ? 'اختصارات العمليات والتقارير' : language === 'fr' ? 'Raccourcis Opérationnels & Rapports' : 'Operational Shortcuts & Reports'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setScreen('staff')}
                  className="h-10 px-3 rounded-xl bg-[#d4522f] hover:bg-[#B26A4E] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center text-center"
                >
                  {language === 'ar' ? 'الرواتب والأجور' : language === 'fr' ? 'Paie / Salaires' : 'Payroll / Wages'}
                </button>

                <button
                  type="button"
                  onClick={() => setScreen('finance')}
                  className="h-10 px-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-700/60 hover:bg-[#EDF1F3] text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-all border border-[#EDF1F3] dark:border-neutral-700 cursor-pointer flex items-center justify-center text-center"
                >
                  {language === 'ar' ? 'سجل المقبوضات' : language === 'fr' ? 'Historique Recettes' : 'Revenue History'}
                </button>

                <button
                  type="button"
                  onClick={() => setScreen('history')}
                  className="h-10 px-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-700/60 hover:bg-[#EDF1F3] text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-all border border-[#EDF1F3] dark:border-neutral-700 cursor-pointer flex items-center justify-center text-center"
                >
                  {language === 'ar' ? 'سجل البوابات' : language === 'fr' ? 'Historique Flux' : 'Turnstile Traffic'}
                </button>
              </div>
            </div>
          </DashboardPod>
        </div>
      </div>
    </div>
  );
};

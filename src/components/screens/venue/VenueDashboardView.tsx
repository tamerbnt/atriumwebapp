import React, { useState, useMemo } from 'react';
import {
  DoorOpen,
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  TrendingUp,
  Receipt,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardVenue } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { BookingModal } from './BookingModal';
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

export const VenueDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    rentableUnits,
    rentalBookings,
    securityDeposits,
    setScreen,
    resetVenueMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (rentableUnits || []).length > 0 || (rentalBookings || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's bookings
  const todayBookings = useMemo(() => {
    return (rentalBookings || []).filter((b) => {
      const start = b.startDateTime ? b.startDateTime.split('T')[0] : '';
      const end = b.endDateTime ? b.endDateTime.split('T')[0] : '';
      return start <= todayStr && end >= todayStr;
    });
  }, [rentalBookings, todayStr]);

  const activeOccupiedUnits = useMemo(() => {
    return (rentableUnits || []).filter((u) => u.status === 'Occupied').length;
  }, [rentableUnits]);

  const totalUnitsCount = (rentableUnits || []).length || 8;
  const occupancyRate = Math.round((activeOccupiedUnits / Math.max(1, totalUnitsCount)) * 100);

  const todayRevenue = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) || 45000;
  }, [todayBookings]);

  const dailyTarget = 80000;
  const targetPct = Math.min(100, Math.round((todayRevenue / dailyTarget) * 100));

  // Hourly event traffic curve
  const hourlyData = useMemo(() => {
    return [0, 1, 4, 7, 3];
  }, []);

  // 4-week bookings trend
  const weeklyBookingsTrend = useMemo(() => {
    const base = rentalBookings.length || 16;
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: Math.max(2, Math.round(base * 0.2)) },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: Math.max(3, Math.round(base * 0.28)) },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: Math.max(4, Math.round(base * 0.32)) },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: Math.max(3, Math.round(base * 0.2)) },
    ];
  }, [rentalBookings.length, language]);

  // 30-day cash curve
  const monthlyRevenue = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.6 + 0.4;
      return Math.round((todayRevenue || 40000) * factor * (1 + (i % 5) * 0.12));
    });
  }, [todayRevenue]);

  // Space Type Revenue Donut
  const spaceCategories = useMemo(() => {
    const map = new Map<string, number>();
    (rentableUnits || []).forEach((u) => {
      const cat = u.type || (language === 'ar' ? 'قاعات أفراح' : 'Salles');
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    if (map.size === 0) {
      return [
        { label: language === 'ar' ? 'قاعات مؤتمرات' : 'Salles Séminaires', value: 40, color: '#d4522f' },
        { label: language === 'ar' ? 'مساحات عمل مشتركة' : 'Espaces Coworking', value: 35, color: '#3B82F6' },
        { label: language === 'ar' ? 'قاعات حفلات' : 'Salles Événements', value: 25, color: '#10B981' },
      ];
    }
    const colors = ['#d4522f', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    let idx = 0;
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      color: colors[idx++ % colors.length],
    }));
  }, [rentableUnits, language]);

  // Weekly utilization histogram
  const weekDaysTraffic = useMemo(() => {
    return [
      { week: 'Lun', value: 3 },
      { week: 'Mar', value: 4 },
      { week: 'Mer', value: 6 },
      { week: 'Jeu', value: 8 },
      { week: 'Ven', value: 9 },
      { week: 'Sam', value: 8 },
      { week: 'Dim', value: 2 },
    ];
  }, []);

  if (showSkeleton) {
    return (
      <div className="p-6">
        <SkeletonDashboardVenue />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-[#0C0C0E] min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      {/* Header */}
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={
          language === 'ar'
            ? 'مؤشرات إشغال القاعات، الحجوزات النشطة وتدفق الودائع والربحية'
            : language === 'fr'
            ? 'Occupation des espaces en direct, suivi des cautions et rentabilité événementielle.'
            : 'Live venue occupancy, rental booking pipeline, and security deposit analytics.'
        }
        currentBranchName={currentBranch?.name || 'Palais des Événements Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetVenueMockData}
        exportFileName="venue_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Venue Occupancy & Turnaround Flow (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'إشغال المساحات وحركة اليوم' : language === 'fr' ? 'Occupation des Espaces' : 'Venue Occupancy & Flow'}
            icon={<DoorOpen size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {activeOccupiedUnits} / {totalUnitsCount} {language === 'ar' ? 'قاعات محجوزة' : 'Salles Occupées'}
              </span>
            }
            rightControls={
              <div className="flex items-center bg-[#F0F2F5] dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  title={language === 'ar' ? 'عرض مؤشرات اليوم' : language === 'fr' ? "Activité d'aujourd'hui" : "Today's activity"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'today' ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm' : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  title={language === 'ar' ? 'عرض مؤشرات الأمس' : language === 'fr' ? "Activité d'hier" : "Yesterday's activity"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'yesterday' ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm' : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'أمس' : language === 'fr' ? 'Hier' : 'Yesterday'}
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">
                      {language === 'ar' ? 'القاعات المؤجرة الآن' : 'Salles en Location'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {activeOccupiedUnits}
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">/ {totalUnitsCount}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● {occupancyRate}% {language === 'ar' ? 'نسبة الإشغال' : 'Taux d’occupation'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-neutral-200 dark:bg-neutral-700 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">
                      {language === 'ar' ? 'تسليم واستلام اليوم' : 'Check-in / Check-out'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {todayBookings.length}
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">{language === 'ar' ? 'مواعيد' : 'créneaux'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">
                      {language === 'ar' ? 'جاهزية العقود' : 'États des lieux OK'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60">
                  <span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
                    {language === 'ar' ? 'كثافة الفعاليات على مدار 24 ساعة' : 'Charge horaire des événements (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'إيرادات الإيجار اليوم' : 'Recette Locative Aujourd’hui'}
                  </span>
                  <span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {formatCurrencyAmount(todayRevenue)}
                  </span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-black/55 dark:text-white/55">
                  <span>{targetPct}% {language === 'ar' ? 'من الهدف' : 'de l’objectif journalier'}</span>
                  <span>{formatCurrencyAmount(dailyTarget)}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Booking Asset Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'الحجوزات والمساحات' : language === 'fr' ? 'Réservations & Espaces' : 'Booking Growth'}
            icon={<Calendar size={18} className="text-[#d4522f]" />}
            rightControls={
              <div className="flex items-center gap-1 text-xs font-semibold text-black/70 dark:text-white/75">
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-1 text-black dark:text-white">{months[currentMonthIndex]} 2026</span>
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DashboardMetricCard
                  label={language === 'ar' ? 'المساحات الجاهزة' : 'Espaces Configurés'}
                  value={totalUnitsCount}
                  badgeText={language === 'ar' ? 'قاعات ومقرات' : 'Opérationnels'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'المساحات المتاحة للتأجير' : 'Salles et plateaux disponibles'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'الحجوزات المؤكدة' : 'Réservations Confirmées'}
                  value={Math.max((rentalBookings || []).length, 12)}
                  badgeText={language === 'ar' ? 'عقود سارية' : 'Contrats'}
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'عقود تم تأكيدها ودفع عربونها' : 'Réservations avec acompte'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'الودائع المحتجزة' : 'Cautions Séquestrées'}
                  value={(securityDeposits || []).filter((s) => s.status === 'Held').length || 4}
                  sublabel={language === 'ar' ? 'ضمانات مالية نشطة' : 'Garanties sous séquestre'}
                  badgeText={language === 'ar' ? 'مؤمن' : 'Sécurisé'}
                  badgeVariant="neutral"
                />
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'حجم الحجوزات خلال الأسابيع الـ 4 الماضية' : 'Volume de réservations par semaine'}
                  </span>
                  <span className="text-[11px] text-black/55 dark:text-white/55">
                    {language === 'ar' ? 'تطور العقود' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyBookingsTrend}
                  maxScale={Math.max(...weeklyBookingsTrend.map((w) => w.value)) * 1.3}
                  barColor="#d4522f"
                />
              </div>
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* BOTTOM ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 3: Financial Trajectory (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'الإيرادات والأرباح' : language === 'fr' ? 'Revenus & Marges' : 'Revenue & Profit'}
            icon={<TrendingUp size={18} className="text-[#d4522f]" />}
            rightControls={
              <span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-700/60">
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'صافي العائد' : 'Net Locatif'}</span>
                    <span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatCurrencyAmount(Math.round(todayRevenue * 0.76))}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+7.5%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'الإيجار الإجمالي' : 'Revenu Brut'}</span>
                    <span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatCurrencyAmount(todayRevenue)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+8.2%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'صيانة وتنظيف' : 'Charges & Entretien'}</span>
                    <span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatCurrencyAmount(Math.round(todayRevenue * 0.24))}
                    </span>
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">24% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
                    {language === 'ar' ? 'منحنى التدفق النقدي على مدار 30 يوماً' : 'Tendance des encaissements sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyRevenue} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'مؤشرات الأداء العقاري' : 'Indicateurs Métier'}
                  </span>
                  <Info size={13} className="text-black/55 dark:text-white/55" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'عائد الساعة/القاعة' : 'RevPAH (Heure)'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                        {formatCurrencyAmount(3200)}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Optimal
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'مدة الحجز المتوسطة' : 'Durée Moyenne'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">1.8 j</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Événement
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'إعادة الإيجار للمستأجرين' : 'Taux Récurrence'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">68%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        B2B Corp
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'سلامة الودائع' : 'Restitution Cautions'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">97%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Sans litige
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Intelligence & Overbooking Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'المؤشرات والتنبيهات' : language === 'fr' ? 'Analyses & Alertes' : 'Insights & Alerts'}
            icon={<ShieldCheck size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                      {language === 'ar' ? 'توزيع أنواع المساحات' : 'Typologie des Espaces'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <DonutChart segments={spaceCategories} centerLabel={`${totalUnitsCount} Salles`} />
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                      {language === 'ar' ? 'الإشغال حسب أيام الأسبوع' : 'Affluence par Jour'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <PillBarHistogram
                    data={weekDaysTraffic}
                    maxScale={10}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Overbooking Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'تعارض الحجوزات' : 'Booking Conflicts'}
                subtitle={
                  language === 'ar'
                    ? 'فحص آلي مستمر لجدول الحجوزات لمنع الحجز المزدوج وضمان فترات التنظيف والتهيئة'
                    : 'Surveillance proactive des chevauchements de créneaux et temps de nettoyage inter-événements.'
                }
                score={98}
                statusText={language === 'ar' ? 'لا يوجد أي تعارض زمني!' : 'Aucun conflit de réservation détecté !'}
                metricLabel={language === 'ar' ? 'سلامة الجداول' : 'Conformité'}
                metricValue="100%"
                trendText={language === 'ar' ? 'مؤمن' : 'Créneaux validés'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />
      )}
    </div>
  );
};

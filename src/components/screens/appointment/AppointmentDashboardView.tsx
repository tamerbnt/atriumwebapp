import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Users,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  CreditCard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Plus,
  RotateCcw,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardSalon } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { AtriumButton } from '../../ui/AtriumButton';
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

export interface AppointmentDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const AppointmentDashboardView: React.FC<AppointmentDashboardViewProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    appointments,
    servicesCatalog,
    staff,
    currentBranch,
    branches,
    switchBranch,
    resetSalonMockData,
    setScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: appointments.length > 0 || servicesCatalog.length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's appointments
  const todayAppointments = useMemo(() => {
    return (appointments || []).filter((apt) => apt.date === todayStr);
  }, [appointments, todayStr]);

  const activeInChair = useMemo(
    () => todayAppointments.filter((a) => a.status === 'InChair').length,
    [todayAppointments]
  );
  const pendingOrScheduled = useMemo(
    () => todayAppointments.filter((a) => a.status === 'Booked' || a.status === 'Confirmed').length,
    [todayAppointments]
  );
  const completedToday = useMemo(
    () => todayAppointments.filter((a) => a.status === 'Completed').length,
    [todayAppointments]
  );

  // Revenue computations
  const todayRevenue = useMemo(() => {
    return todayAppointments
      .filter((a) => a.status === 'Completed' || a.status === 'InChair')
      .reduce((sum, a) => sum + (a.price || 0), 0);
  }, [todayAppointments]);

  const dailyTarget = 35000;
  const targetPct = Math.min(100, Math.round((todayRevenue / dailyTarget) * 100));

  // Hourly curve distribution
  const hourlyData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 00:00, 05:00, 10:00, 15:00, 20:00
    todayAppointments.forEach((apt) => {
      const h = parseInt((apt.startTime || '').split(':')[0] || '12', 10);
      if (h < 8) counts[0]++;
      else if (h < 11) counts[1]++;
      else if (h < 15) counts[2]++;
      else if (h < 18) counts[3]++;
      else counts[4]++;
    });
    // Ensure pleasant curve if empty
    if (counts.every((v) => v === 0)) return [0, 1, 4, 3, 1];
    return counts;
  }, [todayAppointments]);

  // Client asset counts
  const totalClients = useMemo(() => {
    const unique = new Set(appointments.map((a) => a.clientName || a.clientId));
    return Math.max(unique.size, appointments.length > 0 ? 12 : 2);
  }, [appointments]);

  const vipClients = useMemo(() => Math.max(1, Math.floor(totalClients * 0.25)), [totalClients]);
  const noShowOrLapsed = useMemo(
    () => (appointments || []).filter((a) => a.status === 'NoShow' || a.status === 'Cancelled').length,
    [appointments]
  );

  // 4-week trend
  const weeklyTrend = useMemo(() => {
    const base = appointments.length || 15;
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: Math.max(2, Math.round(base * 0.2)) },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: Math.max(3, Math.round(base * 0.28)) },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: Math.max(4, Math.round(base * 0.32)) },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: Math.max(3, Math.round(base * 0.2)) },
    ];
  }, [appointments.length, language]);

  // 30-day cash curve
  const monthlyRevenue = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.6 + 0.4;
      return Math.round((todayRevenue || 4500) * factor * (1 + (i % 5) * 0.1));
    });
  }, [todayRevenue]);

  // Service Breakdown Donut
  const serviceCategories = useMemo(() => {
    const map = new Map<string, number>();
    servicesCatalog.forEach((s) => {
      const cat = s.category || (language === 'ar' ? 'العناية' : 'Coiffure');
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    if (map.size === 0) {
      return [
        { label: language === 'ar' ? 'قص وتسريح' : 'Coupe & Coiffage', value: 45, color: '#d4522f' },
        { label: language === 'ar' ? 'صبغة ولون' : 'Coloration', value: 30, color: '#3B82F6' },
        { label: language === 'ar' ? 'عناية وتدليك' : 'Soin & Spa', value: 25, color: '#10B981' },
      ];
    }
    const colors = ['#d4522f', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    let idx = 0;
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      color: colors[idx++ % colors.length],
    }));
  }, [servicesCatalog, language]);

  // Stylist productivity
  const stylistProductivity = useMemo(() => {
    return [
      { label: staff[0]?.fullName || (language === 'ar' ? 'أمينة' : 'Amina'), value: 6 },
      { label: staff[1]?.fullName || (language === 'ar' ? 'كريم' : 'Karim'), value: 5 },
      { label: staff[2]?.fullName || (language === 'ar' ? 'سارة' : 'Sarah'), value: 4 },
      { label: staff[3]?.fullName || (language === 'ar' ? 'يوسف' : 'Youssef'), value: 2 },
    ];
  }, [staff, language]);

  if (showSkeleton) {
    return (
      <div className="p-6">
        <SkeletonDashboardSalon />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      {/* Standardized Dashboard Header */}
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={
          language === 'ar'
            ? 'مؤشرات الأداء الحي، إدارة الكراسي ومتابعة إيرادات الصالون والجمال'
            : language === 'fr'
            ? 'Performance en direct, taux d’occupation des fauteuils et rentabilité salon.'
            : 'Live chair occupancy, stylist performance, and salon revenue analytics.'
        }
        currentBranchName={currentBranch?.name || 'Salon Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        exportFileName="salon_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Chair Flow & Real-Time Velocity (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حركة الكراسي والمواعيد' : language === 'fr' ? 'Activité Fauteuils' : 'Chair & Client Flow'}
            icon={<Scissors size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {activeInChair} {language === 'ar' ? 'في الكرسي' : 'En Fauteuil'}
              </span>
            }
            rightControls={
              <div className="flex items-center bg-[#F0F2F5] p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'yesterday' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {language === 'ar' ? 'أمس' : 'Yesterday'}
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'الكراسي المشغولة حالياً' : 'Fauteuils Occupés'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {activeInChair}
                      </span>
                      <span className="text-xs text-gray-400">/ 6 max</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● {language === 'ar' ? 'نشط الآن' : 'En service'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-gray-200 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'المواعيد المنتظرة' : 'Rendez-vous à venir'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {pendingOrScheduled}
                      </span>
                      <span className="text-xs text-gray-400">{language === 'ar' ? 'اليوم' : 'prévus'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">
                      {completedToday} {language === 'ar' ? 'تم إنهاؤها' : 'terminés'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-2">
                    {language === 'ar' ? 'كثافة المواعيد على مدار 24 ساعة' : 'Flux horaire des créneaux (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {language === 'ar' ? 'إيراد الخدمات اليوم' : 'Recette Services Aujourd’hui'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 tabular-nums">
                    {formatMoney(todayRevenue)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>{targetPct}% {language === 'ar' ? 'من الهدف اليومي' : 'de l’objectif'}</span>
                  <span>{formatMoney(dailyTarget)}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Client Asset Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'تطور قاعدة العملاء والحجوزات' : language === 'fr' ? 'Développement Clientèle' : 'Client Base Development'}
            icon={<Users size={18} className="text-[#d4522f]" />}
            rightControls={
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-1 text-gray-800">{months[currentMonthIndex]} 2026</span>
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))}
                  className="p-1 hover:bg-gray-200 rounded"
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
                  label={language === 'ar' ? 'إجمالي العملاء' : 'Total Clients'}
                  value={totalClients}
                  badgeText={language === 'ar' ? 'نشطون' : 'Fidélisés'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'عملاء قاموا بزيارة خلال 60 يوماً' : 'Clients ayant réservé sous 60 jours'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'عملاء VIP ومشتكون' : 'Clients VIP'}
                  value={vipClients}
                  badgeText="VIP"
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'عملاء بباقات متكررة' : 'Clients réguliers haute fréquence'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'إلغاءات وغياب' : 'No-Show & Annulations'}
                  value={noShowOrLapsed}
                  sublabel={language === 'ar' ? 'تتطلب إعادة تأكيد' : 'Alertes relance'}
                  badgeText={noShowOrLapsed > 2 ? 'Attention' : 'Normal'}
                  badgeVariant={noShowOrLapsed > 2 ? 'warning' : 'neutral'}
                />
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'تطور المواعيد خلال الأسابيع الـ 4 الماضية' : 'Volume hebdomadaire des prestations'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram data={weeklyTrend} maxScale={Math.max(10, appointments.length)} barColor="#d4522f" />
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
            title={language === 'ar' ? 'مسار الإيرادات والربحية' : language === 'fr' ? 'Trajectoire Financière' : 'Financial Trajectory & P&L'}
            icon={<TrendingUp size={18} className="text-[#d4522f]" />}
            rightControls={
              <span className="text-xs font-semibold text-gray-500 uppercase">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'صافي اليوم' : 'Bénéfice Net'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(Math.round(todayRevenue * 0.72))}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+4.2%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'الإيراد الإجمالي' : 'Chiffre d’Affaires'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(todayRevenue)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+6.8%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'تكاليف ومواد' : 'Consommables'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(Math.round(todayRevenue * 0.28))}
                    </span>
                    <span className="text-[10px] text-rose-500 block">28% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-gray-400 block mb-1">
                    {language === 'ar' ? 'منحنى التدفق النقدي على مدار 30 يوماً' : 'Tendance des encaissements sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyRevenue} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'مؤشرات الكفاءة التشغيلية' : 'Indicateurs Métier'}
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'متوسط السلة' : 'Panier Moyen'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">
                        {formatMoney(todayRevenue > 0 && completedToday > 0 ? Math.round(todayRevenue / completedToday) : 2400)}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Prestation
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة إعادة الحجز' : 'Taux Rebooking'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">74%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Optimal
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'دوران الكرسي' : 'Rotation / Fauteuil'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">3.8 /j</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        +0.4
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة الغياب' : 'Taux de No-Show'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">3.2%</span>
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        Maitrisé
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Intelligence & Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'ذكاء الصالون وحارس الكراسي' : language === 'fr' ? 'Intelligence Métier & Salon Guardian' : 'Domain Intelligence & Guardian'}
            icon={<Sparkles size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'توزيع الخدمات' : 'Mix Prestations'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <DonutChart segments={serviceCategories} centerLabel={servicesCatalog.length > 0 ? `${servicesCatalog.length} services` : 'Coiffure'} />
                </div>

                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'إنتاجية مصففي الشعر' : 'Rendez-vous par Coiffeur'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <PillBarHistogram
                    data={stylistProductivity.map((s) => ({ week: s.label, value: s.value }))}
                    maxScale={8}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Salon Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'حارس إشغال الكراسي والتثبيت' : 'Salon Occupancy & Retention Guardian'}
                subtitle={
                  language === 'ar'
                    ? 'نظام التنبيه الذكي للكراسي الشاغرة وإرسال تذكيرات المواعيد عبر SMS'
                    : 'Surveillance proactive des fauteuils inoccupés et relance automatique SMS.'
                }
                score={89}
                statusText={language === 'ar' ? 'معدل الحجز والالتزام ممتاز!' : 'Planning fluide et fidélisation optimale !'}
                metricLabel={language === 'ar' ? 'نسبة الامتلاء' : 'Occupation'}
                metricValue="89%"
                trendText={language === 'ar' ? '+5% هذا الأسبوع' : '+5% cette semaine'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Appointment Modal */}
      {isNewAptModalOpen && (
        <AppointmentModal
          isOpen={isNewAptModalOpen}
          onClose={() => setIsNewAptModalOpen(false)}
        />
      )}
    </div>
  );
};

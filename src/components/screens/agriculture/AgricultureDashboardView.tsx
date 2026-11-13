import React, { useState, useMemo } from 'react';
import {
  Sprout,
  Tractor,
  Droplets,
  Calendar,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useAgricultureData } from './agricultureData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardAgriculture } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { AgricultureParcelModal } from './AgricultureParcelModal';
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

export const AgricultureDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    setScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { parcels, harvestTickets, livestock, treatmentLogs, addParcel } = useAgricultureData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (parcels || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [isModalOpen, setIsModalOpen] = useState(false);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const totalHectares = (parcels || []).reduce((acc, p) => acc + (p.surfaceHectares || 0), 0) || 120;
  const totalHarvestNetKg = (harvestTickets || []).reduce((acc, t) => acc + (t.netWeightKg || 0), 0) || 28500;
  const totalWholesalePayoutDzd = (harvestTickets || []).reduce(
    (acc, t) => acc + (t.netFarmPayoutDzd || t.totalAmountDzd || 0),
    0
  ) || 1650000;

  const totalAnrhQuotaM3 = (parcels || []).reduce((acc, p) => acc + (p.anrhAnnualQuotaM3 || 0), 0) || 85000;
  const totalAnrhConsumedM3 = (parcels || []).reduce((acc, p) => acc + (p.anrhConsumedM3 || 0), 0) || 52000;
  const waterUsagePct = totalAnrhQuotaM3 > 0 ? Math.round((totalAnrhConsumedM3 / totalAnrhQuotaM3) * 100) : 61;

  const dailyHarvestKg = 1850;
  const dailyTargetKg = 2500;
  const targetPct = Math.min(100, Math.round((dailyHarvestKg / dailyTargetKg) * 100));

  // Hourly irrigation / sensor curve
  const hourlyData = useMemo(() => {
    return [1, 5, 8, 4, 2];
  }, []);

  // 4-week harvest yield histogram (quintaux)
  const weeklyYield = useMemo(() => {
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: 85 },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: 110 },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: 95 },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: 130 },
    ];
  }, [language]);

  // 30-day crop revenue curve
  const monthlyRevenue = useMemo(() => {
    const base = 3200000;
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round(base * factor * (1 + (i % 5) * 0.14));
    });
  }, []);

  // Crop variety donut
  const cropMix = useMemo(() => {
    return [
      { label: language === 'ar' ? 'حبوب وقمح صلب' : 'Blé Dur & Céréales', value: 45, color: '#d4522f' },
      { label: language === 'ar' ? 'أشجار مثمرة وزيتون' : 'Arboriculture & Oliviers', value: 35, color: '#3B82F6' },
      { label: language === 'ar' ? 'خضروات موسمية' : 'Maraîchage Primeur', value: 20, color: '#10B981' },
    ];
  }, [language]);

  // Parcel yield comparison
  const parcelYield = useMemo(() => {
    return [
      { week: 'Parcelle Nord (Blé)', value: 48 },
      { week: 'Parcelle Est (Olives)', value: 62 },
      { week: 'Parcelle Ouest (Maraîcher)', value: 54 },
      { week: 'Plateau Sud (Fourrage)', value: 36 },
    ];
  }, []);

  if (showSkeleton && (parcels.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonDashboardAgriculture
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
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
            ? 'مؤشرات المستثمرة الفلاحية، نظام السقي ANRH، الحصاد وتتبع الثروة الحيوانية والبيع بالجملة'
            : language === 'fr'
            ? 'Rendement des parcelles agricoles, quotas d’irrigation ANRH et vente en gros carreau.'
            : 'Live farm parcel yield, irrigation quota tracking, livestock monitoring, and crop wholesale.'
        }
        currentBranchName={currentBranch?.name || 'Exploitation Agricole Atrium Mitidja'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={() => {}}
        exportFileName="agriculture_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Field Flow & Irrigation Velocity (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حركة الحقول وشبكة السقي' : language === 'fr' ? 'Activité Parcelles & Irrigation' : 'Field & Irrigation'}
            icon={<Sprout size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {(parcels || []).length || 8} {language === 'ar' ? 'قطع فلاحية نشطة' : 'Parcelles Cultivées'}
              </span>
            }
            rightControls={
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 p-0.5 rounded-xl text-xs font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  title={language === 'ar' ? 'عرض مؤشرات اليوم' : language === 'fr' ? "Activité d'aujourd'hui" : "Today's activity"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'today' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  title={language === 'ar' ? 'عرض مؤشرات الأمس' : language === 'fr' ? "Activité d'hier" : "Yesterday's activity"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'yesterday' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'أمس' : language === 'fr' ? 'Hier' : 'Yesterday'}
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">
                      {language === 'ar' ? 'استهلاك حصة المياه ANRH' : 'Quota Irrigation ANRH'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {waterUsagePct}%
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">/ 100% max</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● {language === 'ar' ? 'تنقيط موضعي ذكي' : 'Goutte-à-goutte économe'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-[#E6DED6] dark:bg-neutral-700 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">
                      {language === 'ar' ? 'مساحة الأراضي المزروعة' : 'Superficie Exploitable'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {totalHectares}
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">{language === 'ar' ? 'هكتار' : 'Hectares'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
                      {(parcels || []).length || 8} {language === 'ar' ? 'قطع' : 'parcelles'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6DED6] dark:border-neutral-700/60">
                  <span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
                    {language === 'ar' ? 'دورة تشغيل المضخات على مدار 24 ساعة' : 'Courbe horaire de pompage & irrigation (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'محصول اليوم المجمع' : 'Récolte Journalière'}
                  </span>
                  <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                    {dailyHarvestKg} / {dailyTargetKg} kg
                  </span>
                </div>
                <div className="w-full bg-[#E6DED6]/70 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-black/55 dark:text-white/55">
                  <span>{targetPct}% {language === 'ar' ? 'من الهدف' : 'de l’objectif'}</span>
                  <span>{dailyTargetKg} kg / {language === 'ar' ? 'يوم' : 'jour'}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Crop & Livestock Asset Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'المحاصيل والثروة الحيوانية' : language === 'fr' ? 'Cultures & Cheptel' : 'Crops & Livestock'}
            icon={<Tractor size={18} className="text-[#d4522f]" />}
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
                  label={language === 'ar' ? 'إجمالي المحصول المفرغ' : 'Production Cumulée'}
                  value={`${Math.round(totalHarvestNetKg / 1000)} T`}
                  badgeText={language === 'ar' ? 'محصول' : 'Tonnes'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'وزن المحاصيل المعبأة والمسلمة' : 'Pesées nettes aux carreaux de gros'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'رؤوس الماشية والأبقار' : 'Cheptel Élevage'}
                  value={(livestock || []).length || 45}
                  badgeText={language === 'ar' ? 'رأس' : 'Têtes'}
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'قطيع المزرعة المسجل' : 'Bovins et ovins identifiés'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'عوائد البيع بالجملة' : 'Revenu Vente en Gros'}
                  value={formatMoney(totalWholesalePayoutDzd)}
                  sublabel={language === 'ar' ? 'سوق الجملة (الخوبة)' : 'Marché de gros (Khemis/Attatba)'}
                  badgeText="Encaissé"
                  badgeVariant="neutral"
                />
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black dark:text-white">
                    {language === 'ar' ? 'المردود الأسبوعي (قنطار)' : 'Rendement hebdomadaire récolté (Quintaux)'}
                  </span>
                  <span className="text-[11px] text-black/55 dark:text-white/55">
                    {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyYield}
                  maxScale={150}
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
              <span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase rtl:normal-case">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-[#E6DED6] dark:border-neutral-700/60">
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'صافي المزرعة' : 'Net Exploitation'}</span>
                    <span className="text-lg font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                      {formatMoney(1150000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">36% Brut</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'مبيعات الجملة' : 'CA Ventes'}</span>
                    <span className="text-lg font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                      {formatMoney(totalWholesalePayoutDzd)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+14%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'أسمدة ومحروقات' : 'Engrais & Mazout'}</span>
                    <span className="text-lg font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                      {formatMoney(500000)}
                    </span>
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">30% CA</span>
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
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black dark:text-white">
                    {language === 'ar' ? 'مؤشرات الكفاءة الزراعية' : 'Indicateurs Agronomiques'}
                  </span>
                  <Info size={13} className="text-black/55 dark:text-white/55" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'المردود للهكتار' : 'Rendement / Hectare'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">42 Qx/ha</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Élevé
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'كفاءة استهلاك المياه' : 'Efficience Eau (ANRH)'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">380 m³/T</span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Économe
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'نسبة تلف المحصول' : 'Taux de Perte'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">1.8%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Minime
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'إنتاجية الحليب / بقرة' : 'Lait / Vache / Jour'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">24 L/j</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Optimal
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Agronomic Intelligence & Pest Weather Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'المؤشرات والتنبيهات' : language === 'fr' ? 'Analyses & Alertes' : 'Insights & Alerts'}
            icon={<ShieldCheck size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-black dark:text-white">
                      {language === 'ar' ? 'تنوع المحاصيل المزروعة' : 'Assolement des Cultures'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <DonutChart segments={cropMix} centerLabel={`${totalHectares} Ha`} />
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-black dark:text-white">
                      {language === 'ar' ? 'مردود الحقول (قنطار/هكتار)' : 'Rendement par Parcelle'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <PillBarHistogram
                    data={parcelYield}
                    maxScale={70}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Weather & Pest Sentinel Card */}
              <GuardianCard
                title={language === 'ar' ? 'تنبيهات الصقيع والآفات' : 'Crop & Weather Alerts'}
                subtitle={
                  language === 'ar'
                    ? 'رصد مستمر لمحطات الطقس والرطوبة النسبية للإنذار المبكر من الصقيع وفطر الفيتوفتورا ومعالجة الأشجار'
                    : 'Surveillance proactive des alertes météo gel, hygrométrie et traitements phytosanitaires préventifs.'
                }
                score={98}
                statusText={language === 'ar' ? 'الظروف المناخية والصحية للمحاصيل مؤمنة بالكامل!' : 'Climat et santé végétale sous protection optimale !'}
                metricLabel={language === 'ar' ? 'سلامة المحصول' : 'Protection'}
                metricValue="98%"
                trendText={language === 'ar' ? 'محمي' : 'Zéro ravageur'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <AgricultureParcelModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={addParcel}
        />
      )}
    </div>
  );
};

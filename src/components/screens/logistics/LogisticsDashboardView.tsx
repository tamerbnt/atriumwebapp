import React, { useState, useMemo } from 'react';
import {
  Truck,
  Package,
  QrCode,
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
import { useLogisticsData } from './logisticsData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardLogistics } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { WilayaTariffModal } from './WilayaTariffModal';
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

export const LogisticsDashboardView: React.FC = () => {
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

  const { shipments, manifests, bags, discharges, addShipment, resetLogisticsDemoData } = useLogisticsData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (shipments || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const outForDelivery = (shipments || []).filter((s) => s.status === 'OutForDelivery').length || 18;
  const deliveredCount = (shipments || []).filter((s) => s.status === 'Delivered').length || 42;
  const returnedCount = (shipments || []).filter((s) => s.status === 'Returned' || s.status === 'Postponed').length || 2;
  const hubStockCount = (shipments || []).filter((s) => s.status === 'HubIntake' || s.status === 'ReceivedAtHub' || s.status === 'Sorted').length || 25;

  const totalCodCollected = (shipments || [])
    .filter((s) => s.status === 'Delivered')
    .reduce((acc, s) => acc + (s.codAmountDzd || 0), 0) || 320000;

  const targetDeliveries = 60;
  const targetPct = Math.min(100, Math.round((deliveredCount / targetDeliveries) * 100));

  // Hourly delivery scan curve
  const hourlyData = useMemo(() => {
    return [0, 3, 8, 9, 2];
  }, []);

  // 4-week delivery histogram
  const weeklyDeliveries = useMemo(() => {
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: 240 },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: 280 },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: 265 },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: 310 },
    ];
  }, [language]);

  // 30-day cash on delivery trajectory
  const monthlyCod = useMemo(() => {
    const base = 2800000;
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round(base * factor * (1 + (i % 5) * 0.12));
    });
  }, []);

  // Delivery zone donut
  const zoneDistribution = useMemo(() => {
    return [
      { label: language === 'ar' ? 'الجزائر العاصمة وضواحيها' : 'Grand Alger & Centre', value: 50, color: '#d4522f' },
      { label: language === 'ar' ? 'الشرق الجزائري (قسنطينة/عنابة)' : 'Est (Constantine/Annaba)', value: 30, color: '#3B82F6' },
      { label: language === 'ar' ? 'الغرب والجنوب' : 'Ouest & Sud', value: 20, color: '#10B981' },
    ];
  }, [language]);

  // Driver delivery volume
  const driverVolume = useMemo(() => {
    return [
      { week: 'Tarek (Livreur A)', value: 26 },
      { week: 'Khaled (Livreur B)', value: 22 },
      { week: 'Samir (Livreur C)', value: 18 },
      { week: 'Farid (Express)', value: 14 },
    ];
  }, []);

  if (showSkeleton && (shipments.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonDashboardLogistics
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
            ? 'مؤشرات أسطول التوصيل، تتبع الطرود الموزعة والتحصيل عند الاستلام (COD) والفرز بالمحطات'
            : language === 'fr'
            ? 'Suivi de flotte en direct, taux de livraison premier passage et reversement des fonds COD.'
            : 'Live deliveries, first-attempt success rate, and COD cash reconciliation.'
        }
        currentBranchName={currentBranch?.name || 'Hub Logistique Central Alger'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetLogisticsDemoData}
        exportFileName="logistics_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Fleet Velocity & Delivery Flow (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حركة الأسطول والطرود اليوم' : language === 'fr' ? 'Activité Flotte & Livraisons' : 'Daily Deliveries'}
            icon={<Truck size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {outForDelivery} {language === 'ar' ? 'طرود في الطريق' : 'En Tournée'}
              </span>
            }
            rightControls={
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 p-0.5 rounded-xl text-xs font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  title={language === 'ar' ? 'بيانات اليوم' : language === 'fr' ? "Données d'aujourd'hui" : "Today's dispatches"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'today' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  title={language === 'ar' ? 'بيانات الأمس' : language === 'fr' ? "Données d'hier" : "Yesterday's dispatches"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'yesterday' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
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
                      {language === 'ar' ? 'طرود وزعت بنجاح اليوم' : 'Colis Livrés'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {deliveredCount}
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">/ {targetDeliveries} obj</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● 97% {language === 'ar' ? 'نسبة النجاح' : 'Taux de succès'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-[#E6DED6] dark:bg-neutral-700 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">
                      {language === 'ar' ? 'طرود بالمستودع والفرز' : 'Stock Hub / Quai'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {hubStockCount}
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">{language === 'ar' ? 'طرود' : 'colis'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
                      {outForDelivery} {language === 'ar' ? 'في مسار التسليم' : 'sur le terrain'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6DED6] dark:border-neutral-700/60">
                  <span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
                    {language === 'ar' ? 'كثافة تسليم الطرود على مدار 24 ساعة' : 'Courbe horaire des scans de livraison (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'معدل إنجاز الجولة اليومية' : 'Objectif de Livraison du Jour'}
                  </span>
                  <span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {deliveredCount} / {targetDeliveries}
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
                  <span>{targetDeliveries} colis / {language === 'ar' ? 'يوم' : 'jour'}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Delivery Volume Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حجم الشحنات والطرود' : language === 'fr' ? 'Expéditions & Volumes' : 'Shipments & COD'}
            icon={<Package size={18} className="text-[#d4522f]" />}
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
                  label={language === 'ar' ? 'إجمالي الطرود المسجلة' : 'Total Expéditions'}
                  value={(shipments || []).length || 85}
                  badgeText={language === 'ar' ? 'مسجل' : 'Actifs'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'جميع الشحنات في الشبكة' : 'Colis traités'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'بيانات الشحن المعتمدة' : 'Manifestes Clôturés'}
                  value={(manifests || []).length || 12}
                  badgeText="Manifestes"
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'أوامر الترحيل والتوزيع' : 'Feuilles de route'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'أموال COD المحصلة' : 'Fonds COD en Caisse'}
                  value={formatMoney(totalCodCollected)}
                  sublabel={language === 'ar' ? 'جاهزة للتحويل للمتاجر' : 'À reverser aux e-commerçants'}
                  badgeText="Sécurisé"
                  badgeVariant="neutral"
                />
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'حجم الطرود الموزعة أسبوعياً' : 'Volume hebdomadaire des colis livrés'}
                  </span>
                  <span className="text-[11px] text-black/55 dark:text-white/55">
                    {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyDeliveries}
                  maxScale={350}
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
            title={language === 'ar' ? 'الإيرادات والأرباح' : language === 'fr' ? 'Revenus & COD' : 'Revenue & Profit'}
            icon={<TrendingUp size={18} className="text-[#d4522f]" />}
            rightControls={
              <span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-[#E6DED6] dark:border-neutral-700/60">
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'صافي التوصيل' : 'Net Livraison'}</span>
                    <span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatMoney(185000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+14%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'عمولة التوصيل' : 'Frais Port CA'}</span>
                    <span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatMoney(260000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+18%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'وقود وصيانة' : 'Carburant Flotte'}</span>
                    <span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatMoney(75000)}
                    </span>
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">28% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
                    {language === 'ar' ? 'منحنى السيولة والتحصيل على مدار 30 يوماً' : 'Tendance des encaissements COD sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyCod} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'مؤشرات الأداء اللوجستي' : 'Indicateurs de Performance'}
                  </span>
                  <Info size={13} className="text-black/55 dark:text-white/55" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'تسليم بالمرة الأولى' : 'Premier Passage'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">94.2%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Élevé
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'زمن تحويل أموال COD' : 'Délai Versement COD'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">24 h</span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Express
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'نسبة الإرجاع (Retour)' : 'Taux de Retour'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">2.4%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Faible
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'تكلفة التوصيل لكل كلم' : 'Coût au Km'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">18 DA/km</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Rentable
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Routing Intelligence & COD Remittance Guardian (58% width) */}
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
                    <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                      {language === 'ar' ? 'توزيع التوصيل حسب المناطق' : 'Répartition Géographique'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <DonutChart segments={zoneDistribution} centerLabel={`${(shipments || []).length} Colis`} />
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-black/70 dark:text-white/75">
                      {language === 'ar' ? 'إنتاجية السائقين والموزعين' : 'Livraisons par Chauffeur'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <PillBarHistogram
                    data={driverVolume}
                    maxScale={30}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* COD Remittance Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'تسوية أموال COD' : 'Delivery & COD'}
                subtitle={
                  language === 'ar'
                    ? 'مطابقة آلية فورية بين مبالغ الوصولات المحصلة من السائقين وكشوفات التحويل للمتاجر الإلكترونية'
                    : 'Rapprochement bancaire et décharge automatique des fonds COD perçus par les livreurs.'
                }
                score={98}
                statusText={language === 'ar' ? 'تطابق كامل لأموال الصناديق ولا توجد فروقات!' : 'Rapprochement 100% conforme : zéro écart de caisse livreur !'}
                metricLabel={language === 'ar' ? 'مطابقة الصندوق' : 'Conformité'}
                metricValue="100%"
                trendText={language === 'ar' ? 'مطابق' : 'Fonds sécurisés'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Modals */}
      {isShipModalOpen && (
        <LogisticsShipmentModal
          isOpen={isShipModalOpen}
          onClose={() => setIsShipModalOpen(false)}
          onSave={addShipment}
        />
      )}
      {isTariffModalOpen && (
        <WilayaTariffModal
          isOpen={isTariffModalOpen}
          onClose={() => setIsTariffModalOpen(false)}
        />
      )}
    </div>
  );
};

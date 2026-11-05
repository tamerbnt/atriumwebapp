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
    <div className="flex-1 bg-white min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
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
            : 'Live delivery fleet velocity, first-attempt success rate, and COD cash remittance analytics.'
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
            title={language === 'ar' ? 'حركة الأسطول والطرود اليوم' : language === 'fr' ? 'Activité Flotte & Livraisons' : 'Fleet Velocity & Delivery Flow'}
            icon={<Truck size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {outForDelivery} {language === 'ar' ? 'طرود في الطريق' : 'En Tournée'}
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
                      {language === 'ar' ? 'طرود وزعت بنجاح اليوم' : 'Colis Livrés'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {deliveredCount}
                      </span>
                      <span className="text-xs text-gray-400">/ {targetDeliveries} obj</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● 97% {language === 'ar' ? 'نسبة النجاح' : 'Taux de succès'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-gray-200 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'طرود بالمستودع والفرز' : 'Stock Hub / Quai'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {hubStockCount}
                      </span>
                      <span className="text-xs text-gray-400">{language === 'ar' ? 'طرود' : 'colis'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
                      {outForDelivery} {language === 'ar' ? 'في مسار التسليم' : 'sur le terrain'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-2">
                    {language === 'ar' ? 'كثافة تسليم الطرود على مدار 24 ساعة' : 'Courbe horaire des scans de livraison (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {language === 'ar' ? 'معدل إنجاز الجولة اليومية' : 'Objectif de Livraison du Jour'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 tabular-nums">
                    {deliveredCount} / {targetDeliveries}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
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
            title={language === 'ar' ? 'تطور حجم الشحنات والطرود' : language === 'fr' ? 'Développement Expéditions & Volume' : 'Delivery Volume Development'}
            icon={<Package size={18} className="text-[#d4522f]" />}
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

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'حجم الطرود الموزعة أسبوعياً' : 'Volume hebdomadaire des colis livrés'}
                  </span>
                  <span className="text-[11px] text-gray-400">
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
            title={language === 'ar' ? 'المسار المالي وأتعاب الشحن' : language === 'fr' ? 'Trajectoire Financière & COD' : 'Financial Trajectory & P&L'}
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
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'صافي التوصيل' : 'Net Livraison'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(185000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+14%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'عمولة التوصيل' : 'Frais Port CA'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(260000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+18%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'وقود وصيانة' : 'Carburant Flotte'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(75000)}
                    </span>
                    <span className="text-[10px] text-gray-400 block">28% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-gray-400 block mb-1">
                    {language === 'ar' ? 'منحنى السيولة والتحصيل على مدار 30 يوماً' : 'Tendance des encaissements COD sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyCod} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'مؤشرات الأداء اللوجستي' : 'Indicateurs de Performance'}
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'تسليم بالمرة الأولى' : 'Premier Passage'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">94.2%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Élevé
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'زمن تحويل أموال COD' : 'Délai Versement COD'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">24 h</span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Express
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة الإرجاع (Retour)' : 'Taux de Retour'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">2.4%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Faible
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'تكلفة التوصيل لكل كلم' : 'Coût au Km'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">18 DA/km</span>
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
            title={language === 'ar' ? 'ذكاء التوجيه وحارس أموال COD' : language === 'fr' ? 'Intelligence Routage & COD Sentinel' : 'Routing Intelligence & COD Guardian'}
            icon={<ShieldCheck size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'توزيع التوصيل حسب المناطق' : 'Répartition Géographique'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <DonutChart segments={zoneDistribution} centerLabel={`${(shipments || []).length} Colis`} />
                </div>

                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'إنتاجية السائقين والموزعين' : 'Livraisons par Chauffeur'}
                    </span>
                    <Info size={13} className="text-gray-400" />
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
                title={language === 'ar' ? 'حارس تسوية أموال الدفع عند الاستلام (COD)' : 'COD Cash Remittance & Reconciliation Sentinel'}
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

              {/* Action Buttons Bar */}
              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-600">
                  {language === 'ar' ? 'إجراءات سريعة واختصارات' : 'Raccourcis Opérationnels'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShipModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4522f] hover:bg-[#b0674b] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus size={14} />
                    {language === 'ar' ? 'إنشاء إرسالية طرد' : 'Nouveau Colis'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('registrations')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-all"
                  >
                    <QrCode size={14} />
                    {language === 'ar' ? 'ماسح الباركود' : 'Scanner Code-Barres'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('finance')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-all"
                  >
                    <Receipt size={14} />
                    {language === 'ar' ? 'تسوية مبالغ COD' : 'Décharge COD'}
                  </button>
                </div>
              </div>
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

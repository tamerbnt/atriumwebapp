import React, { useState, useMemo } from 'react';
import {
  Building2,
  Key,
  Home,
  TrendingUp,
  Receipt,
  FileCheck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useRealEstateData } from './realEstateData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardRealEstate } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
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

export const RealEstateDashboardView: React.FC = () => {
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

  const { properties, leases, addProperty, addLease } = useRealEstateData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (properties || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const totalProps = (properties || []).length || 36;
  const rentedProps = (properties || []).filter((p) => p.status === 'Rented').length || 24;
  const availableProps = (properties || []).filter((p) => p.status === 'Available').length || 12;
  const occupancyRate = Math.round((rentedProps / Math.max(1, totalProps)) * 100);

  const monthlyRentCollected = useMemo(() => {
    return (leases || [])
      .filter((l) => l.status === 'Active')
      .reduce((acc, l) => acc + (l.monthlyRentDzd || 0), 0) || 1850000;
  }, [leases]);

  const targetRent = 2500000;
  const targetPct = Math.min(100, Math.round((monthlyRentCollected / targetRent) * 100));

  // Hourly showing & inquiry traffic
  const hourlyData = useMemo(() => {
    return [0, 1, 4, 6, 2];
  }, []);

  // 4-week lease / sale signatures
  const weeklySignatures = useMemo(() => {
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: 3 },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: 5 },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: 4 },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: 6 },
    ];
  }, [language]);

  // 30-day commission trajectory
  const monthlyCommissions = useMemo(() => {
    const base = 480000;
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round(base * factor * (1 + (i % 5) * 0.15));
    });
  }, []);

  // Property types donut
  const propertyTypes = useMemo(() => {
    return [
      { label: language === 'ar' ? 'شقق سكنية' : 'Appartements F3/F4', value: 48, color: '#d4522f' },
      { label: language === 'ar' ? 'فيلات ومنازل' : 'Villas Haut Standing', value: 32, color: '#3B82F6' },
      { label: language === 'ar' ? 'مكاتب ومحلات' : 'Locaux & Bureaux', value: 20, color: '#10B981' },
    ];
  }, [language]);

  // Agent deal volume
  const agentVolume = useMemo(() => {
    return [
      { week: 'Sofiane (Senior)', value: 12 },
      { week: 'Yasmine (Com.)', value: 9 },
      { week: 'Nabil (B2B)', value: 7 },
      { week: 'Ryad (Junior)', value: 4 },
    ];
  }, []);

  if (showSkeleton && (properties.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonDashboardRealEstate
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
            ? 'مؤشرات المحفظة العقارية، تدفق الزيارات وعقود الإيجار والوساطة والتحصيل'
            : language === 'fr'
            ? 'Portefeuille immobilier en direct, mandats exclusifs et encaissement des loyers.'
            : 'Live property portfolio, lease agreements, and real estate brokerage analytics.'
        }
        currentBranchName={currentBranch?.name || 'Agence Immobilière Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={() => {}}
        exportFileName="realestate_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Deal Flow & Showing Velocity (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حركة المعاينات والصفقات' : language === 'fr' ? 'Visites & Dynamique Commerciale' : 'Deal Flow & Showing Velocity'}
            icon={<Key size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {rentedProps} / {totalProps} {language === 'ar' ? 'عقارات مؤجرة' : 'Biens Loués'}
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
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'عقارات مؤجرة حالياً' : 'Biens Sous Bail'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {rentedProps}
                      </span>
                      <span className="text-xs text-gray-400">/ {totalProps}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● {occupancyRate}% {language === 'ar' ? 'معدل الإشغال' : 'Taux d’occupation'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-gray-200 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'عقارات شاغرة متاحة' : 'Biens Disponibles'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {availableProps}
                      </span>
                      <span className="text-xs text-gray-400">{language === 'ar' ? 'عقار' : 'à louer/vendre'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
                      {language === 'ar' ? 'جاهزة للمعاينات' : 'Visites ouvertes'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-2">
                    {language === 'ar' ? 'كثافة طلبات المعاينة على مدار 24 ساعة' : 'Courbe horaire des visites planifiées (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {language === 'ar' ? 'مجموع الإيجارات الشهرية' : 'Loyers Mensuels Recouvrés'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 tabular-nums">
                    {formatMoney(monthlyRentCollected)}
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
                  <span>{formatMoney(targetRent)}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Portfolio Asset Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'تطور المحفظة والعقود المعتمدة' : language === 'fr' ? 'Développement Portefeuille & Mandats' : 'Portfolio Asset Development'}
            icon={<Building2 size={18} className="text-[#d4522f]" />}
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
                  label={language === 'ar' ? 'إجمالي العقارات' : 'Biens au Portefeuille'}
                  value={totalProps}
                  badgeText={language === 'ar' ? 'مسجلة' : 'Actifs'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'جميع العقارات المسجلة بالوكالة' : 'Biens sous mandat'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'عقود الإيجار السارية' : 'Baux Actifs'}
                  value={(leases || []).filter((l) => l.status === 'Active').length || 24}
                  badgeText={language === 'ar' ? 'سارية' : 'En cours'}
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'عقود مؤجرة وموثقة' : 'Baux avec locataire en place'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'تنبيه انتهاء العقود' : 'Échéances Baux (60j)'}
                  value={3}
                  sublabel={language === 'ar' ? 'عقود بحاجة للتجديد' : 'À renouveler sous 60 jours'}
                  badgeText={language === 'ar' ? 'تجديد' : 'Renouvellement'}
                  badgeVariant="warning"
                />
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'حجم الصفقات وتوقيع العقود أسبوعياً' : 'Signatures de baux et ventes (4 semaines)'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklySignatures}
                  maxScale={8}
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
            title={language === 'ar' ? 'المسار المالي وعمولات الوكالة' : language === 'fr' ? 'Trajectoire Financière & Honoraires' : 'Financial Trajectory & P&L'}
            icon={<TrendingUp size={18} className="text-[#d4522f]" />}
            rightControls={
              <span className="text-xs font-semibold text-gray-500 uppercase">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'عمولة الوكالة' : 'Honoraires Nets'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(320000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+14%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'حجم الإيجارات' : 'Volume Loyers'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(monthlyRentCollected)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+8%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'تسويق وإشهار' : 'Marketing & Dép.'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(65000)}
                    </span>
                    <span className="text-[10px] text-gray-400 block">20% Honoraires</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-gray-400 block mb-1">
                    {language === 'ar' ? 'منحنى العمولات على مدار 30 يوماً' : 'Tendance des honoraires sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyCommissions} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'مؤشرات الأداء العقاري' : 'Ratios de Performance'}
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'متوسط مدة التأجير' : 'Délai Moyen Location'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">22 j</span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Rapide
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'العائد الاستثماري' : 'Rendement Locatif'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">7.8%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Rentable
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة تحصيل الإيجارات' : 'Taux d’Encaissement'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">98%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Sans impayé
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'تحويل الزيارات لعقود' : 'Conversion Visites'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">34%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Performant
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Property Intelligence & Expiry Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'ذكاء السوق وحارس التجديد' : language === 'fr' ? 'Intelligence Marché & Expiry Sentinel' : 'Property Intelligence & Expiry Guardian'}
            icon={<ShieldCheck size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'توزيع أنواع العقارات' : 'Typologie des Biens'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <DonutChart segments={propertyTypes} centerLabel={`${totalProps} Biens`} />
                </div>

                <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'أداء وكلاء العقارات' : 'Ventes & Baux par Agent'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <PillBarHistogram
                    data={agentVolume}
                    maxScale={15}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Expiry Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'حارس تجديد العقود ومطابقة الشروط' : 'Lease Expiry & Vacancy Risk Sentinel'}
                subtitle={
                  language === 'ar'
                    ? 'فحص استباقي لعقود الإيجار التي تقترب من نهايتها لتفادي فترات الشغور وإعادة طرحها في السوق'
                    : 'Surveillance proactive des baux à échéance sous 60 jours pour éliminer la vacance locative.'
                }
                score={96}
                statusText={language === 'ar' ? 'نسبة الشغور منخفضة ومحكومة تماماً!' : 'Vacance locative minimale : 96% du parc sécurisé !'}
                metricLabel={language === 'ar' ? 'استقرار الإشغال' : 'Stabilité'}
                metricValue="96%"
                trendText={language === 'ar' ? 'مستقر' : 'Zéro impayé'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Modals */}
      {isPropModalOpen && (
        <RealEstatePropertyModal
          isOpen={isPropModalOpen}
          onClose={() => setIsPropModalOpen(false)}
          onSave={addProperty}
        />
      )}
      {isLeaseModalOpen && (
        <RealEstateLeaseModal
          isOpen={isLeaseModalOpen}
          onClose={() => setIsLeaseModalOpen(false)}
          properties={properties}
          onSave={addLease}
        />
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  HardHat,
  Building,
  Calendar,
  Users,
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
import { useContractorData } from './contractorData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardContractor } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { ContractorProjectModal } from './ContractorProjectModal';
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

export const ContractorDashboardView: React.FC = () => {
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

  const { projects, dailyLogs, dgps, addProject } = useContractorData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (projects || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [isModalOpen, setIsModalOpen] = useState(false);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const activeProjects = (projects || []).filter((p) => p.status === 'InProgress').length || 4;
  const totalContractValue = (projects || []).reduce((acc, p) => acc + (p.contractAmountDzd || 0), 0) || 45000000;
  const totalRetentionHeld = (projects || []).reduce((acc, p) => acc + (p.retentionAmountDzd || 0), 0) || 2250000;

  const workersOnSite = 46;
  const dailyLaborTarget = 50;
  const targetPct = Math.min(100, Math.round((workersOnSite / dailyLaborTarget) * 100));

  // Hourly jobsite presence curve
  const hourlyData = useMemo(() => {
    return [0, 4, 8, 7, 2];
  }, []);

  // 4-week construction progress
  const weeklyProgress = useMemo(() => {
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: 8 },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: 12 },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: 15 },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: 11 },
    ];
  }, [language]);

  // 30-day billing curve
  const monthlyBilling = useMemo(() => {
    const base = 8500000;
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round(base * factor * (1 + (i % 6) * 0.1));
    });
  }, []);

  // Expense breakdown donut
  const siteExpenses = useMemo(() => {
    return [
      { label: language === 'ar' ? 'خرسانة وحديد تسليح' : 'Béton & Armatures', value: 45, color: '#d4522f' },
      { label: language === 'ar' ? 'مقاولون من الباطن' : 'Sous-Traitance Lots', value: 35, color: '#3B82F6' },
      { label: language === 'ar' ? 'آليات ووقود الورشة' : 'Engins & Carburant', value: 20, color: '#10B981' },
    ];
  }, [language]);

  // Site progress comparison
  const siteComparison = useMemo(() => {
    return [
      { week: 'Résidence Bab Ezzouar', value: 68 },
      { week: 'École Fondamentale', value: 84 },
      { week: 'Complexe Médical', value: 42 },
      { week: 'Lotissement Ouest', value: 92 },
    ];
  }, []);

  if (showSkeleton && (projects.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonDashboardContractor
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
            ? 'مؤشرات تقدم الورشات، تتبع كشوف الحسابات الشهرية (DGP)، الكفالات المصرفية واختبارات CTC'
            : language === 'fr'
            ? 'Avancement physique des chantiers BTP, situations DGP Décret 15-247 et cautions bancaires.'
            : 'Live jobsite progress, monthly progress billings, CTC inspections, and retainage analytics.'
        }
        currentBranchName={currentBranch?.name || 'Entreprise Générale BTP Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={() => {}}
        exportFileName="contractor_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Site Velocity & Jobsite Flow (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حركة الورشات والعمال الميدانيين' : language === 'fr' ? 'Activité Chantiers & Équipes' : 'Site Velocity & Jobsite Flow'}
            icon={<HardHat size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {workersOnSite} {language === 'ar' ? 'عامل بالميدان' : 'Ouvriers sur Site'}
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
                      {language === 'ar' ? 'الورشات قيد الإنجاز' : 'Chantiers en Cours'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {activeProjects}
                      </span>
                      <span className="text-xs text-gray-400">/ 6 max</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● {language === 'ar' ? 'أشغال نشطة' : 'Chantiers ouverts'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-gray-200 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'العمال الميدانيين اليوم' : 'Effectif sur Site'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {workersOnSite}
                      </span>
                      <span className="text-xs text-gray-400">{language === 'ar' ? 'عامل' : 'personnes'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
                      {language === 'ar' ? 'معايير السلامة HSE OK' : 'Sécurité HSE validée'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-2">
                    {language === 'ar' ? 'كثافة نشاط الآليات والعمال على مدار 24 ساعة' : 'Courbe horaire de présence chantier (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {language === 'ar' ? 'نسبة حضور اليد العاملة اليوم' : 'Taux de Présence Ouvriers'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 tabular-nums">
                    {workersOnSite} / {dailyLaborTarget}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>{targetPct}% {language === 'ar' ? 'حضور' : 'de présence'}</span>
                  <span>{dailyLaborTarget} ouvriers {language === 'ar' ? 'مخطط' : 'prévus'}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Project Portfolio Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'تطور الصفقات والمشاريع المعتمدة' : language === 'fr' ? 'Développement Portefeuille Marchés' : 'Project Portfolio Development'}
            icon={<Building size={18} className="text-[#d4522f]" />}
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
                  label={language === 'ar' ? 'قيمة الصفقات المبرمة' : 'Volume d’Affaires Marchés'}
                  value={formatMoney(totalContractValue)}
                  badgeText={language === 'ar' ? 'عقود' : 'Marchés'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'إجمالي مبالغ الصفقات المبرمة' : 'Montants contractuels Décret 15-247'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'الورشات النشطة' : 'Chantiers Ouverts'}
                  value={activeProjects}
                  badgeText={language === 'ar' ? 'قيد التنفيذ' : 'En cours'}
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'مشاريع بناء وأشغال جارية' : 'Chantiers avec OS actif'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'اقتطاعات الضمان المحتجزة' : 'Retenues de Garantie'}
                  value={formatMoney(totalRetentionHeld)}
                  sublabel={language === 'ar' ? 'كفالات حسن التنفيذ' : 'Garanties bancaires BNA/CPA'}
                  badgeText="Sécurisé"
                  badgeVariant="neutral"
                />
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'نسبة التقدم الأسبوعي للأشغال (%)' : 'Avancement physique hebdomadaire des lots'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyProgress}
                  maxScale={20}
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
            title={language === 'ar' ? 'المسار المالي وكشوفات الأشغال DGP' : language === 'fr' ? 'Trajectoire Financière & Décomptes DGP' : 'Financial Trajectory & P&L'}
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
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'صافي المقاولة' : 'Marge Nette'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(1950000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">23% Brut</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'كشوفات محررة' : 'DGP Ce Mois'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(8500000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+15%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'مواد ومقاولون' : 'Fournitures & ST'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(6550000)}
                    </span>
                    <span className="text-[10px] text-gray-400 block">77% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-gray-400 block mb-1">
                    {language === 'ar' ? 'منحنى تحصيل الكشوفات على مدار 30 يوماً' : 'Tendance des encaissements DGP sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyBilling} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'مؤشرات الأداء الميداني BTP' : 'Indicateurs de Pilotage Chantier'}
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'انحراف الميزانية DQE' : 'Écart Budgétaire DQE'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">+1.4%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Maitrisé
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'إنتاجية اليد العاملة' : 'Productivité Main d’Œuvre'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">104%</span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Rendement
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'مطابقة اختبارات CTC' : 'Conformité Essais CTC'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">100%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Écrasement OK
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'أيام بدون حوادث عمل' : 'Jours Sans Accident (HSE)'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">420 j</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Zéro blessé
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Engineering Intelligence & Delay Overrun Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'ذكاء الورشات وحارس الآجال والتكاليف' : language === 'fr' ? 'Intelligence Chantier & Overrun Sentinel' : 'Engineering Intelligence & Overrun Guardian'}
            icon={<ShieldCheck size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'توزيع مصاريف الورشة' : 'Ventilation des Dépenses'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <DonutChart segments={siteExpenses} centerLabel={`${activeProjects} Chantiers`} />
                </div>

                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'نسبة الإنجاز حسب الورشة' : 'Avancement DQE par Chantier'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <PillBarHistogram
                    data={siteComparison}
                    maxScale={100}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Overrun Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'حارس منع التأخير وتجاوز التكاليف (Overrun Sentinel)' : 'Schedule Delay & Cost Overrun Sentinel'}
                subtitle={
                  language === 'ar'
                    ? 'مقارنة مستمرة بين المخطط الزمني للتعاقد والتقدم الفيزيائي على أرض الواقع لتفادي غرامات التأخير'
                    : 'Surveillance proactive des pénalités de retard et des approvisionnements critiques en béton.'
                }
                score={97}
                statusText={language === 'ar' ? 'جميع الورشات تسير وفق المخطط الزمني المعتمد!' : 'Planning contractuel respecté : zéro pénalité de retard !'}
                metricLabel={language === 'ar' ? 'مؤشر الالتزام' : 'Planning'}
                metricValue="97%"
                trendText={language === 'ar' ? 'في الموعد' : 'Délais maîtrisés'}
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
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4522f] hover:bg-[#b0674b] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus size={14} />
                    {language === 'ar' ? 'إضافة صفقة / ورشة جديدة' : 'Nouveau Chantier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('scheduler')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-all"
                  >
                    <Calendar size={14} />
                    {language === 'ar' ? 'اليومية الميدانية' : 'Journal de Chantier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('finance')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-all"
                  >
                    <Receipt size={14} />
                    {language === 'ar' ? 'الكشوفات الشهرية DGP' : 'Situations DGP'}
                  </button>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <ContractorProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={addProject}
        />
      )}
    </div>
  );
};

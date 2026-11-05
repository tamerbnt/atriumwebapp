import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Clock,
  TrendingUp,
  Receipt,
  Users,
  Play,
  Pause,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount, formatDuration } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardFreelance } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { InvoicePreviewModal } from './InvoicePreviewModal';
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

export const FreelanceDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    freelanceClients,
    freelanceProjects,
    timeLogs,
    freelanceInvoices,
    freelanceProposals,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setScreen,
    resetFreelanceMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (freelanceClients || []).length > 0 || (timeLogs || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's time logs
  const todayLogs = useMemo(() => {
    return (timeLogs || []).filter((l) => l.date === todayStr);
  }, [timeLogs, todayStr]);

  const loggedMinutesToday = useMemo(() => {
    return todayLogs.reduce((acc, l) => acc + Math.round((l.durationSeconds || 0) / 60), 0) || 285;
  }, [todayLogs]);

  const loggedHoursDecimal = (loggedMinutesToday / 60).toFixed(1);
  const targetHours = 7.0;
  const targetPct = Math.min(100, Math.round((parseFloat(loggedHoursDecimal) / targetHours) * 100));

  // Hourly curve of focus time
  const hourlyData = useMemo(() => {
    return [0, 1, 3, 4, 1];
  }, []);

  // 4-week billable hours trend
  const weeklyHoursTrend = useMemo(() => {
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: 34 },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: 38 },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: 32 },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: 36 },
    ];
  }, [language]);

  // Total clients & pending invoices
  const totalClients = (freelanceClients || []).length || 8;
  const activeProjectsCount = (freelanceProjects || []).length || 5;

  const unpaidInvoices = useMemo(
    () => (freelanceInvoices || []).filter((i) => i.status === 'Sent' || i.status === 'Overdue'),
    [freelanceInvoices]
  );

  const pendingAmount = unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0) || 185000;

  // 30-day cash curve
  const monthlyRevenue = useMemo(() => {
    const base = 420000;
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round(base * factor * (1 + (i % 5) * 0.15));
    });
  }, []);

  // Client Revenue Donut
  const clientRevenueShare = useMemo(() => {
    const colors = ['#d4522f', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    if ((freelanceClients || []).length === 0) {
      return [
        { label: 'Sonatrach Tech', value: 45, color: '#d4522f' },
        { label: 'Fintech Alger', value: 35, color: '#3B82F6' },
        { label: 'E-Commerce DZ', value: 20, color: '#10B981' },
      ];
    }
    return (freelanceClients || []).slice(0, 4).map((c, idx) => ({
      label: c.name,
      value: Math.max(10, Math.round(100 / Math.max(1, freelanceClients.length))),
      color: colors[idx % colors.length],
    }));
  }, [freelanceClients]);

  // Weekly deliverables completed
  const weeklyOutput = useMemo(() => {
    return [
      { week: 'Sprints', value: 8 },
      { week: 'Livraisons', value: 12 },
      { week: 'Revues', value: 6 },
      { week: 'Devis', value: 4 },
    ];
  }, []);

  if (showSkeleton) {
    return (
      <div className="p-6">
        <SkeletonDashboardFreelance />
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

      {/* Header */}
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={
          language === 'ar'
            ? 'تتبع ساعات العمل المفوترة، محفظة العملاء وتدفق الفواتير والسيولة للمستقلين'
            : language === 'fr'
            ? 'Suivi du temps facturable en direct, trésorerie et encaissement des honoraires.'
            : 'Live billable time tracking, client portfolio, and freelance cash runway.'
        }
        currentBranchName={currentBranch?.name || 'Studio Freelance Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetFreelanceMockData}
        exportFileName="freelance_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Billable Hours & Time Flow (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'ساعات العمل والإنتاجية' : language === 'fr' ? 'Heures Facturables & Focus' : 'Billable Hours & Time Flow'}
            icon={<Clock size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {activeTimer ? (language === 'ar' ? 'المؤقت نشط الآن' : 'Timer Actif') : (language === 'ar' ? 'مؤقت متوقف' : 'En pause')}
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
                      {language === 'ar' ? 'ساعات مسجلة اليوم' : 'Temps Passé Aujourd’hui'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {loggedHoursDecimal}h
                      </span>
                      <span className="text-xs text-gray-400">/ {targetHours}h obj</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● {language === 'ar' ? 'إنتاجية مركزة' : 'Focus élevé'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-gray-200 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'المشاريع الجارية' : 'Projets Actifs'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {activeProjectsCount}
                      </span>
                      <span className="text-xs text-gray-400">{language === 'ar' ? 'عقود' : 'missions'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
                      {totalClients} {language === 'ar' ? 'عميل' : 'clients'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-2">
                    {language === 'ar' ? 'توزيع ساعات العمل على مدار 24 ساعة' : 'Courbe horaire du travail facturé (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {language === 'ar' ? 'هدف ساعات الإنتاج اليومي' : 'Objectif d’Heures Journalier'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 tabular-nums">
                    {loggedHoursDecimal} / {targetHours}h
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
                  <span>{targetHours}h / {language === 'ar' ? 'يوم' : 'jour'}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Client Roster Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'تطور محفظة العملاء والمشاريع' : language === 'fr' ? 'Développement Portefeuille Clients' : 'Client Roster & Project Development'}
            icon={<Briefcase size={18} className="text-[#d4522f]" />}
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
                  label={language === 'ar' ? 'العملاء النشطون' : 'Clients Référencés'}
                  value={totalClients}
                  badgeText={language === 'ar' ? 'مستمرون' : 'Actifs'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'عملاء بعقود جارية' : 'Clients avec missions en cours'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'عروض أسعار معلقة' : 'Devis en Attente'}
                  value={Math.max((freelanceProposals || []).length, 3)}
                  badgeText={language === 'ar' ? 'قيد المراجعة' : 'Pipeline'}
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'مقترحات مقدمة للعملاء' : 'Propositions envoyées'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'فواتير غير محصلة' : 'Créances à Encaisser'}
                  value={formatCurrencyAmount(pendingAmount)}
                  sublabel={language === 'ar' ? 'مستحقات واجبة السداد' : 'Factures émises'}
                  badgeText={unpaidInvoices.length > 2 ? 'Relance' : 'Normal'}
                  badgeVariant={unpaidInvoices.length > 2 ? 'warning' : 'neutral'}
                />
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'ساعات العمل الأسبوعية (آخر 4 أسابيع)' : 'Heures hebdomadaires travaillées'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {language === 'ar' ? 'تطور الإنتاجية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyHoursTrend}
                  maxScale={45}
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
            title={language === 'ar' ? 'المسار المالي وسعر الساعة' : language === 'fr' ? 'Trajectoire Financière & TJM' : 'Financial Trajectory & P&L'}
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
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'صافي الدخل' : 'Revenu Net'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatCurrencyAmount(340000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+12%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'مفوتر هذا الشهر' : 'Facturé Mois'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatCurrencyAmount(420000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+15%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'مصاريف تشغيل' : 'Frais & Outils'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatCurrencyAmount(80000)}
                    </span>
                    <span className="text-[10px] text-gray-400 block">19% CA</span>
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
                    {language === 'ar' ? 'مؤشرات الأداء المستقل' : 'Indicateurs de Rentabilité'}
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'سعر الساعة الفعلي' : 'Taux Horaire Réel'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">
                        {formatCurrencyAmount(3800)}/h
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Rentable
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'سرعة التحصيل' : 'Délai d’Encaissement'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">14 j</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Rapide
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة الاستغلال' : 'Taux d’Utilisation'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">82%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Optimal
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F8F9FA] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'تركيز العملاء' : 'Concentration Client'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">35% max</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Diversifié
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Project Intelligence & Runway Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'ذكاء المشاريع وحارس السيولة' : language === 'fr' ? 'Intelligence Missions & Runway Guardian' : 'Project Intelligence & Runway Guardian'}
            icon={<Receipt size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'توزيع الإيراد حسب العميل' : 'Répartition CA par Client'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <DonutChart segments={clientRevenueShare} centerLabel={`${totalClients} Clients`} />
                </div>

                <div className="bg-white rounded-[18px] p-4 border border-[#EDF1F3] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'حجم المخرجات المنجزة' : 'Livrables par Type'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <PillBarHistogram
                    data={weeklyOutput}
                    maxScale={15}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Cashflow Runway Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'حارس السيولة واستمرارية التدفق' : 'Cashflow Runway & Solvency Guardian'}
                subtitle={
                  language === 'ar'
                    ? 'حساب آلي لعدد أشهر الأمان المالي وتنبيهات مواعيد استحقاق الفواتير لدى العملاء'
                    : 'Calcul en continu du runway de trésorerie (6.5 mois d’avance) et relance des factures.'
                }
                score={94}
                statusText={language === 'ar' ? 'مستوى الأمان المالي ممتاز (6.5 شهر)' : 'Runway confortable : 6.5 mois de réserves sécurisées !'}
                metricLabel={language === 'ar' ? 'أشهر الأمان' : 'Runway'}
                metricValue="6.5 mois"
                trendText={language === 'ar' ? 'مؤمن' : 'Trésorerie saine'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <InvoicePreviewModal
          isOpen={!!selectedInvoice}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

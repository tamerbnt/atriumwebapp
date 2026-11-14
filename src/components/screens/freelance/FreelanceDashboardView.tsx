import React, { useMemo, useState } from 'react';
import { Briefcase, Clock, FileText, Gauge, Pause, Play, Wallet } from 'lucide-react';
import {
  AreaTrendChart,
  ConversionFunnel,
  DonutChart,
  DumbbellChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadialGauge,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardFreelance } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
  DashboardBentoFrame,
  DashboardHeader,
  DashboardPod,
  DashboardPodGrid,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import {
  getCompactTimeframeOptions,
  getFullTimeframeOptions,
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
import { selectFreelanceDashboard } from '../../../utils/dashboardSelectors/coreVerticals';

export const FreelanceDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    currentBranch,
    branches,
    switchBranch,
    freelanceClients,
    freelanceProjects,
    timeLogs,
    freelanceInvoices,
    freelanceProposals,
    freelanceExpenses,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
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

  const { filters, makeFilter } = useCardFilters({
    revenue: '30d',
    trend: '30d',
    unpaid: 'all',
    funnel: '30d',
    donut: '30d',
    dumbbell: 'all',
  });
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const unpaidOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Toutes', 'All', 'الكل') },
      { id: 'overdue', label: localizeText(language, 'Échues', 'Overdue', 'متأخرة') },
    ],
    [language]
  );
  const funnelOptions = useMemo(
    () => [
      { id: '7d', label: localizeText(language, '7J', '7D', '7أ') },
      { id: '30d', label: localizeText(language, '30J', '30D', '30ي') },
      { id: 'all', label: localizeText(language, 'Tout', 'All', 'الكل') },
    ],
    [language]
  );
  const dumbbellOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Toutes', 'All', 'الكل') },
      { id: 'over', label: localizeText(language, 'Dépassements', 'Over Budget', 'تجاوز') },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectFreelanceDashboard({
        clients: freelanceClients,
        projects: freelanceProjects,
        timeLogs,
        invoices: freelanceInvoices,
        proposals: freelanceProposals,
        expenses: freelanceExpenses,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [freelanceClients, freelanceProjects, timeLogs, freelanceInvoices, freelanceProposals, freelanceExpenses, filters, language]
  );

  if (showSkeleton && freelanceClients.length === 0 && freelanceInvoices.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardFreelance />
      </div>
    );
  }

  const handleTimerToggle = () => {
    if (activeTimer?.isRunning) {
      pauseTimer();
    } else if (activeTimer) {
      resumeTimer();
    } else if (freelanceProjects[0]) {
      const firstProject = freelanceProjects[0];
      startTimer(
        firstProject.clientId || freelanceClients[0]?.id || 'client_general',
        firstProject.clientName || freelanceClients[0]?.name || 'Client',
        firstProject.id,
        firstProject.title,
        'Session focus'
      );
    } else {
      setScreen('scheduler');
    }
  };

  return (
    <DashboardBentoFrame
      theme={theme}
      isRtl={isRtl}
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      isSyncing={isSyncing}
      lastSyncedAt={lastSyncedAt}
      onRetry={retryCloudSync}
      data-testid="freelance-dashboard"
    >
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Suivi du temps facturable en direct, trésorerie et encaissement des honoraires.',
          'Live billable time tracking, client portfolio, and cash flow.',
          'تتبع ساعات العمل المفوترة، محفظة العملاء وتدفق الفواتير.'
        )}
        currentBranchName={currentBranch?.name}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetFreelanceMockData}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            {freelanceInvoices[0] && (
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<FileText size={15} />}
                onClick={() => setSelectedInvoice(freelanceInvoices[0])}
              >
                {localizeText(language, 'Dernière facture', 'Latest Invoice', 'آخر فاتورة')}
              </AtriumButton>
            )}
            <AtriumButton
              variant="primary"
              size="sm"
              icon={activeTimer?.isRunning ? <Pause size={15} /> : <Play size={15} />}
              onClick={handleTimerToggle}
            >
              {activeTimer?.isRunning
                ? localizeText(language, 'Pause Chrono', 'Pause Timer', 'إيقاف المؤقت')
                : localizeText(language, 'Démarrer Chrono', 'Start Timer', 'بدء المؤقت')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Honoraires & Flux Trésorerie', 'Revenue & Cash Flow', 'الأتعاب والتدفق النقدي')}
          subtitle={localizeText(language, 'Encaissements nets et tendance', 'Collected invoices and collection trend', 'التحصيلات واتجاه التدفق')}
          icon={<Wallet size={16} />}
        >
          <KpiSparkCard
            title={localizeText(language, 'Honoraires encaissés', 'Collected Revenue', 'الأتعاب المحصلة')}
            subtitle={localizeText(
              language,
              `${data.totalClients} clients · frais ${data.expenseTotal.toLocaleString()} DZD`,
              `${data.totalClients} clients · expenses ${data.expenseTotal.toLocaleString()} DZD`,
              `${data.totalClients} عملاء · مصاريف ${data.expenseTotal.toLocaleString()} دج`
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(freelanceInvoices.length > 0)}
            value={data.collectedRevenue}
            deltaPercent={data.revenueDelta}
            format="currency"
            currency="DZD"
            series={data.revenueSpark}
            filter={makeFilter('revenue', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucune facture encaissée sur la période.',
              'No paid invoices in this period.',
              'لا توجد فواتير مدفوعة في هذه الفترة.'
            )}
          />

          <AreaTrendChart
            title={localizeText(language, 'Tendance des encaissements', 'Cash Collection Trend', 'اتجاه التحصيل النقدي')}
            subtitle={localizeText(
              language,
              'Flux d’honoraires encaissés sur la période',
              'Paid freelance invoices vs prior window',
              'الفواتير المحصلة مقارنة بالفترة السابقة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(freelanceInvoices.length > 0)}
            points={data.areaPoints}
            format="currency"
            currency="DZD"
            filter={makeFilter('trend', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune donnée d’encaissement disponible.',
              'No cashflow trend available.',
              'لا توجد بيانات تحصيل متاحة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Créances & Taux Facturable', 'Receivables & Utilization', 'المستحقات وكفاءة الفوترة')}
          subtitle={localizeText(language, 'Factures en attente et rendement temps', 'Open balances and billable utilization', 'الفواتير المفتوحة ونسبة الساعات')}
          icon={<Gauge size={16} />}
        >
          <KpiMetricInverseCard
            title={localizeText(language, 'Créances en attente', 'Unpaid Invoices', 'فواتير غير محصلة')}
            subtitle={localizeText(
              language,
              'Factures envoyées ou échues en attente de règlement',
              'Sent and overdue invoices awaiting settlement',
              'فواتير مرسلة أو متأخرة بانتظار السداد'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(freelanceInvoices.length > 0)}
            value={data.unpaidAmount}
            format="currency"
            currency="DZD"
            series={[]}
            filter={makeFilter('unpaid', unpaidOptions)}
            emptyMessage={localizeText(
              language,
              'Aucune facture émise.',
              'No invoices issued yet.',
              'لم تصدر أي فواتير بعد.'
            )}
          />

          <RadialGauge
            title={localizeText(language, 'Ratio facturable & recouvrement', 'Utilization & Collection', 'نسبة الفوترة والتحصيل')}
            subtitle={localizeText(
              language,
              'Temps facturable sur heures pointées et factures réglées',
              'Billable share of logged hours and paid invoice ratio',
              'نسبة الساعات المفوترة والفواتير المسددة'
            )}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(timeLogs.length > 0 || freelanceInvoices.length > 0)}
            metrics={data.gauges}
            emptyMessage={localizeText(
              language,
              'Enregistrez des pointages ou factures pour calculer le ratio.',
              'Log time or issue invoices to track utilization.',
              'سجل ساعات عمل أو فواتير لحساب النسبة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Pipeline Devis & Clients', 'Commercial Funnel & Clients', 'مسار العروض والعملاء')}
          subtitle={localizeText(language, 'Conversion propositions et part client', 'Proposal conversion and client share', 'تحويل العروض وحصة كل عميل')}
          icon={<Briefcase size={16} />}
        >
          <ConversionFunnel
            title={localizeText(language, 'Tunnel devis → paiement', 'Proposal to Cash Funnel', 'مسار العروض إلى الدفع')}
            subtitle={localizeText(
              language,
              'Devis émis → Acceptés → Facturés → Encaissés',
              'Proposals → Accepted → Invoiced → Paid',
              'العروض ← المقبولة ← المفوترة ← المدفوعة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.funnelStages.length > 0)}
            stages={data.funnelStages}
            filter={makeFilter('funnel', funnelOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun devis ni facture enregistré.',
              'No proposals or invoices recorded.',
              'لا توجد عروض أسعار أو فواتير مسجلة.'
            )}
          />

          <DonutChart
            title={localizeText(language, 'Répartition par client', 'Revenue by Client', 'توزيع الإيرادات حسب العميل')}
            subtitle={localizeText(
              language,
              'Part de facturation par compte client',
              'Billed invoice share across clients',
              'حصة كل عميل من إجمالي الفواتير'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.donutSegments.length > 0)}
            segments={data.donutSegments}
            format="currency"
            currency="DZD"
            filter={makeFilter('donut', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune facture client émise.',
              'No client invoices billed.',
              'لا توجد فواتير عملاء صادرة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Charge Horaire Missions', 'Estimated vs Logged Hours', 'الساعات المقدرة والفعلية')}
          subtitle={localizeText(language, 'Suivi des dépassements de temps par projet', 'Compare logged hours against mission estimates', 'مراقبة تجاوزات الوقت لكل مشروع')}
          icon={<Clock size={16} />}
        >
          <DumbbellChart
            className="flex-1"
            title={localizeText(language, 'Heures estimées vs réalisées', 'Estimated vs Logged Hours', 'الساعات المقدرة مقابل الفعلية')}
            subtitle={localizeText(
              language,
              'Écart de charge par mission active',
              'Actual tracked hours against initial project estimates',
              'مقارنة الساعات المسجلة بالتقديرات الأولية'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.hoursDumbbell.length > 0)}
            items={data.hoursDumbbell}
            prevLabel={localizeText(language, 'Estimé', 'Estimated', 'مقدر')}
            currentLabel={localizeText(language, 'Réalisé', 'Logged', 'فعلي')}
            higherIsBetter={false}
            unit="h"
            deltaUnit="h"
            filter={makeFilter('dumbbell', dumbbellOptions)}
            emptyMessage={localizeText(
              language,
              'Créez un projet freelance pour suivre les heures.',
              'Create a project to compare estimated vs logged hours.',
              'أضف مشروعاً لمقارنة الساعات المقدرة والفعلية.'
            )}
          />
        </DashboardPod>
      </DashboardPodGrid>

      {selectedInvoice && (
        <InvoicePreviewModal
          isOpen={!!selectedInvoice}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </DashboardBentoFrame>
  );
};

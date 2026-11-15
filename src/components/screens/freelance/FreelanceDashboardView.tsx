import React, { useMemo, useState } from 'react';
import { FileText, Pause, Play } from 'lucide-react';
import {
  AreaTrendChart,
  ConversionFunnel,
  DonutChart,
  DumbbellChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadialGauge,
} from '@/atrium';
import {
  useAtriumSelector,
  useDashboardShellState,
  shallowEqualObjects,
  setScreenAction as setScreen,
  startTimerAction as startTimer,
  pauseTimerAction as pauseTimer,
  resumeTimerAction as resumeTimer,
  selectCurrentFreelanceClientsFromState,
  selectCurrentFreelanceProjectsFromState,
  selectCurrentTimeLogsFromState,
  selectCurrentFreelanceInvoicesFromState,
  selectCurrentFreelanceProposalsFromState,
  selectCurrentFreelanceExpensesFromState,
} from '../../../services/store';
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
  POD_SPAN,
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
import { getDashboardHelpText } from '../../../utils/dashboardSelectors/dashboardHelpText';
import { getDashboardPodTitle } from '../../../utils/dashboardSelectors/dashboardPodTitles';

export const FreelanceDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();
  const {
    freelanceClients,
    freelanceProjects,
    timeLogs,
    freelanceInvoices,
    freelanceProposals,
    freelanceExpenses,
    isTimerRunning,
    isTimerPaused,
  } = useAtriumSelector(
    (s) => ({
      freelanceClients: selectCurrentFreelanceClientsFromState(s),
      freelanceProjects: selectCurrentFreelanceProjectsFromState(s),
      timeLogs: selectCurrentTimeLogsFromState(s),
      freelanceInvoices: selectCurrentFreelanceInvoicesFromState(s),
      freelanceProposals: selectCurrentFreelanceProposalsFromState(s),
      freelanceExpenses: selectCurrentFreelanceExpensesFromState(s),
      isTimerRunning: Boolean(s.activeTimer?.isRunning),
      isTimerPaused: Boolean(s.activeTimer?.isPaused),
    }),
    shallowEqualObjects
  );

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
      <SkeletonDashboardFreelance
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  const handleTimerToggle = () => {
    if (isTimerRunning && !isTimerPaused) {
      pauseTimer();
    } else if (isTimerRunning && isTimerPaused) {
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

  const timerActive = isTimerRunning && !isTimerPaused;

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
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            {freelanceInvoices[0] && (
              <AtriumButton
                variant="outline"
                size="md"
                icon={<FileText size={15} />}
                onClick={() => setSelectedInvoice(freelanceInvoices[0])}
              >
                {localizeText(language, 'Dernière facture', 'Latest Invoice', 'آخر فاتورة')}
              </AtriumButton>
            )}
            <AtriumButton
              variant="primary"
              size="md"
              icon={timerActive ? <Pause size={15} /> : <Play size={15} />}
              onClick={handleTimerToggle}
            >
              {timerActive
                ? localizeText(language, 'Pause Chrono', 'Pause Timer', 'إيقاف المؤقت')
                : localizeText(language, 'Démarrer Chrono', 'Start Timer', 'بدء المؤقت')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardPod title={getDashboardPodTitle('freelance', 'kpis', language)}>
        <DashboardPodGrid layout="equal">
          <KpiSparkCard
            className={POD_SPAN.half}
            title={localizeText(language, 'Honoraires encaissés', 'Collected Revenue', 'الأتعاب المحصلة')}
            helpText={getDashboardHelpText('freelance', 'revenue', language)}
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

          <KpiMetricInverseCard
            className={POD_SPAN.half}
            title={localizeText(language, 'Créances en attente', 'Unpaid Invoices', 'فواتير غير محصلة')}
            helpText={getDashboardHelpText('freelance', 'unpaid', language)}
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
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('freelance', 'utilization', language)}>
        <DashboardPodGrid layout="split84">
          <AreaTrendChart
            className={POD_SPAN.wide8}
            title={localizeText(language, 'Tendance des encaissements', 'Cash Collection Trend', 'اتجاه التحصيل النقدي')}
            helpText={getDashboardHelpText('freelance', 'trend', language)}
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

          <RadialGauge
            className={POD_SPAN.side4}
            title={localizeText(language, 'Ratio facturable & recouvrement', 'Utilization & Collection', 'نسبة الفوترة والتحصيل')}
            helpText={getDashboardHelpText('freelance', 'gauges', language)}
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
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('freelance', 'clients', language)}>
        <DashboardPodGrid layout="equal">
          <DumbbellChart
            className={POD_SPAN.full}
            title={localizeText(language, 'Heures estimées vs réalisées', 'Estimated vs Logged Hours', 'الساعات المقدرة مقابل الفعلية')}
            helpText={getDashboardHelpText('freelance', 'dumbbell', language)}
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

          <DonutChart
            className={POD_SPAN.half}
            title={localizeText(language, 'Répartition par client', 'Revenue by Client', 'توزيع الإيرادات حسب العميل')}
            helpText={getDashboardHelpText('freelance', 'donut', language)}
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

          <ConversionFunnel
            className={POD_SPAN.half}
            title={localizeText(language, 'Tunnel devis → paiement', 'Proposal to Cash Funnel', 'مسار العروض إلى الدفع')}
            helpText={getDashboardHelpText('freelance', 'funnel', language)}
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
        </DashboardPodGrid>
      </DashboardPod>

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

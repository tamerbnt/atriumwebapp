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
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardFreelance } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
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

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const data = useMemo(
    () =>
      selectFreelanceDashboard({
        clients: freelanceClients,
        projects: freelanceProjects,
        timeLogs,
        invoices: freelanceInvoices,
        proposals: freelanceProposals,
        expenses: freelanceExpenses,
        period,
        language,
      }),
    [freelanceClients, freelanceProjects, timeLogs, freelanceInvoices, freelanceProposals, freelanceExpenses, period, language]
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
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
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

      <DashboardBentoGrid>
        {/* Row 1: Collected Revenue + Unpaid Invoices Inverse + Billable & Collection Gauge (espresso) */}
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
          emptyMessage={localizeText(
            language,
            'Aucune facture encaissée sur la période.',
            'No paid invoices in this period.',
            'لا توجد فواتير مدفوعة في هذه الفترة.'
          )}
        />

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

        {/* Row 2: Revenue Trend Area (wide) + Proposals-to-Paid Funnel */}
        <AreaTrendChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Aucune donnée d’encaissement disponible.',
            'No cashflow trend available.',
            'لا توجد بيانات تحصيل متاحة.'
          )}
        />

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
          emptyMessage={localizeText(
            language,
            'Aucun devis ni facture enregistré.',
            'No proposals or invoices recorded.',
            'لا توجد عروض أسعار أو فواتير مسجلة.'
          )}
        />

        {/* Row 3: Client Share Donut + Estimated vs Logged Hours Dumbbell (wide) */}
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
          emptyMessage={localizeText(
            language,
            'Aucune facture client émise.',
            'No client invoices billed.',
            'لا توجد فواتير عملاء صادرة.'
          )}
        />

        <DumbbellChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Créez un projet freelance pour suivre les heures.',
            'Create a project to compare estimated vs logged hours.',
            'أضف مشروعاً لمقارنة الساعات المقدرة والفعلية.'
          )}
        />
      </DashboardBentoGrid>

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

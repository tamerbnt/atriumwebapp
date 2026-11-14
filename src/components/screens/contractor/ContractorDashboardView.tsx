import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  BulletChart,
  DumbbellChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadialGauge,
  SquarifiedTreemap,
  WaterfallChart,
} from '@/atrium';
import { useDashboardShellState } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useContractorData } from './contractorData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardContractor } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { ContractorProjectModal } from './ContractorProjectModal';
import {
  BENTO_SPAN,
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import {
  getFullTimeframeOptions,
  getPortfolioTimeframeOptions,
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
import { selectContractorDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const ContractorDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();

  const {
    projects,
    boqItems,
    dailyLogs,
    dgps,
    serviceOrders,
    concretePours,
    subcontractors,
    equipmentLogs,
    addProject,
    resetContractorDemoData,
  } = useContractorData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (projects || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    dgp: '30d',
    waterfall: '30d',
    retention: 'retention',
    bullets: 'all',
    treemap: 'all',
    dumbbell: 'all',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const portfolioTf = useMemo(() => getPortfolioTimeframeOptions(language), [language]);
  const retentionOptions = useMemo(
    () => [
      { id: 'retention', label: localizeText(language, 'Retenue', 'Retention', 'الضمان') },
      { id: 'stops', label: localizeText(language, 'Arrêts OS', 'Stops OS', 'أوامر التوقف') },
    ],
    [language]
  );
  const bulletsOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'inprogress', label: localizeText(language, 'En cours', 'In Progress', 'قيد التنفيذ') },
    ],
    [language]
  );
  const treemapOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'active', label: localizeText(language, 'Actifs', 'Active', 'النشطة') },
    ],
    [language]
  );
  const dumbbellOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'delayed', label: localizeText(language, 'En retard', 'Behind', 'متأخر') },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectContractorDashboard({
        projects,
        boqItems,
        dailyLogs,
        dgps,
        serviceOrders,
        concretePours,
        subcontractors,
        equipmentLogs,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [
      projects,
      boqItems,
      dailyLogs,
      dgps,
      serviceOrders,
      concretePours,
      subcontractors,
      equipmentLogs,
      filters,
      language,
    ]
  );

  if (showSkeleton && projects.length === 0) {
    return (
      <SkeletonDashboardContractor
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  const showingStops = filters.retention === 'stops';

  return (
    <DashboardBentoFrame
      theme={theme}
      isRtl={isRtl}
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      isSyncing={isSyncing}
      lastSyncedAt={lastSyncedAt}
      onRetry={retryCloudSync}
      data-testid="contractor-dashboard"
    >
      <DashboardHeader
        extraActions={
          <AtriumButton
            variant="primary"
            size="md"
            icon={<Plus size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            {localizeText(language, 'Nouveau chantier', 'New Project', 'ورشة جديدة')}
          </AtriumButton>
        }
      />

      <DashboardBentoGrid>
        <KpiSparkCard
          className={BENTO_SPAN.kpiHalf}
          title={localizeText(language, 'Situations DGP certifiées', 'Certified DGP Billing', 'كشوف الأشغال المعتمدة')}
          subtitle={localizeText(
            language,
            `${projects.length} chantiers · ${dgps.length} décomptes`,
            `${projects.length} sites · ${dgps.length} progress bills`,
            `${projects.length} ورشات · ${dgps.length} كشوف`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(dgps.length > 0)}
          value={data.dgpCertifiedTotal}
          deltaPercent={data.dgpDelta}
          format="currency"
          currency="DZD"
          series={data.dgpSpark}
          filter={makeFilter('dgp', fullTf)}
          emptyMessage={localizeText(
            language,
            'Aucune situation DGP certifiée.',
            'No certified DGP progress bills yet.',
            'لا توجد كشوف أشغال معتمدة بعد.'
          )}
        />

        <KpiMetricInverseCard
          className={BENTO_SPAN.kpiHalf}
          title={
            showingStops
              ? localizeText(language, 'Ordres d’arrêt (OS)', 'Active Stop Orders', 'أوامر التوقف النشطة')
              : localizeText(language, 'Retenues de garantie', 'Retention Held', 'اقتطاعات الضمان')
          }
          subtitle={localizeText(
            language,
            `${data.activeStopOrders} ordres d’arrêt (OS) · ${data.totalRetention.toLocaleString()} DZD`,
            `${data.activeStopOrders} active stop orders · ${data.totalRetention.toLocaleString()} DZD`,
            `${data.activeStopOrders} أوامر توقف · ${data.totalRetention.toLocaleString()} دج`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(projects.length > 0 || dgps.length > 0 || serviceOrders.length > 0)}
          value={showingStops ? data.activeStopOrders : data.totalRetention}
          format={showingStops ? 'number' : 'currency'}
          currency={showingStops ? undefined : 'DZD'}
          series={[]}
          filter={makeFilter('retention', retentionOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun marché ni retenue suivi.',
            'No contract retention recorded.',
            'لا توجد صفقات أو اقتطاعات ضمان مسجلة.'
          )}
        />

        <WaterfallChart
          className={BENTO_SPAN.hero8}
          title={localizeText(language, 'Décompte DGP net à mandater', 'DGP Net Payable Waterfall', 'صافي كشف الأشغال')}
          subtitle={localizeText(
            language,
            'Montant certifié, retenue 5%, sous-traitance et net',
            'Certified gross, 5% retention, subcontractors, and net payout',
            'الكشف الإجمالي، اقتطاع الضمان، المقاولة من الباطن والصافي'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.waterfallSteps.length > 0)}
          steps={data.waterfallSteps}
          format="currency"
          currency="DZD"
          filter={makeFilter('waterfall', portfolioTf)}
          emptyMessage={localizeText(
            language,
            'Ajoutez un marché ou DGP pour visualiser le décompte.',
            'Add projects or DGP bills to trace net payout.',
            'أضف ورشة أو كشف أشغال لعرض التفاصيل.'
          )}
        />

        <RadialGauge
          className={BENTO_SPAN.side4}
          title={localizeText(language, 'Essais CTC & Sécurité HSE', 'CTC Concrete & HSE Safety', 'اختبارات الخرسانة والسلامة')}
          subtitle={localizeText(
            language,
            `${concretePours.length} prélèvements · ${dailyLogs.length} journaux`,
            `${concretePours.length} concrete pours · ${dailyLogs.length} daily logs`,
            `${concretePours.length} اختبارات خرسانة · ${dailyLogs.length} تقارير يومية`
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(concretePours.length > 0 || dailyLogs.length > 0)}
          metrics={data.gauges}
          emptyMessage={localizeText(
            language,
            'Enregistrez des coulages CTC ou journaux HSE.',
            'Record concrete pours or daily site logs.',
            'سجل اختبارات الخرسانة أو تقارير السلامة.'
          )}
        />

        <BulletChart
          className={BENTO_SPAN.thirdCompact}
          title={localizeText(language, 'Avancement des lots DQE', 'BOQ Lot Execution', 'تنفيذ حصص الكميات DQE')}
          subtitle={localizeText(
            language,
            'Travaux exécutés vs montant prévu au devis',
            'Executed lot value compared against BOQ plan',
            'الأشغال المنجزة مقارنة بالمخطط التعاقدي'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.boqBullets.length > 0)}
          items={data.boqBullets}
          format="currency"
          currency="DZD"
          actualLegendLabel={localizeText(language, 'Exécuté', 'Executed', 'المنجز')}
          targetLegendLabel={localizeText(language, 'Prévu DQE', 'Planned BOQ', 'المخطط')}
          filter={makeFilter('bullets', bulletsOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun poste DQE renseigné.',
            'No BOQ items logged yet.',
            'لا توجد بنود كميات مسجلة بعد.'
          )}
        />

        <SquarifiedTreemap
          className={BENTO_SPAN.thirdCompact}
          title={localizeText(language, 'Portefeuille des marchés', 'Contract Value Treemap', 'توزيع قيمة الصفقات')}
          subtitle={localizeText(
            language,
            'Poids relatif de chaque chantier BTP',
            'Proportional contract value across active sites',
            'الحجم التعاقدي النسبي لكل مشروع'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.treemapItems.length > 0)}
          items={data.treemapItems}
          format="currency"
          currency="DZD"
          filter={makeFilter('treemap', treemapOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun marché BTP enregistré.',
            'No contractor projects recorded.',
            'لا توجد مشاريع مقاولة مسجلة.'
          )}
        />

        <DumbbellChart
          className={BENTO_SPAN.thirdWideTablet}
          title={localizeText(language, 'Délai écoulé vs Avancement réel', 'Elapsed Time vs Physical Progress', 'المدة المنقضية مقابل الإنجاز الفعلي')}
          subtitle={localizeText(
            language,
            'Détection des écarts de planning sur les chantiers',
            'Schedule drift comparison per active construction site',
            'مقارنة التقدم الزمني بالتقدم الميداني لكل ورشة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.progressDumbbell.length > 0)}
          items={data.progressDumbbell}
          prevLabel={localizeText(language, 'Délai écoulé', 'Time Elapsed', 'الوقت المنقضي')}
          currentLabel={localizeText(language, 'Avancement', 'Physical Progress', 'الإنجاز')}
          unit="%"
          filter={makeFilter('dumbbell', dumbbellOptions)}
          emptyMessage={localizeText(
            language,
            'Créez un chantier pour suivre le glissement planning.',
            'Add projects to compare physical vs schedule progress.',
            'أضف ورشة لمتابعة انحراف المخطط الزمني.'
          )}
        />
      </DashboardBentoGrid>

      {isModalOpen && (
        <ContractorProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={addProject}
        />
      )}
    </DashboardBentoFrame>
  );
};

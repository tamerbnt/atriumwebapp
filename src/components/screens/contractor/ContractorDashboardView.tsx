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
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useContractorData } from './contractorData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardContractor } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { ContractorProjectModal } from './ContractorProjectModal';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
import { selectContractorDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const ContractorDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    currentBranch,
    branches,
    switchBranch,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

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

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

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
        period,
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
      period,
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
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Avancement physique des chantiers BTP, situations DGP Décret 15-247 et essais CTC.',
          'Live jobsite progress, DGP monthly progress billings, CTC inspections, and retainage.',
          'مؤشرات تقدم الورشات، كشوف الحسابات الشهرية، اختبارات الخرسانة واقتطاعات الضمان.'
        )}
        currentBranchName={currentBranch?.name || 'Entreprise Générale BTP Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetContractorDemoData}
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
        extraActions={
          <AtriumButton
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            {localizeText(language, 'Nouveau chantier', 'New Project', 'ورشة جديدة')}
          </AtriumButton>
        }
      />

      <DashboardBentoGrid>
        {/* Row 1: Certified DGP Spark + Retention Held Inverse + CTC/HSE Gauges (espresso) */}
        <KpiSparkCard
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
          emptyMessage={localizeText(
            language,
            'Aucune situation DGP certifiée.',
            'No certified DGP progress bills yet.',
            'لا توجد كشوف أشغال معتمدة بعد.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'Retenues de garantie', 'Retention Held', 'اقتطاعات الضمان')}
          subtitle={localizeText(
            language,
            `${data.activeStopOrders} ordres d’arrêt (OS) actifs`,
            `${data.activeStopOrders} active stop work orders`,
            `${data.activeStopOrders} أوامر توقف نشطة`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(projects.length > 0 || dgps.length > 0)}
          value={data.totalRetention}
          format="currency"
          currency="DZD"
          series={data.dgpSpark.map((pt) => ({ ...pt, value: data.totalRetention }))}
          emptyMessage={localizeText(
            language,
            'Aucun marché ni retenue suivi.',
            'No contract retention recorded.',
            'لا توجد صفقات أو اقتطاعات ضمان مسجلة.'
          )}
        />

        <RadialGauge
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

        {/* Row 2: DGP Net Payable Waterfall (wide) + Contract Portfolio Treemap */}
        <WaterfallChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Ajoutez un marché ou DGP pour visualiser le décompte.',
            'Add projects or DGP bills to trace net payout.',
            'أضف ورشة أو كشف أشغال لعرض التفاصيل.'
          )}
        />

        <SquarifiedTreemap
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
          emptyMessage={localizeText(
            language,
            'Aucun marché BTP enregistré.',
            'No contractor projects recorded.',
            'لا توجد مشاريع مقاولة مسجلة.'
          )}
        />

        {/* Row 3: BOQ Execution Bullets + Schedule vs Physical Progress Dumbbell (wide) */}
        <BulletChart
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
          emptyMessage={localizeText(
            language,
            'Aucun poste DQE renseigné.',
            'No BOQ items logged yet.',
            'لا توجد بنود كميات مسجلة بعد.'
          )}
        />

        <DumbbellChart
          className="md:col-span-2 xl:col-span-2"
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

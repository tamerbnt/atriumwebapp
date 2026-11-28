import React, { useMemo, useState } from 'react';
import { Plus, AlertTriangle, Wrench, PackageCheck, CheckCircle2 } from 'lucide-react';
import {
  BulletChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadarBalanceChart,
  RadialGauge,
  StackedBarChart,
  WaterfallChart,
} from '@/atrium';
import { useDashboardShellState, useAtriumSelector } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useManufacturingData } from './manufacturingData';
import { evaluateMachineMaintenanceStatus } from '../../../utils/manufacturingDepth';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardManufacturing } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';
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
import { selectManufacturingDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';
import { getDashboardHelpText } from '../../../utils/dashboardSelectors/dashboardHelpText';
import { getDashboardPodTitle } from '../../../utils/dashboardSelectors/dashboardPodTitles';

export const ManufacturingDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();
  const currentUser = useAtriumSelector((s) => s.currentUser);

  const {
    boms,
    orders,
    materials,
    qcRecords,
    alerts,
    machines,
    maintenanceLogs,
    finishedGoods,
    addOrder,
    resolveAndonAlert,
  } = useManufacturingData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (orders || []).length > 0 || (boms || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    produced: '30d',
    waterfall: '30d',
    scrap: '30d',
    bullets: 'all',
    stacked: '30d',
    radar: '30d',
  });
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const openAlerts = useMemo(
    () => (alerts || []).filter((a) => a.status === 'Open' || a.status === 'Acknowledged'),
    [alerts]
  );

  const pmDueCount = useMemo(() => {
    const evals = evaluateMachineMaintenanceStatus(machines || [], maintenanceLogs || []);
    return evals.filter((m) => m.isOverdue || m.isWarning).length;
  }, [machines, maintenanceLogs]);

  const releasedFgCount = useMemo(
    () => (finishedGoods || []).filter((f) => f.releaseStatus === 'Released').length,
    [finishedGoods]
  );

  const actorName = currentUser?.fullName || localizeText(language, "Chef d'atelier", 'Supervisor', 'رئيس الورشة');

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const bulletsOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'active', label: localizeText(language, 'En cours', 'Active', 'جاري') },
    ],
    [language]
  );
  const stackedSeries = useMemo(
    () => [
      { id: 'good', label: localizeText(language, 'Conformes', 'Conforming', 'مطابق'), color: '#10b981' },
      { id: 'scrap', label: localizeText(language, 'Rebuts', 'Scrap', 'هدر'), color: '#d4522f' },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectManufacturingDashboard({
        orders,
        boms,
        materials,
        qcRecords,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [orders, boms, materials, qcRecords, filters, language]
  );

  if (showSkeleton && orders.length === 0 && boms.length === 0) {
    return (
      <SkeletonDashboardManufacturing
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
      data-testid="manufacturing-dashboard"
    >
      <DashboardHeader
        extraActions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="mfg-pm-due-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-ctl-sm,10px)] t-cap font-semibold tabular-nums ${
                pmDueCount > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-[#EFE9E2] dark:bg-[#2B2825] text-black/70 dark:text-white/75'
              }`}
            >
              <Wrench size={13} />
              <span>
                {pmDueCount} {localizeText(language, 'PM à planifier', 'PM Due/Alert', 'صيانة وقائية')}
              </span>
            </span>
            <span
              data-testid="mfg-fg-released-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-ctl-sm,10px)] t-cap font-semibold tabular-nums bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              <PackageCheck size={13} />
              <span>
                {releasedFgCount} {localizeText(language, 'Lots PF libérés', 'Released FG', 'منتج نهائي محرر')}
              </span>
            </span>
            <AtriumButton
              variant="primary"
              size="md"
              icon={<Plus size={15} />}
              onClick={() => setIsOrderModalOpen(true)}
            >
              {localizeText(language, 'Nouvel OF', 'New Order', 'أمر تصنيع')}
            </AtriumButton>
          </div>
        }
      />

      {openAlerts.length > 0 && (
        <div
          data-testid="mfg-dashboard-andon-banner"
          role="alert"
          data-sq="card"
          data-sq-border="solid"
          className="bg-red-50 dark:bg-red-950/40 [--sq-stroke:rgba(220,38,38,0.35)] p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold t-small">
              <AlertTriangle size={17} className="shrink-0" />
              <span>
                {localizeText(
                  language,
                  `Alertes Andon Atelier Actives (${openAlerts.length})`,
                  `Active Shopfloor Andon Alerts (${openAlerts.length})`,
                  `تنبيهات أندون الورشة النشطة (${openAlerts.length})`
                )}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {openAlerts.slice(0, 3).map((al) => (
              <div
                key={al.id}
                data-sq="ctl-sm"
                data-sq-border="none"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/90 dark:bg-[#22201E]"
              >
                <div className="min-w-0">
                  <div className="t-cap font-semibold text-black dark:text-white flex items-center gap-2 flex-wrap">
                    <span className="tabular-nums text-red-600 dark:text-red-400">{al.alertNumber}</span>
                    <span>·</span>
                    <span>{al.workstationName || al.orderNumber || 'Atelier'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 t-small">
                      {al.status}
                    </span>
                  </div>
                  <p className="t-cap text-black/70 dark:text-white/75 truncate">{al.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {al.status === 'Open' && (
                    <AtriumButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAndonAlert(al.id, 'acknowledge', actorName)}
                    >
                      {localizeText(language, 'Accuser réception', 'Acknowledge', 'تأكيد الاستلام')}
                    </AtriumButton>
                  )}
                  <AtriumButton
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle2 size={13} />}
                    onClick={() => resolveAndonAlert(al.id, 'resolve', actorName)}
                  >
                    {localizeText(language, 'Résoudre', 'Resolve', 'حل التنبيه')}
                  </AtriumButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DashboardPod title={getDashboardPodTitle('manufacturing', 'production', language)}>
        <DashboardPodGrid layout="split84">
          <KpiSparkCard
            className={POD_SPAN.half12}
            title={localizeText(language, 'Unités fabriquées', 'Units Produced', 'الوحدات المصنعة')}
            helpText={getDashboardHelpText('manufacturing', 'produced', language)}
            subtitle={localizeText(
              language,
              `${orders.length} ordres de fabrication`,
              `${orders.length} manufacturing orders`,
              `${orders.length} أوامر تصنيع`
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(orders.length > 0)}
            value={data.totalProduced}
            deltaPercent={data.producedDelta}
            format="number"
            series={data.producedSpark}
            filter={makeFilter('produced', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucun ordre de fabrication enregistré.',
              'No manufacturing orders recorded.',
              'لا توجد أوامر تصنيع مسجلة.'
            )}
          />

          <KpiMetricInverseCard
            className={POD_SPAN.half12}
            title={localizeText(language, 'Taux de rebut', 'Scrap Rate', 'نسبة الهدر')}
            helpText={getDashboardHelpText('manufacturing', 'scrap', language)}
            subtitle={localizeText(
              language,
              `${data.lowMaterials} matières sous seuil critique`,
              `${data.lowMaterials} raw materials below threshold`,
              `${data.lowMaterials} مواد أولية منخفضة المخزون`
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(orders.length > 0 || materials.length > 0)}
            value={data.scrapRate}
            format="percent"
            series={data.scrapSpark}
            filter={makeFilter('scrap', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune production mesurée.',
              'No scrap measurements yet.',
              'لم تُسجل قياسات هدر بعد.'
            )}
          />

          <StackedBarChart
            className={POD_SPAN.wide8}
            title={localizeText(language, 'Conformes vs Rebuts par OF', 'Good Output vs Scrap', 'الإنتاج المطابق مقابل الهدر')}
            helpText={getDashboardHelpText('manufacturing', 'stacked', language)}
            subtitle={localizeText(
              language,
              'Comparatif pièces conformes et pièces rebutées par lot',
              'Conforming units vs scrap quantities per batch',
              'الوحدات السليمة مقابل التالفة لكل دفعة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.stackedBuckets.length > 0)}
            series={stackedSeries}
            buckets={data.stackedBuckets}
            format="number"
            filter={makeFilter('stacked', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune série de production enregistrée.',
              'No batch output recorded yet.',
              'لا توجد دفعات إنتاج مسجلة.'
            )}
          />

          <RadialGauge
            className={POD_SPAN.side4}
            title={localizeText(language, 'Qualité QC & Rendement', 'QC Pass & First-Pass Yield', 'مطابقة الجودة والمردود')}
            helpText={getDashboardHelpText('manufacturing', 'gauges', language)}
            subtitle={localizeText(
              language,
              `${qcRecords.length} contrôles qualité · ${boms.length} BOM`,
              `${qcRecords.length} QC records · ${boms.length} active BOMs`,
              `${qcRecords.length} فحوص جودة · ${boms.length} وصفات`
            )}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(orders.length > 0 || qcRecords.length > 0)}
            metrics={data.gauges}
            emptyMessage={localizeText(
              language,
              'Lancez un OF ou contrôle QC.',
              'Record orders or QC inspections to gauge yield.',
              'سجل أوامر تصنيع أو فحوصات جودة.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('manufacturing', 'operations', language)}>
        <DashboardPodGrid layout="equal">
          <WaterfallChart
            className={POD_SPAN.full}
            title={localizeText(language, 'Structure des coûts OF', 'Production Cost Waterfall', 'هيكل تكاليف الإنتاج')}
            helpText={getDashboardHelpText('manufacturing', 'waterfall', language)}
            subtitle={localizeText(
              language,
              'Matières premières, main-d’œuvre directe et frais d’atelier',
              'Raw materials, direct labor, overhead, and total batch cost',
              'المواد الأولية واليد العاملة وأعباء الورشة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.waterfallSteps.length > 0)}
            steps={data.waterfallSteps}
            format="currency"
            currency="DZD"
            filter={makeFilter('waterfall', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucun coût d’ordre de fabrication saisi.',
              'No order cost breakdown available.',
              'لا توجد بيانات تكاليف تصنيع.'
            )}
          />

          <BulletChart
            className={POD_SPAN.half}
            title={localizeText(language, 'Avancement des OF', 'Order Progress vs Target', 'تقدم أوامر التصنيع')}
            helpText={getDashboardHelpText('manufacturing', 'bullets', language)}
            subtitle={localizeText(
              language,
              'Quantités produites par rapport à l’objectif',
              'Actual output vs target batch size',
              'الكمية المنتجة مقارنة بالكمية المطلوبة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.orderBullets.length > 0)}
            items={data.orderBullets}
            format="number"
            actualLegendLabel={localizeText(language, 'Produit', 'Produced', 'المنتج')}
            targetLegendLabel={localizeText(language, 'Cible', 'Target', 'المستهدف')}
            filter={makeFilter('bullets', bulletsOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun OF actif à suivre.',
              'No active manufacturing orders.',
              'لا توجد أوامر تصنيع نشطة.'
            )}
          />

          <RadarBalanceChart
            className={POD_SPAN.half}
            title={localizeText(language, 'Équilibre industriel', 'Factory Health Radar', 'توازن المصنع')}
            helpText={getDashboardHelpText('manufacturing', 'radar', language)}
            subtitle={localizeText(
              language,
              'Rendement, QC, délais OF, matières et BOM',
              'Yield, QC, order closure, materials, and BOMs',
              'المردود والجودة والمواد والوصفات'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.radarAxes.length > 0)}
            axes={data.radarAxes}
            primaryLabel={localizeText(language, 'Usine', 'Plant', 'المصنع')}
            benchmarkLabel={localizeText(language, 'Objectif', 'Target', 'الهدف')}
            unit="%"
            filter={makeFilter('radar', compactTf)}
            emptyMessage={localizeText(
              language,
              'Données usine insuffisantes.',
              'Add orders, materials, or QC records.',
              'أضف أوامر تصنيع أو مواد أولية.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <ManufacturingOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        boms={boms}
        onSave={addOrder}
      />
    </DashboardBentoFrame>
  );
};

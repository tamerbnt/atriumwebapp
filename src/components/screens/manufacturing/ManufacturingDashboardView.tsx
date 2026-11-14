import React, { useMemo, useState } from 'react';
import { Activity, Factory, Gauge, Layers, Plus } from 'lucide-react';
import {
  BulletChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadarBalanceChart,
  RadialGauge,
  StackedBarChart,
  WaterfallChart,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useManufacturingData } from './manufacturingData';
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

export const ManufacturingDashboardView: React.FC = () => {
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

  const { boms, orders, materials, qcRecords, addOrder } = useManufacturingData();

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
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Rendement des lignes de fabrication, coûts matière BOM et contrôle qualité des lots.',
          'Live production floor throughput, BOM cost structure, and quality assurance.',
          'مؤشرات خطوط الإنتاج، تكاليف المواد الأولية ومراقبة جودة الدفعات.'
        )}
        currentBranchName={currentBranch?.name || 'Usine de Production Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={() => {}}
        extraActions={
          <AtriumButton
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => setIsOrderModalOpen(true)}
          >
            {localizeText(language, 'Nouvel OF', 'New Order', 'أمر تصنيع')}
          </AtriumButton>
        }
      />

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Production & Coûts de Revient', 'Output & Cost Structure', 'الإنتاج وهيكل التكاليف')}
          subtitle={localizeText(language, 'Volume fabriqué et décomposition des coûts OF', 'Produced units and BOM batch costs', 'الوحدات المصنعة وتكاليف المواد واليد العاملة')}
          icon={<Factory size={16} />}
        >
          <KpiSparkCard
            title={localizeText(language, 'Unités fabriquées', 'Units Produced', 'الوحدات المصنعة')}
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

          <WaterfallChart
            title={localizeText(language, 'Structure des coûts OF', 'Production Cost Waterfall', 'هيكل تكاليف الإنتاج')}
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Qualité & Maîtrise Rebuts', 'Quality & Scrap Control', 'الجودة ومراقبة الهدر')}
          subtitle={localizeText(language, 'Taux de rebut, conformité QC et rendement net', 'Scrap rate and first-pass yield metrics', 'نسبة التلف ومطابقة فحص الجودة')}
          icon={<Gauge size={16} />}
        >
          <KpiMetricInverseCard
            title={localizeText(language, 'Taux de rebut', 'Scrap Rate', 'نسبة الهدر')}
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

          <RadialGauge
            title={localizeText(language, 'Qualité QC & Rendement', 'QC Pass & First-Pass Yield', 'مطابقة الجودة والمردود')}
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Avancement & Conformité Lots', 'Order Execution & Yield Split', 'تقدم أوامر التصنيع والمطابقة')}
          subtitle={localizeText(language, 'Quantités produites et pièces conformes / rebutées', 'Target progress and good vs scrap quantities', 'الإنتاج المطابق مقابل التلف لكل دفعة')}
          icon={<Layers size={16} />}
        >
          <BulletChart
            title={localizeText(language, 'Avancement des OF', 'Order Progress vs Target', 'تقدم أوامر التصنيع')}
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

          <StackedBarChart
            title={localizeText(language, 'Conformes vs Rebuts par OF', 'Good Output vs Scrap', 'الإنتاج المطابق مقابل الهدر')}
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Équilibre Industriel', 'Factory Health Radar', 'التوازن الصناعي للمصنع')}
          subtitle={localizeText(language, 'Performance globale sur 5 axes atelier', 'Yield, QC, closure, materials, and BOMs', 'تقييم المصنع عبر خمسة محاور')}
          icon={<Activity size={16} />}
        >
          <RadarBalanceChart
            className="flex-1"
            title={localizeText(language, 'Équilibre industriel', 'Factory Health Radar', 'توازن المصنع')}
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
        </DashboardPod>
      </DashboardPodGrid>

      {isOrderModalOpen && (
        <ManufacturingOrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          boms={boms}
          onSave={addOrder}
        />
      )}
    </DashboardBentoFrame>
  );
};

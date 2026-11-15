import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  AreaTrendChart,
  BulletChart,
  DumbbellChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadarBalanceChart,
  SquarifiedTreemap,
} from '@/atrium';
import { useDashboardShellState } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useAgricultureData } from './agricultureData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardAgriculture } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { AgricultureParcelModal } from './AgricultureParcelModal';
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
import { selectAgricultureDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';
import { getDashboardHelpText } from '../../../utils/dashboardSelectors/dashboardHelpText';
import { getDashboardPodTitle } from '../../../utils/dashboardSelectors/dashboardPodTitles';

export const AgricultureDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();

  const {
    parcels,
    cropCycles,
    treatmentLogs,
    pointages,
    dairyCows,
    milkingRecords,
    weighbridgeTickets,
    addParcel,
    resetToSeed,
  } = useAgricultureData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (parcels || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    harvest: '30d',
    trend: 'compare',
    dar: 'dar',
    bullets: 'all',
    treemap: 'surface',
    radar: '30d',
    dumbbell: 'all',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const trendOptions = useMemo(
    () => [
      { id: 'compare', label: localizeText(language, 'Récoltes/Lait', 'Mix', 'مقارنة') },
      { id: 'harvest', label: localizeText(language, 'Récoltes', 'Harvest', 'الحصاد') },
      { id: 'milk', label: localizeText(language, 'Lait', 'Milk', 'الحليب') },
    ],
    [language]
  );
  const darOptions = useMemo(
    () => [
      { id: 'dar', label: localizeText(language, 'DAR Parcelles', 'DAR', 'الحظر') },
      { id: 'quarantine', label: localizeText(language, 'Cheptel', 'Herd', 'القطيع') },
    ],
    [language]
  );
  const bulletsOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Toutes', 'All', 'الكل') },
      { id: 'high', label: localizeText(language, 'Critiques', 'High Use', 'مرتفع') },
    ],
    [language]
  );
  const treemapOptions = useMemo(
    () => [
      { id: 'surface', label: localizeText(language, 'Surface ha', 'Area ha', 'المساحة') },
      { id: 'water', label: localizeText(language, 'Eau m³', 'Water m³', 'المياه') },
    ],
    [language]
  );
  const dumbbellOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'harvested', label: localizeText(language, 'Récoltés', 'Harvested', 'المحصودة') },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectAgricultureDashboard({
        parcels,
        cropCycles,
        treatmentLogs,
        pointages,
        dairyCows,
        milkingRecords,
        weighbridgeTickets,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [
      parcels,
      cropCycles,
      treatmentLogs,
      pointages,
      dairyCows,
      milkingRecords,
      weighbridgeTickets,
      filters,
      language,
    ]
  );

  if (showSkeleton && parcels.length === 0) {
    return (
      <SkeletonDashboardAgriculture
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  const showingQuarantine = filters.dar === 'quarantine';
  const treemapWater = filters.treemap === 'water';

  const trendCurrentLabel =
    filters.trend === 'milk'
      ? localizeText(language, 'Lait (L)', 'Milk (L)', 'الحليب')
      : localizeText(language, 'Récoltes (kg)', 'Harvest (kg)', 'الحصاد');
  const trendPreviousLabel =
    filters.trend === 'compare'
      ? localizeText(language, 'Lait (L)', 'Milk (L)', 'الحليب')
      : localizeText(language, 'Précédent', 'Previous', 'السابق');

  return (
    <DashboardBentoFrame
      theme={theme}
      isRtl={isRtl}
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      isSyncing={isSyncing}
      lastSyncedAt={lastSyncedAt}
      onRetry={retryCloudSync}
      data-testid="agriculture-dashboard"
    >
      <DashboardHeader
        extraActions={
          <AtriumButton
            variant="primary"
            size="md"
            icon={<Plus size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            {localizeText(language, 'Nouvelle parcelle', 'New Parcel', 'قطعة فلاحية')}
          </AtriumButton>
        }
      />

      <DashboardPod title={getDashboardPodTitle('agriculture', 'kpis', language)}>
        <DashboardPodGrid layout="equal">
          <KpiSparkCard
            className={POD_SPAN.half}
            title={localizeText(language, 'Poids récolté (Pont-bascule)', 'Weighbridge Harvest', 'الوزن الصافي للحصاد')}
            subtitle={localizeText(
              language,
              `${parcels.length} parcelles · ${dairyCows.length} vaches`,
              `${parcels.length} parcels · ${dairyCows.length} dairy herd`,
              `${parcels.length} قطع · ${dairyCows.length} أبقار`
            )}
            helpText={getDashboardHelpText('agriculture', 'harvest', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(weighbridgeTickets.length > 0)}
            value={data.harvestKgTotal}
            deltaPercent={data.harvestDelta}
            format="number"
            unit="kg"
            series={data.harvestSpark}
            filter={makeFilter('harvest', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucun ticket de pesée enregistré.',
              'No weighbridge harvest tickets yet.',
              'لا توجد تذاكر وزن مسجلة بعد.'
            )}
          />

          <KpiMetricInverseCard
            className={POD_SPAN.half}
            title={
              showingQuarantine
                ? localizeText(language, 'Cheptel en quarantaine', 'Quarantined Dairy Herd', 'أبقار في الحجر')
                : localizeText(language, 'Parcelles en délai DAR', 'DAR Locked Parcels', 'قطع محظورة الحصاد')
            }
            subtitle={localizeText(
              language,
              `Collecte laitière : ${data.totalMilkLiters.toLocaleString()} L`,
              `Conforming milk: ${data.totalMilkLiters.toLocaleString()} L`,
              `إنتاج الحليب المطابق: ${data.totalMilkLiters.toLocaleString()} لتر`
            )}
            helpText={getDashboardHelpText(
              'agriculture',
              showingQuarantine ? 'darHerd' : 'darParcels',
              language
            )}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(
              parcels.length > 0 || cropCycles.length > 0 || treatmentLogs.length > 0 || dairyCows.length > 0
            )}
            value={showingQuarantine ? data.quarantinedCows : data.lockedParcels}
            format="number"
            series={[]}
            filter={makeFilter('dar', darOptions)}
            emptyMessage={localizeText(
              language,
              'Aucune parcelle ni traitement suivi.',
              'No parcels or treatment locks tracked.',
              'لا توجد قطع أو معالجات زراعية مسجلة.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('agriculture', 'production', language)}>
        <DashboardPodGrid layout="split75">
          <AreaTrendChart
            className={POD_SPAN.wide7}
            title={localizeText(language, 'Récoltes (kg) vs Collecte lait (L)', 'Harvest Output vs Milk Collection', 'الحصاد مقابل جمع الحليب')}
            subtitle={localizeText(
              language,
              'Comparatif entre tonnages récoltés et litres de lait conformes',
              'Weighbridge crop output plotted alongside daily milk volume',
              'تطور كميات الحصاد مقارنة بإنتاج الحليب اليومي'
            )}
            helpText={getDashboardHelpText('agriculture', 'trend', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(weighbridgeTickets.length > 0 || milkingRecords.length > 0)}
            points={data.areaPoints}
            currentLabel={trendCurrentLabel}
            previousLabel={trendPreviousLabel}
            format="number"
            filter={makeFilter('trend', trendOptions)}
            emptyMessage={localizeText(
              language,
              'Aucune pesée ni traite enregistrée.',
              'No harvest tickets or milking records yet.',
              'لا توجد بيانات حصاد أو حلب مسجلة بعد.'
            )}
          />

          <RadarBalanceChart
            className={POD_SPAN.side5}
            title={localizeText(language, 'Équilibre agronomique', 'Agronomic Health Radar', 'التوازن الفلاحي')}
            subtitle={localizeText(
              language,
              'Eau ANRH, DAR, cheptel, cycles et pointage paie',
              'Water margin, DAR safety, herd health, crops, and payroll',
              'مخزون المياه، السلامة، القطيع، المحاصيل والأجور'
            )}
            helpText={getDashboardHelpText('agriculture', 'radar', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.radarAxes.length > 0)}
            axes={data.radarAxes}
            primaryLabel={localizeText(language, 'Ferme', 'Farm', 'المزرعة')}
            benchmarkLabel={localizeText(language, 'Cible', 'Target', 'الهدف')}
            unit="%"
            filter={makeFilter('radar', compactTf)}
            emptyMessage={localizeText(
              language,
              'Ajoutez des parcelles, cycles ou bovins.',
              'Add parcels, crop cycles, or dairy records.',
              'أضف قطعاً فلاحية أو محاصيل لعرض المؤشر.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('agriculture', 'resources', language)}>
        <DashboardPodGrid layout="equal">
          <DumbbellChart
            className={POD_SPAN.full}
            title={localizeText(language, 'Rendement prévu vs réel', 'Projected vs Actual Crop Yield', 'المردود المتوقع مقابل الفعلي')}
            subtitle={localizeText(
              language,
              'Écart par cycle cultural (quintaux)',
              'Target vs realized harvest yield per crop cycle',
              'الفارق بين المردود المتوقع والفعلي لكل دورة زراعية'
            )}
            helpText={getDashboardHelpText('agriculture', 'dumbbell', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.yieldDumbbell.length > 0)}
            items={data.yieldDumbbell}
            prevLabel={localizeText(language, 'Prévu', 'Projected', 'المتوقع')}
            currentLabel={localizeText(language, 'Réel', 'Actual', 'الفعلي')}
            unit="Qx"
            filter={makeFilter('dumbbell', dumbbellOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun cycle cultural enregistré.',
              'No crop cycles logged to compare yields.',
              'لا توجد دورات زراعية للمقارنة.'
            )}
          />

          <BulletChart
            className={POD_SPAN.half}
            title={localizeText(language, 'Consommation quotas eau ANRH', 'ANRH Water Quota Usage', 'استهلاك حصص المياه ANRH')}
            subtitle={localizeText(
              language,
              'Volume prélevé (m³) par rapport au plafond annuel',
              'Consumed irrigation m³ compared to annual ANRH cap',
              'الحجم المستهلك مقارنة بالسقف السنوي المرخص'
            )}
            helpText={getDashboardHelpText('agriculture', 'bullets', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.waterBullets.length > 0)}
            items={data.waterBullets}
            format="number"
            unit="m³"
            actualLegendLabel={localizeText(language, 'Consommé', 'Consumed', 'المستهلك')}
            targetLegendLabel={localizeText(language, 'Quota ANRH', 'ANRH Quota', 'الحصة')}
            filter={makeFilter('bullets', bulletsOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun forage ou quota ANRH renseigné.',
              'No parcel ANRH water quotas defined.',
              'لا توجد حصص مياه مسجلة للقطع.'
            )}
          />

          <SquarifiedTreemap
            className={POD_SPAN.half}
            title={
              treemapWater
                ? localizeText(language, 'Prélèvement eau par parcelle (m³)', 'Water Allocation by Parcel (m³)', 'استهلاك المياه حسب القطعة')
                : localizeText(language, 'Assiette foncière (ha)', 'Cultivated Surface (ha)', 'المساحة المزروعة')
            }
            subtitle={localizeText(
              language,
              'Surface exploitable ou volume ANRH par parcelle',
              'Hectares or irrigation volume across active farm parcels',
              'توزيع الهكتارات أو المياه حسب القطعة والمحصول'
            )}
            helpText={getDashboardHelpText(
              'agriculture',
              treemapWater ? 'treemapWater' : 'treemapSurface',
              language
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.treemapItems.length > 0)}
            items={data.treemapItems}
            format="number"
            unit={treemapWater ? 'm³' : 'ha'}
            filter={makeFilter('treemap', treemapOptions)}
            emptyMessage={localizeText(
              language,
              'Aucune parcelle cadastrale enregistrée.',
              'No farm parcels registered yet.',
              'لا توجد قطع فلاحية مسجلة بعد.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      {isModalOpen && (
        <AgricultureParcelModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={addParcel}
        />
      )}
    </DashboardBentoFrame>
  );
};

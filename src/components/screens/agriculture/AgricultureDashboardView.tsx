import React, { useMemo, useState } from 'react';
import { Droplets, Layers, Plus, TrendingUp, Wheat } from 'lucide-react';
import {
  AreaTrendChart,
  BulletChart,
  DumbbellChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadarBalanceChart,
  SquarifiedTreemap,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
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

export const AgricultureDashboardView: React.FC = () => {
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
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Rendement des parcelles, quotas d’irrigation ANRH, délai DAR et production laitière.',
          'Live farm parcel yield, ANRH irrigation quotas, DAR locks, and dairy output.',
          'مؤشرات المستثمرة الفلاحية، حصص السقي، فترة الأمان بعد المعالجة وإنتاج الحليب.'
        )}
        currentBranchName={currentBranch?.name || 'Exploitation Agricole Atrium Mitidja'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetToSeed}
        extraActions={
          <AtriumButton
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => setIsModalOpen(true)}
          >
            {localizeText(language, 'Nouvelle parcelle', 'New Parcel', 'قطعة فلاحية')}
          </AtriumButton>
        }
      />

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Récoltes & Collecte Lait', 'Harvest & Dairy Flow', 'الحصاد وإنتاج الحليب')}
          subtitle={localizeText(language, 'Tonnages pont-bascule et volumes de traite', 'Weighbridge tonnage and daily dairy output', 'كميات الحصاد وحلب الأبقار')}
          icon={<Wheat size={16} />}
        >
          <KpiSparkCard
            title={localizeText(language, 'Poids récolté (Pont-bascule)', 'Weighbridge Harvest', 'الوزن الصافي للحصاد')}
            subtitle={localizeText(
              language,
              `${parcels.length} parcelles · ${dairyCows.length} vaches`,
              `${parcels.length} parcels · ${dairyCows.length} dairy herd`,
              `${parcels.length} قطع · ${dairyCows.length} أبقار`
            )}
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

          <AreaTrendChart
            title={localizeText(language, 'Récoltes (kg) vs Collecte lait (L)', 'Harvest Output vs Milk Collection', 'الحصاد مقابل جمع الحليب')}
            subtitle={localizeText(
              language,
              'Comparatif entre tonnages récoltés et litres de lait conformes',
              'Weighbridge crop output plotted alongside daily milk volume',
              'تطور كميات الحصاد مقارنة بإنتاج الحليب اليومي'
            )}
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Sécurité DAR & Quotas ANRH', 'DAR Locks & ANRH Water', 'السلامة وحصص المياه')}
          subtitle={localizeText(language, 'Blocages sanitaires et consommation hydrique par forage', 'Sanitary parcel/herd lockouts and ANRH irrigation caps', 'فترات الأمان واستهلاك حصص السقي')}
          icon={<Droplets size={16} />}
        >
          <KpiMetricInverseCard
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

          <BulletChart
            title={localizeText(language, 'Consommation quotas eau ANRH', 'ANRH Water Quota Usage', 'استهلاك حصص المياه ANRH')}
            subtitle={localizeText(
              language,
              'Volume prélevé (m³) par rapport au plafond annuel',
              'Consumed irrigation m³ compared to annual ANRH cap',
              'الحجم المستهلك مقارنة بالسقف السنوي المرخص'
            )}
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Parcelles & Équilibre Agronomique', 'Parcels & Farm Health Radar', 'القطع الفلاحية والتوازن')}
          subtitle={localizeText(language, 'Assiette foncière / eau et performance 5 axes', 'Surface or water allocation and 5-axis agronomic balance', 'توزيع المساحات/المياه وتوازن المستثمرة')}
          icon={<Layers size={16} />}
        >
          <SquarifiedTreemap
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

          <RadarBalanceChart
            title={localizeText(language, 'Équilibre agronomique', 'Agronomic Health Radar', 'التوازن الفلاحي')}
            subtitle={localizeText(
              language,
              'Eau ANRH, DAR, cheptel, cycles et pointage paie',
              'Water margin, DAR safety, herd health, crops, and payroll',
              'مخزون المياه، السلامة، القطيع، المحاصيل والأجور'
            )}
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Rendement Prévu vs Réel', 'Projected vs Actual Yield', 'المردود المتوقع مقابل الفعلي')}
          subtitle={localizeText(language, 'Performance par cycle cultural en quintaux', 'Target vs realized harvest per crop cycle (Qx)', 'الفارق بين المردود المتوقع والفعلي بالقنطار')}
          icon={<TrendingUp size={16} />}
        >
          <DumbbellChart
            className="flex-1"
            title={localizeText(language, 'Rendement prévu vs réel', 'Projected vs Actual Crop Yield', 'المردود المتوقع مقابل الفعلي')}
            subtitle={localizeText(
              language,
              'Écart par cycle cultural (quintaux)',
              'Target vs realized harvest yield per crop cycle',
              'الفارق بين المردود المتوقع والفعلي لكل دورة زراعية'
            )}
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
        </DashboardPod>
      </DashboardPodGrid>

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

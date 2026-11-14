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
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useAgricultureData } from './agricultureData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardAgriculture } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { AgricultureParcelModal } from './AgricultureParcelModal';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
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

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

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
        period,
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
      period,
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
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
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

      <DashboardBentoGrid>
        {/* Row 1: Harvest Tonnage Spark + DAR Locked Parcels Inverse (espresso) + Agronomic Radar */}
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
          emptyMessage={localizeText(
            language,
            'Aucun ticket de pesée enregistré.',
            'No weighbridge harvest tickets yet.',
            'لا توجد تذاكر وزن مسجلة بعد.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'Parcelles en délai DAR', 'DAR Locked Parcels', 'قطع محظورة الحصاد')}
          subtitle={localizeText(
            language,
            `Collecte laitière : ${data.totalMilkLiters.toLocaleString()} L`,
            `Conforming milk: ${data.totalMilkLiters.toLocaleString()} L`,
            `إنتاج الحليب المطابق: ${data.totalMilkLiters.toLocaleString()} لتر`
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(
            parcels.length > 0 || cropCycles.length > 0 || treatmentLogs.length > 0
          )}
          value={data.lockedParcels}
          format="number"
          series={data.harvestSpark.map((pt) => ({ ...pt, value: data.lockedParcels }))}
          emptyMessage={localizeText(
            language,
            'Aucune parcelle ni traitement suivi.',
            'No parcels or treatment locks tracked.',
            'لا توجد قطع أو معالجات زراعية مسجلة.'
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
          emptyMessage={localizeText(
            language,
            'Ajoutez des parcelles, cycles ou bovins.',
            'Add parcels, crop cycles, or dairy records.',
            'أضف قطعاً فلاحية أو محاصيل لعرض المؤشر.'
          )}
        />

        {/* Row 2: Harvest vs Milk Area Trend (wide) + Land Area Treemap */}
        <AreaTrendChart
          className="md:col-span-2 xl:col-span-2"
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
          currentLabel={localizeText(language, 'Récoltes (kg)', 'Harvest (kg)', 'الحصاد')}
          previousLabel={localizeText(language, 'Lait (L)', 'Milk (L)', 'الحليب')}
          format="number"
          emptyMessage={localizeText(
            language,
            'Aucune pesée ni traite enregistrée.',
            'No harvest tickets or milking records yet.',
            'لا توجد بيانات حصاد أو حلب مسجلة بعد.'
          )}
        />

        <SquarifiedTreemap
          title={localizeText(language, 'Assiette foncière (ha)', 'Cultivated Surface (ha)', 'المساحة المزروعة')}
          subtitle={localizeText(
            language,
            'Surface exploitable par parcelle et culture',
            'Hectares distributed across active farm parcels',
            'توزيع الهكتارات حسب القطعة والمحصول'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.treemapItems.length > 0)}
          items={data.treemapItems}
          format="number"
          unit="ha"
          emptyMessage={localizeText(
            language,
            'Aucune parcelle cadastrale enregistrée.',
            'No farm parcels registered yet.',
            'لا توجد قطع فلاحية مسجلة بعد.'
          )}
        />

        {/* Row 3: ANRH Water Quota Bullets + Projected vs Actual Yield Dumbbell (wide) */}
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
          emptyMessage={localizeText(
            language,
            'Aucun forage ou quota ANRH renseigné.',
            'No parcel ANRH water quotas defined.',
            'لا توجد حصص مياه مسجلة للقطع.'
          )}
        />

        <DumbbellChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Aucun cycle cultural enregistré.',
            'No crop cycles logged to compare yields.',
            'لا توجد دورات زراعية للمقارنة.'
          )}
        />
      </DashboardBentoGrid>

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

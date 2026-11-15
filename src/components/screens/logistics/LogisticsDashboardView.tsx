import React, { useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import {
  ConversionFunnel,
  HistogramChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RankedBarList,
  StackedBarChart,
  WaterfallChart,
} from '@/atrium';
import { useDashboardShellState } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useLogisticsData } from './logisticsData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardLogistics } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { WilayaTariffModal } from './WilayaTariffModal';
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
import { selectLogisticsDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';
import { getDashboardHelpText } from '../../../utils/dashboardSelectors/dashboardHelpText';
import { getDashboardPodTitle } from '../../../utils/dashboardSelectors/dashboardPodTitles';

export const LogisticsDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();

  const { shipments, discharges, remittances, addShipment, resetLogisticsDemoData } =
    useLogisticsData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (shipments || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    cod: '30d',
    waterfall: '30d',
    returns: '30d',
    stacked: '30d',
    funnel: '30d',
    weight: '30d',
  });
  const [wilayaCriterion, setWilayaCriterion] = useState<'cod' | 'parcels'>('cod');
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const stackedSeries = useMemo(
    () => [
      { id: 'delivered', label: localizeText(language, 'Livrés', 'Delivered', 'تم التسليم'), color: '#10b981' },
      { id: 'returned', label: localizeText(language, 'Retours', 'Returned', 'مرتجع'), color: '#d4522f' },
    ],
    [language]
  );
  const wilayaCriteria = useMemo(
    () => [
      { id: 'cod', label: 'COD', format: 'currency' as const, currency: 'DZD' },
      { id: 'parcels', label: localizeText(language, 'Colis', 'Parcels', 'طرود'), format: 'number' as const },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectLogisticsDashboard({
        shipments,
        discharges,
        remittances,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [shipments, discharges, remittances, filters, language]
  );

  if (showSkeleton && shipments.length === 0) {
    return (
      <SkeletonDashboardLogistics
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
      data-testid="logistics-dashboard"
    >
      <DashboardHeader
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="md"
              icon={<MapPin size={15} />}
              onClick={() => setIsTariffModalOpen(true)}
            >
              {localizeText(language, 'Tarifs Wilaya', 'Wilaya Rates', 'تعريفات الولايات')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="md"
              icon={<Plus size={15} />}
              onClick={() => setIsShipModalOpen(true)}
            >
              {localizeText(language, 'Nouvel envoi', 'New Parcel', 'طرد جديد')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardPod title={getDashboardPodTitle('logistics', 'kpis', language)}>
        <DashboardPodGrid layout="equal">
          <KpiSparkCard
            className={POD_SPAN.half}
            title={localizeText(language, 'COD encaissé', 'COD Collected', 'أموال COD المحصلة')}
            helpText={getDashboardHelpText('logistics', 'cod', language)}
            subtitle={localizeText(
              language,
              `${shipments.length} expéditions suivies`,
              `${shipments.length} tracked shipments`,
              `${shipments.length} شحنة متتبعة`
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(shipments.length > 0)}
            value={data.codCollected}
            deltaPercent={data.codDelta}
            format="currency"
            currency="DZD"
            series={data.codSpark}
            filter={makeFilter('cod', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucune expédition COD enregistrée.',
              'No COD shipments recorded yet.',
              'لا توجد شحنات COD مسجلة بعد.'
            )}
          />

          <KpiMetricInverseCard
            className={POD_SPAN.half}
            title={localizeText(language, 'Taux de retour', 'Return Rate', 'نسبة الإرجاع')}
            helpText={getDashboardHelpText('logistics', 'returns', language)}
            subtitle={localizeText(
              language,
              `${data.returnedCount} colis retournés ou reportés`,
              `${data.returnedCount} returned or postponed parcels`,
              `${data.returnedCount} طرود مرتجعة أو مؤجلة`
            )}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(shipments.length > 0)}
            value={data.returnRate}
            format="percent"
            series={data.returnSpark}
            filter={makeFilter('returns', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune livraison analysée.',
              'No parcels analyzed yet.',
              'لا توجد شحنات للتحليل بعد.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('logistics', 'remittance', language)}>
        <DashboardPodGrid layout="split75">
          <StackedBarChart
            className={POD_SPAN.wide7}
            title={localizeText(language, 'Livrés vs Retours', 'Delivered vs Returns', 'المسلمة مقابل المرتجعة')}
            helpText={getDashboardHelpText('logistics', 'stacked', language)}
            subtitle={localizeText(
              language,
              'Cadence des livraisons sur la fenêtre active',
              'Daily parcel delivery mix over timeframe',
              'نسبة التسليم مقابل الإرجاع خلال الفترة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(shipments.length > 0)}
            series={stackedSeries}
            buckets={data.stackedBuckets}
            format="number"
            filter={makeFilter('stacked', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune tournée enregistrée.',
              'No delivery runs logged yet.',
              'لا توجد جولات توزيع مسجلة.'
            )}
          />

          <WaterfallChart
            className={POD_SPAN.side5}
            title={localizeText(language, 'Réconciliation COD marchands', 'COD Remittance Waterfall', 'تسوية أموال COD')}
            helpText={getDashboardHelpText('logistics', 'waterfall', language)}
            subtitle={localizeText(
              language,
              'COD brut, frais de port, timbre/écarts et net marchands',
              'Gross COD, shipping fees, stamp/diff, and net payout',
              'إجمالي COD ورسوم الشحن والطابع وصافي التجار'
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
              'Enregistrez des colis pour calculer le reversement.',
              'Record shipments to inspect COD settlement.',
              'أضف طروداً لعرض تسوية COD.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('logistics', 'network', language)}>
        <DashboardPodGrid layout="equal">
          <HistogramChart
            className={POD_SPAN.full}
            title={localizeText(language, 'Tranches de poids colis', 'Parcel Weight Distribution', 'توزيع أوزان الطرود')}
            helpText={getDashboardHelpText('logistics', 'weight', language)}
            subtitle={localizeText(
              language,
              'Répartition des expéditions par palier tarifaire (kg)',
              'Shipment count grouped by weight tier',
              'توزيع الشحنات حسب شرائح الوزن'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.weightBins.length > 0)}
            bins={data.weightBins}
            unit={localizeText(language, 'colis', 'parcels', 'طرد')}
            filter={makeFilter('weight', compactTf)}
            emptyMessage={localizeText(
              language,
              'Ajoutez des colis pour afficher la distribution.',
              'Add parcels to view weight tiers.',
              'أضف طروداً لعرض توزيع الأوزان.'
            )}
          />

          <ConversionFunnel
            className={POD_SPAN.half}
            title={localizeText(language, 'Acheminement hub', 'Hub-to-Door Funnel', 'مسار الطرود')}
            helpText={getDashboardHelpText('logistics', 'funnel', language)}
            subtitle={localizeText(
              language,
              'Du quai d’entrée à la remise au destinataire',
              'From hub intake and sorting to delivered COD',
              'من استلام المحطة إلى التسليم النهائي'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.funnelStages.length > 0)}
            stages={data.funnelStages}
            filter={makeFilter('funnel', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucun colis scanné au hub.',
              'No parcels scanned at hub.',
              'لم يُمسح أي طرد في المحطة.'
            )}
          />

          <RankedBarList
            className={POD_SPAN.half}
            title={localizeText(language, 'Top wilayas livrées', 'Top Destination Wilayas', 'أعلى الولايات استلاماً')}
            helpText={getDashboardHelpText('logistics', 'ranked', language)}
            subtitle={localizeText(
              language,
              'Classement par volume COD ou nombre de colis',
              'Ranked by delivered COD value or parcel count',
              'الترتيب حسب قيمة COD أو عدد الطرود'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.rankedWilayas.length > 0)}
            criteria={wilayaCriteria}
            activeCriterionId={wilayaCriterion}
            onCriterionChange={(id) => setWilayaCriterion(id as 'cod' | 'parcels')}
            items={data.rankedWilayas}
            emptyMessage={localizeText(
              language,
              'Aucune destination livrée.',
              'No delivered destinations recorded.',
              'لا توجد وجهات توصيل مسجلة.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      {isShipModalOpen && (
        <LogisticsShipmentModal
          isOpen={isShipModalOpen}
          onClose={() => setIsShipModalOpen(false)}
          onSave={addShipment}
        />
      )}
      {isTariffModalOpen && (
        <WilayaTariffModal
          isOpen={isTariffModalOpen}
          onClose={() => setIsTariffModalOpen(false)}
        />
      )}
    </DashboardBentoFrame>
  );
};

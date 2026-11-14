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
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useLogisticsData } from './logisticsData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardLogistics } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { WilayaTariffModal } from './WilayaTariffModal';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
import { selectLogisticsDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const LogisticsDashboardView: React.FC = () => {
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

  const { shipments, discharges, remittances, addShipment, resetLogisticsDemoData } =
    useLogisticsData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (shipments || []).length > 0,
  });

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [wilayaCriterion, setWilayaCriterion] = useState<'cod' | 'parcels'>('cod');
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const data = useMemo(
    () =>
      selectLogisticsDashboard({
        shipments,
        discharges,
        remittances,
        period,
        language,
      }),
    [shipments, discharges, remittances, period, language]
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
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Suivi de flotte en direct, taux de livraison premier passage et reversement des fonds COD.',
          'Live deliveries, first-attempt success rate, and COD cash reconciliation.',
          'تتبع الأسطول، نسبة نجاح التوصيل وتسوية أموال الدفع عند الاستلام.'
        )}
        currentBranchName={currentBranch?.name || 'Hub Logistique Central Alger'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetLogisticsDemoData}
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="sm"
              icon={<MapPin size={15} />}
              onClick={() => setIsTariffModalOpen(true)}
            >
              {localizeText(language, 'Tarifs Wilaya', 'Wilaya Rates', 'تعريفات الولايات')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setIsShipModalOpen(true)}
            >
              {localizeText(language, 'Nouvel envoi', 'New Parcel', 'طرد جديد')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        {/* Row 1: COD Collected Spark + Return Rate Inverse (espresso) + Parcel Routing Funnel */}
        <KpiSparkCard
          title={localizeText(language, 'COD encaissé', 'COD Collected', 'أموال COD المحصلة')}
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
          emptyMessage={localizeText(
            language,
            'Aucune expédition COD enregistrée.',
            'No COD shipments recorded yet.',
            'لا توجد شحنات COD مسجلة بعد.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'Taux de retour', 'Return Rate', 'نسبة الإرجاع')}
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
          series={data.codSpark.map((pt) => ({ ...pt, value: data.returnRate }))}
          emptyMessage={localizeText(
            language,
            'Aucune livraison analysée.',
            'No parcels analyzed yet.',
            'لا توجد شحنات للتحليل بعد.'
          )}
        />

        <ConversionFunnel
          title={localizeText(language, 'Acheminement hub', 'Hub-to-Door Funnel', 'مسار الطرود')}
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
          emptyMessage={localizeText(
            language,
            'Aucun colis scanné au hub.',
            'No parcels scanned at hub.',
            'لم يُمسح أي طرد في المحطة.'
          )}
        />

        {/* Row 2: COD Settlement Waterfall (wide) + Top Destination Wilayas */}
        <WaterfallChart
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Réconciliation COD marchands', 'COD Remittance Waterfall', 'تسوية أموال COD')}
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
          emptyMessage={localizeText(
            language,
            'Enregistrez des colis pour calculer le reversement.',
            'Record shipments to inspect COD settlement.',
            'أضف طروداً لعرض تسوية COD.'
          )}
        />

        <RankedBarList
          title={localizeText(language, 'Top wilayas livrées', 'Top Destination Wilayas', 'أعلى الولايات استلاماً')}
          subtitle={localizeText(
            language,
            'Classement par volume COD ou nombre de colis',
            'Ranked by delivered COD value or parcel count',
            'الترتيب حسب قيمة COD أو عدد الطرود'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.rankedWilayas.length > 0)}
          criteria={[
            { id: 'cod', label: 'COD', format: 'currency', currency: 'DZD' },
            { id: 'parcels', label: localizeText(language, 'Colis', 'Parcels', 'طرود'), format: 'number' },
          ]}
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

        {/* Row 3: Delivered vs Returned Stacked Bars + Parcel Weight Histogram (wide) */}
        <StackedBarChart
          title={localizeText(language, 'Livrés vs Retours', 'Delivered vs Returns', 'المسلمة مقابل المرتجعة')}
          subtitle={localizeText(
            language,
            'Cadence des livraisons sur la fenêtre active',
            'Daily parcel delivery mix over timeframe',
            'نسبة التسليم مقابل الإرجاع خلال الفترة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(shipments.length > 0)}
          series={[
            {
              id: 'delivered',
              label: localizeText(language, 'Livrés', 'Delivered', 'تم التسليم'),
              color: '#10b981',
            },
            {
              id: 'returned',
              label: localizeText(language, 'Retours', 'Returned', 'مرتجع'),
              color: '#d4522f',
            },
          ]}
          buckets={data.stackedBuckets}
          format="number"
          emptyMessage={localizeText(
            language,
            'Aucune tournée enregistrée.',
            'No delivery runs logged yet.',
            'لا توجد جولات توزيع مسجلة.'
          )}
        />

        <HistogramChart
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Tranches de poids colis', 'Parcel Weight Distribution', 'توزيع أوزان الطرود')}
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
          emptyMessage={localizeText(
            language,
            'Ajoutez des colis pour afficher la distribution.',
            'Add parcels to view weight tiers.',
            'أضف طروداً لعرض توزيع الأوزان.'
          )}
        />
      </DashboardBentoGrid>

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

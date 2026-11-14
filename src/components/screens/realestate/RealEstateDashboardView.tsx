import React, { useMemo, useState } from 'react';
import { Building2, Key } from 'lucide-react';
import {
  BubbleScatterChart,
  BulletChart,
  ConversionFunnel,
  DonutChart,
  DumbbellChart,
  KpiMetricInverseCard,
  KpiSparkCard,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useRealEstateData } from './realEstateData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardRealEstate } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
import { selectRealEstateDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const RealEstateDashboardView: React.FC = () => {
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
    properties,
    mandates,
    leases,
    quittances,
    visits,
    buyers,
    addProperty,
    addLease,
    resetToDemoSeeds,
  } = useRealEstateData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (properties || []).length > 0,
  });

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const data = useMemo(
    () =>
      selectRealEstateDashboard({
        properties,
        mandates,
        leases,
        quittances,
        visits,
        buyers,
        period,
        language,
      }),
    [properties, mandates, leases, quittances, visits, buyers, period, language]
  );

  if (showSkeleton && properties.length === 0) {
    return (
      <SkeletonDashboardRealEstate
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
      data-testid="realestate-dashboard"
    >
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Portefeuille immobilier en direct, mandats exclusifs et encaissement des loyers.',
          'Live property portfolio, lease agreements, and real estate brokerage analytics.',
          'مؤشرات المحفظة العقارية، عقود الإيجار وتحصيل مستحقات الكراء.'
        )}
        currentBranchName={currentBranch?.name || 'Agence Immobilière Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetToDemoSeeds}
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="sm"
              icon={<Building2 size={15} />}
              onClick={() => setIsPropModalOpen(true)}
            >
              {localizeText(language, 'Nouveau bien', 'Property', 'عقار جديد')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Key size={15} />}
              onClick={() => setIsLeaseModalOpen(true)}
            >
              {localizeText(language, 'Nouveau bail', 'New Lease', 'عقد إيجار')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        {/* Row 1: Collected Quittances Spark + Rent Arrears Inverse (espresso) + Rent Roll Bullet */}
        <KpiSparkCard
          title={localizeText(language, 'Quittances encaissées', 'Collected Quittances', 'الإيجارات المحصلة')}
          subtitle={localizeText(
            language,
            `${quittances.length} quittances · ${properties.length} biens`,
            `${quittances.length} receipts · ${properties.length} properties`,
            `${quittances.length} وصل · ${properties.length} عقار`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(quittances.length > 0)}
          value={data.collectedTotal}
          deltaPercent={data.collectedDelta}
          format="currency"
          currency="DZD"
          series={data.collectedSpark}
          emptyMessage={localizeText(
            language,
            'Aucune quittance locative encaissée.',
            'No rental quittances recorded yet.',
            'لا توجد وصولات كراء مسجلة بعد.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'Impayés locatifs', 'Rent Arrears', 'متأخرات الكراء')}
          subtitle={localizeText(
            language,
            `${data.expiringMandates} mandats à renouveler`,
            `${data.expiringMandates} mandates expiring`,
            `${data.expiringMandates} تفويضات قاربت الانتهاء`
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(leases.length > 0 || mandates.length > 0)}
          value={data.arrearsTotal}
          format="currency"
          currency="DZD"
          series={data.collectedSpark.map((pt) => ({ ...pt, value: data.arrearsTotal }))}
          emptyMessage={localizeText(
            language,
            'Aucun bail actif suivi.',
            'No active leases tracked.',
            'لا توجد عقود إيجار نشطة.'
          )}
        />

        <BulletChart
          title={localizeText(language, 'Recouvrement loyers', 'Rent Collection Rate', 'نسبة تحصيل الإيجار')}
          subtitle={localizeText(
            language,
            'Loyers perçus vs loyers mensuels attendus',
            'Collected rent compared to active monthly roll',
            'المحصل مقارنة بالإيجار الشهري المتوقع'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.rentBullets.length > 0)}
          items={data.rentBullets}
          format="currency"
          currency="DZD"
          actualLegendLabel={localizeText(language, 'Encaissé', 'Collected', 'محصل')}
          targetLegendLabel={localizeText(language, 'Attendu', 'Expected', 'متوقع')}
          emptyMessage={localizeText(
            language,
            'Aucun bail actif à comparer.',
            'Add active leases to compare rent roll.',
            'أضف عقود إيجار لمقارنة التحصيل.'
          )}
        />

        {/* Row 2: Price vs Surface Bubble Scatter (wide) + Brokerage Acquisition Funnel */}
        <BubbleScatterChart
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Prix vs Surface (m²)', 'Price vs Floor Area', 'السعر مقابل المساحة')}
          subtitle={localizeText(
            language,
            'Positionnement vente et location selon la surface',
            'Listing valuation plotted by area and room count',
            'توزيع أسعار البيع والكراء حسب المساحة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.bubblePoints.length > 0)}
          groups={data.bubbleGroups}
          points={data.bubblePoints}
          xAxisLabel={localizeText(language, 'Surface (m²)', 'Area (m²)', 'المساحة')}
          sizeLabel={localizeText(language, 'Pièces', 'Rooms', 'الغرف')}
          yFormat="currency"
          currency="DZD"
          xUnit="m²"
          emptyMessage={localizeText(
            language,
            'Ajoutez des biens au catalogue pour comparer les prix.',
            'Add properties to compare price vs floor area.',
            'أضف عقارات لمقارنة السعر بالمساحة.'
          )}
        />

        <ConversionFunnel
          title={localizeText(language, 'Entonnoir courtage', 'Deal Pipeline', 'مسار الصفقات العقارية')}
          subtitle={localizeText(
            language,
            'Des demandes acquéreurs aux actes signés',
            'From buyer leads and visits to signed deals',
            'من طلبات المشترين والمعاينات إلى توقيع العقود'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.funnelStages.length > 0)}
          stages={data.funnelStages}
          emptyMessage={localizeText(
            language,
            'Aucune visite ni mandat actif.',
            'No leads, visits, or mandates recorded.',
            'لا توجد معاينات أو تفويضات مسجلة.'
          )}
        />

        {/* Row 3: Portfolio Type Donut + Asking vs Minimum Price Dumbbell (wide) */}
        <DonutChart
          title={localizeText(language, 'Typologie des biens', 'Portfolio Breakdown', 'توزيع أنواع العقارات')}
          subtitle={localizeText(
            language,
            'Répartition du catalogue par catégorie',
            'Registered units grouped by property type',
            'توزيع المحفظة العقارية حسب الصنف'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.donutSegments.length > 0)}
          segments={data.donutSegments}
          format="number"
          emptyMessage={localizeText(
            language,
            'Aucun bien immobilier enregistré.',
            'No properties registered yet.',
            'لا توجد عقارات مسجلة بعد.'
          )}
        />

        <DumbbellChart
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Prix plancher vs Prix demandé', 'Minimum vs Asking Price', 'السعر الأدنى مقابل المطلوب')}
          subtitle={localizeText(
            language,
            'Marge de négociation sur les mandats actifs',
            'Negotiation spread across active mandates',
            'هامش التفاوض في التفويضات السارية'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.priceDumbbell.length > 0)}
          items={data.priceDumbbell}
          prevLabel={localizeText(language, 'Plancher', 'Floor Price', 'الحد الأدنى')}
          currentLabel={localizeText(language, 'Mandat', 'Asking Price', 'السعر المطلوب')}
          format="currency"
          currency="DZD"
          emptyMessage={localizeText(
            language,
            'Aucun mandat enregistré.',
            'No mandates available to compare spreads.',
            'لا توجد تفويضات عقارية للمقارنة.'
          )}
        />
      </DashboardBentoGrid>

      {isPropModalOpen && (
        <RealEstatePropertyModal
          isOpen={isPropModalOpen}
          onClose={() => setIsPropModalOpen(false)}
          onSave={addProperty}
        />
      )}
      {isLeaseModalOpen && (
        <RealEstateLeaseModal
          isOpen={isLeaseModalOpen}
          onClose={() => setIsLeaseModalOpen(false)}
          properties={properties}
          onSave={addLease}
        />
      )}
    </DashboardBentoFrame>
  );
};

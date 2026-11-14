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
import { useDashboardShellState } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useRealEstateData } from './realEstateData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardRealEstate } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
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
  getCompactTimeframeOptions,
  getFullTimeframeOptions,
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
import { selectRealEstateDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const RealEstateDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();

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

  const { filters, makeFilter } = useCardFilters({
    collected: '30d',
    bullets: '30d',
    arrears: 'arrears',
    dumbbell: 'All',
    bubble: 'All',
    donut: 'All',
    funnel: '30d',
  });
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const bulletTf = useMemo(
    () => [
      { id: '30d', label: localizeText(language, '30J', '30D', '30ي') },
      { id: 'year', label: localizeText(language, 'Année', 'Year', 'سنة') },
    ],
    [language]
  );
  const arrearsOptions = useMemo(
    () => [
      { id: 'arrears', label: localizeText(language, 'Impayés', 'Arrears', 'متأخرات') },
      { id: 'mandates', label: localizeText(language, 'Mandats', 'Mandates', 'تفويضات') },
    ],
    [language]
  );
  const listingOptions = useMemo(
    () => [
      { id: 'All', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'Sale', label: localizeText(language, 'Vente', 'Sale', 'بيع') },
      { id: 'Rental', label: localizeText(language, 'Location', 'Rental', 'كراء') },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectRealEstateDashboard({
        properties,
        mandates,
        leases,
        quittances,
        visits,
        buyers,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [properties, mandates, leases, quittances, visits, buyers, filters, language]
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

  const isMandatesMode = filters.arrears === 'mandates';

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
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="md"
              icon={<Building2 size={15} />}
              onClick={() => setIsPropModalOpen(true)}
            >
              {localizeText(language, 'Nouveau bien', 'Property', 'عقار جديد')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="md"
              icon={<Key size={15} />}
              onClick={() => setIsLeaseModalOpen(true)}
            >
              {localizeText(language, 'Nouveau bail', 'New Lease', 'عقد إيجار')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        <KpiSparkCard
          className={BENTO_SPAN.kpiHalf}
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
          filter={makeFilter('collected', fullTf)}
          emptyMessage={localizeText(
            language,
            'Aucune quittance locative encaissée.',
            'No rental quittances recorded yet.',
            'لا توجد وصولات كراء مسجلة بعد.'
          )}
        />

        <KpiMetricInverseCard
          className={BENTO_SPAN.kpiHalf}
          title={
            isMandatesMode
              ? localizeText(language, 'Mandats à renouveler', 'Expiring Mandates', 'تفويضات قاربت الانتهاء')
              : localizeText(language, 'Impayés locatifs', 'Rent Arrears', 'متأخرات الكراء')
          }
          subtitle={
            isMandatesMode
              ? localizeText(language, `${data.arrearsTotal.toLocaleString()} DZD d’impayés`, `${data.arrearsTotal.toLocaleString()} DZD rent arrears`, `${data.arrearsTotal.toLocaleString()} دج متأخرات`)
              : localizeText(language, `${data.expiringMandates} mandats à renouveler`, `${data.expiringMandates} mandates expiring`, `${data.expiringMandates} تفويضات قاربت الانتهاء`)
          }
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(leases.length > 0 || mandates.length > 0)}
          value={isMandatesMode ? data.expiringMandates : data.arrearsTotal}
          format={isMandatesMode ? 'number' : 'currency'}
          currency={isMandatesMode ? undefined : 'DZD'}
          series={[]}
          filter={makeFilter('arrears', arrearsOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun bail actif suivi.',
            'No active leases tracked.',
            'لا توجد عقود إيجار نشطة.'
          )}
        />

        <BubbleScatterChart
          className={BENTO_SPAN.wide7}
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
          filter={makeFilter('bubble', listingOptions)}
          emptyMessage={localizeText(
            language,
            'Ajoutez des biens au catalogue pour comparer les prix.',
            'Add properties to compare price vs floor area.',
            'أضف عقارات لمقارنة السعر بالمساحة.'
          )}
        />

        <DonutChart
          className={BENTO_SPAN.medium5}
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
          filter={makeFilter('donut', listingOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun bien immobilier enregistré.',
            'No properties registered yet.',
            'لا توجد عقارات مسجلة بعد.'
          )}
        />

        <BulletChart
          className={BENTO_SPAN.thirdWideTablet}
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
          filter={makeFilter('bullets', bulletTf)}
          emptyMessage={localizeText(
            language,
            'Aucun bail actif à comparer.',
            'Add active leases to compare rent roll.',
            'أضف عقود إيجار لمقارنة التحصيل.'
          )}
        />

        <DumbbellChart
          className={BENTO_SPAN.thirdCompact}
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
          filter={makeFilter('dumbbell', listingOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun mandat enregistré.',
            'No mandates available to compare spreads.',
            'لا توجد تفويضات عقارية للمقارنة.'
          )}
        />

        <ConversionFunnel
          className={BENTO_SPAN.thirdCompact}
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
          filter={makeFilter('funnel', compactTf)}
          emptyMessage={localizeText(
            language,
            'Aucune visite ni mandat actif.',
            'No leads, visits, or mandates recorded.',
            'لا توجد معاينات أو تفويضات مسجلة.'
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

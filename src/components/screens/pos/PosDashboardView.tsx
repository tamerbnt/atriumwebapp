import React, { useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import {
  AreaTrendChart,
  HourlyHeatmap,
  KpiMetricInverseCard,
  KpiSparkCard,
  RankedBarList,
  SquarifiedTreemap,
  WaterfallChart,
} from '@/atrium';
import {
  useAtriumSelector,
  useDashboardShellState,
  shallowEqualObjects,
  setScreenAction as setScreen,
  selectCurrentProductsFromState,
  selectCurrentSalesFromState,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardPos } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
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
import { selectPosDashboard } from '../../../utils/dashboardSelectors/coreVerticals';

export interface PosDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const PosDashboardView: React.FC<PosDashboardViewProps> = () => {
  const { language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();
  const { products, sales } = useAtriumSelector(
    (s) => ({
      products: selectCurrentProductsFromState(s),
      sales: selectCurrentSalesFromState(s),
    }),
    shallowEqualObjects
  );

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0 || sales.length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    revenue: '30d',
    trend: '30d',
    waterfall: '30d',
    stock: 'all',
    treemap: 'cost',
    heatmap: '30d',
  });

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const stockOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'out', label: localizeText(language, 'Rupture', 'Out', 'نفاد') },
      { id: 'low', label: localizeText(language, 'Bas', 'Low', 'منخفض') },
    ],
    [language]
  );
  const treemapOptions = useMemo(
    () => [
      { id: 'cost', label: localizeText(language, 'Coût', 'Cost', 'التكلفة') },
      { id: 'retail', label: localizeText(language, 'Vente', 'Retail', 'البيع') },
    ],
    [language]
  );
  const skuCriteria = useMemo(
    () => [
      { id: 'revenue', label: localizeText(language, 'CA', 'Revenue', 'المبيعات'), format: 'currency' as const, currency: 'DZD' },
      { id: 'units', label: localizeText(language, 'Unités', 'Units', 'الوحدات'), format: 'number' as const },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectPosDashboard({
        sales,
        products,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [sales, products, filters, language]
  );

  if (showSkeleton && products.length === 0 && sales.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardPos />
      </div>
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
      data-testid="pos-dashboard"
    >
      <DashboardHeader
        extraActions={
          <AtriumButton
            variant="primary"
            size="md"
            icon={<ShoppingCart size={15} />}
            onClick={() => setScreen('shop')}
          >
            {localizeText(language, 'Ouvrir Caisse', 'Open Register', 'فتح الصندوق')}
          </AtriumButton>
        }
      />

      <DashboardBentoGrid>
        <KpiSparkCard
          className={BENTO_SPAN.kpiHalf}
          title={localizeText(language, 'Chiffre d’affaires caisse', 'Register Revenue', 'مبيعات الصندوق')}
          subtitle={localizeText(
            language,
            `${data.ticketsCount} tickets · panier moyen ${data.avgTicket.toLocaleString()} DZD`,
            `${data.ticketsCount} tickets · avg ${data.avgTicket.toLocaleString()} DZD`,
            `${data.ticketsCount} تذاكر · متوسط ${data.avgTicket.toLocaleString()} دج`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(sales.length > 0)}
          value={data.grossRevenue}
          deltaPercent={data.revenueDelta}
          format="currency"
          currency="DZD"
          series={data.revenueSpark}
          filter={makeFilter('revenue', fullTf)}
          emptyMessage={localizeText(
            language,
            'Aucun ticket encaissé sur la période.',
            'No sales recorded in this period.',
            'لا توجد تذاكر مسجلة في هذه الفترة.'
          )}
        />

        <KpiMetricInverseCard
          className={BENTO_SPAN.kpiHalf}
          title={localizeText(language, 'Ruptures & alertes stock', 'Low Stock Alerts', 'تنبيهات نقص المخزون')}
          subtitle={localizeText(
            language,
            `${data.lowStockCount} références ciblées sur ${data.totalProducts} articles`,
            `${data.lowStockCount} flagged SKUs out of ${data.totalProducts}`,
            `${data.lowStockCount} مواد محددة من ${data.totalProducts}`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(products.length > 0)}
          value={data.lowStockCount}
          format="number"
          unit={localizeText(language, 'articles', 'SKUs', 'مادة')}
          series={[]}
          filter={makeFilter('stock', stockOptions)}
          emptyMessage={localizeText(
            language,
            'Ajoutez des articles pour surveiller les seuils.',
            'Add catalog items to track stock levels.',
            'أضف منتجات لمتابعة المخزون.'
          )}
        />

        <AreaTrendChart
          className={BENTO_SPAN.wide7}
          title={localizeText(language, 'Trajectoire des ventes', 'Sales Trajectory', 'مسار المبيعات')}
          subtitle={localizeText(
            language,
            'Période sélectionnée comparée à la fenêtre précédente',
            'Current timeframe compared against prior window',
            'الفترة الحالية مقارنة بالفترة السابقة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(sales.length > 0)}
          points={data.areaPoints}
          format="currency"
          currency="DZD"
          filter={makeFilter('trend', compactTf)}
          emptyMessage={localizeText(
            language,
            'Aucune donnée d’encaissement disponible.',
            'No checkout trend data available.',
            'لا توجد بيانات مبيعات متاحة.'
          )}
        />

        <WaterfallChart
          className={BENTO_SPAN.medium5}
          title={localizeText(language, 'Pont de marge nette', 'Net Margin Bridge', 'جسر صافي الهامش')}
          subtitle={localizeText(
            language,
            'Ventes brutes → Remises → Coût d’achat → TVA → Marge nette',
            'Gross Sales → Discounts → COGS → Taxes → Net Margin',
            'المبيعات الإجمالية ← التخفيضات ← التكلفة ← الضرائب ← الصافي'
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(data.waterfallSteps.length > 0)}
          steps={data.waterfallSteps}
          format="currency"
          currency="DZD"
          filter={makeFilter('waterfall', fullTf)}
          emptyMessage={localizeText(
            language,
            'Aucune vente sur la période pour calculer la marge.',
            'No sales in period to compute margin bridge.',
            'لا توجد مبيعات لحساب صافي الهامش.'
          )}
        />

        <SquarifiedTreemap
          className={BENTO_SPAN.thirdCompact}
          title={localizeText(language, 'Valeur stock par catégorie', 'Inventory by Category', 'قيمة المخزون حسب الفئة')}
          subtitle={localizeText(
            language,
            'Valorisation des stocks actifs par rayon',
            'Stock valuation grouped by product category',
            'تقييم المخزون الحالي حسب الفئة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.treemapItems.length > 0)}
          items={data.treemapItems}
          format="currency"
          currency="DZD"
          filter={makeFilter('treemap', treemapOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun stock valorisé en rayon.',
            'No valued stock in inventory.',
            'لا يوجد مخزون مقيم حالياً.'
          )}
        />

        <RankedBarList
          className={BENTO_SPAN.thirdCompact}
          title={localizeText(language, 'Top articles vendus', 'Top Selling SKUs', 'أفضل المنتجات مبيعاً')}
          subtitle={localizeText(
            language,
            'Par chiffre d’affaires ou volume d’unités',
            'Ranked by net revenue or units sold',
            'الترتيب حسب المبيعات أو الكمية'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.rankedSkus.length > 0)}
          criteria={skuCriteria}
          items={data.rankedSkus}
          emptyMessage={localizeText(
            language,
            'Aucune ligne de vente sur la période.',
            'No line items sold in this period.',
            'لا توجد مبيعات منتجات في هذه الفترة.'
          )}
        />

        <HourlyHeatmap
          className={BENTO_SPAN.thirdWideTablet}
          title={localizeText(language, 'Heures de pointe caisse', 'Peak Checkout Hours', 'ساعات ذروة البيع')}
          subtitle={localizeText(
            language,
            'Volume de tickets par jour et tranche horaire',
            'Ticket density by weekday and hour',
            'توزيع الفواتير حسب اليوم والساعة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.rushHeatmap.hasAny)}
          rows={data.rushHeatmap.rows}
          cols={data.rushHeatmap.cols}
          cells={data.rushHeatmap.cells}
          filter={makeFilter('heatmap', compactTf)}
          emptyMessage={localizeText(
            language,
            'Aucun passage en caisse horodaté.',
            'No timestamped tickets recorded.',
            'لا توجد فواتير مؤرخة.'
          )}
        />
      </DashboardBentoGrid>
    </DashboardBentoFrame>
  );
};

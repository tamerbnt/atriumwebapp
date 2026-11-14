import React, { useMemo, useState } from 'react';
import { Receipt, ShoppingCart } from 'lucide-react';
import {
  AreaTrendChart,
  HourlyHeatmap,
  KpiMetricInverseCard,
  KpiSparkCard,
  RankedBarList,
  SquarifiedTreemap,
  WaterfallChart,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardPos } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
import { selectPosDashboard } from '../../../utils/dashboardSelectors/coreVerticals';

export interface PosDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const PosDashboardView: React.FC<PosDashboardViewProps> = ({
  onOpenVoucherModal,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    products,
    sales,
    currentBranch,
    branches,
    switchBranch,
    setScreen,
    resetPosMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0 || sales.length > 0,
  });

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const data = useMemo(
    () =>
      selectPosDashboard({
        sales,
        products,
        period,
        language,
      }),
    [sales, products, period, language]
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
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Flux des caisses en direct, rotation des stocks et marge nette.',
          'Live checkout flow, stock valuation, and net retail margin.',
          'مؤشرات نقاط البيع، حركة المخزون وصافي الهامش.'
        )}
        currentBranchName={currentBranch?.name}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetPosMockData}
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            {onOpenVoucherModal && (
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Receipt size={15} />}
                onClick={onOpenVoucherModal}
              >
                {localizeText(language, 'Bon / Remise', 'Voucher', 'قسيمة')}
              </AtriumButton>
            )}
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<ShoppingCart size={15} />}
              onClick={() => setScreen('shop')}
            >
              {localizeText(language, 'Ouvrir Caisse', 'Open Register', 'فتح الصندوق')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        {/* Row 1: Gross Revenue Spark + Low Stock Inverse Alert + Top SKUs */}
        <KpiSparkCard
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
          emptyMessage={localizeText(
            language,
            'Aucun ticket encaissé sur la période.',
            'No sales recorded in this period.',
            'لا توجد تذاكر مسجلة في هذه الفترة.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'Ruptures & alertes stock', 'Low Stock Alerts', 'تنبيهات نقص المخزون')}
          subtitle={localizeText(
            language,
            `${data.lowStockCount} références sous seuil sur ${data.totalProducts} articles`,
            `${data.lowStockCount} SKUs below reorder level out of ${data.totalProducts}`,
            `${data.lowStockCount} مواد تحت الحد الأدنى من ${data.totalProducts}`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(products.length > 0)}
          value={data.lowStockCount}
          format="number"
          unit={localizeText(language, 'articles', 'SKUs', 'مادة')}
          series={[]}
          emptyMessage={localizeText(
            language,
            'Ajoutez des articles pour surveiller les seuils.',
            'Add catalog items to track stock levels.',
            'أضف منتجات لمتابعة المخزون.'
          )}
        />

        <RankedBarList
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
          criteria={[
            { id: 'revenue', label: localizeText(language, 'CA', 'Revenue', 'المبيعات'), format: 'currency', currency: 'DZD' },
            { id: 'units', label: localizeText(language, 'Unités', 'Units', 'الوحدات'), format: 'number' },
          ]}
          items={data.rankedSkus}
          emptyMessage={localizeText(
            language,
            'Aucune ligne de vente sur la période.',
            'No line items sold in this period.',
            'لا توجد مبيعات منتجات في هذه الفترة.'
          )}
        />

        {/* Row 2: Sales Area Trend (wide) + Inventory Valuation Treemap */}
        <AreaTrendChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Aucune donnée d’encaissement disponible.',
            'No checkout trend data available.',
            'لا توجد بيانات مبيعات متاحة.'
          )}
        />

        <SquarifiedTreemap
          title={localizeText(language, 'Valeur stock par catégorie', 'Inventory by Category', 'قيمة المخزون حسب الفئة')}
          subtitle={localizeText(
            language,
            'Valorisation au coût d’achat des stocks actifs',
            'Stock valuation grouped by product category',
            'تقييم المخزون الحالي حسب الفئة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.treemapItems.length > 0)}
          items={data.treemapItems}
          format="currency"
          currency="DZD"
          emptyMessage={localizeText(
            language,
            'Aucun stock valorisé en rayon.',
            'No valued stock in inventory.',
            'لا يوجد مخزون مقيم حالياً.'
          )}
        />

        {/* Row 3: Hourly Register Rush + Net Margin Waterfall (featured espresso, wide) */}
        <HourlyHeatmap
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
          emptyMessage={localizeText(
            language,
            'Aucun passage en caisse horodaté.',
            'No timestamped tickets recorded.',
            'لا توجد فواتير مؤرخة.'
          )}
        />

        <WaterfallChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Aucune vente sur la période pour calculer la marge.',
            'No sales in period to compute margin bridge.',
            'لا توجد مبيعات لحساب صافي الهامش.'
          )}
        />
      </DashboardBentoGrid>
    </DashboardBentoFrame>
  );
};

import React, { useMemo, useState } from 'react';
import { Activity, FilePlus2, Layers, ShieldAlert, TrendingUp } from 'lucide-react';
import {
  BubbleScatterChart,
  BulletChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  SquarifiedTreemap,
  StackedBarChart,
  WaterfallChart,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardTrading } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
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
import { selectTradingDashboard } from '../../../utils/dashboardSelectors/coreVerticals';

export const TradingDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    commercialDocs,
    purchaseDocs,
    b2bClients,
    products,
    warehouses,
    currentBranch,
    branches,
    switchBranch,
    resetTradingMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (commercialDocs || []).length > 0 || (products || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    turnover: '30d',
    flow: '30d',
    receivables: 'all',
    bullets: 'all',
    waterfall: '30d',
    treemap: 'warehouse',
    bubble: 'all',
  });
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const receivablesOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'over75', label: '>75%' },
    ],
    [language]
  );
  const bulletsOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'watch', label: localizeText(language, 'Alerte', 'Watch', 'مراقبة') },
    ],
    [language]
  );
  const treemapOptions = useMemo(
    () => [
      { id: 'warehouse', label: localizeText(language, 'Dépôts', 'Depots', 'المستودعات') },
      { id: 'product', label: localizeText(language, 'Produits', 'Products', 'المنتجات') },
    ],
    [language]
  );
  const bubbleOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'watch', label: localizeText(language, 'Risque', 'High Cap', 'سقف مرتفع') },
      { id: 'normal', label: localizeText(language, 'Sain', 'Healthy', 'سليم') },
    ],
    [language]
  );
  const flowSeries = useMemo(
    () => [
      { id: 'sales', label: localizeText(language, 'Ventes B2B', 'B2B Sales', 'المبيعات'), color: '#d4522f' },
      { id: 'purchases', label: localizeText(language, 'Achats', 'Purchases', 'المشتريات'), color: '#3b82f6' },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectTradingDashboard({
        commercialDocs,
        purchaseDocs,
        b2bClients,
        warehouses,
        products,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [commercialDocs, purchaseDocs, b2bClients, warehouses, products, filters, language]
  );

  if (showSkeleton && commercialDocs.length === 0 && products.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardTrading />
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
      data-testid="trading-dashboard"
    >
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Flux des expéditions B2B, valorisation des entrepôts et créances clients.',
          'Live B2B dispatches, depot valuation, and trade credit exposure.',
          'مؤشرات التجارة بالجملة، تقييم المخازن ومستحقات الزبائن.'
        )}
        currentBranchName={currentBranch?.name}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetTradingMockData}
        extraActions={
          <AtriumButton
            variant="primary"
            size="sm"
            icon={<FilePlus2 size={15} />}
            onClick={() => setIsComposerOpen(true)}
          >
            {localizeText(language, 'Nouveau document B2B', 'New B2B Doc', 'وثيقة تجارية جديدة')}
          </AtriumButton>
        }
      />

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Chiffre d’Affaires & Flux B2B', 'B2B Turnover & Trade Flow', 'رقم الأعمال وتدفق المبيعات')}
          subtitle={localizeText(language, 'Ventes gros et réapprovisionnements', 'Wholesale billing vs purchase receipts', 'فوترة الجملة مقابل المشتريات')}
          icon={<TrendingUp size={16} />}
        >
          <KpiSparkCard
            title={localizeText(language, 'Chiffre d’affaires B2B', 'B2B Sales Turnover', 'رقم أعمال الجملة')}
            subtitle={localizeText(
              language,
              `${commercialDocs.length} pièces commerciales · ${warehouses.length} dépôts`,
              `${commercialDocs.length} commercial docs · ${warehouses.length} depots`,
              `${commercialDocs.length} وثائق تجارية · ${warehouses.length} مستودعات`
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(commercialDocs.length > 0)}
            value={data.b2bTurnover}
            deltaPercent={data.turnoverDelta}
            format="currency"
            currency="DZD"
            series={data.turnoverSpark}
            filter={makeFilter('turnover', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucune facture ou BL émis sur la période.',
              'No B2B invoices or dispatches recorded.',
              'لا توجد فواتير أو سندات شحن مسجلة.'
            )}
          />

          <StackedBarChart
            title={localizeText(language, 'Ventes B2B vs Achats', 'Sales vs Purchases Flow', 'المبيعات مقابل المشتريات')}
            subtitle={localizeText(
              language,
              'Équilibre des flux sortants et réapprovisionnements',
              'Outbound B2B billing vs supplier purchase receipts',
              'توازن الفوترة والتموين خلال الفترة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(commercialDocs.length > 0 || purchaseDocs.length > 0)}
            series={flowSeries}
            buckets={data.stackedBuckets}
            format="currency"
            currency="DZD"
            filter={makeFilter('flow', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune transaction B2B enregistrée.',
              'No B2B transactions recorded.',
              'لا توجد معاملات تجارية مسجلة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Créances & Plafonds Crédit', 'Receivables & Credit Limits', 'المستحقات وسقوف الائتمان')}
          subtitle={localizeText(language, 'Exposition client et limites accordées', 'Trade credit exposure vs caps', 'مستحقات الزبائن والحدود الممنوحة')}
          icon={<ShieldAlert size={16} />}
        >
          <KpiMetricInverseCard
            title={localizeText(language, 'Encours créances B2B', 'B2B Credit Exposure', 'مستحقات العملاء الآجلة')}
            subtitle={localizeText(
              language,
              `${b2bClients.length} comptes grossistes suivis`,
              `${b2bClients.length} wholesale accounts tracked`,
              `${b2bClients.length} حسابات تجارية متابعة`
            )}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(b2bClients.length > 0)}
            value={data.outstandingReceivables}
            format="currency"
            currency="DZD"
            series={[]}
            filter={makeFilter('receivables', receivablesOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun compte client B2B enregistré.',
              'No wholesale accounts registered.',
              'لا توجد حسابات عملاء مسجلة.'
            )}
          />

          <BulletChart
            title={localizeText(language, 'Encours vs Plafond crédit', 'Balance vs Credit Limit', 'المستحقات مقابل سقف الائتمان')}
            subtitle={localizeText(
              language,
              'Utilisation des lignes de crédit par distributeur',
              'Outstanding balance compared to approved credit cap',
              'الرصيد المستحق مقارنة بالحد الائتماني'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.creditBullets.length > 0)}
            items={data.creditBullets}
            format="currency"
            currency="DZD"
            filter={makeFilter('bullets', bulletsOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun plafond crédit configuré.',
              'No client credit limits configured.',
              'لا توجد حدود ائتمان مهيأة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Marge Négoce & Stock Dépôts', 'Trading Margin & Depots', 'هامش الربح وتقييم المخازن')}
          subtitle={localizeText(language, 'Pont financier et capital immobilisé', 'Net margin bridge and depot stock value', 'صافي الربح ورأس مال المخزون')}
          icon={<Layers size={16} />}
        >
          <WaterfallChart
            title={localizeText(language, 'Pont de marge négoce', 'Trading Margin Bridge', 'جسر هامش التجارة')}
            subtitle={localizeText(
              language,
              'Ventes HT → Remises → Achats fournisseurs → Marge nette',
              'B2B Sales → Discounts → Purchases → Net Margin',
              'المبيعات ← التخفيضات ← المشتريات ← صافي الربح'
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
              'Aucun flux ventes/achats enregistré.',
              'No B2B sales or purchase flow recorded.',
              'لا توجد حركة مبيعات أو مشتريات مسجلة.'
            )}
          />

          <SquarifiedTreemap
            title={localizeText(language, 'Valorisation par dépôt', 'Warehouse Stock Valuation', 'تقييم المخزون حسب المستودع')}
            subtitle={localizeText(
              language,
              'Répartition de la valeur stockée sur les sites',
              'Inventory capital distribution across depots',
              'توزيع رأس مال المخزون عبر المستودعات'
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
              'Aucun dépôt ou stock valorisé.',
              'No valued warehouse stock available.',
              'لا يوجد مخزون مقيم بالمستودعات.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Matrice Risque & Volume Clients', 'Client Volume & Credit Risk', 'مصفوفة مخاطر وحجم العملاء')}
          subtitle={localizeText(language, 'Fréquence commandes, CA et exposition', 'Orders vs turnover sized by credit balance', 'تحليل التكرار وحجم المبيعات والائتمان')}
          icon={<Activity size={16} />}
        >
          <BubbleScatterChart
            className="flex-1"
            title={localizeText(language, 'Matrice clients : Fréquence vs Volume', 'Client Volume & Credit Risk', 'مصفوفة الزبائن: التكرار والحجم')}
            subtitle={localizeText(
              language,
              'Nombre de commandes (X), chiffre d’affaires (Y) et encours (taille)',
              'Order count (X), volume (Y), and credit exposure (bubble size)',
              'عدد الطلبات، حجم المعاملات ومبلغ الائتمان'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.bubblePoints.length > 0)}
            groups={data.bubbleGroups}
            points={data.bubblePoints}
            xAxisLabel={localizeText(language, 'Commandes', 'Orders', 'الطلبات')}
            sizeLabel={localizeText(language, 'Encours', 'Exposure', 'المستحقات')}
            yFormat="currency"
            sizeFormat="currency"
            currency="DZD"
            filter={makeFilter('bubble', bubbleOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun compte distributeur actif.',
              'No active B2B distributors.',
              'لا يوجد موزعون نشطون.'
            )}
          />
        </DashboardPod>
      </DashboardPodGrid>

      {isComposerOpen && (
        <CommercialDocComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
    </DashboardBentoFrame>
  );
};

import React, { useMemo, useState } from 'react';
import { Car, Wrench } from 'lucide-react';
import {
  CapacityWaffle,
  ConversionFunnel,
  KpiMetricInverseCard,
  KpiSparkCard,
  RankedBarList,
  ResourceTimeline,
  WaterfallChart,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useGarageData } from './garageData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardGarage } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { AutoOrderModal } from './AutoOrderModal';
import { AutoVehicleModal } from './AutoVehicleModal';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
import { selectGarageDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const AutoGarageDashboardView: React.FC = () => {
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

  const { orders, vehicles, parts, bays, fleets, invoices, addOrder, addVehicle, resetGarageDemoData } =
    useGarageData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (orders || []).length > 0 || (vehicles || []).length > 0,
  });

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [techCriterion, setTechCriterion] = useState<'revenue' | 'orders'>('revenue');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const data = useMemo(
    () =>
      selectGarageDashboard({
        orders,
        bays,
        parts,
        fleets,
        invoices,
        period,
        language,
      }),
    [orders, bays, parts, fleets, invoices, period, language]
  );

  if (showSkeleton && orders.length === 0 && vehicles.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardGarage />
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
      data-testid="garage-dashboard"
    >
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Occupation des ponts élévateurs, ordres de réparation et rentabilité garage.',
          'Live lift & bay utilization, repair order turnaround, and auto workshop analytics.',
          'مؤشرات حركة الورشة، إشغال الجسور وتتبع أوامر الإصلاح وقطع الغيار.'
        )}
        currentBranchName={currentBranch?.name || 'Atelier Central Auto Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetGarageDemoData}
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="sm"
              icon={<Car size={15} />}
              onClick={() => setIsVehicleModalOpen(true)}
            >
              {localizeText(language, 'Véhicule', 'Vehicle', 'مركبة')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Wrench size={15} />}
              onClick={() => setIsOrderModalOpen(true)}
            >
              {localizeText(language, 'Nouvel OR', 'New Repair', 'أمر إصلاح')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        {/* Row 1: Workshop Revenue Spark + Blocked Orders Inverse (espresso) + Lift Capacity Waffle */}
        <KpiSparkCard
          title={localizeText(language, 'Facturation atelier', 'Workshop Revenue', 'فوترة الورشة')}
          subtitle={localizeText(
            language,
            `${data.fleetsCount} flottes B2B · ${vehicles.length} véhicules`,
            `${data.fleetsCount} B2B fleets · ${vehicles.length} vehicles`,
            `${data.fleetsCount} أساطيل · ${vehicles.length} مركبات`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(invoices.length > 0)}
          value={data.workshopRevenue}
          deltaPercent={data.revenueDelta}
          format="currency"
          currency="DZD"
          series={data.revenueSpark}
          emptyMessage={localizeText(
            language,
            'Aucune facture atelier émise.',
            'No workshop invoices issued yet.',
            'لم تصدر أي فواتير ورشة بعد.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'OR bloqués pièces', 'Orders Waiting Parts', 'أوامر بانتظار القطع')}
          subtitle={localizeText(
            language,
            `${data.lowParts} références pièces sous seuil`,
            `${data.lowParts} spare parts low stock`,
            `${data.lowParts} قطع غيار منخفضة المخزون`
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(orders.length > 0 || parts.length > 0)}
          value={data.blockedOrders}
          format="number"
          series={data.revenueSpark.map((pt) => ({ ...pt, value: data.blockedOrders }))}
          emptyMessage={localizeText(
            language,
            'Aucun ordre de réparation actif.',
            'No active repair orders.',
            'لا توجد أوامر إصلاح نشطة.'
          )}
        />

        <CapacityWaffle
          title={localizeText(language, 'Occupation des ponts', 'Bay & Lift Utilization', 'إشغال الجسور')}
          subtitle={localizeText(
            language,
            `${data.occupiedBays} / ${data.totalBays} baies occupées`,
            `${data.occupiedBays} / ${data.totalBays} service bays active`,
            `${data.occupiedBays} / ${data.totalBays} جسور مشغولة`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.totalBays > 0)}
          occupied={data.occupiedBays}
          capacity={data.totalBays}
          occupiedLabel={localizeText(language, 'Occupés', 'Busy', 'مشغول')}
          availableLabel={localizeText(language, 'Libres', 'Free', 'شاغر')}
          emptyMessage={localizeText(
            language,
            'Aucun pont configuré.',
            'No workshop bays configured.',
            'لا توجد جسور عمل مسجلة.'
          )}
        />

        {/* Row 2: Service Bay Timeline (wide) + Repair Order Funnel */}
        <ResourceTimeline
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Planning des ponts élévateurs', 'Bay Allocation Timeline', 'تخطيط جسور الصيانة')}
          subtitle={localizeText(
            language,
            'Véhicules immobilisés par baie technique',
            'Open repair orders assigned to workshop bays',
            'أوامر الإصلاح الموزعة على جسور الورشة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.resources.length > 0 && data.blocks.length > 0)}
          resources={data.resources}
          blocks={data.blocks}
          startHour={8}
          endHour={19}
          nowHour={11}
          toneLabels={{
            primary: localizeText(language, 'En réparation', 'In Repair', 'قيد الإصلاح'),
            secondary: localizeText(language, 'Attente pièces', 'Waiting Parts', 'بانتظار القطع'),
            neutral: localizeText(language, 'Diagnostic', 'Diagnostic', 'تشخيص'),
          }}
          emptyMessage={localizeText(
            language,
            'Aucun véhicule affecté aux ponts.',
            'No active orders assigned to bays.',
            'لا توجد مركبات مخصصة للجسور.'
          )}
        />

        <ConversionFunnel
          title={localizeText(language, 'Pipeline réparations', 'Repair Funnel', 'مسار الإصلاح')}
          subtitle={localizeText(
            language,
            'De la réception véhicule à la livraison',
            'From intake to diagnostic, repair, and pickup',
            'من الاستقبال إلى الفحص والإصلاح والتسليم'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.funnelStages.length > 0)}
          stages={data.funnelStages}
          emptyMessage={localizeText(
            language,
            'Aucun ordre de réparation créé.',
            'No repair orders created.',
            'لم يُنشأ أي أمر إصلاح بعد.'
          )}
        />

        {/* Row 3: Ranked Mechanics + Workshop Margin Waterfall (wide) */}
        <RankedBarList
          title={localizeText(language, 'Performance techniciens', 'Technician Output', 'أداء الفنيين')}
          subtitle={localizeText(
            language,
            'Classement par chiffre d’affaires ou volume OR',
            'Mechanics ranked by billed revenue or repair count',
            'ترتيب الميكانيكيين حسب الإيراد أو عدد الأوامر'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.rankedMechanics.length > 0)}
          criteria={[
            { id: 'revenue', label: localizeText(language, 'CA', 'Revenue', 'الإيراد'), format: 'currency', currency: 'DZD' },
            { id: 'orders', label: localizeText(language, 'OR', 'Orders', 'الأوامر'), format: 'number' },
          ]}
          activeCriterionId={techCriterion}
          onCriterionChange={(id) => setTechCriterion(id as 'revenue' | 'orders')}
          items={data.rankedMechanics}
          emptyMessage={localizeText(
            language,
            'Aucune intervention technicien enregistrée.',
            'No technician repair orders recorded.',
            'لا توجد تدخلات فنية مسجلة.'
          )}
        />

        <WaterfallChart
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Cascade marge atelier', 'Workshop Margin Waterfall', 'شلال هامش الورشة')}
          subtitle={localizeText(
            language,
            'Main-d’œuvre, pièces facturées, remises et coûts',
            'Labor, parts revenue, discounts, and parts cost',
            'اليد العاملة وقطع الغيار والتكاليف الصافية'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.waterfallSteps.length > 0)}
          steps={data.waterfallSteps}
          format="currency"
          currency="DZD"
          emptyMessage={localizeText(
            language,
            'Créez un ordre de réparation pour calculer la marge.',
            'Create repair orders to inspect margin flow.',
            'أنشئ أمر إصلاح لحساب هامش الورشة.'
          )}
        />
      </DashboardBentoGrid>

      {isOrderModalOpen && (
        <AutoOrderModal
          isOpen={isOrderModalOpen}
          vehicles={vehicles}
          onClose={() => setIsOrderModalOpen(false)}
          onSave={addOrder}
        />
      )}
      {isVehicleModalOpen && (
        <AutoVehicleModal
          isOpen={isVehicleModalOpen}
          onClose={() => setIsVehicleModalOpen(false)}
          onSave={addVehicle}
        />
      )}
    </DashboardBentoFrame>
  );
};

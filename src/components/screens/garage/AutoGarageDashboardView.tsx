import React, { useMemo, useState } from 'react';
import { Award, CalendarClock, Car, ShieldAlert, Wallet, Wrench } from 'lucide-react';
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
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardGarage } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { AutoOrderModal } from './AutoOrderModal';
import { AutoVehicleModal } from './AutoVehicleModal';
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
  getShiftWindowOptions,
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
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

  const { filters, makeFilter } = useCardFilters({
    revenue: '30d',
    waterfall: '30d',
    alerts: 'orders',
    capacity: 'all',
    timeline: 'all',
    funnel: '30d',
  });
  const [techCriterion, setTechCriterion] = useState<'revenue' | 'orders'>('revenue');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const shiftOptions = useMemo(() => getShiftWindowOptions(language), [language]);
  const alertOptions = useMemo(
    () => [
      { id: 'orders', label: localizeText(language, 'OR bloqués', 'Blocked OR', 'أوامر') },
      { id: 'parts', label: localizeText(language, 'Pièces', 'Parts', 'قطع') },
    ],
    [language]
  );
  const bayOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Toutes', 'All', 'الكل') },
      { id: 'lift', label: localizeText(language, 'Ponts', 'Lifts', 'جسور') },
    ],
    [language]
  );
  const criteria = useMemo(
    () => [
      { id: 'revenue', label: localizeText(language, 'CA', 'Revenue', 'الإيراد'), format: 'currency' as const, currency: 'DZD' },
      { id: 'orders', label: localizeText(language, 'OR', 'Orders', 'الأوامر'), format: 'number' as const },
    ],
    [language]
  );
  const toneLabels = useMemo(
    () => ({
      primary: localizeText(language, 'En réparation', 'In Repair', 'قيد الإصلاح'),
      secondary: localizeText(language, 'Attente pièces', 'Waiting Parts', 'بانتظار القطع'),
      neutral: localizeText(language, 'Diagnostic', 'Diagnostic', 'تشخيص'),
    }),
    [language]
  );

  const data = useMemo(
    () =>
      selectGarageDashboard({
        orders,
        bays,
        parts,
        fleets,
        invoices,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [orders, bays, parts, fleets, invoices, filters, language]
  );

  if (showSkeleton && orders.length === 0 && vehicles.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardGarage />
      </div>
    );
  }

  const isPartsMode = filters.alerts === 'parts';

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

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Facturation & Marge Atelier', 'Workshop Revenue & Margin', 'فوترة وهامش الورشة')}
          subtitle={localizeText(language, 'Encaissements et cascade main-d’œuvre / pièces', 'Billed repairs and parts margin flow', 'الفوترة وتحليل تكاليف اليد العاملة والقطع')}
          icon={<Wallet size={16} />}
        >
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
            filter={makeFilter('revenue', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucune facture atelier émise.',
              'No workshop invoices issued yet.',
              'لم تصدر أي فواتير ورشة بعد.'
            )}
          />

          <WaterfallChart
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
            filter={makeFilter('waterfall', compactTf)}
            emptyMessage={localizeText(
              language,
              'Créez un ordre de réparation pour calculer la marge.',
              'Create repair orders to inspect margin flow.',
              'أنشئ أمر إصلاح لحساب هامش الورشة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Blocages & Capacité Baies', 'Parts Holds & Bay Capacity', 'الأوامر المتوقفة وإشغال الجسور')}
          subtitle={localizeText(language, 'OR immobilisés, pièces et ponts actifs', 'Blocked repair orders and lift occupation', 'متابعة القطع وإشغال جسور الصيانة')}
          icon={<ShieldAlert size={16} />}
        >
          <KpiMetricInverseCard
            title={
              isPartsMode
                ? localizeText(language, 'Pièces sous seuil', 'Low Spare Parts', 'قطع غيار منخفضة المخزون')
                : localizeText(language, 'OR bloqués pièces', 'Orders Waiting Parts', 'أوامر بانتظار القطع')
            }
            subtitle={
              isPartsMode
                ? localizeText(language, `${data.blockedOrders} OR actuellement en attente`, `${data.blockedOrders} orders waiting parts`, `${data.blockedOrders} أوامر بانتظار القطع`)
                : localizeText(language, `${data.lowParts} références pièces sous seuil`, `${data.lowParts} spare parts low stock`, `${data.lowParts} قطع غيار منخفضة المخزون`)
            }
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(orders.length > 0 || parts.length > 0)}
            value={isPartsMode ? data.lowParts : data.blockedOrders}
            format="number"
            series={[]}
            filter={makeFilter('alerts', alertOptions)}
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
            filter={makeFilter('capacity', bayOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun pont configuré.',
              'No workshop bays configured.',
              'لا توجد جسور عمل مسجلة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Planning Ponts & Pipeline OR', 'Bay Schedule & Repair Flow', 'تخطيط الجسور ومسار الإصلاح')}
          subtitle={localizeText(language, 'Affectation horaire et étapes atelier', 'Bay timeline blocks and repair stages', 'توزيع المركبات ومراحل الإصلاح')}
          icon={<CalendarClock size={16} />}
        >
          <ResourceTimeline
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
            startHour={data.timelineStartHour}
            endHour={data.timelineEndHour}
            nowHour={11}
            toneLabels={toneLabels}
            filter={makeFilter('timeline', shiftOptions)}
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
            filter={makeFilter('funnel', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucun ordre de réparation créé.',
              'No repair orders created.',
              'لم يُنشأ أي أمر إصلاح بعد.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Performance Techniciens', 'Technician Output', 'أداء الفنيين والميكانيكيين')}
          subtitle={localizeText(language, 'Classement par chiffre d’affaires ou volume OR', 'Mechanics ranked by billed revenue or repair count', 'ترتيب الميكانيكيين حسب الإيراد أو عدد الأوامر')}
          icon={<Award size={16} />}
        >
          <RankedBarList
            className="flex-1"
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
            criteria={criteria}
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
        </DashboardPod>
      </DashboardPodGrid>

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

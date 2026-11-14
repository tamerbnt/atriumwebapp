import React, { useMemo } from 'react';
import { Activity, Filter, Receipt, ShieldAlert, UserPlus, Wallet } from 'lucide-react';
import {
  CapacityWaffle,
  ConversionFunnel,
  CohortHeatmap,
  HourlyHeatmap,
  KpiMetricInverseCard,
  KpiSparkCard,
  StackedBarChart,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardGym } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
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
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
import { selectMembershipDashboard } from '../../../utils/dashboardSelectors/coreVerticals';

export interface MembershipDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const MembershipDashboardView: React.FC<MembershipDashboardViewProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const { language, isRtl } = useTranslation();
  const {
    theme,
    currentBranch,
    branches,
    switchBranch,
    sales,
    members,
    leads,
    memberCheckIns,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    resetToDefaultDemoData,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: members.length > 0 || sales.length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    revenue: '30d',
    mix: '30d',
    risk: 'all',
    capacity: '2h',
    heatmap: '30d',
    funnel: 'all',
    cohorts: 'all',
  });

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const riskOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'expiring', label: localizeText(language, '<14j', '<14d', '<14ي') },
      { id: 'inactive', label: localizeText(language, 'Expirés', 'Expired', 'منتهي') },
    ],
    [language]
  );
  const cohortOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Toutes', 'All', 'الكل') },
      { id: 'recent3', label: localizeText(language, '3 mois', '3 Mo', '3أشهر') },
      { id: 'active', label: localizeText(language, 'Actives', 'Active', 'نشطة') },
    ],
    [language]
  );
  const capacityOptions = useMemo(
    () => [
      { id: '2h', label: '2h' },
      { id: 'today', label: localizeText(language, 'Auj.', 'Today', 'اليوم') },
      { id: '7d', label: localizeText(language, '7J', '7D', '7أ') },
    ],
    [language]
  );
  const funnelOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tout', 'All', 'الكل') },
      { id: '7d', label: localizeText(language, '7J', '7D', '7أ') },
      { id: '30d', label: localizeText(language, '30J', '30D', '30ي') },
    ],
    [language]
  );
  const mixSeries = useMemo(
    () => [
      {
        id: 'plans',
        label: localizeText(language, 'Abonnements & Boutique', 'Plans & Shop', 'الاشتراكات والمتجر'),
        color: '#d4522f',
      },
      {
        id: 'coaching',
        label: localizeText(language, 'Coaching privé', 'Personal Coaching', 'التدريب الخاص'),
        color: '#3b82f6',
      },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectMembershipDashboard({
        members,
        checkIns: memberCheckIns,
        sales,
        leads,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [members, memberCheckIns, sales, leads, filters, language]
  );

  if (showSkeleton && members.length === 0) {
    return (
      <SkeletonDashboardGym
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
      data-testid="membership-dashboard"
    >
      <DashboardHeader
        title={localizeText(language, 'Tableau', 'Dashboard', 'الرئيسية')}
        subtitle={localizeText(
          language,
          "Suivi de l'occupation, des encaissements et de la rétention adhérents.",
          'Live facility occupancy, cash collections, and member retention.',
          'متابعة الإشغال والمداخيل والاحتفاظ بالمشتركين.'
        )}
        currentBranchName={currentBranch?.name}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={() => resetToDefaultDemoData('membership_session')}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            {onOpenVoucherModal && (
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Receipt size={15} />}
                onClick={onOpenVoucherModal}
              >
                {localizeText(language, 'Encaisser / Bon', 'Voucher', 'إيصال')}
              </AtriumButton>
            )}
            {onAddMember && (
              <AtriumButton
                variant="primary"
                size="sm"
                icon={<UserPlus size={15} />}
                onClick={onAddMember}
              >
                {localizeText(language, 'Nouvel adhérent', 'New Member', 'عضو جديد')}
              </AtriumButton>
            )}
          </div>
        }
      />

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Revenus & Mix Offres', 'Revenue & Plan Mix', 'المداخيل وتوزيع الباقات')}
          subtitle={localizeText(language, 'Encaissements et part coaching', 'Collections and coaching share', 'التحصيلات وحصة التدريب')}
          icon={<Wallet size={16} />}
        >
          <KpiSparkCard
            title={localizeText(language, 'Encaissements', 'Collected Revenue', 'المداخيل المحصلة')}
            subtitle={localizeText(
              language,
              `${data.activeCount} adhérents actifs sur ${data.totalMembers}`,
              `${data.activeCount} active of ${data.totalMembers} members`,
              `${data.activeCount} عضو نشط من ${data.totalMembers}`
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.hasSales || data.hasMembers)}
            value={data.revenueTotal}
            deltaPercent={data.revenueDelta}
            format="currency"
            currency="DZD"
            series={data.revenueSpark}
            filter={makeFilter('revenue', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune vente enregistrée sur la période.',
              'No sales recorded in this period.',
              'لا توجد مبيعات مسجلة في هذه الفترة.'
            )}
          />

          <StackedBarChart
            title={localizeText(language, 'Mix revenus abonnements & coaching', 'Plans vs Coaching Revenue', 'توزيع مداخيل الاشتراكات والتدريب')}
            subtitle={localizeText(
              language,
              'Répartition des encaissements sur la période',
              'Revenue breakdown over the selected window',
              'توزيع الإيرادات خلال الفترة المحددة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.hasSales)}
            series={mixSeries}
            buckets={data.stackedBuckets}
            format="currency"
            currency="DZD"
            filter={makeFilter('mix', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune transaction encaissée.',
              'No paid transactions yet.',
              'لا توجد معاملات محصلة بعد.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Rétention & Risque Churn', 'Retention & Churn Risk', 'الاحتفاظ ومخاطر الانسحاب')}
          subtitle={localizeText(language, 'Échéances imminentes et cohortes', 'Expiring plans and cohort maintenance', 'الاشتراكات المهددة والدفعات')}
          icon={<ShieldAlert size={16} />}
        >
          <KpiMetricInverseCard
            title={localizeText(language, 'Risque de churn', 'Churn Risk Rate', 'معدل خطر الانسحاب')}
            subtitle={localizeText(
              language,
              `${data.churnRiskCount} adhésions ciblées sur ${data.totalMembers}`,
              `${data.churnRiskCount} flagged memberships out of ${data.totalMembers}`,
              `${data.churnRiskCount} اشتراكات معنية من ${data.totalMembers}`
            )}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(data.hasMembers)}
            value={data.churnRiskRate}
            format="percent"
            series={[]}
            filter={makeFilter('risk', riskOptions)}
            emptyMessage={localizeText(
              language,
              'Ajoutez des adhérents pour suivre le risque de churn.',
              'Add members to monitor churn risk.',
              'أضف مشتركين لمتابعة خطر الانسحاب.'
            )}
          />

          <CohortHeatmap
            title={localizeText(language, 'Rétention par cohorte', 'Cohort Retention', 'الاحتفاظ حسب الدفعة')}
            subtitle={localizeText(
              language,
              'Maintien actif par mois d’inscription',
              'Active retention by signup month',
              'نسبة الاستمرار حسب شهر التسجيل'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.cohorts.length > 0)}
            cohorts={data.cohorts}
            filter={makeFilter('cohorts', cohortOptions)}
            emptyMessage={localizeText(
              language,
              'Historique insuffisant pour tracer les cohortes.',
              'Not enough history to build cohorts.',
              'لا توجد بيانات كافية لبناء الدفعات.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Occupation & Affluence Salle', 'Floor Capacity & Traffic', 'الإشغال وكثافة الحضور')}
          subtitle={localizeText(language, 'Présence instantanée et pics horaires', 'Live floor headcount and rush hours', 'الحضور المباشر وساعات الذروة')}
          icon={<Activity size={16} />}
        >
          <CapacityWaffle
            title={localizeText(language, 'Occupation salle', 'Floor Occupancy', 'إشغال القاعة')}
            subtitle={localizeText(
              language,
              'Présence sur plateau vs capacité',
              'Active floor count vs capacity',
              'الحضور الحالي مقارنة بالسعة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.totalCapacity > 0 && data.hasMembers)}
            occupied={data.floorOccupied}
            capacity={data.totalCapacity}
            occupiedLabel={localizeText(language, 'Présents', 'Inside', 'حاضرون')}
            availableLabel={localizeText(language, 'Disponibles', 'Open', 'متاح')}
            filter={makeFilter('capacity', capacityOptions)}
            emptyMessage={localizeText(
              language,
              'Aucune capacité active enregistrée.',
              'No active capacity recorded.',
              'لا توجد سعة نشطة مسجلة.'
            )}
          />

          <HourlyHeatmap
            title={localizeText(language, 'Affluence hebdomadaire', 'Hourly Check-In Heatmap', 'كثافة الحضور الأسبوعية')}
            subtitle={localizeText(
              language,
              'Passages scannés par jour et créneau horaire',
              'Check-ins grouped by weekday and hour',
              'عمليات الدخول حسب اليوم والساعة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.hasCheckIns)}
            rows={data.heatmap.rows}
            cols={data.heatmap.cols}
            cells={data.heatmap.cells}
            filter={makeFilter('heatmap', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucun passage badgé enregistré.',
              'No check-ins recorded yet.',
              'لم تُسجل أي عمليات دخول بعد.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Pipeline Acquisition', 'Acquisition Pipeline', 'مسار استقطاب الأعضاء')}
          subtitle={localizeText(language, 'Conversion des demandes en abonnements actifs', 'Lead progression from inquiry to active membership', 'تحويل الطلبات إلى اشتراكات نشطة')}
          icon={<Filter size={16} />}
        >
          <ConversionFunnel
            className="flex-1"
            title={localizeText(language, 'Tunnel prospects', 'Acquisition Funnel', 'مسار التسجيل')}
            subtitle={localizeText(
              language,
              'Des demandes d’inscription aux membres actifs',
              'From initial inquiries to active memberships',
              'من طلبات التسجيل إلى الأعضاء النشطين'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.funnelStages.length > 0)}
            stages={data.funnelStages}
            filter={makeFilter('funnel', funnelOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun prospect ni membre enregistré.',
              'No leads or members recorded.',
              'لا توجد طلبات أو أعضاء مسجلين.'
            )}
          />
        </DashboardPod>
      </DashboardPodGrid>
    </DashboardBentoFrame>
  );
};

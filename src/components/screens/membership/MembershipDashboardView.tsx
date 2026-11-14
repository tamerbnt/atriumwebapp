import React, { useMemo, useState } from 'react';
import { Receipt, UserPlus } from 'lucide-react';
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
import { SkeletonDashboardGym } from '../../ui/skeleton/StructuralSkeletons';
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

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const data = useMemo(
    () =>
      selectMembershipDashboard({
        members,
        checkIns: memberCheckIns,
        sales,
        leads,
        period,
        language,
      }),
    [members, memberCheckIns, sales, leads, period, language]
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

      <DashboardBentoGrid>
        {/* Row 1: Revenue Spark + Inverse Churn KPI (espresso) + Floor Capacity Waffle */}
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
          emptyMessage={localizeText(
            language,
            'Aucune vente enregistrée sur la période.',
            'No sales recorded in this period.',
            'لا توجد مبيعات مسجلة في هذه الفترة.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'Risque de churn', 'Churn Risk Rate', 'معدل خطر الانسحاب')}
          subtitle={localizeText(
            language,
            `${data.churnRiskCount} adhésions expirées, gelées ou < 14j`,
            `${data.churnRiskCount} expired, frozen, or < 14d`,
            `${data.churnRiskCount} اشتراكات منتهية أو مجمدة`
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(data.hasMembers)}
          value={data.churnRiskRate}
          format="percent"
          series={[]}
          emptyMessage={localizeText(
            language,
            'Ajoutez des adhérents pour suivre le risque de churn.',
            'Add members to monitor churn risk.',
            'أضف مشتركين لمتابعة خطر الانسحاب.'
          )}
        />

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
          emptyMessage={localizeText(
            language,
            'Aucune capacité active enregistrée.',
            'No active capacity recorded.',
            'لا توجد سعة نشطة مسجلة.'
          )}
        />

        {/* Row 2: Hourly Check-In Matrix (wide) + Leads Conversion Funnel */}
        <HourlyHeatmap
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Aucun passage badgé enregistré.',
            'No check-ins recorded yet.',
            'لم تُسجل أي عمليات دخول بعد.'
          )}
        />

        <ConversionFunnel
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
          emptyMessage={localizeText(
            language,
            'Aucun prospect ni membre enregistré.',
            'No leads or members recorded.',
            'لا توجد طلبات أو أعضاء مسجلين.'
          )}
        />

        {/* Row 3: Retention Cohorts + Revenue Split Stacked Bars (wide) */}
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
          emptyMessage={localizeText(
            language,
            'Historique insuffisant pour tracer les cohortes.',
            'Not enough history to build cohorts.',
            'لا توجد بيانات كافية لبناء الدفعات.'
          )}
        />

        <StackedBarChart
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Mix revenus abonnements & coaching', 'Plans vs Coaching Revenue', 'توزيع مداخيل الاشتراكات والتدريب')}
          subtitle={localizeText(
            language,
            'Répartition des encaissements sur la période sélectionnée',
            'Revenue breakdown over the selected timeframe',
            'توزيع الإيرادات خلال الفترة المحددة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.hasSales)}
          series={[
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
          ]}
          buckets={data.stackedBuckets}
          format="currency"
          currency="DZD"
          emptyMessage={localizeText(
            language,
            'Aucune transaction encaissée.',
            'No paid transactions yet.',
            'لا توجد معاملات محصلة بعد.'
          )}
        />
      </DashboardBentoGrid>
    </DashboardBentoFrame>
  );
};

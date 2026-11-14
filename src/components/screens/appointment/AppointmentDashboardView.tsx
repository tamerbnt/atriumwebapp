import React, { useMemo, useState } from 'react';
import { CalendarPlus, Receipt, UserPlus } from 'lucide-react';
import {
  CapacityWaffle,
  DonutChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RankedBarList,
  ResourceTimeline,
  StackedBarChart,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardSalon } from '../../ui/skeleton/StructuralSkeletons';
import { AppointmentModal } from '../../modals/AppointmentModal';
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
import { selectAppointmentDashboard } from '../../../utils/dashboardSelectors/coreVerticals';

export interface AppointmentDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const AppointmentDashboardView: React.FC<AppointmentDashboardViewProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    appointments,
    servicesCatalog,
    staff,
    salonWorkstations,
    sales,
    currentBranch,
    branches,
    switchBranch,
    resetSalonMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: appointments.length > 0 || servicesCatalog.length > 0,
  });

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const data = useMemo(
    () =>
      selectAppointmentDashboard({
        appointments,
        services: servicesCatalog,
        staff,
        workstations: salonWorkstations,
        sales,
        period,
        language,
      }),
    [appointments, servicesCatalog, staff, salonWorkstations, sales, period, language]
  );

  if (showSkeleton && appointments.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardSalon />
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
      data-testid="appointment-dashboard"
    >
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Performance en direct, occupation des fauteuils et rentabilité salon.',
          'Live chair occupancy, stylist performance, and salon revenue analytics.',
          'مؤشرات الأداء الحي، إدارة الكراسي وإيرادات الصالون.'
        )}
        currentBranchName={currentBranch?.name}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetSalonMockData}
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenVoucherModal && (
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Receipt size={15} />}
                onClick={onOpenVoucherModal}
              >
                {localizeText(language, 'Encaisser', 'Voucher', 'إيصال')}
              </AtriumButton>
            )}
            {onAddMember && (
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<UserPlus size={15} />}
                onClick={onAddMember}
              >
                {localizeText(language, 'Nouveau client', 'New Client', 'عميل جديد')}
              </AtriumButton>
            )}
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<CalendarPlus size={15} />}
              onClick={() => setIsNewAptModalOpen(true)}
            >
              {localizeText(language, 'Nouveau RDV', 'New Booking', 'موعد جديد')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        {/* Row 1: Revenue KPI + Inverse No-Show KPI (espresso) + Chair Occupancy */}
        <KpiSparkCard
          title={localizeText(language, 'Recette prestations & revente', 'Services & Retail Revenue', 'إيرادات الخدمات والمبيعات')}
          subtitle={localizeText(
            language,
            'Services terminés et achats boutique sur la période',
            'Completed appointments and retail checkout',
            'الخدمات المنجزة ومبيعات التجزئة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.hasData || sales.length > 0)}
          value={data.totalRevenue}
          deltaPercent={data.revenueDelta}
          format="currency"
          currency="DZD"
          series={data.revenueSpark}
          emptyMessage={localizeText(
            language,
            'Aucun rendez-vous ni vente enregistré.',
            'No appointments or sales recorded.',
            'لا توجد مواعيد أو مبيعات مسجلة.'
          )}
        />

        <KpiMetricInverseCard
          title={localizeText(language, 'Taux de no-show & annulations', 'No-Show & Cancellations', 'نسبة الغياب والإلغاء')}
          subtitle={localizeText(
            language,
            `${data.noShowCount} créneaux perdus sur la période`,
            `${data.noShowCount} missed or cancelled bookings`,
            `${data.noShowCount} مواعيد ملغاة أو غياب`
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(appointments.length > 0)}
          value={data.noShowRate}
          deltaPercent={data.noShowDelta}
          format="percent"
          series={data.noShowSpark}
          emptyMessage={localizeText(
            language,
            'Aucun historique de rendez-vous.',
            'No appointment history available.',
            'لا يوجد سجل للمواعيد.'
          )}
        />

        <CapacityWaffle
          title={localizeText(language, 'Occupation fauteuils', 'Chair Occupancy', 'إشغال الكراسي')}
          subtitle={localizeText(
            language,
            `${data.occupiedChairs} en fauteuil sur ${data.totalChairs} postes`,
            `${data.occupiedChairs} in chair of ${data.totalChairs} stations`,
            `${data.occupiedChairs} مشغول من أصل ${data.totalChairs}`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.totalChairs > 0)}
          occupied={data.occupiedChairs}
          capacity={data.totalChairs}
          occupiedLabel={localizeText(language, 'Occupés', 'In Chair', 'مشغول')}
          availableLabel={localizeText(language, 'Libres', 'Open', 'متاح')}
          emptyMessage={localizeText(
            language,
            'Aucun poste de travail configuré.',
            'No workstations configured.',
            'لا توجد محطات عمل مهيأة.'
          )}
        />

        {/* Row 2: Stylist Resource Timeline (wide) + Service Mix Donut */}
        <ResourceTimeline
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Planning fauteuils & praticiens', 'Stylist Schedule', 'جدول الكراسي والمصففين')}
          subtitle={localizeText(
            language,
            'Occupation horaire par membre d’équipe',
            'Time-slotted bookings across active stylists',
            'توزيع الحجوزات حسب الفريق والساعة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.resources.length > 0 && data.blocks.length > 0)}
          resources={data.resources}
          blocks={data.blocks}
          startHour={8}
          endHour={21}
          nowHour={new Date().getHours() + new Date().getMinutes() / 60}
          toneLabels={{
            primary: localizeText(language, 'En cours', 'In Chair', 'جاري'),
            secondary: localizeText(language, 'Terminé', 'Completed', 'مكتمل'),
            neutral: localizeText(language, 'Planifié', 'Booked', 'مجدول'),
          }}
          emptyMessage={localizeText(
            language,
            'Aucun créneau actif à afficher.',
            'No scheduled appointments to display.',
            'لا توجد مواعيد مجدولة للعرض.'
          )}
        />

        <DonutChart
          title={localizeText(language, 'Mix catégories', 'Service Category Mix', 'توزيع فئات الخدمات')}
          subtitle={localizeText(
            language,
            'Part du chiffre d’affaires par type de soin',
            'Revenue share across service types',
            'حصة الإيرادات حسب نوع الخدمة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.donutSegments.length > 0)}
          segments={data.donutSegments}
          format="currency"
          currency="DZD"
          emptyMessage={localizeText(
            language,
            'Aucune prestation facturée sur la période.',
            'No services billed in this period.',
            'لا توجد خدمات مفوترة في هذه الفترة.'
          )}
        />

        {/* Row 3: Stylist Leaderboard + Services vs Retail Stacked Bars (wide) */}
        <RankedBarList
          title={localizeText(language, 'Performance équipe', 'Stylist Leaderboard', 'ترتيب المصففين')}
          subtitle={localizeText(
            language,
            'Classement par chiffre d’affaires, rendez-vous ou pourboires',
            'Ranked by revenue, bookings, or tips',
            'الترتيب حسب الإيرادات والمواعيد والإكراميات'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.rankedStylists.length > 0)}
          criteria={[
            { id: 'revenue', label: localizeText(language, 'CA', 'Revenue', 'الإيرادات'), format: 'currency', currency: 'DZD' },
            { id: 'bookings', label: localizeText(language, 'RDV', 'Bookings', 'المواعيد'), format: 'number' },
            { id: 'tips', label: localizeText(language, 'Pourboires', 'Tips', 'إكراميات'), format: 'currency', currency: 'DZD' },
          ]}
          items={data.rankedStylists}
          emptyMessage={localizeText(
            language,
            'Aucune prestation attribuée sur la période.',
            'No stylist activity recorded.',
            'لا يوجد نشاط مسجل للمصففين.'
          )}
        />

        <StackedBarChart
          className="md:col-span-2 xl:col-span-2"
          title={localizeText(language, 'Prestations vs Revente boutique', 'Services vs Retail', 'الخدمات مقابل البيع بالتجزئة')}
          subtitle={localizeText(
            language,
            'Contribution quotidienne au chiffre d’affaires global',
            'Daily split between chair services and retail checkout',
            'التوزيع اليومي بين الخدمات ومبيعات التجزئة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.hasData || sales.length > 0)}
          series={[
            {
              id: 'services',
              label: localizeText(language, 'Prestations', 'Services', 'الخدمات'),
              color: '#d4522f',
            },
            {
              id: 'retail',
              label: localizeText(language, 'Boutique', 'Retail', 'المبيعات'),
              color: '#3b82f6',
            },
          ]}
          buckets={data.stackedBuckets}
          format="currency"
          currency="DZD"
          emptyMessage={localizeText(
            language,
            'Aucun encaissement salon enregistré.',
            'No salon receipts recorded yet.',
            'لا توجد مداخيل مسجلة للصالون بعد.'
          )}
        />
      </DashboardBentoGrid>

      {isNewAptModalOpen && (
        <AppointmentModal
          isOpen={isNewAptModalOpen}
          onClose={() => setIsNewAptModalOpen(false)}
        />
      )}
    </DashboardBentoFrame>
  );
};

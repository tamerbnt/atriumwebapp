import React, { useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus, Gauge, PieChart, Wallet } from 'lucide-react';
import {
  AreaTrendChart,
  CapacityWaffle,
  DonutChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadialGauge,
  ResourceTimeline,
} from '@/atrium';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardVenue } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { BookingModal } from './BookingModal';
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
import { selectVenueDashboard } from '../../../utils/dashboardSelectors/coreVerticals';

export const VenueDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    currentBranch,
    branches,
    switchBranch,
    rentableUnits,
    rentalBookings,
    securityDeposits,
    resetVenueMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (rentableUnits || []).length > 0 || (rentalBookings || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    revenue: '30d',
    trend: '30d',
    balance: 'all',
    timeline: 'all',
    capacity: 'all',
    donut: '30d',
  });
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const shiftOptions = useMemo(() => getShiftWindowOptions(language), [language]);
  const balanceOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'overdue', label: localizeText(language, 'Échus', 'Overdue', 'متأخرة') },
    ],
    [language]
  );
  const unitOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'cowork', label: 'Cowork' },
      { id: 'rooms', label: localizeText(language, 'Salles', 'Rooms', 'قاعات') },
    ],
    [language]
  );
  const toneLabels = useMemo(
    () => ({
      primary: localizeText(language, 'En cours', 'Checked In', 'قيد الاستخدام'),
      secondary: localizeText(language, 'Confirmé', 'Confirmed', 'مؤكد'),
      neutral: localizeText(language, 'Option', 'Pending', 'معلق'),
    }),
    [language]
  );
  const nowHour = useMemo(() => {
    const d = new Date();
    return d.getHours() + Math.floor(d.getMinutes() / 15) * 0.25;
  }, []);

  const data = useMemo(
    () =>
      selectVenueDashboard({
        units: rentableUnits,
        bookings: rentalBookings,
        deposits: securityDeposits,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [rentableUnits, rentalBookings, securityDeposits, filters, language]
  );

  if (showSkeleton && rentableUnits.length === 0 && rentalBookings.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardVenue />
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
      data-testid="venue-dashboard"
    >
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Occupation des espaces en direct, suivi des cautions et rentabilité événementielle.',
          'Live venue occupancy, rental booking pipeline, and security deposits.',
          'مؤشرات إشغال القاعات، الحجوزات النشطة وتدفق الودائع.'
        )}
        currentBranchName={currentBranch?.name}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetVenueMockData}
        extraActions={
          <AtriumButton
            variant="primary"
            size="sm"
            icon={<CalendarPlus size={15} />}
            onClick={() => setIsBookingModalOpen(true)}
          >
            {localizeText(language, 'Nouvelle réservation', 'New Booking', 'حجز جديد')}
          </AtriumButton>
        }
      />

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Revenus & Trajectoire Locative', 'Booking Revenue & Trend', 'مداخيل ومسار الحجوزات')}
          subtitle={localizeText(language, 'Recettes réservations et comparatif', 'Receipts and period-over-period flow', 'عائدات التأجير ومقارنة الأداء')}
          icon={<Wallet size={16} />}
        >
          <KpiSparkCard
            title={localizeText(language, 'Recettes réservations', 'Booking Revenue', 'مداخيل الحجوزات')}
            subtitle={localizeText(
              language,
              `Cautions retenues : ${data.heldDepositsTotal.toLocaleString()} DZD`,
              `Held deposits: ${data.heldDepositsTotal.toLocaleString()} DZD`,
              `الودائع المحتجزة: ${data.heldDepositsTotal.toLocaleString()} دج`
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(rentalBookings.length > 0)}
            value={data.bookingRevenue}
            deltaPercent={data.revenueDelta}
            format="currency"
            currency="DZD"
            series={data.revenueSpark}
            filter={makeFilter('revenue', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucune réservation active enregistrée.',
              'No active bookings recorded.',
              'لا توجد حجوزات نشطة مسجلة.'
            )}
          />

          <AreaTrendChart
            title={localizeText(language, 'Trajectoire des encaissements', 'Rental Revenue Trend', 'تطور مداخيل التأجير')}
            subtitle={localizeText(
              language,
              'Comparatif entre la fenêtre active et précédente',
              'Active booking period compared to prior period',
              'مقارنة الفترة الحالية بالفترة السابقة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(rentalBookings.length > 0)}
            points={data.areaPoints}
            format="currency"
            currency="DZD"
            filter={makeFilter('trend', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune donnée d’encaissement locatif.',
              'No rental cashflow trend data.',
              'لا توجد بيانات تدفق نقدي للتأجير.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Soldes & Performance Contrats', 'Balances & Occupancy Health', 'المستحقات ومؤشر الإشغال')}
          subtitle={localizeText(language, 'Reliquats à recouvrer et taux de signature', 'Pending balances and signed contract SLA', 'المبالغ المتبقية وتغطية العقود')}
          icon={<Gauge size={16} />}
        >
          <KpiMetricInverseCard
            title={localizeText(language, 'Soldes restants dus', 'Outstanding Balance', 'المستحقات المتبقية')}
            subtitle={localizeText(
              language,
              'Reliquats à encaisser avant remise des clés',
              'Remaining balances due before check-in',
              'المبالغ المتبقية للتحصيل قبل التسليم'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(rentalBookings.length > 0)}
            value={data.outstandingBalance}
            format="currency"
            currency="DZD"
            series={[]}
            filter={makeFilter('balance', balanceOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun contrat locatif ouvert.',
              'No open rental balances.',
              'لا توجد عقود إيجار مفتوحة.'
            )}
          />

          <RadialGauge
            title={localizeText(language, 'Taux d’occupation & Contrats', 'Occupancy & Signed Contracts', 'معدل الإشغال والعقود')}
            subtitle={localizeText(
              language,
              `${data.occupiedUnits} / ${data.totalUnits} espaces occupés`,
              `${data.occupiedUnits} / ${data.totalUnits} spaces occupied`,
              `${data.occupiedUnits} / ${data.totalUnits} مساحات مشغولة`
            )}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(rentableUnits.length > 0 || rentalBookings.length > 0)}
            metrics={data.gauges}
            emptyMessage={localizeText(
              language,
              'Configurez des salles ou espaces locatifs.',
              'Add rentable units to track occupancy.',
              'أضف قاعات أو مساحات لمتابعة الإشغال.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Unités & Planning Journalier', 'Space Capacity & Schedule', 'استغلال القاعات والجدول')}
          subtitle={localizeText(language, 'Disponibilité par zone et créneaux', 'Unit occupancy and daily timeline blocks', 'توافر المساحات وحجوزات اليوم')}
          icon={<CalendarClock size={16} />}
        >
          <CapacityWaffle
            title={localizeText(language, 'Capacité active', 'Space Utilization', 'استغلال المساحات')}
            subtitle={localizeText(
              language,
              'Unités actuellement occupées vs libres',
              'Occupied rentable units vs available pool',
              'الوحدات المشغولة مقابل المتاحة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.totalUnits > 0)}
            occupied={data.occupiedUnits}
            capacity={data.totalUnits}
            occupiedLabel={localizeText(language, 'Occupées', 'Occupied', 'مشغول')}
            availableLabel={localizeText(language, 'Disponibles', 'Open', 'متاح')}
            filter={makeFilter('capacity', unitOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun espace référencé.',
              'No spaces registered.',
              'لا توجد مساحات مسجلة.'
            )}
          />

          <ResourceTimeline
            title={localizeText(language, 'Planning des salles & espaces', 'Space Allocation Timeline', 'جدول حجز القاعات والمساحات')}
            subtitle={localizeText(
              language,
              'Créneaux occupés et réservations confirmées',
              'Active check-ins and scheduled venue bookings',
              'الحجوزات المؤكدة والتسليمات الجارية'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.resources.length > 0 && data.blocks.length > 0)}
            resources={data.resources}
            blocks={data.blocks}
            startHour={data.timelineStartHour}
            endHour={data.timelineEndHour}
            nowHour={nowHour}
            toneLabels={toneLabels}
            filter={makeFilter('timeline', shiftOptions)}
            emptyMessage={localizeText(
              language,
              'Aucune réservation planifiée.',
              'No bookings scheduled on units.',
              'لا توجد حجوزات مجدولة على المساحات.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Répartition par Type d’Espace', 'Revenue by Space Type', 'الإيرادات حسب نوع المساحة')}
          subtitle={localizeText(language, 'Part de facturation par catégorie de salle', 'Revenue share across unit categories', 'حصة كل نوع من المساحات')}
          icon={<PieChart size={16} />}
        >
          <DonutChart
            className="flex-1"
            title={localizeText(language, 'Revenus par type d’espace', 'Revenue by Space Type', 'الإيرادات حسب نوع المساحة')}
            subtitle={localizeText(
              language,
              'Part de facturation par catégorie de salle',
              'Revenue breakdown by unit category',
              'توزيع العائدات حسب نوع القاعة'
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.donutSegments.length > 0)}
            segments={data.donutSegments}
            format="currency"
            currency="DZD"
            filter={makeFilter('donut', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune location facturée.',
              'No billed space bookings.',
              'لا توجد حجوزات مفوترة.'
            )}
          />
        </DashboardPod>
      </DashboardPodGrid>

      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />
      )}
    </DashboardBentoFrame>
  );
};

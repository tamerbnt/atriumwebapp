import React, { useMemo, useState } from 'react';
import { Stethoscope, Tv, UserPlus } from 'lucide-react';
import {
  ConversionFunnel,
  DonutChart,
  HourlyHeatmap,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadarBalanceChart,
  ResourceTimeline,
} from '@/atrium';
import { useDashboardShellState } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useMedicalData } from './medicalData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardMedical } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalPatientModal } from './MedicalPatientModal';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalWaitingRoomTvModal } from './MedicalWaitingRoomTvModal';
import {
  DashboardBentoFrame,
  DashboardHeader,
  DashboardPod,
  DashboardPodGrid,
  POD_SPAN,
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
import { selectMedicalDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';
import { getDashboardHelpText } from '../../../utils/dashboardSelectors/dashboardHelpText';
import { getDashboardPodTitle } from '../../../utils/dashboardSelectors/dashboardPodTitles';

export const MedicalDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();

  const {
    practitioners,
    patients,
    consultations,
    appointments,
    chifaClaims,
    consumables,
    labRecords,
    addPatient,
    addConsultation,
    resetToDemoData,
  } = useMedicalData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (patients || []).length > 0 || (consultations || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    revenue: '30d',
    donut: '30d',
    queue: 'queue',
    radar: '30d',
    timeline: 'all',
    funnel: '30d',
    heatmap: '30d',
  });
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const shiftOptions = useMemo(() => getShiftWindowOptions(language), [language]);
  const queueOptions = useMemo(
    () => [
      { id: 'queue', label: localizeText(language, 'Attente', 'Queue', 'الانتظار') },
      { id: 'low', label: localizeText(language, 'Stock bas', 'Low Stock', 'نقص') },
    ],
    [language]
  );
  const toneLabels = useMemo(
    () => ({
      primary: localizeText(language, 'En cabinet', 'In Room', 'في الفحص'),
      secondary: localizeText(language, 'Terminé', 'Completed', 'مكتمل'),
      neutral: localizeText(language, 'Prévu', 'Scheduled', 'مجدول'),
    }),
    [language]
  );

  const data = useMemo(
    () =>
      selectMedicalDashboard({
        practitioners,
        consultations,
        appointments,
        chifaClaims,
        consumables,
        labRecords,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [practitioners, consultations, appointments, chifaClaims, consumables, labRecords, filters, language]
  );

  if (showSkeleton && patients.length === 0 && consultations.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardMedical />
      </div>
    );
  }

  const isLowStockMode = filters.queue === 'low';

  return (
    <DashboardBentoFrame
      theme={theme}
      isRtl={isRtl}
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      isSyncing={isSyncing}
      lastSyncedAt={lastSyncedAt}
      onRetry={retryCloudSync}
      data-testid="medical-dashboard"
    >
      <DashboardHeader
        extraActions={
          <div className="flex items-center gap-2 flex-wrap">
            <AtriumButton
              variant="outline"
              size="md"
              icon={<Tv size={15} />}
              onClick={() => setIsTvModalOpen(true)}
            >
              {localizeText(language, 'Écran TV', 'Waiting TV', 'شاشة الانتظار')}
            </AtriumButton>
            <AtriumButton
              id="dash-header-member-btn"
              variant="outline"
              size="md"
              icon={<UserPlus size={15} />}
              onClick={() => setIsPatientModalOpen(true)}
            >
              {localizeText(language, 'Patient', 'Patient', 'مريض')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="md"
              icon={<Stethoscope size={15} />}
              onClick={() => setIsConsultationModalOpen(true)}
            >
              {localizeText(language, 'Consultation', 'Consultation', 'استشارة')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardPod title={getDashboardPodTitle('medical', 'kpis', language)}>
        <DashboardPodGrid layout="equal">
          <KpiSparkCard
            className={POD_SPAN.half}
            title={localizeText(language, 'Recettes consultations', 'Consultation Revenue', 'مداخيل الاستشارات')}
            subtitle={localizeText(
              language,
              `${data.consultationsCount} actes enregistrés`,
              `${data.consultationsCount} consultations recorded`,
              `${data.consultationsCount} استشارة مسجلة`
            )}
            helpText={getDashboardHelpText('medical', 'revenue', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(consultations.length > 0)}
            value={data.consultationRevenue}
            deltaPercent={data.revenueDelta}
            format="currency"
            currency="DZD"
            series={data.revenueSpark}
            filter={makeFilter('revenue', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucune consultation enregistrée.',
              'No consultations recorded yet.',
              'لا توجد استشارات مسجلة بعد.'
            )}
          />

          <KpiMetricInverseCard
            className={POD_SPAN.half}
            title={
              isLowStockMode
                ? localizeText(language, 'Consommables sous seuil', 'Low Consumables', 'نقص المستلزمات الطبية')
                : localizeText(language, 'Patients en attente', 'Waiting Queue', 'المرضى في الانتظار')
            }
            subtitle={
              isLowStockMode
                ? localizeText(language, `${data.waitingQueue} patients en salle d’attente`, `${data.waitingQueue} patients waiting`, `${data.waitingQueue} مرضى في الانتظار`)
                : localizeText(language, `${data.lowConsumables} consommables sous seuil`, `${data.lowConsumables} consumables low`, `${data.lowConsumables} مستلزمات منخفضة`)
            }
            helpText={getDashboardHelpText(
              'medical',
              isLowStockMode ? 'queueLowStock' : 'queueWait',
              language
            )}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(consultations.length > 0 || consumables.length > 0)}
            value={data.queueMetricValue}
            format="number"
            series={[]}
            filter={makeFilter('queue', queueOptions)}
            emptyMessage={localizeText(
              language,
              'File d’attente vide.',
              'Waiting queue is clear.',
              'قاعة الانتظار فارغة حالياً.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('medical', 'schedule', language)}>
        <DashboardPodGrid layout="split75">
          <HourlyHeatmap
            className={POD_SPAN.wide7}
            title={localizeText(language, 'Affluence consultations', 'Patient Inflow Heatmap', 'ذروة توافد المرضى')}
            subtitle={localizeText(
              language,
              'Distribution horaire des passages',
              'Consultations grouped by weekday and hour',
              'توزيع الفحوصات حسب اليوم والساعة'
            )}
            helpText={getDashboardHelpText('medical', 'heatmap', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.heatmap.hasAny)}
            rows={data.heatmap.rows}
            cols={data.heatmap.cols}
            cells={data.heatmap.cells}
            filter={makeFilter('heatmap', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune consultation horodatée.',
              'No timestamped consultations yet.',
              'لا توجد استشارات مؤرخة بعد.'
            )}
          />

          <RadarBalanceChart
            className={POD_SPAN.side5}
            title={localizeText(language, 'Équilibre clinique & CHIFA', 'Clinical & CHIFA Balance', 'التوازن الطبي والشفاء')}
            subtitle={localizeText(
              language,
              'Qualité de prise en charge sur 5 axes',
              'Five-axis clinic performance vs target',
              'تقييم الأداء الطبي عبر خمسة محاور'
            )}
            helpText={getDashboardHelpText('medical', 'radar', language)}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(data.radarAxes.length > 0)}
            axes={data.radarAxes}
            primaryLabel={localizeText(language, 'Clinique', 'Clinic', 'العيادة')}
            benchmarkLabel={localizeText(language, 'Cible', 'Target', 'الهدف')}
            unit="%"
            filter={makeFilter('radar', compactTf)}
            emptyMessage={localizeText(
              language,
              'Ajoutez des actes ou bordereaux CHIFA.',
              'Record consultations or claims to compare axes.',
              'أضف استشارات أو ملفات شفاء لتقييم التوازن.'
            )}
          />

          <ResourceTimeline
            className={POD_SPAN.full}
            title={localizeText(language, 'Planning des praticiens', 'Practitioner Schedule', 'جدول الأطباء والعيادات')}
            subtitle={localizeText(
              language,
              'Créneaux par cabinet médical',
              'Appointment blocks across medical rooms',
              'مواعيد الكشف حسب القاعة الطبية'
            )}
            helpText={getDashboardHelpText('medical', 'timeline', language)}
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
              'Aucun rendez-vous planifié.',
              'No practitioner appointments scheduled.',
              'لا توجد مواعيد طبية مجدولة.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('medical', 'pipeline', language)}>
        <DashboardPodGrid layout="equal">
          <DonutChart
            className={POD_SPAN.half}
            title={localizeText(language, 'Répartition actes NGAP', 'Acts & Specialties', 'توزيع الفحوصات الطبية')}
            subtitle={localizeText(
              language,
              'Volume par code acte et spécialité',
              'Consultations grouped by NGAP act code',
              'الاستشارات حسب نوع الفحص والتخصص'
            )}
            helpText={getDashboardHelpText('medical', 'donut', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.donutSegments.length > 0)}
            segments={data.donutSegments}
            format="number"
            filter={makeFilter('donut', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucun acte médical enregistré.',
              'No medical acts billed yet.',
              'لم تُسجل أي فحوصات طبية بعد.'
            )}
          />

          <ConversionFunnel
            className={POD_SPAN.half}
            title={localizeText(language, 'Parcours patient', 'Care Pipeline', 'مسار المريض')}
            subtitle={localizeText(
              language,
              'De l’accueil au règlement des actes',
              'From arrival to completed & paid visits',
              'من الاستقبال إلى إتمام الفحص والدفع'
            )}
            helpText={getDashboardHelpText('medical', 'funnel', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.funnelStages.length > 0)}
            stages={data.funnelStages}
            filter={makeFilter('funnel', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune visite en cours.',
              'No patient visits recorded.',
              'لا توجد زيارات مرضى مسجلة.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      {isPatientModalOpen && (
        <MedicalPatientModal
          isOpen={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          onSave={addPatient}
        />
      )}
      {isConsultationModalOpen && (
        <MedicalConsultationModal
          isOpen={isConsultationModalOpen}
          onClose={() => setIsConsultationModalOpen(false)}
          onSave={addConsultation}
        />
      )}
      {isTvModalOpen && (
        <MedicalWaitingRoomTvModal
          isOpen={isTvModalOpen}
          onClose={() => setIsTvModalOpen(false)}
          consultations={consultations || []}
          practitioners={practitioners || []}
        />
      )}
    </DashboardBentoFrame>
  );
};

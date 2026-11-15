import React, { useMemo, useState } from 'react';
import { ClipboardCheck, UserPlus } from 'lucide-react';
import {
  BulletChart,
  CohortHeatmap,
  ConversionFunnel,
  HistogramChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  StackedBarChart,
} from '@/atrium';
import {
  useAtriumSelector,
  useDashboardShellState,
  shallowEqualObjects,
  setScreenAction as setScreen,
  selectCurrentEduStudentsFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentEduSessionsFromState,
  selectCurrentEduEnrollmentsFromState,
  selectCurrentEduAttendanceFromState,
  selectCurrentEduGradesFromState,
  selectCurrentEduAdmissionsFromState,
  selectCurrentEduCertificatesFromState,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardEducation } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { RollCallModal } from './RollCallModal';
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
  getPortfolioTimeframeOptions,
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
import { selectEducationDashboard } from '../../../utils/dashboardSelectors/coreVerticals';
import { getDashboardHelpText } from '../../../utils/dashboardSelectors/dashboardHelpText';
import { getDashboardPodTitle } from '../../../utils/dashboardSelectors/dashboardPodTitles';

export const EducationDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();
  const {
    eduStudents,
    eduCohorts,
    eduSessions,
    eduEnrollments,
    eduAttendance,
    eduGrades,
    eduAdmissions,
    eduCertificates,
  } = useAtriumSelector(
    (s) => ({
      eduStudents: selectCurrentEduStudentsFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
      eduSessions: selectCurrentEduSessionsFromState(s),
      eduEnrollments: selectCurrentEduEnrollmentsFromState(s),
      eduAttendance: selectCurrentEduAttendanceFromState(s),
      eduGrades: selectCurrentEduGradesFromState(s),
      eduAdmissions: selectCurrentEduAdmissionsFromState(s),
      eduCertificates: selectCurrentEduCertificatesFromState(s),
    }),
    shallowEqualObjects
  );

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (eduStudents || []).length > 0 || (eduCohorts || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    tuition: '30d',
    bullets: 'all',
    absence: '30d',
    attendance: '30d',
    funnel: '30d',
    cohorts: '30d',
    grades: '30d',
  });
  const [selectedSessionForRollCall, setSelectedSessionForRollCall] = useState<string | null>(null);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const portfolioTf = useMemo(() => getPortfolioTimeframeOptions(language), [language]);
  const bulletScopeOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Toutes', 'All', 'الكل') },
      { id: 'active', label: localizeText(language, 'Actives', 'Active', 'نشطة') },
    ],
    [language]
  );
  const attendanceSeries = useMemo(
    () => [
      { id: 'present', label: localizeText(language, 'Présents', 'Present', 'حاضر'), color: '#10b981' },
      { id: 'late', label: localizeText(language, 'Retards', 'Late', 'متأخر'), color: '#f59e0b' },
      { id: 'absent', label: localizeText(language, 'Absents', 'Absent', 'غائب'), color: '#d4522f' },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectEducationDashboard({
        students: eduStudents,
        cohorts: eduCohorts,
        attendance: eduAttendance,
        grades: eduGrades,
        admissions: eduAdmissions,
        certificates: eduCertificates,
        enrollments: eduEnrollments,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [eduStudents, eduCohorts, eduAttendance, eduGrades, eduAdmissions, eduCertificates, eduEnrollments, filters, language]
  );

  if (showSkeleton && eduStudents.length === 0 && eduCohorts.length === 0) {
    return (
      <div className="p-6">
        <SkeletonDashboardEducation />
      </div>
    );
  }

  const nextSessionId = eduSessions?.[0]?.id || null;

  return (
    <DashboardBentoFrame
      theme={theme}
      isRtl={isRtl}
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      isSyncing={isSyncing}
      lastSyncedAt={lastSyncedAt}
      onRetry={retryCloudSync}
      data-testid="education-dashboard"
    >
      <DashboardHeader
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="md"
              icon={<UserPlus size={15} />}
              onClick={() => setScreen('members')}
            >
              {localizeText(language, 'Étudiants', 'Students', 'الطلاب')}
            </AtriumButton>
            {nextSessionId && (
              <AtriumButton
                variant="primary"
                size="md"
                icon={<ClipboardCheck size={15} />}
                onClick={() => setSelectedSessionForRollCall(nextSessionId)}
              >
                {localizeText(language, 'Appel séance', 'Roll Call', 'تحضير الحصة')}
              </AtriumButton>
            )}
          </div>
        }
      />

      <DashboardPod title={getDashboardPodTitle('education', 'kpis', language)}>
        <DashboardPodGrid layout="equal">
          <KpiSparkCard
            className={POD_SPAN.half}
            title={localizeText(language, 'Frais de scolarité encaissés', 'Tuition Collected', 'الرسوم المحصلة')}
            subtitle={localizeText(
              language,
              `${data.activeStudents} étudiants actifs · reste dû ${data.overdueBalance.toLocaleString()} DZD`,
              `${data.activeStudents} active students · due ${data.overdueBalance.toLocaleString()} DZD`,
              `${data.activeStudents} طالب نشط · متبقي ${data.overdueBalance.toLocaleString()} دج`
            )}
            helpText={getDashboardHelpText('education', 'tuition', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(eduEnrollments.length > 0 || eduStudents.length > 0)}
            value={data.tuitionCollected}
            deltaPercent={data.tuitionDelta}
            format="currency"
            currency="DZD"
            series={data.tuitionSpark}
            filter={makeFilter('tuition', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune inscription encaissée.',
              'No tuition enrollments recorded.',
              'لا توجد تسجيلات رسوم مسجلة.'
            )}
          />

          <KpiMetricInverseCard
            className={POD_SPAN.half}
            title={localizeText(language, 'Taux d’absence', 'Absence Rate', 'معدل الغياب')}
            subtitle={localizeText(
              language,
              `${eduAttendance.length} pointages enregistrés sur les cohortes`,
              `${eduAttendance.length} recorded attendance marks across cohorts`,
              `${eduAttendance.length} تسجيل حضور عبر الأفواج`
            )}
            helpText={getDashboardHelpText('education', 'absence', language)}
            locale={locale}
            {...featuredSurface}
            state={resolveChartState(eduAttendance.length > 0)}
            value={data.absenceRate}
            format="percent"
            series={data.absenceSpark}
            filter={makeFilter('absence', compactTf)}
            emptyMessage={localizeText(
              language,
              'Effectuez un appel de séance pour suivre l’absentéisme.',
              'Record session roll call to monitor absence rate.',
              'قم بتسجيل الحضور لمتابعة نسبة الغياب.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('education', 'cohorts', language)}>
        <DashboardPodGrid layout="split75">
          <StackedBarChart
            className={POD_SPAN.wide7}
            title={localizeText(language, 'Assiduité par promotion', 'Attendance by Cohort', 'الحضور حسب الفوج')}
            subtitle={localizeText(
              language,
              'Répartition Présent / Retard / Absent sur les séances appelées',
              'Present, Late, and Absent breakdown per cohort',
              'توزيع الحضور والتأخر والغياب حسب الفوج'
            )}
            helpText={getDashboardHelpText('education', 'attendance', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.attBuckets.length > 0)}
            series={attendanceSeries}
            buckets={data.attBuckets}
            format="number"
            filter={makeFilter('attendance', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucun pointage d’appel enregistré.',
              'No attendance records captured.',
              'لا توجد سجلات حضور مسجلة.'
            )}
          />

          <BulletChart
            className={POD_SPAN.side5}
            title={localizeText(language, 'Remplissage des cohortes', 'Cohort Capacity Fill', 'امتلاء الأفواج')}
            subtitle={localizeText(
              language,
              'Effectif inscrit face à la capacité maximale',
              'Enrolled students vs max seats per cohort',
              'الطلاب المسجلون مقابل السعة القصوى'
            )}
            helpText={getDashboardHelpText('education', 'bullets', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.cohortFillBullets.length > 0)}
            items={data.cohortFillBullets}
            format="number"
            unit={localizeText(language, 'élèves', 'seats', 'طالب')}
            filter={makeFilter('bullets', bulletScopeOptions)}
            emptyMessage={localizeText(
              language,
              'Aucune cohorte configurée.',
              'No cohorts configured.',
              'لا توجد أفواج مكونة.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      <DashboardPod title={getDashboardPodTitle('education', 'academics', language)}>
        <DashboardPodGrid layout="equal">
          <HistogramChart
            className={POD_SPAN.full}
            title={localizeText(language, 'Distribution des notes (/20)', 'Grade Distribution (/20)', 'توزيع النقاط والنتائج (/20)')}
            subtitle={localizeText(
              language,
              'Évaluations normalisées sur 20 points',
              'Normalized assessment scores out of 20',
              'نتائج التقييمات مصنفة على 20'
            )}
            helpText={getDashboardHelpText('education', 'grades', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.gradeBins.length > 0)}
            bins={data.gradeBins}
            format="number"
            unit={localizeText(language, 'notes', 'grades', 'نتيجة')}
            filter={makeFilter('grades', portfolioTf)}
            emptyMessage={localizeText(
              language,
              'Aucune note enregistrée sur la période.',
              'No assessment grades recorded yet.',
              'لا توجد نقاط مسجلة بعد.'
            )}
          />

          <CohortHeatmap
            className={POD_SPAN.half}
            title={localizeText(language, 'Taux de présence par cohorte', 'Cohort Attendance Rate', 'نسبة المواظبة لكل فوج')}
            subtitle={localizeText(
              language,
              'Pourcentage de présences enregistrées',
              'Share of present & late attendance records',
              'نسبة الالتزام بالحصص المسجلة'
            )}
            helpText={getDashboardHelpText('education', 'cohorts', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.cohortRows.length > 0)}
            cohorts={data.cohortRows}
            columnPrefix="%"
            filter={makeFilter('cohorts', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucune cohorte avec appel enregistré.',
              'No cohorts with attendance logs.',
              'لا توجد أفواج مسجلة بسجل الحضور.'
            )}
          />

          <ConversionFunnel
            className={POD_SPAN.half}
            title={localizeText(language, 'Tunnel admissions & diplômes', 'Admissions to Certification', 'مسار القبول والتخرج')}
            subtitle={localizeText(
              language,
              'Demandes → Admis → Inscrits → Certifiés',
              'Inquiries → Admitted → Enrolled → Certified',
              'الطلبات ← القبول ← التسجيل ← التخرج'
            )}
            helpText={getDashboardHelpText('education', 'funnel', language)}
            locale={locale}
            {...standardSurface}
            state={resolveChartState(data.funnelStages.length > 0)}
            stages={data.funnelStages}
            filter={makeFilter('funnel', portfolioTf)}
            emptyMessage={localizeText(
              language,
              'Aucun prospect ni étudiant.',
              'No admission leads or students.',
              'لا توجد طلبات قبول أو طلاب.'
            )}
          />
        </DashboardPodGrid>
      </DashboardPod>

      {selectedSessionForRollCall && (
        <RollCallModal
          session={(eduSessions || []).find((s) => s.id === selectedSessionForRollCall) || null}
          onClose={() => setSelectedSessionForRollCall(null)}
        />
      )}
    </DashboardBentoFrame>
  );
};

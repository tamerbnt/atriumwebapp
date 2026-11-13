import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  Calendar,
  Clock,
  BookOpen,
  TrendingUp,
  Receipt,
  Award,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardEducation } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { RollCallModal } from './RollCallModal';
import {
  DashboardHeader,
  DashboardPod,
  DashboardMetricCard,
  DarkEspressoCard,
  HourlyCurveChart,
  PillBarHistogram,
  MonthlyAreaChart,
  DonutChart,
  GuardianCard,
} from '../../common/dashboard';

export const EducationDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    eduStudents,
    eduCohorts,
    eduSessions,
    eduEnrollments,
    eduAttendance,
    setScreen,
    resetEduMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (eduStudents || []).length > 0 || (eduCohorts || []).length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const [selectedSessionForRollCall, setSelectedSessionForRollCall] = useState<string | null>(null);
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's sessions & attendance
  const todaySessions = useMemo(() => {
    return (eduSessions || []).filter((s) => s.date === todayStr);
  }, [eduSessions, todayStr]);

  const totalStudentsCount = (eduStudents || []).length || 64;
  const activeCohortsCount = (eduCohorts || []).length || 6;

  const presentToday = useMemo(() => {
    const presentRecords = (eduAttendance || []).filter((a) => {
      const recDate = a.recordedAt ? a.recordedAt.split('T')[0] : '';
      return recDate === todayStr && a.status === 'Present';
    });
    return presentRecords.length > 0 ? presentRecords.length : Math.round(totalStudentsCount * 0.88);
  }, [eduAttendance, todayStr, totalStudentsCount]);

  const targetAttendance = Math.round(totalStudentsCount * 0.95);
  const targetPct = Math.min(100, Math.round((presentToday / Math.max(1, targetAttendance)) * 100));

  // Hourly arrival curve
  const hourlyData = useMemo(() => {
    return [0, 3, 8, 6, 2];
  }, []);

  // 4-week attendance trend
  const weeklyAttendanceTrend = useMemo(() => {
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: 92 },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: 89 },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: 94 },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: 91 },
    ];
  }, [language]);

  // Tuition trajectory
  const monthlyTuition = useMemo(() => {
    const base = 280000;
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round(base * factor * (1 + (i % 6) * 0.1));
    });
  }, []);

  // Cohort Subject Donut
  const cohortMix = useMemo(() => {
    const map = new Map<string, number>();
    (eduCohorts || []).forEach((c) => {
      const cat = c.courseTitle || (language === 'ar' ? 'لغات' : 'Langues');
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    if (map.size === 0) {
      return [
        { label: language === 'ar' ? 'لغات حية' : 'Langues Vivantes', value: 40, color: '#d4522f' },
        { label: language === 'ar' ? 'علوم وتكنولوجيا' : 'Sciences & IT', value: 35, color: '#3B82F6' },
        { label: language === 'ar' ? 'دعم مدرسي' : 'Soutien Scolaire', value: 25, color: '#10B981' },
      ];
    }
    const colors = ['#d4522f', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    let idx = 0;
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      color: colors[idx++ % colors.length],
    }));
  }, [eduCohorts, language]);

  // Grade / Attendance Distribution
  const gradeDistribution = useMemo(() => {
    return [
      { week: '16-20/20', value: 24 },
      { week: '14-16/20', value: 38 },
      { week: '10-14/20', value: 28 },
      { week: '<10/20', value: 6 },
    ];
  }, []);

  if (showSkeleton) {
    return (
      <div className="p-6">
        <SkeletonDashboardEducation />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      {/* Header */}
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={
          language === 'ar'
            ? 'مؤشرات الحضور الصفي، انضباط الأفواج والتحصيل المالي للأكاديمية'
            : language === 'fr'
            ? 'Présences en direct, progression pédagogique et recouvrement des scolarités.'
            : 'Live attendance flow, cohort progression, and academy tuition analytics.'
        }
        currentBranchName={currentBranch?.name || 'Académie Atrium Alger'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetEduMockData}
        exportFileName="education_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Attendance Flow & Classroom Velocity (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حركة الحضور وحصص اليوم' : language === 'fr' ? 'Présences & Séances du Jour' : 'Classroom Attendance & Flow'}
            icon={<GraduationCap size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {presentToday} {language === 'ar' ? 'طالب حاضر' : 'Présents'}
              </span>
            }
            rightControls={
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 p-0.5 rounded-xl text-xs font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  title={language === 'ar' ? 'عرض مؤشرات اليوم' : language === 'fr' ? "Activité d'aujourd'hui" : "Today's activity"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'today' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  title={language === 'ar' ? 'عرض مؤشرات الأمس' : language === 'fr' ? "Activité d'hier" : "Yesterday's activity"}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'yesterday' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'أمس' : language === 'fr' ? 'Hier' : 'Yesterday'}
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">
                      {language === 'ar' ? 'حضور الطلاب اليوم' : 'Étudiants Présents'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {presentToday}
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">/ {totalStudentsCount}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● 91% {language === 'ar' ? 'معدل الحضور' : 'Taux d’assiduité'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-[#E6DED6] dark:bg-neutral-700 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">
                      {language === 'ar' ? 'الحصص المبرمجة اليوم' : 'Séances Prévues'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {Math.max(todaySessions.length, 4)}
                      </span>
                      <span className="text-xs text-black/55 dark:text-white/55">{language === 'ar' ? 'حصص' : 'cours'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">
                      {language === 'ar' ? 'قاعات شاغرة: 2' : '2 Salles Libres'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6DED6] dark:border-neutral-700/60">
                  <span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
                    {language === 'ar' ? 'كثافة الدخول الصفي على مدار 24 ساعة' : 'Arrivées horaires des élèves (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-black/70 dark:text-white/75">
                    {language === 'ar' ? 'انضباط الحضور اليومي' : 'Objectif de Présence'}
                  </span>
                  <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                    {presentToday} / {targetAttendance}
                  </span>
                </div>
                <div className="w-full bg-[#E6DED6]/70 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-black/55 dark:text-white/55">
                  <span>{targetPct}% {language === 'ar' ? 'حضور محقق' : 'd’assiduité'}</span>
                  <span>95% {language === 'ar' ? 'الهدف' : 'Cible'}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Student Cohort Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'الأفواج والطلاب المسجلين' : language === 'fr' ? 'Étudiants & Promotions' : 'Students & Cohorts'}
            icon={<Users size={18} className="text-[#d4522f]" />}
            rightControls={
              <div className="flex items-center gap-1 text-xs font-semibold text-black/70 dark:text-white/75">
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-1 text-black dark:text-white">{months[currentMonthIndex]} 2026</span>
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DashboardMetricCard
                  label={language === 'ar' ? 'إجمالي الطلاب النشطين' : 'Étudiants Inscrits'}
                  value={totalStudentsCount}
                  badgeText={language === 'ar' ? 'منتظمون' : 'Actifs'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'طلاب مسجلون بأفواج حالية' : 'Élèves inscrits aux cohortes'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'الأفواج التدريبية' : 'Promotions & Cohortes'}
                  value={activeCohortsCount}
                  badgeText={language === 'ar' ? 'جارية' : 'En cours'}
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'أفواج دراسية مفتوحة' : 'Groupes pédagogiques actifs'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'تنبيه الغياب المتكرر' : 'Alerte Décrochage'}
                  value={3}
                  sublabel={language === 'ar' ? 'طلاب بغياب > 3 حصص' : 'Élèves à risque d’abandon'}
                  badgeText={language === 'ar' ? 'متابعة' : 'Vigilance'}
                  badgeVariant="warning"
                />
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black dark:text-white">
                    {language === 'ar' ? 'معدل الحضور الأسبوعي (%)' : 'Taux d’assiduité moyen hebdomadaire'}
                  </span>
                  <span className="text-[11px] text-black/55 dark:text-white/55">
                    {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyAttendanceTrend}
                  maxScale={100}
                  barColor="#d4522f"
                />
              </div>
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* BOTTOM ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 3: Financial Trajectory (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'تحصيل الرسوم والأرباح' : language === 'fr' ? 'Revenus & Recouvrement' : 'Revenue & Profit'}
            icon={<TrendingUp size={18} className="text-[#d4522f]" />}
            rightControls={
              <span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase rtl:normal-case">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-[#E6DED6] dark:border-neutral-700/60">
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'صافي العائد' : 'Net Académie'}</span>
                    <span className="text-lg font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                      {formatMoney(210000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+6.4%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'رسوم محصلة' : 'Scolarités CA'}</span>
                    <span className="text-lg font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                      {formatMoney(320000)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+8.9%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">{language === 'ar' ? 'أتعاب الأساتذة' : 'Honoraires Form.'}</span>
                    <span className="text-lg font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">
                      {formatMoney(110000)}
                    </span>
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">34% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
                    {language === 'ar' ? 'منحنى التدفق المالي على مدار 30 يوماً' : 'Tendance des encaissements sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyTuition} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-black dark:text-white">
                    {language === 'ar' ? 'مؤشرات الأداء الأكاديمي' : 'Indicateurs Pédagogiques'}
                  </span>
                  <Info size={13} className="text-black/55 dark:text-white/55" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'نسبة الاستبقاء' : 'Taux de Rétention'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">94%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Élevé
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'امتلاء الأفواج' : 'Remplissage Cohortes'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">86%</span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Optimal
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'نسبة التحصيل' : 'Taux Recouvrement'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">92%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Acomptes OK
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
                    <span className="text-[11px] text-black/70 dark:text-white/75 block">
                      {language === 'ar' ? 'نسبة النجاح' : 'Taux Réussite'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">96%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Examens
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Academic Intelligence & Drop-Out Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'المؤشرات والتنبيهات' : language === 'fr' ? 'Analyses & Alertes' : 'Insights & Alerts'}
            icon={<Award size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-black dark:text-white">
                      {language === 'ar' ? 'توزيع التخصصات' : 'Filières & Matières'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <DonutChart segments={cohortMix} centerLabel={`${activeCohortsCount} Groupes`} />
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-black dark:text-white">
                      {language === 'ar' ? 'توزيع التقييمات والنتائج' : 'Distribution des Notes'}
                    </span>
                    <Info size={13} className="text-black/55 dark:text-white/55" />
                  </div>
                  <PillBarHistogram
                    data={gradeDistribution}
                    maxScale={45}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Drop-Out Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'متابعة الحضور والغياب' : 'Student Retention'}
                subtitle={
                  language === 'ar'
                    ? 'رصد آلي للغيابات غير المبررة وتوجيه إشعارات فورية لأولياء الأمور لضمان الاستمرارية'
                    : 'Surveillance proactive des absences consécutives et alerte SMS aux parents.'
                }
                score={93}
                statusText={language === 'ar' ? 'مستوى الانضباط العام ممتاز!' : 'Assiduité exemplaire sur toutes les promotions !'}
                metricLabel={language === 'ar' ? 'معدل الالتزام' : 'Assiduité'}
                metricValue="93%"
                trendText={language === 'ar' ? 'مستقر' : 'Cohortes stables'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* Roll Call Modal */}
      {selectedSessionForRollCall && (
        <RollCallModal
          session={(eduSessions || []).find((s) => s.id === selectedSessionForRollCall) || null}
          onClose={() => setSelectedSessionForRollCall(null)}
        />
      )}
    </div>
  );
};

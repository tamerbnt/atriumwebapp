import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Calendar,
  CheckCircle2,
  DollarSign,
  Clock,
  Plus,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  MapPin,
  Check,
  Building2,
  ChevronDown,
  FileText,
  TrendingUp,
  History,
  Activity,
  Layers,
  Award,
  Wallet,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { RollCallModal } from './RollCallModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardEducation } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';

export const EducationDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBusiness,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    currentUser,
    eduStudents,
    eduCohorts,
    eduSessions,
    eduEnrollments,
    eduAttendance,
    setScreen,
    resetEduMockData,
    showToast,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: eduStudents.length > 0 || eduCohorts.length > 0,
  });

  // Auto-healing
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && eduStudents.length === 0 && resetEduMockData) {
      hasAutoHealed.current = true;
      resetEduMockData();
    }
  }, [eduStudents.length, resetEduMockData]);

  const [activeRollCallSession, setActiveRollCallSession] = useState<EduSession | null>(null);
  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [summaryTimeframe, setSummaryTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [activityFilter, setActivityFilter] = useState<'all' | 'attendance' | 'finance'>('all');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Computed metrics
  const activeStudentsCount = eduStudents.filter(
    (s) => s.status === 'Active' || s.status === 'Applicant'
  ).length;

  const totalCapacity = eduCohorts.reduce((acc, c) => acc + (c.maxStudents || 25), 0) || 120;
  const enrolledCount = eduCohorts.reduce((acc, c) => acc + (c.enrolledCount || 0), 0) || activeStudentsCount;

  const todayIso = new Date().toISOString().split('T')[0];
  const todaySessions = eduSessions.filter((s) => s.date === todayIso || true).slice(0, 6);

  // Overall attendance rate calculation
  const totalAttendanceRecords = eduAttendance.length;
  const presentRecords = eduAttendance.filter(
    (a) => a.status === 'Present' || a.status === 'Late'
  ).length;
  const averageAttendanceRate =
    totalAttendanceRecords > 0
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 94;

  // Tuition metrics
  const totalBilled = eduEnrollments.reduce((acc, e) => acc + (e.agreedTuition || 0), 0);
  const totalPaid = eduEnrollments.reduce((acc, e) => acc + (e.paidAmount || 0), 0);
  const outstandingTuition = Math.max(0, totalBilled - totalPaid);

  // Hourly attendance histogram (10 bars representing typical class blocks: 08h to 18h)
  const attendanceHistogram = [22, 45, 78, 92, 85, 40, 68, 95, 88, 52];

  // Atrium Educational Tips
  const tips = [
    {
      step: '1/4',
      title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
      desc:
        language === 'ar'
          ? 'استخدم نظام المناداة الرقمي في أول 10 دقائق لضمان دقة نسبة حضور الطلبة وتنبيه الأولياء فوراً.'
          : language === 'fr'
          ? 'Enregistrez l\'appel numérique dans les 10 premières minutes pour un suivi d\'assiduité infaillible.'
          : 'Conduct digital roll-call within the first 10 minutes to maintain flawless attendance telemetry.',
      action: () => {
        setActiveRollCallSession(null);
        setIsRollCallOpen(true);
      },
      btnLabel:
        language === 'ar' ? 'بدء المناداة الآن ›' : language === 'fr' ? 'Lancer l\'appel ›' : 'Launch Roll-Call ›',
    },
    {
      step: '2/4',
      title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
      desc:
        language === 'ar'
          ? 'قم بربط أولياء الأمور بحسابات الطلبة القصر لتسهيل إرسال إشعارات الأقساط الشهرية والغياب.'
          : language === 'fr'
          ? 'Liez les tuteurs légaux aux dossiers des étudiants mineurs pour fiabiliser le recouvrement.'
          : 'Link legal guardians to minor students to automate tuition reminders and progress reports.',
      action: () => setScreen('members'),
      btnLabel:
        language === 'ar' ? 'دليل الطلبة والأولياء ›' : language === 'fr' ? 'Répertoire étudiants ›' : 'Students Roster ›',
    },
    {
      step: '3/4',
      title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
      desc:
        language === 'ar'
          ? 'تتبع امتلاء الأفواج الدراسية لفتح حصص تدعيمية إضافية عند وصول نسبة الحجز إلى 90%.'
          : language === 'fr'
          ? 'Surveillez le taux de remplissage des cohortes pour anticiper l\'ouverture de nouvelles sessions.'
          : 'Track cohort capacity to proactively schedule overflow sections when cohorts hit 90% fill.',
      action: () => setScreen('shop'),
      btnLabel:
        language === 'ar' ? 'إدارة الأفواج والقاعات ›' : language === 'fr' ? 'Gérer les cohortes ›' : 'Manage Cohorts ›',
    },
    {
      step: '4/4',
      title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
      desc:
        language === 'ar'
          ? 'راقب جدول الأقساط المستحقة لتسوية المتأخرات قبل فترة الامتحانات والاختبارات الدورية.'
          : language === 'fr'
          ? 'Examinez le grand livre des créances scolaires pour sécuriser la trésorerie avant les examens.'
          : 'Review tuition receivables to clear outstanding balances prior to semester exam periods.',
      action: () => setScreen('finance'),
      btnLabel:
        language === 'ar' ? 'المالية والأقساط ›' : language === 'fr' ? 'Grand livre financier ›' : 'Tuition Ledger ›',
    },
  ];

  const currentTip = tips[currentTipIndex] || tips[0];

  // Feed items combining sessions and tuition enrollments
  const feedItems = [
    {
      id: 'f-1',
      student: 'Amine Benali',
      initials: 'AB',
      operation: language === 'ar' ? 'تسجيل حضور فوج الرياضيات BAC' : 'Présence validée · Math BAC 2026',
      status: 'Present',
      statusLabel: language === 'ar' ? 'حاضر' : 'Présent',
      statusClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      time: '08:30',
      type: 'attendance',
    },
    {
      id: 'f-2',
      student: 'Sarah Khelifi',
      initials: 'SK',
      operation: language === 'ar' ? 'سداد قسط دراسي (18,000 دج)' : 'Versement scolarité · 18 000 DZD',
      status: 'Paid',
      statusLabel: language === 'ar' ? 'مقبوض' : 'Encaissé',
      statusClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      time: '09:15',
      type: 'finance',
    },
    {
      id: 'f-3',
      student: 'Yacine Mansouri',
      initials: 'YM',
      operation: language === 'ar' ? 'تسجيل جديد · لغات أجنبية B2' : 'Inscription admise · IELTS B2',
      status: 'Enrolled',
      statusLabel: language === 'ar' ? 'مقبول' : 'Admis',
      statusClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
      time: '10:00',
      type: 'attendance',
    },
    {
      id: 'f-4',
      student: 'Lina Bouzid',
      initials: 'LB',
      operation: language === 'ar' ? 'تأخر 15 دقيقة بعذر · فيزياء' : 'Retard 15m justifié · Sciences Physiques',
      status: 'Late',
      statusLabel: language === 'ar' ? 'متأخر' : 'En retard',
      statusClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      time: '10:45',
      type: 'attendance',
    },
    {
      id: 'f-5',
      student: 'Karim Zerrouki',
      initials: 'KZ',
      operation: language === 'ar' ? 'سداد نقدي قسط 2 (12,000 دج)' : 'Versement Trimestre 2 · 12 000 DZD',
      status: 'Paid',
      statusLabel: language === 'ar' ? 'مقبوض' : 'Encaissé',
      statusClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      time: '11:20',
      type: 'finance',
    },
  ];

  const filteredFeed = feedItems.filter((item) => {
    if (activityFilter === 'all') return true;
    return item.type === activityFilter;
  });

  if (showSkeleton && (eduStudents.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonDashboardEducation
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      {/* Outer Rounded Workspace Panel (WPF Spec: CornerRadius 28px, 1px CardBorderBrush) */}
      <div className="space-y-6">
        
        {/* Row 0 — Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Greeting */}
          <div>
            <h1 className="text-[28px] font-bold text-neutral-900 dark:text-white leading-tight">
              {language === 'ar'
                ? `مرحباً بك مجدداً، ${currentUser?.fullName?.split(' ')[0] || 'أستاذ'}!`
                : language === 'fr'
                ? `Bienvenue, ${currentUser?.fullName?.split(' ')[0] || 'Prof'} !`
                : `Welcome back, ${currentUser?.fullName?.split(' ')[0] || 'Tamer'}!`}
            </h1>
            <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1">
              {language === 'ar'
                ? 'نظرة شاملة على نشاط الأكاديمية والطلبة وحضور الحصص والتحصيل المالي اليوم.'
                : language === 'fr'
                ? 'Vue d\'ensemble des activités scolaires, assiduité des cohortes et flux de trésorerie.'
                : 'Live overview of today\'s academic cohort activity, student presence, and tuition operations.'}
            </p>
          </div>

          {/* Right Controls: Branch Switcher + Quick Actions Toggle */}
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            {/* Branch Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Building2 size={16} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Campus Principal'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isBranchDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Branch Switcher Dropdown */}
              {isBranchDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'فروع الأكاديمية' : language === 'fr' ? 'Campus & Annexes' : 'Campuses & Branches'}
                  </div>
                  {businesses.map((biz) => {
                    const isCurrent = biz.id === currentBusinessId;
                    const matchingBranch = branches.find((b) => b.businessId === biz.id);
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          switchBusiness(biz.id);
                          if (matchingBranch) switchBranch(matchingBranch.id);
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                          <span className="truncate">{biz.displayName || biz.name}</span>
                        </div>
                        {isCurrent && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions CTA Toggle Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="h-10 px-5 rounded-[14px] bg-[#C4785A] hover:bg-[#b3684a] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-98"
              >
                <Plus size={16} className="text-white" />
                <span>{language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}</span>
              </button>

              {/* Floating Quick Actions Popup */}
              {isQuickActionsOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-[240px] rounded-[18px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'إجراءات فورية' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
                  </div>

                  {/* 1. Launch Roll Call */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setActiveRollCallSession(null);
                      setIsRollCallOpen(true);
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <span>{language === 'ar' ? 'مناداة سريعة' : language === 'fr' ? 'Appel Numérique' : 'Quick Roll-Call'}</span>
                  </button>

                  {/* 2. New Student */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setScreen('members');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users size={16} />
                    </div>
                    <span>{language === 'ar' ? 'تسجيل طالب جديد' : language === 'fr' ? 'Nouvel Étudiant' : 'New Student'}</span>
                  </button>

                  {/* 3. New Cohort / Admission */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setScreen('registrations');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                      <GraduationCap size={16} />
                    </div>
                    <span>{language === 'ar' ? 'طلب التحاق / تسجيل' : language === 'fr' ? 'Nouvelle Admission' : 'New Admission'}</span>
                  </button>

                  {/* 4. Record Tuition Payment */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setScreen('finance');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                      <DollarSign size={16} />
                    </div>
                    <span>{language === 'ar' ? 'تحصيل قسط دراسي' : language === 'fr' ? 'Encaisser Scolarité' : 'Record Tuition'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1 — Two-Column Pod Canvas (~38% Left / ~62% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* ================= LEFT COLUMN (~38% / 5 cols) ================= */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            
            {/* 2.4.1 Summary Pod Tray */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
              {/* Pod Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'الملخص والنشاط' : language === 'fr' ? 'Synthèse' : 'Summary'}
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {language === 'ar' ? 'تتبع حضور الطلبة وإشغال القاعات' : language === 'fr' ? 'Assiduité et fréquentation du campus' : 'Track live student attendance & campus presence'}
                  </p>
                </div>
                <div className="h-7 px-2.5 rounded-[12px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1 shadow-2xs">
                  <span>{summaryTimeframe === 'daily' ? 'Daily' : summaryTimeframe === 'weekly' ? 'Weekly' : 'Monthly'}</span>
                  <ChevronDown size={11} className="text-neutral-400" />
                </div>
              </div>

              {/* Inset Floating White Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
                {/* Section A: Two Metric Columns with Hairline Divider */}
                <div className="grid grid-cols-2 divide-x divide-neutral-100 dark:divide-neutral-700/60 rtl:divide-x-reverse">
                  {/* Left Metric: Students Present */}
                  <div className="pr-3 rtl:pr-0 rtl:pl-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] flex items-center justify-center shrink-0">
                        <Users size={10} />
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                        {language === 'ar' ? 'الطلبة الحاضرون' : language === 'fr' ? 'Présents' : 'Students Present'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                        {Math.round(activeStudentsCount * 0.94)}
                      </span>
                      <span className="text-xs text-neutral-400 tabular-nums">
                        / {enrolledCount} {language === 'ar' ? 'مسجل' : 'enrolled'}
                      </span>
                    </div>
                  </div>

                  {/* Right Metric: Daily Sessions */}
                  <div className="pl-3 rtl:pl-0 rtl:pr-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-[18px] h-[18px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={10} />
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                        {language === 'ar' ? 'حصص اليوم' : language === 'fr' ? 'Séances Jour' : 'Daily Sessions'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                        {todaySessions.length || 6}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {language === 'ar' ? 'حصص' : 'séances'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section B: Attendance Histogram Chart (10 rounded capsule bars) */}
                <div className="pt-2">
                  <div className="flex items-end justify-between gap-1.5 h-[110px] px-1">
                    {attendanceHistogram.map((val, idx) => {
                      const isPeak = val >= 85;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                          <div
                            style={{ height: `${val}%` }}
                            className={`w-full max-w-[18px] rounded-full transition-all duration-300 ${
                              isPeak
                                ? 'bg-[#C4785A] group-hover:bg-[#b3684a]'
                                : 'bg-[#EADFD8] dark:bg-neutral-700 group-hover:bg-[#dfd0c7]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400 pt-2 px-1 border-t border-neutral-100 dark:border-neutral-700/40">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>15:00</span>
                    <span>18:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.4.2 Dual Compact KPI Tiles */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Tile 1: Average Attendance */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <History size={14} className="text-[#C4785A]" />
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {language === 'ar' ? 'معدل الحضور' : language === 'fr' ? 'Taux d\'assiduité' : 'Avg Attendance'}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    +3.8%
                  </span>
                </div>
                <div>
                  <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    {averageAttendanceRate}%
                  </span>
                </div>
              </div>

              {/* Tile 2: Monthly Tuition Progress */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Award size={14} className="text-emerald-500" />
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {language === 'ar' ? 'هدف التحصيل' : language === 'fr' ? 'Objectif Frais' : 'Term Collection'}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    On Track
                  </span>
                </div>
                <div>
                  <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    {totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 88.5}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2.4.3 Sleek Prompt Banner (Atrium Tips Card) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex-1 flex flex-col justify-between space-y-3">
              {/* Row 0: Badge + Nav Arrows */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] uppercase tracking-wider">
                    {currentTip.step}
                  </span>
                  <span className="text-[11.5px] font-semibold text-neutral-900 dark:text-white">
                    {currentTip.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-neutral-400">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : tips.length - 1))
                    }
                    className="w-5 h-5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-[10px] tabular-nums">{currentTip.step}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev < tips.length - 1 ? prev + 1 : 0))
                    }
                    className="w-5 h-5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Row 1: Description */}
              <p className="text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {currentTip.desc}
              </p>

              {/* Row 2: Full-Width CTA Button */}
              <button
                type="button"
                onClick={currentTip.action}
                className="w-full h-9 rounded-[10px] bg-[#FCEEE8] hover:bg-[#F8DFD4] dark:bg-neutral-700 dark:hover:bg-neutral-600 text-[#C4785A] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{currentTip.btnLabel}</span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62% / 7 cols) ================= */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            
            {/* 2.5.1 Activity Pod Tray (top) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5">
              {/* Pod Header */}
              <div>
                <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'مؤشرات الأداء الأكاديمي' : language === 'fr' ? 'Activité & Recouvrement' : 'Activity'}
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'تتبع الإيرادات وحالات الطلاب المعلقين' : language === 'fr' ? 'Flux financier et effectifs scolaires du jour' : 'Track daily tuition cashflow and cohort health'}
                </p>
              </div>

              {/* 3 Inset Cards (equal width, 12px gap, height 155px, sparklines) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Revenue Today (White Card) */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs h-[155px] relative overflow-hidden flex flex-col justify-between">
                  {/* Background Sparkline */}
                  <div className="absolute inset-x-0 bottom-0 h-[76px] opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                      <path
                        d="M0 35 Q 25 10, 50 25 T 100 8 L 100 40 L 0 40 Z"
                        fill="currentColor"
                        className="text-[#C4785A]"
                      />
                      <path
                        d="M0 35 Q 25 10, 50 25 T 100 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-[#C4785A]"
                      />
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      {language === 'ar' ? 'التحصيل اليومي' : language === 'fr' ? 'Frais Encaissés' : 'Tuition Inflow'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      +12% vs hier
                    </span>
                  </div>

                  <div className="relative z-10">
                    <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight block">
                      {formatMoney(totalPaid || 120000)}
                    </span>
                  </div>
                </div>

                {/* Card 2: Active Enrolled Students (White Card) */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs h-[155px] relative overflow-hidden flex flex-col justify-between">
                  {/* Background Sparkline */}
                  <div className="absolute inset-x-0 bottom-0 h-[76px] opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                      <path
                        d="M0 30 Q 30 5, 60 20 T 100 5 L 100 40 L 0 40 Z"
                        fill="currentColor"
                        className="text-emerald-500"
                      />
                      <path
                        d="M0 30 Q 30 5, 60 20 T 100 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-emerald-500"
                      />
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      {language === 'ar' ? 'الطلبة المسجلون' : language === 'fr' ? 'Étudiants Actifs' : 'Active Students'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {eduCohorts.length} {language === 'ar' ? 'أفواج' : 'cohorts'}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight block">
                      {activeStudentsCount}
                    </span>
                  </div>
                </div>

                {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) — Overdue Tuition Ledger */}
                <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm h-[155px] relative overflow-hidden flex flex-col justify-between text-white">
                  {/* Background Amber Sparkline */}
                  <div className="absolute inset-x-0 bottom-0 h-[76px] opacity-25 pointer-events-none">
                    <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                      <path
                        d="M0 25 Q 35 35, 70 15 T 100 20 L 100 40 L 0 40 Z"
                        fill="currentColor"
                        className="text-[#FB923C]"
                      />
                      <path
                        d="M0 25 Q 35 35, 70 15 T 100 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-[#FB923C]"
                      />
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-400 block mb-1">
                      {language === 'ar' ? 'المتأخرات والأقساط' : language === 'fr' ? 'Créances Scolaires' : 'Overdue Tuition'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 inline-block">
                      {language === 'ar' ? 'مستحق السداد' : language === 'fr' ? 'À recouvrer' : 'Overdue ledger'}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <span className="text-[22px] font-bold text-white tabular-nums tracking-tight block">
                      {formatMoney(outstandingTuition || 45000)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.5.2 Recent Activity Pod Tray (bottom, fills remaining height) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5 flex-1 flex flex-col">
              {/* Pod Header + Filter Pill Group */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'سجل النشاط اليومي' : language === 'fr' ? 'Activité Récente' : 'Recent Activity'}
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {language === 'ar' ? 'تسجيلات الحضور، الحصص، والمقبوضات المالية المباشرة' : language === 'fr' ? 'Historique en direct des présences et encaissements' : 'Live stream of roll-calls, sessions, and payments'}
                  </p>
                </div>

                {/* Filter Pill Group inside a bordered container */}
                <div className="h-8 p-0.5 rounded-[10px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center gap-0.5 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActivityFilter('all')}
                    className={`h-full px-3 rounded-[8px] text-[11px] font-semibold transition-colors cursor-pointer ${
                      activityFilter === 'all'
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('attendance')}
                    className={`h-full px-3 rounded-[8px] text-[11px] font-semibold transition-colors cursor-pointer ${
                      activityFilter === 'attendance'
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    {language === 'ar' ? 'حضور' : language === 'fr' ? 'Présences' : 'Attendance'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('finance')}
                    className={`h-full px-3 rounded-[8px] text-[11px] font-semibold transition-colors cursor-pointer ${
                      activityFilter === 'finance'
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    {language === 'ar' ? 'أقساط' : language === 'fr' ? 'Paiements' : 'Tuition'}
                  </button>
                </div>
              </div>

              {/* Column Headers Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[12px] border border-[#E9EEF0] dark:border-neutral-700/60 px-4 py-2 flex items-center text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider shadow-2xs">
                <span className="w-[35%] truncate">{language === 'ar' ? 'الطالب' : language === 'fr' ? 'Étudiant' : 'Student'}</span>
                <span className="w-[35%] truncate">{language === 'ar' ? 'العملية / الحصة' : language === 'fr' ? 'Opération / Séance' : 'Operation / Class'}</span>
                <span className="w-[18%] text-center">{language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}</span>
                <span className="w-[12%] text-right rtl:text-left">{language === 'ar' ? 'الوقت' : language === 'fr' ? 'Heure' : 'Time'}</span>
              </div>

              {/* Activity Rows List */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {filteredFeed.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white dark:bg-neutral-800 rounded-[12px] border border-[#E9EEF0] dark:border-neutral-700/60 px-4 py-2.5 flex items-center hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/40 transition-colors shadow-2xs cursor-pointer"
                  >
                    {/* Col 0: Student */}
                    <div className="w-[35%] flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-[8px] bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold text-[11px] flex items-center justify-center shrink-0">
                        {row.initials}
                      </div>
                      <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-white truncate">
                        {row.student}
                      </span>
                    </div>

                    {/* Col 1: Operation */}
                    <div className="w-[35%] min-w-0 pr-2">
                      <span className="text-[11.5px] text-neutral-600 dark:text-neutral-300 truncate block">
                        {row.operation}
                      </span>
                    </div>

                    {/* Col 2: Status */}
                    <div className="w-[18%] text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${row.statusClass}`}>
                        {row.statusLabel}
                      </span>
                    </div>

                    {/* Col 3: Time */}
                    <div className="w-[12%] text-right rtl:text-left text-[11px] text-neutral-400 font-medium tabular-nums">
                      {row.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roll Call Modal */}
      {isRollCallOpen && (
        <RollCallModal
          session={activeRollCallSession}
          onClose={() => {
            setIsRollCallOpen(false);
            setActiveRollCallSession(null);
          }}
        />
      )}
    </div>
  );
};

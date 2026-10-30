import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  ArrowUp,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  Receipt,
  Home,
  Check,
  DoorOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney, calculateDaysRemaining } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKpiGrid, SkeletonChart } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';

export interface MembershipDashboardViewProps {
  onAddMember: () => void;
  onOpenVoucherModal?: () => void;
}

export const MembershipDashboardView: React.FC<MembershipDashboardViewProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBusiness,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    sales,
    staff,
    members,
    switchBusiness,
    switchBranch,
    setScreen,
    resetToDefaultDemoData,
    showToast,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: members.length > 0 || sales.length > 0,
  });

  const [activityTab, setActivityTab] = useState<'Tous' | 'Passages' | 'Ventes'>('Tous');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [peopleInside, setPeopleInside] = useState(38);
  const [entreesJour, setEntreesJour] = useState(142);

  // Scoped metrics
  const activeMembers = useMemo(() => members.filter((m) => m.status === 'Active'), [members]);
  const expiringMembers = useMemo(
    () => activeMembers.filter((m) => calculateDaysRemaining(false, m.expirationDate) <= 14),
    [activeMembers]
  );

  const todayRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const weeklyAverageRevenue = 184000;
  const occupancyPercentage = Math.round((activeMembers.length / Math.max(members.length, 1)) * 100);

  // Gym-specific operational onboarding tips carousel
  const gymTips = useMemo(
    () => [
      {
        step: '1/5',
        title: language === 'ar' ? 'إعداد البوابات والـ RFID' : language === 'fr' ? 'Configuration RFID' : 'Configure RFID Access',
        desc:
          language === 'ar'
            ? 'قم بربط بطاقات وأساور RFID بالملفات الشخصية للمشتركين لتمكين المرور الفوري عبر البوابة الدوارة.'
            : language === 'fr'
            ? 'Associez les badges et bracelets RFID aux fiches adhérents pour un accès instantané au tourniquet.'
            : 'Link RFID badges and wristbands to member profiles for 1-tap automated turnstile passage.',
        action: onAddMember,
        btnLabel: language === 'ar' ? 'تهيئة شريحة جديدة ›' : language === 'fr' ? 'Nouveau Badge ›' : 'New Badge ›',
      },
      {
        step: '2/5',
        title: language === 'ar' ? 'تجديد الاشتراكات الوشيكة' : language === 'fr' ? 'Abonnements à renouveler' : 'Expiring Subscriptions',
        desc:
          language === 'ar'
            ? 'هناك اشتراكات تنتهي صلاحيتها خلال أقل من 14 يوماً. تواصل معهم مبكراً عبر الرسائل التذكيرية.'
            : language === 'fr'
            ? 'Plusieurs abonnements arrivent à échéance sous 14 jours. Activez les relances pour optimiser la rétention.'
            : 'Several memberships expire within 14 days. Launch renewal follow-ups to maximize gym retention.',
        action: () => setScreen('members'),
        btnLabel: language === 'ar' ? 'دليل المشتركين ›' : language === 'fr' ? 'Voir adhérents ›' : 'View Members ›',
      },
      {
        step: '3/5',
        title: language === 'ar' ? 'تسجيل دخول يدوي سريع' : language === 'fr' ? 'Enregistrement de passage' : 'Record Walk-in Access',
        desc:
          language === 'ar'
            ? 'سجل دخول فوري للزوار العابرين أو المشتركين الذين نسوا بطاقة الـ RFID.'
            : language === 'fr'
            ? 'Validez un passage manuel pour les adhérents sans badge ou les séances d\'essai découverte.'
            : 'Record an instant walk-in entry for guest visits or members without active RFID tags.',
        action: () => {
          setPeopleInside((p) => Math.min(100, p + 1));
          setEntreesJour((e) => e + 1);
          showToast({
            type: 'success',
            title: language === 'ar' ? 'تم تسجيل المرور' : language === 'fr' ? 'Passage validé' : 'Turnstile Admitted',
            message: language === 'ar' ? 'تم تسجيل دخول المشترك بنجاح' : language === 'fr' ? 'Entrée autorisée au club' : 'Member admitted to facility',
          });
        },
        btnLabel: language === 'ar' ? 'تسجيل دخول الآن ›' : language === 'fr' ? 'Valider passage ›' : 'Admit Walk-in ›',
      },
      {
        step: '4/5',
        title: language === 'ar' ? 'مبيعات المتجر والمكملات' : language === 'fr' ? 'Pro-Shop & Nutrition' : 'Pro Shop & Supplements',
        desc:
          language === 'ar'
            ? 'راجع مخزون البروتين، المشروبات الرياضية، والمكملات لتعزيز هوامش مبيعات الصندوق اليومي.'
            : language === 'fr'
            ? 'Contrôlez les stocks de compléments alimentaires, shakers et barres protéinées à l\'accueil.'
            : 'Review sports nutrition, protein shakes, and pro-shop inventory to boost frontdesk margins.',
        action: () => setScreen('shop'),
        btnLabel: language === 'ar' ? 'فتح متجر النادي ›' : language === 'fr' ? 'Ouvrir Pro-Shop ›' : 'Open Pro-Shop ›',
      },
      {
        step: '5/5',
        title: language === 'ar' ? 'ترخيص دائم متعدد الفروع' : language === 'fr' ? 'Licence Perpétuelle Multi-Sites' : 'Perpetual Multi-Branch License',
        desc:
          language === 'ar'
            ? 'فعّل قسيمة الشراء النقدية لفتح إدارة شبكة الفروع والمرافق الرياضية غير المحدودة.'
            : language === 'fr'
            ? 'Activez votre bon de licence perpétuelle pour débloquer la gestion multi-salles sans abonnement.'
            : 'Activate your perpetual cash voucher to manage multiple sports facilities without monthly fees.',
        action: onOpenVoucherModal || onAddMember,
        btnLabel: language === 'ar' ? 'تفعيل الترخيص ›' : language === 'fr' ? 'Activer Licence ›' : 'Activate Voucher ›',
      },
    ],
    [language, onAddMember, onOpenVoucherModal, setScreen, showToast]
  );

  // Hourly gym floor attendance histogram (10 capsule bars)
  const hourlyTrafficBars = [20, 35, 55, 80, 95, 100, 85, 65, 40, 25];

  // Activity events stream
  const activityList = useMemo(() => {
    return members.slice(0, 8).map((m, idx) => ({
      id: m.id,
      name: m.fullName,
      phone: m.phoneNumber,
      type: idx % 2 === 0 ? ('checkin' as const) : ('sale' as const),
      desc:
        idx % 2 === 0
          ? language === 'ar'
            ? 'مرور عبر البوابة الدوارة الرئيسية'
            : language === 'fr'
            ? 'Passage tourniquet principal'
            : 'Main turnstile badge admission'
          : language === 'ar'
          ? 'تجديد اشتراك شهري + مكمل بروتين'
          : language === 'fr'
          ? 'Renouvellement abonnement + Whey'
          : 'Membership renewal + Pro-Shop',
      time: `1${idx}:2${(idx * 7) % 10}`,
      status: m.status,
    }));
  }, [members, language]);

  const filteredActivity = useMemo(() => {
    if (activityTab === 'Passages') return activityList.filter((a) => a.type === 'checkin');
    if (activityTab === 'Ventes') return activityList.filter((a) => a.type === 'sale');
    return activityList;
  }, [activityList, activityTab]);

  if (showSkeleton && (members.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <SkeletonKpiGrid count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonChart height={280} />
          </div>
          <div className="space-y-4">
            <div className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 h-64 animate-pulse" />
          </div>
        </div>
      </div>
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
      {/* Row 0: Top Header with Left Greeting and Right Facility Switcher & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {language === 'ar' ? 'مرحباً بك مجدداً!' : language === 'fr' ? 'Bienvenue à nouveau !' : 'Welcome back!'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {language === 'ar'
                ? 'نظرة عامة ومباشرة على نشاط النادي، حركة المشتركين ومقبوضات الاشتراكات.'
                : language === 'fr'
                ? 'Aperçu en direct de l\'activité du club, des passages et des encaissements.'
                : 'Live overview of facility activity, turnstile passages, and subscription cashflow.'}
            </p>
          </div>

          <div className="flex items-center gap-3 relative flex-wrap">
            {/* Facility Pill: Branch Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Club Principal'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Facility Dropdown Menu */}
              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'الفروع والمجمعات الرياضية' : language === 'fr' ? 'Clubs & Complexes' : 'Clubs & Facilities'}
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
                          setIsFacilityDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                          <span className="truncate">{biz.name}</span>
                        </div>
                        {isCurrent && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Seed Demo Data Button */}
            <AtriumButton
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles size={14} className="text-[#C4785A]" />}
              onClick={() => {
                resetToDefaultDemoData('membership_session');
                showToast({
                  type: 'success',
                  title: 'Demo Data Refreshed',
                  message: 'Fitness and gym demo members restored.',
                });
              }}
              title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
            >
              <span className="hidden sm:inline">
                {language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}
              </span>
            </AtriumButton>

            {/* Quick Actions Dropdown */}
            <div className="relative">
              <AtriumButton
                type="button"
                variant="primary"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                icon={<Plus size={15} strokeWidth={2.5} />}
              >
                <span>{language === 'ar' ? 'إجراء سريع' : language === 'fr' ? 'Action Rapide' : 'Quick Actions'}</span>
              </AtriumButton>

              {isQuickActionsOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onAddMember();
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] flex items-center justify-center shrink-0">
                      <Plus size={16} />
                    </div>
                    <span>{language === 'ar' ? 'تسجيل مشترك جديد' : language === 'fr' ? 'Nouvel Adhérent' : 'New Member'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setScreen('scheduler');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </div>
                    <span>{language === 'ar' ? 'جدول الحصص والمدربين' : language === 'fr' ? 'Planning des Cours' : 'Class Timetable'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setScreen('shop');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Zap size={16} />
                    </div>
                    <span>{language === 'ar' ? 'متجر المكملات الغذائية' : language === 'fr' ? 'Pro-Shop & Caisse' : 'Pro Shop Register'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setScreen('history');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <span>{language === 'ar' ? 'سجل بوابات الدخول' : language === 'fr' ? 'Historique Tourniquet' : 'Turnstile Logs'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1: Two-Column Pod Canvas matching GymHome Specification (~38% Left / ~62% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ================= LEFT COLUMN (~38% - lg:col-span-5) ================= */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            {/* 1. Summary Pod Tray */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'ملخص الإشغال' : language === 'fr' ? 'Résumé' : 'Summary'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'ar'
                      ? 'متابعة الحضور المباشر وحركة القاعة اليوم.'
                      : language === 'fr'
                      ? 'Suivi des passages et présence en salle en direct.'
                      : 'Track live attendance and gym floor occupancy.'}
                  </p>
                </div>

                <div className="px-3 py-1 bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 rounded-[12px] text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs flex items-center gap-1.5">
                  <span>{language === 'ar' ? 'يومي' : language === 'fr' ? 'Journalier' : 'Daily'}</span>
                  <ChevronDown size={12} className="text-neutral-400" />
                </div>
              </div>

              {/* Inset Floating White Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
                {/* Two Metric Columns with 1px Vertical Divider */}
                <div className="grid grid-cols-2 gap-4 divide-x rtl:divide-x-reverse divide-[#EDF1F3] dark:divide-neutral-700">
                  {/* Left Metric: Inside Now */}
                  <div className="pr-3 rtl:pr-0 rtl:pl-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#FCEEE8] dark:bg-neutral-700 flex items-center justify-center text-[#C4785A]">
                        <DoorOpen size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'الموجودون حالياً' : language === 'fr' ? 'En salle actuellement' : 'People Inside'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {peopleInside}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold tabular-nums">
                        / 100
                      </span>
                    </div>
                  </div>

                  {/* Right Metric: Daily Entries */}
                  <div className="pl-4 rtl:pl-0 rtl:pr-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                        <Users size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'مجموع الدخول اليوم' : language === 'fr' ? 'Passages du jour' : 'Daily Entries'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {entreesJour}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold">
                        {language === 'ar' ? 'دخول' : language === 'fr' ? 'entrées' : 'check-ins'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Occupancy Histogram Bar Chart (10 rounded capsule bars) */}
                <div className="pt-2">
                  <div className="h-[110px] w-full flex items-end justify-between gap-1.5 px-1">
                    {hourlyTrafficBars.map((height, idx) => {
                      const isPeak = height >= 80;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                          <div
                            style={{ height: `${height}%` }}
                            className={`w-full rounded-full transition-all duration-300 ${
                              isPeak
                                ? 'bg-[#C4785A] opacity-90 group-hover:opacity-100'
                                : 'bg-[#E8DFD8] dark:bg-neutral-700 opacity-60 group-hover:opacity-85'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-neutral-400 pt-2 px-1">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                    <span>20:00</span>
                    <span>23:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Dual Compact KPI Tiles */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Tile 1: Weekly Average Revenue */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between h-[110px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'معدل الاشتراكات الأسبوعي' : language === 'fr' ? 'Moyenne Semaine' : 'Weekly Average'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                    ↗ +8.5%
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                  {formatMoney(weeklyAverageRevenue)}
                </div>
              </div>

              {/* Tile 2: Active Retention Target */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between h-[110px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'نسبة الاشتراكات السارية' : language === 'fr' ? 'Taux Rétention Actif' : 'Active Retention'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                    ↗ On Track
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                  {occupancyPercentage}%
                </div>
              </div>
            </div>

            {/* 3. Sleek Prompt Banner (Atrium Tips Card) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9.5px] font-bold bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] px-2 py-0.5 rounded-full uppercase">
                    STEP {gymTips[currentTipIndex].step}
                  </span>
                  <span className="text-[11.5px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    {gymTips[currentTipIndex].title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : gymTips.length - 1))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronLeft size={13} className="rtl:rotate-180" />
                  </button>
                  <span className="text-[10px] font-medium">{gymTips[currentTipIndex].step}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev < gymTips.length - 1 ? prev + 1 : 0))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed min-h-[36px]">
                {gymTips[currentTipIndex].desc}
              </p>

              <button
                type="button"
                onClick={gymTips[currentTipIndex].action}
                className="w-full h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 hover:bg-[#FBE5DC] text-[#C4785A] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{gymTips[currentTipIndex].btnLabel}</span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62% - lg:col-span-7) ================= */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            {/* 1. Activity Pod Tray (Top) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div>
                <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'نشاط النادي والاشتراكات' : language === 'fr' ? 'Activité & Abonnements' : 'Facility Activity & Memberships'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'ar'
                    ? 'المقبوضات المحصلة، الاشتراكات السارية والتنبيهات الاستباقية للتجديد.'
                    : language === 'fr'
                    ? 'Suivi des encaissements, adhérents en règle et alertes de renouvellement.'
                    : 'Collections volume, valid passes, and proactive renewal alerts.'}
                </p>
              </div>

              {/* 3-Card Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Today Subscription Turnover */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs h-[124px] flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'مقبوضات اليوم' : language === 'fr' ? 'Revenus du Jour' : 'Today Revenue'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                      ↗ 100% {language === 'ar' ? 'مسدد' : 'Encaissé'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                    {formatMoney(todayRevenue)}
                  </div>
                </div>

                {/* Card 2: Active Members Base */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs h-[124px] flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'المشتركون النشطون' : language === 'fr' ? 'Adhérents Actifs' : 'Active Members'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                      {activeMembers.length} {language === 'ar' ? 'ساري' : 'en règle'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                    {activeMembers.length}{' '}
                    <span className="text-xs text-neutral-400 font-semibold font-mono">
                      /{members.length}
                    </span>
                  </div>
                </div>

                {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) — Expiring Renewals */}
                <div className="bg-[#1F1D1B] rounded-[18px] p-4 border border-neutral-800 text-white relative overflow-hidden h-[124px] flex flex-col justify-between shadow-sm group">
                  <div className="absolute -right-3 -bottom-4 opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none">
                    <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
                      <path
                        d="M5 50 L30 35 L55 42 L80 18 L110 22"
                        stroke="#FB923C"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-neutral-300 block truncate">
                      {language === 'ar' ? 'تجديدات وشيكة (<14j)' : language === 'fr' ? 'À renouveler (<14j)' : 'Expiring Soon'}
                    </span>
                    <div className="text-[10px] text-[#FB923C] font-semibold mt-0.5">
                      <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                        {language === 'ar' ? 'تنبيه التجديد' : language === 'fr' ? 'Relance active' : 'Renewal Alert'}
                      </span>
                    </div>
                  </div>

                  <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                    {expiringMembers.length}{' '}
                    <span className="text-xs text-neutral-400 font-normal">
                      {language === 'ar' ? 'ملفات' : 'adhérents'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Recent Turnstile & Operational Access Pod Tray */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'سجل المرور والعمليات الآنية' : language === 'fr' ? 'Passages & Opérations en Direct' : 'Live Turnstile & Event Stream'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'ar'
                      ? 'بث مباشر لعمليات مسح شارات RFID وحركات الصندوق الأخيرة.'
                      : language === 'fr'
                      ? 'Flux en temps réel des accès RFID et dernières transactions d\'accueil.'
                      : 'Real-time RFID access scans and recent frontdesk transactions.'}
                  </p>
                </div>

                {/* Filter Capsule Switcher */}
                <div className="h-8 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center gap-0.5 text-xs font-semibold shadow-2xs self-start sm:self-auto">
                  {(['Tous', 'Passages', 'Ventes'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActivityTab(tab)}
                      className={`h-7 px-3 rounded-full transition-all cursor-pointer text-xs ${
                        activityTab === tab
                          ? 'bg-[#C4785A] text-white shadow-xs font-bold'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tab === 'Tous'
                        ? language === 'ar' ? 'الكل' : 'Tous'
                        : tab === 'Passages'
                        ? language === 'ar' ? 'دخول' : 'Passages'
                        : language === 'ar' ? 'مبيعات' : 'Ventes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Header Card */}
              <div className="p-3 bg-white dark:bg-neutral-800 rounded-[14px] border border-[#E9EEF0] dark:border-neutral-700/60 text-[11px] font-bold text-neutral-400 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5 sm:col-span-4">
                  {language === 'ar' ? 'المشترك / الزائر' : language === 'fr' ? 'Adhérent / Visiteur' : 'Member / Visitor'}
                </div>
                <div className="col-span-5 sm:col-span-5">
                  {language === 'ar' ? 'العملية / البوابة' : language === 'fr' ? 'Opération / Point d\'accès' : 'Operation / Access'}
                </div>
                <div className="col-span-2 sm:col-span-3 text-right rtl:text-left">
                  {language === 'ar' ? 'الوقت' : language === 'fr' ? 'Heure' : 'Time'}
                </div>
              </div>

              {/* Event Rows */}
              <div className="space-y-2">
                {filteredActivity.map((evt) => {
                  const isCheckin = evt.type === 'checkin';
                  return (
                    <div
                      key={evt.id}
                      className="p-3.5 bg-white dark:bg-neutral-800 rounded-[16px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs hover:border-[#C4785A]/40 transition-colors grid grid-cols-12 gap-3 items-center"
                    >
                      {/* Left: Avatar + Member Name */}
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0">
                          {evt.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                            {evt.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono block truncate">
                            {evt.phone}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Operation */}
                      <div className="col-span-5 sm:col-span-5 min-w-0 flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isCheckin ? 'bg-emerald-500 animate-pulse' : 'bg-[#C4785A]'
                          }`}
                        />
                        <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                          {evt.desc}
                        </span>
                      </div>

                      {/* Right: Timestamp & Badge */}
                      <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          {evt.time}
                        </span>
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          OK
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

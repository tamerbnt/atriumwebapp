import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  DoorOpen,
  DollarSign,
  TrendingUp,
  MapPin,
  FileCheck,
  Cloud,
  Home,
  ChevronDown,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentalBooking } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal } from './VenueCloudSyncModal';
import { ActionNode } from '../../ui/ActionNode';
import { AtriumButton } from '../../ui/AtriumButton';

export const VenueDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBusiness,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    rentableUnits,
    rentalBookings,
    securityDeposits,
    checkInBooking,
    checkOutBooking,
    switchBusiness,
    switchBranch,
    setScreen,
    resetVenueMockData,
  } = useAtriumStore();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<string | undefined>(undefined);
  const [activeBookingDetail, setActiveBookingDetail] = useState<RentalBooking | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'Tous' | 'CheckIns' | 'Ventes'>('Tous');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Auto-heal empty venue datasets safely once on mount if empty
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && (rentableUnits.length === 0 || rentalBookings.length === 0)) {
      hasAutoHealed.current = true;
      resetVenueMockData();
    }
  }, [rentableUnits.length, rentalBookings.length, resetVenueMockData]);

  // Today's date calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Scoped metrics
  const totalUnits = rentableUnits.length;
  const occupiedUnits = rentableUnits.filter((u) => u.status === 'Occupied').length;
  const availableUnits = rentableUnits.filter((u) => u.status === 'Available').length;
  const occupancyPercentage = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Today's bookings
  const todayBookings = useMemo(() => {
    return rentalBookings.filter((b) => b.startDateTime.startsWith(todayStr));
  }, [rentalBookings, todayStr]);

  const activeCheckedIn = useMemo(() => {
    return rentalBookings.filter((b) => b.status === 'CheckedIn');
  }, [rentalBookings]);

  const confirmedUpcoming = useMemo(() => {
    return rentalBookings.filter(
      (b) => b.status === 'Confirmed' && b.startDateTime.startsWith(todayStr)
    );
  }, [rentalBookings, todayStr]);

  // Active Caution Escrow
  const totalHeldCaution = useMemo(() => {
    return securityDeposits
      .filter((d) => d.status === 'Held')
      .reduce((sum, d) => sum + d.amount, 0);
  }, [securityDeposits]);

  // Today's Booked Volume
  const todayBookedVolume = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  }, [todayBookings]);

  // Weekly Average Revenue simulation
  const weeklyAverageRevenue = useMemo(() => {
    return Math.max(todayBookedVolume * 4, 18400);
  }, [todayBookedVolume]);

  const venueTips = useMemo(
    () => [
      {
        step: '1/4',
        title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
        desc:
          language === 'ar'
            ? 'تأكد من استلام وصل الوديعة الضامنة (Caution) قبل تسليم مفاتيح القاعة للمستأجر.'
            : language === 'fr'
            ? 'Vérifiez toujours le statut de la caution avant la remise des clés de la salle.'
            : 'Always confirm security escrow deposit clearance before issuing venue keys.',
        action: () => setScreen('finance'),
        btnLabel:
          language === 'ar'
            ? 'سجل الودائع الضامنة ›'
            : language === 'fr'
            ? 'Voir les cautions ›'
            : 'View caution ledger ›',
      },
      {
        step: '2/4',
        title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
        desc:
          language === 'ar'
            ? 'يمكنك فحص التعارض الزمني بين الحجوزات بنقرة واحدة عبر المخطط الزمني التفاعلي.'
            : language === 'fr'
            ? 'Consultez le planning interactif pour éviter tout chevauchement entre réservations.'
            : 'Check the interactive timeline to prevent overlapping bookings across spaces.',
        action: () => setScreen('scheduler'),
        btnLabel:
          language === 'ar'
            ? 'المخطط الزمني ›'
            : language === 'fr'
            ? 'Voir le planning ›'
            : 'Open timeline ›',
      },
      {
        step: '3/4',
        title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
        desc:
          language === 'ar'
            ? 'احرص على أرشفة وثائق الهوية وسجل الشركات المنظمة لتسهيل الفوترة السريعة مستقبلاً.'
            : language === 'fr'
            ? 'Associez toujours le numéro fiscal ou RC pour les réservations d\'entreprises.'
            : 'Always link the enterprise registration (RC/NIF) for corporate event billing.',
        action: () => setScreen('members'),
        btnLabel:
          language === 'ar'
            ? 'دليل المستأجرين ›'
            : language === 'fr'
            ? 'Dossiers locataires ›'
            : 'View renters ›',
      },
      {
        step: '4/4',
        title: language === 'ar' ? 'نصيحة الأتريوم' : language === 'fr' ? 'Conseil Atrium' : 'Atrium Tip',
        desc:
          language === 'ar'
            ? 'قم بتوليد عقود الإيجار الرقمية فور تأكيد الحجز لضمان الامتثال القانوني والمالي.'
            : language === 'fr'
            ? 'Générez les bons de réservation et conventions dès la validation de l\'acompte.'
            : 'Issue reservation slips and rental conventions immediately upon deposit intake.',
        action: () => setScreen('registrations'),
        btnLabel:
          language === 'ar'
            ? 'قائمة الحجوزات ›'
            : language === 'fr'
            ? 'Gérer réservations ›'
            : 'Manage bookings ›',
      },
    ],
    [language, setScreen]
  );

  const handleQuickBookUnit = (unitId: string) => {
    setSelectedUnitForBooking(unitId);
    setIsBookingModalOpen(true);
  };

  // Activity rows filtered by tab
  const activityRows = useMemo(() => {
    return rentalBookings.slice(0, 8).filter((b) => {
      if (activityFilter === 'CheckIns') return b.status === 'CheckedIn';
      if (activityFilter === 'Ventes') return b.status === 'Confirmed' || b.status === 'Completed';
      return true;
    });
  }, [rentalBookings, activityFilter]);

  return (
    <div className="space-y-6">
      {/* Outer Workspace Panel matching Desktop Spec (rounded-28, white background, subtle border) */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        {/* Row 0: Header with Left Greeting and Right Branch + Quick Actions Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {language === 'ar' ? 'مرحباً بك مجدداً!' : language === 'fr' ? 'Bienvenue à nouveau !' : 'Welcome back, Tamer!'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {language === 'ar'
                ? 'نظرة عامة ومباشرة على نشاط حجز القاعات ومداخيل المرافق اليوم.'
                : language === 'fr'
                ? 'Aperçu en direct de l\'activité des salles et des opérations du site.'
                : 'Live overview of today\'s venue activity and facility operations.'}
            </p>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Facility Pill: Atrium 1 ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Atrium 1'}
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
                    {language === 'ar' ? 'المواقع والمرافق' : language === 'fr' ? 'Sites & Complexes' : 'Sites & Facilities'}
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

            {/* Quick Actions Primary CTA ToggleButton with Floating Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="h-10 px-5 rounded-[14px] bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer select-none"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>{language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}</span>
              </button>

              {/* Floating Popup Menu matching Desktop Spec Section 2.2 */}
              {isQuickActionsOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-60 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
                  </div>

                  {/* 1. Quick Book */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setSelectedUnitForBooking(undefined);
                      setIsBookingModalOpen(true);
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] flex items-center justify-center shrink-0">
                      <Plus size={16} />
                    </div>
                    <span>{language === 'ar' ? 'حجز قاعة جديد' : language === 'fr' ? 'Nouvelle Réservation' : 'Quick Booking'}</span>
                  </button>

                  {/* 2. New Renter */}
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
                    <span>{language === 'ar' ? 'إضافة مستأجر / جهة' : language === 'fr' ? 'Nouveau Locataire' : 'New Renter'}</span>
                  </button>

                  {/* 3. Timeline Gantt */}
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
                    <span>{language === 'ar' ? 'المخطط الزمني' : language === 'fr' ? 'Planning des Salles' : 'Timeline Gantt'}</span>
                  </button>

                  {/* 4. Caution Escrow Ledger */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setScreen('finance');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <span>{language === 'ar' ? 'سجل الودائع والضمانات' : language === 'fr' ? 'Registre des Cautions' : 'Caution Ledger'}</span>
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
                      ? 'متابعة أداء المرافق والقاعات المباشر.'
                      : language === 'fr'
                      ? 'Suivi des performances des salles en direct.'
                      : 'Track live facility performance.'}
                  </p>
                </div>

                <div className="px-3 py-1 bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 rounded-[12px] text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs flex items-center gap-1.5">
                  <span>{language === 'ar' ? 'يومي' : language === 'fr' ? 'Journalier' : 'Daily'}</span>
                  <ChevronDown size={12} className="text-neutral-400" />
                </div>
              </div>

              {/* Inset Floating White Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
                {/* Section A: Two Metric Columns with 1px Vertical Divider */}
                <div className="grid grid-cols-2 gap-4 divide-x rtl:divide-x-reverse divide-[#EDF1F3] dark:divide-neutral-700">
                  {/* Left Metric: Occupancy */}
                  <div className="pr-3 rtl:pr-0 rtl:pl-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#FCEEE8] dark:bg-neutral-700 flex items-center justify-center text-[#C4785A]">
                        <DoorOpen size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'القاعات المحجوزة' : language === 'fr' ? 'Salles Occupées' : 'Occupied Spaces'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {occupiedUnits}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold tabular-nums">
                        /{totalUnits}
                      </span>
                    </div>
                  </div>

                  {/* Right Metric: Daily Events */}
                  <div className="pl-4 rtl:pl-0 rtl:pr-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                        <Users size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'حجوزات اليوم' : language === 'fr' ? 'Sessions Jour' : 'Daily Sessions'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {todayBookings.length}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold">
                        {language === 'ar' ? 'حجز' : language === 'fr' ? 'réservations' : 'bookings'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section B: Occupancy Histogram Bar Chart (10 rounded capsule bars) */}
                <div className="pt-2">
                  <div className="h-[110px] w-full flex items-end justify-between gap-1.5 px-1">
                    {[15, 30, 45, 75, 90, 100, 60, 40, 20, 10].map((height, idx) => {
                      const isPeak = height >= 75;
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
                    {language === 'ar' ? 'معدل الحجوزات' : language === 'fr' ? 'Moyenne Semaine' : 'Weekly Average'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                    ↗ +8.5%
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                  {formatCurrencyAmount(weeklyAverageRevenue, 'DZD')}
                </div>
              </div>

              {/* Tile 2: Monthly Utilization Target */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between h-[110px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'معدل الإشغال الشهري' : language === 'fr' ? 'Objectif Mensuel' : 'Monthly Target'}
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
                    STEP {venueTips[currentTipIndex].step}
                  </span>
                  <span className="text-[11.5px] font-bold text-neutral-800 dark:text-neutral-200">
                    {venueTips[currentTipIndex].title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : venueTips.length - 1))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronLeft size={13} className="rtl:rotate-180" />
                  </button>
                  <span className="text-[10px] font-medium">{venueTips[currentTipIndex].step}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev < venueTips.length - 1 ? prev + 1 : 0))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {venueTips[currentTipIndex].desc}
              </p>

              <button
                type="button"
                onClick={venueTips[currentTipIndex].action}
                className="w-full h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 hover:bg-[#FBE5DC] text-[#C4785A] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{venueTips[currentTipIndex].btnLabel}</span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62% - lg:col-span-7) ================= */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            {/* 1. Activity Pod Tray (Top) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div>
                <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'نشاط المرافق اليومي' : language === 'fr' ? 'Activité' : 'Activity'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'ar'
                    ? 'متابعة العمليات والمداخيل والضمانات الجارية.'
                    : language === 'fr'
                    ? 'Suivi de l\'activité opérationnelle journalière.'
                    : 'Track your daily operational activity.'}
                </p>
              </div>

              {/* 3 Inset Activity Cards (Revenue, Active Spaces, and Dark Espresso Card) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Revenue Today */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs relative overflow-hidden h-[155px] flex flex-col justify-between">
                  <div className="relative z-10">
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'مداخيل اليوم' : language === 'fr' ? 'Revenu Jour' : 'Revenue Today'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                      ↗ +12%
                    </span>
                  </div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono relative z-10">
                    {formatCurrencyAmount(todayBookedVolume, 'DZD')}
                  </div>

                  {/* Sparkline Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-emerald-500/15 dark:text-emerald-500/10"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 35 Q 20 15, 40 25 T 80 10 T 100 18 L 100 40 L 0 40 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M0 35 Q 20 15, 40 25 T 80 10 T 100 18"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Card 2: Active In-Use Sessions */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs relative overflow-hidden h-[155px] flex flex-col justify-between">
                  <div className="relative z-10">
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'جلسات قيد الاستخدام' : language === 'fr' ? 'Sessions En Cours' : 'Active In-Session'}
                    </span>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                      ● Live
                    </span>
                  </div>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums relative z-10">
                    {activeCheckedIn.length}
                  </div>

                  {/* Sparkline Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-purple-500/15 dark:text-purple-500/10"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 30 Q 30 5, 60 20 T 100 5 L 100 40 L 0 40 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M0 30 Q 30 5, 60 20 T 100 5"
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) — Caution Escrow */}
                <div className="bg-[#1F1D1B] rounded-[18px] p-4 border border-neutral-800 text-white relative overflow-hidden h-[155px] flex flex-col justify-between shadow-sm">
                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-300 block truncate">
                      {language === 'ar' ? 'الودائع الضامنة المحجوزة' : language === 'fr' ? 'Cautions Détenues' : 'Caution Escrow'}
                    </span>
                    <span className="text-[10px] font-bold bg-[#3D2817] text-[#FB923C] px-2 py-0.5 rounded-full inline-block mt-1">
                      {securityDeposits.filter((d) => d.status === 'Held').length} {language === 'ar' ? 'نشطة' : 'actives'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-white tabular-nums font-mono relative z-10">
                    {formatCurrencyAmount(totalHeldCaution, 'DZD')}
                  </div>

                  {/* Sparkline Amber Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-[#F59E0B]/15"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 25 Q 35 35, 70 12 T 100 20 L 100 40 L 0 40 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M0 25 Q 35 35, 70 12 T 100 20"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* 2. Recent Activity Pod Tray (Bottom - Fills Remaining Height) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'النشاط الأخير' : language === 'fr' ? 'Activité Récente' : 'Recent Activity'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'ar'
                      ? 'متابعة سجل حركات واستلام القاعات.'
                      : language === 'fr'
                      ? 'Historique en direct des réservations et passages.'
                      : 'Live feed of room check-ins and bookings.'}
                  </p>
                </div>

                {/* Filter Capsule Group */}
                <div className="bg-white dark:bg-neutral-800 p-0.5 rounded-[10px] border border-[#E9EEF0] dark:border-neutral-700 flex items-center shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActivityFilter('Tous')}
                    className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                      activityFilter === 'Tous'
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('CheckIns')}
                    className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                      activityFilter === 'CheckIns'
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'الجلسات' : language === 'fr' ? 'Passages' : 'Check-Ins'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('Ventes')}
                    className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                      activityFilter === 'Ventes'
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'الحجوزات' : language === 'fr' ? 'Ventes' : 'Bookings'}
                  </button>
                </div>
              </div>

              {/* Column Headers Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[12px] border border-[#E9EEF0] dark:border-neutral-700/60 px-4 py-2 text-[11px] font-semibold text-neutral-400 flex items-center">
                <span className="w-[35%] truncate">
                  {language === 'ar' ? 'المستأجر' : language === 'fr' ? 'LOCATAIRE' : 'RENTER'}
                </span>
                <span className="w-[30%] truncate">
                  {language === 'ar' ? 'العملية' : language === 'fr' ? 'OPÉRATION' : 'OPERATION'}
                </span>
                <span className="w-[20%] text-center truncate">
                  {language === 'ar' ? 'الحالة' : language === 'fr' ? 'STATUT' : 'STATUS'}
                </span>
                <span className="w-[15%] text-right rtl:text-left truncate">
                  {language === 'ar' ? 'التوقيت' : language === 'fr' ? 'HEURE' : 'TIME'}
                </span>
              </div>

              {/* Activity Rows List or Empty State */}
              <div className="space-y-2 flex-1">
                {activityRows.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-neutral-800/40 rounded-[16px] border border-[#E9EEF0] dark:border-neutral-800 space-y-2 my-auto">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mx-auto text-neutral-400">
                      <RotateCcw size={18} />
                    </div>
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      {language === 'ar'
                        ? 'لا توجد عمليات مسجلة حالياً'
                        : language === 'fr'
                        ? 'Aucune activité récente aujourd\'hui'
                        : 'No recent activity recorded today'}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {language === 'ar'
                        ? 'ستظهر الحجوزات واستلام القاعات هنا مباشرة.'
                        : language === 'fr'
                        ? 'Les passages de clients et encaissements s\'afficheront ici en direct.'
                        : 'Bookings and room handovers will appear here live.'}
                    </p>
                  </div>
                ) : (
                  activityRows.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white dark:bg-neutral-800 rounded-[12px] border border-[#E9EEF0] dark:border-neutral-700/60 px-4 py-2.5 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/40 transition-colors flex items-center text-xs shadow-2xs"
                    >
                      {/* 1. Renter */}
                      <div className="w-[35%] flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-full bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold text-[11px] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-600">
                          {b.renterName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-neutral-900 dark:text-white truncate">
                            {b.renterName}
                          </div>
                          <div className="text-[10px] text-neutral-400 truncate">
                            {b.unitName}
                          </div>
                        </div>
                      </div>

                      {/* 2. Operation */}
                      <div className="w-[30%] text-neutral-600 dark:text-neutral-300 truncate pr-2">
                        {b.purpose}
                      </div>

                      {/* 3. Status Badge */}
                      <div className="w-[20%] text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'CheckedIn'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : b.status === 'Confirmed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {b.status === 'CheckedIn'
                            ? (language === 'ar' ? 'جلسة جارية' : language === 'fr' ? 'En Cours' : 'In Session')
                            : b.status === 'Confirmed'
                            ? (language === 'ar' ? 'مؤكد' : language === 'fr' ? 'Confirmé' : 'Confirmed')
                            : (language === 'ar' ? 'مكتمل' : language === 'fr' ? 'Terminé' : 'Completed')}
                        </span>
                      </div>

                      {/* 4. Time */}
                      <div className="w-[15%] text-right rtl:text-left text-[11px] text-neutral-400 font-mono">
                        {(b.startDateTime?.split('T')[1] || b.startDateTime || '').slice(0, 5) || '10:00'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Spaces & Rooms Section inside an Elevated Pod Tray */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {t('venue_spaces_title')}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('venue_spaces_subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScreen('shop')}
              className="text-xs text-[#C4785A] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              {t('venue_btn_manage_catalog')} <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rentableUnits.map((unit) => {
              const currentBooking = rentalBookings.find(
                (b) => b.unitId === unit.id && b.status === 'CheckedIn'
              );
              const nextBooking = rentalBookings.find(
                (b) =>
                  b.unitId === unit.id &&
                  b.status === 'Confirmed' &&
                  b.startDateTime.startsWith(todayStr)
              );

              const localizedType =
                unit.type === 'Hall'
                  ? t('venue_type_hall')
                  : unit.type === 'Studio'
                  ? t('venue_type_studio')
                  : unit.type === 'Room'
                  ? t('venue_type_room')
                  : unit.type === 'Court'
                  ? t('venue_type_court')
                  : t('venue_type_desk');

              const localizedStatus =
                unit.status === 'Available'
                  ? language === 'ar'
                    ? 'متاحة'
                    : language === 'fr'
                    ? 'Disponible'
                    : 'Available'
                  : unit.status === 'Occupied'
                  ? t('venue_kpi_in_use')
                  : language === 'ar'
                  ? 'صيانة'
                  : language === 'fr'
                  ? 'Maintenance'
                  : 'Maintenance';

              return (
                <ActionNode
                  key={unit.id}
                  title={unit.name}
                  description={`${unit.code} · ${localizedType} · ${t('venue_card_capacity', language, {
                    count: unit.capacity,
                  })}${
                    unit.surfaceAreaSqm
                      ? ` · ${t('venue_inv_surface_unit', language, {
                          surface: unit.surfaceAreaSqm,
                        })}`
                      : ''
                  }`}
                  tag={localizedStatus}
                  width="100%"
                  air={16}
                  corner={18}
                  actions={[
                    {
                      id: 'book',
                      label: t('venue_reserve_space'),
                      icon: <Plus size={14} />,
                      onClick: () => handleQuickBookUnit(unit.id),
                    },
                    {
                      id: 'timeline',
                      label: t('venue_view_timeline'),
                      icon: <Calendar size={14} />,
                      onClick: () => setScreen('scheduler'),
                    },
                  ]}
                >
                  <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50 text-xs">
                    {currentBooking ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <Users size={12} /> {currentBooking.renterName}
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400 text-[11px] truncate">
                          {currentBooking.purpose}
                        </div>
                        <div className="text-neutral-400 text-[10px] tabular-nums">
                          {t('venue_until_time', language, {
                            time: (
                              currentBooking.endDateTime?.split('T')[1] ||
                              currentBooking.endDateTime ||
                              ''
                            ).slice(0, 5),
                          })}
                        </div>
                      </div>
                    ) : nextBooking ? (
                      <div className="space-y-1">
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                          {nextBooking.renterName}
                        </div>
                        <div className="text-neutral-400 text-[10px] tabular-nums">
                          {(nextBooking.startDateTime?.split('T')[1] || nextBooking.startDateTime || '').slice(0, 5)} -{' '}
                          {(nextBooking.endDateTime?.split('T')[1] || nextBooking.endDateTime || '').slice(0, 5)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-neutral-400 text-[11px] italic">
                        {t('venue_available_today')}
                      </div>
                    )}

                    <div className="mt-3 pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700/50">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
                        {formatCurrencyAmount(unit.hourlyRate, unit.currency)}
                        {t('venue_per_hour')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickBookUnit(unit.id)}
                        className="px-2.5 py-1 bg-[#FDF4F0] hover:bg-[#FBE5DC] text-[#C4785A] rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {t('venue_btn_reserve')}
                      </button>
                    </div>
                  </div>
                </ActionNode>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={selectedUnitForBooking}
      />

      {/* Supabase Cloud Sync Diagnostics Modal */}
      <VenueCloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
      />
    </div>
  );
};

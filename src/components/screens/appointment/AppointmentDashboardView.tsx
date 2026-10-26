import React, { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  Sparkles,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Play,
  CreditCard,
  Building2,
  ChevronDown,
  Plus,
  Users,
  TrendingUp,
  Sparkle,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Home,
  RefreshCw,
  Award,
  ChevronLeft,
  ChevronRight,
  Activity,
  DoorOpen,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Appointment, AppointmentStatus } from '../../../types/index';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { formatMoney } from '../../../utils/rules';
import { t } from '../../../utils/i18n';

interface AppointmentDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const AppointmentDashboardView: React.FC<AppointmentDashboardViewProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const {
    appointments,
    servicesCatalog,
    staff,
    currentBranch,
    branches,
    switchBranch,
    updateAppointmentStatus,
    resetSalonMockData,
    language,
    showToast,
    setScreen,
  } = useAtriumStore();

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [activityFilter, setActivityFilter] = useState<'Tous' | 'InChair' | 'Confirmed' | 'Completed'>('Tous');

  // Auto-heal empty mock state on initial mount
  useEffect(() => {
    if ((!appointments || appointments.length === 0) || (!servicesCatalog || servicesCatalog.length === 0)) {
      resetSalonMockData();
    }
  }, [appointments?.length, servicesCatalog?.length, resetSalonMockData]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's appointments
  const todayAppointments = useMemo(() => {
    return (appointments || [])
      .filter((a) => a.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments, todayStr]);

  // Key metrics
  const totalTodayCount = todayAppointments.length;
  const inChairCount = todayAppointments.filter((a) => a.status === 'InChair').length;
  const completedCount = todayAppointments.filter((a) => a.status === 'Completed').length;
  const confirmedCount = todayAppointments.filter((a) => a.status === 'Confirmed' || a.status === 'Booked').length;

  const totalTodayRevenue = useMemo(() => {
    return todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
  }, [todayAppointments]);

  const completedRevenue = useMemo(() => {
    return todayAppointments
      .filter((a) => a.status === 'Completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);
  }, [todayAppointments]);

  const avgTicket = totalTodayCount > 0 ? Math.round(totalTodayRevenue / totalTodayCount) : 0;
  const totalCommissionPool = Math.round(totalTodayRevenue * 0.4);

  // Workstations
  const workstations = useMemo(() => [
    {
      id: 'chair_01',
      name: 'Fauteuil 1 · Coloriste Senior',
      staffName: 'Sarah Louati',
      type: 'Fauteuil Technique',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_01' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_01' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_02',
      name: 'Fauteuil 2 · Balayage & Brushing',
      staffName: 'Nadia Belkacem',
      type: 'Fauteuil Coiffure',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_02' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_02' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_03',
      name: 'Fauteuil 3 · Coupe Homme & Barbe',
      staffName: 'Karim Ziane',
      type: 'Barber Corner',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_03' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_03' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_04',
      name: 'Cabine 1 · Soins Esthétiques & Visage',
      staffName: 'Amel Mansouri',
      type: 'Cabine Soin Privée',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_04' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_04' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_05',
      name: 'Bar à Ongles · Manucure Russe',
      staffName: 'Lyna Cherif',
      type: 'Nail Station',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_05' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_05' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_06',
      name: 'Bac à Shampooing & Massages Cuir',
      staffName: 'Yasmine Kaci',
      type: 'Head Spa & Soin',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_06' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_06' && a.status === 'Confirmed'),
    },
  ], [todayAppointments]);

  const activeWorkstationCount = workstations.filter((w) => w.currentApt && w.currentApt.status === 'InChair').length;
  const occupancyRate = workstations.length > 0 ? Math.round((activeWorkstationCount / workstations.length) * 100) : 0;

  // Filtered Appointments for Activity Feed
  const filteredActivityAppointments = useMemo(() => {
    if (activityFilter === 'Tous') return todayAppointments;
    return todayAppointments.filter((a) => a.status === activityFilter);
  }, [todayAppointments, activityFilter]);

  // Atrium Tips
  const salonTips = useMemo(() => [
    {
      step: 1,
      title: language === 'ar' ? 'تسكين العميل في المقعد' : 'Attribution du Fauteuil',
      description: language === 'ar'
        ? 'قم بتعيين حالة "En Fauteuil" لتحرير تتبع وقت الجلسة وحساب استهلاك المواد'
        : 'Passez le statut à "En Fauteuil" pour démarrer le chronométrage du soin et réserver le matériel.',
      btnLabel: language === 'ar' ? 'عرض الفنيين' : 'Plan des Postes',
      action: () => setScreen?.('appointment_schedule'),
    },
    {
      step: 2,
      title: language === 'ar' ? 'توثيق التركيبة اللونية' : 'Fiche Technique & Colorimétrie',
      description: language === 'ar'
        ? 'سجل نسب الأكسجين والصبغة المستخدمة لكل عميل لضمان تطابق النتيجة في الجلسات القادمة'
        : 'Notez le dosage de révélateur et la nuance appliquée pour un rendu parfait aux visites futures.',
      btnLabel: language === 'ar' ? 'سجل العملاء' : 'Fiches Clients',
      action: () => setScreen?.('appointment_clients'),
    },
    {
      step: 3,
      title: language === 'ar' ? 'صرف عمولات المصففين' : 'Paiement des Commissions',
      description: language === 'ar'
        ? 'راجع سجل الحصص والمكافآت المستحقة لكل مصفف بنهاية نوبة العمل اليومية'
        : 'Validez la répartition des commissions et pourboires des stylistes avant la clôture.',
      btnLabel: language === 'ar' ? 'المالية والعمولات' : 'Journal Financier',
      action: () => setScreen?.('appointment_finance'),
    },
  ], [language, setScreen]);

  const handleSeatClient = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'InChair');
    showToast({
      type: 'info',
      title: 'Client installé',
      message: `${apt.clientName} a été installé(e) pour ${apt.serviceName}.`,
      category: 'appointment_service',
    });
  };

  const handleCompleteApt = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'Completed');
    showToast({
      type: 'success',
      title: 'Prestation terminée',
      message: `${apt.serviceName} pour ${apt.clientName} a été marquée comme terminée.`,
      category: 'appointment_service',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Outer Workspace Panel */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Scissors size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'لوحة قيادة الصالون والسبا' : 'Tableau de Bord Salon & Spa'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Luxe Aesthetics
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar'
                  ? 'متابعة حية للعمليات بالصالون، إشغال المقاعد والكبائن، وصرف العمولات'
                  : 'Suivi en direct des postes de coiffure, du planning cabines et de la recette journalière.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Luxe Spa Hydra'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'الفروع والمراكز' : 'Salons & Instituts'}
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full text-left rtl:text-right px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700/60 ${
                        currentBranch?.id === b.id ? 'text-[#C4785A]' : 'text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      <span>{b.name}</span>
                      {currentBranch?.id === b.id && <span className="w-1.5 h-1.5 rounded-full bg-[#C4785A]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <AtriumButton
              size="sm"
              variant="secondary"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={resetSalonMockData}
            >
              {language === 'ar' ? 'شحن العينة' : 'Démo Recharge'}
            </AtriumButton>

            <AtriumButton
              size="sm"
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewAptModalOpen(true)}
            >
              {language === 'ar' ? 'حجز موعد جديد' : 'Nouveau RDV'}
            </AtriumButton>
          </div>
        </div>

        {/* Row 1: Two-Column Pod Canvas matching Venue / Desktop Specification (~38% Left / ~62% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ================= LEFT COLUMN (~38% - lg:col-span-5) ================= */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            {/* 1. Summary Pod Tray */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'ملخص إشغال الصالون' : 'Synthèse Fauteuils & Cabines'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'ar' ? 'متابعة الجلسات في الوقت الفعلي' : 'Suivi des postes techniques et cabines privées.'}
                  </p>
                </div>

                <div className="px-3 py-1 bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 rounded-[12px] text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs flex items-center gap-1.5">
                  <span>{language === 'ar' ? 'اليوم' : 'Aujourd\'hui'}</span>
                  <ChevronDown size={12} className="text-neutral-400" />
                </div>
              </div>

              {/* Inset Floating White Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
                {/* Hairline Divider Split */}
                <div className="grid grid-cols-2 gap-4 divide-x rtl:divide-x-reverse divide-[#EDF1F3] dark:divide-neutral-700">
                  {/* Left Metric: Active Workstations */}
                  <div className="pr-3 rtl:pr-0 rtl:pl-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#FCEEE8] dark:bg-neutral-700 flex items-center justify-center text-[#C4785A]">
                        <Scissors size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'مقاعد مشغولة' : 'Postes Occupés'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {activeWorkstationCount}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold tabular-nums">
                        /{workstations.length}
                      </span>
                    </div>
                  </div>

                  {/* Right Metric: Today's Appts */}
                  <div className="pl-4 rtl:pl-0 rtl:pr-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                        <Users size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'مواعيد اليوم' : 'RDV du Jour'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {totalTodayCount}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold">
                        {language === 'ar' ? 'جلسة' : 'soins'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Occupancy Histogram Bar Chart (10 rounded capsule bars) */}
                <div className="pt-2">
                  <div className="h-[110px] w-full flex items-end justify-between gap-1.5 px-1">
                    {[20, 35, 60, 85, 100, 95, 70, 50, 30, 15].map((height, idx) => {
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
                    <span>09:00</span>
                    <span>11:00</span>
                    <span>14:00</span>
                    <span>16:00</span>
                    <span>19:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Dual Compact KPI Tiles */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Tile 1: Panier Moyen */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between h-[110px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'متوسط سعر الجلسة' : 'Panier Moyen Soin'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                    ↗ +6.2%
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                  {formatMoney(avgTicket)}
                </div>
              </div>

              {/* Tile 2: Occupancy Rate */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between h-[110px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'نسبة الإشغال المباشر' : 'Taux d’Occupation'}
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                    ● En Direct
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                  {occupancyRate}%
                </div>
              </div>
            </div>

            {/* 3. Atrium Tips Card */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9.5px] font-bold bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] px-2 py-0.5 rounded-full uppercase">
                    STEP {salonTips[currentTipIndex].step}
                  </span>
                  <span className="text-[11.5px] font-bold text-neutral-800 dark:text-neutral-200">
                    {salonTips[currentTipIndex].title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : salonTips.length - 1))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronLeft size={13} className="rtl:rotate-180" />
                  </button>
                  <span className="text-[10px] font-medium">{salonTips[currentTipIndex].step}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev < salonTips.length - 1 ? prev + 1 : 0))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {salonTips[currentTipIndex].description}
              </p>

              <button
                type="button"
                onClick={salonTips[currentTipIndex].action}
                className="w-full h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 hover:bg-[#FBE5DC] text-[#C4785A] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{salonTips[currentTipIndex].btnLabel}</span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62% - lg:col-span-7) ================= */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            {/* 1. Activity Pod Tray (Top) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div>
                <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'نشاط الصالون اليومي' : 'Activité Opérationnelle du Jour'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'ar' ? 'متابعة المداخيل، الزبائن بالخدمة، وعمولات الفريق' : 'Revenu prévisionnel, clients installés et cagnotte des stylistes.'}
                </p>
              </div>

              {/* 3 Inset Activity Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Revenue Today */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs relative overflow-hidden h-[155px] flex flex-col justify-between">
                  <div className="relative z-10">
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'إجمالي الدخل المتوقع' : 'Recette Prévue'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                      {formatMoney(completedRevenue)} réglés
                    </span>
                  </div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono relative z-10">
                    {formatMoney(totalTodayRevenue)}
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

                {/* Card 2: Clients in Chair */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs relative overflow-hidden h-[155px] flex flex-col justify-between">
                  <div className="relative z-10">
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'العملاء في المقاعد' : 'En Fauteuil'}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                      ● Soin en cours
                    </span>
                  </div>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums relative z-10">
                    {inChairCount} <span className="text-xs font-normal text-neutral-400">clients</span>
                  </div>

                  {/* Sparkline Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-amber-500/15 dark:text-amber-500/10"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 30 Q 30 10, 60 25 T 100 8 L 100 40 L 0 40 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M0 30 Q 30 10, 60 25 T 100 8"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) — Stylist Commission Pool */}
                <div className="bg-[#1F1D1B] rounded-[18px] p-4 border border-neutral-800 text-white relative overflow-hidden h-[155px] flex flex-col justify-between shadow-sm">
                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-300 block truncate">
                      {language === 'ar' ? 'وعاء عمولات المصففين' : 'Cagnotte Stylistes'}
                    </span>
                    <span className="text-[10px] font-bold bg-[#3D2817] text-[#FB923C] px-2 py-0.5 rounded-full inline-block mt-1 border border-[#FB923C]/30">
                      ~40% prestations
                    </span>
                  </div>
                  <div className="text-xl font-black text-white tabular-nums font-mono relative z-10">
                    {formatMoney(totalCommissionPool)}
                  </div>

                  {/* Sparkline Amber Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-[#FB923C]/15"
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
                      stroke="#FB923C"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* 2. Recent Appointments Feed Pod Tray (Bottom) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'جدول مواعيد اليوم' : 'Programme & File des Soins'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'ar' ? 'إدارة سريعة لتسكين العملاء وإنهاء الجلسات' : 'Installation en fauteuil et validation des prestations.'}
                  </p>
                </div>

                {/* Filter Capsule Group */}
                <div className="bg-white dark:bg-neutral-800 p-0.5 rounded-[10px] border border-[#E9EEF0] dark:border-neutral-700 flex items-center shadow-2xs">
                  {(['Tous', 'InChair', 'Confirmed', 'Completed'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setActivityFilter(filterKey)}
                      className={`px-2.5 py-1 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                        activityFilter === filterKey
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {filterKey === 'Tous'
                        ? 'Tous'
                        : filterKey === 'InChair'
                        ? 'En Fauteuil'
                        : filterKey === 'Confirmed'
                        ? 'Confirmés'
                        : 'Terminés'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredActivityAppointments.length > 0 ? (
                  filteredActivityAppointments.map((apt) => {
                    const isInChair = apt.status === 'InChair';
                    const isCompleted = apt.status === 'Completed';

                    return (
                      <div
                        key={apt.id}
                        className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between gap-3 shadow-2xs hover:border-[#C4785A]/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 text-center py-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
                            {apt.startTime}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                {apt.clientName}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {apt.clientPhone}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                              <span className="font-semibold text-[#C4785A]">{apt.serviceName}</span>
                              <span>·</span>
                              <span>{apt.staffName}</span>
                              <span>·</span>
                              <span>{apt.durationMinutes} min</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
                            {formatMoney(apt.price)}
                          </span>

                          {isInChair ? (
                            <button
                              type="button"
                              onClick={() => handleCompleteApt(apt)}
                              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <CheckCircle2 size={12} />
                              <span>Terminer</span>
                            </button>
                          ) : !isCompleted ? (
                            <button
                              type="button"
                              onClick={() => handleSeatClient(apt)}
                              className="h-7 px-2.5 rounded-lg bg-[#C4785A] hover:opacity-90 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-opacity"
                            >
                              <Play size={11} />
                              <span>Installer</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Terminé
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-neutral-400 bg-white dark:bg-neutral-800 rounded-xl border border-[#E9EEF0] dark:border-neutral-700/60">
                    Aucun rendez-vous pour ce filtre.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Live Workstations Monitor Pod Tray */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'مراقبة المقاعد والكبائن في الوقت الفعلي' : 'Postes de Travail & Fauteuils en Direct'}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold font-mono">
                {workstations.length} Postes
              </span>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Live Chair Allocation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {workstations.map((w) => {
              const apt = w.currentApt;
              const isInChair = apt?.status === 'InChair';
              const isConfirmed = apt?.status === 'Confirmed';

              return (
                <div
                  key={w.id}
                  className={`p-4 rounded-[18px] border transition-all shadow-2xs ${
                    isInChair
                      ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/15'
                      : isConfirmed
                      ? 'bg-blue-500/5 border-blue-500/20 dark:bg-blue-500/10'
                      : 'bg-white dark:bg-neutral-800 border-[#E9EEF0] dark:border-neutral-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                        {w.type}
                      </span>
                      <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[170px]">
                        {w.name}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isInChair
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          : isConfirmed
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}
                    >
                      {isInChair ? 'En Fauteuil' : isConfirmed ? 'Attendu' : 'Disponible'}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-neutral-400" />
                    <span>{w.staffName}</span>
                  </div>

                  {apt ? (
                    <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-900 dark:text-white truncate">
                          {apt.clientName}
                        </span>
                        <span className="font-mono text-[11px] text-[#C4785A] font-bold shrink-0">
                          {apt.startTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                        {apt.serviceName}
                      </p>

                      {apt.colorFormula && (
                        <div className="p-1.5 bg-neutral-100 dark:bg-neutral-700/60 rounded-lg text-[10px] text-neutral-600 dark:text-neutral-300 font-mono truncate">
                          🧪 {apt.colorFormula}
                        </div>
                      )}

                      <div className="pt-1 flex items-center gap-1.5">
                        {isInChair ? (
                          <AtriumButton
                            size="xs"
                            variant="secondary"
                            className="w-full text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                            icon={<CheckCircle2 className="w-3 h-3" />}
                            onClick={() => handleCompleteApt(apt)}
                          >
                            Terminer le Soin
                          </AtriumButton>
                        ) : (
                          <AtriumButton
                            size="xs"
                            variant="primary"
                            className="w-full"
                            icon={<Play className="w-3 h-3" />}
                            onClick={() => handleSeatClient(apt)}
                          >
                            Installer
                          </AtriumButton>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-700 text-center">
                      <span className="text-[11px] text-neutral-400">Poste libre pour client sans RDV</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Appointment Modal */}
      {isNewAptModalOpen && (
        <AppointmentModal
          isOpen={isNewAptModalOpen}
          onClose={() => setIsNewAptModalOpen(false)}
        />
      )}
    </div>
  );
};

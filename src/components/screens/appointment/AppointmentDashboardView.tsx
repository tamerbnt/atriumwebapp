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
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    updateAppointmentStatus,
    resetSalonMockData,
    language,
    showToast,
  } = useAtriumStore();

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);
  const [selectedStylistFilter, setSelectedStylistFilter] = useState<string>('All');

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

  // Stylist performance stats
  const stylistStats = useMemo(() => {
    return (staff || []).map((member) => {
      const memberApts = todayAppointments.filter((a) => a.staffId === member.id || a.staffName === member.fullName);
      const revenue = memberApts.reduce((sum, a) => sum + (a.price || 0), 0);
      const completed = memberApts.filter((a) => a.status === 'Completed').length;
      return {
        staff: member,
        aptsCount: memberApts.length,
        completedCount: completed,
        revenue,
      };
    });
  }, [staff, todayAppointments]);

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
                  Tableau de Bord Salon & Spa
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Luxe Aesthetics
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Suivi en temps réel des fauteuils, du planning cabines et de la recette journalière.
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
                    Salons & Instituts
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left rtl:text-right text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-between"
                    >
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{b.name}</span>
                      {b.id === currentBranch?.id && <span className="text-[#C4785A] text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demo Data Reset */}
            <button
              type="button"
              onClick={() => resetSalonMockData()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Recharger le catalogue de soins et les rendez-vous"
            >
              <RefreshCw size={13} className="text-neutral-500" />
              <span>Démo Salon</span>
            </button>

            {/* New Appointment Primary Action */}
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setIsNewAptModalOpen(true)}
            >
              Nouveau RDV
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Rendez-vous Aujourd'hui */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Rendez-vous Aujourd'hui
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {totalTodayCount} soins
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {totalTodayCount}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                  <span className="text-amber-600 font-semibold">{inChairCount} en fauteuil</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-semibold">{completedCount} terminés</span>
                </div>
              </div>
            </div>

            {/* Card 2: Taux d'Occupation & Panier Moyen */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Occupation & Panier Moyen
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {activeWorkstationCount} / {workstations.length} postes
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {occupancyRate}%
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                  <CreditCard size={13} className="text-indigo-500" />
                  <span>Panier moyen: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(avgTicket)}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  Recette Prévisionnelle & Commissions
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  ~{formatMoney(totalCommissionPool)} comm.
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(totalTodayRevenue)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1.5">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>{formatMoney(completedRevenue)} déjà encaissés</span>
                  </span>
                  <span className="font-mono text-stone-300">DZD</span>
                </div>
              </div>

              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Workstations Live Monitor Pod Tray */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Postes & Fauteuils en Direct
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold font-mono">
                {workstations.length} Postes
              </span>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Actualisé en temps réel</span>
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

        {/* Two-Column Bottom Pod: Agenda Today + Stylist Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Agenda Today (7 cols) */}
          <div className="lg:col-span-7 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Programme du Jour ({todayAppointments.length} RDV)
                </h3>
                <span className="text-xs text-neutral-500">
                  Déroulé chronologique de la journée du {todayStr}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between gap-3 shadow-2xs"
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
                          <span className="font-medium text-[#C4785A]">{apt.serviceName}</span>
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

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : apt.status === 'InChair'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}
                      >
                        {apt.status === 'Completed'
                          ? 'Terminé'
                          : apt.status === 'InChair'
                          ? 'En Fauteuil'
                          : 'Confirmé'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-neutral-400 bg-white dark:bg-neutral-800 rounded-xl border border-[#E9EEF0] dark:border-neutral-700/60">
                  Aucun rendez-vous enregistré pour aujourd'hui.
                </div>
              )}
            </div>
          </div>

          {/* Stylist Performance & Commissions (5 cols) */}
          <div className="lg:col-span-5 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Équipe & Stylistes
              </h3>
              <span className="text-[11px] text-[#C4785A] font-semibold">Commissions du jour</span>
            </div>

            <div className="space-y-2.5">
              {stylistStats.map((item) => (
                <div
                  key={item.staff.id}
                  className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-xs font-bold">
                        {item.staff.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {item.staff.fullName}
                        </h4>
                        <span className="text-[10px] text-neutral-400">{item.staff.role}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums font-mono block">
                        {formatMoney(item.revenue)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                        ~{formatMoney(Math.round(item.revenue * 0.4))} comm.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 dark:border-neutral-700">
                    <span>{item.aptsCount} RDV prévus</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {item.completedCount} terminés
                    </span>
                  </div>
                </div>
              ))}
            </div>
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

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
      name: 'Fauteuil 2 · Coupe & Brushing',
      staffName: 'Leila Mansouri',
      type: 'Fauteuil Coiffage',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_02' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_02' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_03',
      name: 'Bac de Lavage & Détox',
      staffName: 'Partagé',
      type: 'Station Lavage',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_03' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_03' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_04',
      name: 'Station Onglerie Russe & Gel-X',
      staffName: 'Yasmine Chergui',
      type: 'Bar à Ongles',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_04' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_04' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_05',
      name: 'Cabine Spa & HydraFacial',
      staffName: 'Amina Haddad',
      type: 'Cabine Privée',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_05' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_05' && a.status === 'Confirmed'),
    },
    {
      id: 'chair_06',
      name: 'Salon VIP Mariée & Haute Coiffure',
      staffName: 'Direction Artistique',
      type: 'Suite Prestige',
      currentApt: todayAppointments.find((a) => a.chairId === 'chair_06' && a.status === 'InChair') ||
                  todayAppointments.find((a) => a.chairId === 'chair_06' && a.status === 'Confirmed'),
    },
  ], [todayAppointments]);

  const activeWorkstationCount = workstations.filter((w) => w.currentApt && w.currentApt.status === 'InChair').length;
  const occupancyRate = Math.round((activeWorkstationCount / workstations.length) * 100);

  // Stylists performance summary
  const stylistStats = useMemo(() => {
    const salonStaff = (staff || []).filter((s) => s.isActive);
    return salonStaff.map((s) => {
      const apts = todayAppointments.filter((a) => a.staffId === s.id);
      const rev = apts.reduce((sum, a) => sum + (a.price || 0), 0);
      const completed = apts.filter((a) => a.status === 'Completed').length;
      return {
        staff: s,
        aptsCount: apts.length,
        revenue: rev,
        completedCount: completed,
      };
    });
  }, [staff, todayAppointments]);

  const handleSeatClient = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'InChair');
    showToast({
      type: 'info',
      title: 'Cliente installée en fauteuil',
      message: `${apt.clientName} est maintenant installée pour "${apt.serviceName}".`,
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
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Tableau de Bord Salon & Spa
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Luxe Aesthetics
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Suivi en temps réel des fauteuils, du planning cabines et de la recette journalière.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Facility Branch Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setIsFacilityDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span className="font-semibold">{currentBranch?.name || 'Luxe Spa Hydra'}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Salons & Instituts
                </div>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBranch(b.id);
                      setIsFacilityDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors ${
                      b.id === currentBranch?.id
                        ? 'text-[#C4785A] font-semibold bg-[#C4785A]/5'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{b.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 1-Click Demo Data Recharge Button */}
          <AtriumButton
            variant="outline"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => resetSalonMockData()}
            title="Recharger le catalogue de soins, les diagnostics et les rendez-vous d'Alger"
          >
            Recharger Démo Salon
          </AtriumButton>

          {/* New Appointment Primary Action */}
          <AtriumButton
            variant="primary"
            size="sm"
            glow
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsNewAptModalOpen(true)}
          >
            Nouveau RDV
          </AtriumButton>
        </div>
      </div>

      {/* Hero Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Rendez-vous Aujourd'hui</span>
            <Calendar className="w-4 h-4 text-[#C4785A]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {totalTodayCount}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
            <span className="text-amber-600 font-semibold">{inChairCount} en fauteuil</span>
            <span>·</span>
            <span className="text-emerald-600 font-semibold">{completedCount} terminés</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Occupation des Postes</span>
            <Scissors className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {occupancyRate}%
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {activeWorkstationCount} / {workstations.length}
            </span>
            <span>postes actuellement actifs</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Recette Prévisionnelle</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(totalTodayRevenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <span className="text-emerald-600 font-semibold">{formatMoney(completedRevenue)}</span>
            <span>déjà encaissés</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Panier Moyen Prestation</span>
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(avgTicket)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <span>Basé sur les soins programmés</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Workstations & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Physical Workstations Live Monitor (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Postes & Fauteuils en Direct
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                6 Postes
              </span>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Actualisé en temps réel</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {workstations.map((w) => {
              const apt = w.currentApt;
              const isInChair = apt?.status === 'InChair';
              const isConfirmed = apt?.status === 'Confirmed';

              return (
                <div
                  key={w.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isInChair
                      ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-500/10'
                      : isConfirmed
                      ? 'bg-blue-500/5 border-blue-500/20 dark:bg-blue-500/10'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                        {w.type}
                      </span>
                      <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">
                        {w.name}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
                    <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-900 dark:text-white truncate">
                          {apt.clientName}
                        </span>
                        <span className="font-mono text-[11px] text-[#C4785A] font-semibold shrink-0">
                          {apt.startTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                        {apt.serviceName}
                      </p>

                      {apt.colorFormula && (
                        <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg text-[10px] text-neutral-600 dark:text-neutral-300 font-mono truncate">
                          🧪 {apt.colorFormula}
                        </div>
                      )}

                      <div className="pt-1 flex items-center gap-1.5">
                        {isInChair ? (
                          <button
                            onClick={() => handleCompleteApt(apt)}
                            className="w-full py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terminer le Soin</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSeatClient(apt)}
                            className="w-full py-1 text-[11px] font-medium bg-[#C4785A] hover:bg-[#b3684a] text-white rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Installer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800 text-center">
                      <span className="text-[11px] text-neutral-400">Poste libre pour client sans RDV</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today's Appointment Agenda Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Programme du Jour ({todayAppointments.length} RDV)
                </h3>
                <span className="text-xs text-neutral-500">
                  Déroulé chronologique de la journée du {todayStr}
                </span>
              </div>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-[380px] overflow-y-auto">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-center py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {apt.startTime}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {apt.clientName}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {apt.clientPhone}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="font-medium text-[#C4785A]">{apt.serviceName}</span>
                          <span>·</span>
                          <span>{apt.staffName}</span>
                          <span>·</span>
                          <span>{apt.durationMinutes} min</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums">
                        {formatMoney(apt.price)}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
                <div className="py-8 text-center text-xs text-neutral-400">
                  Aucun rendez-vous enregistré pour aujourd'hui.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stylist Productivity & Top Treatments */}
        <div className="space-y-6">
          {/* Stylist Performance Leaderboard */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Équipe & Stylistes
              </h3>
              <span className="text-[11px] text-[#C4785A] font-semibold">Commissions du jour</span>
            </div>

            <div className="space-y-3">
              {stylistStats.map((item) => (
                <div
                  key={item.staff.id}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60"
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
                      <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums block">
                        {formatMoney(item.revenue)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        ~{formatMoney(Math.round(item.revenue * 0.4))} comm.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-200/50 dark:border-neutral-700/50">
                    <span>{item.aptsCount} RDV prévus</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {item.completedCount} terminés
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Salon Treatments */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">
              Soins & Prestations Phares
            </h3>

            <div className="space-y-2.5">
              {(servicesCatalog || []).slice(0, 5).map((srv) => (
                <div
                  key={srv.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100 dark:border-neutral-800/60 last:border-0"
                >
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 block truncate max-w-[170px]">
                      {srv.name}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {srv.category} · {srv.durationMinutes} min
                    </span>
                  </div>
                  <span className="font-bold text-[#C4785A] tabular-nums">
                    {formatMoney(srv.price)}
                  </span>
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

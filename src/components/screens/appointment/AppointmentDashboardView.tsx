import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  TrendingUp,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { Appointment, AppointmentStatus } from '../../../types/index';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { useTranslation } from '../../../utils/useTranslation';

export const AppointmentDashboardView: React.FC = () => {
  const { language } = useTranslation();
  const {
    appointments,
    staff,
    currentBusiness,
    currentBranch,
    updateAppointmentStatus,
    setScreen,
  } = useAtriumStore();

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr || true).slice(0, 8);
  }, [appointments, todayStr]);

  const inChairCount = useMemo(() => {
    return appointments.filter((a) => a.status === 'InChair').length;
  }, [appointments]);

  const completedTodayCount = useMemo(() => {
    return appointments.filter((a) => a.status === 'Completed').length;
  }, [appointments]);

  const totalRevenue = useMemo(() => {
    return appointments
      .filter((a) => a.status === 'Completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);
  }, [appointments]);

  const handleUpdateStatus = (aptId: string, nextStatus: AppointmentStatus) => {
    updateAppointmentStatus(aptId, nextStatus);
    showToast({
      type: 'success',
      title: 'Statut rendez-vous mis à jour',
      message: `Statut passé à: ${nextStatus}`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Scissors size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                  {currentBusiness.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {language === 'ar' ? 'صالون وتجميل ومواعيد' : language === 'fr' ? 'Salon & Prise de Rendez-vous' : 'Appointment & Salon'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {language === 'ar' ? 'إدارة الكراسي والخدمات والمصففين' : language === 'fr' ? 'Gestion des postes de coiffure, esthétique et soins' : 'Workstations & Stylist Timetable'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAppointmentModalOpen(true)}
              className="h-10 px-4 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>{language === 'ar' ? 'حجز موعد جديد' : language === 'fr' ? 'Nouveau Rendez-vous' : 'Book Appointment'}</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">Rendez-vous Aujourd'hui</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {todayAppointments.length}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Planning salon</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">En Fauteuil Actuellement</span>
            <span className="text-xl font-black text-amber-600 tabular-nums mt-1 block">
              {inChairCount}
            </span>
            <span className="text-[10px] text-amber-700/80 block mt-0.5">Soins en cours</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">Prestations Complétées</span>
            <span className="text-xl font-black text-emerald-600 tabular-nums mt-1 block">
              {completedTodayCount}
            </span>
            <span className="text-[10px] text-emerald-700/80 block mt-0.5">Prêtes à encaisser</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">Chiffre d'Affaires Réalisé</span>
            <span className="text-xl font-black text-[#C4785A] tabular-nums mt-1 block">
              {formatMoney(totalRevenue, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Prestations terminées</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Appointments Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Planning des Rendez-vous du Jour ({todayAppointments.length})
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Suivi en direct des postes de coiffure, esthétique et soins
            </p>
          </div>

          <button
            type="button"
            onClick={() => setScreen('scheduler')}
            className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Vue Colonnes Stylistes</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
          {todayAppointments.map((apt) => (
            <div
              key={apt.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                  <span className="text-xs">{apt.startTime}</span>
                  <span className="text-[9px] text-neutral-400">{apt.durationMinutes || 45}m</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {apt.clientName}
                    </span>
                    <span className="text-neutral-400 text-[11px] font-mono">
                      {apt.clientPhone}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 block mt-0.5">
                    Prestation: <strong className="text-neutral-800 dark:text-neutral-200">{apt.serviceName}</strong> · Styliste: {apt.staffName || 'Staff Salon'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-neutral-900 dark:text-white tabular-nums text-sm">
                  {formatMoney(apt.price, language)}
                </span>

                <div className="flex items-center gap-1.5">
                  {apt.status === 'Confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(apt.id, 'InChair')}
                      className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 cursor-pointer"
                    >
                      Installer au fauteuil
                    </button>
                  )}

                  {apt.status === 'InChair' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                      className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 cursor-pointer"
                    >
                      Terminer & Encaisser
                    </button>
                  )}

                  {apt.status === 'Completed' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                      Complété ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {todayAppointments.length === 0 && (
            <div className="py-16 text-center text-xs text-neutral-400">
              Aucun rendez-vous prévu pour aujourd'hui.
            </div>
          )}
        </div>
      </div>

      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
      />
    </div>
  );
};

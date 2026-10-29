import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Filter,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalAppointmentModal } from './MedicalAppointmentModal';
import { MedicalAppointmentSlot } from '../../../types';

export const MedicalAgendaView: React.FC = () => {
  const { language } = useAtriumStore();
  const {
    practitioners,
    appointments,
    patients,
    addAppointment,
    updateAppointmentStatus,
  } = useMedicalData();

  const [selectedDate, setSelectedDate] = useState('2026-05-10');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState<number>(30);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeSlotData, setActiveSlotData] = useState<{ doctorId?: string; time?: string }>({});

  // Filter practitioners based on selector
  const activePractitioners =
    selectedDoctorFilter === 'all'
      ? practitioners
      : practitioners.filter((p) => p.id === selectedDoctorFilter);

  // Generate hourly time slots: 08:00 to 17:30
  const timeSlots: string[] = [];
  const startHour = 8;
  const endHour = 18;
  for (let h = startHour; h < endHour; h++) {
    const hourStr = h.toString().padStart(2, '0');
    if (slotIntervalMinutes === 15) {
      timeSlots.push(`${hourStr}:00`, `${hourStr}:15`, `${hourStr}:30`, `${hourStr}:45`);
    } else if (slotIntervalMinutes === 30) {
      timeSlots.push(`${hourStr}:00`, `${hourStr}:30`);
    } else {
      timeSlots.push(`${hourStr}:00`, `${hourStr}:45`);
    }
  }

  const handleOpenBooking = (doctorId: string, time: string) => {
    setActiveSlotData({ doctorId, time });
    setIsBookingModalOpen(true);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const getStatusBadge = (status: MedicalAppointmentSlot['status']) => {
    switch (status) {
      case 'InRoom':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'Arrived':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'Completed':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'Cancelled':
      case 'NoShow':
        return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
      case 'Booked':
      default:
        return 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 border-neutral-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Navigation Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center font-bold shadow-xs">
            <Calendar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أجندة مواعيد الأطباء' : 'Agenda Multi-Praticiens & Rendez-vous'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D9488]/15 text-[#0D9488]">
                Polyclinique
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Planning synchronisé des consultations et affectation des cabinets
            </p>
          </div>
        </div>

        {/* Date Selector & Primary Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-1 shadow-2xs">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
              title="Jour précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-semibold font-mono bg-transparent text-neutral-900 dark:text-white border-0 focus:outline-hidden"
            />
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
              title="Jour suivant"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <AtriumButton
            variant="primary"
            onClick={() => {
              setActiveSlotData({});
              setIsBookingModalOpen(true);
            }}
            icon={<Plus size={15} />}
          >
            Nouveau RDV
          </AtriumButton>
        </div>
      </div>

      {/* Practitioner Filter Capsules & Slot Interval */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Doctor Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedDoctorFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDoctorFilter === 'all'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
            }`}
          >
            Tous les Médecins ({practitioners.length})
          </button>

          {practitioners.map((doc) => {
            const isSelected = selectedDoctorFilter === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDoctorFilter(doc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs border-2'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                }`}
                style={{ borderColor: isSelected ? doc.color : undefined }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: doc.color }} />
                <span>{doc.fullName}</span>
                <span className="text-[10px] text-neutral-400 font-mono">({doc.roomNumber})</span>
              </button>
            );
          })}
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
          <span className="text-[11px] text-neutral-400 px-2 font-medium">Créneau:</span>
          {[15, 30, 45].map((interval) => (
            <button
              key={interval}
              onClick={() => setSlotIntervalMinutes(interval)}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                slotIntervalMinutes === interval
                  ? 'bg-[#C4785A] text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {interval}m
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Column Timeline Canvas */}
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xs">
        {/* Table Column Headers */}
        <div className="grid grid-cols-12 bg-[#F8F9FA] dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
          {/* Time Gutter Header */}
          <div className="col-span-1 p-3.5 text-center text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-800">
            Heure
          </div>

          {/* Practitioner Columns */}
          <div className="col-span-11 grid" style={{ gridTemplateColumns: `repeat(${activePractitioners.length}, minmax(0, 1fr))` }}>
            {activePractitioners.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: doc.color }} />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {doc.fullName}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">
                    {doc.specialty} · <strong className="text-neutral-700 dark:text-neutral-300">{doc.roomNumber}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Grid Rows */}
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[600px] overflow-y-auto">
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-12 min-h-[56px] hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
              {/* Time Label */}
              <div className="col-span-1 p-2 text-center text-xs font-mono font-bold text-neutral-500 border-r border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                {time}
              </div>

              {/* Columns for each doctor */}
              <div className="col-span-11 grid" style={{ gridTemplateColumns: `repeat(${activePractitioners.length}, minmax(0, 1fr))` }}>
                {activePractitioners.map((doc) => {
                  // Find appointment matching doctor, date, and startTime
                  const matchApt = appointments.find(
                    (a) => a.doctorId === doc.id && a.date === selectedDate && a.startTime === time
                  );

                  return (
                    <div
                      key={doc.id}
                      onClick={() => !matchApt && handleOpenBooking(doc.id, time)}
                      className={`p-1.5 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 relative group ${
                        !matchApt ? 'cursor-pointer hover:bg-[#0D9488]/5 transition-colors' : ''
                      }`}
                    >
                      {matchApt ? (
                        <div
                          className={`h-full p-2 rounded-xl border flex flex-col justify-between shadow-2xs transition-all ${getStatusBadge(
                            matchApt.status
                          )}`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-xs truncate">{matchApt.patientName}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-white/50 dark:bg-black/30">
                                {matchApt.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-600 dark:text-neutral-300 truncate">
                              {matchApt.reason}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-black/5 dark:border-white/5 font-mono">
                            <span>{matchApt.durationMinutes} min</span>
                            <div className="flex items-center gap-1">
                              {matchApt.status === 'Booked' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAppointmentStatus(matchApt.id, 'Arrived');
                                  }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white"
                                  title="Marquer comme arrivé en salle d'attente"
                                >
                                  Arrivé
                                </button>
                              )}
                              {matchApt.status === 'Arrived' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAppointmentStatus(matchApt.id, 'InRoom');
                                  }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white"
                                  title="Faire entrer en consultation"
                                >
                                  En Salle
                                </button>
                              )}
                              {matchApt.status === 'InRoom' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAppointmentStatus(matchApt.id, 'Completed');
                                  }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white"
                                  title="Terminer consultation"
                                >
                                  Terminé
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full rounded-lg border border-dashed border-transparent group-hover:border-[#0D9488]/40 flex items-center justify-center text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          + Réserver
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      <MedicalAppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        practitioners={practitioners}
        patients={patients}
        onSaveAppointment={addAppointment}
        initialDoctorId={activeSlotData.doctorId}
        initialDate={selectedDate}
        initialTime={activeSlotData.time}
      />
    </div>
  );
};

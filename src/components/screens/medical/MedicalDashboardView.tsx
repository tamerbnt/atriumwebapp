import React, { useState } from 'react';
import {
  Activity,
  UserPlus,
  Stethoscope,
  HeartPulse,
  Clock,
  UserCheck,
  CreditCard,
  Pill,
  ShieldCheck,
  ChevronRight,
  Tv,
  Users,
  Sparkles,
  Building2,
  Calendar,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalPatientModal } from './MedicalPatientModal';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalWaitingRoomTvModal } from './MedicalWaitingRoomTvModal';

export const MedicalDashboardView: React.FC = () => {
  const { language, setScreen } = useAtriumStore();
  const {
    patients,
    consultations,
    practitioners,
    prescriptions,
    addPatient,
    addConsultation,
    updateConsultationStatus,
  } = useMedicalData();

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);

  const waitingCount = consultations.filter((c) => c.status === 'InWaitingQueue').length;
  const inProgressCount = consultations.filter((c) => c.status === 'InConsultation' || (c as any).status === 'InProgress').length;
  const completedToday = consultations.filter((c) => c.status === 'Completed').length;
  const totalRevenue = consultations.reduce((acc, c) => acc + (c.isPaid ? c.consultationFeeDzd : 0), 0);
  const chifaShareTotal = consultations.reduce((acc, c) => acc + (c.isPaid ? c.insuranceShareDzd : 0), 0);
  const copayTotal = consultations.reduce((acc, c) => acc + (c.isPaid ? c.copayAmountDzd : 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center font-bold shadow-xs">
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المركز الطبي والعيادات السريرية' : language === 'fr' ? 'Centre Médical & Polyclinique' : 'Medical Center & Polyclinic'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D9488]/15 text-[#0D9488]">
                Polyclinic OS
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'لوحة المتابعة السريرية، مؤشرات الفحص والنشاط اليومي'
                : 'Pilotage polyclinique, flux d\'attente temps réel et télétransmission Chifa'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Waiting Room TV Button */}
          <AtriumButton
            variant="secondary"
            onClick={() => setIsTvModalOpen(true)}
            icon={<Tv size={14} className="text-[#0D9488]" />}
          >
            Écran Salle d'Attente
          </AtriumButton>

          <AtriumButton
            variant="secondary"
            onClick={() => setIsPatientModalOpen(true)}
            icon={<UserPlus size={14} />}
          >
            {language === 'ar' ? 'مريض جديد' : 'Nouveau Patient'}
          </AtriumButton>

          <AtriumButton
            variant="primary"
            onClick={() => setIsConsultationModalOpen(true)}
            icon={<Stethoscope size={14} />}
          >
            {language === 'ar' ? 'فحص / استشارة' : 'Nouvelle Consultation'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات النشاط العيادي والتدفق' : 'Indicateurs d\'Activité Clinique & Flux Patients'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة قائمة الانتظار، الملفات الطبية الإلكترونية وتغطية بطاقة الشفاء' : 'File d\'attente temps réel, dossiers médicaux partagés et télétransmission Chifa'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: File d'attente active */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'المرضى في الانتظار' : 'File d\'Attente Active'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {waitingCount}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                {inProgressCount} {language === 'ar' ? 'حالياً في الفحص' : 'actuellement en consultation'}
              </p>
            </div>
          </div>

          {/* Card 2: Consultations Clôturées */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'فحوصات مكتملة اليوم' : 'Consultations Clôturées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {completedToday}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Sur {patients.length} dossiers patients actifs
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                Recettes & Chifa Tiers-Payant
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                CNAS / CASNOS
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {formatMoney(totalRevenue, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center justify-between">
                <span>Chifa: {formatMoney(chifaShareTotal, 'DZD')}</span>
                <span>Ticket: {formatMoney(copayTotal, 'DZD')}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Lower Workspace */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column (60%): Live Consultation Stream */}
        <div className="col-span-12 lg:col-span-7 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#0D9488]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Flux Live des Consultations du Jour
              </h2>
            </div>
            <button
              onClick={() => setScreen('scheduler')}
              className="text-xs text-[#0D9488] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>Gérer la file d'attente</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs divide-y divide-neutral-100 dark:divide-neutral-800">
            {consultations.slice(0, 6).map((cons) => (
              <div key={cons.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-750 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center font-mono font-bold text-xs text-neutral-700 dark:text-neutral-200">
                    {cons.ticketNumber || 'T-—'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        {cons.patientName}
                      </span>
                      {cons.urgencyLevel === 'Urgence' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/15 text-red-600">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate max-w-xs">
                      {cons.chiefComplaint}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {cons.doctorName || 'Dr. Benali'} · {cons.cabinetRoom || 'Cabinet 1'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                      cons.status === 'InWaitingQueue'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : cons.status === 'InConsultation' || (cons as any).status === 'InProgress'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {cons.status === 'InWaitingQueue'
                      ? 'En attente'
                      : cons.status === 'InConsultation' || (cons as any).status === 'InProgress'
                      ? 'En consultation'
                      : 'Clôturé'}
                  </span>

                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {formatMoney(cons.consultationFeeDzd, 'DZD')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (40%): Active Medical Practitioners Roster */}
        <div className="col-span-12 lg:col-span-5 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Corps Médical & Cabinets Actifs
              </h2>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">
              {practitioners.filter((p) => p.isAvailable).length}/{practitioners.length} en poste
            </span>
          </div>

          <div className="space-y-3">
            {practitioners.map((doc) => {
              const isDocActive = consultations.some(
                (c) => c.staffId === doc.id && (c.status === 'InConsultation' || (c as any).status === 'InProgress')
              );

              return (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs"
                      style={{ backgroundColor: doc.color }}
                    >
                      {doc.fullName.slice(4, 6).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                          {doc.fullName}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {doc.roomNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block">{doc.specialty}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{doc.licenseNumber}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isDocActive
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : doc.isAvailable
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDocActive ? 'bg-amber-500 animate-ping' : doc.isAvailable ? 'bg-emerald-500' : 'bg-neutral-400'
                        }`}
                      />
                      <span>{isDocActive ? 'En Séance' : doc.isAvailable ? 'Disponible' : 'Absent'}</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono block mt-1">
                      Part: {doc.commissionRatePercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reusable Modals */}
      <MedicalPatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSave={addPatient}
      />

      <MedicalConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        patients={patients}
        onSave={addConsultation}
      />

      <MedicalWaitingRoomTvModal
        isOpen={isTvModalOpen}
        onClose={() => setIsTvModalOpen(false)}
        consultations={consultations}
        practitioners={practitioners}
      />
    </div>
  );
};

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
  Sparkles,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalPatientModal } from './MedicalPatientModal';
import { MedicalConsultationModal } from './MedicalConsultationModal';

export const MedicalDashboardView: React.FC = () => {
  const { language, setScreen } = useAtriumStore();
  const { patients, consultations, prescriptions, addPatient, addConsultation } = useMedicalData();

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  const waitingCount = consultations.filter((c) => c.status === 'InWaitingQueue').length;
  const inProgressCount = consultations.filter((c) => c.status === 'InProgress').length;
  const completedToday = consultations.filter((c) => c.status === 'Completed').length;
  const totalRevenue = consultations.reduce((acc, c) => acc + (c.isPaid ? c.consultationFeeDzd : 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المركز الطبي والعيادات السريرية' : language === 'fr' ? 'Cabinet Médical & Polyclinique' : 'Medical Clinic & Health Center'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Facility: 18
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'لوحة المتابعة السريرية، مؤشرات الفحص والنشاط اليومي'
                : 'Tableau de bord clinique, flux de patients & télétransmission Chifa'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                {language === 'ar' ? 'المداخيل وأتعاب العيادة' : 'Honoraires & Télétransmission'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                CHIFA / CNAS 100%
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {formatMoney(totalRevenue, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>Recettes cliniques validées</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Queue Overview Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="p-5 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'نظرة سريعة على غرفة الانتظار' : 'Aperçu Rapide de la Salle d\'Attente'}
              </h2>
            </div>
            <button
              onClick={() => setScreen('scheduler')}
              className="text-xs text-[#C4785A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض القائمة الكاملة' : 'Gérer la file'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {consultations.slice(0, 5).map((cons) => (
              <div key={cons.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300">
                    {cons.patientName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      {cons.patientName}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {cons.chiefComplaint}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                      cons.status === 'InWaitingQueue'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : cons.status === 'InProgress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {cons.status === 'InWaitingQueue'
                      ? (language === 'ar' ? 'قيد الانتظار' : 'En attente')
                      : cons.status === 'InProgress'
                      ? (language === 'ar' ? 'في الفحص' : 'En consultation')
                      : (language === 'ar' ? 'مكتمل' : 'Clôturé')}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {formatMoney(cons.consultationFeeDzd, 'DZD')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  );
};

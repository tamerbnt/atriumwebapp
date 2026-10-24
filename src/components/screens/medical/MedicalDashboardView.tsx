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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Top Header Strip with Action Toolbar (Zero duplicate tabs!) */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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

      {/* Main Content Area */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {language === 'ar' ? 'المرضى في الانتظار' : 'File d\'attente active'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {waitingCount}
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                {language === 'ar' ? 'في الانتظار' : 'En attente'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {language === 'ar' ? 'فحوصات مكتملة اليوم' : 'Consultations clôturées'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Activity size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {completedToday}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {language === 'ar' ? 'اليوم' : 'Aujourd\'hui'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {language === 'ar' ? 'إجمالي ملفات المرضى' : 'Dossiers Patients (EHR)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {patients.length}
              </span>
              <span className="text-xs text-neutral-400">
                {language === 'ar' ? 'ملف مسجل' : 'Actifs'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {language === 'ar' ? 'المداخيل المحصلة' : 'Recettes encaissées'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(totalRevenue, language)}
              </span>
            </div>
          </div>
        </div>

        {/* Live Queue Overview Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
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
                    {formatMoney(cons.consultationFeeDzd, language)}
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

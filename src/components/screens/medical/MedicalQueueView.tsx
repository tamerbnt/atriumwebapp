import React, { useState } from 'react';
import {
  Clock,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  HeartPulse,
  Eye,
  Plus,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { MedicalConsultationModal } from './MedicalConsultationModal';

export const MedicalQueueView: React.FC = () => {
  const { language } = useAtriumStore();
  const { consultations, patients, updateConsultationStatus, addConsultation } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_progress' | 'completed'>('all');
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);

  const filtered = consultations.filter((c) => {
    const matchesSearch =
      c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'waiting') return c.status === 'InWaitingQueue';
    if (statusFilter === 'in_progress') return c.status === 'InProgress';
    if (statusFilter === 'completed') return c.status === 'Completed';
    return true;
  });

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'Tous les états' },
    { value: 'waiting', label: language === 'ar' ? 'في الانتظار' : 'En attente' },
    { value: 'in_progress', label: language === 'ar' ? 'في الفحص' : 'En consultation' },
    { value: 'completed', label: language === 'ar' ? 'مكتمل' : 'Clôturés' },
  ];

  const waitingCount = consultations.filter((c) => c.status === 'InWaitingQueue').length;
  const inProgressCount = consultations.filter((c) => c.status === 'InProgress').length;
  const completedCount = consultations.filter((c) => c.status === 'Completed').length;

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'قائمة الانتظار والفرز السريري' : 'File d\'Attente & Triage Clinique'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {waitingCount} {language === 'ar' ? 'في الانتظار' : 'en attente'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة دور الدخول للعيادة، العلامات الحيوية، وأولويات الكشف الطبي'
                : 'Priorités de passage, constantes vitales & suivi en temps réel de la consultation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsConsultModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'قبول مريض جديد' : 'Admettre un Patient'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات تدفق المرضى وأوقات الانتظار' : 'Flux Salle d\'Attente & Triage des Urgences'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة حية للعلامات الحيوية وحالات الكشف السريري' : 'Constantes vitales (TA, Température, Poids) et affectation en cabinet'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Patients en attente */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'مرضى في الانتظار' : 'Patients en Salle d\'Attente'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {waitingCount}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                Priorité selon ordre d'admission
              </p>
            </div>
          </div>

          {/* Card 2: En cours de consultation */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'حالياً في الفحص' : 'En Examen Médical'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                {inProgressCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Cabinet de consultation actif
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'إجمالي الفحوصات' : 'Prise en Charge Clinique'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                SLA & TRIAGE
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {completedCount} / {consultations.length}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>Consultations clôturées avec succès</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation: Data Collection Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث عن مريض أو تشخيص...' : 'Rechercher patient ou motif...'}
            />
            <FilterSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={filterOptions}
            />
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {filtered.length} {language === 'ar' ? 'استشارة مسجلة' : 'consultations trouvées'}
          </div>
        </div>

        {/* Queue Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cons, index) => (
            <div
              key={cons.id}
              className={`bg-white dark:bg-neutral-800 rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all ${
                cons.status === 'InProgress'
                  ? 'border-[#C4785A] ring-1 ring-[#C4785A]/30'
                  : 'border-[#E9EEF0] dark:border-neutral-700/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 text-xs font-bold flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {cons.patientName}
                  </span>
                </div>
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
                    ? (language === 'ar' ? 'في الانتظار' : 'En attente')
                    : cons.status === 'InProgress'
                    ? (language === 'ar' ? 'في الفحص' : 'En consultation')
                    : (language === 'ar' ? 'مكتمل' : 'Terminé')}
                </span>
              </div>

              {/* Vitals Pill Row */}
              <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center text-xs border border-neutral-100 dark:border-neutral-700/40">
                <div>
                  <div className="text-[10px] text-neutral-400">TA</div>
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                    {cons.vitals?.bloodPressure || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400">Temp</div>
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                    {cons.vitals?.temperatureCelsius ? `${cons.vitals.temperatureCelsius}°C` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400">Poids</div>
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                    {cons.vitals?.weightKg ? `${cons.vitals.weightKg} kg` : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-300">
                <span className="font-medium text-neutral-400 mr-1">Motif:</span>
                {cons.chiefComplaint}
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                  {formatMoney(cons.consultationFeeDzd, 'DZD')}
                </span>

                <div className="flex items-center gap-1.5">
                  {cons.status === 'InWaitingQueue' && (
                    <AtriumButton
                      size="xs"
                      variant="primary"
                      onClick={() => {
                        updateConsultationStatus(cons.id, 'InProgress');
                        showToast('Patient appelé en salle d\'examen', 'info');
                      }}
                      icon={<Stethoscope size={12} />}
                    >
                      {language === 'ar' ? 'بدء الفحص' : 'Commencer'}
                    </AtriumButton>
                  )}
                  {cons.status === 'InProgress' && (
                    <AtriumButton
                      size="xs"
                      variant="primary"
                      onClick={() => {
                        updateConsultationStatus(cons.id, 'Completed');
                        showToast('Consultation validée et clôturée', 'success');
                      }}
                      icon={<CheckCircle2 size={12} />}
                    >
                      {language === 'ar' ? 'إنهاء الفحص' : 'Clôturer'}
                    </AtriumButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MedicalConsultationModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        patients={patients}
        onSave={addConsultation}
      />
    </div>
  );
};

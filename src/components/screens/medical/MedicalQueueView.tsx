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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header Strip */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'قائمة الانتظار والفرز السريري' : 'File d\'Attente & Triage Clinique'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {consultations.filter((c) => c.status === 'InWaitingQueue').length} {language === 'ar' ? 'في الانتظار' : 'en attente'}
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

      {/* Toolbar & Data View */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
              className={`bg-white dark:bg-neutral-900 rounded-xl border p-5 shadow-xs space-y-3.5 transition-all ${
                cons.status === 'InProgress'
                  ? 'border-[#C4785A] ring-1 ring-[#C4785A]/30'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {cons.patientName}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
              <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-center text-xs">
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

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                  {formatMoney(cons.consultationFeeDzd, language)}
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

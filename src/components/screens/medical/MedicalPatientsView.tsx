import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  HeartPulse,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { MedicalPatient } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { MedicalPatientModal } from './MedicalPatientModal';

export const MedicalPatientsView: React.FC = () => {
  const { language } = useAtriumStore();
  const { patients, addPatient } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<MedicalPatient | null>(null);

  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.nationalId && p.nationalId.includes(searchQuery))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <UserCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل ودليل المرضى (EHR)' : 'Dossiers Patients & EHR'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {patients.length} {language === 'ar' ? 'مريض' : 'patients'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'الملفات الطبية الإلكترونية، السوابق المرضية، الحساسيات ومعلومات الطوارئ'
                : 'Dossiers médicaux partagés, antécédents, allergies médicamenteuses & urgences'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsPatientModalOpen(true)}
            icon={<UserPlus size={14} />}
          >
            {language === 'ar' ? 'مريض جديد' : 'Nouveau Dossier'}
          </AtriumButton>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف أو بطاقة الشفاء...' : 'Recherche par nom, téléphone, Chifa...'}
          />
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {filteredPatients.length} {language === 'ar' ? 'نتائج' : 'dossiers'}
          </div>
        </div>

        {/* Patients Table / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {patient.fullName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                    <span className="font-mono">{patient.phone}</span>
                    <span>·</span>
                    <span>{patient.gender === 'Male' ? (language === 'ar' ? 'ذكر' : 'Homme') : (language === 'ar' ? 'أنثى' : 'Femme')}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  {patient.bloodGroup || 'O+'}
                </span>
              </div>

              {/* Allergies / Chronic Flags */}
              <div className="space-y-1.5 pt-1">
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                    <AlertCircle size={13} className="shrink-0" />
                    <span className="truncate">{patient.allergies.join(', ')}</span>
                  </div>
                )}
                {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <HeartPulse size={13} className="shrink-0" />
                    <span className="truncate">{patient.chronicConditions.join(', ')}</span>
                  </div>
                )}
              </div>

              {patient.emergencyContact && (
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between">
                  <span>Urgence: {patient.emergencyContact}</span>
                  <span className="font-mono">{patient.emergencyPhone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <MedicalPatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSave={addPatient}
      />
    </div>
  );
};

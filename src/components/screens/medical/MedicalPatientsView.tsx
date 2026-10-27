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

  const sensitiveCount = patients.filter(
    (p) => (p.allergies && p.allergies.length > 0) || (p.chronicConditions && p.chronicConditions.length > 0)
  ).length;

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <UserCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات ملفات المرضى والتغطية الصحية' : 'Indicateurs Dossiers Médicaux & Veille Sanitaire'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'بيانات المجموعات الدموية، الأمراض المزمنة وأرقام التأمين الصحي' : 'Traçabilité des groupes sanguins, protocoles d\'allergies et affiliation Chifa'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Dossiers Actifs */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي المرضى المسجلين' : 'Dossiers Patients Actifs'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {patients.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Archivage électronique certifié
              </p>
            </div>
          </div>

          {/* Card 2: Vigilances & Allergies */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'ملفات بحاجة لرعاية خاصة' : 'Allergies & Vigilances Chroniques'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {sensitiveCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Alertes contre-indications actives
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'معايير الأمان الصحي' : 'Dossier Médical Partagé'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                EHR / NUMÉRIQUE
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100%
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>Cartes Chifa & Identifiants vérifiés</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
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
              className="bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 p-5 shadow-2xs space-y-3 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
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
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-750 pt-2 flex items-center justify-between">
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

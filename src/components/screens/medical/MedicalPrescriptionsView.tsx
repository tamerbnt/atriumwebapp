import React, { useState } from 'react';
import { Pill, Printer, FileText, CheckCircle2, QrCode } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const MedicalPrescriptionsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { prescriptions } = useMedicalData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = prescriptions.filter(
    (rx) =>
      rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.qrCodeHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.items.some((item) => item.drugName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePrint = (rxId: string) => {
    showToast(
      language === 'ar'
        ? 'جاري تجهيز الوصفة الطبية للطباعة...'
        : 'Préparation de l\'ordonnance pour impression...',
      'info'
    );
    window.print();
  };

  const totalDrugsPrescribed = prescriptions.reduce((acc, rx) => acc + rx.items.length, 0);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Pill size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الوصفات الطبية الإلكترونية (Ordonnances)' : 'Ordonnances Médicales Sécurisées'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Chifa Validated
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إصدار الوصفات الرقمية، الجرعات، التوقيع الطبي الإلكتروني والتحقق بـ QR Code'
                : 'Prescriptions normalisées, posologie, signature numérique & QR Code'}
            </p>
          </div>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات الوصفات الطبية والسلامة الدوائية' : 'Indicateurs de Prescription & Sécurisation Pharmacologique'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'المطابقة الدوائية مع الصندوق الوطني للتأمينات، والتحقق الفوري بالباركود' : 'Conformité Chifa, détection des interactions et traçabilité par QR Code certifié'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Ordonnances Délivrées */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي الوصفات الصادرة' : 'Ordonnances Signées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {prescriptions.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Archivage légal ordonnancier
              </p>
            </div>
          </div>

          {/* Card 2: Lignes de Médicaments */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'الأدوية الموصوفة' : 'Lignes Médicamenteuses'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {totalDrugsPrescribed}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Posologies & durées vérifiées
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'الأمان والتحقق الرقمي' : 'Sécurité & Traçabilité QR'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                CHIFA QR CERTIFIÉ
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100%
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>Signature médecin & horodatage</span>
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
            placeholder={language === 'ar' ? 'بحث عن دواء أو مريض أو كود QR...' : 'Recherche par médicament, patient, QR...'}
          />
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {filtered.length} {language === 'ar' ? 'وصفات مسجلة' : 'ordonnances'}
          </div>
        </div>

        {/* Prescriptions List */}
        <div className="space-y-4">
          {filtered.map((rx) => (
            <div
              key={rx.id}
              className="bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 p-5 shadow-2xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 dark:border-neutral-700/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                      {rx.patientName}
                    </h3>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs font-mono text-neutral-500">
                      {rx.prescriptionDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                    <span className="font-mono">{rx.qrCodeHash}</span>
                    {rx.isSigned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={12} />
                        {language === 'ar' ? 'موقعة إلكترونياً' : 'Signée numériquement'}
                      </span>
                    )}
                  </div>
                </div>

                <AtriumButton
                  variant="secondary"
                  size="xs"
                  onClick={() => handlePrint(rx.id)}
                  icon={<Printer size={13} />}
                >
                  {language === 'ar' ? 'طباعة الوصفة' : 'Imprimer Ordonnance'}
                </AtriumButton>
              </div>

              {/* Drugs list */}
              <div className="space-y-2">
                {rx.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-700/40 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white">
                        {item.drugName} <span className="font-normal text-neutral-500">({item.form})</span>
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-300 mt-0.5">
                        {item.frequency}
                      </div>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="font-bold text-neutral-700 dark:text-neutral-300 font-mono">
                        {item.durationDays} jours
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {rx.notes && (
                <div className="text-xs text-neutral-500 italic bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                  Note: {rx.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

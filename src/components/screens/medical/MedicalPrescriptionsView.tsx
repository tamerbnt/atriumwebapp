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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Pill size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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

      {/* Main Container */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث عن دواء أو مريض أو كود QR...' : 'Recherche par médicament, patient, QR...'}
          />
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'وصفات مسجلة' : 'ordonnances'}
          </div>
        </div>

        {/* Prescriptions List */}
        <div className="space-y-4">
          {filtered.map((rx) => (
            <div
              key={rx.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
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
                    className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs"
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
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">
                        {item.durationDays} jours
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {rx.notes && (
                <div className="text-xs text-neutral-500 italic bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
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

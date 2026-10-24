import React, { useState } from 'react';
import { FileCheck, Plus, CheckCircle2, Home, Printer } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const RealEstateInspectionsView: React.FC = () => {
  const { language } = useAtriumStore();
  const { inspections } = useRealEstateData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = inspections.filter(
    (insp) =>
      insp.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (insp.inspectorName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handlePrintInspection = () => {
    showToast(
      language === 'ar'
        ? 'جاري تجهيز محضر معاينة الأماكن للطباعة...'
        : 'Préparation du procès-verbal d\'état des lieux...',
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
            <FileCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'معاينة الأماكن (États des Lieux)' : 'États des Lieux d\'Entrée & Sortie'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Conforme Juridique
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'محاضر تسليم المفاتيح، قراءة العدادات (سونلغاز / سيال)، وفحص جودة التجهيزات'
                : 'Relevés de compteurs (Sonelgaz/Seaal), remise de clés & constat d\'habitabilité'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث في محاضر المعاينة...' : 'Rechercher état des lieux...'}
          />
        </div>

        <div className="space-y-4">
          {filtered.map((insp) => (
            <div
              key={insp.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {insp.inspectionType === 'Entry' ? 'Entrée' : 'Sortie'}
                    </span>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                      {insp.propertyTitle}
                    </h3>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Date: {insp.inspectionDate} · Inspecteur: {insp.inspectorName}
                  </div>
                </div>

                <AtriumButton
                  variant="secondary"
                  size="xs"
                  onClick={handlePrintInspection}
                  icon={<Printer size={13} />}
                >
                  {language === 'ar' ? 'طباعة المحضر' : 'Imprimer PV'}
                </AtriumButton>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                <div>
                  <span className="text-neutral-400">Électricité (Sonelgaz):</span>{' '}
                  <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                    {insp.meterReadings?.electricKwh ?? insp.meterElectricityKwh ?? 0} kWh
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Gaz (Sonelgaz):</span>{' '}
                  <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                    {insp.meterReadings?.gasM3 ?? insp.meterGasM3 ?? 0} m³
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Eau (Seaal):</span>{' '}
                  <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                    {insp.meterReadings?.waterM3 ?? insp.meterWaterM3 ?? 0} m³
                  </span>
                </div>
              </div>

              {insp.notes && (
                <div className="text-xs text-neutral-600 dark:text-neutral-300 italic">
                  Note: {insp.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

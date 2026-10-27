import React, { useState } from 'react';
import { FileCheck, Plus, CheckCircle2, Home, Printer, ShieldCheck, ClipboardCheck } from 'lucide-react';
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

  const entryCount = inspections.filter((i) => i.inspectionType === 'MoveIn').length;
  const exitCount = inspections.filter((i) => i.inspectionType === 'MoveOut').length;

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
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <FileCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={handlePrintInspection}
            icon={<Printer size={14} />}
          >
            {language === 'ar' ? 'طباعة محضر معاينة' : 'Imprimer Constat'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'إحصائيات المعاينة وسلامة العقارات' : 'Registre des Constats & Conformité'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'محاضر الدخول والخروج، جرد التجهيزات والعدادات الحيوية' : 'Procès-verbaux contradictoires rédigés et index compteurs enregistrés'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Constats */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي محاضر المعاينة' : 'Constats Réalisés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {inspections.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {language === 'ar' ? 'موقعة حضورياً من الطرفين' : 'Signatures contradictoires validées'}
              </p>
            </div>
          </div>

          {/* Card 2: MoveIn vs MoveOut */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'معاينات الدخول والخروج' : 'Entrée vs Sortie'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {entryCount} / {exitCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {entryCount} {language === 'ar' ? 'دخول وتسليم مفاتيح' : 'entrées'} • {exitCount} {language === 'ar' ? 'خروج' : 'sorties'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'الامتثال القانوني للمعاينة' : 'Conformité Réglementaire'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                100% {language === 'ar' ? 'قانوني' : 'Légal'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'محضر مؤرشف' : 'procès-verbaux archivés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'محاضر تسليم واستلام الأماكن' : 'Registre des États des Lieux'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالعقار، الخبير المعاين...' : 'Rechercher bien, inspecteur...'}
            />
          </div>
        </div>

        {/* Inspections Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'العقار' : 'Bien Immobilier'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'نوع المعاينة' : 'Type'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الخبير المعاين' : 'Inspecteur Mandataire'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'عدادات سونلغاز / سيال' : 'Compteurs Sonelgaz/Seaal'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'حالة المفاتيح' : 'Clés'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإجراء' : 'PV'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((insp) => (
                  <tr key={insp.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {insp.propertyTitle}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          insp.inspectionType === 'MoveIn'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {insp.inspectionType === 'MoveIn'
                          ? (language === 'ar' ? 'معاينة دخول' : 'Entrée')
                          : (language === 'ar' ? 'معاينة خروج' : 'Sortie')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                      {insp.inspectionDate}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300 font-medium">
                      {insp.inspectorName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-500">
                      Élec: {insp.meterReadings?.electricKwh || insp.meterElectricityKwh || 0} • Gaz: {insp.meterReadings?.gasM3 || insp.meterGasM3 || 0}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {insp.keysDeliveredCount || insp.keysCount || 4} {language === 'ar' ? 'مفتاح' : 'clés'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left">
                      <AtriumButton
                        size="xs"
                        variant="outline"
                        onClick={handlePrintInspection}
                        icon={<Printer size={13} />}
                      >
                        {language === 'ar' ? 'طباعة' : 'PV'}
                      </AtriumButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

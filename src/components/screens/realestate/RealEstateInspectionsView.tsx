import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  CheckCircle2,
  Home,
  Printer,
  ShieldCheck,
  ClipboardCheck,
  Key,
  Calendar,
  Zap,
  Flame,
  Droplets,
  Eye,
  Check,
  X,
  Share2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstateInspection } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const RealEstateInspectionsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { inspections } = useRealEstateData();

  const [selectedInspection, setSelectedInspection] = useState<RealEstateInspection | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'constat' | 'compteurs' | 'pieces'>('constat');
  const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit' | 'damages'>('all');

  const filteredInspections = useMemo(() => {
    return inspections.filter((insp) => {
      const isEntry = insp.inspectionType === 'MoveIn' || (insp.inspectionType as string) === 'Entry';
      const isExit = insp.inspectionType === 'MoveOut' || (insp.inspectionType as string) === 'Exit';
      if (filterType === 'entry' && !isEntry) return false;
      if (filterType === 'exit' && !isExit) return false;
      if (filterType === 'damages' && insp.generalCondition === 'Good' && !insp.notes?.toLowerCase().includes('dégât')) return false;
      return true;
    });
  }, [inspections, filterType]);

  const entryCount = inspections.filter((i) => i.inspectionType === 'MoveIn' || (i.inspectionType as string) === 'Entry').length;
  const exitCount = inspections.filter((i) => i.inspectionType === 'MoveOut' || (i.inspectionType as string) === 'Exit').length;

  const handlePrintInspection = (title: string) => {
    showToast(
      isAr
        ? 'جاري تجهيز محضر معاينة الأماكن للطباعة...'
        : `Impression du procès-verbal d'état des lieux (${title})...`,
      'info'
    );
  };

  const getInspectionActions = (insp: RealEstateInspection): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة المحضر' : 'Consulter Constat',
      icon: <Eye size={14} />,
      onClick: () => setSelectedInspection(insp),
    },
    {
      label: isAr ? 'طباعة PV' : 'Imprimer PV',
      icon: <Printer size={14} />,
      onClick: () => handlePrintInspection(insp.propertyTitle),
    },
    {
      label: isAr ? 'التحقق والمطابقة' : 'Valider État',
      icon: <Check size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `تم تأكيد مطابقة محضر المعاينة لعقار ${insp.propertyTitle}`
            : `État des lieux validé conforme et contresigné pour ${insp.propertyTitle}`,
          'success'
        );
      },
    },
    {
      label: isAr ? 'مشاركة المحضر' : 'Partager PV',
      icon: <Share2 size={14} />,
      onClick: () => {
        showToast(
          isAr ? 'تم نسخ رابط محضر المعاينة الرقمي' : 'Lien du PV d’état des lieux copié',
          'success'
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <FileCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'معاينة الأماكن (États des Lieux)' : 'États des Lieux d\'Entrée & Sortie'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Conforme Juridique
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'محاضر تسليم المفاتيح، قراءة العدادات (سونلغاز / سيال)، وفحص جودة التجهيزات'
                : 'Relevés de compteurs (Sonelgaz/Seaal), remise de clés & constat d\'habitabilité'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => handlePrintInspection('Ensemble')}
            icon={<Printer size={14} />}
          >
            {isAr ? 'طباعة محضر معاينة' : 'Imprimer Constat'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'إحصائيات المعاينة وسلامة العقارات' : 'Registre des Constats & Conformité'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'محاضر الدخول والخروج، جرد التجهيزات والعدادات الحيوية' : 'Procès-verbaux contradictoires rédigés et index compteurs enregistrés'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Constats */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي محاضر المعاينة' : 'Constats Réalisés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {inspections.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'موقعة حضورياً من الطرفين' : 'Signatures contradictoires validées'}
              </p>
            </div>
          </div>

          {/* Card 2: MoveIn vs MoveOut */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'معاينات الدخول والخروج' : 'Entrée vs Sortie'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {entryCount} / {exitCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {entryCount} {isAr ? 'دخول وتسليم مفاتيح' : 'entrées'} • {exitCount} {isAr ? 'خروج' : 'sorties'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'الامتثال القانوني للمعاينة' : 'Conformité Réglementaire'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                100% {isAr ? 'قانوني' : 'Légal'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {inspections.length} {isAr ? 'محضر مؤرشف' : 'procès-verbaux archivés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'محاضر تسليم واستلام الأماكن والنزاعات' : 'Registre des États des Lieux d\'Entrée & Sortie'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المعاينة الميدانية، العدادات وتسليم المفاتيح' : 'Procès-verbaux contradictoires, index compteurs et état d\'habitabilité'}
            </p>
          </div>

          {/* Authentic Real Estate Inspection Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع المحاضر' : 'Tous les constats' },
              { id: 'entry', label: isAr ? 'دخول / استلام' : 'État entrant' },
              { id: 'exit', label: isAr ? 'خروج / إخلاء' : 'État sortant' },
              { id: 'damages', label: isAr ? 'أضرار مسجلة' : 'Constat sinistre' },
            ].map((tab) => {
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as any)}
                  className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : '#71717A',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Collection Area + 390px Inspector Drawer */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<RealEstateInspection>
              title={isAr ? 'محاضر تسليم واستلام الأماكن' : 'Registre des États des Lieux d\'Entrée & Sortie'}
              subtitle={isAr ? 'المعاينة الميدانية، العدادات وتسليم المفاتيح' : 'Procès-verbaux contradictoires, index compteurs et état d\'habitabilité'}
              items={filteredInspections}
            keyExtractor={(insp) => insp.id}
            searchPlaceholder={isAr ? 'بحث بالعقار، الخبير المعاين...' : 'Rechercher bien, inspecteur, notes...'}
            searchFilter={(insp, query) =>
              insp.propertyTitle.toLowerCase().includes(query.toLowerCase()) ||
              (insp.inspectorName || '').toLowerCase().includes(query.toLowerCase()) ||
              (insp.notes || '').toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(insp) => setSelectedInspection(insp)}
            customActions={(insp) => getInspectionActions(insp)}
            columns={[
              {
                id: 'property',
                header: isAr ? 'العقار' : 'Bien Immobilier',
                renderCell: (insp) => (
                  <div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                      {insp.propertyTitle}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Date: {insp.inspectionDate}
                    </span>
                  </div>
                ),
              },
              {
                id: 'type',
                header: isAr ? 'النوع' : 'Type Constat',
                width: '120px',
                renderCell: (insp) => {
                  const isEntry = insp.inspectionType === 'MoveIn' || (insp.inspectionType as string) === 'Entry';
                  return (
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isEntry
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isEntry ? (isAr ? 'معاينة دخول' : 'Entrée') : (isAr ? 'معاينة خروج' : 'Sortie')}
                    </span>
                  );
                },
              },
              {
                id: 'inspector',
                header: isAr ? 'الخبير المعاين' : 'Inspecteur Mandataire',
                width: '180px',
                renderCell: (insp) => (
                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    {insp.inspectorName}
                  </span>
                ),
              },
              {
                id: 'meters',
                header: isAr ? 'العدادات (سونلغاز / سيال)' : 'Index Compteurs',
                width: '180px',
                renderCell: (insp) => (
                  <div className="font-mono text-[11px] text-neutral-500 space-y-0.5">
                    <div>Élec: <strong className="text-neutral-800 dark:text-neutral-200">{insp.meterReadings?.electricKwh || insp.meterElectricityKwh || 0} kWh</strong></div>
                    <div>Gaz: <strong className="text-neutral-800 dark:text-neutral-200">{insp.meterReadings?.gasM3 || insp.meterGasM3 || 0} m³</strong></div>
                  </div>
                ),
              },
              {
                id: 'keys',
                header: isAr ? 'المفاتيح' : 'Trousseau Clés',
                width: '110px',
                renderCell: (insp) => (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <Key size={12} />
                    <span>{insp.keysDeliveredCount || insp.keysCount || 4} clés</span>
                  </span>
                ),
              },
              {
                id: 'condition',
                header: isAr ? 'الحالة العامة' : 'État Général',
                width: '130px',
                renderCell: (insp) => (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    {insp.generalCondition || 'Très Bon État'}
                  </span>
                ),
              },
            ]}
            renderCard={(insp) => {
              const isEntry = insp.inspectionType === 'MoveIn' || (insp.inspectionType as string) === 'Entry';
              return (
                <div className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEntry
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isEntry ? 'Constat Entrée' : 'Constat Sortie'}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {insp.inspectionDate}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2">
                      {insp.propertyTitle}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Inspecteur: {insp.inspectorName}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Key size={12} />
                      <span>{insp.keysDeliveredCount || insp.keysCount || 4} clés</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {insp.generalCondition || 'Conforme'}
                    </span>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Side Inspector Drawer */}
        {selectedInspection && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Inspector Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <ClipboardCheck size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                    État des Lieux
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                    {selectedInspection.propertyTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInspection(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
              <button
                onClick={() => setInspectorTab('constat')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'constat'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'المحضر والمفاتيح' : 'Constat & Clés'}
              </button>
              <button
                onClick={() => setInspectorTab('compteurs')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'compteurs'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'العدادات' : 'Compteurs'}
              </button>
              <button
                onClick={() => setInspectorTab('pieces')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'pieces'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'حالة الغرف' : 'Pièces'}
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'constat' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Informations sur le Constat
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Bien concerné:</span>
                      <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[190px]">{selectedInspection.propertyTitle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Date de visite:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedInspection.inspectionDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Inspecteur agence:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedInspection.inspectorName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Trousseau de clés:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1 font-mono">
                        <Key size={12} />
                        {selectedInspection.keysDeliveredCount || selectedInspection.keysCount || 4} clés remises
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                      Observations & Remarques
                    </span>
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {selectedInspection.notes || 'Appartement en parfait état de propreté. Travaux de peinture récents. Toutes les serrures fonctionnent correctement.'}
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'compteurs' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Index des Compteurs Énergétiques & Fluides
                    </span>

                    <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">Électricité (Sonelgaz):</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {selectedInspection.meterReadings?.electricKwh || selectedInspection.meterElectricityKwh || 14200} kWh
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame size={14} className="text-orange-500" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">Gaz Naturel:</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {selectedInspection.meterReadings?.gasM3 || selectedInspection.meterGasM3 || 450} m³
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Droplets size={14} className="text-blue-500" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">Eau (Seaal):</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {selectedInspection.meterReadings?.waterM3 || 88} m³
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'pieces' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      État par Pièce & Équipements
                    </span>
                    {[
                      { room: 'Salon & Salle à Manger', condition: 'Parfait', note: 'Murs et sols sans impact' },
                      { room: 'Cuisine Équipée', condition: 'Bon', note: 'Hotte et plaques testées fonctionnelles' },
                      { room: 'Chambre Principale', condition: 'Très Bon', note: 'Placards muraux propres' },
                      { room: 'Salle de Bain / Sanitaires', condition: 'Bon', note: 'Robinetterie et évacuations sans fuite' },
                    ].map((item, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900 dark:text-white">{item.room}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            {item.condition}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <AtriumButton
                variant="primary"
                className="w-full justify-center"
                icon={<Printer size={14} />}
                onClick={() => handlePrintInspection(selectedInspection.propertyTitle)}
              >
                {isAr ? 'طباعة محضر المعاينة' : 'Imprimer PV État des Lieux'}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

import React, { useState, useMemo } from 'react';
import {
  Pill,
  Printer,
  FileText,
  CheckCircle2,
  QrCode,
  Download,
  Pin,
  X,
  UserCheck,
  ShieldCheck,
  Plus,
  AlertTriangle,
  Clock,
  Calendar,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MedicalPrescription } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const MedicalPrescriptionsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { prescriptions } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'recent' | 'multi'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('prescriptionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['rx_01']));
  const [selectedRx, setSelectedRx] = useState<MedicalPrescription | null>(() => prescriptions[0] || null);
  const [activeTab, setActiveTab] = useState<'posologie' | 'securite' | 'actions'>('posologie');

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      const matchesSearch =
        rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rx.qrCodeHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rx.items.some((item) => item.drugName.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      if (filterStatus === 'multi') return rx.items.length >= 3;
      if (filterStatus === 'recent') {
        const diffDays = (new Date().getTime() - new Date(rx.prescriptionDate).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 14;
      }
      return true;
    });
  }, [prescriptions, searchQuery, filterStatus]);

  const sortedPrescriptions = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortBy === 'patientName') {
        return sortDir === 'asc'
          ? a.patientName.localeCompare(b.patientName)
          : b.patientName.localeCompare(a.patientName);
      }
      return sortDir === 'asc'
        ? a.prescriptionDate.localeCompare(b.prescriptionDate)
        : b.prescriptionDate.localeCompare(a.prescriptionDate);
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir]);

  const totalDrugsPrescribed = prescriptions.reduce((acc, rx) => acc + rx.items.length, 0);

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    showToast(isAr ? 'تم تحديث التثبيت' : 'Ordonnance épinglée', 'info');
  };

  const handlePrint = (rx: MedicalPrescription) => {
    showToast(
      isAr
        ? 'جاري تجهيز الوصفة الطبية للطباعة...'
        : 'Génération du document ordonnancier sécurisé...',
      'info'
    );
    window.print();
  };

  const columns: ColumnDefinition<MedicalPrescription>[] = [
    {
      key: 'patientName',
      header: isAr ? 'المريض / الرمز' : 'Patient & Référence',
      sortable: true,
      minWidth: '220px',
      renderCell: (rx) => {
        const isPinned = pinnedIds.has(rx.id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0 border border-orange-100 dark:border-neutral-800">
              <Pill size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                {rx.patientName}
                {isPinned && <span className="text-xs text-amber-500">📌</span>}
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                {rx.qrCodeHash} · {rx.prescriptionDate}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'itemsCount',
      header: isAr ? 'الأدوية الموصوفة' : 'Médicaments',
      minWidth: '150px',
      renderCell: (rx) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 font-mono">
          {rx.items.length} {isAr ? 'مستحضرات' : 'spécialités'}
        </span>
      ),
    },
    {
      key: 'security',
      header: isAr ? 'الأمان والتحقق' : 'Signature & QR',
      minWidth: '150px',
      renderCell: (rx) => (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <QrCode size={13} className="shrink-0" />
          <span className="font-mono text-[11px]">Certifié Chifa</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Pill size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الوصفات الطبية الإلكترونية (Ordonnances)' : 'Ordonnances Médicales Sécurisées'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Chifa Validated
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إصدار الوصفات الرقمية، الجرعات، التوقيع الطبي الإلكتروني والتحقق بـ QR Code'
                : 'Prescriptions normalisées, posologie, signature numérique & QR Code'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الوصفات الطبية والسلامة الدوائية' : 'Indicateurs de Prescription & Sécurisation Pharmacologique'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'المطابقة الدوائية مع الصندوق الوطني للتأمينات، والتحقق الفوري بالباركود' : 'Conformité Chifa, détection des interactions et traçabilité par QR Code certifié'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الوصفات الصادرة' : 'Ordonnances Signées'}
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

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الأدوية الموصوفة' : 'Lignes Médicamenteuses'}
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

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'التأمين والصيدليات' : 'Sécurité & Chifa'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                QR PROTOCOL
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100% Validé
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span>Délivrance directe en officine</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'أرشيف الوصفات الطبية' : 'Registre des Ordonnances Médicales'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {sortedPrescriptions.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث بمريض، دواء أو كود QR...' : 'Rechercher patient, médicament ou QR code...'}
              shutSize={36}
              openWidth={220}
            />

            {/* Prescription Domain Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(
                [
                  { id: 'all', label: isAr ? 'الكل' : 'Toutes' },
                  { id: 'recent', label: isAr ? 'حديثة (<14j)' : 'Récentes (<14j)' },
                  { id: 'multi', label: isAr ? 'متعددة الأدوية' : 'Polymédicamentées (≥3)' },
                ] as const
              ).map((filter) => {
                const isActive = filterStatus === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setFilterStatus(filter.id)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Workspace Area with Dual Collection and 390px Inspector */}
        <div className="flex items-start gap-4">
          {/* Collection */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<MedicalPrescription>
            items={sortedPrescriptions}
            keyExtractor={(rx) => rx.id}
            defaultViewMode={viewMode}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key) => {
              if (sortBy === key) {
                setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortBy(key);
                setSortDir('asc');
              }
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPinned={(rx) => pinnedIds.has(rx.id)}
            onTogglePin={(rx) => handleTogglePin(rx.id)}
            onItemClick={(rx) => setSelectedRx(rx)}
            customActions={(rx) => [
              {
                id: 'print',
                label: isAr ? 'طباعة' : 'Imprimer',
                icon: <Printer size={13} />,
                variant: 'primary',
                onClick: () => handlePrint(rx),
              },
              {
                id: 'fiche',
                label: isAr ? 'معاينة' : 'Aperçu',
                icon: <FileText size={13} />,
                onClick: () => setSelectedRx(rx),
              },
            ]}
            renderCard={(rx) => {
              const isPinned = pinnedIds.has(rx.id);
              return (
                <div className="flex flex-col w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {rx.patientName} {isPinned && '📌'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                      {rx.qrCodeHash}
                    </span>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 space-y-1.5 text-xs">
                    {rx.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-neutral-700 dark:text-neutral-300">
                        <span className="font-semibold truncate max-w-[170px]">{item.drugName}</span>
                        <span className="text-neutral-400 font-mono text-[11px]">{item.dosage}</span>
                      </div>
                    ))}
                    {rx.items.length > 2 && (
                      <div className="text-[10px] text-neutral-400">
                        +{rx.items.length - 2} autre(s) spécialité(s)...
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                    <span>{rx.prescriptionDate}</span>
                    <span className="text-[#C4785A] font-medium">{rx.items.length} lignes</span>
                  </div>
                </div>
              );
            }}
            emptyTitle={isAr ? 'لا توجد وصفات' : 'Aucune ordonnance émise'}
            emptyDescription={isAr ? 'قم بإنشاء فحص لتحرير وصفة' : 'Prescrivez une ordonnance depuis un dossier patient'}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedRx && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-orange-200/60">
                  <Pill size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {selectedRx.patientName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <span className="font-mono">Réf: {selectedRx.qrCodeHash}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('posologie')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'posologie'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الجرعات والأدوية' : 'Posologie'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('securite')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'securite'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الأمان والـ QR' : 'Sécurité & QR'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'actions'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'الإجراءات' : 'Actions'}
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {activeTab === 'posologie' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="text-[11px] font-semibold text-neutral-400">
                    LISTE DES SPÉCIALITÉS DÉLIVRÉES ({selectedRx.items.length})
                  </div>

                  {selectedRx.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-neutral-900 dark:text-white text-xs">
                          {idx + 1}. {item.drugName}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">
                          {item.durationDays}j
                        </span>
                      </div>
                      <div className="text-[11px] text-[#C4785A] font-medium">
                        {item.dosage} · {item.frequency}
                      </div>
                      {item.instructions && (
                        <div className="text-[11px] text-neutral-500 italic">
                          "{item.instructions}"
                        </div>
                      )}
                    </div>
                  ))}

                  {selectedRx.notes && (
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                      <span className="font-bold text-[10px] block mb-0.5">RECOMMANDATION MÉDICALE:</span>
                      {selectedRx.notes}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'securite' && (
                <div className="space-y-4 animate-in fade-in duration-150 text-center">
                  <div className="p-6 rounded-2xl bg-white dark:bg-neutral-800 border-2 border-dashed border-[#C4785A]/40 flex flex-col items-center justify-center space-y-3">
                    <QrCode size={80} className="text-[#C4785A]" />
                    <div>
                      <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                        {selectedRx.qrCodeHash}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        Signature numérique certifiée par l'Ordre des Médecins
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-left space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 size={14} />
                      <span>Conformité Chifa / CNAS Validée</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Ce code QR permet la lecture automatisée dans toutes les pharmacies conventionnées en Algérie.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => handlePrint(selectedRx)}
                    className="w-full p-3 rounded-xl bg-[#C4785A] text-white font-semibold flex items-center justify-between hover:bg-[#b0674b] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Printer size={16} />
                      Imprimer ordonnance PDF
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePin(selectedRx.id)}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Pin size={16} />
                      {pinnedIds.has(selectedRx.id) ? 'Détacher' : 'Épingler au dossier'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast('Ordonnance dupliquée avec succès', 'success')}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={16} />
                      Renouveler / Dupliquer traitement
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  UserPlus,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  HeartPulse,
  Mail,
  Edit,
  Trash2,
  Pin,
  Download,
  X,
  Stethoscope,
  Pill,
  ShieldAlert,
  Save,
  Check,
  Plus,
  Microscope,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { MedicalPatient } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { MedicalPatientModal } from './MedicalPatientModal';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalLabViewerModal } from './MedicalLabViewerModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const MedicalPatientsView: React.FC = () => {
  const { language, showToast } = useAtriumStore();
  const {
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    consultations,
    addConsultation,
    labRecords,
    addLabRecord,
    practitioners,
  } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondition, setFilterCondition] = useState<'All' | 'Sensitive' | 'Regular'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['pat_01']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & Inspector Drawer State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<MedicalPatient | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultPatient, setConsultPatient] = useState<MedicalPatient | null>(null);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [selectedLabRecord, setSelectedLabRecord] = useState<any | null>(null);
  
  // 390px Inline Side Inspector
  const [selectedPatient, setSelectedPatient] = useState<MedicalPatient | null>(null);
  const [activeTab, setActiveTab] = useState<'dossier' | 'vitals' | 'allergies' | 'history' | 'labs' | 'notes'>('dossier');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  // New Vitals Entry State
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [newSys, setNewSys] = useState('120');
  const [newDia, setNewDia] = useState('80');
  const [newHr, setNewHr] = useState('72');
  const [newWeight, setNewWeight] = useState('75');
  const [newHeight, setNewHeight] = useState('172');
  const [newSugar, setNewSugar] = useState('95');
  const [newSpo2, setNewSpo2] = useState('98');

  // Filtered & Sorted Patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (filterCondition === 'Sensitive') {
        const isSens = (p.allergies && p.allergies.length > 0) || (p.chronicConditions && p.chronicConditions.length > 0);
        if (!isSens) return false;
      } else if (filterCondition === 'Regular') {
        const isSens = (p.allergies && p.allergies.length > 0) || (p.chronicConditions && p.chronicConditions.length > 0);
        if (isSens) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesId = p.nationalId && p.nationalId.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId) return false;
      }
      return true;
    });
  }, [patients, filterCondition, searchQuery]);

  const sortedPatients = useMemo(() => {
    const list = [...filteredPatients];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'name') {
        const cmp = a.fullName.localeCompare(b.fullName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'blood') {
        const cmp = (a.bloodGroup || '').localeCompare(b.bloodGroup || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'date') {
        const cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredPatients, pinnedIds, sortBy, sortDir]);

  const sensitiveCount = useMemo(() => {
    return patients.filter(
      (p) => (p.allergies && p.allergies.length > 0) || (p.chronicConditions && p.chronicConditions.length > 0)
    ).length;
  }, [patients]);

  const handleOpenAdd = () => {
    setPatientToEdit(null);
    setIsPatientModalOpen(true);
  };

  const handleOpenEdit = (p: MedicalPatient) => {
    setPatientToEdit(p);
    setIsPatientModalOpen(true);
  };

  const handleDelete = (p: MedicalPatient) => {
    deletePatient(p.id);
    if (selectedPatient?.id === p.id) {
      setSelectedPatient(null);
    }
    showToast(
      language === 'ar' ? 'تم حذف ملف المريض' : 'Dossier patient archivé',
      'success'
    );
  };

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectPatient = (p: MedicalPatient) => {
    setSelectedPatient(p);
    setInspectorNotes(p.notes || '');
    setNoteSaved(false);
  };

  const handleSaveNotes = () => {
    if (!selectedPatient) return;
    const updated = { ...selectedPatient, notes: inspectorNotes };
    updatePatient(updated);
    setSelectedPatient(updated);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(language === 'ar' ? 'تم حفظ الملاحظات السريرية' : 'Observations cliniques enregistrées', 'success');
  };

  const handleOpenConsultation = (p: MedicalPatient) => {
    setConsultPatient(p);
    setIsConsultModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Full Name', 'Phone', 'National ID', 'Blood Group', 'Allergies', 'Chronic Conditions'];
    const rows = sortedPatients.map((p) => [
      p.id,
      `"${p.fullName}"`,
      `"${p.phone}"`,
      `"${p.nationalId || ''}"`,
      p.bloodGroup || '',
      `"${(p.allergies || []).join('; ')}"`,
      `"${(p.chronicConditions || []).join('; ')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical_patients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(language === 'ar' ? 'تم تصدير سجل المرضى' : 'Export du registre patient terminé', 'info');
  };

  // List Column Definitions
  const columns: ColumnDefinition<MedicalPatient>[] = useMemo(
    () => [
      {
        key: 'name',
        header: language === 'ar' ? 'المريض / الملف' : 'Patient / Dossier EHR',
        width: '3.2*',
        sortable: true,
        renderCell: (p) => {
          const isPinned = pinnedIds.has(p.id);
          const hasVigilance = (p.allergies && p.allergies.length > 0) || (p.chronicConditions && p.chronicConditions.length > 0);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                {p.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white capitalize truncate">
                    {p.fullName}
                  </span>
                  {isPinned && (
                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                      📌 VIP
                    </span>
                  )}
                  {hasVigilance && (
                    <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5">
                      <ShieldAlert size={11} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                  <span>NSS: {p.nationalId ? p.nationalId.slice(0, 8) + '...' : 'CHIFA-OK'}</span>
                  <span>·</span>
                  <span className="text-neutral-500">{p.gender === 'Male' ? (language === 'ar' ? 'ذكر' : 'Homme') : (language === 'ar' ? 'أنثى' : 'Femme')}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'contact',
        header: language === 'ar' ? 'الهاتف والطوارئ' : 'Téléphone & Urgence',
        width: '2.4*',
        renderCell: (p) => (
          <div>
            <div className="text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200">
              {p.phone}
            </div>
            {p.emergencyContact && (
              <div className="text-[11px] text-neutral-400 truncate max-w-[170px] mt-0.5">
                {p.emergencyContact} ({p.emergencyPhone || '—'})
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'blood',
        header: language === 'ar' ? 'الفصيلة والحساسيات' : 'Groupe & Vigilance',
        width: '2.4*',
        sortable: true,
        renderCell: (p) => {
          const hasAllergies = p.allergies && p.allergies.length > 0;
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs font-mono">
                  {p.bloodGroup || 'O+'}
                </span>
                {hasAllergies && (
                  <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-1 bg-rose-50/50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
                    <AlertCircle size={10} />
                    {p.allergies![0]}
                  </span>
                )}
              </div>
              {p.chronicConditions && p.chronicConditions.length > 0 && (
                <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">
                  {p.chronicConditions.join(', ')}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: language === 'ar' ? 'حالة السجل' : 'Statut Dossier',
        width: '1.8*',
        renderCell: (p) => {
          const patientCons = consultations.filter((c) => c.patientId === p.id);
          return (
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[live-heartbeat_1.2s_infinite]" />
                {patientCons.length} {language === 'ar' ? 'فحوصات' : 'visites'}
              </span>
            </div>
          );
        },
      },
    ],
    [pinnedIds, consultations, language]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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

        <div className="flex items-center gap-2.5">
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExportCSV}
          >
            <span>{language === 'ar' ? 'تصدير' : 'Exporter'}</span>
          </AtriumButton>
          <AtriumButton
            type="button"
            variant="primary"
            onClick={handleOpenAdd}
            icon={<UserPlus size={15} strokeWidth={2.5} />}
          >
            <span>{language === 'ar' ? 'مريض جديد' : 'Nouveau Patient'}</span>
          </AtriumButton>
        </div>
      </div>

      {/* Row 1: KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات الرعاية الصحية والسجلات' : 'Indicateurs de Prise en Charge Clinique'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar'
              ? 'متابعة الحالات المزمنة، الحساسيات الدوائية، والربط الإلكتروني ببطاقة الشفاء'
              : 'Surveillance des pathologies chroniques, contre-indications et télétransmission'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Patients */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي المرضى المسجلين' : 'Base Totale Patients'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {patients.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'ملفات طبية مؤرشفة ومحدثة' : 'Dossiers médicaux actifs'}
              </p>
            </div>
          </div>

          {/* Card 2: Vigilances & Allergies */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'ملفات بحاجة لرعاية خاصة' : 'Allergies & Vigilances Chroniques'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {sensitiveCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'تنبيهات حساسية ومتابعة مستمرة' : 'Alertes contre-indications actives'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
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

      {/* Main Collection Container */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Top Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'دليل المرضى' : 'Registre des Patients'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums">
              ({sortedPatients.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Seek Search */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف أو بطاقة الشفاء...' : 'Recherche nom, tél, Chifa...'}
              shutSize={36}
              openWidth={220}
            />

            {/* Filter Pills */}
            <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterCondition('All')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterCondition === 'All'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'Tous'} ({patients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCondition('Sensitive')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterCondition === 'Sensitive'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'حساسيات & مزمن' : 'Vigilances'} ({sensitiveCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterCondition('Regular')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterCondition === 'Regular'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'عادي' : 'Standards'} ({patients.length - sensitiveCount})
              </button>
            </div>
          </div>
        </div>

        {/* Batch Selection Banner */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                {selectedIds.size} {language === 'ar' ? 'مرضى محددين' : 'patients sélectionnés'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 font-medium cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Désélectionner'}
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedIds.forEach((id) => deletePatient(id));
                  setSelectedIds(new Set());
                  showToast(language === 'ar' ? 'تم حذف المرضى المحددين' : 'Patients sélectionnés supprimés', 'success');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 size={13} />
                <span>{language === 'ar' ? 'حذف المحدد' : 'Supprimer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Inset Area Hosting Universal Collection and 390px Side Inspector */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<MedicalPatient>
              items={sortedPatients}
              keyExtractor={(p) => p.id}
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
              isPinned={(p) => pinnedIds.has(p.id)}
              onTogglePin={(p) => handleTogglePin(p.id)}
              onItemClick={handleSelectPatient}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              customActions={(p) => [
                {
                  id: 'consult',
                  label: language === 'ar' ? 'فحص سريري' : 'Consultation',
                  tooltip: language === 'ar' ? 'بدء فحص سريري' : 'Nouvelle Consultation',
                  icon: <Stethoscope size={13} />,
                  variant: 'primary',
                  onClick: () => handleOpenConsultation(p),
                },
              ]}
              renderCard={(p) => {
                const isPinned = pinnedIds.has(p.id);
                const hasVigilance = (p.allergies && p.allergies.length > 0) || (p.chronicConditions && p.chronicConditions.length > 0);
                return (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                      {p.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate tracking-tight">
                        {p.fullName}
                      </h3>
                      {isPinned && <span className="text-xs text-amber-500">📌</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs font-mono">
                        {p.bloodGroup || 'O+'}
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-400">
                        {p.gender === 'Male' ? (language === 'ar' ? 'ذكر' : 'Homme') : (language === 'ar' ? 'أنثى' : 'Femme')}
                      </span>
                    </div>

                    <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                      <div className="font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">
                        {p.phone}
                      </div>
                      <div className="truncate text-neutral-400 text-[11px]">
                        {hasVigilance ? (
                          <span className="text-rose-500 font-medium">
                            ⚠️ {p.allergies?.[0] || p.chronicConditions?.[0]}
                          </span>
                        ) : (
                          <span>{language === 'ar' ? 'سجل طبي سليم' : 'Sans contre-indication'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
              emptyTitle={language === 'ar' ? 'لا يوجد مرضى مطابقون' : 'Aucun dossier patient'}
              emptyDescription={language === 'ar' ? 'أضف أول ملف مريض أو أعد ضبط معايير البحث' : 'Ajoutez un premier dossier médical ou modifiez vos filtres de recherche'}
              primaryActionLabel={language === 'ar' ? 'مريض جديد' : 'Créer un patient'}
              onAddFirstItem={handleOpenAdd}
              onResetFilters={() => {
                setSearchQuery('');
                setFilterCondition('All');
              }}
              hasActiveFilters={searchQuery.length > 0 || filterCondition !== 'All'}
            />
          </div>

          {/* 390px Inline Side Inspector Drawer */}
          {selectedPatient && (
            <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[700px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#FCEEE8] text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-[#F5E2D8]">
                    {selectedPatient.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {selectedPatient.fullName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                      <span>NSS: {selectedPatient.nationalId || 'CHIFA-VALIDE'}</span>
                      <span>·</span>
                      <span className="text-rose-600 font-bold">{selectedPatient.bloodGroup || 'O+'}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Action Toolbar */}
              <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenConsultation(selectedPatient)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Stethoscope size={13} />
                  <span>{language === 'ar' ? 'فحص سريري' : 'Consulter'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedPatient)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                  title="Modifier"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(selectedPatient.id)}
                  className={`p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold transition-colors ${
                    pinnedIds.has(selectedPatient.id) ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  title="Épingler"
                >
                  <Pin size={14} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-neutral-100 dark:border-neutral-800 text-xs font-semibold px-2 bg-white dark:bg-neutral-850 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('dossier')}
                  className={`py-2 px-2.5 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === 'dossier'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'الملف' : 'Dossier'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('vitals')}
                  className={`py-2 px-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'vitals'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Activity size={12} />
                  <span>{language === 'ar' ? 'المؤشرات الحيوية' : 'Constantes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('allergies')}
                  className={`py-2 px-2.5 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === 'allergies'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'الحساسيات' : 'Vigilances'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('labs')}
                  className={`py-2 px-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'labs'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Microscope size={12} />
                  <span>{language === 'ar' ? 'المخابر' : 'Biologie'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`py-2 px-2.5 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === 'history'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'الفحوصات' : 'Historique'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`py-2 px-2.5 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === 'notes'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'الملاحظات' : 'Notes'}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'dossier' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'بيانات المريض' : 'État Civil & Contact'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'تاريخ الميلاد' : 'Date de naissance'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedPatient.dateOfBirth || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedPatient.phone}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'بطاقة الشفاء / الهوية' : 'NSS / Chifa'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedPatient.nationalId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'تاريخ التسجيل' : 'Date d\'inscription'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
                          {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : '2026-05-01'}
                        </span>
                      </div>
                    </div>

                    {selectedPatient.emergencyContact && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                        <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Phone size={12} />
                          <span>{language === 'ar' ? 'جهة الاتصال في حالات الطوارئ' : 'Personne à contacter en urgence'}</span>
                        </div>
                        <div className="font-semibold text-neutral-900 dark:text-white pt-1">
                          {selectedPatient.emergencyContact}
                        </div>
                        <div className="text-neutral-600 dark:text-neutral-400 font-mono text-xs">
                          {selectedPatient.emergencyPhone || '—'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Constantes & Biométrie (Longitudinal Curves) */}
                {activeTab === 'vitals' && (
                  <div className="space-y-4 text-xs">
                    {/* BMI & Current Key Indicators */}
                    {(() => {
                      const history = selectedPatient.vitalsHistory || [];
                      const latest = history.length > 0 ? history[history.length - 1] : null;
                      const weight = latest?.weightKg || 72;
                      const height = latest?.heightCm || 172;
                      const heightM = height / 100;
                      const bmi = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : '24.3';
                      const bmiNum = parseFloat(bmi);
                      let bmiLabel = 'Poids normal';
                      let bmiColor = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
                      if (bmiNum < 18.5) {
                        bmiLabel = 'Insuffisance pondérale';
                        bmiColor = 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
                      } else if (bmiNum >= 25 && bmiNum < 30) {
                        bmiLabel = 'Surpoids';
                        bmiColor = 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
                      } else if (bmiNum >= 30) {
                        bmiLabel = 'Obésité';
                        bmiColor = 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
                      }

                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                              <span className="text-[10px] font-semibold text-neutral-400 block uppercase">Indice de Masse Corporelle</span>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-xl font-bold font-mono text-neutral-900 dark:text-white">{bmi}</span>
                                <span className="text-[10px] text-neutral-400">kg/m²</span>
                              </div>
                              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${bmiColor}`}>
                                {bmiLabel}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                              <span className="text-[10px] font-semibold text-neutral-400 block uppercase">Saturation O₂ & Pouls</span>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
                                  {latest?.spO2 || 98}%
                                </span>
                                <span className="text-[10px] text-neutral-400">SpO₂</span>
                              </div>
                              <div className="text-[11px] font-mono text-neutral-500 mt-1">
                                FC: <strong className="text-neutral-800 dark:text-neutral-200">{latest?.heartRateBpm || 74}</strong> bpm
                              </div>
                            </div>
                          </div>

                          {/* BP Curve SVG */}
                          <div className="p-3 rounded-xl bg-white dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 shadow-2xs">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <Activity size={13} className="text-[#C4785A]" />
                                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                  {language === 'ar' ? 'منحنى ضغط الدم (mmHg)' : 'Courbe Tension Artérielle (mmHg)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono">
                                <span className="flex items-center gap-1 text-rose-600 font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Sys
                                </span>
                                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Dia
                                </span>
                              </div>
                            </div>

                            {/* SVG Chart */}
                            <div className="w-full h-32 relative bg-neutral-50/70 dark:bg-neutral-900/40 rounded-lg p-2 border border-neutral-100 dark:border-neutral-800">
                              <svg viewBox="0 0 320 100" className="w-full h-full overflow-visible">
                                {/* Normal BP Zone (Systolic 110-130 -> y: 35-25, Diastolic 70-85 -> y: 65-55) */}
                                <rect x="0" y="30" width="320" height="45" fill="rgba(16, 185, 129, 0.08)" />
                                <line x1="0" y1="50" x2="320" y2="50" stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />

                                {history.length > 1 ? (
                                  <>
                                    {/* Systolic Line */}
                                    <polyline
                                      fill="none"
                                      stroke="#ef4444"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      points={history
                                        .map((pt, idx) => {
                                          const x = (idx / (history.length - 1)) * 300 + 10;
                                          const sys = pt.systolicBp ?? pt.systolic ?? 120;
                                          const y = 90 - ((sys - 90) / 80) * 70;
                                          return `${x},${Math.max(10, Math.min(90, y))}`;
                                        })
                                        .join(' ')}
                                    />
                                    {/* Diastolic Line */}
                                    <polyline
                                      fill="none"
                                      stroke="#f59e0b"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      points={history
                                        .map((pt, idx) => {
                                          const x = (idx / (history.length - 1)) * 300 + 10;
                                          const dia = pt.diastolicBp ?? pt.diastolic ?? 80;
                                          const y = 90 - ((dia - 50) / 60) * 60;
                                          return `${x},${Math.max(20, Math.min(90, y))}`;
                                        })
                                        .join(' ')}
                                    />
                                    {/* Data Points */}
                                    {history.map((pt, idx) => {
                                      const x = (idx / (history.length - 1)) * 300 + 10;
                                      const sys = pt.systolicBp ?? pt.systolic ?? 120;
                                      const dia = pt.diastolicBp ?? pt.diastolic ?? 80;
                                      const ySys = 90 - ((sys - 90) / 80) * 70;
                                      const yDia = 90 - ((dia - 50) / 60) * 60;
                                      return (
                                        <g key={idx}>
                                          <circle cx={x} cy={Math.max(10, Math.min(90, ySys))} r="3.5" fill="#ef4444" className="hover:r-5 transition-all" />
                                          <circle cx={x} cy={Math.max(20, Math.min(90, yDia))} r="3" fill="#f59e0b" />
                                        </g>
                                      );
                                    })}
                                  </>
                                ) : (
                                  <text x="160" y="55" textAnchor="middle" fill="#9ca3af" fontSize="11">
                                    Historique insuffisant pour tracer la courbe
                                  </text>
                                )}
                              </svg>
                            </div>

                            {/* History table list */}
                            <div className="mt-2 space-y-1">
                              {history.slice(-3).reverse().map((h, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0 font-mono">
                                  <span className="text-neutral-400">{h.date}</span>
                                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                                    {h.systolicBp}/{h.diastolicBp} mmHg
                                  </span>
                                  <span className="text-neutral-500">{h.heartRateBpm} bpm</span>
                                  <span className="text-neutral-500">{h.bloodSugarMgDl ? `${h.bloodSugarMgDl} g/l` : '—'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick Add Vitals Form */}
                          {!showAddVitals ? (
                            <button
                              type="button"
                              onClick={() => setShowAddVitals(true)}
                              className="w-full py-2 px-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-[#C4785A] flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Plus size={13} />
                              <span>{language === 'ar' ? 'تسجيل قراءة جديدة' : 'Prendre de nouvelles constantes'}</span>
                            </button>
                          ) : (
                            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                              <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">
                                Nouvelle Prise de Constantes
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] text-neutral-500">Sys (mmHg)</label>
                                  <input
                                    type="number"
                                    value={newSys}
                                    onChange={(e) => setNewSys(e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-neutral-500">Dia (mmHg)</label>
                                  <input
                                    type="number"
                                    value={newDia}
                                    onChange={(e) => setNewDia(e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-neutral-500">Pouls (bpm)</label>
                                  <input
                                    type="number"
                                    value={newHr}
                                    onChange={(e) => setNewHr(e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] text-neutral-500">Poids (kg)</label>
                                  <input
                                    type="number"
                                    value={newWeight}
                                    onChange={(e) => setNewWeight(e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-neutral-500">Glycémie (g/L)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={newSugar}
                                    onChange={(e) => setNewSugar(e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-neutral-500">SpO₂ (%)</label>
                                  <input
                                    type="number"
                                    value={newSpo2}
                                    onChange={(e) => setNewSpo2(e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setShowAddVitals(false)}
                                  className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPoint: any = {
                                      date: new Date().toISOString().slice(0, 10),
                                      systolic: parseInt(newSys) || 120,
                                      diastolic: parseInt(newDia) || 80,
                                      pulseBpm: parseInt(newHr) || 72,
                                      tempCelsius: 37,
                                      weightKg: parseFloat(newWeight) || 70,
                                      systolicBp: parseInt(newSys) || 120,
                                      diastolicBp: parseInt(newDia) || 80,
                                      heartRateBpm: parseInt(newHr) || 72,
                                      heightCm: parseInt(newHeight) || 172,
                                      bloodSugarMgDl: parseFloat(newSugar) || 0.95,
                                      spO2: parseInt(newSpo2) || 98,
                                      spO2Percent: parseInt(newSpo2) || 98,
                                    };
                                    const updated = {
                                      ...selectedPatient,
                                      vitalsHistory: [...(selectedPatient.vitalsHistory || []), newPoint],
                                    };
                                    updatePatient(updated);
                                    setSelectedPatient(updated);
                                    setShowAddVitals(false);
                                    showToast('Constantes ajoutées au dossier', 'success');
                                  }}
                                  className="px-3 py-1 bg-[#C4785A] text-white rounded text-xs font-semibold shadow-2xs"
                                >
                                  Enregistrer
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Biologie & Laboratoire */}
                {activeTab === 'labs' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'التحاليل البيولوجية' : 'Bilans Biologiques'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLabRecord(null);
                          setIsLabModalOpen(true);
                        }}
                        className="px-2 py-1 rounded bg-[#C4785A] text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                      >
                        <Plus size={11} />
                        <span>{language === 'ar' ? 'تحليل جديد' : 'Nouveau Bilan'}</span>
                      </button>
                    </div>

                    {labRecords.filter((l) => l.patientId === selectedPatient.id).length > 0 ? (
                      <div className="space-y-2">
                        {labRecords
                          .filter((l) => l.patientId === selectedPatient.id)
                          .map((record) => {
                            const abnormalCount = record.parameters.filter((p) => p.isAbnormal).length;
                            return (
                              <div
                                key={record.id}
                                onClick={() => {
                                  setSelectedLabRecord(record);
                                  setIsLabModalOpen(true);
                                }}
                                className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-[#C4785A] cursor-pointer transition-all shadow-2xs"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-neutral-900 dark:text-white">
                                    {record.panelName || record.testCategory}
                                  </span>
                                  {abnormalCount > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800">
                                      {abnormalCount} anomalie{abnormalCount > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200">
                                      Normal
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono flex items-center justify-between">
                                  <span>{record.testDate || record.date} · {record.orderingDoctor || record.doctorName}</span>
                                  <span className="text-[#C4785A] font-semibold">Voir le bilan →</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-neutral-400">
                        <Microscope size={28} className="mx-auto mb-2 opacity-40" />
                        <p>{language === 'ar' ? 'لا توجد تحاليل بيولوجية مسجلة' : 'Aucun bilan biologique pour ce patient.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'allergies' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 space-y-2">
                      <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert size={12} />
                        <span>{language === 'ar' ? 'الحساسيات الدوائية' : 'Allergies Médicamenteuses'}</span>
                      </div>
                      {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedPatient.allergies.map((allergy, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold text-xs"
                            >
                              ⚠️ {allergy}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-neutral-500 italic pt-1">
                          {language === 'ar' ? 'لا توجد حساسيات دوائية مسجلة' : 'Aucune allergie médicamenteuse déclarée.'}
                        </p>
                      )}
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                        <HeartPulse size={12} />
                        <span>{language === 'ar' ? 'الأمراض المزمنة' : 'Pathologies Chroniques'}</span>
                      </div>
                      {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {selectedPatient.chronicConditions.map((cond, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 font-medium text-neutral-800 dark:text-neutral-200"
                            >
                              • {cond}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-neutral-500 italic pt-1">
                          {language === 'ar' ? 'لا توجد أمراض مزمنة مسجلة' : 'Aucun antécédent chronique majeur.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-2 text-xs">
                    {consultations.filter((c) => c.patientId === selectedPatient.id).length > 0 ? (
                      consultations
                        .filter((c) => c.patientId === selectedPatient.id)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-900 dark:text-white">
                                {c.diagnosis || c.chiefComplaint}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {new Date(c.consultationDate).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              {c.clinicalExam}
                            </p>
                            {c.vitals && (
                              <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-neutral-400">
                                <span>TA: {c.vitals.bloodPressure}</span>
                                <span>·</span>
                                <span>T°: {c.vitals.temperatureCelsius}°C</span>
                                <span>·</span>
                                <span>FC: {c.vitals.heartRateBpm} bpm</span>
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-neutral-400">
                        <Stethoscope size={28} className="mx-auto mb-2 opacity-40" />
                        <p>{language === 'ar' ? 'لا توجد فحوصات سابقة لهذا المريض' : 'Aucune consultation enregistrée.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                      {language === 'ar' ? 'الملاحظات السريرية والتوصيات' : 'Observations Cliniques & Suivi'}
                    </label>
                    <textarea
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      rows={8}
                      placeholder={language === 'ar' ? 'أدخل ملاحظات الطبيب...' : 'Saisir les remarques médicales, consignes, prescriptions spécifiques...'}
                      className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-[#C4785A] outline-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-neutral-400">
                        {noteSaved && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check size={12} /> {language === 'ar' ? 'تم الحفظ' : 'Enregistré'}
                          </span>
                        )}
                      </span>
                      <AtriumButton
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={<Save size={13} />}
                        onClick={handleSaveNotes}
                      >
                        <span>{language === 'ar' ? 'حفظ الملاحظات' : 'Enregistrer'}</span>
                      </AtriumButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient Create / Edit Modal */}
      {isPatientModalOpen && (
        <MedicalPatientModal
          isOpen={isPatientModalOpen}
          onClose={() => {
            setIsPatientModalOpen(false);
            setPatientToEdit(null);
          }}
          patientToEdit={patientToEdit}
          onSave={(p) => {
            if (patientToEdit) {
              updatePatient(p);
              if (selectedPatient?.id === p.id) setSelectedPatient(p);
              showToast(language === 'ar' ? 'تم تحديث الملف الطبي' : 'Dossier patient mis à jour', 'success');
            } else {
              addPatient(p);
              showToast(language === 'ar' ? 'تم إنشاء الملف الطبي بنجاح' : 'Dossier patient créé avec succès', 'success');
            }
            setIsPatientModalOpen(false);
            setPatientToEdit(null);
          }}
        />
      )}

      {/* Quick Consultation Modal */}
      {isConsultModalOpen && consultPatient && (
        <MedicalConsultationModal
          isOpen={isConsultModalOpen}
          onClose={() => {
            setIsConsultModalOpen(false);
            setConsultPatient(null);
          }}
          patient={consultPatient}
          onSave={(cons) => {
            addConsultation(cons);
            setIsConsultModalOpen(false);
            setConsultPatient(null);
            showToast(language === 'ar' ? 'تم حفظ الفحص السريري بنجاح' : 'Consultation enregistrée avec succès', 'success');
          }}
        />
      )}

      {/* Diagnostic Lab Vault Modal */}
      {isLabModalOpen && selectedPatient && (
        <MedicalLabViewerModal
          isOpen={isLabModalOpen}
          patient={selectedPatient}
          labRecords={labRecords}
          practitioners={practitioners}
          onClose={() => {
            setIsLabModalOpen(false);
            setSelectedLabRecord(null);
          }}
          onAddLabRecord={(newRec) => {
            addLabRecord(newRec);
            setIsLabModalOpen(false);
            setSelectedLabRecord(null);
            showToast(language === 'ar' ? 'تم تسجيل التحليل المخبري' : 'Bilan biologique enregistré', 'success');
          }}
        />
      )}
    </div>
  );
};

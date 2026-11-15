import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  UserCheck,
  UserPlus,
  Phone,
  AlertCircle,
  HeartPulse,
  Edit,
  Pin,
  Download,
  Stethoscope,
  ShieldAlert,
  Save,
  Check,
  Plus,
  Microscope,
  Activity,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MedicalPatient } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalPatientModal } from './MedicalPatientModal';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalLabViewerModal } from './MedicalLabViewerModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const MedicalPatientsView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

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
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [bloodFilter, setBloodFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['pat_01']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<MedicalPatient | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultPatient, setConsultPatient] = useState<MedicalPatient | null>(null);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);

  const [inspectedPatient, setInspectedPatient] = useState<MedicalPatient | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dossier');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Vitals capture form inside inspector
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [newSys, setNewSys] = useState('120');
  const [newDia, setNewDia] = useState('80');
  const [newHr, setNewHr] = useState('72');
  const [newWeight, setNewWeight] = useState('75');
  const [newHeight] = useState('172');
  const [newSugar, setNewSugar] = useState('95');
  const [newSpo2, setNewSpo2] = useState('98');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activePatient = useMemo(() => {
    if (!inspectedPatient) return null;
    return patients.find((p) => p.id === inspectedPatient.id) || null;
  }, [inspectedPatient, patients]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    patients.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [patients, branchesById, currentBranch, language]);

  const sensitiveCount = useMemo(
    () =>
      patients.filter(
        (p) =>
          (p.allergies && p.allergies.length > 0) ||
          (p.chronicConditions && p.chronicConditions.length > 0)
      ).length,
    [patients]
  );

  const regularCount = Math.max(0, patients.length - sensitiveCount);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (bloodFilter !== 'All' && (p.bloodGroup || 'O+') !== bloodFilter) {
        return false;
      }
      const hasVigilance =
        (p.allergies && p.allergies.length > 0) ||
        (p.chronicConditions && p.chronicConditions.length > 0);
      if (filterCondition === 'Sensitive' && !hasVigilance) return false;
      if (filterCondition === 'Regular' && hasVigilance) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesId = Boolean(p.nationalId && p.nationalId.toLowerCase().includes(q));
        const matchesChifa = Boolean(p.chifaCardNumber && p.chifaCardNumber.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesId && !matchesChifa) return false;
      }
      return true;
    });
  }, [
    patients,
    branchFilter,
    bloodFilter,
    filterCondition,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

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
      if (sortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
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
  }, [filteredPatients, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenAdd = useCallback(() => {
    setPatientToEdit(null);
    setIsPatientModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((p: MedicalPatient) => {
    setPatientToEdit(p);
    setIsPatientModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (p: MedicalPatient) => {
      deletePatient(p.id);
      if (inspectedPatient?.id === p.id) setInspectedPatient(null);
      showToast({
        type: 'success',
        title: isAr ? 'تم أرشفة الملف' : isFr ? 'Dossier archivé' : 'Record Archived',
        message: isAr ? 'تم حذف ملف المريض بنجاح' : `Dossier ${p.fullName} archivé`,
      });
    },
    [deletePatient, inspectedPatient, isAr, isFr]
  );

  const handleTogglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectPatient = useCallback((p: MedicalPatient, opener?: HTMLElement | null) => {
    if (opener) setDrawerOpenerEl(opener);
    setInspectedPatient(p);
    setInspectorNotes(p.notes || '');
    setNoteSaved(false);
    setShowAddVitals(false);
  }, []);

  const handleSaveNotes = () => {
    if (!activePatient) return;
    const updated = { ...activePatient, notes: inspectorNotes };
    updatePatient(updated);
    setInspectedPatient(updated);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast({
      type: 'success',
      title: isAr ? 'تم الحفظ' : isFr ? 'Notes enregistrées' : 'Notes Saved',
      message: isAr ? 'تم حفظ الملاحظات السريرية' : 'Observations cliniques enregistrées',
    });
  };

  const handleOpenConsultation = useCallback((p: MedicalPatient) => {
    setConsultPatient(p);
    setIsConsultModalOpen(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Full Name',
      'Branch',
      'Phone',
      'National ID / Chifa',
      'Blood Group',
      'Allergies',
      'Chronic Conditions',
    ];
    const rows = sortedPatients.map((p) => [
      p.id,
      p.fullName,
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
      p.phone,
      p.nationalId || p.chifaCardNumber || '',
      p.bloodGroup || '',
      (p.allergies || []).join('; '),
      (p.chronicConditions || []).join('; '),
    ]);
    downloadCsvSafe(`medical_patients_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تم التصدير' : isFr ? 'Export terminé' : 'Export Complete',
      message: isAr ? 'تم تصدير سجل المرضى' : 'Export du registre patient terminé',
    });
  }, [sortedPatients, branchesById, currentBranch, language, isAr, isFr]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCondition('All');
    setBranchFilter('All');
    setBloodFilter('All');
  }, []);

  const activeFiltersCount =
    (filterCondition !== 'All' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0) +
    (bloodFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterCondition !== 'All') {
      chips.push({
        key: 'condition',
        label:
          filterCondition === 'Sensitive'
            ? isAr
              ? 'حساسيات'
              : isFr
              ? 'Vigilances'
              : 'Alerts'
            : isAr
            ? 'عادي'
            : isFr
            ? 'Standards'
            : 'Regular',
        onRemove: () => setFilterCondition('All'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (bloodFilter !== 'All') {
      chips.push({
        key: 'blood',
        label: `${isAr ? 'الفصيلة' : isFr ? 'Groupe' : 'Blood'}: ${bloodFilter}`,
        onRemove: () => setBloodFilter('All'),
      });
    }
    return chips;
  }, [filterCondition, branchFilter, bloodFilter, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'condition',
        label: isAr ? 'الحالة الصحية' : isFr ? 'Profil Clinique' : 'Clinical Profile',
        value: filterCondition,
        onChange: (val) => setFilterCondition(val as 'All' | 'Sensitive' | 'Regular'),
        kind: 'segmented',
        options: [
          {
            value: 'All',
            label: isAr ? 'الكل' : isFr ? 'Tous' : 'All',
            count: patients.length,
          },
          {
            value: 'Sensitive',
            label: isAr ? 'حساسيات' : isFr ? 'Vigilances' : 'Alerts',
            count: sensitiveCount,
          },
          {
            value: 'Regular',
            label: isAr ? 'عادي' : isFr ? 'Standards' : 'Regular',
            count: regularCount,
          },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / العيادة' : isFr ? 'Branche / Clinique' : 'Branch / Clinic',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'جميع الفروع' : isFr ? 'Toutes' : 'All Branches',
            count: patients.length,
          },
          ...Array.from(branchCounts.entries()).map(([name, count]) => ({
            value: name,
            label: name,
            count,
          })),
        ],
      },
      {
        id: 'blood',
        label: isAr ? 'فصيلة الدم' : isFr ? 'Groupe Sanguin' : 'Blood Group',
        value: bloodFilter,
        onChange: setBloodFilter,
        kind: 'tiles',
        columns: 3,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All' },
          { value: 'O+', label: 'O+' },
          { value: 'A+', label: 'A+' },
          { value: 'B+', label: 'B+' },
          { value: 'AB+', label: 'AB+' },
          { value: 'O-', label: 'O-' },
          { value: 'A-', label: 'A-' },
        ],
      },
    ],
    [
      filterCondition,
      branchFilter,
      bloodFilter,
      patients.length,
      sensitiveCount,
      regularCount,
      branchCounts,
      isAr,
      isFr,
    ]
  );

  const columns: ColumnDefinition<MedicalPatient>[] = useMemo(
    () => [
      {
        key: 'name',
        header: isAr ? 'المريض / الملف' : 'Patient / Dossier EHR',
        width: '2.8*',
        sortable: true,
        renderCell: (p) => {
          const isPinned = pinnedIds.has(p.id);
          const hasVigilance =
            (p.allergies && p.allergies.length > 0) ||
            (p.chronicConditions && p.chronicConditions.length > 0);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                {p.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-black dark:text-white capitalize truncate">
                    {p.fullName}
                  </span>
                  {isPinned && (
                    <span className="text-[10px] text-amber-500 font-bold">VIP</span>
                  )}
                  {hasVigilance && (
                    <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5">
                      <ShieldAlert size={11} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
                  <span>
                    NSS: {p.nationalId ? `${p.nationalId.slice(0, 8)}...` : 'CHIFA-OK'}
                  </span>
                  <span>·</span>
                  <span>
                    {p.gender === 'Male' ? (isAr ? 'ذكر' : 'Homme') : isAr ? 'أنثى' : 'Femme'}
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.6*',
        sortable: true,
        renderCell: (p) => {
          const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
          return (
            <span className="text-xs font-medium text-black/70 dark:text-white/75 truncate block max-w-[150px]">
              {bName}
            </span>
          );
        },
      },
      {
        key: 'contact',
        header: isAr ? 'الهاتف والطوارئ' : 'Téléphone & Urgence',
        width: '2.1*',
        renderCell: (p) => (
          <div>
            <div className="text-xs font-mono font-medium text-black dark:text-white">{p.phone}</div>
            {p.emergencyContact && (
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate max-w-[170px] mt-0.5">
                {p.emergencyContact} ({p.emergencyPhone || '—'})
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'blood',
        header: isAr ? 'الفصيلة والحساسيات' : 'Groupe & Vigilance',
        width: '2.1*',
        sortable: true,
        renderCell: (p) => {
          const hasAllergies = p.allergies && p.allergies.length > 0;
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs font-mono">
                  {p.bloodGroup || 'O+'}
                </span>
                {hasAllergies && p.allergies && (
                  <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-1 bg-rose-50/50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
                    <AlertCircle size={10} />
                    {p.allergies[0]}
                  </span>
                )}
              </div>
              {p.chronicConditions && p.chronicConditions.length > 0 && (
                <span className="text-[10px] text-black/55 dark:text-white/55 truncate max-w-[150px]">
                  {p.chronicConditions.join(', ')}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: isAr ? 'حالة السجل' : 'Statut Dossier',
        width: '1.6*',
        renderCell: (p) => {
          const patientCons = consultations.filter((c) => c.patientId === p.id);
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {patientCons.length} {isAr ? 'فحوصات' : 'visites'}
            </span>
          );
        },
      },
    ],
    [pinnedIds, consultations, branchesById, currentBranch, language, isAr, isFr]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: patients.length > 0,
  });

  if (showSkeleton && (patients.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '140px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<UserCheck size={22} />}
        title={isAr ? 'المرضى' : 'Patients'}
        subtitle={`${patients.length} ${isAr ? 'ملفات طبية' : isFr ? 'dossiers médicaux EHR' : 'EHR records'}`}
        primaryAction={{
          label: isAr ? 'مريض جديد' : isFr ? 'Nouveau Patient' : 'New Patient',
          onClick: handleOpenAdd,
          icon: <UserPlus size={15} strokeWidth={2.5} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الرعاية الصحية والسجلات' : 'Indicateurs de Prise en Charge Clinique'}
        language={language}
        primaryCard={{
          label: isAr ? 'ملفات بحاجة لرعاية خاصة' : 'Vigilances & Allergies',
          badgeText: isAr ? 'تنبيه' : isFr ? 'Vigilance' : 'Alerts',
          count: sensitiveCount,
          tone: 'terracotta',
          isActive: filterCondition === 'Sensitive',
          onToggle: () =>
            setFilterCondition((prev) => (prev === 'Sensitive' ? 'All' : 'Sensitive')),
        }}
        secondaryCard={{
          label: isAr ? 'ملفات قياسية مكتملة' : 'Dossiers Standards',
          badgeText: isAr ? 'محدث' : isFr ? 'Actifs' : 'Active',
          count: regularCount,
          tone: 'emerald',
          isActive: filterCondition === 'Regular',
          onToggle: () =>
            setFilterCondition((prev) => (prev === 'Regular' ? 'All' : 'Regular')),
        }}
        darkCard={{
          label: isAr ? 'معايير الأمان الصحي' : 'Dossier Médical Partagé',
          badgeCount: consultations.length,
          badgeSuffix: isAr ? ' فحص' : ' visites',
          valueCount: 100,
          valueSuffix: '%',
          caption: isAr ? 'بطاقات الشفاء والتحقق الرقمي' : 'Cartes Chifa & Identifiants vérifiés',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'دليل المرضى' : 'Registre des Patients'}
          liveRegionText={`${sortedPatients.length} ${isAr ? 'مريض' : 'patients'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث بالاسم أو الهاتف أو الشفاء...' : 'Recherche nom, tél, Chifa...'
          }
          statusValue={filterCondition}
          onStatusChange={(val) => setFilterCondition(val as 'All' | 'Sensitive' | 'Regular')}
          statusOptions={[
            {
              value: 'All',
              label: isAr ? 'الكل' : isFr ? 'Tous' : 'All',
              count: patients.length,
            },
            {
              value: 'Sensitive',
              label: isAr ? 'حساسيات' : isFr ? 'Vigilances' : 'Alerts',
              count: sensitiveCount,
            },
            {
              value: 'Regular',
              label: isAr ? 'عادي' : isFr ? 'Standards' : 'Regular',
              count: regularCount,
            },
          ]}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection
          hideToolbar
          data={sortedPatients}
          keyExtractor={(p) => p.id}
          defaultViewMode={viewMode}
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          openItemId={activePatient?.id ?? null}
          onItemClick={handleSelectPatient}
          onViewDetails={handleSelectPatient}
          onEdit={(p) => handleOpenEdit(p)}
          onDelete={handleDelete}
          isPinned={(p) => pinnedIds.has(p.id)}
          onTogglePin={(p) => handleTogglePin(p.id)}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير السجلات' : 'Exporter Dossiers',
            icon: <Download size={14} />,
            onClick: handleExportCSV,
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deletePatient(id));
            setSelectedIds(new Set());
            if (activePatient && ids.has(activePatient.id)) setInspectedPatient(null);
            showToast({
              type: 'success',
              title: isAr ? 'تم الحذف' : 'Suppression effectuée',
              message: isAr ? 'تم حذف المرضى المحددين' : 'Patients sélectionnés supprimés',
            });
          }}
          customActions={(p) => [
            {
              id: 'consult',
              label: isAr ? 'فحص سريري' : 'Consultation',
              icon: <Stethoscope size={13} />,
              variant: 'primary',
              onClick: () => handleOpenConsultation(p),
            },
          ]}
          renderCard={(p) => {
            const isPinned = pinnedIds.has(p.id);
            const hasVigilance =
              (p.allergies && p.allergies.length > 0) ||
              (p.chronicConditions && p.chronicConditions.length > 0);
            return (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="w-16 h-16 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                  {p.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                  <h3 className="text-sm font-bold text-black dark:text-white truncate tracking-tight">
                    {p.fullName}
                  </h3>
                  {isPinned && <span className="text-xs text-amber-500">VIP</span>}
                </div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs font-mono">
                    {p.bloodGroup || 'O+'}
                  </span>
                  <span className="text-[11px] font-semibold text-black/55 dark:text-white/55">
                    {p.gender === 'Male' ? (isAr ? 'ذكر' : 'Homme') : isAr ? 'أنثى' : 'Femme'}
                  </span>
                </div>
                <div className="w-full pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                  <div className="font-mono text-black/70 dark:text-white/75 text-[11px]">{p.phone}</div>
                  <div className="truncate text-black/55 dark:text-white/55 text-[11px]">
                    {hasVigilance ? (
                      <span className="text-rose-500 font-medium">
                        {p.allergies?.[0] || p.chronicConditions?.[0]}
                      </span>
                    ) : (
                      <span>{isAr ? 'سجل طبي سليم' : 'Sans contre-indication'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
          emptyTitle={isAr ? 'لا يوجد مرضى مطابقون' : 'Aucun dossier patient'}
          emptyDescription={
            isAr
              ? 'أضف أول ملف مريض أو أعد ضبط معايير البحث'
              : 'Ajoutez un premier dossier médical ou modifiez vos filtres'
          }
          primaryActionLabel={isAr ? 'مريض جديد' : 'Créer un patient'}
          onAddFirstItem={handleOpenAdd}
          onResetFilters={handleResetFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedPatients.length}
        entityPluralLabel={isAr ? 'مريض' : isFr ? 'patients' : 'patients'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={!!activePatient}
        item={activePatient}
        allItems={sortedPatients}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activePatient?.fullName || ''}
        subtitle={
          activePatient
            ? `NSS: ${activePatient.nationalId || 'CHIFA-VALIDE'} · ${activePatient.bloodGroup || 'O+'}`
            : ''
        }
        avatarText={activePatient?.fullName?.charAt(0).toUpperCase() || 'P'}
        avatarColor="#d4522f"
        branchName={
          activePatient
            ? resolveRecordBranch(activePatient, branchesById, currentBranch, language).name
            : ''
        }
        statusLabel={
          activePatient &&
          ((activePatient.allergies && activePatient.allergies.length > 0) ||
            (activePatient.chronicConditions && activePatient.chronicConditions.length > 0))
            ? isAr
              ? 'حساسية/مزمن'
              : 'Vigilance Active'
            : isAr
            ? 'سجل سليم'
            : 'Dossier Standard'
        }
        tabs={[
          { id: 'dossier', label: isAr ? 'الملف' : 'Dossier' },
          { id: 'vitals', label: isAr ? 'المؤشرات' : 'Constantes' },
          { id: 'allergies', label: isAr ? 'الحساسيات' : 'Vigilances' },
          { id: 'labs', label: isAr ? 'المخابر' : 'Biologie' },
          { id: 'history', label: isAr ? 'الفحوصات' : 'Historique' },
          { id: 'notes', label: isAr ? 'الملاحظات' : 'Notes' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(p) => handleSelectPatient(p)}
        onClose={() => setInspectedPatient(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(patient, tab) => (
          <div className="space-y-4">
            {/* Quick Clinical Action Bar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenConsultation(patient)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Stethoscope size={13} />
                <span>{isAr ? 'فحص سريري' : 'Consulter'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(patient)}
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-neutral-100 text-xs font-semibold transition-colors cursor-pointer"
                title={isAr ? 'تعديل' : 'Modifier'}
                aria-label={isAr ? 'تعديل' : 'Modifier'}
              >
                <Edit size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleTogglePin(patient.id)}
                className={`p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold transition-colors cursor-pointer ${
                  pinnedIds.has(patient.id)
                    ? 'text-amber-500'
                    : 'text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white'
                }`}
                title={isAr ? 'تثبيت' : 'Épingler'}
                aria-label={isAr ? 'تثبيت' : 'Épingler'}
              >
                <Pin size={14} />
              </button>
            </div>

            {tab === 'dossier' && (
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                    {isAr ? 'بيانات المريض' : 'État Civil & Contact'}
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'تاريخ الميلاد' : 'Date de naissance'}
                    </span>
                    <span className="font-semibold text-black dark:text-white font-mono">
                      {patient.dateOfBirth || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'الهاتف' : 'Téléphone'}
                    </span>
                    <span className="font-semibold text-black dark:text-white font-mono">
                      {patient.phone}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'بطاقة الشفاء / الهوية' : 'NSS / Chifa'}
                    </span>
                    <span className="font-semibold text-black dark:text-white font-mono">
                      {patient.nationalId || patient.chifaCardNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'تاريخ التسجيل' : "Date d'inscription"}
                    </span>
                    <span className="font-semibold text-black dark:text-white font-mono">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : '2026-05-01'}
                    </span>
                  </div>
                </div>

                {patient.emergencyContact && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={12} />
                      <span>
                        {isAr
                          ? 'جهة الاتصال في حالات الطوارئ'
                          : 'Personne à contacter en urgence'}
                      </span>
                    </div>
                    <div className="font-semibold text-black dark:text-white pt-1">
                      {patient.emergencyContact}
                    </div>
                    <div className="text-black/70 dark:text-white/75 font-mono text-xs">
                      {patient.emergencyPhone || '—'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'vitals' && (
              <div className="space-y-4 text-xs">
                {(() => {
                  const history = patient.vitalsHistory || [];
                  const latest = history.length > 0 ? history[history.length - 1] : null;
                  const weight = latest?.weightKg || 72;
                  const heightM = (latest?.heightCm || 172) / 100;
                  const bmi = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : '24.3';
                  const bmiNum = parseFloat(bmi);
                  let bmiLabel = 'Poids normal';
                  let bmiColor =
                    'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
                  if (bmiNum < 18.5) {
                    bmiLabel = 'Insuffisance pondérale';
                    bmiColor =
                      'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
                  } else if (bmiNum >= 25 && bmiNum < 30) {
                    bmiLabel = 'Surpoids';
                    bmiColor =
                      'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
                  } else if (bmiNum >= 30) {
                    bmiLabel = 'Obésité';
                    bmiColor =
                      'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
                  }

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                          <span className="text-[10px] font-semibold text-black/55 dark:text-white/55 block uppercase">
                            Indice de Masse Corporelle
                          </span>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-bold font-mono text-black dark:text-white">
                              {bmi}
                            </span>
                            <span className="text-[10px] text-black/55 dark:text-white/55">kg/m²</span>
                          </div>
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${bmiColor}`}
                          >
                            {bmiLabel}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                          <span className="text-[10px] font-semibold text-black/55 dark:text-white/55 block uppercase">
                            Saturation O₂ & Pouls
                          </span>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-bold font-mono text-black dark:text-white">
                              {latest?.spO2Percent ?? latest?.spO2 ?? 98}%
                            </span>
                            <span className="text-[10px] text-black/55 dark:text-white/55">SpO₂</span>
                          </div>
                          <div className="text-[11px] font-mono text-black/55 dark:text-white/55 mt-1">
                            FC:{' '}
                            <strong className="text-black dark:text-white">
                              {latest?.pulseBpm ?? latest?.heartRateBpm ?? 74}
                            </strong>{' '}
                            bpm
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Activity size={13} className="text-[#d4522f]" />
                            <span className="text-xs font-bold text-black dark:text-white">
                              {isAr ? 'منحنى ضغط الدم (mmHg)' : 'Courbe Tension Artérielle (mmHg)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="flex items-center gap-1 text-rose-600 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                              Sys
                            </span>
                            <span className="flex items-center gap-1 text-amber-600 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                              Dia
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-32 relative bg-neutral-50/70 dark:bg-neutral-900/40 rounded-lg p-2 border border-neutral-100 dark:border-neutral-800">
                          <svg viewBox="0 0 320 100" className="w-full h-full overflow-visible">
                            <rect x="0" y="30" width="320" height="45" fill="rgba(16, 185, 129, 0.08)" />
                            <line
                              x1="0"
                              y1="50"
                              x2="320"
                              y2="50"
                              stroke="rgba(0,0,0,0.06)"
                              strokeDasharray="3 3"
                            />
                            {history.length > 1 ? (
                              <>
                                <polyline
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={history
                                    .map((pt, idx) => {
                                      const x = (idx / (history.length - 1)) * 300 + 10;
                                      const y = 90 - (((pt.systolicBp ?? pt.systolic ?? 120) - 90) / 80) * 70;
                                      return `${x},${Math.max(10, Math.min(90, y))}`;
                                    })
                                    .join(' ')}
                                />
                                <polyline
                                  fill="none"
                                  stroke="#f59e0b"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={history
                                    .map((pt, idx) => {
                                      const x = (idx / (history.length - 1)) * 300 + 10;
                                      const y = 90 - (((pt.diastolicBp ?? pt.diastolic ?? 80) - 50) / 60) * 60;
                                      return `${x},${Math.max(20, Math.min(90, y))}`;
                                    })
                                    .join(' ')}
                                />
                                {history.map((pt, idx) => {
                                  const x = (idx / (history.length - 1)) * 300 + 10;
                                  const sys = pt.systolicBp ?? pt.systolic ?? 120;
                                  const dia = pt.diastolicBp ?? pt.diastolic ?? 80;
                                  const ySys = 90 - ((sys - 90) / 80) * 70;
                                  const yDia = 90 - ((dia - 50) / 60) * 60;
                                  return (
                                    <g key={idx}>
                                      <circle
                                        cx={x}
                                        cy={Math.max(10, Math.min(90, ySys))}
                                        r="3.5"
                                        fill="#ef4444"
                                      />
                                      <circle
                                        cx={x}
                                        cy={Math.max(20, Math.min(90, yDia))}
                                        r="3"
                                        fill="#f59e0b"
                                      />
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

                        <div className="mt-2 space-y-1">
                          {history
                            .slice(-3)
                            .reverse()
                            .map((h, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0 font-mono"
                              >
                                <span className="text-black/55 dark:text-white/55">{h.date}</span>
                                <span className="font-bold text-black dark:text-white">
                                  {h.systolicBp ?? h.systolic}/{h.diastolicBp ?? h.diastolic} mmHg
                                </span>
                                <span className="text-black/55 dark:text-white/55">
                                  {h.heartRateBpm ?? h.pulseBpm} bpm
                                </span>
                                <span className="text-black/55 dark:text-white/55">
                                  {h.bloodSugarMgDl ? `${h.bloodSugarMgDl} mg/dL` : '—'}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {!showAddVitals ? (
                        <button
                          type="button"
                          onClick={() => setShowAddVitals(true)}
                          className="w-full py-2 px-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:border-[#d4522f] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>{isAr ? 'تسجيل قراءة جديدة' : 'Prendre de nouvelles constantes'}</span>
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                          <div className="text-[11px] font-bold text-black/70 dark:text-white/75 uppercase">
                            Nouvelle Prise de Constantes
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-black/55 dark:text-white/55">Sys (mmHg)</label>
                              <input
                                type="number"
                                value={newSys}
                                onChange={(e) => setNewSys(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-black/55 dark:text-white/55">Dia (mmHg)</label>
                              <input
                                type="number"
                                value={newDia}
                                onChange={(e) => setNewDia(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-black/55 dark:text-white/55">Pouls (bpm)</label>
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
                              <label className="text-[10px] text-black/55 dark:text-white/55">Poids (kg)</label>
                              <input
                                type="number"
                                value={newWeight}
                                onChange={(e) => setNewWeight(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-black/55 dark:text-white/55">Glycémie (mg/dL)</label>
                              <input
                                type="number"
                                step="1"
                                value={newSugar}
                                onChange={(e) => setNewSugar(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-black/55 dark:text-white/55">SpO₂ (%)</label>
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
                              className="px-2.5 py-1 text-xs text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const sysVal = parseInt(newSys, 10) || 120;
                                const diaVal = parseInt(newDia, 10) || 80;
                                if (sysVal <= diaVal) {
                                  showToast({
                                    type: 'error',
                                    title: isAr ? 'خطأ سريري' : 'Erreur Clinique',
                                    message: isAr
                                      ? 'يجب أن يكون الضغط الانقباضي أعلى من الانبساطي'
                                      : `La tension systolique (${sysVal}) doit être strictement supérieure à la diastolique (${diaVal}) mmHg`,
                                  });
                                  return;
                                }
                                const newPoint = {
                                  date: new Date().toISOString().slice(0, 10),
                                  systolic: sysVal,
                                  diastolic: diaVal,
                                  pulseBpm: parseInt(newHr, 10) || 72,
                                  tempCelsius: 37,
                                  weightKg: parseFloat(newWeight) || 70,
                                  systolicBp: sysVal,
                                  diastolicBp: diaVal,
                                  heartRateBpm: parseInt(newHr, 10) || 72,
                                  heightCm: parseInt(newHeight, 10) || 172,
                                  bloodSugarMgDl: parseFloat(newSugar) || 95,
                                  spO2: parseInt(newSpo2, 10) || 98,
                                  spO2Percent: parseInt(newSpo2, 10) || 98,
                                };
                                const updated: MedicalPatient = {
                                  ...patient,
                                  vitalsHistory: [...(patient.vitalsHistory || []), newPoint],
                                };
                                updatePatient(updated);
                                setInspectedPatient(updated);
                                setShowAddVitals(false);
                                showToast({
                                  type: 'success',
                                  title: 'Constantes enregistrées',
                                  message: `Mesure TA ${sysVal}/${diaVal} mmHg ajoutée au dossier.`,
                                });
                              }}
                              className="px-3 py-1 bg-[#d4522f] text-white rounded text-xs font-semibold shadow-2xs cursor-pointer"
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

            {tab === 'allergies' && (
              <div className="space-y-3 text-xs">
                <div className="bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 space-y-2">
                  <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={12} />
                    <span>{isAr ? 'الحساسيات الدوائية' : 'Allergies Médicamenteuses'}</span>
                  </div>
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {patient.allergies.map((allergy, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold text-xs"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-black/55 dark:text-white/55 italic pt-1">
                      {isAr ? 'لا توجد حساسيات دوائية مسجلة' : 'Aucune allergie médicamenteuse déclarée.'}
                    </p>
                  )}
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse size={12} />
                    <span>{isAr ? 'الأمراض المزمنة' : 'Pathologies Chroniques'}</span>
                  </div>
                  {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {patient.chronicConditions.map((cond, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 font-medium text-black dark:text-white"
                        >
                          {cond}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-black/55 dark:text-white/55 italic pt-1">
                      {isAr ? 'لا توجد أمراض مزمنة' : 'Aucun antécédent chronique signalé.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {tab === 'labs' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                    {isAr ? 'التحاليل البيولوجية' : 'Bilans Biologiques'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLabModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#d4522f] text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus size={11} />
                    <span>{isAr ? 'تحليل جديد' : 'Nouveau Bilan'}</span>
                  </button>
                </div>
                {labRecords.filter((l) => l.patientId === patient.id).length > 0 ? (
                  <div className="space-y-2">
                    {labRecords
                      .filter((l) => l.patientId === patient.id)
                      .map((record) => {
                        const abnormalCount = record.parameters.filter((prm) => prm.isAbnormal).length;
                        return (
                          <button
                            key={record.id}
                            type="button"
                            onClick={() => setIsLabModalOpen(true)}
                            className="w-full text-left p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-[#d4522f] cursor-pointer transition-all shadow-2xs block"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-black dark:text-white">
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
                            <div className="text-[11px] text-black/55 dark:text-white/55 font-mono flex items-center justify-between">
                              <span>
                                {record.testDate || record.date} · {record.orderingDoctor || record.doctorName}
                              </span>
                              <span className="text-[#d4522f] font-semibold">Voir le bilan →</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-black/55 dark:text-white/55">
                    <Microscope size={28} className="mx-auto mb-2 opacity-40" />
                    <p>
                      {isAr ? 'لا توجد تحاليل بيولوجية مسجلة' : 'Aucun bilan biologique pour ce patient.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-2.5 text-xs">
                {consultations.filter((c) => c.patientId === patient.id).length > 0 ? (
                  consultations
                    .filter((c) => c.patientId === patient.id)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-black dark:text-white">
                            {c.diagnosis || c.chiefComplaint}
                          </span>
                          <span className="text-[10px] font-mono text-black/55 dark:text-white/55">
                            {c.consultationDate?.split('T')[0]}
                          </span>
                        </div>
                        <div className="text-[11px] text-black/70 dark:text-white/75">{c.chiefComplaint}</div>
                        {c.vitals && (
                          <div className="flex items-center gap-3 text-[10px] font-mono text-black/55 dark:text-white/55 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                            <span>TA: {c.vitals.bloodPressure || '120/80'}</span>
                            <span>T: {c.vitals.temperatureCelsius ?? 37}°C</span>
                            <span>FC: {c.vitals.heartRateBpm ?? 75} bpm</span>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-black/55 dark:text-white/55">
                    <Stethoscope size={28} className="mx-auto mb-2 opacity-40" />
                    <p>{isAr ? 'لا توجد فحوصات سابقة لهذا المريض' : 'Aucune consultation enregistrée.'}</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 text-xs">
                <label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase">
                  {isAr ? 'الملاحظات السريرية والتوصيات' : 'Observations Cliniques & Suivi'}
                </label>
                <textarea
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  rows={8}
                  placeholder={
                    isAr
                      ? 'أدخل ملاحظات الطبيب...'
                      : 'Saisir les remarques médicales, consignes, prescriptions spécifiques...'
                  }
                  className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-2 focus:ring-[#d4522f] outline-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-black/55 dark:text-white/55">
                    {noteSaved && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={12} /> {isAr ? 'تم الحفظ' : 'Enregistré'}
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
                    <span>{isAr ? 'حفظ الملاحظات' : 'Enregistrer'}</span>
                  </AtriumButton>
                </div>
              </div>
            )}
          </div>
        )}
      />

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
              if (activePatient?.id === p.id) setInspectedPatient(p);
              showToast({
                type: 'success',
                title: isAr ? 'تم التحديث' : 'Dossier mis à jour',
                message: isAr ? 'تم تحديث الملف الطبي' : 'Dossier patient mis à jour',
              });
            } else {
              addPatient(p);
              showToast({
                type: 'success',
                title: isAr ? 'تم الإنشاء' : 'Dossier créé',
                message: isAr ? 'تم إنشاء الملف الطبي بنجاح' : 'Dossier patient créé avec succès',
              });
            }
            setIsPatientModalOpen(false);
            setPatientToEdit(null);
          }}
        />
      )}

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
            showToast({
              type: 'success',
              title: isAr ? 'تم حفظ الفحص' : 'Consultation enregistrée',
              message: isAr ? 'تم حفظ الفحص السريري بنجاح' : 'Consultation enregistrée avec succès',
            });
          }}
        />
      )}

      {isLabModalOpen && activePatient && (
        <MedicalLabViewerModal
          isOpen={isLabModalOpen}
          patient={activePatient}
          labRecords={labRecords}
          practitioners={practitioners}
          onClose={() => setIsLabModalOpen(false)}
          onAddLabRecord={(newRec) => {
            addLabRecord(newRec);
            setIsLabModalOpen(false);
            showToast({
              type: 'success',
              title: isAr ? 'تم حفظ التحليل' : 'Bilan enregistré',
              message: isAr ? 'تم تسجيل التحليل المخبري' : 'Bilan biologique enregistré',
            });
          }}
        />
      )}
    </div>
  );
};

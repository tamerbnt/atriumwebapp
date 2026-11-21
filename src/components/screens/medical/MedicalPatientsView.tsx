import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  UserCheck,
  UserPlus,
  AlertCircle,
  Edit,
  Pin,
  Download,
  Stethoscope,
  ShieldAlert,
  Plus,
  Microscope,
  Activity,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { MedicalPatient } from '../../../types';
import { useMedicalData } from './medicalData';
import { MedicalPatientModal } from './MedicalPatientModal';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalLabViewerModal } from './MedicalLabViewerModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'PT').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const MEMBER_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]';

export const MedicalPatientsView: React.FC<any> = () => {
  const { language, currentBranch, branches, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
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
    },
    [deletePatient, inspectedPatient]
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
    setActiveTab('dossier');
    setShowAddVitals(false);
  }, []);

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
              <div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold t-small flex items-center justify-center shrink-0">
                {p.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="t-small font-semibold text-black dark:text-white capitalize truncate">
                    {p.fullName}
                  </span>
                  {isPinned && (
                    <span className="t-small text-amber-500 font-semibold">VIP</span>
                  )}
                  {hasVigilance && (
                    <span className="t-small text-rose-500 font-semibold flex items-center gap-0.5">
                      <ShieldAlert size={11} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 t-cap text-black/55 dark:text-white/55 tabular-nums">
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
            <span className="t-small font-medium text-black/70 dark:text-white/75 truncate block max-w-[150px]">
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
            <div className="t-small tabular-nums font-medium text-black dark:text-white">{p.phone}</div>
            {p.emergencyContact && (
              <div className="t-cap text-black/55 dark:text-white/55 truncate max-w-[170px] mt-0.5">
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
                <span className="px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold t-small tabular-nums">
                  {p.bloodGroup || 'O+'}
                </span>
                {hasAllergies && p.allergies && (
                  <span className="t-small font-semibold text-rose-500 flex items-center gap-1 bg-rose-50/50 dark:bg-rose-950/30 px-2 py-1 rounded-full">
                    <AlertCircle size={10} />
                    {p.allergies[0]}
                  </span>
                )}
              </div>
              {p.chronicConditions && p.chronicConditions.length > 0 && (
                <span className="t-cap text-black/55 dark:text-white/55 truncate max-w-[150px]">
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
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full t-small font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
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
          items={sortedPatients}
          keyExtractor={(p) => p.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            runUndoBatch(
              {
                vertical: 'medical_clinic',
                operationType: 'bulk',
                branchId: currentBranch?.id || 'branch_medical_main',
                summary: isAr
                  ? `حذف ${ids.size} ملفات مرضى`
                  : isFr
                  ? `Suppression de ${ids.size} dossiers patients`
                  : `Deleted ${ids.size} patient records`,
                affectedCount: ids.size,
              },
              () => {
                ids.forEach((id) => deletePatient(id));
              }
            );
            setSelectedIds(new Set());
            if (activePatient && ids.has(activePatient.id)) setInspectedPatient(null);
          }}
          getRowMeta={(p): KineticRowMeta => {
            const hasVigilance =
              (p.allergies && p.allergies.length > 0) ||
              (p.chronicConditions && p.chronicConditions.length > 0);
            const visitCount = consultations.filter((c) => c.patientId === p.id).length;
            const branchName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
            return {
              title: p.fullName,
              subline: `NSS: ${p.nationalId || 'CHIFA-OK'} · ${p.bloodGroup || 'O+'}`,
              avatarText: getInitials2(p.fullName),
              categoryLabel: p.bloodGroup || 'Patient',
              statusLabel: hasVigilance
                ? isAr
                  ? 'حساسية/مزمن'
                  : 'Vigilance Active'
                : isAr
                ? 'سجل سليم'
                : 'Dossier Standard',
              statusVariant: hasVigilance ? 'blocked' : 'active',
              metricPrimary: `${visitCount} ${isAr ? 'فحوصات' : 'visites'}`,
              metricSecondary: `${p.phone} · ${branchName}`,
              branchName,
              isPinned: pinnedIds.has(p.id),
              detailCol1: { heading: 'NSS / Chifa', primaryText: p.nationalId || 'CHIFA-OK' },
              detailCol2: { heading: isAr ? 'الهاتف' : 'Téléphone', primaryText: p.phone },
              detailCol3: { heading: isAr ? 'الزيارات' : 'Consultations', primaryText: `${visitCount}` },
            };
          }}
          getFanActions={(p): KineticRowFanAction<MedicalPatient>[] => [
            {
              id: 'consult',
              label: isAr ? 'فحص سريري' : 'Consultation',
              icon: <Stethoscope size={13} />,
              onClick: () => handleOpenConsultation(p),
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : 'Modifier',
              icon: <Edit size={13} />,
              onClick: () => handleOpenEdit(p),
            },
            {
              id: 'pin',
              label: pinnedIds.has(p.id)
                ? isAr
                  ? 'إلغاء التثبيت'
                  : 'Détacher'
                : isAr
                ? 'تثبيت'
                : 'Épingler VIP',
              icon: <Pin size={13} />,
              onClick: () => handleTogglePin(p.id),
            },
          ]}
          getDetailActions={(p): KineticDetailAction[] => [
            {
              id: 'consult',
              label: isAr ? 'فحص سريري' : 'Consulter',
              icon: <Stethoscope size={14} />,
              onClick: () => handleOpenConsultation(p),
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : 'Modifier',
              icon: <Edit size={14} />,
              onClick: () => handleOpenEdit(p),
            },
          ]}
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
        avatarText={activePatient ? getInitials2(activePatient.fullName) : 'PT'}
        avatarColor="#d4522f"
        categoryLabel={isAr ? 'ملف مريض EHR' : isFr ? 'DOSSIER PATIENT EHR' : 'PATIENT EHR'}
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
        statusClassName={
          activePatient &&
          ((activePatient.allergies && activePatient.allergies.length > 0) ||
            (activePatient.chronicConditions && activePatient.chronicConditions.length > 0))
            ? MEMBER_PILL_DANGER
            : MEMBER_PILL_OK
        }
        tabs={[
          { id: 'dossier', label: isAr ? 'الملف' : isFr ? 'Dossier' : 'Overview' },
          { id: 'vitals', label: isAr ? 'المؤشرات والمخابر' : isFr ? 'Constantes & Labo' : 'Vitals & Labs' },
          { id: 'history', label: isAr ? 'الفحوصات' : isFr ? 'Consultations' : 'Visits' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(p) => handleSelectPatient(p)}
        onClose={() => setInspectedPatient(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(patient, tab) => {
          const patientLabs = labRecords.filter((l) => l.patientId === patient.id);
          const patientConsults = consultations.filter((c) => c.patientId === patient.id);
          const hasVigilance =
            (patient.allergies && patient.allergies.length > 0) ||
            (patient.chronicConditions && patient.chronicConditions.length > 0);
          return (
            <div className="space-y-5">
              {tab === 'dossier' && (
                <>
                  <InspectorSection
                    title={isAr ? 'إجراءات سريعة' : isFr ? 'Actions cliniques' : 'Quick Actions'}
                    index={0}
                  >
                    <InspectorQuickActions
                      actions={[
                        {
                          id: 'consult',
                          label: isAr ? 'فحص سريري' : 'Consulter',
                          icon: <Stethoscope size={15} />,
                          onClick: () => handleOpenConsultation(patient),
                        },
                        {
                          id: 'edit',
                          label: isAr ? 'تعديل الملف' : 'Modifier',
                          icon: <Edit size={15} />,
                          onClick: () => handleOpenEdit(patient),
                        },
                        {
                          id: 'pin',
                          label: pinnedIds.has(patient.id)
                            ? isAr
                              ? 'إلغاء VIP'
                              : 'Retirer VIP'
                            : isAr
                            ? 'تثبيت VIP'
                            : 'Épingler VIP',
                          icon: <Pin size={15} />,
                          onClick: () => handleTogglePin(patient.id),
                        },
                      ]}
                    />
                  </InspectorSection>

                  <InspectorSection
                    title={isAr ? 'بيانات المريض' : 'État Civil & Contact'}
                    index={1}
                  >
                    <InspectorCard>
                      <InspectorKeyValue
                        label={isAr ? 'تاريخ الميلاد' : 'Date de naissance'}
                        value={patient.dateOfBirth || '—'}
                        mono
                      />
                      <InspectorKeyValue
                        label={isAr ? 'الهاتف' : 'Téléphone'}
                        value={patient.phone}
                        mono
                      />
                      <InspectorKeyValue
                        label={isAr ? 'بطاقة الشفاء / الهوية' : 'NSS / Chifa'}
                        value={patient.nationalId || patient.chifaCardNumber || 'N/A'}
                        mono
                      />
                      <InspectorKeyValue
                        label={isAr ? 'فصيلة الدم' : 'Groupe sanguin'}
                        value={patient.bloodGroup || 'O+'}
                        mono
                      />
                      <InspectorKeyValue
                        label={isAr ? 'تاريخ التسجيل' : "Date d'inscription"}
                        value={
                          patient.createdAt
                            ? new Date(patient.createdAt).toLocaleDateString()
                            : '2026-05-01'
                        }
                        mono
                        isLast
                      />
                    </InspectorCard>
                  </InspectorSection>

                  {patient.emergencyContact && (
                    <InspectorSection
                      title={isAr ? 'طوارئ' : "Contact d'urgence"}
                      index={2}
                    >
                      <InspectorCard>
                        <InspectorKeyValue
                          label={isAr ? 'الاسم' : 'Personne à contacter'}
                          value={patient.emergencyContact}
                        />
                        <InspectorKeyValue
                          label={isAr ? 'الهاتف' : 'Téléphone urgence'}
                          value={patient.emergencyPhone || '—'}
                          mono
                          isLast
                        />
                      </InspectorCard>
                    </InspectorSection>
                  )}

                  <InspectorSection
                    title={isAr ? 'الحساسيات والأمراض المزمنة' : 'Vigilances & Antécédents'}
                    index={3}
                  >
                    <InspectorCard>
                      <InspectorKeyValue
                        label={isAr ? 'الحساسيات الدوائية' : 'Allergies'}
                        value={
                          patient.allergies && patient.allergies.length > 0
                            ? patient.allergies.join(', ')
                            : isAr
                            ? 'لا توجد'
                            : 'Aucune déclarée'
                        }
                      />
                      <InspectorKeyValue
                        label={isAr ? 'الأمراض المزمنة' : 'Pathologies chroniques'}
                        value={
                          patient.chronicConditions && patient.chronicConditions.length > 0
                            ? patient.chronicConditions.join(', ')
                            : isAr
                            ? 'لا توجد'
                            : 'Aucun antécédent'
                        }
                        isLast
                      />
                    </InspectorCard>
                    {hasVigilance && (
                      <div
                        data-sq="ctl"
                        data-sq-border="solid"
                        className="mt-2 px-3 py-2 bg-[#FDE4DF]/60 dark:bg-[#3D1E1A]/40 [--sq-stroke:#F5BDB3] dark:[--sq-stroke:#5C2B24] t-small font-semibold text-[#B8321C] dark:text-[#FF8D7A] flex items-center gap-2"
                      >
                        <ShieldAlert size={13} className="shrink-0" />
                        <span>
                          {isAr
                            ? 'تنبيه دوائي نشط عند تحرير الوصفات'
                            : 'Contrôle pharmacologique actif lors des prescriptions'}
                        </span>
                      </div>
                    )}
                  </InspectorSection>

                  <InspectorSection
                    title={isAr ? 'الملاحظات السريرية' : 'Observations Cliniques'}
                    index={4}
                  >
                    <InspectorNotesField
                      value={patient.notes || ''}
                      onSave={(next) => {
                        const updated = { ...patient, notes: next };
                        updatePatient(updated);
                        setInspectedPatient(updated);
                      }}
                      placeholder={
                        isAr
                          ? 'أدخل ملاحظات الطبيب...'
                          : 'Saisir les remarques médicales, consignes, suivi...'
                      }
                      ariaLabel={isAr ? 'الملاحظات السريرية' : 'Observations Cliniques'}
                    />
                  </InspectorSection>
                </>
              )}

              {tab === 'vitals' && (() => {
                const history = patient.vitalsHistory || [];
                const latest = history.length > 0 ? history[history.length - 1] : null;
                const weight = latest?.weightKg || 72;
                const heightM = (latest?.heightCm || 172) / 100;
                const bmi = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : '24.3';
                const bmiNum = parseFloat(bmi);
                let bmiLabel = 'Poids normal';
                if (bmiNum < 18.5) bmiLabel = 'Insuffisance pondérale';
                else if (bmiNum >= 25 && bmiNum < 30) bmiLabel = 'Surpoids';
                else if (bmiNum >= 30) bmiLabel = 'Obésité';

                return (
                  <>
                    <InspectorSection
                      title={isAr ? 'المؤشرات الحيوية الحالية' : 'Constantes Vitales'}
                      index={0}
                    >
                      <InspectorCard>
                        <InspectorKeyValue
                          label="IMC (kg/m²)"
                          value={`${bmi} · ${bmiLabel}`}
                          mono
                        />
                        <InspectorKeyValue
                          label="SpO₂ / Pouls"
                          value={`${latest?.spO2Percent ?? latest?.spO2 ?? 98}% · ${
                            latest?.pulseBpm ?? latest?.heartRateBpm ?? 74
                          } bpm`}
                          mono
                          isLast
                        />
                      </InspectorCard>

                      <div className="sq-elev-card mt-3">
                        <div
                          data-sq="card"
                          data-sq-border="solid"
                          className="p-3 bg-white dark:bg-[#22201E]"
                        >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                            <span className="t-small font-semibold text-black dark:text-white">
                              {isAr ? 'منحنى ضغط الدم (mmHg)' : 'Courbe Tension Artérielle (mmHg)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 t-cap tabular-nums">
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
                        <div
                          data-sq="ctl"
                          data-sq-border="solid"
                          className="w-full h-32 relative bg-neutral-50/70 dark:bg-[#191716] p-2"
                        >
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
                              <text x="160" y="55" textAnchor="middle" fill="#9ca3af" fontSize="12">
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
                                className="flex items-center justify-between t-cap py-1 border-b border-[var(--atr-divider)] last:border-0 tabular-nums"
                              >
                                <span className="text-black/55 dark:text-white/55">{h.date}</span>
                                <span className="font-semibold text-black dark:text-white">
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
                      </div>

                      {!showAddVitals ? (
                        <div className="mt-3">
                          <InspectorWideButton
                            label={isAr ? 'تسجيل قراءة جديدة' : 'Prendre de nouvelles constantes'}
                            icon={<Plus size={14} />}
                            onClick={() => setShowAddVitals(true)}
                          />
                        </div>
                      ) : (
                        <div
                          data-sq="card"
                          data-sq-border="solid"
                          className="mt-3 p-3 bg-[#F3EDE7] dark:bg-[#191716] space-y-2 t-cap"
                        >
                          <div className="t-small font-semibold text-black/70 dark:text-white/75">
                            Nouvelle Prise de Constantes
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="t-cap text-black/55 dark:text-white/55">Sys (mmHg)</label>
                              <div data-sq="ctl-sm" data-sq-border="solid" className="bg-[#F5F1EC] dark:bg-[#292624]">
                                <input
                                  type="number"
                                  value={newSys}
                                  onChange={(e) => setNewSys(e.target.value)}
                                  className="lbi-field w-full px-2 py-1 bg-transparent border-0 t-cap tabular-nums"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="t-cap text-black/55 dark:text-white/55">Dia (mmHg)</label>
                              <div data-sq="ctl-sm" data-sq-border="solid" className="bg-[#F5F1EC] dark:bg-[#292624]">
                                <input
                                  type="number"
                                  value={newDia}
                                  onChange={(e) => setNewDia(e.target.value)}
                                  className="lbi-field w-full px-2 py-1 bg-transparent border-0 t-cap tabular-nums"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="t-cap text-black/55 dark:text-white/55">Pouls (bpm)</label>
                              <div data-sq="ctl-sm" data-sq-border="solid" className="bg-[#F5F1EC] dark:bg-[#292624]">
                                <input
                                  type="number"
                                  value={newHr}
                                  onChange={(e) => setNewHr(e.target.value)}
                                  className="lbi-field w-full px-2 py-1 bg-transparent border-0 t-cap tabular-nums"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="t-cap text-black/55 dark:text-white/55">Poids (kg)</label>
                              <div data-sq="ctl-sm" data-sq-border="solid" className="bg-[#F5F1EC] dark:bg-[#292624]">
                                <input
                                  type="number"
                                  value={newWeight}
                                  onChange={(e) => setNewWeight(e.target.value)}
                                  className="lbi-field w-full px-2 py-1 bg-transparent border-0 t-cap tabular-nums"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="t-cap text-black/55 dark:text-white/55">Glycémie (mg/dL)</label>
                              <div data-sq="ctl-sm" data-sq-border="solid" className="bg-[#F5F1EC] dark:bg-[#292624]">
                                <input
                                  type="number"
                                  step="1"
                                  value={newSugar}
                                  onChange={(e) => setNewSugar(e.target.value)}
                                  className="lbi-field w-full px-2 py-1 bg-transparent border-0 t-cap tabular-nums"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="t-cap text-black/55 dark:text-white/55">SpO₂ (%)</label>
                              <div data-sq="ctl-sm" data-sq-border="solid" className="bg-[#F5F1EC] dark:bg-[#292624]">
                                <input
                                  type="number"
                                  value={newSpo2}
                                  onChange={(e) => setNewSpo2(e.target.value)}
                                  className="lbi-field w-full px-2 py-1 bg-transparent border-0 t-cap tabular-nums"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddVitals(false)}
                              className="px-2.5 py-1 t-cap text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
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
                              }}
                              data-sq="ctl-sm"
                              className="px-3 py-1 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold cursor-pointer"
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      )}
                    </InspectorSection>

                    <InspectorSection
                      title={isAr ? 'التحاليل البيولوجية' : 'Bilans Biologiques'}
                      index={1}
                    >
                      {patientLabs.length > 0 ? (
                        <InspectorCard>
                          {patientLabs.map((record, idx) => {
                            const abnormalCount = record.parameters.filter((prm) => prm.isAbnormal).length;
                            return (
                              <InspectorListItem
                                key={record.id}
                                title={record.panelName || record.testCategory}
                                subtitle={`${record.testDate || record.date} · ${record.orderingDoctor || record.doctorName}`}
                                badge={{
                                  label:
                                    abnormalCount > 0
                                      ? `${abnormalCount} anomalie${abnormalCount > 1 ? 's' : ''}`
                                      : 'Normal',
                                  tone: abnormalCount > 0 ? 'danger' : 'ok',
                                }}
                                onClick={() => setIsLabModalOpen(true)}
                                isLast={idx === patientLabs.length - 1}
                              />
                            );
                          })}
                        </InspectorCard>
                      ) : (
                        <KineticEmptyStateMotion motionKey={`med-lab-${patient.id}`}>
                          <EmptyState
                            variant="compact"
                            icon={<Microscope />}
                            title={isAr ? 'لا توجد تحاليل بيولوجية مسجلة' : 'Aucun bilan biologique pour ce patient.'}
                            secondaryAction={{
                              label: isAr ? 'تحليل مخبري جديد' : 'Ouvrir / Nouveau Bilan Labo',
                              onClick: () => setIsLabModalOpen(true),
                            }}
                          />
                        </KineticEmptyStateMotion>
                      )}
                      {patientLabs.length > 0 && (
                        <div className="mt-3">
                          <InspectorWideButton
                            label={isAr ? 'تحليل مخبري جديد' : 'Ouvrir / Nouveau Bilan Labo'}
                            icon={<Microscope size={14} />}
                            tone="accent"
                            onClick={() => setIsLabModalOpen(true)}
                          />
                        </div>
                      )}
                    </InspectorSection>
                  </>
                );
              })()}

              {tab === 'history' && (
                <InspectorSection
                  title={isAr ? 'سجل الفحوصات الطبية' : 'Historique des Consultations'}
                  index={0}
                >
                  {patientConsults.length > 0 ? (
                    <>
                      <InspectorCard>
                        {patientConsults.map((c, idx) => (
                          <InspectorListItem
                            key={c.id}
                            title={c.diagnosis || c.chiefComplaint}
                            subtitle={
                              c.vitals
                                ? `${c.chiefComplaint} · TA ${c.vitals.bloodPressure || '120/80'} · ${c.vitals.temperatureCelsius ?? 37}°C`
                                : c.chiefComplaint
                            }
                            metaRight={c.consultationDate?.split('T')[0]}
                            badge={{
                              label: c.status === 'Completed' ? (isAr ? 'مكتمل' : 'Clôturé') : c.status,
                              tone: c.status === 'Completed' ? 'ok' : 'warn',
                            }}
                            isLast={idx === patientConsults.length - 1}
                          />
                        ))}
                      </InspectorCard>
                      <div className="mt-3">
                        <InspectorWideButton
                          label={isAr ? 'إضافة فحص سريري' : 'Nouvelle Consultation'}
                          icon={<Stethoscope size={14} />}
                          tone="accent"
                          onClick={() => handleOpenConsultation(patient)}
                        />
                      </div>
                    </>
                  ) : (
                    <KineticEmptyStateMotion motionKey={`med-hist-${patient.id}`}>
                      <EmptyState
                        variant="compact"
                        icon={<Stethoscope />}
                        title={isAr ? 'لا توجد فحوصات سابقة لهذا المريض' : 'Aucune consultation enregistrée.'}
                        secondaryAction={{
                          label: isAr ? 'إضافة فحص سريري' : 'Nouvelle Consultation',
                          onClick: () => handleOpenConsultation(patient),
                        }}
                      />
                    </KineticEmptyStateMotion>
                  )}
                </InspectorSection>
              )}
            </div>
          );
        }}
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
            } else {
              addPatient(p);
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
          }}
        />
      )}
    </div>
  );
};

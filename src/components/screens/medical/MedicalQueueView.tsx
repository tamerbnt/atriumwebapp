import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Clock,
  Stethoscope,
  CheckCircle2,
  Plus,
  Pin,
  CreditCard,
  Printer,
  Tv,
  Calendar,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalWaitingRoomTvModal } from './MedicalWaitingRoomTvModal';
import { MedicalAgendaView } from './MedicalAgendaView';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { PrintSheetModal } from '../../modals/PrintSheetModal';
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
  return (name || 'TR').slice(0, 2).toUpperCase();
};

const getQueueStatusClassName = (status: MedicalConsultation['status']): string => {
  if (status === 'InWaitingQueue') {
    return 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';
  }
  if (status === 'InConsultation') {
    return 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]';
  }
  return 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
};

export const MedicalQueueView: React.FC<any> = () => {
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
    consultations,
    patients,
    practitioners,
    updateConsultationStatus,
    markConsultationPaid,
    addConsultation,
  } = useMedicalData();

  const [activeSubView, setActiveSubView] = useState<'queue' | 'agenda'>('queue');
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('All');
  const [displayLayout, setDisplayLayout] = useState<'collection' | 'visual_queue'>('collection');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [sortBy, setSortBy] = useState<string>('consultationDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['cons_01']));

  const [inspectedConsultation, setInspectedConsultation] = useState<MedicalConsultation | null>(null);
  const [ticketConsultToPrint, setTicketConsultToPrint] = useState<MedicalConsultation | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>('fiche');
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeConsultation = useMemo(() => {
    if (!inspectedConsultation) return null;
    return consultations.find((c) => c.id === inspectedConsultation.id) || null;
  }, [inspectedConsultation, consultations]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    consultations.forEach((c) => {
      const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [consultations, branchesById, currentBranch, language]);

  const queueCounts = useMemo(
    () => ({
      all: consultations.length,
      waiting: consultations.filter((c) => c.status === 'InWaitingQueue').length,
      in_progress: consultations.filter((c) => c.status === 'InConsultation').length,
      completed: consultations.filter((c) => c.status === 'Completed').length,
    }),
    [consultations]
  );

  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (urgencyFilter !== 'All' && (c.urgencyLevel || 'Normal') !== urgencyFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.patientName.toLowerCase().includes(q) ||
          c.chiefComplaint.toLowerCase().includes(q) ||
          Boolean(c.diagnosis && c.diagnosis.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (statusFilter === 'waiting') return c.status === 'InWaitingQueue';
      if (statusFilter === 'in_progress') return c.status === 'InConsultation';
      if (statusFilter === 'completed') return c.status === 'Completed';
      return true;
    });
  }, [
    consultations,
    branchFilter,
    urgencyFilter,
    searchQuery,
    statusFilter,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedConsultations = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortBy === 'consultationDate') {
        return sortDir === 'asc'
          ? a.consultationDate.localeCompare(b.consultationDate)
          : b.consultationDate.localeCompare(a.consultationDate);
      }
      if (sortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'patientName') {
        return sortDir === 'asc'
          ? a.patientName.localeCompare(b.patientName)
          : b.patientName.localeCompare(a.patientName);
      }
      if (sortBy === 'consultationFeeDzd') {
        return sortDir === 'asc'
          ? a.consultationFeeDzd - b.consultationFeeDzd
          : b.consultationFeeDzd - a.consultationFeeDzd;
      }
      return 0;
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      showToast({
        type: 'info',
        title: isAr ? 'الأولوية' : 'Priorité Triage',
        message: pinnedIds.has(id)
          ? isAr
            ? 'تم إلغاء التثبيت'
            : 'Priorité retirée'
          : isAr
          ? 'تم تثبيت أولوية المريض'
          : 'Patient priorisé en tête de file',
      });
    },
    [pinnedIds, isAr]
  );

  const handleStartExam = useCallback(
    (c: MedicalConsultation) => {
      updateConsultationStatus(c.id, 'InConsultation');
      if (activeConsultation?.id === c.id) {
        setInspectedConsultation({ ...c, status: 'InConsultation' });
      }
    },
    [updateConsultationStatus, activeConsultation]
  );

  const handleFinishExam = useCallback(
    (c: MedicalConsultation) => {
      updateConsultationStatus(c.id, 'Completed');
      if (activeConsultation?.id === c.id) {
        setInspectedConsultation({ ...c, status: 'Completed' });
      }
    },
    [updateConsultationStatus, activeConsultation]
  );

  const handleSelectConsultation = useCallback(
    (c: MedicalConsultation, el?: HTMLElement | null) => {
      if (el) setDrawerOpenerEl(el);
      setInspectedConsultation(c);
      setActiveInspectorTab('fiche');
    },
    []
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      'Ticket',
      'Patient',
      'Branch',
      'Doctor',
      'Complaint',
      'Status',
      'Fee DZD',
      'Date',
    ];
    const rows = sortedConsultations.map((c) => [
      c.ticketNumber || c.id,
      c.patientName,
      resolveRecordBranch(c, branchesById, currentBranch, language).name,
      c.doctorName || '',
      c.chiefComplaint,
      c.status,
      c.consultationFeeDzd,
      c.consultationDate.split('T')[0],
    ]);
    downloadCsvSafe(`medical_queue_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تصدير' : 'Export CSV',
      message: isAr ? 'تم تصدير قائمة الانتظار' : 'File de triage exportée avec succès.',
    });
  }, [sortedConsultations, branchesById, currentBranch, language, isAr]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setBranchFilter('All');
    setUrgencyFilter('All');
  }, []);

  const activeFiltersCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0) +
    (urgencyFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label:
          statusFilter === 'waiting'
            ? isAr
              ? 'منتظر'
              : 'En attente'
            : statusFilter === 'in_progress'
            ? isAr
              ? 'فحص'
              : 'En consultation'
            : isAr
            ? 'مكتمل'
            : 'Clôturés',
        onRemove: () => setStatusFilter('all'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (urgencyFilter !== 'All') {
      chips.push({
        key: 'urgency',
        label: `${isAr ? 'الأولوية' : isFr ? 'Priorité' : 'Urgency'}: ${urgencyFilter}`,
        onRemove: () => setUrgencyFilter('All'),
      });
    }
    return chips;
  }, [statusFilter, branchFilter, urgencyFilter, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'status',
        label: isAr ? 'حالة الدور' : isFr ? 'Statut Triage' : 'Queue Status',
        value: statusFilter,
        onChange: setStatusFilter,
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All', count: queueCounts.all },
          { value: 'waiting', label: isAr ? 'منتظر' : isFr ? 'Attente' : 'Waiting', count: queueCounts.waiting },
          { value: 'in_progress', label: isAr ? 'فحص' : isFr ? 'En cours' : 'Exam', count: queueCounts.in_progress },
          { value: 'completed', label: isAr ? 'مكتمل' : isFr ? 'Clôturés' : 'Done', count: queueCounts.completed },
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
            count: consultations.length,
          },
          ...Array.from(branchCounts.entries()).map(([name, count]) => ({
            value: name,
            label: name,
            count,
          })),
        ],
      },
      {
        id: 'urgency',
        label: isAr ? 'درجة الاستعجال' : isFr ? 'Niveau de Priorité' : 'Urgency Level',
        value: urgencyFilter,
        onChange: setUrgencyFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All' },
          { value: 'Normal', label: 'Normal' },
          { value: 'Prioritaire', label: 'Prioritaire' },
          { value: 'Urgence', label: 'Urgence' },
        ],
      },
    ],
    [statusFilter, branchFilter, urgencyFilter, queueCounts, consultations.length, branchCounts, isAr, isFr]
  );

  const columns: ColumnDefinition<MedicalConsultation>[] = useMemo(
    () => [
      {
        key: 'patientName',
        header: isAr ? 'المريض / الشكوى' : 'Patient & Motif',
        sortable: true,
        minWidth: '210px',
        renderCell: (c) => {
          const isPinned = pinnedIds.has(c.id);
          return (
            <div className="flex items-center gap-3">
              <div
                data-sq="tile"
                data-sq-border="solid"
                className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small shrink-0 [--sq-stroke:rgba(212,82,47,0.22)] dark:[--sq-stroke:rgba(255,143,99,0.22)]"
              >
                {c.patientName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2 truncate">
                  {c.patientName}
                  {isPinned && <span className="t-cap text-amber-500">VIP</span>}
                </div>
                <div className="t-cap text-black/55 dark:text-white/75 truncate max-w-[180px]">
                  {c.chiefComplaint}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        sortable: true,
        minWidth: '130px',
        renderCell: (c) => (
          <span className="t-small font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
            {resolveRecordBranch(c, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'vitals',
        header: isAr ? 'العلامات الحيوية' : 'Constantes Vitales',
        minWidth: '170px',
        renderCell: (c) => (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white tabular-nums t-small font-semibold">
              {c.vitals?.bloodPressure || '120/80'}
            </span>
            <span className="px-2 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 tabular-nums t-cap">
              {c.vitals?.temperatureCelsius ? `${c.vitals.temperatureCelsius}°C` : '37°C'}
            </span>
            {c.vitals?.weightKg && (
              <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                {c.vitals.weightKg}kg
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'حالة الدور' : 'Statut Triage',
        sortable: true,
        minWidth: '130px',
        renderCell: (c) => (
          <span
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold ${
              c.status === 'InWaitingQueue'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : c.status === 'InConsultation'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            {c.status === 'InConsultation' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            )}
            {c.status === 'InWaitingQueue'
              ? isAr
                ? 'في الانتظار'
                : 'En attente'
              : c.status === 'InConsultation'
              ? isAr
                ? 'في الفحص'
                : 'En consultation'
              : isAr
              ? 'مكتمل'
              : 'Terminé'}
          </span>
        ),
      },
      {
        key: 'consultationFeeDzd',
        header: isAr ? 'الأتعاب DZD' : 'Honoraires',
        sortable: true,
        minWidth: '115px',
        renderCell: (c) => (
          <div className="tabular-nums font-semibold t-small text-black dark:text-white">
            {formatMoney(c.consultationFeeDzd, 'DZD')}
          </div>
        ),
      },
    ],
    [pinnedIds, branchesById, currentBranch, language, isAr, isFr]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: consultations.length > 0,
  });

  if (showSkeleton && (consultations.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
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
        icon={<Clock size={22} />}
        title={isAr ? 'الانتظار' : language === 'en' ? 'Queue' : 'Attente'}
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="flex items-center bg-white/80 dark:bg-[#191716] p-[3px]"
            >
              <button
                type="button"
                data-no-liquid="true"
                data-sq="thumb"
                data-sq-border="none"
                onClick={() => setActiveSubView('queue')}
                className={`px-3 py-2 t-small font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubView === 'queue'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                <Clock size={13} />
                <span>{isAr ? 'قائمة الفرز' : 'File de Triage'}</span>
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="thumb"
                data-sq-border="none"
                onClick={() => setActiveSubView('agenda')}
                className={`px-3 py-2 t-small font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubView === 'agenda'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                <Calendar size={13} />
                <span>{isAr ? 'أجندة المواعيد' : 'Agenda Multi-Médecins'}</span>
              </button>
            </div>
            <AtriumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsTvModalOpen(true)}
              icon={<Tv size={14} className="text-[#0D9488]" />}
            >
              {isAr ? 'شاشة الانتظار' : "Écran TV Salle d'Attente"}
            </AtriumButton>
          </div>
        }
        primaryAction={{
          label: isAr ? 'قبول مريض جديد' : isFr ? 'Admettre un Patient' : 'Admit Patient',
          onClick: () => setIsConsultModalOpen(true),
          icon: <Plus size={15} />,
        }}
      />

      {activeSubView === 'agenda' ? (
        <MedicalAgendaView />
      ) : (
        <>
          <ScreenKpiBanner
            heading={
              isAr
                ? 'مؤشرات تدفق المرضى وأوقات الانتظار'
                : "Flux Salle d'Attente & Triage des Urgences"
            }
            language={language}
            primaryCard={{
              label: isAr ? 'مرضى في الانتظار' : "Patients en Salle d'Attente",
              badgeText: isAr ? 'الانتظار' : 'Triage',
              count: queueCounts.waiting,
              tone: 'terracotta',
              isActive: statusFilter === 'waiting',
              onToggle: () =>
                setStatusFilter((prev) => (prev === 'waiting' ? 'all' : 'waiting')),
            }}
            secondaryCard={{
              label: isAr ? 'حالياً في الفحص' : 'En Examen Médical',
              badgeText: isAr ? 'نشط' : 'Cabinet',
              count: queueCounts.in_progress,
              tone: 'emerald',
              isActive: statusFilter === 'in_progress',
              onToggle: () =>
                setStatusFilter((prev) => (prev === 'in_progress' ? 'all' : 'in_progress')),
            }}
            darkCard={{
              label: isAr ? 'إجمالي الفحوصات المنجزة' : 'Prise en Charge Clinique',
              badgeCount: consultations.length,
              badgeSuffix: isAr ? ' إجمالي' : ' total',
              valueCount: queueCounts.completed,
              valueSuffix: ` / ${consultations.length}`,
              caption: isAr ? 'استشارات مكتملة بنجاح' : 'Consultations clôturées avec succès',
            }}
          />

          <ScreenPod>
            <ScreenCollectionToolbar
              title={isAr ? 'سجل الاستشارات والفرز' : 'Registre des Consultations & Triage'}
              liveRegionText={`${sortedConsultations.length} ${isAr ? 'استشارة' : 'consultations'}`}
              language={language}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={
                isAr ? 'بحث عن مريض أو تشخيص...' : 'Rechercher patient ou motif...'
              }
              statusValue={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={[
                {
                  value: 'all',
                  label: isAr ? 'الكل' : isFr ? 'Tous' : 'All',
                  count: queueCounts.all,
                },
                {
                  value: 'waiting',
                  label: isAr ? 'منتظر' : isFr ? 'Attente' : 'Waiting',
                  count: queueCounts.waiting,
                },
                {
                  value: 'in_progress',
                  label: isAr ? 'فحص' : isFr ? 'Consultation' : 'Exam',
                  count: queueCounts.in_progress,
                },
                {
                  value: 'completed',
                  label: isAr ? 'مكتمل' : isFr ? 'Clôturés' : 'Done',
                  count: queueCounts.completed,
                },
              ]}
              hasActiveAdvancedFilters={activeFiltersCount > 0}
              activeFiltersCount={activeFiltersCount}
              isFilterModalOpen={isFilterModalOpen}
              filterButtonRef={filterButtonRef}
              onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showViewToggle={displayLayout === 'collection'}
              onExport={handleExportCsv}
              activeChips={activeChips}
              onResetAllFilters={handleResetFilters}
              extraTrailingControls={
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="flex items-center bg-white dark:bg-[#191716] p-[3px]"
                >
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="thumb"
                    data-sq-border="none"
                    onClick={() => setDisplayLayout('collection')}
                    className={`px-2.5 py-2 t-small font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      displayLayout === 'collection'
                        ? 'bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                        : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <List size={13} />
                    <span>{isAr ? 'الجدول' : 'Registre'}</span>
                  </button>
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="thumb"
                    data-sq-border="none"
                    onClick={() => setDisplayLayout('visual_queue')}
                    className={`px-2.5 py-2 t-small font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      displayLayout === 'visual_queue'
                        ? 'bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                        : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <LayoutGrid size={13} />
                    <span>{isAr ? 'لوحة الانتظار' : 'File Visuelle'}</span>
                  </button>
                </div>
              }
            />

            {displayLayout === 'collection' ? (
              <UniversalDataCollection
                hideToolbar
                items={sortedConsultations}
                keyExtractor={(c) => c.id}
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
                openItemId={activeConsultation?.id ?? null}
                isPinned={(c) => pinnedIds.has(c.id)}
                onTogglePin={(c) => handleTogglePin(c.id)}
                onItemClick={handleSelectConsultation}
                onViewDetails={handleSelectConsultation}
                getRowMeta={(c): KineticRowMeta => ({
                  title: c.patientName,
                  subline: `${c.chiefComplaint} · ${c.vitals?.bloodPressure || '120/80'}`,
                  avatarText: getInitials2(c.patientName),
                  categoryLabel: c.ticketNumber || c.ngapCode || 'C',
                  statusLabel:
                    c.status === 'InWaitingQueue'
                      ? isAr
                        ? 'في الانتظار'
                        : 'En attente'
                      : c.status === 'InConsultation'
                      ? isAr
                        ? 'في الفحص'
                        : 'En consultation'
                      : isAr
                      ? 'مكتمل'
                      : 'Terminé',
                  statusVariant:
                    c.status === 'InWaitingQueue'
                      ? 'warning'
                      : c.status === 'InConsultation'
                      ? 'info'
                      : 'active',
                  metricPrimary: formatMoney(c.consultationFeeDzd, 'DZD'),
                  metricSecondary: `${c.ticketNumber || c.id} · ${c.consultationDate.split('T')[0]}`,
                  isPinned: pinnedIds.has(c.id),
                  detailCol1: { heading: isAr ? 'السبب' : 'Motif', primaryText: c.chiefComplaint },
                  detailCol2: { heading: isAr ? 'الضغط' : 'TA', primaryText: c.vitals?.bloodPressure || '120/80' },
                  detailCol3: { heading: isAr ? 'التاريخ' : 'Date', primaryText: c.consultationDate.split('T')[0] },
                })}
                getFanActions={(c): KineticRowFanAction<MedicalConsultation>[] => [
                  {
                    id: 'exam',
                    label:
                      c.status === 'InWaitingQueue'
                        ? isAr
                          ? 'بدء الفحص'
                          : 'Consulter'
                        : isAr
                        ? 'إنهاء'
                        : 'Clôturer',
                    icon: <Stethoscope size={13} />,
                    onClick: () => {
                      if (c.status === 'InWaitingQueue') handleStartExam(c);
                      else handleFinishExam(c);
                    },
                  },
                  {
                    id: 'pin',
                    label: pinnedIds.has(c.id) ? 'Détacher' : 'Prioriser',
                    icon: <Pin size={13} />,
                    onClick: () => handleTogglePin(c.id),
                  },
                ]}
                getDetailActions={(c): KineticDetailAction[] => [
                  {
                    id: 'exam',
                    label:
                      c.status === 'InWaitingQueue'
                        ? isAr
                          ? 'استدعاء'
                          : 'Appeler'
                        : isAr
                        ? 'إنهاء'
                        : 'Clôturer',
                    icon: <Stethoscope size={14} />,
                    onClick: () => {
                      if (c.status === 'InWaitingQueue') handleStartExam(c);
                      else handleFinishExam(c);
                    },
                  },
                ]}
                emptyTitle={isAr ? 'لا توجد استشارات مطابقة' : 'Aucune consultation trouvée'}
                emptyDescription={
                  isAr ? 'قم بقبول مريض جديد للبدء' : "Admettez un premier patient en salle d'attente"
                }
                primaryActionLabel={isAr ? 'قبول مريض' : 'Admettre un patient'}
                onAddFirstItem={() => setIsConsultModalOpen(true)}
                onResetFilters={handleResetFilters}
                hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedConsultations.map((cons, index) => (
                  <div key={cons.id} className="sq-elev-card">
                    <div
                      data-sq="card"
                      data-sq-border="solid"
                      data-sq-stroke-w={
                        activeConsultation?.id === cons.id || cons.status === 'InConsultation'
                          ? 2
                          : 1
                      }
                      className={`bg-white dark:bg-[#22201E] p-5 space-y-4 transition-all ${
                        activeConsultation?.id === cons.id
                          ? '[--sq-stroke:#d4522f]'
                          : cons.status === 'InConsultation'
                          ? '[--sq-stroke:#60a5fa]'
                          : ''
                      }`}
                    >
                    <button
                      type="button"
                      onClick={(e) => {
                        setDrawerOpenerEl(e.currentTarget);
                        setInspectedConsultation(cons);
                      }}
                      className="w-full text-left space-y-3 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-[#2B2825] t-small font-semibold flex items-center justify-center text-black/70 dark:text-white/75">
                            #{index + 1}
                          </span>
                          <span className="t-small font-semibold text-black dark:text-white truncate max-w-[140px]">
                            {cons.patientName}
                          </span>
                        </div>
                        <span
                          className={`t-small font-semibold px-2 py-1 rounded-full ${
                            cons.status === 'InWaitingQueue'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : cons.status === 'InConsultation'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {cons.status === 'InWaitingQueue'
                            ? 'Attente'
                            : cons.status === 'InConsultation'
                            ? 'En cours'
                            : 'Terminé'}
                        </span>
                      </div>
                      <div
                        data-sq="ctl"
                        data-sq-border="solid"
                        className="bg-neutral-50 dark:bg-[#191716] p-3 grid grid-cols-3 gap-1 text-center t-cap tabular-nums"
                      >
                        <div>
                          <div className="t-cap text-black/55 dark:text-white/55">TA</div>
                          <div className="font-semibold text-black dark:text-white">
                            {cons.vitals?.bloodPressure || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="t-cap text-black/55 dark:text-white/55">Temp</div>
                          <div className="font-semibold text-black dark:text-white">
                            {cons.vitals?.temperatureCelsius
                              ? `${cons.vitals.temperatureCelsius}°C`
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="t-cap text-black/55 dark:text-white/55">Poids</div>
                          <div className="font-semibold text-black dark:text-white">
                            {cons.vitals?.weightKg ? `${cons.vitals.weightKg}kg` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="t-cap text-black/70 dark:text-white/75 truncate">
                        <span className="font-medium text-black/55 dark:text-white/55 mr-1">
                          Motif:
                        </span>
                        {cons.chiefComplaint}
                      </div>
                    </button>
                    <div className="pt-2 border-t border-[var(--atr-divider)] flex items-center justify-between">
                      <span className="t-small tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                        {formatMoney(cons.consultationFeeDzd, 'DZD')}
                      </span>
                      <button
                        type="button"
                        data-no-liquid="true"
                        data-sq="ctl-sm"
                        data-sq-border="none"
                        onClick={() => {
                          if (cons.status === 'InWaitingQueue') handleStartExam(cons);
                          else handleFinishExam(cons);
                        }}
                        className="px-2.5 py-1 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold hover:bg-[#b0674b] transition-colors cursor-pointer"
                      >
                        {cons.status === 'InWaitingQueue'
                          ? 'Appeler'
                          : cons.status === 'InConsultation'
                          ? 'Clôturer'
                          : 'Revoir'}
                      </button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScreenPod>

          <KineticFilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            triggerRef={filterButtonRef}
            language={language}
            displayCount={sortedConsultations.length}
            entityPluralLabel={isAr ? 'استشارة' : isFr ? 'consultations' : 'consultations'}
            hasActiveFilters={activeFiltersCount > 0}
            onResetFilters={handleResetFilters}
            sections={filterSections}
          />

          <KineticSlideOverInspector
            isOpen={!!activeConsultation}
            item={activeConsultation}
            allItems={sortedConsultations}
            keyExtractor={(c) => c.id}
            openerElement={drawerOpenerEl}
            language={language}
            title={activeConsultation?.patientName || ''}
            subtitle={
              activeConsultation
                ? `${activeConsultation.ticketNumber || activeConsultation.id} · ${
                    activeConsultation.doctorName || 'Cabinet Médical'
                  }`
                : ''
            }
            avatarText={activeConsultation ? getInitials2(activeConsultation.patientName) : 'TR'}
            avatarColor="#d4522f"
            categoryLabel={isAr ? 'الفرز والانتظار' : isFr ? 'TRIAGE & CONSULTATION' : 'TRIAGE QUEUE'}
            branchName={
              activeConsultation
                ? resolveRecordBranch(activeConsultation, branchesById, currentBranch, language).name
                : ''
            }
            statusLabel={
              activeConsultation?.status === 'InWaitingQueue'
                ? isAr
                  ? 'في الانتظار'
                  : 'En attente'
                : activeConsultation?.status === 'InConsultation'
                ? isAr
                  ? 'في الفحص'
                  : 'En consultation'
                : isAr
                ? 'مكتمل'
                : 'Terminé'
            }
            statusClassName={
              activeConsultation ? getQueueStatusClassName(activeConsultation.status) : undefined
            }
            tabs={[
              { id: 'fiche', label: isAr ? 'الفحص' : isFr ? 'Fiche' : 'Overview' },
              { id: 'vitals', label: isAr ? 'العلامات' : isFr ? 'Constantes' : 'Vitals' },
              { id: 'finance', label: isAr ? 'الأتعاب والملف' : isFr ? 'Honoraires & Actions' : 'Billing' },
            ]}
            activeTab={activeInspectorTab}
            onTabChange={setActiveInspectorTab}
            onSelectItem={(c) => handleSelectConsultation(c)}
            onClose={() => setInspectedConsultation(null)}
            renderBody={(cons, tab) => (
              <div className="space-y-5">
                {tab === 'fiche' && (
                  <>
                    <InspectorSection
                      title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}
                      index={0}
                    >
                      <InspectorQuickActions
                        actions={[
                          ...(cons.status === 'InWaitingQueue'
                            ? [
                                {
                                  id: 'call',
                                  label: isAr ? 'استدعاء' : 'Appeler en salle',
                                  icon: <Stethoscope size={15} />,
                                  onClick: () => handleStartExam(cons),
                                },
                              ]
                            : cons.status === 'InConsultation'
                            ? [
                                {
                                  id: 'finish',
                                  label: isAr ? 'إنهاء الفحص' : 'Clôturer',
                                  icon: <CheckCircle2 size={15} />,
                                  onClick: () => handleFinishExam(cons),
                                },
                              ]
                            : []),
                          {
                            id: 'pin',
                            label: pinnedIds.has(cons.id) ? 'Détacher' : 'Prioriser',
                            icon: <Pin size={15} />,
                            onClick: () => handleTogglePin(cons.id),
                          },
                          {
                            id: 'ticket',
                            label: isAr ? 'تذكرة' : 'Ticket',
                            icon: <Printer size={15} />,
                            onClick: () => setTicketConsultToPrint(cons),
                          },
                        ]}
                      />
                    </InspectorSection>

                    <InspectorSection
                      title="Motif & Examen Clinique"
                      index={1}
                    >
                      <InspectorCard>
                        <InspectorKeyValue label="Motif" value={cons.chiefComplaint} />
                        <InspectorKeyValue
                          label="Diagnostic / Examen"
                          value={
                            cons.diagnosis ||
                            cons.clinicalExam ||
                            'Examen clinique en cours de documentation.'
                          }
                          isLast
                        />
                      </InspectorCard>
                    </InspectorSection>

                    <InspectorSection
                      title={isAr ? 'ملاحظة الطبيب الفورية' : "Note d'observation immédiate"}
                      index={2}
                    >
                      <InspectorNotesField
                        value={quickNote}
                        onSave={(next) => {
                          setQuickNote(next);
                          showToast({
                            type: 'success',
                            title: isAr ? 'تم الحفظ' : 'Observation enregistrée',
                            message: isAr ? 'تم حفظ الملاحظة السريرية' : 'Observation clinique enregistrée',
                          });
                        }}
                        placeholder="Ajouter une consigne ou observation..."
                        ariaLabel="Note d'observation immédiate"
                      />
                    </InspectorSection>
                  </>
                )}

                {tab === 'vitals' && (
                  <InspectorSection
                    title={isAr ? 'العلامات الحيوية المسجلة' : 'Constantes Vitales de Triage'}
                    index={0}
                  >
                    <InspectorCard>
                      <InspectorKeyValue
                        label="Tension artérielle"
                        value={`${cons.vitals?.bloodPressure || '120/80'} mmHg`}
                        mono
                      />
                      <InspectorKeyValue
                        label="Température"
                        value={
                          cons.vitals?.temperatureCelsius
                            ? `${cons.vitals.temperatureCelsius}°C`
                            : '37.0°C'
                        }
                        mono
                      />
                      <InspectorKeyValue
                        label="Poids / IMC"
                        value={`${cons.vitals?.weightKg ? `${cons.vitals.weightKg} kg` : '72 kg'} (IMC ${
                          cons.vitals?.bmi || '23.5'
                        })`}
                        mono
                      />
                      <InspectorKeyValue
                        label="Fréquence cardiaque"
                        value={`${
                          cons.vitals?.heartRateBpm ? `${cons.vitals.heartRateBpm} bpm` : '74 bpm'
                        }`}
                        mono
                        isLast
                      />
                    </InspectorCard>
                  </InspectorSection>
                )}

                {tab === 'finance' && (
                  <>
                    <InspectorSection
                      title="Honoraires & Convention CNAS"
                      index={0}
                    >
                      <InspectorCard>
                        <InspectorKeyValue
                          label="Honoraires conventionnés"
                          value={formatMoney(cons.consultationFeeDzd, 'DZD')}
                          mono
                        />
                        <InspectorKeyValue
                          label="Ticket modérateur patient"
                          value={formatMoney(cons.copayAmountDzd || 600, 'DZD')}
                          mono
                        />
                        <InspectorKeyValue
                          label="Prise en charge CNAS/Chifa"
                          value={formatMoney(cons.insuranceShareDzd || 2400, 'DZD')}
                          mono
                        />
                        <InspectorKeyValue
                          label="Statut encaissement"
                          value={cons.isPaid ? 'Réglé ✓' : 'En attente de paiement'}
                          isLast
                        />
                      </InspectorCard>
                    </InspectorSection>

                    <InspectorSection
                      title="Actions & Règlement"
                      index={1}
                    >
                      <div className="space-y-2">
                        {!cons.isPaid && (
                          <InspectorWideButton
                            label="Encaisser la consultation"
                            icon={<CreditCard size={15} />}
                            tone="accent"
                            onClick={() => {
                              markConsultationPaid(cons.id);
                              setInspectedConsultation({ ...cons, isPaid: true });
                            }}
                          />
                        )}
                        {cons.status === 'InWaitingQueue' && (
                          <InspectorWideButton
                            label="Faire entrer le patient"
                            icon={<Stethoscope size={15} />}
                            tone="accent"
                            onClick={() => handleStartExam(cons)}
                          />
                        )}
                        {cons.status === 'InConsultation' && (
                          <InspectorWideButton
                            label="Clôturer la consultation"
                            icon={<CheckCircle2 size={15} />}
                            tone="accent"
                            onClick={() => handleFinishExam(cons)}
                          />
                        )}
                        <InspectorWideButton
                          label="Imprimer ticket d'attente"
                          icon={<Printer size={15} />}
                          onClick={() => setTicketConsultToPrint(cons)}
                        />
                      </div>
                    </InspectorSection>
                  </>
                )}
              </div>
            )}
          />
        </>
      )}

      <MedicalConsultationModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        patients={patients}
        onSave={addConsultation}
      />
      <MedicalWaitingRoomTvModal
        isOpen={isTvModalOpen}
        onClose={() => setIsTvModalOpen(false)}
        consultations={consultations}
        practitioners={practitioners}
      />

      <PrintSheetModal
        isOpen={Boolean(ticketConsultToPrint)}
        onClose={() => setTicketConsultToPrint(null)}
        language={language}
        format="80mm"
        title={isAr ? 'تذكرة قاعة الانتظار' : "Ticket Salle d'Attente"}
        subtitle={
          ticketConsultToPrint
            ? `${ticketConsultToPrint.ticketNumber || ticketConsultToPrint.id} · ${ticketConsultToPrint.patientName}`
            : undefined
        }
        pages={
          ticketConsultToPrint
            ? [
                {
                  id: ticketConsultToPrint.id,
                  title: ticketConsultToPrint.ticketNumber || ticketConsultToPrint.id,
                  subtitle: ticketConsultToPrint.patientName,
                  badgeText: ticketConsultToPrint.urgencyLevel || 'Normal',
                  sections: [
                    {
                      heading: isAr ? 'بيانات الموعد والانتظار' : 'Accueil & Triage',
                      rows: [
                        { label: isAr ? 'المريض' : 'Patient', value: ticketConsultToPrint.patientName },
                        { label: isAr ? 'التاريخ' : 'Date', value: ticketConsultToPrint.consultationDate.split('T')[0] },
                        { label: isAr ? 'سبب الزيارة' : 'Motif', value: ticketConsultToPrint.chiefComplaint },
                        {
                          label: isAr ? 'الأولوية' : 'Urgence',
                          value: ticketConsultToPrint.urgencyLevel || 'Normal',
                        },
                        {
                          label: isAr ? 'الدفع' : 'Encaissement',
                          value: ticketConsultToPrint.isPaid ? (isAr ? 'مسدد' : 'Réglé') : (isAr ? 'عند الاستقبال' : 'À régler'),
                        },
                      ],
                    },
                  ],
                  footerNote: isAr ? 'يرجى الانتظار في القاعة حتى النداء على الرقم' : 'Merci de patienter en salle d’attente.',
                },
              ]
            : []
        }
      />
    </div>
  );
};

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
  ArrowRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalWaitingRoomTvModal } from './MedicalWaitingRoomTvModal';
import { MedicalAgendaView } from './MedicalAgendaView';
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

export const MedicalQueueView: React.FC<any> = () => {
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
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>('fiche');
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

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
      showToast({
        type: 'info',
        title: isAr ? 'استدعاء المريض' : 'Patient appelé',
        message: isAr ? 'تم استدعاء المريض لغرفة الكشف' : 'Patient appelé au cabinet de consultation',
      });
    },
    [updateConsultationStatus, activeConsultation, isAr]
  );

  const handleFinishExam = useCallback(
    (c: MedicalConsultation) => {
      updateConsultationStatus(c.id, 'Completed');
      if (activeConsultation?.id === c.id) {
        setInspectedConsultation({ ...c, status: 'Completed' });
      }
      showToast({
        type: 'success',
        title: isAr ? 'اكتمال الفحص' : 'Consultation clôturée',
        message: isAr ? 'تم إنهاء وتأكيد الفحص الطبي' : 'Consultation clôturée avec succès',
      });
    },
    [updateConsultationStatus, activeConsultation, isAr]
  );

  const handleSaveNote = () => {
    if (!quickNote.trim()) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast({
      type: 'success',
      title: isAr ? 'تم الحفظ' : 'Observation enregistrée',
      message: isAr ? 'تم حفظ الملاحظة السريرية' : 'Observation clinique enregistrée',
    });
  };

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
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-orange-100 dark:border-neutral-800">
                {c.patientName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
                  {c.patientName}
                  {isPinned && <span className="text-[10px] text-amber-500">VIP</span>}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/75 truncate max-w-[180px]">
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
          <span className="text-xs font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
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
            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-mono text-[11px] font-semibold">
              {c.vitals?.bloodPressure || '120/80'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-mono text-[11px]">
              {c.vitals?.temperatureCelsius ? `${c.vitals.temperatureCelsius}°C` : '37°C'}
            </span>
            {c.vitals?.weightKg && (
              <span className="text-[11px] text-black/55 dark:text-white/55 font-mono">
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              c.status === 'InWaitingQueue'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                : c.status === 'InConsultation'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
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
          <div className="font-mono font-bold text-xs text-black dark:text-white">
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
        subtitle={`${queueCounts.waiting} ${isAr ? 'في الانتظار' : 'en attente'}`}
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white/80 dark:bg-neutral-800 p-0.5 rounded-xl border border-[#E6DED6] dark:border-neutral-700/60">
              <button
                type="button"
                onClick={() => setActiveSubView('queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubView === 'queue'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                <Clock size={13} />
                <span>{isAr ? 'قائمة الفرز' : 'File de Triage'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubView === 'agenda'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs'
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
                <div className="flex items-center bg-white dark:bg-neutral-800 p-0.5 rounded-xl border border-[#E6DED6] dark:border-neutral-700/60">
                  <button
                    type="button"
                    onClick={() => setDisplayLayout('collection')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      displayLayout === 'collection'
                        ? 'bg-[#d4522f]/10 text-[#d4522f]'
                        : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <List size={13} />
                    <span>{isAr ? 'الجدول' : 'Registre'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayLayout('visual_queue')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      displayLayout === 'visual_queue'
                        ? 'bg-[#d4522f]/10 text-[#d4522f]'
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
                data={sortedConsultations}
                keyExtractor={(c) => c.id}
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
                openItemId={activeConsultation?.id ?? null}
                isPinned={(c) => pinnedIds.has(c.id)}
                onTogglePin={(c) => handleTogglePin(c.id)}
                onItemClick={(c, el) => {
                  if (el) setDrawerOpenerEl(el);
                  setInspectedConsultation(c);
                }}
                onViewDetails={(c, el) => {
                  if (el) setDrawerOpenerEl(el);
                  setInspectedConsultation(c);
                }}
                customActions={(c) => [
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
                    variant: 'primary',
                    onClick: () => {
                      if (c.status === 'InWaitingQueue') handleStartExam(c);
                      else handleFinishExam(c);
                    },
                  },
                ]}
                renderCard={(c) => {
                  const isPinned = pinnedIds.has(c.id);
                  return (
                    <div className="flex flex-col w-full space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-black dark:text-white truncate">
                          {c.patientName} {isPinned && '· VIP'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === 'InWaitingQueue'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : c.status === 'InConsultation'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {c.status === 'InWaitingQueue'
                            ? 'Attente'
                            : c.status === 'InConsultation'
                            ? 'En cours'
                            : 'Terminé'}
                        </span>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-1 text-center text-xs font-mono">
                        <div>
                          <div className="text-[10px] text-black/55 dark:text-white/55">TA</div>
                          <div className="font-bold text-black dark:text-white">
                            {c.vitals?.bloodPressure || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-black/55 dark:text-white/55">Temp</div>
                          <div className="font-bold text-black dark:text-white">
                            {c.vitals?.temperatureCelsius ? `${c.vitals.temperatureCelsius}°` : '37°'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-black/55 dark:text-white/55">Poids</div>
                          <div className="font-bold text-black dark:text-white">
                            {c.vitals?.weightKg ? `${c.vitals.weightKg}kg` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-black/55 dark:text-white/55 line-clamp-1">
                        {c.chiefComplaint}
                      </div>
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#d4522f]">
                          {formatMoney(c.consultationFeeDzd, 'DZD')}
                        </span>
                        <span className="text-[11px] text-black/55 dark:text-white/55">
                          {c.consultationDate.split('T')[0]}
                        </span>
                      </div>
                    </div>
                  );
                }}
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
                  <div
                    key={cons.id}
                    className={`bg-white dark:bg-neutral-800 rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all ${
                      activeConsultation?.id === cons.id
                        ? 'border-[#d4522f] ring-2 ring-[#d4522f]/30'
                        : cons.status === 'InConsultation'
                        ? 'border-blue-400 ring-1 ring-blue-400/30'
                        : 'border-[#E6DED6] dark:border-neutral-700/60'
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
                          <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 text-xs font-bold flex items-center justify-center text-black/70 dark:text-white/75">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-bold text-black dark:text-white truncate max-w-[140px]">
                            {cons.patientName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
                      <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-1 text-center text-xs font-mono border border-neutral-100 dark:border-neutral-700/40">
                        <div>
                          <div className="text-[10px] text-black/55 dark:text-white/55">TA</div>
                          <div className="font-bold text-black dark:text-white">
                            {cons.vitals?.bloodPressure || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-black/55 dark:text-white/55">Temp</div>
                          <div className="font-bold text-black dark:text-white">
                            {cons.vitals?.temperatureCelsius
                              ? `${cons.vitals.temperatureCelsius}°C`
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-black/55 dark:text-white/55">Poids</div>
                          <div className="font-bold text-black dark:text-white">
                            {cons.vitals?.weightKg ? `${cons.vitals.weightKg}kg` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-black/70 dark:text-white/75 truncate">
                        <span className="font-medium text-black/55 dark:text-white/55 mr-1">
                          Motif:
                        </span>
                        {cons.chiefComplaint}
                      </div>
                    </button>
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#d4522f]">
                        {formatMoney(cons.consultationFeeDzd, 'DZD')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (cons.status === 'InWaitingQueue') handleStartExam(cons);
                          else handleFinishExam(cons);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#d4522f] text-white text-[11px] font-semibold hover:bg-[#b0674b] transition-colors cursor-pointer"
                      >
                        {cons.status === 'InWaitingQueue'
                          ? 'Appeler'
                          : cons.status === 'InConsultation'
                          ? 'Clôturer'
                          : 'Revoir'}
                      </button>
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
            avatarText={activeConsultation?.patientName?.charAt(0).toUpperCase() || 'C'}
            avatarColor="#d4522f"
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
            tabs={[
              { id: 'fiche', label: isAr ? 'الفحص' : 'Fiche' },
              { id: 'vitals', label: isAr ? 'العلامات' : 'Constantes' },
              { id: 'finance', label: isAr ? 'الأتعاب' : 'Honoraires' },
              { id: 'actions', label: isAr ? 'الإجراءات' : 'Actions' },
            ]}
            activeTab={activeInspectorTab}
            onTabChange={setActiveInspectorTab}
            onSelectItem={(c) => setInspectedConsultation(c)}
            onClose={() => setInspectedConsultation(null)}
            renderBody={(cons, tab) => (
              <div className="space-y-4 text-xs">
                {tab === 'fiche' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-black/55 dark:text-white/55">
                        MOTIF DE CONSULTATION
                      </span>
                      <p className="text-black dark:text-white font-medium text-xs">
                        {cons.chiefComplaint}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold text-black/55 dark:text-white/55">
                        DIAGNOSTIC / EXAMEN CLINIQUE
                      </span>
                      <p className="text-black dark:text-white">
                        {cons.diagnosis ||
                          cons.clinicalExam ||
                          'Examen clinique en cours de documentation.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-black/70 dark:text-white/75">
                        {isAr ? 'ملاحظة الطبيب الفورية' : "Note d'observation immédiate"}
                      </label>
                      <textarea
                        rows={3}
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder="Ajouter une consigne ou observation..."
                        className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-[#d4522f]"
                      />
                      <div className="flex justify-end">
                        <AtriumButton size="xs" variant="primary" onClick={handleSaveNote}>
                          {noteSaved ? 'Enregistré ✓' : 'Sauvegarder note'}
                        </AtriumButton>
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'vitals' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-black/55 dark:text-white/55 font-bold">
                        TENSION ARTÉRIELLE
                      </span>
                      <div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">
                        {cons.vitals?.bloodPressure || '120/80'}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Normotendu</span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-black/55 dark:text-white/55 font-bold">
                        TEMPÉRATURE
                      </span>
                      <div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">
                        {cons.vitals?.temperatureCelsius
                          ? `${cons.vitals.temperatureCelsius}°C`
                          : '37.0°C'}
                      </div>
                      <span className="text-[10px] text-black/55 dark:text-white/55">Apyrétique</span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-black/55 dark:text-white/55 font-bold">
                        POIDS / TAILLE
                      </span>
                      <div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">
                        {cons.vitals?.weightKg ? `${cons.vitals.weightKg} kg` : '72 kg'}
                      </div>
                      <span className="text-[10px] text-black/55 dark:text-white/55">
                        IMC: {cons.vitals?.bmi || '23.5'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] text-black/55 dark:text-white/55 font-bold">
                        FRÉQUENCE CARDIAQUE
                      </span>
                      <div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">
                        {cons.vitals?.heartRateBpm ? `${cons.vitals.heartRateBpm} bpm` : '74 bpm'}
                      </div>
                      <span className="text-[10px] text-black/55 dark:text-white/55">Pouls régulier</span>
                    </div>
                  </div>
                )}

                {tab === 'finance' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-orange-50/60 dark:bg-neutral-800 border border-orange-100 dark:border-neutral-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-black/55 dark:text-white/55">Honoraires conventionnés:</span>
                        <span className="font-mono font-bold text-sm text-[#d4522f]">
                          {formatMoney(cons.consultationFeeDzd, 'DZD')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-black/70 dark:text-white/75">
                        <span>Ticket modérateur patient:</span>
                        <span className="font-mono font-semibold">
                          {formatMoney(cons.copayAmountDzd || 600, 'DZD')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                        <span>Prise en charge CNAS/Chifa:</span>
                        <span className="font-mono font-semibold">
                          {formatMoney(cons.insuranceShareDzd || 2400, 'DZD')}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-orange-200/60 dark:border-neutral-700 flex items-center justify-between font-bold">
                        <span>Statut encaissement:</span>
                        <span className={cons.isPaid ? 'text-emerald-600' : 'text-amber-600'}>
                          {cons.isPaid ? 'Réglé ✓' : 'En attente de paiement'}
                        </span>
                      </div>
                    </div>
                    {!cons.isPaid && (
                      <AtriumButton
                        variant="primary"
                        onClick={() => {
                          markConsultationPaid(cons.id);
                          setInspectedConsultation({ ...cons, isPaid: true });
                          showToast({
                            type: 'success',
                            title: 'Encaissement validé',
                            message: 'Paiement enregistré avec succès',
                          });
                        }}
                        className="w-full justify-center"
                        icon={<CreditCard size={14} />}
                      >
                        Encaisser la consultation
                      </AtriumButton>
                    )}
                  </div>
                )}

                {tab === 'actions' && (
                  <div className="space-y-2.5">
                    {cons.status === 'InWaitingQueue' && (
                      <button
                        type="button"
                        onClick={() => handleStartExam(cons)}
                        className="w-full p-3 rounded-xl bg-[#d4522f] text-white font-semibold flex items-center justify-between hover:bg-[#b0674b] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Stethoscope size={16} />
                          Faire entrer le patient
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                    {cons.status === 'InConsultation' && (
                      <button
                        type="button"
                        onClick={() => handleFinishExam(cons)}
                        className="w-full p-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-between hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          Clôturer la consultation
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTogglePin(cons.id)}
                      className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Pin size={16} />
                        {pinnedIds.has(cons.id)
                          ? 'Détacher priorité'
                          : 'Prioriser en tête de file'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        showToast({
                          type: 'info',
                          title: 'Impression Ticket',
                          message: `Impression du ticket ${cons.ticketNumber || cons.id}...`,
                        })
                      }
                      className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Printer size={16} />
                        Imprimer ticket d'attente
                      </span>
                    </button>
                  </div>
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
    </div>
  );
};

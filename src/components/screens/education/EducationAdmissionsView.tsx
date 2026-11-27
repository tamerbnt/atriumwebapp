import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Phone,
  Mail,
  UserCheck,
  ArrowRight,
  X,
  Trash2,
  CheckCircle2,
  LayoutGrid,
  Columns,
  Eye,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentEduAdmissionsFromState,
  selectCurrentEduCoursesFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { AdmissionStage, EduAdmissionLead } from '../../../types';
import { checkCohortCapacity } from '../../../utils/educationDepth';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Button } from '@/atrium/core';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKanbanPipeline, SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  KineticEmptyStateMotion,
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticModalShell,
  useRetainedModalValue,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const EducationAdmissionsView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { eduAdmissions, eduCourses, eduCohorts, currentBranch, branches, isSyncing, networkMode, lastSyncedAt, isSyncTimeout } = useAtriumSelector(
    (s) => ({
      eduAdmissions: selectCurrentEduAdmissionsFromState(s),
      eduCourses: selectCurrentEduCoursesFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );
  const {
    addEduAdmissionLead,
    updateAdmissionStage,
    deleteEduAdmissionLead,
    convertAdmissionToStudent,
    retryCloudSync,
  } = useAtriumActions();

  const [viewLayout, setViewLayout] = useState<'kanban' | 'collection'>('kanban');
  const [collectionViewMode, setCollectionViewMode] = useState<'list' | 'grid'>('list');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [conversionLead, setConversionLead] = useState<EduAdmissionLead | null>(null);
  const [targetCohortId, setTargetCohortId] = useState<string>(eduCohorts[0]?.id || '');
  const [conversionDeposit, setConversionDeposit] = useState<number>(0);
  const [allowWaitlistConversion, setAllowWaitlistConversion] = useState<boolean>(false);

  const [selectedLead, setSelectedLead] = useState<EduAdmissionLead | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'profile' | 'pipeline' | 'notes'>('profile');

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedLeadIds, setPinnedLeadIds] = useState<Set<string>>(() => new Set<string>());
  const [leadSortBy, setLeadSortBy] = useState<string>('studentName');
  const [leadSortDir, setLeadSortDir] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    email: '',
    desiredCourseId: eduCourses[0]?.id || '',
    guardianName: '',
    placementScore: '',
    source: 'Social Media',
    notes: '',
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    eduAdmissions.forEach((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language).name;
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }, [eduAdmissions, branchesById, currentBranch, language]);

  const stages = useMemo(
    () => [
      { id: 'Inquiry' as AdmissionStage, title: t('edu_stage_inquiry') },
      { id: 'PlacementTest' as AdmissionStage, title: t('edu_stage_placement') },
      { id: 'TrialClass' as AdmissionStage, title: t('edu_stage_trial') },
      { id: 'Admitted' as AdmissionStage, title: t('edu_stage_admitted') },
      { id: 'Enrolled' as AdmissionStage, title: t('edu_stage_enrolled') },
    ],
    [t]
  );

  const filteredAdmissions = useMemo(() => {
    return eduAdmissions.filter((lead) => {
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(lead, branchesById, currentBranch, language).name;
        if (b !== branchFilter) return false;
      }
      if (stageFilter !== 'All' && lead.stage !== stageFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        lead.studentName.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        lead.desiredCourseTitle.toLowerCase().includes(q)
      );
    });
  }, [eduAdmissions, branchFilter, stageFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedLeads = useMemo(() => {
    return [...filteredAdmissions].sort((a, b) => {
      const aPinned = pinnedLeadIds.has(a.id);
      const bPinned = pinnedLeadIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (leadSortBy === 'stage') {
        cmp = a.stage.localeCompare(b.stage);
      } else if (leadSortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = a.studentName.localeCompare(b.studentName);
      }
      return leadSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredAdmissions, pinnedLeadIds, leadSortBy, leadSortDir, branchesById, currentBranch, language]);

  const activeLead = useMemo(() => {
    if (!selectedLead) return null;
    return eduAdmissions.find((l) => l.id === selectedLead.id) || selectedLead;
  }, [selectedLead, eduAdmissions]);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    const course = eduCourses.find((c) => c.id === formData.desiredCourseId);
    if (!course) return;
    addEduAdmissionLead({
      studentName: formData.studentName,
      phone: formData.phone,
      email: formData.email || undefined,
      desiredCourseId: course.id,
      desiredCourseTitle: course.title,
      stage: 'Inquiry',
      guardianName: formData.guardianName || undefined,
      placementScore: formData.placementScore || undefined,
      source: formData.source,
      notes: formData.notes || undefined,
    });
    setIsAddLeadModalOpen(false);
  };

  const handleConfirmConversion = () => {
    if (!conversionLead || !targetCohortId) return;
    const res = convertAdmissionToStudent(conversionLead.id, targetCohortId, conversionDeposit, {
      allowWaitlist: allowWaitlistConversion,
    });
    if (!res) return;
    setConversionLead(null);
    setConversionDeposit(0);
    setAllowWaitlistConversion(false);
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      isAr ? 'اسم المترشح' : isEn ? 'Candidate Name' : 'Nom Prospect',
      isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      isAr ? 'البريد الإلكتروني' : 'Email',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      isAr ? 'المقرر المطلوب' : isEn ? 'Desired Course' : 'Programme Souhaité',
      isAr ? 'المرحلة الحالية' : isEn ? 'Stage' : 'Étape',
      isAr ? 'الولي' : isEn ? 'Guardian' : 'Tuteur',
      isAr ? 'نتيجة الاختبار' : isEn ? 'Placement Score' : 'Score',
      isAr ? 'المصدر' : 'Source',
      isAr ? 'ملاحظات' : isEn ? 'Notes' : 'Remarques',
    ];
    const rows = sortedLeads.map((l) => [
      l.studentName,
      l.phone,
      l.email || '',
      resolveRecordBranch(l, branchesById, currentBranch, language).name,
      l.desiredCourseTitle,
      l.stage,
      l.guardianName || 'Adult / Self',
      l.placementScore || '',
      l.source || '',
      l.notes || '',
    ]);
    downloadCsvSafe(`admission-leads-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : isEn ? 'Export Complete' : 'Exportation réussie',
      message: `${sortedLeads.length} ${isAr ? 'طلبات تسجيل تم تصديرها' : 'leads exported'}`,
    });
  }, [sortedLeads, branchesById, currentBranch, language, isAr, isEn]);

  const handleBatchSetStage = (stage: AdmissionStage) => {
    if (selectedLeadIds.size === 0) return;
    const count = selectedLeadIds.size;
    runUndoBatch(
      {
        vertical: 'education_cohort',
        operationType: 'bulk',
        affectedCount: count,
        summary: isAr
          ? `تحديث المرحلة (${count})`
          : isEn
          ? `Update stage (${count})`
          : `Mise à jour statut (${count})`,
      },
      () => {
        selectedLeadIds.forEach((id) => updateAdmissionStage(id, stage));
      }
    );
    setSelectedLeadIds(new Set<string>());
  };

  const handleBatchDelete = () => {
    if (selectedLeadIds.size === 0) return;
    const count = selectedLeadIds.size;
    runUndoBatch(
      {
        vertical: 'education_cohort',
        operationType: 'bulk',
        affectedCount: count,
        summary: isAr
          ? `حذف مترشحين (${count})`
          : isEn
          ? `Delete leads (${count})`
          : `Suppression prospects (${count})`,
      },
      () => {
        selectedLeadIds.forEach((id) => deleteEduAdmissionLead(id));
      }
    );
    if (selectedLead && selectedLeadIds.has(selectedLead.id)) setSelectedLead(null);
    setSelectedLeadIds(new Set<string>());
  };

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: eduAdmissions.length },
      ...Array.from(branchCounts.entries()).map(([n, c]) => ({ value: n, label: n, count: c })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / المؤسسة' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'stage',
        label: isAr ? 'مرحلة القبول' : isEn ? 'Admission Stage' : 'Étape du Pipeline',
        value: stageFilter,
        onChange: setStageFilter,
        resetValue: 'All',
        kind: 'segmented',
        options: [
          { value: 'All', label: t('edu_filter_all') },
          ...stages.map((s) => ({ value: s.id, label: s.title })),
        ],
      },
    ];
  }, [branchFilter, stageFilter, branchCounts, eduAdmissions.length, isAr, isEn, t, stages]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (stageFilter !== 'All') {
      const stageLabel = stages.find((s) => s.id === stageFilter)?.title || stageFilter;
      chips.push({
        key: 'stage',
        label: stageLabel,
        onRemove: () => setStageFilter('All'),
      });
    }
    return chips;
  }, [branchFilter, stageFilter, stages, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (stageFilter !== 'All' ? 1 : 0);

  const getLeadRowMeta = useCallback(
    (lead: EduAdmissionLead): KineticRowMeta => ({
      avatarText: lead.studentName.slice(0, 2).toUpperCase(),
      subline: `${lead.desiredCourseTitle} · ${lead.phone}`,
      categoryLabel: lead.source || (isAr ? 'مترشح' : 'Prospect'),
      statusVariant:
        lead.stage === 'Enrolled'
          ? 'active'
          : lead.stage === 'Admitted'
          ? 'info'
          : 'warning',
      statusLabel: stages.find((s) => s.id === lead.stage)?.title || lead.stage,
      metricPrimary: lead.placementScore || lead.stage,
      metricSecondary: lead.guardianName || undefined,
      detailCol1: {
        heading: isAr ? 'المترشح والاتصال' : isEn ? 'Applicant & Contact' : 'Candidat & Contact',
        primaryText: lead.studentName,
        secondaryText: lead.phone,
        tertiaryText: lead.guardianName ? `${isAr ? 'الولي:' : 'Tuteur:'} ${lead.guardianName}` : undefined,
      },
      detailCol2: {
        heading: isAr ? 'التكوين والمصدر' : isEn ? 'Program & Source' : 'Formation & Source',
        primaryText: lead.desiredCourseTitle,
        secondaryText: lead.source || (isAr ? 'تسجيل مباشر' : 'Direct'),
      },
      detailCol3: {
        heading: isAr ? 'المستوى والمرحلة' : isEn ? 'Placement & Stage' : 'Niveau & Étape',
        primaryText: stages.find((s) => s.id === lead.stage)?.title || lead.stage,
        secondaryText: lead.placementScore ? `${isAr ? 'التقييم:' : 'Score:'} ${lead.placementScore}` : undefined,
      },
    }),
    [stages, isAr, isEn]
  );

  const getLeadFanActions = useCallback(
    (lead: EduAdmissionLead): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedLead(lead);
          setInspectorTab('profile');
        },
      },
      ...(lead.stage !== 'Enrolled'
        ? [
            {
              id: 'convert',
              label: t('edu_btn_convert_student'),
              icon: <UserCheck className="w-[15px] h-[15px]" />,
              onClick: () => setConversionLead(lead),
            },
          ]
        : []),
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          deleteEduAdmissionLead(lead.id);
          if (selectedLead?.id === lead.id) setSelectedLead(null);
        },
      },
    ],
    [isAr, isEn, t, deleteEduAdmissionLead, selectedLead?.id]
  );

  const getLeadDetailActions = useCallback(
    (lead: EduAdmissionLead): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isEn ? 'Open' : 'Ouvrir',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedLead(lead);
          setInspectorTab('profile');
        },
      },
      ...(lead.stage !== 'Enrolled'
        ? [
            {
              id: 'convert',
              label: t('edu_btn_convert_student'),
              icon: <UserCheck className="w-3.5 h-3.5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
              onClick: () => setConversionLead(lead),
            },
          ]
        : []),
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => {
          deleteEduAdmissionLead(lead.id);
          if (selectedLead?.id === lead.id) setSelectedLead(null);
        },
      },
    ],
    [isAr, isEn, t, deleteEduAdmissionLead, selectedLead?.id]
  );

  const leadColumns: ColumnDefinition<EduAdmissionLead>[] = useMemo(
    () => [
      {
        key: 'studentName',
        header: isAr ? 'المترشح / الطالب' : isEn ? 'Prospect Name' : 'Candidat / Élève',
        width: '2.4*',
        minWidth: '210px',
        sortable: true,
        renderCell: (lead) => (
          <div className="flex items-center gap-3">
            <div
              data-sq="tile"
              data-sq-border="solid"
              className="w-9 h-9 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small shrink-0 [--sq-stroke:rgba(212,82,47,0.22)] dark:[--sq-stroke:rgba(255,143,99,0.22)]"
            >
              {lead.studentName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate">{lead.studentName}</div>
              <div className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-medium truncate">{lead.desiredCourseTitle}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        sortable: true,
        renderCell: (lead) => {
          const b = resolveRecordBranch(lead, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'contact',
        header: isAr ? 'الاتصال' : isEn ? 'Contact' : 'Coordonnées',
        width: '1.8*',
        minWidth: '170px',
        renderCell: (lead) => (
          <div className="space-y-0.5 t-cap">
            <div className="flex items-center gap-2 text-black/70 dark:text-white/75 tabular-nums t-cap">
              <Phone size={12} className="text-black/55 dark:text-white/55 shrink-0" />
              <span>{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-black/55 dark:text-white/75 truncate t-cap">
                <Mail size={12} className="text-black/55 dark:text-white/55 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'guardian',
        header: isAr ? 'الولي / الوصي' : isEn ? 'Guardian' : 'Tuteur / Parent',
        width: '1.5*',
        minWidth: '130px',
        renderCell: (lead) => (
          <span className="t-cap text-black/70 dark:text-white/75">
            {lead.guardianName || (isAr ? 'مترشح راشد' : 'Adult / Self')}
          </span>
        ),
      },
      {
        key: 'score',
        header: isAr ? 'نتيجة التقييم' : isEn ? 'Placement Score' : "Test d'orientation",
        width: '1.3*',
        minWidth: '120px',
        renderCell: (lead) => (
          <span className="t-cap text-black/70 dark:text-white/75">
            {lead.placementScore ? (
              <span className="px-2 py-1 rounded-full t-small font-semibold bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {lead.placementScore}
              </span>
            ) : (
              '—'
            )}
          </span>
        ),
      },
      {
        key: 'stage',
        header: isAr ? 'المرحلة' : isEn ? 'Stage' : 'Étape',
        width: '1.5*',
        minWidth: '140px',
        sortable: true,
        renderCell: (lead) => {
          const isAdmitted = lead.stage === 'Admitted';
          const isEnrolled = lead.stage === 'Enrolled';
          return (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold ${
                  isEnrolled
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : isAdmitted
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {lead.stage}
              </span>
              {isAdmitted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversionLead(lead);
                  }}
                  className="p-2 rounded-full bg-[var(--brand-fill,#C9461F)] text-white hover:opacity-90 shadow-2xs cursor-pointer"
                  title={t('edu_btn_convert_student')}
                >
                  <UserCheck size={12} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [isAr, isEn, t, branchesById, currentBranch, language]
  );

  const totalLeads = eduAdmissions.length;
  const admittedCount = eduAdmissions.filter((l) => l.stage === 'Admitted' || l.stage === 'Enrolled').length;
  const conversionRate = totalLeads > 0 ? Math.round((admittedCount / totalLeads) * 100) : 0;
  const projectedPipeline = totalLeads * 38000;

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: eduAdmissions.length > 0,
  });

  const retainedConversionLead = useRetainedModalValue(conversionLead);

  if (showSkeleton && (eduAdmissions.length === 0 || networkMode === 'force_skeleton')) {
    if (viewLayout === 'kanban') {
      return (
        <SkeletonKanbanPipeline
          columnsCount={5}
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          onRetry={retryCloudSync || retry}
        />
      );
    }
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<ClipboardList size={22} />}
        title={t('edu_admissions_title')}
        secondaryActions={
          <div
            data-sq="ctl"
            data-sq-border="solid"
            className="flex items-center p-[3px] bg-[#F4EFEA] dark:bg-[#191716]"
          >
            <button
              type="button"
              data-sq="thumb"
              data-sq-border="none"
              onClick={() => setViewLayout('kanban')}
              className={`px-3 py-2 t-small font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                viewLayout === 'kanban'
                  ? 'bg-white dark:bg-[#2B2825] text-[var(--brand-on-dark,#FF8F63)]'
                  : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
              }`}
            >
              <Columns size={13} />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              data-sq="thumb"
              data-sq-border="none"
              onClick={() => setViewLayout('collection')}
              className={`px-3 py-2 t-small font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                viewLayout === 'collection'
                  ? 'bg-white dark:bg-[#2B2825] text-[var(--brand-on-dark,#FF8F63)]'
                  : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>{isAr ? 'جدول وبطاقات' : isEn ? 'List & Grid' : 'Liste & Grille'}</span>
            </button>
          </div>
        }
        primaryAction={{
          label: t('edu_btn_new_lead'),
          icon: <Plus size={14} />,
          onClick: () => setIsAddLeadModalOpen(true),
        }}
      />

      {selectedLeadIds.size > 0 && (
        <div
          data-sq="card"
          data-sq-border="solid"
          className="flex items-center justify-between p-3 px-4 bg-[#FCEEE8] dark:bg-[#22201E] [--sq-stroke:rgba(212,82,47,0.24)] dark:[--sq-stroke:rgba(255,143,99,0.22)] animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
            <span className="t-small font-semibold text-black dark:text-white">
              {selectedLeadIds.size}{' '}
              {isAr ? 'طلبات تسجيل محددة' : isEn ? 'leads selected' : 'dossiers sélectionnés'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedLeadIds(new Set<string>())}
              className="px-3 py-2 t-small text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
            >
              {isAr ? 'إلغاء التحديد' : isEn ? 'Deselect' : 'Désélectionner'}
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => handleBatchSetStage('TrialClass')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>{isAr ? 'حصة تجريبية' : 'Trial Class'}</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => handleBatchSetStage('Admitted')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>{isAr ? 'قبول الملف' : 'Admit'}</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{isAr ? 'حذف المحدد' : isEn ? 'Delete' : 'Supprimer'}</span>
            </button>
          </div>
        </div>
      )}

      <ScreenKpiBanner
        heading={
          isAr
            ? 'قمع القبول والتسجيلات'
            : isEn
            ? 'Admissions Pipeline & Conversion Health'
            : "Pipeline d'Admissions & Conversion"
        }
        language={language}
        primaryCard={{
          label: isAr ? 'ملفات قيد المعالجة' : isEn ? 'Active Pipeline' : 'Prospects Actifs',
          count: totalLeads,
          badgeText: `5 ${isAr ? 'مراحل' : isEn ? 'stages' : 'étapes'}`,
          tone: 'terracotta',
          isActive: stageFilter === 'All',
          onToggle: () => setStageFilter('All'),
        }}
        secondaryCard={{
          label: isAr ? 'معدل التحويل للقبول' : isEn ? 'Admission Conversion' : "Taux d'admission",
          count: conversionRate,
          formatValue: (v) => `${v}%`,
          badgeText: `${admittedCount} ${isAr ? 'مقبول' : isEn ? 'admitted' : 'admis'}`,
          tone: 'emerald',
          isActive: stageFilter === 'Admitted',
          onToggle: () => setStageFilter((p) => (p === 'Admitted' ? 'All' : 'Admitted')),
        }}
        darkCard={{
          label: isAr
            ? 'القيمة المتوقعة للتسجيلات'
            : isEn
            ? 'Projected Tuition Pipeline'
            : 'Potentiel Recouvrement Frais',
          valueCount: projectedPipeline,
          valueSuffix: ' DZD',
          badgeCount: admittedCount,
          badgeSuffix: isAr ? ' مقبول' : isEn ? ' admitted' : ' admis',
          caption: isAr ? 'إجمالي الرسوم المتوقعة' : isEn ? 'Projected tuition recovery' : "Potentiel d'encaissement rentrée",
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'طلبات التسجيل والقبول'
              : isEn
              ? 'Admissions Pipeline'
              : "Dossiers d'Admission"
          }
          liveRegionText={`${sortedLeads.length} ${isAr ? 'مترشح' : 'prospects'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث عن مترشح، هاتف، دورة...'
              : isEn
              ? 'Search leads by student, phone, desired course...'
              : 'Rechercher candidat, tél, formation...'
          }
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={collectionViewMode}
          showViewToggle={viewLayout === 'collection'}
          onViewModeChange={(m) => setCollectionViewMode(m === 'grid' ? 'grid' : 'list')}
          extraTrailingControls={
            <LiveSegmentedControl
              size="md"
              value={viewLayout}
              onValueChange={(val) => setViewLayout(val as 'kanban' | 'collection')}
              options={[
                {
                  value: 'kanban',
                  label: isAr ? 'كانبان' : 'Kanban',
                  count: totalLeads,
                },
                {
                  value: 'collection',
                  label: isAr ? 'سجل' : isEn ? 'Table' : 'Tableau',
                },
              ]}
              aria-label="Admissions View Mode"
            />
          }
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setStageFilter('All');
            setSearchQuery('');
          }}
        />

        {viewLayout === 'collection' && (
          <UniversalDataCollection<EduAdmissionLead>
            hideToolbar
            items={sortedLeads}
            keyExtractor={(l) => l.id}
            viewMode={collectionViewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={collectionViewMode === 'grid' ? 'grid' : 'list'}
            columns={leadColumns}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            sortBy={leadSortBy}
            sortDirection={leadSortDir}
            onSortChange={(key, dir) => {
              setLeadSortBy(key);
              setLeadSortDir(dir);
            }}
            openItemId={activeLead?.id ?? null}
            selectedIds={selectedLeadIds}
            onSelectionChange={setSelectedLeadIds}
            pinnedIds={pinnedLeadIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              setPinnedLeadIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                  next.delete(id);
                  showToast({ type: 'info', title: 'Unpinned', message: 'Lead unpinned' });
                } else {
                  next.add(id);
                  showToast({ type: 'info', title: 'Pinned', message: 'Lead pinned to top' });
                }
                return next;
              });
            }}
            onItemClick={(lead, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedLead(lead);
              setInspectorTab('profile');
            }}
            onViewDetails={(lead, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedLead(lead);
              setInspectorTab('profile');
            }}
            getRowMeta={getLeadRowMeta}
            getFanActions={getLeadFanActions}
            getDetailActions={getLeadDetailActions}
            onEdit={(lead) => {
              if (lead.stage === 'Admitted') setConversionLead(lead);
              else {
                setSelectedLead(lead);
                setInspectorTab('pipeline');
              }
            }}
            onDelete={(lead) => {
              deleteEduAdmissionLead(lead.id);
              if (selectedLead?.id === lead.id) setSelectedLead(null);
            }}
            emptyTitle="No admission prospects"
            emptyDescription="No student leads match the current filters"
            primaryActionLabel={t('edu_btn_new_lead')}
            onAddFirstItem={() => setIsAddLeadModalOpen(true)}
          />
        )}

        {viewLayout === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {stages.map((stage) => {
              const leadsInStage = filteredAdmissions.filter((l) => l.stage === stage.id);
              return (
                <div
                  key={stage.id}
                  data-sq="card"
                  data-sq-border="solid"
                  className="bg-[#F3EDE7]/65 dark:bg-[#191716] p-3 flex flex-col space-y-3 min-h-[480px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--atr-divider)]">
                    <span className="t-small font-semibold text-black dark:text-white">{stage.title}</span>
                    <span className="w-5 h-5 rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] text-black/70 dark:text-white/75 t-small font-semibold flex items-center justify-center tabular-nums">
                      {leadsInStage.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {leadsInStage.map((lead) => (
                      <div key={lead.id} className="sq-elev-card sq-elev-card-hover">
                        <div
                          data-sq="ctl"
                          data-sq-border="solid"
                          className="p-4 bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] transition-colors space-y-2 group"
                        >
                        <button
                          type="button"
                          onClick={(e) => {
                            setDrawerOpenerEl(e.currentTarget);
                            setSelectedLead(lead);
                          }}
                          className="w-full text-left rtl:text-right cursor-pointer space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-black dark:text-white t-small group-hover:text-[var(--brand-text,#BF431F)] dark:group-hover:text-[var(--brand-on-dark,#FF8F63)] transition-colors">
                              {lead.studentName}
                            </span>
                            {lead.placementScore && (
                              <span className="px-2 py-1 rounded-full t-small font-semibold bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                                Score: {lead.placementScore}
                              </span>
                            )}
                          </div>
                          <span className="t-small font-medium text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                            {lead.desiredCourseTitle}
                          </span>
                          <div className="space-y-1 t-cap text-black/55 dark:text-white/75">
                            <div className="flex items-center gap-2">
                              <Phone size={11} className="text-black/55 dark:text-white/55" />
                              <span>{lead.phone}</span>
                            </div>
                            {lead.guardianName && (
                              <div className="t-cap text-black/55 dark:text-white/55">
                                {t('edu_guardian_prefix', { name: lead.guardianName })}
                              </div>
                            )}
                            {lead.source && (
                              <div className="t-cap text-black/55 dark:text-white/55">
                                Source: {lead.source}
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="pt-2 border-t border-[var(--atr-divider)] flex items-center justify-between">
                          {stage.id === 'Admitted' ? (
                            <button
                              type="button"
                              data-sq="ctl-sm"
                              data-sq-border="none"
                              onClick={() => setConversionLead(lead)}
                              className="w-full py-2 px-2 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
                            >
                              <UserCheck size={12} />
                              <span>{t('edu_btn_convert_student')}</span>
                            </button>
                          ) : stage.id !== 'Enrolled' ? (
                            <button
                              type="button"
                              data-sq="ctl-sm"
                              data-sq-border="none"
                              onClick={() => {
                                const nextIndex = stages.findIndex((s) => s.id === stage.id) + 1;
                                if (nextIndex < stages.length) {
                                  updateAdmissionStage(lead.id, stages[nextIndex].id);
                                }
                              }}
                              className="w-full py-1 text-center t-small font-semibold text-black/70 dark:text-white/75 bg-neutral-100 dark:bg-[#2B2825] hover:bg-neutral-200 dark:hover:bg-[#332F2B] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Move Next</span>
                              <ArrowRight size={11} className="rtl:rotate-180" />
                            </button>
                          ) : (
                            <span className="t-small text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mx-auto">
                              <UserCheck size={11} /> Converted
                            </span>
                          )}
                        </div>
                        </div>
                      </div>
                    ))}
                    {leadsInStage.length === 0 && (
                      <KineticEmptyStateMotion motionKey={`adm-stage-empty-${stage}`}>
                        <EmptyState
                          variant="compact"
                          tone="neutral"
                          icon={<ClipboardList size={20} />}
                          title={isAr ? 'لا توجد طلبات' : isEn ? 'No leads in this stage' : 'Aucun dossier'}
                          description={
                            isAr
                              ? 'لا يوجد مرشحون في هذه المرحلة حالياً.'
                              : isEn
                              ? 'No candidates currently in this stage.'
                              : 'Aucun candidat dans cette étape pour le moment.'
                          }
                        />
                      </KineticEmptyStateMotion>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedLeads.length}
        entityPluralLabel={isAr ? 'مترشح' : isEn ? 'prospects' : 'candidats'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setStageFilter('All');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<EduAdmissionLead>
        isOpen={Boolean(activeLead)}
        item={activeLead}
        allItems={sortedLeads}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeLead?.studentName || ''}
        subtitle={activeLead ? `${activeLead.desiredCourseTitle} · ${activeLead.phone}` : ''}
        categoryLabel={activeLead?.source || (isAr ? 'مترشح' : 'Prospect')}
        avatarText={(activeLead?.studentName || 'LD').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeLead ? resolveRecordBranch(activeLead, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeLead ? stages.find((s) => s.id === activeLead.stage)?.title || activeLead.stage : undefined}
        statusClassName={
          activeLead?.stage === 'Enrolled'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : activeLead?.stage === 'Admitted'
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'profile', label: isAr ? 'الملف' : isEn ? 'Profile' : 'Profil' },
          { id: 'pipeline', label: isAr ? 'المسار' : isEn ? 'Pipeline' : 'Parcours' },
          { id: 'notes', label: isAr ? 'ملاحظات' : 'Notes' },
        ]}
        activeTab={inspectorTab}
        onTabChange={(id) => setInspectorTab(id as 'profile' | 'pipeline' | 'notes')}
        onSelectItem={(l) => {
          setSelectedLead(l);
          setInspectorTab('profile');
        }}
        onClose={() => setSelectedLead(null)}
        onDelete={(l) => {
          deleteEduAdmissionLead(l.id);
          setSelectedLead(null);
        }}
        renderBody={(lead, tab) => {
          if (tab === 'pipeline') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={stages.find((s) => s.id === lead.stage)?.title || lead.stage}
                    tone="accent"
                    caption={lead.desiredCourseTitle}
                  />
                </InspectorSection>
                <InspectorSection
                  index={1}
                  title={isAr ? 'تغيير مرحلة القبول' : isEn ? 'Pipeline Stage' : 'Progression Pipeline'}
                >
                  <div className="flex flex-wrap gap-2">
                    {stages.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        data-sq="ctl-sm"
                        data-sq-border="solid"
                        onClick={() => updateAdmissionStage(lead.id, st.id)}
                        className={`px-3 py-2 t-small font-semibold transition-colors cursor-pointer ${
                          lead.stage === st.id
                            ? 'bg-[var(--brand-fill,#C9461F)] text-white [--sq-stroke:#d4522f]'
                            : 'bg-[#F3EDE7] dark:bg-[#262422] text-black/80 dark:text-white/80 hover:[--sq-stroke:rgba(212,82,47,0.5)]'
                        }`}
                      >
                        {st.title}
                      </button>
                    ))}
                  </div>
                </InspectorSection>
                {lead.stage !== 'Enrolled' && (
                  <InspectorSection index={2}>
                    <InspectorWideButton
                      label={t('edu_btn_convert_student')}
                      icon={<UserCheck size={15} />}
                      tone="accent"
                      onClick={() => {
                        setConversionLead(lead);
                        setSelectedLead(null);
                      }}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }

          if (tab === 'notes') {
            return (
              <InspectorSection index={0} title="Notes">
                <InspectorCard>
                  <InspectorKeyValue label="Source" value={lead.source || '—'} mono={false} />
                  <InspectorKeyValue
                    label={isAr ? 'ملاحظات' : 'Remarques'}
                    value={lead.notes || (isAr ? 'لا توجد ملاحظات' : 'Aucune note enregistrée')}
                    mono={false}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    ...(lead.stage !== 'Enrolled'
                      ? [
                          {
                            id: 'convert',
                            label: t('edu_btn_convert_student'),
                            icon: <UserCheck size={16} />,
                            primary: true,
                            onClick: () => {
                              setConversionLead(lead);
                              setSelectedLead(null);
                            },
                          },
                        ]
                      : []),
                    {
                      id: 'advance',
                      label: isAr ? 'المرحلة التالية' : isEn ? 'Move Next' : 'Étape Suivante',
                      icon: <ArrowRight size={16} className="rtl:rotate-180" />,
                      disabled: lead.stage === 'Enrolled',
                      onClick: () => {
                        const nextIdx = stages.findIndex((s) => s.id === lead.stage) + 1;
                        if (nextIdx < stages.length) updateAdmissionStage(lead.id, stages[nextIdx].id);
                      },
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'بيانات المترشح' : isEn ? 'Candidate Info' : 'Coordonnées'}>
                <InspectorCard>
                  <InspectorKeyValue label={t('edu_field_phone')} value={lead.phone} copyText={lead.phone} />
                  {lead.email && (
                    <InspectorKeyValue label={t('edu_field_email')} value={lead.email} mono={false} copyText={lead.email} />
                  )}
                  <InspectorKeyValue
                    label={t('edu_field_guardian_name')}
                    value={lead.guardianName || (isAr ? 'مترشح راشد' : 'Adult / Self')}
                    mono={false}
                  />
                  <InspectorKeyValue label="Source" value={lead.source || '—'} mono={false} isLast={!lead.placementScore} />
                  {lead.placementScore && (
                    <InspectorKeyValue label="Placement Score" value={lead.placementScore} tone="accent" isLast />
                  )}
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticModalShell
        isOpen={Boolean(conversionLead)}
        onClose={() => setConversionLead(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        {retainedConversionLead && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white">
                {t('edu_lead_modal_title')}
              </h2>
              <button
                type="button"
                onClick={() => setConversionLead(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="pt-4 space-y-4 t-cap">
              <p className="text-black/70 dark:text-white/75">
                You are about to register{' '}
                <strong className="text-black dark:text-white">{retainedConversionLead.studentName}</strong> into the
                student CRM and create an active enrollment record.
              </p>
              <LabelSelect
                field="StartingCohort"
                label={t('edu_label_cohort')}
                value={targetCohortId}
                onChange={setTargetCohortId}
                options={eduCohorts.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.enrolledCount}/${c.maxStudents}) — ${c.tuitionFee.toLocaleString()} DZD`,
                }))}
                placeholder="Select Starting Cohort..."
                width="100%"
                height={40}
                corner={12}
              />
              {(() => {
                const chosen = eduCohorts.find((c) => c.id === targetCohortId);
                if (!chosen) return null;
                const cap = checkCohortCapacity(chosen, false);
                if (cap.allowed) return null;
                return (
                  <div
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-3 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between gap-3"
                  >
                    <div className="t-cap text-amber-800 dark:text-amber-300 font-medium">
                      {isAr
                        ? `الفوج مكتمل (${chosen.enrolledCount}/${chosen.maxStudents}). تسجيل في قائمة الانتظار؟`
                        : isEn
                        ? `Cohort full (${chosen.enrolledCount}/${chosen.maxStudents}). Enqueue on waitlist?`
                        : `Cohorte complète (${chosen.enrolledCount}/${chosen.maxStudents}). Mettre en liste d’attente ?`}
                    </div>
                    <LiveSwitch
                      checked={allowWaitlistConversion}
                      onCheckedChange={setAllowWaitlistConversion}
                      aria-label="Allow Waitlist"
                    />
                  </div>
                );
              })()}
              <LabelInput
                field="InitialDeposit"
                label="Acompte Initial Reçu (DZD)"
                type="number"
                min="0"
                step="1000"
                value={conversionDeposit === 0 ? '' : conversionDeposit}
                placeholder="0 DZD (Optionnel - Règlement à l'inscription)"
                onChange={(val) => setConversionDeposit(Math.max(0, Number(val) || 0))}
                width="100%"
                height={40}
                corner={12}
              />
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--atr-divider)]">
                <Button
                  type="button"
                  tone="soft"
                  size={40}
                  onClick={() => setConversionLead(null)}
                >
                  {t('common_cancel')}
                </Button>
                <Button
                  type="button"
                  tone="accent"
                  size={40}
                  onClick={handleConfirmConversion}
                >
                  {t('edu_btn_convert_student')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </KineticModalShell>

      <KineticModalShell
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 max-h-[92vh] overflow-y-auto"
        >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white">
                {t('edu_btn_new_lead')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-4 pt-4 t-cap">
              <div>
                <LabelInput
                  field="studentName"
                  label={t('edu_field_fullname')}
                  required
                  placeholder="e.g. Yacine Benali"
                  value={formData.studentName}
                  onChange={(val) => setFormData({ ...formData, studentName: val })}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="phone"
                    label={t('edu_field_phone')}
                    type="tel"
                    required
                    placeholder="0550 00 00 00"
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelInput
                    field="email"
                    label={t('edu_field_email')}
                    type="email"
                    placeholder="yacine@example.com"
                    value={formData.email}
                    onChange={(val) => setFormData({ ...formData, email: val })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
              </div>
              <LabelSelect
                field="DesiredCourse"
                label={t('edu_field_course_title')}
                value={formData.desiredCourseId}
                onChange={(val) => setFormData({ ...formData, desiredCourseId: val })}
                options={eduCourses.map((co) => ({
                  value: co.id,
                  label: `${co.title} (${co.category})`,
                }))}
                width="100%"
                height={40}
                corner={12}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="guardianName"
                    label={t('edu_field_guardian_name')}
                    placeholder="Parent / Sponsor"
                    value={formData.guardianName}
                    onChange={(val) => setFormData({ ...formData, guardianName: val })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelInput
                    field="source"
                    label={t('member_field_acquisition')}
                    placeholder="e.g. Instagram, Referral, Walk-in"
                    value={formData.source}
                    onChange={(val) => setFormData({ ...formData, source: val })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--atr-divider)]">
                <Button
                  type="button"
                  tone="soft"
                  size={40}
                  onClick={() => setIsAddLeadModalOpen(false)}
                >
                  {t('common_cancel')}
                </Button>
                <Button
                  type="submit"
                  tone="accent"
                  size={40}
                >
                  {t('edu_btn_new_lead')}
                </Button>
              </div>
            </form>
            </div>
      </KineticModalShell>
    </div>
  );
};

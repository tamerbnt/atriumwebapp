import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Kanban,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  X,
  FileCheck,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  useDashboardShellState,
  shallowEqualObjects,
  selectCurrentFreelanceProjectsFromState,
  selectCurrentFreelanceClientsFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import {
  FreelanceProject,
  FreelanceDeliverable,
  DeliverableStage,
  PricingModel,
  CurrencyCode,
} from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
import { FilterSelect } from '../../ui/FilterSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { useTranslation } from '../../../utils/useTranslation';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import { TranslationKey } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKanbanPipeline } from '../../ui/skeleton/StructuralSkeletons';
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
  InspectorProgressBar,
  InspectorBigStat,
  InspectorNotesField,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  KineticModalShell,
  useRetainedModalValue,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

interface FlatDeliverableItem {
  id: string;
  title: string;
  description?: string;
  stage: DeliverableStage;
  estimatedHours: number;
  loggedHours: number;
  dueDate: string;
  isCompleted: boolean;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  currency: CurrencyCode;
  hourlyRate?: number;
  project: FreelanceProject;
  deliverable: FreelanceDeliverable;
}

const STAGE_KEYS: Record<string, TranslationKey> = {
  Briefing: 'free_deliv_stage_briefing',
  InProgress: 'free_deliv_stage_in_progress',
  ClientReview: 'free_deliv_stage_review',
  Approved: 'free_deliv_stage_delivered',
  Billed: 'free_kanban_invoiced',
};

const STAGES: Array<{ id: DeliverableStage; countColor: string }> = [
  { id: 'Briefing', countColor: 'text-black/55 dark:text-white/55' },
  { id: 'InProgress', countColor: 'text-amber-500' },
  { id: 'ClientReview', countColor: 'text-blue-500' },
  { id: 'Approved', countColor: 'text-emerald-500' },
  { id: 'Billed', countColor: 'text-black/55 dark:text-white/55' },
];

export const FreelanceDeliverablesView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    freelanceProjects,
    freelanceClients,
    branches,
    currentBranch,
  } = useAtriumSelector(
    (s) => ({
      freelanceProjects: selectCurrentFreelanceProjectsFromState(s),
      freelanceClients: selectCurrentFreelanceClientsFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
    }),
    shallowEqualObjects
  );
  const { isSyncing, networkMode, isSyncTimeout, lastSyncedAt, retryCloudSync } =
    useDashboardShellState();
  const {
    updateDeliverableStage,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    addFreelanceProject,
    deleteFreelanceProject,
    startTimer,
    setScreen,
  } = useAtriumActions();

  const [viewLayout, setViewLayout] = useState<'kanban' | 'collection'>('kanban');
  const [collectionViewMode, setCollectionViewMode] = useState<'list' | 'grid'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedDeliverableItem, setSelectedDeliverableItem] =
    useState<FlatDeliverableItem | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('details');

  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [pinnedDeliverableIds, setPinnedDeliverableIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [deliverableSortBy, setDeliverableSortBy] = useState<string>('title');
  const [deliverableSortDir, setDeliverableSortDir] = useState<'asc' | 'desc'>('asc');

  const [isAddDeliverableModalOpen, setIsAddDeliverableModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [deliverableToEdit, setDeliverableToEdit] = useState<{
    project: FreelanceProject;
    deliverable: FreelanceDeliverable;
  } | null>(null);
  const [editDeliverableForm, setEditDeliverableForm] = useState({
    title: '',
    description: '',
    estimatedHours: 10,
    dueDate: '',
  });
  const [deliverableToDelete, setDeliverableToDelete] = useState<{
    projectId: string;
    deliverableId: string;
    title: string;
  } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<FreelanceProject | null>(null);

  const [targetProjectId, setTargetProjectId] = useState(freelanceProjects[0]?.id || '');
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDescription, setDeliverableDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(10);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 604800000).toISOString().split('T')[0]
  );

  const [newProjectData, setNewProjectData] = useState({
    clientId: freelanceClients[0]?.id || '',
    title: '',
    description: '',
    pricingModel: 'Fixed' as PricingModel,
    currency: 'DZD' as CurrencyCode,
    budget: 150000,
    estimatedHours: 40,
    deadline: new Date(Date.now() + 2592000000).toISOString().split('T')[0],
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    freelanceProjects.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + p.deliverables.length);
    });
    return map;
  }, [freelanceProjects, branchesById, currentBranch, language]);

  const activeProjects = useMemo(() => {
    return freelanceProjects.filter((p) => {
      if (selectedProjectId !== 'all' && p.id !== selectedProjectId) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      return true;
    });
  }, [freelanceProjects, selectedProjectId, branchFilter, branchesById, currentBranch, language]);

  const flatDeliverablesList = useMemo<FlatDeliverableItem[]>(() => {
    const list: FlatDeliverableItem[] = [];
    const q = searchQuery.trim().toLowerCase();
    activeProjects.forEach((project) => {
      project.deliverables.forEach((deliv) => {
        if (stageFilter !== 'all' && deliv.stage !== stageFilter) return;
        const matchesQuery =
          !q ||
          deliv.title.toLowerCase().includes(q) ||
          (deliv.description && deliv.description.toLowerCase().includes(q)) ||
          project.title.toLowerCase().includes(q) ||
          project.clientName.toLowerCase().includes(q);
        if (matchesQuery) {
          list.push({
            id: deliv.id,
            title: deliv.title,
            description: deliv.description,
            stage: deliv.stage,
            estimatedHours: deliv.estimatedHours,
            loggedHours: deliv.loggedHours,
            dueDate: deliv.dueDate,
            isCompleted: deliv.isCompleted,
            projectId: project.id,
            projectTitle: project.title,
            clientId: project.clientId,
            clientName: project.clientName,
            currency: project.currency,
            hourlyRate: project.hourlyRate,
            project,
            deliverable: deliv,
          });
        }
      });
    });
    return list;
  }, [activeProjects, stageFilter, searchQuery]);

  const sortedDeliverables = useMemo(() => {
    return [...flatDeliverablesList].sort((a, b) => {
      const aPinned = pinnedDeliverableIds.has(a.id);
      const bPinned = pinnedDeliverableIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (deliverableSortBy === 'title') {
        const cmp = a.title.localeCompare(b.title);
        return deliverableSortDir === 'asc' ? cmp : -cmp;
      }
      if (deliverableSortBy === 'branch') {
        const cmp = resolveRecordBranch(
          a.project,
          branchesById,
          currentBranch,
          language
        ).name.localeCompare(
          resolveRecordBranch(b.project, branchesById, currentBranch, language).name
        );
        return deliverableSortDir === 'asc' ? cmp : -cmp;
      }
      if (deliverableSortBy === 'project') {
        const cmp = a.projectTitle.localeCompare(b.projectTitle);
        return deliverableSortDir === 'asc' ? cmp : -cmp;
      }
      if (deliverableSortBy === 'stage') {
        const cmp = a.stage.localeCompare(b.stage);
        return deliverableSortDir === 'asc' ? cmp : -cmp;
      }
      if (deliverableSortBy === 'dueDate') {
        const cmp = a.dueDate.localeCompare(b.dueDate);
        return deliverableSortDir === 'asc' ? cmp : -cmp;
      }
      if (deliverableSortBy === 'hours') {
        return deliverableSortDir === 'asc'
          ? a.loggedHours - b.loggedHours
          : b.loggedHours - a.loggedHours;
      }
      return 0;
    });
  }, [
    flatDeliverablesList,
    pinnedDeliverableIds,
    deliverableSortBy,
    deliverableSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const activeInspectorItem = useMemo(() => {
    if (!selectedDeliverableItem) return null;
    return (
      flatDeliverablesList.find((item) => item.id === selectedDeliverableItem.id) ||
      selectedDeliverableItem
    );
  }, [selectedDeliverableItem, flatDeliverablesList]);

  const handleCreateDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    const projectTarget = targetProjectId || freelanceProjects[0]?.id;
    if (!deliverableTitle.trim() || !projectTarget) return;
    addDeliverable(
      projectTarget,
      deliverableTitle,
      Number(estimatedHours),
      dueDate,
      deliverableDescription
    );
    setDeliverableTitle('');
    setDeliverableDescription('');
    setIsAddDeliverableModalOpen(false);
  };

  const handleEditDeliverableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverableToEdit || !editDeliverableForm.title.trim()) return;
    updateDeliverable(deliverableToEdit.project.id, deliverableToEdit.deliverable.id, {
      title: editDeliverableForm.title,
      description: editDeliverableForm.description,
      estimatedHours: Number(editDeliverableForm.estimatedHours),
      dueDate: editDeliverableForm.dueDate,
    });
    setDeliverableToEdit(null);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.title.trim() || !newProjectData.clientId) return;
    const client = freelanceClients.find((c) => c.id === newProjectData.clientId);
    addFreelanceProject({
      clientId: newProjectData.clientId,
      clientName: client?.name || 'Client',
      title: newProjectData.title,
      description: newProjectData.description,
      pricingModel: newProjectData.pricingModel,
      currency: newProjectData.currency,
      budget: Number(newProjectData.budget),
      estimatedHours: Number(newProjectData.estimatedHours),
      stage: 'InProgress',
      startDate: new Date().toISOString().split('T')[0],
      deadline: newProjectData.deadline,
      deliverables: [],
    });
    setNewProjectData((prev) => ({ ...prev, title: '', description: '' }));
    setIsAddProjectModalOpen(false);
  };

  const handleStartTimerForDeliverable = useCallback(
    (project: FreelanceProject, deliv: FreelanceDeliverable) => {
      startTimer(
        project.clientId,
        project.clientName,
        project.id,
        project.title,
        `${deliv.title} - Working sprint`,
        deliv.id,
        deliv.title,
        true,
        false
      );
      showToast({
        type: 'success',
        title: t('free_timer_start', language),
        message: deliv.title,
        category: 'freelance_solo',
      });
    },
    [startTimer, t, language]
  );

  const getDeliverableRowMeta = useCallback(
    (item: FlatDeliverableItem): KineticRowMeta => {
      const isCreep = item.loggedHours > item.estimatedHours;
      const branchInfo = resolveRecordBranch(item.project, branchesById, currentBranch, language);
      return {
        avatarText: item.title.slice(0, 2).toUpperCase(),
        subline: `${item.projectTitle} · ${item.clientName}`,
        categoryLabel: item.projectTitle,
        statusVariant: isCreep
          ? 'blocked'
          : item.stage === 'Approved'
          ? 'active'
          : item.stage === 'InProgress'
          ? 'warning'
          : 'info',
        statusLabel: t(STAGE_KEYS[item.stage], language),
        metricPrimary: `${item.loggedHours}h / ${item.estimatedHours}h`,
        metricSecondary: item.dueDate,
        detailCol1: {
          heading: isAr ? 'المشروع والعميل' : isFr ? 'Projet & Client' : 'Project & Client',
          primaryText: item.projectTitle,
          secondaryText: item.clientName,
        },
        detailCol2: {
          heading: isAr ? 'الساعات والتسليم' : isFr ? 'Heures & Échéance' : 'Hours & Due Date',
          primaryText: `${item.loggedHours}h / ${item.estimatedHours}h`,
          secondaryText: `${isAr ? 'الاستحقاق' : isFr ? 'Échéance' : 'Due'}: ${item.dueDate}`,
        },
        detailCol3: {
          heading: isAr ? 'الفرع والمرحلة' : isFr ? 'Branche & Étape' : 'Branch & Stage',
          primaryText: branchInfo.name,
          secondaryText: isCreep
            ? isAr
              ? 'تجاوز الساعات'
              : isFr
              ? 'Dépassement'
              : 'Over estimate'
            : item.currency,
        },
      };
    },
    [branchesById, currentBranch, language, t, isAr, isFr]
  );

  const getDeliverableFanActions = useCallback(
    (item: FlatDeliverableItem): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isFr ? 'Détails' : 'Details',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedDeliverableItem(item);
          setInspectorTab('details');
        },
      },
      {
        id: 'timer',
        label: t('free_timer_start', language),
        icon: <Play className="w-[15px] h-[15px]" />,
        onClick: () => handleStartTimerForDeliverable(item.project, item.deliverable),
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () =>
          setDeliverableToDelete({
            projectId: item.projectId,
            deliverableId: item.id,
            title: item.title,
          }),
      },
    ],
    [isAr, isFr, language, t, handleStartTimerForDeliverable]
  );

  const getDeliverableDetailActions = useCallback(
    (item: FlatDeliverableItem): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isFr ? 'Ouvrir' : 'Open',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedDeliverableItem(item);
          setInspectorTab('details');
        },
      },
      {
        id: 'timer',
        label: t('free_timer_start', language),
        icon: <Play className="w-3.5 h-3.5" />,
        onClick: () => handleStartTimerForDeliverable(item.project, item.deliverable),
      },
      {
        id: 'edit',
        label: t('free_deliv_edit', language),
        icon: <Edit2 className="w-3.5 h-3.5" />,
        onClick: () => {
          setDeliverableToEdit({ project: item.project, deliverable: item.deliverable });
          setEditDeliverableForm({
            title: item.title,
            description: item.description || '',
            estimatedHours: item.estimatedHours,
            dueDate: item.dueDate,
          });
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () =>
          setDeliverableToDelete({
            projectId: item.projectId,
            deliverableId: item.id,
            title: item.title,
          }),
      },
    ],
    [isAr, isFr, language, t, handleStartTimerForDeliverable]
  );

  const deliverableColumns: ColumnDefinition<FlatDeliverableItem>[] = useMemo(
    () => [
      {
        key: 'title',
        header: isAr ? 'المهمة والمشروع' : isFr ? 'Livrable & Projet' : 'Deliverable & Project',
        width: '2.4*',
        minWidth: '210px',
        sortable: true,
        renderCell: (item) => (
          <div className="flex items-center gap-3">
            <div
              data-sq="tile"
              data-sq-border="none"
              className={`w-9 h-9 flex items-center justify-center font-semibold t-small shrink-0 ${
                item.isCompleted
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-[#F5F1EC] dark:bg-[#2B2825] text-black dark:text-white'
              }`}
            >
              {item.isCompleted ? <CheckCircle2 size={16} /> : <FileCheck size={16} />}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-colors">
                {item.title}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 truncate flex items-center gap-2">
                <span>{item.projectTitle}</span>
                <span>·</span>
                <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-medium">{item.clientName}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '125px',
        sortable: true,
        renderCell: (item) => {
          const bInfo = resolveRecordBranch(item.project, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-medium bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'stage',
        header: t('free_deliv_field_stage', language) || 'Stage',
        width: '1.6*',
        minWidth: '130px',
        sortable: true,
        renderCell: (item) => (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold ${
              item.stage === 'Approved'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : item.stage === 'InProgress'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                : item.stage === 'ClientReview'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                : 'bg-[#EFE9E2] dark:bg-[#2B2825] text-black/70 dark:text-white/75'
            }`}
          >
            {t(STAGE_KEYS[item.stage], language)}
          </span>
        ),
      },
      {
        key: 'hours',
        header: isAr ? 'ساعات الإنجاز' : isFr ? 'Heures Réalisées' : 'Hours Logged',
        width: '1.8*',
        minWidth: '140px',
        sortable: true,
        renderCell: (item) => {
          const isCreep = item.loggedHours > item.estimatedHours;
          const pct = Math.min(100, Math.round((item.loggedHours / (item.estimatedHours || 1)) * 100));
          return (
            <div className="space-y-1 min-w-[115px]">
              <div className="flex items-center justify-between t-cap">
                <span
                  className={`font-semibold tabular-nums ${
                    isCreep ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-black dark:text-white'
                  }`}
                >
                  {item.loggedHours}h / {item.estimatedHours}h
                </span>
                <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                  {pct}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isCreep ? 'bg-rose-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-[#d4522f]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'dueDate',
        header: isAr ? 'تاريخ التسليم' : isFr ? 'Échéance' : 'Due Date',
        width: '1.4*',
        minWidth: '115px',
        sortable: true,
        renderCell: (item) => (
          <div className="flex items-center gap-2 t-cap text-black/70 dark:text-white/75">
            <Calendar size={12} className="text-black/55 dark:text-white/55" />
            <span>{item.dueDate}</span>
          </div>
        ),
      },
    ],
    [language, t, branchesById, currentBranch, isAr, isFr]
  );

  const handleExportCSV = useCallback(() => {
    if (sortedDeliverables.length === 0) return;
    const headers = [
      isAr ? 'معرف المهمة' : 'Deliverable ID',
      isAr ? 'عنوان المهمة' : 'Deliverable Title',
      isAr ? 'المشروع' : 'Project',
      isAr ? 'العميل' : 'Client',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'المرحلة' : 'Stage',
      isAr ? 'الساعات المقدرة' : 'Estimated Hours',
      isAr ? 'الساعات المسجلة' : 'Logged Hours',
      isAr ? 'تاريخ الاستحقاق' : 'Due Date',
      isAr ? 'مكتمل' : 'Completed',
    ];
    const rows = sortedDeliverables.map((item) => [
      item.id,
      item.title,
      item.projectTitle,
      item.clientName,
      resolveRecordBranch(item.project, branchesById, currentBranch, language).name,
      item.stage,
      item.estimatedHours,
      item.loggedHours,
      item.dueDate,
      item.isCompleted ? 'Oui' : 'Non',
    ]);
    downloadCsvSafe(
      `atrium_freelance_deliverables_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [sortedDeliverables, branchesById, currentBranch, language, isAr, isFr]);

  const handleBatchSetStage = (newStage: DeliverableStage) => {
    if (selectedDeliverableIds.size === 0) return;
    const targets = flatDeliverablesList.filter((item) => selectedDeliverableIds.has(item.id));
    if (targets.length === 0) return;
    runUndoBatch(
      {
        vertical: 'freelance_solo',
        operationType: 'bulk',
        affectedCount: targets.length,
        summary: isAr
          ? `تحديث المهام (${targets.length})`
          : isFr
          ? `Mise à jour livrables (${targets.length})`
          : `Move deliverables (${targets.length})`,
      },
      () => {
        targets.forEach((item) => {
          updateDeliverableStage(item.projectId, item.id, newStage);
        });
      }
    );
    setSelectedDeliverableIds(new Set());
  };

  const handleBatchDeleteDeliverables = () => {
    if (selectedDeliverableIds.size === 0) return;
    const targets = flatDeliverablesList.filter((item) => selectedDeliverableIds.has(item.id));
    if (targets.length === 0) return;
    runUndoBatch(
      {
        vertical: 'freelance_solo',
        operationType: 'bulk',
        affectedCount: targets.length,
        summary: isAr
          ? `حذف المهام (${targets.length})`
          : isFr
          ? `Suppression livrables (${targets.length})`
          : `Delete deliverables (${targets.length})`,
      },
      () => {
        targets.forEach((item) => {
          deleteDeliverable(item.projectId, item.id);
        });
      }
    );
    setSelectedDeliverableIds(new Set());
  };

  const totalScopeCreepItems = flatDeliverablesList.filter(
    (item) => item.loggedHours > item.estimatedHours
  ).length;
  const totalLoggedHours = flatDeliverablesList.reduce(
    (acc, item) => acc + (item.loggedHours || 0),
    0
  );
  const totalEstimatedHours = flatDeliverablesList.reduce(
    (acc, item) => acc + (item.estimatedHours || 0),
    0
  );
  const inProgressCount = flatDeliverablesList.filter(
    (item) => item.stage === 'InProgress'
  ).length;
  const reviewCount = flatDeliverablesList.filter(
    (item) => item.stage === 'ClientReview'
  ).length;
  const hoursPct =
    totalEstimatedHours > 0 ? Math.round((totalLoggedHours / totalEstimatedHours) * 100) : 0;

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('common_all', language) },
      { value: 'InProgress', label: t('free_deliv_stage_in_progress', language) },
      { value: 'ClientReview', label: t('free_deliv_stage_review', language) },
      { value: 'Approved', label: t('free_deliv_stage_delivered', language) },
    ],
    [t, language]
  );

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      {
        value: 'All',
        label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
        count: freelanceProjects.reduce((acc, p) => acc + p.deliverables.length, 0),
      },
      ...Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    ];

    const projectOpts = [
      {
        value: 'all',
        label: t('free_deliv_all_projects', language),
        count: freelanceProjects.reduce((acc, p) => acc + p.deliverables.length, 0),
      },
      ...freelanceProjects.map((p) => ({
        value: p.id,
        label: compactFilterLabel(p.title, p.clientName).label,
        sublabel: p.clientName,
        count: p.deliverables.length,
        tooltip: `${p.title} · ${p.clientName}`,
      })),
    ];

    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الموقع' : isFr ? 'Branche' : 'Branch',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'project',
        label: t('free_deliv_field_project', language),
        value: selectedProjectId,
        onChange: setSelectedProjectId,
        resetValue: 'all',
        kind: 'tiles',
        columns: 2,
        options: projectOpts,
      },
      {
        id: 'stage',
        label: t('free_deliv_field_stage', language),
        value: stageFilter,
        onChange: setStageFilter,
        resetValue: 'all',
        kind: 'segmented',
        options: statusOptions.map((o) => ({ value: o.value, label: String(o.label) })),
      },
    ];
  }, [
    isAr,
    isFr,
    freelanceProjects,
    branchCounts,
    branchFilter,
    selectedProjectId,
    stageFilter,
    statusOptions,
    t,
    language,
  ]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (selectedProjectId !== 'all') {
      const p = freelanceProjects.find((pr) => pr.id === selectedProjectId);
      chips.push({
        key: 'project',
        label: p ? p.title : selectedProjectId,
        onRemove: () => setSelectedProjectId('all'),
      });
    }
    if (stageFilter !== 'all') {
      chips.push({
        key: 'stage',
        label: t(STAGE_KEYS[stageFilter] || 'common_all', language),
        onRemove: () => setStageFilter('all'),
      });
    }
    return chips;
  }, [branchFilter, selectedProjectId, stageFilter, freelanceProjects, isAr, isFr, t, language]);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (selectedProjectId !== 'all' ? 1 : 0) +
    (stageFilter !== 'all' ? 1 : 0);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: freelanceProjects.length > 0,
  });

  const retainedDeliverableToEdit = useRetainedModalValue(deliverableToEdit);
  const retainedDeliverableToDelete = useRetainedModalValue(deliverableToDelete);
  const retainedProjectToDelete = useRetainedModalValue(projectToDelete);

  if (showSkeleton && (freelanceProjects.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonKanbanPipeline
        columnsCount={4}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Kanban size={22} />}
        title={t('free_deliv_title', language)}
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            <AtriumButton
              type="button"
              variant="secondary"
              size="md"
              icon={<Clock size={15} />}
              onClick={() => setScreen('analytics')}
            >
              {isAr ? 'الميقاتي' : isFr ? 'Minuteur' : 'Timer'}
            </AtriumButton>
            <AtriumButton
              type="button"
              variant="secondary"
              size="md"
              icon={<Layers size={15} />}
              onClick={() => setIsAddProjectModalOpen(true)}
            >
              {t('free_deliv_field_project', language)}
            </AtriumButton>
          </div>
        }
        primaryAction={{
          label: t('free_deliv_btn_new', language),
          onClick: () => setIsAddDeliverableModalOpen(true),
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-deliverable',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات إنجاز المشاريع والمهام'
            : isFr
            ? 'Indicateurs des Livrables & Projets'
            : 'Deliverables & Production Performance'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'قيد الإنجاز'
            : isFr
            ? 'En cours'
            : 'In Progress',
          badgeText: `${inProgressCount + reviewCount} ${isAr ? 'نشطة' : 'active'}`,
          count: inProgressCount,
          tone: 'emerald',
          isActive: stageFilter === 'InProgress',
          onToggle: () =>
            setStageFilter((prev) => (prev === 'InProgress' ? 'all' : 'InProgress')),
        }}
        secondaryCard={{
          label: isAr ? 'ساعات الإنتاج المسجلة' : isFr ? 'Heures Déployées' : 'Hours Logged',
          badgeText: `/ ${totalEstimatedHours}h est. (${hoursPct}%)`,
          count: totalLoggedHours,
          tone: 'terracotta',
          isActive: stageFilter === 'ClientReview',
          onToggle: () =>
            setStageFilter((prev) => (prev === 'ClientReview' ? 'all' : 'ClientReview')),
        }}
        darkCard={{
          label: isAr
            ? 'تجاوزات النطاق والميزانية'
            : isFr
            ? 'Dépassement & Dérive Scope'
            : 'Scope Creep & Overruns',
          badgeCount: totalScopeCreepItems,
          badgePrefix: '',
          badgeSuffix: isAr ? 'تنبيهات' : 'alerts',
          valueCount: totalScopeCreepItems,
          valuePrefix: '',
          valueSuffix: isAr ? ' مهام' : isFr ? ' tâches' : ' over',
          caption:
            totalScopeCreepItems > 0
              ? isAr
                ? 'يتطلب إعادة فوترة أو تسوية'
                : isFr
                ? 'Facturation additionnelle requise'
                : 'Additional billing review needed'
              : isAr
              ? 'كافة الساعات ضمن الميزانيات'
              : isFr
              ? 'Toutes les heures respectent le devis'
              : 'All logged hours within estimates',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('free_deliv_title', language)}
          liveRegionText={`${sortedDeliverables.length} ${isAr ? 'مهام' : 'deliverables'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('free_search_deliverables_ph', language)}
          statusOptions={statusOptions}
          statusValue={stageFilter}
          onStatusChange={setStageFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          showViewToggle={viewLayout === 'collection'}
          viewMode={collectionViewMode}
          onViewModeChange={(m) => setCollectionViewMode(m === 'grid' ? 'grid' : 'list')}
          extraTrailingControls={
            <div className="flex items-center gap-2">
              <LiveSegmentedControl
                size="md"
                value={viewLayout}
                onValueChange={(val) => setViewLayout(val as 'kanban' | 'collection')}
                aria-label="Deliverable layout"
                options={[
                  { value: 'kanban', label: isAr ? 'كانبان' : 'Kanban' },
                  { value: 'collection', label: isAr ? 'قائمة' : isFr ? 'Liste' : 'List' },
                ]}
              />
              {selectedProjectId !== 'all' && (
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="ctl"
                  data-sq-border="none"
                  onClick={() => {
                    const targetProj = freelanceProjects.find((p) => p.id === selectedProjectId);
                    if (targetProj) setProjectToDelete(targetProj);
                  }}
                  className="h-10 px-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 t-small font-semibold flex items-center gap-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer shrink-0"
                  title={t('common_delete', language)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          }
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setSelectedProjectId('all');
            setStageFilter('all');
            setSearchQuery('');
          }}
        />

        {selectedDeliverableIds.size > 0 && (
          <div
            data-sq="card"
            data-sq-border="none"
            className="flex items-center justify-between p-3 px-4 bg-[#FCEEE8] dark:bg-[#2B2825] animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
              <span className="t-small font-semibold text-black dark:text-white">
                {selectedDeliverableIds.size}{' '}
                {isAr
                  ? 'مهام محددة'
                  : isFr
                  ? 'livrables sélectionnés'
                  : 'deliverables selected'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedDeliverableIds(new Set())}
                className="px-3 py-2 t-small text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
              >
                {isAr ? 'إلغاء التحديد' : isFr ? 'Désélectionner' : 'Deselect'}
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={() => handleBatchSetStage('InProgress')}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Clock size={12} />
                <span>{t('free_deliv_stage_in_progress', language)}</span>
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={() => handleBatchSetStage('ClientReview')}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Layers size={12} />
                <span>{t('free_deliv_stage_review', language)}</span>
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={() => handleBatchSetStage('Approved')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle size={12} />
                <span>{t('free_deliv_stage_delivered', language)}</span>
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={handleBatchDeleteDeliverables}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>{isAr ? 'حذف المحدد' : isFr ? 'Supprimer' : 'Delete'}</span>
              </button>
            </div>
          </div>
        )}

        {freelanceProjects.length === 0 ? (
          <KineticEmptyStateMotion motionKey="free-deliv-empty">
            <EmptyState
              variant="island"
              icon={<Kanban />}
              title={t('free_deliv_empty_column', language)}
              description={t('free_deliv_modal_add_desc', language)}
              primaryAction={{
                label: t('free_deliv_field_project', language),
                icon: <Plus />,
                onClick: () => setIsAddProjectModalOpen(true),
              }}
              width={500}
            />
          </KineticEmptyStateMotion>
        ) : viewLayout === 'collection' ? (
          <UniversalDataCollection<FlatDeliverableItem>
            hideToolbar
            items={sortedDeliverables}
            keyExtractor={(item) => item.id}
            viewMode={collectionViewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={collectionViewMode === 'grid' ? 'grid' : 'list'}
            columns={deliverableColumns}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            sortBy={deliverableSortBy}
            sortDirection={deliverableSortDir}
            onSortChange={(key, dir) => {
              setDeliverableSortBy(key);
              setDeliverableSortDir(dir);
            }}
            openItemId={activeInspectorItem?.id ?? null}
            onItemClick={(item, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedDeliverableItem(item);
              setInspectorTab('details');
            }}
            onViewDetails={(item, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedDeliverableItem(item);
              setInspectorTab('details');
            }}
            getRowMeta={getDeliverableRowMeta}
            getFanActions={getDeliverableFanActions}
            getDetailActions={getDeliverableDetailActions}
            onEdit={(item) => {
              setDeliverableToEdit({ project: item.project, deliverable: item.deliverable });
              setEditDeliverableForm({
                title: item.title,
                description: item.description || '',
                estimatedHours: item.estimatedHours,
                dueDate: item.dueDate,
              });
            }}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              const target = flatDeliverablesList.find((x) => x.id === id);
              setPinnedDeliverableIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                  next.delete(id);
                  if (target) {
                    showToast({ type: 'info', title: 'Unpinned', message: `${target.title} unpinned` });
                  }
                } else {
                  next.add(id);
                  if (target) {
                    showToast({ type: 'info', title: 'Pinned', message: `${target.title} pinned` });
                  }
                }
                return next;
              });
            }}
            onDelete={(item) =>
              setDeliverableToDelete({
                projectId: item.projectId,
                deliverableId: item.id,
                title: item.title,
              })
            }
            customActions={(item) => [
              {
                id: 'timer',
                tooltip: t('free_timer_start', language),
                icon: <Play size={13} />,
                iconColor: '#d4522f',
                onClick: () => handleStartTimerForDeliverable(item.project, item.deliverable),
              },
            ]}
            pinnedIds={pinnedDeliverableIds}
            selectedIds={selectedDeliverableIds}
            onSelectionChange={setSelectedDeliverableIds}
            emptyTitle={t('free_deliv_empty_column', language)}
            emptyDescription={t('free_deliv_modal_add_desc', language)}
            primaryActionLabel={t('free_deliv_btn_new', language)}
            onAddFirstItem={() => setIsAddDeliverableModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {STAGES.map((stage) => {
              const itemsInStage = sortedDeliverables.filter((item) => item.stage === stage.id);
              return (
                <div
                  key={stage.id}
                  data-sq="card"
                  data-sq-border="none"
                  className="bg-[#F3EDE7]/70 dark:bg-[#191716] p-3 min-h-[480px] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--atr-divider)]">
                    <span className="t-small font-semibold text-black dark:text-white">
                      {t(STAGE_KEYS[stage.id], language)}
                    </span>
                    <span className={`t-small font-semibold tabular-nums ${stage.countColor}`}>
                      {itemsInStage.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {itemsInStage.map((item) => {
                      const isCreep = item.loggedHours > item.estimatedHours;
                      const ratioPercent = Math.round(
                        (item.loggedHours / (item.estimatedHours || 1)) * 100
                      );
                      return (
                        <div key={item.id} className="sq-elev-card sq-elev-card-hover">
                          <div
                            data-sq="ctl"
                            data-sq-border="solid"
                            className="p-4 bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] transition-colors flex flex-col justify-between gap-2 group"
                          >
                          <div>
                            <div className="flex items-center justify-between t-cap text-black/55 dark:text-white/55 mb-1 gap-1">
                              <span className="truncate font-medium text-black/65 dark:text-white/75">
                                {item.projectTitle}
                              </span>
                              <span className="shrink-0 truncate max-w-[90px]">
                                {item.clientName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                setDrawerOpenerEl(e.currentTarget);
                                setSelectedDeliverableItem(item);
                              }}
                              className="text-left rtl:text-right t-small font-semibold text-black dark:text-white leading-snug hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-colors cursor-pointer"
                            >
                              {item.title}
                            </button>
                            {item.description && (
                              <p className="t-cap text-black/55 dark:text-white/75 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[var(--atr-divider)] space-y-2 t-cap">
                            <div className="flex items-center justify-between">
                              <span className="text-black/55 dark:text-white/55 flex items-center gap-1">
                                <Clock size={11} />
                                {t('free_clients_ph_hours_label', language)}
                              </span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  isCreep
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-black/70 dark:text-white/75'
                                }`}
                              >
                                {item.loggedHours}h / {item.estimatedHours}h ({ratioPercent}%)
                              </span>
                            </div>

                            {isCreep && (
                              <div className="px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 t-small font-semibold flex items-center gap-1">
                                <AlertTriangle size={10} />
                                <span>
                                  {t('free_clients_ph_over_est_label', language)} (+
                                  {(item.loggedHours - item.estimatedHours).toFixed(1)}h)
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-black/55 dark:text-white/55">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {t('free_clients_ph_due_label', language)}
                              </span>
                              <span>{item.dueDate}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-2 border-t border-[var(--atr-divider)]">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                data-no-liquid="true"
                                data-sq="ctl-sm"
                                data-sq-border="none"
                                onClick={() =>
                                  handleStartTimerForDeliverable(item.project, item.deliverable)
                                }
                                className="h-7 px-2 bg-[#F5F1EC] dark:bg-[#2B2825] text-black/70 dark:text-white/75 hover:bg-[#d4522f] hover:text-white t-small font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title={t('free_btn_log_time', language)}
                              >
                                <Play size={10} />
                                <span>{t('free_btn_log_time', language)}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliverableToEdit({
                                    project: item.project,
                                    deliverable: item.deliverable,
                                  });
                                  setEditDeliverableForm({
                                    title: item.title,
                                    description: item.description || '',
                                    estimatedHours: item.estimatedHours,
                                    dueDate: item.dueDate,
                                  });
                                }}
                                className="h-7 w-7 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] flex items-center justify-center transition-colors cursor-pointer"
                                aria-label={t('free_deliv_edit', language)}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeliverableToDelete({
                                    projectId: item.projectId,
                                    deliverableId: item.id,
                                    title: item.title,
                                  })
                                }
                                className="h-7 w-7 rounded-full text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label={t('free_deliv_delete', language)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <FilterSelect
                              value={item.stage}
                              onChange={(val) =>
                                updateDeliverableStage(
                                  item.projectId,
                                  item.id,
                                  val as DeliverableStage
                                )
                              }
                              options={STAGES.map((s) => {
                                const fullLabel = t(STAGE_KEYS[s.id], language);
                                return {
                                  value: s.id,
                                  label: compactFilterLabel(fullLabel).label,
                                  tooltip: fullLabel,
                                };
                              })}
                            />
                          </div>
                          </div>
                        </div>
                      );
                    })}
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
        displayCount={sortedDeliverables.length}
        entityPluralLabel={isAr ? 'مهام' : 'livrables'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setSelectedProjectId('all');
          setStageFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<FlatDeliverableItem>
        isOpen={Boolean(activeInspectorItem)}
        item={activeInspectorItem}
        allItems={sortedDeliverables}
        keyExtractor={(item) => item.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeInspectorItem?.title || ''}
        subtitle={
          activeInspectorItem
            ? `${activeInspectorItem.projectTitle} · ${activeInspectorItem.clientName}`
            : ''
        }
        categoryLabel={activeInspectorItem?.projectTitle || 'Deliverable'}
        avatarText={
          activeInspectorItem ? activeInspectorItem.title.slice(0, 2).toUpperCase() : 'DL'
        }
        avatarColor="#d4522f"
        branchName={
          activeInspectorItem
            ? resolveRecordBranch(activeInspectorItem.project, branchesById, currentBranch, language)
                .name
            : undefined
        }
        statusLabel={
          activeInspectorItem ? t(STAGE_KEYS[activeInspectorItem.stage], language) : undefined
        }
        statusClassName={
          activeInspectorItem?.stage === 'Approved'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : activeInspectorItem && activeInspectorItem.loggedHours > activeInspectorItem.estimatedHours
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
            : activeInspectorItem?.stage === 'InProgress'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]'
        }
        tabs={[
          { id: 'details', label: isAr ? 'التفاصيل' : isFr ? 'Détails' : 'Details' },
          { id: 'hours', label: isAr ? 'الساعات' : isFr ? 'Heures' : 'Hours & Scope' },
          { id: 'stage', label: isAr ? 'المرحلة' : isFr ? 'Étape' : 'Workflow' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(item) => {
          setSelectedDeliverableItem(item);
          setInspectorTab('details');
        }}
        onClose={() => setSelectedDeliverableItem(null)}
        onDelete={(item) =>
          setDeliverableToDelete({
            projectId: item.projectId,
            deliverableId: item.id,
            title: item.title,
          })
        }
        holdToDelete={false}
        renderBody={(item, tab) => {
          const isCreep = item.loggedHours > item.estimatedHours;
          const pct = Math.min(100, Math.round((item.loggedHours / (item.estimatedHours || 1)) * 100));
          if (tab === 'hours') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={`${item.loggedHours}h / ${item.estimatedHours}h`}
                    tone={isCreep ? 'danger' : pct >= 100 ? 'ok' : 'accent'}
                    caption={`${pct}% ${isAr ? 'مستنفد من الميزانية' : isFr ? 'du budget horaire' : 'of estimated budget'}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'مؤشر الإنجاز' : isFr ? 'Progression' : 'Hours Progress'}>
                  <InspectorCard>
                    <InspectorProgressBar
                      percent={pct}
                      tone={isCreep ? 'danger' : pct >= 100 ? 'ok' : 'accent'}
                      animateKey={item.id}
                    />
                    <div className="mt-3">
                      <InspectorKeyValue
                        label={t('free_deliv_field_est_hours', language)}
                        value={`${item.estimatedHours}h`}
                        mono
                      />
                      <InspectorKeyValue
                        label={t('free_dash_logged_label', language)}
                        value={`${item.loggedHours}h`}
                        mono
                        tone={isCreep ? 'danger' : 'default'}
                        isLast
                      />
                    </div>
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }
          if (tab === 'stage') {
            return (
              <InspectorSection index={0} title={t('free_deliv_field_stage', language)}>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((st) => {
                    const active = item.stage === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        data-no-liquid="true"
                        data-sq="ctl"
                        data-sq-border={active ? 'solid' : 'none'}
                        onClick={() => updateDeliverableStage(item.projectId, item.id, st.id)}
                        className={`px-3 py-2 t-small font-semibold cursor-pointer transition-colors ${
                          active
                            ? 'bg-[var(--brand-fill,#C9461F)] text-white [--sq-stroke:rgba(201,70,31,0.5)]'
                            : 'bg-[#F3EDE7] dark:bg-[#2B2825] text-black/75 dark:text-white/75 hover:bg-[#EAE1D8] dark:hover:bg-[#332F2B]'
                        }`}
                      >
                        {t(STAGE_KEYS[st.id], language)}
                      </button>
                    );
                  })}
                </div>
              </InspectorSection>
            );
          }
          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isFr ? 'Actions Rapides' : 'Quick Actions'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'timer',
                      label: t('free_timer_start', language),
                      icon: <Play size={16} />,
                      primary: true,
                      onClick: () => handleStartTimerForDeliverable(item.project, item.deliverable),
                    },
                    {
                      id: 'edit',
                      label: t('free_deliv_edit', language),
                      icon: <Edit2 size={16} />,
                      onClick: () => {
                        setDeliverableToEdit({ project: item.project, deliverable: item.deliverable });
                        setEditDeliverableForm({
                          title: item.title,
                          description: item.description || '',
                          estimatedHours: item.estimatedHours,
                          dueDate: item.dueDate,
                        });
                      },
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'معلومات التسليمة' : isFr ? 'Détails Livrable' : 'Deliverable Details'}>
                <InspectorCard>
                  <InspectorKeyValue label={t('free_deliv_field_project', language)} value={item.projectTitle} />
                  <InspectorKeyValue label={t('free_invoice_client', language)} value={item.clientName} />
                  <InspectorKeyValue label={t('free_deliv_field_due_date', language)} value={item.dueDate} mono isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2} title={t('free_deliv_field_tags', language)}>
                <InspectorNotesField
                  value={item.description || ''}
                  onSave={(next) =>
                    updateDeliverable(item.projectId, item.id, { description: next })
                  }
                />
              </InspectorSection>
            </>
          );
        }}
      />

      {/* Add Deliverable Modal */}
      <KineticModalShell
        isOpen={isAddDeliverableModalOpen}
        onClose={() => setIsAddDeliverableModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_deliv_btn_new', language)}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[92vh] overflow-y-auto p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {t('free_deliv_btn_new', language)}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddDeliverableModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreateDeliverable} className="space-y-4 t-cap">
            <LabelSelect
              field="TargetProject"
              label={`${t('free_deliv_field_project', language)} *`}
              value={targetProjectId || freelanceProjects[0]?.id || ''}
              onChange={setTargetProjectId}
              options={freelanceProjects.map((p) => ({
                value: p.id,
                label: `${p.title} (${p.clientName})`,
              }))}
              placeholder={t('free_deliv_ph_select_project', language)}
              height={40}
              corner={12}
            />
            <LabelInput
              id="deliverable-title"
              field="DeliverableTitle"
              label={t('free_deliv_field_title', language)}
              required
              placeholder={t('free_deliv_ph_title', language)}
              value={deliverableTitle}
              onChange={setDeliverableTitle}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelTextarea
              field="DeliverableNotes"
              label={t('free_deliv_field_tags', language)}
              rows={2}
              placeholder={t('free_deliv_ph_desc', language)}
              value={deliverableDescription}
              onChange={setDeliverableDescription}
              width="100%"
              corner={12}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                id="deliverable-estimated-hours"
                field="DeliverableEstHours"
                label={t('free_deliv_field_est_hours', language)}
                type="number"
                min={1}
                required
                value={String(estimatedHours)}
                onChange={(v) => setEstimatedHours(Number(v) || 1)}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                id="deliverable-due-date"
                field="DeliverableDueDate"
                label={t('free_deliv_field_due_date', language)}
                type="date"
                required
                value={dueDate}
                onChange={setDueDate}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsAddDeliverableModalOpen(false)}>
                {t('free_clients_cancel', language)}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {t('free_deliv_btn_new', language)}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      {/* Add Project Modal */}
      <KineticModalShell
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_deliv_field_project', language)}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[92vh] overflow-y-auto p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {t('free_deliv_field_project', language)}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddProjectModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreateProject} className="space-y-4 t-cap">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelSelect
                field="NewProjClient"
                label={`${t('free_invoice_client', language)} *`}
                value={newProjectData.clientId}
                onChange={(val) =>
                  setNewProjectData({ ...newProjectData, clientId: val })
                }
                options={freelanceClients.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.company || t('free_clients_private_badge', language)})`,
                }))}
                placeholder={t('free_deliv_ph_select_client', language)}
                height={40}
                corner={12}
              />
              <LabelSelect
                field="NewProjPricing"
                label={t('free_deliv_field_pricing', language)}
                value={newProjectData.pricingModel}
                onChange={(val) =>
                  setNewProjectData({
                    ...newProjectData,
                    pricingModel: val as PricingModel,
                  })
                }
                options={[
                  { value: 'Fixed', label: t('free_deliv_pricing_fixed', language) },
                  { value: 'Hourly', label: t('free_deliv_pricing_hourly', language) },
                  { value: 'Retainer', label: t('free_deliv_pricing_retainer', language) },
                ]}
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              id="new-project-title"
              field="NewProjTitle"
              label={t('free_deliv_field_title', language)}
              required
              placeholder={t('free_deliv_ph_proj_title', language)}
              value={newProjectData.title}
              onChange={(v) => setNewProjectData({ ...newProjectData, title: v })}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelTextarea
              field="NewProjNotes"
              label={t('free_deliv_field_tags', language)}
              rows={2}
              placeholder={t('free_deliv_ph_proj_desc', language)}
              value={newProjectData.description}
              onChange={(v) => setNewProjectData({ ...newProjectData, description: v })}
              width="100%"
              corner={12}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelSelect
                field="NewProjCurrency"
                label={t('free_clients_currency', language)}
                value={newProjectData.currency}
                onChange={(val) =>
                  setNewProjectData({
                    ...newProjectData,
                    currency: val as CurrencyCode,
                  })
                }
                options={[
                  { value: 'DZD', label: 'DZD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'USD', label: 'USD' },
                ]}
                height={40}
                corner={12}
              />
              <LabelInput
                id="new-project-budget"
                field="NewProjBudget"
                label={t('free_prop_total_quote', language)}
                type="number"
                value={String(newProjectData.budget)}
                onChange={(v) =>
                  setNewProjectData({ ...newProjectData, budget: Number(v) || 0 })
                }
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                id="new-project-hours"
                field="NewProjHours"
                label={t('free_deliv_field_est_hours', language)}
                type="number"
                value={String(newProjectData.estimatedHours)}
                onChange={(v) =>
                  setNewProjectData({
                    ...newProjectData,
                    estimatedHours: Number(v) || 0,
                  })
                }
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              id="new-project-deadline"
              field="NewProjDeadline"
              label={t('free_deliv_field_due_date', language)}
              type="date"
              value={newProjectData.deadline}
              onChange={(v) => setNewProjectData({ ...newProjectData, deadline: v })}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsAddProjectModalOpen(false)}>
                {t('free_clients_cancel', language)}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {t('free_deliv_field_project', language)}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      {/* Edit Deliverable Modal */}
      <KineticModalShell
        isOpen={Boolean(deliverableToEdit)}
        onClose={() => setDeliverableToEdit(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-[70]"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_deliv_edit', language)}
      >
        {retainedDeliverableToEdit && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[92vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <h3 className="t-card font-semibold text-black dark:text-white">
                {t('free_deliv_edit', language)}
              </h3>
              <button
                type="button"
                onClick={() => setDeliverableToEdit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditDeliverableSubmit} className="space-y-4 t-cap">
              <LabelInput
                id="edit-deliverable-title"
                field="EditDeliverableTitle"
                label={t('free_deliv_field_title', language)}
                required
                value={editDeliverableForm.title}
                onChange={(v) =>
                  setEditDeliverableForm({ ...editDeliverableForm, title: v })
                }
                width="100%"
                height={40}
                corner={12}
              />
              <LabelTextarea
                field="EditDeliverableNotes"
                label={t('free_deliv_field_tags', language)}
                rows={2}
                value={editDeliverableForm.description}
                onChange={(v) =>
                  setEditDeliverableForm({ ...editDeliverableForm, description: v })
                }
                width="100%"
                corner={12}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  id="edit-deliverable-estimated-hours"
                  field="EditDeliverableEstHours"
                  label={t('free_deliv_field_est_hours', language)}
                  type="number"
                  min={1}
                  required
                  value={String(editDeliverableForm.estimatedHours)}
                  onChange={(v) =>
                    setEditDeliverableForm({
                      ...editDeliverableForm,
                      estimatedHours: Number(v) || 1,
                    })
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="edit-deliverable-due-date"
                  field="EditDeliverableDueDate"
                  label={t('free_deliv_field_due_date', language)}
                  type="date"
                  required
                  value={editDeliverableForm.dueDate}
                  onChange={(v) =>
                    setEditDeliverableForm({ ...editDeliverableForm, dueDate: v })
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
                <Button type="button" tone="soft" size={40} onClick={() => setDeliverableToEdit(null)}>
                  {t('common_cancel', language)}
                </Button>
                <Button type="submit" tone="accent" size={40}>
                  {t('common_save', language)}
                </Button>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>

      {/* Delete Deliverable Modal */}
      <KineticModalShell
        isOpen={Boolean(deliverableToDelete)}
        onClose={() => setDeliverableToDelete(null)}
        role="alertdialog"
        maxWidthClass="max-w-md"
        zIndexClass="z-[70]"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_deliv_delete', language)}
      >
        {retainedDeliverableToDelete && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0"
              >
                <AlertTriangle size={20} />
              </div>
              <h3 className="t-card font-semibold text-black dark:text-white">
                {t('free_deliv_delete', language)}
              </h3>
            </div>
            <p className="t-cap text-black/70 dark:text-white/75 leading-relaxed">
              {isAr
                ? `هل أنت متأكد من حذف التسليمة "${retainedDeliverableToDelete.title}"؟`
                : isFr
                ? `Supprimer définitivement le livrable "${retainedDeliverableToDelete.title}" ?`
                : `Permanently remove deliverable "${retainedDeliverableToDelete.title}"?`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setDeliverableToDelete(null)}>
                {t('common_cancel', language)}
              </Button>
              <AtriumButton
                type="button"
                variant="danger"
                size="md"
                onClick={() => {
                  if (!deliverableToDelete) return;
                  deleteDeliverable(
                    deliverableToDelete.projectId,
                    deliverableToDelete.deliverableId
                  );
                  if (selectedDeliverableItem?.id === deliverableToDelete.deliverableId) {
                    setSelectedDeliverableItem(null);
                  }
                  setDeliverableToDelete(null);
                }}
              >
                {t('common_delete', language)}
              </AtriumButton>
            </div>
          </div>
        )}
      </KineticModalShell>

      {/* Delete Project Modal */}
      <KineticModalShell
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        role="alertdialog"
        maxWidthClass="max-w-md"
        zIndexClass="z-[70]"
        scrimClassName="bg-black/60"
        ariaLabel={isAr ? 'حذف المشروع' : isFr ? 'Supprimer le Projet' : 'Delete Project'}
      >
        {retainedProjectToDelete && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0"
              >
                <AlertTriangle size={20} />
              </div>
              <h3 className="t-card font-semibold text-black dark:text-white">
                {isAr ? 'حذف المشروع' : isFr ? 'Supprimer le Projet' : 'Delete Project'}
              </h3>
            </div>
            <p className="t-cap text-black/70 dark:text-white/75 leading-relaxed">
              {isAr
                ? `هل أنت متأكد من حذف مشروع "${retainedProjectToDelete.title}" وكافة تسليماته؟`
                : isFr
                ? `Supprimer le projet "${retainedProjectToDelete.title}" et tous ses livrables ?`
                : `Delete project "${retainedProjectToDelete.title}" and all associated deliverables?`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setProjectToDelete(null)}>
                {t('common_cancel', language)}
              </Button>
              <AtriumButton
                type="button"
                variant="danger"
                size="md"
                onClick={() => {
                  if (!projectToDelete) return;
                  deleteFreelanceProject(projectToDelete.id);
                  setSelectedProjectId('all');
                  setProjectToDelete(null);
                }}
              >
                {t('common_delete', language)}
              </AtriumButton>
            </div>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};

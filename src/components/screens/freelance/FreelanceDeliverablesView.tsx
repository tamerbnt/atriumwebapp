import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Kanban,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronRight,
  Filter,
  Layers,
  X,
  FileCheck,
  User,
  Edit2,
  Trash2,
  Download,
  Sparkles,
  Home,
  ChevronDown,
  Building2,
  Check,
  LayoutGrid,
  List,
  Pin,
  CheckCircle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import {
  FreelanceProject,
  FreelanceDeliverable,
  DeliverableStage,
  PricingModel,
  CurrencyCode,
} from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { TranslationKey } from '../../../utils/i18n';

const STAGE_KEYS: Record<DeliverableStage, TranslationKey> = {
  Briefing: 'free_deliv_stage_briefing',
  InProgress: 'free_deliv_stage_in_progress',
  ClientReview: 'free_deliv_stage_review',
  Approved: 'free_deliv_stage_delivered',
  Billed: 'free_kanban_invoiced',
};

const STAGES: { id: DeliverableStage; countColor: string }[] = [
  { id: 'Briefing', countColor: 'text-neutral-500' },
  { id: 'InProgress', countColor: 'text-amber-500' },
  { id: 'ClientReview', countColor: 'text-blue-500' },
  { id: 'Approved', countColor: 'text-emerald-500' },
  { id: 'Billed', countColor: 'text-neutral-400' },
];

export interface FlatDeliverableItem {
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

export const FreelanceDeliverablesView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    freelanceProjects,
    freelanceClients,
    updateDeliverableStage,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    addFreelanceProject,
    deleteFreelanceProject,
    startTimer,
    resetFreelanceMockData,
    businesses,
    branches,
    currentBusinessId,
    currentBranchId,
    switchBusiness,
    switchBranch,
    setScreen,
    showToast,
  } = useAtriumStore();

  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [viewLayout, setViewLayout] = useState<'kanban' | 'collection'>('kanban');

  // Auto-heal empty freelance deliverables safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && freelanceProjects.length === 0) {
      hasAutoHealed.current = true;
      resetFreelanceMockData();
    }
  }, [freelanceProjects.length, resetFreelanceMockData]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<Set<string>>(new Set());
  const [pinnedDeliverableIds, setPinnedDeliverableIds] = useState<Set<string>>(new Set());
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

  // New Deliverable Form
  const [targetProjectId, setTargetProjectId] = useState<string>(
    freelanceProjects[0]?.id || ''
  );
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDescription, setDeliverableDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(10);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // New Project Form
  const [newProjectData, setNewProjectData] = useState({
    clientId: freelanceClients[0]?.id || '',
    title: '',
    description: '',
    pricingModel: 'Fixed' as PricingModel,
    currency: 'DZD' as CurrencyCode,
    budget: 150000,
    estimatedHours: 40,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const activeProjects = useMemo(() => {
    if (selectedProjectId === 'all') return freelanceProjects;
    return freelanceProjects.filter((p) => p.id === selectedProjectId);
  }, [freelanceProjects, selectedProjectId]);

  // Aggregate all deliverables across selected projects
  const flattenedDeliverables = useMemo(() => {
    const list: Array<{
      deliverable: FreelanceDeliverable;
      project: FreelanceProject;
    }> = [];

    activeProjects.forEach((project) => {
      project.deliverables.forEach((deliv) => {
        if (
          !searchQuery.trim() ||
          deliv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deliv.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          list.push({ deliverable: deliv, project });
        }
      });
    });

    return list;
  }, [activeProjects, searchQuery]);

  const handleCreateDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverableTitle.trim() || !targetProjectId) return;

    addDeliverable(
      targetProjectId,
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

    setIsAddProjectModalOpen(false);
  };

  const handleStartTimerForDeliverable = (
    project: FreelanceProject,
    deliv: FreelanceDeliverable
  ) => {
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
  };

  const flatDeliverablesList: FlatDeliverableItem[] = useMemo(() => {
    const list: FlatDeliverableItem[] = [];
    activeProjects.forEach((project) => {
      project.deliverables.forEach((deliv) => {
        if (
          !searchQuery.trim() ||
          deliv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deliv.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
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
  }, [activeProjects, searchQuery]);

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
        return deliverableSortDir === 'asc' ? a.loggedHours - b.loggedHours : b.loggedHours - a.loggedHours;
      }
      return 0;
    });
  }, [flatDeliverablesList, pinnedDeliverableIds, deliverableSortBy, deliverableSortDir]);

  const deliverableColumns: ColumnDefinition<FlatDeliverableItem>[] = useMemo(() => [
    {
      key: 'title',
      header: language === 'ar' ? 'المهمة والمشروع' : language === 'fr' ? 'Livrable & Projet' : 'Deliverable & Project',
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (item) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
            item.isCompleted
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700'
          }`}>
            {item.isCompleted ? <CheckCircle2 size={16} /> : <FileCheck size={16} />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900 dark:text-white truncate hover:text-[#C4785A] transition-colors">
              {item.title}
            </div>
            <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
              <span>{item.projectTitle}</span>
              <span>·</span>
              <span className="text-[#C4785A] font-medium">{item.clientName}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: t('free_deliv_field_stage', language) || 'Stage',
      width: '1.8*',
      minWidth: '130px',
      sortable: true,
      renderCell: (item) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            item.stage === 'Approved'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : item.stage === 'InProgress'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : item.stage === 'ClientReview'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          {t(STAGE_KEYS[item.stage], language)}
        </span>
      ),
    },
    {
      key: 'hours',
      header: language === 'ar' ? 'ساعات الإنجاز' : language === 'fr' ? 'Heures Réalisées' : 'Hours Logged',
      width: '2*',
      minWidth: '150px',
      sortable: true,
      renderCell: (item) => {
        const isCreep = item.loggedHours > item.estimatedHours;
        const pct = Math.min(100, Math.round((item.loggedHours / (item.estimatedHours || 1)) * 100));
        return (
          <div className="space-y-1 min-w-[120px]">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold tabular-nums ${isCreep ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-neutral-800 dark:text-neutral-200'}`}>
                {item.loggedHours}h / {item.estimatedHours}h
              </span>
              <span className="text-[10px] text-neutral-400 tabular-nums">{pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isCreep ? 'bg-rose-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-[#C4785A]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: language === 'ar' ? 'تاريخ التسليم' : language === 'fr' ? 'Échéance' : 'Due Date',
      width: '1.5*',
      minWidth: '120px',
      sortable: true,
      renderCell: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
          <Calendar size={12} className="text-neutral-400" />
          <span>{item.dueDate}</span>
        </div>
      ),
    },
  ], [language, t]);

  const handleExportCSV = () => {
    if (flatDeliverablesList.length === 0) return;
    const headers = [
      language === 'ar' ? 'معرف المهمة' : 'Deliverable ID',
      language === 'ar' ? 'عنوان المهمة' : 'Deliverable Title',
      language === 'ar' ? 'المشروع' : 'Project',
      language === 'ar' ? 'العميل' : 'Client',
      language === 'ar' ? 'المرحلة' : 'Stage',
      language === 'ar' ? 'الساعات المقدرة' : 'Estimated Hours',
      language === 'ar' ? 'الساعات المسجلة' : 'Logged Hours',
      language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date',
      language === 'ar' ? 'مكتمل' : 'Completed',
    ];

    const rows = sortedDeliverables.map((item) => [
      `"${item.id}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.projectTitle.replace(/"/g, '""')}"`,
      `"${item.clientName.replace(/"/g, '""')}"`,
      `"${item.stage}"`,
      item.estimatedHours,
      item.loggedHours,
      `"${item.dueDate}"`,
      item.isCompleted ? 'Oui' : 'Non',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atrium_freelance_deliverables_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchSetStage = (newStage: DeliverableStage) => {
    if (selectedDeliverableIds.size === 0) return;
    flatDeliverablesList.forEach((item) => {
      if (selectedDeliverableIds.has(item.id)) {
        updateDeliverableStage(item.projectId, item.id, newStage);
      }
    });
    const count = selectedDeliverableIds.size;
    setSelectedDeliverableIds(new Set());
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Mis à jour' : 'Updated',
      message: `${count} ${language === 'ar' ? 'مهام تم تحديث مرحلتها' : `deliverables moved to ${newStage}`}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDeleteDeliverables = () => {
    if (selectedDeliverableIds.size === 0) return;
    const count = selectedDeliverableIds.size;
    if (confirm(language === 'ar' ? `هل أنت متأكد من حذف ${count} مهام؟` : `Delete ${count} selected deliverables?`)) {
      flatDeliverablesList.forEach((item) => {
        if (selectedDeliverableIds.has(item.id)) {
          deleteDeliverable(item.projectId, item.id);
        }
      });
      setSelectedDeliverableIds(new Set());
      showToast({
        type: 'info',
        title: language === 'ar' ? 'تم الحذف' : language === 'fr' ? 'Suppression' : 'Deleted',
        message: `${count} ${language === 'ar' ? 'مهام تم حذفها' : 'deliverables deleted'}`,
        category: 'freelance_solo',
      });
    }
  };

  // Scope Creep and Hours calculation
  const totalScopeCreepItems = flattenedDeliverables.filter(
    (item) => item.deliverable.loggedHours > item.deliverable.estimatedHours
  ).length;
  const totalLoggedHours = flattenedDeliverables.reduce((acc, item) => acc + (item.deliverable.loggedHours || 0), 0);
  const totalEstimatedHours = flattenedDeliverables.reduce((acc, item) => acc + (item.deliverable.estimatedHours || 0), 0);
  const inProgressDeliverablesCount = flattenedDeliverables.filter((item) => item.deliverable.stage === 'InProgress').length;
  const reviewDeliverablesCount = flattenedDeliverables.filter((item) => item.deliverable.stage === 'ClientReview').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Row 0: Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center shrink-0">
            <Kanban size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t('free_deliv_title', language)}
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                {flattenedDeliverables.length} {language === 'ar' ? 'مهام' : 'tasks'}
              </span>
              {totalScopeCreepItems > 0 && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>{totalScopeCreepItems} {language === 'ar' ? 'تنبيه تجاوز' : language === 'fr' ? 'Dépassement' : 'Overrun'}</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('free_deliv_subtitle', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Branch Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-[42px] px-4 rounded-[14px] bg-[#F8F9FA] dark:bg-neutral-800 border border-[#EDF1F3] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Studio Main'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${isFacilityDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'الفروع والمراكز' : language === 'fr' ? 'Établissements & Espaces' : 'Facilities & Branches'}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions Terracotta Button + Floating Popup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              className="h-[42px] px-5 rounded-[14px] bg-[#C4785A] hover:bg-[#B3684A] text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus size={15} />
              <span>{language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}</span>
            </button>

            {isQuickActionsOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-[240px] rounded-[18px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setIsAddDeliverableModalOpen(true);
                  }}
                  className="w-full h-10 px-2.5 rounded-xl hover:bg-[#F8F9FA] dark:hover:bg-neutral-700 flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer text-left rtl:text-right"
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center shrink-0">
                    <Plus size={15} />
                  </div>
                  <span>{t('free_deliv_btn_new', language)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setIsAddProjectModalOpen(true);
                  }}
                  className="w-full h-10 px-2.5 rounded-xl hover:bg-[#F8F9FA] dark:hover:bg-neutral-700 flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer text-left rtl:text-right"
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <Layers size={15} />
                  </div>
                  <span>{t('free_deliv_field_project', language)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setScreen('analytics');
                  }}
                  className="w-full h-10 px-2.5 rounded-xl hover:bg-[#F8F9FA] dark:hover:bg-neutral-700 flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer text-left rtl:text-right"
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock size={15} />
                  </div>
                  <span>{language === 'ar' ? 'تشغيل الميقاتي' : language === 'fr' ? 'Lancer Minuteur' : 'Start Timer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    handleExportCSV();
                  }}
                  className="w-full h-10 px-2.5 rounded-xl hover:bg-[#F8F9FA] dark:hover:bg-neutral-700 flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer text-left rtl:text-right"
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                    <Download size={15} />
                  </div>
                  <span>{language === 'ar' ? 'تصدير CSV' : language === 'fr' ? 'Exporter CSV' : 'Export CSV'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Metrics Pod Tray: 3 Inset Cards including Dark Espresso Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات إنجاز المشاريع والمهام' : language === 'fr' ? 'Indicateurs des Livrables & Projets' : 'Deliverables & Production Performance'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة مراحل التسليم وساعات العمل المنجزة وتجاوزات الميزانية' : language === 'fr' ? 'Suivi du cycle de production, du temps passé et des alertes de dépassement' : 'Track task pipeline, tracked hours against estimates, and creep risks'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Active Production Pipeline */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'مهام قيد الإنجاز والمراجعة' : language === 'fr' ? 'En cours & En Révision' : 'Active Production Queue'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {inProgressDeliverablesCount + reviewDeliverablesCount} {language === 'ar' ? 'نشطة' : 'active'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {flattenedDeliverables.length}
                <span className="text-xs font-normal text-neutral-400 ml-1.5">
                  / {freelanceProjects.length} {language === 'ar' ? 'مشاريع' : 'projets'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {inProgressDeliverablesCount} {language === 'ar' ? 'قيد العمل' : 'en cours'} · {reviewDeliverablesCount} {language === 'ar' ? 'بانتظار العميل' : 'en revue'}
              </p>
            </div>
          </div>

          {/* Card 2: Tracked Hours vs Estimated */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'ساعات الإنتاج المحسوبة' : language === 'fr' ? 'Heures Déployées / Estimées' : 'Production Hours Logged'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {totalEstimatedHours > 0 ? Math.round((totalLoggedHours / totalEstimatedHours) * 100) : 0}% {language === 'ar' ? 'منجز' : 'utilisé'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {totalLoggedHours}h
                <span className="text-xs font-normal text-neutral-400 ml-1.5">
                  / {totalEstimatedHours}h {language === 'ar' ? 'مقدرة' : 'est.'}
                </span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-[#C4785A] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, totalEstimatedHours > 0 ? (totalLoggedHours / totalEstimatedHours) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'تجاوزات النطاق والميزانية' : language === 'fr' ? 'Dépassement & Dérive Scope' : 'Scope Creep & Overruns'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                {totalScopeCreepItems > 0 ? `${totalScopeCreepItems} ${language === 'ar' ? 'تنبيهات' : 'alertes'}` : (language === 'ar' ? 'تحت السيطرة' : 'Sous Contrôle')}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {totalScopeCreepItems}
                <span className="text-xs font-normal text-neutral-400 ml-1.5">
                  {language === 'ar' ? 'مهام متجاوزة' : language === 'fr' ? 'dérives' : 'tasks over'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>
                  {totalScopeCreepItems > 0
                    ? (language === 'ar' ? 'يتطلب إعادة فوترة أو تسوية مع العميل' : 'Facturation additionnelle requise')
                    : (language === 'ar' ? 'كافة الساعات متوافقة مع ميزانيات المشاريع' : 'Toutes les heures respectent le devis')}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Collection Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Integrated Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#EDF1F3] dark:border-neutral-800/60">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <Layers size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {t('free_deliv_title', language)}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300">
                  {flattenedDeliverables.length}
                </span>
              </div>
            </div>

            {/* Kanban vs Collection Switcher */}
            <div className="flex items-center p-0.5 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700 ml-2">
              <button
                type="button"
                onClick={() => setViewLayout('kanban')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === 'kanban'
                    ? 'bg-[#C4785A] text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Kanban size={12} />
                <span>{language === 'ar' ? 'لوحة كانبان' : 'Kanban'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('collection')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === 'collection'
                    ? 'bg-[#C4785A] text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Layers size={12} />
                <span>{language === 'ar' ? 'قائمة وتصنيف' : language === 'fr' ? 'Liste' : 'Collection'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('free_search_deliverables_ph', language)}
            />

            <AtriumButton
              type="button"
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportCSV}
              title="Export CSV"
            >
              <span className="hidden sm:inline">CSV</span>
            </AtriumButton>

            <AtriumButton
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => setIsAddProjectModalOpen(true)}
            >
              {t('free_deliv_field_project', language)}
            </AtriumButton>

            <AtriumButton
              type="button"
              variant="primary"
              size="sm"
              glow
              icon={<Plus size={13} />}
              onClick={() => setIsAddDeliverableModalOpen(true)}
            >
              {t('free_deliv_btn_new', language)}
            </AtriumButton>
          </div>
        </div>

        {/* Project Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs text-neutral-400 font-medium shrink-0 flex items-center gap-1">
            <Filter size={12} />
            {t('common_filter', language)}:
          </span>
          <button
            type="button"
            onClick={() => setSelectedProjectId('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedProjectId === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 border border-[#E9EEF0] dark:border-neutral-700/60'
            }`}
          >
            {t('free_deliv_all_projects', language)} ({freelanceProjects.length})
          </button>

          {freelanceProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedProjectId(project.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedProjectId === project.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 border border-[#E9EEF0] dark:border-neutral-700/60'
              }`}
            >
              {project.title} · <span className="opacity-75">{project.clientName}</span>
            </button>
          ))}

          {selectedProjectId !== 'all' && (
            <button
              type="button"
              onClick={() => {
                const targetProj = freelanceProjects.find((p) => p.id === selectedProjectId);
                if (targetProj) setProjectToDelete(targetProj);
              }}
              className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0 ml-auto"
              title={t('common_delete', language)}
            >
              <Trash2 size={12} />
              <span>{t('common_delete', language)}</span>
            </button>
          )}
        </div>

        {/* Batch Selection Toolbar */}
        {selectedDeliverableIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                {selectedDeliverableIds.size} {language === 'ar' ? 'مهام محددة' : language === 'fr' ? 'livrables sélectionnés' : 'deliverables selected'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedDeliverableIds(new Set())}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect'}
              </button>
              <button
                onClick={() => handleBatchSetStage('InProgress')}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Clock size={12} />
                <span>{t('free_deliv_stage_in_progress', language)}</span>
              </button>
              <button
                onClick={() => handleBatchSetStage('ClientReview')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Layers size={12} />
                <span>{t('free_deliv_stage_review', language)}</span>
              </button>
              <button
                onClick={() => handleBatchSetStage('Approved')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle size={12} />
                <span>{t('free_deliv_stage_delivered', language)}</span>
              </button>
              <button
                onClick={handleBatchDeleteDeliverables}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 size={12} />
                <span>{language === 'ar' ? 'حذف المحدد' : language === 'fr' ? 'Supprimer' : 'Delete'}</span>
              </button>
            </div>
          </div>
        )}

      {freelanceProjects.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/40 space-y-3">
          <Kanban size={36} className="mx-auto text-neutral-300 dark:text-neutral-600" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">{t('free_deliv_empty_column', language)}</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {t('free_deliv_modal_add_desc', language)}
          </p>
          <button
            type="button"
            onClick={() => setIsAddProjectModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>{t('free_deliv_field_project', language)}</span>
          </button>
        </div>
      ) : viewLayout === 'collection' ? (
        <UniversalDataCollection<FlatDeliverableItem>
          items={sortedDeliverables}
          keyExtractor={(item) => item.id}
          defaultViewMode="list"
          columns={deliverableColumns}
          sortBy={deliverableSortBy}
          sortDirection={deliverableSortDir}
          onSortChange={(key) => {
            if (deliverableSortBy === key) {
              setDeliverableSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
              setDeliverableSortBy(key);
              setDeliverableSortDir('asc');
            }
          }}
          renderCard={(item) => {
            const isCreep = item.loggedHours > item.estimatedHours;
            const pct = Math.min(100, Math.round((item.loggedHours / (item.estimatedHours || 1)) * 100));

            return (
              <div className="flex flex-col justify-between w-full h-full space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 truncate max-w-[130px]">
                    {item.projectTitle}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      item.stage === 'Approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : item.stage === 'InProgress'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : item.stage === 'ClientReview'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {t(STAGE_KEYS[item.stage], language)}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug truncate">
                    {item.title}
                  </h4>
                  <div className="text-[11px] text-[#C4785A] font-medium mt-0.5 truncate">
                    {item.clientName}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
                      <Clock size={11} />
                      {t('free_clients_ph_hours_label', language)}
                    </span>
                    <span className={`tabular-nums font-semibold text-xs ${isCreep ? 'text-rose-600 font-bold' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {item.loggedHours}h / {item.estimatedHours}h ({pct}%)
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isCreep ? 'bg-rose-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-[#C4785A]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {item.dueDate}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTimerForDeliverable(item.project, item.deliverable);
                      }}
                      className="px-2 py-0.5 rounded-md bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-semibold text-[10px] flex items-center gap-1 hover:bg-[#F8DFD4] cursor-pointer"
                    >
                      <Play size={10} />
                      <span>{t('free_timer_start', language)}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
          onItemClick={(item) => {
            setDeliverableToEdit({ project: item.project, deliverable: item.deliverable });
            setEditDeliverableForm({
              title: item.title,
              description: item.description || '',
              estimatedHours: item.estimatedHours,
              dueDate: item.dueDate,
            });
          }}
          onEdit={(item) => {
            setDeliverableToEdit({ project: item.project, deliverable: item.deliverable });
            setEditDeliverableForm({
              title: item.title,
              description: item.description || '',
              estimatedHours: item.estimatedHours,
              dueDate: item.dueDate,
            });
          }}
          onTogglePin={(item) => {
            setPinnedDeliverableIds((prev) => {
              const next = new Set(prev);
              if (next.has(item.id)) {
                next.delete(item.id);
                showToast?.({
                  type: 'info',
                  title: 'Unpinned',
                  message: `${item.title} unpinned`,
                });
              } else {
                next.add(item.id);
                showToast?.({
                  type: 'info',
                  title: 'Pinned',
                  message: `${item.title} pinned to top`,
                });
              }
              return next;
            });
          }}
          onDelete={(item) => {
            setDeliverableToDelete({
              projectId: item.projectId,
              deliverableId: item.id,
              title: item.title,
            });
          }}
          customActions={(item) => [
            {
              id: 'timer',
              tooltip: t('free_timer_start', language),
              icon: <Play size={13} />,
              iconColor: '#C4785A',
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                handleStartTimerForDeliverable(item.project, item.deliverable);
              },
            },
          ]}
          isPinned={(item) => pinnedDeliverableIds.has(item.id)}
          selectedIds={selectedDeliverableIds}
          onSelectionChange={setSelectedDeliverableIds}
          emptyTitle={t('free_deliv_empty_column', language)}
          emptyDescription={t('free_deliv_modal_add_desc', language)}
          primaryActionLabel={t('free_deliv_btn_new', language)}
          onAddFirstItem={() => setIsAddDeliverableModalOpen(true)}
        />
      ) : (
      /* 5-Column Kanban Board */
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {STAGES.map((stage) => {
          const itemsInStage = flattenedDeliverables.filter(
            (item) => item.deliverable.stage === stage.id
          );

          return (
            <div
              key={stage.id}
              className="rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800 p-3 min-h-[500px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200/60 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  {t(STAGE_KEYS[stage.id], language)}
                </span>
                <span className={`text-xs font-extrabold tabular-nums ${stage.countColor}`}>
                  {itemsInStage.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {itemsInStage.map(({ deliverable, project }) => {
                  const isCreep = deliverable.loggedHours > deliverable.estimatedHours;
                  const ratioPercent = Math.round(
                    (deliverable.loggedHours / (deliverable.estimatedHours || 1)) * 100
                  );

                  return (
                    <div
                      key={deliverable.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/40 transition-all flex flex-col justify-between gap-2.5 group"
                    >
                      <div>
                        {/* Project / Client Breadcrumb */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                          <span className="truncate max-w-[130px] font-medium text-neutral-500 dark:text-neutral-400">
                            {project.title}
                          </span>
                          <span className="shrink-0">{project.clientName}</span>
                        </div>

                        {/* Deliverable Title */}
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white leading-snug">
                          {deliverable.title}
                        </h4>

                        {deliverable.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                            {deliverable.description}
                          </p>
                        )}
                      </div>

                      {/* Scope & Hours Metrics */}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500 flex items-center gap-1">
                            <Clock size={11} />
                            {t('free_clients_ph_hours_label', language)}
                          </span>
                          <span
                            className={`font-semibold tabular-nums ${
                              isCreep
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {deliverable.loggedHours}h / {deliverable.estimatedHours}h ({ratioPercent}%)
                          </span>
                        </div>

                        {isCreep && (
                          <div className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-1">
                            <AlertTriangle size={10} />
                            <span>
                              {t('free_clients_ph_over_est_label', language)}{' '}
                              (+{(deliverable.loggedHours - deliverable.estimatedHours).toFixed(1)}h)
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {t('free_clients_ph_due_label', language)}
                          </span>
                          <span>{deliverable.dueDate}</span>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartTimerForDeliverable(project, deliverable)}
                            className="h-7 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#C4785A] hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title={t('free_btn_log_time', language)}
                          >
                            <Play size={10} />
                            <span>{t('free_btn_log_time', language)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeliverableToEdit({ project, deliverable });
                              setEditDeliverableForm({
                                title: deliverable.title,
                                description: deliverable.description || '',
                                estimatedHours: deliverable.estimatedHours,
                                dueDate: deliverable.dueDate,
                              });
                            }}
                            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
                            title={t('free_deliv_edit', language)}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeliverableToDelete({
                                projectId: project.id,
                                deliverableId: deliverable.id,
                                title: deliverable.title,
                              })
                            }
                            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                            title={t('free_deliv_delete', language)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Move Stage Selector */}
                        <FilterSelect
                          value={deliverable.stage}
                          onChange={(val) =>
                            updateDeliverableStage(
                              project.id,
                              deliverable.id,
                              (val?.target?.value ?? String(val)) as DeliverableStage
                            )
                          }
                          options={STAGES.map((s) => ({ value: s.id, label: `→ ${t(STAGE_KEYS[s.id], language)}` }))}
                          placeholder={t('free_deliv_ph_stage', language)}
                        />
                      </div>
                    </div>
                  );
                })}

                {itemsInStage.length === 0 && (
                  <div className="py-8 text-center text-neutral-400 text-xs italic">
                    {t('free_deliv_empty_column', language)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
      </div>

      {/* Add Deliverable Modal */}
      {isAddDeliverableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('free_deliv_modal_add_title', language)}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t('free_deliv_modal_add_desc', language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDeliverableModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="space-y-3.5 text-xs">
              <LabelSelect
                label={`${t('free_deliv_field_project', language)} *`}
                value={targetProjectId}
                onChange={(val) => setTargetProjectId(val?.target?.value ?? String(val))}
                options={freelanceProjects.map((p) => ({
                  value: p.id,
                  label: `${p.title} (${p.clientName})`,
                }))}
                placeholder={t('free_deliv_ph_select_project', language)}
              />

              <LabelInput
                id="deliverable-title"
                label={t('free_deliv_field_title', language)}
                required
                placeholder={t('free_deliv_ph_title', language)}
                value={deliverableTitle}
                onChange={(e) => setDeliverableTitle(e.target.value)}
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t('free_deliv_field_tags', language)}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('free_deliv_ph_desc', language)}
                  value={deliverableDescription}
                  onChange={(e) => setDeliverableDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="deliverable-estimated-hours"
                  label={t('free_deliv_field_est_hours', language)}
                  type="number"
                  min="1"
                  required
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                />
                <LabelInput
                  id="deliverable-due-date"
                  label={t('free_deliv_field_due_date', language)}
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeliverableModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('free_clients_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t('free_deliv_btn_new', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isAddProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('free_deliv_field_project', language)}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddProjectModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label={`${t('free_invoice_client', language)} *`}
                  value={newProjectData.clientId}
                  onChange={(val) =>
                    setNewProjectData({
                      ...newProjectData,
                      clientId: val?.target?.value ?? String(val),
                    })
                  }
                  options={freelanceClients.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.company || t('free_clients_private_badge', language)})`,
                  }))}
                  placeholder={t('free_deliv_ph_select_client', language)}
                />
                <LabelSelect
                  label={t('free_deliv_field_pricing', language)}
                  value={newProjectData.pricingModel}
                  onChange={(val) =>
                    setNewProjectData({
                      ...newProjectData,
                      pricingModel: (val?.target?.value ?? String(val)) as PricingModel,
                    })
                  }
                  options={[
                    { value: 'Fixed', label: t('free_deliv_pricing_fixed', language) },
                    { value: 'Hourly', label: t('free_deliv_pricing_hourly', language) },
                    { value: 'Retainer', label: t('free_deliv_pricing_retainer', language) },
                  ]}
                />
              </div>

              <LabelInput
                id="new-project-title"
                label={t('free_deliv_field_title', language)}
                required
                placeholder={t('free_deliv_ph_proj_title', language)}
                value={newProjectData.title}
                onChange={(e) => setNewProjectData({ ...newProjectData, title: e.target.value })}
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t('free_deliv_field_tags', language)}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('free_deliv_ph_proj_desc', language)}
                  value={newProjectData.description}
                  onChange={(e) =>
                    setNewProjectData({ ...newProjectData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LabelSelect
                  label={t('free_clients_currency', language)}
                  value={newProjectData.currency}
                  onChange={(val) =>
                    setNewProjectData({
                      ...newProjectData,
                      currency: (val?.target?.value ?? String(val)) as CurrencyCode,
                    })
                  }
                  options={['DZD', 'EUR', 'USD']}
                />
                <div>
                  <LabelInput
                    id="new-project-budget"
                    label={t('free_prop_total_quote', language)}
                    type="number"
                    value={newProjectData.budget}
                    onChange={(e) =>
                      setNewProjectData({ ...newProjectData, budget: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <LabelInput
                    id="new-project-hours"
                    label={t('free_deliv_field_est_hours', language)}
                    type="number"
                    value={newProjectData.estimatedHours}
                    onChange={(e) =>
                      setNewProjectData({
                        ...newProjectData,
                        estimatedHours: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <LabelInput
                  id="new-project-deadline"
                  label={t('free_deliv_field_due_date', language)}
                  type="date"
                  value={newProjectData.deadline}
                  onChange={(e) =>
                    setNewProjectData({ ...newProjectData, deadline: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('free_clients_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('free_deliv_field_project', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deliverable Modal */}
      {deliverableToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('free_deliv_edit', language)}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {deliverableToEdit.project.title} · {deliverableToEdit.project.clientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeliverableToEdit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditDeliverableSubmit} className="space-y-3.5 text-xs">
              <LabelInput
                id="edit-deliverable-title"
                label={t('free_deliv_field_title', language)}
                required
                value={editDeliverableForm.title}
                onChange={(e) =>
                  setEditDeliverableForm({ ...editDeliverableForm, title: e.target.value })
                }
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t('free_deliv_field_tags', language)}
                </label>
                <textarea
                  rows={2}
                  value={editDeliverableForm.description}
                  onChange={(e) =>
                    setEditDeliverableForm({ ...editDeliverableForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="edit-deliverable-estimated-hours"
                  label={t('free_deliv_field_est_hours', language)}
                  type="number"
                  min="1"
                  required
                  value={editDeliverableForm.estimatedHours}
                  onChange={(e) =>
                    setEditDeliverableForm({
                      ...editDeliverableForm,
                      estimatedHours: Number(e.target.value),
                    })
                  }
                />
                <LabelInput
                  id="edit-deliverable-due-date"
                  label={t('free_deliv_field_due_date', language)}
                  type="date"
                  required
                  value={editDeliverableForm.dueDate}
                  onChange={(e) =>
                    setEditDeliverableForm({ ...editDeliverableForm, dueDate: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDeliverableToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('common_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('common_save', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Deliverable Confirmation Modal */}
      {deliverableToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('free_deliv_delete', language)}
                </h3>
                <p className="text-xs text-neutral-500">{deliverableToDelete.title}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف التسليمة "${deliverableToDelete.title}"؟ سيتم حذفها نهائياً من لوحة كانبان.`
                : language === 'fr'
                ? `Êtes-vous sûr de vouloir supprimer le livrable "${deliverableToDelete.title}" ? Cette tâche sera définitivement retirée du tableau Kanban.`
                : `Are you sure you want to delete deliverable "${deliverableToDelete.title}"? This task will be permanently removed from the Kanban board.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setDeliverableToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('common_cancel', language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDeliverable(deliverableToDelete.projectId, deliverableToDelete.deliverableId);
                  setDeliverableToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {t('common_delete', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'حذف المشروع' : language === 'fr' ? 'Supprimer le Projet' : 'Delete Project'}
                </h3>
                <p className="text-xs text-neutral-500">{projectToDelete.title} · {projectToDelete.clientName}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف مشروع "${projectToDelete.title}"؟ سيتم حذف جميع التسليمات وسجلات الوقت المرتبطة به نهائياً.`
                : language === 'fr'
                ? `Êtes-vous sûr de vouloir supprimer le projet "${projectToDelete.title}" ? Tous les livrables et sessions de travail associées seront définitivement supprimés.`
                : `Are you sure you want to delete project "${projectToDelete.title}"? All associated deliverables and tracked sessions will be permanently deleted.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('common_cancel', language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFreelanceProject(projectToDelete.id);
                  setSelectedProjectId('all');
                  setProjectToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {t('common_delete', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

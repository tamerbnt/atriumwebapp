import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  selectCurrentBranchFromState,
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentPmProjectsFromState,
  selectCurrentPmPrintOrdersFromState,
  selectCurrentPmBatDeliverablesFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { PMBatDeliverable } from '../../../types/index';
import {
  Palette,
  UploadCloud,
  CheckCircle,
  FileCheck2,
  Layers,
  FileText,
  Download,
  Eye,
  Pin,
  Trash2,
  X,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKanbanPipeline, SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticModalShell,
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
  KineticStatusVariant,
  ListAdvancedMenuButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
  useRetainedModalValue,
} from '../../ui/kinetic';

interface ProjectCreaViewProps {
  initialTab?: 'demandes' | 'kanban' | 'production' | 'upload' | 'briefs';
}

const getBatStatusBadge = (
  status: PMBatDeliverable['approvalStatus'],
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  if (status === 'approved') {
    return {
      label: isAr ? 'معتمد للطباعة' : 'Validé BAT',
      variant: 'active',
      pillClass:
        'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]',
    };
  }
  if (status === 'revision_requested') {
    return {
      label: isAr ? 'مطلوب تعديل' : 'Corrections',
      variant: 'blocked',
      pillClass:
        'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]',
    };
  }
  return {
    label: isAr ? 'قيد المراجعة' : 'En Revue CDP',
    variant: 'warning',
    pillClass:
      'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]',
  };
};

export const ProjectCreaView: React.FC<ProjectCreaViewProps> = ({ initialTab }) => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { currentBranch, branches, pmProjects, pmPrintOrders, pmBatDeliverables, activePmSubScreen, isSyncing, networkMode, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      pmProjects: selectCurrentPmProjectsFromState(s),
      pmPrintOrders: selectCurrentPmPrintOrdersFromState(s),
      pmBatDeliverables: selectCurrentPmBatDeliverablesFromState(s),
      activePmSubScreen: s.activePmSubScreen || 'dashboard',
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const {
    addPmBatDeliverable,
    updatePmPrintOrderStatus,
    reviewPmBatDeliverable,
    batchReviewPmBatDeliverables,
    batchDeletePmBatDeliverables,
    setActivePmSubScreen,
    retryCloudSync,
  } = useAtriumActions();
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeTab =
    activePmSubScreen === 'upload' || activePmSubScreen === 'livrables' || initialTab === 'upload'
      ? 'upload'
      : activePmSubScreen === 'production' || initialTab === 'production'
      ? 'production'
      : activePmSubScreen === 'briefs' || initialTab === 'briefs'
      ? 'briefs'
      : activePmSubScreen === 'demandes' || initialTab === 'demandes'
      ? 'demandes'
      : 'kanban';

  const setActiveTab = useCallback(
    (tab: string) => {
      setActivePmSubScreen(tab);
    },
    [setActivePmSubScreen]
  );

  const [selectedProjectId, setSelectedProjectId] = useState(pmProjects[0]?.id || '');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedPreviewBat, setSelectedPreviewBat] = useState<PMBatDeliverable | null>(null);
  const [artworkTitle, setArtworkTitle] = useState('');
  const [fileFormat, setFileFormat] = useState('pdf');
  const [colorSpace, setColorSpace] = useState('CMJN');
  const [resolutionDpi, setResolutionDpi] = useState('300');
  const [hasBleedIncluded, setHasBleedIncluded] = useState(true);
  const [previewUrl] = useState(
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80'
  );
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Production collection state
  const [creaSearch, setCreaSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('All');
  const [colorFilter, setColorFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);

  const [selectedBatIds, setSelectedBatIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedBatIds, setPinnedBatIds] = useState<Set<string>>(() => new Set<string>());
  const [batSortBy, setBatSortBy] = useState('title');
  const [batSortDir, setBatSortDir] = useState<'asc' | 'desc'>('asc');

  const [inspectedBat, setInspectedBat] = useState<PMBatDeliverable | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const activeInspectedBat = useMemo(() => {
    if (!inspectedBat) return null;
    return pmBatDeliverables.find((b) => b.id === inspectedBat.id) || null;
  }, [inspectedBat, pmBatDeliverables]);

  const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];

  const cmjnCompliantPct = useMemo(
    () =>
      pmBatDeliverables.length > 0
        ? Math.round(
            (pmBatDeliverables.filter((b) => b.colorSpace === 'CMJN' && b.resolutionDpi >= 300)
              .length /
              pmBatDeliverables.length) *
              100
          )
        : 100,
    [pmBatDeliverables]
  );

  const filteredDeliverables = useMemo(() => {
    return pmBatDeliverables.filter((b) => {
      const q = creaSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.projectTitle.toLowerCase().includes(q) ||
        b.fileFormat.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || b.approvalStatus === statusFilter;
      const matchFmt = formatFilter === 'All' || b.fileFormat === formatFilter;
      const matchColor = colorFilter === 'All' || b.colorSpace === colorFilter;
      return matchQ && matchStatus && matchFmt && matchColor;
    });
  }, [pmBatDeliverables, creaSearch, statusFilter, formatFilter, colorFilter]);

  const sortedDeliverables = useMemo(() => {
    return [...filteredDeliverables].sort((a, b) => {
      const aPinned = pinnedBatIds.has(a.id);
      const bPinned = pinnedBatIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (batSortBy === 'title') {
        const cmp = a.title.localeCompare(b.title);
        return batSortDir === 'asc' ? cmp : -cmp;
      }
      if (batSortBy === 'project') {
        const cmp = a.projectTitle.localeCompare(b.projectTitle);
        return batSortDir === 'asc' ? cmp : -cmp;
      }
      if (batSortBy === 'version') {
        return batSortDir === 'asc' ? a.version - b.version : b.version - a.version;
      }
      return 0;
    });
  }, [filteredDeliverables, pinnedBatIds, batSortBy, batSortDir]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (statusFilter !== 'all') c += 1;
    if (formatFilter !== 'All') c += 1;
    if (colorFilter !== 'All') c += 1;
    return c;
  }, [statusFilter, formatFilter, colorFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: getBatStatusBadge(statusFilter as PMBatDeliverable['approvalStatus'], language).label,
        onRemove: () => setStatusFilter('all'),
      });
    }
    if (formatFilter !== 'All') {
      chips.push({
        key: 'format',
        label: formatFilter.toUpperCase(),
        onRemove: () => setFormatFilter('All'),
      });
    }
    if (colorFilter !== 'All') {
      chips.push({
        key: 'color',
        label: colorFilter,
        onRemove: () => setColorFilter('All'),
      });
    }
    return chips;
  }, [statusFilter, formatFilter, colorFilter, language]);

  const resetFilters = useCallback(() => {
    setCreaSearch('');
    setStatusFilter('all');
    setFormatFilter('All');
    setColorFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'حالة الاعتماد' : 'Statut Validation BAT',
        value: statusFilter,
        resetValue: 'all',
        onChange: setStatusFilter,
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Tous', count: pmBatDeliverables.length },
          {
            value: 'pending_review',
            label: isAr ? 'قيد المراجعة' : 'En Revue',
            count: pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length,
          },
          {
            value: 'approved',
            label: isAr ? 'معتمد' : 'Validés',
            count: pmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length,
          },
          {
            value: 'revision_requested',
            label: isAr ? 'تعديل' : 'Corrections',
            count: pmBatDeliverables.filter((b) => b.approvalStatus === 'revision_requested').length,
          },
        ],
      },
      {
        id: 'format',
        kind: 'segmented',
        label: isAr ? 'صيغة الملف' : 'Format Fichier',
        value: formatFilter,
        resetValue: 'All',
        onChange: setFormatFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'pdf', label: 'PDF' },
          { value: 'ai', label: 'AI' },
          { value: 'psd', label: 'PSD' },
          { value: 'tiff', label: 'TIFF' },
        ],
      },
      {
        id: 'color',
        kind: 'segmented',
        label: isAr ? 'نظام الألوان' : 'Espace Colorimétrique',
        value: colorFilter,
        resetValue: 'All',
        onChange: setColorFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'CMJN', label: 'CMJN (Print)' },
          { value: 'RVB', label: 'RVB' },
        ],
      },
    ],
    [isAr, statusFilter, formatFilter, colorFilter, pmBatDeliverables]
  );

  const handleTogglePin = useCallback(
    (bat: PMBatDeliverable) => {
      setPinnedBatIds((prev) => {
        const next = new Set(prev);
        const wasPinned = next.has(bat.id);
        if (wasPinned) next.delete(bat.id);
        else next.add(bat.id);
        showToast(wasPinned ? 'BAT désépinglé' : 'BAT épinglé', 'info');
        return next;
      });
    },
    []
  );

  const handleSelectBat = useCallback((bat: PMBatDeliverable, originEl?: HTMLElement | null) => {
    if (originEl) setDrawerOpenerEl(originEl);
    setInspectedBat(bat);
  }, []);

  const handleExportBatCsv = useCallback(() => {
    const headers = [
      'Livrable',
      'Campagne',
      'Format',
      'Espace Couleur',
      'Résolution DPI',
      'Version',
      'Statut BAT',
    ];
    const rows = sortedDeliverables.map((b) => [
      b.title,
      b.projectTitle,
      b.fileFormat,
      b.colorSpace,
      b.resolutionDpi,
      b.versionCode,
      b.approvalStatus,
    ]);
    downloadCsvSafe(
      `livrables_bat_crea_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast('Export CSV des livrables BAT généré', 'info');
  }, [sortedDeliverables]);

  const batColumns = useMemo<ColumnDefinition<PMBatDeliverable>[]>(
    () => [
      {
        key: 'title',
        header: 'Fichier & Version BAT',
        width: '2.5*',
        minWidth: '220px',
        sortable: true,
        renderCell: (bat) => {
          const isPinned = pinnedBatIds.has(bat.id);
          return (
            <div className="flex items-center gap-2">
              <img
                src={bat.previewUrl}
                alt={bat.title}
                width={36}
                height={36}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-[var(--r-ctl-sm,10px)] object-cover shrink-0 bg-[#F3EDE7] dark:bg-[#2B2825]"
              />
              <div className="min-w-0">
                <div className="font-semibold t-small text-black dark:text-white truncate max-w-[190px] flex items-center gap-1">
                  {bat.title}
                  {isPinned && <Pin className="w-3 h-3 fill-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />}
                </div>
                <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                  {bat.versionCode} · {bat.fileFormat.toUpperCase()}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'project',
        header: 'Campagne',
        width: '2*',
        minWidth: '180px',
        sortable: true,
        renderCell: (bat) => (
          <div className="t-small text-black/70 dark:text-white/75 font-medium truncate max-w-[170px]">
            {bat.projectTitle}
          </div>
        ),
      },
      {
        key: 'specs',
        header: 'Spécifications Imprimeur',
        width: '1.8*',
        minWidth: '180px',
        renderCell: (bat) => (
          <div className="flex items-center gap-2 t-cap tabular-nums">
            <span
              className={`px-2 py-1 rounded-[var(--r-check,6px)] font-semibold ${
                bat.colorSpace === 'CMJN'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {bat.colorSpace}
            </span>
            <span className="text-black/55 dark:text-white/55">·</span>
            <span className="text-black/70 dark:text-white/75">{bat.resolutionDpi} DPI</span>
            <span className="text-black/55 dark:text-white/55">·</span>
            <span className="text-black/55 dark:text-white/55">+{bat.bleedMm}mm</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Statut Validation',
        width: '1.5*',
        minWidth: '150px',
        align: 'center',
        renderCell: (bat) => {
          const badge = getBatStatusBadge(bat.approvalStatus, language);
          return (
            <span className={`inline-flex px-2.5 py-1 rounded-[var(--r-check,6px)] t-small font-semibold ${badge.pillClass}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [pinnedBatIds, language]
  );

  const getRowMeta = useCallback(
    (bat: PMBatDeliverable): KineticRowMeta => {
      const badge = getBatStatusBadge(bat.approvalStatus, language);
      const branch = resolveRecordBranch(bat, branchesById, currentBranch, language);
      return {
        title: bat.title,
        subline: `${bat.projectTitle} · ${bat.versionCode}`,
        avatarText: bat.fileFormat.toUpperCase().slice(0, 2),
        categoryLabel: bat.fileFormat.toUpperCase(),
        statusLabel: badge.label,
        statusVariant: badge.variant,
        metricPrimary: `${bat.colorSpace} · ${bat.resolutionDpi} DPI`,
        metricSecondary: `Fond perdu +${bat.bleedMm}mm`,
        branchName: branch.name,
        isPinned: pinnedBatIds.has(bat.id),
        detailCol1: { heading: 'Colorimétrie', primaryText: bat.colorSpace },
        detailCol2: { heading: 'Résolution', primaryText: `${bat.resolutionDpi} DPI` },
        detailCol3: { heading: 'Fond Perdu', primaryText: `+${bat.bleedMm} mm` },
      };
    },
    [language, branchesById, currentBranch, pinnedBatIds]
  );

  const getFanActions = useCallback(
    (bat: PMBatDeliverable): KineticRowFanAction<PMBatDeliverable>[] => [
      {
        id: 'preview',
        label: isAr ? 'معاينة' : 'Aperçu',
        icon: <Eye size={13} />,
        onClick: () => setSelectedPreviewBat(bat),
      },
      ...(bat.approvalStatus !== 'approved'
        ? [
            {
              id: 'approve',
              label: isAr ? 'اعتماد' : 'Valider BAT',
              icon: <Check size={13} />,
              onClick: () => {
                reviewPmBatDeliverable(bat.id, 'approved');
              },
            },
          ]
        : []),
      {
        id: 'pin',
        label: pinnedBatIds.has(bat.id) ? 'Détacher' : 'Épingler',
        icon: <Pin size={13} />,
        onClick: () => handleTogglePin(bat),
      },
    ],
    [isAr, pinnedBatIds, reviewPmBatDeliverable, handleTogglePin]
  );

  const getDetailActions = useCallback(
    (bat: PMBatDeliverable): KineticDetailAction[] => [
      {
        id: 'preview',
        label: isAr ? 'فتح المعاينة' : 'Plein Écran',
        icon: <Eye size={14} />,
        onClick: () => setSelectedPreviewBat(bat),
      },
      {
        id: 'approve',
        label: isAr ? 'اعتماد BAT' : 'Valider BAT',
        icon: <CheckCircle size={14} />,
        onClick: () => {
          reviewPmBatDeliverable(bat.id, 'approved');
        },
      },
    ],
    [isAr, reviewPmBatDeliverable]
  );

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !artworkTitle) return;
    const nextVersion =
      pmBatDeliverables.filter((b) => b.projectId === selectedProject.id).length + 1;
    const nextTitle = artworkTitle.endsWith('.pdf') ? artworkTitle : `${artworkTitle}_v${nextVersion}.pdf`;
    const commitUpload = () => {
      addPmBatDeliverable({
        tenantId: 'acc_01',
        facilityId: 'branch_agency_main',
        projectId: selectedProject.id,
        projectTitle: selectedProject.title,
        printOrderId: selectedOrderId || undefined,
        title: nextTitle,
        fileFormat: fileFormat as PMBatDeliverable['fileFormat'],
        colorSpace: colorSpace as PMBatDeliverable['colorSpace'],
        resolutionDpi: Number(resolutionDpi) || 300,
        bleedMm: 3,
        hasBleedIncluded,
        version: nextVersion,
        versionCode: `v${nextVersion}`,
        previewUrl,
        fileSizeBytes: 35e6,
        uploadedByCreativeId: 'crea_lead_01',
        uploadedByCreativeName: 'Lina Hadj-Ali (Art Director)',
        approvalStatus: 'pending_review',
      });
      if (selectedOrderId) updatePmPrintOrderStatus(selectedOrderId, 'bat_in_progress');
    };
    if (selectedOrderId) {
      runUndoBatch(
        {
          vertical: 'project_milestone',
          operationType: 'create',
          summary: isAr
            ? `إيداع BAT: ${nextTitle}`
            : `Dépôt BAT : ${nextTitle}`,
          entityLabel: nextTitle,
        },
        commitUpload
      );
    } else {
      commitUpload();
    }
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setActiveTab('production');
    }, 1500);
    setArtworkTitle('');
  };

  const retainedPreviewBat = useRetainedModalValue(selectedPreviewBat);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: pmBatDeliverables.length > 0 || pmPrintOrders.length > 0,
  });

  if (
    showSkeleton &&
    ((pmBatDeliverables.length === 0 && pmPrintOrders.length === 0) ||
      networkMode === 'force_skeleton')
  ) {
    if (activeTab === 'kanban') {
      return (
        <SkeletonKanbanPipeline
          columnsCount={4}
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
      );
    }
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '140px' },
          { width: '1.2*', minWidth: '120px' },
          { width: '1.5*', minWidth: '140px' },
        ]}
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Palette size={22} />}
        title={
          activeTab === 'kanban'
            ? isAr
              ? 'كانبان'
              : 'Kanban'
            : activeTab === 'production'
            ? isAr
              ? 'الإنتاج'
              : isEn
              ? 'Production'
              : 'Production'
            : activeTab === 'upload'
            ? isAr
              ? 'رفع BAT'
              : isEn
              ? 'Upload BAT'
              : 'Dépôt BAT'
            : isAr
            ? 'الموجزات'
            : 'Briefs'
        }
        primaryAction={{
          label: isAr ? 'إيداع BAT' : isEn ? 'Upload Proof' : 'Déposer un BAT',
          icon: <UploadCloud size={15} />,
          onClick: () => setActiveTab('upload'),
          dataAction: 'upload-bat',
        }}
      />

      <div className="pb-1">
        <LiveSegmentedControl
          size="sm"
          value={activeTab}
          onValueChange={setActiveTab}
          options={[
            {
              value: 'kanban',
              label: isAr ? 'كانبان' : 'Kanban',
              tooltip: isAr ? 'لوحة الاستوديو' : isEn ? 'Studio Kanban' : 'Kanban Studio',
              icon: <Layers className="w-3.5 h-3.5 inline mr-1" />,
            },
            {
              value: 'production',
              label: isAr ? 'مخرجات' : isEn ? 'Deliverables' : 'Livrables',
              tooltip: isAr ? 'ملفات BAT' : isEn ? 'Artwork deliverables' : 'Livrables BAT',
              icon: <FileCheck2 className="w-3.5 h-3.5 inline mr-1" />,
              count: pmBatDeliverables.length,
            },
            {
              value: 'upload',
              label: isAr ? 'رفع' : isEn ? 'Upload' : 'Importer',
              tooltip: isAr ? 'رفع ملف مطابق' : isEn ? 'Compliant upload' : 'Uploader Conforme',
              icon: <UploadCloud className="w-3.5 h-3.5 inline mr-1" />,
            },
            {
              value: 'briefs',
              label: isAr ? 'موجزات' : 'Briefs',
              tooltip: isAr ? 'موجزات وتصاميم رئيسية' : isEn ? 'Briefs & KV' : 'Briefs & Key Visuals',
              icon: <FileText className="w-3.5 h-3.5 inline mr-1" />,
              count: pmProjects.length,
            },
          ]}
          aria-label="Creative Studio Subtab"
        />
      </div>

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات ما قبل الطباعة وملفات الاعتماد BAT'
            : isEn
            ? 'Pre-Press & BAT Deliverables'
            : 'Indicateurs Pré-Presse & Livrables BAT'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'ملفات BAT المصممة' : isEn ? 'Designed Proofs' : 'Livrables BAT Conçus',
          badgeText: `${pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length} ${isAr ? 'قيد المراجعة' : 'en revue'}`,
          count: pmBatDeliverables.length,
          tone: 'emerald',
          isActive: statusFilter === 'pending_review' && activeTab === 'production',
          onToggle: () => {
            setActiveTab('production');
            setStatusFilter((prev) => (prev === 'pending_review' ? 'all' : 'pending_review'));
          },
        }}
        secondaryCard={{
          label: isAr ? 'BAT المعتمدة للطباعة' : isEn ? 'Approved Proofs' : 'BAT Bons à Tirer Validés',
          badgeText: isAr ? 'جاهز للمطبعة' : 'Prêts imprimeur',
          count: pmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length,
          tone: 'terracotta',
          isActive: statusFilter === 'approved' && activeTab === 'production',
          onToggle: () => {
            setActiveTab('production');
            setStatusFilter((prev) => (prev === 'approved' ? 'all' : 'approved'));
          },
        }}
        darkCard={{
          label: isAr ? 'معيار القبول الطباعي' : isEn ? 'Pre-Press Compliance' : 'Norme Déblocage Imprimerie',
          badgeCount: 300,
          badgePrefix: 'CMJN · ',
          badgeSuffix: ' DPI',
          valueCount: cmjnCompliantPct,
          valuePrefix: '',
          valueSuffix: '%',
          caption: isAr ? 'هوامش قص +3 ملم معتمدة' : 'Fonds perdus +3mm certifiés',
        }}
      />

      {activeTab === 'kanban' && (
        <ScreenPod>
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="t-pod text-[var(--text-1)] dark:text-white">
              {isAr ? 'لوحة تنفيذ التصميم' : isEn ? 'Studio Kanban Pipeline' : 'Kanban Studio Créa'}
            </h2>
            <ListAdvancedMenuButton language={language} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div data-sq="pod" data-sq-border="none" className="p-3 bg-[#EFE9E2]/70 dark:bg-[#191716] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--atr-divider)]">
                <span className="t-small font-semibold text-black/70 dark:text-white/75">
                  1. Reçus du Chef de Projet
                </span>
                <span className="w-5 h-5 rounded-full bg-white dark:bg-[#2B2825] text-black/70 dark:text-white/75 tabular-nums t-small flex items-center justify-center font-semibold">
                  {pmPrintOrders.filter((o) => o.status === 'sent_to_crea').length}
                </span>
              </div>
              {pmPrintOrders
                .filter((o) => o.status === 'sent_to_crea')
                .map((order) => (
                  <div key={order.id} className="sq-elev-card sq-elev-card-hover">
                    <div
                      data-sq="card"
                      data-sq-border="none"
                      className="p-4 bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between t-cap">
                        <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                          {order.orderNumber}
                        </span>
                        <span className="text-black/55 dark:text-white/55">
                          {order.items.length} support(s)
                        </span>
                      </div>
                      <h4 className="t-small font-semibold text-black dark:text-white">
                        {order.projectTitle}
                      </h4>
                      <div className="t-cap text-black/55 dark:text-white/55">
                        {order.items.map((i) => i.itemTitle).join(', ')}
                      </div>
                      <AtriumButton
                        type="button"
                        size="xs"
                        variant="primary"
                        className="w-full"
                        icon={<UploadCloud className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setSelectedProjectId(order.projectId);
                          setActiveTab('upload');
                        }}
                      >
                        Créer le BAT →
                      </AtriumButton>
                    </div>
                  </div>
                ))}
            </div>

            <div data-sq="pod" data-sq-border="none" className="p-3 bg-[#EFE9E2]/70 dark:bg-[#191716] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--atr-divider)]">
                <span className="t-small font-semibold text-amber-600 dark:text-[#FFD166]">
                  2. En Revue CDP & Client
                </span>
                <span className="w-5 h-5 rounded-full bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] tabular-nums t-small flex items-center justify-center font-semibold">
                  {pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length}
                </span>
              </div>
              {pmBatDeliverables
                .filter((b) => b.approvalStatus === 'pending_review')
                .map((bat) => (
                  <div key={bat.id} className="sq-elev-card sq-elev-card-hover">
                    <div
                      onClick={(e) => handleSelectBat(bat, e.currentTarget)}
                      data-sq="card"
                      data-sq-border="none"
                      className="p-4 bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] space-y-2 cursor-pointer transition-colors"
                    >
                      <img
                        src={bat.previewUrl}
                        alt={bat.title}
                        width={256}
                        height={112}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        data-sq="ctl"
                        data-sq-border="none"
                        className="w-full h-28 object-cover bg-[#F3EDE7] dark:bg-[#2B2825]"
                      />
                      <div className="flex items-center justify-between t-cap">
                        <span className="font-semibold text-black dark:text-white truncate">
                          {bat.title}
                        </span>
                        <span className="tabular-nums text-black/55 dark:text-white/55">
                          {bat.versionCode}
                        </span>
                      </div>
                      <p className="t-cap text-black/55 dark:text-white/55">
                        {bat.projectTitle}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            <div data-sq="pod" data-sq-border="none" className="p-3 bg-[#EFE9E2]/70 dark:bg-[#191716] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--atr-divider)]">
                <span className="t-small font-semibold text-emerald-600 dark:text-[#4ADE80]">
                  3. BAT Prêt Imprimeur
                </span>
                <span className="w-5 h-5 rounded-full bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] tabular-nums t-small flex items-center justify-center font-semibold">
                  {pmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length}
                </span>
              </div>
              {pmBatDeliverables
                .filter((b) => b.approvalStatus === 'approved')
                .map((bat) => (
                  <div key={bat.id} className="sq-elev-card sq-elev-card-hover">
                    <div
                      onClick={(e) => handleSelectBat(bat, e.currentTarget)}
                      data-sq="card"
                      data-sq-border="none"
                      className="p-4 bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] space-y-2 cursor-pointer transition-colors"
                    >
                      <img
                        src={bat.previewUrl}
                        alt={bat.title}
                        width={256}
                        height={112}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        data-sq="ctl"
                        data-sq-border="none"
                        className="w-full h-28 object-cover bg-[#F3EDE7] dark:bg-[#2B2825]"
                      />
                      <div className="flex items-center justify-between t-cap">
                        <span className="font-semibold text-emerald-700 dark:text-[#4ADE80] truncate">
                          {bat.title}
                        </span>
                        <span className="tabular-nums text-emerald-600 dark:text-[#4ADE80]">{bat.versionCode}</span>
                      </div>
                      <div className="t-cap text-black/55 dark:text-white/55">
                        Conforme CMJN 300 DPI · Prêt pour déblocage imprimeur.
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </ScreenPod>
      )}

      {activeTab === 'production' && (
        <>
          <ScreenPod>
            <ScreenCollectionToolbar
              title={
                isAr
                  ? 'ملفات التنفيذ واعتماد BAT'
                  : isEn
                  ? 'Studio Deliverables & Print Proofs'
                  : 'Livrables Studio & Contrôle Pré-Presse'
              }
              liveRegionText={`${sortedDeliverables.length} livrables`}
              language={language}
              searchQuery={creaSearch}
              onSearchChange={setCreaSearch}
              searchPlaceholder="Rechercher par livrable, campagne ou format..."
              statusOptions={[
                { value: 'all', label: isAr ? 'الكل' : 'Tous', count: pmBatDeliverables.length },
                {
                  value: 'pending_review',
                  label: isAr ? 'قيد المراجعة' : 'En Revue',
                  count: pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length,
                },
                {
                  value: 'approved',
                  label: isAr ? 'معتمد' : 'Validés',
                  count: pmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length,
                },
              ]}
              statusValue={statusFilter}
              onStatusChange={setStatusFilter}
              hasActiveAdvancedFilters={activeFiltersCount > 0}
              activeFiltersCount={activeFiltersCount}
              isFilterModalOpen={isFilterModalOpen}
              filterButtonRef={filterBtnRef}
              onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showViewToggle
              onExport={handleExportBatCsv}
              activeChips={activeChips}
              onResetAllFilters={resetFilters}
            />

            <UniversalDataCollection<PMBatDeliverable>
              hideToolbar
              items={sortedDeliverables}
              keyExtractor={(b) => b.id}
              viewMode={viewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
              columns={batColumns}
              sortBy={batSortBy}
              sortDirection={batSortDir}
              onSortChange={(key, dir) => {
                setBatSortBy(key);
                setBatSortDir(dir);
              }}
              selectedIds={selectedBatIds}
              onSelectionChange={setSelectedBatIds}
              openItemId={activeInspectedBat?.id ?? null}
              isPinned={(b) => pinnedBatIds.has(b.id)}
              onTogglePin={handleTogglePin}
              onItemClick={handleSelectBat}
              onViewDetails={handleSelectBat}
              bulkSecondaryAction={{
                label: 'Valider BAT',
                icon: <CheckCircle size={14} />,
                onClick: (ids) => {
                  batchReviewPmBatDeliverables(Array.from(ids), 'approved');
                  setSelectedBatIds(new Set<string>());
                },
              }}
              onBulkDelete={(ids) => {
                batchDeletePmBatDeliverables(Array.from(ids));
                setSelectedBatIds(new Set<string>());
                if (activeInspectedBat && ids.has(activeInspectedBat.id)) setInspectedBat(null);
              }}
              getRowMeta={getRowMeta}
              getFanActions={getFanActions}
              getDetailActions={getDetailActions}
              emptyTitle="Aucun livrable BAT"
              emptyDescription="Déposez un fichier CMJN 300 DPI pour démarrer le circuit de validation."
              primaryActionLabel="Déposer un BAT"
              onAddFirstItem={() => setActiveTab('upload')}
              onResetFilters={resetFilters}
              hasActiveFilters={creaSearch.length > 0 || activeFiltersCount > 0}
              renderCard={(bat) => (
                <div className="flex flex-col justify-between h-full space-y-3">
                  <div className="space-y-2">
                    <div
                      data-sq="ctl"
                      data-sq-border="none"
                      className="w-full h-36 bg-[#F3EDE7] dark:bg-[#2B2825] overflow-hidden"
                    >
                      <img
                        src={bat.previewUrl}
                        alt={bat.title}
                        width={280}
                        height={144}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between items-center t-cap">
                      <span className="font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{bat.versionCode}</span>
                      <span className="tabular-nums text-black/55 dark:text-white/55">
                        {bat.fileFormat.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="t-label font-semibold text-black dark:text-white line-clamp-1">
                      {bat.title}
                    </h4>
                    <p className="t-cap text-black/55 dark:text-white/55 line-clamp-1">
                      {bat.projectTitle}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--atr-divider)] flex items-center justify-between t-cap tabular-nums">
                    <span>
                      {bat.colorSpace} · {bat.resolutionDpi} DPI
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPreviewBat(bat);
                      }}
                      className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold hover:underline cursor-pointer"
                    >
                      Inspecter →
                    </button>
                  </div>
                </div>
              )}
            />
          </ScreenPod>

          <KineticFilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            triggerRef={filterBtnRef}
            language={language}
            displayCount={sortedDeliverables.length}
            entityPluralLabel={isAr ? 'ملفات BAT' : 'livrables BAT'}
            hasActiveFilters={activeFiltersCount > 0}
            onResetFilters={resetFilters}
            sections={filterSections}
          />
        </>
      )}

      {activeTab === 'upload' && (
        <ScreenPod>
          <div className="sq-elev-card max-w-3xl mx-auto">
            <div
              data-sq="card"
              data-sq-border="none"
              className="p-6 bg-white dark:bg-[#22201E] space-y-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                    Dépôt & Conformité Pré-Presse
                  </span>
                  <h2 className="t-dialog font-semibold text-black dark:text-white mt-1">
                    Validation Technique des Fichiers Imprimeur
                  </h2>
                </div>
                <ListAdvancedMenuButton language={language} />
              </div>
              {uploadSuccess && (
                <div
                  data-sq="ctl"
                  data-sq-border="none"
                  className="p-4 bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] flex items-center gap-3 t-small font-semibold"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-[#4ADE80]" />
                  Livrable BAT enregistré et transmis au Chef de Projet !
                </div>
              )}
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <LabelSelect
                field="Project"
                label="Projet / Campagne"
                value={selectedProjectId}
                onChange={(val) =>
                  setSelectedProjectId(typeof val === 'string' ? val : val.target?.value || val)
                }
                options={pmProjects.map((p) => ({
                  value: p.id,
                  label: `${p.title} (${p.clientName})`,
                }))}
                height={46}
                corner={12}
              />
              <LabelInput
                field="ArtworkTitle"
                label="Nom du Fichier d'Exécution"
                placeholder="Ex: ROLLUP_OOREDOO_85x200_BAT"
                value={artworkTitle}
                onChange={setArtworkTitle}
                required
                height={46}
                corner={12}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FilterSelect
                  label="Format Fichier"
                  value={fileFormat}
                  onChange={(val) =>
                    setFileFormat(typeof val === 'string' ? val : val.target?.value || val)
                  }
                  options={[
                    { value: 'pdf', label: 'PDF', tooltip: 'PDF Haute Résolution' },
                    { value: 'ai', label: 'Illustrator', tooltip: 'Adobe Illustrator (.ai)' },
                    { value: 'psd', label: 'Photoshop', tooltip: 'Photoshop (.psd)' },
                    { value: 'tiff', label: 'TIFF', tooltip: 'TIFF Pré-presse' },
                  ]}
                />
                <FilterSelect
                  label="Espace Colorimétrique"
                  value={colorSpace}
                  onChange={(val) =>
                    setColorSpace(typeof val === 'string' ? val : val.target?.value || val)
                  }
                  options={[
                    { value: 'CMJN', label: 'CMJN', tooltip: 'CMJN (Quadrichromie)' },
                    { value: 'RVB', label: 'RVB', tooltip: 'RVB (Rejeté imprimeur)' },
                  ]}
                />
                <LabelInput
                  field="Resolution"
                  label="Résolution (DPI)"
                  type="number"
                  value={resolutionDpi}
                  onChange={setResolutionDpi}
                  required
                  height={46}
                  corner={12}
                />
              </div>
              <div
                data-sq="ctl"
                data-sq-border="none"
                className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] flex items-center justify-between t-cap"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-black dark:text-white">
                    Fond Perdu & Traits de Coupe (+3mm)
                  </span>
                  <p className="t-cap text-black/55 dark:text-white/55">
                    Indispensable pour éviter tout liseré blanc au massicotage.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hasBleedIncluded}
                  onChange={(e) => setHasBleedIncluded(e.target.checked)}
                  className="w-4 h-4 rounded-[var(--r-check,6px)] accent-[#d4522f] cursor-pointer"
                />
              </div>
              <AtriumButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center"
                disabled={colorSpace !== 'CMJN' || Number(resolutionDpi) < 300 || !hasBleedIncluded}
                icon={<UploadCloud className="w-4 h-4" />}
              >
                Valider la Conformité & Déposer le BAT
              </AtriumButton>
            </form>
            </div>
          </div>
        </ScreenPod>
      )}

      {activeTab === 'briefs' && (
        <ScreenPod>
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="t-pod text-[var(--text-1)] dark:text-white">
              {isAr ? 'موجزات المشاريع الإبداعية' : isEn ? 'Creative Project Briefs' : 'Briefs Créatifs & KV'}
            </h2>
            <ListAdvancedMenuButton language={language} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pmProjects.map((p) => (
              <div key={p.id} className="sq-elev-card">
                <div
                  data-sq="card"
                  data-sq-border="none"
                  className="p-5 bg-white dark:bg-[#22201E] space-y-3 h-full"
                >
                  <div className="flex items-center justify-between t-cap">
                    <span className="font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{p.clientName}</span>
                    <span className="tabular-nums text-black/55 dark:text-white/55">
                      Échéance KV: {p.kvDeadline}
                    </span>
                  </div>
                  <h3 className="t-label font-semibold text-black dark:text-white">{p.title}</h3>
                  <p className="t-cap text-black/70 dark:text-white/75 line-clamp-3">
                    {p.scopeOfWork}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScreenPod>
      )}

      <KineticSlideOverInspector<PMBatDeliverable>
        isOpen={Boolean(activeInspectedBat)}
        item={activeInspectedBat}
        allItems={sortedDeliverables}
        keyExtractor={(b) => b.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeInspectedBat?.title || ''}
        subtitle={
          activeInspectedBat
            ? `${activeInspectedBat.projectTitle} · ${activeInspectedBat.versionCode}`
            : ''
        }
        avatarText={activeInspectedBat?.fileFormat.toUpperCase().slice(0, 2) || 'BT'}
        categoryLabel={activeInspectedBat?.fileFormat.toUpperCase()}
        branchName={
          activeInspectedBat
            ? resolveRecordBranch(activeInspectedBat, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeInspectedBat
            ? getBatStatusBadge(activeInspectedBat.approvalStatus, language).label
            : undefined
        }
        statusClassName={
          activeInspectedBat
            ? getBatStatusBadge(activeInspectedBat.approvalStatus, language).pillClass
            : undefined
        }
        tabs={[{ id: 'overview', label: isAr ? 'التفاصيل التقنية' : 'Fiche Pré-Presse' }]}
        activeTab="overview"
        onSelectItem={(b) => handleSelectBat(b)}
        onClose={() => setInspectedBat(null)}
        renderBody={(bat) => (
          <>
            <InspectorSection index={0}>
              <img
                src={bat.previewUrl}
                alt={bat.title}
                width={384}
                height={176}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover rounded-[var(--r-card,16px)] bg-[#F3EDE7] dark:bg-[#2B2825]"
              />
            </InspectorSection>

            <InspectorSection index={1} title="Actions Rapides">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'approve',
                    label: 'Valider BAT',
                    icon: <CheckCircle className="w-[18px] h-[18px]" />,
                    primary: true,
                    disabled: bat.approvalStatus === 'approved',
                    onClick: () => {
                      reviewPmBatDeliverable(bat.id, 'approved');
                    },
                  },
                  {
                    id: 'revision',
                    label: 'Correction',
                    icon: <ShieldAlert className="w-[18px] h-[18px]" />,
                    onClick: () => {
                      reviewPmBatDeliverable(
                        bat.id,
                        'revision_requested',
                        'Reprise traits de coupe / contraste requise.'
                      );
                    },
                  },
                  {
                    id: 'fullscreen',
                    label: 'Plein Écran',
                    icon: <Eye className="w-[18px] h-[18px]" />,
                    onClick: () => setSelectedPreviewBat(bat),
                  },
                ]}
              />
            </InspectorSection>

            <InspectorSection index={2}>
              <InspectorBigStat
                value={`${bat.colorSpace} · ${bat.resolutionDpi} DPI`}
                tone={bat.colorSpace === 'CMJN' && bat.resolutionDpi >= 300 ? 'ok' : 'danger'}
                caption={`Fond perdu +${bat.bleedMm}mm · ${bat.versionCode}`}
              />
            </InspectorSection>

            <InspectorSection index={3} title="Spécifications Pré-Presse">
              <InspectorCard>
                <InspectorKeyValue label="Campagne" value={bat.projectTitle} mono={false} />
                <InspectorKeyValue label="Format" value={bat.fileFormat.toUpperCase()} />
                <InspectorKeyValue label="Espace Couleur" value={bat.colorSpace} tone={bat.colorSpace === 'CMJN' ? 'ok' : 'danger'} />
                <InspectorKeyValue label="Résolution" value={`${bat.resolutionDpi} DPI`} />
                <InspectorKeyValue label="Directeur Créa" value={bat.uploadedByCreativeName} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>

            <InspectorSection index={4}>
              <InspectorWideButton
                label="Ouvrir l'Aperçu Haute Définition"
                icon={<Eye size={15} />}
                tone="dark"
                onClick={() => setSelectedPreviewBat(bat)}
              />
            </InspectorSection>
          </>
        )}
      />

      <KineticModalShell
        isOpen={Boolean(selectedPreviewBat)}
        onClose={() => setSelectedPreviewBat(null)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {retainedPreviewBat && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="t-label font-semibold text-black dark:text-white">
                  {retainedPreviewBat.title}
                </h3>
                <span className="t-cap text-black/55 dark:text-white/55">
                  {retainedPreviewBat.projectTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewBat(null)}
                data-sq="ctl-sm"
                className="p-1 hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={retainedPreviewBat.previewUrl}
              alt={retainedPreviewBat.title}
              width={512}
              height={320}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-80 object-cover rounded-[var(--r-ctl,12px)] bg-[#F3EDE7] dark:bg-[#2B2825]"
            />
            <div className="flex justify-between items-center t-cap tabular-nums text-black/55 dark:text-white/55">
              <span>
                {retainedPreviewBat.colorSpace} · {retainedPreviewBat.resolutionDpi} DPI
              </span>
              <span>Fond perdu : +{retainedPreviewBat.bleedMm}mm</span>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <button
                type="button"
                onClick={() => setSelectedPreviewBat(null)}
                data-sq="ctl"
                className="px-4 py-2 t-small font-semibold text-black/70 dark:text-white/75 bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B] transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMBatDeliverable } from '../../../types/index';
import {
  Palette,
  UploadCloud,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck2,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  FileText,
  Lock,
  Download,
  Eye,
  Building2,
  ChevronDown,
  Pin,
  Trash2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

interface ProjectCreaViewProps {
  initialTab?: 'demandes' | 'kanban' | 'production' | 'upload' | 'briefs';
}

export const ProjectCreaView: React.FC<ProjectCreaViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    pmProjects,
    pmPrintOrders,
    pmBatDeliverables,
    addPmBatDeliverable,
    updatePmPrintOrderStatus,
    reviewPmBatDeliverable,
    batchReviewPmBatDeliverables,
    batchDeletePmBatDeliverables,
    resetPmMockData,
    activePmSubScreen,
    setActivePmSubScreen,
  } = useAtriumStore();

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!pmBatDeliverables || pmBatDeliverables.length === 0) {
      resetPmMockData();
    }
  }, [pmBatDeliverables, resetPmMockData]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const activeTab: 'demandes' | 'kanban' | 'production' | 'upload' | 'briefs' =
    activePmSubScreen === 'upload' || activePmSubScreen === 'livrables' || initialTab === 'upload'
      ? 'upload'
      : activePmSubScreen === 'production' || initialTab === 'production'
      ? 'production'
      : activePmSubScreen === 'briefs' || initialTab === 'briefs'
      ? 'briefs'
      : activePmSubScreen === 'demandes' || initialTab === 'demandes'
      ? 'demandes'
      : 'kanban';

  const setActiveTab = (tab: 'demandes' | 'kanban' | 'production' | 'upload' | 'briefs') => {
    setActivePmSubScreen(tab);
  };

  const [selectedProjectId, setSelectedProjectId] = useState(pmProjects[0]?.id || '');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedPreviewBat, setSelectedPreviewBat] = useState<PMBatDeliverable | null>(null);

  // Uploader form state with mandatory technical validation
  const [artworkTitle, setArtworkTitle] = useState('');
  const [fileFormat, setFileFormat] = useState<'pdf' | 'ai' | 'psd' | 'tiff'>('pdf');
  const [colorSpace, setColorSpace] = useState<'CMJN' | 'RVB'>('CMJN');
  const [resolutionDpi, setResolutionDpi] = useState('300');
  const [hasBleedIncluded, setHasBleedIncluded] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [creaSearch, setCreaSearch] = useState('');

  // Universal Data Collection state for deliverables
  const [selectedBatIds, setSelectedBatIds] = useState<Set<string>>(new Set());
  const [pinnedBatIds, setPinnedBatIds] = useState<Set<string>>(new Set());
  const [batSortBy, setBatSortBy] = useState('title');
  const [batSortDir, setBatSortDir] = useState<'asc' | 'desc'>('asc');

  const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];

  const filteredDeliverables = useMemo(() => {
    return pmBatDeliverables.filter((b) => {
      const q = creaSearch.toLowerCase().trim();
      return (
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.projectTitle.toLowerCase().includes(q) ||
        b.fileFormat.toLowerCase().includes(q)
      );
    });
  }, [pmBatDeliverables, creaSearch]);

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

  // Deliverables Table Columns
  const batColumns: ColumnDefinition<PMBatDeliverable>[] = useMemo(
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
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedBatIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(bat.id)) next.delete(bat.id);
                    else next.add(bat.id);
                    return next;
                  });
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-zinc-300 hover:text-zinc-500'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <img src={bat.previewUrl} alt={bat.title} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[190px]">
                  {bat.title}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
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
          <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[170px]">
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
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className={`px-1.5 py-0.5 rounded font-bold ${bat.colorSpace === 'CMJN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-700'}`}>
              {bat.colorSpace}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-600 dark:text-zinc-400">{bat.resolutionDpi} DPI</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">+{bat.bleedMm}mm</span>
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
          const statusMap: Record<string, { label: string; bg: string; text: string }> = {
            approved: { label: 'Validé BAT', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300' },
            revision_requested: { label: 'Corrections', bg: 'bg-red-100 dark:bg-red-950/60', text: 'text-red-800 dark:text-red-300' },
            pending_review: { label: 'En Revue CDP', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
          };
          const badge = statusMap[bat.approvalStatus] || { label: bat.approvalStatus, bg: 'bg-zinc-100', text: 'text-zinc-600' };
          return (
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Aperçu',
        width: '1*',
        minWidth: '100px',
        align: 'right',
        renderCell: (bat) => (
          <button
            type="button"
            onClick={() => setSelectedPreviewBat(bat)}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer ml-auto"
            title="Inspecter le BAT"
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
    ],
    [pinnedBatIds]
  );

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !artworkTitle) return;

    const existingVersionCount = pmBatDeliverables.filter(
      (b) => b.projectId === selectedProject.id
    ).length;
    const nextVersion = existingVersionCount + 1;

    addPmBatDeliverable({
      tenantId: 'acc_01',
      facilityId: 'branch_agency_main',
      projectId: selectedProject.id,
      projectTitle: selectedProject.title,
      printOrderId: selectedOrderId || undefined,
      title: artworkTitle.endsWith('.pdf') ? artworkTitle : `${artworkTitle}_v${nextVersion}.pdf`,
      fileFormat,
      colorSpace,
      resolutionDpi: Number(resolutionDpi) || 300,
      bleedMm: 3,
      hasBleedIncluded,
      version: nextVersion,
      versionCode: `v${nextVersion}`,
      previewUrl: previewUrl || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80',
      fileSizeBytes: 35000000,
      uploadedByCreativeId: 'crea_lead_01',
      uploadedByCreativeName: 'Lina Hadj-Ali (Art Director)',
      approvalStatus: 'pending_review',
    });

    if (selectedOrderId) {
      updatePmPrintOrderStatus(selectedOrderId, 'bat_in_progress');
    }

    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setActiveTab('production');
    }, 1800);
    setArtworkTitle('');
  };

  const handleExportBatCsv = () => {
    const headers = ['Livrable', 'Campagne', 'Format', 'Espace Couleur', 'Résolution DPI', 'Version', 'Statut BAT'];
    const rows = sortedDeliverables.map((b) => [
      `"${b.title}"`,
      `"${b.projectTitle.replace(/"/g, '""')}"`,
      b.fileFormat,
      b.colorSpace,
      b.resolutionDpi,
      b.versionCode,
      b.approvalStatus,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `livrables_bat_crea_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Facility Dropdown & Demo Data */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              Studio Créa
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Conception Graphique & Pré-Presse</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'kanban'
              ? 'Tableau Kanban des Créations'
              : activeTab === 'production'
              ? 'Livrables & Fichiers BAT'
              : activeTab === 'upload'
              ? 'Dépôt & Conformité Technique'
              : 'Demandes & Briefs Reçus'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Facility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-750 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span>{currentBranch?.name || 'NCH Cyberpark Tower B'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isBranchDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1.5 z-50">
                {branches && branches.length > 0 ? (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      {b.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">NCH Cyberpark Tower B</div>
                )}
              </div>
            )}
          </div>

          {/* Demo Data Recharge Button */}
          <button
            onClick={() => resetPmMockData()}
            title="Recharger les livrables créatifs"
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
            <span>Demo Data</span>
          </button>

          {/* New Deliverable Upload Button */}
          <button
            onClick={() => setActiveTab('upload')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Déposer un BAT</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'kanban', label: 'Kanban Studio', icon: Layers },
          { id: 'production', label: 'Livrables BAT (Collection)', icon: FileCheck2, count: pmBatDeliverables.length },
          { id: 'upload', label: 'Uploader Conforme', icon: UploadCloud },
          { id: 'briefs', label: 'Briefs & Key Visuals', icon: FileText, count: pmProjects.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#C4785A] text-[#C4785A]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: KANBAN STUDIO */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Commandes Reçues */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                1. Reçus du Chef de Projet
              </span>
              <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-xs flex items-center justify-center font-bold">
                {pmPrintOrders.filter((o) => o.status === 'sent_to_crea').length}
              </span>
            </div>
            {pmPrintOrders
              .filter((o) => o.status === 'sent_to_crea')
              .map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[#C4785A]">{order.orderNumber}</span>
                    <span className="text-zinc-400">{order.items.length} support(s)</span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {order.projectTitle}
                  </h4>
                  <div className="text-[11px] text-zinc-500">
                    {order.items.map((i) => i.itemTitle).join(', ')}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setSelectedProjectId(order.projectId);
                      setActiveTab('upload');
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Créer le BAT ➔
                  </button>
                </div>
              ))}
          </div>

          {/* Column 2: BAT en Revue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                2. En Revue CDP & Client
              </span>
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-xs flex items-center justify-center font-bold">
                {pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length}
              </span>
            </div>
            {pmBatDeliverables
              .filter((b) => b.approvalStatus === 'pending_review')
              .map((bat) => (
                <div
                  key={bat.id}
                  className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2.5"
                >
                  <img src={bat.previewUrl} alt={bat.title} className="w-full h-28 rounded-xl object-cover" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{bat.title}</span>
                    <span className="font-mono text-zinc-400">{bat.versionCode}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">{bat.projectTitle}</p>
                </div>
              ))}
          </div>

          {/* Column 3: Bon à Tirer Validé */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                3. BAT Prêt Imprimeur
              </span>
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs flex items-center justify-center font-bold">
                {pmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length}
              </span>
            </div>
            {pmBatDeliverables
              .filter((b) => b.approvalStatus === 'approved')
              .map((bat) => (
                <div
                  key={bat.id}
                  className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs space-y-2.5"
                >
                  <img src={bat.previewUrl} alt={bat.title} className="w-full h-28 rounded-xl object-cover" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{bat.title}</span>
                    <span className="font-mono text-emerald-600">{bat.versionCode}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Conforme CMJN 300 DPI · Prêt pour déblocage imprimeur.
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIVRABLES BAT (UniversalDataCollection) */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <Seek
              value={creaSearch}
              onChange={setCreaSearch}
              placeholder="Rechercher par livrable, campagne ou format..."
              openWidth={360}
              shutSize={38}
            />

            <button
              onClick={handleExportBatCsv}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {selectedBatIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#C4785A]/10 border border-[#C4785A]/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#C4785A]">
                <span>{selectedBatIds.size} livrable(s) sélectionné(s)</span>
                <button
                  type="button"
                  onClick={() => setSelectedBatIds(new Set())}
                  className="text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                >
                  Désélectionner
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchReviewPmBatDeliverables(Array.from(selectedBatIds), 'approved');
                    setSelectedBatIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer"
                >
                  Valider Bon à Tirer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchDeletePmBatDeliverables(Array.from(selectedBatIds));
                    setSelectedBatIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          )}

          <UniversalDataCollection<PMBatDeliverable>
            items={sortedDeliverables}
            keyExtractor={(b) => b.id}
            defaultViewMode="list"
            columns={batColumns}
            sortBy={batSortBy}
            sortDirection={batSortDir}
            onSortChange={(key) => {
              if (batSortBy === key) {
                setBatSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setBatSortBy(key);
                setBatSortDir('asc');
              }
            }}
            selectedIds={selectedBatIds}
            onSelectionChange={setSelectedBatIds}
            renderCard={(bat) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-2">
                  <img
                    src={bat.previewUrl}
                    alt={bat.title}
                    className="w-full h-36 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800"
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#C4785A]">{bat.versionCode}</span>
                    <span className="font-mono text-zinc-400">{bat.fileFormat.toUpperCase()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {bat.title}
                  </h4>
                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {bat.projectTitle}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
                  <span>{bat.colorSpace} · {bat.resolutionDpi} DPI</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewBat(bat)}
                    className="text-[#C4785A] font-semibold hover:underline cursor-pointer"
                  >
                    Inspecter ➔
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 3: UPLOADER CONFORME AVEC REGLES PRE-PRESSE */}
      {activeTab === 'upload' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-3xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider block">
              Dépôt & Conformité Pré-Presse (Slide 8)
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Validation Technique des Fichiers Imprimeur
            </h2>
            <p className="text-xs text-zinc-500">
              Verrouillage strict : les fichiers doivent être en CMJN natif, minimum 300 DPI avec 3mm de fond perdu.
            </p>
          </div>

          {uploadSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Livrable BAT enregistré et transmis au Chef de Projet !
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <LabelSelect
              field="Project"
              label="Projet / Campagne"
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(typeof val === 'string' ? val : val.target?.value || val)}
              options={pmProjects.map((p) => ({ value: p.id, label: `${p.title} (${p.clientName})` }))}
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
                onChange={(val) => setFileFormat((typeof val === 'string' ? val : val.target?.value || val) as any)}
                options={[
                  { value: 'pdf', label: 'PDF Haute Résolution' },
                  { value: 'ai', label: 'Adobe Illustrator (.ai)' },
                  { value: 'psd', label: 'Photoshop (.psd)' },
                  { value: 'tiff', label: 'TIFF Pré-presse' },
                ]}
              />

              <FilterSelect
                label="Espace Colorimétrique"
                value={colorSpace}
                onChange={(val) => setColorSpace((typeof val === 'string' ? val : val.target?.value || val) as any)}
                options={[
                  { value: 'CMJN', label: 'CMJN (Quadrichromie)' },
                  { value: 'RVB', label: 'RVB (Rejeté imprimeur)' },
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

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Fond Perdu & Traits de Coupe (+3mm)
                </span>
                <p className="text-[11px] text-zinc-500">
                  Indispensable pour éviter tout liseré blanc au massicotage.
                </p>
              </div>
              <input
                type="checkbox"
                checked={hasBleedIncluded}
                onChange={(e) => setHasBleedIncluded(e.target.checked)}
                className="w-4 h-4 rounded text-[#C4785A] focus:ring-[#C4785A]"
              />
            </div>

            <button
              type="submit"
              disabled={colorSpace !== 'CMJN' || Number(resolutionDpi) < 300 || !hasBleedIncluded}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] disabled:opacity-40 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              Valider la Conformité & Déposer le BAT
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: BRIEFS & KEY VISUALS */}
      {activeTab === 'briefs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pmProjects.map((p) => (
            <div
              key={p.id}
              className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#C4785A] uppercase">{p.clientName}</span>
                <span className="font-mono text-zinc-400">Échéance KV: {p.kvDeadline}</span>
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {p.title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
                {p.scopeOfWork}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Preview Modal */}
      {selectedPreviewBat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedPreviewBat.title}
                </h3>
                <span className="text-xs text-zinc-400">{selectedPreviewBat.projectTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewBat(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <img
              src={selectedPreviewBat.previewUrl}
              alt={selectedPreviewBat.title}
              className="w-full h-80 object-cover rounded-xl border border-zinc-200 dark:border-zinc-800"
            />

            <div className="flex justify-between items-center text-xs font-mono text-zinc-500">
              <span>{selectedPreviewBat.colorSpace} · {selectedPreviewBat.resolutionDpi} DPI</span>
              <span>Fond perdu : +{selectedPreviewBat.bleedMm}mm</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedPreviewBat(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

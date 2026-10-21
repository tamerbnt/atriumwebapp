import React, { useState } from 'react';
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
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

interface ProjectCreaViewProps {
  initialTab?: 'demandes' | 'kanban' | 'production' | 'upload' | 'briefs';
}

export const ProjectCreaView: React.FC<ProjectCreaViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    pmProjects,
    pmPrintOrders,
    pmBatDeliverables,
    addPmBatDeliverable,
    updatePmPrintOrderStatus,
    reviewPmBatDeliverable,
    activePmSubScreen,
    setActivePmSubScreen,
  } = useAtriumStore();

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

  const [returnedToCdpSuccess, setReturnedToCdpSuccess] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState(pmProjects[0]?.id || '');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Uploader form state with mandatory technical validation
  const [artworkTitle, setArtworkTitle] = useState('');
  const [fileFormat, setFileFormat] = useState<'pdf' | 'ai' | 'psd' | 'tiff'>('pdf');
  const [colorSpace, setColorSpace] = useState<'CMJN' | 'RVB'>('CMJN');
  const [resolutionDpi, setResolutionDpi] = useState('300');
  const [hasBleedIncluded, setHasBleedIncluded] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [creaSearch, setCreaSearch] = useState('');

  const filteredPmProjects = pmProjects.filter(
    (p) => !creaSearch.trim() || p.title.toLowerCase().includes(creaSearch.toLowerCase()) || p.clientName.toLowerCase().includes(creaSearch.toLowerCase())
  );
  const filteredPmPrintOrders = pmPrintOrders.filter(
    (o) => !creaSearch.trim() || o.projectTitle.toLowerCase().includes(creaSearch.toLowerCase()) || o.orderNumber.toLowerCase().includes(creaSearch.toLowerCase())
  );
  const filteredPmBatDeliverables = pmBatDeliverables.filter(
    (b) => !creaSearch.trim() || b.title.toLowerCase().includes(creaSearch.toLowerCase()) || b.projectTitle.toLowerCase().includes(creaSearch.toLowerCase())
  );

  const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];

  // Kanban Tasks derived from Print Orders and Project Briefs
  const kanbanColumns = [
    {
      id: 'received',
      title: t('pm_crea_kanban_received'),
      badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    },
    {
      id: 'in_progress',
      title: t('pm_crea_kanban_in_progress'),
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
      id: 'ready_bat',
      title: t('pm_crea_kanban_ready_bat'),
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
  ];

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
      setActiveTab('kanban');
    }, 1800);
    setArtworkTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              {t('pm_role_crea_badge')}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">{t('pm_role_crea_sub')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'kanban'
              ? t('pm_crea_tab_kanban')
              : activeTab === 'upload'
              ? t('pm_crea_tab_upload')
              : activeTab === 'production'
              ? t('pm_crea_tab_production')
              : activeTab === 'briefs'
              ? t('pm_crea_tab_briefs')
              : t('pm_crea_tab_demandes')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={creaSearch}
            onChange={setCreaSearch}
            placeholder={t('common_search')}
            openWidth={260}
            shutSize={38}
          />
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'kanban', label: t('pm_crea_tab_kanban'), icon: Layers },
          { id: 'demandes', label: t('pm_crea_tab_demandes'), icon: Clock, count: filteredPmProjects.length },
          { id: 'production', label: t('pm_crea_tab_production'), icon: Palette, count: filteredPmPrintOrders.length },
          { id: 'upload', label: t('pm_crea_tab_upload'), icon: UploadCloud },
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
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SCREEN 3.1 & 3.2: KANBAN BOARD WITH SLIDE 7 LIVRABLE PRÊT INSPECTOR */}
      {(activeTab === 'kanban' || activeTab === 'demandes' || activeTab === 'production') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: 3-Column Production Board */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Received Briefs & Print Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  Reçues
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {filteredPmPrintOrders.filter((o) => o.status === 'sent_to_crea').length + filteredPmProjects.length}
                </span>
              </div>

              <div className="space-y-3">
                {filteredPmProjects.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2 hover:border-[#C4785A]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C4785A]/15 text-[#C4785A]">
                        BRIEF · KV
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">{p.startDate}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                        {p.scopeOfWork}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 text-[10px]">{p.clientName}</span>
                      <span className="text-[#C4785A] font-semibold text-[11px]">{t('pm_crea_waiting_creation')}</span>
                    </div>
                  </div>
                ))}

                {filteredPmPrintOrders
                  .filter((o) => o.status === 'sent_to_crea')
                  .map((order) => (
                    <div
                      key={order.id}
                      className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          PRINT
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{order.orderNumber}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {order.projectTitle}
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {order.items.map((i) => `${i.quantity}x ${i.itemTitle}`).join(', ')}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] text-zinc-500">{order.totalCostDzd.toLocaleString()} DA</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">{t('pm_crea_order_received')}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-500" />
                  En production
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  {filteredPmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length}
                </span>
              </div>

              <div className="space-y-3">
                {filteredPmBatDeliverables
                  .filter((b) => b.approvalStatus === 'pending_review')
                  .map((bat) => (
                    <div
                      key={bat.id}
                      className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          {bat.versionCode.toUpperCase()} · EN PRODUCTION
                        </span>
                        <span className="text-[10px] text-zinc-400">{bat.fileFormat.toUpperCase()} · {bat.colorSpace}</span>
                      </div>

                      <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                        <img src={bat.previewUrl} alt={bat.title} className="w-full h-full object-cover" />
                        <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                          {bat.resolutionDpi} DPI
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {bat.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500">{bat.projectTitle}</p>
                      </div>

                      <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                        <span>{bat.uploadedByCreativeName}</span>
                        <span className="text-emerald-600 font-medium">{t('pm_crea_bleed_3mm')}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 3: Validated & Delivered BAT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Livrées
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {filteredPmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length}
                </span>
              </div>

              <div className="space-y-3">
                {filteredPmBatDeliverables
                  .filter((b) => b.approvalStatus === 'approved')
                  .map((bat) => (
                    <div
                      key={bat.id}
                      className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          BAT VALIDÉ
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{bat.versionCode}</span>
                      </div>

                      <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                        <img src={bat.previewUrl} alt={bat.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                          <span className="px-2.5 py-0.5 bg-white dark:bg-zinc-900 rounded-full text-[10px] font-bold text-emerald-600 shadow-xs">
                            PRÊT IMPRESSION
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {bat.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500">{bat.projectTitle}</p>
                      </div>

                      <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400">300 DPI · CMJN</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {t('pm_crea_status_transmitted')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Slide 7 "Livrable Prêt" Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                  {t('pm_crea_deliverable_ready')}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {t('pm_crea_bat_final')}
                </span>
              </div>

              {/* Deliverable File Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    BAT_rollup_ooredoo.pdf
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-mono">{t('pm_crea_size_mb', { size: '24,8' })}</span>
                  <span>·</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    HD
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                    CMJN
                  </span>
                  <span>·</span>
                  <span className="text-emerald-600 font-semibold text-[11px]">300 DPI</span>
                </div>
              </div>

              {/* Thumbnail Display */}
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative border border-zinc-200 dark:border-zinc-700/60">
                <img
                  src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80"
                  alt="BAT Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px]">
                  <span>{t('pm_crea_bleed_flash_ready')}</span>
                </div>
              </div>

              {returnedToCdpSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('pm_crea_bat_returned_success')}</span>
                </div>
              )}

              {/* Big Red Button - Slide 7 Exact */}
              <button
                type="button"
                onClick={() => {
                  reviewPmBatDeliverable('bat_01', 'approved');
                  setReturnedToCdpSuccess(true);
                  setTimeout(() => setReturnedToCdpSuccess(false), 3500);
                }}
                className="w-full py-3 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ArrowRight className="w-4 h-4" />
                Renvoyer au chef de projet
              </button>
              <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                Le CDP recevra le fichier HD dans son espace pour envoi direct à l'imprimeur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3.4: CAHIERS DES CHARGES LIÉS (Slide 7) */}
      {activeTab === 'briefs' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Cahiers des Charges & Spécifications Graphiques
              </h3>
              <p className="text-xs text-zinc-500">
                Briefs injectés par la Direction et les Chefs de Projets pour cadrage des Key Visuals (KV).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pmProjects.map((p) => (
              <div
                key={p.id}
                className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#C4785A] uppercase">{p.clientName}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{p.title}</span>
                  </div>
                  <p className="text-xs text-zinc-500 max-w-2xl">{p.scopeOfWork}</p>
                  <div className="flex items-center gap-4 text-[11px] text-zinc-400 pt-1">
                    <span>{t('pm_crea_deadline_kv', { date: p.kvDeadline || p.startDate })}</span>
                    <span>{t('pm_crea_deadline_print', { date: p.printDeadline || p.startDate })}</span>
                    <span>{t('pm_crea_pm_lead', { name: p.projectManagerName })}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setArtworkTitle(`KV_${p.title.replace(/\s+/g, '_')}`);
                    setActiveTab('upload');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Démarrer Production KV ➔
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 3.2: BAT UPLOADER & TECHNICAL VALIDATION STUDIO */}
      {activeTab === 'upload' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-3xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-semibold text-[#C4785A] uppercase tracking-wide">
              Écran 3.2 · Validateur & Upload BAT
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Livraison d'Épreuve Imprimeur & Contrôle des Normes Pré-Presse
            </h2>
            <p className="text-xs text-zinc-500">
              Assurez la fidélité de production : vérifiez l'espace colorimétrique CMJN, la résolution 300 DPI et les fonds perdus.
            </p>
          </div>

          {uploadSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Épreuve BAT déposée avec succès ! Notification envoyée au Chef de Projet pour revue.
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-5">
            <div className="space-y-4">
              <LabelSelect
                field="Project"
                label={t('pm_crea_field_project')}
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(typeof val === 'string' ? val : val.target?.value || val)}
                options={pmProjects.map((p) => ({
                  value: p.id,
                  label: `${p.title} (${p.clientName})`,
                }))}
                height={46}
                corner={14}
              />

              <div>
                <LabelInput
                  field="ArtworkTitle"
                  label={t('pm_crea_field_artwork_name')}
                  required
                  placeholder={t('pm_crea_field_artwork_name_ph')}
                  value={artworkTitle}
                  onChange={setArtworkTitle}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              {/* Technical Specifications Matrix */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  {t('pm_crea_upload_sub')}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <LabelSelect
                    field="ColorSpace"
                    label={t('pm_crea_field_colorspace')}
                    value={colorSpace}
                    onChange={(val) => setColorSpace(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
                    options={[
                      { value: 'CMJN', label: 'CMJN / CMYK' },
                      { value: 'RVB', label: 'RVB / RGB' },
                    ]}
                    height={42}
                    corner={10}
                  />

                  <LabelSelect
                    field="Resolution"
                    label={t('pm_crea_field_resolution')}
                    value={resolutionDpi}
                    onChange={(val) => setResolutionDpi(typeof val === 'string' ? val : val.target?.value || val)}
                    options={[
                      { value: '300', label: '300 DPI HD' },
                      { value: '150', label: '150 DPI' },
                      { value: '72', label: '72 DPI' },
                    ]}
                    height={42}
                    corner={10}
                  />

                  <LabelSelect
                    field="Format"
                    label={t('pm_crea_field_fileformat')}
                    value={fileFormat}
                    onChange={(val) => setFileFormat(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
                    options={[
                      { value: 'pdf', label: 'PDF' },
                      { value: 'ai', label: 'Illustrator (.ai)' },
                      { value: 'psd', label: 'Photoshop (.psd)' },
                      { value: 'tiff', label: 'TIFF' },
                    ]}
                    height={42}
                    corner={10}
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={hasBleedIncluded}
                      onChange={(e) => setHasBleedIncluded(e.target.checked)}
                      className="rounded border-zinc-300 text-[#C4785A] focus:ring-[#C4785A]"
                    />
                    <span>{t('pm_crea_crop_marks_included')}</span>
                  </label>
                </div>
              </div>

              {/* URL Preview */}
              <div>
                <LabelInput
                  field="PreviewUrl"
                  label={t('pm_crea_field_preview_url')}
                  type="url"
                  value={previewUrl}
                  onChange={setPreviewUrl}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              {/* Master File Security Banner */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-3 text-xs text-blue-800 dark:text-blue-300">
                <Lock className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  {t('pm_crea_cloud_security_note')}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('kanban')}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Enregistrer & Notifier le Chef de Projet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

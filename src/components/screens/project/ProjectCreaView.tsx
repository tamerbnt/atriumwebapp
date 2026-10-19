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

interface ProjectCreaViewProps {
  initialTab?: 'kanban' | 'upload';
}

export const ProjectCreaView: React.FC<ProjectCreaViewProps> = ({ initialTab }) => {
  const {
    pmProjects,
    pmPrintOrders,
    pmBatDeliverables,
    addPmBatDeliverable,
    updatePmPrintOrderStatus,
    activePmSubScreen,
    setActivePmSubScreen,
  } = useAtriumStore();

  const activeTab: 'kanban' | 'upload' =
    activePmSubScreen === 'upload' || initialTab === 'upload' ? 'upload' : 'kanban';

  const setActiveTab = (tab: 'kanban' | 'upload') => {
    setActivePmSubScreen(tab);
  };

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

  const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];

  // Kanban Tasks derived from Print Orders and Project Briefs
  const kanbanColumns = [
    {
      id: 'received',
      title: 'Briefs & Commandes Reçus',
      badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    },
    {
      id: 'in_progress',
      title: 'En Cours de Production Créa',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
      id: 'ready_bat',
      title: 'BAT Prêts & Validés',
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
              Rôle 3 · Studio Créatif & Graphisme
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Pipeline DTP, BAT & Validations Techniques</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'kanban'
              ? 'Kanban de Production Créa'
              : 'Uploader & Validateur Technique BAT'}
          </h1>
        </div>

        {/* Global Action Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'kanban' ? (
            <button
              onClick={() => setActiveTab('upload')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              Déposer une Épreuve BAT
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('kanban')}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              Retour au Kanban
            </button>
          )}
        </div>
      </div>

      {/* Screen Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'kanban'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          3.1 Kanban de Production
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          3.2 Uploader & Validateur BAT (CMJN / 300 DPI)
        </button>
      </div>

      {/* SCREEN 3.1: KANBAN BOARD */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Received Briefs & Print Orders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                Briefs & Commandes Reçus
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {pmPrintOrders.filter((o) => o.status === 'sent_to_crea').length + pmProjects.length}
              </span>
            </div>

            <div className="space-y-3">
              {pmProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 hover:border-[#C4785A]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C4785A]/15 text-[#C4785A]">
                      KEY VISUAL & CADRAGE
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Délai: {p.startDate}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.title}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                      {p.scopeOfWork}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Client: {p.clientName}</span>
                    <button
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setArtworkTitle(`KV_${p.title.replace(/\s+/g, '_')}`);
                        setActiveTab('upload');
                      }}
                      className="text-[#C4785A] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Démarrer BAT <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {pmPrintOrders
                .filter((o) => o.status === 'sent_to_crea')
                .map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        COMMANDE PRINT
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{order.orderNumber}</span>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {order.projectTitle}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        {order.items.map((i) => `${i.quantity}x ${i.itemTitle}`).join(', ')}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-500">{order.totalCostDzd.toLocaleString()} DA</span>
                      <button
                        onClick={() => {
                          setSelectedProjectId(order.projectId);
                          setSelectedOrderId(order.id);
                          setArtworkTitle(`BAT_${order.orderNumber}`);
                          setActiveTab('upload');
                        }}
                        className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Créer le BAT <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-500" />
                En Production Créa
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                {pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length}
              </span>
            </div>

            <div className="space-y-3">
              {pmBatDeliverables
                .filter((b) => b.approvalStatus === 'pending_review')
                .map((bat) => (
                  <div
                    key={bat.id}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        {bat.versionCode.toUpperCase()} · EN REVUE
                      </span>
                      <span className="text-[10px] text-zinc-400">{bat.fileFormat.toUpperCase()} · {bat.colorSpace}</span>
                    </div>

                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                      <img src={bat.previewUrl} alt={bat.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                        {bat.resolutionDpi} DPI
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {bat.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500">{bat.projectTitle}</p>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span>{bat.uploadedByCreativeName}</span>
                      <span className="text-emerald-600 font-medium">Bords 3mm inclus</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 3: Validated & Print Ready BAT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                BAT Validés & Prêts Print
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {pmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length}
              </span>
            </div>

            <div className="space-y-3">
              {pmBatDeliverables
                .filter((b) => b.approvalStatus === 'approved')
                .map((bat) => (
                  <div
                    key={bat.id}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        BAT BON À TIRER VALIDÉ
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{bat.versionCode}</span>
                    </div>

                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                      <img src={bat.previewUrl} alt={bat.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                        <span className="px-3 py-1 bg-white dark:bg-zinc-900 rounded-full text-xs font-bold text-emerald-600 shadow-md">
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

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-zinc-400">300 DPI · CMJN</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Transmis Imprimeur
                      </span>
                    </div>
                  </div>
                ))}
            </div>
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
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Projet & Campagne Associée
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  {pmProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nom du Livrable Graphique (ex: Rollup_85x200, Kakemono_Entree, Stand_Parapluie)
                </label>
                <input
                  type="text"
                  required
                  placeholder="BAT_Rollup_BabEzzouar_85x200"
                  value={artworkTitle}
                  onChange={(e) => setArtworkTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                />
              </div>

              {/* Technical Specifications Matrix */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Contrôle Qualité Pré-Presse (Enregistrement Technique)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Espace Couleur</label>
                    <select
                      value={colorSpace}
                      onChange={(e) => setColorSpace(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold"
                    >
                      <option value="CMJN">CMJN / CMYK (Imprimeur)</option>
                      <option value="RVB">RVB / RGB (Écrans)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Résolution</label>
                    <select
                      value={resolutionDpi}
                      onChange={(e) => setResolutionDpi(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold"
                    >
                      <option value="300">300 DPI HD (Obligatoire Print)</option>
                      <option value="150">150 DPI (Grands Formats Bâche)</option>
                      <option value="72">72 DPI (Web)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Format Fichier</label>
                    <select
                      value={fileFormat}
                      onChange={(e) => setFileFormat(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold uppercase"
                    >
                      <option value="pdf">PDF Haute Définition</option>
                      <option value="ai">Adobe Illustrator (.ai)</option>
                      <option value="psd">Adobe Photoshop (.psd)</option>
                      <option value="tiff">TIFF Non Compressé</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={hasBleedIncluded}
                      onChange={(e) => setHasBleedIncluded(e.target.checked)}
                      className="rounded border-zinc-300 text-[#C4785A] focus:ring-[#C4785A]"
                    />
                    <span>Bords perdus de 3mm et traits de coupe inclus dans le fichier</span>
                  </label>
                </div>
              </div>

              {/* URL Preview */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  URL de Prévisualisation du BAT (Aperçu HD)
                </label>
                <input
                  type="url"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Master File Security Banner */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-3 text-xs text-blue-800 dark:text-blue-300">
                <Lock className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  <strong>Sécurité Source Master :</strong> Les fichiers originaux .AI / .PSD restent stockés sur le cloud sécurisé de l'agence. Seules les épreuves de contrôle ou BAT validés sont transmis aux prestataires imprimeurs.
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

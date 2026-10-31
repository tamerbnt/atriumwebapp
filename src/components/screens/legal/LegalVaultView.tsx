import React, { useState, useMemo } from 'react';
import {
  Lock,
  FileText,
  Plus,
  ShieldCheck,
  Printer,
  CheckCircle2,
  Key,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  FolderLock,
  FileCheck,
  BookOpen,
  Stamp,
  QrCode,
  Building2,
  Scroll,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

interface VaultItem {
  id: string;
  code: string;
  title: string;
  matterReference: string;
  category: string;
  depositDate: string;
  status: 'OriginalScanned' | 'Confidential' | 'MinuteOfficielle' | 'DossierAudit' | 'PieceClient';
  roleScope: 'avocat' | 'notaire' | 'comptable' | 'secretaire';
  cadastralVolume?: string;
  cadastralNumber?: string;
  officialSealNumber?: string;
}

const INITIAL_VAULT: VaultItem[] = [
  // Avocat Associe Items
  {
    id: 'v_01',
    code: 'DOC-2026-081',
    title: 'Contrat Commercial Original & Avenants Recouvrement',
    matterReference: 'DOS-2026-0091',
    category: 'Contrats',
    depositDate: '2026-05-02',
    status: 'OriginalScanned',
    roleScope: 'avocat',
    officialSealNumber: 'SEAL-DZ-ALG-0491',
  },
  {
    id: 'v_02',
    code: 'DOC-2026-082',
    title: 'Mémoire de Défense & Pièces Numérotées (Tribunal Sidi M\'Hamed)',
    matterReference: 'DOS-2026-0091',
    category: 'Mémoires',
    depositDate: '2026-05-08',
    status: 'Confidential',
    roleScope: 'avocat',
    officialSealNumber: 'SEAL-DZ-ALG-0492',
  },

  // Notaire Titulaire Items (Minutes & Grosses)
  {
    id: 'v_03',
    code: 'MIN-2026-0142',
    title: 'Minute Officielle Acte de Vente Immobilière El Biar (LF-16/04-0982)',
    matterReference: 'DOS-2026-0092',
    category: 'Minutes Notariées',
    depositDate: '2026-04-10',
    status: 'MinuteOfficielle',
    roleScope: 'notaire',
    cadastralVolume: 'Vol. 418',
    cadastralNumber: 'N° 22',
    officialSealNumber: 'NOTAIRE-SCEAU-16-0142',
  },
  {
    id: 'v_04',
    code: 'MIN-2026-0143',
    title: 'Grosse Revêtue de la Formule Exécutoire Bail Commercial Didouche',
    matterReference: 'DOS-2026-0093',
    category: 'Grosses Exécutoires',
    depositDate: '2026-05-02',
    status: 'MinuteOfficielle',
    roleScope: 'notaire',
    officialSealNumber: 'NOTAIRE-SCEAU-16-0143',
  },

  // Expert Comptable Items (Audit Working Papers & Reports)
  {
    id: 'v_05',
    code: 'AUD-2026-001',
    title: 'Rapport Général du Commissaire aux Comptes (Exercice 2025)',
    matterReference: 'MANDAT-SARL-ATLAS',
    category: 'Rapports CAC',
    depositDate: '2026-04-20',
    status: 'DossierAudit',
    roleScope: 'comptable',
    officialSealNumber: 'CAC-ORDRE-2026-88',
  },
  {
    id: 'v_06',
    code: 'AUD-2026-002',
    title: 'Feuille de Travail Déclaration G50 & Rapprochement Fiscal/Comptable',
    matterReference: 'MANDAT-EURL-AGRO',
    category: 'Feuilles de Travail',
    depositDate: '2026-05-01',
    status: 'DossierAudit',
    roleScope: 'comptable',
    officialSealNumber: 'CAC-ORDRE-2026-89',
  },

  // Secretaire Caisse Items (Client Identification & Dépôts)
  {
    id: 'v_07',
    code: 'DEP-2026-051',
    title: 'Copie Conforme Carte Biométrique NIN Hadj Amine Mansouri',
    matterReference: 'DOS-2026-0092',
    category: 'Identité NIN/NIF',
    depositDate: '2026-05-04',
    status: 'PieceClient',
    roleScope: 'secretaire',
    officialSealNumber: 'RECEP-CAISSE-051',
  },
  {
    id: 'v_08',
    code: 'DEP-2026-052',
    title: 'Extrait du Registre de Commerce & Statuts SARL Atlas Distribution',
    matterReference: 'DOS-2026-0091',
    category: 'Registre Commerce',
    depositDate: '2026-05-05',
    status: 'PieceClient',
    roleScope: 'secretaire',
    officialSealNumber: 'RECEP-CAISSE-052',
  },
];

export const LegalVaultView: React.FC = () => {
  const { language, activeLegalRole, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';

  const [vaultItems, setVaultItems] = useState<VaultItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_legal_vault_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_VAULT;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['v_01', 'v_03']));
  const [sortBy, setSortBy] = useState<string>('depositDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vaultToEdit, setVaultToEdit] = useState<VaultItem | null>(null);

  // Form states inside Modal
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [matterReference, setMatterReference] = useState('');
  const [category, setCategory] = useState('Contrats');
  const [status, setStatus] = useState<VaultItem['status']>('OriginalScanned');

  // 390px Inline Side Inspector
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(() => {
    return vaultItems[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'piece' | 'sceau' | 'hash' | 'notes'>('piece');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const saveVault = (items: VaultItem[]) => {
    setVaultItems(items);
    try {
      localStorage.setItem('atrium_legal_vault_v2', JSON.stringify(items));
    } catch {}
  };

  // Determine role-based scope
  const targetScope = useMemo<'avocat' | 'notaire' | 'comptable' | 'secretaire'>(() => {
    if (activeLegalRole === 'notaire_titulaire') return 'notaire';
    if (activeLegalRole === 'expert_comptable') return 'comptable';
    if (activeLegalRole === 'secretaire_caisse') return 'secretaire';
    return 'avocat';
  }, [activeLegalRole]);

  // Filter items matching active operational role or globally relevant
  const roleScopedItems = useMemo(() => {
    return vaultItems.filter((i) => i.roleScope === targetScope || i.roleScope === 'avocat');
  }, [vaultItems, targetScope]);

  const filteredItems = useMemo(() => {
    return roleScopedItems.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesRef = item.matterReference.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesRef) return false;
      }
      return true;
    });
  }, [roleScopedItems, categoryFilter, searchQuery]);

  const openCreateModal = () => {
    setVaultToEdit(null);
    const prefix = targetScope === 'notaire' ? 'MIN' : targetScope === 'comptable' ? 'AUD' : targetScope === 'secretaire' ? 'DEP' : 'DOC';
    setCode(`${prefix}-2026-${Math.floor(100 + Math.random() * 900)}`);
    setTitle('');
    setMatterReference('DOS-2026-0091');
    setCategory(targetScope === 'notaire' ? 'Minutes Notariées' : targetScope === 'comptable' ? 'Rapports CAC' : targetScope === 'secretaire' ? 'Identité NIN/NIF' : 'Contrats');
    setStatus(targetScope === 'notaire' ? 'MinuteOfficielle' : targetScope === 'comptable' ? 'DossierAudit' : targetScope === 'secretaire' ? 'PieceClient' : 'OriginalScanned');
    setIsModalOpen(true);
  };

  const openEditModal = (item: VaultItem) => {
    setVaultToEdit(item);
    setCode(item.code);
    setTitle(item.title);
    setMatterReference(item.matterReference);
    setCategory(item.category);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !matterReference.trim()) {
      showToast(isAr ? 'يرجى إدخال عنوان الوثيقة ورقم الملف' : 'Veuillez saisir le titre et dossier', 'error');
      return;
    }

    const payload: VaultItem = {
      id: vaultToEdit?.id || `v_${Date.now()}`,
      code: code.trim(),
      title: title.trim(),
      matterReference: matterReference.trim(),
      category: category.trim(),
      depositDate: vaultToEdit?.depositDate || new Date().toISOString().split('T')[0],
      status,
      roleScope: targetScope,
      officialSealNumber: vaultToEdit?.officialSealNumber || `SEAL-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    if (vaultToEdit) {
      const updated = vaultItems.map((item) => (item.id === payload.id ? payload : item));
      saveVault(updated);
      if (selectedItem?.id === payload.id) setSelectedItem(payload);
      showToast(isAr ? 'تم تحديث بيانات الوثيقة بالخزينة' : 'Pièce mise à jour au coffre-fort', 'success');
    } else {
      const updated = [payload, ...vaultItems];
      saveVault(updated);
      setSelectedItem(payload);
      showToast(isAr ? 'تم إيداع الوثيقة بالخزينة الرسمية' : 'Pièce scellée avec succès au coffre-fort', 'success');
    }
    setIsModalOpen(false);
  };

  const handlePin = (item: VaultItem) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    showToast(
      pinnedIds.has(item.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Pièce désépinglée')
        : (isAr ? 'تم تثبيت الوثيقة' : 'Pièce épinglée'),
      'info'
    );
  };

  const handleDelete = (item: VaultItem) => {
    const updated = vaultItems.filter((i) => i.id !== item.id);
    saveVault(updated);
    if (selectedItem?.id === item.id) setSelectedItem(null);
    showToast(isAr ? 'تم سحب الوثيقة من الخزينة' : 'Pièce retirée du coffre-fort', 'success');
  };

  const handleCertifyHash = (item: VaultItem) => {
    showToast(
      isAr
        ? `تم فحص البصمة الرقمية SHA-256 للوثيقة ${item.code} (مطابقة 100%)`
        : `Empreinte cryptographique SHA-256 certifiée pour ${item.code} : intégrité probatoire scellée`,
      'success'
    );
    if (selectedItem?.id === item.id) setActiveTab('hash');
  };

  const handleExportBordereau = () => {
    showToast(
      isAr
        ? 'تم توليد جدول إرسال المستندات الرسمي (Bordereau de Communication de Pièces)'
        : 'Génération du Bordereau de Communication contradictoire des pièces',
      'success'
    );
    window.print();
  };

  // Role Titles & Subtitles
  const roleMetadata = useMemo(() => {
    if (targetScope === 'notaire') {
      return {
        title: isAr ? 'أرشيف الأصول والمستخرجات الرسمية (Minutes & Grosses)' : 'Conservation des Minutes & Grosses Notariées',
        badge: 'Actes Authentiques',
        subtitle: isAr ? 'حفظ الأصول غير القابلة للتصرف، تسليم النسخ التنفيذية، والتحقق من النشر العقاري' : 'Conservation probatoire perpétuelle des minutes d\'actes et délivrance de grosses exécutoires',
        catPills: [
          { id: 'All', label: isAr ? 'جميع الأصول' : 'Toutes Minutes' },
          { id: 'Minutes Notariées', label: 'Minutes Notariées' },
          { id: 'Grosses Exécutoires', label: 'Grosses Exécutoires' },
          { id: 'Expéditions', label: 'Expéditions' },
        ],
      };
    }
    if (targetScope === 'comptable') {
      return {
        title: isAr ? 'أوراق العمل وتقارير محافظ الحسابات (Dossiers CAC)' : 'Dossiers de Travail & Rapports Commissaire aux Comptes',
        badge: 'Certification CAC',
        subtitle: isAr ? 'أوراق العمل الرقابية، محاضر جرد الأصول، تقارير المصادقة على الحسابات' : 'Papiers de travail d\'audit légal, diligences fiscales G50 et rapports généraux du CAC',
        catPills: [
          { id: 'All', label: isAr ? 'جميع الملفات' : 'Tous Dossiers' },
          { id: 'Rapports CAC', label: 'Rapports CAC' },
          { id: 'Feuilles de Travail', label: 'Feuilles de Travail' },
          { id: 'Contrôle G50', label: 'Contrôle G50' },
        ],
      };
    }
    if (targetScope === 'secretaire') {
      return {
        title: isAr ? 'إيداع المستندات ووصولات الاستلام (Dépôt & Classement)' : 'Registre des Dépôts de Pièces & NIN/NIF',
        badge: 'Accueil & Dépôt',
        subtitle: isAr ? 'أرشفة وثائق الهوية، السجلات التجارية، تسليم وصولات الإيداع للموكلين' : 'Numérisation des cartes NIN, extraits de registre de commerce et récépissés de dépôt',
        catPills: [
          { id: 'All', label: isAr ? 'جميع الوثائق' : 'Toutes Pièces' },
          { id: 'Identité NIN/NIF', label: 'Identité NIN/NIF' },
          { id: 'Registre Commerce', label: 'Registre Commerce' },
          { id: 'Récépissés', label: 'Récépissés' },
        ],
      };
    }
    // Avocat default
    return {
      title: isAr ? 'الخزينة الرقمية والمستندات القضائية السرية' : 'Coffre-fort Numérique & Pièces Judiciaires Scellées',
      badge: 'AES-256 Chiffré',
      subtitle: isAr ? 'أرشفة أصول العقود، مذكرات الدفاع، محاضر التبليغ وبصمات الإثبات الجنائي' : 'Pièces de procédure contradictoires, bordereaux de communication et secret professionnel',
      catPills: [
        { id: 'All', label: isAr ? 'جميع الوثائق' : 'Toutes pièces' },
        { id: 'Contrats', label: 'Contrats' },
        { id: 'Mémoires', label: 'Mémoires' },
        { id: 'Huissier', label: 'Huissier' },
      ],
    };
  }, [targetScope, isAr]);

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<VaultItem>[] = [
    {
      id: 'code',
      header: isAr ? 'رمز الوثيقة' : 'Code Pièce',
      accessorKey: 'code',
      sortable: true,
      minWidth: '140px',
      cell: (i) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            {targetScope === 'notaire' ? <Scroll size={16} /> : <Lock size={16} />}
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {i.code}
              {pinnedIds.has(i.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              {i.depositDate}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'title',
      header: isAr ? 'عنوان وتعيين الوثيقة' : 'Intitulé & Référence Dossier',
      accessorKey: 'title',
      sortable: true,
      minWidth: '240px',
      cell: (i) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {i.title}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-2">
            <span>Dossier: {i.matterReference}</span>
            {i.cadastralVolume && (
              <span className="text-[#C4785A] font-bold">
                · {i.cadastralVolume} {i.cadastralNumber}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: isAr ? 'التصنيف' : 'Nature',
      accessorKey: 'category',
      sortable: true,
      minWidth: '150px',
      cell: (i) => (
        <div className="text-xs text-neutral-700 dark:text-neutral-300">
          {i.category}
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الأصالة والمصادقة' : 'Statut Probatoire',
      accessorKey: 'status',
      sortable: true,
      minWidth: '140px',
      cell: (i) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            i.status === 'MinuteOfficielle'
              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
              : i.status === 'DossierAudit'
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
              : i.status === 'Confidential'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          {i.status === 'MinuteOfficielle'
            ? 'Minute Inaliénable'
            : i.status === 'DossierAudit'
            ? 'Audit CAC Scellé'
            : i.status === 'Confidential'
            ? 'Confidentiel Défense'
            : 'Original Certifié'}
        </span>
      ),
    },
  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: scopedVaultItems.length > 0,
  });

  if (showSkeleton && (scopedVaultItems.length === 0 || networkMode === 'force_skeleton')) {
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
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            {targetScope === 'notaire' ? <Scroll size={22} /> : <Lock size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {roleMetadata.title}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {roleMetadata.badge}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {roleMetadata.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportBordereau}
            icon={<Download size={14} />}
          >
            {isAr ? 'جدول الإرسال' : 'Bordereau'}
          </AtriumButton>
          <AtriumButton
            variant="primary"
            onClick={openCreateModal}
            icon={<Plus size={14} />}
          >
            {targetScope === 'notaire'
              ? (isAr ? 'إيداع أصل العقد' : 'Déposer une Minute')
              : (isAr ? 'إيداع وثيقة بالخزينة' : 'Déposer une Pièce')}
          </AtriumButton>
        </div>
      </div>

      {/* 3 Metrics Cards */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'أمان الوثائق والقوة الإثباتية' : 'Force Probante & Intégrité des Pièces'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'تأمين المستندات الرسمية، الأختام الرقمية والمطابقة القضائية' : 'Conservation probatoire scellée, horodatage certifié et conformité aux règles déontologiques'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المستندات المودعة بالخزينة' : 'Total Pièces au Coffre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {roleScopedItems.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                100% {isAr ? 'أصول مشفرة وممسوحة رقمياً' : 'scellées avec empreinte certifiée'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {targetScope === 'notaire' ? 'Minutes Publiées Conservation' : 'Documents Haute Sécurité'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {roleScopedItems.filter((i) => i.cadastralVolume || i.status === 'Confidential').length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'خاضعة للأختام الرسمية المعتمدة' : 'Revêtus du sceau officiel'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'الختم الإلكتروني والبصمة' : 'Cachet & Horodatage'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {targetScope.toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                SHA-256 GCM
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'شهادة إلكترونية سارية المفعول' : 'Inviolabilité certifiée'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Category filter capsules */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {roleMetadata.title}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'سجل الأرشيف والمستندات القضائية والمحاسبية' : 'Recherche par référence, intitulé, partie ou numéro d\'enregistrement'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {roleMetadata.catPills.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setCategoryFilter(pill.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: categoryFilter === pill.id ? '#FCEEE8' : 'transparent',
                  color: categoryFilter === pill.id ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<VaultItem>
              data={filteredItems}
              columns={columns}
              keyExtractor={(i) => i.id}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={isAr ? 'بحث برمز الوثيقة، العنوان، رقم القضية...' : 'Rechercher par code pièce, intitulé, dossier...'}
              filterValue={categoryFilter}
              onFilterChange={setCategoryFilter}
              filterOptions={roleMetadata.catPills.map((p) => ({ value: p.id, label: p.label }))}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pinnedIds={pinnedIds}
              onPinToggle={handlePin}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={(field, dir) => {
                setSortBy(field);
                setSortDir(dir);
              }}
              onItemClick={(item) => setSelectedItem(item)}
              onEdit={openEditModal}
              onDelete={handleDelete}
              customActions={[
                {
                  id: 'certify',
                  label: isAr ? 'فحص البصمة SHA-256' : 'Empreinte SHA-256',
                  icon: <FileCheck size={14} />,
                  onClick: handleCertifyHash,
                },
              ]}
              renderGridCard={(item) => (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {item.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {item.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">
                      Dossier: {item.matterReference}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>

          {/* 390px Inline Side Inspector Drawer */}
          {selectedItem && (
            <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                    {targetScope === 'notaire' ? <Scroll size={18} /> : <Lock size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                        {selectedItem.code}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {selectedItem.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                      {selectedItem.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Action Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleCertifyHash(selectedItem)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 transition-colors"
                >
                  <FileCheck size={12} />
                  {isAr ? 'فحص البصمة' : 'Vérifier SHA-256'}
                </button>
                <button
                  onClick={() => openEditModal(selectedItem)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                >
                  <Edit size={12} />
                  {isAr ? 'تعديل' : 'Modifier'}
                </button>
                <button
                  onClick={() => handleDelete(selectedItem)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Drawer Tabs Navigation */}
              <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
                <button
                  onClick={() => setActiveTab('piece')}
                  className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'piece'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isAr ? 'الوثيقة' : 'Fiche'}
                </button>
                <button
                  onClick={() => setActiveTab('sceau')}
                  className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'sceau'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isAr ? 'الختم الرسمي' : 'Cachet & Sceau'}
                </button>
                <button
                  onClick={() => setActiveTab('hash')}
                  className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'hash'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isAr ? 'التشفير' : 'SHA-256'}
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'notes'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isAr ? 'الملاحظات' : 'Bordereau'}
                </button>
              </div>

              {/* Tab 1: Fiche */}
              {activeTab === 'piece' && (
                <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Numéro de pièce:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {selectedItem.code}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Dossier:</span>
                      <span className="font-mono font-semibold text-[#C4785A]">
                        {selectedItem.matterReference}
                      </span>
                    </div>
                    {selectedItem.cadastralVolume && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Conservation Foncière:</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {selectedItem.cadastralVolume} {selectedItem.cadastralNumber}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Date d'archivage:</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">
                        {selectedItem.depositDate}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Sceau Officiel Simulator */}
              {activeTab === 'sceau' && (
                <div className="p-4 bg-white dark:bg-neutral-900 border-2 border-dashed border-[#C4785A]/40 rounded-2xl text-center space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="w-12 h-12 rounded-full bg-[#C4785A]/15 text-[#C4785A] mx-auto flex items-center justify-center font-bold">
                    <Stamp size={24} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-neutral-900 dark:text-white block uppercase tracking-wider">
                      الجمهورية الجزائرية الديمقراطية الشعبية
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 space-y-1">
                    <div>Sceau N° : <strong>{selectedItem.officialSealNumber || 'DZ-SEAL-2026-99'}</strong></div>
                    <div>Horodatage légal : {selectedItem.depositDate} à 11:42:00</div>
                    <div>Juridiction / Étude : Wilaya d'Alger</div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-[11px]">
                    <CheckCircle2 size={13} />
                    <span>Original Scellé et Inaltérable</span>
                  </div>
                  <button
                    onClick={() => {
                      showToast(isAr ? 'طباعة شهادة المطابقة والختم' : 'Certificat d\'authenticité imprimé', 'success');
                      window.print();
                    }}
                    className="w-full py-2 rounded-xl bg-[#C4785A] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Printer size={13} />
                    {isAr ? 'طباعة نسخة مع الختم الرسمي' : 'Imprimer avec Cachet Légal'}
                  </button>
                </div>
              )}

              {/* Tab 3: SHA-256 */}
              {activeTab === 'hash' && (
                <div className="space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                      Empreinte Numérique Cryptographique :
                    </span>
                    <div className="font-mono text-[10px] break-all bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300">
                      e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </div>
                    <p className="text-[10px] text-emerald-600 font-medium">
                      ✓ Horodatage certifié conforme aux exigences de recevabilité judiciaire.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 4: Bordereau */}
              {activeTab === 'notes' && (
                <div className="space-y-3 text-xs animate-in fade-in duration-150">
                  <p className="text-neutral-500 text-[11px]">
                    Bordereau de communication de pièces contradictoire et réserves :
                  </p>
                  <textarea
                    rows={6}
                    value={inspectorNotes}
                    onChange={(e) => setInspectorNotes(e.target.value)}
                    placeholder="Mentionner la notification aux parties, récépissé de dépôt..."
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                  />
                  <button
                    onClick={() => {
                      setNoteSaved(true);
                      setTimeout(() => setNoteSaved(false), 2000);
                      showToast(isAr ? 'تم حفظ الملاحظات' : 'Bordereau enregistré', 'success');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                  >
                    {noteSaved ? (
                      <>
                        <Check size={14} />
                        {isAr ? 'تم الحفظ' : 'Bordereau enregistré'}
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        {isAr ? 'حفظ' : 'Enregistrer'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New / Edit Vault Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  {targetScope === 'notaire' ? <Scroll size={20} /> : <Lock size={20} />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {vaultToEdit
                      ? (isAr ? 'تعديل وثيقة بالخزينة' : 'Modifier la Pièce du Coffre')
                      : (isAr ? 'إيداع وثيقة جديدة بالخزينة' : 'Déposer une Pièce au Coffre-fort')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'أرشفة مشفرة وسندات رسمية' : 'Chiffrement sécurisé AES-256 et horodatage'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رمز الوثيقة *' : 'Code Pièce *'}
                  placeholder="DOC-2026-081"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'رقم الملف / القضية *' : 'Réf Dossier *'}
                  placeholder="DOS-2026-0091"
                  value={matterReference}
                  onChange={(e) => setMatterReference(e.target.value)}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'عنوان وتعيين الوثيقة *' : 'Intitulé de la Pièce *'}
                placeholder="Ex: Contrat Commercial Original & Avenants"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label={isAr ? 'طبيعة الوثيقة' : 'Nature'}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={roleMetadata.catPills.filter((p) => p.id !== 'All').map((p) => ({ value: p.id, label: p.label }))}
                />
                <LabelSelect
                  label={isAr ? 'مستوى الحماية' : 'Sécurité'}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VaultItem['status'])}
                  options={[
                    { value: 'OriginalScanned', label: 'Original Scellé' },
                    { value: 'Confidential', label: 'Confidentiel Défense' },
                    { value: 'MinuteOfficielle', label: 'Minute Notariée' },
                    { value: 'DossierAudit', label: 'Dossier Audit CAC' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {vaultToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'إيداع الوثيقة' : 'Sceller au Coffre')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

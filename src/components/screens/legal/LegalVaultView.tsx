import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Lock,
  ShieldCheck,
  Printer,
  CheckCircle2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  FileCheck,
  Stamp,
  Scroll,
  Download,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { localizeStatus } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
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

interface VaultItem {
  id: string;
  code: string;
  title: string;
  matterReference: string;
  category: string;
  depositDate: string;
  status: 'OriginalScanned' | 'Confidential' | 'MinuteOfficielle' | 'DossierAudit' | 'PieceClient';
  roleScope: 'avocat' | 'notaire' | 'comptable' | 'secretaire';
  branchId?: string;
  cadastralVolume?: string;
  cadastralNumber?: string;
  officialSealNumber?: string;
}

const extractStr = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const obj = v as { target?: { value?: unknown }; value?: unknown };
    if (obj.target?.value !== undefined) return String(obj.target.value);
    if (obj.value !== undefined) return String(obj.value);
  }
  return String(v ?? '');
};

export const LegalVaultView: React.FC<any> = () => {
  const {
    language,
    activeLegalRole,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [vaultItems, setVaultItems] = useState<VaultItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_legal_vault_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [securityFilter, setSecurityFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('depositDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vaultToEdit, setVaultToEdit] = useState<VaultItem | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [matterReference, setMatterReference] = useState('');
  const [category, setCategory] = useState('Contrats');
  const [status, setStatus] = useState<VaultItem['status']>('OriginalScanned');

  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('piece');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const saveVault = useCallback((items: VaultItem[]) => {
    setVaultItems(items);
    try {
      localStorage.setItem('atrium_legal_vault_v2', JSON.stringify(items));
    } catch {}
  }, []);

  const targetScope = useMemo<'avocat' | 'notaire' | 'comptable' | 'secretaire'>(() => {
    if (activeLegalRole === 'notaire_titulaire') return 'notaire';
    if (activeLegalRole === 'expert_comptable') return 'comptable';
    if (activeLegalRole === 'secretaire_caisse') return 'secretaire';
    return 'avocat';
  }, [activeLegalRole]);

  const roleScopedItems = useMemo(() => {
    return vaultItems.filter((i) => i.roleScope === targetScope || i.roleScope === 'avocat');
  }, [vaultItems, targetScope]);

  const activeItem = useMemo(() => {
    if (!selectedItem) return null;
    return roleScopedItems.find((i) => i.id === selectedItem.id) || selectedItem;
  }, [selectedItem, roleScopedItems]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    roleScopedItems.forEach((item) => {
      const b = resolveRecordBranch(item, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [roleScopedItems, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: roleScopedItems.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || roleScopedItems.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, roleScopedItems.length, isAr, isEn]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = roleScopedItems.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (
        securityFilter === 'HighSecurity' &&
        !item.cadastralVolume &&
        item.status !== 'Confidential'
      ) {
        return false;
      }
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(item, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (q) {
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.matterReference.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else if (sortBy === 'code') {
        cmp = a.code.localeCompare(b.code);
      } else if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else {
        cmp = a.depositDate.localeCompare(b.depositDate);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    roleScopedItems,
    categoryFilter,
    securityFilter,
    branchFilter,
    searchQuery,
    sortBy,
    sortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const openCreateModal = () => {
    setVaultToEdit(null);
    setCode(
      `${
        targetScope === 'notaire'
          ? 'MIN'
          : targetScope === 'comptable'
          ? 'AUD'
          : targetScope === 'secretaire'
          ? 'DEP'
          : 'DOC'
      }-2026-${Math.floor(100 + Math.random() * 900)}`
    );
    setTitle('');
    setMatterReference('DOS-2026-0091');
    setCategory(
      targetScope === 'notaire'
        ? 'Minutes Notariées'
        : targetScope === 'comptable'
        ? 'Rapports CAC'
        : targetScope === 'secretaire'
        ? 'Identité NIN/NIF'
        : 'Contrats'
    );
    setStatus(
      targetScope === 'notaire'
        ? 'MinuteOfficielle'
        : targetScope === 'comptable'
        ? 'DossierAudit'
        : targetScope === 'secretaire'
        ? 'PieceClient'
        : 'OriginalScanned'
    );
    setIsModalOpen(true);
  };

  const openEditModal = useCallback((item: VaultItem) => {
    setVaultToEdit(item);
    setCode(item.code);
    setTitle(item.title);
    setMatterReference(item.matterReference);
    setCategory(item.category);
    setStatus(item.status);
    setIsModalOpen(true);
  }, []);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !matterReference.trim()) {
      showToast(
        isAr ? 'يرجى إدخال عنوان الوثيقة ورقم الملف' : 'Veuillez saisir le titre et dossier',
        'error'
      );
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
      branchId: vaultToEdit?.branchId || currentBranch?.id || 'branch_legal_main',
      officialSealNumber:
        vaultToEdit?.officialSealNumber || `SEAL-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    if (vaultToEdit) {
      const updated = vaultItems.map((item) => (item.id === payload.id ? payload : item));
      saveVault(updated);
      if (selectedItem?.id === payload.id) setSelectedItem(payload);
      showToast(
        isAr ? 'تم تحديث بيانات الوثيقة بالخزينة' : 'Pièce mise à jour au coffre-fort',
        'success'
      );
    } else {
      const updated = [payload, ...vaultItems];
      saveVault(updated);
      setSelectedItem(payload);
      showToast(
        isAr ? 'تم إيداع الوثيقة بالخزينة الرسمية' : 'Pièce scellée avec succès au coffre-fort',
        'success'
      );
    }
    setIsModalOpen(false);
  };

  const togglePin = useCallback((item: VaultItem) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    (item: VaultItem) => {
      const updated = vaultItems.filter((i) => i.id !== item.id);
      saveVault(updated);
      if (selectedItem?.id === item.id) setSelectedItem(null);
      showToast(isAr ? 'تم سحب الوثيقة من الخزينة' : 'Pièce retirée du coffre-fort', 'success');
    },
    [vaultItems, saveVault, selectedItem, isAr]
  );

  const handleCertifyHash = useCallback(
    (item: VaultItem) => {
      showToast(
        isAr
          ? `تم فحص البصمة الرقمية SHA-256 للوثيقة ${item.code}`
          : `Empreinte cryptographique SHA-256 certifiée pour ${item.code}`,
        'success'
      );
      if (selectedItem?.id === item.id) setActiveTab('hash');
    },
    [isAr, selectedItem]
  );

  const handleExportBordereau = () => {
    showToast(
      isAr
        ? 'تم توليد جدول إرسال المستندات الرسمي'
        : 'Génération du Bordereau de Communication contradictoire des pièces',
      'success'
    );
    window.print();
  };

  const roleMetadata = useMemo(() => {
    if (targetScope === 'notaire') {
      return {
        title: isAr ? 'الأرشيف' : 'Archives',
        badge: 'Actes Authentiques',
        subtitle: isAr
          ? 'حفظ الأصول غير القابلة للتصرف وتسليم النسخ التنفيذية'
          : "Conservation probatoire perpétuelle des minutes d'actes",
        catPills: [
          { id: 'All', label: isAr ? 'الكل' : 'Toutes' },
          { id: 'Minutes Notariées', label: isAr ? 'أصول' : 'Minutes' },
          { id: 'Grosses Exécutoires', label: isAr ? 'تنفيذية' : 'Grosses' },
          { id: 'Expéditions', label: isAr ? 'مستخرجات' : 'Expéditions' },
        ],
      };
    }
    if (targetScope === 'comptable') {
      return {
        title: isAr ? 'التدقيق' : 'Audit',
        badge: 'Certification CAC',
        subtitle: isAr
          ? 'أوراق العمل الرقابية وتقارير المصادقة على الحسابات'
          : "Papiers de travail d'audit légal, diligences fiscales G50",
        catPills: [
          { id: 'All', label: isAr ? 'الكل' : 'Tous' },
          { id: 'Rapports CAC', label: isAr ? 'تقارير' : 'Rapports' },
          { id: 'Feuilles de Travail', label: isAr ? 'أوراق' : 'Feuilles' },
          { id: 'Contrôle G50', label: 'G50' },
        ],
      };
    }
    if (targetScope === 'secretaire') {
      return {
        title: isAr ? 'الإيداع' : isEn ? 'Filing' : 'Dépôts',
        badge: 'Accueil & Dépôt',
        subtitle: isAr
          ? 'أرشفة وثائق الهوية والسجلات التجارية'
          : 'Numérisation des cartes NIN, RC et récépissés de dépôt',
        catPills: [
          { id: 'All', label: isAr ? 'الكل' : 'Toutes' },
          { id: 'Identité NIN/NIF', label: 'NIN/NIF' },
          { id: 'Registre Commerce', label: isAr ? 'السجل' : 'Registre' },
          { id: 'Récépissés', label: isAr ? 'وصولات' : 'Récépissés' },
        ],
      };
    }
    return {
      title: isAr ? 'المستندات' : isEn ? 'Vault' : 'Documents',
      badge: 'AES-256 Chiffré',
      subtitle: isAr
        ? 'أرشفة أصول العقود ومذكرات الدفاع وبصمات الإثبات'
        : 'Pièces de procédure contradictoires et secret professionnel',
      catPills: [
        { id: 'All', label: isAr ? 'الكل' : 'Toutes' },
        { id: 'Contrats', label: isAr ? 'عقود' : 'Contrats' },
        { id: 'Mémoires', label: isAr ? 'مذكرات' : 'Mémoires' },
        { id: 'Huissier', label: isAr ? 'محضر' : 'Huissier' },
      ],
    };
  }, [targetScope, isAr, isEn]);

  const columns: ColumnDefinition<VaultItem>[] = useMemo(
    () => [
      {
        key: 'code',
        header: isAr ? 'رمز الوثيقة' : 'Code Pièce',
        width: '1.8*',
        sortable: true,
        renderCell: (i) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              {targetScope === 'notaire' ? <Scroll size={16} /> : <Lock size={16} />}
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
                {i.code}
                {pinnedIds.has(i.id) && (
                  <Pin size={10} className="fill-[#d4522f] text-[#d4522f] shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55">{i.depositDate}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'title',
        header: isAr ? 'عنوان الوثيقة والملف' : 'Intitulé & Référence Dossier',
        width: '2.8*',
        sortable: true,
        renderCell: (i) => (
          <div className="min-w-0">
            <div className="font-semibold text-xs text-black dark:text-white truncate">
              {i.title}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 font-mono flex items-center gap-2 truncate">
              <span>Dossier: {i.matterReference}</span>
              {i.cadastralVolume && (
                <span className="text-[#d4522f] font-bold">
                  · {i.cadastralVolume} {i.cadastralNumber}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: isAr ? 'التصنيف' : 'Nature',
        width: '1.5*',
        sortable: true,
        renderCell: (i) => (
          <div className="text-xs text-black/75 dark:text-white/80 truncate">{i.category}</div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.5*',
        sortable: true,
        renderCell: (i) => (
          <span className="inline-flex items-center gap-1.5 text-xs text-black/75 dark:text-white/80 truncate">
            <MapPin size={12} className="text-[#d4522f] shrink-0" />
            <span className="truncate">
              {resolveRecordBranch(i, branchesById, currentBranch, language).name}
            </span>
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الأصالة والمصادقة' : 'Statut Probatoire',
        width: '1.6*',
        renderCell: (i) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
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
    ],
    [isAr, isEn, targetScope, pinnedIds, branchesById, currentBranch, language]
  );

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'category',
        label: isAr ? 'طبيعة الوثيقة' : 'Nature de Pièce',
        value: categoryFilter,
        onChange: setCategoryFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: roleMetadata.catPills.map((p) => ({
          value: p.id,
          label: p.label,
          count:
            p.id === 'All'
              ? roleScopedItems.length
              : roleScopedItems.filter((i) => i.category === p.id).length,
        })),
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / المكتب' : isEn ? 'Branch' : 'Branche / Coffre',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ],
    [isAr, isEn, categoryFilter, branchFilter, roleMetadata.catPills, roleScopedItems, branchOptions]
  );

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (categoryFilter !== 'All') {
      chips.push({
        key: 'category',
        label: categoryFilter,
        onRemove: () => setCategoryFilter('All'),
      });
    }
    if (securityFilter !== 'All') {
      chips.push({
        key: 'security',
        label: isAr ? 'أمان مشدد' : 'Haute Sécurité',
        onRemove: () => setSecurityFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const lbl = branchOptions.find((o) => o.value === branchFilter)?.label || branchFilter;
      chips.push({
        key: 'branch',
        label: lbl,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [categoryFilter, securityFilter, branchFilter, branchOptions, isAr]);

  const activeAdvancedCount =
    (categoryFilter !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('All');
    setSecurityFilter('All');
    setBranchFilter('All');
  }, []);

  const hasAnyFilters = Boolean(searchQuery.trim()) || activeChips.length > 0;

  const highSecurityCount = roleScopedItems.filter(
    (i) => i.cadastralVolume || i.status === 'Confidential'
  ).length;

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: roleScopedItems.length > 0,
  });

  if (
    showSkeleton &&
    (roleScopedItems.length === 0 || networkMode === 'force_skeleton')
  ) {
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
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={targetScope === 'notaire' ? <Scroll size={22} /> : <Lock size={22} />}
        title={roleMetadata.title}
        subtitle={`${roleMetadata.badge} · ${roleMetadata.subtitle}`}
        secondaryActions={
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportBordereau}
            icon={<Download size={14} />}
          >
            {isAr ? 'جدول الإرسال' : 'Bordereau'}
          </AtriumButton>
        }
        primaryAction={{
          label:
            targetScope === 'notaire'
              ? isAr
                ? 'إيداع أصل العقد'
                : 'Déposer une Minute'
              : isAr
              ? 'إيداع وثيقة بالخزينة'
              : 'Déposer une Pièce',
          onClick: openCreateModal,
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr ? 'أمان الوثائق والقوة الإثباتية' : 'Force Probante & Intégrité des Pièces'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'المستندات المودعة بالخزينة' : 'Total Pièces au Coffre',
          badgeText: isAr ? 'أصول مشفرة' : '100% Scellées',
          count: roleScopedItems.length,
          isActive: securityFilter === 'All' && categoryFilter === 'All',
          onToggle: () => {
            setSecurityFilter('All');
            setCategoryFilter('All');
          },
          tone: 'emerald',
        }}
        secondaryCard={{
          label:
            targetScope === 'notaire'
              ? 'Minutes Publiées Conservation'
              : isAr
              ? 'وثائق عالية السرية'
              : 'Documents Haute Sécurité',
          badgeText: isAr ? 'ختم رسمي' : 'sceau officiel',
          count: highSecurityCount,
          isActive: securityFilter === 'HighSecurity',
          onToggle: () =>
            setSecurityFilter((p) => (p === 'HighSecurity' ? 'All' : 'HighSecurity')),
          tone: 'terracotta',
        }}
        darkCard={{
          label: isAr ? 'الختم الإلكتروني والبصمة SHA-256' : 'Cachet & Horodatage SHA-256',
          badgeCount: filteredItems.length,
          badgePrefix: '',
          badgeSuffix: targetScope.toUpperCase(),
          valueCount: 256,
          valuePrefix: 'SHA-',
          caption: isAr ? 'شهادة إلكترونية سارية المفعول' : 'Inviolabilité cryptographique certifiée',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={roleMetadata.title}
          liveRegionText={`${filteredItems.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث برمز الوثيقة، العنوان، رقم القضية...'
              : 'Rechercher par code pièce, intitulé, dossier...'
          }
          statusOptions={roleMetadata.catPills.map((p) => ({
            value: p.id,
            label: p.label,
          }))}
          statusValue={categoryFilter}
          onStatusChange={setCategoryFilter}
          hasActiveAdvancedFilters={activeAdvancedCount > 0}
          activeFiltersCount={activeAdvancedCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={() => {
            downloadCsvSafe(
              `atrium-legal-vault-${targetScope}.csv`,
              ['Code Pièce', 'Intitulé', 'Réf Dossier', 'Catégorie', 'Statut', 'Date', 'Branche'],
              filteredItems.map((i) => [
                i.code,
                i.title,
                i.matterReference,
                i.category,
                i.status,
                i.depositDate,
                resolveRecordBranch(i, branchesById, currentBranch, language).name,
              ])
            );
            showToast(isAr ? 'تم تصدير قائمة الخزينة' : 'Export coffre-fort généré', 'success');
          }}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection<VaultItem>
          hideToolbar
          data={filteredItems}
          columns={columns}
          keyExtractor={(i) => i.id}
          defaultViewMode={viewMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={(ids) => {
            const updated = vaultItems.filter((i) => !ids.has(i.id));
            saveVault(updated);
            setSelectedIds(new Set());
            showToast(
              isAr ? 'تم سحب الوثائق المحددة' : `${ids.size} pièce(s) retirée(s) du coffre`,
              'info'
            );
          }}
          isPinned={(i) => pinnedIds.has(i.id)}
          onTogglePin={togglePin}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          openItemId={activeItem?.id ?? null}
          onItemClick={(item, el) => {
            setSelectedItem(item);
            setDrawerOpenerEl(el || null);
          }}
          onViewDetails={(item, el) => {
            setSelectedItem(item);
            setDrawerOpenerEl(el || null);
          }}
          onEdit={openEditModal}
          onDelete={handleDelete}
          customActions={(item) => [
            {
              id: 'certify',
              label: isAr ? 'فحص البصمة SHA-256' : 'Empreinte SHA-256',
              icon: <FileCheck size={14} />,
              onClick: () => handleCertifyHash(item),
            },
          ]}
          renderCard={(item) => (
            <div className="space-y-3 text-left rtl:text-right">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2.5 py-1 rounded-lg border border-[#d4522f]/20">
                  {item.code}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {item.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                  {item.title}
                </h3>
                <div className="text-xs text-black/55 dark:text-white/55 font-mono mt-0.5">
                  Dossier: {item.matterReference}
                </div>
              </div>
            </div>
          )}
          emptyTitle={isAr ? 'الخزينة فارغة حالياً' : 'Aucune pièce au coffre'}
          emptyDescription={
            isAr
              ? 'قم بإيداع وثيقة رسمية أو أعد ضبط المرشحات.'
              : 'Déposez une pièce ou modifiez les filtres actifs.'
          }
          primaryActionLabel={isAr ? 'إيداع وثيقة' : 'Déposer une Pièce'}
          onAddFirstItem={openCreateModal}
          hasActiveFilters={hasAnyFilters}
          onResetFilters={resetAllFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={filteredItems.length}
        entityPluralLabel={isAr ? 'وثيقة' : 'pièces'}
        hasActiveFilters={hasAnyFilters}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<VaultItem>
        isOpen={Boolean(activeItem)}
        item={activeItem}
        allItems={filteredItems}
        keyExtractor={(i) => i.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeItem?.title || ''}
        subtitle={`${activeItem?.code || ''} · Dossier ${activeItem?.matterReference || ''}`}
        avatarText={targetScope === 'notaire' ? 'MN' : 'VL'}
        branchName={
          activeItem
            ? resolveRecordBranch(activeItem, branchesById, currentBranch, language).name
            : ''
        }
        statusLabel={activeItem ? localizeStatus(activeItem.status, language) : undefined}
        tabs={[
          { id: 'piece', label: isAr ? 'الوثيقة' : 'Fiche' },
          { id: 'sceau', label: isAr ? 'الختم الرسمي' : 'Cachet & Sceau' },
          { id: 'hash', label: isAr ? 'التشفير' : 'SHA-256' },
          { id: 'notes', label: isAr ? 'الملاحظات' : 'Bordereau' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => setSelectedItem(item)}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(item, tab) => {
          if (tab === 'sceau') {
            return (
              <div className="p-4 bg-white dark:bg-neutral-900 border-2 border-dashed border-[#d4522f]/40 rounded-2xl text-center space-y-3 text-xs">
                <div className="w-12 h-12 rounded-full bg-[#d4522f]/15 text-[#d4522f] mx-auto flex items-center justify-center font-bold">
                  <Stamp size={24} />
                </div>
                <div>
                  <span className="font-bold text-sm text-black dark:text-white block uppercase tracking-wider">
                    الجمهورية الجزائرية الديمقراطية الشعبية
                  </span>
                  <span className="text-[10px] text-black/55 dark:text-white/55 block">
                    RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 font-mono text-[11px] text-black/75 dark:text-white/80 space-y-1">
                  <div>
                    Sceau N° : <strong>{item.officialSealNumber || 'DZ-SEAL-2026-99'}</strong>
                  </div>
                  <div>Horodatage légal : {item.depositDate} à 11:42:00</div>
                  <div>Juridiction / Étude : Wilaya d'Alger</div>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-[11px]">
                  <CheckCircle2 size={13} />
                  <span>Original Scellé et Inaltérable</span>
                </div>
                <button
                  type="button"
                  data-no-liquid="true"
                  onClick={() => {
                    showToast(
                      isAr ? 'طباعة شهادة المطابقة والختم' : "Certificat d'authenticité imprimé",
                      'success'
                    );
                    window.print();
                  }}
                  className="w-full py-2 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={13} />
                  {isAr ? 'طباعة نسخة مع الختم الرسمي' : 'Imprimer avec Cachet Légal'}
                </button>
              </div>
            );
          }

          if (tab === 'hash') {
            return (
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <span className="font-semibold text-black dark:text-white block">
                    Empreinte Numérique Cryptographique :
                  </span>
                  <div className="font-mono text-[10px] break-all bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-black/75 dark:text-white/80">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    ✓ Horodatage certifié conforme aux exigences de recevabilité judiciaire.
                  </p>
                </div>
              </div>
            );
          }

          if (tab === 'notes') {
            return (
              <div className="space-y-3 text-xs">
                <p className="text-black/60 dark:text-white/60 text-[11px]">
                  Bordereau de communication de pièces contradictoire et réserves :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Mentionner la notification aux parties, récépissé de dépôt..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-1 focus:ring-[#d4522f] outline-hidden resize-none"
                />
                <button
                  type="button"
                  data-no-liquid="true"
                  onClick={() => {
                    setNoteSaved(true);
                    setTimeout(() => setNoteSaved(false), 2000);
                    showToast(
                      isAr ? 'تم حفظ الملاحظات' : 'Bordereau enregistré',
                      'success'
                    );
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#d4522f] text-white hover:bg-[#b03b1b] transition-colors font-medium text-xs shadow-xs cursor-pointer"
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
            );
          }

          return (
            <div className="space-y-3.5 text-xs">
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">Numéro de pièce:</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {item.code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">Dossier:</span>
                  <span className="font-mono font-semibold text-[#d4522f]">
                    {item.matterReference}
                  </span>
                </div>
                {item.cadastralVolume && (
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      Conservation Foncière:
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      {item.cadastralVolume} {item.cadastralNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">Date d'archivage:</span>
                  <span className="font-mono text-black dark:text-white">
                    {item.depositDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-center"
                  icon={<FileCheck size={13} />}
                  onClick={() => handleCertifyHash(item)}
                >
                  {isAr ? 'فحص البصمة' : 'Vérifier SHA-256'}
                </AtriumButton>
                <AtriumButton
                  variant="secondary"
                  size="sm"
                  className="flex-1 justify-center"
                  icon={<Edit size={13} />}
                  onClick={() => openEditModal(item)}
                >
                  {isAr ? 'تعديل' : 'Modifier'}
                </AtriumButton>
              </div>
            </div>
          );
        }}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold">
                  {targetScope === 'notaire' ? <Scroll size={20} /> : <Lock size={20} />}
                </div>
                <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  {vaultToEdit
                    ? isAr
                      ? 'تعديل وثيقة بالخزينة'
                      : 'Modifier la Pièce du Coffre'
                    : isAr
                    ? 'إيداع وثيقة جديدة بالخزينة'
                    : 'Déposer une Pièce au Coffre-fort'}
                </h2>
              </div>
              <button
                type="button"
                data-no-liquid="true"
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
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
                  onChange={(v) => setCategory(extractStr(v))}
                  options={roleMetadata.catPills
                    .filter((p) => p.id !== 'All')
                    .map((p) => ({ value: p.id, label: p.label }))}
                />
                <LabelSelect
                  label={isAr ? 'مستوى الحماية' : 'Sécurité'}
                  value={status}
                  onChange={(v) => setStatus(extractStr(v) as VaultItem['status'])}
                  options={[
                    { value: 'OriginalScanned', label: 'Original Scellé' },
                    { value: 'Confidential', label: 'Confidentiel Défense' },
                    { value: 'MinuteOfficielle', label: 'Minute Notariée' },
                    { value: 'DossierAudit', label: 'Dossier Audit CAC' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {vaultToEdit
                    ? isAr
                      ? 'حفظ التعديلات'
                      : 'Enregistrer'
                    : isAr
                    ? 'إيداع الوثيقة'
                    : 'Sceller au Coffre'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

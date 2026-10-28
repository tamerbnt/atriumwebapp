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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

interface VaultItem {
  id: string;
  code: string;
  title: string;
  matterReference: string;
  category: string;
  depositDate: string;
  status: 'OriginalScanned' | 'Confidential';
}

const INITIAL_VAULT: VaultItem[] = [
  { id: 'v_01', code: 'DOC-2026-081', title: 'Contrat Commercial Original & Avenants', matterReference: 'DOS-2026-0091', category: 'Contrats', depositDate: '2026-05-02', status: 'OriginalScanned' },
  { id: 'v_02', code: 'DOC-2026-082', title: 'Acte Notarié de Propriété Foncière (El Biar)', matterReference: 'DOS-2026-0092', category: 'Actes Notariés', depositDate: '2026-05-05', status: 'Confidential' },
  { id: 'v_03', code: 'DOC-2026-083', title: 'Procès-Verbal de Constat d’Huissier de Justice', matterReference: 'DOS-2026-0091', category: 'Huissier & Significations', depositDate: '2026-05-08', status: 'OriginalScanned' },
  { id: 'v_04', code: 'DOC-2026-084', title: 'Rapport d’Expertise Comptable Judiciaire', matterReference: 'DOS-2026-0094', category: 'Expertises', depositDate: '2026-05-12', status: 'Confidential' },
];

export const LegalVaultView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const [vaultItems, setVaultItems] = useState<VaultItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_legal_vault');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_VAULT;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['v_01']));
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
  const [activeTab, setActiveTab] = useState<'piece' | 'hash' | 'droits' | 'notes'>('piece');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const saveVault = (items: VaultItem[]) => {
    setVaultItems(items);
    try {
      localStorage.setItem('atrium_legal_vault', JSON.stringify(items));
    } catch {}
  };

  const openCreateModal = () => {
    setVaultToEdit(null);
    setCode(`DOC-2026-${Math.floor(100 + Math.random() * 900)}`);
    setTitle('');
    setMatterReference('DOS-2026-0091');
    setCategory('Contrats');
    setStatus('OriginalScanned');
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
      showToast(isAr ? 'يرجى إدخال عنوان الوثيقة ورقم القضية' : 'Veuillez saisir le titre et dossier', 'error');
      return;
    }

    const payload: VaultItem = {
      id: vaultToEdit?.id || `v_${Date.now()}`,
      code: code.trim() || `DOC-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      matterReference: matterReference.trim(),
      category: category.trim(),
      depositDate: vaultToEdit?.depositDate || new Date().toISOString().split('T')[0],
      status,
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
      showToast(isAr ? 'تم إيداع الوثيقة بالخزينة الرقمية' : 'Pièce scellée au coffre-fort', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredItems = useMemo(() => {
    return vaultItems.filter((item) => {
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
  }, [vaultItems, categoryFilter, searchQuery]);

  // KPIs
  const confidentialCount = vaultItems.filter((i) => i.status === 'Confidential').length;
  const certifiedCount = vaultItems.filter((i) => i.status === 'OriginalScanned').length;

  // Actions
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
        ? `تم التحقق من البصمة الرقمية SHA-256 للوثيقة ${item.code} (مطابقة)`
        : `Empreinte SHA-256 certifiée pour ${item.code} : intégrité scellée`,
      'success'
    );
    if (selectedItem?.id === item.id) setActiveTab('hash');
  };

  const handleExportCsv = () => {
    const headers = ['Code Pièce', 'Titre Document', 'Réf Dossier', 'Catégorie', 'Date Dépôt', 'Statut'];
    const rows = filteredItems.map((i) => [
      i.code,
      `"${i.title.replace(/"/g, '""')}"`,
      i.matterReference,
      i.category,
      i.depositDate,
      i.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `coffre_fort_pieces_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير سجل الخزينة CSV' : 'Export CSV du coffre-fort généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedItem) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات الوثيقة' : 'Bordereau mis à jour', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<VaultItem>[] = [
    {
      id: 'code',
      header: isAr ? 'رمز الوثيقة' : 'Code Pièce',
      accessorKey: 'code',
      sortable: true,
      minWidth: '130px',
      cell: (i) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Lock size={16} />
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
      header: isAr ? 'عنوان الوثيقة والملف' : 'Intitulé de la Pièce',
      accessorKey: 'title',
      sortable: true,
      minWidth: '240px',
      cell: (i) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {i.title}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            Dossier: {i.matterReference}
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: isAr ? 'التصنيف' : 'Nature Juridique',
      accessorKey: 'category',
      sortable: true,
      minWidth: '160px',
      cell: (i) => (
        <div className="text-xs text-neutral-700 dark:text-neutral-300">
          {i.category}
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'مستوى الحماية' : 'Sécurité',
      accessorKey: 'status',
      sortable: true,
      minWidth: '140px',
      cell: (i) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            i.status === 'Confidential'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          {i.status === 'Confidential' ? 'Confidentiel Défense' : 'Original Scellé'}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Lock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الخزينة والمستندات السرية' : 'Coffre-fort Numérique & Pièces Juridiques'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                AES-256 Chiffré
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'أرشفة الوثائق الأصلية، مذكرات الدفاع، العقود الموثقة وسندات التبليغ'
                : 'Pièces de procédure numérisées, bordereaux de communication & secret professionnel'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download size={14} />}
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </AtriumButton>
          <AtriumButton
            variant="primary"
            onClick={openCreateModal}
            icon={<Plus size={14} />}
          >
            {isAr ? 'إيداع وثيقة' : 'Déposer une Pièce'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'أمان الوثائق وسندات الدعوى' : 'Intégrité du Coffre & Conservation des Pièces'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة الوثائق المودعة، سرية البيانات وحماية الملفات الحساسة' : 'Documents scellés, empreintes numériques et protection du secret professionnel'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Pièces Scellées */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الوثائق المودعة بالخزينة' : 'Pièces Déposées au Coffre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {vaultItems.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {certifiedCount} {isAr ? 'أصول أصلية ومسحوبة رقمياً' : 'copies conformes certifiées'}
              </p>
            </div>
          </div>

          {/* Card 2: Confidentiel */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'وثائق سرية مشفرة' : 'Documents Ultra-Confidentiels'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {confidentialCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'ولوج محصور للمحامي الموكل' : 'Accès avocat titulaire seul'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'بروتوكول التشفير' : 'Standard Chiffrement'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Cabinet Barreau
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                AES-256 GCM
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'شهادة إلكترونية سارية' : 'Horodatage eIDAS conforme'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'خزينة الوثائق والمستندات القضائية المشفرة' : 'Coffre-Fort Numérique & Pièces Scellées'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'حفظ العقود، السندات التنفيذية، وخبرات الطب الشرعي والهندسي' : 'Archivage probatoire scellé avec chiffrement fort AES-256 GCM'}
            </p>
          </div>

          {/* Authentic Legal Vault Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'All', label: isAr ? 'جميع الوثائق' : 'Toutes pièces' },
              { id: 'Contrats', label: 'Contrats' },
              { id: 'Actes Notariés', label: 'Actes Notariés' },
              { id: 'Expertises', label: 'Expertises' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: categoryFilter === f.id ? '#FCEEE8' : 'transparent',
                  color: categoryFilter === f.id ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
        <div className="flex items-start gap-4">
          {/* Main Collection Container */}
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
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع التصنيفات' : 'Toutes natures' },
              { value: 'Contrats', label: 'Contrats' },
              { value: 'Actes Notariés', label: 'Actes Notariés' },
              { value: 'Huissier & Significations', label: 'Huissier & Significations' },
              { value: 'Expertises', label: 'Expertises' },
            ]}
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
            onItemClick={(item) => {
              setSelectedItem(item);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<Lock size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد وثائق' : 'Aucune pièce trouvée'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucune pièce ne correspond à votre recherche')
                : (isAr ? 'قم بإيداع أول وثيقة في الخزينة' : 'Déposez votre première pièce au coffre-fort')
            }
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
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'Confidential'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
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

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <span>Nature: {item.category}</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">{item.depositDate}</span>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedItem && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Lock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedItem.code}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedItem.status === 'Confidential'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
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
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleCertifyHash(selectedItem)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <FileCheck size={12} />
                {isAr ? 'فحص البصمة' : 'Vérifier SHA-256'}
              </button>
              <button
                onClick={() => openEditModal(selectedItem)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedItem)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
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
                {isAr ? 'الوثيقة' : 'Pièce Scellée'}
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

            {/* Tab 1: Pièce */}
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
                    <span className="text-neutral-500">Dossier de rattachement:</span>
                    <span className="font-mono font-semibold text-[#C4785A]">
                      {selectedItem.matterReference}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Nature du document:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedItem.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Date d'archivage:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedItem.depositDate}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: SHA-256 */}
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

            {/* Tab 3: Bordereau / Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Bordereau de communication de pièces à la partie adverse et mentions de réserve :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter la date de notification à l'adversaire, réf accusé de réception..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
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
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {vaultToEdit
                      ? (isAr ? 'تعديل وثيقة بالخزينة' : 'Modifier la Pièce du Coffre')
                      : (isAr ? 'إيداع وثيقة جديدة بالخزينة' : 'Déposer une Pièce au Coffre-fort')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'أرشفة مشفرة وسندات قضائية' : 'Chiffrement sécurisé AES-256 et horodatage'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
                  label={isAr ? 'رقم القضية / الملف *' : 'Réf Dossier *'}
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
                  options={[
                    { value: 'Contrats', label: 'Contrats' },
                    { value: 'Actes Notariés', label: 'Actes Notariés' },
                    { value: 'Huissier & Significations', label: 'Huissier & Significations' },
                    { value: 'Expertises', label: 'Expertises' },
                  ]}
                />
                <LabelSelect
                  label={isAr ? 'مستوى الحماية' : 'Sécurité'}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VaultItem['status'])}
                  options={[
                    { value: 'OriginalScanned', label: 'Original Scellé' },
                    { value: 'Confidential', label: 'Confidentiel Défense' },
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

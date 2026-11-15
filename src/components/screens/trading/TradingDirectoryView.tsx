import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Phone,
  FileText,
  Edit,
  Trash2,
  Clock,
  ShieldCheck,
  Download,
  Building2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { B2bClient, B2bSupplier } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { B2bEntityModal } from './B2bEntityModal';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useTranslation } from '../../../utils/useTranslation';
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

type DirectoryMode = 'clients' | 'suppliers';

export const TradingDirectoryView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    b2bClients,
    b2bSuppliers,
    commercialDocs,
    deleteB2bClient,
    deleteB2bSupplier,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [mode, setMode] = useState<DirectoryMode>('clients');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [overLimitOnly, setOverLimitOnly] = useState<boolean>(false);
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('company');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<B2bClient | B2bSupplier | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<B2bClient | B2bSupplier | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<B2bClient | B2bSupplier | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const metrics = useMemo(() => {
    const totalClientDebt = b2bClients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
    const totalCreditLimit = b2bClients.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const branchCounts = new Map<string, number>();
    [...b2bClients, ...b2bSuppliers].forEach((e) => {
      const bName = resolveRecordBranch(e, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalClientDebt,
      totalCreditLimit,
      totalSupplierDebt: b2bSuppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0),
      creditUtilization: totalCreditLimit > 0 ? (totalClientDebt / totalCreditLimit) * 100 : 0,
      overLimitClients: b2bClients.filter((c) => (c.outstandingBalance || 0) > (c.creditLimit || 0)).length,
      branchCounts,
    };
  }, [b2bClients, b2bSuppliers, branchesById, currentBranch, language]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return b2bClients
      .filter((c) => {
        if (overLimitOnly && (c.outstandingBalance || 0) <= (c.creditLimit || 0)) return false;
        if (branchFilter !== 'All') {
          const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
          if (bName !== branchFilter) return false;
        }
        if (q) {
          const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name.toLowerCase();
          if (
            !c.companyName.toLowerCase().includes(q) &&
            !(c.contactName || '').toLowerCase().includes(q) &&
            !(c.nif || '').toLowerCase().includes(q) &&
            !(c.city || '').toLowerCase().includes(q) &&
            !bName.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const ap = pinnedIds.has(a.id);
        const bp = pinnedIds.has(b.id);
        if (ap && !bp) return -1;
        if (!ap && bp) return 1;
        let cmp = 0;
        if (sortBy === 'balance') cmp = (a.outstandingBalance || 0) - (b.outstandingBalance || 0);
        else if (sortBy === 'city') cmp = (a.city || '').localeCompare(b.city || '');
        else cmp = a.companyName.localeCompare(b.companyName);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [b2bClients, overLimitOnly, branchFilter, searchQuery, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return b2bSuppliers
      .filter((s) => {
        if (branchFilter !== 'All') {
          const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
          if (bName !== branchFilter) return false;
        }
        if (q) {
          const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name.toLowerCase();
          if (
            !s.supplierName.toLowerCase().includes(q) &&
            !(s.contactName || '').toLowerCase().includes(q) &&
            !(s.nif || '').toLowerCase().includes(q) &&
            !(s.city || '').toLowerCase().includes(q) &&
            !bName.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const ap = pinnedIds.has(a.id);
        const bp = pinnedIds.has(b.id);
        if (ap && !bp) return -1;
        if (!ap && bp) return 1;
        const cmp = a.supplierName.localeCompare(b.supplierName);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [b2bSuppliers, branchFilter, searchQuery, pinnedIds, sortDir, branchesById, currentBranch, language]);

  const handleExportCsv = useCallback(() => {
    if (mode === 'clients') {
      const headers = ['Raison Sociale', 'NIF', 'RC', 'Interlocuteur', 'Téléphone', 'Wilaya', 'Branche', 'Encours', 'Plafond'];
      const rows = filteredClients.map((c) => [
        c.companyName,
        c.nif || '',
        c.rc || '',
        c.contactName || '',
        c.phone || c.contactPhone || '',
        c.city || '',
        resolveRecordBranch(c, branchesById, currentBranch, language).name,
        c.outstandingBalance || 0,
        c.creditLimit || 0,
      ]);
      downloadCsvSafe(`atrium-b2b-clients-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    } else {
      const headers = ['Fournisseur', 'NIF', 'RC', 'Contact', 'Téléphone', 'Ville', 'Branche', 'Dette'];
      const rows = filteredSuppliers.map((s) => [
        s.supplierName,
        s.nif || '',
        s.rc || '',
        s.contactName || '',
        s.phone || '',
        s.city || '',
        resolveRecordBranch(s, branchesById, currentBranch, language).name,
        s.outstandingPayable || 0,
      ]);
      downloadCsvSafe(`atrium-b2b-suppliers-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    }
  }, [mode, filteredClients, filteredSuppliers, branchesById, currentBranch, language]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOptions = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches' },
      ...Array.from(metrics.branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الوكالة' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
      {
        id: 'risk',
        label: isAr ? 'مخاطر الائتمان' : isEn ? 'Credit Risk' : 'Risque crédit',
        value: overLimitOnly ? 'over' : 'all',
        onChange: (val) => setOverLimitOnly(val === 'over'),
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'over', label: isAr ? 'تجاوز السقف' : isEn ? 'Over Limit' : 'Hors plafond' },
        ],
      },
    ];
  }, [branchFilter, overLimitOnly, metrics.branchCounts, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (overLimitOnly) {
      chips.push({
        key: 'risk',
        label: isAr ? 'تجاوز السقف' : 'Hors plafond',
        onRemove: () => setOverLimitOnly(false),
      });
    }
    return chips;
  }, [branchFilter, overLimitOnly, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (overLimitOnly ? 1 : 0);

  const clientColumns: ColumnDefinition<B2bClient>[] = useMemo(
    () => [
      {
        key: 'company',
        header: t('trading_col_company', 'Raison Sociale & Secteur'),
        minWidth: '210px',
        sortable: true,
        renderCell: (c) => (
          <div className="text-xs">
            <span className="font-bold text-black dark:text-white block">{c.companyName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">{c.sector || 'Entreprise B2B'}</span>
          </div>
        ),
      },
      {
        key: 'legal',
        header: 'N.I.F. / R.C.',
        width: '170px',
        renderCell: (c) => (
          <div className="text-xs font-mono">
            <span className="block font-medium text-black dark:text-white">NIF: {c.nif || 'N/A'}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">RC: {c.rc || 'N/A'}</span>
          </div>
        ),
      },
      {
        key: 'contact',
        header: t('trading_col_contact', 'Interlocuteur'),
        width: '165px',
        renderCell: (c) => (
          <div className="text-xs">
            <span className="font-semibold text-black dark:text-white block">{c.contactName || 'N/A'}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{c.phone || c.contactPhone}</span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        renderCell: (c) => {
          const b = resolveRecordBranch(c, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'city',
        header: t('trading_col_city', 'Wilaya'),
        width: '100px',
        sortable: true,
        renderCell: (c) => <span className="text-xs text-black/70 dark:text-white/75">{c.city}</span>,
      },
      {
        key: 'balance',
        header: t('trading_col_balance', 'Encours / Crédit'),
        width: '155px',
        sortable: true,
        renderCell: (c) => {
          const isOver = (c.outstandingBalance || 0) > (c.creditLimit || 0);
          return (
            <div className="text-xs font-mono tabular-nums">
              <span className={`font-bold block ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                {formatMoney(c.outstandingBalance || 0)}
              </span>
              <span className="text-[10px] text-black/55 dark:text-white/55">
                Plafond: {formatMoney(c.creditLimit || 0)}
              </span>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        width: '90px',
        renderCell: (c) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingEntity(c);
                setEntityModalOpen(true);
              }}
              aria-label={t('action_edit', 'Modifier')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(c);
              }}
              aria-label={t('action_delete', 'Supprimer')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language]
  );

  const supplierColumns: ColumnDefinition<B2bSupplier>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('trading_col_supplier', 'Fournisseur Référencé'),
        minWidth: '210px',
        sortable: true,
        renderCell: (s) => (
          <div className="text-xs">
            <span className="font-bold text-black dark:text-white block">{s.supplierName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">{s.sector || 'Fournisseur'}</span>
          </div>
        ),
      },
      {
        key: 'legal',
        header: 'N.I.F. / R.C.',
        width: '170px',
        renderCell: (s) => (
          <div className="text-xs font-mono">
            <span className="block font-medium text-black dark:text-white">NIF: {s.nif || 'N/A'}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">RC: {s.rc || 'N/A'}</span>
          </div>
        ),
      },
      {
        key: 'contact',
        header: t('trading_col_contact', 'Contact & Tél'),
        width: '165px',
        renderCell: (s) => (
          <div className="text-xs">
            <span className="font-semibold text-black dark:text-white block">{s.contactName || 'Standard'}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{s.phone}</span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        renderCell: (s) => {
          const b = resolveRecordBranch(s, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'city',
        header: t('trading_col_city', 'Ville'),
        width: '105px',
        renderCell: (s) => <span className="text-xs text-black/70 dark:text-white/75">{s.city}</span>,
      },
      {
        key: 'payable',
        header: t('trading_col_debt', 'Dette Fournisseur'),
        width: '145px',
        renderCell: (s) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatMoney(s.outstandingPayable || 0)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '90px',
        renderCell: (s) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingEntity(s);
                setEntityModalOpen(true);
              }}
              aria-label={t('action_edit', 'Modifier')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(s);
              }}
              aria-label={t('action_delete', 'Supprimer')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language]
  );

  const entityHistory = useMemo(() => {
    if (!selectedEntity || mode !== 'clients') return [];
    return commercialDocs.filter((d) => d.clientId === selectedEntity.id);
  }, [selectedEntity, mode, commercialDocs]);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: b2bClients.length > 0 || b2bSuppliers.length > 0,
  });

  if (showSkeleton && ((b2bClients.length === 0 && b2bSuppliers.length === 0) || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '140px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Users size={22} />}
        title={t('trading_directory_title', 'Partenaires')}
        subtitle={`${b2bClients.length} ${isAr ? 'عميل' : 'Clients'} · ${b2bSuppliers.length} ${isAr ? 'مورد' : 'Fournisseurs'}`}
        primaryAction={{
          label:
            mode === 'clients'
              ? isAr
                ? 'عميل تجاري جديد'
                : 'Nouveau Client B2B'
              : isAr
              ? 'مورد جديد'
              : 'Nouveau Fournisseur',
          icon: <Plus size={15} />,
          onClick: () => {
            setEditingEntity(null);
            setEntityModalOpen(true);
          },
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الشركاء B2B' : isEn ? 'B2B Partners Metrics' : 'Indicateurs Partenaires B2B'}
        language={language}
        primaryCard={{
          label: isAr ? 'العملاء التجاريون المعتمدون' : 'Clients B2B Référencés',
          count: b2bClients.length,
          badgeText: `${b2bClients.length} comptes`,
          tone: 'emerald',
          title: `Plafond global: ${formatMoney(metrics.totalCreditLimit)}`,
          isActive: mode === 'clients',
          onToggle: () => {
            setMode('clients');
            setSelectedEntity(null);
            setSelectedEntityIds(new Set<string>());
          },
        }}
        secondaryCard={{
          label: isAr ? 'الموردون والمستحقات' : 'Fournisseurs & Dettes Achats',
          count: metrics.totalSupplierDebt,
          formatValue: (v) => formatMoney(v),
          badgeText: `(${b2bSuppliers.length} fournisseurs)`,
          tone: 'terracotta',
          title: 'Dettes fournisseurs exigibles sous 30/60j',
          isActive: mode === 'suppliers',
          onToggle: () => {
            setMode('suppliers');
            setSelectedEntity(null);
            setSelectedEntityIds(new Set<string>());
          },
        }}
        darkCard={{
          label: isAr ? 'إجمالي الديون التجارية للعملاء' : 'Encours B2B & Risque Crédit',
          valueCount: metrics.totalClientDebt,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v),
          badgeCount: Math.round(metrics.creditUtilization),
          badgePrefix: '',
          badgeSuffix: '% Plafond',
          caption:
            metrics.overLimitClients > 0
              ? `${metrics.overLimitClients} dépassement(s) de plafond`
              : 'Tous les encours dans les limites',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            mode === 'clients'
              ? t('trading_directory_clients_title', 'Portefeuille Clients')
              : t('trading_directory_suppliers_title', 'Fournisseurs Référencés')
          }
          liveRegionText={
            mode === 'clients' ? `${filteredClients.length} clients` : `${filteredSuppliers.length} fournisseurs`
          }
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث باسم الشركة، المسؤول، NIF...' : 'Rechercher raison sociale, contact, NIF...'
          }
          statusOptions={[
            { value: 'clients', label: isAr ? 'العملاء' : 'Clients', count: b2bClients.length },
            { value: 'suppliers', label: isAr ? 'الموردون' : isEn ? 'Suppliers' : 'Fournisseurs', count: b2bSuppliers.length },
          ]}
          statusValue={mode}
          onStatusChange={(val) => {
            setMode(val as DirectoryMode);
            setSelectedEntity(null);
            setSelectedEntityIds(new Set<string>());
          }}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setOverLimitOnly(false);
            setSearchQuery('');
          }}
        />

        {mode === 'clients' ? (
          <UniversalDataCollection<B2bClient>
            hideToolbar
            data={filteredClients}
            keyExtractor={(c) => c.id}
            viewMode={viewMode}
            columns={clientColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            openItemId={selectedEntity?.id ?? null}
            selectedIds={selectedEntityIds}
            onSelectionChange={setSelectedEntityIds}
            pinnedIds={pinnedIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              setPinnedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            bulkSecondaryAction={{
              label: isAr ? 'تصدير الشركاء' : 'Exporter Partenaires',
              icon: <Download size={14} />,
              onClick: (ids) => {
                showToast({
                  type: 'info',
                  title: 'Export B2B',
                  message: isAr ? `تم تصدير ${ids.size} شركاء بنجاح` : `${ids.size} partenaires exportés`,
                });
              },
            }}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteB2bClient(id));
              setSelectedEntityIds(new Set<string>());
              if (selectedEntity && ids.has(selectedEntity.id)) setSelectedEntity(null);
              showToast({
                type: 'info',
                title: isAr ? 'تم الحذف' : 'Partenaires supprimés',
                message: `${ids.size} fiche(s) retirée(s).`,
              });
            }}
            onItemClick={(c, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedEntity(c);
            }}
            onViewDetails={(c, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedEntity(c);
            }}
            onEdit={(c) => {
              setEditingEntity(c);
              setEntityModalOpen(true);
            }}
            onDelete={(c) => setDeleteTarget(c)}
            customActions={(c) => [
              {
                id: 'doc',
                label: isAr ? 'إنشاء مستند' : 'Nouveau Document',
                icon: <FileText size={13} />,
                variant: 'primary',
                onClick: () => {
                  setSelectedEntity(c);
                  setComposerOpen(true);
                },
              },
            ]}
            renderCard={(c) => {
              const isOverLimit = (c.outstandingBalance || 0) > (c.creditLimit || 0);
              const b = resolveRecordBranch(c, branchesById, currentBranch, language);
              return (
                <div className="p-4 border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/80 rounded-2xl flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-base shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
                        {c.companyName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 truncate max-w-[140px]">
                        {b.name}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-black dark:text-white line-clamp-1 mb-0.5">{c.companyName}</h3>
                    <div className="text-[11px] font-mono text-black/55 dark:text-white/55 mb-3">
                      NIF: {c.nif || 'Non renseigné'} {c.city ? `· ${c.city}` : ''}
                    </div>
                    <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-black/55 dark:text-white/55">Encours :</span>
                        <span className={`font-mono font-bold tabular-nums ${isOverLimit ? 'text-rose-600' : 'text-[#d4522f]'}`}>
                          {formatMoney(c.outstandingBalance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-black/70 dark:text-white/75 truncate max-w-[140px]">
                      {c.contactName || c.phone || 'Contact'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity(c);
                        setComposerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#d4522f]/10 hover:bg-[#d4522f]/20 text-[#d4522f] text-[11px] font-bold cursor-pointer"
                    >
                      + Facture/BL
                    </button>
                  </div>
                </div>
              );
            }}
            emptyTitle={isAr ? 'لم يتم العثور على عملاء' : 'Aucun client B2B trouvé'}
            emptyDescription={
              isAr ? 'أضف أول عميل تجاري.' : 'Ajoutez votre premier client commercial en cliquant sur Nouveau Client B2B.'
            }
          />
        ) : (
          <UniversalDataCollection<B2bSupplier>
            hideToolbar
            data={filteredSuppliers}
            keyExtractor={(s) => s.id}
            viewMode={viewMode}
            columns={supplierColumns}
            selectedIds={selectedEntityIds}
            onSelectionChange={setSelectedEntityIds}
            pinnedIds={pinnedIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              setPinnedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            bulkSecondaryAction={{
              label: isAr ? 'تصدير الموردين' : 'Exporter Fournisseurs',
              icon: <Download size={14} />,
              onClick: (ids) => {
                showToast({
                  type: 'info',
                  title: 'Export Fournisseurs',
                  message: `${ids.size} fournisseurs exportés`,
                });
              },
            }}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteB2bSupplier(id));
              setSelectedEntityIds(new Set<string>());
              if (selectedEntity && ids.has(selectedEntity.id)) setSelectedEntity(null);
              showToast({ type: 'info', title: 'Fournisseurs supprimés', message: `${ids.size} fiche(s) retirée(s).` });
            }}
            onItemClick={(s, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedEntity(s);
            }}
            onViewDetails={(s, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedEntity(s);
            }}
            onEdit={(s) => {
              setEditingEntity(s);
              setEntityModalOpen(true);
            }}
            onDelete={(s) => setDeleteTarget(s)}
            renderCard={(s) => (
              <div className="p-4 border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/80 rounded-2xl flex flex-col justify-between h-full">
                <div>
                  <h3 className="font-bold text-sm text-black dark:text-white mb-0.5">{s.supplierName}</h3>
                  <div className="text-[11px] font-mono text-black/55 dark:text-white/55 mb-2">
                    NIF: {s.nif || 'N/A'} {s.city ? `· ${s.city}` : ''}
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between text-xs font-mono">
                  <span className="text-black/55 dark:text-white/55">Dette :</span>
                  <span className="font-bold text-amber-600 tabular-nums">{formatMoney(s.outstandingPayable || 0)}</span>
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لم يتم العثور على موردين' : 'Aucun fournisseur trouvé'}
            emptyDescription={isAr ? 'أضف أول مورد.' : 'Ajoutez votre premier fournisseur.'}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={mode === 'clients' ? filteredClients.length : filteredSuppliers.length}
        entityPluralLabel={mode === 'clients' ? 'clients' : 'fournisseurs'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setOverLimitOnly(false);
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<B2bClient | B2bSupplier>
        isOpen={!!selectedEntity}
        item={selectedEntity}
        allItems={mode === 'clients' ? filteredClients : filteredSuppliers}
        keyExtractor={(e) => e.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={
          selectedEntity
            ? 'companyName' in selectedEntity
              ? selectedEntity.companyName
              : selectedEntity.supplierName
            : ''
        }
        subtitle={selectedEntity?.sector || (mode === 'clients' ? 'Client B2B' : 'Fournisseur Agréé')}
        avatarText={
          selectedEntity
            ? ('companyName' in selectedEntity ? selectedEntity.companyName : selectedEntity.supplierName)
                .charAt(0)
                .toUpperCase()
            : 'B2B'
        }
        branchName={
          selectedEntity ? resolveRecordBranch(selectedEntity, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={mode === 'clients' ? 'Client B2B' : 'Fournisseur'}
        onClose={() => setSelectedEntity(null)}
        onSelectItem={(e) => setSelectedEntity(e)}
        onDelete={(e) => setDeleteTarget(e)}
        holdToDelete
        renderBody={(ent) => (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl border border-[#E6DED6] dark:border-neutral-700 bg-[#FBF8F5] dark:bg-neutral-800/60 font-mono space-y-1.5">
              <span className="font-bold font-sans text-[11px] text-black/70 dark:text-white/75 block uppercase">
                Identifiants Fiscaux Certifiés
              </span>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">N.I.F. :</span>
                <span className="font-bold text-black dark:text-white">{ent.nif || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">R.C. N° :</span>
                <span className="text-black dark:text-white">{ent.rc || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Art. Imposition :</span>
                <span className="text-black dark:text-white">{ent.ai || 'Non renseigné'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-black/55 dark:text-white/55 text-[10px] block">
                Contact Direct
              </span>
              <div className="flex items-center gap-2 text-black dark:text-white font-semibold">
                {ent.contactName || 'Standard'}
              </div>
              <div className="flex items-center gap-2 text-black/70 dark:text-white/75 font-mono text-[11px]">
                <Phone size={13} className="text-[#d4522f]" />
                <span>{ent.phone || 'Non renseigné'}</span>
              </div>
            </div>

            {'outstandingBalance' in ent && (
              <div className="p-3.5 rounded-xl border border-[#E6DED6] dark:border-neutral-700 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Encours Actuel :</span>
                  <span className="font-bold text-rose-600">{formatMoney(ent.outstandingBalance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Plafond Autorisé :</span>
                  <span className="text-black dark:text-white">{formatMoney(ent.creditLimit || 0)}</span>
                </div>
              </div>
            )}

            {mode === 'clients' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-black/55 dark:text-white/55 text-[10px]">
                    Historique Pièces ({entityHistory.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setComposerOpen(true)}
                    className="text-[11px] font-semibold text-[#d4522f] hover:underline cursor-pointer"
                  >
                    + Créer document
                  </button>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {entityHistory.map((d) => (
                    <div
                      key={d.id}
                      className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono font-bold text-black dark:text-white">{d.docNumber}</span>
                      <span className="font-mono font-bold text-[#d4522f]">{formatMoney(d.netToPay)}</span>
                    </div>
                  ))}
                  {entityHistory.length === 0 && (
                    <p className="text-black/55 dark:text-white/55 text-[11px] italic">
                      Aucune transaction pour ce client.
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingEntity(ent);
                setEntityModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit size={13} />
              <span>{t('action_edit', 'Modifier la fiche')}</span>
            </button>
          </div>
        )}
      />

      <B2bEntityModal
        isOpen={entityModalOpen}
        onClose={() => setEntityModalOpen(false)}
        entityType={mode === 'clients' ? 'client' : 'supplier'}
        editingEntity={editingEntity as any}
      />
      <CommercialDocComposerModal isOpen={composerOpen} onClose={() => setComposerOpen(false)} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            if (mode === 'clients') deleteB2bClient(deleteTarget.id);
            else deleteB2bSupplier(deleteTarget.id);
            setDeleteTarget(null);
            setSelectedEntity(null);
          }
        }}
        title="Supprimer la fiche partenaire ?"
        description="Êtes-vous certain de vouloir supprimer cette fiche ? Cette action retirera les coordonnées associées."
        confirmLabel="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
};

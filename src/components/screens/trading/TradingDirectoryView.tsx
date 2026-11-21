import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Phone,
  FileText,
  Edit,
  Trash2,
  Download,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { B2bClient, B2bSupplier } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { B2bEntityModal } from './B2bEntityModal';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { EmptyState } from '../../../atrium/components/EmptyState';
import {
  KineticEmptyStateMotion,
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
  InspectorListItem,
  InspectorWideButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const STATUS_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]';

type DirectoryMode = 'clients' | 'suppliers';
type DrawerTab = 'fiche' | 'credit' | 'docs';

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
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('fiche');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<B2bClient | B2bSupplier | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

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
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{c.companyName}</span>
            <span className="t-cap text-black/55 dark:text-white/55">{c.sector || 'Entreprise B2B'}</span>
          </div>
        ),
      },
      {
        key: 'legal',
        header: 'N.I.F. / R.C.',
        width: '170px',
        renderCell: (c) => (
          <div className="t-cap tabular-nums">
            <span className="block font-medium text-black dark:text-white">NIF: {c.nif || 'N/A'}</span>
            <span className="t-cap text-black/55 dark:text-white/55">RC: {c.rc || 'N/A'}</span>
          </div>
        ),
      },
      {
        key: 'contact',
        header: t('trading_col_contact', 'Interlocuteur'),
        width: '165px',
        renderCell: (c) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{c.contactName || 'N/A'}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">{c.phone || c.contactPhone}</span>
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
        renderCell: (c) => <span className="t-cap text-black/70 dark:text-white/75">{c.city}</span>,
      },
      {
        key: 'balance',
        header: t('trading_col_balance', 'Encours / Crédit'),
        width: '155px',
        sortable: true,
        renderCell: (c) => {
          const isOver = (c.outstandingBalance || 0) > (c.creditLimit || 0);
          return (
            <div className="t-cap tabular-nums">
              <span className={`font-semibold block ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                {formatMoney(c.outstandingBalance || 0)}
              </span>
              <span className="t-cap text-black/55 dark:text-white/55">
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-2 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteB2bClient(c.id);
                if (selectedEntity?.id === c.id) setSelectedEntity(null);
              }}
              aria-label={t('action_delete', 'Supprimer')}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-2 text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language, deleteB2bClient, selectedEntity?.id]
  );

  const supplierColumns: ColumnDefinition<B2bSupplier>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('trading_col_supplier', 'Fournisseur Référencé'),
        minWidth: '210px',
        sortable: true,
        renderCell: (s) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{s.supplierName}</span>
            <span className="t-cap text-black/55 dark:text-white/55">{s.sector || 'Fournisseur'}</span>
          </div>
        ),
      },
      {
        key: 'legal',
        header: 'N.I.F. / R.C.',
        width: '170px',
        renderCell: (s) => (
          <div className="t-cap tabular-nums">
            <span className="block font-medium text-black dark:text-white">NIF: {s.nif || 'N/A'}</span>
            <span className="t-cap text-black/55 dark:text-white/55">RC: {s.rc || 'N/A'}</span>
          </div>
        ),
      },
      {
        key: 'contact',
        header: t('trading_col_contact', 'Contact & Tél'),
        width: '165px',
        renderCell: (s) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{s.contactName || 'Standard'}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">{s.phone}</span>
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
        renderCell: (s) => <span className="t-cap text-black/70 dark:text-white/75">{s.city}</span>,
      },
      {
        key: 'payable',
        header: t('trading_col_debt', 'Dette Fournisseur'),
        width: '145px',
        renderCell: (s) => (
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-2 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteB2bSupplier(s.id);
                if (selectedEntity?.id === s.id) setSelectedEntity(null);
              }}
              aria-label={t('action_delete', 'Supprimer')}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-2 text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language, deleteB2bSupplier, selectedEntity?.id]
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
            items={filteredClients}
            keyExtractor={(c) => c.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode="list"
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
              if (ids.size === 0) return;
              runUndoBatch(
                {
                  vertical: 'trading_commercial',
                  operationType: 'bulk',
                  affectedCount: ids.size,
                  summary: isAr
                    ? `حذف عملاء (${ids.size})`
                    : isEn
                    ? `Delete clients (${ids.size})`
                    : `Suppression clients (${ids.size})`,
                },
                () => {
                  ids.forEach((id) => deleteB2bClient(id));
                }
              );
              setSelectedEntityIds(new Set<string>());
              if (selectedEntity && ids.has(selectedEntity.id)) setSelectedEntity(null);
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
            onDelete={(c) => {
              deleteB2bClient(c.id);
              if (selectedEntity?.id === c.id) setSelectedEntity(null);
            }}
            getRowMeta={(c) => {
              const isOver = (c.outstandingBalance || 0) > (c.creditLimit || 0);
              const branchInfo = resolveRecordBranch(c, branchesById, currentBranch, language);
              return {
                title: c.companyName,
                subline: `NIF: ${c.nif || 'Non renseigné'}${c.city ? ` · ${c.city}` : ''}`,
                avatarText: c.companyName.slice(0, 2).toUpperCase(),
                avatarColor: '#d4522f',
                categoryLabel: c.sector || 'Client B2B',
                statusLabel: isOver ? 'Hors plafond' : 'Sous plafond',
                statusVariant: isOver ? 'blocked' : 'active',
                metricPrimary: formatMoney(c.outstandingBalance || 0),
                metricSecondary: `Plafond ${formatMoney(c.creditLimit || 0)}`,
                branchName: branchInfo.name,
                isPinned: pinnedIds.has(c.id),
                detailCol1: { heading: 'Interlocuteur', primaryText: c.contactName || 'Standard' },
                detailCol2: { heading: 'Téléphone', primaryText: c.phone || c.contactPhone || '—' },
                detailCol3: { heading: 'Wilaya', primaryText: c.city || '—' },
              };
            }}
            getFanActions={(c) => [
              {
                id: 'doc',
                label: isAr ? 'إنشاء مستند' : 'Nouveau Document',
                icon: <FileText size={14} />,
                onClick: () => {
                  setSelectedEntity(c);
                  setComposerOpen(true);
                },
              },
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={14} />,
                onClick: () => {
                  setEditingEntity(c);
                  setEntityModalOpen(true);
                },
              },
              {
                id: 'delete',
                label: t('action_delete', 'Supprimer'),
                icon: <Trash2 size={14} />,
                isDanger: true,
                onClick: () => {
                  deleteB2bClient(c.id);
                  if (selectedEntity?.id === c.id) setSelectedEntity(null);
                },
              },
            ]}
            getDetailActions={(c) => [
              {
                id: 'doc',
                label: '+ Facture/BL',
                icon: <FileText size={13} />,
                onClick: () => {
                  setSelectedEntity(c);
                  setComposerOpen(true);
                },
              },
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={13} />,
                onClick: () => {
                  setEditingEntity(c);
                  setEntityModalOpen(true);
                },
              },
            ]}
            emptyTitle={isAr ? 'لم يتم العثور على عملاء' : 'Aucun client B2B trouvé'}
            emptyDescription={
              isAr ? 'أضف أول عميل تجاري.' : 'Ajoutez votre premier client commercial en cliquant sur Nouveau Client B2B.'
            }
          />
        ) : (
          <UniversalDataCollection<B2bSupplier>
            hideToolbar
            items={filteredSuppliers}
            keyExtractor={(s) => s.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode="list"
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
              if (ids.size === 0) return;
              runUndoBatch(
                {
                  vertical: 'trading_commercial',
                  operationType: 'bulk',
                  affectedCount: ids.size,
                  summary: isAr
                    ? `حذف موردين (${ids.size})`
                    : isEn
                    ? `Delete suppliers (${ids.size})`
                    : `Suppression fournisseurs (${ids.size})`,
                },
                () => {
                  ids.forEach((id) => deleteB2bSupplier(id));
                }
              );
              setSelectedEntityIds(new Set<string>());
              if (selectedEntity && ids.has(selectedEntity.id)) setSelectedEntity(null);
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
            onDelete={(s) => {
              deleteB2bSupplier(s.id);
              if (selectedEntity?.id === s.id) setSelectedEntity(null);
            }}
            getRowMeta={(s) => {
              const branchInfo = resolveRecordBranch(s, branchesById, currentBranch, language);
              return {
                title: s.supplierName,
                subline: `NIF: ${s.nif || 'N/A'}${s.city ? ` · ${s.city}` : ''}`,
                avatarText: s.supplierName.slice(0, 2).toUpperCase(),
                avatarColor: '#d4522f',
                categoryLabel: s.sector || 'Fournisseur',
                statusLabel: 'Agréé',
                statusVariant: 'info',
                metricPrimary: formatMoney(s.outstandingPayable || 0),
                metricSecondary: 'Dette fournisseur',
                branchName: branchInfo.name,
                isPinned: pinnedIds.has(s.id),
                detailCol1: { heading: 'Contact', primaryText: s.contactName || 'Standard' },
                detailCol2: { heading: 'Téléphone', primaryText: s.phone || '—' },
                detailCol3: { heading: 'Ville', primaryText: s.city || '—' },
              };
            }}
            getFanActions={(s) => [
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={14} />,
                onClick: () => {
                  setEditingEntity(s);
                  setEntityModalOpen(true);
                },
              },
              {
                id: 'delete',
                label: t('action_delete', 'Supprimer'),
                icon: <Trash2 size={14} />,
                isDanger: true,
                onClick: () => {
                  deleteB2bSupplier(s.id);
                  if (selectedEntity?.id === s.id) setSelectedEntity(null);
                },
              },
            ]}
            getDetailActions={(s) => [
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={13} />,
                onClick: () => {
                  setEditingEntity(s);
                  setEntityModalOpen(true);
                },
              },
              {
                id: 'delete',
                label: t('action_delete', 'Supprimer'),
                icon: <Trash2 size={13} />,
                onClick: () => {
                  deleteB2bSupplier(s.id);
                  if (selectedEntity?.id === s.id) setSelectedEntity(null);
                },
              },
            ]}
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
                .slice(0, 2)
                .toUpperCase()
            : 'B2'
        }
        avatarColor="#d4522f"
        branchName={
          selectedEntity ? resolveRecordBranch(selectedEntity, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={
          selectedEntity && 'outstandingBalance' in selectedEntity
            ? (selectedEntity.outstandingBalance || 0) > (selectedEntity.creditLimit || 0)
              ? 'Hors plafond'
              : 'Sous plafond'
            : 'Fournisseur'
        }
        statusClassName={
          selectedEntity && 'outstandingBalance' in selectedEntity
            ? (selectedEntity.outstandingBalance || 0) > (selectedEntity.creditLimit || 0)
              ? STATUS_PILL_DANGER
              : STATUS_PILL_OK
            : STATUS_PILL_INFO
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'الملف' : isEn ? 'Profile' : 'Identité' },
          { id: 'credit', label: isAr ? 'الائتمان' : isEn ? 'Credit' : 'Encours' },
          { id: 'docs', label: isAr ? 'المستندات' : isEn ? 'Docs' : 'Pièces' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onClose={() => setSelectedEntity(null)}
        onSelectItem={(e) => setSelectedEntity(e)}
        onDelete={(e) => {
          if (mode === 'clients') deleteB2bClient(e.id);
          else deleteB2bSupplier(e.id);
          setSelectedEntity(null);
        }}
        holdToDelete
        renderBody={(ent, tab) => {
          const isClient = 'outstandingBalance' in ent;
          const balance = isClient ? ent.outstandingBalance || 0 : ent.outstandingPayable || 0;
          const limit = isClient ? ent.creditLimit || 0 : 0;
          const ratio = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;

          if (tab === 'credit') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isClient ? 'Position Crédit B2B' : 'Dette Fournisseur'}>
                  <InspectorBigStat
                    value={formatMoney(balance)}
                    tone={isClient && limit > 0 && balance > limit ? 'danger' : 'accent'}
                    caption={isClient ? `Plafond autorisé : ${formatMoney(limit)}` : 'Solde exigible fournisseur'}
                  />
                  {isClient && (
                    <InspectorCard>
                      <InspectorProgressBar
                        percent={ratio}
                        tone={balance > limit ? 'danger' : ratio > 80 ? 'warn' : 'ok'}
                        animateKey={ent.id}
                      />
                      <InspectorKeyValue label="Utilisation plafond" value={`${ratio}%`} mono isLast />
                    </InspectorCard>
                  )}
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'docs') {
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={`Historique Pièces (${entityHistory.length})`}
                  action={
                    mode === 'clients' ? (
                      <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline cursor-pointer"
                      >
                        + Créer document
                      </button>
                    ) : undefined
                  }
                >
                  {entityHistory.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`tr-dir-hist-empty-${ent.id}`}>
                      <EmptyState
                        variant="compact"
                        tone="neutral"
                        icon={<FileText size={20} />}
                        title={isAr ? 'لا توجد مستندات' : isEn ? 'No documents yet' : 'Aucune pièce enregistrée'}
                        description={
                          isAr
                            ? 'ستظهر عروض الأسعار والفواتير المرتبطة بهذا الحساب هنا.'
                            : isEn
                            ? 'Quotes, orders, and invoices for this partner will appear here.'
                            : 'Les devis, BL et factures de ce tiers apparaîtront ici.'
                        }
                        secondaryAction={
                          mode === 'clients'
                            ? {
                                label: isAr ? 'إنشاء مستند' : isEn ? 'Create document' : 'Créer document',
                                icon: <Plus size={14} />,
                                onClick: () => setComposerOpen(true),
                              }
                            : undefined
                        }
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {entityHistory.slice(0, 8).map((d, idx) => (
                        <InspectorListItem
                          key={d.id}
                          title={d.docNumber}
                          subtitle={d.date}
                          metaRight={formatMoney(d.netToPay)}
                          isLast={idx === Math.min(entityHistory.length, 8) - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  ...(mode === 'clients'
                    ? [
                        {
                          id: 'doc',
                          label: '+ Facture/BL',
                          icon: <FileText size={15} />,
                          primary: true,
                          onClick: () => setComposerOpen(true),
                        },
                      ]
                    : []),
                  {
                    id: 'edit',
                    label: t('action_edit', 'Modifier'),
                    icon: <Edit size={15} />,
                    onClick: () => {
                      setEditingEntity(ent);
                      setEntityModalOpen(true);
                    },
                  },
                ]}
              />
              <InspectorSection index={0} title="Identifiants Fiscaux Certifiés">
                <InspectorCard>
                  <InspectorKeyValue label="N.I.F." value={ent.nif || 'Non renseigné'} mono copyText={ent.nif} />
                  <InspectorKeyValue label="R.C. N°" value={ent.rc || 'Non renseigné'} mono copyText={ent.rc} />
                  <InspectorKeyValue label="Art. Imposition" value={ent.ai || 'Non renseigné'} mono isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={1} title="Contact Direct">
                <InspectorCard>
                  <InspectorKeyValue label="Interlocuteur" value={ent.contactName || 'Standard'} />
                  <InspectorKeyValue
                    label="Téléphone"
                    value={ent.phone || 'Non renseigné'}
                    icon={<Phone size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
                    mono
                    copyText={ent.phone}
                  />
                  <InspectorKeyValue label="Wilaya" value={ent.city || 'Non renseignée'} isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorWideButton
                label={t('action_edit', 'Modifier la fiche')}
                icon={<Edit size={14} />}
                tone="neutral"
                onClick={() => {
                  setEditingEntity(ent);
                  setEntityModalOpen(true);
                }}
              />
            </div>
          );
        }}
      />

      <B2bEntityModal
        isOpen={entityModalOpen}
        onClose={() => setEntityModalOpen(false)}
        entityType={mode === 'clients' ? 'client' : 'supplier'}
        editingEntity={editingEntity as any}
      />
      <CommercialDocComposerModal isOpen={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  );
};

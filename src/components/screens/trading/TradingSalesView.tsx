import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  Download,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { CommercialDocument, CommercialDocType } from '../../../types';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { AtriumButton } from '../../ui/AtriumButton';
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

type TabKey = 'all' | 'devis' | 'commande' | 'bl' | 'facture' | 'avoir';
type StatusFilterKey = 'all' | 'Draft' | 'Validated' | 'Delivered' | 'Paid';

export const TradingSalesView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    commercialDocs,
    deleteCommercialDoc,
    convertCommercialDoc,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedDocIds, setPinnedDocIds] = useState<Set<string>>(() => new Set<string>());
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<CommercialDocType>('devis');
  const [editingDoc, setEditingDoc] = useState<CommercialDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommercialDocument | null>(null);

  const [inspectingDoc, setInspectingDoc] = useState<CommercialDocument | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const metrics = useMemo(() => {
    const invoices = commercialDocs.filter((d) => d.type === 'facture');
    const totalInvoicedHt = invoices.reduce((sum, d) => sum + (d.totalHtFinal || 0), 0);
    const unpaidInvoices = invoices.filter((d) => d.status !== 'Paid');
    const totalUnpaidAmount = unpaidInvoices.reduce((sum, d) => sum + (d.netToPay || 0), 0);
    const blDocs = commercialDocs.filter((d) => d.type === 'bl');
    const unbilledBls = blDocs.filter((d) => d.status === 'Delivered');
    const unbilledBlAmount = unbilledBls.reduce((sum, d) => sum + (d.netToPay || 0), 0);
    const recoveryRate =
      invoices.length > 0 ? ((invoices.length - unpaidInvoices.length) / invoices.length) * 100 : 100;

    const branchCounts = new Map<string, number>();
    commercialDocs.forEach((doc) => {
      const bName = resolveRecordBranch(doc, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });

    return {
      totalInvoicedHt,
      invoicesCount: invoices.length,
      unpaidInvoicesCount: unpaidInvoices.length,
      totalUnpaidAmount,
      unbilledBlCount: unbilledBls.length,
      unbilledBlAmount,
      recoveryRate,
      branchCounts,
    };
  }, [commercialDocs, branchesById, currentBranch, language]);

  const tabCounts = useMemo(
    () => ({
      all: commercialDocs.length,
      devis: commercialDocs.filter((d) => d.type === 'devis').length,
      commande: commercialDocs.filter((d) => d.type === 'commande').length,
      bl: commercialDocs.filter((d) => d.type === 'bl').length,
      facture: commercialDocs.filter((d) => d.type === 'facture').length,
      avoir: commercialDocs.filter((d) => d.type === 'avoir').length,
    }),
    [commercialDocs]
  );

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return commercialDocs.filter((doc) => {
      if (activeTab !== 'all' && doc.type !== activeTab) return false;
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(doc, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(doc, branchesById, currentBranch, language).name.toLowerCase();
        const matchesNum = doc.docNumber.toLowerCase().includes(q);
        const matchesClient = doc.clientName.toLowerCase().includes(q);
        const matchesNif = (doc.clientNif || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesClient && !matchesNif && !bName.includes(q)) return false;
      }
      return true;
    });
  }, [commercialDocs, activeTab, statusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      const ap = pinnedDocIds.has(a.id);
      const bp = pinnedDocIds.has(b.id);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      let cmp = 0;
      if (sortBy === 'docNumber') cmp = a.docNumber.localeCompare(b.docNumber);
      else if (sortBy === 'client') cmp = a.clientName.localeCompare(b.clientName);
      else if (sortBy === 'ht') cmp = (a.totalHtFinal || 0) - (b.totalHtFinal || 0);
      else if (sortBy === 'netToPay') cmp = (a.netToPay || 0) - (b.netToPay || 0);
      else if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = (a.date || '').localeCompare(b.date || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredDocs, pinnedDocIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleCreateNew = useCallback((type: CommercialDocType) => {
    setEditingDoc(null);
    setComposerType(type);
    setComposerOpen(true);
  }, []);

  const handleEdit = useCallback((doc: CommercialDocument) => {
    setEditingDoc(doc);
    setComposerType(doc.type);
    setComposerOpen(true);
  }, []);

  const handleConvert = useCallback(
    (doc: CommercialDocument) => {
      if (doc.type === 'devis') convertCommercialDoc(doc.id, 'bl');
      else if (doc.type === 'bl') convertCommercialDoc(doc.id, 'facture');
    },
    [convertCommercialDoc]
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      t('trading_sales_col_doc_num', 'N° Document'),
      'Type',
      'Date',
      'Client',
      'NIF',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      'Total HT',
      'Net TTC',
      'Statut',
    ];
    const rows = sortedDocs.map((doc) => [
      doc.docNumber,
      doc.type.toUpperCase(),
      doc.date,
      doc.clientName,
      doc.clientNif || '',
      resolveRecordBranch(doc, branchesById, currentBranch, language).name,
      doc.totalHtFinal || doc.totalHtRaw || 0,
      doc.netToPay || 0,
      doc.status,
    ]);
    downloadCsvSafe(`atrium-trading-sales-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [sortedDocs, t, isAr, isEn, branchesById, currentBranch, language]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOptions = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: commercialDocs.length },
      ...Array.from(metrics.branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
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
        id: 'status',
        label: isAr ? 'الحالة' : isEn ? 'Document Status' : 'Statut pièce',
        value: statusFilter,
        onChange: (val) => setStatusFilter(val as StatusFilterKey),
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'Draft', label: isAr ? 'مسودة' : isEn ? 'Draft' : 'Brouillon' },
          { value: 'Validated', label: isAr ? 'مصادق' : isEn ? 'Validated' : 'Validé' },
          { value: 'Delivered', label: isAr ? 'مسلم' : isEn ? 'Delivered' : 'Livré' },
          { value: 'Paid', label: isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payé' },
        ],
      },
    ];
  }, [branchFilter, statusFilter, metrics.branchCounts, commercialDocs.length, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: `${isAr ? 'الحالة' : isEn ? 'Status' : 'Statut'}: ${statusFilter}`,
        onRemove: () => setStatusFilter('all'),
      });
    }
    if (activeTab !== 'all') {
      chips.push({
        key: 'type',
        label: `Type: ${activeTab.toUpperCase()}`,
        onRemove: () => setActiveTab('all'),
      });
    }
    return chips;
  }, [branchFilter, statusFilter, activeTab, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const columns: ColumnDefinition<CommercialDocument>[] = useMemo(
    () => [
      {
        key: 'docNumber',
        header: t('trading_sales_col_doc_num', 'N° Document'),
        width: '185px',
        sortable: true,
        renderCell: (doc) => {
          const typeBadge =
            doc.type === 'facture'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
              : doc.type === 'bl'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
              : doc.type === 'devis'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
              : doc.type === 'commande'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400';
          return (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${typeBadge}`}>
                {doc.type.slice(0, 3)}
              </span>
              <span className="font-mono font-bold text-xs text-black dark:text-white">{doc.docNumber}</span>
            </div>
          );
        },
      },
      {
        key: 'date',
        header: t('trading_sales_col_date_due', 'Date & Échéance'),
        width: '130px',
        sortable: true,
        renderCell: (doc) => (
          <div className="text-xs font-mono">
            <div className="text-black dark:text-white">{doc.date}</div>
            {doc.dueDate && (
              <div className="text-[10px] text-black/55 dark:text-white/55">Éch: {doc.dueDate}</div>
            )}
          </div>
        ),
      },
      {
        key: 'client',
        header: t('trading_sales_col_client', 'Client Destinataire'),
        minWidth: '200px',
        sortable: true,
        renderCell: (doc) => (
          <div className="text-xs">
            <span className="font-bold text-black dark:text-white block">{doc.clientName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
              NIF: {doc.clientNif || 'Non renseigné'}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '140px',
        sortable: true,
        renderCell: (doc) => {
          const b = resolveRecordBranch(doc, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'ht',
        header: t('trading_sales_col_total_ht', 'Total H.T.'),
        width: '130px',
        sortable: true,
        renderCell: (doc) => (
          <span className="text-xs font-mono font-semibold text-black/70 dark:text-white/75 tabular-nums">
            {formatMoney(doc.totalHtFinal || doc.totalHtRaw || 0)}
          </span>
        ),
      },
      {
        key: 'netToPay',
        header: t('trading_sales_col_net_to_pay', 'Net à Payer (TTC)'),
        width: '140px',
        sortable: true,
        renderCell: (doc) => (
          <span className="text-xs font-mono font-bold text-black dark:text-white tabular-nums">
            {formatMoney(doc.netToPay)}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('trading_sales_col_status', 'Statut'),
        width: '115px',
        renderCell: (doc) => {
          const isPaid = doc.status === 'Paid';
          const isDelivered = doc.status === 'Delivered';
          const isValidated = doc.status === 'Validated';
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : isDelivered
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : isValidated
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75'
              }`}
            >
              {localizeStatus(doc.status, language)}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        width: '150px',
        renderCell: (doc) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPrintDoc(doc);
              }}
              aria-label={t('action_print', 'Imprimer')}
              title={t('action_print', 'Imprimer')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <Printer size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(doc);
              }}
              aria-label={t('action_edit', 'Modifier')}
              title={t('action_edit', 'Modifier')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <Edit size={14} />
            </button>
            {doc.type === 'devis' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConvert(doc);
                }}
                title={t('trading_sales_convert_to_bl', 'Convertir en Bon de Livraison')}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors cursor-pointer"
              >
                BL →
              </button>
            )}
            {doc.type === 'bl' && doc.status === 'Delivered' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConvert(doc);
                }}
                title={t('trading_sales_convert_to_invoice', 'Facturer ce bon de livraison')}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors cursor-pointer"
              >
                {isAr ? 'فوترة ←' : 'Facturer →'}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(doc);
              }}
              aria-label={t('action_delete', 'Supprimer')}
              title={t('action_delete', 'Supprimer')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language, handleEdit, handleConvert]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: commercialDocs.length > 0,
  });

  if (showSkeleton && (commercialDocs.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '150px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
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
        icon={<FileText size={22} />}
        title={t('trading_sales_title', 'Ventes')}
        subtitle={`${commercialDocs.length} ${isAr ? 'معاملة تجارية' : isEn ? 'commercial documents' : 'pièces commerciales'}`}
        primaryAction={{
          label: t('trading_sales_new_invoice', 'Nouvelle Facture'),
          icon: <Plus size={15} />,
          onClick: () => handleCreateNew('facture'),
        }}
        secondaryActions={
          <div className="flex items-center gap-2">
            <AtriumButton
              variant="secondary"
              size="md"
              onClick={() => handleCreateNew('devis')}
              icon={<Plus size={14} />}
            >
              <span>{t('trading_sales_new_devis', 'Nouveau Devis')}</span>
            </AtriumButton>
            <AtriumButton
              variant="secondary"
              size="md"
              onClick={() => handleCreateNew('bl')}
              icon={<Truck size={14} />}
            >
              <span>{t('trading_sales_new_bl', 'Nouveau BL')}</span>
            </AtriumButton>
          </div>
        }
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات دورة المبيعات' : isEn ? 'Sales Pipeline Metrics' : 'Indicateurs Cycle de Vente'}
        language={language}
        primaryCard={{
          label: isAr ? 'إجمالي المبيعات المفوترة HT' : 'Facturation Nette H.T.',
          count: metrics.totalInvoicedHt,
          formatValue: (v) => formatMoney(v),
          badgeText: `${metrics.invoicesCount} ${isAr ? 'فاتورة' : 'factures'} · ${metrics.recoveryRate.toFixed(0)}%`,
          tone: 'emerald',
          title: isAr ? 'تصفية حسب الفواتير' : 'Filtrer sur les factures',
          isActive: activeTab === 'facture',
          onToggle: () => setActiveTab((prev) => (prev === 'facture' ? 'all' : 'facture')),
        }}
        secondaryCard={{
          label: isAr ? 'سندات التسليم غير المفوترة' : 'BLs Livrés Non Facturés',
          count: metrics.unbilledBlAmount,
          formatValue: (v) => formatMoney(v),
          badgeText: `(${metrics.unbilledBlCount} ${isAr ? 'في الانتظار' : 'en attente'})`,
          tone: 'terracotta',
          title: isAr ? 'تصفية حسب سندات التسليم' : 'Filtrer sur les BLs',
          isActive: activeTab === 'bl',
          onToggle: () => setActiveTab((prev) => (prev === 'bl' ? 'all' : 'bl')),
        }}
        darkCard={{
          label: isAr ? 'الفواتير المستحقة غير المسددة' : 'Créances Clients Exigibles',
          valueCount: metrics.totalUnpaidAmount,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v),
          badgeCount: metrics.unpaidInvoicesCount,
          badgePrefix: '',
          badgeSuffix: isAr ? 'مفتوحة' : 'en attente',
          caption: isAr ? 'مستحقات تجارية مفتوحة (TTC)' : 'Échéances commerciales ouvertes (TTC)',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('trading_sales_docs_register', 'Registre des Ventes')}
          liveRegionText={`${sortedDocs.length} ${isAr ? 'مستند' : 'pièces'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('trading_sales_search_placeholder', 'Filtrer N° doc, client, NIF...')}
          statusOptions={[
            { value: 'all', label: t('trading_doc_all', 'Toutes'), count: tabCounts.all },
            { value: 'devis', label: t('trading_doc_devis', 'Devis'), count: tabCounts.devis },
            { value: 'commande', label: t('trading_doc_commande', 'Commandes'), count: tabCounts.commande },
            { value: 'bl', label: t('trading_doc_bl', 'BLs'), count: tabCounts.bl },
            { value: 'facture', label: t('trading_doc_facture', 'Factures'), count: tabCounts.facture },
            { value: 'avoir', label: t('trading_doc_avoir', 'Avoirs'), count: tabCounts.avoir },
          ]}
          statusValue={activeTab}
          onStatusChange={(val) => setActiveTab(val as TabKey)}
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
            setStatusFilter('all');
            setActiveTab('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<CommercialDocument>
          hideToolbar
          data={sortedDocs}
          keyExtractor={(d) => d.id}
          viewMode={viewMode}
          columns={columns}
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
          openItemId={inspectingDoc?.id ?? null}
          selectedIds={selectedDocIds}
          onSelectionChange={setSelectedDocIds}
          pinnedIds={pinnedDocIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedDocIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(doc, el) => {
            setDrawerOpenerEl(el || null);
            setInspectingDoc(doc);
          }}
          onViewDetails={(doc, el) => {
            setDrawerOpenerEl(el || null);
            setInspectingDoc(doc);
          }}
          onEdit={(doc) => handleEdit(doc)}
          onDelete={(doc) => setDeleteTarget(doc)}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير المستندات' : 'Exporter Sélection',
            icon: <Download size={13} />,
            onClick: (ids) => {
              showToast({
                type: 'info',
                title: 'Export commercial',
                message: `${ids.size} pièces sélectionnées exportées.`,
              });
            },
            variant: 'primary',
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteCommercialDoc(id));
            setSelectedDocIds(new Set<string>());
            showToast({
              type: 'info',
              title: 'Pièces commerciales supprimées',
              message: `${ids.size} documents retirés.`,
            });
          }}
          renderCard={(doc) => {
            const branchInfo = resolveRecordBranch(doc, branchesById, currentBranch, language);
            return (
              <div className="p-4 border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/80 rounded-2xl space-y-2.5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xs text-black dark:text-white">{doc.docNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#d4522f]/10 text-[#d4522f]">
                      {doc.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black dark:text-white truncate">{doc.clientName}</p>
                  <p className="text-[11px] text-black/55 dark:text-white/60 mt-0.5 flex items-center gap-1.5">
                    <Building2 size={11} className="text-[#d4522f]" />
                    <span>{branchInfo.name}</span>
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs font-mono pt-2.5 border-t border-neutral-100 dark:border-neutral-700">
                  <span className="text-black/55 dark:text-white/55">{doc.status}</span>
                  <span className="font-bold text-[#d4522f] tabular-nums">{formatMoney(doc.netToPay)}</span>
                </div>
              </div>
            );
          }}
          emptyTitle={isAr ? 'لا توجد معاملات مسجلة' : 'Aucun document commercial trouvé'}
          emptyDescription={
            isAr
              ? 'أنشئ أول عرض أسعار أو فاتورة تجارية.'
              : 'Créez votre premier devis, bon de livraison ou facture fiscale.'
          }
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedDocs.length}
        entityPluralLabel={isAr ? 'مستندات' : isEn ? 'documents' : 'pièces'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setStatusFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<CommercialDocument>
        isOpen={!!inspectingDoc}
        item={inspectingDoc}
        allItems={sortedDocs}
        keyExtractor={(d) => d.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingDoc?.docNumber || ''}
        subtitle={inspectingDoc ? `${inspectingDoc.clientName} · ${inspectingDoc.date}` : undefined}
        avatarText={inspectingDoc ? inspectingDoc.type.slice(0, 2).toUpperCase() : 'DOC'}
        branchName={
          inspectingDoc ? resolveRecordBranch(inspectingDoc, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={inspectingDoc ? localizeStatus(inspectingDoc.status, language) : undefined}
        onClose={() => setInspectingDoc(null)}
        onSelectItem={(doc) => setInspectingDoc(doc)}
        onDelete={(doc) => setDeleteTarget(doc)}
        holdToDelete
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Overview' : 'Résumé' },
          { id: 'items', label: isAr ? 'البنود' : isEn ? 'Line Items' : 'Articles' },
        ]}
        renderBody={(doc, tab) => {
          if (tab === 'items') {
            return (
              <div className="space-y-2.5">
                {doc.items.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-black dark:text-white truncate">{it.description}</p>
                      <span className="text-[11px] font-mono text-black/55 dark:text-white/60">
                        {it.quantity} {it.unit} × {formatMoney(it.unitPriceHt)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-black dark:text-white tabular-nums">
                      {formatMoney(it.totalHt)}
                    </span>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-neutral-800/50 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/60">Client :</span>
                  <span className="font-bold text-black dark:text-white">{doc.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/60">NIF :</span>
                  <span className="font-mono text-black dark:text-white">{doc.clientNif || 'Non renseigné'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/60">Mode règlement :</span>
                  <span className="font-medium text-black dark:text-white">{doc.paymentMethod}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-neutral-700">
                  <span className="text-black/55 dark:text-white/60">Total HT :</span>
                  <span className="font-mono font-semibold tabular-nums">{formatMoney(doc.totalHtFinal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/60">TVA :</span>
                  <span className="font-mono tabular-nums">{formatMoney(doc.totalTva)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#d4522f] pt-1">
                  <span>Net à Payer :</span>
                  <span className="font-mono tabular-nums">{formatMoney(doc.netToPay)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPrintDoc(doc)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#d4522f]/10 text-[#d4522f] hover:bg-[#d4522f]/20 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{t('action_print', 'Imprimer')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(doc)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit size={14} />
                  <span>{t('action_edit', 'Modifier')}</span>
                </button>
                {(doc.type === 'devis' || (doc.type === 'bl' && doc.status === 'Delivered')) && (
                  <button
                    type="button"
                    onClick={() => handleConvert(doc)}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRight size={14} />
                    <span>{doc.type === 'devis' ? 'Convertir en BL' : 'Facturer ce BL'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        }}
      />

      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialType={composerType}
        editingDoc={editingDoc}
      />
      <CommercialDocPrintModal isOpen={!!printDoc} onClose={() => setPrintDoc(null)} document={printDoc} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteCommercialDoc(deleteTarget.id);
            setDeleteTarget(null);
            if (inspectingDoc?.id === deleteTarget.id) setInspectingDoc(null);
          }
        }}
        title={t('trading_sales_delete_title', 'Supprimer la pièce commerciale ?')}
        description={
          isAr
            ? `هل أنت متأكد من حذف المستند ${deleteTarget?.docNumber}؟`
            : `Supprimer définitivement le document ${deleteTarget?.docNumber} (${deleteTarget?.clientName}) ?`
        }
        confirmLabel={t('action_delete', 'Supprimer définitivement')}
        variant="danger"
      />
    </div>
  );
};

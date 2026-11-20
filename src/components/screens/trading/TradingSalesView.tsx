import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Edit,
  Trash2,
  Truck,
  Download,
  ArrowRight,
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  InspectorWideButton,
  KineticRowFanAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
const STATUS_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]';

type TabKey = 'all' | 'devis' | 'commande' | 'bl' | 'facture' | 'avoir';
type StatusFilterKey = 'all' | 'Draft' | 'Validated' | 'Delivered' | 'Paid';
type DrawerTab = 'overview' | 'items' | 'reglement';

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
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');
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
              <span className={`px-2 py-0.5 rounded-[var(--r-check,6px)] text-[10px] font-bold font-mono uppercase ${typeBadge}`}>
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
              className={`inline-flex items-center px-2 py-0.5 rounded-[var(--r-check,6px)] text-[10px] font-bold ${
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
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
                data-sq="check"
                data-sq-border="none"
                className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors cursor-pointer"
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
                data-sq="check"
                data-sq-border="none"
                className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors cursor-pointer"
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
          items={sortedDocs}
          keyExtractor={(d) => d.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode="list"
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
          getRowMeta={(doc) => {
            const branchInfo = resolveRecordBranch(doc, branchesById, currentBranch, language);
            return {
              title: doc.docNumber,
              subline: `${doc.clientName} · ${doc.date}`,
              avatarText: doc.type.slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: doc.type.toUpperCase(),
              statusLabel: localizeStatus(doc.status, language),
              statusVariant:
                doc.status === 'Paid'
                  ? 'active'
                  : doc.status === 'Delivered'
                  ? 'info'
                  : doc.status === 'Validated'
                  ? 'warning'
                  : 'neutral',
              metricPrimary: formatMoney(doc.netToPay),
              metricSecondary: `HT ${formatMoney(doc.totalHtFinal || doc.totalHtRaw || 0)}`,
              branchName: branchInfo.name,
              isPinned: pinnedDocIds.has(doc.id),
              detailCol1: { heading: 'Client', primaryText: doc.clientName },
              detailCol2: { heading: 'NIF', primaryText: doc.clientNif || 'Non renseigné' },
              detailCol3: { heading: 'Date', primaryText: doc.date },
            };
          }}
          getFanActions={(doc): KineticRowFanAction<CommercialDocument>[] => {
            const actions: KineticRowFanAction<CommercialDocument>[] = [
              {
                id: 'print',
                label: t('action_print', 'Imprimer'),
                icon: <Printer size={14} />,
                onClick: () => setPrintDoc(doc),
              },
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={14} />,
                onClick: () => handleEdit(doc),
              },
            ];
            if (doc.type === 'devis' || (doc.type === 'bl' && doc.status === 'Delivered')) {
              actions.push({
                id: 'convert',
                label: doc.type === 'devis' ? 'Convertir BL' : 'Facturer',
                icon: <ArrowRight size={14} />,
                onClick: () => handleConvert(doc),
              });
            }
            actions.push({
              id: 'delete',
              label: t('action_delete', 'Supprimer'),
              icon: <Trash2 size={14} />,
              isDanger: true,
              onClick: () => setDeleteTarget(doc),
            });
            return actions;
          }}
          getDetailActions={(doc) => {
            const actions = [
              {
                id: 'print',
                label: t('action_print', 'Imprimer'),
                icon: <Printer size={13} />,
                onClick: () => setPrintDoc(doc),
              },
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={13} />,
                onClick: () => handleEdit(doc),
              },
            ];
            if (doc.type === 'devis' || (doc.type === 'bl' && doc.status === 'Delivered')) {
              actions.push({
                id: 'convert',
                label: doc.type === 'devis' ? 'BL →' : 'Facturer →',
                icon: <ArrowRight size={13} />,
                onClick: () => handleConvert(doc),
              });
            }
            return actions;
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
        avatarText={inspectingDoc ? inspectingDoc.type.slice(0, 2).toUpperCase() : 'DO'}
        avatarColor="#d4522f"
        branchName={
          inspectingDoc ? resolveRecordBranch(inspectingDoc, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={inspectingDoc ? localizeStatus(inspectingDoc.status, language) : undefined}
        statusClassName={
          inspectingDoc?.status === 'Paid'
            ? STATUS_PILL_OK
            : inspectingDoc?.status === 'Delivered'
            ? STATUS_PILL_INFO
            : STATUS_PILL_WARN
        }
        onClose={() => setInspectingDoc(null)}
        onSelectItem={(doc) => setInspectingDoc(doc)}
        onDelete={(doc) => setDeleteTarget(doc)}
        holdToDelete
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Overview' : 'Résumé' },
          { id: 'items', label: isAr ? 'البنود' : isEn ? 'Line Items' : 'Articles' },
          { id: 'reglement', label: isAr ? 'التفاصيل' : isEn ? 'Billing' : 'Fiscalité' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        renderBody={(doc, tab) => {
          if (tab === 'items') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={`Articles (${doc.items.length})`}>
                  <InspectorCard>
                    {doc.items.map((it, idx) => (
                      <InspectorListItem
                        key={it.id}
                        title={it.description}
                        subtitle={`${it.quantity} ${it.unit} × ${formatMoney(it.unitPriceHt)}`}
                        metaRight={formatMoney(it.totalHt)}
                        isLast={idx === doc.items.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'reglement') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title="Détails fiscaux & règlement">
                  <InspectorCard>
                    <InspectorKeyValue label="Total HT" value={formatMoney(doc.totalHtFinal)} mono />
                    <InspectorKeyValue label="TVA" value={formatMoney(doc.totalTva)} mono />
                    <InspectorKeyValue label="Timbre fiscal" value={formatMoney(doc.timbreFiscal || 0)} mono />
                    <InspectorKeyValue label="Net à Payer" value={formatMoney(doc.netToPay)} mono tone="accent" />
                    <InspectorKeyValue label="Mode règlement" value={doc.paymentMethod} isLast />
                  </InspectorCard>
                </InspectorSection>
                {(doc.type === 'devis' || (doc.type === 'bl' && doc.status === 'Delivered')) && (
                  <InspectorWideButton
                    label={doc.type === 'devis' ? 'Convertir en BL' : 'Facturer ce BL'}
                    icon={<ArrowRight size={14} />}
                    tone="accent"
                    onClick={() => handleConvert(doc)}
                  />
                )}
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'print',
                    label: t('action_print', 'Imprimer'),
                    icon: <Printer size={15} />,
                    primary: true,
                    onClick: () => setPrintDoc(doc),
                  },
                  {
                    id: 'edit',
                    label: t('action_edit', 'Modifier'),
                    icon: <Edit size={15} />,
                    onClick: () => handleEdit(doc),
                  },
                ]}
              />
              <InspectorSection index={0} title="Synthèse Document">
                <InspectorBigStat
                  value={formatMoney(doc.netToPay)}
                  tone="accent"
                  caption={`Net à Payer · ${doc.clientName}`}
                />
                <InspectorCard>
                  <InspectorKeyValue label="Client" value={doc.clientName} />
                  <InspectorKeyValue label="NIF" value={doc.clientNif || 'Non renseigné'} mono copyText={doc.clientNif} />
                  <InspectorKeyValue label="Mode règlement" value={doc.paymentMethod} />
                  <InspectorKeyValue label="Total HT" value={formatMoney(doc.totalHtFinal)} mono />
                  <InspectorKeyValue label="TVA" value={formatMoney(doc.totalTva)} mono isLast />
                </InspectorCard>
              </InspectorSection>
              {(doc.type === 'devis' || (doc.type === 'bl' && doc.status === 'Delivered')) && (
                <InspectorWideButton
                  label={doc.type === 'devis' ? 'Convertir en BL' : 'Facturer ce BL'}
                  icon={<ArrowRight size={14} />}
                  tone="accent"
                  onClick={() => handleConvert(doc)}
                />
              )}
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

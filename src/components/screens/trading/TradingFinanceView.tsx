import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  CheckCircle,
  X,
  Pin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { CommercialDocument } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
const STATUS_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]';

type FinanceFilter = 'all' | 'unpaid' | 'paid';
type AgingBucketFilter = 'all' | '0_30' | '31_60' | '61_90' | '90_plus';
type DrawerTab = 'facture' | 'lignes' | 'reglement';

export const TradingFinanceView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    commercialDocs,
    b2bClients,
    b2bSuppliers,
    updateCommercialDoc,
    updateB2bClient,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    isSyncTimeout,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const [settlementDoc, setSettlementDoc] = useState<CommercialDocument | null>(null);
  const [settleMethod, setSettleMethod] = useState('Virement bancaire');
  const [settleRef, setSettleRef] = useState('');
  const [settleDate, setSettleDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [filterMode, setFilterMode] = useState<FinanceFilter>('unpaid');
  const [agingBucketFilter, setAgingBucketFilter] = useState<AgingBucketFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast({
          type: 'info',
          title: nowPinned ? (isAr ? 'تم التثبيت' : 'Facture Épinglée') : (isAr ? 'تم إلغاء التثبيت' : 'Facture Désépinglée'),
          message: nowPinned ? (isAr ? 'تم تثبيت الفاتورة بالأعلى' : 'Échéance maintenue en tête') : (isAr ? 'تمت الإزالة من الأعلى' : 'Facture retirée des épinglées'),
        });
        return next;
      });
    },
    [isAr]
  );

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState<CommercialDocument | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('facture');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const invoices = useMemo(() => commercialDocs.filter((d) => d.type === 'facture'), [commercialDocs]);

  const agingAnalysis = useMemo(() => {
    const today = Date.now();
    let bucketCurrent = 0;
    let bucket31_60 = 0;
    let bucket61_90 = 0;
    let bucket90Plus = 0;

    const branchCounts = new Map<string, number>();

    invoices.forEach((inv) => {
      const bName = resolveRecordBranch(inv, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
      if (inv.status === 'Paid') return;
      const invDate = new Date(inv.date).getTime();
      const diffDays = Math.max(0, Math.floor((today - invDate) / 864e5));
      if (diffDays <= 30) bucketCurrent += inv.netToPay;
      else if (diffDays <= 60) bucket31_60 += inv.netToPay;
      else if (diffDays <= 90) bucket61_90 += inv.netToPay;
      else bucket90Plus += inv.netToPay;
    });

    const totalUnpaid = bucketCurrent + bucket31_60 + bucket61_90 + bucket90Plus;
    const totalPaidInvoices = invoices.filter((i) => i.status === 'Paid');
    const totalPaidAmount = totalPaidInvoices.reduce((sum, i) => sum + (i.netToPay || 0), 0);
    const totalSupplierPayable = b2bSuppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0);

    return {
      bucketCurrent,
      bucket31_60,
      bucket61_90,
      bucket90Plus,
      totalUnpaid,
      totalPaidAmount,
      paidCount: totalPaidInvoices.length,
      unpaidCount: invoices.length - totalPaidInvoices.length,
      totalSupplierPayable,
      branchCounts,
    };
  }, [invoices, b2bSuppliers, branchesById, currentBranch, language]);

  const filteredInvoices = useMemo(() => {
    const today = Date.now();
    const q = searchQuery.trim().toLowerCase();
    return invoices
      .filter((inv) => {
        if (filterMode === 'unpaid' && inv.status === 'Paid') return false;
        if (filterMode === 'paid' && inv.status !== 'Paid') return false;
        if (branchFilter !== 'All') {
          const bName = resolveRecordBranch(inv, branchesById, currentBranch, language).name;
          if (bName !== branchFilter) return false;
        }
        if (agingBucketFilter !== 'all') {
          if (inv.status === 'Paid') return false;
          const diffDays = Math.max(0, Math.floor((today - new Date(inv.date).getTime()) / 864e5));
          if (agingBucketFilter === '0_30' && diffDays > 30) return false;
          if (agingBucketFilter === '31_60' && (diffDays <= 30 || diffDays > 60)) return false;
          if (agingBucketFilter === '61_90' && (diffDays <= 60 || diffDays > 90)) return false;
          if (agingBucketFilter === '90_plus' && diffDays <= 90) return false;
        }
        if (q) {
          const bName = resolveRecordBranch(inv, branchesById, currentBranch, language).name.toLowerCase();
          if (!inv.docNumber.toLowerCase().includes(q) && !inv.clientName.toLowerCase().includes(q) && !bName.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const aPinned = pinnedIds.has(a.id);
        const bPinned = pinnedIds.has(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        let cmp = 0;
        if (sortBy === 'docNumber') cmp = a.docNumber.localeCompare(b.docNumber);
        else if (sortBy === 'client') cmp = a.clientName.localeCompare(b.clientName);
        else if (sortBy === 'netToPay') cmp = (a.netToPay || 0) - (b.netToPay || 0);
        else cmp = (a.date || '').localeCompare(b.date || '');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [invoices, filterMode, branchFilter, agingBucketFilter, searchQuery, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementDoc) return;
    updateCommercialDoc(settlementDoc.id, {
      status: 'Paid',
      paymentMethod: settleMethod,
      notesBottom: `Réglé le ${settleDate} par ${settleMethod}${settleRef ? ` (Réf: ${settleRef})` : ''}.`,
    });
    const client = b2bClients.find((c) => c.id === settlementDoc.clientId);
    if (client) {
      const newBal = Math.max(0, (client.outstandingBalance || 0) - settlementDoc.netToPay);
      updateB2bClient(client.id, { outstandingBalance: newBal });
    }
    showToast({
      type: 'success',
      title: isAr ? 'تم تسجيل التحصيل' : 'Encaissement validé',
      message: `${settlementDoc.docNumber} · ${formatMoney(settlementDoc.netToPay)}`,
    });
    setSettlementDoc(null);
  };

  const handleExportCsv = useCallback(() => {
    const headers = ['N° Facture', 'Date', 'Échéance', 'Client', 'Branche', 'Net TTC', 'Statut'];
    const rows = filteredInvoices.map((inv) => [
      inv.docNumber,
      inv.date,
      inv.dueDate || '30j',
      inv.clientName,
      resolveRecordBranch(inv, branchesById, currentBranch, language).name,
      inv.netToPay || 0,
      inv.status,
    ]);
    downloadCsvSafe(`atrium-trading-finance-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [filteredInvoices, branchesById, currentBranch, language]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOptions = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: invoices.length },
      ...Array.from(agingAnalysis.branchCounts.entries()).map(([n, c]) => ({ value: n, label: n, count: c })),
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
        id: 'aging',
        label: isAr ? 'أعمار الديون' : isEn ? 'Aging Tier' : 'Palier balance âgée',
        value: agingBucketFilter,
        onChange: (val) => setAgingBucketFilter(val as AgingBucketFilter),
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Tous' },
          { value: '0_30', label: '0–30j' },
          { value: '31_60', label: '31–60j' },
          { value: '61_90', label: '61–90j' },
          { value: '90_plus', label: '>90j' },
        ],
      },
    ];
  }, [branchFilter, agingBucketFilter, agingAnalysis.branchCounts, invoices.length, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (agingBucketFilter !== 'all') {
      chips.push({
        key: 'aging',
        label: `Palier: ${agingBucketFilter.replace('_', '-')}`,
        onRemove: () => setAgingBucketFilter('all'),
      });
    }
    return chips;
  }, [branchFilter, agingBucketFilter, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (agingBucketFilter !== 'all' ? 1 : 0);

  const columns: ColumnDefinition<CommercialDocument>[] = useMemo(
    () => [
      {
        key: 'docNumber',
        header: t('trading_sales_col_doc_num', 'N° Facture'),
        width: '175px',
        sortable: true,
        renderCell: (doc) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white">{doc.docNumber}</span>
        ),
      },
      {
        key: 'date',
        header: t('trading_sales_col_date_due', 'Date & Échéance'),
        width: '135px',
        sortable: true,
        renderCell: (doc) => (
          <div className="text-xs font-mono">
            <div className="text-black dark:text-white">{doc.date}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55">Éch: {doc.dueDate || '30j'}</div>
          </div>
        ),
      },
      {
        key: 'client',
        header: t('trading_sales_col_client', 'Client B2B'),
        minWidth: '200px',
        sortable: true,
        renderCell: (doc) => <span className="text-xs font-bold text-black dark:text-white">{doc.clientName}</span>,
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '140px',
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
        key: 'netToPay',
        header: t('trading_sales_col_net_to_pay', 'Montant Net TTC'),
        width: '145px',
        sortable: true,
        renderCell: (doc) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatMoney(doc.netToPay)}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('trading_sales_col_status', 'État du Paiement'),
        width: '135px',
        renderCell: (doc) => (
          <span
            className={`px-2 py-0.5 rounded-[var(--r-check,6px)] text-[10px] font-semibold ${
              doc.status === 'Paid'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {doc.status === 'Paid'
              ? isAr
                ? 'مسددة'
                : 'Encaissée / Soldée'
              : isAr
              ? 'غير مسددة'
              : 'Non Encaissée'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '135px',
        renderCell: (doc) => (
          <div className="flex items-center justify-end">
            {doc.status !== 'Paid' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSettlementDoc(doc);
                }}
                data-sq="ctl-sm"
                data-sq-border="none"
                className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle size={13} />
                <span>{t('trading_finance_settle_invoice', 'Encaisser')}</span>
              </button>
            ) : (
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">Soldée ✓</span>
            )}
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language]
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
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn={false}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Wallet size={22} />}
        title={t('trading_finance_title', 'Finances')}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات التحصيل المالي' : isEn ? 'Receivables & Cash Metrics' : 'Indicateurs Trésorerie B2B'}
        language={language}
        primaryCard={{
          label: isAr ? 'التحصيلات المحققة الفعلية' : 'Encaissements Clientèle Réalisés',
          count: agingAnalysis.totalPaidAmount,
          formatValue: (v) => formatMoney(v),
          badgeText: `${agingAnalysis.paidCount} soldées`,
          tone: 'emerald',
          title: 'Règlements virement, chèque ou espèces',
          isActive: filterMode === 'paid',
          onToggle: () => setFilterMode((prev) => (prev === 'paid' ? 'all' : 'paid')),
        }}
        secondaryCard={{
          label: isAr ? 'المستحقات الواجبة للموردين' : 'Dettes Fournisseurs Exigibles',
          count: agingAnalysis.totalSupplierPayable,
          formatValue: (v) => formatMoney(v),
          badgeText: `(${b2bSuppliers.length} fournisseurs)`,
          tone: 'terracotta',
          title: 'Échéancier de trésorerie décaissable',
          isActive: filterMode === 'all',
          onToggle: () => setFilterMode('all'),
        }}
        darkCard={{
          label: isAr ? 'إجمالي مستحقات العملاء غير المحصلة' : 'Créances Clients Non Encaissées',
          valueCount: agingAnalysis.totalUnpaid,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v),
          badgeCount: agingAnalysis.unpaidCount,
          badgePrefix: '',
          badgeSuffix: 'ouvertes',
          caption:
            agingAnalysis.bucket90Plus > 0
              ? `${formatMoney(agingAnalysis.bucket90Plus)} en contentieux (>90j)`
              : 'Aucun dossier en contentieux',
        }}
      />

      <ScreenPod>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-black/55 dark:text-white/55">
            {isAr ? 'تحليل أعمار الديون (Balance Âgée)' : 'Balance Âgée des Créances Commerciales (4 Paliers)'}
          </span>
          <span className="text-[11px] font-mono text-black/55 dark:text-white/55">
            Base : Date d'émission facture fiscale
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '0_30' ? 'all' : '0_30'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '0_30' ? '2' : '1'}
            className={`p-4 text-left rtl:text-right bg-white dark:bg-neutral-800 transition-all cursor-pointer ${
              agingBucketFilter === '0_30' ? '[--sq-stroke:#10B981]' : '[--sq-stroke:#E5E5E5] dark:[--sq-stroke:#404040]'
            }`}
          >
            <span className="text-xs font-semibold text-black/55 dark:text-white/55 block mb-1">
              {t('trading_finance_aging_current', '0 à 30 jours (Courant)')}
            </span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatMoney(agingAnalysis.bucketCurrent)}
            </div>
            <span className="text-[10px] text-black/55 dark:text-white/55 mt-1 block">Créances normales</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '31_60' ? 'all' : '31_60'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '31_60' ? '2' : '1'}
            className={`p-4 text-left rtl:text-right bg-white dark:bg-neutral-800 transition-all cursor-pointer ${
              agingBucketFilter === '31_60' ? '[--sq-stroke:#F59E0B]' : '[--sq-stroke:#E5E5E5] dark:[--sq-stroke:#404040]'
            }`}
          >
            <span className="text-xs font-semibold text-black/55 dark:text-white/55 block mb-1">
              {t('trading_finance_aging_31_60', '31 à 60 jours')}
            </span>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {formatMoney(agingAnalysis.bucket31_60)}
            </div>
            <span className="text-[10px] text-amber-600/80 mt-1 block">Relance commerciale</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '61_90' ? 'all' : '61_90'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '61_90' ? '2' : '1'}
            className={`p-4 text-left rtl:text-right bg-white dark:bg-neutral-800 transition-all cursor-pointer ${
              agingBucketFilter === '61_90' ? '[--sq-stroke:#F97316]' : '[--sq-stroke:#E5E5E5] dark:[--sq-stroke:#404040]'
            }`}
          >
            <span className="text-xs font-semibold text-black/55 dark:text-white/55 block mb-1">
              {t('trading_finance_aging_61_90', '61 à 90 jours')}
            </span>
            <div className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400 tabular-nums">
              {formatMoney(agingAnalysis.bucket61_90)}
            </div>
            <span className="text-[10px] text-orange-600/80 mt-1 block">Mise en demeure requise</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '90_plus' ? 'all' : '90_plus'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '90_plus' ? '2' : '1'}
            className={`p-4 text-left rtl:text-right bg-rose-50/50 dark:bg-rose-950/20 transition-all cursor-pointer ${
              agingBucketFilter === '90_plus' ? '[--sq-stroke:#F43F5E]' : '[--sq-stroke:#FDA4AF] dark:[--sq-stroke:rgba(136,19,55,0.6)]'
            }`}
          >
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block mb-1">
              {t('trading_finance_aging_90_plus', '> 90 jours (Contentieux)')}
            </span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              {formatMoney(agingAnalysis.bucket90Plus)}
            </div>
            <span className="text-[10px] text-rose-500 mt-1 block">Recouvrement forcé</span>
          </button>
        </div>
      </ScreenPod>

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل فواتير التحصيل' : isEn ? 'Invoice Collection Ledger' : 'Journal des Encaissements Factures'}
          liveRegionText={`${filteredInvoices.length} ${isAr ? 'فاتورة' : 'factures'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث برقم الفاتورة، العميل...' : 'Filtrer N° facture, client...'}
          statusOptions={[
            { value: 'unpaid', label: isAr ? 'معلقة' : isEn ? 'Unpaid' : 'En attente', count: agingAnalysis.unpaidCount },
            { value: 'paid', label: isAr ? 'مسددة' : isEn ? 'Paid' : 'Soldées', count: agingAnalysis.paidCount },
            { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: invoices.length },
          ]}
          statusValue={filterMode}
          onStatusChange={(val) => setFilterMode(val as FinanceFilter)}
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
            setAgingBucketFilter('all');
            setFilterMode('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<CommercialDocument>
          hideToolbar
          items={filteredInvoices}
          keyExtractor={(inv) => inv.id}
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
          onItemClick={(inv, el) => {
            setDrawerOpenerEl(el || null);
            setInspectingDoc(inv);
          }}
          onViewDetails={(inv, el) => {
            setDrawerOpenerEl(el || null);
            setInspectingDoc(inv);
          }}
          isPinned={(inv) => pinnedIds.has(inv.id)}
          onTogglePin={(inv) => handleTogglePin(inv.id)}
          getRowMeta={(inv) => {
            const isPaid = inv.status === 'Paid';
            const branchInfo = resolveRecordBranch(inv, branchesById, currentBranch, language);
            return {
              isPinned: pinnedIds.has(inv.id),
              title: inv.docNumber,
              subline: `${inv.clientName} · ${inv.date}`,
              avatarText: 'FA',
              avatarColor: '#d4522f',
              categoryLabel: inv.paymentMethod || 'Virement',
              statusLabel: isPaid ? 'Soldée' : 'Non Encaissée',
              statusVariant: isPaid ? 'active' : 'blocked',
              metricPrimary: formatMoney(inv.netToPay),
              metricSecondary: `Éch: ${inv.dueDate || '30j'}`,
              branchName: branchInfo.name,
              detailCol1: { heading: 'Client B2B', primaryText: inv.clientName },
              detailCol2: { heading: 'Date', primaryText: inv.date },
              detailCol3: { heading: 'Mode', primaryText: inv.paymentMethod || 'Virement' },
            };
          }}
          getFanActions={(inv) => {
            const actions = [];
            if (inv.status !== 'Paid') {
              actions.push({
                id: 'settle',
                label: t('trading_finance_settle_invoice', 'Encaisser'),
                icon: <CheckCircle size={14} />,
                onClick: () => setSettlementDoc(inv),
              });
            }
            actions.push({
              id: 'pin',
              label: pinnedIds.has(inv.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin size={14} className={pinnedIds.has(inv.id) ? 'fill-current' : ''} />,
              onClick: () => handleTogglePin(inv.id),
            });
            return actions;
          }}
          getDetailActions={(inv) => {
            const actions = [];
            if (inv.status !== 'Paid') {
              actions.push({
                id: 'settle',
                label: t('trading_finance_settle_invoice', 'Encaisser'),
                icon: <CheckCircle size={13} />,
                onClick: () => setSettlementDoc(inv),
              });
            }
            actions.push({
              id: 'pin',
              label: pinnedIds.has(inv.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin size={13} className={pinnedIds.has(inv.id) ? 'fill-current' : ''} />,
              onClick: () => handleTogglePin(inv.id),
            });
            return actions;
          }}
          emptyTitle={isAr ? 'لا توجد فواتير مطابقة' : 'Aucune facture trouvée'}
          emptyDescription={
            isAr
              ? 'جميع الفواتير مسددة أو لا توجد نتائج.'
              : 'Toutes les factures sont soldées ou aucun résultat ne correspond à votre filtre.'
          }
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={filteredInvoices.length}
        entityPluralLabel={isAr ? 'فواتير' : 'factures'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setAgingBucketFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<CommercialDocument>
        isOpen={!!inspectingDoc}
        item={inspectingDoc}
        allItems={filteredInvoices}
        keyExtractor={(d) => d.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingDoc?.docNumber || ''}
        subtitle={inspectingDoc ? `${inspectingDoc.clientName} · ${inspectingDoc.date}` : undefined}
        avatarText="FA"
        avatarColor="#d4522f"
        branchName={
          inspectingDoc ? resolveRecordBranch(inspectingDoc, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={inspectingDoc?.status === 'Paid' ? 'Soldée' : 'Non Encaissée'}
        statusClassName={inspectingDoc?.status === 'Paid' ? STATUS_PILL_OK : STATUS_PILL_DANGER}
        tabs={[
          { id: 'facture', label: isAr ? 'الفاتورة' : isEn ? 'Invoice' : 'Facture' },
          { id: 'lignes', label: isAr ? 'البنود' : isEn ? 'Lines' : 'Lignes' },
          { id: 'reglement', label: isAr ? 'التحصيل' : isEn ? 'Settlement' : 'Règlement' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onClose={() => setInspectingDoc(null)}
        onSelectItem={(doc) => setInspectingDoc(doc)}
        renderBody={(doc, tab) => {
          if (tab === 'lignes') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={`Lignes facturées (${doc.items?.length || 0})`}>
                  <InspectorCard>
                    {!doc.items || doc.items.length === 0 ? (
                      <InspectorKeyValue label="Détail" value="Facture globale" isLast />
                    ) : (
                      doc.items.map((it, idx) => (
                        <InspectorListItem
                          key={it.id}
                          title={it.description}
                          subtitle={`${it.quantity} ${it.unit} × ${formatMoney(it.unitPriceHt)}`}
                          metaRight={formatMoney(it.totalHt)}
                          isLast={idx === doc.items.length - 1}
                        />
                      ))
                    )}
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'reglement') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title="Statut d'encaissement">
                  <InspectorBigStat
                    value={formatMoney(doc.netToPay)}
                    tone={doc.status === 'Paid' ? 'ok' : 'danger'}
                    caption={doc.status === 'Paid' ? 'Facture intégralement soldée' : `Échéance : ${doc.dueDate || '30 jours'}`}
                  />
                  <InspectorCard>
                    <InspectorKeyValue label="Mode règlement" value={doc.paymentMethod || 'Virement bancaire'} />
                    <InspectorKeyValue label="Conditions" value={doc.paymentTerms || '30 jours'} isLast />
                  </InspectorCard>
                </InspectorSection>
                {doc.status !== 'Paid' && (
                  <InspectorWideButton
                    label={t('trading_finance_settle_invoice', 'Encaisser cette facture')}
                    icon={<CheckCircle size={14} />}
                    tone="accent"
                    onClick={() => {
                      setInspectingDoc(null);
                      setSettlementDoc(doc);
                    }}
                  />
                )}
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {doc.status !== 'Paid' && (
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'settle',
                      label: t('trading_finance_settle_invoice', 'Encaisser'),
                      icon: <CheckCircle size={15} />,
                      primary: true,
                      onClick: () => {
                        setInspectingDoc(null);
                        setSettlementDoc(doc);
                      },
                    },
                  ]}
                />
              )}
              <InspectorSection index={0} title="Synthèse Facture">
                <InspectorBigStat
                  value={formatMoney(doc.netToPay)}
                  tone={doc.status === 'Paid' ? 'ok' : 'accent'}
                  caption={`Net TTC · Émise le ${doc.date}`}
                />
                <InspectorCard>
                  <InspectorKeyValue label="Client B2B" value={doc.clientName} />
                  <InspectorKeyValue label="Date d'émission" value={doc.date} mono />
                  <InspectorKeyValue label="Total HT" value={formatMoney(doc.totalHtFinal || 0)} mono />
                  <InspectorKeyValue label="TVA" value={formatMoney(doc.totalTva || 0)} mono />
                  <InspectorKeyValue label="Mode règlement" value={doc.paymentMethod || 'Virement bancaire'} isLast />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />

      {settlementDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="sq-elev-pop relative w-full max-w-md">
          <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-neutral-900 [--sq-stroke:#E5E5E5] dark:[--sq-stroke:#262626] p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-black dark:text-white flex items-center gap-2 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                <CheckCircle size={18} className="text-emerald-600" />
                <span>Enregistrer le Règlement Client</span>
              </h2>
              <button
                type="button"
                onClick={() => setSettlementDoc(null)}
                aria-label="Fermer"
                data-sq="ctl-sm"
                data-sq-border="none"
                className="p-1 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 [--sq-stroke:#E5E5E5] dark:[--sq-stroke:#404040] text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55 font-sans">Facture :</span>
                <span className="font-bold text-black dark:text-white">{settlementDoc.docNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55 font-sans">Client :</span>
                <span className="text-black dark:text-white">{settlementDoc.clientName}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold text-sm pt-1.5 border-t border-neutral-200 dark:border-neutral-700">
                <span className="font-sans">Montant Net :</span>
                <span>{formatMoney(settlementDoc.netToPay)}</span>
              </div>
            </div>
            <form onSubmit={handleConfirmSettlement} className="space-y-3 text-xs">
              <LabelSelect
                label="Mode de Règlement Encaissé *"
                value={settleMethod}
                onChange={(val) => setSettleMethod(typeof val === 'string' ? val : val?.target?.value || '')}
                options={[
                  { value: 'Virement bancaire', label: 'Virement bancaire' },
                  { value: 'Chèque barré', label: 'Chèque barré' },
                  { value: 'Chèque certifié', label: 'Chèque certifié' },
                  { value: 'Espèces (Timbré)', label: 'Espèces (Timbre fiscal 1%)' },
                  { value: 'Traite / Effet', label: 'Traite / Effet commercial' },
                ]}
              />
              <LabelInput
                label="N° Chèque / Référence Virement"
                placeholder="Ex: CHQ-0091823"
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
              />
              <LabelInput
                type="date"
                label="Date d'Encaissement *"
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setSettlementDoc(null)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm">
                  Valider l'Encaissement
                </AtriumButton>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

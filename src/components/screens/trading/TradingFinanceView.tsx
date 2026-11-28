import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  CheckCircle,
  X,
  Pin,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentCommercialDocsFromState,
  selectCurrentB2bClientsFromState,
  selectCurrentBranchFromState,
  selectCurrentUnifiedPaymentsFromState,
  selectCurrentScfPostingFailuresFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { validateGuaranteeRetentionRelease } from '../../../utils/tradingDepth';
import { CommercialDocument } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UnifiedPaymentModal } from '../../common/invoicing/UnifiedPaymentModal';
import { UnifiedPaymentsLedgerPanel } from '../../common/invoicing/UnifiedPaymentsLedgerPanel';
import { ScfAccountingWorkspace } from '../../common/accounting/ScfAccountingWorkspace';
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
  KineticModalShell,
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
  useRetainedModalValue,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const STATUS_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]';

type FinanceFilter = 'all' | 'unpaid' | 'paid';
type AgingBucketFilter = 'all' | '0_30' | '31_60' | '61_90' | '90_plus';
type DrawerTab = 'facture' | 'lignes' | 'reglement';

export const TradingFinanceView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { commercialDocs, b2bClients, b2bSuppliers, unifiedPayments, scfPostingFailures, currentBranch, branches, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      commercialDocs: selectCurrentCommercialDocsFromState(s),
      b2bClients: selectCurrentB2bClientsFromState(s),
      b2bSuppliers: s.b2bSuppliers || [],
      unifiedPayments: selectCurrentUnifiedPaymentsFromState(s),
      scfPostingFailures: selectCurrentScfPostingFailuresFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { updateCommercialDoc, updateB2bClient, releaseGuaranteeRetention, retryCloudSync } = useAtriumActions();
  const [financeMode, setFinanceMode] = useState<'receivables' | 'scf'>('receivables');
  const pendingScfFailuresCount = useMemo(
    () => scfPostingFailures.filter((f) => f.status === 'pending').length,
    [scfPostingFailures]
  );

  const [settlementDoc, setSettlementDoc] = useState<CommercialDocument | null>(null);
  const [guaranteeDoc, setGuaranteeDoc] = useState<CommercialDocument | null>(null);
  const [guaranteeReleaseAmount, setGuaranteeReleaseAmount] = useState('');
  const [guaranteeReleaseMethod, setGuaranteeReleaseMethod] = useState('Virement bancaire');
  const [guaranteeReleaseRef, setGuaranteeReleaseRef] = useState('');
  const [guaranteeReleaseDate, setGuaranteeReleaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [unifiedPaymentOpen, setUnifiedPaymentOpen] = useState(false);
  const [unifiedPaymentTarget, setUnifiedPaymentTarget] = useState<{
    partyId?: string;
    partyName: string;
    amountDzd: number;
    commercialDocId?: string;
  } | null>(null);
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

  const retentionDocs = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          (inv.guaranteeRetentionAmount || 0) > 0 &&
          inv.guaranteeRetentionStatus !== 'released' &&
          (inv.guaranteeRetentionAmount || 0) > (inv.guaranteeReleasedAmount || 0)
      ),
    [invoices]
  );

  const openGuaranteeModal = useCallback((doc: CommercialDocument) => {
    const check = validateGuaranteeRetentionRelease({
      doc,
      releaseAmountDzd: 1,
    });
    setGuaranteeDoc(doc);
    setGuaranteeReleaseAmount(String(check.remainingHeldDzd));
    setGuaranteeReleaseMethod('Virement bancaire');
    setGuaranteeReleaseRef(`RG-${doc.docNumber}`);
    setGuaranteeReleaseDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleConfirmGuaranteeRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guaranteeDoc) return;
    const amt = parseFloat(guaranteeReleaseAmount) || 0;
    const ok = releaseGuaranteeRetention({
      docId: guaranteeDoc.id,
      releaseAmountDzd: amt,
      paymentMethod: guaranteeReleaseMethod,
      reference: guaranteeReleaseRef.trim() || undefined,
      releaseDate: guaranteeReleaseDate,
    });
    if (ok) {
      setGuaranteeDoc(null);
    }
  };

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
    runUndoBatch(
      {
        vertical: 'trading_commercial',
        operationType: 'status',
        summary: isAr
          ? `تحصيل فاتورة ${settlementDoc.docNumber}`
          : isEn
          ? `Settle invoice ${settlementDoc.docNumber}`
          : `Règlement ${settlementDoc.docNumber}`,
        entityLabel: settlementDoc.docNumber,
      },
      () => {
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
      }
    );
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
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">{doc.docNumber}</span>
        ),
      },
      {
        key: 'date',
        header: t('trading_sales_col_date_due', 'Date & Échéance'),
        width: '135px',
        sortable: true,
        renderCell: (doc) => (
          <div className="t-cap tabular-nums">
            <div className="text-black dark:text-white">{doc.date}</div>
            <div className="t-cap text-black/55 dark:text-white/55">Éch: {doc.dueDate || '30j'}</div>
          </div>
        ),
      },
      {
        key: 'client',
        header: t('trading_sales_col_client', 'Client B2B'),
        minWidth: '200px',
        sortable: true,
        renderCell: (doc) => <span className="t-small font-semibold text-black dark:text-white">{doc.clientName}</span>,
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '140px',
        renderCell: (doc) => {
          const b = resolveRecordBranch(doc, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">
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
            className={`px-2 py-1 rounded-[var(--r-check,6px)] t-small font-semibold ${
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
        width: '215px',
        renderCell: (doc) => (
          <div className="flex items-center justify-end gap-1.5">
            {doc.status !== 'Paid' ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSettlementDoc(doc);
                  }}
                  data-sq="ctl-sm"
                  data-sq-border="none"
                  className="px-2.5 py-1 t-small font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle size={13} />
                  <span>{t('trading_finance_settle_invoice', 'Encaisser')}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUnifiedPaymentTarget({
                      partyId: doc.clientId,
                      partyName: doc.clientName,
                      amountDzd: doc.netToPay,
                      commercialDocId: doc.id,
                    });
                    setUnifiedPaymentOpen(true);
                  }}
                  data-sq="ctl-sm"
                  data-sq-border="solid"
                  className="px-2 py-1 t-small font-medium bg-[#F5F1EC] dark:bg-[#2B2825] text-black/80 dark:text-white/85 hover:bg-[#EAE1D8] dark:hover:bg-[#34302C] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isAr ? 'شيك / سفتجة' : isEn ? 'Cheque / Draft' : 'Chèque / Traite'}
                </button>
              </>
            ) : (
              <span className="t-small tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">Soldée ✓</span>
            )}
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language]
  );

  const retainedSettlementDoc = useRetainedModalValue(settlementDoc);

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
        primaryAction={{
          label: isAr ? 'تحصيل دفعة موحدة' : isEn ? 'Record Payment' : 'Encaisser Règlement',
          icon: <CheckCircle size={15} />,
          onClick: () => {
            setUnifiedPaymentTarget({
              partyName: filteredInvoices[0]?.clientName || 'Client B2B',
              partyId: filteredInvoices[0]?.clientId,
              amountDzd: filteredInvoices[0]?.netToPay || 0,
            });
            setUnifiedPaymentOpen(true);
          },
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="trading-finance-receivables-tab"
          onClick={() => setFinanceMode('receivables')}
          className={`px-3.5 py-2 rounded-xl t-small font-semibold transition-colors cursor-pointer ${
            financeMode === 'receivables'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
              : 'bg-white dark:bg-[#262422] text-black/75 dark:text-white/75 border border-[var(--atr-divider)]'
          }`}
        >
          {isAr ? 'الذمم والتحصيلات B2B' : isEn ? 'Receivables & Cash' : 'Créances & Règlements B2B'}
        </button>
        <button
          type="button"
          data-testid="trading-finance-scf-tab"
          onClick={() => setFinanceMode('scf')}
          className={`px-3.5 py-2 rounded-xl t-small font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
            financeMode === 'scf'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
              : 'bg-white dark:bg-[#262422] text-black/75 dark:text-white/75 border border-[var(--atr-divider)]'
          }`}
        >
          <span>{isAr ? 'المحاسبة العامة SCF (07-11)' : isEn ? 'SCF Accounting (Loi 07-11)' : 'Comptabilité SCF (Loi 07-11)'}</span>
          {pendingScfFailuresCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[11px] tabular-nums">
              {pendingScfFailuresCount}
            </span>
          )}
        </button>
      </div>

      {financeMode === 'scf' ? (
        <ScfAccountingWorkspace sourceVerticalFilter="trading_commercial" />
      ) : (
        <>

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
          <span className="t-small font-semibold text-black/55 dark:text-white/55">
            {isAr ? 'تحليل أعمار الديون (Balance Âgée)' : 'Balance Âgée des Créances Commerciales (4 Paliers)'}
          </span>
          <span className="t-cap tabular-nums text-black/55 dark:text-white/55">
            Base : Date d'émission facture fiscale
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="sq-elev-card">
          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '0_30' ? 'all' : '0_30'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '0_30' ? '2' : '1'}
            className={`w-full h-full p-4 text-left rtl:text-right bg-white dark:bg-[#22201E] hover:bg-[#FAF7F4] dark:hover:bg-[#282523] transition-all cursor-pointer ${
              agingBucketFilter === '0_30' ? '[--sq-stroke:#10B981]' : '[--sq-stroke:var(--sq-stroke-card)]'
            }`}
          >
            <span className="t-small font-semibold text-black/55 dark:text-white/55 block mb-1">
              {t('trading_finance_aging_current', '0 à 30 jours (Courant)')}
            </span>
            <div className="t-dialog font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(agingAnalysis.bucketCurrent)}
            </div>
            <span className="t-cap text-black/55 dark:text-white/55 mt-1 block">Créances normales</span>
          </button>
          </div>

          <div className="sq-elev-card">
          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '31_60' ? 'all' : '31_60'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '31_60' ? '2' : '1'}
            className={`w-full h-full p-4 text-left rtl:text-right bg-white dark:bg-[#22201E] hover:bg-[#FAF7F4] dark:hover:bg-[#282523] transition-all cursor-pointer ${
              agingBucketFilter === '31_60' ? '[--sq-stroke:#F59E0B]' : '[--sq-stroke:var(--sq-stroke-card)]'
            }`}
          >
            <span className="t-small font-semibold text-black/55 dark:text-white/55 block mb-1">
              {t('trading_finance_aging_31_60', '31 à 60 jours')}
            </span>
            <div className="t-dialog font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatMoney(agingAnalysis.bucket31_60)}
            </div>
            <span className="t-cap text-amber-600/80 mt-1 block">Relance commerciale</span>
          </button>
          </div>

          <div className="sq-elev-card">
          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '61_90' ? 'all' : '61_90'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '61_90' ? '2' : '1'}
            className={`w-full h-full p-4 text-left rtl:text-right bg-white dark:bg-[#22201E] hover:bg-[#FAF7F4] dark:hover:bg-[#282523] transition-all cursor-pointer ${
              agingBucketFilter === '61_90' ? '[--sq-stroke:#F97316]' : '[--sq-stroke:var(--sq-stroke-card)]'
            }`}
          >
            <span className="t-small font-semibold text-black/55 dark:text-white/55 block mb-1">
              {t('trading_finance_aging_61_90', '61 à 90 jours')}
            </span>
            <div className="t-dialog font-semibold tabular-nums text-orange-600 dark:text-orange-400">
              {formatMoney(agingAnalysis.bucket61_90)}
            </div>
            <span className="t-cap text-orange-600/80 mt-1 block">Mise en demeure requise</span>
          </button>
          </div>

          <div className="sq-elev-card">
          <button
            type="button"
            onClick={() => {
              setFilterMode('unpaid');
              setAgingBucketFilter((prev) => (prev === '90_plus' ? 'all' : '90_plus'));
            }}
            data-sq="card"
            data-sq-border="solid"
            data-sq-stroke-w={agingBucketFilter === '90_plus' ? '2' : '1'}
            className={`w-full h-full p-4 text-left rtl:text-right bg-rose-50/70 dark:bg-rose-950/25 transition-all cursor-pointer ${
              agingBucketFilter === '90_plus' ? '[--sq-stroke:#F43F5E]' : '[--sq-stroke:rgba(244,63,94,0.3)]'
            }`}
          >
            <span className="t-small font-semibold text-rose-700 dark:text-rose-400 block mb-1">
              {t('trading_finance_aging_90_plus', '> 90 jours (Contentieux)')}
            </span>
            <div className="t-dialog font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {formatMoney(agingAnalysis.bucket90Plus)}
            </div>
            <span className="t-cap text-rose-500 mt-1 block">Recouvrement forcé</span>
          </button>
          </div>
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

      {retentionDocs.length > 0 && (
        <ScreenPod>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="t-small font-semibold text-black dark:text-white">
                {isAr ? 'مبالغ الضمان المحتجزة' : isEn ? 'Guarantee Retentions Held' : 'Retenues de Garantie Détenues'}
              </h3>
              <p className="t-cap text-black/55 dark:text-white/60">
                {isAr
                  ? 'تحرير جزئي أو كلي مع قيد محاسبي آلي.'
                  : isEn
                  ? 'Partial or full retention release with automated SCF treasury posting.'
                  : 'Libération partielle ou totale avec écriture de trésorerie SCF automatique.'}
              </p>
            </div>
            <span className="t-cap tabular-nums font-semibold text-black/60 dark:text-white/65">
              {retentionDocs.length}
            </span>
          </div>
          <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <table className="w-full text-left rtl:text-right t-cap">
              <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                <tr>
                  <th className="py-2 px-3">{isAr ? 'الفاتورة' : isEn ? 'Invoice' : 'Facture'}</th>
                  <th className="py-2 px-3">{isAr ? 'العميل' : isEn ? 'Client' : 'Client'}</th>
                  <th className="py-2 px-3 text-right">{isAr ? 'المحتجز' : isEn ? 'Held' : 'Retenue Initiale'}</th>
                  <th className="py-2 px-3 text-right">{isAr ? 'المحرر' : isEn ? 'Released' : 'Déjà Libérée'}</th>
                  <th className="py-2 px-3 text-right">{isAr ? 'المتبقي' : isEn ? 'Remaining' : 'Solde à Libérer'}</th>
                  <th className="py-2 px-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                {retentionDocs.map((doc) => {
                  const held = Number(doc.guaranteeRetentionAmount || 0);
                  const released = Number(doc.guaranteeReleasedAmount || 0);
                  const remaining = Math.max(0, held - released);
                  return (
                    <tr key={doc.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                      <td className="py-2 px-3 font-semibold text-black dark:text-white">{doc.docNumber}</td>
                      <td className="py-2 px-3">{doc.clientName}</td>
                      <td className="py-2 px-3 text-right">{formatMoney(held)}</td>
                      <td className="py-2 px-3 text-right text-black/60 dark:text-white/65">{formatMoney(released)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">{formatMoney(remaining)}</td>
                      <td className="py-2 px-3 text-right">
                        <AtriumButton
                          variant="secondary"
                          size="xs"
                          onClick={() => openGuaranteeModal(doc)}
                        >
                          {isAr ? 'تحرير' : isEn ? 'Release' : 'Libérer'}
                        </AtriumButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScreenPod>
      )}

      {unifiedPayments.length > 0 && (
        <UnifiedPaymentsLedgerPanel payments={unifiedPayments} />
      )}
        </>
      )}

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

      <KineticModalShell
        isOpen={Boolean(settlementDoc)}
        onClose={() => setSettlementDoc(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {retainedSettlementDoc && (
          <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white flex items-center gap-2">
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
            <div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] t-cap space-y-2 tabular-nums">
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55 font-sans">Facture :</span>
                <span className="font-semibold text-black dark:text-white">{retainedSettlementDoc.docNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55 font-sans">Client :</span>
                <span className="text-black dark:text-white">{retainedSettlementDoc.clientName}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold t-label pt-2 border-t border-[var(--atr-divider)]">
                <span className="font-sans">Montant Net :</span>
                <span>{formatMoney(retainedSettlementDoc.netToPay)}</span>
              </div>
            </div>
            <form onSubmit={handleConfirmSettlement} className="space-y-3 t-cap">
              <LabelSelect
                label="Mode de Règlement Encaissé *"
                value={settleMethod}
                onChange={setSettleMethod}
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
                onChange={setSettleRef}
              />
              <LabelInput
                type="date"
                label="Date d'Encaissement *"
                value={settleDate}
                onChange={setSettleDate}
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setSettlementDoc(null)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm">
                  Valider l'Encaissement
                </AtriumButton>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>

      <KineticModalShell
        isOpen={Boolean(guaranteeDoc)}
        onClose={() => setGuaranteeDoc(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {guaranteeDoc && (
          <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white">
                {isAr ? 'تحرير مبلغ الضمان' : isEn ? 'Release Guarantee Retention' : 'Libération Retenue de Garantie'}
              </h2>
              <button
                type="button"
                onClick={() => setGuaranteeDoc(null)}
                aria-label="Fermer"
                className="p-1 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div data-sq="card" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap space-y-1 tabular-nums">
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/65">Facture :</span>
                <span className="font-semibold">{guaranteeDoc.docNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/65">Solde retenu :</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatMoney(Math.max(0, (guaranteeDoc.guaranteeRetentionAmount || 0) - (guaranteeDoc.guaranteeReleasedAmount || 0)))}
                </span>
              </div>
            </div>
            <form onSubmit={handleConfirmGuaranteeRelease} className="space-y-3 t-cap">
              <LabelInput
                type="number"
                step="0.01"
                label={isAr ? 'المبلغ المحرر (دج) *' : isEn ? 'Release Amount (DZD) *' : 'Montant à libérer (DA) *'}
                value={guaranteeReleaseAmount}
                onChange={setGuaranteeReleaseAmount}
                required
              />
              <LabelSelect
                label={isAr ? 'وسيلة الدفع' : isEn ? 'Payment Method' : 'Mode de règlement'}
                value={guaranteeReleaseMethod}
                onChange={setGuaranteeReleaseMethod}
                options={[
                  { value: 'Virement bancaire', label: 'Virement bancaire (512)' },
                  { value: 'Chèque barré', label: 'Chèque barré (512)' },
                  { value: 'Espèces', label: 'Espèces caisse (530)' },
                ]}
              />
              <LabelInput
                label={isAr ? 'المرجع' : isEn ? 'Reference' : 'Référence'}
                value={guaranteeReleaseRef}
                onChange={setGuaranteeReleaseRef}
              />
              <LabelInput
                type="date"
                label={isAr ? 'تاريخ التحرير' : isEn ? 'Release Date' : 'Date de libération'}
                value={guaranteeReleaseDate}
                onChange={setGuaranteeReleaseDate}
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setGuaranteeDoc(null)}>
                  {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm">
                  {isAr ? 'تأكيد التحرير' : isEn ? 'Release Guarantee' : 'Valider Libération'}
                </AtriumButton>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>

      <UnifiedPaymentModal
        isOpen={unifiedPaymentOpen}
        onClose={() => setUnifiedPaymentOpen(false)}
        sourceVertical="trading_commercial"
        partyId={unifiedPaymentTarget?.partyId}
        partyName={unifiedPaymentTarget?.partyName || 'Client B2B'}
        defaultAmountDzd={unifiedPaymentTarget?.amountDzd || 0}
        onRecorded={(payment) => {
          if (unifiedPaymentTarget?.commercialDocId) {
            const linkedInv = invoices.find((d) => d.id === unifiedPaymentTarget.commercialDocId);
            if (linkedInv && linkedInv.status !== 'Paid') {
              updateCommercialDoc(linkedInv.id, {
                status: 'Paid',
                paymentMethod: payment.method,
              });
              const client = b2bClients.find((c) => c.id === linkedInv.clientId);
              if (client) {
                const newBal = Math.max(0, (client.outstandingBalance || 0) - linkedInv.netToPay);
                updateB2bClient(client.id, { outstandingBalance: newBal });
              }
            }
          }
          showToast({
            type: 'success',
            title: isAr ? 'تم تسجيل الدفعة' : isEn ? 'Payment Recorded' : 'Règlement Enregistré',
            message: `${payment.paymentNumber} · ${payment.partyName}`,
          });
        }}
      />
    </div>
  );
};

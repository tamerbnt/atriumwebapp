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
  X,
  CheckCircle,
  Layers,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentCommercialDocsFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentBranchFromState,
  selectCurrentTradingDeliveryRoundsFromState,
  selectCurrentB2bClientsFromState,
  selectCurrentStaffFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import {
  CommercialDocument,
  CommercialDocType,
  UnifiedDocument,
  TradingDeliveryRound,
  TradingDeliveryStop,
} from '../../../types';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { centimesToDzd } from '../../../utils/money';
import { computeRemainingConvertibleItems, reconcileDeliveryRoundStops } from '../../../utils/tradingDepth';
import { resolveBatchSelection } from '../../../utils/step5Actions';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { UnifiedInvoiceComposerModal, type UnifiedInvoiceComposerPrefill } from '../../common/invoicing/UnifiedInvoiceComposerModal';
import { UnifiedInvoicePrintModal } from '../../common/invoicing/UnifiedInvoicePrintModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
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
  KineticRowFanAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const STATUS_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]';

type TabKey = 'all' | 'devis' | 'commande' | 'bl' | 'facture' | 'avoir';
type StatusFilterKey = 'all' | 'Draft' | 'Validated' | 'Partial' | 'Delivered' | 'Paid';
type DrawerTab = 'overview' | 'items' | 'reglement';

export const TradingSalesView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { commercialDocs, unifiedDocuments, tradingDeliveryRounds, b2bClients, staffList, currentBranch, branches, isSyncing, networkMode, lastSyncedAt, isSyncTimeout } = useAtriumSelector(
    (s) => ({
      commercialDocs: selectCurrentCommercialDocsFromState(s),
      unifiedDocuments: selectCurrentUnifiedDocumentsFromState(s),
      tradingDeliveryRounds: selectCurrentTradingDeliveryRoundsFromState(s),
      b2bClients: selectCurrentB2bClientsFromState(s),
      staffList: selectCurrentStaffFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );
  const {
    deleteCommercialDoc,
    convertCommercialDoc,
    convertCommercialDocPartial,
    createTradingDeliveryRound,
    updateTradingDeliveryRound,
    completeTradingDeliveryRound,
    retryCloudSync,
    issueUnifiedDocument,
    createCreditNoteForDocument,
  } = useAtriumActions();

  const [salesMode, setSalesMode] = useState<'documents' | 'rounds'>('documents');
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
  const [prefillLinkedDoc, setPrefillLinkedDoc] = useState<CommercialDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);
  const [unifiedComposerOpen, setUnifiedComposerOpen] = useState(false);
  const [unifiedEditingDraft, setUnifiedEditingDraft] = useState<UnifiedDocument | null>(null);
  const [unifiedPrefill, setUnifiedPrefill] = useState<UnifiedInvoiceComposerPrefill | null>(null);
  const [printUnifiedDoc, setPrintUnifiedDoc] = useState<UnifiedDocument | null>(null);

  // Partial conversion modal
  const [partialSourceDoc, setPartialSourceDoc] = useState<CommercialDocument | null>(null);
  const [partialTargetType, setPartialTargetType] = useState<CommercialDocType>('bl');
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({});

  // Delivery rounds modals
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [roundRepId, setRoundRepId] = useState('');
  const [roundDate, setRoundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roundVehicle, setRoundVehicle] = useState('Fourgon Logistique 01');
  const [roundNotes, setRoundNotes] = useState('');
  const [roundDraftStops, setRoundDraftStops] = useState<TradingDeliveryStop[]>([]);
  const [reconcilingRound, setReconcilingRound] = useState<TradingDeliveryRound | null>(null);
  const [reconcileStops, setReconcileStops] = useState<TradingDeliveryStop[]>([]);
  const [roundCommissionPercent, setRoundCommissionPercent] = useState('1.5');

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
    setPrefillLinkedDoc(null);
    setComposerType(type);
    setComposerOpen(true);
  }, []);

  const handleOpenAvoirFromInvoice = useCallback((invoiceDoc: CommercialDocument) => {
    setEditingDoc(null);
    setPrefillLinkedDoc(invoiceDoc);
    setComposerType('avoir');
    setComposerOpen(true);
  }, []);

  const handleEdit = useCallback((doc: CommercialDocument) => {
    setEditingDoc(doc);
    setPrefillLinkedDoc(null);
    setComposerType(doc.type);
    setComposerOpen(true);
  }, []);

  const handleOpenPartialConvert = useCallback((doc: CommercialDocument) => {
    const defaultTarget: CommercialDocType =
      doc.type === 'bl' ? 'facture' : 'bl';
    const lines = computeRemainingConvertibleItems({
      sourceDoc: doc,
      targetType: defaultTarget,
    });
    const initQty: Record<string, number> = {};
    lines.forEach((l) => {
      initQty[l.item.id] = l.remainingQty;
    });
    setPartialSourceDoc(doc);
    setPartialTargetType(defaultTarget);
    setPartialQuantities(initQty);
  }, []);

  const handleSubmitPartialConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialSourceDoc) return;
    const created = convertCommercialDocPartial(partialSourceDoc.id, partialTargetType, partialQuantities);
    if (created) {
      setPartialSourceDoc(null);
    }
  };

  const handleOpenNewRound = useCallback(() => {
    const activeRep = staffList.find((s) => !s.status || s.status === 'active') || staffList[0];
    setRoundRepId(activeRep?.id || '');
    setRoundDate(new Date().toISOString().slice(0, 10));
    setRoundVehicle('Fourgon Logistique 01');
    setRoundNotes('');
    const firstClient = b2bClients[0];
    setRoundDraftStops(
      firstClient
        ? [
            {
              id: `stop_${Date.now()}_1`,
              clientId: firstClient.id,
              clientName: firstClient.companyName,
              expectedAmountDzd: 0,
              collectedAmountDzd: 0,
              status: 'pending',
            },
          ]
        : []
    );
    setNewRoundOpen(true);
  }, [staffList, b2bClients]);

  const handleCreateRound = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = staffList.find((s) => s.id === roundRepId) || staffList[0];
    const year = new Date().getFullYear();
    const num = `TRN-${year}-${(tradingDeliveryRounds.length + 1).toString().padStart(4, '0')}`;
    createTradingDeliveryRound({
      roundNumber: num,
      repStaffId: rep?.id,
      repName: rep ? (rep.fullName || 'Chauffeur / Rep') : 'Équipe Livraison',
      roundDate,
      vehicleLabel: roundVehicle.trim() || undefined,
      status: 'in_progress',
      stops: roundDraftStops.filter((s) => s.clientId || s.clientName),
      notes: roundNotes.trim() || undefined,
    });
    setNewRoundOpen(false);
  };

  const handleOpenReconcileRound = useCallback((round: TradingDeliveryRound) => {
    setReconcilingRound(round);
    setReconcileStops((round.stops || []).map((s) => ({ ...s })));
    setRoundCommissionPercent('1.5');
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
          { value: 'Partial', label: isAr ? 'جزئي' : isEn ? 'Partial' : 'Partiel' },
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
              <span className={`px-2 py-1 rounded-[var(--r-check,6px)] t-small font-semibold tabular-nums ${typeBadge}`}>
                {doc.type.slice(0, 3)}
              </span>
              <span className="tabular-nums font-semibold t-small text-black dark:text-white">{doc.docNumber}</span>
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
          <div className="t-cap tabular-nums">
            <div className="text-black dark:text-white">{doc.date}</div>
            {doc.dueDate && (
              <div className="t-cap text-black/55 dark:text-white/55">Éch: {doc.dueDate}</div>
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
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{doc.clientName}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
          <span className="t-small tabular-nums font-semibold text-black/70 dark:text-white/75">
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
          <span className="t-small tabular-nums font-semibold text-black dark:text-white">
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
          const isPartial = doc.status === 'Partial';
          const isValidated = doc.status === 'Validated';
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-[var(--r-check,6px)] t-small font-semibold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : isDelivered
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : isPartial
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                  : isValidated
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-[#EFE9E2] text-black/70 dark:bg-[#2B2825] dark:text-white/75'
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
        width: '220px',
        renderCell: (doc) => {
          const hasConvertibleRemainder =
            (doc.type === 'devis' || doc.type === 'commande' || doc.type === 'bl') &&
            doc.status !== 'Canceled' &&
            computeRemainingConvertibleItems({
              sourceDoc: doc,
              targetType: doc.type === 'bl' ? 'facture' : 'bl',
            }).some((r) => r.remainingQty > 0);
          return (
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
                className="p-2 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
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
                className="p-2 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
              >
                <Edit size={14} />
              </button>
              {hasConvertibleRemainder && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPartialConvert(doc);
                  }}
                  title={isAr ? 'تحويل جزئي' : isEn ? 'Partial Convert' : 'Conversion Partielle'}
                  data-sq="check"
                  data-sq-border="none"
                  className="px-2 py-1 t-small font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {doc.type === 'bl' ? (isAr ? 'فوترة ←' : 'Facturer →') : 'BL / BC →'}
                </button>
              )}
              {doc.type === 'facture' && doc.status !== 'Canceled' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAvoirFromInvoice(doc);
                  }}
                  title={isAr ? 'إنشاء إشعار دائن' : isEn ? 'Issue Credit Note' : 'Créer Avoir'}
                  data-sq="check"
                  data-sq-border="none"
                  className="px-2 py-1 t-small font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 transition-colors cursor-pointer"
                >
                  Avoir
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCommercialDoc(doc.id);
                  if (inspectingDoc?.id === doc.id) setInspectingDoc(null);
                }}
                aria-label={t('action_delete', 'Supprimer')}
                title={t('action_delete', 'Supprimer')}
                data-sq="ctl-sm"
                data-sq-border="none"
                className="p-2 text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language, handleEdit, handleOpenPartialConvert, handleOpenAvoirFromInvoice, deleteCommercialDoc, inspectingDoc?.id]
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
        primaryAction={
          salesMode === 'rounds'
            ? {
                label: isAr ? 'جولة توصيل جديدة' : isEn ? 'New Delivery Round' : 'Nouvelle Tournée',
                icon: <Truck size={15} />,
                onClick: handleOpenNewRound,
              }
            : {
                label: t('trading_sales_new_invoice', 'Nouvelle Facture'),
                icon: <Plus size={15} />,
                onClick: () => handleCreateNew('facture'),
              }
        }
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <AtriumButton
              variant="secondary"
              size="md"
              onClick={() => {
                setUnifiedEditingDraft(null);
                setUnifiedPrefill({ docType: 'facture', sourceVertical: 'trading_commercial' });
                setUnifiedComposerOpen(true);
              }}
              icon={<FileText size={14} />}
            >
              <span>{isAr ? 'فاتورة موحدة' : isEn ? 'Unified Document' : 'Pièce Unifiée'}</span>
            </AtriumButton>
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSalesMode('documents')}
          className={`px-3.5 py-2 rounded-xl t-small font-semibold transition-colors cursor-pointer ${
            salesMode === 'documents'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
              : 'bg-white dark:bg-[#262422] text-black/75 dark:text-white/75 border border-[var(--atr-divider)]'
          }`}
        >
          {isAr ? 'المستندات التجارية' : isEn ? 'Commercial Documents' : 'Documents Commerciaux'}
        </button>
        <button
          type="button"
          onClick={() => setSalesMode('rounds')}
          className={`px-3.5 py-2 rounded-xl t-small font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
            salesMode === 'rounds'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
              : 'bg-white dark:bg-[#262422] text-black/75 dark:text-white/75 border border-[var(--atr-divider)]'
          }`}
        >
          <Truck size={14} />
          <span>{isAr ? 'جولات التوصيل والتحصيل' : isEn ? 'Delivery Rounds & Cash' : 'Tournées & Encaissements'}</span>
          <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15 text-[11px] tabular-nums">
            {tradingDeliveryRounds.length}
          </span>
        </button>
      </div>

      {salesMode === 'rounds' ? (
        <ScreenPod>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="t-pod font-semibold text-black dark:text-white">
                {isAr ? 'جولات التوزيع الميداني ومطابقة التحصيل' : isEn ? 'Field Delivery Rounds & Collection Reconciliation' : 'Tournées de Livraison & Rapprochement Cash'}
              </h3>
              <p className="t-cap text-black/55 dark:text-white/60">
                {isAr
                  ? 'تتبع المندوبين، المبالغ المحصلة في الميدان، وإصدار العمولات.'
                  : isEn
                  ? 'Track rep stops, expected vs collected cash variance, and auto-generate rep commissions on close.'
                  : 'Suivi des arrêts clients, écart attendu vs encaissé, et génération de commission à la clôture.'}
              </p>
            </div>
            <AtriumButton variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleOpenNewRound}>
              {isAr ? 'إنشاء جولة' : isEn ? 'New Round' : 'Créer une Tournée'}
            </AtriumButton>
          </div>
          {tradingDeliveryRounds.length === 0 ? (
            <div data-sq="card" data-sq-border="solid" className="p-8 text-center space-y-3 bg-[#FAF7F4] dark:bg-[#1E1C1A] [--sq-stroke:var(--sq-stroke-card)]">
              <p className="t-body font-medium text-black dark:text-white">
                {isAr ? 'لا توجد جولات توصيل مسجلة' : isEn ? 'No delivery rounds scheduled' : 'Aucune tournée enregistrée'}
              </p>
              <AtriumButton variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleOpenNewRound}>
                {isAr ? 'بدء أول جولة' : isEn ? 'Create First Round' : 'Créer la Première Tournée'}
              </AtriumButton>
            </div>
          ) : (
            <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
              <table className="w-full text-left rtl:text-right t-cap">
                <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                  <tr>
                    <th className="py-2.5 px-3">N° Tournée</th>
                    <th className="py-2.5 px-3">Chauffeur / Rep</th>
                    <th className="py-2.5 px-3">Date & Véhicule</th>
                    <th className="py-2.5 px-3 text-right">Arrêts</th>
                    <th className="py-2.5 px-3 text-right">Attendu</th>
                    <th className="py-2.5 px-3 text-right">Encaissé</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                  {tradingDeliveryRounds.map((round) => {
                    const stats = reconcileDeliveryRoundStops(round.stops || []);
                    return (
                      <tr key={round.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                        <td className="py-2.5 px-3 font-semibold text-black dark:text-white">{round.roundNumber}</td>
                        <td className="py-2.5 px-3">{round.repName}</td>
                        <td className="py-2.5 px-3 text-black/70 dark:text-white/75">
                          {round.roundDate}{round.vehicleLabel ? ` · ${round.vehicleLabel}` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {stats.deliveredCount}/{stats.totalStops}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatMoney(stats.totalExpectedDzd)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(stats.totalCollectedDzd)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-[var(--r-check,6px)] t-small font-semibold ${
                              round.status === 'completed'
                                ? STATUS_PILL_OK
                                : round.status === 'in_progress'
                                ? STATUS_PILL_INFO
                                : STATUS_PILL_WARN
                            }`}
                          >
                            {round.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <AtriumButton
                            variant="secondary"
                            size="xs"
                            onClick={() => handleOpenReconcileRound(round)}
                          >
                            {round.status === 'completed' ? 'Détails' : 'Rapprocher & Clôturer'}
                          </AtriumButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ScreenPod>
      ) : (
        <>

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
          onDelete={(doc) => {
            deleteCommercialDoc(doc.id);
            if (inspectingDoc?.id === doc.id) setInspectingDoc(null);
          }}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير المستندات' : 'Exporter Sélection',
            icon: <Download size={13} />,
            onClick: (ids) => {
              const resolved = resolveBatchSelection(Array.from(ids), sortedDocs, (d) => d.id, 1000);
              if (resolved.selectedItems.length === 0) {
                showToast({
                  type: 'warning',
                  title: isAr ? 'لا توجد مستندات' : 'Aucune sélection valide',
                  message: isAr ? 'اختر مستنداً واحداً على الأقل للتصدير.' : 'Sélectionnez au moins une pièce commerciale.',
                });
                return;
              }
              const headers = ['N° Pièce', 'Type', 'Client', 'Date', 'Statut', 'Total HT', 'TVA', 'Total TTC'];
              const rows = resolved.selectedItems.map((d) => [
                d.docNumber,
                d.type,
                d.clientName,
                d.date,
                d.status,
                d.totalHtFinal,
                d.totalTva,
                d.totalTtc,
              ]);
              downloadCsvSafe(`atrium-commercial-docs-selection-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
              showToast({
                type: 'success',
                title: isAr ? 'تم التصدير' : 'Export commercial CSV',
                message: isAr
                  ? `تم تصدير ${resolved.selectedItems.length} مستنداً`
                  : `${resolved.selectedItems.length} pièce(s) exportée(s).`,
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
                  ? `حذف مستندات (${ids.size})`
                  : isEn
                  ? `Delete documents (${ids.size})`
                  : `Suppression documents (${ids.size})`,
              },
              () => {
                ids.forEach((id) => deleteCommercialDoc(id));
              }
            );
            setSelectedDocIds(new Set<string>());
            if (inspectingDoc && ids.has(inspectingDoc.id)) setInspectingDoc(null);
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
                  : doc.status === 'Delivered' || doc.status === 'Partial'
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
              onClick: () => {
                deleteCommercialDoc(doc.id);
                if (inspectingDoc?.id === doc.id) setInspectingDoc(null);
              },
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
        onDelete={(doc) => {
          deleteCommercialDoc(doc.id);
          if (inspectingDoc?.id === doc.id) setInspectingDoc(null);
        }}
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

      {salesMode === 'documents' && unifiedDocuments.length > 0 && (
        <ScreenPod>
          <div className="flex items-center justify-between mb-3">
            <span className="t-label font-semibold text-black dark:text-white">
              {isAr ? 'سجل الفوترة الموحد' : isEn ? 'Unified Invoicing Register' : 'Registre Facturation Unifiée'}
            </span>
            <span className="t-cap tabular-nums text-black/60 dark:text-white/60">
              {unifiedDocuments.length}
            </span>
          </div>
          <div className="divide-y divide-[var(--atr-divider)]">
            {unifiedDocuments.slice(0, 10).map((ud) => (
              <div key={ud.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 t-cap">
                <div className="min-w-0">
                  <div className="font-semibold text-black dark:text-white flex items-center gap-2">
                    <span className="tabular-nums">{ud.docNumber || ud.draftNumber}</span>
                    <span>·</span>
                    <span className="truncate">{ud.partyName}</span>
                    <span className="text-black/55 dark:text-white/55 uppercase">{ud.docType}</span>
                  </div>
                  <div className="text-black/60 dark:text-white/60 tabular-nums">
                    {ud.docDate} · {ud.status} · {ud.currency}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="tabular-nums font-semibold t-label">
                    {formatMoney(centimesToDzd(ud.totalTtcCentimes))}
                  </span>
                  {ud.status === 'Draft' && (
                    <AtriumButton
                      variant="primary"
                      size="xs"
                      onClick={() => issueUnifiedDocument(ud.id)}
                    >
                      {isAr ? 'إصدار' : isEn ? 'Issue' : 'Émettre'}
                    </AtriumButton>
                  )}
                  {ud.status === 'Issued' && ud.docType === 'facture' && (
                    <AtriumButton
                      variant="secondary"
                      size="xs"
                      onClick={() => createCreditNoteForDocument(ud.id, 'Retour / Avoir commercial', undefined, true)}
                    >
                      {isAr ? 'إشعار دائن' : isEn ? 'Credit Note' : 'Avoir'}
                    </AtriumButton>
                  )}
                  <AtriumButton
                    variant="ghost"
                    size="xs"
                    icon={<Printer size={13} />}
                    onClick={() => setPrintUnifiedDoc(ud)}
                  >
                    {isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer'}
                  </AtriumButton>
                </div>
              </div>
            ))}
          </div>
        </ScreenPod>
      )}
        </>
      )}

      {/* Partial Conversion Modal */}
      <KineticModalShell
        isOpen={Boolean(partialSourceDoc)}
        onClose={() => setPartialSourceDoc(null)}
        maxWidthClass="max-w-2xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {partialSourceDoc && (
          <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-[#BF431F] dark:text-[#FF8F63]" />
                <span>Conversion Partielle · {partialSourceDoc.docNumber}</span>
              </h2>
              <button type="button" onClick={() => setPartialSourceDoc(null)} className="p-1 text-black/55 dark:text-white/55 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitPartialConvert} className="space-y-4 t-cap">
              <LabelSelect
                label="Document cible"
                value={partialTargetType}
                onChange={(val) => setPartialTargetType(val as CommercialDocType)}
                options={
                  partialSourceDoc.type === 'bl'
                    ? [{ value: 'facture', label: 'Facture Fiscale (FAC)' }]
                    : partialSourceDoc.type === 'commande'
                    ? [
                        { value: 'bl', label: 'Bon de Livraison (BL)' },
                        { value: 'facture', label: 'Facture Fiscale (FAC)' },
                      ]
                    : [
                        { value: 'commande', label: 'Bon de Commande (BC)' },
                        { value: 'bl', label: 'Bon de Livraison (BL)' },
                      ]
                }
              />
              <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
                <table className="w-full text-left t-cap">
                  <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                    <tr>
                      <th className="py-2 px-3">Article</th>
                      <th className="py-2 px-2 text-right">Total</th>
                      <th className="py-2 px-2 text-right">Déjà conv.</th>
                      <th className="py-2 px-2 text-right">Reliquat</th>
                      <th className="py-2 px-3 text-right w-28">Qté à convertir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                    {computeRemainingConvertibleItems({
                      sourceDoc: partialSourceDoc,
                      targetType: partialTargetType,
                    }).map((row) => (
                      <tr key={row.item.id}>
                        <td className="py-2 px-3 font-medium text-black dark:text-white">{row.item.description}</td>
                        <td className="py-2 px-2 text-right">{row.item.quantity}</td>
                        <td className="py-2 px-2 text-right text-black/55 dark:text-white/60">{row.alreadyConvertedQty}</td>
                        <td className="py-2 px-2 text-right font-semibold text-blue-600 dark:text-blue-400">{row.remainingQty}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={0}
                            max={row.remainingQty}
                            step="any"
                            value={partialQuantities[row.item.id] ?? row.remainingQty}
                            onChange={(e) =>
                              setPartialQuantities((prev) => ({
                                ...prev,
                                [row.item.id]: Math.max(0, parseFloat(e.target.value) || 0),
                              }))
                            }
                            className="w-full h-8 rounded-[var(--r-check,6px)] bg-[#F5F1EC] dark:bg-[#292624] px-2 text-right tabular-nums text-black dark:text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setPartialSourceDoc(null)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm" icon={<CheckCircle size={14} />}>
                  Convertir Quantités Sélectionnées
                </AtriumButton>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>

      {/* New Delivery Round Modal */}
      <KineticModalShell
        isOpen={newRoundOpen}
        onClose={() => setNewRoundOpen(false)}
        maxWidthClass="max-w-2xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h2 className="t-card font-semibold text-black dark:text-white">Nouvelle Tournée de Livraison</h2>
            <button type="button" onClick={() => setNewRoundOpen(false)} className="p-1 text-black/55 dark:text-white/55 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreateRound} className="space-y-4 t-cap">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelSelect
                label="Chauffeur / Commercial"
                value={roundRepId}
                onChange={setRoundRepId}
                options={staffList.map((s) => ({
                  value: s.id,
                  label: `${s.fullName} (${s.role})`,
                }))}
              />
              <LabelInput type="date" label="Date tournée" value={roundDate} onChange={setRoundDate} required />
              <LabelInput label="Véhicule / Matricule" value={roundVehicle} onChange={setRoundVehicle} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="t-small font-semibold">Arrêts Clients ({roundDraftStops.length})</span>
                <AtriumButton
                  type="button"
                  variant="secondary"
                  size="xs"
                  icon={<Plus size={13} />}
                  onClick={() => {
                    const c = b2bClients[0];
                    setRoundDraftStops((prev) => [
                      ...prev,
                      {
                        id: `stop_${Date.now()}_${prev.length + 1}`,
                        clientId: c?.id || '',
                        clientName: c?.companyName || 'Client',
                        expectedAmountDzd: 0,
                        collectedAmountDzd: 0,
                        status: 'pending',
                      },
                    ]);
                  }}
                >
                  Ajouter arrêt
                </AtriumButton>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {roundDraftStops.map((stop, idx) => (
                  <div key={stop.id} className="grid grid-cols-12 gap-2 items-end p-2.5 bg-[#F5F1EC]/70 dark:bg-[#22201E] rounded-lg">
                    <div className="col-span-6">
                      <LabelSelect
                        label="Client"
                        value={stop.clientId || ''}
                        onChange={(cid) => {
                          const c = b2bClients.find((x) => x.id === cid);
                          setRoundDraftStops((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, clientId: cid, clientName: c?.companyName || s.clientName } : s
                            )
                          );
                        }}
                        options={b2bClients.map((c) => ({ value: c.id, label: c.companyName }))}
                      />
                    </div>
                    <div className="col-span-5">
                      <LabelInput
                        type="number"
                        min={0}
                        label="Attendu à encaisser (DA)"
                        value={stop.expectedAmountDzd}
                        onChange={(val) =>
                          setRoundDraftStops((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, expectedAmountDzd: Math.max(0, parseFloat(val) || 0) } : s))
                          )
                        }
                      />
                    </div>
                    <div className="col-span-1 flex justify-center pb-1">
                      <button
                        type="button"
                        onClick={() => setRoundDraftStops((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-black/55 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <LabelInput label="Observations" value={roundNotes} onChange={setRoundNotes} />
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setNewRoundOpen(false)}>
                Annuler
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                Lancer la Tournée
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>

      {/* Reconcile & Complete Delivery Round Modal */}
      <KineticModalShell
        isOpen={Boolean(reconcilingRound)}
        onClose={() => setReconcilingRound(null)}
        maxWidthClass="max-w-2xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {reconcilingRound && (
          <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white">
                Rapprochement Tournée · {reconcilingRound.roundNumber}
              </h2>
              <button type="button" onClick={() => setReconcilingRound(null)} className="p-1 text-black/55 dark:text-white/55 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reconcileStops.map((stop, idx) => (
                <div key={stop.id} className="grid grid-cols-12 gap-2 items-end p-2.5 bg-[#F5F1EC]/70 dark:bg-[#22201E] rounded-lg t-cap">
                  <div className="col-span-4">
                    <span className="block font-semibold text-black dark:text-white">{stop.clientName}</span>
                    <span className="tabular-nums text-black/55 dark:text-white/60">
                      Attendu: {formatMoney(stop.expectedAmountDzd)}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <LabelInput
                      type="number"
                      min={0}
                      label="Encaissé (DA)"
                      value={stop.collectedAmountDzd}
                      onChange={(val) =>
                        setReconcileStops((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, collectedAmountDzd: Math.max(0, parseFloat(val) || 0) } : s))
                        )
                      }
                    />
                  </div>
                  <div className="col-span-4">
                    <LabelSelect
                      label="Statut arrêt"
                      value={stop.status}
                      onChange={(val) =>
                        setReconcileStops((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, status: val as TradingDeliveryStop['status'] } : s))
                        )
                      }
                      options={[
                        { value: 'pending', label: 'En attente' },
                        { value: 'delivered', label: 'Livré & Encaissé' },
                        { value: 'partial', label: 'Partiel' },
                        { value: 'failed', label: 'Échec / Absent' },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
            {(() => {
              const summary = reconcileDeliveryRoundStops(reconcileStops);
              return (
                <div data-sq="ctl-sm" data-sq-border="none" className="grid grid-cols-3 gap-3 p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap tabular-nums">
                  <div>
                    <span className="text-black/55 dark:text-white/60 block">Total Attendu</span>
                    <span className="font-semibold">{formatMoney(summary.totalExpectedDzd)}</span>
                  </div>
                  <div>
                    <span className="text-black/55 dark:text-white/60 block">Total Encaissé</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(summary.totalCollectedDzd)}</span>
                  </div>
                  <div>
                    <span className="text-black/55 dark:text-white/60 block">Écart</span>
                    <span className={`font-semibold ${summary.varianceDzd < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatMoney(summary.varianceDzd)}
                    </span>
                  </div>
                </div>
              );
            })()}
            {reconcilingRound.status !== 'completed' && (
              <LabelInput
                type="number"
                step={0.1}
                min={0}
                label="Taux commission rep à la clôture (%) — 0 pour aucune"
                value={roundCommissionPercent}
                onChange={setRoundCommissionPercent}
              />
            )}
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setReconcilingRound(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  updateTradingDeliveryRound(reconcilingRound.id, { stops: reconcileStops });
                  setReconcilingRound(null);
                }}
              >
                Enregistrer Arrêts
              </AtriumButton>
              {reconcilingRound.status !== 'completed' && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle size={14} />}
                  onClick={() => {
                    updateTradingDeliveryRound(reconcilingRound.id, { stops: reconcileStops });
                    const bps = Math.max(0, Math.round((parseFloat(roundCommissionPercent) || 0) * 100));
                    completeTradingDeliveryRound(reconcilingRound.id, { commissionRateBps: bps });
                    setReconcilingRound(null);
                  }}
                >
                  Clôturer Tournée
                </AtriumButton>
              )}
            </div>
          </div>
        )}
      </KineticModalShell>

      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setPrefillLinkedDoc(null);
        }}
        initialType={composerType}
        editingDoc={editingDoc}
        prefillLinkedDoc={prefillLinkedDoc}
      />
      <CommercialDocPrintModal isOpen={!!printDoc} onClose={() => setPrintDoc(null)} document={printDoc} />
      <UnifiedInvoiceComposerModal
        isOpen={unifiedComposerOpen}
        onClose={() => setUnifiedComposerOpen(false)}
        editingDraft={unifiedEditingDraft}
        prefill={unifiedPrefill}
        onSaved={(doc) => setPrintUnifiedDoc(doc)}
      />
      <UnifiedInvoicePrintModal
        isOpen={Boolean(printUnifiedDoc)}
        onClose={() => setPrintUnifiedDoc(null)}
        document={printUnifiedDoc}
      />
    </div>
  );
};

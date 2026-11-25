import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Printer,
  Scale,
  Send,
  Share2,
  Pin,
  Download,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import {
  cloneSnapshot,
  pickLocalizedText,
  registerUndoEntry,
  runUndoBatch,
} from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { t as i18nT } from '../../../utils/i18n';
import { calculateArt317Timbre } from '../../../utils/agriRules';
import { AgriHarvestTicket } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AgriWeighbridgePrintModal } from './AgriWeighbridgePrintModal';
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
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const AgricultureWholesaleView: React.FC = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { harvestTickets, deleteHarvestTicket } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [settledTickets, setSettledTickets] = useState<string[]>(['pes_01']);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['pes_01']));
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selectedTicket, setSelectedTicket] = useState<AgriHarvestTicket | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('decompte');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [ticketForPrint, setTicketForPrint] = useState<AgriHarvestTicket | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeTicket = useMemo(() => {
    if (!selectedTicket) return null;
    return harvestTickets.find((t) => t.id === selectedTicket.id) || selectedTicket;
  }, [selectedTicket, harvestTickets]);

  const getTicketGross = useCallback(
    (t: AgriHarvestTicket) =>
      t.totalGrossDzd ?? t.subtotalProduceDzd ?? t.netWeightKg * t.unitPriceDzdPerKg,
    []
  );

  const getTicketFeePct = useCallback(
    (t: AgriHarvestTicket) => t.mandataireFeePercent ?? 6,
    []
  );

  const getTicketNet = useCallback(
    (t: AgriHarvestTicket) => {
      if (t.netFarmPayoutDzd !== undefined) return t.netFarmPayoutDzd;
      const gross = getTicketGross(t);
      return gross - (gross * getTicketFeePct(t)) / 100;
    },
    [getTicketGross, getTicketFeePct]
  );

  const settledSet = useMemo(() => new Set(settledTickets), [settledTickets]);

  const settledCount = useMemo(
    () => harvestTickets.filter((t) => settledSet.has(t.id)).length,
    [harvestTickets, settledSet]
  );
  const pendingCount = useMemo(
    () => harvestTickets.filter((t) => !settledSet.has(t.id)).length,
    [harvestTickets, settledSet]
  );

  const totalGrossSales = useMemo(
    () => harvestTickets.reduce((acc, t) => acc + getTicketGross(t), 0),
    [harvestTickets, getTicketGross]
  );
  const totalMandataireFees = useMemo(
    () =>
      harvestTickets.reduce(
        (acc, t) => acc + (getTicketGross(t) * getTicketFeePct(t)) / 100,
        0
      ),
    [harvestTickets, getTicketGross, getTicketFeePct]
  );
  const totalNetFarm = totalGrossSales - totalMandataireFees;

  const branchOptions = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    harvestTickets.forEach((t) => {
      const resolved = resolveRecordBranch(t, branchesById, currentBranch, language);
      const prev = counts.get(resolved.id);
      counts.set(resolved.id, {
        id: resolved.id,
        name: resolved.name,
        count: (prev?.count || 0) + 1,
      });
    });
    return [
      { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All' : 'Toutes', count: harvestTickets.length },
      ...Array.from(counts.values()).map((b) => ({
        value: b.id,
        label: b.name,
        count: b.count,
      })),
    ];
  }, [harvestTickets, branchesById, currentBranch, language, isAr, isEn]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return harvestTickets.filter((t) => {
      const isSettled = settledSet.has(t.id);
      if (statusFilter === 'settled' && !isSettled) return false;
      if (statusFilter === 'pending' && isSettled) return false;

      if (paymentFilter === 'cash' && t.paymentMethod !== 'cash') return false;
      if (paymentFilter === 'bank' && t.paymentMethod === 'cash') return false;

      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(t, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }

      if (q) {
        const matchesCrop = t.cropDesignation.toLowerCase().includes(q);
        const matchesMarket = (t.destinationWholesaleMarket || '').toLowerCase().includes(q);
        const matchesNumber = t.ticketNumber.toLowerCase().includes(q);
        const matchesDriver = (t.driverName || '').toLowerCase().includes(q);
        const matchesBuyer = (t.buyerName || '').toLowerCase().includes(q);
        if (!matchesCrop && !matchesMarket && !matchesNumber && !matchesDriver && !matchesBuyer) {
          return false;
        }
      }
      return true;
    });
  }, [
    harvestTickets,
    settledSet,
    statusFilter,
    paymentFilter,
    branchFilter,
    branchesById,
    currentBranch,
    language,
    searchQuery,
  ]);

  const sortedTickets = useMemo(() => {
    const list = [...filteredTickets];
    list.sort((a, b) => {
      const pinA = pinnedIds.has(a.id) ? 1 : 0;
      const pinB = pinnedIds.has(b.id) ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      let valA: string | number = a.date;
      let valB: string | number = b.date;
      if (sortBy === 'ticketNumber') {
        valA = a.ticketNumber;
        valB = b.ticketNumber;
      } else if (sortBy === 'crop') {
        valA = a.cropDesignation;
        valB = b.cropDesignation;
      } else if (sortBy === 'netWeightKg') {
        valA = a.netWeightKg;
        valB = b.netWeightKg;
      } else if (sortBy === 'unitPrice') {
        valA = a.unitPriceDzdPerKg;
        valB = b.unitPriceDzdPerKg;
      } else if (sortBy === 'netPayout') {
        valA = getTicketNet(a);
        valB = getTicketNet(b);
      } else if (sortBy === 'branch') {
        valA = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        valB = resolveRecordBranch(b, branchesById, currentBranch, language).name;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [
    filteredTickets,
    pinnedIds,
    sortBy,
    sortDir,
    getTicketNet,
    branchesById,
    currentBranch,
    language,
  ]);

  const handleSettle = useCallback(
    (id: string, ticketNumber: string, netAmount: number) => {
      if (!settledSet.has(id)) {
        const prevSettled = cloneSnapshot(settledTickets);
        const nextSettled = [...prevSettled, id];
        setSettledTickets(nextSettled);
        registerUndoEntry({
          vertical: 'agriculture_farming',
          operationType: 'status',
          summary: pickLocalizedText(language, {
            en: `Settled wholesale ticket ${ticketNumber} (${formatMoney(netAmount, language)})`,
            fr: `Encaissement du net confirmé (${ticketNumber} · ${formatMoney(netAmount, language)})`,
            ar: `تم استلام صافي الوصل ${ticketNumber} (${formatMoney(netAmount, language)})`,
          }),
          entityLabel: ticketNumber,
          toastType: 'success',
          undo: () => setSettledTickets(cloneSnapshot(prevSettled)),
          redo: () => setSettledTickets(cloneSnapshot(nextSettled)),
        });
      }
    },
    [settledSet, settledTickets, language]
  );

  const handleBulkSettle = useCallback(
    (ids: Set<string>) => {
      const newlySettled = Array.from(ids).filter((id) => !settledSet.has(id));
      if (newlySettled.length === 0) {
        showToast(
          isAr ? 'الوصولات المحددة محصلة مسبقاً' : 'Bordereaux sélectionnés déjà encaissés',
          'info'
        );
        return;
      }
      const prevSettled = cloneSnapshot(settledTickets);
      const nextSettled = Array.from(new Set([...prevSettled, ...newlySettled]));
      setSettledTickets(nextSettled);
      setSelectedIds(new Set<string>());
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'bulk',
        summary: pickLocalizedText(language, {
          en: `Settled ${newlySettled.length} wholesale ticket(s)`,
          fr: `${newlySettled.length} bordereau(x) marqués encaissés`,
          ar: `تم تأكيد قبض ${newlySettled.length} وصولات جملة`,
        }),
        affectedCount: newlySettled.length,
        toastType: 'success',
        undo: () => setSettledTickets(cloneSnapshot(prevSettled)),
        redo: () => setSettledTickets(cloneSnapshot(nextSettled)),
      });
    },
    [settledSet, settledTickets, isAr, language]
  );

  const handleTogglePin = useCallback(
    (ticket: AgriHarvestTicket) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(ticket.id)) {
          next.delete(ticket.id);
        } else {
          next.add(ticket.id);
        }
        return next;
      });
      showToast(
        pinnedIds.has(ticket.id)
          ? isAr ? 'تم إلغاء التثبيت' : 'Bordereau désépinglé'
          : isAr ? 'تم التثبيت بالأعلى' : 'Bordereau épinglé en haut',
        'info'
      );
    },
    [pinnedIds, isAr]
  );

  const handleSelectTicket = useCallback(
    (ticket: AgriHarvestTicket, opener?: HTMLElement | null) => {
      setSelectedTicket(ticket);
      if (opener) setDrawerOpenerEl(opener);
      setInspectorTab('decompte');
    },
    []
  );

  const handleDeleteTicket = useCallback(
    (ticket: AgriHarvestTicket) => {
      deleteHarvestTicket(ticket.id);
      if (selectedTicket?.id === ticket.id) setSelectedTicket(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(ticket.id);
        return next;
      });
    },
    [deleteHarvestTicket, selectedTicket]
  );

  const handleOpenPrintPrimary = useCallback(() => {
    const target = activeTicket || sortedTickets[0] || harvestTickets[0] || null;
    if (!target) {
      showToast(
        isAr ? 'لا توجد وصولات متاحة للطباعة' : 'Aucun bordereau disponible pour impression',
        'info'
      );
      return;
    }
    setTicketForPrint(target);
    setIsPrintModalOpen(true);
  }, [activeTicket, sortedTickets, harvestTickets, isAr]);

  const handleExportCsv = useCallback(() => {
    const headers = [
      'Ticket',
      'Date',
      'Culture',
      'Marche Gros',
      'Branche',
      'Poids Net (kg)',
      'Prix Criee (DZD/kg)',
      'Brut (DZD)',
      'Commission 6% (DZD)',
      'Net Domaine (DZD)',
      'Statut',
    ];
    const rows = sortedTickets.map((t) => {
      const gross = getTicketGross(t);
      const fee = (gross * getTicketFeePct(t)) / 100;
      const net = getTicketNet(t);
      const branch = resolveRecordBranch(t, branchesById, currentBranch, language).name;
      return [
        t.ticketNumber,
        t.date,
        t.cropDesignation,
        t.destinationWholesaleMarket,
        branch,
        t.netWeightKg,
        t.unitPriceDzdPerKg,
        Math.round(gross),
        Math.round(fee),
        Math.round(net),
        settledSet.has(t.id) ? 'Encaisse' : 'En attente',
      ];
    });
    downloadCsvSafe(
      `ventes_gros_criee_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(
      isAr ? 'تم تصدير سجل مبيعات الجملة' : 'Grand-livre ventes gros exporté (CSV)',
      'success'
    );
  }, [
    sortedTickets,
    getTicketGross,
    getTicketFeePct,
    getTicketNet,
    branchesById,
    currentBranch,
    language,
    settledSet,
    isAr,
  ]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setBranchFilter('All');
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (paymentFilter !== 'all') count++;
    if (branchFilter !== 'All') count++;
    return count;
  }, [statusFilter, paymentFilter, branchFilter]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label:
          statusFilter === 'settled'
            ? isAr ? 'الحالة: مقبوضة' : 'Statut: Encaissés'
            : isAr ? 'الحالة: قيد التحصيل' : 'Statut: En attente',
        onRemove: () => setStatusFilter('all'),
      });
    }
    if (paymentFilter !== 'all') {
      chips.push({
        key: 'payment',
        label:
          paymentFilter === 'cash'
            ? isAr ? 'الدفع: نقداً' : 'Règlement: Espèces'
            : isAr ? 'الدفع: بنكي' : 'Règlement: Bancaire',
        onRemove: () => setPaymentFilter('all'),
      });
    }
    if (branchFilter !== 'All') {
      const label = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : 'Site'}: ${label}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [statusFilter, paymentFilter, branchFilter, branchOptions, isAr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'status',
        label: isAr ? 'حالة التحصيل' : isEn ? 'Settlement Status' : 'Statut Trésorerie',
        kind: 'segmented',
        value: statusFilter,
        resetValue: 'all',
        onChange: setStatusFilter,
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Tous', count: harvestTickets.length },
          { value: 'settled', label: isAr ? 'مقبوضة' : 'Encaissés', count: settledCount },
          { value: 'pending', label: isAr ? 'معلقة' : 'En attente', count: pendingCount },
        ],
      },
      {
        id: 'payment',
        label: isAr ? 'طريقة الدفع' : isEn ? 'Payment Method' : 'Mode de Règlement',
        kind: 'segmented',
        value: paymentFilter,
        resetValue: 'all',
        onChange: setPaymentFilter,
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Tous' },
          { value: 'cash', label: isAr ? 'نقداً' : 'Espèces' },
          { value: 'bank', label: isAr ? 'شيك / تحويل' : 'Chèque / Virement' },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / المستثمرة' : isEn ? 'Branch / Estate' : 'Site / Exploitation',
        kind: 'tiles',
        columns: 2,
        value: branchFilter,
        resetValue: 'All',
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [
      isAr,
      isEn,
      statusFilter,
      harvestTickets.length,
      settledCount,
      pendingCount,
      paymentFilter,
      branchFilter,
      branchOptions,
    ]
  );

  const columns: ColumnDefinition<AgriHarvestTicket>[] = useMemo(
    () => [
      {
        key: 'ticketNumber',
        header: isAr ? 'رقم الوصل' : 'N° Bordereau',
        width: '125px',
        sortable: true,
        renderCell: (t) => (
          <div className="flex items-center gap-2 tabular-nums font-semibold t-small">
            {pinnedIds.has(t.id) && <Pin size={11} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />}
            <span className="bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] px-2 py-1 rounded-[var(--r-check,6px)] border border-[#d4522f]/20">
              {t.ticketNumber}
            </span>
          </div>
        ),
      },
      {
        key: 'crop',
        header: isAr ? 'المنتوج وسوق الجملة' : 'Culture & Criée',
        sortable: true,
        renderCell: (t) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block">
              {t.cropDesignation}
            </span>
            <span className="t-cap text-black/55 dark:text-white/55">
              {t.destinationWholesaleMarket}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'المزرعة / الفرع' : isEn ? 'Branch' : 'Exploitation',
        width: '140px',
        sortable: true,
        renderCell: (t) => (
          <span className="t-cap text-black/70 dark:text-white/75 truncate block">
            {resolveRecordBranch(t, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'netWeightKg',
        header: isAr ? 'الوزن الصافي' : 'Poids Net',
        width: '120px',
        sortable: true,
        renderCell: (t) => (
          <div className="tabular-nums t-cap">
            <span className="font-semibold text-black dark:text-white">
              {t.netWeightKg.toLocaleString()} kg
            </span>
            <span className="t-cap text-black/55 dark:text-white/55 block">
              Brut: {t.grossWeightKg.toLocaleString()} kg
            </span>
          </div>
        ),
      },
      {
        key: 'unitPrice',
        header: isAr ? 'سعر الكريّة' : 'Cours Criée',
        width: '115px',
        sortable: true,
        renderCell: (t) => (
          <span className="tabular-nums t-small font-semibold text-black/70 dark:text-white/75">
            {t.unitPriceDzdPerKg} DZD/kg
          </span>
        ),
      },
      {
        key: 'fee',
        header: isAr ? 'العمولة (6%)' : 'Com. Mandataire',
        width: '125px',
        renderCell: (t) => (
          <span className="tabular-nums t-small text-amber-600 dark:text-amber-400 font-medium">
            -{formatMoney((getTicketGross(t) * getTicketFeePct(t)) / 100, language)}
          </span>
        ),
      },
      {
        key: 'netPayout',
        header: isAr ? 'صافي المزرعة' : 'Net à Verser',
        width: '135px',
        sortable: true,
        renderCell: (t) => (
          <span className="tabular-nums t-small font-semibold text-black dark:text-white">
            {formatMoney(getTicketNet(t), language)}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الوضعية' : 'Statut Trésorerie',
        width: '125px',
        renderCell: (t) => {
          const isSettled = settledSet.has(t.id);
          return (
            <span
              className={`px-2.5 py-1 rounded-full t-small font-semibold inline-flex items-center gap-1 ${
                isSettled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {isSettled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
              {isSettled
                ? isAr ? 'مقبوض' : 'Encaissé'
                : isAr ? 'في الانتظار' : 'En attente'}
            </span>
          );
        },
      },
    ],
    [
      isAr,
      isEn,
      pinnedIds,
      branchesById,
      currentBranch,
      language,
      getTicketGross,
      getTicketFeePct,
      getTicketNet,
      settledSet,
    ]
  );

  const getRowMeta = useCallback(
    (t: AgriHarvestTicket): Partial<KineticRowData> => {
      const isSettled = settledSet.has(t.id);
      const branchName = resolveRecordBranch(t, branchesById, currentBranch, language).name;
      const gross = getTicketGross(t);
      const feePct = getTicketFeePct(t);
      const net = getTicketNet(t);
      return {
        subline: `${t.ticketNumber} · ${t.destinationWholesaleMarket}`,
        categoryLabel: t.cropDesignation,
        statusLabel: isSettled
          ? isAr ? 'مقبوض' : isEn ? 'Settled' : 'Encaissé'
          : isAr ? 'في الانتظار' : isEn ? 'Pending' : 'En attente',
        statusVariant: isSettled ? 'active' : 'warning',
        metricPrimary: formatMoney(net, language),
        metricSecondary: `${t.netWeightKg.toLocaleString()} kg`,
        detailCol1: {
          heading: isAr ? 'الوصل والسوق' : isEn ? 'Ticket & Market' : 'Bordereau & Criée',
          primaryText: t.destinationWholesaleMarket,
          secondaryText: `${t.driverName || 'Mandataire'} · ${t.date}`,
          tertiaryText: branchName,
        },
        detailCol2: {
          heading: isAr ? 'الوزن والسعر' : isEn ? 'Tonnage & Rate' : 'Poids & Cours Criée',
          primaryText: `${t.netWeightKg.toLocaleString()} kg net`,
          secondaryText: `Cours ${t.unitPriceDzdPerKg} DZD/kg · Brut ${formatMoney(gross, language)}`,
          tertiaryText: `Com. ${feePct}% (-${formatMoney((gross * feePct) / 100, language)})`,
        },
        detailCol3: {
          heading: isAr ? 'التسوية' : isEn ? 'Settlement' : 'Net Domaine',
          primaryText: formatMoney(net, language),
          secondaryText: isSettled
            ? isAr ? 'تم التحصيل بالكامل' : 'Reçu et pointé'
            : isAr ? 'قيد الانتظار' : 'En attente de versement',
        },
      };
    },
    [settledSet, branchesById, currentBranch, language, getTicketGross, getTicketFeePct, getTicketNet, isAr, isEn]
  );

  const getFanActions = useCallback(
    (t: AgriHarvestTicket): KineticRowFanAction[] => {
      const isSettled = settledSet.has(t.id);
      return [
        ...(!isSettled
          ? [
              {
                id: 'settle',
                label: isAr ? 'تحصيل' : 'Encaisser',
                icon: <Send className="w-[15px] h-[15px]" />,
                onClick: () => handleSettle(t.id, t.ticketNumber, getTicketNet(t)),
              },
            ]
          : []),
        {
          id: 'print',
          label: isAr ? 'طباعة' : 'Imprimer',
          icon: <Printer className="w-[15px] h-[15px]" />,
          onClick: () => {
            setTicketForPrint(t);
            setIsPrintModalOpen(true);
          },
        },
        {
          id: 'open',
          label: isAr ? 'تفاصيل' : 'Détails',
          icon: <Scale className="w-[15px] h-[15px]" />,
          onClick: (e) => handleSelectTicket(t, e.currentTarget),
        },
      ];
    },
    [settledSet, handleSettle, getTicketNet, handleSelectTicket, isAr]
  );

  const getDetailActions = useCallback(
    (t: AgriHarvestTicket): KineticDetailAction[] => {
      const isSettled = settledSet.has(t.id);
      return [
        {
          id: 'inspect',
          label: isAr ? 'معاينة البيان' : 'Décompte',
          icon: <Scale className="w-3.5 h-3.5" />,
          onClick: () => handleSelectTicket(t),
        },
        ...(!isSettled
          ? [
              {
                id: 'settle',
                label: isAr ? 'تأكيد القبض' : 'Encaisser Net',
                icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#096b40]" />,
                onClick: () => handleSettle(t.id, t.ticketNumber, getTicketNet(t)),
              },
            ]
          : []),
        {
          id: 'print',
          label: isAr ? 'طباعة' : 'Imprimer BL',
          icon: <Printer className="w-3.5 h-3.5" />,
          onClick: () => {
            setTicketForPrint(t);
            setIsPrintModalOpen(true);
          },
        },
      ];
    },
    [settledSet, handleSelectTicket, handleSettle, getTicketNet, isAr]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: harvestTickets.length > 0,
  });

  if (showSkeleton && (harvestTickets.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '1.8*', minWidth: '150px' },
          { width: '1.8*', minWidth: '140px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.3*', minWidth: '120px' },
          { width: '1.4*', minWidth: '130px' },
        ]}
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Wallet size={22} />}
        title={isAr ? 'الجملة' : isEn ? 'Wholesale' : 'Ventes Gros'}
        primaryAction={{
          label: isAr ? 'طباعة وصل الميزان والتسليم' : isEn ? 'Weighbridge & BL' : 'Bon de Pesée & BL',
          icon: <Printer size={15} />,
          onClick: handleOpenPrintPrimary,
          dataAction: 'print-wholesale',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'حسابات الوكلاء والمبيعات الإجمالية'
            : isEn
            ? 'Wholesale Auction & Broker Accounting'
            : 'Comptabilité Ventes Gros & Mandataires'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'وصولات مسددة بالكامل' : isEn ? 'Settled Tickets' : 'Bordereaux Encaissés',
          badgeText: isAr ? 'مقبوضة' : isEn ? 'Settled' : 'Encaissés',
          count: settledCount,
          tone: 'emerald',
          isActive: statusFilter === 'settled',
          onToggle: () => setStatusFilter((prev) => (prev === 'settled' ? 'all' : 'settled')),
        }}
        secondaryCard={{
          label: isAr ? 'قيد التحصيل عند الوكيل' : isEn ? 'Pending Settlement' : 'En Attente Mandataire',
          badgeText: isAr ? 'معلق' : isEn ? 'Pending' : 'En Attente',
          count: pendingCount,
          tone: 'terracotta',
          isActive: statusFilter === 'pending',
          onToggle: () => setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending')),
        }}
        darkCard={{
          label: isAr ? 'صافي مستحقات المزرعة' : isEn ? 'Net Farm Payout' : 'Net à Verser Domaine',
          badgeCount: Math.round(totalMandataireFees),
          badgePrefix: isAr ? 'عمولة ' : 'Com. ',
          badgeSuffix: ' DZD',
          formatBadgeValue: (v) => Math.round(v).toLocaleString(),
          valueCount: Math.round(totalNetFarm),
          formatValue: (v) => formatMoney(v, language),
          caption: isAr
            ? `إجمالي المبيعات: ${formatMoney(totalGrossSales, language)}`
            : `CA Brut: ${formatMoney(totalGrossSales, language)} · Trésorerie Gros`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'وصولات البيع وتسويات أسواق الجملة'
              : isEn
              ? 'Wholesale Market Receipts & Settlements'
              : 'Bordereaux de Criée & Ventes Mandataires'
          }
          liveRegionText={`${sortedTickets.length} ${isAr ? 'وصولات' : 'bordereaux'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث بالمنتج، الوكيل، الوصل، السائق...'
              : 'Rechercher produit, mandataire, ticket, marché...'
          }
          statusOptions={[
            { value: 'all', label: isAr ? 'الكل' : 'Tous', count: harvestTickets.length },
            { value: 'settled', label: isAr ? 'مقبوضة' : 'Encaissés', count: settledCount },
            { value: 'pending', label: isAr ? 'معلق' : 'En attente', count: pendingCount },
          ]}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection<AgriHarvestTicket>
          hideToolbar
          items={sortedTickets}
          columns={columns}
          keyExtractor={(t) => t.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'تأكيد القبض المحدد' : 'Marquer Encaissés',
            icon: <CheckCircle2 size={14} />,
            onClick: handleBulkSettle,
          }}
          onBulkDelete={(ids) => {
            runUndoBatch(
              {
                vertical: 'agriculture_farming',
                operationType: 'bulk',
                affectedCount: ids.size,
                toastType: 'info',
                summary: pickLocalizedText(language, {
                  en: `Deleted ${ids.size} wholesale ticket(s)`,
                  fr: `${ids.size} bordereau(x) supprimé(s)`,
                  ar: `تم حذف ${ids.size} وصولات جملة`,
                }),
              },
              () => {
                ids.forEach((id) => deleteHarvestTicket(id));
              }
            );
            setSelectedIds(new Set<string>());
            if (selectedTicket && ids.has(selectedTicket.id)) setSelectedTicket(null);
          }}
          isPinned={(t) => pinnedIds.has(t.id)}
          onTogglePin={handleTogglePin}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          openItemId={activeTicket?.id || null}
          onItemClick={handleSelectTicket}
          onViewDetails={handleSelectTicket}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          onDelete={handleDeleteTicket}
          emptyTitle={isAr ? 'لا توجد وصولات بيع بالجملة' : 'Aucun bordereau de criée'}
          emptyDescription={
            searchQuery || activeFiltersCount > 0
              ? isAr ? 'لا توجد نتائج مطابقة للبحث أو التصفية' : 'Aucun bordereau ne correspond aux critères'
              : isAr ? 'سجل شحنات الجملة فارغ حالياً' : 'Aucune expédition vers les marchés de gros enregistrée'
          }
          onResetFilters={resetAllFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          customActions={(t) => {
            const isSettled = settledSet.has(t.id);
            return [
              ...(!isSettled
                ? [
                    {
                      id: 'settle',
                      label: isAr ? 'تأكيد القبض' : 'Encaisser Net',
                      icon: <Send size={14} />,
                      onClick: () => handleSettle(t.id, t.ticketNumber, getTicketNet(t)),
                    },
                  ]
                : []),
              {
                id: 'print',
                label: isAr ? 'وصل الوزن والتسليم' : 'Bon de Pesée & BL',
                icon: <Printer size={14} />,
                onClick: () => {
                  setTicketForPrint(t);
                  setIsPrintModalOpen(true);
                },
              },
              {
                id: 'share',
                label: isAr ? 'مشاركة الوصل' : 'Partager Bordereau',
                icon: <Share2 size={14} />,
                disabled: true,
                tooltip: i18nT('feature_not_available_phase2', language),
                onClick: () => {},
              },
            ];
          }}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedTickets.length}
        entityPluralLabel={isAr ? 'وصولات' : 'bordereaux'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<AgriHarvestTicket>
        isOpen={Boolean(activeTicket)}
        item={activeTicket}
        allItems={sortedTickets}
        keyExtractor={(t) => t.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeTicket?.ticketNumber || ''}
        subtitle={
          activeTicket
            ? `${activeTicket.cropDesignation} · ${activeTicket.destinationWholesaleMarket}`
            : undefined
        }
        categoryLabel={activeTicket?.cropDesignation}
        avatarText={(activeTicket?.ticketNumber || 'WG').slice(-2).toUpperCase()}
        branchName={
          activeTicket
            ? resolveRecordBranch(activeTicket, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeTicket
            ? settledSet.has(activeTicket.id)
              ? isAr ? 'مقبوض' : 'Encaissé'
              : isAr ? 'في الانتظار' : 'En attente'
            : undefined
        }
        statusClassName={
          activeTicket && settledSet.has(activeTicket.id)
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'decompte', label: isAr ? 'البيان المالي' : 'Décompte' },
          { id: 'pesee', label: isAr ? 'ميزان الجسر' : 'Pont-Bascule' },
          { id: 'tracabilite', label: isAr ? 'النقل والتتبع' : 'Suivi lot' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(item) => handleSelectTicket(item)}
        onClose={() => setSelectedTicket(null)}
        onDelete={handleDeleteTicket}
        holdToDelete
        renderBody={(item, tab) => {
          const isSettled = settledSet.has(item.id);
          const gross = getTicketGross(item);
          const feePct = getTicketFeePct(item);
          const fee = (gross * feePct) / 100;
          const net = getTicketNet(item);
          const timbreVal =
            item.paymentMethod === 'cash'
              ? `${
                  item.timbreFiscalDzd ||
                  calculateArt317Timbre(item.subtotalProduceDzd || item.totalGrossDzd || 0)
                } DZD`
              : '0 DZD (Exonéré)';

          if (tab === 'pesee') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'الوزن الصافي' : 'Poids net marchandise'}>
                  <InspectorBigStat
                    value={`${item.netWeightKg.toLocaleString()} kg`}
                    tone="ok"
                    caption={`${((item.netWeightKg || 0) / 100).toFixed(2)} Qx · ${item.cropDesignation}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'قياسات الميزان' : 'Ticket Pont-Bascule'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Poids brut (Entrée)" value={`${item.grossWeightKg.toLocaleString()} kg`} />
                    <InspectorKeyValue label="Tare camion (Sortie)" value={`${(item.truckTareKg || item.tareWeightKg || 0).toLocaleString()} kg`} />
                    {(item.crateCount || 0) > 0 && (
                      <InspectorKeyValue
                        label={isAr ? 'خصم وزن الصناديق' : 'Tare caisses'}
                        value={`-${item.totalCrateTareKg || (item.crateCount || 0) * 1.8} kg`}
                      />
                    )}
                    <InspectorKeyValue
                      label={isAr ? 'طابع جبائي (Art. 317)' : 'Droit de timbre (Art. 317)'}
                      value={timbreVal}
                    />
                    <InspectorKeyValue label="Qualité d'agréage" value={item.qualityGrade || 'Extra / Grade A'} tone="ok" mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (tab === 'tracabilite') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'بيانات النقل' : "Données d'acheminement"}>
                  <InspectorCard>
                    <InspectorKeyValue label="Marché de gros" value={item.destinationWholesaleMarket} mono={false} />
                    <InspectorKeyValue label="Chauffeur assigné" value={item.driverName || 'Non assigné'} mono={false} />
                    <InspectorKeyValue label="Matricule camion" value={item.truckPlate || item.vehiclePlate || '—'} />
                    <InspectorKeyValue label="Date d'expédition" value={item.date} />
                    <InspectorKeyValue label="Réf. QR Marché" value={`AGRI-PESEE-${item.ticketNumber}`} tone="accent" isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'مشاركة رابط التتبع' : 'Partager lien télé-déclaration'}
                    disabled
                    tooltip={i18nT('feature_not_available_phase2', language)}
                    onClick={() => {}}
                  />
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    ...(!isSettled
                      ? [
                          {
                            id: 'settle',
                            label: isAr ? 'تأكيد القبض' : 'Encaisser',
                            icon: <Send className="w-[18px] h-[18px]" />,
                            primary: true,
                            onClick: () => handleSettle(item.id, item.ticketNumber, net),
                          },
                        ]
                      : [
                          {
                            id: 'print-p',
                            label: isAr ? 'وصل الميزان' : 'Bon Pesée',
                            icon: <Printer className="w-[18px] h-[18px]" />,
                            primary: true,
                            onClick: () => {
                              setTicketForPrint(item);
                              setIsPrintModalOpen(true);
                            },
                          },
                        ]),
                    {
                      id: 'print',
                      label: isAr ? 'طباعة BL' : 'Imprimer BL',
                      icon: <Printer className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        setTicketForPrint(item);
                        setIsPrintModalOpen(true);
                      },
                    },
                    {
                      id: 'share',
                      label: isAr ? 'مشاركة' : 'Partager',
                      icon: <Share2 className="w-[18px] h-[18px]" />,
                      disabled: true,
                      tooltip: i18nT('feature_not_available_phase2', language),
                      onClick: () => {},
                    },
                    {
                      id: 'csv',
                      label: 'CSV',
                      icon: <Download className="w-[18px] h-[18px]" />,
                      onClick: handleExportCsv,
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'صافي مستحقات المزرعة' : 'Net liquide domaine'}>
                <InspectorBigStat
                  value={formatMoney(net, language)}
                  tone={isSettled ? 'ok' : 'accent'}
                  caption={isSettled ? 'Règlement encaissé & pointé' : 'En attente de chèque / virement'}
                  action={
                    !isSettled
                      ? {
                          label: isAr ? 'تأكيد القبض' : 'Marquer Encaissé',
                          onClick: () => handleSettle(item.id, item.ticketNumber, net),
                        }
                      : undefined
                  }
                />
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'تفاصيل البيع والعمولة' : 'Décompte mandataire (Criée)'}>
                <InspectorCard>
                  <InspectorKeyValue label="Poids facturé" value={`${item.netWeightKg.toLocaleString()} kg`} />
                  <InspectorKeyValue label="Prix moyen criée" value={`${item.unitPriceDzdPerKg} DZD/kg`} />
                  <InspectorKeyValue label="Chiffre d'affaires brut" value={formatMoney(gross, language)} />
                  <InspectorKeyValue
                    label={`Commission mandataire (${feePct}%)`}
                    value={`-${formatMoney(fee, language)}`}
                    tone="warn"
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <AgriWeighbridgePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        ticket={ticketForPrint}
      />
    </div>
  );
};

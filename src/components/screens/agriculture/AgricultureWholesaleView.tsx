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
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculateArt317Timbre } from '../../../utils/agriRules';
import { AgriHarvestTicket } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
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
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();
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
        setSettledTickets((prev) => [...prev, id]);
        showToast(
          isAr
            ? `تم استلام صافي مستحقات البيع (${formatMoney(netAmount, language)}) للوصل ${ticketNumber}`
            : `Encaissement du net mandataire ${formatMoney(netAmount, language)} confirmé`,
          'success'
        );
      }
    },
    [settledSet, isAr, language]
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
      setSettledTickets((prev) => Array.from(new Set([...prev, ...newlySettled])));
      setSelectedIds(new Set<string>());
      showToast(
        isAr
          ? `تم تأكيد قبض ${newlySettled.length} وصولات جملة`
          : `${newlySettled.length} bordereaux marqués encaissés`,
        'success'
      );
    },
    [settledSet, isAr]
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
      showToast(isAr ? 'تم حذف وصل الجملة' : 'Bordereau supprimé', 'info');
    },
    [deleteHarvestTicket, selectedTicket, isAr]
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
          <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
            {pinnedIds.has(t.id) && <Pin size={11} className="text-[#d4522f] shrink-0" />}
            <span className="bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded border border-[#d4522f]/20">
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
            <span className="font-bold text-xs text-black dark:text-white block">
              {t.cropDesignation}
            </span>
            <span className="text-[11px] text-black/55 dark:text-white/55">
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
          <span className="text-xs text-black/70 dark:text-white/75 truncate block">
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
          <div className="font-mono text-xs tabular-nums">
            <span className="font-bold text-black dark:text-white">
              {t.netWeightKg.toLocaleString()} kg
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block">
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
          <span className="font-mono text-xs font-semibold text-black/70 dark:text-white/75 tabular-nums">
            {t.unitPriceDzdPerKg} DZD/kg
          </span>
        ),
      },
      {
        key: 'fee',
        header: isAr ? 'العمولة (6%)' : 'Com. Mandataire',
        width: '125px',
        renderCell: (t) => (
          <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-medium tabular-nums">
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
          <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
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
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
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
        subtitle={
          isAr
            ? `${harvestTickets.length} شحنات سوق الجملة · عمولة الوكيل 6%`
            : isEn
            ? `${harvestTickets.length} wholesale dispatches · 6% commission`
            : `${harvestTickets.length} bordereaux de criée · Commission mandataire 6%`
        }
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
          data={sortedTickets}
          columns={columns}
          keyExtractor={(t) => t.id}
          defaultViewMode={viewMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'تأكيد القبض المحدد' : 'Marquer Encaissés',
            icon: <CheckCircle2 size={14} />,
            onClick: handleBulkSettle,
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteHarvestTicket(id));
            setSelectedIds(new Set<string>());
            if (selectedTicket && ids.has(selectedTicket.id)) setSelectedTicket(null);
            showToast(
              isAr ? 'تم حذف وصولات الجملة المحددة' : 'Bordereaux sélectionnés supprimés',
              'info'
            );
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
                onClick: () =>
                  showToast(
                    isAr
                      ? `تم نسخ رابط تتبع الشحنة ${t.ticketNumber}`
                      : `Lien de télé-déclaration mandataire ${t.ticketNumber} copié`,
                    'success'
                  ),
              },
            ];
          }}
          renderCard={(t) => {
            const isSettled = settledSet.has(t.id);
            return (
              <div className="space-y-3 w-full">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded border border-[#d4522f]/20">
                    {t.ticketNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSettled
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {isSettled
                      ? isAr ? 'مقبوض' : 'Encaissé'
                      : isAr ? 'في الانتظار' : 'En attente'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-black dark:text-white line-clamp-1">
                    {t.cropDesignation}
                  </h4>
                  <p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 truncate">
                    {t.destinationWholesaleMarket} · {t.driverName || 'Non assigné'}
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">
                      Poids Net
                    </span>
                    <span className="font-mono font-bold text-black/70 dark:text-white/75 tabular-nums">
                      {t.netWeightKg.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">
                      Net Domaine
                    </span>
                    <span className="font-mono font-bold text-[#d4522f] text-sm tabular-nums">
                      {formatMoney(getTicketNet(t), language)}
                    </span>
                  </div>
                </div>
              </div>
            );
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
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
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
          return (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {!isSettled && (
                  <AtriumButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleSettle(item.id, item.ticketNumber, net)}
                    icon={<Send size={13} />}
                  >
                    {isAr ? 'تأكيد القبض' : 'Marquer Encaissé'}
                  </AtriumButton>
                )}
                <AtriumButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTicketForPrint(item);
                    setIsPrintModalOpen(true);
                  }}
                  icon={<Printer size={13} />}
                >
                  {isAr ? 'وصل الميزان' : 'Bon de Pesée'}
                </AtriumButton>
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    showToast(
                      isAr
                        ? `تم نسخ رابط تتبع الشحنة ${item.ticketNumber}`
                        : `Lien de télé-déclaration mandataire ${item.ticketNumber} copié`,
                      'success'
                    )
                  }
                  icon={<Share2 size={13} />}
                >
                  {isAr ? 'مشاركة' : 'Partager'}
                </AtriumButton>
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCsv}
                  icon={<Download size={13} />}
                >
                  CSV
                </AtriumButton>
              </div>

              {tab === 'decompte' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                      Calcul Décompte Mandataire (Criée)
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-black/70 dark:text-white/75">Poids Facturé:</span>
                      <span className="font-mono font-bold text-black dark:text-white tabular-nums">
                        {item.netWeightKg.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black/70 dark:text-white/75">Prix Moyen Vente:</span>
                      <span className="font-mono font-bold text-black dark:text-white tabular-nums">
                        {item.unitPriceDzdPerKg} DZD/kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200 dark:border-neutral-800">
                      <span className="text-black dark:text-white font-medium">
                        Chiffre d&apos;Affaires Brut:
                      </span>
                      <span className="font-mono font-bold text-black dark:text-white tabular-nums">
                        {formatMoney(gross, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                      <span>Commission Mandataire ({feePct}%):</span>
                      <span className="font-mono font-bold tabular-nums">
                        -{formatMoney(fee, language)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-white/80 text-[11px]">
                      <span>Net Liquide à Verser Domaine</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Règlement
                      </span>
                    </div>
                    <div className="text-2xl font-black tracking-tight text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatMoney(net, language)}
                    </div>
                    <p className="text-[10px] text-white/75">
                      Versement direct sur compte d&apos;exploitation agricole après déduction des frais de carreau.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div>
                      <span className="font-semibold block text-black dark:text-white">
                        Statut du Règlement
                      </span>
                      <span className="text-[10px] text-black/55 dark:text-white/55">
                        {isSettled
                          ? 'Reçu et pointé en banque'
                          : 'En attente de chèque / virement'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isSettled}
                      onClick={() => handleSettle(item.id, item.ticketNumber, net)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        isSettled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default'
                          : 'bg-[#d4522f] hover:bg-[#b06a4e] text-white cursor-pointer'
                      }`}
                    >
                      {isSettled ? 'Encaissé ✓' : 'Marquer Encaissé'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'pesee' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold flex items-center gap-1.5">
                      <Scale size={13} className="text-[#d4522f]" />
                      Ticket Pont-Bascule Électronique
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] text-black/55 dark:text-white/55 block">
                          Poids Brut (Entrée)
                        </span>
                        <span className="font-mono font-bold text-black dark:text-white text-sm tabular-nums">
                          {item.grossWeightKg.toLocaleString()} kg
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] text-black/55 dark:text-white/55 block">
                          Tare Camion (Sortie)
                        </span>
                        <span className="font-mono font-bold text-black/70 dark:text-white/75 text-sm tabular-nums">
                          {(item.truckTareKg || item.tareWeightKg || 0).toLocaleString()} kg
                        </span>
                      </div>
                    </div>

                    {(item.crateCount || 0) > 0 && (
                      <div className="p-2 bg-neutral-100 dark:bg-neutral-800/70 rounded-lg border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                        <span className="text-black/70 dark:text-white/75">
                          {isAr ? 'خصم وزن الصناديق الفارغة :' : 'Tare Caisses Déduite :'}
                        </span>
                        <span className="font-mono font-semibold text-black dark:text-white tabular-nums">
                          {item.crateCount} × {item.crateUnitTareKg || 1.8} kg = -
                          {item.totalCrateTareKg || (item.crateCount || 0) * 1.8} kg
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                      <span className="text-emerald-800 dark:text-emerald-200 font-semibold">
                        Poids Net Marchandise:
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm tabular-nums">
                        {item.netWeightKg.toLocaleString()} kg (
                        {((item.netWeightKg || 0) / 100).toFixed(2)} Qx)
                      </span>
                    </div>

                    <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-black/70 dark:text-white/75 font-medium">
                          {isAr
                            ? 'رسم الطابع الجبائي (المادة 317) :'
                            : 'Droit de Timbre (Art. 317) :'}
                        </span>
                        <span className="font-mono font-bold text-black dark:text-white">
                          {item.paymentMethod === 'cash'
                            ? `${
                                item.timbreFiscalDzd ||
                                calculateArt317Timbre(item.subtotalProduceDzd || item.totalGrossDzd || 0)
                              } DZD (Plafonné à 2.500)`
                            : '0 DZD (Exonéré hors espèces)'}
                        </span>
                      </div>
                      <p className="text-[10px] text-black/55 dark:text-white/55">
                        {isAr
                          ? '1% على المبالغ النقدية وفق قانون الضرائب المباشرة والرسوم المماثلة الجزائري'
                          : '1% gradué plafonné à 2.500 DA applicable aux paiements en espèces (Art. 317 CID)'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                      Spécifications Récolte
                    </span>
                    <div className="space-y-1 text-black/70 dark:text-white/75">
                      <div className="flex justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40">
                        <span>Désignation:</span>
                        <strong className="text-black dark:text-white">{item.cropDesignation}</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40">
                        <span>Variété & Calibre:</span>
                        <span className="font-mono">{item.cropVariety || 'Standard Calibre 1'}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40">
                        <span>Qualité d&apos;agréage:</span>
                        <span className="font-semibold text-emerald-600">
                          {item.qualityGrade || 'Extra / Grade A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'tracabilite' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                      Données d&apos;Acheminement
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-black/55 dark:text-white/55">Marché de Gros:</span>
                        <span className="font-bold text-black dark:text-white">
                          {item.destinationWholesaleMarket}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-black/55 dark:text-white/55">Chauffeur assigné:</span>
                        <span className="font-medium text-black dark:text-white">
                          {item.driverName || 'Non assigné'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-black/55 dark:text-white/55">Matricule Camion:</span>
                        <span className="font-mono font-bold text-black dark:text-white">
                          {item.truckPlate || item.vehiclePlate || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-black/55 dark:text-white/55">Date d&apos;expédition:</span>
                        <span className="font-mono text-black dark:text-white">{item.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-1">
                    <span className="text-[10px] text-black/55 dark:text-white/55 font-mono block">
                      QR Code Sécurisé Bordereau
                    </span>
                    <p className="font-bold text-xs text-black dark:text-white">
                      AGRI-PESEE-{item.ticketNumber}
                    </p>
                    <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
                      Conforme aux règlements de police des marchés
                    </span>
                  </div>
                </div>
              )}
            </div>
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

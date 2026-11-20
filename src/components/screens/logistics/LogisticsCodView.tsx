import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  CreditCard,
  ArrowUpRight,
  Building2,
  Send,
  Truck,
  Printer,
  Share2,
  UserCheck,
  MapPin,
  Eye,
  Pin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LogisticsShipment } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AlgeriePosteSfp01Modal } from './AlgeriePosteSfp01Modal';
import { calculateDriverPayout } from '../../../utils/logisticsRules';
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
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const LogisticsCodView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { shipments, discharges, remittances, executeRemittance } = useLogisticsData();

  const [settledIds, setSettledIds] = useState<string[]>(['ship_02']);
  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('summary');

  const [isSfp01ModalOpen, setIsSfp01ModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('shipments');

  const [searchQuery, setSearchQuery] = useState('');
  const [settlementFilter, setSettlementFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedDischargeIds, setPinnedDischargeIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedRemittanceIds, setPinnedRemittanceIds] = useState<Set<string>>(() => new Set<string>());
  const [dischargeSearchQuery, setDischargeSearchQuery] = useState('');
  const [dischargeViewMode, setDischargeViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [remittanceSearchQuery, setRemittanceSearchQuery] = useState('');
  const [remittanceViewMode, setRemittanceViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [sortBy, setSortBy] = useState<string>('trackingCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const deliveredShipments = useMemo(
    () => shipments.filter((s) => s.status === 'Delivered'),
    [shipments]
  );

  const settledCount = useMemo(
    () => deliveredShipments.filter((s) => settledIds.includes(s.id)).length,
    [deliveredShipments, settledIds]
  );
  const pendingCount = deliveredShipments.length - settledCount;

  const totalCodCollected = useMemo(
    () => deliveredShipments.reduce((acc, s) => acc + s.codAmountDzd, 0),
    [deliveredShipments]
  );
  const totalShippingFees = useMemo(
    () => deliveredShipments.reduce((acc, s) => acc + s.shippingFeeDzd, 0),
    [deliveredShipments]
  );
  const totalNetToMerchants = totalCodCollected - totalShippingFees;

  const activeShipment = useMemo(() => {
    if (!selectedShipment) return null;
    return deliveredShipments.find((s) => s.id === selectedShipment.id) || selectedShipment;
  }, [selectedShipment, deliveredShipments]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    deliveredShipments.forEach((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [deliveredShipments, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: deliveredShipments.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || deliveredShipments.length,
      });
    }
    return opts;
  }, [branches, branchCounts, currentBranch, deliveredShipments.length, isAr, isEn]);

  const filteredShipments = useMemo(() => {
    return deliveredShipments.filter((s) => {
      const isSettled = settledIds.includes(s.id);
      if (settlementFilter === 'Settled' && !isSettled) return false;
      if (settlementFilter === 'Pending' && isSettled) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language);
        if (b.id !== branchFilter && b.name !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !s.trackingCode.toLowerCase().includes(q) &&
          !(s.merchantName || '').toLowerCase().includes(q) &&
          !s.recipientName.toLowerCase().includes(q) &&
          !s.destinationWilaya.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    deliveredShipments,
    settledIds,
    settlementFilter,
    branchFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedShipments = useMemo(() => {
    const list = [...filteredShipments];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'trackingCode') {
        const cmp = a.trackingCode.localeCompare(b.trackingCode);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'merchant') {
        const cmp = (a.merchantName || '').localeCompare(b.merchantName || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'net') {
        const cmp = (a.codAmountDzd - a.shippingFeeDzd) - (b.codAmountDzd - b.shippingFeeDzd);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredShipments, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleSettle = useCallback(
    (id: string, merchant: string, netAmount: number) => {
      if (!settledIds.includes(id)) {
        setSettledIds((prev) => [...prev, id]);
        showToast(
          isAr
            ? `تم تحويل مستحقات التاجر (${formatMoney(netAmount, language)}) بنجاح`
            : `Virement net de ${formatMoney(netAmount, language)} validé pour ${merchant}`,
          'success'
        );
      }
    },
    [settledIds, isAr, language]
  );

  const handleSelectShipment = useCallback(
    (s: LogisticsShipment, originEl?: HTMLElement | null) => {
      if (originEl) setDrawerOpenerEl(originEl);
      setSelectedShipment(s);
      setInspectorTab('summary');
    },
    []
  );

  const handleTogglePin = useCallback((s: LogisticsShipment) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(s.id)) next.delete(s.id);
      else next.add(s.id);
      return next;
    });
  }, []);

  const handleTogglePinDischarge = useCallback((id: string) => {
    setPinnedDischargeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleTogglePinRemittance = useCallback((id: string) => {
    setPinnedRemittanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sortedDischarges = useMemo(() => {
    const q = dischargeSearchQuery.trim().toLowerCase();
    const list = discharges.filter((d) => {
      if (!q) return true;
      return (
        d.dischargeNumber.toLowerCase().includes(q) ||
        d.courierStaffId.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      const ap = pinnedDischargeIds.has(a.id);
      const bp = pinnedDischargeIds.has(b.id);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return b.timestamp.localeCompare(a.timestamp);
    });
    return list;
  }, [discharges, dischargeSearchQuery, pinnedDischargeIds]);

  const sortedRemittances = useMemo(() => {
    const q = remittanceSearchQuery.trim().toLowerCase();
    const list = remittances.filter((r) => {
      if (!q) return true;
      return (
        r.batchNumber.toLowerCase().includes(q) ||
        r.merchantName.toLowerCase().includes(q) ||
        r.ccpAccount.toLowerCase().includes(q) ||
        r.paymentChannel.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      const ap = pinnedRemittanceIds.has(a.id);
      const bp = pinnedRemittanceIds.has(b.id);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return a.batchNumber.localeCompare(b.batchNumber);
    });
    return list;
  }, [remittances, remittanceSearchQuery, pinnedRemittanceIds]);

  const getCodRowMeta = useCallback(
    (s: LogisticsShipment): KineticRowMeta => {
      const isSettled = settledIds.includes(s.id);
      const net = s.codAmountDzd - s.shippingFeeDzd;
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      return {
        avatarText: (s.merchantName || 'CD').slice(0, 2).toUpperCase(),
        subline: `${s.trackingCode} · ${s.recipientName}`,
        categoryLabel: b.name,
        statusVariant: isSettled ? 'active' : 'warning',
        statusLabel: isSettled
          ? isAr ? 'محوّل' : isEn ? 'Settled' : 'Viré'
          : isAr ? 'قيد التسوية' : isEn ? 'Pending' : 'À Régler',
        metricPrimary: formatMoney(net, language),
        metricSecondary: `Brut ${formatMoney(s.codAmountDzd, language)}`,
        isPinned: pinnedIds.has(s.id),
        detailCol1: {
          heading: isAr ? 'المستلم والتاجر' : isEn ? 'Recipient & Merchant' : 'Destinataire & Marchand',
          primaryText: s.recipientName,
          secondaryText: `${s.merchantName || '—'} · ${s.destinationWilaya}`,
        },
        detailCol2: {
          heading: isAr ? 'الصافي والمحصّل' : isEn ? 'Net & COD' : 'Net & Brut COD',
          primaryText: formatMoney(net, language),
          secondaryText: `Brut ${formatMoney(s.codAmountDzd, language)}`,
        },
        detailCol3: {
          heading: isAr ? 'التتبع والمركز' : isEn ? 'AWB & Hub' : 'Bordereau & Hub',
          primaryText: s.trackingCode,
          secondaryText: b.name,
        },
      };
    },
    [settledIds, pinnedIds, branchesById, currentBranch, language, isAr, isEn]
  );

  const getCodFanActions = useCallback(
    (s: LogisticsShipment): KineticRowFanAction[] => {
      const net = s.codAmountDzd - s.shippingFeeDzd;
      const isSettled = settledIds.includes(s.id);
      return [
        {
          id: 'inspect',
          label: isAr ? 'تفاصيل' : 'Détails',
          icon: <Eye className="w-[15px] h-[15px]" />,
          onClick: (e) => handleSelectShipment(s, e.currentTarget),
        },
        ...(!isSettled
          ? [
              {
                id: 'settle',
                label: isAr ? 'تحويل' : 'Virer',
                icon: <Send className="w-[15px] h-[15px]" />,
                onClick: () => handleSettle(s.id, s.merchantName || s.recipientName, net),
              },
            ]
          : []),
        {
          id: 'receipt',
          label: isAr ? 'وصل' : 'Reçu',
          icon: <Printer className="w-[15px] h-[15px]" />,
          onClick: () =>
            showToast(
              isAr
                ? `طباعة كشف تحويل المستحقات للطرد ${s.trackingCode}`
                : `Bordereau de reversement émis pour ${s.trackingCode}`,
              'info'
            ),
        },
        {
          id: 'pin',
          label: pinnedIds.has(s.id) ? 'Détacher' : 'Épingler',
          icon: <Pin className="w-[15px] h-[15px]" />,
          onClick: () => handleTogglePin(s),
        },
      ];
    },
    [settledIds, pinnedIds, isAr, handleSelectShipment, handleSettle, handleTogglePin]
  );

  const getCodDetailActions = useCallback(
    (s: LogisticsShipment): KineticDetailAction[] => {
      const net = s.codAmountDzd - s.shippingFeeDzd;
      const isSettled = settledIds.includes(s.id);
      return [
        {
          id: 'inspect',
          label: isAr ? 'فتح الكشف' : 'Décompte COD',
          icon: <Eye className="w-3.5 h-3.5" />,
          onClick: () => handleSelectShipment(s),
        },
        ...(!isSettled
          ? [
              {
                id: 'settle',
                label: isAr ? 'تحويل للمتجر' : 'Virer Net',
                icon: <Send className="w-3.5 h-3.5" />,
                onClick: () => handleSettle(s.id, s.merchantName || s.recipientName, net),
              },
            ]
          : []),
        {
          id: 'sms',
          label: isAr ? 'إشعار التاجر' : 'Avis SMS',
          icon: <Share2 className="w-3.5 h-3.5" />,
          onClick: () =>
            showToast(
              isAr
                ? `تم إرسال إشعار الدفع إلى ${s.merchantName}`
                : `Notification SMS de reversement envoyée à ${s.merchantName}`,
              'success'
            ),
        },
        {
          id: 'pin',
          label: pinnedIds.has(s.id) ? 'Détacher' : 'Épingler',
          icon: <Pin className="w-3.5 h-3.5" />,
          onClick: () => handleTogglePin(s),
        },
      ];
    },
    [settledIds, pinnedIds, isAr, handleSelectShipment, handleSettle, handleTogglePin]
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      'AWB',
      'Marchand',
      'Destinataire',
      'Agence / Hub',
      'Brut Encaissé (DZD)',
      'Commission (DZD)',
      'Net Marchand (DZD)',
      'Statut',
    ];
    const rows = sortedShipments.map((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      const isSettled = settledIds.includes(s.id);
      return [
        s.trackingCode,
        s.merchantName || '',
        s.recipientName,
        b.name,
        s.codAmountDzd,
        s.shippingFeeDzd,
        s.codAmountDzd - s.shippingFeeDzd,
        isSettled ? 'Viré' : 'À Régler',
      ];
    });
    downloadCsvSafe(
      `caisse_cod_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير كشف تسوية COD' : 'Bordereau de reversement CSV exporté', 'info');
  }, [sortedShipments, branchesById, currentBranch, language, settledIds, isAr]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (settlementFilter !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [settlementFilter, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (settlementFilter !== 'All') {
      chips.push({
        key: 'settlement',
        label: settlementFilter === 'Settled' ? (isAr ? 'تم التحويل' : 'Virés') : isAr ? 'قيد التسوية' : 'À Régler',
        onRemove: () => setSettlementFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const opt = branchOptions.find((o) => o.value === branchFilter);
      chips.push({
        key: 'branch',
        label: opt?.label || branchFilter,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [settlementFilter, branchFilter, branchOptions, isAr]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSettlementFilter('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'settlement',
        kind: 'segmented',
        label: isAr ? 'حالة التحويل للتاجر' : isEn ? 'Settlement Status' : 'Statut Reversement',
        value: settlementFilter,
        onChange: setSettlementFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: deliveredShipments.length },
          { value: 'Pending', label: isAr ? 'قيد التسوية' : isEn ? 'Pending' : 'À Régler', count: pendingCount },
          { value: 'Settled', label: isAr ? 'محوّل' : isEn ? 'Settled' : 'Virés', count: settledCount },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'الفرع / المستودع' : isEn ? 'Branch / Hub' : 'Agence / Hub',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, settlementFilter, branchFilter, deliveredShipments.length, pendingCount, settledCount, branchOptions]
  );

  const salariedDriverPay = useMemo(
    () =>
      calculateDriverPayout({
        employmentType: 'salaried',
        completedDeliveries: 18,
        returnedDeliveries: 2,
        baseSalaryMonthlyDzd: 48000,
        fuelAllowanceDzd: 1500,
      }),
    []
  );
  const freelanceDriverPay = useMemo(
    () =>
      calculateDriverPayout({
        employmentType: 'freelance_commission',
        completedDeliveries: 26,
        returnedDeliveries: 3,
        commissionPerDeliveredDzd: 220,
        commissionPerReturnDzd: 50,
        fuelAllowanceDzd: 1000,
        withholdingTaxRatePercent: 5,
      }),
    []
  );

  const columns: ColumnDefinition<LogisticsShipment>[] = useMemo(
    () => [
      {
        key: 'trackingCode',
        header: 'AWB',
        width: '1.3*',
        sortable: true,
        renderCell: (s) => (
          <span className="font-mono font-bold text-xs text-[#d4522f]">{s.trackingCode}</span>
        ),
      },
      {
        key: 'merchant',
        header: isAr ? 'المتجر والتاريخ' : 'Marchand / E-Boutique',
        width: '2.2*',
        sortable: true,
        renderCell: (s) => (
          <div className="min-w-0">
            <div className="font-semibold text-xs text-black dark:text-white truncate">
              {s.merchantName}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
              {s.createdAt.split('T')[0]} • Dest: {s.recipientName}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
        width: '1.4*',
        sortable: true,
        renderCell: (s) => {
          const b = resolveRecordBranch(s, branchesById, currentBranch, language);
          return (
            <div className="flex items-center gap-1 text-xs text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'cod',
        header: 'Brut Encaissé',
        width: '1.2*',
        renderCell: (s) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatMoney(s.codAmountDzd, language)}
          </span>
        ),
      },
      {
        key: 'fee',
        header: 'Commission',
        width: '1.1*',
        renderCell: (s) => (
          <span className="font-mono text-xs text-black/55 dark:text-white/55 tabular-nums">
            -{formatMoney(s.shippingFeeDzd, language)}
          </span>
        ),
      },
      {
        key: 'net',
        header: 'Net Marchand',
        width: '1.3*',
        sortable: true,
        renderCell: (s) => (
          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(s.codAmountDzd - s.shippingFeeDzd, language)}
          </span>
        ),
      },
      {
        key: 'settled',
        header: isAr ? 'الحالة' : 'Statut',
        width: '1.0*',
        renderCell: (s) => {
          const isSettled = settledIds.includes(s.id);
          return (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isSettled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {isSettled ? (isAr ? 'محوّل' : 'Viré') : isAr ? 'قيد التسوية' : 'À Régler'}
            </span>
          );
        },
      },
    ],
    [settledIds, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: deliveredShipments.length > 0,
  });

  if (showSkeleton && (deliveredShipments.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<CreditCard size={22} />}
        title={isAr ? 'تحصيل COD' : isEn ? 'COD Cash' : 'Caisse COD'}
        primaryAction={{
          label: isAr ? 'بريد الجزائر SFP 01 / B1' : 'Export CCP SFP 01',
          icon: <Building2 size={14} />,
          onClick: () => setIsSfp01ModalOpen(true),
          dataAction: 'open-sfp01-modal',
        }}
        secondaryActions={
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            icon={<ArrowUpRight size={14} />}
          >
            {isAr ? 'تصدير كشف التسوية' : 'Bordereau Marchands'}
          </AtriumButton>
        }
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات صندوق التحصيل وأموال التجار'
            : isEn
            ? 'COD Treasury & Merchant Payouts'
            : 'Trésorerie des Encaissements & Reversements'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'قيد التحويل للتجار' : isEn ? 'Pending Payouts' : 'À Régler aux Marchands',
          badgeText: isAr ? 'قيد التسوية' : 'À Régler',
          count: pendingCount,
          tone: 'terracotta',
          isActive: settlementFilter === 'Pending',
          onToggle: () => {
            setActiveTab('shipments');
            setSettlementFilter((prev) => (prev === 'Pending' ? 'All' : 'Pending'));
          },
        }}
        secondaryCard={{
          label: isAr ? 'مستحقات محوّلة' : isEn ? 'Settled Parcels' : 'Colis Virés',
          badgeText: isAr ? 'محوّل' : 'Virés',
          count: settledCount,
          tone: 'emerald',
          isActive: settlementFilter === 'Settled',
          onToggle: () => {
            setActiveTab('shipments');
            setSettlementFilter((prev) => (prev === 'Settled' ? 'All' : 'Settled'));
          },
        }}
        darkCard={{
          label: isAr ? 'صافي مستحقات المتاجر للتحويل' : isEn ? 'Net Merchant Payout' : 'Solde Net à Reverser',
          badgeCount: totalShippingFees,
          badgePrefix: 'Comm. ',
          badgeSuffix: ' DZD',
          formatBadgeValue: (v) => Math.round(v).toLocaleString(),
          valueCount: totalNetToMerchants,
          formatValue: (v) => formatMoney(Math.round(v), language),
          caption: isAr ? 'جاهز للتحويل البريدي CCP / BaridiMob' : 'Prêt pour virement CCP / BaridiMob',
        }}
      />

      <LiveSegmentedControl
        value={activeTab}
        onValueChange={(val) => setActiveTab(val)}
        size="sm"
        options={[
          {
            value: 'shipments',
            label: isAr ? 'تسويات' : isEn ? 'Parcels' : 'Colis',
            tooltip: isAr ? 'تسويات الطرود المسلّمة' : 'Rapprochement Colis',
            count: deliveredShipments.length,
          },
          {
            value: 'discharges',
            label: isAr ? 'تبرئة' : isEn ? 'Discharges' : 'Décharges',
            tooltip: isAr ? 'تبرئة الذمة ومستندات السائقين' : 'Bons de Décharge',
            count: discharges.length,
          },
          {
            value: 'remittances',
            label: isAr ? 'دفعات' : isEn ? 'Batches' : 'Lots',
            tooltip: isAr ? 'دفعات حوالات CCP SFP 01' : 'Lots CCP SFP 01',
            count: remittances.length,
          },
          {
            value: 'driver_payroll',
            label: isAr ? 'أجور' : isEn ? 'Payroll' : 'Paie',
            tooltip: isAr ? 'أجور وعمولات السائقين' : 'Paie Livreurs',
          },
        ]}
      />

      {activeTab === 'shipments' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={isAr ? 'طرود جاهزة لتسوية المستحقات' : 'Colis Livrés & Encaissements'}
            liveRegionText={`${sortedShipments.length} ${isAr ? 'طرد' : 'colis'}`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr ? 'بحث بالباركود أو التاجر أو المستلم...' : 'Recherche AWB, marchand, destinataire...'
            }
            statusOptions={[
              { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: deliveredShipments.length },
              { value: 'Pending', label: isAr ? 'قيد التسوية' : isEn ? 'Pending' : 'À Régler', count: pendingCount },
              { value: 'Settled', label: isAr ? 'محوّل' : isEn ? 'Settled' : 'Virés', count: settledCount },
            ]}
            statusValue={settlementFilter}
            onStatusChange={setSettlementFilter}
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

          <UniversalDataCollection<LogisticsShipment>
            hideToolbar
            items={sortedShipments}
            keyExtractor={(s) => s.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkSecondaryAction={{
              label: isAr ? 'تحويل المستحقات' : 'Virer Net',
              icon: <Send size={14} />,
              onClick: (ids) => {
                setSettledIds((prev) => Array.from(new Set([...prev, ...Array.from(ids)])));
                setSelectedIds(new Set<string>());
                showToast(
                  isAr ? `تم تحويل ${ids.size} شحنة` : `${ids.size} versements marqués comme virés`,
                  'success'
                );
              },
            }}
            isPinned={(s) => pinnedIds.has(s.id)}
            onTogglePin={handleTogglePin}
            openItemId={activeShipment?.id || null}
            onItemClick={handleSelectShipment}
            onViewDetails={handleSelectShipment}
            getRowMeta={getCodRowMeta}
            getFanActions={getCodFanActions}
            getDetailActions={getCodDetailActions}
            customActions={(s) => {
              const net = s.codAmountDzd - s.shippingFeeDzd;
              const isSettled = settledIds.includes(s.id);
              return [
                ...(!isSettled
                  ? [
                      {
                        id: 'settle',
                        label: isAr ? 'تحويل للمتجر' : 'Virer Net',
                        icon: <Send size={14} />,
                        variant: 'primary' as const,
                        onClick: () => handleSettle(s.id, s.merchantName || s.recipientName, net),
                      },
                    ]
                  : []),
                {
                  id: 'receipt',
                  label: isAr ? 'وصل التحويل' : 'Reçu Virement',
                  icon: <Printer size={14} />,
                  onClick: () =>
                    showToast(
                      isAr
                        ? `طباعة كشف تحويل المستحقات للطرد ${s.trackingCode}`
                        : `Bordereau de reversement émis pour ${s.trackingCode}`,
                      'info'
                    ),
                },
                {
                  id: 'sms',
                  label: isAr ? 'إشعار التاجر' : 'Avis SMS',
                  icon: <Share2 size={14} />,
                  onClick: () =>
                    showToast(
                      isAr
                        ? `تم إرسال إشعار الدفع إلى ${s.merchantName}`
                        : `Notification SMS de reversement envoyée à ${s.merchantName}`,
                      'success'
                    ),
                },
              ];
            }}
            emptyTitle={isAr ? 'لا توجد طرود مطابقة' : 'Aucun colis encaissé trouvé'}
            emptyDescription={isAr ? 'أعد ضبط الفلاتر لعرض التسويات' : 'Réinitialisez vos filtres pour voir les règlements'}
            onResetFilters={resetAllFilters}
            hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          />
        </ScreenPod>
      )}

      {activeTab === 'discharges' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={
              isAr
                ? 'محاضر تبرئة ذمة السائقين (Double-Lock Vault)'
                : 'Registre des Billets de Décharge Chauffeurs'
            }
            liveRegionText={`${sortedDischarges.length} ${isAr ? 'محضر' : 'procès-verbaux'}`}
            language={language}
            searchQuery={dischargeSearchQuery}
            onSearchChange={setDischargeSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم التبرئة أو السائق...' : 'Rechercher N° décharge, chauffeur...'}
            viewMode={dischargeViewMode}
            onViewModeChange={setDischargeViewMode}
            showViewToggle
            onResetAllFilters={() => setDischargeSearchQuery('')}
          />

          <UniversalDataCollection
            hideToolbar
            items={sortedDischarges}
            keyExtractor={(d) => d.id}
            viewMode={dischargeViewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={dischargeViewMode === 'grid' ? 'grid' : 'list'}
            isPinned={(d) => pinnedDischargeIds.has(d.id)}
            onTogglePin={(d) => handleTogglePinDischarge(d.id)}
            columns={[
              {
                key: 'dischargeNumber',
                header: 'N° Décharge',
                width: '1.3*',
                renderCell: (d) => (
                  <span className="font-mono font-bold text-xs text-[#d4522f]">{d.dischargeNumber}</span>
                ),
              },
              {
                key: 'courierStaffId',
                header: 'Chauffeur',
                width: '1.6*',
                renderCell: (d) => (
                  <div>
                    <div className="font-semibold text-xs text-black dark:text-white">{d.courierStaffId}</div>
                    <div className="text-[10px] font-mono text-black/55 dark:text-white/55">
                      {d.timestamp.replace('T', ' ').slice(0, 16)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'amounts',
                header: 'Attendu / Compté',
                width: '1.8*',
                renderCell: (d) => (
                  <div className="font-mono text-xs">
                    <span className="text-black/60 dark:text-white/60">{formatMoney(d.expectedCodDzd, language)}</span>
                    <span className="mx-1.5 text-black/30">/</span>
                    <span className="font-bold text-black dark:text-white">{formatMoney(d.actualCashTurnedInDzd, language)}</span>
                  </div>
                ),
              },
              {
                key: 'discrepancyDzd',
                header: 'Écart',
                width: '1.1*',
                renderCell: (d) => (
                  <span
                    className={`font-mono font-bold text-xs ${
                      d.discrepancyDzd === 0
                        ? 'text-emerald-600'
                        : d.discrepancyDzd < 0
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {d.discrepancyDzd === 0 ? '0 DZD' : `${d.discrepancyDzd} DZD`}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                width: '1.2*',
                renderCell: (d) => (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.status === 'Clean'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {d.status === 'Clean' ? 'Décharge Conforme' : 'Manquant (Shortage)'}
                  </span>
                ),
              },
            ]}
            getRowMeta={(d): KineticRowMeta => ({
              title: d.dischargeNumber,
              subline: `${d.courierStaffId} · ${d.timestamp.replace('T', ' ').slice(0, 16)}`,
              avatarText: 'DC',
              categoryLabel: 'Vault',
              statusVariant: d.status === 'Clean' ? 'active' : 'blocked',
              statusLabel: d.status === 'Clean' ? 'Décharge Conforme' : 'Manquant',
              metricPrimary: formatMoney(d.actualCashTurnedInDzd, language),
              metricSecondary: `Écart ${d.discrepancyDzd} DZD`,
              isPinned: pinnedDischargeIds.has(d.id),
              detailCol1: {
                heading: 'N° Décharge & Chauffeur',
                primaryText: d.dischargeNumber,
                secondaryText: d.courierStaffId,
              },
              detailCol2: {
                heading: 'Attendu vs Compté',
                primaryText: `Expected ${formatMoney(d.expectedCodDzd, language)}`,
                secondaryText: `Actual ${formatMoney(d.actualCashTurnedInDzd, language)}`,
              },
              detailCol3: {
                heading: 'Écart & Horodatage',
                primaryText: `Écart ${d.discrepancyDzd} DZD`,
                secondaryText: d.timestamp.replace('T', ' ').slice(0, 16),
              },
            })}
            getFanActions={(d): KineticRowFanAction[] => [
              {
                id: 'receipt',
                label: 'Reçu',
                icon: <Printer className="w-[15px] h-[15px]" />,
                onClick: () => {
                  showToast(isAr ? 'طباعة محضر التبرئة' : 'Impression décharge', 'info');
                  window.print();
                },
              },
              {
                id: 'pin',
                label: pinnedDischargeIds.has(d.id) ? 'Détacher' : 'Épingler',
                icon: <Pin className="w-[15px] h-[15px]" />,
                onClick: () => handleTogglePinDischarge(d.id),
              },
            ]}
            getDetailActions={(d): KineticDetailAction[] => [
              {
                id: 'receipt',
                label: 'Reçu',
                icon: <Printer className="w-3.5 h-3.5" />,
                onClick: () => {
                  showToast(isAr ? 'طباعة محضر التبرئة' : 'Impression décharge', 'info');
                  window.print();
                },
              },
              {
                id: 'pin',
                label: pinnedDischargeIds.has(d.id) ? 'Détacher' : 'Épingler',
                icon: <Pin className="w-3.5 h-3.5" />,
                onClick: () => handleTogglePinDischarge(d.id),
              },
            ]}
            emptyTitle={isAr ? 'لا توجد محاضر تبرئة' : 'Aucun billet de décharge'}
            emptyDescription={isAr ? 'لا توجد نتائج مطابقة' : 'Aucun procès-verbal ne correspond à votre recherche'}
            onResetFilters={() => setDischargeSearchQuery('')}
            hasActiveFilters={dischargeSearchQuery.trim().length > 0}
          />
        </ScreenPod>
      )}

      {activeTab === 'remittances' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={
              isAr
                ? 'دفعات التحويل البريدي للتجار (Algérie Poste & BaridiMob)'
                : 'Lots de Règlements E-Commerçants'
            }
            liveRegionText={`${sortedRemittances.length} ${isAr ? 'دفعة' : 'lots'}`}
            language={language}
            searchQuery={remittanceSearchQuery}
            onSearchChange={setRemittanceSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم الدفعة أو التاجر أو CCP...' : 'Rechercher lot, commerçant, CCP...'}
            viewMode={remittanceViewMode}
            onViewModeChange={setRemittanceViewMode}
            showViewToggle
            extraTrailingControls={
              <AtriumButton
                variant="primary"
                size="sm"
                onClick={() => setIsSfp01ModalOpen(true)}
                icon={<Building2 size={14} />}
              >
                {isAr ? 'تصدير SFP 01' : 'Générer Fichier ASCII'}
              </AtriumButton>
            }
            onResetAllFilters={() => setRemittanceSearchQuery('')}
          />

          <UniversalDataCollection
            hideToolbar
            items={sortedRemittances}
            keyExtractor={(r) => r.id}
            viewMode={remittanceViewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={remittanceViewMode === 'grid' ? 'grid' : 'list'}
            isPinned={(r) => pinnedRemittanceIds.has(r.id)}
            onTogglePin={(r) => handleTogglePinRemittance(r.id)}
            columns={[
              {
                key: 'batchNumber',
                header: 'Lot N°',
                width: '1.2*',
                renderCell: (r) => (
                  <span className="font-mono font-bold text-xs text-[#d4522f]">{r.batchNumber}</span>
                ),
              },
              {
                key: 'merchantName',
                header: 'Commerçant',
                width: '1.8*',
                renderCell: (r) => (
                  <span className="font-semibold text-xs text-black dark:text-white">{r.merchantName}</span>
                ),
              },
              {
                key: 'ccpAccount',
                header: 'Compte CCP / Clé',
                width: '1.8*',
                renderCell: (r) => (
                  <span className="font-mono text-xs text-black/70 dark:text-white/75">
                    {r.ccpAccount} <span className="text-[#d4522f] font-bold">Clé {r.ccpKey}</span>
                  </span>
                ),
              },
              {
                key: 'paymentChannel',
                header: 'Canal',
                width: '1.1*',
                renderCell: (r) => (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {r.paymentChannel}
                  </span>
                ),
              },
              {
                key: 'netPayoutDzd',
                header: 'Net à Verser',
                width: '1.3*',
                renderCell: (r) => (
                  <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {formatMoney(r.netPayoutDzd, language)}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                width: '1.1*',
                renderCell: (r) => (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'Executed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {r.status === 'Executed' ? 'Exécuté' : 'En Attente'}
                  </span>
                ),
              },
            ]}
            getRowMeta={(r): KineticRowMeta => ({
              title: r.batchNumber,
              subline: `${r.merchantName} · ${r.paymentChannel}`,
              avatarText: 'VP',
              categoryLabel: r.paymentChannel,
              statusVariant: r.status === 'Executed' ? 'active' : 'warning',
              statusLabel: r.status === 'Executed' ? 'Exécuté' : 'En Attente',
              metricPrimary: formatMoney(r.netPayoutDzd, language),
              metricSecondary: `${r.ccpAccount} Clé ${r.ccpKey}`,
              isPinned: pinnedRemittanceIds.has(r.id),
              detailCol1: {
                heading: 'Lot & Commerçant',
                primaryText: r.batchNumber,
                secondaryText: r.merchantName,
              },
              detailCol2: {
                heading: 'Compte CCP & Canal',
                primaryText: `${r.ccpAccount} Clé ${r.ccpKey}`,
                secondaryText: r.paymentChannel,
              },
              detailCol3: {
                heading: 'Montant Net',
                primaryText: `Net ${formatMoney(r.netPayoutDzd, language)}`,
                secondaryText: r.status === 'Executed' ? 'Archivé' : 'Prêt pour exécution',
              },
            })}
            getFanActions={(r): KineticRowFanAction[] => [
              ...(r.status !== 'Executed'
                ? [
                    {
                      id: 'execute',
                      label: 'Exécuter',
                      icon: <Send className="w-[15px] h-[15px]" />,
                      onClick: () => {
                        executeRemittance(r.id);
                        showToast(
                          isAr
                            ? `تم تنفيذ التحويل للدفعة ${r.batchNumber}`
                            : `Virement ${r.batchNumber} exécuté`,
                          'success'
                        );
                      },
                    },
                  ]
                : []),
              {
                id: 'pin',
                label: pinnedRemittanceIds.has(r.id) ? 'Détacher' : 'Épingler',
                icon: <Pin className="w-[15px] h-[15px]" />,
                onClick: () => handleTogglePinRemittance(r.id),
              },
            ]}
            getDetailActions={(r): KineticDetailAction[] => [
              ...(r.status !== 'Executed'
                ? [
                    {
                      id: 'execute',
                      label: 'Exécuter',
                      icon: <Send className="w-3.5 h-3.5" />,
                      onClick: () => {
                        executeRemittance(r.id);
                        showToast(
                          isAr
                            ? `تم تنفيذ التحويل للدفعة ${r.batchNumber}`
                            : `Virement ${r.batchNumber} exécuté`,
                          'success'
                        );
                      },
                    },
                  ]
                : []),
              {
                id: 'pin',
                label: pinnedRemittanceIds.has(r.id) ? 'Détacher' : 'Épingler',
                icon: <Pin className="w-3.5 h-3.5" />,
                onClick: () => handleTogglePinRemittance(r.id),
              },
            ]}
            emptyTitle={isAr ? 'لا توجد دفعات تحويل' : 'Aucun lot de virement'}
            emptyDescription={isAr ? 'لا توجد دفعات مطابقة' : 'Aucun lot ne correspond à votre recherche'}
            onResetFilters={() => setRemittanceSearchQuery('')}
            hasActiveFilters={remittanceSearchQuery.trim().length > 0}
          />
        </ScreenPod>
      )}

      {activeTab === 'driver_payroll' && (
        <ScreenPod>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="sq-elev-card">
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="p-3 bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#33302D] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] space-y-3"
          >
            <div className="flex items-center gap-2.5 px-2 pt-2">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-9 h-9 bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold"
              >
                <Truck size={18} />
              </div>
              <h3 className="font-bold text-sm text-black dark:text-white">
                {isAr ? 'سائق أجير دائم (Salarié CDI)' : 'Chauffeur Salarié Flotte Interne'}
              </h3>
            </div>
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-4 bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] space-y-2 text-xs"
            >
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Base Journalière (48 000 DZD / 26j):</span>
                <span className="font-mono font-bold">1 846 DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Prime de Rendement (18 colis × 50 DZD):</span>
                <span className="font-mono font-bold text-emerald-600">+900 DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Indemnité Carburant / Péage:</span>
                <span className="font-mono font-bold">+1 500 DZD</span>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between font-bold text-sm">
                <span>Net Journalier à Payer:</span>
                <span className="font-mono text-[#d4522f]">
                  {formatMoney(salariedDriverPay.netPayoutDzd, language)}
                </span>
              </div>
            </div>
          </div>
          </div>
          <div className="sq-elev-card">
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="p-3 bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#33302D] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] space-y-3"
          >
            <div className="flex items-center gap-2.5 px-2 pt-2">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-9 h-9 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold"
              >
                <UserCheck size={18} />
              </div>
              <h3 className="font-bold text-sm text-black dark:text-white">
                {isAr
                  ? 'سائق مقاول ذاتي (Auto-Entrepreneur)'
                  : 'Livreur Sous-Traitant Auto-Entrepreneur'}
              </h3>
            </div>
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-4 bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] space-y-2 text-xs"
            >
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Colis Livrés (26 × 220 DZD):</span>
                <span className="font-mono font-bold">5 720 DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Retours Traités (3 × 50 DZD):</span>
                <span className="font-mono font-bold">+150 DZD</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Retenue Impôt Libératoire IFU 5%:</span>
                <span className="font-mono font-bold">
                  -{formatMoney(freelanceDriverPay.taxWithheldDzd, language)}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between font-bold text-sm">
                <span>Net Viré au Chauffeur:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatMoney(freelanceDriverPay.netPayoutDzd, language)}
                </span>
              </div>
            </div>
          </div>
          </div>
          </div>
        </ScreenPod>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedShipments.length}
        entityPluralLabel={isAr ? 'تسويات' : 'règlements'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeShipment)}
        item={activeShipment}
        allItems={sortedShipments}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeShipment?.trackingCode || ''}
        subtitle={
          activeShipment
            ? `${activeShipment.merchantName || activeShipment.recipientName}`
            : undefined
        }
        categoryLabel={
          activeShipment
            ? resolveRecordBranch(activeShipment, branchesById, currentBranch, language).name
            : 'COD'
        }
        avatarText={(activeShipment?.merchantName || 'CD').slice(0, 2).toUpperCase()}
        branchName={
          activeShipment
            ? resolveRecordBranch(activeShipment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeShipment && settledIds.includes(activeShipment.id)
            ? isAr ? 'محوّل' : 'Viré'
            : isAr ? 'قيد التسوية' : 'À Régler'
        }
        statusClassName={
          activeShipment && settledIds.includes(activeShipment.id)
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'summary', label: isAr ? 'كشف التسوية' : 'Décompte COD' },
          { id: 'recipient', label: isAr ? 'المستلم' : 'Destinataire' },
          { id: 'actions', label: isAr ? 'التحويل' : 'Règlement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(item) => handleSelectShipment(item)}
        onClose={() => setSelectedShipment(null)}
        renderBody={(s, tab) => {
          const net = s.codAmountDzd - s.shippingFeeDzd;
          const isSettled = settledIds.includes(s.id);
          if (tab === 'recipient') {
            return (
              <InspectorSection index={0} title={isAr ? 'بيانات المستلم' : 'Destinataire & Livraison'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'المستلم' : 'Destinataire'} value={s.recipientName} mono={false} />
                  <InspectorKeyValue
                    label={isAr ? 'الهاتف' : 'Téléphone'}
                    value={s.recipientPhone}
                    copyText={s.recipientPhone}
                    onCopied={() => showToast(isAr ? 'تم نسخ الرقم' : 'Téléphone copié', 'info')}
                  />
                  <InspectorKeyValue label={isAr ? 'الولاية' : 'Wilaya'} value={s.destinationWilaya} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            );
          }
          if (tab === 'actions') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'إجراءات التحويل السريعة' : 'Actions Rapides'}>
                  <InspectorQuickActions
                    actions={[
                      ...(!isSettled
                        ? [
                            {
                              id: 'settle',
                              label: isAr ? 'تحويل للمتجر' : 'Virer Net',
                              icon: <Send size={16} />,
                              primary: true,
                              onClick: () => handleSettle(s.id, s.merchantName || s.recipientName, net),
                            },
                          ]
                        : []),
                      {
                        id: 'receipt',
                        label: isAr ? 'وصل التحويل' : 'Reçu Virement',
                        icon: <Printer size={16} />,
                        onClick: () =>
                          showToast(
                            isAr
                              ? `طباعة كشف تحويل المستحقات للطرد ${s.trackingCode}`
                              : `Bordereau de reversement émis pour ${s.trackingCode}`,
                            'info'
                          ),
                      },
                      {
                        id: 'sms',
                        label: isAr ? 'إشعار التاجر' : 'Avis SMS',
                        icon: <Share2 size={16} />,
                        onClick: () =>
                          showToast(
                            isAr
                              ? `تم إرسال إشعار الدفع إلى ${s.merchantName}`
                              : `Notification SMS envoyée à ${s.merchantName}`,
                            'success'
                          ),
                      },
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'تصدير بريد الجزائر SFP 01' : 'Exporter Bordereau CCP SFP 01'}
                    icon={<Building2 size={14} />}
                    tone="dark"
                    onClick={() => setIsSfp01ModalOpen(true)}
                  />
                </InspectorSection>
              </>
            );
          }
          return (
            <>
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatMoney(net, language)}
                  tone={isSettled ? 'ok' : 'accent'}
                  caption={isAr ? 'صافي مستحقات التاجر' : 'Net à Reverser au Marchand'}
                  action={
                    !isSettled
                      ? {
                          label: isAr ? 'تأكيد التحويل للمتجر' : 'Virer le Net au Marchand',
                          onClick: () => handleSettle(s.id, s.merchantName || s.recipientName, net),
                        }
                      : undefined
                  }
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفاصيل العملية المالية' : 'Décompte COD'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label="AWB"
                    value={s.trackingCode}
                    copyText={s.trackingCode}
                    onCopied={() => showToast('AWB copié', 'info')}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'التاجر' : 'Marchand'}
                    value={s.merchantName || 'Comptoir'}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'المبلغ المحصّل' : 'Brut Encaissé'}
                    value={formatMoney(s.codAmountDzd, language)}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'العمولة' : 'Commission Livraison'}
                    value={`-${formatMoney(s.shippingFeeDzd, language)}`}
                    tone="accent"
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <AlgeriePosteSfp01Modal
        isOpen={isSfp01ModalOpen}
        onClose={() => setIsSfp01ModalOpen(false)}
        batches={remittances}
      />
    </div>
  );
};

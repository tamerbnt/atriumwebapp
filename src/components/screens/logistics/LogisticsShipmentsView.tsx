import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  Edit,
  Pin,
  Send,
  MapPin,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { pickLocalizedText, runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { LogisticsShipment } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StopDeskHandoverModal } from './StopDeskHandoverModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelSelect } from '../../ui/LabelSelect';
import { resolveBatchSelection } from '../../../utils/step5Actions';
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
  InspectorNotesField,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const LogisticsShipmentsView: React.FC<any> = () => {
  const { language, currentBranch, branches, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { shipments, addShipment, updateShipment, deleteShipment, updateShipmentStatus } =
    useLogisticsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterMode, setFilterMode] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['ship_01']));
  const [sortBy, setSortBy] = useState<string>('tracking');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [shipmentToEdit, setShipmentToEdit] = useState<LogisticsShipment | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [shipmentForHandover, setShipmentForHandover] = useState<LogisticsShipment | null>(null);

  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<LogisticsShipment['status']>('OutForDelivery');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeShipment = useMemo(() => {
    if (!selectedShipment) return null;
    return shipments.find((s) => s.id === selectedShipment.id) || selectedShipment;
  }, [selectedShipment, shipments]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    shipments.forEach((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [shipments, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: shipments.length },
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
        count: branchCounts.get(currentBranch.id) || shipments.length,
      });
    }
    return opts;
  }, [branches, branchCounts, currentBranch, shipments.length, isAr, isEn]);

  const activeInDelivery = useMemo(
    () => shipments.filter((s) => s.status === 'OutForDelivery').length,
    [shipments]
  );
  const deliveredCount = useMemo(
    () => shipments.filter((s) => s.status === 'Delivered').length,
    [shipments]
  );
  const totalCodValue = useMemo(
    () => shipments.reduce((acc, s) => acc + (s.codAmountDzd || 0), 0),
    [shipments]
  );

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (filterStatus !== 'All' && s.status !== filterStatus) return false;
      if (filterMode !== 'All' && s.deliveryMode !== filterMode) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language);
        if (b.id !== branchFilter && b.name !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = s.trackingCode.toLowerCase().includes(q);
        const matchesRecipient = s.recipientName.toLowerCase().includes(q);
        const matchesPhone = s.recipientPhone.includes(q);
        const matchesWilaya = s.destinationWilaya.toLowerCase().includes(q);
        const matchesMerchant = s.merchantName ? s.merchantName.toLowerCase().includes(q) : false;
        if (!matchesCode && !matchesRecipient && !matchesPhone && !matchesWilaya && !matchesMerchant) {
          return false;
        }
      }
      return true;
    });
  }, [shipments, filterStatus, filterMode, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedShipments = useMemo(() => {
    const list = [...filteredShipments];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (sortBy === 'tracking') {
        const cmp = a.trackingCode.localeCompare(b.trackingCode);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'recipient') {
        const cmp = a.recipientName.localeCompare(b.recipientName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'cod') {
        const cmp = (a.codAmountDzd || 0) - (b.codAmountDzd || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredShipments, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenAdd = useCallback(() => {
    setShipmentToEdit(null);
    setIsShipmentModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((s: LogisticsShipment) => {
    setShipmentToEdit(s);
    setIsShipmentModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (s: LogisticsShipment) => {
      deleteShipment(s.id);
      if (selectedShipment?.id === s.id) setSelectedShipment(null);
    },
    [deleteShipment, selectedShipment]
  );

  const handleTogglePin = useCallback((s: LogisticsShipment) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(s.id)) next.delete(s.id);
      else next.add(s.id);
      return next;
    });
  }, []);

  const handleSelectShipment = useCallback(
    (s: LogisticsShipment, originEl?: HTMLElement | null) => {
      if (originEl) setDrawerOpenerEl(originEl);
      setSelectedShipment(s);
      setActiveTab('fiche');
      setInspectorNotes(
        `Colis ${s.trackingCode}. Consignes: Appeler le destinataire 15 min avant livraison. Remise contre signature et montant exact.`
      );
    },
    []
  );

  const handleToggleDeliveryStatus = useCallback(
    (s: LogisticsShipment) => {
      const nextStatus: LogisticsShipment['status'] =
        s.status === 'ReceivedAtHub'
          ? 'OutForDelivery'
          : s.status === 'OutForDelivery'
          ? 'Delivered'
          : 'ReceivedAtHub';
      updateShipmentStatus(s.id, nextStatus);
      if (selectedShipment?.id === s.id) {
        setSelectedShipment({ ...s, status: nextStatus });
      }
    },
    [updateShipmentStatus, selectedShipment]
  );

  const getShipmentRowMeta = useCallback(
    (s: LogisticsShipment): KineticRowMeta => {
      const isDelivered = s.status === 'Delivered';
      const isOut = s.status === 'OutForDelivery';
      const branchInfo = resolveRecordBranch(s, branchesById, currentBranch, language);
      const modeLabel =
        s.deliveryMode === 'StopDesk'
          ? 'Stop-Desk'
          : isAr ? 'منزلي' : isEn ? 'Home' : 'Domicile';
      return {
        avatarText: (s.recipientName || 'AW').slice(0, 2).toUpperCase(),
        subline: `${s.trackingCode} · ${s.destinationWilaya.split('-')[0].trim()}`,
        categoryLabel: modeLabel,
        statusVariant: isDelivered ? 'active' : isOut ? 'warning' : 'neutral',
        statusLabel: isDelivered
          ? isAr ? 'تم التوصيل' : isEn ? 'Delivered' : 'Livré'
          : isOut
          ? isAr ? 'في التوزيع' : isEn ? 'Out' : 'En Tournée'
          : isAr ? 'في المستودع' : isEn ? 'At Hub' : 'Au Hub',
        metricPrimary: formatMoney(s.codAmountDzd, language),
        metricSecondary:
          s.assignedDriverName || (isAr ? 'بانتظار التعيين' : isEn ? 'Unassigned' : 'Au Hub'),
        detailCol1: {
          heading: isAr ? 'المستلم والولاية' : isEn ? 'Recipient & Wilaya' : 'Destinataire & Wilaya',
          primaryText: s.recipientName,
          secondaryText: `${s.destinationWilaya} · ${s.recipientPhone}`,
        },
        detailCol2: {
          heading: isAr ? 'التحصيل والتاجر' : isEn ? 'COD & Merchant' : 'COD & Marchand',
          primaryText: formatMoney(s.codAmountDzd, language),
          secondaryText: s.merchantName || modeLabel,
        },
        detailCol3: {
          heading: isAr ? 'السائق والفرع' : isEn ? 'Driver & Hub' : 'Chauffeur & Agence',
          primaryText:
            s.assignedDriverName || (isAr ? 'بانتظار التعيين' : isEn ? 'Unassigned' : 'Au Hub'),
          secondaryText: branchInfo.name,
        },
      };
    },
    [branchesById, currentBranch, isAr, isEn, language]
  );

  const getShipmentFanActions = useCallback(
    (s: LogisticsShipment): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => handleSelectShipment(s, e.currentTarget),
      },
      {
        id: 'deliver',
        label: isAr ? 'تحديث' : 'Statut',
        icon: <Send className="w-[15px] h-[15px]" />,
        onClick: () => handleToggleDeliveryStatus(s),
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => handleDelete(s),
      },
    ],
    [isAr, handleSelectShipment, handleToggleDeliveryStatus, handleDelete]
  );

  const getShipmentDetailActions = useCallback(
    (s: LogisticsShipment): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح البيان' : 'Ouvrir Bordereau',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => handleSelectShipment(s),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Modifier',
        icon: <Edit className="w-3.5 h-3.5" />,
        onClick: () => handleOpenEdit(s),
      },
      {
        id: 'deliver',
        label: isAr ? 'تغيير الحالة' : 'Statut Suivant',
        icon: <Send className="w-3.5 h-3.5" />,
        onClick: () => handleToggleDeliveryStatus(s),
      },
      {
        id: 'delete',
        label: isAr ? 'حذف' : 'Supprimer',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => handleDelete(s),
      },
    ],
    [isAr, handleSelectShipment, handleOpenEdit, handleToggleDeliveryStatus, handleDelete]
  );

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Tracking Code',
      'Merchant',
      'Recipient',
      'Phone',
      'Branch',
      'Wilaya',
      'Address',
      'Mode',
      'COD Amount (DZD)',
      'Shipping Fee (DZD)',
      'Status',
      'Driver',
    ];
    const rows = sortedShipments.map((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      return [
        s.trackingCode,
        s.merchantName || '',
        s.recipientName,
        s.recipientPhone,
        b.name,
        s.destinationWilaya,
        s.destinationAddress,
        s.deliveryMode,
        s.codAmountDzd,
        s.shippingFeeDzd,
        s.status,
        s.assignedDriverName || '',
      ];
    });
    downloadCsvSafe(
      `logistics_shipments_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير سجل الشحنات' : 'Export du registre des colis terminé', 'info');
  }, [sortedShipments, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'All') count += 1;
    if (filterMode !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [filterStatus, filterMode, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterStatus !== 'All') {
      chips.push({
        key: 'status',
        label: filterStatus,
        onRemove: () => setFilterStatus('All'),
      });
    }
    if (filterMode !== 'All') {
      chips.push({
        key: 'mode',
        label: filterMode === 'StopDesk' ? 'Stop-Desk' : isAr ? 'منزلي' : 'Domicile',
        onRemove: () => setFilterMode('All'),
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
  }, [filterStatus, filterMode, branchFilter, branchOptions, isAr]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('All');
    setFilterMode('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'حالة الطرد' : isEn ? 'Status' : 'Statut Colis',
        value: filterStatus,
        onChange: setFilterStatus,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: shipments.length },
          { value: 'OutForDelivery', label: isAr ? 'توزيع' : isEn ? 'Out for Delivery' : 'En Tournée', count: activeInDelivery },
          { value: 'Delivered', label: isAr ? 'مُسلّم' : isEn ? 'Delivered' : 'Livrés', count: deliveredCount },
          { value: 'ReceivedAtHub', label: isAr ? 'في المستودع' : isEn ? 'At Hub' : 'Au Hub', count: shipments.filter((s) => s.status === 'ReceivedAtHub').length },
        ],
      },
      {
        id: 'mode',
        kind: 'segmented',
        label: isAr ? 'طريقة التسليم' : isEn ? 'Delivery Mode' : 'Mode de Livraison',
        value: filterMode,
        onChange: setFilterMode,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: shipments.length },
          { value: 'HomeDelivery', label: isAr ? 'منزلي' : 'À Domicile', count: shipments.filter((s) => s.deliveryMode !== 'StopDesk').length },
          { value: 'StopDesk', label: 'Stop-Desk', count: shipments.filter((s) => s.deliveryMode === 'StopDesk').length },
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
    [
      isAr,
      isEn,
      filterStatus,
      filterMode,
      branchFilter,
      shipments,
      activeInDelivery,
      deliveredCount,
      branchOptions,
    ]
  );

  const columns: ColumnDefinition<LogisticsShipment>[] = useMemo(
    () => [
      {
        key: 'tracking',
        header: isAr ? 'رقم التتبع / الشحنة' : 'Code AWB & Destinataire',
        width: '2.8*',
        sortable: true,
        renderCell: (s) => {
          const isPinned = pinnedIds.has(s.id);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold t-small flex items-center justify-center shrink-0"
              >
                <Package size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="t-small font-semibold text-black dark:text-white truncate">
                    {s.recipientName}
                  </span>
                  {isPinned && <span className="t-small text-amber-500 font-semibold">VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 t-cap text-black/55 dark:text-white/55 tabular-nums">
                  <span className="font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{s.trackingCode}</span>
                  <span>·</span>
                  <span>{s.destinationWilaya.split('-')[0].trim()}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'address',
        header: isAr ? 'العنوان / الهاتف' : 'Destination & Contact',
        width: '2.2*',
        renderCell: (s) => (
          <div className="min-w-0">
            <div className="t-small font-semibold text-black dark:text-white truncate">
              {s.destinationAddress}
            </div>
            <div className="t-cap tabular-nums text-black/55 dark:text-white/55 mt-0.5">
              {s.recipientPhone}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
        width: '1.5*',
        sortable: true,
        renderCell: (s) => {
          const b = resolveRecordBranch(s, branchesById, currentBranch, language);
          return (
            <div className="flex items-center gap-2 t-cap text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'cod',
        header: isAr ? 'مبلغ التحصيل (COD)' : 'Montant COD',
        width: '1.6*',
        sortable: true,
        renderCell: (s) => (
          <div>
            <span className="t-small tabular-nums font-semibold text-black dark:text-white">
              {formatMoney(s.codAmountDzd)}
            </span>
            <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
              + {formatMoney(s.shippingFeeDzd)} frais
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut Colis',
        width: '1.6*',
        renderCell: (s) => {
          const isDelivered = s.status === 'Delivered';
          const isOut = s.status === 'OutForDelivery';
          return (
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full t-small font-semibold ${
                isDelivered
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : isOut
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'bg-[#F3EDE7] dark:bg-[#2B2825] text-black/70 dark:text-white/75'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isDelivered ? 'bg-emerald-500' : isOut ? 'bg-amber-500' : 'bg-neutral-400'
                }`}
              />
              {isDelivered
                ? isAr ? 'تم التوصيل' : 'Livré'
                : isOut
                ? isAr ? 'في التوزيع' : 'En Tournée'
                : isAr ? 'في المستودع' : 'Au Hub'}
            </span>
          );
        },
      },
    ],
    [pinnedIds, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: shipments.length > 0,
  });

  if (showSkeleton && (shipments.length === 0 || networkMode === 'force_skeleton')) {
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
        icon={<Truck size={22} />}
        title={isAr ? 'الطرود' : isEn ? 'Shipments' : 'Colis'}
        primaryAction={{
          label: isAr ? 'طرد جديد' : isEn ? 'New Shipment' : 'Nouveau Colis',
          onClick: handleOpenAdd,
          dataAction: 'add-shipment',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات التوزيع والتحصيل النقدي'
            : isEn
            ? 'Distribution & COD Cash KPIs'
            : 'Indicateurs de Distribution & Cash COD'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'طرود في التوزيع الميداني' : isEn ? 'Out for Delivery' : 'Colis en Tournée Active',
          badgeText: isAr ? 'توزيع' : 'Tournée',
          count: activeInDelivery,
          tone: 'terracotta',
          isActive: filterStatus === 'OutForDelivery',
          onToggle: () =>
            setFilterStatus((prev) => (prev === 'OutForDelivery' ? 'All' : 'OutForDelivery')),
        }}
        secondaryCard={{
          label: isAr ? 'الطرود المُسلّمة' : isEn ? 'Delivered Parcels' : 'Colis Livrés',
          badgeText: isAr ? 'مُسلّم' : 'Livrés',
          count: deliveredCount,
          tone: 'emerald',
          isActive: filterStatus === 'Delivered',
          onToggle: () => setFilterStatus((prev) => (prev === 'Delivered' ? 'All' : 'Delivered')),
        }}
        darkCard={{
          label: isAr ? 'إجمالي التحصيل النقدي المتوقع' : isEn ? 'Expected COD Value' : 'Encours Cash COD Attendu',
          badgeCount: shipments.length,
          badgeSuffix: isAr ? ' طرد' : ' AWB',
          valueCount: totalCodValue,
          formatValue: (v) => formatMoney(Math.round(v), language),
          caption: isAr ? 'أموال مستحقة للتسوية مع التجار' : 'À reverser aux commerçants',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'دليل الطرود' : isEn ? 'Shipments Registry' : 'Registre des Colis'}
          liveRegionText={`${sortedShipments.length} ${isAr ? 'طرد' : 'colis'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث بالباركود أو المستلم أو الولاية...' : 'Recherche AWB, client, wilaya...'
          }
          statusOptions={[
            {
              value: 'All',
              label: isAr ? 'الكل' : isEn ? 'All' : 'Tous',
              count: shipments.length,
            },
            {
              value: 'OutForDelivery',
              label: isAr ? 'توزيع' : isEn ? 'Delivery' : 'Tournée',
              count: activeInDelivery,
            },
            {
              value: 'Delivered',
              label: isAr ? 'مُسلّم' : isEn ? 'Delivered' : 'Livrés',
              count: deliveredCount,
            },
          ]}
          statusValue={filterStatus}
          onStatusChange={setFilterStatus}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection<LogisticsShipment>
          hideToolbar
          items={sortedShipments}
          keyExtractor={(s) => s.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
          pageSize={50}
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
            label: isAr ? 'تحديث مرحلة التوصيل' : 'Mise à jour statut',
            icon: <Truck size={14} />,
            onClick: (ids) => {
              if (ids.size === 0) return;
              setIsBulkStatusModalOpen(true);
            },
          }}
          onBulkDelete={(ids) => {
            const count = ids.size;
            runUndoBatch(
              {
                operationType: 'bulk',
                vertical: 'logistics_delivery',
                affectedCount: count,
                summary: pickLocalizedText(language, {
                  fr: `${count} colis supprimés`,
                  en: `${count} shipments deleted`,
                  ar: `تم حذف ${count} شحنات`,
                }),
                toastTitle: pickLocalizedText(language, {
                  fr: 'Expéditions & Colis',
                  en: 'Shipments',
                  ar: 'إدارة الشحنات',
                }),
              },
              () => {
                ids.forEach((id) => deleteShipment(id));
              }
            );
            setSelectedIds(new Set<string>());
            if (selectedShipment && ids.has(selectedShipment.id)) setSelectedShipment(null);
          }}
          isPinned={(s) => pinnedIds.has(s.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeShipment?.id || null}
          onItemClick={handleSelectShipment}
          onViewDetails={handleSelectShipment}
          getRowMeta={getShipmentRowMeta}
          getFanActions={getShipmentFanActions}
          getDetailActions={getShipmentDetailActions}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          customActions={(s) => [
            ...(s.deliveryMode === 'StopDesk' && s.status !== 'Delivered'
              ? [
                  {
                    id: 'stopDeskOtp',
                    label: isAr ? 'تسليم OTP' : 'Retrait Stop-Desk',
                    tooltip: 'Remise au guichet avec code OTP et CNI',
                    icon: <CheckCircle2 size={13} />,
                    variant: 'primary' as const,
                    onClick: () => {
                      setShipmentForHandover(s);
                      setIsHandoverModalOpen(true);
                    },
                  },
                ]
              : []),
            {
              id: 'deliver',
              label: isAr ? 'توصيل / تحصيل' : 'Livrer / Encaissement',
              tooltip: isAr ? 'تحديث حالة التسليم' : 'Valider la livraison',
              icon: <Send size={13} />,
              variant: 'primary' as const,
              onClick: () => handleToggleDeliveryStatus(s),
            },
          ]}
          emptyTitle={isAr ? 'لا توجد شحنات مطابقة' : 'Aucun colis trouvé'}
          emptyDescription={
            isAr
              ? 'سجل أول طرد أو أعد ضبط معايير البحث'
              : 'Enregistrez un premier colis ou modifiez vos filtres de recherche'
          }
          primaryActionLabel={isAr ? 'طرد جديد' : 'Nouveau Colis'}
          onAddFirstItem={handleOpenAdd}
          onResetFilters={resetAllFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedShipments.length}
        entityPluralLabel={isAr ? 'طرود' : 'colis'}
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
            ? `${activeShipment.recipientName} · ${formatMoney(activeShipment.codAmountDzd)}`
            : undefined
        }
        categoryLabel={
          activeShipment?.deliveryMode === 'StopDesk' ? 'Stop-Desk' : isAr ? 'توصيل منزلي' : 'Domicile'
        }
        avatarText={(activeShipment?.recipientName || 'AW').slice(0, 2).toUpperCase()}
        branchName={
          activeShipment
            ? resolveRecordBranch(activeShipment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeShipment?.status === 'Delivered'
            ? isAr ? 'تم التوصيل' : 'Livré'
            : activeShipment?.status === 'OutForDelivery'
            ? isAr ? 'في التوزيع' : 'En Tournée'
            : isAr ? 'في المستودع' : 'Au Hub'
        }
        statusClassName={
          activeShipment?.status === 'Delivered'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : activeShipment?.status === 'OutForDelivery'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]'
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'بيانات الطرد' : 'Bordereau' },
          { id: 'cod', label: isAr ? 'التحصيل COD' : 'Finance COD' },
          { id: 'dispatch', label: isAr ? 'السائق والتوزيع' : 'Livreur' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => handleSelectShipment(item)}
        onClose={() => setSelectedShipment(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(s, tab) => {
          if (tab === 'cod') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatMoney(s.codAmountDzd + s.shippingFeeDzd, language)}
                    tone="accent"
                    caption={isAr ? 'المبلغ الإجمالي للتحصيل' : 'Total Cash à Récupérer'}
                    action={{
                      label: isAr ? 'تحديث التوصيل والتحصيل' : 'Passer au Statut Suivant',
                      onClick: () => handleToggleDeliveryStatus(s),
                    }}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'تفاصيل المبلغ النقدي' : 'Règlement & Encaissement COD'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'مبلغ السلعة' : 'Prix marchandise'}
                      value={formatMoney(s.codAmountDzd, language)}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'رسوم التوصيل' : "Frais d'expédition"}
                      value={formatMoney(s.shippingFeeDzd, language)}
                      tone="accent"
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }
          if (tab === 'dispatch') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'معلومات التوزيع والموزع' : 'Affectation & Véhicule'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'السائق المكلف' : 'Livreur'}
                      value={s.assignedDriverName || 'Non assigné'}
                      mono={false}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'التاجر / المرسل' : 'Marchand'}
                      value={s.merchantName || 'Comptoir'}
                      mono={false}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'نمط التسليم' : 'Mode'}
                      value={s.deliveryMode === 'StopDesk' ? 'Stop-Desk' : 'À Domicile'}
                      tone="accent"
                      mono={false}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
                {s.deliveryMode === 'StopDesk' && s.status !== 'Delivered' && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={isAr ? 'تسليم في الشباك (OTP)' : 'Valider Retrait Stop-Desk OTP'}
                      icon={<CheckCircle2 size={14} />}
                      tone="dark"
                      onClick={() => {
                        setShipmentForHandover(s);
                        setIsHandoverModalOpen(true);
                      }}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }
          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions Rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'status',
                      label: isAr ? 'تحديث الحالة' : 'Statut Suivant',
                      icon: <Send size={16} />,
                      primary: true,
                      onClick: () => handleToggleDeliveryStatus(s),
                    },
                    ...(s.deliveryMode === 'StopDesk' && s.status !== 'Delivered'
                      ? [
                          {
                            id: 'stopdesk',
                            label: 'Stop-Desk OTP',
                            icon: <CheckCircle2 size={16} />,
                            onClick: () => {
                              setShipmentForHandover(s);
                              setIsHandoverModalOpen(true);
                            },
                          },
                        ]
                      : []),
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : 'Modifier',
                      icon: <Edit size={16} />,
                      onClick: () => handleOpenEdit(s),
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(s.id) ? (isAr ? 'إلغاء' : 'Désépingler') : isAr ? 'تثبيت' : 'Épingler',
                      icon: <Pin size={16} />,
                      onClick: () => handleTogglePin(s),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'تفاصيل الإرسالية' : 'Destinataire & Acheminement'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'المستلم' : 'Destinataire'} value={s.recipientName} mono={false} />
                  <InspectorKeyValue
                    label={isAr ? 'الهاتف' : 'Téléphone'}
                    value={s.recipientPhone}
                    copyText={s.recipientPhone}
                    onCopied={() => showToast('Téléphone copié', 'info')}
                  />
                  <InspectorKeyValue label={isAr ? 'الولاية' : 'Wilaya'} value={s.destinationWilaya} mono={false} />
                  <InspectorKeyValue label={isAr ? 'العنوان' : 'Adresse'} value={s.destinationAddress} mono={false} />
                  <InspectorKeyValue label={isAr ? 'الوزن' : 'Poids'} value={`${s.weightKg} kg`} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'تعليمات التوصيل' : 'Consignes Livreur'}>
                <InspectorNotesField
                  value={inspectorNotes}
                  onSave={(next) => {
                    setInspectorNotes(next);
                    showToast(isAr ? 'تم حفظ تعليمات التسليم' : 'Consignes de livraison enregistrées', 'success');
                  }}
                  placeholder={isAr ? 'أدخل تعليمات التوصيل...' : "Précisions d'accès, créneau de livraison..."}
                />
              </InspectorSection>
            </>
          );
        }}
      />

      <LogisticsShipmentModal
        isOpen={isShipmentModalOpen}
        onClose={() => {
          setIsShipmentModalOpen(false);
          setShipmentToEdit(null);
        }}
        shipmentToEdit={shipmentToEdit}
        onSave={(s) => {
          if (shipmentToEdit) {
            updateShipment(s);
            if (selectedShipment?.id === s.id) setSelectedShipment(s);
          } else {
            addShipment(s);
          }
          setIsShipmentModalOpen(false);
          setShipmentToEdit(null);
        }}
      />

      <StopDeskHandoverModal
        isOpen={isHandoverModalOpen && Boolean(shipmentForHandover)}
        onClose={() => {
          setIsHandoverModalOpen(false);
          setShipmentForHandover(null);
        }}
        shipment={shipmentForHandover}
        onConfirmDelivery={(id, idNumber) => {
          updateShipmentStatus(id, 'Delivered');
          if (selectedShipment?.id === id) {
            setSelectedShipment({
              ...selectedShipment,
              status: 'Delivered',
              recipientIdNumber: idNumber,
            });
          }
        }}
      />

      <KineticModalShell
        isOpen={isBulkStatusModalOpen}
        onClose={() => setIsBulkStatusModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {(() => {
          const batch = resolveBatchSelection(selectedIds, shipments, (s) => s.id);
          return (
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-4"
            >
              <h3 className="font-semibold t-label text-black dark:text-white">
                {isAr
                  ? `تحديث حالة ${batch.selectedItems.length} شحنات`
                  : `Mettre à jour ${batch.selectedItems.length} colis`}
              </h3>
              {batch.missingIds.length > 0 && (
                <p className="t-small text-amber-700 dark:text-amber-300">
                  {isAr
                    ? `تم تجاهل ${batch.missingIds.length} سجلات محذوفة.`
                    : `${batch.missingIds.length} colis supprimés ignorés.`}
                </p>
              )}
              <LabelSelect
                label={isAr ? 'المرحلة الجديدة' : 'Nouveau statut'}
                value={bulkStatusTarget}
                onChange={(val) => setBulkStatusTarget(val as LogisticsShipment['status'])}
                options={[
                  { value: 'ReceivedAtHub', label: isAr ? 'في المستودع' : 'Au Hub (ReceivedAtHub)' },
                  { value: 'Sorted', label: isAr ? 'مفرز على الرصيف' : 'Trié Quai (Sorted)' },
                  { value: 'OutForDelivery', label: isAr ? 'قيد التوزيع' : 'En Tournée (OutForDelivery)' },
                  { value: 'Delivered', label: isAr ? 'تم التسليم' : 'Livré (Delivered)' },
                  { value: 'Postponed', label: isAr ? 'مؤجل' : 'Reporté (Postponed)' },
                  { value: 'Returned', label: isAr ? 'مسترجع' : 'Retourné (Returned)' },
                ]}
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsBulkStatusModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    batch.selectedItems.forEach((item) => {
                      updateShipmentStatus(item.id, bulkStatusTarget);
                    });
                    if (selectedShipment && batch.selectedItems.some((item) => item.id === selectedShipment.id)) {
                      setSelectedShipment({ ...selectedShipment, status: bulkStatusTarget });
                    }
                    setSelectedIds(new Set());
                    setIsBulkStatusModalOpen(false);
                  }}
                >
                  {isAr ? 'تأكيد التحديث' : 'Appliquer'}
                </AtriumButton>
              </div>
            </div>
          );
        })()}
      </KineticModalShell>
    </div>
  );
};

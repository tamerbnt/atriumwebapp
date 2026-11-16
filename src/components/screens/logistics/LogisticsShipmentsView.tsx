import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  Edit,
  Pin,
  Save,
  Check,
  Send,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LogisticsShipment } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StopDeskHandoverModal } from './StopDeskHandoverModal';
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

export const LogisticsShipmentsView: React.FC<any> = () => {
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
  const [noteSaved, setNoteSaved] = useState(false);

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
      showToast(isAr ? 'تم إلغاء الشحنة' : 'Colis supprimé du système', 'success');
    },
    [deleteShipment, selectedShipment, isAr]
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
      setNoteSaved(false);
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
      showToast(
        isAr ? `تم تحديث حالة الشحنة إلى ${nextStatus}` : `Statut mis à jour : ${nextStatus}`,
        'info'
      );
    },
    [updateShipmentStatus, selectedShipment, isAr]
  );

  const handleSaveNotes = useCallback(() => {
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ تعليمات التسليم' : 'Consignes de livraison enregistrées', 'success');
  }, [isAr]);

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
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Package size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-black dark:text-white truncate">
                    {s.recipientName}
                  </span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
                  <span className="font-bold text-[#d4522f]">{s.trackingCode}</span>
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
            <div className="text-xs font-semibold text-black dark:text-white truncate">
              {s.destinationAddress}
            </div>
            <div className="text-[11px] font-mono text-black/55 dark:text-white/55 mt-0.5">
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
            <div className="flex items-center gap-1.5 text-xs text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
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
            <span className="text-xs font-mono font-bold text-black dark:text-white tabular-nums">
              {formatMoney(s.codAmountDzd)}
            </span>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
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
              className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                isDelivered
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                  : isOut
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 border-neutral-200/60'
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
        subtitle={
          isAr
            ? `${shipments.length} طرد مسجل · ${activeInDelivery} في التوزيع`
            : isEn
            ? `${shipments.length} shipments · ${activeInDelivery} out for delivery`
            : `${shipments.length} colis enregistrés · ${activeInDelivery} en tournée active`
        }
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
          data={sortedShipments}
          keyExtractor={(s) => s.id}
          defaultViewMode={viewMode}
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
              showToast(
                isAr
                  ? `تم تحديد ${ids.size} طرد للشحن`
                  : `${ids.size} colis pris en charge pour expédition`,
                'info'
              );
            },
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteShipment(id));
            setSelectedIds(new Set<string>());
            if (selectedShipment && ids.has(selectedShipment.id)) setSelectedShipment(null);
            showToast(isAr ? 'تم حذف الطرود المحددة' : 'Colis sélectionnés supprimés', 'success');
          }}
          isPinned={(s) => pinnedIds.has(s.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeShipment?.id || null}
          onItemClick={handleSelectShipment}
          onViewDetails={handleSelectShipment}
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
          renderCard={(s) => {
            const isPinned = pinnedIds.has(s.id);
            const isDelivered = s.status === 'Delivered';
            return (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="w-16 h-16 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                  <Package size={28} />
                </div>
                <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                  <h3 className="text-base font-bold text-black dark:text-white truncate tracking-tight">
                    {s.recipientName}
                  </h3>
                  {isPinned && <Pin size={12} className="text-amber-500 shrink-0" />}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 mb-3 border border-neutral-200 dark:border-neutral-700">
                  {s.trackingCode}
                </span>
                <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                  <div className="text-black dark:text-white font-mono font-bold text-[13px]">
                    {formatMoney(s.codAmountDzd)}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
                    <span className="text-black/55 dark:text-white/55 truncate max-w-[130px]">
                      {s.destinationWilaya}
                    </span>
                    <span className={isDelivered ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {isDelivered ? (isAr ? 'تم التوصيل' : 'Livré') : isAr ? 'في التوزيع' : 'En Tournée'}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
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
        avatarText={(activeShipment?.recipientName || 'AWB').slice(0, 2).toUpperCase()}
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
        tabs={[
          { id: 'fiche', label: isAr ? 'بيانات الطرد' : 'Bordereau' },
          { id: 'cod', label: isAr ? 'التحصيل COD' : 'Finance COD' },
          { id: 'dispatch', label: isAr ? 'السائق والتوزيع' : 'Livreur' },
          { id: 'notes', label: isAr ? 'التعليمات' : 'Consignes' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => handleSelectShipment(item)}
        onClose={() => setSelectedShipment(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(s, tab) => (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                variant="primary"
                size="sm"
                icon={<Send size={13} />}
                onClick={() => handleToggleDeliveryStatus(s)}
              >
                {isAr ? 'تحديث التوصيل' : 'Changer Statut'}
              </AtriumButton>
              {s.deliveryMode === 'StopDesk' && s.status !== 'Delivered' && (
                <AtriumButton
                  variant="secondary"
                  size="sm"
                  icon={<CheckCircle2 size={13} />}
                  onClick={() => {
                    setShipmentForHandover(s);
                    setIsHandoverModalOpen(true);
                  }}
                >
                  {isAr ? 'تسليم OTP' : 'Retrait Stop-Desk'}
                </AtriumButton>
              )}
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Edit size={13} />}
                onClick={() => handleOpenEdit(s)}
              >
                {isAr ? 'تعديل' : 'Modifier'}
              </AtriumButton>
              <AtriumButton
                variant="ghost"
                size="sm"
                icon={<Pin size={13} />}
                onClick={() => handleTogglePin(s)}
              >
                {pinnedIds.has(s.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : isAr ? 'تثبيت' : 'Épingler'}
              </AtriumButton>
            </div>

            {tab === 'fiche' && (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                  {isAr ? 'تفاصيل الإرسالية' : 'Destinataire & Acheminement'}
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'المستلم' : 'Destinataire'}</span>
                  <span className="font-bold text-black dark:text-white">{s.recipientName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'الهاتف' : 'Téléphone'}</span>
                  <span className="font-semibold text-black dark:text-white font-mono">{s.recipientPhone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'الولاية' : 'Wilaya de livraison'}</span>
                  <span className="font-semibold text-black dark:text-white">{s.destinationWilaya}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'العنوان التفصيلي' : 'Adresse'}</span>
                  <span className="font-medium text-black dark:text-white text-right max-w-[200px] truncate">
                    {s.destinationAddress}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'الوزن التقريبي' : 'Poids'}</span>
                  <span className="font-mono font-semibold text-black dark:text-white">{s.weightKg} kg</span>
                </div>
              </div>
            )}

            {tab === 'cod' && (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                  {isAr ? 'المبالغ النقدية للتحصيل' : 'Règlement & Encaissement COD'}
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'مبلغ السلعة' : 'Prix marchandise'}</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {formatMoney(s.codAmountDzd)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'رسوم التوصيل' : "Frais d'expédition"}</span>
                  <span className="font-mono font-semibold text-black dark:text-white">
                    {formatMoney(s.shippingFeeDzd)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-black dark:text-white text-[13px]">
                  <span>{isAr ? 'المبلغ الإجمالي للتحصيل' : 'Total Cash à Récupérer'}</span>
                  <span className="font-mono text-[#d4522f]">
                    {formatMoney(s.codAmountDzd + s.shippingFeeDzd)}
                  </span>
                </div>
              </div>
            )}

            {tab === 'dispatch' && (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                  {isAr ? 'معلومات التوزيع والموزع' : 'Affectation & Véhicule'}
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'السائق المكلف' : 'Livreur'}</span>
                  <span className="font-bold text-black dark:text-white">
                    {s.assignedDriverName || 'Non assigné'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'التاجر / المرسل' : 'Marchand'}</span>
                  <span className="font-semibold text-black dark:text-white">{s.merchantName || 'Comptoir'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'نمط التسليم' : 'Mode'}</span>
                  <span className="font-semibold text-[#d4522f]">{s.deliveryMode}</span>
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 text-xs">
                <label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase">
                  {isAr ? 'تعليمات وإرشادات التوصيل' : 'Consignes & Remarques Livreur'}
                </label>
                <textarea
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  rows={6}
                  placeholder={
                    isAr
                      ? 'أدخل تعليمات التوصيل...'
                      : "Précisions d'accès, créneau de livraison, consignes spéciales..."
                  }
                  className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-2 focus:ring-[#d4522f] outline-hidden"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-black/55 dark:text-white/55">
                    {noteSaved && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={12} /> {isAr ? 'تم الحفظ' : 'Enregistré'}
                      </span>
                    )}
                  </span>
                  <AtriumButton
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={<Save size={13} />}
                    onClick={handleSaveNotes}
                  >
                    {isAr ? 'حفظ التعليمات' : 'Enregistrer'}
                  </AtriumButton>
                </div>
              </div>
            )}
          </div>
        )}
      />

      {isShipmentModalOpen && (
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
              showToast(isAr ? 'تم تحديث بيانات الشحنة' : 'Colis mis à jour', 'success');
            } else {
              addShipment(s);
              showToast(
                isAr ? 'تم إنشاء الشحنة بنجاح' : 'Colis enregistré avec succès (AWB)',
                'success'
              );
            }
            setIsShipmentModalOpen(false);
            setShipmentToEdit(null);
          }}
        />
      )}

      {isHandoverModalOpen && shipmentForHandover && (
        <StopDeskHandoverModal
          isOpen={isHandoverModalOpen}
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
      )}
    </div>
  );
};

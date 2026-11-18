import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Truck,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Edit,
  Pin,
  X,
  MapPin,
  Eye,
  Trash2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LogisticsManifest } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { TransportManifestPrintModal } from './TransportManifestPrintModal';
import { CourierDischargeModal } from './CourierDischargeModal';
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
  InspectorNotesField,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (v: unknown): string =>
  typeof v === 'string'
    ? v
    : typeof v === 'number'
    ? String(v)
    : (v as { target?: { value?: string } })?.target?.value ?? '';

export const LogisticsManifestsView: React.FC<any> = () => {
  const {
    language,
    currentBusiness,
    currentBranch,
    branches,
    currentUser,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { manifests, shipments, addManifest, updateManifest, deleteManifest, addDischarge } =
    useLogisticsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['man_01']));
  const [sortBy, setSortBy] = useState<string>('manifestNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manifestToEdit, setManifestToEdit] = useState<LogisticsManifest | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [manifestToPrint, setManifestToPrint] = useState<LogisticsManifest | null>(null);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [manifestToDischarge, setManifestToDischarge] = useState<LogisticsManifest | null>(null);

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('0550 12 34 56');
  const [vehiclePlate, setVehiclePlate] = useState('01452-120-16');
  const [zoneWilaya, setZoneWilaya] = useState('Alger Est & Centre');
  const [status, setStatus] = useState<LogisticsManifest['status']>('Dispatched');

  const [selectedManifest, setSelectedManifest] = useState<LogisticsManifest | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('manifest');
  const [inspectorNotes, setInspectorNotes] = useState('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeManifest = useMemo(() => {
    if (!selectedManifest) return null;
    return manifests.find((m) => m.id === selectedManifest.id) || selectedManifest;
  }, [selectedManifest, manifests]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    manifests.forEach((m) => {
      const b = resolveRecordBranch(m, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [manifests, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: manifests.length },
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
        count: branchCounts.get(currentBranch.id) || manifests.length,
      });
    }
    return opts;
  }, [branches, branchCounts, currentBranch, manifests.length, isAr, isEn]);

  const openCreateModal = useCallback(() => {
    setManifestToEdit(null);
    setDriverName('');
    setDriverPhone('0550 12 34 56');
    setVehiclePlate('01452-120-16');
    setZoneWilaya('Alger Est & Centre');
    setStatus('Dispatched');
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((m: LogisticsManifest) => {
    setManifestToEdit(m);
    setDriverName(m.driverName);
    setDriverPhone(m.driverPhone);
    setVehiclePlate(m.vehiclePlate);
    setZoneWilaya(m.zoneWilaya || 'Alger');
    setStatus(m.status);
    setIsModalOpen(true);
  }, []);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم السائق' : 'Veuillez saisir le nom du chauffeur', 'error');
      return;
    }
    const unassignedShipments = shipments.filter(
      (s) => s.status === 'ReceivedAtHub' || s.status === 'Sorted'
    );
    const count = manifestToEdit ? manifestToEdit.totalShipmentsCount : unassignedShipments.length || 5;
    const codTotal = manifestToEdit
      ? manifestToEdit.totalCodExpectedDzd
      : unassignedShipments.reduce((acc, s) => acc + s.codAmountDzd, 0) || 45000;

    const payload: LogisticsManifest = {
      id: manifestToEdit?.id || `man_${Date.now()}`,
      accountId: manifestToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: manifestToEdit?.branchId || currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      manifestNumber:
        manifestToEdit?.manifestNumber ||
        `MAN-2026-${String(manifests.length + 42).padStart(3, '0')}`,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      vehiclePlate: vehiclePlate.trim(),
      dispatchDate: manifestToEdit?.dispatchDate || new Date().toISOString().split('T')[0],
      zoneWilaya: zoneWilaya.trim(),
      shipmentIds: manifestToEdit?.shipmentIds || unassignedShipments.map((s) => s.id),
      totalShipmentsCount: count,
      totalCodExpectedDzd: codTotal,
      totalCodCollectedDzd: manifestToEdit?.totalCodCollectedDzd || 0,
      status,
      createdAt: manifestToEdit?.createdAt || new Date().toISOString(),
    };

    if (manifestToEdit) {
      updateManifest(payload);
      if (selectedManifest?.id === payload.id) setSelectedManifest(payload);
      showToast(isAr ? 'تم تحديث ورقة الطريق' : 'Manifeste mis à jour', 'success');
    } else {
      addManifest(payload);
      setSelectedManifest(payload);
      showToast(
        isAr ? 'تم إنشاء ورقة طريق السائق بنجاح' : 'Feuille de route émise avec succès',
        'success'
      );
    }
    setIsModalOpen(false);
  };

  const filteredManifests = useMemo(() => {
    return manifests.filter((m) => {
      if (filterStatus !== 'All' && m.status !== filterStatus) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        if (b.id !== branchFilter && b.name !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = m.manifestNumber.toLowerCase().includes(q);
        const matchesDriver = m.driverName.toLowerCase().includes(q);
        const matchesZone = (m.zoneWilaya || '').toLowerCase().includes(q);
        const matchesPlate = m.vehiclePlate.toLowerCase().includes(q);
        if (!matchesNum && !matchesDriver && !matchesZone && !matchesPlate) return false;
      }
      return true;
    });
  }, [manifests, filterStatus, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedManifests = useMemo(() => {
    const list = [...filteredManifests];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'manifestNumber') {
        const cmp = a.manifestNumber.localeCompare(b.manifestNumber);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'driverName') {
        const cmp = a.driverName.localeCompare(b.driverName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'zoneWilaya') {
        const cmp = (a.zoneWilaya || '').localeCompare(b.zoneWilaya || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'parcels') {
        const cmp = (a.totalShipmentsCount || 0) - (b.totalShipmentsCount || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'codExpected') {
        const cmp = (a.totalCodExpectedDzd || 0) - (b.totalCodExpectedDzd || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredManifests, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const totalParcelsInManifests = useMemo(
    () => manifests.reduce((acc, m) => acc + (m.totalShipmentsCount || m.shipmentIds.length), 0),
    [manifests]
  );
  const totalCodInManifests = useMemo(
    () => manifests.reduce((acc, m) => acc + (m.totalCodExpectedDzd || 0), 0),
    [manifests]
  );
  const completedTournees = useMemo(
    () => manifests.filter((m) => m.status === 'Completed' || m.status === 'Reconciled').length,
    [manifests]
  );
  const dispatchedCount = useMemo(
    () => manifests.filter((m) => m.status === 'Dispatched').length,
    [manifests]
  );

  const handleTogglePin = useCallback(
    (m: LogisticsManifest) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const wasPinned = next.has(m.id);
        if (wasPinned) next.delete(m.id);
        else next.add(m.id);
        showToast(
          wasPinned
            ? isAr ? 'تم إلغاء التثبيت' : 'Manifeste désépinglé'
            : isAr ? 'تم تثبيت ورقة الطريق' : 'Manifeste épinglé',
          'info'
        );
        return next;
      });
    },
    [isAr]
  );

  const handleDelete = useCallback(
    (m: LogisticsManifest) => {
      deleteManifest(m.id);
      if (selectedManifest?.id === m.id) setSelectedManifest(null);
      showToast(isAr ? 'تم حذف ورقة الطريق' : 'Manifeste de distribution supprimé', 'success');
    },
    [deleteManifest, selectedManifest, isAr]
  );

  const handleCloseTournee = useCallback(
    (m: LogisticsManifest) => {
      const nextStatus: LogisticsManifest['status'] =
        m.status === 'Completed' ? 'Dispatched' : 'Completed';
      const updated: LogisticsManifest = {
        ...m,
        status: nextStatus,
        totalCodCollectedDzd: nextStatus === 'Completed' ? m.totalCodExpectedDzd : 0,
      };
      updateManifest(updated);
      if (selectedManifest?.id === m.id) setSelectedManifest(updated);
      showToast(
        nextStatus === 'Completed'
          ? isAr ? 'تم تأكيد عودة السائق وتصفية الطرود' : 'Tournée clôturée et encaissement validé'
          : isAr ? 'إعادة فتح المسار' : 'Tournée réouverte',
        'success'
      );
    },
    [updateManifest, selectedManifest, isAr]
  );

  const handleSelectManifest = useCallback((m: LogisticsManifest, originEl?: HTMLElement | null) => {
    if (originEl) setDrawerOpenerEl(originEl);
    setSelectedManifest(m);
    setActiveTab('manifest');
  }, []);

  const getManifestRowMeta = useCallback(
    (m: LogisticsManifest): KineticRowMeta => {
      const isCompleted = m.status === 'Completed' || m.status === 'Reconciled';
      const branchInfo = resolveRecordBranch(m, branchesById, currentBranch, language);
      return {
        avatarText: (m.driverName || 'TR').slice(0, 2).toUpperCase(),
        subline: `${m.manifestNumber} · ${m.vehiclePlate}`,
        categoryLabel: m.zoneWilaya || 'Alger',
        statusVariant: isCompleted ? 'active' : 'info',
        statusLabel: isCompleted
          ? isAr ? 'مكتملة' : isEn ? 'Completed' : 'Clôturée'
          : isAr ? 'في التوزيع' : isEn ? 'Dispatched' : 'En Tournée',
        metricPrimary: formatMoney(m.totalCodExpectedDzd || 0, language),
        metricSecondary: `${m.totalShipmentsCount} ${isAr ? 'طرد' : isEn ? 'parcels' : 'colis'}`,
        detailCol1: {
          heading: isAr ? 'السائق والمركبة' : isEn ? 'Driver & Vehicle' : 'Chauffeur & Véhicule',
          primaryText: m.driverName,
          secondaryText: `${m.vehiclePlate} · ${m.driverPhone}`,
        },
        detailCol2: {
          heading: isAr ? 'الطرود والتحصيل' : isEn ? 'Parcels & COD' : 'Colis & COD Attendu',
          primaryText: formatMoney(m.totalCodExpectedDzd || 0, language),
          secondaryText: `${m.totalShipmentsCount} ${isAr ? 'طرد' : isEn ? 'parcels' : 'colis'}`,
        },
        detailCol3: {
          heading: isAr ? 'المنطقة والمركز' : isEn ? 'Zone & Hub' : 'Zone & Agence',
          primaryText: m.zoneWilaya || 'Alger',
          secondaryText: `${m.dispatchDate} · ${branchInfo.name}`,
        },
      };
    },
    [branchesById, currentBranch, isAr, isEn, language]
  );

  const getManifestFanActions = useCallback(
    (m: LogisticsManifest): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => handleSelectManifest(m, e.currentTarget),
      },
      {
        id: 'print',
        label: '05-468',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: () => {
          setManifestToPrint(m);
          setIsPrintModalOpen(true);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => handleDelete(m),
      },
    ],
    [isAr, handleSelectManifest, handleDelete]
  );

  const getManifestDetailActions = useCallback(
    (m: LogisticsManifest): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح الورقة' : 'Ouvrir Feuille',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => handleSelectManifest(m),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Modifier',
        icon: <Edit className="w-3.5 h-3.5" />,
        onClick: () => openEditModal(m),
      },
      {
        id: 'discharge',
        label: isAr ? 'تصفية الصندوق' : 'Décharge',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        onClick: () => {
          setManifestToDischarge(m);
          setIsDischargeModalOpen(true);
        },
      },
      {
        id: 'delete',
        label: isAr ? 'حذف' : 'Supprimer',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => handleDelete(m),
      },
    ],
    [isAr, handleSelectManifest, openEditModal, handleDelete]
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      'N° Manifeste',
      'Chauffeur',
      'Téléphone',
      'Véhicule',
      'Agence / Hub',
      'Wilaya / Zone',
      'Nombre Colis',
      'COD Attendu DZD',
      'Date Dispatch',
      'Statut',
    ];
    const rows = sortedManifests.map((m) => {
      const b = resolveRecordBranch(m, branchesById, currentBranch, language);
      return [
        m.manifestNumber,
        m.driverName,
        m.driverPhone,
        m.vehiclePlate,
        b.name,
        m.zoneWilaya || '',
        m.totalShipmentsCount,
        m.totalCodExpectedDzd,
        m.dispatchDate,
        m.status,
      ];
    });
    downloadCsvSafe(
      `manifestes_tournees_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير أوراق الطريق CSV' : 'Export CSV des manifestes généré', 'info');
  }, [sortedManifests, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [filterStatus, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterStatus !== 'All') {
      chips.push({
        key: 'status',
        label: filterStatus === 'Completed' ? (isAr ? 'مكتملة' : 'Clôturées') : isAr ? 'توزيع' : 'En Tournée',
        onRemove: () => setFilterStatus('All'),
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
  }, [filterStatus, branchFilter, branchOptions, isAr]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'حالة المسار' : isEn ? 'Route Status' : 'Statut Tournée',
        value: filterStatus,
        onChange: setFilterStatus,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: manifests.length },
          { value: 'Dispatched', label: isAr ? 'في التوزيع' : isEn ? 'Dispatched' : 'En Tournée', count: dispatchedCount },
          { value: 'Completed', label: isAr ? 'مكتملة' : isEn ? 'Completed' : 'Clôturées', count: completedTournees },
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
    [isAr, isEn, filterStatus, branchFilter, manifests.length, dispatchedCount, completedTournees, branchOptions]
  );

  const columns: ColumnDefinition<LogisticsManifest>[] = useMemo(
    () => [
      {
        key: 'manifestNumber',
        header: isAr ? 'رقم الإرسال' : 'N° Manifeste',
        width: '1.8*',
        sortable: true,
        renderCell: (m) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              <Truck size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black dark:text-white flex items-center gap-1.5">
                {m.manifestNumber}
                {pinnedIds.has(m.id) && <Pin size={10} className="fill-[#d4522f] text-[#d4522f]" />}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55">{m.dispatchDate}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'driverName',
        header: isAr ? 'السائق والمركبة' : 'Chauffeur & Véhicule',
        width: '2.2*',
        sortable: true,
        renderCell: (m) => (
          <div className="min-w-0">
            <div className="font-semibold text-xs text-black dark:text-white truncate">
              {m.driverName}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 font-mono truncate">
              {m.vehiclePlate} ({m.driverPhone})
            </div>
          </div>
        ),
      },
      {
        key: 'zoneWilaya',
        header: isAr ? 'المنطقة' : 'Secteur / Wilaya',
        width: '2.0*',
        sortable: true,
        renderCell: (m) => (
          <div className="flex items-center gap-1 text-xs text-black/70 dark:text-white/75 min-w-0">
            <MapPin size={12} className="text-[#d4522f] shrink-0" />
            <span className="truncate">{m.zoneWilaya || 'Alger'}</span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
        width: '1.5*',
        sortable: true,
        renderCell: (m) => {
          const b = resolveRecordBranch(m, branchesById, currentBranch, language);
          return <span className="text-xs text-black/75 dark:text-white/75 truncate">{b.name}</span>;
        },
      },
      {
        key: 'parcels',
        header: isAr ? 'الطرود' : 'Colis',
        width: '1.1*',
        sortable: true,
        renderCell: (m) => (
          <div className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {m.totalShipmentsCount} colis
          </div>
        ),
      },
      {
        key: 'codExpected',
        header: isAr ? 'المبلغ المطلوب تحصيله' : 'Total COD Attendu',
        width: '1.6*',
        sortable: true,
        renderCell: (m) => (
          <div className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatMoney(m.totalCodExpectedDzd)}
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut Tournée',
        width: '1.3*',
        renderCell: (m) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              m.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
            }`}
          >
            {m.status === 'Completed' ? (isAr ? 'مكتملة' : 'Clôturée') : isAr ? 'في التوزيع' : 'En Tournée'}
          </span>
        ),
      },
    ],
    [pinnedIds, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: manifests.length > 0,
  });

  if (showSkeleton && (manifests.length === 0 || networkMode === 'force_skeleton')) {
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
        title={isAr ? 'المسارات' : isEn ? 'Manifests' : 'Tournées'}
        primaryAction={{
          label: isAr ? 'ورقة طريق جديدة' : isEn ? 'New Manifest' : 'Nouveau Manifeste',
          onClick: openCreateModal,
          dataAction: 'add-manifest',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'حمولة الأسطول ومبالغ التحصيل الميداني'
            : isEn
            ? 'Fleet Activity & Courier COD'
            : 'Activité Flotte & Encaissement Livreur'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'المسارات في التوزيع' : isEn ? 'Active Dispatches' : 'Tournées Actives',
          badgeText: isAr ? 'توزيع' : 'Tournée',
          count: dispatchedCount,
          tone: 'terracotta',
          isActive: filterStatus === 'Dispatched',
          onToggle: () => setFilterStatus((prev) => (prev === 'Dispatched' ? 'All' : 'Dispatched')),
        }}
        secondaryCard={{
          label: isAr ? 'المسارات المكتملة' : isEn ? 'Completed Routes' : 'Tournées Clôturées',
          badgeText: isAr ? 'مكتملة' : 'Clôturées',
          count: completedTournees,
          tone: 'emerald',
          isActive: filterStatus === 'Completed',
          onToggle: () => setFilterStatus((prev) => (prev === 'Completed' ? 'All' : 'Completed')),
        }}
        darkCard={{
          label: isAr ? 'مجموع مبالغ COD المطلوبة' : isEn ? 'Expected COD' : 'Encaissements COD',
          badgeCount: totalParcelsInManifests,
          badgeSuffix: isAr ? ' طرد' : ' colis',
          valueCount: totalCodInManifests,
          formatValue: (v) => formatMoney(Math.round(v), language),
          caption: isAr ? 'تحت عهدة السائقين' : 'Bordereaux scellés',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'بيانات الشحن وأوراق الطريق الرسمية'
              : isEn
              ? 'Dispatch Manifests & Waybills'
              : 'Manifestes de Dispatch & Feuilles de Route'
          }
          liveRegionText={`${sortedManifests.length} ${isAr ? 'مسار' : 'manifestes'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث برقم الإرسال، السائق، المنطقة...'
              : 'Rechercher par manifeste, chauffeur, zone...'
          }
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: manifests.length },
            { value: 'Dispatched', label: isAr ? 'توزيع' : isEn ? 'Dispatched' : 'Tournée', count: dispatchedCount },
            { value: 'Completed', label: isAr ? 'مكتملة' : isEn ? 'Completed' : 'Clôturées', count: completedTournees },
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
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection<LogisticsManifest>
          hideToolbar
          items={sortedManifests}
          columns={columns}
          keyExtractor={(m) => m.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'إغلاق المسارات' : 'Clôturer tournées',
            icon: <CheckCircle2 size={14} />,
            onClick: (ids) => {
              ids.forEach((id) => {
                const m = manifests.find((item) => item.id === id);
                if (m && m.status !== 'Completed') handleCloseTournee(m);
              });
              setSelectedIds(new Set<string>());
              showToast(isAr ? 'تم إغلاق المسارات المحددة' : 'Tournées clôturées avec succès', 'success');
            },
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteManifest(id));
            setSelectedIds(new Set<string>());
            if (selectedManifest && ids.has(selectedManifest.id)) setSelectedManifest(null);
            showToast(isAr ? 'تم حذف أوراق الطريق المحددة' : 'Manifestes sélectionnés supprimés', 'success');
          }}
          isPinned={(m) => pinnedIds.has(m.id)}
          onTogglePin={handleTogglePin}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          openItemId={activeManifest?.id || null}
          onItemClick={handleSelectManifest}
          onViewDetails={handleSelectManifest}
          getRowMeta={getManifestRowMeta}
          getFanActions={getManifestFanActions}
          getDetailActions={getManifestDetailActions}
          onEdit={openEditModal}
          onDelete={handleDelete}
          emptyTitle={isAr ? 'لا توجد أوراق طريق' : 'Aucun manifeste trouvé'}
          emptyDescription={
            searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche'
              : isAr ? 'قم بإنشاء أول ورقة طريق للسائق' : 'Émettez votre premier manifeste de dispatch'
          }
          primaryActionLabel={isAr ? 'ورقة طريق جديدة' : 'Nouveau Manifeste'}
          onAddFirstItem={openCreateModal}
          onResetFilters={resetAllFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          customActions={(m) => [
            {
              id: 'print05468',
              label: isAr ? 'طباعة بيان الشحن (05-468)' : 'Imprimer Lettre 05-468',
              icon: <Printer size={14} />,
              onClick: () => {
                setManifestToPrint(m);
                setIsPrintModalOpen(true);
              },
            },
            {
              id: 'dischargeCash',
              label: isAr ? 'تصفية الصندوق وتبرئة الذمة' : 'Décharge Caisse',
              icon: <ShieldCheck size={14} />,
              onClick: () => {
                setManifestToDischarge(m);
                setIsDischargeModalOpen(true);
              },
            },
            {
              id: 'closeTournee',
              label: isAr ? 'تأكيد إتمام المسار' : 'Clôturer Tournée',
              icon: <CheckCircle2 size={14} />,
              onClick: () => handleCloseTournee(m),
            },
          ]}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedManifests.length}
        entityPluralLabel={isAr ? 'مسارات' : 'manifestes'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeManifest)}
        item={activeManifest}
        allItems={sortedManifests}
        keyExtractor={(m) => m.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeManifest?.manifestNumber || ''}
        subtitle={
          activeManifest
            ? `${activeManifest.driverName} (${activeManifest.vehiclePlate})`
            : undefined
        }
        categoryLabel={activeManifest?.zoneWilaya || 'Dispatch'}
        avatarText={(activeManifest?.driverName || 'TR').slice(0, 2).toUpperCase()}
        branchName={
          activeManifest
            ? resolveRecordBranch(activeManifest, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeManifest?.status === 'Completed'
            ? isAr ? 'مكتملة' : 'Clôturée'
            : isAr ? 'في التوزيع' : 'En Tournée'
        }
        statusClassName={
          activeManifest?.status === 'Completed'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
        }
        tabs={[
          { id: 'manifest', label: isAr ? 'المسار' : 'Tournée' },
          { id: 'colis', label: isAr ? 'الطرود' : 'Colisage' },
          { id: 'cod', label: isAr ? 'التحصيل' : 'Finance COD' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => handleSelectManifest(item)}
        onClose={() => setSelectedManifest(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(m, tab) => {
          if (tab === 'colis') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={`${m.totalShipmentsCount} colis`}
                    tone="accent"
                    caption={isAr ? 'Bordereau de chargement scellé' : 'Bordereau de chargement scellé au départ du hub'}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'طباعة بيان الشحن (05-468)' : 'Imprimer Lettre de Voiture 05-468'}
                    icon={<Printer size={14} />}
                    tone="dark"
                    onClick={() => {
                      setManifestToPrint(m);
                      setIsPrintModalOpen(true);
                    }}
                  />
                </InspectorSection>
              </>
            );
          }
          if (tab === 'cod') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatMoney(m.totalCodExpectedDzd, language)}
                    tone="accent"
                    caption={isAr ? 'مجموع مبالغ COD المطلوبة' : 'Total COD Attendu'}
                    action={{
                      label: isAr ? 'تصفية الصندوق وتبرئة الذمة' : 'Décharge Caisse Chauffeur',
                      onClick: () => {
                        setManifestToDischarge(m);
                        setIsDischargeModalOpen(true);
                      },
                    }}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'التسوية النقدية' : 'Encaissement Chauffeur'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'المبلغ المطلوب' : 'COD Attendu'}
                      value={formatMoney(m.totalCodExpectedDzd, language)}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'المبلغ المحصّل بالصندوق' : 'Montant Reversé'}
                      value={formatMoney(m.totalCodCollectedDzd || 0, language)}
                      tone="ok"
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }
          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions Rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'toggle',
                      label: m.status === 'Completed' ? 'Réouvrir' : 'Clôturer',
                      icon: <CheckCircle2 size={16} />,
                      primary: true,
                      onClick: () => handleCloseTournee(m),
                    },
                    {
                      id: 'print',
                      label: 'Lettre 05-468',
                      icon: <Printer size={16} />,
                      onClick: () => {
                        setManifestToPrint(m);
                        setIsPrintModalOpen(true);
                      },
                    },
                    {
                      id: 'discharge',
                      label: isAr ? 'تبرئة الذمة' : 'Décharge',
                      icon: <ShieldCheck size={16} />,
                      onClick: () => {
                        setManifestToDischarge(m);
                        setIsDischargeModalOpen(true);
                      },
                    },
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : 'Modifier',
                      icon: <Edit size={16} />,
                      onClick: () => openEditModal(m),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'معلومات السائق والمركبة' : 'Chauffeur & Acheminement'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'السائق' : 'Chauffeur'} value={m.driverName} mono={false} />
                  <InspectorKeyValue
                    label={isAr ? 'الهاتف' : 'Contact'}
                    value={m.driverPhone}
                    copyText={m.driverPhone}
                    onCopied={() => showToast('Téléphone copié', 'info')}
                  />
                  <InspectorKeyValue label={isAr ? 'المركبة' : 'Véhicule'} value={m.vehiclePlate} tone="accent" />
                  <InspectorKeyValue label={isAr ? 'المنطقة' : 'Secteur'} value={m.zoneWilaya || 'Alger'} mono={false} />
                  <InspectorKeyValue label={isAr ? 'التاريخ' : "Date d'expédition"} value={m.dispatchDate} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'تعليمات المسار' : 'Consignes de Tournée'}>
                <InspectorNotesField
                  value={inspectorNotes}
                  onSave={(next) => {
                    setInspectorNotes(next);
                    showToast(isAr ? 'تم حفظ تعليمات المسار' : 'Consignes de tournée enregistrées', 'success');
                  }}
                  placeholder="Noter les points relais prioritaires, numéros urgents..."
                />
              </InspectorSection>
            </>
          );
        }}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold">
                  <Truck size={20} />
                </div>
                <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  {manifestToEdit
                    ? isAr ? 'تعديل ورقة الطريق' : 'Modifier le Manifeste'
                    : isAr ? 'إنشاء ورقة طريق جديدة' : 'Nouvelle Feuille de Route'}
                </h2>
              </div>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveModal} className="space-y-4">
              <LabelInput
                label={isAr ? 'اسم السائق / الموزع *' : 'Nom du Chauffeur / Coursier *'}
                placeholder="Ex: Mourad Brahimi"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'هاتف السائق' : 'Téléphone Chauffeur'}
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'ترقيم المركبة' : 'Immatriculation Véhicule'}
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'المنطقة أو الولاية' : 'Zone / Wilaya'}
                  placeholder="Ex: Alger Ouest, Oran Centre..."
                  value={zoneWilaya}
                  onChange={(e) => setZoneWilaya(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الحالة' : 'Statut'}
                  value={status}
                  onChange={(v) => setStatus(extractStr(v) as LogisticsManifest['status'])}
                  options={[
                    { value: 'Dispatched', label: 'En Tournée (Dispatched)' },
                    { value: 'Completed', label: 'Clôturée (Completed)' },
                  ]}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {manifestToEdit
                    ? isAr ? 'حفظ التعديلات' : 'Enregistrer'
                    : isAr ? 'تأكيد إصدار الورقة' : 'Émettre le Manifeste'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPrintModalOpen && manifestToPrint && (
        <TransportManifestPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          manifest={manifestToPrint}
        />
      )}

      {isDischargeModalOpen && manifestToDischarge && (
        <CourierDischargeModal
          isOpen={isDischargeModalOpen}
          onClose={() => setIsDischargeModalOpen(false)}
          manifest={manifestToDischarge}
          onSaveDischarge={(d) => {
            addDischarge(d);
            updateManifest({
              ...manifestToDischarge,
              status: 'Completed',
              totalCodCollectedDzd: d.actualCashTurnedInDzd,
            });
          }}
        />
      )}
    </div>
  );
};

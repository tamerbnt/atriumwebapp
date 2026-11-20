import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ScanLine,
  ShieldCheck,
  Printer,
  Check,
  X,
  Share2,
  Barcode,
  Volume2,
  Boxes,
  MapPin,
  Eye,
  Pin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment } from '../../../types';
import { localizeStatus } from '../../../utils/rules';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  KineticEmptyStateMotion,
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

const playSound = (type: 'success' | 'error') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Ignore audio unavailability in headless / restricted contexts
  }
};

export const LogisticsScannerView: React.FC = () => {
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
  const { shipments, bags, updateShipmentStatus, sealBag } = useLogisticsData();

  const [scanMode, setScanMode] = useState<'Intake' | 'Bagging' | 'Unbagging'>('Bagging');
  const [selectedBagId, setSelectedBagId] = useState<string>(bags[0]?.id || 'bag_01');
  const [scannedCode, setScannedCode] = useState('');
  const [securitySealInput, setSecuritySealInput] = useState('');
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast(
          nowPinned
            ? isAr ? 'تم تثبيت الطرد في الأعلى' : 'Colis épinglé en tête de quai'
            : isAr ? 'تم إلغاء تثبيت الطرد' : 'Colis désépinglé',
          'info'
        );
        return next;
      });
    },
    [isAr]
  );

  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('colis');
  const [scanHistory, setScanHistory] = useState<
    Array<{ code: string; status: 'success' | 'error'; message: string; timestamp: string }>
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activeBag = bags.find((b) => b.id === selectedBagId) || bags[0];

  const activeShipment = useMemo(() => {
    if (!selectedShipment) return null;
    return shipments.find((s) => s.id === selectedShipment.id) || selectedShipment;
  }, [selectedShipment, shipments]);

  const handleScanCode = useCallback(
    (codeToScan: string) => {
      const clean = codeToScan.trim().toUpperCase();
      if (!clean) return;

      const found = shipments.find((s) => s.trackingCode.toUpperCase() === clean);
      const now = new Date().toLocaleTimeString();

      if (found) {
        playSound('success');
        updateShipmentStatus(found.id, scanMode === 'Bagging' ? 'Sorted' : 'ReceivedAtHub');
        setScanHistory((prev) => [
          {
            code: clean,
            status: 'success',
            message: `Colis orienté vers: ${found.destinationWilaya} (${found.recipientName})`,
            timestamp: now,
          },
          ...prev.slice(0, 11),
        ]);
        setSelectedShipment(found);
        showToast(
          isAr ? `تم فرز وتوجيه الطرد: ${clean}` : `Scan validé: ${clean} aiguillé`,
          'success'
        );
      } else {
        playSound('error');
        setScanHistory((prev) => [
          {
            code: clean,
            status: 'error',
            message: isAr ? 'الرمز غير مسجل في النظام' : 'Code AWB non répertorié au Hub',
            timestamp: now,
          },
          ...prev.slice(0, 11),
        ]);
        showToast(isAr ? 'كود الطرد غير موجود' : 'Code AWB inconnu au système', 'error');
      }

      setScannedCode('');
      inputRef.current?.focus();
    },
    [shipments, updateShipmentStatus, scanMode, isAr]
  );

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanCode(scannedCode);
  };

  const handleSealActiveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBag) return;
    if (!securitySealInput.trim()) {
      showToast(
        isAr ? 'يرجى إدخال رقم الختم الأمني' : 'Numéro de scellé obligatoire',
        'error'
      );
      return;
    }

    sealBag(activeBag.id, securitySealInput.trim());
    showToast(
      isAr
        ? `تم إحكام وغلق الكيس بالختم الأمني ${securitySealInput}`
        : `Sac ${activeBag.bagCode} scellé avec succès (${securitySealInput})`,
      'success'
    );
    setIsSealModalOpen(false);
    setSecuritySealInput('');
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (modeFilter !== 'All' && s.deliveryMode !== modeFilter) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language);
        if (b.id !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !s.trackingCode.toLowerCase().includes(q) &&
          !s.recipientName.toLowerCase().includes(q) &&
          !s.destinationWilaya.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [shipments, statusFilter, modeFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, number>();
    shipments.forEach((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      map.set(b.id, (map.get(b.id) || 0) + 1);
    });
    return [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: shipments.length },
      ...Array.from(map.entries()).map(([id, count]) => ({
        value: id,
        label: branchesById.get(id)?.name || id,
        count,
      })),
    ];
  }, [shipments, branchesById, currentBranch, language, isAr, isEn]);

  const activeFiltersCount =
    (statusFilter !== 'All' ? 1 : 0) +
    (modeFilter !== 'All' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'All') {
      chips.push({
        key: 'status',
        label: localizeStatus(statusFilter, language),
        onRemove: () => setStatusFilter('All'),
      });
    }
    if (modeFilter !== 'All') {
      chips.push({
        key: 'mode',
        label: modeFilter === 'StopDesk' ? 'Stop-Desk' : isAr ? 'توصيل منزلي' : isEn ? 'Home Delivery' : 'Domicile',
        onRemove: () => setModeFilter('All'),
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
  }, [statusFilter, modeFilter, branchFilter, branchOptions, language, isAr, isEn]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('All');
    setModeFilter('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'حالة الطرد' : isEn ? 'Status' : 'Statut Tri',
        value: statusFilter,
        onChange: setStatusFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: shipments.length },
          {
            value: 'Sorted',
            label: isAr ? 'مفرز' : isEn ? 'Sorted' : 'Triés',
            count: shipments.filter((s) => s.status === 'Sorted').length,
          },
          {
            value: 'ReceivedAtHub',
            label: isAr ? 'بالمستودع' : isEn ? 'At Hub' : 'Au Hub',
            count: shipments.filter((s) => s.status === 'ReceivedAtHub').length,
          },
        ],
      },
      {
        id: 'mode',
        kind: 'segmented',
        label: isAr ? 'طريقة التسليم' : isEn ? 'Delivery Mode' : 'Mode de Remise',
        value: modeFilter,
        onChange: setModeFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: shipments.length },
          {
            value: 'StopDesk',
            label: 'Stop-Desk',
            count: shipments.filter((s) => s.deliveryMode === 'StopDesk').length,
          },
          {
            value: 'HomeDelivery',
            label: isAr ? 'منزلي' : isEn ? 'Home' : 'Domicile',
            count: shipments.filter((s) => s.deliveryMode !== 'StopDesk').length,
          },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'الفرع / المركز' : isEn ? 'Branch' : 'Agence / Hub',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, statusFilter, modeFilter, branchFilter, shipments, branchOptions]
  );

  const sortedShipments = useMemo(() => {
    const list = [...filteredShipments];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (sortBy === 'code') {
        const cmp = a.trackingCode.localeCompare(b.trackingCode);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'recipient') {
        const cmp = a.recipientName.localeCompare(b.recipientName);
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

  const handleExportQuai = useCallback(() => {
    const headers = ['AWB', 'Destinataire', 'Wilaya', 'Agence / Hub', 'Mode', 'Statut'];
    const rows = sortedShipments.map((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      return [s.trackingCode, s.recipientName, s.destinationWilaya, b.name, s.deliveryMode, s.status];
    });
    downloadCsvSafe(
      `quai_tri_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير قائمة الفرز' : 'Export quai de tri généré', 'info');
  }, [sortedShipments, branchesById, currentBranch, language, isAr]);

  const getScannerRowMeta = useCallback(
    (s: LogisticsShipment): KineticRowMeta => {
      const branchInfo = resolveRecordBranch(s, branchesById, currentBranch, language);
      const modeLabel =
        s.deliveryMode === 'StopDesk'
          ? 'Stop-Desk'
          : isAr ? 'منزلي' : isEn ? 'Home' : 'Domicile';
      return {
        isPinned: pinnedIds.has(s.id),
        avatarText: (s.recipientName || 'AW').slice(0, 2).toUpperCase(),
        subline: `${s.trackingCode} · ${s.destinationWilaya}`,
        categoryLabel: modeLabel,
        statusVariant: s.status === 'Delivered' || s.status === 'Sorted' ? 'active' : 'warning',
        statusLabel: localizeStatus(s.status, language),
        metricPrimary: `${s.weightKg} kg`,
        metricSecondary: branchInfo.name,
        detailCol1: {
          heading: isAr ? 'المستلم والوجهة' : isEn ? 'Recipient & Dest.' : 'Destinataire & Wilaya',
          primaryText: s.recipientName,
          secondaryText: `${s.destinationWilaya} · ${s.recipientPhone}`,
        },
        detailCol2: {
          heading: isAr ? 'الوزن والتسليم' : isEn ? 'Weight & Mode' : 'Poids & Remise',
          primaryText: `${s.weightKg} kg`,
          secondaryText: modeLabel,
        },
        detailCol3: {
          heading: isAr ? 'الباركود والمركز' : isEn ? 'AWB & Hub' : 'Code AWB & Hub',
          primaryText: s.trackingCode,
          secondaryText: branchInfo.name,
        },
      };
    },
    [pinnedIds, isAr, isEn, language, branchesById, currentBranch]
  );

  const getScannerFanActions = useCallback(
    (s: LogisticsShipment): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedShipment(s);
          setInspectorTab('colis');
        },
      },
      {
        id: 'sort',
        label: isAr ? 'فرز' : 'Aiguiller',
        icon: <Check className="w-[15px] h-[15px]" />,
        onClick: () => handleScanCode(s.trackingCode),
      },
      {
        id: 'pin',
        label: pinnedIds.has(s.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-[15px] h-[15px] ${pinnedIds.has(s.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(s.id),
      },
      {
        id: 'barcode',
        label: 'Barcode',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: () =>
          showToast(
            isAr ? `طباعة ملصق الباركود للطرد ${s.trackingCode}` : `Étiquette AWB générée pour ${s.trackingCode}`,
            'info'
          ),
      },
    ],
    [isAr, handleScanCode, pinnedIds, handleTogglePin]
  );

  const getScannerDetailActions = useCallback(
    (s: LogisticsShipment): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح البطاقة' : 'Ouvrir Colis',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedShipment(s);
          setInspectorTab('colis');
        },
      },
      {
        id: 'sort',
        label: isAr ? 'فرز وتوجيه' : 'Aiguiller Quai',
        icon: <Check className="w-3.5 h-3.5" />,
        onClick: () => handleScanCode(s.trackingCode),
      },
      {
        id: 'pin',
        label: pinnedIds.has(s.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-3.5 h-3.5 ${pinnedIds.has(s.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(s.id),
      },
      {
        id: 'share',
        label: isAr ? 'مشاركة' : 'Partager',
        icon: <Share2 className="w-3.5 h-3.5" />,
        onClick: () =>
          showToast(
            isAr ? 'تم نسخ رابط تتبع الشحنة' : `Lien de tracking ${s.trackingCode} copié`,
            'success'
          ),
      },
    ],
    [isAr, handleScanCode, pinnedIds, handleTogglePin]
  );

  const columns: ColumnDefinition<LogisticsShipment>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'AWB',
        width: '1.4*',
        sortable: true,
        renderCell: (s) => (
          <span className="tabular-nums font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{s.trackingCode}</span>
        ),
      },
      {
        key: 'recipient',
        header: isAr ? 'المستلم والوجهة' : 'Destinataire & Wilaya',
        width: '2.2*',
        sortable: true,
        renderCell: (s) => (
          <div className="min-w-0">
            <div className="font-semibold t-small text-black dark:text-white truncate">
              {s.recipientName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {s.destinationWilaya} • {s.recipientPhone}
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
            <div className="flex items-center gap-1 t-cap text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'mode',
        header: isAr ? 'طريقة الاستلام' : 'Mode',
        width: '1.1*',
        renderCell: (s) => (
          <span
            className={`t-small font-semibold px-2 py-1 rounded-full ${
              s.deliveryMode === 'StopDesk'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            }`}
          >
            {s.deliveryMode === 'StopDesk' ? 'Stop-Desk' : 'Domicile'}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        width: '1.1*',
        renderCell: (s) => (
          <span
            className={`t-small font-semibold px-2 py-1 rounded-full ${
              s.status === 'Delivered'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : s.status === 'Sorted'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {localizeStatus(s.status, language)}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
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
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<ScanLine size={22} />}
        title={isAr ? 'الماسح' : 'Scanner'}
        secondaryActions={
          <div className="flex items-center gap-2">
            <span className="t-small font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
              <Volume2 size={11} /> Audio Chime
            </span>
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="flex bg-neutral-100 dark:bg-neutral-800 p-[3px] border border-neutral-200 dark:border-neutral-700"
            >
              {(['Bagging', 'Intake', 'Unbagging'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  data-no-liquid="true"
                  data-sq="thumb"
                  data-sq-border="none"
                  onClick={() => setScanMode(m)}
                  className={`px-3 py-1 t-small font-semibold transition-all cursor-pointer ${
                    scanMode === m
                      ? 'bg-white dark:bg-neutral-900 text-[var(--brand-on-dark,#FF8F63)]'
                      : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {m === 'Bagging'
                    ? isAr ? 'تعبئة الأكياس' : 'Sacs-Navette'
                    : m === 'Intake'
                    ? isAr ? 'استلام المدخلات' : 'Intake'
                    : isAr ? 'فتح الأكياس' : 'Dépotage'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الفرز والأكياس' : isEn ? 'Hub Sorting & Bags Overview' : 'Indicateurs Tri Quai & Sacs-Navette'}
        language={language}
        primaryCard={{
          label: isAr ? 'طرود مفرزة' : isEn ? 'Sorted Shipments' : 'Colis Triés Quai',
          badgeText: isAr ? 'مفرز' : isEn ? 'Sorted' : 'Triés',
          count: shipments.filter((s) => s.status === 'Sorted').length,
          tone: 'emerald',
          isActive: statusFilter === 'Sorted',
          onToggle: () => setStatusFilter((prev) => (prev === 'Sorted' ? 'All' : 'Sorted')),
        }}
        secondaryCard={{
          label: isAr ? 'طرود قيد الانتظار' : isEn ? 'Pending Hub Intake' : 'En Attente de Tri',
          badgeText: isAr ? 'بالمستودع' : isEn ? 'At Hub' : 'Au Hub',
          count: shipments.filter((s) => s.status === 'ReceivedAtHub').length,
          tone: 'terracotta',
          isActive: statusFilter === 'ReceivedAtHub',
          onToggle: () => setStatusFilter((prev) => (prev === 'ReceivedAtHub' ? 'All' : 'ReceivedAtHub')),
        }}
        darkCard={{
          label: isAr ? 'الأكياس المختومة' : isEn ? 'Sealed Bags' : 'Sacs-Navette Scellés',
          badgeCount: activeBag ? Math.round(activeBag.totalWeightKg) : 0,
          badgeSuffix: ' kg',
          valueCount: bags.filter((b) => b.status === 'Sealed').length,
          formatValue: (v) => `${Math.round(v)} / ${bags.length}`,
          caption: isAr ? 'نسبة إحكام الأكياس الأمنية' : isEn ? 'Sealed shuttle bags ratio' : 'Scellés de sécurité apposés',
        }}
      />

      <ScreenPod>
        <div className="space-y-4">
          {scanMode === 'Bagging' && activeBag && (
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-4 bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  data-sq="tile"
                  data-sq-border="none"
                  className="w-10 h-10 bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold"
                >
                  <Boxes size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold t-label text-black dark:text-white">
                      {activeBag.bagCode}
                    </span>
                    <span
                      className={`t-small font-semibold px-2 py-1 rounded-full ${
                        activeBag.status === 'Sealed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {localizeStatus(activeBag.status, language)}
                    </span>
                  </div>
                  <div className="t-cap text-black/55 dark:text-white/55 mt-0.5">
                    Destination: Wilaya {activeBag.destinationHubWilaya} • Poids:{' '}
                    <span className="tabular-nums font-semibold">{activeBag.totalWeightKg} kg / 25 kg</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  data-sq="ctl"
                  data-sq-border="none"
                  className="bg-neutral-100 dark:bg-neutral-700"
                >
                  <select
                    value={selectedBagId}
                    onChange={(e) => setSelectedBagId(e.target.value)}
                    aria-label={isAr ? 'اختر كيس الشحن' : 'Sélectionner un sac-navette'}
                    className="lbi-field w-full h-full bg-transparent border-0 px-3 py-2 t-small tabular-nums font-semibold"
                  >
                    {bags.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bagCode} (W{b.destinationHubWilaya})
                      </option>
                    ))}
                  </select>
                </div>

                {activeBag.status === 'Open' && (
                  <AtriumButton
                    variant="primary"
                    size="sm"
                    onClick={() => setIsSealModalOpen(true)}
                    icon={<ShieldCheck size={14} />}
                  >
                    {isAr ? 'ختم الكيس الأمني' : 'Poser Scellé & Fermer'}
                  </AtriumButton>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleScanSubmit} className="relative sq-elev-card">
            <div
              data-sq="ctl"
              data-sq-border="solid"
              data-sq-stroke-w={2}
              className="w-full bg-white dark:bg-[#1C1B1A] border-2 border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] focus-within:border-[#d4522f] focus-within:[--sq-stroke:#d4522f]"
            >
              <input
                ref={inputRef}
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder={
                  isAr
                    ? 'امسح باركود الشحنة بواسطة قارئ الباركود (Ex: ATR-EXP-88912)...'
                    : 'Scannez le code-barres AWB (Lecteur HID ou caméra, ex: ATR-EXP-88912)...'
                }
                className="lbi-field w-full bg-transparent border-0 pl-12 pr-28 py-4 t-label tabular-nums font-semibold text-black dark:text-white outline-hidden"
              />
            </div>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/55 dark:text-white/55 pointer-events-none">
              <Barcode size={22} />
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AtriumButton variant="primary" size="sm" type="submit">
                {isAr ? 'تأكيد المسح' : 'Valider'}
              </AtriumButton>
            </div>
          </form>
        </div>
      </ScreenPod>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <ScreenPod>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="t-small font-semibold text-black dark:text-white">
                {isAr ? 'سجل المسح الصوتي المباشر' : 'Journal des Scans en Direct'}
              </h3>
              <span className="t-cap tabular-nums text-black/55 dark:text-white/55">
                {scanHistory.length} scans
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {scanHistory.length === 0 ? (
                <KineticEmptyStateMotion motionKey={`scan-hist-empty-${language}`}>
                  <EmptyState
                    variant="compact"
                    tone="neutral"
                    icon={<Barcode size={20} />}
                    title={isAr ? 'في انتظار أول مسح' : isEn ? 'Waiting for first scan' : 'En attente de scan'}
                    description={
                      isAr
                        ? 'مرر الباركود أو أدخل رمز الطرد للتحقق الفوري.'
                        : isEn
                        ? 'Scan a barcode or enter a parcel tracking code.'
                        : 'En attente de lecture code-barres sur le quai.'
                    }
                  />
                </KineticEmptyStateMotion>
              ) : (
                scanHistory.map((h, i) => (
                  <div
                    key={`${h.code}_${i}`}
                    data-sq="ctl"
                    data-sq-border="solid"
                    className={`p-3 border t-cap flex items-center justify-between gap-2 ${
                      h.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 [--sq-stroke:#a7f3d0] dark:[--sq-stroke:rgba(6,95,70,0.5)]'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 [--sq-stroke:#fecaca] dark:[--sq-stroke:rgba(153,27,27,0.5)]'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="tabular-nums font-semibold text-black dark:text-white">{h.code}</div>
                      <div className="t-cap text-black/70 dark:text-white/75 truncate">
                        {h.message}
                      </div>
                    </div>
                    <span className="t-cap tabular-nums text-black/55 dark:text-white/55 shrink-0">
                      {h.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScreenPod>

        <div className="lg:col-span-2">
          <ScreenPod>
            <ScreenCollectionToolbar
              title={isAr ? 'طرود رصيف الفرز' : isEn ? 'Dock Shipments' : 'Colis au Quai de Tri'}
              liveRegionText={`${sortedShipments.length} ${isAr ? 'طرد' : isEn ? 'items' : 'colis'}`}
              language={language}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={isAr ? 'بحث AWB / مستلم...' : isEn ? 'Search AWB, recipient...' : 'Rechercher AWB, destinataire...'}
              statusOptions={[
                { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: shipments.length },
                { value: 'Sorted', label: isAr ? 'مفرز' : isEn ? 'Sorted' : 'Triés', count: shipments.filter((s) => s.status === 'Sorted').length },
                { value: 'ReceivedAtHub', label: isAr ? 'بالمستودع' : isEn ? 'At Hub' : 'Au Hub', count: shipments.filter((s) => s.status === 'ReceivedAtHub').length },
              ]}
              statusValue={statusFilter}
              onStatusChange={setStatusFilter}
              hasActiveAdvancedFilters={activeFiltersCount > 0}
              activeFiltersCount={activeFiltersCount}
              isFilterModalOpen={isFilterModalOpen}
              filterButtonRef={filterButtonRef}
              onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
              activeChips={activeChips}
              onResetAllFilters={resetAllFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onExport={handleExportQuai}
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
              onSortChange={(k, d) => {
                setSortBy(k);
                setSortDir(d);
              }}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              openItemId={activeShipment?.id || null}
              onItemClick={(s, el) => {
                if (el) setDrawerOpenerEl(el);
                setSelectedShipment(s);
              }}
              onViewDetails={(s, el) => {
                if (el) setDrawerOpenerEl(el);
                setSelectedShipment(s);
              }}
              getRowMeta={getScannerRowMeta}
              getFanActions={getScannerFanActions}
              getDetailActions={getScannerDetailActions}
              isPinned={(s) => pinnedIds.has(s.id)}
              onTogglePin={(s) => handleTogglePin(s.id)}
              customActions={(s) => [
                {
                  id: 'sort',
                  label: isAr ? 'فرز وتوجيه' : 'Aiguiller Quai',
                  icon: <Check size={14} />,
                  variant: 'primary',
                  onClick: () => handleScanCode(s.trackingCode),
                },
                {
                  id: 'barcode',
                  label: isAr ? 'طباعة الباركود' : 'Imprimer Barcode',
                  icon: <Printer size={14} />,
                  onClick: () =>
                    showToast(
                      isAr
                        ? `طباعة ملصق الباركود للطرد ${s.trackingCode}`
                        : `Étiquette AWB générée pour ${s.trackingCode}`,
                      'info'
                    ),
                },
                {
                  id: 'share',
                  label: isAr ? 'مشاركة الوصل' : 'Partager Bordereau',
                  icon: <Share2 size={14} />,
                  onClick: () =>
                    showToast(
                      isAr
                        ? 'تم نسخ رابط تتبع الشحنة'
                        : `Lien de tracking ${s.trackingCode} copié`,
                      'success'
                    ),
                },
              ]}
              emptyTitle={isAr ? 'لا توجد طرود' : isEn ? 'No dock parcels' : 'Aucun colis au quai'}
              emptyDescription={isAr ? 'أعد ضبط البحث لعرض الطرود' : isEn ? 'Reset filters to view parcels' : 'Réinitialisez la recherche'}
              onResetFilters={resetAllFilters}
              hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
            />
          </ScreenPod>
        </div>
      </div>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedShipments.length}
        entityPluralLabel={isAr ? 'طرود' : isEn ? 'shipments' : 'colis'}
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
            ? `${activeShipment.recipientName} · ${activeShipment.destinationWilaya}`
            : undefined
        }
        categoryLabel={
          activeShipment?.deliveryMode === 'StopDesk' ? 'Stop-Desk' : isAr ? 'منزلي' : 'Domicile'
        }
        avatarText={(activeShipment?.recipientName || 'AW').slice(0, 2).toUpperCase()}
        branchName={
          activeShipment
            ? resolveRecordBranch(activeShipment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeShipment?.status === 'Delivered'
            ? isAr ? 'تم التوصيل' : isEn ? 'Delivered' : 'Livré'
            : activeShipment?.status === 'OutForDelivery'
            ? isAr ? 'في التوزيع' : isEn ? 'Out for Delivery' : 'En Tournée'
            : activeShipment?.status === 'Returned'
            ? isAr ? 'مسترجع' : isEn ? 'Returned' : 'Retourné'
            : activeShipment?.status === 'Sorted'
            ? isAr ? 'مفرز' : isEn ? 'Sorted' : 'Trié Quai'
            : activeShipment
            ? isAr ? 'في المستودع' : isEn ? 'At Hub' : 'Au Hub'
            : undefined
        }
        statusClassName={
          activeShipment?.status === 'Delivered' || activeShipment?.status === 'Sorted'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : activeShipment?.status === 'Returned'
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'colis', label: isAr ? 'بيانات الطرد' : 'Colis & Tri' },
          { id: 'quai', label: isAr ? 'التوجيه' : 'Aiguillage' },
          { id: 'actions', label: isAr ? 'الطباعة' : 'Étiquette' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(s) => setSelectedShipment(s)}
        onClose={() => setSelectedShipment(null)}
        renderBody={(s, tab) => {
          if (tab === 'quai') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={localizeStatus(s.status, language)}
                    tone={s.status === 'Sorted' || s.status === 'Delivered' ? 'ok' : 'accent'}
                    caption={isAr ? 'حالة الفرز على الرصيف' : 'Statut Actuel Quai de Tri'}
                    action={{
                      label: isAr ? 'فرز وتوجيه الطرد الآن' : 'Aiguiller sur Ligne',
                      onClick: () => handleScanCode(s.trackingCode),
                    }}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'توجيه الشحنة' : 'Aiguillage & Mode'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Mode" value={s.deliveryMode} tone="accent" mono={false} />
                    <InspectorKeyValue label="Wilaya" value={s.destinationWilaya} mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }
          if (tab === 'actions') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'أدوات الرصيف' : 'Outils Quai & Scan'}>
                  <InspectorQuickActions
                    actions={[
                      {
                        id: 'sort',
                        label: isAr ? 'فرز وتوجيه' : 'Aiguiller Quai',
                        icon: <Check size={16} />,
                        primary: true,
                        onClick: () => handleScanCode(s.trackingCode),
                      },
                      {
                        id: 'barcode',
                        label: isAr ? 'باركود' : 'Étiquette AWB',
                        icon: <Printer size={16} />,
                        onClick: () =>
                          showToast(
                            isAr ? `طباعة ملصق ${s.trackingCode}` : `Étiquette ${s.trackingCode} générée`,
                            'info'
                          ),
                      },
                      {
                        id: 'share',
                        label: isAr ? 'مشاركة' : 'Partager',
                        icon: <Share2 size={16} />,
                        onClick: () =>
                          showToast(
                            isAr ? 'تم نسخ رابط تتبع الشحنة' : `Lien de tracking ${s.trackingCode} copié`,
                            'success'
                          ),
                      },
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'طباعة ملصق الباركود الحراري' : 'Imprimer Étiquette Thermique AWB'}
                    icon={<Printer size={14} />}
                    tone="dark"
                    onClick={() =>
                      showToast(
                        isAr ? `طباعة ملصق ${s.trackingCode}` : `Étiquette ${s.trackingCode} générée`,
                        'info'
                      )
                    }
                  />
                </InspectorSection>
              </>
            );
          }
          return (
            <>
              <InspectorSection index={0} title={isAr ? 'بطاقة المسح' : 'Identification Colis'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label="AWB"
                    value={s.trackingCode}
                    copyText={s.trackingCode}
                    onCopied={() => showToast('AWB copié', 'info')}
                  />
                  <InspectorKeyValue label={isAr ? 'المستلم' : 'Destinataire'} value={s.recipientName} mono={false} />
                  <InspectorKeyValue label="Wilaya" value={s.destinationWilaya} mono={false} />
                  <InspectorKeyValue label={isAr ? 'الوزن' : 'Poids'} value={`${s.weightKg} kg`} isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={1}>
                <InspectorWideButton
                  label={isAr ? 'تأكيد الفرز الفوري' : 'Valider Scan & Aiguiller'}
                  icon={<ScanLine size={14} />}
                  tone="accent"
                  onClick={() => handleScanCode(s.trackingCode)}
                />
              </InspectorSection>
            </>
          );
        }}
      />

      {isSealModalOpen && activeBag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="sq-elev-pop max-w-md w-full">
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-neutral-900 w-full p-6 border border-neutral-200 dark:border-neutral-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <h3 className="font-semibold t-label text-black dark:text-white">
                  {isAr ? 'ختم وإغلاق كيس الشحن (Scellé de Sécurité)' : 'Pose du Scellé de Sécurité'}
                </h3>
              </div>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                onClick={() => setIsSealModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSealActiveBag} className="space-y-4">
              <p className="t-cap text-black/55 dark:text-white/55">
                {isAr
                  ? `أدخل رقم القفل البلاستيكي الفريد لغلق الكيس ${activeBag.bagCode} المتوجه إلى ولاية ${activeBag.destinationHubWilaya}:`
                  : `Veuillez saisir le numéro unique gravé sur le collier de scellé plastique pour le sac ${activeBag.bagCode} :`}
              </p>

              <div>
                <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
                  Numéro de Scellé (Ex: SL-994821)
                </label>
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 [--sq-stroke:#e5e5e5] dark:[--sq-stroke:#404040] focus-within:border-[#d4522f] focus-within:[--sq-stroke:#d4522f]"
                >
                  <input
                    type="text"
                    value={securitySealInput}
                    onChange={(e) => setSecuritySealInput(e.target.value)}
                    placeholder="SL-XXXXXX"
                    className="lbi-field w-full bg-transparent border-0 px-4 py-2 tabular-nums font-semibold t-label text-center outline-hidden"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setIsSealModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit" icon={<ShieldCheck size={14} />}>
                  {isAr ? 'تأكيد الختم الأمني' : 'Verrouiller le Sac'}
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

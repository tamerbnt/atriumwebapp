import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Scale,
  Plus,
  Printer,
  CheckCircle2,
  X,
  Download,
  Edit,
  Pin,
  Save,
  Check,
  Users,
  Coins,
  Minus,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculateWorkerPieceworkWage } from '../../../utils/agriRules';
import { AgriHarvestTicket, AgriDailyPointage } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
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

const extractStr = (v: unknown): string => {
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (v && typeof v === 'object' && 'target' in v) {
    const tgt = (v as { target?: { value?: string } }).target;
    if (tgt && typeof tgt.value === 'string') return tgt.value;
  }
  return String(v ?? '');
};

export const AgricultureHarvestView: React.FC = () => {
  const {
    language,
    currentBusiness,
    currentBranch,
    branches,
    currentUser,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    harvestTickets,
    parcels,
    workers,
    pointages,
    addHarvestTicket,
    updateHarvestTicket,
    deleteHarvestTicket,
    addPointage,
    updatePointage,
  } = useAgricultureData();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [ticketForPrint, setTicketForPrint] = useState<AgriHarvestTicket | null>(null);

  const playTallyBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Ignore audio block in restricted browsers
    }
  }, []);

  const [activeMode, setActiveMode] = useState<'tickets' | 'pointage'>('tickets');
  const [pointageSearch, setPointageSearch] = useState('');
  const [pointageStatusFilter, setPointageStatusFilter] = useState<string>('all');
  const [isPointageModalOpen, setIsPointageModalOpen] = useState(false);
  const [pointageWorkerId, setPointageWorkerId] = useState(workers[0]?.id || 'wrk_01');
  const [pointageParcelId, setPointageParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [pointageCrates, setPointageCrates] = useState('45');
  const [pointageAdvance, setPointageAdvance] = useState('0');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterParcel, setFilterParcel] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['pes_01']));
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<AgriHarvestTicket | null>(null);
  const [parcelId, setParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [crop, setCrop] = useState('Tomates Maraîchères Calibre 1');
  const [vehiclePlate, setVehiclePlate] = useState('00142-126-16');
  const [driverName, setDriverName] = useState('Hakim Benziane');
  const [grossWeight, setGrossWeight] = useState('8000');
  const [tareWeight, setTareWeight] = useState('3200');
  const [cratesCount, setCratesCount] = useState('250');
  const [unitPrice, setUnitPrice] = useState('75');
  const [market, setMarket] = useState('Marché de Gros des Eucalyptus, Alger');

  const [selectedTicket, setSelectedTicket] = useState<AgriHarvestTicket | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ticket');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeTicket = useMemo(() => {
    if (!selectedTicket) return null;
    return harvestTickets.find((t) => t.id === selectedTicket.id) || selectedTicket;
  }, [selectedTicket, harvestTickets]);

  const openCreateModal = useCallback(() => {
    setTicketToEdit(null);
    setParcelId(parcels[0]?.id || 'parc_01');
    setCrop('Tomates Maraîchères Calibre 1');
    setVehiclePlate('00142-126-16');
    setDriverName('Hakim Benziane');
    setGrossWeight('8000');
    setTareWeight('3200');
    setCratesCount('250');
    setUnitPrice('75');
    setMarket('Marché de Gros des Eucalyptus, Alger');
    setIsModalOpen(true);
  }, [parcels]);

  const openEditModal = useCallback((t: AgriHarvestTicket) => {
    setTicketToEdit(t);
    setParcelId(t.parcelId || '');
    setCrop(t.cropDesignation);
    setVehiclePlate(t.vehiclePlate || t.truckPlate || '');
    setDriverName(t.driverName || t.buyerName || '');
    setGrossWeight(String(t.grossWeightKg));
    setTareWeight(String(t.tareWeightKg ?? t.truckTareKg ?? 0));
    setCratesCount(String(t.cratesCount ?? t.crateCount ?? 0));
    setUnitPrice(String(t.unitPriceDzdPerKg));
    setMarket(t.destinationWholesaleMarket);
    setIsModalOpen(true);
  }, []);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossWeight) || 0;
    const tare = parseFloat(tareWeight) || 0;
    const net = Math.max(0, gross - tare);
    const pricePerKg = parseFloat(unitPrice) || 0;
    const totalGross = net * pricePerKg;
    const feePct = 6;
    const netPayout = totalGross - (totalGross * feePct) / 100;
    const cratesNum = parseInt(cratesCount, 10) || 0;

    const payload: AgriHarvestTicket = {
      id: ticketToEdit?.id || `pes_${Date.now()}`,
      accountId: ticketToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: ticketToEdit?.branchId || currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      ticketNumber:
        ticketToEdit?.ticketNumber ||
        `PES-2026-${String(harvestTickets.length + 20).padStart(3, '0')}`,
      buyerName: ticketToEdit?.buyerName || driverName.trim() || 'Mandataire de Gros',
      truckPlate: vehiclePlate.trim(),
      vehiclePlate: vehiclePlate.trim(),
      driverName: driverName.trim(),
      parcelId,
      cropDesignation: crop.trim(),
      grossWeightKg: gross,
      truckTareKg: tare,
      tareWeightKg: tare,
      crateCount: cratesNum,
      cratesCount: cratesNum,
      crateUnitTareKg: 0,
      totalCrateTareKg: 0,
      netWeightKg: net,
      netWeightQuintaux: Math.round((net / 100) * 10) / 10,
      unitPriceDzdPerKg: pricePerKg,
      subtotalProduceDzd: totalGross,
      totalGrossDzd: totalGross,
      mandataireFeePercent: feePct,
      netFarmPayoutDzd: netPayout,
      paymentMethod: ticketToEdit?.paymentMethod || 'cash',
      timbreFiscalDzd: ticketToEdit?.timbreFiscalDzd || 0,
      totalAmountDzd: totalGross,
      paidAmountDzd: netPayout,
      remainingDueDzd: 0,
      destinationWholesaleMarket: market.trim(),
      date: ticketToEdit?.date || new Date().toISOString().split('T')[0],
      createdAt: ticketToEdit?.createdAt || new Date().toISOString(),
    };

    if (ticketToEdit) {
      updateHarvestTicket(payload);
      if (selectedTicket?.id === payload.id) setSelectedTicket(payload);
      showToast(isAr ? 'تم تحديث وصل الوزن' : 'Ticket de pesée mis à jour', 'success');
    } else {
      addHarvestTicket(payload);
      setSelectedTicket(payload);
      showToast(
        isAr ? 'تم تسجيل وتأكيد وصل وزن المحصول' : 'Bon de pesée pont-bascule validé',
        'success'
      );
    }
    setIsModalOpen(false);
  };

  const branchOptions = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    const source = activeMode === 'tickets' ? harvestTickets : pointages;
    source.forEach((rec) => {
      const resolved = resolveRecordBranch(rec, branchesById, currentBranch, language);
      const prev = counts.get(resolved.id);
      counts.set(resolved.id, {
        id: resolved.id,
        name: resolved.name,
        count: (prev?.count || 0) + 1,
      });
    });
    return [
      { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All' : 'Toutes', count: source.length },
      ...Array.from(counts.values()).map((b) => ({
        value: b.id,
        label: b.name,
        count: b.count,
      })),
    ];
  }, [activeMode, harvestTickets, pointages, branchesById, currentBranch, language, isAr, isEn]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return harvestTickets.filter((t) => {
      if (filterParcel !== 'all' && t.parcelId !== filterParcel) return false;
      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(t, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }
      if (q) {
        const matchesNum = t.ticketNumber.toLowerCase().includes(q);
        const matchesCrop = t.cropDesignation.toLowerCase().includes(q);
        const matchesMarket = t.destinationWholesaleMarket.toLowerCase().includes(q);
        const matchesDriver = (t.driverName || t.buyerName || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesCrop && !matchesMarket && !matchesDriver) return false;
      }
      return true;
    });
  }, [
    harvestTickets,
    filterParcel,
    branchFilter,
    branchesById,
    currentBranch,
    language,
    searchQuery,
  ]);

  const sortedTickets = useMemo(() => {
    const arr = [...filteredTickets];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortBy === 'ticketNumber') return a.ticketNumber.localeCompare(b.ticketNumber) * dir;
      if (sortBy === 'cropDesignation') return a.cropDesignation.localeCompare(b.cropDesignation) * dir;
      if (sortBy === 'netWeightKg') return (a.netWeightKg - b.netWeightKg) * dir;
      if (sortBy === 'netFarmPayoutDzd') {
        return (
          ((a.netFarmPayoutDzd ?? a.paidAmountDzd ?? 0) -
            (b.netFarmPayoutDzd ?? b.paidAmountDzd ?? 0)) *
          dir
        );
      }
      if (sortBy === 'destinationWholesaleMarket') {
        return a.destinationWholesaleMarket.localeCompare(b.destinationWholesaleMarket) * dir;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * dir;
      }
      return a.date.localeCompare(b.date) * dir;
    });
    return arr;
  }, [filteredTickets, sortBy, sortDir, pinnedIds, branchesById, currentBranch, language]);

  const totalNetKg = useMemo(
    () => sortedTickets.reduce((acc, t) => acc + t.netWeightKg, 0),
    [sortedTickets]
  );
  const totalNetPayout = useMemo(
    () => sortedTickets.reduce((acc, t) => acc + (t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0), 0),
    [sortedTickets]
  );

  const handlePin = useCallback(
    (t: AgriHarvestTicket) => {
      const wasPinned = pinnedIds.has(t.id);
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(t.id)) next.delete(t.id);
        else next.add(t.id);
        return next;
      });
      showToast(
        wasPinned
          ? isAr ? 'تم إلغاء التثبيت' : 'Ticket désépinglé'
          : isAr ? 'تم تثبيت الوصل' : 'Ticket épinglé',
        'info'
      );
    },
    [pinnedIds, isAr]
  );

  const handleDelete = useCallback(
    (t: AgriHarvestTicket) => {
      deleteHarvestTicket(t.id);
      if (selectedTicket?.id === t.id) setSelectedTicket(null);
      showToast(isAr ? 'تم حذف وصل الوزن' : 'Ticket de pesée supprimé', 'success');
    },
    [deleteHarvestTicket, selectedTicket, isAr]
  );

  const handlePrintTicket = useCallback((t: AgriHarvestTicket) => {
    setTicketForPrint(t);
    setIsPrintModalOpen(true);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (activeMode === 'tickets') {
      const headers = [
        'N° Ticket',
        'Culture',
        'Date',
        'Agence / Domaine',
        'Poids Brut Kg',
        'Tare Kg',
        'Poids Net Kg',
        'Caisses',
        'Prix/Kg DZD',
        'Total Brut DZD',
        'Net Domaine DZD',
        'Chauffeur',
        'Marché',
      ];
      const rows = sortedTickets.map((t) => [
        t.ticketNumber,
        t.cropDesignation,
        t.date,
        resolveRecordBranch(t, branchesById, currentBranch, language).name,
        t.grossWeightKg,
        t.tareWeightKg ?? t.truckTareKg ?? 0,
        t.netWeightKg,
        t.cratesCount ?? t.crateCount ?? 0,
        t.unitPriceDzdPerKg,
        t.totalGrossDzd ?? t.subtotalProduceDzd ?? 0,
        t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0,
        t.driverName || t.buyerName || '',
        t.destinationWholesaleMarket,
      ]);
      downloadCsvSafe(
        `pesee_recolte_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );
    } else {
      const headers = [
        'Ouvrier',
        'Parcelle',
        'Date',
        'Caisses',
        'Brut DZD',
        'Acompte DZD',
        'Net Dû DZD',
        'Statut',
      ];
      const rows = pointages.map((p) => [
        p.workerName,
        p.parcelName || p.parcelId,
        p.date,
        p.cratesCollected,
        p.calculatedWageDzd,
        p.cashAdvancePaidDzd,
        p.netDueDzd,
        p.isPaid ? 'Payé' : 'À payer',
      ]);
      downloadCsvSafe(
        `pointage_tacherons_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );
    }
    showToast(isAr ? 'تم تصدير ملف CSV' : 'Export CSV généré', 'info');
  }, [activeMode, sortedTickets, pointages, branchesById, currentBranch, language, isAr]);

  const handleSaveNotes = useCallback(() => {
    if (!activeTicket) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات الشحنة' : 'Mentions enregistrées', 'success');
  }, [activeTicket, isAr]);

  const handleIncrementCrates = useCallback(
    (p: AgriDailyPointage, delta: number) => {
      playTallyBeep();
      const newCrates = Math.max(0, p.cratesCollected + delta);
      const pieceRate = workers.find((w) => w.id === p.workerId)?.defaultPieceRateDzd || 40;
      const { grossWageDzd, netDueDzd } = calculateWorkerPieceworkWage(
        newCrates,
        pieceRate,
        p.cashAdvancePaidDzd
      );
      updatePointage({
        ...p,
        cratesCollected: newCrates,
        calculatedWageDzd: grossWageDzd,
        netDueDzd,
      });
    },
    [playTallyBeep, workers, updatePointage]
  );

  const handleUpdateAdvance = useCallback(
    (p: AgriDailyPointage, deltaAdvance: number) => {
      const newAdvance = Math.max(0, p.cashAdvancePaidDzd + deltaAdvance);
      const pieceRate = workers.find((w) => w.id === p.workerId)?.defaultPieceRateDzd || 40;
      const { grossWageDzd, netDueDzd } = calculateWorkerPieceworkWage(
        p.cratesCollected,
        pieceRate,
        newAdvance
      );
      updatePointage({
        ...p,
        cashAdvancePaidDzd: newAdvance,
        calculatedWageDzd: grossWageDzd,
        netDueDzd,
      });
      showToast(
        isAr
          ? `تم تحديث تسبيق العامل: ${formatMoney(newAdvance, language)}`
          : `Acompte mis à jour : ${formatMoney(newAdvance, language)}`,
        'info'
      );
    },
    [workers, updatePointage, isAr, language]
  );

  const handlePayPointage = useCallback(
    (p: AgriDailyPointage) => {
      updatePointage({
        ...p,
        isPaid: true,
        paidAt: new Date().toISOString(),
      });
      showToast(
        isAr
          ? `تم تسديد مستحقات ${p.workerName} (${formatMoney(p.netDueDzd, language)}) نقداً`
          : `Règlement espèces effectué : ${formatMoney(p.netDueDzd, language)} à ${p.workerName}`,
        'success'
      );
    },
    [updatePointage, isAr, language]
  );

  const handleSavePointage = (e: React.FormEvent) => {
    e.preventDefault();
    const worker = workers.find((w) => w.id === pointageWorkerId);
    const parcel = parcels.find((pr) => pr.id === pointageParcelId);
    const crates = parseInt(pointageCrates, 10) || 0;
    const advance = parseFloat(pointageAdvance) || 0;
    const pieceRate = worker?.defaultPieceRateDzd || 40;
    const { grossWageDzd, netDueDzd } = calculateWorkerPieceworkWage(crates, pieceRate, advance);
    const newPnt: AgriDailyPointage = {
      id: `pnt_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      workerId: worker?.id || 'wrk_01',
      workerName: worker?.fullName || 'Ouvrier Saisonnier',
      parcelId: parcel?.id || 'parc_01',
      parcelName: parcel?.name || 'Parcelle',
      date: new Date().toISOString().split('T')[0],
      cratesCollected: crates,
      calculatedWageDzd: grossWageDzd,
      cashAdvancePaidDzd: advance,
      netDueDzd,
      isPaid: false,
      supervisorStaffId: currentUser?.id || 'staff_01',
      createdAt: new Date().toISOString(),
    };
    addPointage(newPnt);
    playTallyBeep();
    setIsPointageModalOpen(false);
    showToast(
      isAr
        ? `تم تسجيل حضور وجني ${worker?.fullName || 'العامل'}`
        : `Pointage enregistré pour ${worker?.fullName || "l'ouvrier"}`,
      'success'
    );
  };

  const filteredPointages = useMemo(() => {
    const q = pointageSearch.trim().toLowerCase();
    return pointages.filter((p) => {
      if (pointageStatusFilter === 'paid' && !p.isPaid) return false;
      if (pointageStatusFilter === 'unpaid' && p.isPaid) return false;
      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(p, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }
      if (q) {
        return (
          p.workerName.toLowerCase().includes(q) ||
          (p.parcelName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    pointages,
    pointageStatusFilter,
    branchFilter,
    branchesById,
    currentBranch,
    language,
    pointageSearch,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterParcel !== 'all') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [filterParcel, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterParcel !== 'all') {
      const pName = parcels.find((p) => p.id === filterParcel)?.name || filterParcel;
      chips.push({
        key: 'parcel',
        label: `${isAr ? 'القطعة' : 'Parcelle'}: ${pName}`,
        onRemove: () => setFilterParcel('all'),
      });
    }
    if (branchFilter !== 'All') {
      const bName = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : 'Site'}: ${bName}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [filterParcel, branchFilter, parcels, branchOptions, isAr]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setPointageSearch('');
    setFilterParcel('all');
    setPointageStatusFilter('all');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'parcel',
        kind: 'tiles',
        label: isAr ? 'القطعة الفلاحية' : isEn ? 'Parcel' : 'Parcelle Cadastrale',
        value: filterParcel,
        onChange: setFilterParcel,
        resetValue: 'all',
        options: [
          { value: 'all', label: isAr ? 'كل القطع' : 'Toutes parcelles', count: harvestTickets.length },
          ...parcels.map((p) => ({
            value: p.id,
            label: `${p.code || 'P'} - ${p.name}`,
            count: harvestTickets.filter((t) => t.parcelId === p.id).length,
          })),
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'المزرعة / الفرع' : isEn ? 'Branch / Estate' : 'Exploitation / Domaine',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, filterParcel, branchFilter, harvestTickets, parcels, branchOptions]
  );

  const columns: ColumnDefinition<AgriHarvestTicket>[] = useMemo(
    () => [
      {
        key: 'ticketNumber',
        header: isAr ? 'رقم الوصل' : 'N° Ticket',
        width: '1.3*',
        sortable: true,
        renderCell: (t) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              <Scale size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black dark:text-white flex items-center gap-1.5">
                {t.ticketNumber}
                {pinnedIds.has(t.id) && (
                  <Pin size={10} className="fill-[#d4522f] text-[#d4522f] shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55">{t.date}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'cropDesignation',
        header: isAr ? 'المحصول والشاحنة' : 'Culture & Transport',
        width: '2*',
        sortable: true,
        renderCell: (t) => (
          <div className="min-w-0">
            <div className="font-semibold text-xs text-black dark:text-white truncate">
              {t.cropDesignation}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 font-mono truncate">
              {t.vehiclePlate || t.truckPlate} • {t.driverName}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Domaine',
        width: '1.1*',
        sortable: true,
        renderCell: (t) => (
          <span className="text-xs text-black/65 dark:text-white/70 truncate block">
            {resolveRecordBranch(t, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'netWeightKg',
        header: isAr ? 'الوزن الصافي' : 'Poids Net',
        width: '1.2*',
        sortable: true,
        renderCell: (t) => (
          <div>
            <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
              {t.netWeightKg.toLocaleString()} Kg
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55">
              {t.cratesCount ?? t.crateCount ?? 0} caisses
            </div>
          </div>
        ),
      },
      {
        key: 'netFarmPayoutDzd',
        header: isAr ? 'الصافي للمستثمرة' : 'Net Domaine DZD',
        width: '1.4*',
        sortable: true,
        renderCell: (t) => (
          <div>
            <div className="font-mono font-bold text-xs text-black dark:text-white">
              {formatMoney(t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0, language)}
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55">
              PU: {t.unitPriceDzdPerKg} DZD/Kg
            </div>
          </div>
        ),
      },
      {
        key: 'destinationWholesaleMarket',
        header: isAr ? 'سوق الجملة' : 'Destination',
        width: '1.5*',
        sortable: true,
        renderCell: (t) => (
          <div className="text-xs text-black/70 dark:text-white/75 truncate">
            {t.destinationWholesaleMarket}
          </div>
        ),
      },
    ],
    [isAr, isEn, pinnedIds, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: harvestTickets.length > 0 || pointages.length > 0,
  });

  if (
    showSkeleton &&
    ((harvestTickets.length === 0 && pointages.length === 0) ||
      networkMode === 'force_skeleton')
  ) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.4*', minWidth: '130px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.4*', minWidth: '130px' },
          { width: '1.5*', minWidth: '140px' },
        ]}
        viewMode="list"
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
        icon={activeMode === 'tickets' ? <Scale size={22} /> : <Users size={22} />}
        title={
          activeMode === 'tickets'
            ? isAr
              ? 'الحصاد'
              : isEn
              ? 'Harvest'
              : 'Récoltes'
            : isAr
            ? 'العمال'
            : isEn
            ? 'Attendance'
            : 'Pointage'
        }
        subtitle={
          activeMode === 'tickets'
            ? `${sortedTickets.length} ${isAr ? 'وصولات وزن' : 'bons pont-bascule'}`
            : `${pointages.length} ${isAr ? 'عمال موسميين' : 'tâcherons actifs'}`
        }
        primaryAction={{
          label:
            activeMode === 'tickets'
              ? isAr
                ? 'وصل وزن جديد'
                : 'Nouveau Bon de Pesée'
              : isAr
              ? 'تسجيل حضور / جني'
              : 'Pointer un Ouvrier',
          onClick:
            activeMode === 'tickets' ? openCreateModal : () => setIsPointageModalOpen(true),
          icon: <Plus size={14} />,
          dataAction: activeMode === 'tickets' ? 'add-weighbridge' : 'add-pointage',
        }}
      />

      {activeMode === 'tickets' ? (
        <ScreenKpiBanner
          heading={
            isAr
              ? 'إحصائيات الشحن والإنتاج المباع'
              : isEn
              ? 'Weighbridge Tonnage & Receipts'
              : 'Tonnage Expédié & Recettes Agricoles'
          }
          language={language}
          primaryCard={{
            label: isAr ? 'الحمولة الصافية الإجمالية' : 'Tonnage Net Sorti',
            badgeText: 'Tonnes',
            count: Math.round(totalNetKg / 100),
            formatValue: (v) => `${(v / 10).toFixed(1)} t`,
            tone: 'emerald',
          }}
          secondaryCard={{
            label: isAr ? 'شحنات منقولة للأسواق' : 'Rotations Camion Validées',
            badgeText: isAr ? 'وصل قبان' : 'Bons Pesée',
            count: sortedTickets.length,
            tone: 'terracotta',
          }}
          darkCard={{
            label: isAr ? 'صافي مداخيل الجني' : 'Recettes Nettes Domaine',
            badgeCount: 6,
            badgePrefix: 'Com. ',
            badgeSuffix: '%',
            valueCount: Math.round(totalNetPayout),
            valuePrefix: '',
            formatValue: (v) => formatMoney(v, language),
            caption: isAr ? 'بعد خصم عمولة الوكيل 6%' : 'Marché de Gros · Commission 6% déduite',
          }}
        />
      ) : (
        <ScreenKpiBanner
          heading={
            isAr
              ? 'مؤشرات جني المحصول ودفتر حضور التاشرون'
              : 'Indicateurs de Récolte & Pointage des Tâcherons'
          }
          language={language}
          primaryCard={{
            label: isAr ? 'العمال الميدانيون الحاضرون' : 'Ouvriers & Tâcherons Actifs',
            badgeText: isAr ? 'في الحقل' : 'En Rangs',
            count: pointages.length,
            tone: 'emerald',
            isActive: pointageStatusFilter === 'all',
            onToggle: () => setPointageStatusFilter('all'),
          }}
          secondaryCard={{
            label: isAr ? 'إجمالي الصناديق المجنية' : 'Total Caisses Récoltées',
            badgeText: isAr ? 'صندوق' : 'Caisses',
            count: pointages.reduce((sum, p) => sum + p.cratesCollected, 0),
            tone: 'terracotta',
            isActive: pointageStatusFilter === 'unpaid',
            onToggle: () =>
              setPointageStatusFilter((prev) => (prev === 'unpaid' ? 'all' : 'unpaid')),
          }}
          darkCard={{
            label: isAr ? 'صافي مستحقات اليد العاملة' : 'Masse Salariale Nette Due',
            badgeCount: pointages.filter((p) => !p.isPaid).length,
            badgePrefix: '',
            badgeSuffix: isAr ? 'معلق' : 'à régler',
            valueCount: Math.round(
              pointages.reduce((sum, p) => sum + (p.isPaid ? 0 : p.netDueDzd), 0)
            ),
            valuePrefix: '',
            formatValue: (v) => formatMoney(v, language),
            caption: isAr ? 'أجور في انتظار الصرف نقداً' : 'Muster Pay · Soldes caisse à verser',
          }}
        />
      )}

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            activeMode === 'tickets'
              ? isAr
                ? 'سجل وصولات الجني والوزن (بونت باسكول)'
                : 'Bons de Pesée Pont-Bascule & Expéditions'
              : isAr
              ? 'جدول حضور ومردودية العمال (Muster Roll)'
              : "Registre d'Appel & Rendement des Tâcherons"
          }
          liveRegionText={`${
            activeMode === 'tickets' ? sortedTickets.length : filteredPointages.length
          } ${isAr ? 'سجل' : 'entrées'}`}
          language={language}
          searchQuery={activeMode === 'tickets' ? searchQuery : pointageSearch}
          onSearchChange={activeMode === 'tickets' ? setSearchQuery : setPointageSearch}
          searchPlaceholder={
            activeMode === 'tickets'
              ? isAr
                ? 'بحث برقم الوصل، المحصول، الشاحنة...'
                : 'Rechercher N° ticket, culture, chauffeur...'
              : isAr
              ? 'بحث باسم العامل، القطعة...'
              : 'Rechercher ouvrier, parcelle...'
          }
          statusOptions={
            activeMode === 'pointage'
              ? [
                  { value: 'all', label: isAr ? 'الكل' : 'Tous', count: pointages.length },
                  {
                    value: 'unpaid',
                    label: isAr ? 'معلق' : 'À régler',
                    count: pointages.filter((p) => !p.isPaid).length,
                  },
                  {
                    value: 'paid',
                    label: isAr ? 'مسدد' : 'Réglés',
                    count: pointages.filter((p) => p.isPaid).length,
                  },
                ]
              : undefined
          }
          statusValue={activeMode === 'pointage' ? pointageStatusFilter : undefined}
          onStatusChange={activeMode === 'pointage' ? setPointageStatusFilter : undefined}
          extraTrailingControls={
            <LiveSegmentedControl
              value={activeMode}
              onValueChange={(val) => setActiveMode(val as 'tickets' | 'pointage')}
              size="md"
              options={[
                {
                  id: 'tickets',
                  value: 'tickets',
                  label: isAr ? 'الوزن' : 'Pesées',
                  count: sortedTickets.length,
                },
                {
                  id: 'pointage',
                  value: 'pointage',
                  label: isAr ? 'الحضور' : 'Pointage',
                  count: pointages.length,
                },
              ]}
            />
          }
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={activeMode === 'tickets'}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        {activeMode === 'tickets' ? (
          <UniversalDataCollection<AgriHarvestTicket>
            hideToolbar
            data={sortedTickets}
            columns={columns}
            keyExtractor={(t) => t.id}
            defaultViewMode={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkSecondaryAction={{
              label: isAr ? 'تصدير وصولات الوزن' : 'Exporter Bons',
              icon: <Download size={14} />,
              onClick: () => handleExportCsv(),
            }}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteHarvestTicket(id));
              setSelectedIds(new Set<string>());
              if (selectedTicket && ids.has(selectedTicket.id)) setSelectedTicket(null);
              showToast(isAr ? 'تم حذف وصولات الوزن المحددة' : 'Bons de pesée supprimés', 'success');
            }}
            isPinned={(t) => pinnedIds.has(t.id)}
            onTogglePin={handlePin}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            openItemId={activeTicket?.id || null}
            onItemClick={(t, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedTicket(t);
              setActiveTab('ticket');
            }}
            onViewDetails={(t, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedTicket(t);
              setActiveTab('ticket');
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyTitle={isAr ? 'لا توجد وصولات وزن' : 'Aucun bon de pesée trouvé'}
            emptyDescription={
              searchQuery
                ? isAr
                  ? 'لا توجد نتائج مطابقة لبحثك'
                  : 'Aucun ticket ne correspond à votre recherche'
                : isAr
                ? 'قم بتسجيل أول حمولة محصول'
                : 'Enregistrez votre première pesée camion'
            }
            primaryActionLabel={isAr ? 'وصل وزن جديد' : 'Nouveau Bon'}
            onAddFirstItem={openCreateModal}
            onResetFilters={resetAllFilters}
            hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
            customActions={(t) => [
              {
                id: 'print',
                label: isAr ? 'طباعة الوصل' : 'Imprimer Bon',
                icon: <Printer size={14} />,
                onClick: () => handlePrintTicket(t),
              },
            ]}
            renderCard={(t) => (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2.5 py-1 rounded-lg border border-[#d4522f]/20">
                    {t.ticketNumber}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t.netWeightKg.toLocaleString()} Kg
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                    {t.cropDesignation}
                  </h3>
                  <div className="text-xs text-black/55 dark:text-white/55 font-medium mt-0.5">
                    {t.vehiclePlate || t.truckPlate} • {t.driverName}
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider">
                      Net Domaine
                    </div>
                    <div className="font-mono font-bold text-black dark:text-white mt-0.5">
                      {formatMoney(t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0, language)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider">
                      Date
                    </div>
                    <div className="font-mono text-black/70 dark:text-white/75 mt-0.5">
                      {t.date}
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPointages.map((p) => {
              const worker = workers.find((w) => w.id === p.workerId);
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-black dark:text-white flex items-center gap-1.5">
                        <Users size={14} className="text-[#d4522f]" />
                        {p.workerName}
                      </div>
                      <div className="text-[11px] text-black/55 dark:text-white/55 font-mono mt-0.5">
                        NIN: {worker?.ninOrIdCard || 'Non renseigné'} · {p.parcelName}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {p.isPaid ? (isAr ? 'تم الصرف ✓' : 'Réglé ✓') : isAr ? 'مستحق' : 'À payer'}
                    </span>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-black/55 dark:text-white/55 font-medium">
                        {isAr ? 'الصناديق المجنية :' : 'Caisses pointées :'}
                      </span>
                      <span className="font-mono font-black text-lg text-black dark:text-white">
                        {p.cratesCollected}{' '}
                        <span className="text-xs font-normal text-black/55 dark:text-white/55">
                          caisses
                        </span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleIncrementCrates(p, -1)}
                        className="py-1.5 px-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center gap-1 text-black/70 dark:text-white/75 transition-colors cursor-pointer"
                      >
                        <Minus size={12} /> 1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIncrementCrates(p, 1)}
                        className="py-1.5 px-2 bg-[#d4522f]/10 border border-[#d4522f]/30 text-[#d4522f] rounded-lg text-xs font-bold hover:bg-[#d4522f]/20 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIncrementCrates(p, 5)}
                        className="py-1.5 px-2 bg-[#d4522f] text-white rounded-lg text-xs font-bold hover:bg-[#b06a4e] flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-black/70 dark:text-white/75">
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">
                        Rémunération brute ({worker?.defaultPieceRateDzd || 40} DA/caisse):
                      </span>
                      <span className="font-mono font-semibold">
                        {formatMoney(p.calculatedWageDzd, language)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                      <span>Acompte perçu:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold">
                          -{formatMoney(p.cashAdvancePaidDzd, language)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateAdvance(p, 500)}
                          className="px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700 cursor-pointer"
                        >
                          +500
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 font-bold text-black dark:text-white">
                      <span>Net à verser:</span>
                      <span className="font-mono text-sm text-[#d4522f]">
                        {formatMoney(p.netDueDzd, language)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    {p.isPaid ? (
                      <div className="w-full py-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} />{' '}
                        {isAr ? 'تم تسليم الأجر نقداً' : 'Payé en espèces (Caisse)'}
                      </div>
                    ) : (
                      <AtriumButton
                        variant="primary"
                        size="sm"
                        className="w-full justify-center"
                        icon={<Coins size={14} />}
                        onClick={() => handlePayPointage(p)}
                      >
                        {isAr
                          ? `صرف الصافي (${formatMoney(p.netDueDzd, language)})`
                          : `Régler ${formatMoney(p.netDueDzd, language)}`}
                      </AtriumButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={activeMode === 'tickets' ? sortedTickets.length : filteredPointages.length}
        entityPluralLabel={activeMode === 'tickets' ? (isAr ? 'وصولات' : 'bons') : (isAr ? 'عمال' : 'ouvriers')}
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
        subtitle={activeTicket?.cropDesignation}
        avatarText={(activeTicket?.ticketNumber || 'PB').slice(-2)}
        branchName={
          activeTicket
            ? resolveRecordBranch(activeTicket, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={isAr ? 'وزن معتمد' : 'Pesée Validée'}
        statusClassName="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
        tabs={[
          { id: 'ticket', label: isAr ? 'البيانات' : 'Fiche Pesée' },
          { id: 'pesee', label: isAr ? 'الأوزان' : 'Tonnage' },
          { id: 'finance', label: isAr ? 'المالية' : 'Finance' },
          { id: 'notes', label: isAr ? 'الملاحظات' : 'Mentions' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(t) => setSelectedTicket(t)}
        onClose={() => setSelectedTicket(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(ticket, tab) => (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                variant="outline"
                size="sm"
                onClick={() => handlePrintTicket(ticket)}
                icon={<Printer size={13} />}
              >
                {isAr ? 'طباعة الوصل' : 'Imprimer'}
              </AtriumButton>
              <AtriumButton
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(ticket)}
                icon={<Edit size={13} />}
              >
                {isAr ? 'تعديل' : 'Modifier'}
              </AtriumButton>
            </div>

            {tab === 'ticket' && (
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Chauffeur:</span>
                    <span className="font-semibold text-black dark:text-white">
                      {ticket.driverName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Véhicule:</span>
                    <span className="font-mono font-bold text-[#d4522f]">
                      {ticket.vehiclePlate || ticket.truckPlate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Destination:</span>
                    <span className="font-semibold text-black dark:text-white truncate max-w-[200px]">
                      {ticket.destinationWholesaleMarket}
                    </span>
                  </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Date d&apos;émission:</span>
                    <span className="font-mono text-black dark:text-white">{ticket.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Nombre de caisses:</span>
                    <span className="font-mono text-black dark:text-white font-semibold">
                      {ticket.cratesCount ?? ticket.crateCount ?? 0} unités
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'pesee' && (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">
                    Poids Brut (Camion + Charge):
                  </span>
                  <span className="font-mono font-semibold text-black dark:text-white">
                    {ticket.grossWeightKg.toLocaleString()} Kg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">Tare Camion à vide:</span>
                  <span className="font-mono font-semibold text-black dark:text-white">
                    {(ticket.tareWeightKg ?? ticket.truckTareKg ?? 0).toLocaleString()} Kg
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-black/70 dark:text-white/75 font-bold">
                    Poids Net Marchandise:
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {ticket.netWeightKg.toLocaleString()} Kg
                  </span>
                </div>
              </div>
            )}

            {tab === 'finance' && (
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">Prix unitaire au Kg:</span>
                  <span className="font-mono font-semibold text-black dark:text-white">
                    {ticket.unitPriceDzdPerKg} DZD / Kg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">Total Brut Gros:</span>
                  <span className="font-mono text-black dark:text-white font-semibold">
                    {formatMoney(ticket.totalGrossDzd ?? ticket.subtotalProduceDzd ?? 0, language)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-black/55 dark:text-white/55">
                    Commission Mandataire ({ticket.mandataireFeePercent || 0}%):
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    -{' '}
                    {formatMoney(
                      ((ticket.totalGrossDzd ?? ticket.subtotalProduceDzd ?? 0) *
                        (ticket.mandataireFeePercent || 0)) /
                        100,
                      language
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-black/70 dark:text-white/75 font-bold">
                    Net à Payer Domaine:
                  </span>
                  <span className="font-mono font-bold text-[#d4522f] text-sm">
                    {formatMoney(ticket.netFarmPayoutDzd ?? ticket.paidAmountDzd ?? 0, language)}
                  </span>
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 text-xs">
                <p className="text-black/55 dark:text-white/55 text-[11px]">
                  Observations qualité (degré Brix, fermeté, triage) et décharge de livraison :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter le calibre des fruits, l'heure de départ du domaine..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-1 focus:ring-[#d4522f] outline-hidden resize-none"
                />
                <AtriumButton
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={handleSaveNotes}
                  icon={noteSaved ? <Check size={14} /> : <Save size={14} />}
                >
                  {noteSaved ? (isAr ? 'تم الحفظ' : 'Mentions enregistrées') : isAr ? 'حفظ' : 'Enregistrer'}
                </AtriumButton>
              </div>
            )}
          </div>
        )}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold">
                  <Scale size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {ticketToEdit
                      ? isAr
                        ? 'تعديل وصل وزن المحصول'
                        : 'Modifier le Bon de Pesée'
                      : isAr
                      ? 'تسجيل وصل وزن قبان جديد'
                      : 'Nouveau Bon de Pesée Pont-Bascule'}
                  </h2>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    {isAr
                      ? 'قياس الحمولة الصافية والأسعار للطن'
                      : 'Calcul automatique du poids net et net domaine'}
                  </p>
                </div>
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
              <LabelSelect
                label={isAr ? 'القطعة الفلاحية المصدر' : "Parcelle d'Origine"}
                value={parcelId}
                onChange={(v) => setParcelId(extractStr(v))}
                options={parcels.map((p) => ({ value: p.id, label: p.name }))}
              />
              <LabelInput
                label={isAr ? 'تعيين المحصول / الصنف *' : 'Désignation du Produit / Calibre *'}
                placeholder="Ex: Tomates Industrielles Calibre 1"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رقم ترقيم الشاحنة' : 'Immatriculation Camion'}
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'اسم السائق' : 'Nom du Chauffeur'}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  label={isAr ? 'الوزن القائم (كغ)' : 'Poids Brut (Kg)'}
                  type="number"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'الوزن الفارغ (كغ)' : 'Tare Camion (Kg)'}
                  type="number"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'عدد الصناديق' : 'Nb Caisses'}
                  type="number"
                  value={cratesCount}
                  onChange={(e) => setCratesCount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'سعر الكيلوغرام (دج)' : 'Prix Unitaire DZD / Kg'}
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'سوق الجملة / المشتري' : 'Destination / Marché'}
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} type="button">
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {ticketToEdit
                    ? isAr
                      ? 'حفظ التعديلات'
                      : 'Enregistrer'
                    : isAr
                    ? 'تأكيد وصل الوزن'
                    : 'Valider la Pesée'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPointageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {isAr ? 'تسجيل حضور وجني لعامل' : 'Pointer un Ouvrier Saisonnier'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                onClick={() => setIsPointageModalOpen(false)}
                className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePointage} className="space-y-4">
              <LabelSelect
                label={isAr ? 'العامل السيزوني / التاشرون' : 'Ouvrier / Tâcheron'}
                value={pointageWorkerId}
                onChange={(v) => setPointageWorkerId(extractStr(v))}
                options={workers.map((w) => ({
                  value: w.id,
                  label: `${w.fullName} (${w.defaultPieceRateDzd || 40} DA/caisse)`,
                }))}
              />
              <LabelSelect
                label={isAr ? 'القطعة الفلاحية' : "Parcelle d'Assignation"}
                value={pointageParcelId}
                onChange={(v) => setPointageParcelId(extractStr(v))}
                options={parcels.map((pr) => ({
                  value: pr.id,
                  label: pr.name,
                }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'عدد الصناديق الأولية' : 'Nombre de Caisses'}
                  type="number"
                  value={pointageCrates}
                  onChange={(e) => setPointageCrates(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'تسبيق نقدي (دج)' : 'Acompte Espèces (DZD)'}
                  type="number"
                  value={pointageAdvance}
                  onChange={(e) => setPointageAdvance(e.target.value)}
                />
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Rémunération calculée :</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {formatMoney((parseInt(pointageCrates, 10) || 0) * 40, language)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Acompte déduit :</span>
                  <span className="font-mono font-semibold">
                    -{formatMoney(parseFloat(pointageAdvance) || 0, language)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[#d4522f] pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <span>Solde net dû :</span>
                  <span className="font-mono">
                    {formatMoney(
                      Math.max(
                        0,
                        (parseInt(pointageCrates, 10) || 0) * 40 -
                          (parseFloat(pointageAdvance) || 0)
                      ),
                      language
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setIsPointageModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'تأكيد التسجيل' : 'Enregistrer le Pointage'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <AgriWeighbridgePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        ticket={ticketForPrint}
      />
    </div>
  );
};

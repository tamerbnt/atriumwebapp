import React, { useState, useMemo } from 'react';
import {
  Scale,
  Plus,
  Printer,
  Truck,
  DollarSign,
  CheckCircle2,
  X,
  Download,
  Trash2,
  Edit,
  Pin,
  Save,
  Check,
  Send,
  AlertTriangle,
  Package,
  Layers,
  MapPin,
  Users,
  UserCheck,
  Coins,
  Timer,
  Minus,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculateWorkerPieceworkWage } from '../../../utils/agriRules';
import { AgriHarvestTicket, AgriDailyPointage, AgriWorker } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AgriWeighbridgePrintModal } from './AgriWeighbridgePrintModal';

export const AgricultureHarvestView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [ticketForPrint, setTicketForPrint] = useState<AgriHarvestTicket | null>(null);

  const playTallyBeep = () => {
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
    } catch {}
  };
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
    deletePointage,
  } = useAgricultureData();

  const [activeMode, setActiveMode] = useState<'tickets' | 'pointage'>('tickets');
  const [pointageSearch, setPointageSearch] = useState('');
  const [pointageStatusFilter, setPointageStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [isPointageModalOpen, setIsPointageModalOpen] = useState(false);
  const [pointageWorkerId, setPointageWorkerId] = useState(workers[0]?.id || 'wrk_01');
  const [pointageParcelId, setPointageParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [pointageCrates, setPointageCrates] = useState('45');
  const [pointageAdvance, setPointageAdvance] = useState('0');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterParcel, setFilterParcel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['pes_01']));
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<AgriHarvestTicket | null>(null);

  // Form states inside Modal
  const [parcelId, setParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [crop, setCrop] = useState('Tomates Maraîchères Calibre 1');
  const [vehiclePlate, setVehiclePlate] = useState('00142-126-16');
  const [driverName, setDriverName] = useState('Hakim Benziane');
  const [grossWeight, setGrossWeight] = useState('8000');
  const [tareWeight, setTareWeight] = useState('3200');
  const [cratesCount, setCratesCount] = useState('250');
  const [unitPrice, setUnitPrice] = useState('75');
  const [market, setMarket] = useState('Marché de Gros des Eucalyptus, Alger');

  // 390px Inline Side Inspector
  const [selectedTicket, setSelectedTicket] = useState<AgriHarvestTicket | null>(() => {
    return harvestTickets[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'ticket' | 'pesee' | 'finance' | 'notes'>('ticket');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const openCreateModal = () => {
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
  };

  const openEditModal = (t: AgriHarvestTicket) => {
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
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossWeight) || 0;
    const tare = parseFloat(tareWeight) || 0;
    const net = Math.max(0, gross - tare);
    const pricePerKg = parseFloat(unitPrice) || 0;
    const totalGross = net * pricePerKg;
    const feePct = 6;
    const feeAmount = (totalGross * feePct) / 100;
    const netPayout = totalGross - feeAmount;

    const payload: AgriHarvestTicket = {
      id: ticketToEdit?.id || `pes_${Date.now()}`,
      accountId: ticketToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      ticketNumber: ticketToEdit?.ticketNumber || `PES-2026-${String(harvestTickets.length + 20).padStart(3, '0')}`,
      buyerName: ticketToEdit?.buyerName || driverName.trim() || 'Mandataire de Gros',
      truckPlate: vehiclePlate.trim(),
      vehiclePlate: vehiclePlate.trim(),
      driverName: driverName.trim(),
      parcelId,
      cropDesignation: crop.trim(),
      grossWeightKg: gross,
      truckTareKg: tare,
      tareWeightKg: tare,
      crateCount: parseInt(cratesCount, 10) || 0,
      cratesCount: parseInt(cratesCount, 10) || 0,
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
      showToast(isAr ? 'تم تسجيل وتأكيد وصل وزن المحصول' : 'Bon de pesée pont-bascule validé', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredTickets = useMemo(() => {
    return harvestTickets.filter((t) => {
      if (filterParcel !== 'all' && t.parcelId !== filterParcel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = t.ticketNumber.toLowerCase().includes(q);
        const matchesCrop = t.cropDesignation.toLowerCase().includes(q);
        const matchesMarket = t.destinationWholesaleMarket.toLowerCase().includes(q);
        const matchesDriver = (t.driverName || t.buyerName || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesCrop && !matchesMarket && !matchesDriver) return false;
      }
      return true;
    });
  }, [harvestTickets, filterParcel, searchQuery]);

  // KPIs
  const totalGrossKg = filteredTickets.reduce((acc, t) => acc + t.grossWeightKg, 0);
  const totalNetKg = filteredTickets.reduce((acc, t) => acc + t.netWeightKg, 0);
  const totalNetPayout = filteredTickets.reduce((acc, t) => acc + (t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0), 0);

  // Actions
  const handlePin = (t: AgriHarvestTicket) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      return next;
    });
    showToast(
      pinnedIds.has(t.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Ticket désépinglé')
        : (isAr ? 'تم تثبيت الوصل' : 'Ticket épinglé'),
      'info'
    );
  };

  const handleDelete = (t: AgriHarvestTicket) => {
    deleteHarvestTicket(t.id);
    if (selectedTicket?.id === t.id) setSelectedTicket(null);
    showToast(isAr ? 'تم حذف وصل الوزن' : 'Ticket de pesée supprimé', 'success');
  };

  const handlePrintTicket = (t: AgriHarvestTicket) => {
    setTicketForPrint(t);
    setIsPrintModalOpen(true);
  };

  const handleExportCsv = () => {
    const headers = ['N° Ticket', 'Culture', 'Date', 'Poids Brut Kg', 'Tare Kg', 'Poids Net Kg', 'Caisses', 'Prix/Kg DZD', 'Total Brut DZD', 'Net Domaine DZD', 'Chauffeur', 'Marché'];
    const rows = filteredTickets.map((t) => [
      t.ticketNumber,
      `"${t.cropDesignation.replace(/"/g, '""')}"`,
      t.date,
      t.grossWeightKg,
      t.tareWeightKg ?? t.truckTareKg ?? 0,
      t.netWeightKg,
      t.cratesCount ?? t.crateCount ?? 0,
      t.unitPriceDzdPerKg,
      t.totalGrossDzd ?? t.subtotalProduceDzd ?? 0,
      t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0,
      `"${(t.driverName || t.buyerName || '').replace(/"/g, '""')}"`,
      `"${t.destinationWholesaleMarket.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pesee_recolte_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف وصولات الوزن CSV' : 'Export CSV des pesées généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedTicket) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات الشحنة' : 'Mentions enregistrées', 'success');
  };

  // Pointage & Muster Handlers
  const handleIncrementCrates = (p: AgriDailyPointage, delta: number) => {
    playTallyBeep();
    const newCrates = Math.max(0, p.cratesCollected + delta);
    const worker = workers.find((w) => w.id === p.workerId);
    const pieceRate = worker?.defaultPieceRateDzd || 40;
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
  };

  const handleUpdateAdvance = (p: AgriDailyPointage, deltaAdvance: number) => {
    const newAdvance = Math.max(0, p.cashAdvancePaidDzd + deltaAdvance);
    const worker = workers.find((w) => w.id === p.workerId);
    const pieceRate = worker?.defaultPieceRateDzd || 40;
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
        ? `تم تحديث تسبيق العامل: ${formatMoney(newAdvance)}`
        : `Acompte mis à jour : ${formatMoney(newAdvance)}`,
      'info'
    );
  };

  const handlePayPointage = (p: AgriDailyPointage) => {
    updatePointage({
      ...p,
      isPaid: true,
      paidAt: new Date().toISOString(),
    });
    showToast(
      isAr
        ? `تم تسديد مستحقات ${p.workerName} (${formatMoney(p.netDueDzd)}) نقداً`
        : `Règlement espèces effectué : ${formatMoney(p.netDueDzd)} à ${p.workerName}`,
      'success'
    );
  };

  const handleSavePointage = (e: React.FormEvent) => {
    e.preventDefault();
    const worker = workers.find((w) => w.id === pointageWorkerId);
    const parcel = parcels.find((pr) => pr.id === pointageParcelId);
    const crates = parseInt(pointageCrates) || 0;
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
        : `Pointage enregistré pour ${worker?.fullName || 'l’ouvrier'}`,
      'success'
    );
  };

  const filteredPointages = useMemo(() => {
    return pointages.filter((p) => {
      if (pointageStatusFilter === 'paid' && !p.isPaid) return false;
      if (pointageStatusFilter === 'unpaid' && p.isPaid) return false;
      if (pointageSearch.trim()) {
        const q = pointageSearch.toLowerCase();
        return (
          p.workerName.toLowerCase().includes(q) ||
          (p.parcelName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pointages, pointageStatusFilter, pointageSearch]);

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<AgriHarvestTicket>[] = [
    {
      id: 'ticketNumber',
      header: isAr ? 'رقم الوصل' : 'N° Ticket',
      accessorKey: 'ticketNumber',
      sortable: true,
      minWidth: '130px',
      cell: (t) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Scale size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {t.ticketNumber}
              {pinnedIds.has(t.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              {t.date}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'crop',
      header: isAr ? 'المحصول والشاحنة' : 'Culture & Transport',
      accessorKey: 'cropDesignation',
      sortable: true,
      minWidth: '220px',
      cell: (t) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {t.cropDesignation}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            {t.vehiclePlate} • {t.driverName}
          </div>
        </div>
      ),
    },
    {
      id: 'netWeight',
      header: isAr ? 'الوزن الصافي' : 'Poids Net',
      accessorKey: 'netWeightKg',
      sortable: true,
      minWidth: '130px',
      cell: (t) => (
        <div>
          <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
            {t.netWeightKg.toLocaleString()} Kg
          </div>
          <div className="text-[10px] text-neutral-400">
            {t.cratesCount} caisses
          </div>
        </div>
      ),
    },
    {
      id: 'netPayout',
      header: isAr ? 'الصافي للمستثمرة' : 'Net Domaine DZD',
      accessorKey: 'netFarmPayoutDzd',
      sortable: true,
      minWidth: '140px',
      cell: (t) => (
        <div>
          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
            {formatMoney(t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0)}
          </div>
          <div className="text-[10px] text-neutral-400">
            PU: {t.unitPriceDzdPerKg} DZD/Kg
          </div>
        </div>
      ),
    },
    {
      id: 'market',
      header: isAr ? 'سوق الجملة' : 'Destination',
      accessorKey: 'destinationWholesaleMarket',
      sortable: true,
      minWidth: '160px',
      cell: (t) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[160px]">
          {t.destinationWholesaleMarket}
        </div>
      ),
    },
  ];

  const parcelFilterOptions = [
    { value: 'all', label: isAr ? 'جميع القطع' : 'Toutes les parcelles' },
    ...parcels.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            {activeMode === 'tickets' ? <Scale size={22} /> : <Users size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {activeMode === 'tickets'
                  ? (isAr ? 'وصولات الوزن وجني المحاصيل' : 'Pont-Bascule & Bons de Récolte')
                  : (isAr ? 'دفتر حضور وجني التاشرون (Muster Roll)' : 'Pointage Journalier des Tâcherons')}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {activeMode === 'tickets' ? `${filteredTickets.length} tickets` : `${pointages.length} ouvriers`}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {activeMode === 'tickets'
                ? (isAr
                    ? 'قياس الحمولة الصافية، حساب عمولة الوكيل وسوق الجملة'
                    : 'Pesée camion, tare, décompte caisses, commission mandataire et règlement domaine')
                : (isAr
                    ? 'متابعة الصناديق المجنية بالقطعة، التسبيقات النقدية وتصفية الأجور اليومية'
                    : 'Pointage terrain au rendement (40 DA/caisse), acomptes espèces et solde journalier')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeMode === 'tickets' ? (
            <>
              <AtriumButton
                variant="ghost"
                size="sm"
                onClick={handleExportCsv}
                icon={<Download size={14} />}
              >
                {isAr ? 'تصدير CSV' : 'Export CSV'}
              </AtriumButton>
              <AtriumButton
                variant="primary"
                onClick={openCreateModal}
                icon={<Plus size={14} />}
              >
                {isAr ? 'وصل وزن جديد' : 'Nouveau Bon de Pesée'}
              </AtriumButton>
            </>
          ) : (
            <AtriumButton
              variant="primary"
              onClick={() => setIsPointageModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'تسجيل حضور / جني' : 'Pointer un Ouvrier'}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* View Mode Switcher: Weighbridge Tickets vs. Worker Muster Roll */}
      <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl w-fit border border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveMode('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMode === 'tickets'
              ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Scale size={14} />
          {isAr ? 'وصولات ميزان الجسر (Pont-Bascule)' : 'Bons de Pesée & Expéditions'}
        </button>
        <button
          onClick={() => setActiveMode('pointage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMode === 'pointage'
              ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Users size={14} />
          {isAr ? 'مخطط حضور وجني التاشرون (Muster Mode)' : 'Pointage Tâcherons & Ouvriers (Muster)'}
        </button>
      </div>

      {activeMode === 'tickets' ? (
        <>
          {/* Canonical 3-Card Top Metrics Pod Tray */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'إحصائيات الشحن والإنتاج المباع' : 'Tonnage Expédié & Recettes Agricoles'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'تتبع الكميات المجنية وصافي المستحقات المالية من أسواق الجملة' : 'Poids net expédié, déductions mandataire et recettes réelles de récolte'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Poids Net */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الحمولة الصافية الإجمالية' : 'Tonnage Net Sorti'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {(totalNetKg / 1000).toFixed(1)} tonnes
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {totalNetKg.toLocaleString()} Kg {isAr ? 'وزن صافي' : 'pesé au pont'}
              </p>
            </div>
          </div>

          {/* Card 2: Tickets */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'شحنات منقولة للأسواق' : 'Rotations Camion Validées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {filteredTickets.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'وصولات قبان معتمدة' : 'Bons avec tare certifiée'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'صافي مداخيل الجني' : 'Recettes Nettes Domaine'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Marché de Gros
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalNetPayout)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'بعد خصم عمولة الوكيل 6%' : 'Commission 6% déduite'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'سجل وصولات الجني والوزن (بونت باسكول)' : 'Bons de Pesée Pont-Bascule & Expéditions'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'تتبع الوزن القائم والفارغ والصافي وعائدات أسواق الجملة' : 'Relevés de tare et net expédié, commission mandataire et traçabilité des lots'}
            </p>
          </div>

          {/* Authentic Agriculture Harvest Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع الشحنات' : 'Toutes expéditions' },
              { id: 'extra', label: 'Calibre Extra' },
              { id: 'cat1', label: 'Catégorie I' },
              { id: 'transfo', label: 'Transformation' },
            ].map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setFilterParcel('all')}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === 0 && filterParcel === 'all' ? '#FCEEE8' : 'transparent',
                  color: idx === 0 && filterParcel === 'all' ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
        <div className="flex items-start gap-4">
          {/* Main Collection Container */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<AgriHarvestTicket>
            data={filteredTickets}
            columns={columns}
            keyExtractor={(t) => t.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم الوصل، المحصول، الشاحنة...' : 'Rechercher par N° ticket, culture, chauffeur...'}
            filterValue={filterParcel}
            onFilterChange={setFilterParcel}
            filterOptions={parcelFilterOptions}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={handlePin}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            onItemClick={(t) => {
              setSelectedTicket(t);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<Scale size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد وصولات وزن' : 'Aucun bon de pesée trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun ticket ne correspond à votre recherche')
                : (isAr ? 'قم بتسجيل أول حمولة محصول' : 'Enregistrez votre première pesée camion')
            }
            customActions={[
              {
                id: 'print',
                label: isAr ? 'طباعة الوصل' : 'Imprimer Bon',
                icon: <Printer size={14} />,
                onClick: handlePrintTicket,
              },
            ]}
            renderGridCard={(t) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                    {t.ticketNumber}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t.netWeightKg.toLocaleString()} Kg
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {t.cropDesignation}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5">
                    {t.vehiclePlate} • {t.driverName}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Net Domaine</div>
                    <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                      {formatMoney(t.netFarmPayoutDzd ?? t.paidAmountDzd ?? 0)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Date</div>
                    <div className="font-mono text-neutral-600 dark:text-neutral-400 mt-0.5">
                      {t.date}
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedTicket && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Scale size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Pesée Validée
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedTicket.cropDesignation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handlePrintTicket(selectedTicket)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <Printer size={12} />
                {isAr ? 'طباعة الوصل' : 'Imprimer'}
              </button>
              <button
                onClick={() => openEditModal(selectedTicket)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedTicket)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('ticket')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'ticket'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'البيانات' : 'Fiche Pesée'}
              </button>
              <button
                onClick={() => setActiveTab('pesee')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'pesee'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الأوزان' : 'Tonnage'}
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'finance'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المالية' : 'Finance'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الملاحظات' : 'Mentions'}
              </button>
            </div>

            {/* Tab 1: Fiche */}
            {activeTab === 'ticket' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Chauffeur:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedTicket.driverName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Véhicule:</span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {selectedTicket.vehiclePlate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Destination:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[190px]">
                      {selectedTicket.destinationWholesaleMarket}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Date d'émission:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedTicket.date}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Nombre de caisses:</span>
                    <span className="font-mono text-neutral-900 dark:text-white font-semibold">
                      {selectedTicket.cratesCount} unités
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Tonnage */}
            {activeTab === 'pesee' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Poids Brut (Camion + Charge):</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedTicket.grossWeightKg.toLocaleString()} Kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Tare Camion à vide:</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {(selectedTicket.tareWeightKg ?? selectedTicket.truckTareKg ?? 0).toLocaleString()} Kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-700 font-bold">Poids Net Marchandise:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedTicket.netWeightKg.toLocaleString()} Kg
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Finance */}
            {activeTab === 'finance' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Prix unitaire au Kg:</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedTicket.unitPriceDzdPerKg} DZD / Kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Total Brut Gros:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold">
                      {formatMoney(selectedTicket.totalGrossDzd ?? selectedTicket.subtotalProduceDzd ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Commission Mandataire ({selectedTicket.mandataireFeePercent || 0}%):</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      - {formatMoney(((selectedTicket.totalGrossDzd ?? selectedTicket.subtotalProduceDzd ?? 0) * (selectedTicket.mandataireFeePercent || 0)) / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-700 font-bold">Net à Payer Domaine:</span>
                    <span className="font-mono font-bold text-[#C4785A] text-sm">
                      {formatMoney(selectedTicket.netFarmPayoutDzd ?? selectedTicket.paidAmountDzd ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Mentions / Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Observations qualité (degré Brix, fermeté, triage) et décharge de livraison :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter le calibre des fruits, l'heure de départ du domaine..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                >
                  {noteSaved ? (
                    <>
                      <Check size={14} />
                      {isAr ? 'تم الحفظ' : 'Mentions enregistrées'}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isAr ? 'حفظ' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Pointage 3-Card Top Metrics Pod Tray */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div>
              <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                {isAr ? 'مؤشرات جني المحصول ودفتر حضور التاشرون' : 'Indicateurs de Récolte & Pointage des Tâcherons'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'تتبع عدد الصناديق المجنية يومياً، الأجور المستحقة بالقطعة والتسبيقات المدفوعة'
                  : 'Comptage unitaire des caisses, rémunération au rendement (40 DA/caisse) et acomptes espèces'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Ouvriers */}
              <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {isAr ? 'العمال الميدانيون الحاضرون' : 'Ouvriers & Tâcherons Actifs'}
                </span>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                    {pointages.length}
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                    {pointages.filter((p) => p.cratesCollected > 0).length} {isAr ? 'في ورشة الجني الآن' : 'actifs sur les rangs'}
                  </p>
                </div>
              </div>

              {/* Card 2: Caisses */}
              <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {isAr ? 'إجمالي الصناديق المجنية اليوم' : 'Total Caisses Récoltées'}
                </span>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                    {pointages.reduce((sum, p) => sum + p.cratesCollected, 0)} {isAr ? 'صندوق' : 'caisses'}
                  </div>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                    ~{((pointages.reduce((sum, p) => sum + p.cratesCollected, 0) * 18) / 1000).toFixed(1)} tonnes récoltées
                  </p>
                </div>
              </div>

              {/* Card 3: Dark Espresso Anchor Card */}
              <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-300">
                    {isAr ? 'صافي مستحقات اليد العاملة' : 'Masse Salariale Nette Due'}
                  </span>
                  <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                    Muster Pay
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-mono tabular-nums">
                    {formatMoney(pointages.reduce((sum, p) => sum + (p.isPaid ? 0 : p.netDueDzd), 0))}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                    {pointages.filter((p) => !p.isPaid).length} {isAr ? 'أجور في انتظار الصرف' : 'soldes en attente de caisse'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Muster Roll Pod Tray Enclosing Table */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                  {isAr ? 'جدول حضور ومردودية العمال (Muster Roll)' : 'Registre d’Appel & Rendement des Tâcherons'}
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {isAr ? 'عد سريع للصناديق (+1 / +5)، خصم التسبيقات، وتصفية الأجر نقداً' : 'Comptage tactile rapide (+1 / +5), avances sur salaire et règlement direct en espèces'}
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs">
                {[
                  { id: 'all', label: isAr ? 'الكل' : 'Tous' },
                  { id: 'unpaid', label: isAr ? 'غير مسدد' : 'À régler' },
                  { id: 'paid', label: isAr ? 'مسدد' : 'Réglés' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPointageStatusFilter(f.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      pointageStatusFilter === f.id
                        ? 'bg-[#FCEEE8] text-[#C4785A]'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Muster Cards Grid */}
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
                        <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <Users size={14} className="text-[#C4785A]" />
                          {p.workerName}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
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
                        {p.isPaid ? (isAr ? 'تم الصرف ✓' : 'Réglé ✓') : (isAr ? 'مستحق' : 'À payer')}
                      </span>
                    </div>

                    {/* Crate Tap Counter */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 font-medium">
                          {isAr ? 'الصناديق المجنية :' : 'Caisses pointées :'}
                        </span>
                        <span className="font-mono font-black text-lg text-neutral-900 dark:text-white">
                          {p.cratesCollected} <span className="text-xs font-normal text-neutral-400">caisses</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleIncrementCrates(p, -1)}
                          className="py-1.5 px-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center gap-1 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                        >
                          <Minus size={12} /> 1
                        </button>
                        <button
                          onClick={() => handleIncrementCrates(p, 1)}
                          className="py-1.5 px-2 bg-[#C4785A]/10 border border-[#C4785A]/30 text-[#C4785A] rounded-lg text-xs font-bold hover:bg-[#C4785A]/20 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleIncrementCrates(p, 5)}
                          className="py-1.5 px-2 bg-[#C4785A] text-white rounded-lg text-xs font-bold hover:bg-[#b06a4e] flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    {/* Financial calculation breakdown */}
                    <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Rémunération brute ({worker?.defaultPieceRateDzd || 40} DA/caisse):</span>
                        <span className="font-mono font-semibold">{formatMoney(p.calculatedWageDzd)}</span>
                      </div>
                      <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                        <span>Acompte perçu:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-semibold">-{formatMoney(p.cashAdvancePaidDzd)}</span>
                          <button
                            onClick={() => handleUpdateAdvance(p, 500)}
                            className="px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700 cursor-pointer"
                          >
                            +500
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 font-bold text-neutral-900 dark:text-white">
                        <span>Net à verser:</span>
                        <span className="font-mono text-sm text-[#C4785A]">{formatMoney(p.netDueDzd)}</span>
                      </div>
                    </div>

                    {/* Payout Action Button */}
                    <div className="pt-2">
                      {p.isPaid ? (
                        <div className="w-full py-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={14} /> {isAr ? 'تم تسليم الأجر نقداً' : 'Payé en espèces (Caisse)'}
                        </div>
                      ) : (
                        <AtriumButton
                          variant="primary"
                          size="sm"
                          className="w-full justify-center"
                          icon={<Coins size={14} />}
                          onClick={() => handlePayPointage(p)}
                        >
                          {isAr ? `صرف الصافي (${formatMoney(p.netDueDzd)})` : `Régler ${formatMoney(p.netDueDzd)}`}
                        </AtriumButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Scale size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {ticketToEdit
                      ? (isAr ? 'تعديل وصل وزن المحصول' : 'Modifier le Bon de Pesée')
                      : (isAr ? 'تسجيل وصل وزن قبان جديد' : 'Nouveau Bon de Pesée Pont-Bascule')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'قياس الحمولة الصافية والأسعار للطن' : 'Calcul automatique du poids net et net domaine'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <LabelSelect
                label={isAr ? 'القطعة الفلاحية المصدر' : 'Parcelle d’Origine'}
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
                options={parcelFilterOptions.filter((p) => p.value !== 'all')}
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
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {ticketToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'تأكيد وصل الوزن' : 'Valider la Pesée')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pointage Registration Modal */}
      {isPointageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {isAr ? 'تسجيل حضور وجني لعامل' : 'Pointer un Ouvrier Saisonnier'}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'تحديد العامل والقطعة والصناديق الأولية' : 'Comptage à la caisse et versement d’acompte'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPointageModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePointage} className="space-y-4">
              <LabelSelect
                label={isAr ? 'العامل السيزوني / التاشرون' : 'Ouvrier / Tâcheron'}
                value={pointageWorkerId}
                onChange={(e) => setPointageWorkerId(e.target.value)}
                options={workers.map((w) => ({
                  value: w.id,
                  label: `${w.fullName} (${w.defaultPieceRateDzd || 40} DA/caisse)`,
                }))}
              />

              <LabelSelect
                label={isAr ? 'القطعة الفلاحية' : 'Parcelle d’Assignation'}
                value={pointageParcelId}
                onChange={(e) => setPointageParcelId(e.target.value)}
                options={parcels.map((pr) => ({ value: pr.id, label: pr.name }))}
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
                  <span className="text-neutral-500">Rémunération calculée :</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney((parseInt(pointageCrates) || 0) * 40)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Acompte déduit :</span>
                  <span className="font-mono font-semibold">-{formatMoney(parseFloat(pointageAdvance) || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#C4785A] pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <span>Solde net dû :</span>
                  <span className="font-mono">{formatMoney(Math.max(0, ((parseInt(pointageCrates) || 0) * 40) - (parseFloat(pointageAdvance) || 0)))}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsPointageModalOpen(false)}>
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

      {/* Official A5 Bilingual Delivery Slip & Scale Ticket Modal */}
      <AgriWeighbridgePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        ticket={ticketForPrint}
      />
    </div>
  );
};

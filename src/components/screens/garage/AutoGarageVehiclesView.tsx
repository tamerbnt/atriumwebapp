import React, { useState, useMemo } from 'react';
import {
  Car,
  Plus,
  Phone,
  Calendar,
  Key,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  FileText,
  Clock,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, VehicleAsset, RepairOrder } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { AutoVehicleModal } from './AutoVehicleModal';
import { AutoOrderModal } from './AutoOrderModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const AutoGarageVehiclesView: React.FC = () => {
  const { language, showToast } = useAtriumStore();
  const { vehicles, orders, addVehicle, updateVehicle, deleteVehicle, addOrder } = useGarageData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<'All' | 'Renault' | 'Peugeot' | 'Toyota' | 'Other'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['veh_01']));
  const [sortBy, setSortBy] = useState<string>('plate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<VehicleAsset | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderVehicle, setOrderVehicle] = useState<VehicleAsset | null>(null);

  // 390px Inline Side Inspector
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleAsset | null>(null);
  const [activeTab, setActiveTab] = useState<'fiche' | 'owner' | 'orders' | 'notes'>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Active repair orders mapping by plate
  const vehicleOrdersMap = useMemo(() => {
    const map = new Map<string, RepairOrder[]>();
    orders.forEach((o) => {
      const list = map.get(o.vehiclePlate) || [];
      list.push(o);
      map.set(o.vehiclePlate, list);
    });
    return map;
  }, [orders]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filterBrand !== 'All') {
        if (filterBrand === 'Other') {
          if (['Renault', 'Peugeot', 'Toyota'].includes(v.brand)) return false;
        } else if (v.brand.toLowerCase() !== filterBrand.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = v.plateNumber.toLowerCase().includes(q);
        const matchesOwner = v.ownerName.toLowerCase().includes(q);
        const matchesBrand = v.brand.toLowerCase().includes(q);
        const matchesModel = v.model.toLowerCase().includes(q);
        const matchesVin = v.vin.toLowerCase().includes(q);
        if (!matchesPlate && !matchesOwner && !matchesBrand && !matchesModel && !matchesVin) return false;
      }
      return true;
    });
  }, [vehicles, filterBrand, searchQuery]);

  const sortedVehicles = useMemo(() => {
    const list = [...filteredVehicles];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'plate') {
        const cmp = a.plateNumber.localeCompare(b.plateNumber);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'brand') {
        const cmp = `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'mileage') {
        const cmp = a.mileageKm - b.mileageKm;
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredVehicles, pinnedIds, sortBy, sortDir]);

  const activeVehiclesInShop = useMemo(() => {
    return new Set(
      orders.filter((o) => o.status !== 'Delivered').map((o) => o.vehiclePlate)
    ).size;
  }, [orders]);

  const handleOpenAdd = () => {
    setVehicleToEdit(null);
    setIsVehicleModalOpen(true);
  };

  const handleOpenEdit = (v: VehicleAsset) => {
    setVehicleToEdit(v);
    setIsVehicleModalOpen(true);
  };

  const handleDelete = (v: VehicleAsset) => {
    deleteVehicle(v.id);
    if (selectedVehicle?.id === v.id) setSelectedVehicle(null);
    showToast(language === 'ar' ? 'تم حذف المركبة من الحظيرة' : 'Véhicule retiré du parc', 'success');
  };

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectVehicle = (v: VehicleAsset) => {
    setSelectedVehicle(v);
    setInspectorNotes(`Véhicule suivi à l'atelier. Dernière vidange/révision: ${v.lastServiceDate || '2026-05-01'}.`);
    setNoteSaved(false);
  };

  const handleOpenNewOrder = (v: VehicleAsset) => {
    setOrderVehicle(v);
    setIsOrderModalOpen(true);
  };

  const handleSaveNotes = () => {
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(language === 'ar' ? 'تم حفظ ملاحظات الورشة' : 'Observations atelier sauvegardées', 'success');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Plate', 'Brand', 'Model', 'Year', 'VIN', 'Owner', 'Phone', 'Mileage (km)', 'Last Service'];
    const rows = sortedVehicles.map((v) => [
      v.id,
      `"${v.plateNumber}"`,
      `"${v.brand}"`,
      `"${v.model}"`,
      v.year,
      `"${v.vin}"`,
      `"${v.ownerName}"`,
      `"${v.ownerPhone}"`,
      v.mileageKm,
      `"${v.lastServiceDate || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garage_vehicles_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(language === 'ar' ? 'تم تصدير حظيرة المركبات' : 'Export du parc automobile terminé', 'info');
  };

  // Column definitions for List view
  const columns: ColumnDefinition<VehicleAsset>[] = useMemo(
    () => [
      {
        key: 'plate',
        header: language === 'ar' ? 'الترقيم / الموديل' : 'Véhicule & Immatriculation',
        width: '3.4*',
        sortable: true,
        renderCell: (v) => {
          const isPinned = pinnedIds.has(v.id);
          const inShop = orders.some((o) => o.vehiclePlate === v.plateNumber && o.status !== 'Delivered');
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Car size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {v.brand} {v.model}
                  </span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
                  {inShop && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Wrench size={10} /> {language === 'ar' ? 'في الورشة' : 'En Atelier'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                  <span className="px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold">
                    {v.plateNumber}
                  </span>
                  <span>·</span>
                  <span>{v.year}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'owner',
        header: language === 'ar' ? 'المالك / الاتصال' : 'Propriétaire & Contact',
        width: '2.5*',
        renderCell: (v) => (
          <div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {v.ownerName}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              {v.ownerPhone}
            </div>
          </div>
        ),
      },
      {
        key: 'mileage',
        header: language === 'ar' ? 'العداد والصيانة' : 'Kilométrage & Entretien',
        width: '2.3*',
        sortable: true,
        renderCell: (v) => (
          <div className="space-y-0.5">
            <div className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
              <Gauge size={12} className="text-[#C4785A]" />
              <span>{v.mileageKm.toLocaleString()} km</span>
            </div>
            <div className="text-[10px] text-neutral-400">
              {language === 'ar' ? 'آخر صيانة: ' : 'Révision: '}
              <span className="font-mono">{v.lastServiceDate || '—'}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: language === 'ar' ? 'الطلبات النشطة' : 'Ordres Réparation',
        width: '1.8*',
        renderCell: (v) => {
          const vehOrders = vehicleOrdersMap.get(v.plateNumber) || [];
          return (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[live-heartbeat_1.2s_infinite]" />
                {vehOrders.length} {language === 'ar' ? 'طلبات' : 'ORs'}
              </span>
            </div>
          );
        },
      },
    ],
    [pinnedIds, orders, vehicleOrdersMap, language]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Car size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل المركبات وحظيرة الزبائن' : 'Parc Véhicules & Immatriculations'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {vehicles.length} {language === 'ar' ? 'مركبة' : 'véhicules'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'قاعدة بيانات لوحات الترقيم، أرقام الشاسيه (VIN)، وأصحاب المركبات'
                : 'Registre d\'immatriculation, historique kilométrique & coordonnées propriétaires'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExportCSV}
          >
            <span>{language === 'ar' ? 'تصدير' : 'Exporter'}</span>
          </AtriumButton>
          <AtriumButton
            type="button"
            variant="primary"
            onClick={handleOpenAdd}
            icon={<Plus size={15} strokeWidth={2.5} />}
          >
            <span>{language === 'ar' ? 'تسجيل مركبة' : 'Nouveau Véhicule'}</span>
          </AtriumButton>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات الحظيرة ونشاط الصيانة' : 'Indicateurs de Flotte & Atelier'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar'
              ? 'متابعة المركبات قيد الإصلاح، الحظيرة المسجلة، وجاهزية التسليم'
              : 'Véhicules actuellement sur les ponts, parc actif et taux de fidélisation'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي الحظيرة المسجلة' : 'Parc Total Enregistré'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {vehicles.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'مركبات في قاعدة بيانات الورشة' : 'Fiches techniques complètes'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'مركبات في الورشة حالياً' : 'Véhicules en Atelier (Travaux)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {activeVehiclesInShop}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'أوامر إصلاح قيد الإنجاز' : 'Ordres de réparation actifs'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                {language === 'ar' ? 'معايير الفحص التقني' : 'Contrôle & Sécurité'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                100% HOMOLOGUÉ
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100%
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>N° Châssis & Immatriculations certifiés</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Collection Container */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'دليل السيارات' : 'Registre Automobile'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums">
              ({sortedVehicles.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالترقيم أو المالك أو الموديل...' : 'Recherche matricule, modèle, VIN...'}
              shutSize={36}
              openWidth={220}
            />

            <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterBrand('All')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterBrand === 'All'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'Tous'} ({vehicles.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterBrand('Renault')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterBrand === 'Renault'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Renault
              </button>
              <button
                type="button"
                onClick={() => setFilterBrand('Peugeot')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterBrand === 'Peugeot'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Peugeot
              </button>
              <button
                type="button"
                onClick={() => setFilterBrand('Toyota')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterBrand === 'Toyota'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Toyota
              </button>
            </div>
          </div>
        </div>

        {/* Batch Selection Banner */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                {selectedIds.size} {language === 'ar' ? 'مركبات محددة' : 'véhicules sélectionnés'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 font-medium cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Désélectionner'}
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedIds.forEach((id) => deleteVehicle(id));
                  setSelectedIds(new Set());
                  showToast(language === 'ar' ? 'تم حذف المركبات المحددة' : 'Véhicules sélectionnés supprimés', 'success');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 size={13} />
                <span>{language === 'ar' ? 'حذف المحدد' : 'Supprimer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Inset Area Hosting Universal Collection and 390px Side Inspector */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<VehicleAsset>
              items={sortedVehicles}
              keyExtractor={(v) => v.id}
              defaultViewMode={viewMode}
              columns={columns}
              sortBy={sortBy}
              sortDirection={sortDir}
              onSortChange={(key) => {
                if (sortBy === key) {
                  setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setSortBy(key);
                  setSortDir('asc');
                }
              }}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              isPinned={(v) => pinnedIds.has(v.id)}
              onTogglePin={(v) => handleTogglePin(v.id)}
              onItemClick={handleSelectVehicle}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              customActions={(v) => [
                {
                  id: 'order',
                  label: language === 'ar' ? 'فتح أمر إصلاح' : 'Nouvel OR',
                  tooltip: language === 'ar' ? 'فتح أمر إصلاح' : 'Créer Ordre de Réparation',
                  icon: <Wrench size={13} />,
                  variant: 'primary',
                  onClick: () => handleOpenNewOrder(v),
                },
              ]}
              renderCard={(v) => {
                const isPinned = pinnedIds.has(v.id);
                const inShop = orders.some((o) => o.vehiclePlate === v.plateNumber && o.status !== 'Delivered');
                return (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                      <Car size={32} />
                    </div>
                    <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate tracking-tight">
                        {v.brand} {v.model}
                      </h3>
                      {isPinned && <span className="text-xs text-amber-500">📌</span>}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 mb-3 border border-neutral-200 dark:border-neutral-700">
                      {v.plateNumber}
                    </span>

                    <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                      <div className="text-neutral-800 dark:text-neutral-200 font-semibold text-[11px]">
                        {v.ownerName} · <span className="font-mono text-neutral-500">{v.ownerPhone}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-400">
                        <span className="font-mono">{v.mileageKm.toLocaleString()} km</span>
                        {inShop ? (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Wrench size={10} /> {language === 'ar' ? 'في الورشة' : 'En Atelier'}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} /> {language === 'ar' ? 'جاهز' : 'Disponible'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
              emptyTitle={language === 'ar' ? 'لا توجد مركبات مطابقة' : 'Aucun véhicule trouvé'}
              emptyDescription={language === 'ar' ? 'أضف أول مركبة للحظيرة أو أعد ضبط معايير البحث' : 'Ajoutez un premier véhicule ou modifiez vos filtres de recherche'}
              primaryActionLabel={language === 'ar' ? 'تسجيل مركبة' : 'Nouveau Véhicule'}
              onAddFirstItem={handleOpenAdd}
              onResetFilters={() => {
                setSearchQuery('');
                setFilterBrand('All');
              }}
              hasActiveFilters={searchQuery.length > 0 || filterBrand !== 'All'}
            />
          </div>

          {/* 390px Inline Side Inspector Drawer */}
          {selectedVehicle && (
            <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[700px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-[#F5E2D8]">
                    <Car size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                      <span>{selectedVehicle.plateNumber}</span>
                      <span>·</span>
                      <span>{selectedVehicle.year}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenNewOrder(selectedVehicle)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Wrench size={13} />
                  <span>{language === 'ar' ? 'فتح أمر إصلاح' : 'Nouvel OR'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedVehicle)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                  title="Modifier"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(selectedVehicle.id)}
                  className={`p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold transition-colors ${
                    pinnedIds.has(selectedVehicle.id) ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  title="Épingler"
                >
                  <Pin size={14} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-neutral-100 dark:border-neutral-800 text-xs font-semibold px-2 bg-white dark:bg-neutral-850">
                <button
                  type="button"
                  onClick={() => setActiveTab('fiche')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'fiche'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'البطاقة التقنية' : 'Fiche'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('owner')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'owner'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'المالك' : 'Propriétaire'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'orders'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'أوامر الإصلاح' : 'Ordres'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'notes'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'الملاحظات' : 'Atelier'}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'fiche' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'المواصفات الفنية' : 'Données Constructeur'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'رقم الشاسيه (VIN)' : 'N° Châssis (VIN)'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedVehicle.vin}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الترقيم' : 'Immatriculation'}</span>
                        <span className="font-bold text-[#C4785A] font-mono">{selectedVehicle.plateNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'سنة الصنع' : 'Année modèle'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedVehicle.year}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'العداد الحالي' : 'Kilométrage'}</span>
                        <span className="font-bold text-neutral-900 dark:text-white font-mono">{selectedVehicle.mileageKm.toLocaleString()} km</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'آخر صيانة' : 'Dernière révision'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedVehicle.lastServiceDate || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'owner' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'بيانات المالك' : 'Coordonnées Client'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الاسم الكامل' : 'Nom & Prénom'}</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{selectedVehicle.ownerName}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedVehicle.ownerPhone}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="space-y-2 text-xs">
                    {(vehicleOrdersMap.get(selectedVehicle.plateNumber) || []).length > 0 ? (
                      (vehicleOrdersMap.get(selectedVehicle.plateNumber) || []).map((o) => (
                        <div
                          key={o.id}
                          className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {o.orderNumber}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {new Date(o.intakeDate).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {o.diagnosticNotes}
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                              {o.status}
                            </span>
                            <span className="font-mono font-bold text-[#C4785A]">
                              {formatMoney(o.finalCostDzd || o.estimatedCostDzd)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-neutral-400">
                        <Wrench size={28} className="mx-auto mb-2 opacity-40" />
                        <p>{language === 'ar' ? 'لا توجد أوامر إصلاح سابقة لهذه المركبة' : 'Aucun ordre de réparation enregistré.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                      {language === 'ar' ? 'ملاحظات الورشة والفحص' : 'Observations & Consignes d\'Atelier'}
                    </label>
                    <textarea
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      rows={8}
                      placeholder={language === 'ar' ? 'أدخل ملاحظات الورشة...' : 'Historique d\'usure, pièces à surveiller...'}
                      className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-[#C4785A] outline-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-neutral-400">
                        {noteSaved && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check size={12} /> {language === 'ar' ? 'تم الحفظ' : 'Enregistré'}
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
                        <span>{language === 'ar' ? 'حفظ الملاحظات' : 'Enregistrer'}</span>
                      </AtriumButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Create / Edit Modal */}
      {isVehicleModalOpen && (
        <AutoVehicleModal
          isOpen={isVehicleModalOpen}
          onClose={() => {
            setIsVehicleModalOpen(false);
            setVehicleToEdit(null);
          }}
          vehicleToEdit={vehicleToEdit}
          onSave={(v) => {
            if (vehicleToEdit) {
              updateVehicle(v);
              if (selectedVehicle?.id === v.id) setSelectedVehicle(v);
              showToast(language === 'ar' ? 'تم تحديث بيانات المركبة' : 'Véhicule mis à jour', 'success');
            } else {
              addVehicle(v);
              showToast(language === 'ar' ? 'تم تسجيل المركبة بنجاح' : 'Véhicule enregistré avec succès', 'success');
            }
            setIsVehicleModalOpen(false);
            setVehicleToEdit(null);
          }}
        />
      )}

      {/* Order Modal */}
      {isOrderModalOpen && orderVehicle && (
        <AutoOrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setOrderVehicle(null);
          }}
          vehicles={[orderVehicle]}
          onSave={(order) => {
            addOrder(order);
            setIsOrderModalOpen(false);
            setOrderVehicle(null);
            showToast(language === 'ar' ? 'تم إنشاء أمر الإصلاح بنجاح' : 'Ordre de réparation créé', 'success');
          }}
        />
      )}
    </div>
  );
};

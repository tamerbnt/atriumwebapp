import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  Car,
  ChevronRight,
  Filter,
  DollarSign,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  ArrowRight,
  User,
  Phone,
  Layers,
  Fuel,
  Gauge,
  Camera,
  Boxes,
  Package,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, RepairOrder, WorkshopBay } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { AutoOrderModal } from './AutoOrderModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const AutoGarageOrdersView: React.FC = () => {
  const {
    language,
    activeGarageRole,
    isSyncing,
    networkMode,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    orders,
    vehicles,
    parts,
    bays,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    assignBayToOrder,
    requisitionPartToOrder,
  } = useGarageData();

  const isMechanicRole = activeGarageRole === 'mecanicien';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<'kanban' | 'collection'>(
    isMechanicRole ? 'kanban' : 'collection'
  );
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['ro_01']));
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState('1');

  // 390px Inline Side Inspector
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(() => orders[0] || null);
  const [activeTab, setActiveTab] = useState<'ordre' | 'diag' | 'parts' | 'costs'>('ordre');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = o.vehiclePlate.toLowerCase().includes(q);
        const matchesClient = o.clientName.toLowerCase().includes(q);
        const matchesOrder = o.orderNumber.toLowerCase().includes(q);
        const matchesModel = o.vehicleModel.toLowerCase().includes(q);
        if (!matchesPlate && !matchesClient && !matchesOrder && !matchesModel) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // KPIs
  const activeCount = orders.filter((o) => o.status === 'InRepair' || o.status === 'Diagnostic').length;
  const readyCount = orders.filter((o) => o.status === 'ReadyForPickup').length;
  const totalBilled = orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);
  const occupiedBaysCount = bays.filter((b) => b.isOccupied).length;

  // Actions
  const handlePin = (o: RepairOrder) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(o.id)) next.delete(o.id);
      else next.add(o.id);
      return next;
    });
  };

  const handleDelete = (o: RepairOrder) => {
    deleteOrder(o.id);
    if (selectedOrder?.id === o.id) {
      setSelectedOrder(null);
    }
    showToast(isAr ? 'تم حذف أمر التصليح' : 'Ordre de réparation supprimé', 'success');
  };

  const handleNextStatus = (order: RepairOrder) => {
    const sequence: RepairOrder['status'][] = [
      'Intake',
      'Diagnostic',
      'WaitingApproval',
      'WaitingParts',
      'InRepair',
      'Testing',
      'ReadyForPickup',
      'Delivered',
    ];
    const currentIndex = sequence.indexOf(order.status);
    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      const next = sequence[currentIndex + 1];
      updateOrderStatus(order.id, next);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...order, status: next });
      }
      showToast(
        isAr ? `تم تحديث الحالة إلى: ${next}` : `Statut mis à jour : ${next}`,
        'success'
      );
    }
  };

  const handleRequisitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedPartId) return;
    const qty = parseInt(selectedPartQty, 10) || 1;
    const ok = requisitionPartToOrder(selectedOrder.id, selectedPartId, qty);
    if (ok) {
      showToast(
        isAr ? 'تم صرف القطعة وإضافتها لأمر التصليح' : 'Pièce réquisitionnée et sortie du stock',
        'success'
      );
      setIsRequisitionModalOpen(false);
      // update drawer view
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    } else {
      showToast(
        isAr ? 'الكمية غير كافية في المخزن' : 'Stock insuffisant dans le magasin',
        'error'
      );
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: RepairOrder['status']) => {
    switch (status) {
      case 'Intake':
        return <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">Entrée Réception</span>;
      case 'Diagnostic':
        return <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">Diagnostic En Cours</span>;
      case 'WaitingApproval':
        return <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">Attente Devis Client</span>;
      case 'WaitingParts':
        return <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">Attente Pièces</span>;
      case 'InRepair':
        return <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">Sur Pont (En Travaux)</span>;
      case 'Testing':
        return <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">Contrôle & Essai</span>;
      case 'ReadyForPickup':
        return <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Prêt pour Livraison</span>;
      case 'Delivered':
        return <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">Clôturé & Livré</span>;
      default:
        return null;
    }
  };

  // Table Columns Definition
  const columns: ColumnDefinition<RepairOrder>[] = [
    {
      id: 'orderNumber',
      header: isAr ? 'رقم الأمر' : 'N° OR',
      sortable: true,
      width: '140px',
      cell: (o) => (
        <div className="flex items-center gap-1.5 font-mono font-bold text-[#C4785A]">
          <span>{o.orderNumber}</span>
        </div>
      ),
    },
    {
      id: 'vehicle',
      header: isAr ? 'المركبة والماتريكيل' : 'Véhicule & Matricule',
      sortable: true,
      cell: (o) => (
        <div>
          <span className="font-semibold text-neutral-900 dark:text-white block">{o.vehiclePlate}</span>
          <span className="text-xs text-neutral-400 block truncate max-w-[200px]">{o.vehicleModel}</span>
        </div>
      ),
    },
    {
      id: 'client',
      header: isAr ? 'الزبون / الحساب' : 'Client & Téléphone',
      sortable: true,
      cell: (o) => (
        <div>
          <span className="font-medium text-neutral-800 dark:text-neutral-200 block">{o.clientName}</span>
          <span className="text-xs text-neutral-400 font-mono block">{o.clientPhone}</span>
        </div>
      ),
    },
    {
      id: 'bay',
      header: isAr ? 'الجسر والتقني' : 'Pont & Mécanicien',
      cell: (o) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">{o.bayName || 'Non assigné'}</span>
          <span className="text-neutral-400 block">{o.technicianName}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الحالة' : 'Statut Étape',
      sortable: true,
      cell: (o) => renderStatusBadge(o.status),
    },
    ...(!isMechanicRole
      ? [
          {
            id: 'cost',
            header: isAr ? 'التكلفة الإجمالية' : 'Montant Total',
            sortable: true,
            cell: (o: RepairOrder) => (
              <div className="text-right font-mono font-bold text-neutral-900 dark:text-white">
                {formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
              </div>
            ),
          },
        ]
      : []),
  ];

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: orders.length > 0,
  });

  if (showSkeleton && (orders.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Top Header & Metrics Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Wrench className="text-[#C4785A]" size={24} />
              <span>
                {isAr
                  ? 'سير العمل وأوامر التصليح (OR)'
                  : activeGarageRole === 'mecanicien'
                  ? 'Tableau d\'Atelier & Lifts (Mécanique)'
                  : 'Ordres de Réparation & Gestion des Ponts'}
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {isAr
                ? 'متابعة مراحل الإصلاح، توزيع الرافعات، وصرف قطع الغيار المباشر'
                : 'Suivi de l\'avancement en atelier, occupation des ponts et réquisitions de pièces'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Kanban vs Table */}
            <div className="flex items-center p-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <button
                type="button"
                onClick={() => setDisplayMode('kanban')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'kanban'
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'لوحة الجسور (Kanban)' : 'Ponts (Kanban)'}
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('collection')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'collection'
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {isAr ? 'سجل الأوامر (Tableau)' : 'Registre (Tableau)'}
              </button>
            </div>

            <AtriumButton
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsOrderModalOpen(true)}
            >
              {isAr ? 'فتح أمر تصليح (OR)' : 'Nouvel OR (Entrée)'}
            </AtriumButton>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-neutral-400 block">
              {isAr ? 'أوامر قيد الإنجاز' : 'En Réparation Active'}
            </span>
            <span className="text-xl font-black text-neutral-900 dark:text-white font-mono mt-0.5 block">
              {activeCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-neutral-400 block">
              {isAr ? 'جسور الرفع المشغولة' : 'Ponts Occupés'}
            </span>
            <span className="text-xl font-black text-[#C4785A] font-mono mt-0.5 block">
              {occupiedBaysCount} / {bays.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-neutral-400 block">
              {isAr ? 'جاهزة للتسليم' : 'Prêts pour Livraison'}
            </span>
            <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">
              {readyCount}
            </span>
          </div>

          {!isMechanicRole && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
              <span className="text-[11px] font-semibold text-neutral-400 block">
                {isAr ? 'قيمة الأوامر الحالية' : 'Volume d\'Affaires OR'}
              </span>
              <span className="text-xl font-black text-neutral-900 dark:text-white font-mono mt-0.5 block">
                {formatMoney(totalBilled, language)}
              </span>
            </div>
          )}
        </div>

        {/* WORKSHOP LIFT OCCUPANCY STRIP */}
        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <Wrench size={14} className="text-[#C4785A]" />
              {isAr ? 'حالة جسور الرفع والورشة في الوقت الفعلي' : 'Occupation Temps Réel des Ponts & Postes Atelier'}
            </span>
            <span className="text-[11px] text-neutral-400">
              {occupiedBaysCount === bays.length ? 'Atelier Plein' : `${bays.length - occupiedBaysCount} postes disponibles`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {bays.map((bay) => {
              const activeOrder = orders.find((o) => o.assignedBayId === bay.id || o.id === bay.activeOrderId);
              return (
                <div
                  key={bay.id}
                  onClick={() => {
                    if (activeOrder) setSelectedOrder(activeOrder);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs ${
                    bay.isOccupied
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-xs'
                      : 'bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200/60 dark:border-neutral-700/60 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-neutral-900 dark:text-white truncate">
                      P{bay.bayNumber}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        bay.isOccupied ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-500 block truncate">{bay.name}</span>
                  {activeOrder ? (
                    <div className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40">
                      <span className="font-mono font-bold text-neutral-900 dark:text-white block text-[11px]">
                        {activeOrder.vehiclePlate}
                      </span>
                      <span className="text-[10px] text-neutral-500 block truncate">{activeOrder.technicianName}</span>
                    </div>
                  ) : (
                    <span className="mt-2 block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Libre
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN VIEW: KANBAN BOARD */}
        {displayMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start">
            {[
              { id: 'Diagnostic', label: isAr ? 'التشخيص' : 'Diagnostic', color: 'border-amber-300 dark:border-amber-800' },
              { id: 'WaitingParts', label: isAr ? 'انتظار القطع' : 'Attente Pièces', color: 'border-rose-300 dark:border-rose-800' },
              { id: 'InRepair', label: isAr ? 'قيد العمل على الجسر' : 'Sur Pont (Travaux)', color: 'border-indigo-300 dark:border-indigo-800' },
              { id: 'Testing', label: isAr ? 'المراقبة والتجريب' : 'Contrôle & Essai', color: 'border-cyan-300 dark:border-cyan-800' },
              { id: 'ReadyForPickup', label: isAr ? 'جاهزة للتسليم' : 'Prêt Livraison', color: 'border-emerald-300 dark:border-emerald-800' },
            ].map((col) => {
              const colOrders = orders.filter((o) => o.status === col.id);
              return (
                <div
                  key={col.id}
                  className="bg-white dark:bg-neutral-900 rounded-3xl p-3 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col space-y-3 min-h-[380px]"
                >
                  <div className={`flex items-center justify-between pb-2 border-b-2 ${col.color}`}>
                    <span className="font-bold text-xs text-neutral-900 dark:text-white">{col.label}</span>
                    <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[11px] font-mono flex items-center justify-center font-bold">
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[550px] pr-1">
                    {colOrders.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400 text-xs italic">
                        {isAr ? 'لا توجد سيارات' : 'Aucun véhicule'}
                      </div>
                    ) : (
                      colOrders.map((order) => (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            selectedOrder?.id === order.id
                              ? 'bg-[#FDF4F0] dark:bg-neutral-800 border-[#C4785A] shadow-xs'
                              : 'bg-[#F8F9FA] dark:bg-neutral-800/40 border-neutral-200/60 dark:border-neutral-700/60 hover:border-neutral-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#C4785A]">
                              {order.orderNumber}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {order.bayName || 'Cour'}
                            </span>
                          </div>

                          <div>
                            <span className="font-bold text-xs text-neutral-900 dark:text-white block font-mono">
                              {order.vehiclePlate}
                            </span>
                            <span className="text-[11px] text-neutral-500 block truncate">
                              {order.vehicleModel}
                            </span>
                          </div>

                          <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-200/40 dark:border-neutral-700/40">
                            <span>{order.technicianName}</span>
                            {!isMechanicRole && (
                              <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                              </span>
                            )}
                          </div>

                          {/* Quick Step Advance Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextStatus(order);
                            }}
                            className="w-full mt-1 py-1 rounded-xl bg-white dark:bg-neutral-700 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-200 text-[10px] font-bold flex items-center justify-center gap-1 border border-neutral-200 dark:border-neutral-600 transition-colors"
                          >
                            <span>{isAr ? 'تقديم المرحلة' : 'Avancer étape'}</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MAIN VIEW: COLLECTION TABLE */
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
            <UniversalDataCollection<RepairOrder>
              data={filteredOrders}
              columns={columns}
              keyExtractor={(o) => o.id}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={isAr ? 'البحث عن رقم الأمر، الماتريكيل أو الزبون...' : 'Recherche par N° OR, matricule ou client...'}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pinnedIds={pinnedIds}
              onPinToggle={handlePin}
              onItemClick={(order: RepairOrder) => setSelectedOrder(order)}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={(field, dir) => {
                setSortBy(field);
                setSortDir(dir);
              }}
              onDelete={(order) => handleDelete(order)}
              customActions={(order: RepairOrder) => [
                {
                  id: 'next',
                  label: isAr ? 'تقديم المرحلة' : 'Avancer étape',
                  icon: <ChevronRight size={13} />,
                  onClick: () => handleNextStatus(order),
                },
                {
                  id: 'req',
                  label: isAr ? 'صرف قطع' : 'Pièces',
                  icon: <Package size={13} />,
                  onClick: () => {
                    setSelectedOrder(order);
                    setIsRequisitionModalOpen(true);
                  },
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* 390PX INLINE SIDE INSPECTOR DRAWER */}
      {selectedOrder && (
        <aside className="w-[390px] shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full shadow-lg overflow-y-auto">
          {/* Drawer Header */}
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/40">
            <div>
              <span className="font-mono text-xs font-bold text-[#C4785A] block">
                {selectedOrder.orderNumber}
              </span>
              <h2 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                {selectedOrder.vehiclePlate} · {selectedOrder.vehicleModel}
              </h2>
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <X size={15} />
            </button>
          </div>

          {/* Drawer Tab Switcher */}
          <div className="flex items-center gap-1 px-4 pt-2 border-b border-neutral-100 dark:border-neutral-800 text-xs">
            {[
              { id: 'ordre', label: 'Détails OR' },
              { id: 'parts', label: `Pièces (${selectedOrder.partsUsed.length})` },
              { id: 'diag', label: 'Diagnostic' },
              ...(!isMechanicRole ? [{ id: 'costs', label: 'Coûts' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Tab Content */}
          <div className="p-5 flex-1 space-y-5 text-xs">
            {activeTab === 'ordre' && (
              <div className="space-y-4">
                {/* Status and Action */}
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-semibold">{isAr ? 'الحالة الحالية' : 'Statut actuel'}</span>
                    {renderStatusBadge(selectedOrder.status)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNextStatus(selectedOrder)}
                    className="w-full py-2 bg-[#C4785A] hover:bg-[#b3684a] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>{isAr ? 'نقل للمرحلة التالية' : 'Passer à l\'étape suivante'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Bay Assignment */}
                <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block">
                    {isAr ? 'جسر الرفع والتقني المكلف' : 'Affectation Pont & Technicien'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                      <span className="text-[10px] text-neutral-400 block">Pont / Baie</span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                        {selectedOrder.bayName || 'Non assigné'}
                      </span>
                    </div>
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                      <span className="text-[10px] text-neutral-400 block">Technicien</span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                        {selectedOrder.technicianName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Intake Vitals */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <Gauge size={12} className="text-[#C4785A]" />
                      Kilométrage
                    </span>
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white mt-1 block">
                      {selectedOrder.inOdometerKm?.toLocaleString() || '—'} km
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <Fuel size={12} className="text-[#C4785A]" />
                      Carburant
                    </span>
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white mt-1 block">
                      {selectedOrder.fuelLevel || '50'}%
                    </span>
                  </div>
                </div>

                {/* Damage Summary */}
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Camera size={13} className="text-[#C4785A]" />
                    {isAr ? 'أضرار الهيكل المسجلة عند الدخول' : 'Dommages notifiés lors du walkaround'} ({(selectedOrder.damageMarkers || []).length})
                  </span>
                  {(selectedOrder.damageMarkers || []).length === 0 ? (
                    <p className="text-[11px] text-neutral-400 italic">Véhicule admis sans dommages carrosserie notés.</p>
                  ) : (
                    <ul className="space-y-1">
                      {selectedOrder.damageMarkers?.map((dm, i) => (
                        <li key={dm.id} className="text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#C4785A] text-white flex items-center justify-center text-[9px] font-bold">
                            {i + 1}
                          </span>
                          <span className="capitalize font-semibold">{dm.damageType}</span>
                          <span className="text-neutral-400">({dm.view} · {dm.severity})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* TAB PARTS REQUISITION */}
            {activeTab === 'parts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    Pièces Rechange Recommandées & Utilisées
                  </span>
                  <AtriumButton
                    variant="secondary"
                    icon={<Plus size={13} />}
                    onClick={() => setIsRequisitionModalOpen(true)}
                  >
                    Sortir Pièce
                  </AtriumButton>
                </div>

                {selectedOrder.partsUsed.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 italic border border-dashed rounded-2xl">
                    Aucune pièce réquisitionnée pour le moment. Cliquez sur "Sortir Pièce" pour ajouter des pièces du magasin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrder.partsUsed.map((p) => (
                      <div key={p.id} className="p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[200px]">
                            {p.name}
                          </span>
                          <span className="font-mono text-neutral-500 font-bold">
                            x{p.quantity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                          <span>{p.sku}</span>
                          {!isMechanicRole && (
                            <span className="font-bold text-[#C4785A]">
                              {formatMoney(p.totalPriceDzd, language)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB DIAGNOSTIC & CHECKLIST */}
            {activeTab === 'diag' && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 space-y-1">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block">
                    Diagnostic Initial & Plaintes
                  </span>
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {selectedOrder.diagnosticNotes}
                  </p>
                </div>

                {/* Quality Checklist */}
                <div className="space-y-2">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block">
                    Contrôle Qualité & Clôture d'Intervention
                  </span>
                  {(selectedOrder.technicianChecklist || [
                    { id: '1', label: 'Vérification serrage au couple des roues', done: true },
                    { id: '2', label: 'Contrôle niveau huile & liquide de refroidissement', done: true },
                    { id: '3', label: 'Test effacement défauts valise OBD-II', done: false },
                    { id: '4', label: 'Essai dynamique sur route & freinage', done: false },
                  ]).map((item) => (
                    <label key={item.id} className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => {
                          // toggle checklist item
                          const current = selectedOrder.technicianChecklist || [];
                          const updated = current.map((c) =>
                            c.id === item.id ? { ...c, done: !c.done } : c
                          );
                          updateOrder({ ...selectedOrder, technicianChecklist: updated });
                        }}
                        className="rounded text-[#C4785A] focus:ring-[#C4785A]"
                      />
                      <span className={`text-xs ${item.done ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* TAB COSTS & MARGINS (Hidden for Mechanic role) */}
            {activeTab === 'costs' && !isMechanicRole && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Main d'œuvre HT :</span>
                    <span className="font-bold">{formatMoney(selectedOrder.laborCostDzd || 3750, language)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Pièces détachées HT :</span>
                    <span className="font-bold">{formatMoney(selectedOrder.partsCostDzd || 15500, language)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 text-sm font-black text-[#C4785A]">
                    <span>Total Facturable :</span>
                    <span>{formatMoney(selectedOrder.finalCostDzd || selectedOrder.estimatedCostDzd, language)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* CREATE ORDER MODAL */}
      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        vehicles={vehicles}
        bays={bays}
        onSave={(newOrder) => {
          addOrder(newOrder);
          setSelectedOrder(newOrder);
        }}
      />

      {/* REQUISITION PARTS MODAL */}
      {isRequisitionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Boxes size={16} className="text-[#C4785A]" />
                <span>{isAr ? 'صرف قطعة غيار لأمر التصليح' : 'Sortie Pièce Magasin (Réquisition)'}</span>
              </h3>
              <button
                onClick={() => setIsRequisitionModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequisitionSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1.5">
                  {isAr ? 'اختيار القطعة من المخزن' : 'Sélectionner la pièce en stock'}
                </label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  required
                >
                  <option value="">-- Choisir une pièce disponible --</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                      {p.name} ({p.sku}) · Stock: {p.stockQuantity} {p.unit || 'pcs'} · {p.sellingPriceDzd.toLocaleString()} DA
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1.5">
                  {isAr ? 'الكمية المطلوبة' : 'Quantité à sortir'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedPartQty}
                  onChange={(e) => setSelectedPartQty(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="secondary" onClick={() => setIsRequisitionModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary">
                  Valider la sortie
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Factory,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  AlertCircle,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Wrench,
  Boxes,
  Percent,
  Printer,
  QrCode,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { ManufacturingOrder, ManufacturingBom } from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const ManufacturingOrdersView: React.FC = () => {
  const {
    language,
    showToast,
    isSyncing,
    networkMode,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();
  const { orders, boms, addOrder, updateOrder, deleteOrder, updateOrderStatus } = useManufacturingData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['of_01']));
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<ManufacturingOrder | null>(null);
  const [orderForFiche, setOrderForFiche] = useState<ManufacturingOrder | null>(null);

  // 390px Inline Side Inspector
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'costing' | 'bom' | 'notes'>('details');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Linked BOM lookup
  const bomMap = useMemo(() => {
    const map = new Map<string, ManufacturingBom>();
    boms.forEach((b) => map.set(b.id, b));
    return map;
  }, [boms]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== 'All' && o.status !== filterStatus) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesProd = o.productName.toLowerCase().includes(q);
        const matchesLot = o.batchLotNumber ? o.batchLotNumber.toLowerCase().includes(q) : false;
        if (!matchesNum && !matchesProd && !matchesLot) return false;
      }
      return true;
    });
  }, [orders, filterStatus, searchQuery]);

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'orderNumber') {
        const cmp = a.orderNumber.localeCompare(b.orderNumber);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'product') {
        const cmp = a.productName.localeCompare(b.productName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'cost') {
        const cmp = a.totalCostDzd - b.totalCostDzd;
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredOrders, pinnedIds, sortBy, sortDir]);

  const activeInProduction = useMemo(() => {
    return orders.filter((o) => o.status === 'InProduction').length;
  }, [orders]);

  const totalValueInWork = useMemo(() => {
    return orders.reduce((acc, o) => acc + (o.totalCostDzd || 0), 0);
  }, [orders]);

  const handleOpenAdd = () => {
    setOrderToEdit(null);
    setIsOrderModalOpen(true);
  };

  const handleOpenEdit = (o: ManufacturingOrder) => {
    setOrderToEdit(o);
    setIsOrderModalOpen(true);
  };

  const handleDelete = (o: ManufacturingOrder) => {
    deleteOrder(o.id);
    if (selectedOrder?.id === o.id) setSelectedOrder(null);
    showToast(language === 'ar' ? 'تم حذف أمر التصنيع' : 'Ordre de fabrication supprimé', 'success');
  };

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectOrder = (o: ManufacturingOrder) => {
    setSelectedOrder(o);
    setInspectorNotes(o.notes || `Ordre de fabrication ${o.orderNumber}. Lancement atelier validé. Contrôle qualité en fin de cycle.`);
    setNoteSaved(false);
  };

  const handleAdvanceStatus = (o: ManufacturingOrder) => {
    const nextStatus: ManufacturingOrder['status'] =
      o.status === 'Planned'
        ? 'InProduction'
        : o.status === 'InProduction'
        ? 'Completed'
        : 'Planned';
    updateOrderStatus(o.id, nextStatus);
    if (selectedOrder?.id === o.id) {
      setSelectedOrder({ ...selectedOrder, status: nextStatus });
    }
    showToast(
      language === 'ar' ? `تم تحديث حالة الأمر إلى ${nextStatus}` : `Statut mis à jour : ${nextStatus}`,
      'info'
    );
  };

  const handleSaveNotes = () => {
    if (!selectedOrder) return;
    const updated = { ...selectedOrder, notes: inspectorNotes };
    updateOrder(updated);
    setSelectedOrder(updated);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(language === 'ar' ? 'تم حفظ ملاحظات الأمر' : 'Consignes de fabrication enregistrées', 'success');
  };

  const handleExportCSV = () => {
    const headers = ['Order Number', 'Product', 'BOM ID', 'Target Qty', 'Produced Qty', 'Lot Number', 'Status', 'Due Date', 'Total Cost (DZD)'];
    const rows = sortedOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.productName}"`,
      `"${o.bomId || ''}"`,
      o.targetQuantity || o.quantityOrdered || 0,
      o.actualQuantityProduced || o.quantityProduced || 0,
      `"${o.batchLotNumber || ''}"`,
      o.status,
      `"${o.dueDate || ''}"`,
      o.totalCostDzd,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manufacturing_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(language === 'ar' ? 'تم تصدير أوامر التصنيع' : 'Export des ordres de fabrication terminé', 'info');
  };

  // Column definitions for List view
  const columns: ColumnDefinition<ManufacturingOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: language === 'ar' ? 'رقم الأمر / المنتج' : 'N° OF & Produit Fini',
        width: '3.4*',
        sortable: true,
        renderCell: (o) => {
          const isPinned = pinnedIds.has(o.id);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Factory size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {o.productName}
                  </span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                  <span className="font-bold text-[#C4785A]">{o.orderNumber}</span>
                  <span>·</span>
                  <span>{o.batchLotNumber || 'LOT-2026'}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'quantities',
        header: language === 'ar' ? 'الكمية المستهدفة / المنجزة' : 'Quantités (Cible / Fait)',
        width: '2.4*',
        renderCell: (o) => {
          const target = o.targetQuantity || o.quantityOrdered || 1;
          const done = o.actualQuantityProduced || o.quantityProduced || 0;
          const pct = Math.min(100, Math.round((done / target) * 100));
          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                <span>{done} / {target} u</span>
                <span className="text-[10px] text-neutral-400">{pct}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#C4785A] h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'cost',
        header: language === 'ar' ? 'التكلفة الإجمالية' : 'Valorisation Totale',
        width: '2.2*',
        sortable: true,
        renderCell: (o) => (
          <div>
            <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
              {formatMoney(o.totalCostDzd)}
            </span>
            <div className="text-[10px] text-neutral-400">
              {language === 'ar' ? 'مواد + عمالة' : 'Matières + MO'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: language === 'ar' ? 'الحالة' : 'Statut Atelier',
        width: '2.0*',
        renderCell: (o) => {
          const isDone = o.status === 'Completed';
          const isProg = o.status === 'InProduction';
          return (
            <div className="text-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                    : isProg
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDone ? 'bg-emerald-500' : isProg ? 'bg-amber-500 animate-[live-heartbeat_1.2s_infinite]' : 'bg-neutral-400'
                  }`}
                />
                {isDone
                  ? (language === 'ar' ? 'مكتمل' : 'Terminé')
                  : isProg
                  ? (language === 'ar' ? 'قيد التصنيع' : 'En Cours')
                  : (language === 'ar' ? 'مخطط' : 'Planifié')}
              </span>
            </div>
          );
        },
      },
    ],
    [pinnedIds, language]
  );

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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Factory size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أوامر التصنيع والتشغيل (OF)' : 'Ordres de Fabrication (OF)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {orders.length} {language === 'ar' ? 'أمر' : 'OF'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إطلاق دفعات الإنتاج، حجز المواد الأولية، وحساب تكلفة اليد العاملة'
                : 'Lancement d\'ordres d\'atelier, consommation matières & suivi d\'avancement'}
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
            <span>{language === 'ar' ? 'أمر تصنيع جديد' : 'Nouvel OF'}</span>
          </AtriumButton>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات خطوط الإنتاج والورشة' : 'Indicateurs de Cadence & Encours Atelier'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar'
              ? 'متابعة الدفعات النشطة، قيمة الإنتاج قيد الإنجاز، ونسب الإتمام'
              : 'Ordres actifs sur postes de travail, valorisation matières & respect des délais'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'أوامر تصنيع قيد الإنجاز' : 'Ordres en Cours Atelier'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {activeInProduction}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'دفعات نشطة على الآلات' : 'En production active'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'قيمة الإنتاج الإجمالية' : 'Encours Total Valorisé'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {formatMoney(totalValueInWork)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'مواد أولية وتكاليف تشغيل' : 'Coût de revient cumulé'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                {language === 'ar' ? 'معايير الجودة والتتبع' : 'Traçabilité & Lots'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                ISO 9001
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100%
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>N° de lots et traçabilité amont/aval</span>
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
              {language === 'ar' ? 'دليل أوامر التصنيع' : 'Ordres de Fabrication'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums">
              ({sortedOrders.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالرقم أو المنتج أو رقم الدفعة...' : 'Recherche OF, produit, lot...'}
              shutSize={36}
              openWidth={220}
            />

            <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterStatus('All')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === 'All'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'Tous'} ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('InProduction')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === 'InProduction'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'قيد التصنيع' : 'En Cours'} ({activeInProduction})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Completed')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === 'Completed'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'مكتمل' : 'Terminés'} ({orders.filter((o) => o.status === 'Completed').length})
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
                {selectedIds.size} {language === 'ar' ? 'أوامر محددة' : 'ordres sélectionnés'}
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
                  selectedIds.forEach((id) => deleteOrder(id));
                  setSelectedIds(new Set());
                  showToast(language === 'ar' ? 'تم حذف الأوامر المحددة' : 'Ordres de fabrication supprimés', 'success');
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
            <UniversalDataCollection<ManufacturingOrder>
              items={sortedOrders}
              keyExtractor={(o) => o.id}
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
              isPinned={(o) => pinnedIds.has(o.id)}
              onTogglePin={(o) => handleTogglePin(o.id)}
              onItemClick={handleSelectOrder}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              customActions={(o) => [
                {
                  id: 'print',
                  label: language === 'ar' ? 'بطاقة التتبع' : 'Fiche Suiveuse',
                  tooltip: language === 'ar' ? 'طباعة بطاقة تتبع الورشة' : 'Imprimer la Fiche Suiveuse Atelier',
                  icon: <Printer size={13} />,
                  variant: 'outline',
                  onClick: () => setOrderForFiche(o),
                },
                {
                  id: 'advance',
                  label: language === 'ar' ? 'تقديم الحالة' : 'Avancer Étape',
                  tooltip: language === 'ar' ? 'تقديم حالة التصنيع' : 'Passer à l\'étape suivante',
                  icon: <Play size={13} />,
                  variant: 'primary',
                  onClick: () => handleAdvanceStatus(o),
                },
              ]}
              renderCard={(o) => {
                const isPinned = pinnedIds.has(o.id);
                const isDone = o.status === 'Completed';
                const target = o.targetQuantity || o.quantityOrdered || 1;
                const done = o.actualQuantityProduced || o.quantityProduced || 0;
                return (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                      <Factory size={32} />
                    </div>
                    <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate tracking-tight">
                        {o.productName}
                      </h3>
                      {isPinned && <span className="text-xs text-amber-500">📌</span>}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 mb-3 border border-neutral-200 dark:border-neutral-700">
                      {o.orderNumber}
                    </span>

                    <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                      <div className="text-neutral-900 dark:text-white font-mono font-bold text-[13px]">
                        {formatMoney(o.totalCostDzd)}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
                        <span className="text-neutral-500 font-mono">{done} / {target} unités</span>
                        {isDone ? (
                          <span className="text-emerald-600 font-bold">{language === 'ar' ? 'مكتمل' : 'Terminé'}</span>
                        ) : (
                          <span className="text-amber-600 font-bold">{language === 'ar' ? 'قيد التصنيع' : 'En Cours'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
              emptyTitle={language === 'ar' ? 'لا توجد أوامر تصنيع مطابقة' : 'Aucun ordre de fabrication'}
              emptyDescription={language === 'ar' ? 'أطلق أول أمر تصنيع أو أعد ضبط معايير البحث' : 'Lancez un premier ordre de fabrication ou modifiez vos filtres de recherche'}
              primaryActionLabel={language === 'ar' ? 'أمر جديد' : 'Nouvel OF'}
              onAddFirstItem={handleOpenAdd}
              onResetFilters={() => {
                setSearchQuery('');
                setFilterStatus('All');
              }}
              hasActiveFilters={searchQuery.length > 0 || filterStatus !== 'All'}
            />
          </div>

          {/* 390px Inline Side Inspector Drawer */}
          {selectedOrder && (
            <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[700px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-[#F5E2D8]">
                    <Factory size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {selectedOrder.orderNumber}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono truncate">
                      <span>{selectedOrder.productName}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(selectedOrder)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Play size={13} />
                  <span>{language === 'ar' ? 'تقديم الخطوة' : 'Avancer Étape'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderForFiche(selectedOrder)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                  title={language === 'ar' ? 'طباعة بطاقة التتبع' : 'Imprimer Fiche Suiveuse'}
                >
                  <Printer size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedOrder)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                  title="Modifier"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(selectedOrder.id)}
                  className={`p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold transition-colors ${
                    pinnedIds.has(selectedOrder.id) ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-700'
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
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'details'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'أمر التصنيع' : 'Ordre'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('costing')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'costing'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'التكاليف' : 'Coûts'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bom')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'bom'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'التركيبة BOM' : 'BOM'}
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
                  {language === 'ar' ? 'الورشة' : 'Atelier'}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'details' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'معلومات الدفعة' : 'Paramètres de Fabrication'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'المنتج النهائي' : 'Produit fini'}</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-right max-w-[200px] truncate">{selectedOrder.productName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'رقم الدفعة' : 'N° de Lot (Batch)'}</span>
                        <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{selectedOrder.batchLotNumber || 'LOT-2026-05'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الكمية المستهدفة' : 'Quantité cible'}</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedOrder.targetQuantity || selectedOrder.quantityOrdered || 1} unités</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الكمية المنتجة' : 'Quantité produite'}</span>
                        <span className="font-mono font-bold text-[#C4785A]">{selectedOrder.actualQuantityProduced || selectedOrder.quantityProduced || 0} unités</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'محطة التشغيل' : 'Poste assigné'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedOrder.assignedStation || 'Ligne Principale'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'costing' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'تفكيك التكاليف الصناعية' : 'Décomposition Coût de Revient'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'المواد الأولية' : 'Matières premières'}</span>
                        <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{formatMoney(selectedOrder.totalMaterialCostDzd || 0)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'اليد العاملة المباشرة' : 'Main d\'œuvre atelier'}</span>
                        <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{formatMoney(selectedOrder.totalLaborCostDzd || 0)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-neutral-900 dark:text-white text-[13px]">
                        <span>{language === 'ar' ? 'التكلفة الإجمالية' : 'Coût Total de Fabrication'}</span>
                        <span className="font-mono text-[#C4785A]">{formatMoney(selectedOrder.totalCostDzd)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'bom' && (
                  <div className="space-y-2 text-xs">
                    {selectedOrder.bomId && bomMap.has(selectedOrder.bomId) ? (
                      (() => {
                        const b = bomMap.get(selectedOrder.bomId)!;
                        return (
                          <div className="space-y-2">
                            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                              <span>{b.bomCode}</span>
                              <span className="font-mono text-[#C4785A]">{formatMoney(b.estimatedCostDzd)} / u</span>
                            </div>
                            <div className="space-y-1.5">
                              {b.components.map((c, i) => (
                                <div key={i} className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                  <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[190px]">{c.rawProductName}</span>
                                  <span className="font-mono text-neutral-500">{c.quantity} {c.unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 text-neutral-400">
                        <Boxes size={28} className="mx-auto mb-2 opacity-40" />
                        <p>{language === 'ar' ? 'لا توجد تركيبة مرتبطة' : 'Aucune nomenclature liée.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                      {language === 'ar' ? 'ملاحظات وتوجيهات الورشة' : 'Consignes d\'Atelier & Rebuts'}
                    </label>
                    <textarea
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      rows={8}
                      placeholder={language === 'ar' ? 'أدخل ملاحظات الورشة...' : 'Tolérances dimensionnelles, cadence, rebus observés...'}
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

      {/* Order Create / Edit Modal */}
      {isOrderModalOpen && (
        <ManufacturingOrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setOrderToEdit(null);
          }}
          boms={boms}
          orderToEdit={orderToEdit}
          onSave={(o) => {
            if (orderToEdit) {
              updateOrder(o);
              if (selectedOrder?.id === o.id) setSelectedOrder(o);
              showToast(language === 'ar' ? 'تم تحديث أمر التصنيع' : 'Ordre de fabrication mis à jour', 'success');
            } else {
              addOrder(o);
              showToast(language === 'ar' ? 'تم إنشاء أمر التصنيع بنجاح' : 'Ordre de fabrication créé avec succès', 'success');
            }
            setIsOrderModalOpen(false);
            setOrderToEdit(null);
          }}
        />
      )}
      {/* Printable Fiche Suiveuse OF Modal */}
      {orderForFiche && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Header / Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'بطاقة التتبع المرافقة للورشة (Fiche Suiveuse)' : 'Fiche Suiveuse d\'Atelier & Ordre de Travail'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Document officiel d'atelier • Traçabilité Décret 05-468 & ISO 9001
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Printer size={14} />
                  <span>{language === 'ar' ? 'طباعة' : 'Imprimer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderForFiche(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet Preview */}
            <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-neutral-300 text-neutral-900 space-y-5 shadow-xs font-sans">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <div className="font-black text-lg tracking-tight text-[#1F1D1B]">
                    ATRIUM MANUFACTURE & ATELIER PME
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    Zone Industrielle Oued Smar, Alger • NIF: 001916010044589 • RC: 16/00-0988421
                  </div>
                  <div className="text-xs font-bold text-[#C4785A] mt-1">
                    FICHE SUIVEUSE DE PRODUCTION • ORDRE DE FABRICATION
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-xl text-[#C4785A]">
                    {orderForFiche.orderNumber}
                  </div>
                  <div className="font-mono text-xs font-bold text-neutral-700 mt-0.5">
                    {orderForFiche.batchLotNumber || 'LOT-202610-0089'}
                  </div>
                  <div className="font-mono text-[10px] text-neutral-400 mt-1 tracking-widest">
                    |||||||||||||||||||||||||||||||
                  </div>
                </div>
              </div>

              {/* OF Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 rounded-xl text-xs border border-neutral-200">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Produit Fini</span>
                  <span className="font-bold text-neutral-900">{orderForFiche.productName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Quantité Cible</span>
                  <span className="font-mono font-bold text-neutral-900">{orderForFiche.targetQuantity} unités</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Poste / Ligne</span>
                  <span className="font-semibold text-neutral-900">{orderForFiche.assignedStation || 'Poste 03 CNC'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Échéance</span>
                  <span className="font-mono font-semibold text-neutral-900">{orderForFiche.dueDate?.split('T')[0] || '2026-06-15'}</span>
                </div>
              </div>

              {/* Routing Steps Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Gamme Opératoire & Visas de Validation Postes
                </div>
                <table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
                  <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="p-2 text-left w-12">Op.</th>
                      <th className="p-2 text-left">Poste de Travail / Opération</th>
                      <th className="p-2 text-center w-24">Cadence</th>
                      <th className="p-2 text-center w-28">Visa Opérateur</th>
                      <th className="p-2 text-center w-28">Visa Contrôle CQ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">010</td>
                      <td className="p-2">Découpe, Dégauchissage & Calibrage brut</td>
                      <td className="p-2 font-mono text-center">45 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">020</td>
                      <td className="p-2">Usinage commande numérique & Perçage CNC</td>
                      <td className="p-2 font-mono text-center">60 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">030</td>
                      <td className="p-2">Assemblage mécanique & Pose quincaillerie</td>
                      <td className="p-2 font-mono text-center">40 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">040</td>
                      <td className="p-2">Finition de surface & Contrôle dimensionnel final</td>
                      <td className="p-2 font-mono text-center">30 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-neutral-400 text-[10px]">[ ______ ]</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Loi 88-07 Safety & Scrap Notice */}
              <div className="p-3 bg-neutral-100 rounded-xl text-[11px] text-neutral-600 flex items-center justify-between">
                <span>⚠️ <strong>Sécurité Loi 88-07 :</strong> Port des EPI (lunettes, gants, chaussures) obligatoire sur toute la phase.</span>
                <span className="font-mono font-bold text-neutral-800">Tolérance Rebut : &lt; 3%</span>
              </div>

              {/* Signatures Footer */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center text-xs">
                <div>
                  <span className="text-neutral-400 text-[10px] block">Chef d'Atelier (Lancement)</span>
                  <div className="h-10 flex items-center justify-center font-serif text-neutral-700 italic">M. Brahim M.</div>
                </div>
                <div>
                  <span className="text-neutral-400 text-[10px] block">Magasinier (Sortie BSM)</span>
                  <div className="h-10 flex items-center justify-center font-serif text-neutral-700 italic">M. Amine T.</div>
                </div>
                <div>
                  <span className="text-neutral-400 text-[10px] block">Responsable Qualité (Quitus)</span>
                  <div className="h-10 flex items-center justify-center font-serif text-neutral-700 italic">Ing. S. Mokrani</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

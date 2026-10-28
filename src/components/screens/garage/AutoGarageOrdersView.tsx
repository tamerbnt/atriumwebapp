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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, RepairOrder } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { AutoOrderModal } from './AutoOrderModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const AutoGarageOrdersView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { orders, vehicles, addOrder, updateOrder, deleteOrder, updateOrderStatus } = useGarageData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['or_01']));
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // 390px Inline Side Inspector
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(() => {
    return orders[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'ordre' | 'diag' | 'costs' | 'notes'>('ordre');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

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

  // Actions
  const handlePin = (o: RepairOrder) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(o.id)) next.delete(o.id);
      else next.add(o.id);
      return next;
    });
    showToast(
      pinnedIds.has(o.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Ordre désépinglé')
        : (isAr ? 'تم تثبيت أمر التصليح' : 'Ordre épinglé'),
      'info'
    );
  };

  const handleDelete = (o: RepairOrder) => {
    deleteOrder(o.id);
    if (selectedOrder?.id === o.id) {
      setSelectedOrder(null);
    }
    showToast(isAr ? 'تم حذف أمر التصليح' : 'Ordre de réparation supprimé', 'success');
  };

  const handleAdvanceStatus = (o: RepairOrder) => {
    const cycle: Record<RepairOrder['status'], RepairOrder['status']> = {
      Diagnostic: 'WaitingParts',
      WaitingParts: 'InRepair',
      InRepair: 'Testing',
      Testing: 'ReadyForPickup',
      ReadyForPickup: 'Delivered',
      Delivered: 'Diagnostic',
    };
    const nextStatus = cycle[o.status] || 'Diagnostic';
    updateOrderStatus(o.id, nextStatus);
    const updated = { ...o, status: nextStatus };
    if (selectedOrder?.id === o.id) setSelectedOrder(updated);
    showToast(
      isAr ? `تحديث حالة الأمر: ${nextStatus}` : `Étape franchie : ${nextStatus}`,
      'success'
    );
  };

  const handleExportCsv = () => {
    const headers = ['N° OR', 'Immatriculation', 'Véhicule', 'Client', 'Téléphone', 'Statut', 'Devis Estimé DZD', 'Coût Final DZD', 'Technicien'];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.vehiclePlate,
      `"${o.vehicleModel.replace(/"/g, '""')}"`,
      `"${o.clientName.replace(/"/g, '""')}"`,
      o.clientPhone,
      o.status,
      o.estimatedCostDzd,
      o.finalCostDzd,
      `"${o.technicianName.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ordres_reparation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف أوامر التصليح CSV' : 'Export CSV des OR généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedOrder) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ توجيهات الورشة' : 'Consignes d’intervention enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<RepairOrder>[] = [
    {
      id: 'orderNumber',
      header: isAr ? 'رقم الأمر' : 'N° OR',
      accessorKey: 'orderNumber',
      sortable: true,
      minWidth: '130px',
      cell: (o) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <ClipboardList size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {o.orderNumber}
              {pinnedIds.has(o.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              {o.intakeDate ? o.intakeDate.split('T')[0] : 'Atelier'}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'vehicle',
      header: isAr ? 'المركبة' : 'Véhicule & Plaque',
      accessorKey: 'vehiclePlate',
      sortable: true,
      minWidth: '180px',
      cell: (o) => (
        <div>
          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
            {o.vehiclePlate}
          </div>
          <div className="text-[11px] text-neutral-500 line-clamp-1">
            {o.vehicleModel}
          </div>
        </div>
      ),
    },
    {
      id: 'client',
      header: isAr ? 'العميل' : 'Client & Contact',
      accessorKey: 'clientName',
      sortable: true,
      minWidth: '160px',
      cell: (o) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {o.clientName}
          </div>
          <div className="text-[10px] text-neutral-400">
            {o.clientPhone}
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الحالة' : 'Statut Atelier',
      accessorKey: 'status',
      sortable: true,
      minWidth: '140px',
      cell: (o) => {
        let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
        let label = 'Diagnostic';
        if (o.status === 'InRepair') {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
          label = 'En Réparation';
        } else if (o.status === 'ReadyForPickup') {
          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
          label = 'Prêt à Livrer';
        } else if (o.status === 'Delivered') {
          badgeColor = 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300';
          label = 'Livré / Clôturé';
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      id: 'technician',
      header: isAr ? 'الميكانيكي' : 'Technicien',
      accessorKey: 'technicianName',
      sortable: true,
      minWidth: '140px',
      cell: (o) => (
        <div className="text-xs text-neutral-700 dark:text-neutral-300">
          {o.technicianName}
        </div>
      ),
    },
    {
      id: 'cost',
      header: isAr ? 'التكلفة' : 'Montant DZD',
      accessorKey: 'estimatedCostDzd',
      sortable: true,
      minWidth: '130px',
      cell: (o) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(o.finalCostDzd || o.estimatedCostDzd)}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'أوامر التصليح (Ordres de Réparation)' : 'Ordres de Réparation (OR)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {orders.length} OR
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'متابعة مراحل الإصلاح، الفحص التقني، وقطع الغيار المستهلكة'
                : 'Cycle complet atelier : Diagnostic → Réparation → Essai → Bon de sortie'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={() => setIsOrderModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'أمر تصليح جديد' : 'Nouvel OR'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'حالة أوامر الصيانة ومراحل الإنجاز' : 'État des Ordres de Travail & Disponibilité'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة وتيرة العمل على الرافعات وتجهيز المركبات' : 'Répartition des véhicules par phase d’intervention atelier'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: En cours */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مركبات في ورشة التصليح' : 'Véhicules en Réparation'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCount}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'تدخلات نشطة على الرافعات' : 'Sur les ponts élévateurs'}
              </p>
            </div>
          </div>

          {/* Card 2: Prêt à livrer */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'جاهزة للتسليم للعميل' : 'Prêts pour Restitution'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {readyCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'في انتظار استلام الزبون' : 'Essai routier validé'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي فواتير الصيانة' : 'Facturation Atelier'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Chiffre d’Affaires
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalBilled)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {orders.length} {isAr ? 'أمر تصليح مسجل' : 'dossiers traités'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
      <div className="flex items-start gap-4">
        {/* Main Collection Container */}
        <div className="flex-1 min-w-0">
          <UniversalDataCollection<RepairOrder>
            data={filteredOrders}
            columns={columns}
            keyExtractor={(o) => o.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم الأمر، اللوحة، العميل...' : 'Rechercher par N° OR, plaque, modèle, client...'}
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={[
              { value: 'all', label: isAr ? 'جميع الحالات' : 'Tous les statuts' },
              { value: 'Diagnostic', label: 'Diagnostic' },
              { value: 'InRepair', label: 'En réparation' },
              { value: 'ReadyForPickup', label: 'Prêt à livrer' },
              { value: 'Delivered', label: 'Livré & Clôturé' },
            ]}
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
            onItemClick={(o) => {
              setSelectedOrder(o);
            }}
            onDelete={handleDelete}
            emptyIcon={<ClipboardList size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد أوامر تصليح' : 'Aucun ordre de réparation trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche')
                : (isAr ? 'قم بفتح أول أمر تصليح للمركبة' : 'Créez votre premier ordre de réparation')
            }
            customActions={[
              {
                id: 'advance',
                label: isAr ? 'المرحلة التالية' : 'Étape Suivante',
                icon: <ArrowRight size={14} />,
                onClick: handleAdvanceStatus,
              },
            ]}
            renderGridCard={(o) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                    {o.orderNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      o.status === 'ReadyForPickup'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : o.status === 'InRepair'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 font-mono">
                    {o.vehiclePlate}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5">
                    {o.vehicleModel} • {o.clientName}
                  </div>
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl line-clamp-2 text-[11px]">
                  {o.diagnosticNotes}
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Montant</div>
                    <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                      {formatMoney(o.finalCostDzd || o.estimatedCostDzd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Technicien</div>
                    <div className="font-medium text-neutral-700 dark:text-neutral-300 mt-0.5 truncate max-w-[110px]">
                      {o.technicianName}
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedOrder && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedOrder.orderNumber}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedOrder.status === 'ReadyForPickup'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : selectedOrder.status === 'InRepair'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedOrder.vehiclePlate} ({selectedOrder.vehicleModel})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleAdvanceStatus(selectedOrder)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <ArrowRight size={12} />
                {isAr ? 'المرحلة التالية' : 'Étape Suivante'}
              </button>
              <button
                onClick={() => handleDelete(selectedOrder)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('ordre')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'ordre'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الأمر' : 'Dossier OR'}
              </button>
              <button
                onClick={() => setActiveTab('diag')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'diag'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الفحص' : 'Diagnostic'}
              </button>
              <button
                onClick={() => setActiveTab('costs')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'costs'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الفوترة' : 'Coûts & Devis'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الملاحظات' : 'Consignes'}
              </button>
            </div>

            {/* Tab 1: Dossier OR */}
            {activeTab === 'ordre' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'المركبة:' : 'Véhicule:'}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedOrder.vehicleModel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'اللوحة:' : 'Immatriculation:'}</span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {selectedOrder.vehiclePlate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'صاحب المركبة:' : 'Client:'}</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedOrder.clientName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'الهاتف:' : 'Téléphone:'}</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedOrder.clientPhone}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'تاريخ الدخول:' : 'Date Réception:'}</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedOrder.intakeDate ? selectedOrder.intakeDate.split('T')[0] : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'الميكانيكي المشرف:' : 'Technicien:'}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedOrder.technicianName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Diagnostic */}
            {activeTab === 'diag' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                    Diagnostic Initial & Anomalies :
                  </span>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {selectedOrder.diagnosticNotes}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Costs */}
            {activeTab === 'costs' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'التقدير الأولي:' : 'Devis Estimatif:'}</span>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                      {formatMoney(selectedOrder.estimatedCostDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'التكلفة النهائية:' : 'Coût Final Atelier:'}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(selectedOrder.finalCostDzd || selectedOrder.estimatedCostDzd)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Consignes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Consignes de sécurité atelier et recommandations pour la restitution :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter le rapport d'essai sur route, contrôle des niveaux, serrage au couple..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                >
                  {noteSaved ? (
                    <>
                      <Check size={14} />
                      {isAr ? 'تم الحفظ' : 'Consignes enregistrées'}
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

      {/* New Order Modal */}
      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        vehicles={vehicles}
        onSave={(newOrder) => {
          addOrder(newOrder);
          setSelectedOrder(newOrder);
          setIsOrderModalOpen(false);
        }}
      />
    </div>
  );
};

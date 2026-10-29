import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Printer,
  Users,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  Package,
  DollarSign,
  MapPin,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LogisticsManifest } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const LogisticsManifestsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { manifests, shipments, addManifest, updateManifest, deleteManifest } = useLogisticsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['man_01']));
  const [sortBy, setSortBy] = useState<string>('manifestNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manifestToEdit, setManifestToEdit] = useState<LogisticsManifest | null>(null);

  // Form states inside Modal
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('0550 12 34 56');
  const [vehiclePlate, setVehiclePlate] = useState('01452-120-16');
  const [zoneWilaya, setZoneWilaya] = useState('Alger Est & Centre');
  const [status, setStatus] = useState<LogisticsManifest['status']>('Dispatched');

  // 390px Inline Side Inspector
  const [selectedManifest, setSelectedManifest] = useState<LogisticsManifest | null>(() => {
    return manifests[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'manifest' | 'colis' | 'cod' | 'notes'>('manifest');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const openCreateModal = () => {
    setManifestToEdit(null);
    setDriverName('');
    setDriverPhone('0550 12 34 56');
    setVehiclePlate('01452-120-16');
    setZoneWilaya('Alger Est & Centre');
    setStatus('Dispatched');
    setIsModalOpen(true);
  };

  const openEditModal = (m: LogisticsManifest) => {
    setManifestToEdit(m);
    setDriverName(m.driverName);
    setDriverPhone(m.driverPhone);
    setVehiclePlate(m.vehiclePlate);
    setZoneWilaya(m.zoneWilaya || 'Alger');
    setStatus(m.status);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم السائق' : 'Veuillez saisir le nom du chauffeur', 'error');
      return;
    }

    const unassignedShipments = shipments.filter(
      (s) => s.status === 'ReceivedAtHub' || s.status === 'Sorted'
    );
    const count = manifestToEdit ? manifestToEdit.totalShipmentsCount : (unassignedShipments.length || 5);
    const codTotal = manifestToEdit ? manifestToEdit.totalCodExpectedDzd : (unassignedShipments.reduce((acc, s) => acc + s.codAmountDzd, 0) || 45000);

    const payload: LogisticsManifest = {
      id: manifestToEdit?.id || `man_${Date.now()}`,
      accountId: manifestToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      manifestNumber: manifestToEdit?.manifestNumber || `MAN-2026-${String(manifests.length + 42).padStart(3, '0')}`,
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
      showToast(isAr ? 'تم إنشاء ورقة طريق السائق بنجاح' : 'Feuille de route émise avec succès', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredManifests = useMemo(() => {
    return manifests.filter((m) => {
      if (filterStatus !== 'All' && m.status !== filterStatus) {
        return false;
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
  }, [manifests, filterStatus, searchQuery]);

  // KPIs
  const totalParcelsInManifests = manifests.reduce((acc, m) => acc + (m.totalShipmentsCount || m.shipmentIds.length), 0);
  const totalCodInManifests = manifests.reduce((acc, m) => acc + (m.totalCodExpectedDzd || 0), 0);
  const completedTournees = manifests.filter((m) => m.status === 'Completed' || m.status === 'Reconciled').length;

  // Actions
  const handlePin = (m: LogisticsManifest) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
    showToast(
      pinnedIds.has(m.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Manifeste désépinglé')
        : (isAr ? 'تم تثبيت ورقة الطريق' : 'Manifeste épinglé'),
      'info'
    );
  };

  const handleDelete = (m: LogisticsManifest) => {
    deleteManifest(m.id);
    if (selectedManifest?.id === m.id) {
      setSelectedManifest(null);
    }
    showToast(isAr ? 'تم حذف ورقة الطريق' : 'Manifeste de distribution supprimé', 'success');
  };

  const handleCloseTournee = (m: LogisticsManifest) => {
    const nextStatus: LogisticsManifest['status'] = m.status === 'Completed' ? 'Dispatched' : 'Completed';
    const updated: LogisticsManifest = {
      ...m,
      status: nextStatus,
      totalCodCollectedDzd: nextStatus === 'Completed' ? m.totalCodExpectedDzd : 0,
    };
    updateManifest(updated);
    if (selectedManifest?.id === m.id) setSelectedManifest(updated);
    showToast(
      nextStatus === 'Completed'
        ? (isAr ? 'تم تأكيد عودة السائق وتصفية الطرود' : 'Tournée clôturée et encaissement validé')
        : (isAr ? 'إعادة فتح المسار' : 'Tournée réouverte'),
      'success'
    );
  };

  const handleExportCsv = () => {
    const headers = ['N° Manifeste', 'Chauffeur', 'Téléphone', 'Véhicule', 'Wilaya / Zone', 'Nombre Colis', 'COD Attendu DZD', 'Date Dispatch', 'Statut'];
    const rows = filteredManifests.map((m) => [
      m.manifestNumber,
      `"${m.driverName.replace(/"/g, '""')}"`,
      m.driverPhone,
      m.vehiclePlate,
      `"${(m.zoneWilaya || '').replace(/"/g, '""')}"`,
      m.totalShipmentsCount,
      m.totalCodExpectedDzd,
      m.dispatchDate,
      m.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `manifestes_tournees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير أوراق الطريق CSV' : 'Export CSV des manifestes généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedManifest) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ تعليمات المسار' : 'Consignes de tournée enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<LogisticsManifest>[] = [
    {
      id: 'manifestNumber',
      header: isAr ? 'رقم الإرسال' : 'N° Manifeste',
      accessorKey: 'manifestNumber',
      sortable: true,
      minWidth: '130px',
      cell: (m) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Truck size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {m.manifestNumber}
              {pinnedIds.has(m.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              {m.dispatchDate}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'driverName',
      header: isAr ? 'السائق والمركبة' : 'Chauffeur & Véhicule',
      accessorKey: 'driverName',
      sortable: true,
      minWidth: '180px',
      cell: (m) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {m.driverName}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            {m.vehiclePlate} ({m.driverPhone})
          </div>
        </div>
      ),
    },
    {
      id: 'zoneWilaya',
      header: isAr ? 'المنطقة' : 'Secteur / Wilaya',
      accessorKey: 'zoneWilaya',
      sortable: true,
      minWidth: '140px',
      cell: (m) => (
        <div className="flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
          <MapPin size={12} className="text-[#C4785A] shrink-0" />
          <span>{m.zoneWilaya || 'Alger'}</span>
        </div>
      ),
    },
    {
      id: 'parcels',
      header: isAr ? 'الطرود' : 'Colis',
      accessorKey: 'totalShipmentsCount',
      sortable: true,
      minWidth: '100px',
      cell: (m) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
          {m.totalShipmentsCount} colis
        </div>
      ),
    },
    {
      id: 'codExpected',
      header: isAr ? 'المبلغ المطلوب تحصيله' : 'Total COD Attendu',
      accessorKey: 'totalCodExpectedDzd',
      sortable: true,
      minWidth: '140px',
      cell: (m) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(m.totalCodExpectedDzd)}
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الحالة' : 'Statut Tournée',
      accessorKey: 'status',
      sortable: true,
      minWidth: '120px',
      cell: (m) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            m.status === 'Completed'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
          }`}
        >
          {m.status === 'Completed' ? 'Clôturée' : 'En Tournée'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'أوراق الإرسال ومسارات الشاحنات' : 'Manifestes de Dispatch & Feuilles de Route'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {manifests.length} manifestes
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تنظيم رحلات التوزيع، تعيين السائقين، وجرد الطرود المحملة لكل مسار'
                : 'Bordereaux de chargement camion, assignation des coursiers & validation des tournées'}
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
            onClick={openCreateModal}
            icon={<Plus size={14} />}
          >
            {isAr ? 'ورقة طريق جديدة' : 'Nouveau Manifeste'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'حمولة الأسطول ومبالغ التحصيل الميداني' : 'Activité Flotte & Encaissement Livreur'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة حركة الشاحنات، الطرود المسندة وإجمالي مبالغ الدفع عند الاستلام' : 'Feuilles de routes actives, réconciliation des montants contre-remboursement'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Colis */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الطرود المحملة' : 'Colis en Tournée'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {totalParcelsInManifests}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {manifests.length} {isAr ? 'مسارات مسجلة' : 'tournées chauffeurs'}
              </p>
            </div>
          </div>

          {/* Card 2: Clôtures */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المسارات المكتملة' : 'Tournées Clôturées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {completedTournees} / {manifests.length}
              </div>
              <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">
                {isAr ? 'تمت تصفيتها بالخزينة' : 'Réconciliées avec décharge'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'مجموع مبالغ COD المطلوبة' : 'Encaissements COD'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Cash on Delivery
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalCodInManifests)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'تحت عهدة السائقين' : 'Bordereaux scellés'}
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
              {isAr ? 'بيانات الشحن وأوراق الطريق الرسمية' : 'Manifestes de Dispatch & Feuilles de Route'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متابعة مسارات السائقين، حمولات الطرود ومبالغ الدفع عند الاستلام' : 'Attribution des tournées chauffeurs, scellés de sécurité et suivi COD'}
            </p>
          </div>

          {/* Authentic Logistics Manifest Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'All', label: isAr ? 'جميع المسارات' : 'Toutes tournées' },
              { id: 'Draft', label: isAr ? 'قيد التحميل' : 'En chargement' },
              { id: 'InTransit', label: isAr ? 'في الطريق' : 'En transit' },
              { id: 'Delivered', label: isAr ? 'مكتملة' : 'Clôturées' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: filterStatus === f.id ? '#FCEEE8' : 'transparent',
                  color: filterStatus === f.id ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
        <div className="flex items-start gap-4">
          {/* Main Collection Container */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<LogisticsManifest>
            data={filteredManifests}
            columns={columns}
            keyExtractor={(m) => m.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم الإرسال، السائق، المنطقة...' : 'Rechercher par manifeste, chauffeur, zone...'}
            filterValue={filterStatus}
            onFilterChange={setFilterStatus}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع الحالات' : 'Tous statuts' },
              { value: 'Dispatched', label: 'En Tournée (Dispatched)' },
              { value: 'Completed', label: 'Clôturées (Completed)' },
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
            onItemClick={(m) => {
              setSelectedManifest(m);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<Truck size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد أوراق طريق' : 'Aucun manifeste trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche')
                : (isAr ? 'قم بإنشاء أول ورقة طريق للسائق' : 'Émettez votre premier manifeste de dispatch')
            }
            customActions={[
              {
                id: 'closeTournee',
                label: isAr ? 'تأكيد إتمام المسار' : 'Clôturer Tournée',
                icon: <CheckCircle2 size={14} />,
                onClick: handleCloseTournee,
              },
            ]}
            renderGridCard={(m) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                    {m.manifestNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}
                  >
                    {m.status === 'Completed' ? 'Clôturée' : 'En Tournée'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {m.driverName}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin size={12} className="text-[#C4785A] shrink-0" />
                    <span>{m.zoneWilaya} • {m.vehiclePlate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">COD Attendu</div>
                    <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                      {formatMoney(m.totalCodExpectedDzd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Colis</div>
                    <div className="font-mono font-semibold text-neutral-700 dark:text-neutral-300 mt-0.5">
                      {m.totalShipmentsCount} unités
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedManifest && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Truck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedManifest.manifestNumber}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedManifest.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {selectedManifest.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedManifest.driverName} ({selectedManifest.vehiclePlate})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedManifest(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleCloseTournee(selectedManifest)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <CheckCircle2 size={12} />
                {selectedManifest.status === 'Completed' ? 'Réouvrir' : 'Clôturer'}
              </button>
              <button
                onClick={() => openEditModal(selectedManifest)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedManifest)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('manifest')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'manifest'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المسار' : 'Détails'}
              </button>
              <button
                onClick={() => setActiveTab('colis')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'colis'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الطرود' : 'Colisage'}
              </button>
              <button
                onClick={() => setActiveTab('cod')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'cod'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'التحصيل' : 'Finance COD'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'التعليمات' : 'Consignes'}
              </button>
            </div>

            {/* Tab 1: Manifest */}
            {activeTab === 'manifest' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Chauffeur assigné:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedManifest.driverName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Contact:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedManifest.driverPhone}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Véhicule:</span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {selectedManifest.vehiclePlate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Zone de livraison:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedManifest.zoneWilaya}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Date d'expédition:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedManifest.dispatchDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Nombre de colis:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedManifest.totalShipmentsCount} colis
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Colis */}
            {activeTab === 'colis' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Colis chargés sur feuille:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedManifest.totalShipmentsCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Bordereau de chargement scellé au départ du hub. Tous les scans codes-barres sont confirmés.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: COD */}
            {activeTab === 'cod' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Total COD à encaisser:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(selectedManifest.totalCodExpectedDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Montant reversé en caisse:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(selectedManifest.totalCodCollectedDzd || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Consignes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Ordre de tournée, consignes de sécurité et instructions pour colis fragiles :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les points relais à livrer en priorité, numéros urgents..."
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
      </div>

      {/* New / Edit Manifest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Truck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {manifestToEdit
                      ? (isAr ? 'تعديل ورقة الطريق' : 'Modifier le Manifeste')
                      : (isAr ? 'إنشاء ورقة طريق جديدة' : 'Nouvelle Feuille de Route')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'تعيين السائق، المركبة، ومنطقة التوزيع' : 'Affectation chauffeur, véhicule et zone de distribution'}
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
                  onChange={(e) => setStatus(e.target.value as LogisticsManifest['status'])}
                  options={[
                    { value: 'Dispatched', label: 'En Tournée (Dispatched)' },
                    { value: 'Completed', label: 'Clôturée (Completed)' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {manifestToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'تأكيد إصدار الورقة' : 'Émettre le Manifeste')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

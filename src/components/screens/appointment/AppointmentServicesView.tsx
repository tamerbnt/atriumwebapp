import React, { useState, useMemo, useEffect } from 'react';
import {
  Scissors,
  Sparkles,
  Clock,
  Plus,
  Building2,
  ChevronDown,
  Download,
  Trash2,
  Pin,
  Edit2,
  DollarSign,
  TrendingUp,
  Percent,
  Search,
  Filter,
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
  Sparkle,
  SparkleIcon,
  Tag,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { ServiceItem } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { formatMoney } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

export const AppointmentServicesView: React.FC = () => {
  const {
    servicesCatalog,
    currentBranch,
    branches,
    switchBranch,
    addServiceItem,
    updateServiceItem,
    deleteServiceItem,
    batchDeleteServiceItems,
    resetSalonMockData,
    showToast,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Selection & Pinning State for UniversalDataCollection
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [pinnedServiceIds, setPinnedServiceIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ServiceItem['category']>('Hair');
  const [formDuration, setFormDuration] = useState(60);
  const [formPrice, setFormPrice] = useState(5000);
  const [formCostPrice, setFormCostPrice] = useState(500);
  const [formCommission, setFormCommission] = useState(40);
  const [formBuffer, setFormBuffer] = useState(10);
  const [formColor, setFormColor] = useState('#C4785A');
  const [formDescription, setFormDescription] = useState('');

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!servicesCatalog || servicesCatalog.length === 0) {
      resetSalonMockData();
    }
  }, [servicesCatalog, resetSalonMockData]);

  // Filtered services list
  const filteredServices = useMemo(() => {
    return (servicesCatalog || []).filter((s) => {
      if (activeCategory !== 'All' && s.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchDesc = (s.description || '').toLowerCase().includes(q);
        const matchCat = s.category.toLowerCase().includes(q);
        return matchName || matchDesc || matchCat;
      }
      return true;
    });
  }, [servicesCatalog, activeCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: (servicesCatalog || []).length };
    (servicesCatalog || []).forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [servicesCatalog]);

  // Top Metrics
  const catalogMetrics = useMemo(() => {
    const list = servicesCatalog || [];
    const totalServices = list.length;
    const avgPrice = totalServices > 0 ? Math.round(list.reduce((acc, s) => acc + s.price, 0) / totalServices) : 0;
    const avgDuration = totalServices > 0 ? Math.round(list.reduce((acc, s) => acc + s.durationMinutes, 0) / totalServices) : 0;
    const avgCommission = totalServices > 0 ? Math.round(list.reduce((acc, s) => acc + (s.commissionRate || 40), 0) / totalServices) : 40;
    const totalValuation = list.reduce((acc, s) => acc + s.price, 0);
    const totalCost = list.reduce((acc, s) => acc + (s.costPrice || 0), 0);
    const avgGrossMargin = totalValuation > 0 ? Math.round(((totalValuation - totalCost) / totalValuation) * 100) : 0;

    return {
      totalServices,
      avgPrice,
      avgDuration,
      avgCommission,
      avgGrossMargin,
    };
  }, [servicesCatalog]);

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setFormName('');
    setFormCategory('Hair');
    setFormDuration(60);
    setFormPrice(5000);
    setFormCostPrice(500);
    setFormCommission(40);
    setFormBuffer(10);
    setFormColor('#C4785A');
    setFormDescription('');
    setIsServiceModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setFormName(service.name);
    setFormCategory(service.category);
    setFormDuration(service.durationMinutes);
    setFormPrice(service.price);
    setFormCostPrice(service.costPrice || 0);
    setFormCommission(service.commissionRate || 40);
    setFormBuffer(service.bufferMinutes || 0);
    setFormColor(service.color || '#C4785A');
    setFormDescription(service.description || '');
    setIsServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast({
        type: 'error',
        title: 'Nom requis',
        message: 'Veuillez saisir le nom de la prestation.',
        category: 'appointment_service',
      });
      return;
    }

    if (editingService) {
      updateServiceItem(editingService.id, {
        name: formName.trim(),
        category: formCategory,
        durationMinutes: Number(formDuration),
        price: Number(formPrice),
        costPrice: Number(formCostPrice),
        commissionRate: Number(formCommission),
        bufferMinutes: Number(formBuffer),
        color: formColor,
        description: formDescription.trim(),
      });
      showToast({
        type: 'success',
        title: 'Prestation mise à jour',
        message: `${formName} a été mise à jour avec succès.`,
        category: 'appointment_service',
      });
    } else {
      addServiceItem({
        tenantId: 'acc_01',
        name: formName.trim(),
        category: formCategory,
        durationMinutes: Number(formDuration),
        price: Number(formPrice),
        costPrice: Number(formCostPrice),
        commissionRate: Number(formCommission),
        bufferMinutes: Number(formBuffer),
        color: formColor,
        colorCode: formColor,
        description: formDescription.trim(),
        isActive: true,
      });
      showToast({
        type: 'success',
        title: 'Prestation ajoutée',
        message: `${formName} a été enregistrée au catalogue.`,
        category: 'appointment_service',
      });
    }
    setIsServiceModalOpen(false);
  };

  const handleBatchDelete = () => {
    const count = selectedServiceIds.size;
    batchDeleteServiceItems(Array.from(selectedServiceIds));
    setSelectedServiceIds(new Set());
    showToast({
      type: 'info',
      title: 'Suppression en masse',
      message: `${count} prestations supprimées.`,
      category: 'appointment_service',
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'Prestation',
      'Catégorie',
      'Durée (min)',
      'Tarif Client (DZD)',
      'Coût Consommables (DZD)',
      'Commission Styliste (%)',
      'Description',
    ];

    const rows = filteredServices.map((s) => {
      const cost = s.costPrice || 0;
      return [
        `"${s.name}"`,
        `"${s.category}"`,
        s.durationMinutes,
        s.price,
        cost,
        s.commissionRate || 40,
        `"${s.description || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Catalogue_Prestations_${currentBranch?.name || 'Salon'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Columns for UniversalDataCollection
  const columns: ColumnDefinition<ServiceItem>[] = [
    {
      key: 'name',
      header: 'Prestation / Soin',
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (service) => (
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: service.color || '#C4785A' }}
          />
          <div className="min-w-0">
            <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
              {service.name}
            </span>
            {service.description && (
              <span className="text-[10px] text-neutral-400 block truncate max-w-[220px]">
                {service.description}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (service) => {
        const catMap: Record<string, string> = {
          Hair: 'Coiffure',
          Color: 'Colorimétrie',
          Spa: 'Soins & Spa',
          Nails: 'Onglerie Russe',
          Facial: 'Soins Visage',
          Bridal: 'Haute Mariée',
          Massage: 'Massages & Corps',
          Barber: 'Barbier',
        };
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {catMap[service.category] || service.category}
          </span>
        );
      },
    },
    {
      key: 'durationMinutes',
      header: 'Durée & Tampon',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (service) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-semibold tabular-nums">{service.durationMinutes} min</span>
          {service.bufferMinutes ? (
            <span className="text-[10px] text-neutral-400 font-mono">
              (+{service.bufferMinutes}m)
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'costPrice',
      header: 'Coût Produits',
      width: '1.2*',
      minWidth: '100px',
      sortable: true,
      renderCell: (service) => (
        <span className="text-xs text-neutral-500 font-mono tabular-nums">
          {formatMoney(service.costPrice || 0)}
        </span>
      ),
    },
    {
      key: 'commissionRate',
      header: 'Comm. Styliste',
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (service) => (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {service.commissionRate || 40}%
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Tarif Client',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (service) => (
        <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
          {formatMoney(service.price)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '1*',
      minWidth: '70px',
      renderCell: (service) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEditModal(service)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Modifier le tarif"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setServiceToDelete(service)}
            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            title="Supprimer du catalogue"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Scissors className="text-[#C4785A]" size={26} />
              <span>Catalogue des Soins & Prestations</span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              {servicesCatalog.length} Prestations
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Barème tarifaire, durées cabines, coûts consommables et pourcentages de commission stylistes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <AtriumButton
            variant="outline"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />}
            onClick={() => resetSalonMockData()}
          >
            Recharger Catalogue
          </AtriumButton>

          <AtriumButton
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </AtriumButton>

          <AtriumButton
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenCreateModal}
          >
            Nouvelle Prestation
          </AtriumButton>
        </div>
      </div>

      {/* TOP METRICS POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF0] dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-[#C4785A]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Indicateurs Clés de Rentabilité & Tarification
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            {currentBranch?.name || 'Salon Principal'} · Grille Officielle
          </span>
        </div>

        {/* 3-Card Canonical Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Prestations & Durée */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  Total Prestations
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                  {catalogMetrics.avgDuration} min moy.
                </span>
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tracking-tight tabular-nums">
              {catalogMetrics.totalServices} <span className="text-xs font-normal text-neutral-400">soins au barème</span>
            </div>
          </div>

          {/* Card 2: Average Service Price & Commission */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  Tarif Moyen Soin
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  {catalogMetrics.avgCommission}% comm.
                </span>
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tracking-tight tabular-nums">
              {formatMoney(catalogMetrics.avgPrice)}
            </div>
          </div>

          {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
          <div className="bg-[#1F1D1B] rounded-[20px] p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between h-[124px] relative overflow-hidden group">
            {/* Glowing Sparkline Graphic */}
            <div className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
              <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                <path
                  d="M10 65 L35 50 L60 55 L85 25 L110 30 L135 12"
                  stroke="#FB923C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="135" cy="12" r="4" fill="#FB923C" />
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-300">
                  Rentabilité & Valorisation
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                  Marge Nette ~{catalogMetrics.avgGrossMargin}%
                </span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-white tabular-nums">
                ~{catalogMetrics.avgGrossMargin}% <span className="text-xs font-normal text-neutral-400">marge brute</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
              <span>Positionnement salon haute coiffure</span>
              <span className="text-[#FB923C] font-semibold">Grille certifiée</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM COLLECTION POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Integrated Toolbar: Left Anchor + Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left Title / Icon / Count Anchor */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Scissors size={18} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                Prestations & Forfaits
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] font-semibold">
                {filteredServices.length}
              </span>
            </div>
          </div>

          {/* Controls Bar: Category Filter Pills + Seek */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'All', label: 'Toutes', count: categoryCounts.All || 0 },
                { id: 'Hair', label: 'Coiffure', count: categoryCounts.Hair || 0 },
                { id: 'Nails', label: 'Onglerie Russe', count: categoryCounts.Nails || 0 },
                { id: 'Facial', label: 'Soins Visage', count: categoryCounts.Facial || 0 },
                { id: 'Bridal', label: 'Haute Mariée', count: categoryCounts.Bridal || 0 },
                { id: 'Massage', label: 'Massages & Corps', count: categoryCounts.Massage || 0 },
                { id: 'Barber', label: 'Barbier', count: categoryCounts.Barber || 0 },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-[#C4785A] text-white shadow-xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#E9EEF0] dark:border-neutral-700/60'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="w-full sm:w-64">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher une prestation..."
              />
            </div>
          </div>
        </div>

        {/* Batch Actions Toolbar */}
        {selectedServiceIds.size > 0 && (
          <div className="p-3 bg-neutral-900 text-white rounded-xl flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center">
                {selectedServiceIds.size}
              </span>
              <span className="text-xs font-medium">prestations sélectionnées</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchDelete}
                className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        )}

        {/* Inset Container hosting UniversalDataCollection */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
          <UniversalDataCollection<ServiceItem>
            items={filteredServices}
            keyExtractor={(s) => s.id}
            defaultViewMode="list"
            columns={columns}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
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
            renderCard={(service) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: service.color || '#C4785A' }}
                      />
                      <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                        {service.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {service.category}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                    <Clock size={12} className="text-neutral-400" />
                    <span>{service.durationMinutes} min</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-[#C4785A] tabular-nums">
                    {formatMoney(service.price)}
                  </span>
                </div>
              </div>
            )}
            selectedIds={selectedServiceIds}
            onSelectionChange={setSelectedServiceIds}
            isPinned={(s) => pinnedServiceIds.has(s.id)}
            onTogglePin={(s) => {
              setPinnedServiceIds((prev) => {
                const next = new Set(prev);
                if (next.has(s.id)) next.delete(s.id);
                else next.add(s.id);
                return next;
              });
            }}
            emptyTitle="Aucune prestation trouvée"
            emptyDescription="Ajoutez de nouvelles prestations au catalogue pour vos rendez-vous."
            primaryActionLabel="Nouvelle Prestation"
            onAddFirstItem={handleOpenCreateModal}
          />
        </div>
      </div>

      {/* CREATE / EDIT SERVICE MODAL */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingService ? 'Modifier la Prestation' : 'Nouvelle Prestation de Luxe'}
              </h3>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <LabelInput
                field="Name"
                label="Intitulé du Soin"
                required
                value={formName}
                onChange={setFormName}
                placeholder="Ex: Balayage Californien & Gloss..."
                width="100%"
                height={42}
                corner={10}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  field="Category"
                  label="Catégorie"
                  value={formCategory}
                  onChange={(val) => setFormCategory(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
                  options={[
                    { value: 'Hair', label: 'Coiffure & Lissage' },
                    { value: 'Nails', label: 'Onglerie Russe' },
                    { value: 'Facial', label: 'Soins Visage' },
                    { value: 'Bridal', label: 'Haute Mariée' },
                    { value: 'Massage', label: 'Massages & Corps' },
                    { value: 'Barber', label: 'Barbier' },
                  ]}
                  height={42}
                  corner={10}
                />

                <LabelInput
                  field="Duration"
                  label="Durée cabine (minutes)"
                  type="number"
                  required
                  value={String(formDuration)}
                  onChange={(v) => setFormDuration(parseInt(v) || 30)}
                  width="100%"
                  height={42}
                  corner={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="Price"
                  label="Tarif Client (DZD)"
                  type="number"
                  required
                  value={String(formPrice)}
                  onChange={(v) => setFormPrice(parseFloat(v) || 0)}
                  width="100%"
                  height={42}
                  corner={10}
                />

                <LabelInput
                  field="Commission"
                  label="Commission Styliste (%)"
                  type="number"
                  value={String(formCommission)}
                  onChange={(v) => setFormCommission(parseFloat(v) || 0)}
                  width="100%"
                  height={42}
                  corner={10}
                />
              </div>

              <LabelInput
                field="Description"
                label="Description & Protocole"
                value={formDescription}
                onChange={setFormDescription}
                placeholder="Précisions sur les techniques et produits utilisés..."
                width="100%"
                height={42}
                corner={10}
              />

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 cursor-pointer shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for deletion */}
      <ConfirmDialog
        isOpen={Boolean(serviceToDelete)}
        onClose={() => setServiceToDelete(null)}
        onConfirm={() => {
          if (serviceToDelete) {
            deleteServiceItem(serviceToDelete.id);
            showToast({
              type: 'info',
              title: 'Prestation retirée',
              message: `"${serviceToDelete.name}" a été supprimée du catalogue.`,
              category: 'appointment_service',
            });
            setServiceToDelete(null);
          }
        }}
        title="Supprimer la prestation"
        description={`Êtes-vous sûr de vouloir supprimer définitivement "${serviceToDelete?.name}" du catalogue de soins ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
};

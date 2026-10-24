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

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setFormName('');
    setFormCategory('Hair');
    setFormDuration(60);
    setFormPrice(6000);
    setFormCostPrice(800);
    setFormCommission(45);
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
    setFormCostPrice(service.costPrice || 500);
    setFormCommission(service.commissionRate || 40);
    setFormBuffer(service.bufferMinutes || 10);
    setFormColor(service.colorCode || '#C4785A');
    setFormDescription(service.description || '');
    setIsServiceModalOpen(true);
  };

  const handleSubmitService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingService) {
      updateServiceItem(editingService.id, {
        name: formName.trim(),
        category: formCategory,
        durationMinutes: Number(formDuration),
        price: Number(formPrice),
        costPrice: Number(formCostPrice),
        commissionRate: Number(formCommission),
        bufferMinutes: Number(formBuffer),
        colorCode: formColor,
        description: formDescription.trim(),
      });
      showToast({
        type: 'success',
        title: 'Prestation mise à jour',
        message: `Les détails de "${formName}" ont été enregistrés.`,
        category: 'appointment_service',
      });
    } else {
      addServiceItem({
        name: formName.trim(),
        category: formCategory,
        durationMinutes: Number(formDuration),
        price: Number(formPrice),
        costPrice: Number(formCostPrice),
        commissionRate: Number(formCommission),
        bufferMinutes: Number(formBuffer),
        colorCode: formColor,
        description: formDescription.trim(),
      });
      showToast({
        type: 'success',
        title: 'Nouvelle prestation ajoutée',
        message: `"${formName}" est désormais disponible au catalogue.`,
        category: 'appointment_service',
      });
    }

    setIsServiceModalOpen(false);
  };

  const handleToggleSelectAll = () => {
    if (selectedServiceIds.size === filteredServices.length) {
      setSelectedServiceIds(new Set());
    } else {
      setSelectedServiceIds(new Set(filteredServices.map((s) => s.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedServiceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedServiceIds(next);
  };

  const handleTogglePin = (id: string) => {
    const next = new Set(pinnedServiceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPinnedServiceIds(next);
  };

  const handleBatchDelete = () => {
    const count = selectedServiceIds.size;
    batchDeleteServiceItems(Array.from(selectedServiceIds));
    setSelectedServiceIds(new Set());
  };

  const handleBatchAdjustCommission = (newRate: number) => {
    selectedServiceIds.forEach((id) => {
      updateServiceItem(id, { commissionRate: newRate });
    });
    showToast({
      type: 'success',
      title: 'Taux de commission ajusté',
      message: `${selectedServiceIds.size} prestations fixées à ${newRate}% de commission styliste.`,
      category: 'appointment_service',
    });
    setSelectedServiceIds(new Set());
  };

  const handleExportCSV = () => {
    const headers = [
      'Prestation',
      'Catégorie',
      'Durée (min)',
      'Tarif Client (DZD)',
      'Coût Consommables (DZD)',
      'Commission Styliste (%)',
      'Marge Brute (DZD)',
      'Description',
    ];

    const rows = filteredServices.map((s) => {
      const cost = s.costPrice || 0;
      const margin = s.price - cost;
      return [
        `"${s.name}"`,
        `"${s.category}"`,
        s.durationMinutes,
        s.price,
        cost,
        s.commissionRate || 40,
        margin,
        `"${s.description || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `catalogue_prestations_salon_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Catalogue exporté',
      message: `${filteredServices.length} prestations exportées en CSV.`,
      category: 'appointment_service',
    });
  };

  // Columns definition for UniversalDataCollection
  const columns: ColumnDefinition<ServiceItem>[] = [
    {
      key: 'name',
      header: 'Prestation & Description',
      sortable: true,
      renderCell: (service) => (
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-10 rounded-full shrink-0"
            style={{ backgroundColor: service.colorCode || '#C4785A' }}
          />
          <div>
            <span className="font-semibold text-xs text-neutral-900 dark:text-white block">
              {service.name}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 max-w-[260px]">
              {service.description || 'Prestation professionnelle sur mesure'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      sortable: true,
      renderCell: (service) => {
        const catMap: Record<string, string> = {
          Hair: 'Coiffure & Lissage',
          Nails: 'Bar à Ongles',
          Facial: 'Soins Visage & Spa',
          Bridal: 'Haute Mariée',
          Massage: 'Massages & Corps',
          Barber: 'Barbier & Soins',
        };
        return (
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {catMap[service.category] || service.category}
          </span>
        );
      },
    },
    {
      key: 'durationMinutes',
      header: 'Durée & Tampon',
      sortable: true,
      renderCell: (service) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-semibold tabular-nums">{service.durationMinutes} min</span>
          {service.bufferMinutes ? (
            <span className="text-[10px] text-neutral-400 font-mono">
              (+{service.bufferMinutes}m pause)
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'costPrice',
      header: 'Coût Produits',
      sortable: true,
      renderCell: (service) => (
        <span className="text-xs text-neutral-500 tabular-nums">
          {formatMoney(service.costPrice || 0)}
        </span>
      ),
    },
    {
      key: 'commissionRate',
      header: 'Comm. Styliste',
      sortable: true,
      renderCell: (service) => (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {service.commissionRate || 40}%
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Tarif Client (DZD)',
      sortable: true,
      renderCell: (service) => (
        <span className="text-xs font-bold text-[#C4785A] tabular-nums">
          {formatMoney(service.price)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: (service) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEditModal(service)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="Modifier le tarif et les paramètres"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Supprimer définitivement la prestation "${service.name}" ?`)) {
                deleteServiceItem(service.id);
              }
            }}
            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
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
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Catalogue des Soins & Prestations
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] border border-[#C4785A]/20">
              {servicesCatalog.length} Prestations
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Barème tarifaire, durées cabines, coûts consommables et pourcentages de commission stylistes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Branch Pill */}
          <div className="relative">
            <button
              onClick={() => setIsFacilityDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span className="font-semibold">{currentBranch?.name || 'Luxe Spa Hydra'}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Salons & Instituts
                </div>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBranch(b.id);
                      setIsFacilityDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors ${
                      b.id === currentBranch?.id
                        ? 'text-[#C4785A] font-semibold bg-[#C4785A]/5'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{b.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 1-Click Demo Recharge */}
          <AtriumButton
            variant="outline"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => resetSalonMockData()}
            title="Restaurer le catalogue officiel des 16 prestations de luxe"
          >
            Recharger Catalogue
          </AtriumButton>

          {/* Export CSV */}
          <AtriumButton
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </AtriumButton>

          {/* New Service Action */}
          <AtriumButton
            variant="primary"
            size="sm"
            glow
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenCreateModal}
          >
            Nouvelle Prestation
          </AtriumButton>
        </div>
      </div>

      {/* Category Pills & Seek Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'All', label: 'Toutes', count: categoryCounts.All || 0 },
            { id: 'Hair', label: 'Coiffure & Lissage', count: categoryCounts.Hair || 0 },
            { id: 'Nails', label: 'Onglerie Russe', count: categoryCounts.Nails || 0 },
            { id: 'Facial', label: 'Soins Visage', count: categoryCounts.Facial || 0 },
            { id: 'Bridal', label: 'Haute Mariée', count: categoryCounts.Bridal || 0 },
            { id: 'Massage', label: 'Massages & Corps', count: categoryCounts.Massage || 0 },
            { id: 'Barber', label: 'Barbier', count: categoryCounts.Barber || 0 },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full lg:w-72">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher une prestation..."
          />
        </div>
      </div>

      {/* Batch Actions Toolbar */}
      {selectedServiceIds.size > 0 && (
        <div className="p-3 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center">
              {selectedServiceIds.size}
            </span>
            <span className="text-xs font-medium">prestations sélectionnées</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBatchAdjustCommission(45)}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Fixer 45% Comm.</span>
            </button>

            <button
              onClick={() => handleBatchAdjustCommission(50)}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Fixer 50% Comm.</span>
            </button>

            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </button>

            <button
              onClick={() => setSelectedServiceIds(new Set())}
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* UniversalDataCollection */}
      <UniversalDataCollection<ServiceItem>
        items={filteredServices}
        keyExtractor={(service) => service.id}
        columns={columns}
        selectedIds={selectedServiceIds}
        onSelectionChange={setSelectedServiceIds}
        isPinned={(service) => pinnedServiceIds.has(service.id)}
        onTogglePin={(service) => handleTogglePin(service.id)}
        sortBy={sortBy}
        sortDirection={sortDir}
        onSortChange={(key) => {
          if (sortBy === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
          } else {
            setSortBy(key);
            setSortDir('desc');
          }
        }}
        renderCard={(service) => {
          const isPinned = pinnedServiceIds.has(service.id);
          const isSelected = selectedServiceIds.has(service.id);

          return (
            <div
              key={service.id}
              className={`p-4 rounded-2xl border transition-all relative ${
                isSelected
                  ? 'border-[#C4785A] bg-[#C4785A]/5'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: service.colorCode || '#C4785A' }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    {service.category}
                  </span>
                </div>

                <button
                  onClick={() => handleTogglePin(service.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-1">
                {service.name}
              </h3>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3 min-h-[32px]">
                {service.description || 'Soin expert personnalisé.'}
              </p>

              <div className="space-y-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Durée en cabine:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {service.durationMinutes} min
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Commission styliste:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {service.commissionRate || 40}%
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">Tarif Client:</span>
                  <span className="text-base font-extrabold text-[#C4785A] tabular-nums">
                    {formatMoney(service.price)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <button
                  onClick={() => handleOpenEditModal(service)}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                >
                  Modifier
                </button>
                <AtriumButton
                  size="xs"
                  variant="primary"
                  icon={<Calendar className="w-3 h-3" />}
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  Réserver
                </AtriumButton>
              </div>
            </div>
          );
        }}
      />

      {/* Create / Edit Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {editingService ? 'Modifier la Prestation' : 'Nouvelle Prestation au Catalogue'}
                </h2>
                <span className="text-xs text-neutral-500">
                  Définissez la durée, les coûts et le partage de commission.
                </span>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="p-5 space-y-4">
              <LabelInput
                label="Nom du Soin / Prestation *"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Balayage Californien & Toning Miel"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Catégorie"
                  value={formCategory}
                  onChange={(val) => setFormCategory((val?.target?.value ?? String(val)) as ServiceItem['category'])}
                  options={[
                    { value: "Hair", label: "Coiffure & Lissage" },
                    { value: "Nails", label: "Bar à Ongles" },
                    { value: "Facial", label: "Soins Visage & Spa" },
                    { value: "Bridal", label: "Haute Mariée" },
                    { value: "Massage", label: "Massages & Corps" },
                    { value: "Barber", label: "Barbier" },
                  ]}
                />

                <LabelInput
                  label="Durée du Soin (minutes) *"
                  type="number"
                  min="15"
                  step="5"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="Tarif Client TTC (DZD) *"
                  type="number"
                  min="500"
                  step="500"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  required
                />

                <LabelInput
                  label="Coût Consommables (DZD)"
                  type="number"
                  min="0"
                  step="100"
                  value={formCostPrice}
                  onChange={(e) => setFormCostPrice(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="Commission Styliste (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={formCommission}
                  onChange={(e) => setFormCommission(Number(e.target.value))}
                />

                <LabelInput
                  label="Temps de Pause / Nettoyage (min)"
                  type="number"
                  min="0"
                  step="5"
                  value={formBuffer}
                  onChange={(e) => setFormBuffer(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Description & Protocole
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Détaillez les produits appliqués et les étapes du protocole..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-[#C4785A]"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsServiceModalOpen(false)}
                >
                  Annuler
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  type="submit"
                >
                  {editingService ? 'Enregistrer les Modifications' : 'Créer la Prestation'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {isBookingModalOpen && (
        <AppointmentModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />
      )}
    </div>
  );
};

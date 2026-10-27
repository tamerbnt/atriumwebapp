import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Maximize2,
  DollarSign,
  Phone,
  Home,
  Briefcase,
  Key,
  ShieldCheck,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Calendar,
  FileText,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { RealEstateProperty, RealEstateLease } from '../../../types';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const RealEstatePropertiesView: React.FC = () => {
  const { language, showToast } = useAtriumStore();
  const { properties, leases, addProperty, updateProperty, deleteProperty, addLease } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['prop_01']));
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<RealEstateProperty | null>(null);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [leaseProperty, setLeaseProperty] = useState<RealEstateProperty | null>(null);

  // 390px Inline Side Inspector
  const [selectedProperty, setSelectedProperty] = useState<RealEstateProperty | null>(null);
  const [activeTab, setActiveTab] = useState<'fiche' | 'owner' | 'leases' | 'notes'>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Active lease mapping
  const propertyLeaseMap = useMemo(() => {
    const map = new Map<string, RealEstateLease>();
    leases.forEach((l) => map.set(l.propertyId, l));
    return map;
  }, [leases]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filterType !== 'All' && p.propertyType !== filterType) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesAddress = p.address.toLowerCase().includes(q);
        const matchesCity = p.cityWilaya.toLowerCase().includes(q);
        const matchesOwner = p.ownerName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAddress && !matchesCity && !matchesOwner) return false;
      }
      return true;
    });
  }, [properties, filterType, searchQuery]);

  const sortedProperties = useMemo(() => {
    const list = [...filteredProperties];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'title') {
        const cmp = a.title.localeCompare(b.title);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'price') {
        const cmp = a.priceDzd - b.priceDzd;
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'surface') {
        const cmp = a.surfaceM2 - b.surfaceM2;
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredProperties, pinnedIds, sortBy, sortDir]);

  const rentedCount = useMemo(() => {
    return properties.filter((p) => p.status === 'Rented').length;
  }, [properties]);

  const occupancyRate = properties.length > 0 ? Math.round((rentedCount / properties.length) * 100) : 0;

  const handleOpenAdd = () => {
    setPropertyToEdit(null);
    setIsPropertyModalOpen(true);
  };

  const handleOpenEdit = (p: RealEstateProperty) => {
    setPropertyToEdit(p);
    setIsPropertyModalOpen(true);
  };

  const handleDelete = (p: RealEstateProperty) => {
    deleteProperty(p.id);
    if (selectedProperty?.id === p.id) setSelectedProperty(null);
    showToast(language === 'ar' ? 'تم حذف العقار من المحفظة' : 'Bien immobilier retiré du portefeuille', 'success');
  };

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectProperty = (p: RealEstateProperty) => {
    setSelectedProperty(p);
    setInspectorNotes(`Bien sous mandat d'agence. Clés disponibles pour visites. État des lieux initial conforme.`);
    setNoteSaved(false);
  };

  const handleOpenNewLease = (p: RealEstateProperty) => {
    setLeaseProperty(p);
    setIsLeaseModalOpen(true);
  };

  const handleSaveNotes = () => {
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(language === 'ar' ? 'تم حفظ ملاحظات العقار' : 'Observations de gestion enregistrées', 'success');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Type', 'Surface (m2)', 'Rooms', 'Address', 'City', 'Price (DZD)', 'Status', 'Owner', 'Phone'];
    const rows = sortedProperties.map((p) => [
      p.id,
      `"${p.title}"`,
      p.propertyType,
      p.surfaceM2,
      p.roomsCount,
      `"${p.address}"`,
      `"${p.cityWilaya}"`,
      p.priceDzd,
      p.status,
      `"${p.ownerName}"`,
      `"${p.ownerPhone}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realestate_properties_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(language === 'ar' ? 'تم تصدير محفظة العقارات' : 'Export du portefeuille immobilier terminé', 'info');
  };

  // Column definitions for List view
  const columns: ColumnDefinition<RealEstateProperty>[] = useMemo(
    () => [
      {
        key: 'title',
        header: language === 'ar' ? 'العقار / الوحدة' : 'Bien & Localisation',
        width: '3.4*',
        sortable: true,
        renderCell: (p) => {
          const isPinned = pinnedIds.has(p.id);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {p.title}
                  </span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                  <span>{p.cityWilaya}</span>
                  <span>·</span>
                  <span>{p.surfaceM2} m²</span>
                  <span>·</span>
                  <span>{p.roomsCount} {language === 'ar' ? 'غرف' : 'pièces'}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'owner',
        header: language === 'ar' ? 'المالك / الاتصال' : 'Bailleur & Contact',
        width: '2.4*',
        renderCell: (p) => (
          <div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {p.ownerName}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              {p.ownerPhone}
            </div>
          </div>
        ),
      },
      {
        key: 'price',
        header: language === 'ar' ? 'الإيجار الشهري' : 'Loyer Mensuel',
        width: '2.2*',
        sortable: true,
        renderCell: (p) => (
          <div>
            <span className="text-xs font-mono font-bold text-[#C4785A]">
              {formatMoney(p.priceDzd)}
            </span>
            <div className="text-[10px] text-neutral-400">
              {language === 'ar' ? '/ شهر' : '/ mois'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: language === 'ar' ? 'الحالة' : 'Statut',
        width: '2.0*',
        renderCell: (p) => {
          const isRented = p.status === 'Rented';
          return (
            <div className="text-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  isRented
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRented ? 'bg-blue-500' : 'bg-emerald-500 animate-[live-heartbeat_1.2s_infinite]'
                  }`}
                />
                {isRented ? (language === 'ar' ? 'مؤجر' : 'Loué') : (language === 'ar' ? 'شاغر' : 'Disponible')}
              </span>
            </div>
          );
        },
      },
    ],
    [pinnedIds, language]
  );

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'محفظة العقارات والوحدات المؤجرة' : 'Portefeuille Immobilier & Lots'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {properties.length} {language === 'ar' ? 'عقار' : 'lots'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة الشقق، الفلل، المحلات التجارية، والمكاتب مع عقود الإيجار'
                : 'Gestion locative, états des lieux, diagnostics & mandats d\'agence'}
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
            <span>{language === 'ar' ? 'إضافة عقار' : 'Nouveau Bien'}</span>
          </AtriumButton>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات المحفظة العقارية ونسبة الإشغال' : 'Indicateurs de Portefeuille & Taux d\'Occupation'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar'
              ? 'متابعة الوحدات المؤجرة، المداخيل المتوقعة، والعقارات المتاحة للتأجير'
              : 'Taux de vacance locative, encaissement mensuel et mandats actifs'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي المحفظة العقارية' : 'Biens Sous Gestion'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {properties.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {language === 'ar' ? 'عقارات مسجلة ومفحوصة' : 'Lots sous contrat d\'agence'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
              {language === 'ar' ? 'نسبة الإشغال الإيجاري' : 'Taux d\'Occupation'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {occupancyRate}%
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {rentedCount} / {properties.length} {language === 'ar' ? 'وحدات مؤجرة' : 'lots loués'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                {language === 'ar' ? 'الأمان التعاقدي والقانوني' : 'Sécurité Juridique'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                100% CONFORME
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100%
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>Baux notariés & cautions séquestrées</span>
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
              {language === 'ar' ? 'دليل العقارات' : 'Inventaire Immobilier'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums">
              ({sortedProperties.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم أو المدينة أو المالك...' : 'Recherche bien, quartier, propriétaire...'}
              shutSize={36}
              openWidth={220}
            />

            <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterType('All')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'All'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'Tous'} ({properties.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Apartment')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'Apartment'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'شقق' : 'Appartements'}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Office')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'Office'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'مكاتب' : 'Bureaux'}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Villa')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'Villa'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {language === 'ar' ? 'فلل' : 'Villas'}
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
                {selectedIds.size} {language === 'ar' ? 'عقارات محددة' : 'biens sélectionnés'}
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
                  selectedIds.forEach((id) => deleteProperty(id));
                  setSelectedIds(new Set());
                  showToast(language === 'ar' ? 'تم حذف العقارات المحددة' : 'Biens sélectionnés supprimés', 'success');
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
            <UniversalDataCollection<RealEstateProperty>
              items={sortedProperties}
              keyExtractor={(p) => p.id}
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
              isPinned={(p) => pinnedIds.has(p.id)}
              onTogglePin={(p) => handleTogglePin(p.id)}
              onItemClick={handleSelectProperty}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              customActions={(p) => [
                {
                  id: 'lease',
                  label: language === 'ar' ? 'عقد إيجار' : 'Nouveau Bail',
                  tooltip: language === 'ar' ? 'تحرير عقد إيجار' : 'Créer un Bail Locatif',
                  icon: <Key size={13} />,
                  variant: 'primary',
                  onClick: () => handleOpenNewLease(p),
                },
              ]}
              renderCard={(p) => {
                const isPinned = pinnedIds.has(p.id);
                const isRented = p.status === 'Rented';
                return (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                      <Building2 size={32} />
                    </div>
                    <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate tracking-tight">
                        {p.title}
                      </h3>
                      {isPinned && <span className="text-xs text-amber-500">📌</span>}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mb-3 truncate max-w-[200px]">
                      {p.cityWilaya} · {p.surfaceM2} m²
                    </span>

                    <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                      <div className="text-[#C4785A] font-mono font-bold text-[13px]">
                        {formatMoney(p.priceDzd)} <span className="text-[10px] text-neutral-400 font-normal">/ mois</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
                        <span className="text-neutral-500">{p.ownerName}</span>
                        {isRented ? (
                          <span className="text-blue-600 font-bold">{language === 'ar' ? 'مؤجر' : 'Loué'}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">{language === 'ar' ? 'شاغر' : 'Disponible'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
              emptyTitle={language === 'ar' ? 'لا توجد عقارات مطابقة' : 'Aucun bien immobilier'}
              emptyDescription={language === 'ar' ? 'أضف أول عقار للمحفظة أو أعد ضبط معايير البحث' : 'Ajoutez un premier bien ou modifiez vos filtres de recherche'}
              primaryActionLabel={language === 'ar' ? 'إضافة عقار' : 'Nouveau Bien'}
              onAddFirstItem={handleOpenAdd}
              onResetFilters={() => {
                setSearchQuery('');
                setFilterType('All');
              }}
              hasActiveFilters={searchQuery.length > 0 || filterType !== 'All'}
            />
          </div>

          {/* 390px Inline Side Inspector Drawer */}
          {selectedProperty && (
            <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[700px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-[#F5E2D8]">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {selectedProperty.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                      <span>{selectedProperty.propertyType}</span>
                      <span>·</span>
                      <span className="text-[#C4785A] font-bold">{formatMoney(selectedProperty.priceDzd)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProperty(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenNewLease(selectedProperty)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Key size={13} />
                  <span>{language === 'ar' ? 'عقد إيجار' : 'Nouveau Bail'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedProperty)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                  title="Modifier"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(selectedProperty.id)}
                  className={`p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold transition-colors ${
                    pinnedIds.has(selectedProperty.id) ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  title="Épingler"
                >
                  <Pin size={14} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-neutral-100 dark:border-neutral-800 text-xs font-semibold px-2 bg-white dark:bg-neutral-855">
                <button
                  type="button"
                  onClick={() => setActiveTab('fiche')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'fiche'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'بيانات العقار' : 'Fiche'}
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
                  onClick={() => setActiveTab('leases')}
                  className={`py-2 px-3 border-b-2 transition-colors ${
                    activeTab === 'leases'
                      ? 'border-[#C4785A] text-[#C4785A] font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {language === 'ar' ? 'عقود الإيجار' : 'Baux'}
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
                  {language === 'ar' ? 'الملاحظات' : 'Gestion'}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'fiche' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'المواصفات الفنية' : 'Caractéristiques du Lot'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'النوع' : 'Type de bien'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedProperty.propertyType}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'المساحة الإجمالية' : 'Superficie'}</span>
                        <span className="font-bold text-neutral-900 dark:text-white font-mono">{selectedProperty.surfaceM2} m²</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'عدد الغرف' : 'Nombre de pièces'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedProperty.roomsCount}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'العنوان' : 'Adresse'}</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200 text-right max-w-[200px] truncate">{selectedProperty.address}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'المدينة / الولاية' : 'Ville & Wilaya'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedProperty.cityWilaya}</span>
                      </div>
                    </div>

                    {selectedProperty.amenities && (
                      <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          {language === 'ar' ? 'المرافق والتجهيزات' : 'Équipements & Prestations'}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedProperty.amenities.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                              ✓ {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'owner' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        {language === 'ar' ? 'بيانات المالك' : 'Coordonnées Propriétaire'}
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-neutral-500">{language === 'ar' ? 'الاسم الكامل' : 'Nom du bailleur'}</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{selectedProperty.ownerName}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{selectedProperty.ownerPhone}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'leases' && (
                  <div className="space-y-2 text-xs">
                    {propertyLeaseMap.has(selectedProperty.id) ? (
                      (() => {
                        const l = propertyLeaseMap.get(selectedProperty.id)!;
                        return (
                          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-900 dark:text-white">
                                {l.tenantName}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                                {language === 'ar' ? 'عقد سارٍ' : 'Bail Actif'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              {l.startDate} → {l.endDate}
                            </div>
                            <div className="flex justify-between pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                              <span className="text-neutral-500">{language === 'ar' ? 'الإيجار' : 'Loyer'}:</span>
                              <span className="font-mono font-bold text-[#C4785A]">{formatMoney(l.monthlyRentDzd)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">{language === 'ar' ? 'الضمان' : 'Dépôt de garantie'}:</span>
                              <span className="font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(l.depositDzd)}</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 text-neutral-400">
                        <Key size={28} className="mx-auto mb-2 opacity-40" />
                        <p>{language === 'ar' ? 'لا يوجد عقد إيجار سارٍ لهذا العقار' : 'Aucun bail actif pour ce bien.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                      {language === 'ar' ? 'ملاحظات الوكالة والتفقد' : 'Observations de l\'Agence & Visites'}
                    </label>
                    <textarea
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      rows={8}
                      placeholder={language === 'ar' ? 'أدخل ملاحظات الوكالة...' : 'Disponibilité des clés, travaux à prévoir, profil locataire souhaité...'}
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

      {/* Property Create / Edit Modal */}
      {isPropertyModalOpen && (
        <RealEstatePropertyModal
          isOpen={isPropertyModalOpen}
          onClose={() => {
            setIsPropertyModalOpen(false);
            setPropertyToEdit(null);
          }}
          propertyToEdit={propertyToEdit}
          onSave={(p) => {
            if (propertyToEdit) {
              updateProperty(p);
              if (selectedProperty?.id === p.id) setSelectedProperty(p);
              showToast(language === 'ar' ? 'تم تحديث بيانات العقار' : 'Bien immobilier mis à jour', 'success');
            } else {
              addProperty(p);
              showToast(language === 'ar' ? 'تم إضافة العقار بنجاح' : 'Bien immobilier ajouté avec succès', 'success');
            }
            setIsPropertyModalOpen(false);
            setPropertyToEdit(null);
          }}
        />
      )}

      {/* Lease Modal */}
      {isLeaseModalOpen && leaseProperty && (
        <RealEstateLeaseModal
          isOpen={isLeaseModalOpen}
          onClose={() => {
            setIsLeaseModalOpen(false);
            setLeaseProperty(null);
          }}
          properties={[leaseProperty]}
          onSave={(lease) => {
            addLease(lease);
            const updated = { ...leaseProperty, status: 'Rented' as const };
            updateProperty(updated);
            if (selectedProperty?.id === leaseProperty.id) setSelectedProperty(updated);
            setIsLeaseModalOpen(false);
            setLeaseProperty(null);
            showToast(language === 'ar' ? 'تم تحرير عقد الإيجار بنجاح' : 'Bail locatif enregistré avec succès', 'success');
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  DoorOpen,
  Users,
  Maximize2,
  DollarSign,
  Tag,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Pin,
  Calendar,
  Clock,
  Home,
  ChevronDown,
  Download,
  Building2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentableUnitType, RentableUnitStatus } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const VenueInventoryView: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    rentableUnits,
    createRentableUnit,
    updateRentableUnit,
    deleteRentableUnit,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    resetVenueMockData,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty rentable units safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && rentableUnits.length === 0) {
      hasAutoHealed.current = true;
      resetVenueMockData();
    }
  }, [rentableUnits.length, resetVenueMockData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | RentableUnitType>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<RentableUnit | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [pinnedUnitIds, setPinnedUnitIds] = useState<Set<string>>(new Set());
  const [unitSortBy, setUnitSortBy] = useState<string>('name');
  const [unitSortDir, setUnitSortDir] = useState<'asc' | 'desc'>('asc');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Booking modal trigger
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<string | undefined>(undefined);

  // New Unit Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<RentableUnitType>('Hall');
  const [capacity, setCapacity] = useState(50);
  const [surfaceAreaSqm, setSurfaceAreaSqm] = useState(120);
  const [hourlyRate, setHourlyRate] = useState(8000);
  const [dailyRate, setDailyRate] = useState(60000);
  const [amenitiesStr, setAmenitiesStr] = useState('High-Speed Wifi, Climate Control AC, Sound System');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#8B5CF6');

  const filteredUnits = rentableUnits.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'All' || u.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const sortedUnits = React.useMemo(() => {
    return [...filteredUnits].sort((a, b) => {
      const aPinned = pinnedUnitIds.has(a.id);
      const bPinned = pinnedUnitIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (unitSortBy === 'name' || unitSortBy === 'code') {
        const cmp = a.name.localeCompare(b.name);
        return unitSortDir === 'asc' ? cmp : -cmp;
      }
      if (unitSortBy === 'type') {
        const cmp = a.type.localeCompare(b.type);
        return unitSortDir === 'asc' ? cmp : -cmp;
      }
      if (unitSortBy === 'capacity') {
        return unitSortDir === 'asc' ? a.capacity - b.capacity : b.capacity - a.capacity;
      }
      if (unitSortBy === 'surface') {
        const aSurf = a.surfaceAreaSqm || 0;
        const bSurf = b.surfaceAreaSqm || 0;
        return unitSortDir === 'asc' ? aSurf - bSurf : bSurf - aSurf;
      }
      if (unitSortBy === 'rates' || unitSortBy === 'hourlyRate') {
        return unitSortDir === 'asc' ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate;
      }
      if (unitSortBy === 'dailyRate') {
        return unitSortDir === 'asc' ? a.dailyRate - b.dailyRate : b.dailyRate - a.dailyRate;
      }
      if (unitSortBy === 'status') {
        return unitSortDir === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      }
      return 0;
    });
  }, [filteredUnits, pinnedUnitIds, unitSortBy, unitSortDir]);

  const handleOpenAdd = () => {
    setUnitToEdit(null);
    setName('');
    setCode(`ROOM-${Math.floor(100 + Math.random() * 900)}`);
    setType('Room');
    setCapacity(30);
    setSurfaceAreaSqm(80);
    setHourlyRate(5000);
    setDailyRate(35000);
    setAmenitiesStr('Wifi, Presentation Screen, AC');
    setDescription('');
    setColorHex('#3B82F6');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (unit: RentableUnit) => {
    setUnitToEdit(unit);
    setName(unit.name);
    setCode(unit.code);
    setType(unit.type);
    setCapacity(unit.capacity);
    setSurfaceAreaSqm(unit.surfaceAreaSqm || 50);
    setHourlyRate(unit.hourlyRate);
    setDailyRate(unit.dailyRate);
    setAmenitiesStr(unit.amenities.join(', '));
    setDescription(unit.description);
    setColorHex(unit.colorHex || '#8B5CF6');
    setIsAddModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Space Name',
        message: 'Please provide a name for this unit (e.g. Grand Ballroom, Studio A).',
      });
      return;
    }
    if (!code.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Space Code',
        message: 'Please provide a unique reference code (e.g. HALL-01).',
      });
      return;
    }

    const amenities = amenitiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (unitToEdit) {
      updateRentableUnit(unitToEdit.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        capacity,
        surfaceAreaSqm,
        hourlyRate,
        dailyRate,
        amenities,
        description: description.trim(),
        colorHex,
      });
    } else {
      createRentableUnit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        capacity,
        surfaceAreaSqm,
        hourlyRate,
        dailyRate,
        currency: 'DZD',
        amenities,
        status: 'Available',
        description: description.trim() || 'Bookable space and venue unit.',
        colorHex,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (unit: RentableUnit) => {
    const nextStatus: RentableUnitStatus =
      unit.status === 'Available'
        ? 'Occupied'
        : unit.status === 'Occupied'
        ? 'Maintenance'
        : 'Available';
    updateRentableUnit(unit.id, { status: nextStatus });
  };

  const unitColumns: ColumnDefinition<RentableUnit>[] = React.useMemo(() => [
    {
      key: 'name',
      header: t('venue_inv_space') || (language === 'ar' ? 'المساحة أو القاعة' : language === 'fr' ? 'Espace & Unité' : 'Space & Unit'),
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (unit) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 text-white shadow-xs"
            style={{ backgroundColor: unit.colorHex || '#8B5CF6' }}
          >
            {unit.code.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-neutral-900 dark:text-white truncate">
              {unit.name}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono truncate">
              {unit.code} · {unit.type}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('venue_inv_type') || (language === 'ar' ? 'النوع' : 'Type'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (unit) => {
        const localizedType =
          unit.type === 'Hall'
            ? t('venue_type_hall')
            : unit.type === 'Studio'
            ? t('venue_type_studio')
            : unit.type === 'Room'
            ? t('venue_type_room')
            : unit.type === 'Court'
            ? t('venue_type_court')
            : t('venue_type_desk');
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {localizedType}
          </span>
        );
      },
    },
    {
      key: 'capacity',
      header: t('venue_inv_capacity') || (language === 'ar' ? 'السعة والمساحة' : language === 'fr' ? 'Capacité & Surface' : 'Capacity & Area'),
      width: '1.6*',
      minWidth: '140px',
      sortable: true,
      renderCell: (unit) => (
        <div className="text-xs">
          <div className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
            {t('venue_card_capacity', language, { count: unit.capacity })}
          </div>
          <div className="text-[11px] text-neutral-400 tabular-nums">
            {unit.surfaceAreaSqm ? t('venue_inv_surface_unit', language, { surface: unit.surfaceAreaSqm }) : '--'}
          </div>
        </div>
      ),
    },
    {
      key: 'rates',
      header: t('venue_inv_rates') || (language === 'ar' ? 'التعريفة' : language === 'fr' ? 'Tarifs' : 'Rates'),
      width: '2*',
      minWidth: '170px',
      sortable: true,
      renderCell: (unit) => (
        <div className="text-xs">
          <div className="font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(unit.hourlyRate, unit.currency)} <span className="text-[10px] text-neutral-400 font-normal">/ {t('venue_unit_hr') || 'hr'}</span>
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {formatCurrencyAmount(unit.dailyRate, unit.currency)} <span className="text-[10px] text-neutral-400 font-normal">/ {t('venue_unit_day') || 'day'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('venue_inv_status') || (language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'),
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (unit) => {
        const localizedStatus =
          unit.status === 'Available'
            ? (language === 'ar' ? 'متاحة' : language === 'fr' ? 'Disponible' : 'Available')
            : unit.status === 'Occupied'
            ? t('venue_kpi_in_use')
            : (language === 'ar' ? 'صيانة' : language === 'fr' ? 'Maintenance' : 'Maintenance');
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(unit);
            }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-colors cursor-pointer ${
              unit.status === 'Available'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                : unit.status === 'Occupied'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 hover:bg-purple-200'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
            }`}
            title={localizedStatus}
          >
            {localizedStatus}
          </button>
        );
      },
    },
  ], [language, t]);

  const handleExportUnitsCSV = () => {
    const headers = [
      language === 'ar' ? 'رمز الوحدة' : language === 'fr' ? 'Code Unité' : 'Unit Code',
      language === 'ar' ? 'اسم المساحة' : language === 'fr' ? 'Nom Espace' : 'Space Name',
      language === 'ar' ? 'النوع' : 'Type',
      language === 'ar' ? 'السعة (أشخاص)' : language === 'fr' ? 'Capacité' : 'Capacity',
      language === 'ar' ? 'المساحة (م²)' : language === 'fr' ? 'Surface (m²)' : 'Area (sqm)',
      language === 'ar' ? 'السعر بالساعة' : language === 'fr' ? 'Tarif Horaire' : 'Hourly Rate',
      language === 'ar' ? 'السعر باليوم' : language === 'fr' ? 'Tarif Journalier' : 'Daily Rate',
      language === 'ar' ? 'العملة' : language === 'fr' ? 'Devise' : 'Currency',
      language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      language === 'ar' ? 'المرافق والتجهيزات' : language === 'fr' ? 'Équipements' : 'Amenities',
    ];
    const rows = sortedUnits.map((u) => [
      `"${u.code}"`,
      `"${u.name}"`,
      `"${u.type}"`,
      `"${u.capacity}"`,
      `"${u.surfaceAreaSqm || ''}"`,
      `"${u.hourlyRate}"`,
      `"${u.dailyRate}"`,
      `"${u.currency}"`,
      `"${u.status}"`,
      `"${(u.amenities || []).join(', ')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `venue-units-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التصدير' : language === 'fr' ? 'Exportation réussie' : 'Export Complete',
      message: `${sortedUnits.length} ${language === 'ar' ? 'وحدة ومساحة تم تصديرها' : 'spaces exported successfully'}`,
    });
  };

  const handleBatchDelete = () => {
    if (selectedUnitIds.size === 0) return;
    const count = selectedUnitIds.size;
    if (confirm(language === 'ar' ? `هل أنت متأكد من حذف ${count} مساحة محددة؟` : language === 'fr' ? `Supprimer ${count} espaces sélectionnés ?` : `Delete ${count} selected spaces?`)) {
      selectedUnitIds.forEach((id) => deleteRentableUnit(id));
      setSelectedUnitIds(new Set());
      showToast({
        type: 'info',
        title: language === 'ar' ? 'تم الحذف' : language === 'fr' ? 'Suppression' : 'Deleted',
        message: `${count} ${language === 'ar' ? 'مساحة تم حذفها' : 'units removed'}`,
      });
    }
  };

  const handleBatchSetStatus = (status: RentableUnitStatus) => {
    if (selectedUnitIds.size === 0) return;
    selectedUnitIds.forEach((id) => updateRentableUnit(id, { status }));
    const count = selectedUnitIds.size;
    setSelectedUnitIds(new Set());
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Statut mis à jour' : 'Status Updated',
      message: `${count} ${language === 'ar' ? 'مساحة تم تحديث حالتها' : 'spaces status updated'}`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <DoorOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('venue_inv_title')}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('venue_inv_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Facility Dropdown Menu */}
            {isFacilityDropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'الفروع والمرافق' : language === 'fr' ? 'Succursales & Sites' : 'Branches & Venues'}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportUnitsCSV}
            className="h-10 px-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Export CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Seed Demo Data Button */}
          <button
            type="button"
            onClick={resetVenueMockData}
            className="h-10 px-3.5 bg-[#FCEEE8] dark:bg-neutral-800 hover:bg-[#F8DFD4] dark:hover:bg-neutral-700 text-[#C4785A] text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
          </button>

          {/* New Space Button */}
          <button
            onClick={handleOpenAdd}
            className="h-10 px-5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('venue_inv_btn_new_space')}</span>
          </button>
        </div>
      </div>

      {/* Batch Selection Toolbar */}
      {selectedUnitIds.size > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              {selectedUnitIds.size} {language === 'ar' ? 'مساحات محددة' : language === 'fr' ? 'espaces sélectionnés' : 'spaces selected'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBatchSetStatus('Available')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              {language === 'ar' ? 'تعيين كمتاحة' : language === 'fr' ? 'Rendre Disponible' : 'Mark Available'}
            </button>
            <button
              onClick={() => handleBatchSetStatus('Maintenance')}
              className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
            >
              {language === 'ar' ? 'تعيين للصيانة' : language === 'fr' ? 'Maintenance' : 'Maintenance'}
            </button>
            <button
              onClick={() => setSelectedUnitIds(new Set())}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect'}
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 size={13} />
              <span>{language === 'ar' ? 'حذف المحدد' : language === 'fr' ? 'Supprimer' : 'Delete Selected'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('venue_inv_search_ph')}
          openWidth={320}
          shutSize={40}
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'All' as const, label: t('venue_type_all') },
            { id: 'Hall' as const, label: t('venue_type_hall') },
            { id: 'Studio' as const, label: t('venue_type_studio') },
            { id: 'Room' as const, label: t('venue_type_room') },
            { id: 'Court' as const, label: t('venue_type_court') },
            { id: 'Desk' as const, label: t('venue_type_desk') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedTypeFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedTypeFilter === item.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Standardized Collection of Rentable Units */}
      <UniversalDataCollection<RentableUnit>
        items={sortedUnits}
        keyExtractor={(u) => u.id}
        defaultViewMode="grid"
        columns={unitColumns}
        sortBy={unitSortBy}
        sortDirection={unitSortDir}
        onSortChange={(key) => {
          if (unitSortBy === key) {
            setUnitSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setUnitSortBy(key);
            setUnitSortDir('asc');
          }
        }}
        renderCard={(unit) => {
          const localizedType =
            unit.type === 'Hall'
              ? t('venue_type_hall')
              : unit.type === 'Studio'
              ? t('venue_type_studio')
              : unit.type === 'Room'
              ? t('venue_type_room')
              : unit.type === 'Court'
              ? t('venue_type_court')
              : t('venue_type_desk');

          const localizedStatus =
            unit.status === 'Available'
              ? (language === 'ar' ? 'متاحة' : language === 'fr' ? 'Disponible' : 'Available')
              : unit.status === 'Occupied'
              ? t('venue_kpi_in_use')
              : (language === 'ar' ? 'صيانة' : language === 'fr' ? 'Maintenance' : 'Maintenance');

          return (
            <div className="flex flex-col justify-between w-full h-full">
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: unit.colorHex || '#8B5CF6' }}
                    />
                    <span className="text-xs font-mono font-semibold text-neutral-500 uppercase">
                      {unit.code}
                    </span>
                    <span className="text-[11px] text-neutral-400">· {localizedType}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(unit);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-colors cursor-pointer ${
                      unit.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                        : unit.status === 'Occupied'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 hover:bg-purple-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
                    }`}
                    title={localizedStatus}
                  >
                    {localizedStatus}
                  </button>
                </div>

                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {unit.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                  {unit.description}
                </p>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">
                      {t('venue_inv_capacity')}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {t('venue_card_capacity', language, { count: unit.capacity })}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">
                      {t('venue_inv_surface')}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {unit.surfaceAreaSqm ? t('venue_inv_surface_unit', language, { surface: unit.surfaceAreaSqm }) : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">
                      {t('venue_inv_hourly_rate')}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(unit.hourlyRate, unit.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">
                      {t('venue_inv_daily_rate')}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(unit.dailyRate, unit.currency)}
                    </span>
                  </div>
                </div>

                {/* Amenities pills */}
                {unit.amenities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {unit.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Book Footer */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700/50 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  {unit.currency || 'DZD'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUnitForBooking(unit.id);
                    setIsBookingModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Calendar size={13} />
                  <span>{t('venue_reserve_space')}</span>
                </button>
              </div>
            </div>
          );
        }}
        onItemClick={(unit) => handleOpenEdit(unit)}
        onViewDetails={(unit) => handleOpenEdit(unit)}
        onEdit={(unit) => handleOpenEdit(unit)}
        onTogglePin={(unit) => {
          setPinnedUnitIds((prev) => {
            const next = new Set(prev);
            if (next.has(unit.id)) {
              next.delete(unit.id);
              showToast({
                type: 'info',
                title: 'Unpinned',
                message: `${unit.name} unpinned`,
              });
            } else {
              next.add(unit.id);
              showToast({
                type: 'info',
                title: 'Pinned',
                message: `${unit.name} pinned to top`,
              });
            }
            return next;
          });
        }}
        onDelete={(unit) => {
          if (confirm(`${t('common_delete')} ${unit.name}?`)) {
            deleteRentableUnit(unit.id);
          }
        }}
        customActions={(unit) => [
          {
            id: 'book',
            tooltip: t('venue_reserve_space') || 'Book Space',
            icon: <Calendar size={13} />,
            iconColor: '#8B5CF6',
            onClick: (e) => {
              e.stopPropagation();
              setSelectedUnitForBooking(unit.id);
              setIsBookingModalOpen(true);
            },
          },
        ]}
        isPinned={(unit) => pinnedUnitIds.has(unit.id)}
        selectedIds={selectedUnitIds}
        onSelectionChange={setSelectedUnitIds}
        emptyTitle={t('venue_inv_empty_title')}
        emptyDescription={t('venue_inv_empty_desc')}
        primaryActionLabel={t('venue_inv_btn_new_space')}
        onAddFirstItem={handleOpenAdd}
      />

      {/* Add / Edit Unit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {unitToEdit ? t('venue_inv_modal_edit_title') : t('venue_inv_modal_add_title')}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <LabelInput
                    id="space-name"
                    label={t('venue_inv_field_name')}
                    placeholder="e.g. Daylight Cyclorama Studio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-code"
                    label={t('venue_inv_field_code')}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>

                <LabelSelect
                  field="Category"
                  label={t('venue_inv_field_type')}
                  value={type}
                  onChange={(val) => setType(typeof val === 'string' ? (val as RentableUnitType) : (val.target?.value || val))}
                  options={[
                    { value: 'Hall', label: t('venue_type_hall') },
                    { value: 'Studio', label: t('venue_type_studio') },
                    { value: 'Room', label: t('venue_type_room') },
                    { value: 'Court', label: t('venue_type_court') },
                    { value: 'Desk', label: t('venue_type_desk') },
                  ]}
                  height={44}
                  corner={14}
                />

                <div>
                  <LabelInput
                    id="space-capacity"
                    label={t('venue_inv_field_capacity')}
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-surface"
                    label={t('venue_inv_field_surface')}
                    type="number"
                    value={surfaceAreaSqm}
                    onChange={(e) => setSurfaceAreaSqm(Number(e.target.value))}
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-hourly-rate"
                    label={t('venue_inv_field_hourly')}
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-daily-rate"
                    label={t('venue_inv_field_daily')}
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                  />
                </div>

                <div className="col-span-2">
                  <LabelInput
                    id="space-amenities"
                    label={t('venue_inv_field_amenities')}
                    placeholder="e.g. Line array sound, 4K screen, Dressing room, Catering kitchen"
                    value={amenitiesStr}
                    onChange={(e) => setAmenitiesStr(e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('venue_inv_field_desc')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe layout, acoustics, equipment provided..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end rtl:justify-start gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  {t('venue_inv_btn_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-xl cursor-pointer"
                >
                  {t('venue_inv_btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={selectedUnitForBooking}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const VenueInventoryView: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    rentableUnits,
    rentalBookings,
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

  // Selected space for 390px inline side inspector
  const [selectedUnit, setSelectedUnit] = useState<RentableUnit | null>(null);
  const [drawerTab, setDrawerTab] = useState<'fiche' | 'planning' | 'rates' | 'notes'>('fiche');
  const [unitNotes, setUnitNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  const activeUnit = useMemo(() => {
    if (!selectedUnit) return null;
    return rentableUnits.find((u) => u.id === selectedUnit.id) || selectedUnit;
  }, [selectedUnit, rentableUnits]);

  useEffect(() => {
    if (activeUnit) {
      setUnitNotes(activeUnit.description || '');
    }
  }, [activeUnit?.id]);

  const handleNotesChange = (val: string) => {
    setUnitNotes(val);
    if (!activeUnit) return;
    setIsSavingNotes(true);
    updateRentableUnit(activeUnit.id, { description: val });
    setTimeout(() => {
      setIsSavingNotes(false);
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 2000);
    }, 400);
  };

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

  const filteredUnits = useMemo(() => {
    return rentableUnits.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedTypeFilter === 'All' || u.type === selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [rentableUnits, searchQuery, selectedTypeFilter]);

  const totalSpaces = rentableUnits.length;
  const totalCapacity = rentableUnits.reduce((sum, u) => sum + u.capacity, 0);
  const averageHourlyRate = totalSpaces > 0 ? Math.round(rentableUnits.reduce((sum, u) => sum + u.hourlyRate, 0) / totalSpaces) : 0;

  const sortedUnits = useMemo(() => {
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
    setSurfaceAreaSqm(unit.surfaceAreaSqm || 0);
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
        message: 'Please provide a name for this rentable hall or unit.',
      });
      return;
    }

    const amenitiesList = amenitiesStr
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (unitToEdit) {
      updateRentableUnit(unitToEdit.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        capacity: Number(capacity) || 10,
        surfaceAreaSqm: Number(surfaceAreaSqm) || 50,
        hourlyRate: Number(hourlyRate) || 0,
        dailyRate: Number(dailyRate) || 0,
        amenities: amenitiesList,
        description: description.trim(),
        colorHex,
      });
    } else {
      createRentableUnit({
        name: name.trim(),
        code: code.trim().toUpperCase() || `ROOM-${Date.now().toString().slice(-4)}`,
        type,
        capacity: Number(capacity) || 10,
        surfaceAreaSqm: Number(surfaceAreaSqm) || 50,
        hourlyRate: Number(hourlyRate) || 0,
        dailyRate: Number(dailyRate) || 0,
        currency: 'DZD',
        status: 'Available',
        amenities: amenitiesList,
        description: description.trim(),
        colorHex,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (unit: RentableUnit) => {
    const nextStatus: RentableUnitStatus =
      unit.status === 'Available'
        ? 'Maintenance'
        : unit.status === 'Maintenance'
        ? 'Available'
        : 'Available';
    updateRentableUnit(unit.id, { status: nextStatus });
    showToast({
      type: 'info',
      title: 'Status Updated',
      message: `${unit.name} is now ${nextStatus}`,
    });
  };

  const handleExportUnitsCSV = () => {
    const headers = [
      language === 'ar' ? 'رمز القاعة' : 'Code',
      language === 'ar' ? 'الاسم' : 'Name',
      language === 'ar' ? 'النوع' : 'Type',
      language === 'ar' ? 'الطاقة الاستيعابية' : 'Capacity',
      language === 'ar' ? 'المساحة م²' : 'Surface (sqm)',
      language === 'ar' ? 'السعر بالساعة' : 'Hourly Rate',
      language === 'ar' ? 'السعر باليوم' : 'Daily Rate',
      language === 'ar' ? 'الحالة' : 'Status',
      language === 'ar' ? 'الميزات والتجهيزات' : 'Amenities',
    ];

    const rows = filteredUnits.map((u) => [
      `"${u.code}"`,
      `"${u.name}"`,
      `"${u.type}"`,
      `"${u.capacity}"`,
      `"${u.surfaceAreaSqm || ''}"`,
      `"${u.hourlyRate}"`,
      `"${u.dailyRate}"`,
      `"${u.status}"`,
      `"${u.amenities.join('; ')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-venue-spaces-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchDelete = () => {
    if (selectedUnitIds.size === 0) return;
    if (confirm(t('venue_inv_confirm_batch_del', language, { count: selectedUnitIds.size }))) {
      selectedUnitIds.forEach((id) => deleteRentableUnit(id));
      setSelectedUnitIds(new Set());
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const unitColumns: ColumnDefinition<RentableUnit>[] = useMemo(() => [
    {
      key: 'name',
      header: t('venue_inv_col_space'),
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (u) => {
        const localizedType =
          u.type === 'Hall'
            ? t('venue_type_hall')
            : u.type === 'Studio'
            ? t('venue_type_studio')
            : u.type === 'Room'
            ? t('venue_type_room')
            : u.type === 'Court'
            ? t('venue_type_court')
            : t('venue_type_desk');

        return (
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: u.colorHex || '#8B5CF6' }}
            />
            <div className="min-w-0">
              <div className="font-semibold text-neutral-900 dark:text-white truncate">
                {u.name}
              </div>
              <div className="text-[11px] text-neutral-400 truncate">
                {u.code} · {localizedType}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'capacity',
      header: t('venue_inv_col_capacity'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (u) => (
        <span className="font-medium text-xs text-neutral-800 dark:text-neutral-200 tabular-nums">
          {t('venue_card_capacity', language, { count: u.capacity })}
        </span>
      ),
    },
    {
      key: 'surface',
      header: t('venue_inv_surface'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (u) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
          {u.surfaceAreaSqm ? t('venue_inv_surface_unit', language, { surface: u.surfaceAreaSqm }) : '--'}
        </span>
      ),
    },
    {
      key: 'rates',
      header: t('venue_inv_col_rates'),
      width: '2*',
      minWidth: '170px',
      sortable: true,
      renderCell: (u) => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-neutral-900 dark:text-white tabular-nums font-mono">
            {formatCurrencyAmount(u.hourlyRate, u.currency)} / {t('venue_inv_hourly_short')}
          </div>
          <div className="text-[11px] text-neutral-400 tabular-nums font-mono">
            {formatCurrencyAmount(u.dailyRate, u.currency)} / {t('venue_inv_daily_short')}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('venue_inv_col_status'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (u) => {
        const localizedStatus =
          u.status === 'Available'
            ? language === 'ar'
              ? 'متاحة'
              : language === 'fr'
              ? 'Disponible'
              : 'Available'
            : u.status === 'Occupied'
            ? t('venue_kpi_in_use')
            : language === 'ar'
            ? 'صيانة'
            : language === 'fr'
            ? 'Maintenance'
            : 'Maintenance';

        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${
              u.status === 'Available'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : u.status === 'Occupied'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            }`}
          >
            {localizedStatus}
          </span>
        );
      },
    },
  ], [language, t]);

  return (
    <div className="space-y-6">
      {/* Outer Workspace Panel matching Desktop Spec */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        {/* Row 0: Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <DoorOpen size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {t('venue_inv_title')}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('venue_inv_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative flex-wrap">
            {/* Facility Pill: Atrium 1 ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
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

            {/* Seed Demo Data Button */}
            <AtriumButton
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles size={14} className="text-[#C4785A]" />}
              onClick={resetVenueMockData}
              title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
            >
              <span className="hidden sm:inline">
                {language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}
              </span>
            </AtriumButton>

            {/* New Space Primary Button */}
            <AtriumButton
              type="button"
              variant="primary"
              onClick={handleOpenAdd}
              icon={<Plus size={16} strokeWidth={2.5} />}
            >
              <span>{t('venue_inv_btn_new_space')}</span>
            </AtriumButton>
          </div>
        </div>

        {/* Row 1: Top Metrics Pod Tray matching Staff Management Screenshot 30 */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سعة المرافق & أداء الحظيرة' : language === 'fr' ? 'Capacité des Espaces & Performance' : 'Venue Capacity & Portfolio Performance'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {language === 'ar'
                ? 'إجمالي القاعات القابلة للتأجير، سعة الضيوف الإجمالية ومتوسط التعريفة الساعية'
                : language === 'fr'
                ? 'Salles disponibles, capacité d\'accueil globale et tarif horaire moyen'
                : 'Rentable spaces portfolio, aggregate seat capacity, and baseline hourly rates'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tile 1: Total Spaces Base — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'إجمالي القاعات والمساحات' : language === 'fr' ? 'Parc Total des Espaces' : 'Total Venue Spaces'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    ↗ {totalSpaces} {language === 'ar' ? 'قاعة جاهزة' : language === 'fr' ? 'salles prêtes' : 'spaces ready'}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
                {totalSpaces}
              </div>
            </div>

            {/* Tile 2: Aggregate Seat Capacity — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'طاقة الاستقبال الإجمالية' : language === 'fr' ? 'Capacité d\'Accueil Totale' : 'Total Guest Capacity'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                    {totalCapacity} {language === 'ar' ? 'مقعد / ضيف' : language === 'fr' ? 'places' : 'seats'}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
                {totalCapacity}
              </div>
            </div>

            {/* Tile 3: DARK ESPRESSO CARD (#1F1D1B) — Average Hourly Rate */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div>
                <span className="text-xs font-medium text-neutral-300">
                  {language === 'ar' ? 'متوسط السعر الساعي' : language === 'fr' ? 'Tarif Horaire Moyen' : 'Average Hourly Rate'}
                </span>
                <div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
                  <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                    {language === 'ar' ? 'التعريفة القياسية للأتريوم' : language === 'fr' ? 'Tarification de base' : 'Baseline Facility Index'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-white tabular-nums font-mono">
                {formatCurrencyAmount(averageHourlyRate, 'DZD')}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Bottom Collection Pod Tray matching Staff Management Screenshot 30 */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          {/* Integrated Toolbar Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Icon + Title + Count Badge */}
            <div className="flex items-center gap-2">
              <DoorOpen size={16} className="text-neutral-500" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'دليل القاعات والمرافق' : language === 'fr' ? 'Catalogue des Espaces' : 'Spaces Catalog'}
              </span>
              <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
                {sortedUnits.length}
              </span>
            </div>

            {/* Right: Seek, Type Capsules, CSV, Fullscreen */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {/* Expanding Seek Search Box */}
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('venue_inv_search_ph')}
                shutSize={36}
                openWidth={220}
              />

              {/* Type Filter Capsules */}
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
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
                    type="button"
                    onClick={() => setSelectedTypeFilter(item.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      selectedTypeFilter === item.id
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportUnitsCSV}
                className="h-9 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download size={13} />
                <span>{language === 'ar' ? 'تصدير' : language === 'fr' ? 'Exporter' : 'Export CSV'}</span>
              </button>

              {/* Fullscreen Expand Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Fullscreen"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* Batch Selection Banner */}
          {selectedUnitIds.size > 0 && (
            <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  {selectedUnitIds.size} {language === 'ar' ? 'مساحات محددة' : language === 'fr' ? 'espaces sélectionnés' : 'spaces selected'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleBatchSetStatus('Available')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {language === 'ar' ? 'تعيين كمتاحة' : language === 'fr' ? 'Rendre Disponible' : 'Mark Available'}
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetStatus('Maintenance')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {language === 'ar' ? 'تعيين للصيانة' : language === 'fr' ? 'Maintenance' : 'Maintenance'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUnitIds(new Set())}
                  className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect'}
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 size={13} />
                  <span>{language === 'ar' ? 'حذف المحدد' : language === 'fr' ? 'Supprimer' : 'Delete Selected'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Universal Rentable Units Collection with 390px Side Inspector */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
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
                selectedIds={selectedUnitIds}
                onSelectionChange={setSelectedUnitIds}
                isPinned={(u) => pinnedUnitIds.has(u.id)}
                onTogglePin={(u) => {
                  setPinnedUnitIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(u.id)) next.delete(u.id);
                    else next.add(u.id);
                    return next;
                  });
                }}
                onItemClick={(u) => setSelectedUnit(u)}
                onViewDetails={(u) => setSelectedUnit(u)}
                onEdit={handleOpenEdit}
                onDelete={(u) => {
                  if (confirm(t('venue_inv_confirm_del', language, { name: u.name }))) {
                    deleteRentableUnit(u.id);
                    if (selectedUnit?.id === u.id) setSelectedUnit(null);
                  }
                }}
                customActions={(u) => [
                  {
                    id: 'book',
                    label: t('venue_reserve_space'),
                    icon: <Calendar size={13} />,
                    variant: 'primary',
                    onClick: () => {
                      setSelectedUnitForBooking(u.id);
                      setIsBookingModalOpen(true);
                    },
                  },
                ]}
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
                      ? language === 'ar'
                        ? 'متاحة'
                        : language === 'fr'
                        ? 'Disponible'
                        : 'Available'
                      : unit.status === 'Occupied'
                      ? t('venue_kpi_in_use')
                      : language === 'ar'
                      ? 'صيانة'
                      : language === 'fr'
                      ? 'Maintenance'
                      : 'Maintenance';

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
                            <span className="font-semibold text-neutral-900 dark:text-white tabular-nums font-mono">
                              {formatCurrencyAmount(unit.hourlyRate, unit.currency)}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase font-medium">
                              {t('venue_inv_daily_rate')}
                            </span>
                            <span className="font-semibold text-neutral-900 dark:text-white tabular-nums font-mono">
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

                      {/* Reserve button in card */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
                          {formatCurrencyAmount(unit.hourlyRate, unit.currency)} / {t('venue_inv_hourly_short')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUnitForBooking(unit.id);
                            setIsBookingModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-[#FDF4F0] hover:bg-[#FBE5DC] text-[#C4785A] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          {t('venue_btn_reserve')}
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>

            {/* 390px Inline Side Inspector Drawer */}
            {activeUnit && (
              <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-white shadow-2xs font-bold"
                      style={{ backgroundColor: activeUnit.colorHex || '#8B5CF6' }}
                    >
                      <DoorOpen size={20} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-neutral-900 dark:text-white truncate text-base">
                        {activeUnit.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <span className="font-mono font-semibold">{activeUnit.code}</span>
                        <span>·</span>
                        <span>{activeUnit.type}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUnit(null)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Quick Action Ribbon */}
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUnitForBooking(activeUnit.id);
                      setIsBookingModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-[#C4785A] hover:bg-[#B3684A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Calendar size={13} />
                    <span>{t('venue_reserve_space')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(activeUnit)}
                    className="py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Clock size={13} />
                    <span>{activeUnit.status}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(activeUnit)}
                    className="py-1.5 px-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>

                {/* 4 Tabs */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('fiche')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'fiche'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Fiche Espace
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('planning')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'planning'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Planning
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('rates')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'rates'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Tarifs
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('notes')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'notes'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Consignes
                  </button>
                </div>

                {/* Tab 1: Fiche */}
                {drawerTab === 'fiche' && (
                  <div className="space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div>
                        <span className="text-neutral-400 block text-[10px] uppercase font-medium">Capacité d'accueil</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-sm">
                          {activeUnit.capacity} places
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px] uppercase font-medium">Superficie</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-sm">
                          {activeUnit.surfaceAreaSqm || '--'} m²
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-neutral-400 block text-[10px] uppercase font-medium">Type d'espace</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {activeUnit.type}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-neutral-400 block text-[10px] uppercase font-medium">Statut actuel</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {activeUnit.status}
                        </span>
                      </div>
                    </div>

                    {/* Amenities list */}
                    <div>
                      <span className="font-bold text-[11px] text-neutral-600 dark:text-neutral-400 block mb-1.5 uppercase">
                        Équipements & Installations
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {activeUnit.amenities.map((a, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium"
                          >
                            ✓ {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Planning */}
                {drawerTab === 'planning' && (
                  <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 font-medium">Créneaux réservés</span>
                      <span className="font-bold text-[#C4785A]">
                        {rentalBookings.filter((b) => b.unitId === activeUnit.id).length} réservations
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {rentalBookings.filter((b) => b.unitId === activeUnit.id).length === 0 ? (
                        <div className="p-4 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                          Aucun créneau planifié sur cet espace.
                        </div>
                      ) : (
                        rentalBookings
                          .filter((b) => b.unitId === activeUnit.id)
                          .map((b) => (
                            <div key={b.id} className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-neutral-900 dark:text-white truncate max-w-[170px]">{b.purpose || 'Séance'}</span>
                                <span className="font-mono text-[#C4785A]">{formatCurrencyAmount(b.totalAmount, b.currency)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                                <span>{new Date(b.startDateTime).toLocaleDateString()}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                                  {b.status}
                                </span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: Tarifs */}
                {drawerTab === 'rates' && (
                  <div className="space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Tarif Horaire :</span>
                        <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">
                          {formatCurrencyAmount(activeUnit.hourlyRate, activeUnit.currency)} / h
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Tarif Journée Entière :</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          {formatCurrencyAmount(activeUnit.dailyRate, activeUnit.currency)} / j
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Devise de facturation :</span>
                        <span className="font-bold text-neutral-900 dark:text-white font-mono">
                          {activeUnit.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Consignes d'exploitation */}
                {drawerTab === 'notes' && (
                  <div className="space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-neutral-500 font-medium">Consignes d'accès & Entretien :</label>
                      {isSavingNotes ? (
                        <span className="text-[10px] text-neutral-400 animate-pulse">Sauvegarde...</span>
                      ) : notesSavedNotice ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Check size={11} /> Sauvegardé
                        </span>
                      ) : null}
                    </div>
                    <textarea
                      rows={6}
                      value={unitNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Consignes de climatisation, disposition des tables, clés des portes, codes alarme..."
                      className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Count matching Screenshot 30 */}
          <div className="pt-2 text-center text-xs text-neutral-400 font-medium">
            {sortedUnits.length} {language === 'ar' ? 'مساحات معروضة' : language === 'fr' ? 'espaces affichés' : 'spaces displayed'}
          </div>
        </div>
      </div>

      {/* Add / Edit Space Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {unitToEdit ? t('venue_inv_btn_edit') : t('venue_inv_btn_new_space')}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {language === 'ar'
                    ? 'تكوين مواصفات القاعة، الطاقة الاستيعابية والتعريفات'
                    : language === 'fr'
                    ? 'Configurer les caractéristiques, tarifs et équipements'
                    : 'Set up space specifications, guest capacity, and hire rates'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput
                  label={t('venue_inv_space_name') + ' *'}
                  placeholder="e.g. Grand Hall Atlas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <LabelInput
                  label={t('venue_inv_code')}
                  placeholder="e.g. HALL-A"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <LabelSelect
                    label={t('venue_inv_type')}
                    value={type}
                    onChange={(val) => setType(val as RentableUnitType)}
                    options={[
                      { value: 'Hall', label: t('venue_type_hall') },
                      { value: 'Studio', label: t('venue_type_studio') },
                      { value: 'Room', label: t('venue_type_room') },
                      { value: 'Court', label: t('venue_type_court') },
                      { value: 'Desk', label: t('venue_type_desk') },
                    ]}
                  />
                </div>

                <LabelInput
                  label={t('venue_inv_capacity')}
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />

                <LabelInput
                  label={t('venue_inv_surface')}
                  type="number"
                  min={1}
                  value={surfaceAreaSqm}
                  onChange={(e) => setSurfaceAreaSqm(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput
                  label={t('venue_inv_hourly_rate') + ' (DZD) *'}
                  type="number"
                  step={500}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  required
                />
                <LabelInput
                  label={t('venue_inv_daily_rate') + ' (DZD) *'}
                  type="number"
                  step={1000}
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  required
                />
              </div>

              <LabelInput
                label={t('venue_inv_amenities')}
                placeholder="Wifi, Climatisation, Rétroprojecteur, Sonorisation"
                value={amenitiesStr}
                onChange={(e) => setAmenitiesStr(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('venue_inv_desc')}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description commerciale de l'espace..."
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <AtriumButton
                  type="submit"
                  variant="primary"
                  icon={<Check size={14} />}
                >
                  {unitToEdit ? t('venue_inv_btn_edit') : t('venue_inv_btn_save')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={selectedUnitForBooking}
      />
    </div>
  );
};

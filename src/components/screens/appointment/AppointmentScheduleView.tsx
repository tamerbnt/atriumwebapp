import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  User,
  Scissors,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Play,
  CreditCard,
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  Download,
  AlertCircle,
  Eye,
  UserPlus,
  Check,
  Pin,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Appointment, AppointmentStatus, StaffMember } from '../../../types/index';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { t, getLocalizedService, getLocalizedServiceCategory, getLocalizedServiceName } from '../../../utils/i18n';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30'
];

export const AppointmentScheduleView: React.FC = () => {
  const {
    appointments,
    servicesCatalog,
    staff,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    updateAppointmentStatus,
    checkoutAppointment,
    batchDeleteAppointments,
    batchUpdateAppointmentStatus,
    resetSalonMockData,
    language,
    showToast,
  } = useAtriumStore();

  useEffect(() => {
    if (!appointments || appointments.length === 0) {
      resetSalonMockData();
    }
  }, [appointments?.length, resetSalonMockData]);


  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedStylistId, setSelectedStylistId] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'columns' | 'list' | 'catalog'>('columns');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [slotPrefill, setSlotPrefill] = useState<{
    date: string;
    time: string;
    staffId: string;
  } | null>(null);

  // Collection State
  const [selectedAptIds, setSelectedAptIds] = useState<Set<string>>(new Set());
  const [pinnedAptIds, setPinnedAptIds] = useState<Set<string>>(new Set());
  const [aptSortBy, setAptSortBy] = useState<string>('time');
  const [aptSortDir, setAptSortDir] = useState<'asc' | 'desc'>('asc');

  // Active stylists for the current facility
  const salonStylists = useMemo(() => {
    return staff.filter((s) => s.isActive);
  }, [staff]);

  // Appointments filtered by date, search, stylist, status
  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.date !== selectedDate) return false;
      if (selectedStylistId !== 'All' && apt.staffId !== selectedStylistId) return false;
      if (statusFilter !== 'All' && apt.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClient = apt.clientName.toLowerCase().includes(q);
        const matchService = apt.serviceName.toLowerCase().includes(q);
        const matchStaff = apt.staffName.toLowerCase().includes(q);
        if (!matchClient && !matchService && !matchStaff) return false;
      }
      return true;
    });
  }, [appointments, selectedDate, selectedStylistId, statusFilter, searchQuery]);

  const sortedDayAppointments = useMemo(() => {
    return [...dayAppointments].sort((a, b) => {
      const aPinned = pinnedAptIds.has(a.id);
      const bPinned = pinnedAptIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (aptSortBy === 'time') {
        const cmp = a.startTime.localeCompare(b.startTime);
        return aptSortDir === 'asc' ? cmp : -cmp;
      }
      if (aptSortBy === 'client') {
        const cmp = a.clientName.localeCompare(b.clientName);
        return aptSortDir === 'asc' ? cmp : -cmp;
      }
      if (aptSortBy === 'service') {
        const cmp = a.serviceName.localeCompare(b.serviceName);
        return aptSortDir === 'asc' ? cmp : -cmp;
      }
      if (aptSortBy === 'stylist') {
        const cmp = a.staffName.localeCompare(b.staffName);
        return aptSortDir === 'asc' ? cmp : -cmp;
      }
      if (aptSortBy === 'price') {
        return aptSortDir === 'asc' ? a.price - b.price : b.price - a.price;
      }
      if (aptSortBy === 'status') {
        return aptSortDir === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      }
      return 0;
    });
  }, [dayAppointments, pinnedAptIds, aptSortBy, aptSortDir]);

  const appointmentColumns: ColumnDefinition<Appointment>[] = useMemo(() => [
    {
      key: 'time',
      header: t('salon_timeline', language) || 'Time',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (apt) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/10 text-[#C4785A] font-bold text-xs flex flex-col items-center justify-center shrink-0">
            <span className="text-[11px] font-bold leading-tight font-mono">{apt.startTime}</span>
            <span className="text-[9px] text-neutral-400 font-medium font-mono">{apt.durationMinutes}m</span>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      header: language === 'ar' ? 'الزبون' : language === 'fr' ? 'Client' : 'Client',
      width: '2.2*',
      minWidth: '180px',
      sortable: true,
      renderCell: (apt) => (
        <div className="min-w-0">
          <div className="font-bold text-neutral-900 dark:text-white truncate text-xs">
            {apt.clientName}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono truncate">
            {apt.clientPhone}
          </div>
        </div>
      ),
    },
    {
      key: 'service',
      header: language === 'ar' ? 'الخدمة' : language === 'fr' ? 'Prestation' : 'Service',
      width: '2.5*',
      minWidth: '200px',
      sortable: true,
      renderCell: (apt) => (
        <div className="min-w-0 text-xs">
          <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            {getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}
          </div>
          {apt.notes && (
            <div className="text-[10px] text-neutral-400 italic truncate">
              "{apt.notes}"
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stylist',
      header: language === 'ar' ? 'المصفف / الأخصائي' : language === 'fr' ? 'Praticien / Styliste' : 'Staff / Stylist',
      width: '2*',
      minWidth: '160px',
      sortable: true,
      renderCell: (apt) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-[10px] flex items-center justify-center shrink-0">
            {apt.staffName.split(' ').map((n) => n[0]).join('')}
          </div>
          <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium truncate">
            {apt.staffName}
          </span>
        </div>
      ),
    },
    {
      key: 'price',
      header: language === 'ar' ? 'السعر' : language === 'fr' ? 'Tarif' : 'Price',
      width: '1.4*',
      minWidth: '110px',
      sortable: true,
      renderCell: (apt) => (
        <span className="font-bold text-neutral-900 dark:text-white text-xs tabular-nums font-mono">
          {formatMoney(apt.price)}
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      width: '1.6*',
      minWidth: '130px',
      sortable: true,
      renderCell: (apt) => (
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            apt.status === 'InChair'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              : apt.status === 'Completed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : apt.status === 'Cancelled'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
          }`}
        >
          {apt.status === 'InChair' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
          {apt.status === 'InChair' ? t('salon_kpi_in_chair', language) : localizeStatus(apt.status, language)}
        </span>
      ),
    },
  ], [language]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalBookings = dayAppointments.length;
    const inChairCount = dayAppointments.filter((a) => a.status === 'InChair').length;
    const completedCount = dayAppointments.filter((a) => a.status === 'Completed').length;
    const revenue = dayAppointments
      .filter((a) => a.status !== 'Cancelled')
      .reduce((sum, a) => sum + a.price, 0);

    return { totalBookings, inChairCount, completedCount, revenue };
  }, [dayAppointments]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formattedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate, language]);

  const [checkoutToast, setCheckoutToast] = useState<{
    message: string;
    saleId: string;
    stylist: string;
  } | null>(null);

  const handleOneClickCheckout = (apt: Appointment) => {
    const sale = checkoutAppointment(apt.id, 'Cash');
    const msg = t('salon_checkout_success_toast', language)
      .replace('{client}', apt.clientName)
      .replace('{saleId}', sale.id.slice(-6).toUpperCase())
      .replace('{stylist}', apt.staffName);
    setCheckoutToast({
      message: msg,
      saleId: sale.id,
      stylist: apt.staffName,
    });
    setTimeout(() => setCheckoutToast(null), 4000);
  };

  const handleOpenAddModal = (time?: string, staffId?: string) => {
    setActiveAppointment(null);
    setSlotPrefill({
      date: selectedDate,
      time: time || '10:00',
      staffId: staffId || salonStylists[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (apt: Appointment) => {
    setActiveAppointment(apt);
    setSlotPrefill(null);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = language === 'ar'
      ? ['التاريخ', 'وقت البدء', 'وقت الانتهاء', 'المصفف', 'الزبون', 'الهاتف', 'الخدمة', 'السعر (د.ج)', 'الحالة']
      : language === 'fr'
      ? ['Date', 'Heure début', 'Heure fin', 'Coiffeur(se)', 'Client(e)', 'Téléphone', 'Prestation', 'Tarif (DA)', 'Statut']
      : ['Date', 'Start Time', 'End Time', 'Stylist', 'Client', 'Phone', 'Service', 'Price (DZD)', 'Status'];

    const rows = dayAppointments.map((a) => [
      `"${a.date}"`,
      `"${a.startTime}"`,
      `"${a.endTime}"`,
      `"${a.staffName}"`,
      `"${a.clientName}"`,
      `"${a.clientPhone}"`,
      `"${a.serviceName}"`,
      `"${a.price}"`,
      `"${localizeStatus(a.status, language)}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${t('salon_csv_filename', language)}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md">
        {checkoutToast && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xs animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>{checkoutToast.message}</span>
            </div>
            <span className="text-[11px] font-mono opacity-80">Ref #{checkoutToast.saleId.slice(-6)}</span>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#C4785A]/10 text-[#C4785A]">
                <Scissors size={18} />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t('salon_schedule_title', language)}
              </h1>

              {/* Facility Badge / Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Building2 size={12} className="text-[#C4785A]" />
                  <span>{currentBranch.name}</span>
                  <ChevronDown size={11} />
                </button>

                {isFacilityDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-60 py-1.5 bg-white dark:bg-[#18181B] rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {t('salon_switch_facility', language)}
                    </div>
                    {businesses.map((biz) => {
                      const bizBranches = branches.filter((b) => b.businessId === biz.id);
                      return (
                        <div key={biz.id} className="py-1">
                          <div className="px-3 text-xs font-semibold text-neutral-500">
                            {biz.displayName}
                          </div>
                          {bizBranches.map((br) => {
                            const isCurrent = br.id === currentBranch.id;
                            return (
                              <button
                                key={br.id}
                                type="button"
                                onClick={() => {
                                  switchBusiness(biz.id);
                                  switchBranch(br.id);
                                  setIsFacilityDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-1.5 text-xs text-left flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                                  isCurrent ? 'text-[#C4785A] font-bold' : 'text-neutral-700 dark:text-neutral-300'
                                }`}
                              >
                                <span>{br.name}</span>
                                {isCurrent && <Check size={13} />}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('salon_schedule_subtitle', language)}
            </p>
          </div>

          {/* Prominent High-Visibility Segmented Switcher: Universal Collection vs Column Matrix vs Catalog */}
          <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'list'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>{language === 'ar' ? 'بطاقات وقائمة عامة' : language === 'fr' ? 'Cartes & Liste Universelles' : 'Universal Cards & List'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('columns')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'columns'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
              }`}
            >
              <Calendar size={14} />
              <span>{language === 'ar' ? 'مخطط كراسي المصففين' : language === 'fr' ? 'Matrice Stylistes' : 'Stylist Chair Matrix'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'catalog'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
              }`}
            >
              <Sparkles size={14} />
              <span>{t('salon_view_catalog', language)}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => resetSalonMockData()}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-[#C4785A]/30 text-[#C4785A] hover:bg-[#C4785A]/10 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Restaurer l'agenda et les rendez-vous d'Alger"
            >
              <Sparkles size={14} />
              <span>Recharger Démo</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              {t('salon_btn_export_csv', language)}
            </button>


            <button
              type="button"
              onClick={() => handleOpenAddModal('10:00')}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#C4785A] hover:bg-[#b56b4f] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              {t('salon_btn_new_appointment', language)}
            </button>
          </div>
        </div>

        {/* Date Selector & Filters Bar */}
        <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Date Picker Controls */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer"
              title={t('salon_btn_prev_day', language)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold rounded-xl bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs cursor-pointer"
            >
              {t('salon_btn_today', language)}
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer"
              title={t('salon_btn_next_day', language)}
            >
              <ChevronRight size={16} />
            </button>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-600 mx-1" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-semibold bg-transparent text-neutral-800 dark:text-neutral-200 border-none focus:outline-none cursor-pointer"
            />
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 pr-2">
              • {formattedDateLabel}
            </span>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filters */}
            <div className="flex items-center gap-1">
              {['All', 'Confirmed', 'InChair', 'Completed', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#C4785A] text-white font-semibold'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {st === 'All' ? t('common_all', language) : localizeStatus(st, language)}
                </button>
              ))}
            </div>

            {/* Stylist Dropdown */}
            <LabelSelect
              field="Stylist"
              label={t('salon_filter_stylist', language)}
              value={selectedStylistId}
              onChange={(val) => setSelectedStylistId(val?.target?.value ?? String(val))}
              options={[
                { value: 'All', label: `${t('salon_filter_all_stylists', language)} (${salonStylists.length})` },
                ...salonStylists.map((st) => ({
                  value: st.id,
                  label: st.fullName,
                  sublabel: st.role,
                })),
              ]}
              width={190}
              height={36}
              corner={14}
            />
          </div>

          {/* Seek Kinetic Search */}
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('salon_search_placeholder', language)}
            shutSize={34}
            openWidth={230}
          />
        </div>

        {/* Daily KPI Badges */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-800">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">{t('salon_kpi_total_bookings', language)}</span>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">{stats.totalBookings}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {t('salon_kpi_in_chair', language)}
            </span>
            <span className="text-lg font-bold text-amber-900 dark:text-amber-200">{stats.inChairCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block">{t('salon_kpi_completed', language)}</span>
            <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{stats.completedCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30">
            <span className="text-[11px] font-medium text-purple-700 dark:text-purple-400 block">{t('salon_kpi_est_revenue', language)}</span>
            <span className="text-lg font-bold text-purple-900 dark:text-purple-200">{formatMoney(stats.revenue)}</span>
          </div>
        </div>
      </div>

      {/* Main Board View: Multi-Stylist Column Schedule */}
      {viewMode === 'columns' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="min-w-[900px] bg-white dark:bg-[#18181B] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">
            {/* Column Headers */}
            <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80">
              <div className="p-3.5 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                <Clock size={14} className="mr-1 text-neutral-400" /> {t('salon_timeline', language)}
              </div>

              {salonStylists.map((stylist, index) => {
                const count = dayAppointments.filter((a) => a.staffId === stylist.id).length;
                return (
                  <div
                    key={stylist.id}
                    className={`p-3.5 ${
                      index < salonStylists.length - 1 ? 'border-r border-neutral-200 dark:border-neutral-800' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center">
                          {stylist.fullName.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                            {stylist.fullName}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-medium">
                            {stylist.role} • {t('salon_chair_num', language).replace('{number}', String(index + 1))}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {count === 1
                          ? t('salon_booking_count_single', language).replace('{count}', '1')
                          : t('salon_booking_count_multi', language).replace('{count}', String(count))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slot Rows Grid */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {TIME_SLOTS.map((time) => {
                return (
                  <div
                    key={time}
                    className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] min-h-[68px] hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 transition-colors"
                  >
                    {/* Time Label */}
                    <div className="p-3 text-xs font-semibold text-neutral-500 text-center border-r border-neutral-200 dark:border-neutral-800 flex items-start justify-center pt-3">
                      {time}
                    </div>

                    {/* Stylist Columns */}
                    {salonStylists.map((stylist, index) => {
                      // Find appointment starting at this time slot
                      const apt = dayAppointments.find(
                        (a) => a.staffId === stylist.id && a.startTime === time
                      );

                      return (
                        <div
                          key={stylist.id}
                          className={`p-1.5 relative group ${
                            index < salonStylists.length - 1 ? 'border-r border-neutral-200/70 dark:border-neutral-800/70' : ''
                          }`}
                        >
                          {apt ? (
                            <div
                              onClick={() => handleOpenEditModal(apt)}
                              className={`h-full w-full p-2.5 rounded-2xl cursor-pointer transition-all border shadow-xs hover:shadow-md ${
                                apt.status === 'InChair'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20'
                                  : apt.status === 'Completed'
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                                  : apt.status === 'Cancelled'
                                  ? 'bg-neutral-100/70 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 opacity-60'
                                  : 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                  {apt.clientName}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                    apt.status === 'InChair'
                                      ? 'bg-amber-500 text-white animate-pulse'
                                      : apt.status === 'Completed'
                                      ? 'bg-emerald-600 text-white'
                                      : apt.status === 'Cancelled'
                                      ? 'bg-neutral-400 text-white'
                                      : 'bg-indigo-600 text-white'
                                  }`}
                                >
                                  {localizeStatus(apt.status, language)}
                                </span>
                              </div>

                              <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate mb-1">
                                {getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                                <span>{apt.startTime} - {apt.endTime} ({apt.durationMinutes}m)</span>
                                <span className="font-bold text-[#C4785A]">{formatMoney(apt.price)}</span>
                              </div>

                              {apt.status === 'InChair' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOneClickCheckout(apt);
                                  }}
                                  className="mt-2 w-full py-1 rounded-lg bg-[#C4785A] hover:bg-[#b0674c] text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  title={t('salon_quick_checkout', language)}
                                >
                                  <CreditCard size={11} />
                                  <span>{t('salon_quick_checkout', language)}</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAddModal(time, stylist.id)}
                              className="w-full h-full min-h-[50px] rounded-xl border border-dashed border-transparent group-hover:border-neutral-300 dark:group-hover:border-neutral-700 group-hover:bg-neutral-100/50 dark:group-hover:bg-neutral-800/40 flex items-center justify-center text-neutral-400 hover:text-[#C4785A] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <span className="flex items-center gap-1 text-[11px] font-medium">
                                <Plus size={13} /> {t('salon_book_slot', language)}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-auto p-6">
          <UniversalDataCollection<Appointment>
            items={sortedDayAppointments}
            keyExtractor={(apt) => apt.id}
            defaultViewMode="list"
            columns={appointmentColumns}
            sortBy={aptSortBy}
            sortDirection={aptSortDir}
            onSortChange={(key) => {
              if (aptSortBy === key) {
                setAptSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setAptSortBy(key);
                setAptSortDir('asc');
              }
            }}
            renderCard={(apt) => (
              <div className="flex flex-col justify-between w-full h-full">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg">
                      {apt.startTime} ({apt.durationMinutes}m)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        apt.status === 'InChair'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : apt.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : apt.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}
                    >
                      {apt.status === 'InChair' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                      {apt.status === 'InChair' ? t('salon_kpi_in_chair', language) : localizeStatus(apt.status, language)}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1 mb-0.5">
                    {apt.clientName}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono mb-2">
                    {apt.clientPhone}
                  </p>

                  <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-xs space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 text-[10px] uppercase font-medium">
                        {language === 'ar' ? 'الخدمة' : 'Service'}
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[140px]">
                        {getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-neutral-400 text-[10px] uppercase font-medium">
                        {language === 'ar' ? 'المصفف' : 'Staff'}
                      </span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]">
                        {apt.staffName}
                      </span>
                    </div>
                  </div>

                  {apt.notes && (
                    <p className="text-[11px] text-neutral-400 italic mb-2 line-clamp-1">
                      "{apt.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
                    {formatMoney(apt.price)}
                  </span>

                  {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOneClickCheckout(apt);
                      }}
                      className="py-1 px-3 rounded-xl bg-[#C4785A] hover:bg-[#b56b4f] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <CreditCard size={12} />
                      <span>{t('salon_quick_checkout', language)}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            onItemClick={(apt) => handleOpenEditModal(apt)}
            onViewDetails={(apt) => handleOpenEditModal(apt)}
            onEdit={(apt) => handleOpenEditModal(apt)}
            onTogglePin={(apt) => {
              setPinnedAptIds((prev) => {
                const next = new Set(prev);
                if (next.has(apt.id)) {
                  next.delete(apt.id);
                  showToast({
                    type: 'info',
                    title: 'Unpinned',
                    message: `${apt.clientName} unpinned`,
                  });
                } else {
                  next.add(apt.id);
                  showToast({
                    type: 'info',
                    title: 'Pinned',
                    message: `${apt.clientName} pinned to top`,
                  });
                }
                return next;
              });
            }}
            customActions={(apt) => [
              ...(apt.status !== 'Completed' && apt.status !== 'Cancelled'
                ? [
                    {
                      id: 'checkout',
                      tooltip: t('salon_quick_checkout', language) || 'Checkout',
                      icon: <CreditCard size={13} />,
                      iconColor: '#C4785A',
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleOneClickCheckout(apt);
                      },
                    },
                  ]
                : []),
              ...(apt.status === 'Confirmed'
                ? [
                    {
                      id: 'start',
                      tooltip: t('salon_kpi_in_chair', language) || 'Start Service',
                      icon: <Play size={13} />,
                      iconColor: '#D97706',
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        updateAppointmentStatus(apt.id, 'InChair');
                      },
                    },
                  ]
                : []),
            ]}
            isPinned={(apt) => pinnedAptIds.has(apt.id)}
            selectedIds={selectedAptIds}
            onSelectionChange={setSelectedAptIds}
            emptyTitle={t('salon_empty_appointments', language)}
            emptyDescription={t('salon_empty_appointments_sub', language)}
            primaryActionLabel={t('salon_new_booking', language)}
            onAddFirstItem={() => handleOpenAddModal('10:00')}
          />
        </div>
      )}

      {/* Service Treatment Catalog View */}
      {viewMode === 'catalog' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white dark:bg-[#18181B] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('salon_catalog_title', language)}
                </h2>
                <p className="text-xs text-neutral-500">
                  {t('salon_catalog_subtitle', language)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servicesCatalog.map((service) => {
                const localized = getLocalizedService(service, language);
                return (
                  <div
                    key={service.id}
                    className="p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 hover:border-[#C4785A]/50 bg-neutral-50/50 dark:bg-neutral-900/40 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider text-white"
                        style={{ backgroundColor: service.colorCode || '#C4785A' }}
                      >
                        {getLocalizedServiceCategory(service.category, language)}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
                        <Clock size={12} /> {t('salon_duration_mins', language).replace('{duration}', String(service.durationMinutes))}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
                      {localized.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 min-h-[36px]">
                      {localized.description || 'Premium salon aesthetic treatment.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80">
                      <span className="text-sm font-bold text-[#C4785A]">
                        {formatMoney(service.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenAddModal('10:00');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#C4785A]/10 text-[#C4785A] hover:bg-[#C4785A] hover:text-white transition-colors cursor-pointer"
                      >
                        {t('salon_btn_new_appointment', language)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Booking / Action Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appointment={activeAppointment}
        initialDate={slotPrefill?.date || selectedDate}
        initialTime={slotPrefill?.time || '10:00'}
        initialStaffId={slotPrefill?.staffId}
      />
    </div>
  );
};

export const StylistScheduleView = AppointmentScheduleView;

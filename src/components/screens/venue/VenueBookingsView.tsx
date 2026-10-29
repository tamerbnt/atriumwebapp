import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  FileText,
  Printer,
  DollarSign,
  AlertCircle,
  X,
  Cloud,
  Pin,
  LogIn,
  LogOut,
  Home,
  ChevronDown,
  Download,
  Building2,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentalBooking, BookingStatus } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal } from './VenueCloudSyncModal';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export interface VenueBookingsViewProps {
  hideHeader?: boolean;
}

export const VenueBookingsView: React.FC<VenueBookingsViewProps> = ({ hideHeader = false }) => {
  const { t, language } = useTranslation();
  const {
    rentalBookings,
    checkInBooking,
    checkOutBooking,
    deleteRentalBooking,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    resetVenueMockData,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty bookings safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && rentalBookings.length === 0) {
      hasAutoHealed.current = true;
      resetVenueMockData();
    }
  }, [rentalBookings.length, resetVenueMockData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<RentalBooking | null>(null);
  const [printedBooking, setPrintedBooking] = useState<RentalBooking | null>(null);

  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [pinnedBookingIds, setPinnedBookingIds] = useState<Set<string>>(new Set());
  const [bookingSortBy, setBookingSortBy] = useState<string>('date');
  const [bookingSortDir, setBookingSortDir] = useState<'asc' | 'desc'>('asc');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  const filteredBookings = useMemo(() => {
    return rentalBookings.filter((b) => {
      const matchesSearch =
        b.renterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.renterCompany && b.renterCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        b.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.purpose.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === 'All'
          ? true
          : selectedStatus === 'InUse'
          ? b.status === 'CheckedIn'
          : b.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [rentalBookings, searchQuery, selectedStatus]);

  const totalBookingsCount = rentalBookings.length;
  const inUseCount = rentalBookings.filter((b) => b.status === 'CheckedIn').length;
  const confirmedCount = rentalBookings.filter((b) => b.status === 'Confirmed').length;
  const totalRevenue = rentalBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const aPinned = pinnedBookingIds.has(a.id);
      const bPinned = pinnedBookingIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (bookingSortBy === 'date') {
        const cmp = a.startDateTime.localeCompare(b.startDateTime);
        return bookingSortDir === 'asc' ? cmp : -cmp;
      }
      if (bookingSortBy === 'event' || bookingSortBy === 'renter') {
        const cmp = a.purpose.localeCompare(b.purpose);
        return bookingSortDir === 'asc' ? cmp : -cmp;
      }
      if (bookingSortBy === 'space') {
        const cmp = a.unitName.localeCompare(b.unitName);
        return bookingSortDir === 'asc' ? cmp : -cmp;
      }
      if (bookingSortBy === 'financials') {
        return bookingSortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
      }
      if (bookingSortBy === 'caution') {
        return bookingSortDir === 'asc' ? a.depositAmount - b.depositAmount : b.depositAmount - a.depositAmount;
      }
      if (bookingSortBy === 'status') {
        return bookingSortDir === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      }
      return 0;
    });
  }, [filteredBookings, pinnedBookingIds, bookingSortBy, bookingSortDir]);

  const bookingColumns: ColumnDefinition<RentalBooking>[] = useMemo(() => [
    {
      key: 'event',
      header: t('venue_col_event_renter'),
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (b) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900 dark:text-white truncate">
            {b.purpose}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{b.renterName}</span>
            {b.renterCompany && <span>({b.renterCompany})</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'space',
      header: t('venue_col_space'),
      width: '1.5*',
      minWidth: '140px',
      sortable: true,
      renderCell: (b) => (
        <div>
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
            {b.unitName}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">
            {t('venue_guests_count', language, { count: b.attendeeCount })}
          </span>
        </div>
      ),
    },
    {
      key: 'date',
      header: t('venue_col_schedule'),
      width: '2*',
      minWidth: '170px',
      sortable: true,
      renderCell: (b) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-neutral-800 dark:text-neutral-200 font-mono text-[11px]">
            {b.startDateTime.replace('T', ' ').slice(0, 16)}
          </div>
          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
            <Clock size={10} />
            <span>{b.durationHours}h {t('venue_inv_hourly_short')}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'financials',
      header: t('venue_col_financials'),
      width: '1.5*',
      minWidth: '130px',
      sortable: true,
      renderCell: (b) => (
        <div>
          <div className="font-bold text-neutral-900 dark:text-white tabular-nums font-mono text-xs">
            {formatCurrencyAmount(b.totalAmount, b.currency)}
          </div>
          <div className="text-[10px] text-neutral-400">
            {t('venue_col_caution')}: {formatCurrencyAmount(b.depositAmount, b.currency)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('venue_col_status'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (b) => {
        const isCheckedIn = b.status === 'CheckedIn';
        const isConfirmed = b.status === 'Confirmed';
        const isTentative = b.status === 'Tentative';
        const isCompleted = b.status === 'Completed';

        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
              isCheckedIn
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : isConfirmed
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : isTentative
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : isCompleted
                ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
            }`}
          >
            {isCheckedIn && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />}
            {isCheckedIn
              ? t('venue_filter_in_use')
              : isConfirmed
              ? t('venue_filter_confirmed')
              : isTentative
              ? t('venue_filter_inquiries')
              : isCompleted
              ? t('venue_filter_completed')
              : b.status}
          </span>
        );
      },
    },
  ], [language, t]);

  const handleNewBooking = () => {
    setBookingToEdit(null);
    setIsBookingModalOpen(true);
  };

  const handleEdit = (b: RentalBooking) => {
    setBookingToEdit(b);
    setIsBookingModalOpen(true);
  };

  const handleExportBookingsCSV = () => {
    const headers = [
      language === 'ar' ? 'معرف الحجز' : 'ID',
      language === 'ar' ? 'الحدث / الغرض' : 'Purpose',
      language === 'ar' ? 'المستأجر' : 'Renter',
      language === 'ar' ? 'الشركة' : 'Company',
      language === 'ar' ? 'القاعة' : 'Space',
      language === 'ar' ? 'تاريخ البدء' : 'Start DateTime',
      language === 'ar' ? 'تاريخ الانتهاء' : 'End DateTime',
      language === 'ar' ? 'المدة (س)' : 'Duration (h)',
      language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount',
      language === 'ar' ? 'مبلغ الضمان' : 'Deposit Amount',
      language === 'ar' ? 'حالة الحجز' : 'Status',
    ];

    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${b.purpose}"`,
      `"${b.renterName}"`,
      `"${b.renterCompany || ''}"`,
      `"${b.unitName}"`,
      `"${b.startDateTime}"`,
      `"${b.endDateTime}"`,
      `"${b.durationHours}"`,
      `"${b.totalAmount}"`,
      `"${b.depositAmount}"`,
      `"${b.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-venue-bookings-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchDelete = () => {
    if (selectedBookingIds.size === 0) return;
    if (confirm(t('venue_confirm_batch_cancel', language, { count: selectedBookingIds.size }))) {
      selectedBookingIds.forEach((id) => deleteRentalBooking(id));
      setSelectedBookingIds(new Set());
    }
  };

  const handleBatchCheckIn = () => {
    if (selectedBookingIds.size === 0) return;
    let checkedCount = 0;
    selectedBookingIds.forEach((id) => {
      const b = rentalBookings.find((item) => item.id === id);
      if (b && b.status === 'Confirmed') {
        checkInBooking(id);
        checkedCount++;
      }
    });
    setSelectedBookingIds(new Set());
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تسجيل دخول' : language === 'fr' ? 'Check-in effectué' : 'Checked In',
      message: `${checkedCount} ${language === 'ar' ? 'حجوزات تم تسجيل دخولها' : 'bookings checked in successfully'}`,
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
            <div className="space-y-6">
        {/* Row 0: Top Header */}
        {!hideHeader && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                <Calendar size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('venue_bookings_page_title')}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {t('venue_bookings_page_sub')}
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
                          {isCurrent && <CheckCircle2 size={14} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Supabase Cloud */}
              <button
                type="button"
                onClick={() => setIsCloudSyncModalOpen(true)}
                className="h-10 px-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
                title="Inspect Supabase live tables and row writes"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Cloud size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="hidden sm:inline">Supabase</span>
              </button>

              {/* Seed Demo Data Button */}
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Sparkles size={14} className="text-[#C4785A]" />}
                onClick={resetVenueMockData}
                title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
              >
                <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
              </AtriumButton>

              {/* New Reservation Button */}
              <AtriumButton
                variant="primary"
                onClick={handleNewBooking}
                icon={<Plus size={16} strokeWidth={2.5} />}
              >
                {t('venue_btn_new_res')}
              </AtriumButton>
            </div>
          </div>
        )}

        {/* Row 1: Top Metrics Pod Tray matching Staff Management Screenshot 30 */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل الحجوزات & مؤشرات الاستغلال' : language === 'fr' ? 'Réservations & Indicateurs d\'Activité' : 'Bookings Pipeline & Utilization Indicators'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {language === 'ar'
                ? 'متابعة جدول الحجوزات النشطة والجلسات الجارية والمداخيل المحققة'
                : language === 'fr'
                ? 'Suivi du planning, des sessions en cours et du chiffre d\'affaires réservé'
                : 'Active booking intake, current live sessions, and overall booked volume'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tile 1: Active Confirmed Bookings — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'الحجوزات المؤكدة' : language === 'fr' ? 'Réservations Confirmées' : 'Confirmed Bookings'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    ↗ {confirmedCount} {language === 'ar' ? 'مؤكدة' : language === 'fr' ? 'validées' : 'confirmed'}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
                {confirmedCount}
              </div>
            </div>

            {/* Tile 2: In-Use / In-Session Spaces — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'جلسات قيد الاستخدام الآن' : language === 'fr' ? 'Sessions En Cours (Live)' : 'In-Session Spaces'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                    ● {inUseCount} {language === 'ar' ? 'قاعة مستغلة' : language === 'fr' ? 'en cours' : 'active'}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
                {inUseCount}
              </div>
            </div>

            {/* Tile 3: DARK ESPRESSO CARD (#1F1D1B) — Cumulative Booked Volume */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div>
                <span className="text-xs font-medium text-neutral-300">
                  {language === 'ar' ? 'إجمالي المداخيل المحجوزة' : language === 'fr' ? 'Volume Réservé Cumulé' : 'Total Booked Turnover'}
                </span>
                <div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
                  <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                    {totalBookingsCount} {language === 'ar' ? 'عقود وحجوزات' : language === 'fr' ? 'dossiers actifs' : 'total files'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-white tabular-nums font-mono">
                {formatCurrencyAmount(totalRevenue, 'DZD')}
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
              <Calendar size={16} className="text-neutral-500" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'جدول الحجوزات' : language === 'fr' ? 'Planning des Réservations' : 'Bookings Register'}
              </span>
              <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
                {sortedBookings.length}
              </span>
            </div>

            {/* Right: Seek, Capsules, CSV, Fullscreen */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {/* Expanding Seek Search Box */}
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('venue_search_bookings_placeholder')}
                shutSize={36}
                openWidth={220}
              />

              {/* Status Filter Capsules */}
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
                {[
                  { id: 'All', label: t('venue_filter_all') },
                  { id: 'InUse', label: t('venue_filter_in_use') },
                  { id: 'Confirmed', label: t('venue_filter_confirmed') },
                  { id: 'Tentative', label: t('venue_filter_inquiries') },
                  { id: 'Completed', label: t('venue_filter_completed') },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedStatus(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      selectedStatus === tab.id
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportBookingsCSV}
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
          {selectedBookingIds.size > 0 && (
            <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  {selectedBookingIds.size} {language === 'ar' ? 'حجوزات محددة' : language === 'fr' ? 'réservations sélectionnées' : 'bookings selected'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleBatchCheckIn}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <LogIn size={13} />
                  <span>{language === 'ar' ? 'تسجيل دخول المحدد' : language === 'fr' ? 'Check-in Sélection' : 'Check In Selected'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBookingIds(new Set())}
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
                  <span>{language === 'ar' ? 'إلغاء المحدد' : language === 'fr' ? 'Annuler' : 'Cancel Selected'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Universal Bookings Collection */}
          <UniversalDataCollection<RentalBooking>
            items={sortedBookings}
            keyExtractor={(b) => b.id}
            defaultViewMode="list"
            columns={bookingColumns}
            sortBy={bookingSortBy}
            sortDirection={bookingSortDir}
            onSortChange={(key) => {
              if (bookingSortBy === key) {
                setBookingSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setBookingSortBy(key);
                setBookingSortDir('asc');
              }
            }}
            renderCard={(b) => (
              <div className="flex flex-col justify-between w-full h-full">
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {b.unitName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        b.status === 'CheckedIn'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : b.status === 'Confirmed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : b.status === 'Tentative'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : b.status === 'Completed'
                          ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}
                    >
                      {b.status === 'CheckedIn'
                        ? t('venue_filter_in_use')
                        : b.status === 'Confirmed'
                        ? t('venue_filter_confirmed')
                        : b.status === 'Tentative'
                        ? t('venue_filter_inquiries')
                        : b.status === 'Completed'
                        ? t('venue_filter_completed')
                        : b.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1 mb-1">
                    {b.purpose}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mb-2">
                    {b.renterName} {b.renterCompany && `· ${b.renterCompany}`}
                  </p>

                  {/* Time Window */}
                  <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-xs space-y-1 mb-3">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-neutral-500">{b.startDateTime.split('T')[0]}</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        {b.startDateTime.split('T')[1]?.slice(0, 5)} - {b.endDateTime.split('T')[1]?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-neutral-400">{t('venue_inv_capacity')}</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {t('venue_guests_count', language, { count: b.attendeeCount })}
                      </span>
                    </div>
                  </div>

                  {/* Financials Breakdown */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-medium block">
                        {t('venue_col_financials')}
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
                        {formatCurrencyAmount(b.totalAmount, b.currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 uppercase font-medium block">
                        {t('venue_col_caution')}
                      </span>
                      <span className="font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                        {formatCurrencyAmount(b.depositAmount, b.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                  {b.status === 'Confirmed' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        checkInBooking(b.id);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogIn size={13} />
                      <span>{t('venue_btn_checkin_guest')}</span>
                    </button>
                  ) : b.status === 'CheckedIn' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        checkOutBooking(b.id);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>{t('venue_btn_checkout_space')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrintedBooking(b);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>{t('venue_btn_print_voucher')}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            onItemClick={(b) => handleEdit(b)}
            onViewDetails={(b) => handleEdit(b)}
            onEdit={(b) => handleEdit(b)}
            onTogglePin={(b) => {
              setPinnedBookingIds((prev) => {
                const next = new Set(prev);
                if (next.has(b.id)) {
                  next.delete(b.id);
                  showToast({
                    type: 'info',
                    title: 'Unpinned',
                    message: `${b.purpose} unpinned`,
                  });
                } else {
                  next.add(b.id);
                  showToast({
                    type: 'info',
                    title: 'Pinned',
                    message: `${b.purpose} pinned to top`,
                  });
                }
                return next;
              });
            }}
            onDelete={(b) => {
              if (confirm(t('venue_confirm_cancel_res', language, { renter: b.renterName }))) {
                deleteRentalBooking(b.id);
              }
            }}
            customActions={(b) => [
              ...(b.status === 'Confirmed'
                ? [
                    {
                      id: 'checkin',
                      tooltip: t('venue_btn_checkin_guest') || 'Check In',
                      icon: <LogIn size={13} />,
                      iconColor: '#9333EA',
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        checkInBooking(b.id);
                      },
                    },
                  ]
                : b.status === 'CheckedIn'
                ? [
                    {
                      id: 'checkout',
                      tooltip: t('venue_btn_checkout_space') || 'Check Out',
                      icon: <LogOut size={13} />,
                      iconColor: '#2563EB',
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        checkOutBooking(b.id);
                      },
                    },
                  ]
                : []),
              {
                id: 'print',
                tooltip: t('venue_btn_print_voucher') || 'Print Voucher',
                icon: <Printer size={13} />,
                iconColor: '#6B7280',
                onClick: (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setPrintedBooking(b);
                },
              },
            ]}
            isPinned={(b) => pinnedBookingIds.has(b.id)}
            selectedIds={selectedBookingIds}
            onSelectionChange={setSelectedBookingIds}
            emptyTitle={t('venue_no_bookings_match')}
            emptyDescription={t('venue_bookings_page_sub')}
            primaryActionLabel={t('venue_btn_new_res')}
            onAddFirstItem={handleNewBooking}
          />

          {/* Footer Count matching Screenshot 30 */}
          <div className="pt-2 text-center text-xs text-neutral-400 font-medium">
            {sortedBookings.length} {language === 'ar' ? 'حجوزات معروضة' : language === 'fr' ? 'réservations affichées' : 'bookings displayed'}
          </div>
        </div>
      </div>

      {/* Printable Rental Voucher Modal */}
      {printedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {t('venue_voucher_title')}
                </h3>
                <span className="text-xs font-mono text-neutral-400">
                  {t('venue_voucher_ref', language, { id: printedBooking.id })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrintedBooking(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('venue_voucher_renter_name')}</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{printedBooking.renterName}</span>
                </div>
                {printedBooking.renterCompany && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('venue_voucher_company')}</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{printedBooking.renterCompany}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('venue_voucher_phone')}</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">{printedBooking.renterPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('venue_voucher_space')}</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{printedBooking.unitName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('venue_voucher_window')}</span>
                  <span className="font-mono text-neutral-900 dark:text-white">
                    {printedBooking.startDateTime.replace('T', ' ').slice(0, 16)} - {printedBooking.endDateTime.split('T')[1]?.slice(0, 5)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="flex justify-between font-semibold text-neutral-900 dark:text-white">
                  <span>{t('venue_voucher_total_hire')}</span>
                  <span className="tabular-nums font-mono">{formatCurrencyAmount(printedBooking.totalAmount, printedBooking.currency)}</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>{t('venue_voucher_caution_held')}</span>
                  <span className="font-medium text-emerald-600 tabular-nums font-mono">
                    {formatCurrencyAmount(printedBooking.depositAmount, printedBooking.currency)} (
                    {printedBooking.depositStatus === 'Held'
                      ? t('venue_held_status')
                      : printedBooking.depositStatus === 'Refunded'
                      ? t('venue_refunded_status')
                      : t('venue_deducted_status')}
                    )
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>{t('venue_voucher_balance_due')}</span>
                  <span className="font-medium tabular-nums font-mono">{formatCurrencyAmount(printedBooking.balanceDue, printedBooking.currency)}</span>
                </div>
              </div>

              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {t('venue_voucher_disclaimer')}
              </div>
            </div>

            <div className="flex justify-end rtl:justify-start gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={14} /> {t('venue_btn_print_agreement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        bookingToEdit={bookingToEdit}
      />

      {/* Supabase Cloud Verification Modal */}
      <VenueCloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
      />
    </div>
  );
};

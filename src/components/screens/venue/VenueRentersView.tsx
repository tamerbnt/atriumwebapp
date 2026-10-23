import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Pin,
  Eye,
  Home,
  ChevronDown,
  Download,
  Sparkles,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentalRenter } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const VenueRentersView: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    rentalRenters,
    createRentalRenter,
    updateRentalRenter,
    deleteRentalRenter,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    resetVenueMockData,
    showToast,
  } = useAtriumStore();

  // Auto-seed rich venue mock data if stored dataset is small
  React.useEffect(() => {
    if (rentalRenters.length < 10) {
      resetVenueMockData();
    }
  }, [rentalRenters.length, resetVenueMockData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [renterToEdit, setRenterToEdit] = useState<RentalRenter | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedRenterIds, setPinnedRenterIds] = useState<Set<string>>(new Set());
  const [renterSortBy, setRenterSortBy] = useState<string>('renter');
  const [renterSortDir, setRenterSortDir] = useState<'asc' | 'desc'>('asc');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Quick book for selected renter
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingRenterId, setBookingRenterId] = useState<string | undefined>(undefined);

  // Form State
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idDocNumber, setIdDocNumber] = useState('');
  const [notes, setNotes] = useState('');

  const filteredRenters = rentalRenters.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      (r.companyName && r.companyName.toLowerCase().includes(q)) ||
      r.phone.includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.idDocNumber && r.idDocNumber.toLowerCase().includes(q))
    );
  });

  const totalRentersCount = rentalRenters.length;
  const corporateCount = rentalRenters.filter((r) => Boolean(r.companyName)).length;
  const totalRevenue = rentalRenters.reduce((sum, r) => sum + r.totalSpent, 0);

  const handleOpenAdd = () => {
    setRenterToEdit(null);
    setFullName('');
    setCompanyName('');
    setEmail('');
    setPhone('+213 ');
    setIdDocNumber('');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (renter: RentalRenter) => {
    setRenterToEdit(renter);
    setFullName(renter.fullName);
    setCompanyName(renter.companyName || '');
    setEmail(renter.email);
    setPhone(renter.phone);
    setIdDocNumber(renter.idDocNumber || '');
    setNotes(renter.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveRenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Full Name',
        message: 'Please enter the renter full name or organizer contact.',
      });
      return;
    }
    if (!phone.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Telephone',
        message: 'Please enter a telephone number for booking confirmations.',
      });
      return;
    }

    if (renterToEdit) {
      updateRentalRenter(renterToEdit.id, {
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        idDocNumber: idDocNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      createRentalRenter({
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@client.local`,
        phone: phone.trim(),
        idDocNumber: idDocNumber.trim() || undefined,
        currency: 'DZD',
        notes: notes.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
  };

  const sortedRenters = React.useMemo(() => {
    return [...filteredRenters].sort((a, b) => {
      const aPinned = pinnedRenterIds.has(a.id);
      const bPinned = pinnedRenterIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (renterSortBy === 'renter') {
        const cmp = a.fullName.localeCompare(b.fullName);
        return renterSortDir === 'asc' ? cmp : -cmp;
      }
      if (renterSortBy === 'bookings') {
        return renterSortDir === 'asc' ? a.totalBookings - b.totalBookings : b.totalBookings - a.totalBookings;
      }
      if (renterSortBy === 'spent') {
        return renterSortDir === 'asc' ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent;
      }
      return 0;
    });
  }, [filteredRenters, pinnedRenterIds, renterSortBy, renterSortDir]);

  const renterColumns: ColumnDefinition<RentalRenter>[] = React.useMemo(() => [
    {
      key: 'renter',
      header: t('venue_renters_field_fullname'),
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (renter) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
            {renter.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-neutral-900 dark:text-white truncate">
              {renter.fullName}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {renter.companyName || (renter.idDocNumber ? `ID: ${renter.idDocNumber}` : (language === 'ar' ? 'مستأجر خاص' : language === 'fr' ? 'Locataire Particulier' : 'Private Renter'))}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: language === 'ar' ? 'بيانات الاتصال' : language === 'fr' ? 'Coordonnées' : 'Contact',
      width: '2*',
      minWidth: '180px',
      renderCell: (renter) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
            <Phone size={12} className="text-neutral-400 shrink-0" />
            <span>{renter.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 truncate text-[11px]">
            <Mail size={12} className="text-neutral-400 shrink-0" />
            <span className="truncate">{renter.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'bookings',
      header: language === 'ar' ? 'الحجوزات' : language === 'fr' ? 'Réservations' : 'Bookings',
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (renter) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 tabular-nums">
          {renter.totalBookings} {language === 'ar' ? 'حجز' : language === 'fr' ? 'réservations' : 'bookings'}
        </span>
      ),
    },
    {
      key: 'spent',
      header: t('venue_renters_kpi_revenue'),
      width: '1.5*',
      minWidth: '130px',
      sortable: true,
      renderCell: (renter) => (
        <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
          {formatCurrencyAmount(renter.totalSpent, renter.currency)}
        </span>
      ),
    },
  ], [language, t]);

  const handleExportCSV = () => {
    const headers = [
      language === 'ar' ? 'الاسم الكامل' : language === 'fr' ? 'Nom complet' : 'Full Name',
      language === 'ar' ? 'الشركة / المؤسسة' : language === 'fr' ? 'Entreprise' : 'Company',
      language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone',
      language === 'ar' ? 'البريد الإلكتروني' : language === 'fr' ? 'E-mail' : 'Email',
      language === 'ar' ? 'رقم وثيقة الهوية' : language === 'fr' ? 'N° Pièce Identité' : 'ID Doc Number',
      language === 'ar' ? 'عدد الحجوزات' : language === 'fr' ? 'Total Réservations' : 'Total Bookings',
      language === 'ar' ? 'إجمالي المداخيل' : language === 'fr' ? 'Total Dépensé' : 'Total Spent',
      language === 'ar' ? 'العملة' : language === 'fr' ? 'Devise' : 'Currency',
      language === 'ar' ? 'ملاحظات' : language === 'fr' ? 'Remarques' : 'Notes',
    ];
    const rows = sortedRenters.map((r) => [
      `"${r.fullName}"`,
      `"${r.companyName || ''}"`,
      `"${r.phone}"`,
      `"${r.email}"`,
      `"${r.idDocNumber || ''}"`,
      `"${r.totalBookings}"`,
      `"${r.totalSpent}"`,
      `"${r.currency}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `venue-renters-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التصدير' : language === 'fr' ? 'Exportation réussie' : 'Export Complete',
      message: `${sortedRenters.length} ${language === 'ar' ? 'سجل مستأجر تم تصديره' : 'renters exported successfully'}`,
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (confirm(language === 'ar' ? `هل أنت متأكد من حذف ${count} مستأجر؟` : language === 'fr' ? `Supprimer ${count} locataires sélectionnés ?` : `Delete ${count} selected renters?`)) {
      selectedIds.forEach((id) => deleteRentalRenter(id));
      setSelectedIds(new Set());
      showToast({
        type: 'info',
        title: language === 'ar' ? 'تم الحذف' : language === 'fr' ? 'Suppression' : 'Deleted',
        message: `${count} ${language === 'ar' ? 'مستأجرين تم حذفهم' : 'renters removed'}`,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('venue_renters_page_title')}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('venue_renters_page_sub')}
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
            onClick={handleExportCSV}
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

          {/* New Renter Button */}
          <button
            onClick={handleOpenAdd}
            className="h-10 px-5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('venue_renters_btn_add')}</span>
          </button>
        </div>
      </div>

      {/* Batch Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              {selectedIds.size} {language === 'ar' ? 'مستأجرين محددين' : language === 'fr' ? 'locataires sélectionnés' : 'renters selected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
            {t('venue_renters_kpi_total')}
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {totalRentersCount}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {corporateCount} {t('venue_renters_kpi_corporate')}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
            {t('venue_renters_kpi_corporate')}
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {totalRentersCount > 0 ? Math.round((corporateCount / totalRentersCount) * 100) : 0}%
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {language === 'ar' ? 'الشركات، الوكالات والمؤسسات' : language === 'fr' ? 'Entreprises, agences et institutions' : 'Agencies, production studios & forums'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
            {t('venue_renters_kpi_revenue')}
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalRevenue, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {language === 'ar' ? 'إجمالي المداخيل التراكمية' : language === 'fr' ? 'Chiffre d\'affaires cumulé' : 'Cumulative bookings turnover'}
          </div>
        </div>
      </div>

      {/* Seek Kinetic Search */}
      <Seek
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t('venue_renters_search_ph')}
        shutSize={38}
        openWidth={300}
      />

      {/* Universal Collection (List view & Grid view with 6-button corner-fan) */}
      <UniversalDataCollection<RentalRenter>
        items={sortedRenters}
        keyExtractor={(r) => r.id}
        defaultViewMode="list"
        columns={renterColumns}
        sortBy={renterSortBy}
        sortDirection={renterSortDir}
        onSortChange={(key) => {
          if (renterSortBy === key) {
            setRenterSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setRenterSortBy(key);
            setRenterSortDir('asc');
          }
        }}
        renderCard={(renter) => (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="w-24 h-24 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-[32px] font-bold shadow-md mb-4 select-none border border-[#F5E2D8] dark:border-neutral-700">
              {renter.fullName.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white truncate max-w-[210px] mb-1 tracking-tight">
              {renter.fullName}
            </h3>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mb-3 truncate max-w-[200px]">
              {renter.companyName || (language === 'ar' ? 'مستأجر خاص' : language === 'fr' ? 'Locataire Particulier' : 'Private Renter')}
            </span>
            <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
              <div className="font-mono text-neutral-600 dark:text-neutral-400">{renter.phone}</div>
              <div className="truncate text-neutral-400 text-[11px]">{renter.email}</div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-[11px] text-neutral-400 uppercase font-medium">
                  {renter.totalBookings} {language === 'ar' ? 'حجز' : 'bookings'}
                </span>
                <span className="font-bold text-[#C4785A] tabular-nums">
                  {formatCurrencyAmount(renter.totalSpent, renter.currency)}
                </span>
              </div>
            </div>
          </div>
        )}
        onItemClick={(renter) => handleOpenEdit(renter)}
        onViewDetails={(renter) => handleOpenEdit(renter)}
        onEdit={(renter) => handleOpenEdit(renter)}
        onTogglePin={(renter) => {
          setPinnedRenterIds((prev) => {
            const next = new Set(prev);
            if (next.has(renter.id)) {
              next.delete(renter.id);
              showToast({
                type: 'info',
                title: 'Unpinned',
                message: `${renter.fullName} unpinned`,
              });
            } else {
              next.add(renter.id);
              showToast({
                type: 'info',
                title: 'Pinned',
                message: `${renter.fullName} pinned to top`,
              });
            }
            return next;
          });
        }}
        onDelete={(renter) => {
          if (confirm(`${t('venue_renters_btn_delete')} ${renter.fullName}?`)) {
            deleteRentalRenter(renter.id);
          }
        }}
        customActions={(renter) => [
          {
            id: 'book',
            tooltip: t('venue_renters_btn_quick_book'),
            icon: <Calendar size={13} />,
            iconColor: '#C4785A',
            onClick: (e) => {
              e.stopPropagation();
              setBookingRenterId(renter.id);
              setIsBookingModalOpen(true);
            },
          },
        ]}
        isPinned={(renter) => pinnedRenterIds.has(renter.id)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyTitle={t('venue_renters_no_renters')}
        emptyDescription={t('venue_renters_no_renters_desc')}
        primaryActionLabel={t('venue_renters_btn_add')}
        onAddFirstItem={handleOpenAdd}
      />

      {/* Add / Edit Renter Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {renterToEdit ? t('venue_renters_modal_edit_title') : t('venue_renters_modal_add_title')}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRenter} className="space-y-3.5 text-xs">
              <LabelInput
                id="renter-fullname"
                label={t('venue_renters_field_fullname')}
                placeholder="e.g. Amina Kaci"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <LabelInput
                id="renter-company"
                label={t('venue_renters_field_company')}
                placeholder="e.g. Kaci Events & Communications"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  id="renter-phone"
                  label={t('venue_renters_field_phone')}
                  type="tel"
                  placeholder="+213 552 11 22 33"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <LabelInput
                  id="renter-email"
                  label={t('venue_renters_field_email')}
                  type="email"
                  placeholder="contact@events.dz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <LabelInput
                id="renter-id-doc"
                label={t('venue_renters_field_id_doc')}
                placeholder="e.g. ID-DZ-9912048"
                value={idDocNumber}
                onChange={(e) => setIdDocNumber(e.target.value)}
              />

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('venue_renters_field_notes')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Special catering needs, preferred spaces, billing preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end rtl:justify-start gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-xl cursor-pointer"
                >
                  {t('venue_renters_save_btn')}
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
      />
    </div>
  );
};

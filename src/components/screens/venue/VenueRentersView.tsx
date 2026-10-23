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
    showToast,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [renterToEdit, setRenterToEdit] = useState<RentalRenter | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedRenterIds, setPinnedRenterIds] = useState<Set<string>>(new Set());
  const [renterSortBy, setRenterSortBy] = useState<string>('renter');
  const [renterSortDir, setRenterSortDir] = useState<'asc' | 'desc'>('asc');

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t('venue_renters_page_title')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('venue_renters_page_sub')}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          {t('venue_renters_btn_add')}
        </button>
      </div>

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

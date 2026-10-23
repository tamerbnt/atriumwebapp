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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentalRenter } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { ActionNode } from '../../ui/ActionNode';
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

      {/* Renter Cards Grid with ActionNode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRenters.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-200 dark:border-neutral-800">
            <Users size={36} className="mx-auto text-neutral-400 mb-2" />
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {t('venue_renters_no_renters')}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {t('venue_renters_no_renters_desc')}
            </p>
          </div>
        ) : (
          filteredRenters.map((renter) => (
            <ActionNode
              key={renter.id}
              title={renter.fullName}
              description={renter.companyName || (renter.idDocNumber ? `ID: ${renter.idDocNumber}` : (language === 'ar' ? 'مستأجر خاص' : language === 'fr' ? 'Locataire Particulier' : 'Private Renter'))}
              tag={t('venue_renters_card_bookings_count', language, { count: renter.totalBookings })}
              width="100%"
              air={14}
              corner={20}
              icon={
                <div className="w-full h-full rounded-[inherit] bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-800 dark:text-neutral-200 text-xs">
                  {renter.fullName.charAt(0)}
                </div>
              }
              avatars={[
                {
                  id: renter.id,
                  name: renter.fullName,
                },
              ]}
              actions={[
                {
                  id: 'book',
                  label: t('venue_renters_btn_quick_book'),
                  icon: <Calendar size={13} />,
                  onClick: () => {
                    setBookingRenterId(renter.id);
                    setIsBookingModalOpen(true);
                  },
                  color: '#C4785A',
                },
                {
                  id: 'edit',
                  label: t('venue_renters_btn_edit'),
                  icon: <Edit2 size={13} />,
                  onClick: () => handleOpenEdit(renter),
                },
                {
                  id: 'delete',
                  label: t('venue_renters_btn_delete'),
                  icon: <Trash2 size={13} />,
                  onClick: () => {
                    if (confirm(`${t('venue_renters_btn_delete')} ${renter.fullName}?`)) {
                      deleteRentalRenter(renter.id);
                    }
                  },
                  color: '#EF4444',
                },
              ]}
            >
              <div className="space-y-1 my-2 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-neutral-400" />
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">{renter.phone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail size={13} className="text-neutral-400 shrink-0" />
                  <span className="truncate">{renter.email}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                <span className="text-neutral-400 text-[10px] uppercase">{t('common_total')}</span>
                <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                  {t('venue_renters_card_spent', language, { amount: formatCurrencyAmount(renter.totalSpent, renter.currency) })}
                </span>
              </div>
            </ActionNode>
          ))
        )}
      </div>

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

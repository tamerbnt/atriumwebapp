import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RentalRenter } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const VenueRentersView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    rentalRenters,
    rentalBookings,
    createRentalRenter,
    updateRentalRenter,
    deleteRentalRenter,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [renterToEdit, setRenterToEdit] = useState<RentalRenter | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedRenterIds, setPinnedRenterIds] = useState<Set<string>>(() => new Set<string>());
  const [renterSortBy, setRenterSortBy] = useState<string>('renter');
  const [renterSortDir, setRenterSortDir] = useState<'asc' | 'desc'>('asc');

  const [selectedRenter, setSelectedRenter] = useState<RentalRenter | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [renterNotes, setRenterNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingRenterId, setBookingRenterId] = useState<string | undefined>(undefined);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idDocNumber, setIdDocNumber] = useState('');
  const [notes, setNotes] = useState('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    rentalRenters.forEach((r) => {
      const bName = resolveRecordBranch(r, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [rentalRenters, branchesById, currentBranch, language]);

  const activeRenter = useMemo(() => {
    if (!selectedRenter) return null;
    return rentalRenters.find((r) => r.id === selectedRenter.id) || null;
  }, [selectedRenter, rentalRenters]);

  useEffect(() => {
    if (activeRenter) {
      setRenterNotes(activeRenter.notes || '');
    }
  }, [activeRenter?.id]);

  const handleNotesChange = (val: string) => {
    setRenterNotes(val);
    if (!activeRenter) return;
    setIsSavingNotes(true);
    updateRentalRenter(activeRenter.id, { notes: val });
    setTimeout(() => {
      setIsSavingNotes(false);
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 2000);
    }, 400);
  };

  const filteredRenters = useMemo(() => {
    return rentalRenters.filter((r) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(r, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (filterType === 'Corporate' && !r.companyName) return false;
      if (filterType === 'Individual' && r.companyName) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.fullName.toLowerCase().includes(q) ||
          (r.companyName && r.companyName.toLowerCase().includes(q)) ||
          r.phone.includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.idDocNumber && r.idDocNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [rentalRenters, branchFilter, filterType, searchQuery, branchesById, currentBranch, language]);

  const sortedRenters = useMemo(() => {
    return [...filteredRenters].sort((a, b) => {
      const aPinned = pinnedRenterIds.has(a.id);
      const bPinned = pinnedRenterIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (renterSortBy === 'renter') {
        const cmp = a.fullName.localeCompare(b.fullName);
        return renterSortDir === 'asc' ? cmp : -cmp;
      }
      if (renterSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return renterSortDir === 'asc' ? cmp : -cmp;
      }
      if (renterSortBy === 'bookings') {
        return renterSortDir === 'asc'
          ? a.totalBookings - b.totalBookings
          : b.totalBookings - a.totalBookings;
      }
      if (renterSortBy === 'spent') {
        return renterSortDir === 'asc' ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent;
      }
      return 0;
    });
  }, [
    filteredRenters,
    pinnedRenterIds,
    renterSortBy,
    renterSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const totalRentersCount = rentalRenters.length;
  const corporateCount = rentalRenters.filter((r) => Boolean(r.companyName)).length;
  const individualCount = totalRentersCount - corporateCount;
  const totalRevenue = rentalRenters.reduce((sum, r) => sum + r.totalSpent, 0);

  const handleOpenAdd = useCallback(() => {
    setRenterToEdit(null);
    setFullName('');
    setCompanyName('');
    setEmail('');
    setPhone('+213 ');
    setIdDocNumber('');
    setNotes('');
    setIsAddModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((renter: RentalRenter) => {
    setRenterToEdit(renter);
    setFullName(renter.fullName);
    setCompanyName(renter.companyName || '');
    setEmail(renter.email);
    setPhone(renter.phone);
    setIdDocNumber(renter.idDocNumber || '');
    setNotes(renter.notes || '');
    setIsAddModalOpen(true);
  }, []);

  const handleSaveRenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast({
        type: 'warning',
        title: isFr ? 'Nom manquant' : 'Missing Full Name',
        message: isFr
          ? 'Veuillez saisir le nom du locataire.'
          : 'Please enter the renter full name or organizer contact.',
      });
      return;
    }
    if (!phone.trim()) {
      showToast({
        type: 'warning',
        title: isFr ? 'Téléphone manquant' : 'Missing Telephone',
        message: isFr
          ? 'Veuillez saisir un numéro de téléphone.'
          : 'Please enter a telephone number for booking confirmations.',
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

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('All');
    setBranchFilter('All');
  }, []);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (filterType !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterType !== 'All') {
      chips.push({
        key: 'type',
        label: `${isAr ? 'الفئة' : isFr ? 'Catégorie' : 'Category'}: ${filterType}`,
        onRemove: () => setFilterType('All'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [filterType, branchFilter, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع / المرفق' : isFr ? 'Branche / Complexe' : 'Branch / Facility',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
            count: rentalRenters.length,
          },
          ...Array.from(branchCounts.entries()).map(([bName, count]) => ({
            value: bName,
            label: bName,
            count,
          })),
        ],
      },
      {
        id: 'type',
        label: isAr ? 'نوع المستأجر' : isFr ? 'Type de Locataire' : 'Renter Segment',
        value: filterType,
        onChange: setFilterType,
        kind: 'segmented',
        options: [
          {
            value: 'All',
            label: isAr ? 'الكل' : isFr ? 'Tous' : 'All',
            count: totalRentersCount,
          },
          {
            value: 'Corporate',
            label: isAr ? 'شركات' : isFr ? 'Entreprises' : 'Corporate',
            count: corporateCount,
          },
          {
            value: 'Individual',
            label: isAr ? 'أفراد' : isFr ? 'Particuliers' : 'Private',
            count: individualCount,
          },
        ],
      },
    ],
    [
      isAr,
      isFr,
      branchFilter,
      rentalRenters.length,
      branchCounts,
      filterType,
      totalRentersCount,
      corporateCount,
      individualCount,
    ]
  );

  const handleExportCSV = useCallback(() => {
    const headers = [
      isAr ? 'الاسم الكامل' : isFr ? 'Nom complet' : 'Full Name',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'الشركة / المؤسسة' : isFr ? 'Entreprise' : 'Company',
      isAr ? 'الهاتف' : isFr ? 'Téléphone' : 'Phone',
      isAr ? 'البريد الإلكتروني' : isFr ? 'E-mail' : 'Email',
      isAr ? 'رقم وثيقة الهوية' : isFr ? "N° Pièce Identité" : 'ID Doc Number',
      isAr ? 'عدد الحجوزات' : isFr ? 'Total Réservations' : 'Total Bookings',
      isAr ? 'إجمالي المداخيل' : isFr ? 'Total Dépensé' : 'Total Spent',
      isAr ? 'العملة' : isFr ? 'Devise' : 'Currency',
      isAr ? 'ملاحظات' : isFr ? 'Remarques' : 'Notes',
    ];
    const rows = sortedRenters.map((r) => [
      r.fullName,
      resolveRecordBranch(r, branchesById, currentBranch, language).name,
      r.companyName || '',
      r.phone,
      r.email,
      r.idDocNumber || '',
      r.totalBookings,
      r.totalSpent,
      r.currency || 'DZD',
      r.notes || '',
    ]);
    downloadCsvSafe(
      `atrium-venue-renters-${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : isFr ? 'Export CSV réussi' : 'CSV Exported',
      message: `${sortedRenters.length} ${isFr ? 'locataires exportés.' : 'renters exported.'}`,
      category: 'rental_booking',
    });
  }, [sortedRenters, branchesById, currentBranch, language, isAr, isFr]);

  const renterColumns: ColumnDefinition<RentalRenter>[] = useMemo(
    () => [
      {
        key: 'renter',
        header: isAr
          ? 'المستأجر / المنظم'
          : isFr
          ? 'Locataire / Organisateur'
          : 'Renter / Organizer',
        width: '2.3*',
        minWidth: '210px',
        sortable: true,
        renderCell: (renter) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              {renter.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-black dark:text-white truncate">{renter.fullName}</div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                {renter.companyName ||
                  (renter.idDocNumber
                    ? `ID: ${renter.idDocNumber}`
                    : isAr
                    ? 'مستأجر خاص'
                    : isFr
                    ? 'Locataire Particulier'
                    : 'Private Renter')}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '125px',
        sortable: true,
        renderCell: (renter) => {
          const bInfo = resolveRecordBranch(renter, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'contact',
        header: isAr ? 'بيانات الاتصال' : isFr ? 'Coordonnées' : 'Contact',
        width: '2*',
        minWidth: '180px',
        renderCell: (renter) => (
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1.5 text-black/70 dark:text-white/75 font-mono text-[11px]">
              <Phone size={12} className="text-black/55 dark:text-white/55 shrink-0" />
              <span>{renter.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-black/55 dark:text-white/75 truncate text-[11px]">
              <Mail size={12} className="text-black/55 dark:text-white/55 shrink-0" />
              <span className="truncate">{renter.email}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'bookings',
        header: isAr ? 'الحجوزات' : isFr ? 'Réservations' : 'Bookings',
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (renter) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 tabular-nums">
            {renter.totalBookings} {isAr ? 'حجز' : isFr ? 'réservations' : 'bookings'}
          </span>
        ),
      },
      {
        key: 'spent',
        header: t('venue_renters_kpi_revenue'),
        width: '1.4*',
        minWidth: '130px',
        sortable: true,
        renderCell: (renter) => (
          <span className="font-bold text-black dark:text-white tabular-nums font-mono">
            {formatCurrencyAmount(renter.totalSpent, renter.currency)}
          </span>
        ),
      },
    ],
    [isAr, isFr, t, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: rentalRenters.length > 0,
  });

  if (showSkeleton && (rentalRenters.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.3*', minWidth: '200px' },
          { width: '1.8*', minWidth: '150px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ScreenHeaderBar
        icon={<Users size={22} />}
        title={t('venue_renters_page_title')}
        subtitle={
          isAr
            ? 'دليل المنظمين والشركات والجهات المستأجرة'
            : isFr
            ? 'Répertoire des organisateurs, entreprises & particuliers'
            : 'Directory of organizers, corporate clients & private renters'
        }
        primaryAction={{
          label: t('venue_renters_btn_add'),
          onClick: handleOpenAdd,
          icon: <Plus size={15} strokeWidth={2.5} />,
          dataAction: 'new-venue-renter',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'دليل المستأجرين & مؤشرات النشاط'
            : isFr
            ? 'Dossiers Locataires & Indicateurs'
            : 'Renters Directory & Portfolio Health'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'إجمالي المستأجرين' : isFr ? 'Base Totale Locataires' : 'Total Renters',
          badgeText: isAr ? 'أفراد نشطون' : isFr ? 'Particuliers' : 'Private Active',
          count: totalRentersCount,
          tone: 'emerald',
          isActive: filterType === 'Individual',
          onToggle: () =>
            setFilterType((prev) => (prev === 'Individual' ? 'All' : 'Individual')),
        }}
        secondaryCard={{
          label: t('venue_renters_kpi_corporate'),
          badgeText: isAr ? 'شركات وهيئات' : isFr ? 'entreprises' : 'corporate',
          count: corporateCount,
          tone: 'terracotta',
          isActive: filterType === 'Corporate',
          onToggle: () =>
            setFilterType((prev) => (prev === 'Corporate' ? 'All' : 'Corporate')),
        }}
        darkCard={{
          label: t('venue_renters_kpi_revenue'),
          badgeCount: corporateCount,
          badgePrefix: '',
          badgeSuffix: isAr ? 'شركات' : isFr ? 'comptes pro' : 'corporate',
          valueCount: totalRevenue,
          valuePrefix: '',
          formatValue: (v) => formatCurrencyAmount(v, 'DZD'),
          caption: isAr
            ? 'حجم التعاقدات التراكمي'
            : isFr
            ? 'Masse locative cumulée'
            : 'Cumulative Bookings Turnover',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr ? 'دليل المستأجرين' : isFr ? 'Dossiers Locataires' : 'Venue Renters'
          }
          liveRegionText={`${sortedRenters.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('venue_renters_search_ph')}
          statusOptions={[
            {
              value: 'All',
              label: isAr ? 'الكل' : isFr ? 'Tous' : 'All',
              count: totalRentersCount,
            },
            {
              value: 'Corporate',
              label: isAr ? 'شركات' : isFr ? 'Entreprises' : 'Corporate',
              count: corporateCount,
            },
            {
              value: 'Individual',
              label: isAr ? 'أفراد' : isFr ? 'Particuliers' : 'Private',
              count: individualCount,
            },
          ]}
          statusValue={filterType}
          onStatusChange={setFilterType}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={(m: 'list' | 'grid' | 'calendar') => {
            if (m === 'list' || m === 'grid') setViewMode(m);
          }}
          showViewToggle
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection
          hideToolbar
          data={sortedRenters}
          keyExtractor={(r) => r.id}
          viewMode={viewMode}
          columns={renterColumns}
          sortBy={renterSortBy}
          sortDirection={renterSortDir}
          onSortChange={(key, dir) => {
            setRenterSortBy(key);
            setRenterSortDir(dir);
          }}
          openItemId={activeRenter?.id || null}
          onItemClick={(r, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedRenter(r);
          }}
          onViewDetails={(r, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedRenter(r);
          }}
          onEdit={handleOpenEdit}
          isPinned={(r) => pinnedRenterIds.has(r.id)}
          onPinToggle={(r) => {
            setPinnedRenterIds((prev) => {
              const next = new Set(prev);
              if (next.has(r.id)) next.delete(r.id);
              else next.add(r.id);
              return next;
            });
          }}
          onDelete={(r) => {
            deleteRentalRenter(r.id);
            if (selectedRenter?.id === r.id) setSelectedRenter(null);
            showToast({
              type: 'info',
              title: isFr ? 'Locataire supprimé' : 'Renter Deleted',
              message: r.fullName,
            });
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteRentalRenter(id));
            setSelectedIds(new Set<string>());
            showToast({
              type: 'info',
              title: isFr ? 'Locataires supprimés' : 'Renters Deleted',
              message: `${ids.size} ${isFr ? 'locataires supprimés.' : 'renters deleted.'}`,
            });
          }}
          customActions={(r) => [
            {
              id: 'book',
              label: isAr ? 'حجز قاعة' : isFr ? 'Réserver' : 'Book',
              icon: <Calendar size={13} />,
              variant: 'primary',
              onClick: () => {
                setBookingRenterId(r.id);
                setIsBookingModalOpen(true);
              },
            },
          ]}
          renderCard={(renter) => (
            <div className="flex flex-col items-center justify-center w-full">
              <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                {renter.fullName.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-base font-bold text-black dark:text-white truncate max-w-[210px] mb-0.5 tracking-tight">
                {renter.fullName}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 mb-3 truncate max-w-[200px]">
                {renter.companyName ||
                  (isAr ? 'مستأجر خاص' : isFr ? 'Locataire Particulier' : 'Private Renter')}
              </span>
              <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                <div className="font-mono text-black/70 dark:text-white/75 text-[11px]">
                  {renter.phone}
                </div>
                <div className="truncate text-black/55 dark:text-white/55 text-[11px]">
                  {renter.email}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] text-black/55 dark:text-white/55 uppercase font-medium">
                    {renter.totalBookings} {isAr ? 'حجز' : 'bookings'}
                  </span>
                  <span className="font-bold text-[#d4522f] tabular-nums font-mono">
                    {formatCurrencyAmount(renter.totalSpent, renter.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
          emptyTitle={isAr ? 'لا يوجد مستأجرون' : isFr ? 'Aucun locataire trouvé' : 'No renters found'}
          primaryActionLabel={t('venue_renters_btn_add')}
          onAddFirstItem={handleOpenAdd}
          hasActiveFilters={activeFiltersCount > 0 || searchQuery.trim().length > 0}
          onResetFilters={handleResetFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedRenters.length}
        entityPluralLabel={isAr ? 'مستأجرين' : isFr ? 'locataires' : 'renters'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeRenter)}
        item={activeRenter}
        allItems={sortedRenters}
        keyExtractor={(r) => r.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeRenter?.fullName || ''}
        subtitle={
          activeRenter?.companyName ||
          (isAr ? 'مستأجر خاص' : isFr ? 'Particulier' : 'Private Renter')
        }
        avatarText={(activeRenter?.fullName || 'R').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeRenter
            ? resolveRecordBranch(activeRenter, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeRenter?.companyName
            ? isFr
              ? 'Entreprise'
              : 'Corporate'
            : isFr
            ? 'Particulier'
            : 'Private'
        }
        tabs={[
          { id: 'dossier', label: isFr ? 'Dossier' : 'Profile' },
          { id: 'bookings', label: isFr ? 'Réservations' : 'Bookings' },
          { id: 'finances', label: 'Finances' },
          { id: 'notes', label: 'Notes' },
        ]}
        onSelectItem={(r) => setSelectedRenter(r)}
        onClose={() => setSelectedRenter(null)}
        onDelete={(r) => deleteRentalRenter(r.id)}
        holdToDelete
        renderBody={(renter, tab) => {
          const renterBookings = rentalBookings.filter((b) => b.renterId === renter.id);
          return (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap gap-2">
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<Calendar size={13} />}
                  onClick={() => {
                    setBookingRenterId(renter.id);
                    setIsBookingModalOpen(true);
                  }}
                >
                  {isAr ? 'حجز قاعة' : isFr ? 'Réserver' : 'Book'}
                </AtriumButton>
                <AtriumButton
                  variant="secondary"
                  size="sm"
                  icon={<Edit2 size={13} />}
                  onClick={() => handleOpenEdit(renter)}
                >
                  {isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit'}
                </AtriumButton>
              </div>

              {tab === 'dossier' && (
                <div className="p-4 bg-[#F3EDE7]/60 dark:bg-neutral-800/50 rounded-2xl space-y-2.5 border border-[#E6DED6] dark:border-neutral-800">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55 font-medium">Téléphone :</span>
                    <a
                      href={`tel:${renter.phone}`}
                      className="font-mono font-semibold text-black dark:text-white hover:underline"
                    >
                      {renter.phone}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55 font-medium">E-mail :</span>
                    <a
                      href={`mailto:${renter.email}`}
                      className="text-black dark:text-white truncate max-w-[200px] hover:underline"
                    >
                      {renter.email}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55 font-medium">
                      Organisme / Entité :
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      {renter.companyName || 'Particulier'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55 font-medium">
                      N° Pièce / NIF :
                    </span>
                    <span className="font-mono text-black/70 dark:text-white/75">
                      {renter.idDocNumber || 'Non renseigné'}
                    </span>
                  </div>
                </div>
              )}

              {tab === 'bookings' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55 font-medium">
                      Historique & Prévues
                    </span>
                    <span className="font-bold text-[#d4522f]">
                      {renterBookings.length} réservations
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {renterBookings.length === 0 ? (
                      <div className="p-4 text-center text-black/55 dark:text-white/55 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                        Aucune réservation active pour le moment.
                      </div>
                    ) : (
                      renterBookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-black dark:text-white truncate max-w-[190px]">
                              {b.purpose || 'Séance de réservation'}
                            </span>
                            <span className="font-mono text-[#d4522f]">
                              {formatCurrencyAmount(b.totalAmount, b.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
                            <span>{new Date(b.startDateTime).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab === 'finances' && (
                <div className="p-4 bg-[#F3EDE7]/60 dark:bg-neutral-800/50 rounded-2xl space-y-3 border border-[#E6DED6] dark:border-neutral-800">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      Chiffre d'affaires cumulé :
                    </span>
                    <span className="font-mono font-bold text-base text-black dark:text-white">
                      {formatCurrencyAmount(renter.totalSpent, renter.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      Volume total de contrats :
                    </span>
                    <span className="font-bold text-black dark:text-white">
                      {renter.totalBookings} créneaux
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Panier moyen :</span>
                    <span className="font-mono font-semibold text-black dark:text-white">
                      {renter.totalBookings > 0
                        ? formatCurrencyAmount(
                            Math.round(renter.totalSpent / renter.totalBookings),
                            renter.currency
                          )
                        : '--'}
                    </span>
                  </div>
                </div>
              )}

              {tab === 'notes' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-black/55 dark:text-white/55 font-medium">
                      Consignes & Exigences :
                    </label>
                    {isSavingNotes ? (
                      <span className="text-[10px] text-black/55 dark:text-white/55 animate-pulse">
                        Sauvegarde...
                      </span>
                    ) : notesSavedNotice ? (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={11} /> Sauvegardé
                      </span>
                    ) : null}
                  </div>
                  <textarea
                    rows={6}
                    value={renterNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Exigences techniques, sonorisation, badges sécurité, consignes traiteur..."
                    className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
                  />
                </div>
              )}
            </div>
          );
        }}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-black dark:text-white">
                  {renterToEdit ? t('venue_renters_btn_edit') : t('venue_renters_btn_add')}
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55 mt-0.5">
                  {isAr
                    ? 'تسجيل بيانات المنظم، وثائق الهوية والشركة'
                    : isFr
                    ? "Enregistrer les coordonnées et documents de l'organisateur"
                    : 'Save organizer contact, ID document, and corporate details'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSaveRenter} className="p-6 space-y-4">
              <LabelInput
                label={isAr ? 'الاسم الكامل *' : isFr ? 'Nom Complet *' : 'Full Name *'}
                placeholder="e.g. Tarek Benaissa"
                value={fullName}
                onChange={(v) => setFullName(extractStr(v))}
                required
              />
              <LabelInput
                label={
                  isAr
                    ? 'اسم المؤسسة / الشركة المنظمة'
                    : isFr
                    ? "Nom de l'Entreprise / Organisation"
                    : 'Company or Organization Name'
                }
                placeholder="e.g. SARL Event Horizon"
                value={companyName}
                onChange={(v) => setCompanyName(extractStr(v))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput
                  label={
                    isAr ? 'رقم الهاتف *' : isFr ? 'Numéro de Téléphone *' : 'Telephone *'
                  }
                  placeholder="+213 550 12 34 56"
                  value={phone}
                  onChange={(v) => setPhone(extractStr(v))}
                  required
                />
                <LabelInput
                  label={
                    isAr ? 'البريد الإلكتروني' : isFr ? 'Adresse E-mail' : 'Email Address'
                  }
                  type="email"
                  placeholder="contact@organisation.dz"
                  value={email}
                  onChange={(v) => setEmail(extractStr(v))}
                />
              </div>
              <LabelInput
                label={
                  isAr
                    ? 'رقم بطاقة الهوية / السجل التجاري'
                    : isFr
                    ? "N° Pièce d'Identité / Registre du Commerce"
                    : 'National ID / RC / NIF'
                }
                placeholder="e.g. 16/00-1234567B19"
                value={idDocNumber}
                onChange={(v) => setIdDocNumber(extractStr(v))}
              />
              <div>
                <label className="block text-xs font-semibold text-black/70 dark:text-white/75 mb-1">
                  {isAr
                    ? 'ملاحظات وتفضيلات الحجز'
                    : isFr
                    ? 'Remarques & Préférences'
                    : 'Notes & Preferences'}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'متطلبات تقنية، سجل المدفوعات...'
                      : isFr
                      ? 'Exigences techniques, historique...'
                      : 'Technical needs, catering...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : isFr ? 'Annuler' : 'Cancel'}
                </button>
                <AtriumButton type="submit" variant="primary" icon={<Check size={14} />}>
                  {renterToEdit
                    ? isAr
                      ? 'تحديث البيانات'
                      : isFr
                      ? 'Mettre à jour'
                      : 'Update Renter'
                    : isAr
                    ? 'حفظ المستأجر'
                    : isFr
                    ? 'Enregistrer'
                    : 'Save Renter'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialRenterId={bookingRenterId}
      />
    </div>
  );
};

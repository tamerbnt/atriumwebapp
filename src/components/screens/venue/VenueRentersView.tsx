import React, { useState, useMemo, useRef, useCallback } from 'react';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]';

type DrawerTab = 'dossier' | 'bookings' | 'finances';

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
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('dossier');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

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

        <UniversalDataCollection<RentalRenter>
          hideToolbar
          items={sortedRenters}
          keyExtractor={(r) => r.id}
          viewMode={viewMode}
          defaultViewMode="list"
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
          pinnedIds={pinnedRenterIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedRenterIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
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
          getRowMeta={(renter) => {
            const bInfo = resolveRecordBranch(renter, branchesById, currentBranch, language);
            const segmentLabel = renter.companyName
              ? isAr
                ? 'شركة'
                : isFr
                ? 'Entreprise'
                : 'Corporate'
              : isAr
              ? 'فرد'
              : isFr
              ? 'Particulier'
              : 'Private';
            return {
              title: renter.fullName,
              subline: renter.companyName || renter.phone,
              avatarText: (renter.fullName || 'LO').slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: segmentLabel,
              statusLabel: segmentLabel,
              statusVariant: renter.companyName ? 'info' : 'active',
              metricPrimary: formatCurrencyAmount(renter.totalSpent, renter.currency),
              metricSecondary: `${renter.totalBookings} ${isAr ? 'حجز' : isFr ? 'rés.' : 'bookings'}`,
              branchName: bInfo.name,
              isPinned: pinnedRenterIds.has(renter.id),
              notes: renter.notes,
              detailCol1: { heading: isAr ? 'الهاتف' : 'Téléphone', primaryText: renter.phone },
              detailCol2: { heading: isAr ? 'البريد' : 'E-mail', primaryText: renter.email },
              detailCol3: {
                heading: isAr ? 'الهوية / NIF' : 'Pièce / NIF',
                primaryText: renter.idDocNumber || '--',
              },
            };
          }}
          getFanActions={(r) => [
            {
              id: 'book',
              label: isAr ? 'حجز قاعة' : isFr ? 'Réserver' : 'Book',
              icon: <Calendar size={14} />,
              onClick: () => {
                setBookingRenterId(r.id);
                setIsBookingModalOpen(true);
              },
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
              icon: <Edit2 size={14} />,
              onClick: () => handleOpenEdit(r),
            },
          ]}
          getDetailActions={(r) => [
            {
              id: 'book',
              label: isAr ? 'حجز قاعة' : isFr ? 'Réserver' : 'Book',
              icon: <Calendar size={13} />,
              onClick: () => {
                setBookingRenterId(r.id);
                setIsBookingModalOpen(true);
              },
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
              icon: <Edit2 size={13} />,
              onClick: () => handleOpenEdit(r),
            },
          ]}
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

      <KineticSlideOverInspector<RentalRenter>
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
        avatarText={(activeRenter?.fullName || 'RE').slice(0, 2).toUpperCase()}
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
        statusClassName={activeRenter?.companyName ? STATUS_PILL_INFO : STATUS_PILL_OK}
        tabs={[
          { id: 'dossier', label: isFr ? 'Dossier' : 'Profile' },
          { id: 'bookings', label: isFr ? 'Réservations' : 'Bookings' },
          { id: 'finances', label: 'Finances' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onSelectItem={(r) => setSelectedRenter(r)}
        onClose={() => setSelectedRenter(null)}
        onDelete={(r) => deleteRentalRenter(r.id)}
        holdToDelete
        renderBody={(renter, tab) => {
          const renterBookings = rentalBookings.filter((b) => b.renterId === renter.id);

          if (tab === 'bookings') {
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={`${isAr ? 'الحجوزات' : 'Historique & Prévues'} (${renterBookings.length})`}
                >
                  <InspectorCard>
                    {renterBookings.length === 0 ? (
                      <InspectorListItem
                        title={
                          isAr
                            ? 'لا توجد حجوزات حالياً'
                            : 'Aucune réservation active pour le moment.'
                        }
                        isLast
                      />
                    ) : (
                      renterBookings.map((b, idx) => (
                        <InspectorListItem
                          key={b.id}
                          title={b.purpose || 'Séance de réservation'}
                          subtitle={new Date(b.startDateTime).toLocaleDateString()}
                          metaRight={formatCurrencyAmount(b.totalAmount, b.currency)}
                          badge={{
                            label: b.status,
                            tone: b.status === 'Confirmed' || b.status === 'CheckedIn' ? 'ok' : 'neutral',
                          }}
                          isLast={idx === renterBookings.length - 1}
                        />
                      ))
                    )}
                  </InspectorCard>
                </InspectorSection>

                <InspectorWideButton
                  label={isAr ? 'حجز قاعة جديدة' : isFr ? 'Nouvelle réservation' : 'New Booking'}
                  icon={<Calendar size={14} />}
                  tone="accent"
                  onClick={() => {
                    setBookingRenterId(renter.id);
                    setIsBookingModalOpen(true);
                  }}
                />
              </div>
            );
          }

          if (tab === 'finances') {
            const avgBasket =
              renter.totalBookings > 0 ? Math.round(renter.totalSpent / renter.totalBookings) : 0;
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={isAr ? 'ملخص التعاملات المالية' : 'Performance locative'}
                >
                  <InspectorBigStat
                    value={formatCurrencyAmount(renter.totalSpent, renter.currency)}
                    tone="accent"
                    caption={
                      isAr
                        ? 'إجمالي المداخيل التراكمية'
                        : "Chiffre d'affaires cumulé"
                    }
                  />
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'عدد الحجوزات' : 'Volume de contrats'}
                      value={`${renter.totalBookings} ${isAr ? 'حجوزات' : 'créneaux'}`}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'متوسط الفاتورة' : 'Panier moyen'}
                      value={
                        renter.totalBookings > 0
                          ? formatCurrencyAmount(avgBasket, renter.currency)
                          : '--'
                      }
                      mono
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'book',
                    label: isAr ? 'حجز قاعة' : isFr ? 'Réserver' : 'Book',
                    icon: <Calendar size={15} />,
                    primary: true,
                    onClick: () => {
                      setBookingRenterId(renter.id);
                      setIsBookingModalOpen(true);
                    },
                  },
                  {
                    id: 'edit',
                    label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
                    icon: <Edit2 size={15} />,
                    onClick: () => handleOpenEdit(renter),
                  },
                ]}
              />

              <InspectorSection index={0} title={isAr ? 'بيانات المستأجر' : 'Coordonnées & Dossier'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'الهاتف' : 'Téléphone'}
                    value={renter.phone}
                    mono
                    copyText={renter.phone}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'البريد الإلكتروني' : 'E-mail'}
                    value={renter.email}
                    copyText={renter.email}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'الهيئة / المؤسسة' : 'Organisme / Entité'}
                    value={renter.companyName || (isFr ? 'Particulier' : 'Private')}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'وثيقة الهوية / NIF' : 'N° Pièce / NIF'}
                    value={renter.idDocNumber || (isFr ? 'Non renseigné' : '--')}
                    mono
                    copyText={renter.idDocNumber}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'التعليمات والملاحظات' : 'Consignes & Notes'}>
                <InspectorNotesField
                  value={renter.notes || ''}
                  onSave={(val) => updateRentalRenter(renter.id, { notes: val })}
                  placeholder={
                    isAr
                      ? 'متطلبات تقنية، صوتيات، شارات الدخول...'
                      : 'Exigences techniques, sonorisation, badges sécurité, consignes traiteur...'
                  }
                />
              </InspectorSection>
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

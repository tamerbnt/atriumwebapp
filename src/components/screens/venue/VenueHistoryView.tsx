import React, { useMemo, useState } from 'react';
import { History, Calendar, Eye } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentRentalBookingsFromState,
  selectCurrentSecurityDepositsFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { VerticalHistoryScaffold } from '../../common/history/VerticalHistoryScaffold';
import { ColumnDefinition } from '../../ui/collection';
import {
  InspectorCard,
  InspectorKeyValue,
  InspectorSection,
  KineticRowData,
  buildBranchesByIdMap,
  downloadCsvSafe,
  resolveRecordBranch,
} from '../../ui/kinetic';

interface VenueLedgerItem {
  id: string;
  group: 'bookings' | 'deposits';
  kindLabel: string;
  renterName: string;
  unitName: string;
  amount: number;
  currency: string;
  status: string;
  detailText: string;
  dateStr: string;
  branchId?: string;
}

export const VenueHistoryView: React.FC = React.memo(() => {
  const { rentalBookings, securityDeposits, branches, currentBusinessId, currentBranchId, currentBranch, language, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      securityDeposits: selectCurrentSecurityDepositsFromState(s),
      branches: s.branches,
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync, setScreen } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<VenueLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<VenueLedgerItem[]>(() => {
    const out: VenueLedgerItem[] = [];
    (rentalBookings || []).forEach((b) => {
      out.push({
        id: `bk_${b.id}`,
        group: 'bookings',
        kindLabel: l3('حجز قاعة', 'Réservation', 'Booking'),
        renterName: b.renterName,
        unitName: b.unitName,
        amount: b.totalAmount,
        currency: b.currency || 'DZD',
        status: b.status,
        detailText: `${b.durationHours}h · ${b.purpose || b.unitType}`,
        dateStr: b.startDateTime || b.createdAt,
        branchId: b.branchId,
      });
    });
    (securityDeposits || []).forEach((d) => {
      out.push({
        id: `dep_${d.id}`,
        group: 'deposits',
        kindLabel: l3('ضمان مالي', 'Caution', 'Deposit'),
        renterName: d.renterName,
        unitName: d.unitName,
        amount: d.amount,
        currency: d.currency || 'DZD',
        status: d.status,
        detailText: `${d.paymentMethod}${d.deductionReason ? ` · ${d.deductionReason}` : ''}`,
        dateStr: d.releasedAt || d.collectedAt,
        branchId: d.branchId,
      });
    });
    return out;
  }, [rentalBookings, securityDeposits, isAr, isEn]);

  const stats = useMemo(() => {
    const bookingsCount = allItems.filter((i) => i.group === 'bookings').length;
    const depositsCount = allItems.filter((i) => i.group === 'deposits').length;
    const totalAmount = (rentalBookings || []).reduce((s, b) => s + (b.totalAmount || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      bookingsCount,
      depositsCount,
      totalAmount,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, rentalBookings, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'bookings' && it.group !== 'bookings') return false;
      if (statusFilter === 'deposits' && it.group !== 'deposits') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.renterName} ${it.unitName} ${it.detailText} ${it.kindLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allItems, statusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedItems = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredItems].sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortBy === 'renter') return a.renterName.localeCompare(b.renterName) * sign;
      if (sortBy === 'amount') return (a.amount - b.amount) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<VenueLedgerItem>[]>(
    () => [
      {
        key: 'renter',
        header: l3('المستأجر والقاعة', 'Locataire & Espace', 'Renter & Space'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.renterName}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.unitName} · {it.kindLabel}</span>
          </div>
        ),
      },
      {
        key: 'detail',
        header: l3('التفاصيل', 'Objet / Règlement', 'Details'),
        renderCell: (it) => <span className="t-small text-black/75 dark:text-white/80 truncate block">{it.detailText}</span>,
      },
      {
        key: 'amount',
        header: l3('المبلغ والتاريخ', 'Montant & Date', 'Amount & Date'),
        sortable: true,
        renderCell: (it) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold text-black dark:text-white block">{formatMoney(it.amount, it.currency)}</span>
            <span className="t-cap text-black/60 dark:text-white/60 block">{new Date(it.dateStr).toLocaleDateString()}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: l3('الحالة', 'Statut', 'Status'),
        renderCell: (it) => <span className="t-small font-semibold text-[var(--facility-accent,var(--brand-text))]">{it.status}</span>,
      },
    ],
    [isAr, isEn]
  );

  return (
    <VerticalHistoryScaffold<VenueLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل الحجوزات والضمانات', 'Historique Locations & Cautions', 'Venue & Bookings History')}
      primaryAction={{
        label: l3('الجدول الزمني', 'Planning Salles', 'Timeline'),
        icon: <Calendar size={16} />,
        onClick: () => setScreen('scheduler'),
      }}
      kpiHeading={l3('مؤشرات الكراء والضمانات', 'Audit Réservations & Cautions', 'Bookings & Deposits Audit')}
      primaryCard={{
        label: l3('الحجوزات', 'Réservations', 'Bookings'),
        badgeText: `${stats.bookingsCount} dossiers`,
        count: stats.bookingsCount,
        tone: 'emerald',
        isActive: statusFilter === 'bookings',
        onToggle: () => setStatusFilter((p) => (p === 'bookings' ? 'all' : 'bookings')),
      }}
      secondaryCard={{
        label: l3('الضمانات', 'Cautions & Dépôts', 'Security Deposits'),
        badgeText: `${stats.depositsCount} cautions`,
        count: stats.depositsCount,
        tone: 'terracotta',
        isActive: statusFilter === 'deposits',
        onToggle: () => setStatusFilter((p) => (p === 'deposits' ? 'all' : 'deposits')),
      }}
      darkCard={{
        label: l3('إجمالي إيرادات الحجوزات', 'Volume Réservations', 'Total Bookings Value'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'mouvements', 'entries'),
        valuePrefix: '',
        valueCount: stats.totalAmount,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Espace'} · Venue Ledger`,
      }}
      podTitle={l3('أرشيف الحجوزات والضمانات', 'Registre Réservations & Cautions', 'Bookings & Deposits Ledger')}
      searchPlaceholder={l3('بحث عن مستأجر، قاعة...', 'Rechercher locataire, salle, caution...', 'Search renter, unit, deposit...')}
      vertical="rental_booking"
      businessId={currentBusinessId}
      branchId={currentBranchId}
      language={language}
      isRtl={isAr}
      isSyncing={isSyncing}
      networkMode={networkMode}
      isSyncTimeout={isSyncTimeout}
      lastSyncedAt={lastSyncedAt}
      onRetrySync={retryCloudSync}
      statusOptions={[
        { value: 'all', label: l3('الكل', 'Tous', 'All'), count: stats.totalCount },
        { value: 'bookings', label: l3('الحجوزات', 'Réservations', 'Bookings'), count: stats.bookingsCount },
        { value: 'deposits', label: l3('الضمانات', 'Cautions', 'Deposits'), count: stats.depositsCount },
      ]}
      statusValue={statusFilter}
      onStatusChange={setStatusFilter}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      items={sortedItems}
      totalItemCount={allItems.length}
      keyExtractor={(it) => it.id}
      columns={columns}
      sortBy={sortBy}
      sortDirection={sortDir}
      onSortChange={(k, d) => { setSortBy(k); setSortDir(d); }}
      pinnedIds={pinnedIds}
      onPinToggle={(x) => {
        const id = typeof x === 'string' ? x : x.id;
        setPinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }}
      getRowMeta={(it): Partial<KineticRowData> => ({
        title: it.renterName,
        subline: `${it.unitName} · ${it.kindLabel} · ${new Date(it.dateStr).toLocaleDateString()}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'bookings' ? 'active' : 'warning',
        metricPrimary: formatMoney(it.amount, it.currency),
        metricSecondary: it.detailText,
        detailCol1: { heading: l3('المستأجر', 'Locataire', 'Renter'), primaryText: it.renterName, secondaryText: it.unitName },
        detailCol2: { heading: l3('التفاصيل', 'Détails', 'Details'), primaryText: it.kindLabel, secondaryText: it.detailText },
        detailCol3: { heading: l3('المبلغ', 'Montant', 'Amount'), primaryText: formatMoney(it.amount, it.currency), secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('الفرع', 'Branche', 'Branch'),
              value: branchFilter,
              onChange: setBranchFilter,
              kind: 'tiles',
              columns: 2,
              options: [{ value: 'All', label: l3('كل الفروع', 'Toutes', 'All Branches'), count: allItems.length }, ...stats.branchOptions],
            }]
          : []
      }
      activeChips={branchFilter !== 'All' ? [{ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') }] : []}
      hasActiveAdvancedFilters={branchFilter !== 'All'}
      activeFiltersCount={branchFilter !== 'All' ? 1 : 0}
      onResetFilters={() => {
        setStatusFilter('all');
        setBranchFilter('All');
        setSearchQuery('');
      }}
      onExportCsv={() =>
        downloadCsvSafe(
          `atrium-venue-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Renter', 'Unit', 'Details', 'Amount', 'Currency', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.renterName, i.unitName, i.detailText, i.amount, i.currency, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('حجوزات', 'réservations', 'records')}
      emptyTitle={l3('لا توجد حجوزات أو ضمانات', 'Aucune location enregistrée', 'No venue history yet')}
      emptyDescription={l3('ستظهر حجوزات القاعات والضمانات المالية هنا', 'Les réservations et dépôts de caution apparaîtront ici.', 'Bookings and security deposits appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.renterName,
        subtitle: (it) => `${it.unitName} · ${it.kindLabel}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('ملخص السجل', 'Détails location', 'Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('القاعة / الوحدة', 'Unité / Salle', 'Unit')} value={it.unitName} />
              <InspectorKeyValue label={l3('المستأجر', 'Locataire', 'Renter')} value={it.renterName} />
              <InspectorKeyValue label={l3('التفاصيل', 'Détails', 'Details')} value={it.detailText} />
              <InspectorKeyValue label={l3('المبلغ', 'Montant', 'Amount')} value={formatMoney(it.amount, it.currency)} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});

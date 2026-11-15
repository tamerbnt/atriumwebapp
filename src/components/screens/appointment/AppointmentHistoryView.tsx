import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Printer,
  History,
  Building2,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentAppointmentsFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { Appointment } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { formatMoney } from '../../../utils/rules';
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

export const AppointmentHistoryView: React.FC = React.memo(() => {
  const {
    appointments,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      appointments: selectCurrentAppointmentsFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );

  const { deleteAppointment, batchDeleteAppointments, retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Active'>('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(() => new Set());
  const [pinnedHistoryIds, setPinnedHistoryIds] = useState<Set<string>>(() => new Set());
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [receiptAppointment, setReceiptAppointment] = useState<Appointment | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const historyStats = useMemo(() => {
    const list = appointments;
    const completedCount = list.filter((a) => a.status === 'Completed').length;
    const activeCount = list.length - completedCount;
    const totalRevenue = list
      .filter((a) => a.status === 'Completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);
    const formulasCount = list.filter((a) => a.colorFormula && a.colorFormula.trim().length > 0).length;
    const branchCounts = new Map<string, number>();
    list.forEach((a) => {
      const bName = resolveRecordBranch(a, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: list.length,
      completedCount,
      activeCount,
      totalRevenue,
      formulasCount,
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [appointments, branchesById, currentBranch, language]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter === 'Completed' && a.status !== 'Completed') return false;
      if (statusFilter === 'Active' && a.status === 'Completed') return false;
      if (selectedMethodFilter !== 'All' && a.paymentMethod !== selectedMethodFilter) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(a, branchesById, currentBranch, language).name.toLowerCase();
        return (
          a.clientName.toLowerCase().includes(q) ||
          a.serviceName.toLowerCase().includes(q) ||
          a.staffName.toLowerCase().includes(q) ||
          (a.colorFormula || '').toLowerCase().includes(q) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [appointments, statusFilter, selectedMethodFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedAppointments = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredAppointments].sort((a, b) => {
      const aPinned = pinnedHistoryIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedHistoryIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'clientName') return a.clientName.localeCompare(b.clientName) * sign;
      if (sortBy === 'serviceName') return a.serviceName.localeCompare(b.serviceName) * sign;
      if (sortBy === 'price') return (a.price - b.price) * sign;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`) * sign;
    });
  }, [filteredAppointments, pinnedHistoryIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleResetFilters = useCallback(() => {
    setSelectedMethodFilter('All');
    setStatusFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = selectedMethodFilter !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (selectedMethodFilter !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Date',
      'Heure',
      'Client',
      'Prestation',
      'Styliste',
      'Tarif (DZD)',
      'Statut',
      'Paiement',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedAppointments.map((a) => [
      a.date,
      a.startTime,
      a.clientName,
      a.serviceName,
      a.staffName,
      a.price,
      a.status,
      a.paymentMethod || 'Espèces',
      resolveRecordBranch(a, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`atrium-salon-history-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [sortedAppointments, isAr, isEn, branchesById, currentBranch, language]);

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: historyStats.totalCount },
      { value: 'Completed', label: isAr ? 'مكتمل' : isEn ? 'Completed' : 'Terminés', count: historyStats.completedCount },
      { value: 'Active', label: isAr ? 'قيد التنفيذ' : isEn ? 'In Progress' : 'En cours', count: historyStats.activeCount },
    ],
    [isAr, isEn, historyStats.totalCount, historyStats.completedCount, historyStats.activeCount]
  );

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches',
            count: historyStats.totalCount,
          },
          ...historyStats.branchOptionsWithCounts,
        ],
      },
      {
        id: 'method',
        label: isAr ? 'طريقة الدفع' : isEn ? 'Payment Method' : 'Mode de règlement',
        value: selectedMethodFilter,
        onChange: setSelectedMethodFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'Cash', label: 'Espèces' },
          { value: 'BaridiMob', label: 'BaridiMob' },
          { value: 'Dahabia_CIB', label: 'CIB / Dahabia' },
          { value: 'Card', label: 'Carte' },
        ],
      },
    ],
    [isAr, isEn, branchFilter, historyStats.totalCount, historyStats.branchOptionsWithCounts, selectedMethodFilter]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (selectedMethodFilter !== 'All') {
      chips.push({ key: 'method', label: selectedMethodFilter, onRemove: () => setSelectedMethodFilter('All') });
    }
    return chips;
  }, [branchFilter, selectedMethodFilter]);

  const columns: ColumnDefinition<Appointment>[] = useMemo(
    () => [
      {
        key: 'clientName',
        header: isAr ? 'الزبون والموعد' : isEn ? 'Client & Slot' : 'Client & Créneau',
        sortable: true,
        renderCell: (apt) => (
          <div className="min-w-0">
            <span className="text-[13.5px] font-semibold text-black dark:text-white truncate block">
              {apt.clientName}
            </span>
            <span className="text-[11px] font-mono text-[#d4522f] font-semibold block">
              {apt.date} · {apt.startTime} ({apt.durationMinutes}m)
            </span>
          </div>
        ),
      },
      {
        key: 'serviceName',
        header: isAr ? 'الخدمة والمصففة' : isEn ? 'Service & Stylist' : 'Prestation & Styliste',
        sortable: true,
        renderCell: (apt) => (
          <div className="min-w-0">
            <span className="text-[12.5px] font-semibold text-black dark:text-white truncate block">
              {apt.serviceName}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65 truncate block">
              {apt.staffName}
              {apt.colorFormula ? ` · 🧪 ${apt.colorFormula}` : ''}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        sortable: true,
        renderCell: (apt) => {
          const isCompleted = apt.status === 'Completed';
          const isInChair = apt.status === 'InChair';
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : isInChair
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCompleted ? 'bg-emerald-500' : isInChair ? 'bg-amber-500' : 'bg-blue-500'
                }`}
              />
              {isCompleted ? 'Terminé' : isInChair ? 'En Fauteuil' : 'Confirmé'}
            </span>
          );
        },
      },
      {
        key: 'price',
        header: isAr ? 'التعريفة' : isEn ? 'Amount' : 'Tarif & Règlement',
        sortable: true,
        renderCell: (apt) => (
          <div className="tabular-nums">
            <span className="font-mono text-[13px] font-bold text-black dark:text-white block">
              {formatMoney(apt.price)}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65 block">
              {apt.paymentMethod || 'Non payé'}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        sortable: true,
        renderCell: (apt) => (
          <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(apt, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: appointments.length > 0,
  });

  if (showSkeleton && (appointments.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.4*', minWidth: '180px' },
          { width: '1.8*', minWidth: '150px' },
          { width: '1.3*', minWidth: '110px' },
          { width: '1.3*', minWidth: '110px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 relative">
      <ScreenHeaderBar
        icon={<History size={22} />}
        title={isAr ? 'السجل' : isEn ? 'History' : 'Historique'}
        primaryAction={{
          label: isAr ? 'طباعة السجل' : isEn ? 'Print Ledger' : 'Imprimer Journal',
          icon: <Printer size={15} />,
          onClick: () => window.print(),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'سجل التدقيق والأداء' : isEn ? 'Audit & History Ledger' : 'Registre d’Audit & Prestations'}
        language={language}
        primaryCard={{
          label: isAr ? 'الخدمات المكتملة' : isEn ? 'Completed Services' : 'Soins Clôturés',
          badgeText: `↗ ${historyStats.totalCount} total`,
          count: historyStats.completedCount,
          tone: 'emerald',
          isActive: statusFilter === 'Completed',
          onToggle: () => setStatusFilter((p) => (p === 'Completed' ? 'All' : 'Completed')),
        }}
        secondaryCard={{
          label: isAr ? 'قيد الإنجاز / المؤكدة' : isEn ? 'In Progress & Confirmed' : 'En Cours & Confirmés',
          badgeText: `${historyStats.formulasCount} formules`,
          count: historyStats.activeCount,
          tone: 'terracotta',
          isActive: statusFilter === 'Active',
          onToggle: () => setStatusFilter((p) => (p === 'Active' ? 'All' : 'Active')),
        }}
        darkCard={{
          label: isAr ? 'إجمالي الإيرادات المحققة' : isEn ? 'Realized Revenue' : 'Recette Réalisée',
          badgePrefix: '',
          badgeCount: historyStats.completedCount,
          badgeSuffix: isAr ? 'وصولات' : 'reçus',
          valuePrefix: '',
          valueCount: historyStats.totalRevenue,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Salon'} · ${isAr ? 'وصولات 80mm' : 'Tickets 80mm Certifiés'}`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'السجل الزمني للخدمات' : isEn ? 'Service Timeline Ledger' : 'Registre Chronologique'}
          liveRegionText={`${sortedAppointments.length} rendez-vous`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث بالزبون، الخدمة أو الفرع...'
              : isEn
              ? 'Search client, formula, branch...'
              : 'Rechercher client, formule, branche...'
          }
          statusOptions={statusOptions}
          statusValue={statusFilter}
          onStatusChange={(v) => setStatusFilter(v as any)}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<Appointment>
          data={sortedAppointments}
          columns={columns}
          keyExtractor={(a) => a.id}
          viewMode={viewMode}
          hideToolbar
          openItemId={receiptAppointment?.id ?? null}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          selectedIds={selectedHistoryIds}
          onSelectionChange={setSelectedHistoryIds}
          pinnedIds={pinnedHistoryIds}
          onPinToggle={(a: any) => {
            const id = typeof a === 'string' ? a : a.id;
            setPinnedHistoryIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(apt, opener) => {
            setDrawerOpenerEl(opener || null);
            setReceiptAppointment(apt);
          }}
          onViewDetails={(apt, opener) => {
            setDrawerOpenerEl(opener || null);
            setReceiptAppointment(apt);
          }}
          onDelete={(apt) => {
            deleteAppointment(apt.id);
            if (receiptAppointment?.id === apt.id) setReceiptAppointment(null);
            showToast?.({ type: 'info', title: 'Rendez-vous supprimé', message: apt.clientName });
          }}
          onBulkDelete={(ids) => {
            batchDeleteAppointments(Array.from(ids));
            setSelectedHistoryIds(new Set());
          }}
          emptyTitle={isAr ? 'لا يوجد سجل' : 'Aucun historique trouvé'}
          emptyDescription={isAr ? 'ستظهر المواعيد المكتملة هنا' : 'Les rendez-vous terminés apparaîtront ici.'}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || statusFilter !== 'All' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedAppointments.length}
        entityPluralLabel={isAr ? 'سجلات' : 'prestations'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Appointment>
        isOpen={receiptAppointment !== null}
        item={receiptAppointment}
        allItems={sortedAppointments}
        keyExtractor={(a) => a.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={receiptAppointment?.clientName || ''}
        subtitle={receiptAppointment ? `${receiptAppointment.date} · ${receiptAppointment.startTime}` : undefined}
        avatarText={receiptAppointment ? receiptAppointment.clientName.charAt(0).toUpperCase() : undefined}
        branchName={
          receiptAppointment
            ? resolveRecordBranch(receiptAppointment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={receiptAppointment?.status}
        statusClassName={
          receiptAppointment?.status === 'Completed'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }
        onClose={() => setReceiptAppointment(null)}
        onSelectItem={(a) => setReceiptAppointment(a)}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(a) => {
          deleteAppointment(a.id);
          setReceiptAppointment(null);
        }}
        renderBody={(apt) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-dashed border-[#D4C8BC] dark:border-[#3A3734] font-mono space-y-2">
              <div className="text-center border-b border-dashed border-[#D4C8BC] dark:border-[#3A3734] pb-2">
                <span className="font-bold uppercase block text-black dark:text-white">
                  {resolveRecordBranch(apt, branchesById, currentBranch, language).name}
                </span>
                <span className="text-[11px] text-black/62 dark:text-white/65">Ticket Thermique 80mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Soin :</span>
                <span className="font-bold text-black dark:text-white">{apt.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Styliste :</span>
                <span>{apt.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Paiement :</span>
                <span>{apt.paymentMethod || 'Espèces'}</span>
              </div>
              {apt.colorFormula && (
                <div className="p-2 rounded-lg bg-[#F3EDE7] dark:bg-[#1C1B1A] text-[11px]">
                  Formule: {apt.colorFormula}
                </div>
              )}
              <div className="pt-2 border-t border-dashed border-[#D4C8BC] dark:border-[#3A3734] flex justify-between font-bold text-sm text-[#d4522f]">
                <span>TOTAL :</span>
                <span>{formatMoney(apt.price)}</span>
              </div>
            </div>
            <AtriumButton
              type="button"
              variant="primary"
              icon={<Printer size={14} />}
              className="w-full justify-center"
              onClick={() => window.print()}
            >
              Imprimer Ticket 80mm
            </AtriumButton>
          </div>
        )}
      />
    </div>
  );
});

AppointmentHistoryView.displayName = 'AppointmentHistoryView';

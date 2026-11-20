import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Printer,
  History,
  Building2,
  Eye,
  Trash2,
  Copy,
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
import { formatMoney, localizeStatus } from '../../../utils/rules';
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
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
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
            <span className="t-label font-semibold text-black dark:text-white truncate block">
              {apt.clientName}
            </span>
            <span className="t-small tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold block">
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
            <span className="t-small font-semibold text-black dark:text-white truncate block">
              {apt.serviceName}
            </span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">
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
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold ${
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
            <span className="tabular-nums t-label font-semibold text-black dark:text-white block">
              {formatMoney(apt.price)}
            </span>
            <span className="t-cap text-black/62 dark:text-white/65 block">
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
          <span className="t-small font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(apt, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const getRowMeta = useCallback(
    (apt: Appointment): Partial<KineticRowData> => {
      const isCompleted = apt.status === 'Completed';
      const isInChair = apt.status === 'InChair';
      const branch = resolveRecordBranch(apt, branchesById, currentBranch, language);
      return {
        subline: `${apt.date} · ${apt.startTime} · ${apt.serviceName}`,
        categoryLabel: apt.paymentMethod || 'Espèces',
        statusLabel: isCompleted ? 'Terminé' : isInChair ? 'En Fauteuil' : 'Confirmé',
        statusVariant: isCompleted ? 'active' : 'warning',
        metricPrimary: formatMoney(apt.price),
        metricSecondary: `${apt.durationMinutes} min`,
        detailCol1: {
          heading: isAr ? 'الخدمة والتوقيت' : 'Soin & Horaire',
          primaryText: apt.serviceName,
          secondaryText: `${apt.date} · ${apt.startTime} (${apt.durationMinutes}m)`,
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: isAr ? 'المصففة والوصفة' : 'Styliste & Formule',
          primaryText: apt.staffName,
          secondaryText: apt.colorFormula || 'Protocole standard',
        },
        detailCol3: {
          heading: isAr ? 'الدفع والوصول' : 'Règlement',
          primaryText: formatMoney(apt.price),
          secondaryText: apt.paymentMethod || 'Non payé',
        },
      };
    },
    [branchesById, currentBranch, language, isAr]
  );

  const getFanActions = useCallback(
    (apt: Appointment): KineticRowFanAction[] => [
      {
        id: 'print',
        label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: () => window.print(),
      },
      {
        id: 'view',
        label: isAr ? 'معاينة' : isEn ? 'View' : 'Reçu 80mm',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setReceiptAppointment(apt);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          deleteAppointment(apt.id);
          if (receiptAppointment?.id === apt.id) setReceiptAppointment(null);
          showToast?.({ type: 'info', title: 'Rendez-vous supprimé', message: apt.clientName });
        },
      },
    ],
    [isAr, isEn, deleteAppointment, receiptAppointment?.id]
  );

  const getDetailActions = useCallback(
    (apt: Appointment): KineticDetailAction[] => [
      {
        id: 'view',
        label: isAr ? 'عرض الوصل' : isEn ? 'Receipt' : 'Voir Ticket',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => setReceiptAppointment(apt),
      },
      {
        id: 'print',
        label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
        icon: <Printer className="w-3.5 h-3.5 text-[#096b40]" />,
        onClick: () => window.print(),
      },
    ],
    [isAr, isEn]
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
          items={sortedAppointments}
          columns={columns}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
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
        avatarText={receiptAppointment ? receiptAppointment.clientName.slice(0, 2).toUpperCase() : undefined}
        categoryLabel={receiptAppointment?.serviceName}
        branchName={
          receiptAppointment
            ? resolveRecordBranch(receiptAppointment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={receiptAppointment ? localizeStatus(receiptAppointment.status, language) : undefined}
        statusClassName={
          receiptAppointment?.status === 'Completed'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'التفاصيل' : isEn ? 'Overview' : 'Prestation & Soin' },
          { id: 'receipt', label: isAr ? 'الوصل' : isEn ? 'Receipt 80mm' : 'Ticket 80mm' },
          { id: 'audit', label: isAr ? 'التدقيق' : isEn ? 'Audit Log' : 'Journal Audit' },
        ]}
        onClose={() => setReceiptAppointment(null)}
        onSelectItem={(a) => setReceiptAppointment(a)}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(a) => {
          deleteAppointment(a.id);
          setReceiptAppointment(null);
        }}
        renderBody={(apt, activeTab) => {
          const branchName = resolveRecordBranch(apt, branchesById, currentBranch, language).name;

          if (activeTab === 'receipt') {
            return (
              <>
                <InspectorSection index={0} title="Montant encaissé">
                  <InspectorBigStat
                    value={formatMoney(apt.price)}
                    tone={apt.status === 'Completed' ? 'ok' : 'accent'}
                    action={{
                      label: 'Imprimer Ticket 80mm',
                      onClick: () => window.print(),
                    }}
                  />
                </InspectorSection>
                <InspectorSection index={1} title="Détail ticket thermique">
                  <InspectorCard>
                    <InspectorKeyValue label="Établissement" value={branchName} mono={false} />
                    <InspectorKeyValue label="Soin" value={apt.serviceName} mono={false} />
                    <InspectorKeyValue label="Styliste" value={apt.staffName} mono={false} />
                    <InspectorKeyValue label="Règlement" value={apt.paymentMethod || 'Espèces'} mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (activeTab === 'audit') {
            return (
              <InspectorSection index={0} title="Traçabilité prestation">
                <InspectorCard>
                  <InspectorListItem
                    title={`${apt.serviceName} (${apt.durationMinutes} min)`}
                    subtitle={`${apt.date} à ${apt.startTime} · ${apt.staffName}`}
                    badge={{ label: localizeStatus(apt.status, language), tone: apt.status === 'Completed' ? 'ok' : 'warn' }}
                    isLast={!apt.colorFormula}
                  />
                  {apt.colorFormula && (
                    <InspectorListItem title={`Formule : ${apt.colorFormula}`} subtitle="Protocole technique appliqué" isLast />
                  )}
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title="Actions rapides">
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'print',
                      label: 'Imprimer Ticket',
                      icon: <Printer className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => window.print(),
                    },
                    {
                      id: 'copy',
                      label: 'Copier Réf.',
                      icon: <Copy className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        const ref = `${apt.clientName} · ${apt.serviceName} (${formatMoney(apt.price)})`;
                        navigator.clipboard?.writeText(ref);
                        showToast?.({ type: 'success', title: 'Copié', message: ref });
                      },
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title="Fiche Prestation">
                <InspectorCard>
                  <InspectorKeyValue label="Soin" value={apt.serviceName} tone="accent" mono={false} />
                  <InspectorKeyValue label="Styliste" value={apt.staffName} mono={false} />
                  <InspectorKeyValue label="Horaire" value={`${apt.date} · ${apt.startTime} (${apt.durationMinutes}m)`} />
                  <InspectorKeyValue label="Tarif" value={formatMoney(apt.price)} tone="ok" />
                  <InspectorKeyValue label="Branche" icon={<Building2 className="w-[15px] h-[15px]" />} value={branchName} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2}>
                <InspectorWideButton
                  label="Imprimer Ticket 80mm"
                  icon={<Printer className="w-4 h-4" />}
                  tone="dark"
                  onClick={() => window.print()}
                />
              </InspectorSection>
            </>
          );
        }}
      />
    </div>
  );
});

AppointmentHistoryView.displayName = 'AppointmentHistoryView';

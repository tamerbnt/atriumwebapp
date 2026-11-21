import React, { useMemo, useState } from 'react';
import { History, HardHat, Eye } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { useContractorData } from './contractorData';
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

interface ContractorLedgerItem {
  id: string;
  group: 'site_concrete' | 'dgp_os';
  kindLabel: string;
  refCode: string;
  projectTitle: string;
  detailText: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const ContractorHistoryView: React.FC = React.memo(() => {
  const { branches, currentBusinessId, currentBranchId, currentBranch, language, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
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
  const { projects, dailyLogs, concretePours, dgps, serviceOrders } = useContractorData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<ContractorLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);
  const projectNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (projects || []).forEach((p) => m.set(p.id, p.projectName));
    return m;
  }, [projects]);

  const allItems = useMemo<ContractorLedgerItem[]>(() => {
    const out: ContractorLedgerItem[] = [];
    (dailyLogs || []).forEach((log) => {
      out.push({
        id: `dlog_${log.id}`,
        group: 'site_concrete',
        kindLabel: l3('يومية ورشة', 'Journal Chantier', 'Site Log'),
        refCode: log.date,
        projectTitle: projectNameMap.get(log.projectId) || 'Chantier',
        detailText: `${log.weather} · ${log.headcountWorkers} ouvriers · ${log.tasksAccomplished}`,
        amountDzd: 0,
        status: log.ctcVisit ? 'Visite CTC' : log.supervisorSignature || 'Signé',
        dateStr: log.date || log.createdAt,
        branchId: log.branchId,
      });
    });
    (concretePours || []).forEach((cp) => {
      out.push({
        id: `cp_${cp.id}`,
        group: 'site_concrete',
        kindLabel: l3('صب خرسانة', 'Coulage Béton', 'Concrete Pour'),
        refCode: `${cp.concreteGrade} · ${cp.volumePouredM3} m³`,
        projectTitle: projectNameMap.get(cp.projectId) || 'Chantier',
        detailText: `${cp.elementPoured} · ${cp.supplierName}`,
        amountDzd: 0,
        status: cp.status,
        dateStr: cp.pourDate || cp.createdAt,
        branchId: cp.branchId,
      });
    });
    (dgps || []).forEach((d) => {
      out.push({
        id: `dgp_${d.id}`,
        group: 'dgp_os',
        kindLabel: l3('كشف DGP', 'Situation DGP', 'DGP Billing'),
        refCode: d.dgpNumber,
        projectTitle: projectNameMap.get(d.projectId) || d.periodLabel,
        detailText: d.periodLabel,
        amountDzd: d.netPayableDzd || 0,
        status: d.status,
        dateStr: d.issuedDate || d.createdAt,
        branchId: d.branchId,
      });
    });
    (serviceOrders || []).forEach((os) => {
      out.push({
        id: `os_${os.id}`,
        group: 'dgp_os',
        kindLabel: `OS ${os.osType}`,
        refCode: os.osNumber,
        projectTitle: projectNameMap.get(os.projectId) || 'Marché BTP',
        detailText: `${os.reason} (+${os.durationDaysGranted}j)`,
        amountDzd: 0,
        status: os.status,
        dateStr: os.effectiveDate || os.createdAt,
        branchId: os.branchId,
      });
    });
    return out;
  }, [dailyLogs, concretePours, dgps, serviceOrders, projectNameMap, isAr, isEn]);

  const stats = useMemo(() => {
    const siteConcreteCount = allItems.filter((i) => i.group === 'site_concrete').length;
    const dgpOsCount = allItems.filter((i) => i.group === 'dgp_os').length;
    const totalDgpDzd = (dgps || []).reduce((s, d) => s + (d.netPayableDzd || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      siteConcreteCount,
      dgpOsCount,
      totalDgpDzd,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, dgps, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'site_concrete' && it.group !== 'site_concrete') return false;
      if (statusFilter === 'dgp_os' && it.group !== 'dgp_os') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.refCode} ${it.projectTitle} ${it.detailText} ${it.kindLabel}`.toLowerCase();
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
      if (sortBy === 'ref') return a.refCode.localeCompare(b.refCode) * sign;
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<ContractorLedgerItem>[]>(
    () => [
      {
        key: 'ref',
        header: l3('الوثيقة والورشة', 'Référence & Chantier', 'Ref & Project'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.refCode}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.projectTitle}</span>
          </div>
        ),
      },
      {
        key: 'detail',
        header: l3('البيان', 'Désignation', 'Details'),
        renderCell: (it) => <span className="t-small text-black/80 dark:text-white/80 truncate block">{it.detailText}</span>,
      },
      {
        key: 'amount',
        header: l3('صافي DGP والتاريخ', 'Montant & Date', 'Amount & Date'),
        sortable: true,
        renderCell: (it) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold text-black dark:text-white block">
              {it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'}
            </span>
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
    <VerticalHistoryScaffold<ContractorLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل الورشات والمشاريع BTP', 'Historique Chantiers & BTP', 'Construction History')}
      primaryAction={{
        label: l3('المشاريع', 'Chantiers', 'Projects'),
        icon: <HardHat size={16} />,
        onClick: () => setScreen('members'),
      }}
      kpiHeading={l3('تدقيق اليوميات والخرسانة والكشوف', 'Audit Journaux, Béton, DGP & Ordres OS', 'Site, Concrete & DGP Audit')}
      primaryCard={{
        label: l3('اليوميات والخرسانة', 'Chantier & Béton', 'Site & Concrete'),
        badgeText: `${stats.siteConcreteCount} logs`,
        count: stats.siteConcreteCount,
        tone: 'emerald',
        isActive: statusFilter === 'site_concrete',
        onToggle: () => setStatusFilter((p) => (p === 'site_concrete' ? 'all' : 'site_concrete')),
      }}
      secondaryCard={{
        label: l3('الكشوف DGP والأوامر OS', 'Décomptes DGP & OS', 'DGP & Service Orders'),
        badgeText: `${stats.dgpOsCount} actes`,
        count: stats.dgpOsCount,
        tone: 'terracotta',
        isActive: statusFilter === 'dgp_os',
        onToggle: () => setStatusFilter((p) => (p === 'dgp_os' ? 'all' : 'dgp_os')),
      }}
      darkCard={{
        label: l3('إجمالي الكشوف DGP', 'Situations DGP Nettes', 'Net DGP Billings'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'pièces', 'entries'),
        valuePrefix: '',
        valueCount: stats.totalDgpDzd,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'BTP'} · CTC & Marchés`,
      }}
      podTitle={l3('سجل الورشات والمقاولات', 'Registre Journalier, Béton & Situations', 'Site & Billing Ledger')}
      searchPlaceholder={l3('بحث بالورشة، الخرسانة، DGP، OS...', 'Rechercher chantier, béton, DGP, OS...', 'Search site, concrete, DGP, OS...')}
      vertical="construction_contractor"
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
        { value: 'site_concrete', label: l3('الورشة والخرسانة', 'Chantier & Béton', 'Site & Concrete'), count: stats.siteConcreteCount },
        { value: 'dgp_os', label: l3('الكشوف والأوامر', 'DGP & OS', 'DGP & OS'), count: stats.dgpOsCount },
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
        title: it.refCode,
        subline: `${it.kindLabel} · ${it.projectTitle} · ${it.detailText}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'dgp_os' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.status,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('الوثيقة', 'Pièce', 'Ref'), primaryText: it.refCode, secondaryText: it.kindLabel },
        detailCol2: { heading: l3('المشروع', 'Chantier & Travaux', 'Project & Scope'), primaryText: it.projectTitle, secondaryText: it.detailText },
        detailCol3: { heading: l3('المبلغ', 'Montant', 'Amount'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('الفرع', 'Direction / Site', 'Site'),
              value: branchFilter,
              onChange: setBranchFilter,
              kind: 'tiles',
              columns: 2,
              options: [{ value: 'All', label: l3('الكل', 'Tous', 'All'), count: allItems.length }, ...stats.branchOptions],
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
          `atrium-contractor-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Ref', 'Project', 'Details', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.refCode, i.projectTitle, i.detailText, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'entrées', 'records')}
      emptyTitle={l3('لا توجد سجلات مقاولات', 'Aucun historique chantier', 'No construction history yet')}
      emptyDescription={l3('ستظهر اليوميات والخرسانة وكشوف DGP وأوامر OS هنا', 'Les journaux, coulages béton, DGP et OS apparaîtront ici.', 'Site logs, concrete pours, DGP billings, and OS orders appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.refCode,
        subtitle: (it) => `${it.kindLabel} · ${it.projectTitle}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل السجل الميداني', 'Détails Chantier', 'Site Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('المرجع', 'Référence', 'Ref')} value={it.refCode} mono />
              <InspectorKeyValue label={l3('المشروع', 'Chantier', 'Project')} value={it.projectTitle} />
              <InspectorKeyValue label={l3('التفاصيل', 'Désignation', 'Details')} value={it.detailText} />
              <InspectorKeyValue label={l3('المبلغ', 'Montant Net', 'Net Amount')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});

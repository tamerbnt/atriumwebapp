import React, { useMemo, useState } from 'react';
import { History, Kanban, FolderKanban, Eye } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentPmProjectsFromState,
  selectCurrentPmBatDeliverablesFromState,
  selectCurrentPmExpensesFromState,
  selectCurrentPmMissionsFromState,
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

interface ProjectLedgerItem {
  id: string;
  group: 'proj_bat' | 'field_exp';
  kindLabel: string;
  code: string;
  title: string;
  subtitle: string;
  actorOrClient: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const ProjectHistoryView: React.FC = React.memo(() => {
  const { pmProjects, pmBatDeliverables, pmExpenses, pmMissions, branches, currentBusinessId, currentBranchId, currentBranch, language, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      pmProjects: selectCurrentPmProjectsFromState(s),
      pmBatDeliverables: selectCurrentPmBatDeliverablesFromState(s),
      pmExpenses: selectCurrentPmExpensesFromState(s),
      pmMissions: selectCurrentPmMissionsFromState(s),
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
  const [selectedItem, setSelectedItem] = useState<ProjectLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<ProjectLedgerItem[]>(() => {
    const out: ProjectLedgerItem[] = [];
    (pmProjects || []).forEach((p) => {
      out.push({
        id: `prj_${p.id}`,
        group: 'proj_bat',
        kindLabel: l3('مشروع', 'Projet', 'Project'),
        code: p.clientName,
        title: p.title,
        subtitle: p.projectManagerName || p.scopeOfWork,
        actorOrClient: p.clientName,
        amountDzd: p.budgetCapDzd || 0,
        status: p.status,
        dateStr: p.createdAt,
        branchId: p.branchId,
      });
    });
    (pmBatDeliverables || []).forEach((b) => {
      out.push({
        id: `bat_${b.id}`,
        group: 'proj_bat',
        kindLabel: `BAT ${b.versionCode}`,
        code: b.fileFormat.toUpperCase(),
        title: b.title,
        subtitle: b.projectTitle,
        actorOrClient: b.uploadedByCreativeName,
        amountDzd: 0,
        status: b.approvalStatus,
        dateStr: b.createdAt,
        branchId: b.branchId,
      });
    });
    (pmExpenses || []).forEach((e) => {
      out.push({
        id: `exp_${e.id}`,
        group: 'field_exp',
        kindLabel: l3('مصاريف', 'Note de frais', 'Expense'),
        code: e.category,
        title: e.title,
        subtitle: e.projectTitle,
        actorOrClient: e.declaredByUserName,
        amountDzd: e.amountDzd || 0,
        status: e.status,
        dateStr: e.createdAt,
        branchId: e.branchId,
      });
    });
    (pmMissions || []).forEach((m) => {
      out.push({
        id: `mis_${m.id}`,
        group: 'field_exp',
        kindLabel: l3('مهمة ميدانية', 'Mission terrain', 'Field Mission'),
        code: m.code,
        title: m.title,
        subtitle: `${m.wilayaName} · ${m.clientName}`,
        actorOrClient: m.supervisorName,
        amountDzd: 0,
        status: m.status,
        dateStr: m.startDate || m.createdAt,
        branchId: m.branchId,
      });
    });
    return out;
  }, [pmProjects, pmBatDeliverables, pmExpenses, pmMissions, isAr, isEn]);

  const stats = useMemo(() => {
    const projBatCount = allItems.filter((i) => i.group === 'proj_bat').length;
    const fieldExpCount = allItems.filter((i) => i.group === 'field_exp').length;
    const totalVolume = allItems.reduce((sum, i) => sum + i.amountDzd, 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      projBatCount,
      fieldExpCount,
      totalVolume,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'proj_bat' && it.group !== 'proj_bat') return false;
      if (statusFilter === 'field_exp' && it.group !== 'field_exp') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.title} ${it.subtitle} ${it.code} ${it.actorOrClient} ${it.kindLabel}`.toLowerCase();
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
      if (sortBy === 'title') return a.title.localeCompare(b.title) * sign;
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<ProjectLedgerItem>[]>(
    () => [
      {
        key: 'title',
        header: l3('العملية والمشروع', 'Opération & Projet', 'Operation & Project'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.title}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.code}</span>
          </div>
        ),
      },
      {
        key: 'actor',
        header: l3('العميل / المسؤول', 'Client / Responsable', 'Client / Owner'),
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-small font-medium text-black dark:text-white truncate block">{it.actorOrClient}</span>
            <span className="t-cap text-black/60 dark:text-white/60 truncate block">{it.subtitle}</span>
          </div>
        ),
      },
      {
        key: 'amount',
        header: l3('المبلغ / التاريخ', 'Montant & Date', 'Amount & Date'),
        sortable: true,
        renderCell: (it) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold text-black dark:text-white block">
              {it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'}
            </span>
            <span className="t-cap text-black/60 dark:text-white/60 block">
              {new Date(it.dateStr).toLocaleDateString()}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: l3('الحالة', 'Statut', 'Status'),
        renderCell: (it) => (
          <span className="t-small font-semibold text-[var(--facility-accent,var(--brand-text))]">{it.status}</span>
        ),
      },
    ],
    [isAr, isEn]
  );

  return (
    <VerticalHistoryScaffold<ProjectLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل المشاريع والوكالة', 'Historique Projets & Agence', 'Project & Agency History')}
      primaryAction={{
        label: l3('لوحة المشاريع', 'Vue Projets', 'Projects Hub'),
        icon: <FolderKanban size={16} />,
        onClick: () => setScreen('scheduler'),
      }}
      kpiHeading={l3('ملخص الأنشطة والميزانيات', 'Audit Activations, BAT & Frais', 'Projects, BAT & Field Audit')}
      primaryCard={{
        label: l3('المشاريع والملفات BAT', 'Projets & Livrables BAT', 'Projects & BAT'),
        badgeText: `${stats.projBatCount} dossiers`,
        count: stats.projBatCount,
        tone: 'emerald',
        isActive: statusFilter === 'proj_bat',
        onToggle: () => setStatusFilter((p) => (p === 'proj_bat' ? 'all' : 'proj_bat')),
      }}
      secondaryCard={{
        label: l3('المهام والمصاريف', 'Missions & Frais Terrain', 'Missions & Expenses'),
        badgeText: `${stats.fieldExpCount} opérations`,
        count: stats.fieldExpCount,
        tone: 'terracotta',
        isActive: statusFilter === 'field_exp',
        onToggle: () => setStatusFilter((p) => (p === 'field_exp' ? 'all' : 'field_exp')),
      }}
      darkCard={{
        label: l3('الحجم المالي المرصود', 'Volume Budgété & Dépenses', 'Tracked Budget Volume'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'opérations', 'entries'),
        valuePrefix: '',
        valueCount: stats.totalVolume,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Agence'} · NCH Audit Trail`,
      }}
      podTitle={l3('السجل الموحد للمشاريع', 'Registre des Opérations Agence', 'Agency Activity Ledger')}
      searchPlaceholder={l3('بحث عن مشروع، BAT، مهمة...', 'Rechercher projet, BAT, mission, frais...', 'Search project, BAT, mission...')}
      vertical="project_milestone"
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
        { value: 'proj_bat', label: l3('المشاريع وBAT', 'Projets & BAT', 'Projects & BAT'), count: stats.projBatCount },
        { value: 'field_exp', label: l3('الميدان والمصاريف', 'Terrain & Frais', 'Field & Expenses'), count: stats.fieldExpCount },
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
        title: it.title,
        subline: `${it.kindLabel} · ${it.code} · ${new Date(it.dateStr).toLocaleDateString()}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'proj_bat' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.code,
        metricSecondary: it.actorOrClient,
        detailCol1: { heading: l3('التصنيف', 'Type', 'Type'), primaryText: it.kindLabel, secondaryText: it.code },
        detailCol2: { heading: l3('المسؤول', 'Intervenant', 'Owner'), primaryText: it.actorOrClient, secondaryText: it.subtitle },
        detailCol3: { heading: l3('المبلغ', 'Budget / Montant', 'Amount'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
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
          `atrium-projects-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Title', 'Owner/Client', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.title, i.actorOrClient, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('عمليات', 'opérations', 'operations')}
      emptyTitle={l3('لا توجد عمليات مشاريع', 'Aucune opération agence', 'No agency history yet')}
      emptyDescription={l3('ستظهر المشاريع والمهام والمصاريف هنا', 'Les projets, BAT, missions et frais apparaîtront ici.', 'Projects, BAT deliverables, missions, and expenses appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.title,
        subtitle: (it) => `${it.kindLabel} · ${it.code}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل السجل', 'Détails opération', 'Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Catégorie', 'Category')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('المرجع', 'Référence', 'Reference')} value={it.code} mono />
              <InspectorKeyValue label={l3('المعني', 'Client / Intervenant', 'Client / Owner')} value={it.actorOrClient} />
              <InspectorKeyValue label={l3('التفاصيل', 'Contexte', 'Context')} value={it.subtitle || '—'} />
              <InspectorKeyValue label={l3('المبلغ', 'Montant', 'Amount')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('التاريخ', 'Date', 'Date')} value={new Date(it.dateStr).toLocaleString()} mono />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});

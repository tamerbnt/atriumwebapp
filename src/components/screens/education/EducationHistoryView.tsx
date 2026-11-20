import React, { useMemo, useState } from 'react';
import { History, GraduationCap, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
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

interface EducationLedgerItem {
  id: string;
  group: 'sessions' | 'admissions_fees';
  kindLabel: string;
  primaryTitle: string;
  secondaryText: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const EducationHistoryView: React.FC = React.memo(() => {
  const {
    eduSessions,
    eduEnrollments,
    eduAdmissions,
    branches,
    currentBusinessId,
    currentBranchId,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
    setScreen,
  } = useAtriumStore();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<EducationLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<EducationLedgerItem[]>(() => {
    const out: EducationLedgerItem[] = [];
    (eduSessions || []).forEach((s) => {
      out.push({
        id: `ses_${s.id}`,
        group: 'sessions',
        kindLabel: l3('حصة دراسية', 'Séance', 'Session'),
        primaryTitle: `${s.cohortName}${s.topic ? ` · ${s.topic}` : ''}`,
        secondaryText: `${s.instructorName} · ${s.classroomName || 'Salle'} (${s.startTime}-${s.endTime})`,
        amountDzd: 0,
        status: s.status,
        dateStr: s.date || s.createdAt,
        branchId: s.branchId,
      });
    });
    (eduEnrollments || []).forEach((e) => {
      out.push({
        id: `enr_${e.id}`,
        group: 'admissions_fees',
        kindLabel: l3('تسجيل ورسوم', 'Inscription & Frais', 'Enrollment Fee'),
        primaryTitle: e.studentName,
        secondaryText: `${e.cohortName} · ${l3('المدفوع', 'Payé', 'Paid')}: ${formatMoney(e.paidAmount)}`,
        amountDzd: e.paidAmount,
        status: e.paymentStatus,
        dateStr: e.enrolledAt,
        branchId: e.branchId,
      });
    });
    (eduAdmissions || []).forEach((a) => {
      out.push({
        id: `adm_${a.id}`,
        group: 'admissions_fees',
        kindLabel: l3('طلب قبول', 'Admission', 'Admission'),
        primaryTitle: a.studentName,
        secondaryText: `${a.desiredCourseTitle} · ${a.phone}`,
        amountDzd: 0,
        status: a.stage,
        dateStr: a.createdAt,
        branchId: a.branchId,
      });
    });
    return out;
  }, [eduSessions, eduEnrollments, eduAdmissions, isAr, isEn]);

  const stats = useMemo(() => {
    const sessionsCount = allItems.filter((i) => i.group === 'sessions').length;
    const admFeesCount = allItems.filter((i) => i.group === 'admissions_fees').length;
    const tuitionCollected = (eduEnrollments || []).reduce((s, e) => s + (e.paidAmount || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      sessionsCount,
      admFeesCount,
      tuitionCollected,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, eduEnrollments, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'sessions' && it.group !== 'sessions') return false;
      if (statusFilter === 'admissions_fees' && it.group !== 'admissions_fees') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.primaryTitle} ${it.secondaryText} ${it.kindLabel} ${it.status}`.toLowerCase();
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
      if (sortBy === 'title') return a.primaryTitle.localeCompare(b.primaryTitle) * sign;
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<EducationLedgerItem>[]>(
    () => [
      {
        key: 'title',
        header: l3('الطالب / الحصة', 'Apprenant / Séance', 'Student / Session'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.primaryTitle}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.secondaryText}</span>
          </div>
        ),
      },
      {
        key: 'amount',
        header: l3('الرسوم والتاريخ', 'Frais & Date', 'Tuition & Date'),
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
    <VerticalHistoryScaffold<EducationLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل الأكاديمية والتعليم', 'Historique École & Académie', 'Academy History')}
      primaryAction={{
        label: l3('الجدول الدراسي', 'Emploi du temps', 'Timetable'),
        icon: <GraduationCap size={16} />,
        onClick: () => setScreen('scheduler'),
      }}
      kpiHeading={l3('سجل الحصص والتسجيلات', 'Audit Séances, Admissions & Frais', 'Sessions & Tuition Audit')}
      primaryCard={{
        label: l3('الحصص المنجزة', 'Séances & Cours', 'Class Sessions'),
        badgeText: `${stats.sessionsCount} séances`,
        count: stats.sessionsCount,
        tone: 'emerald',
        isActive: statusFilter === 'sessions',
        onToggle: () => setStatusFilter((p) => (p === 'sessions' ? 'all' : 'sessions')),
      }}
      secondaryCard={{
        label: l3('القبول والرسوم', 'Admissions & Scolarité', 'Admissions & Tuition'),
        badgeText: `${stats.admFeesCount} dossiers`,
        count: stats.admFeesCount,
        tone: 'terracotta',
        isActive: statusFilter === 'admissions_fees',
        onToggle: () => setStatusFilter((p) => (p === 'admissions_fees' ? 'all' : 'admissions_fees')),
      }}
      darkCard={{
        label: l3('إجمالي الرسوم المحصلة', 'Scolarité Encaissée', 'Tuition Collected'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'opérations', 'records'),
        valuePrefix: '',
        valueCount: stats.tuitionCollected,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Académie'} · School Ledger`,
      }}
      podTitle={l3('سجل الأكاديمية الكامل', 'Journal Académique & Scolarité', 'Academy Operations Log')}
      searchPlaceholder={l3('بحث عن طالب، فوج، حصة...', 'Rechercher élève, cohorte, séance...', 'Search student, cohort, session...')}
      vertical="education_cohort"
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
        { value: 'sessions', label: l3('الحصص', 'Séances', 'Sessions'), count: stats.sessionsCount },
        { value: 'admissions_fees', label: l3('القبول والرسوم', 'Admissions & Frais', 'Admissions & Fees'), count: stats.admFeesCount },
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
        title: it.primaryTitle,
        subline: `${it.kindLabel} · ${it.secondaryText}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'sessions' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.status,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('النوع', 'Type', 'Kind'), primaryText: it.kindLabel, secondaryText: it.primaryTitle },
        detailCol2: { heading: l3('التفاصيل', 'Détails', 'Details'), primaryText: it.secondaryText, secondaryText: new Date(it.dateStr).toLocaleDateString() },
        detailCol3: { heading: l3('الرسوم', 'Scolarité', 'Tuition'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
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
          `atrium-education-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Title', 'Details', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.primaryTitle, i.secondaryText, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'opérations', 'records')}
      emptyTitle={l3('لا توجد عمليات دراسية', 'Aucun historique académique', 'No academy records yet')}
      emptyDescription={l3('ستظهر الحصص والرسوم وطلبات القبول هنا', 'Les séances, inscriptions et admissions apparaîtront ici.', 'Sessions, tuition payments, and admissions appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.primaryTitle,
        subtitle: (it) => `${it.kindLabel} · ${it.status}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('ملخص السجل', 'Détails', 'Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Catégorie', 'Category')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('العنوان', 'Objet', 'Subject')} value={it.primaryTitle} />
              <InspectorKeyValue label={l3('التفاصيل', 'Détails', 'Details')} value={it.secondaryText} />
              <InspectorKeyValue label={l3('المبلغ', 'Montant', 'Amount')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});

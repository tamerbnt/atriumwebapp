import React, { useMemo, useState } from 'react';
import { History, Scale, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useLegalData } from './legalData';
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

interface LegalLedgerItem {
  id: string;
  group: 'matters_deeds' | 'hearings_cash';
  kindLabel: string;
  refNumber: string;
  title: string;
  partyOrCourt: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const LegalHistoryView: React.FC = React.memo(() => {
  const {
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
  const { matters, notaryDeeds, hearings, cashReceipts, scfEntries } = useLegalData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<LegalLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<LegalLedgerItem[]>(() => {
    const out: LegalLedgerItem[] = [];
    (matters || []).forEach((m) => {
      out.push({
        id: `mat_${m.id}`,
        group: 'matters_deeds',
        kindLabel: l3('قضية / ملف', 'Dossier', 'Matter'),
        refNumber: m.matterNumber,
        title: m.title,
        partyOrCourt: `${m.clientName}${m.courtJurisdiction ? ` · ${m.courtJurisdiction}` : ''}`,
        amountDzd: m.retainerAmountDzd || 0,
        status: m.status,
        dateStr: m.createdAt,
        branchId: m.branchId,
      });
    });
    (notaryDeeds || []).forEach((d) => {
      out.push({
        id: `deed_${d.id}`,
        group: 'matters_deeds',
        kindLabel: l3('عقد توثيقي', 'Acte Notarié', 'Notary Deed'),
        refNumber: d.repertoireNumber,
        title: d.title,
        partyOrCourt: d.actType,
        amountDzd: d.transactionValueDzd || 0,
        status: d.status,
        dateStr: d.signedAt || d.createdAt,
        branchId: d.branchId,
      });
    });
    (hearings || []).forEach((h) => {
      out.push({
        id: `hr_${h.id}`,
        group: 'hearings_cash',
        kindLabel: l3('جلسة محكمة', 'Audience', 'Hearing'),
        refNumber: h.matterNumber || 'AUD',
        title: h.matterTitle || h.purpose || 'Audience',
        partyOrCourt: h.courtName || h.chamber || 'Tribunal',
        amountDzd: 0,
        status: h.status || 'Scheduled',
        dateStr: h.hearingDate,
        branchId: h.branchId,
      });
    });
    (cashReceipts || []).forEach((r) => {
      out.push({
        id: `rec_${r.id}`,
        group: 'hearings_cash',
        kindLabel: l3('وصل أتعاب', 'Reçu Caisse', 'Cash Receipt'),
        refNumber: r.receiptNumber,
        title: r.matterTitle,
        partyOrCourt: `${r.clientName} · ${r.paymentMethod}`,
        amountDzd: r.netCollectedDzd || 0,
        status: r.paymentMethod,
        dateStr: r.createdAt,
        branchId: r.branchId,
      });
    });
    (scfEntries || []).forEach((e) => {
      out.push({
        id: `scf_${e.id}`,
        group: 'hearings_cash',
        kindLabel: `SCF ${e.journalCode}`,
        refNumber: e.entryNumber,
        title: e.libelle,
        partyOrCourt: e.pieceJustificativeRef,
        amountDzd: e.totalDebitDzd || 0,
        status: e.status,
        dateStr: e.date,
        branchId: e.branchId,
      });
    });
    return out;
  }, [matters, notaryDeeds, hearings, cashReceipts, scfEntries, isAr, isEn]);

  const stats = useMemo(() => {
    const mattersDeedsCount = allItems.filter((i) => i.group === 'matters_deeds').length;
    const hearingsCashCount = allItems.filter((i) => i.group === 'hearings_cash').length;
    const totalCollected = (cashReceipts || []).reduce((s, r) => s + (r.netCollectedDzd || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      mattersDeedsCount,
      hearingsCashCount,
      totalCollected,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, cashReceipts, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'matters_deeds' && it.group !== 'matters_deeds') return false;
      if (statusFilter === 'hearings_cash' && it.group !== 'hearings_cash') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.refNumber} ${it.title} ${it.partyOrCourt} ${it.kindLabel}`.toLowerCase();
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
      if (sortBy === 'ref') return a.refNumber.localeCompare(b.refNumber) * sign;
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<LegalLedgerItem>[]>(
    () => [
      {
        key: 'ref',
        header: l3('المرجع والموضوع', 'Référence & Objet', 'Ref & Subject'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.title}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.refNumber}</span>
          </div>
        ),
      },
      {
        key: 'party',
        header: l3('الموكل / الجهة', 'Client / Juridiction', 'Client / Court'),
        renderCell: (it) => <span className="t-small text-black/80 dark:text-white/80 truncate block">{it.partyOrCourt}</span>,
      },
      {
        key: 'amount',
        header: l3('المبلغ والتاريخ', 'Montant & Date', 'Amount & Date'),
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
    <VerticalHistoryScaffold<LegalLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل المكتب والعمليات القانونية', 'Historique Cabinet & Étude', 'Legal & Accounting History')}
      primaryAction={{
        label: l3('القضايا والعقود', 'Dossiers & Actes', 'Matters & Deeds'),
        icon: <Scale size={16} />,
        onClick: () => setScreen('members'),
      }}
      kpiHeading={l3('تدقيق القضايا والعقود والجلسات والمالية', 'Audit Dossiers, Répertoire, Audiences & Caisse', 'Matters, Deeds & Ledger Audit')}
      primaryCard={{
        label: l3('القضايا والعقود', 'Dossiers & Actes', 'Matters & Deeds'),
        badgeText: `${stats.mattersDeedsCount} dossiers`,
        count: stats.mattersDeedsCount,
        tone: 'emerald',
        isActive: statusFilter === 'matters_deeds',
        onToggle: () => setStatusFilter((p) => (p === 'matters_deeds' ? 'all' : 'matters_deeds')),
      }}
      secondaryCard={{
        label: l3('الجلسات والمحاسبة', 'Audiences, Caisse & SCF', 'Hearings & Ledger'),
        badgeText: `${stats.hearingsCashCount} écritures`,
        count: stats.hearingsCashCount,
        tone: 'terracotta',
        isActive: statusFilter === 'hearings_cash',
        onToggle: () => setStatusFilter((p) => (p === 'hearings_cash' ? 'all' : 'hearings_cash')),
      }}
      darkCard={{
        label: l3('الأتعاب المحصلة', 'Encaissements Honoraires', 'Fees Collected'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('قيود', 'actes', 'entries'),
        valuePrefix: '',
        valueCount: stats.totalCollected,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Cabinet'} · CPCA & SCF`,
      }}
      podTitle={l3('سجل النشاط القانوني والمحاسبي', 'Registre Juridique, Notarial & SCF', 'Legal & Accounting Audit Log')}
      searchPlaceholder={l3('بحث برقم الملف، الموكل، العقد...', 'Rechercher dossier, répertoire, client, SCF...', 'Search matter #, client, deed...')}
      vertical="legal_accounting"
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
        { value: 'matters_deeds', label: l3('القضايا والعقود', 'Dossiers & Actes', 'Matters & Deeds'), count: stats.mattersDeedsCount },
        { value: 'hearings_cash', label: l3('الجلسات والمالية', 'Audiences & Caisse', 'Hearings & Cash'), count: stats.hearingsCashCount },
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
        subline: `${it.kindLabel} · ${it.refNumber} · ${it.partyOrCourt}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'matters_deeds' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.refNumber,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('المرجع', 'N° Réf', 'Ref'), primaryText: it.refNumber, secondaryText: it.kindLabel },
        detailCol2: { heading: l3('الموكل / الجهة', 'Client / Juridiction', 'Party / Court'), primaryText: it.partyOrCourt, secondaryText: it.title },
        detailCol3: { heading: l3('المبلغ', 'Montant', 'Amount'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('المكتب', 'Cabinet / Étude', 'Office'),
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
          `atrium-legal-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Ref #', 'Title', 'Party/Court', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.refNumber, i.title, i.partyOrCourt, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('قيود', 'actes', 'entries')}
      emptyTitle={l3('لا توجد قيود قانونية', 'Aucun historique juridique', 'No legal history yet')}
      emptyDescription={l3('ستظهر القضايا والعقود والجلسات والمالية هنا', 'Les dossiers, actes notariés, audiences et reçus apparaîtront ici.', 'Matters, notary deeds, hearings, and cash receipts appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.title,
        subtitle: (it) => `${it.kindLabel} · ${it.refNumber}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('ملخص القيد القانوني', 'Détails Acte', 'Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('المرجع', 'Numéro', 'Number')} value={it.refNumber} mono />
              <InspectorKeyValue label={l3('الموضوع', 'Objet', 'Subject')} value={it.title} />
              <InspectorKeyValue label={l3('المعني', 'Parties / Juridiction', 'Party / Court')} value={it.partyOrCourt} />
              <InspectorKeyValue label={l3('المبلغ', 'Montant', 'Amount')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});

import React, { useMemo, useState } from 'react';
import { History, Stethoscope, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useMedicalData } from './medicalData';
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

interface MedicalLedgerItem {
  id: string;
  group: 'consultations' | 'rx_chifa';
  kindLabel: string;
  patientName: string;
  doctorOrRef: string;
  codeText: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const MedicalHistoryView: React.FC = React.memo(() => {
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
  const { consultations, prescriptions, chifaClaims } = useMedicalData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<MedicalLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<MedicalLedgerItem[]>(() => {
    const out: MedicalLedgerItem[] = [];
    (consultations || []).forEach((c) => {
      out.push({
        id: `con_${c.id}`,
        group: 'consultations',
        kindLabel: l3('فحص طبي', 'Consultation', 'Consultation'),
        patientName: c.patientName,
        doctorOrRef: c.doctorName || 'Médecin',
        codeText: `${c.ngapCode || 'CS'} · ${c.ticketNumber || c.id.slice(0, 6)}`,
        amountDzd: c.consultationFeeDzd || 0,
        status: c.isPaid ? l3('مدفوع', 'Réglé', 'Paid') : c.status,
        dateStr: c.consultationDate || c.createdAt,
        branchId: c.branchId,
      });
    });
    (prescriptions || []).forEach((rx) => {
      out.push({
        id: `rx_${rx.id}`,
        group: 'rx_chifa',
        kindLabel: l3('وصفة طبية', 'Ordonnance', 'Prescription'),
        patientName: rx.patientName,
        doctorOrRef: rx.prescribingDoctorName || rx.doctorName || 'Prescripteur',
        codeText: `${rx.items.length} ${l3('أدوية', 'médicaments', 'items')}`,
        amountDzd: 0,
        status: rx.isSigned ? l3('موقعة', 'Signée', 'Signed') : l3('مسودة', 'Brouillon', 'Draft'),
        dateStr: rx.prescriptionDate || rx.createdAt || new Date().toISOString(),
        branchId: rx.branchId,
      });
    });
    (chifaClaims || []).forEach((ch) => {
      out.push({
        id: `ch_${ch.id}`,
        group: 'rx_chifa',
        kindLabel: l3('ملف الشفاء', 'Bordereau Chifa', 'Chifa Claim'),
        patientName: ch.patientName,
        doctorOrRef: ch.chifaNumber,
        codeText: `${ch.ngapCode} · ${ch.claimNumber || ch.bordereauNumber || 'CNAS'}`,
        amountDzd: ch.chifaShareDzd ?? ch.cnasShareDzd ?? ch.totalAmountDzd,
        status: ch.status || 'Submitted',
        dateStr: ch.submissionDate || ch.claimDate || new Date().toISOString(),
      });
    });
    return out;
  }, [consultations, prescriptions, chifaClaims, isAr, isEn]);

  const stats = useMemo(() => {
    const consultCount = allItems.filter((i) => i.group === 'consultations').length;
    const rxChifaCount = allItems.filter((i) => i.group === 'rx_chifa').length;
    const revenueDzd = (consultations || []).reduce((s, c) => s + (c.consultationFeeDzd || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      consultCount,
      rxChifaCount,
      revenueDzd,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, consultations, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'consultations' && it.group !== 'consultations') return false;
      if (statusFilter === 'rx_chifa' && it.group !== 'rx_chifa') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.patientName} ${it.doctorOrRef} ${it.codeText} ${it.kindLabel}`.toLowerCase();
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
      if (sortBy === 'patient') return a.patientName.localeCompare(b.patientName) * sign;
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<MedicalLedgerItem>[]>(
    () => [
      {
        key: 'patient',
        header: l3('المريض والعملية', 'Patient & Acte', 'Patient & Act'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.patientName}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.codeText}</span>
          </div>
        ),
      },
      {
        key: 'doctor',
        header: l3('الطبيب / المرجع', 'Praticien / N° Chifa', 'Practitioner / Ref'),
        renderCell: (it) => <span className="t-small text-black/80 dark:text-white/80 truncate block">{it.doctorOrRef}</span>,
      },
      {
        key: 'amount',
        header: l3('التعريفة والتاريخ', 'Honoraire & Date', 'Fee & Date'),
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
    <VerticalHistoryScaffold<MedicalLedgerItem>
      icon={<History size={22} />}
      title={l3('السجل الطبي والعيادة', 'Historique Clinique Médicale', 'Medical Clinic History')}
      primaryAction={{
        label: l3('الانتظار الطبي', 'Salle d’Attente', 'Queue'),
        icon: <Stethoscope size={16} />,
        onClick: () => setScreen('scheduler'),
      }}
      kpiHeading={l3('تدقيق الفحوصات والوصفات والشفاء', 'Audit Consultations, Ordonnances & Chifa', 'Clinical & Chifa Audit')}
      primaryCard={{
        label: l3('الفحوصات الطبية', 'Consultations NGAP', 'Consultations'),
        badgeText: `${stats.consultCount} actes`,
        count: stats.consultCount,
        tone: 'emerald',
        isActive: statusFilter === 'consultations',
        onToggle: () => setStatusFilter((p) => (p === 'consultations' ? 'all' : 'consultations')),
      }}
      secondaryCard={{
        label: l3('الوصفات والشفاء', 'Ordonnances & Chifa', 'Rx & Chifa'),
        badgeText: `${stats.rxChifaCount} dossiers`,
        count: stats.rxChifaCount,
        tone: 'terracotta',
        isActive: statusFilter === 'rx_chifa',
        onToggle: () => setStatusFilter((p) => (p === 'rx_chifa' ? 'all' : 'rx_chifa')),
      }}
      darkCard={{
        label: l3('إجمالي أتعاب الفحوصات', 'Honoraires Consultations', 'Consultation Fees'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'actes', 'records'),
        valuePrefix: '',
        valueCount: stats.revenueDzd,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Clinique'} · NGAP & CNAS`,
      }}
      podTitle={l3('السجل السريري للعيادة', 'Registre des Actes Cliniques', 'Clinical Activity Ledger')}
      searchPlaceholder={l3('بحث عن مريض، طبيب، رقم الشفاء...', 'Rechercher patient, praticien, NGAP, Chifa...', 'Search patient, doctor, Chifa...')}
      vertical="medical_clinic"
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
        { value: 'consultations', label: l3('الفحوصات', 'Consultations', 'Consultations'), count: stats.consultCount },
        { value: 'rx_chifa', label: l3('الوصفات والشفاء', 'Ordonnances & Chifa', 'Rx & Chifa'), count: stats.rxChifaCount },
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
        title: it.patientName,
        subline: `${it.kindLabel} · ${it.codeText} · ${it.doctorOrRef}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'consultations' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.codeText,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('المريض', 'Patient', 'Patient'), primaryText: it.patientName, secondaryText: it.kindLabel },
        detailCol2: { heading: l3('الطبيب / الشفاء', 'Praticien / Chifa', 'Doctor / Ref'), primaryText: it.doctorOrRef, secondaryText: it.codeText },
        detailCol3: { heading: l3('الأتعاب', 'Tarif', 'Fee'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('الفرع', 'Cabinet / Site', 'Site'),
              value: branchFilter,
              onChange: setBranchFilter,
              kind: 'tiles',
              columns: 2,
              options: [{ value: 'All', label: l3('كل الفروع', 'Tous', 'All Sites'), count: allItems.length }, ...stats.branchOptions],
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
          `atrium-medical-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Patient', 'Doctor/Ref', 'Code', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.patientName, i.doctorOrRef, i.codeText, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'actes', 'records')}
      emptyTitle={l3('لا توجد سجلات طبية', 'Aucun acte clinique trouvé', 'No clinic history yet')}
      emptyDescription={l3('ستظهر الفحوصات والوصفات وملفات الشفاء هنا', 'Les consultations, ordonnances et dossiers Chifa apparaîtront ici.', 'Consultations, prescriptions, and Chifa claims appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.patientName,
        subtitle: (it) => `${it.kindLabel} · ${it.codeText}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('ملخص السجل الطبي', 'Détails Acte Médical', 'Clinical Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('المريض', 'Patient', 'Patient')} value={it.patientName} />
              <InspectorKeyValue label={l3('الطبيب / الرقم', 'Praticien / N° Chifa', 'Practitioner / Chifa')} value={it.doctorOrRef} />
              <InspectorKeyValue label={l3('الرمز', 'Code NGAP / Réf', 'Code / Ref')} value={it.codeText} mono />
              <InspectorKeyValue label={l3('المبلغ', 'Montant', 'Amount')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});

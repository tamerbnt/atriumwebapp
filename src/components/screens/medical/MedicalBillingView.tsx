import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Printer,
  ArrowRight,
  DollarSign,
  Activity,
  Download,
  Pin,
  X,
  FileText,
  UserCheck,
  Building2,
  Receipt,
  Users,
  Wallet,
  Clock,
  Send,
  AlertCircle,
  Plus,
  Coins,
  Check,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation, ChifaClaimRecord, DailyCashClosure } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const MedicalBillingView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    consultations,
    markConsultationPaid,
    practitioners,
    chifaClaims,
    addChifaClaim,
    dailyClosures,
    addDailyClosure,
    consumables,
    restockConsumable,
    depleteConsumable,
  } = useMedicalData();

  // Primary Operational Tab Switcher
  const [billingMainTab, setBillingMainTab] = useState<'invoices' | 'bordereau' | 'honoraires' | 'caisse' | 'consumables'>('invoices');

  // Factures Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('consultationDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['cons_02']));
  const [selectedConsultation, setSelectedConsultation] = useState<MedicalConsultation | null>(() => consultations[0] || null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'decompte' | 'tiers_payant' | 'actions'>('decompte');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Dahabia' | 'BaridiMob'>('Cash');

  // Daily Cash Closure Input State
  const [countedCash, setCountedCash] = useState<string>('24500');
  const [closureNotes, setClosureNotes] = useState<string>('Caisse journalière équilibrée. Aucune anomalie constatée.');

  // Filtered & Sorted Consultations
  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.patientName.toLowerCase().includes(q) ||
        c.chiefComplaint.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === 'paid') return c.isPaid;
      if (statusFilter === 'pending') return !c.isPaid;
      return true;
    });
  }, [consultations, searchQuery, statusFilter]);

  const sortedConsultations = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortBy === 'consultationFeeDzd') {
        return sortDir === 'asc'
          ? a.consultationFeeDzd - b.consultationFeeDzd
          : b.consultationFeeDzd - a.consultationFeeDzd;
      }
      if (sortBy === 'patientName') {
        return sortDir === 'asc'
          ? a.patientName.localeCompare(b.patientName)
          : b.patientName.localeCompare(a.patientName);
      }
      return sortDir === 'asc'
        ? a.consultationDate.localeCompare(b.consultationDate)
        : b.consultationDate.localeCompare(a.consultationDate);
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir]);

  // Aggregate Totals
  const totalFee = consultations.reduce((acc, c) => acc + c.consultationFeeDzd, 0);
  const totalPaid = consultations.reduce((acc, c) => acc + (c.isPaid ? c.consultationFeeDzd : 0), 0);
  const totalInsurance = consultations.reduce((acc, c) => acc + c.insuranceShareDzd, 0);
  const expectedCashTotal = consultations
    .filter((c) => c.isPaid)
    .reduce((acc, c) => acc + (c.copayAmountDzd || c.consultationFeeDzd * 0.2), 0);

  // Bordereau CNAS Aggregates
  const totalClaimsCount = chifaClaims.length;
  const totalCnasShare = chifaClaims.reduce((acc, cl) => acc + (cl.cnasShareDzd ?? cl.chifaShareDzd ?? 0), 0);
  const totalTicketModerateur = chifaClaims.reduce((acc, cl) => acc + (cl.ticketModerateurDzd ?? cl.copayPaidDzd ?? 0), 0);
  const transmittedCount = chifaClaims.filter((cl) => cl.isTransmitted ?? (cl.status === 'Submitted')).length;

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    showToast(isAr ? 'تم تحديث التثبيت' : 'Statut épinglé mis à jour', 'info');
  };

  const handlePay = (c: MedicalConsultation) => {
    markConsultationPaid(c.id);
    setSelectedConsultation({ ...c, isPaid: true });
    showToast(isAr ? 'تم تسجيل الدفع وإصدار المخالصة' : 'Paiement enregistré & quittance validée', 'success');
  };

  const handlePrintReceipt = (c: MedicalConsultation) => {
    showToast(isAr ? 'جاري طباعة إيصال الدفع...' : 'Génération de la quittance médicale...', 'info');
    window.print();
  };

  const handleTransmitBordereau = () => {
    showToast(
      isAr
        ? 'تم إرسال الجدول الإلكتروني للضمان الاجتماعي CNAS بنجاح'
        : 'Télétransmission du bordereau CNAS/Chifa réussie avec accusé de réception',
      'success'
    );
  };

  const handleSaveCashClosure = () => {
    const counted = parseFloat(countedCash) || 0;
    const diff = counted - expectedCashTotal;
    const closure: DailyCashClosure = {
      id: `closure_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      closedBySecretary: 'Secrétariat Principal (Rania M.)',
      totalConsultationsCount: consultations.length,
      expectedCashDzd: expectedCashTotal,
      countedCashDzd: counted,
      discrepancyDzd: diff,
      notes: closureNotes,
      verifiedAt: new Date().toLocaleTimeString(),
    };
    addDailyClosure(closure);
    showToast(
      isAr ? 'تم إغلاق الصندوق اليومي وحفظ تقرير الكاسة' : 'Clôture de caisse validée et consignée',
      'success'
    );
  };

  const columns: ColumnDefinition<MedicalConsultation>[] = [
    {
      key: 'patientName',
      header: isAr ? 'المريض / الفحص' : 'Patient & Acte Médical',
      sortable: true,
      minWidth: '220px',
      renderCell: (c) => {
        const isPinned = pinnedIds.has(c.id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-neutral-800">
              <Receipt size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                {c.patientName}
                {isPinned && <span className="text-xs text-amber-500">📌</span>}
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                {c.ticketNumber ? `Ticket: ${c.ticketNumber} · ` : ''}{c.ngapCode || 'C'} · {c.consultationDate.split('T')[0]}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'consultationFeeDzd',
      header: isAr ? 'الأتعاب الإجمالية' : 'Total Honoraires',
      sortable: true,
      minWidth: '130px',
      renderCell: (c) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(c.consultationFeeDzd, 'DZD')}
        </div>
      ),
    },
    {
      key: 'copayAmountDzd',
      header: isAr ? 'حصة المريض (Ticket)' : 'Part Patient (TM)',
      minWidth: '140px',
      renderCell: (c) => (
        <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
          {formatMoney(c.copayAmountDzd || 0, 'DZD')}
        </div>
      ),
    },
    {
      key: 'insuranceShareDzd',
      header: isAr ? 'تغطية Chifa' : 'Tiers Payant Chifa',
      minWidth: '130px',
      renderCell: (c) => (
        <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
          {formatMoney(c.insuranceShareDzd || 0, 'DZD')}
        </div>
      ),
    },
    {
      key: 'isPaid',
      header: isAr ? 'حالة التحصيل' : 'Statut Recouvrement',
      sortable: true,
      minWidth: '120px',
      renderCell: (c) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            c.isPaid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {c.isPaid ? (isAr ? 'مدفوع' : 'Encaissé') : (isAr ? 'معلق' : 'En attente')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'المالية الطبية والضمان الاجتماعي (Chifa / CNAS)' : 'Facturation Polyclinique & Tiers Payant Chifa'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                CNAS / CASNOS
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تحصيل أتعاب الفحص الطبي، مستحقات الصندوق، نسب الأطباء والإغلاق اليومي للكاسة'
                : 'Ticket modérateur, bordereaux Chifa télétransmis, honoraires praticiens & clôture de caisse'}
            </p>
          </div>
        </div>

        {/* Operational View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800 border border-[#EDF1F3] dark:border-neutral-700/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setBillingMainTab('invoices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              billingMainTab === 'invoices'
                ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            {isAr ? 'الفواتير والتحصيل' : 'Factures & Tiers-Payant'}
          </button>
          <button
            type="button"
            onClick={() => setBillingMainTab('bordereau')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              billingMainTab === 'bordereau'
                ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            {isAr ? 'جدول CNAS' : 'Bordereau CNAS'}
          </button>
          <button
            type="button"
            onClick={() => setBillingMainTab('honoraires')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              billingMainTab === 'honoraires'
                ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            {isAr ? 'أتعاب الأطباء' : 'Honoraires Praticiens'}
          </button>
          <button
            type="button"
            onClick={() => setBillingMainTab('caisse')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              billingMainTab === 'caisse'
                ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            {isAr ? 'إغلاق الصندوق' : 'Clôture de Caisse'}
          </button>
          <button
            type="button"
            onClick={() => setBillingMainTab('consumables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              billingMainTab === 'consumables'
                ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            {isAr ? 'المستهلكات والمخزون' : 'Consommables & Stock'}
          </button>
        </div>
      </div>

      {/* KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات التحصيل الطبي والتأمين' : 'Indicateurs de Recouvrement & Tiers-Payant'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'توزيع الأتعاب بين التغطية التأمينية والتحصيل الفوري' : 'Répartition des honoraires conventionnés et encaissements patients'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الأتعاب المقررة' : 'Volume d\'Honoraires Total'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalFee, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {consultations.length} {isAr ? 'فحص مسجل' : 'actes facturés'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'حصة التأمين الصحي (Chifa)' : 'Prise en Charge CNAS/CASNOS'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalInsurance, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'بانتظار التحويل البنكي للصندوق' : 'Bordereaux en cours de télétransmission'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'المتحصلات الفعلية' : 'Encaissements Encaissés'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                RECOUVREMENT
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {formatMoney(totalPaid, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span>Reste à percevoir: {formatMoney(totalFee - totalPaid, 'DZD')}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: Factures & Tiers Payant Collection */}
      {billingMainTab === 'invoices' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          {/* Table Control Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-neutral-500" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'دفتر الفواتير والتحصيل الطبي' : 'Journal de Facturation & Recouvrement'}
              </span>
              <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
                {sortedConsultations.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث برقم الفاتورة أو اسم المريض...' : 'Rechercher facture, patient...'}
                shutSize={36}
                openWidth={220}
              />

              <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
                {(
                  [
                    { id: 'all', label: isAr ? 'الكل' : 'Toutes' },
                    { id: 'paid', label: isAr ? 'تم التحصيل' : 'Encaissées' },
                    { id: 'pending', label: isAr ? 'قيد الانتظار' : 'En attente' },
                  ] as const
                ).map((filter) => {
                  const isActive = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      style={{
                        backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : '#71717A',
                      }}
                      className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                        isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Collection & Inspector */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <UniversalDataCollection<MedicalConsultation>
                items={sortedConsultations}
                keyExtractor={(c) => c.id}
                defaultViewMode={viewMode}
                columns={columns}
                sortBy={sortBy}
                sortDirection={sortDir}
                onSortChange={(key) => {
                  if (sortBy === key) {
                    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy(key);
                    setSortDir('asc');
                  }
                }}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                isPinned={(c) => pinnedIds.has(c.id)}
                onTogglePin={(c) => handleTogglePin(c.id)}
                onItemClick={(c) => setSelectedConsultation(c)}
                customActions={(c) => [
                  {
                    id: 'pay',
                    label: isAr ? 'تحصيل' : 'Encaisser',
                    icon: <CheckCircle2 size={13} />,
                    variant: 'primary',
                    disabled: c.isPaid,
                    onClick: () => handlePay(c),
                  },
                  {
                    id: 'print',
                    label: isAr ? 'إيصال' : 'Quittance',
                    icon: <Printer size={13} />,
                    onClick: () => handlePrintReceipt(c),
                  },
                ]}
                renderCard={(c) => {
                  const isPinned = pinnedIds.has(c.id);
                  return (
                    <div className="flex flex-col w-full space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {c.patientName} {isPinned && '📌'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {c.isPaid ? 'Encaissé' : 'En attente'}
                        </span>
                      </div>

                      <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                          <span>Total:</span>
                          <span className="font-mono font-bold text-neutral-900 dark:text-white">
                            {formatMoney(c.consultationFeeDzd, 'DZD')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-neutral-500">
                          <span>Part Chifa:</span>
                          <span className="font-mono text-blue-600 font-semibold">
                            {formatMoney(c.insuranceShareDzd || 0, 'DZD')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-neutral-500">
                          <span>Part Patient:</span>
                          <span className="font-mono text-neutral-800 dark:text-neutral-200">
                            {formatMoney(c.copayAmountDzd || 0, 'DZD')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                        <span>{c.consultationDate.split('T')[0]}</span>
                        <span className="font-mono">{c.ngapCode || 'C'}</span>
                      </div>
                    </div>
                  );
                }}
                emptyTitle={isAr ? 'لا توجد فواتير' : 'Aucune consultation facturée'}
                emptyDescription={isAr ? 'تظهر الفواتير بمجرد إتمام الفحص' : 'Les consultations terminées apparaissent automatiquement dans ce journal'}
              />
            </div>

            {/* Side Inspector Drawer */}
            {selectedConsultation && (
              <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-200/60">
                      <Receipt size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                        {selectedConsultation.patientName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <span className="font-mono">Réf: {selectedConsultation.id}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedConsultation(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveInspectorTab('decompte')}
                    className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeInspectorTab === 'decompte'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {isAr ? 'البيان المالي' : 'Décompte'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInspectorTab('tiers_payant')}
                    className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeInspectorTab === 'tiers_payant'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {isAr ? 'الشفاء Chifa' : 'Chifa & NGAP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInspectorTab('actions')}
                    className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeInspectorTab === 'actions'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {isAr ? 'الإجراءات' : 'Actions'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {activeInspectorTab === 'decompte' && (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                        <div className="flex justify-between items-center text-neutral-500">
                          <span>Montant Total Acte:</span>
                          <span className="font-bold text-neutral-900 dark:text-white font-mono">
                            {formatMoney(selectedConsultation.consultationFeeDzd, 'DZD')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-neutral-500">
                          <span>Ticket Modérateur (Part Patient):</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
                            {formatMoney(selectedConsultation.copayAmountDzd || 600, 'DZD')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                          <span>Prise en charge CNAS/CASNOS:</span>
                          <span className="font-semibold font-mono">
                            {formatMoney(selectedConsultation.insuranceShareDzd || 2400, 'DZD')}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center font-bold">
                          <span>Statut d'encaissement:</span>
                          <span className={selectedConsultation.isPaid ? 'text-emerald-600' : 'text-amber-600'}>
                            {selectedConsultation.isPaid ? 'Règlement effectué ✓' : 'Solde débiteur'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          Mode d'encaissement
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Cash', 'Dahabia', 'BaridiMob'] as const).map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`py-2 px-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${
                                paymentMethod === method
                                  ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      {!selectedConsultation.isPaid && (
                        <AtriumButton
                          variant="primary"
                          onClick={() => handlePay(selectedConsultation)}
                          className="w-full justify-center"
                          icon={<CheckCircle2 size={14} />}
                        >
                          Encaisser via {paymentMethod}
                        </AtriumButton>
                      )}
                    </div>
                  )}

                  {activeInspectorTab === 'tiers_payant' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                          <ShieldCheck size={16} />
                          <span>Convention Tiers-Payant Chifa</span>
                        </div>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400">
                          Télétransmission dématérialisée conforme au protocole CNAS Algérie.
                        </p>
                      </div>

                      <div className="space-y-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Cotation NGAP:</span>
                          <span className="text-neutral-800 dark:text-neutral-200 font-bold">
                            {selectedConsultation.ngapCode || 'C (Médecine Générale)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Numéro Ticket Triage:</span>
                          <span className="text-neutral-800 dark:text-neutral-200 font-bold">
                            {selectedConsultation.ticketNumber || 'T-102'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Taux de couverture:</span>
                          <span className="text-emerald-600 font-bold">
                            {selectedConsultation.copayAmountDzd === 0 ? '100% (ALD Exonéré)' : '80% Régime Standard'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeInspectorTab === 'actions' && (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(selectedConsultation)}
                        className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Printer size={16} />
                          Imprimer quittance patient
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(selectedConsultation.id)}
                        className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Pin size={16} />
                          {pinnedIds.has(selectedConsultation.id) ? 'Détacher' : 'Épingler la facture'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Bordereau CNAS / Télétransmission Chifa */}
      {billingMainTab === 'bordereau' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                <span>Bordereau Mensuel de Télétransmission Chifa / CNAS</span>
              </h2>
              <p className="text-[11px] text-neutral-500">
                Période: Mai 2026 · Bordereau N° BOR-2026-05-ALGER · Centre de Paiement CNAS 1601
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  showToast('Export du bordereau officiel CNAS au format PDF réglementaire', 'info');
                  window.print();
                }}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <Download size={13} />
                <span>Exporter PDF CNAS</span>
              </button>
              <AtriumButton
                variant="primary"
                size="md"
                icon={<Send size={14} />}
                onClick={handleTransmitBordereau}
              >
                <span>Télétransmettre à la CNAS</span>
              </AtriumButton>
            </div>
          </div>

          {/* Bordereau Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Total Fiches Chifa</span>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
                {totalClaimsCount} dossiers
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">{transmittedCount} télétransmis</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Total Honoraires NGAP</span>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
                {formatMoney(totalClaimsCount * 2800, 'DZD')}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">Tarifs conventionnels</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Créance Due par la CNAS</span>
              <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {formatMoney(totalCnasShare, 'DZD')}
              </div>
              <span className="text-[10px] text-blue-500 font-medium">À virer au compte polyclinique</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Ticket Modérateur Encaissé</span>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatMoney(totalTicketModerateur, 'DZD')}
              </div>
              <span className="text-[10px] text-neutral-500">Payé par les assurés</span>
            </div>
          </div>

          {/* Bordereau Claims Table */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 font-semibold text-[11px]">
                  <tr>
                    <th className="p-3">N° Dossier</th>
                    <th className="p-3">Assuré(e) / Patient</th>
                    <th className="p-3">N° Carte Chifa</th>
                    <th className="p-3">Cotation</th>
                    <th className="p-3">Taux Prise en Charge</th>
                    <th className="p-3 text-right">Part CNAS</th>
                    <th className="p-3 text-right">Ticket Modérateur</th>
                    <th className="p-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 font-mono">
                  {chifaClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-750/30">
                      <td className="p-3 font-semibold text-neutral-900 dark:text-white">{claim.id}</td>
                      <td className="p-3 font-sans font-medium text-neutral-800 dark:text-neutral-200">{claim.patientName}</td>
                      <td className="p-3 text-neutral-500">{claim.chifaNumber}</td>
                      <td className="p-3 text-[#C4785A] font-bold">{claim.ngapCode}</td>
                      <td className="p-3 font-sans">
                        {(() => {
                          const rate = claim.coverageRate ?? claim.chifaCoveragePercent ?? 80;
                          return (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rate === 100
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {rate}% {rate === 100 ? '(ALD 100%)' : '(80%)'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-right text-blue-600 font-bold">
                        {formatMoney(claim.cnasShareDzd ?? claim.chifaShareDzd ?? 0, 'DZD')}
                      </td>
                      <td className="p-3 text-right text-neutral-700 dark:text-neutral-300">
                        {formatMoney(claim.ticketModerateurDzd ?? claim.copayPaidDzd ?? 0, 'DZD')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          (claim.isTransmitted ?? (claim.status === 'Submitted'))
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {(claim.isTransmitted ?? (claim.status === 'Submitted')) ? 'Transmis ✓' : 'Prêt à l\'envoi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Honoraires Médecins (Doctor Commission Breakdown) */}
      {billingMainTab === 'honoraires' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-[#C4785A]" />
                <span>Rétrocession des Honoraires Médicaux & Quotes-parts Polyclinique</span>
              </h2>
              <p className="text-[11px] text-neutral-500">
                Calcul automatisé des commissions par praticien selon convention d'exercice libéral
              </p>
            </div>

            <button
              type="button"
              onClick={() => showToast('Exportation du rapport de rétrocession pour la comptabilité', 'info')}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Download size={13} />
              <span>Bordereau Comptable (Excel)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {practitioners.map((doc) => {
              // Estimate doctor gross from total fees
              const docShare = doc.commissionPercent || 70;
              const grossTurnover = 125000;
              const doctorPayout = (grossTurnover * docShare) / 100;
              const polyclinicRetention = grossTurnover - doctorPayout;

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-neutral-900 dark:text-white">{doc.name}</h3>
                      <p className="text-[11px] text-neutral-400">{doc.specialty}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#C4785A] font-bold text-[10px] font-mono border border-orange-200/50">
                      {docShare}% Rétrocession
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-neutral-500">
                      <span>Chiffre d'affaires brut:</span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">{formatMoney(grossTurnover, 'DZD')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Net Médecin ({docShare}%):</span>
                      <span className="font-bold">{formatMoney(doctorPayout, 'DZD')}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Quote-part Polyclinique:</span>
                      <span>{formatMoney(polyclinicRetention, 'DZD')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-neutral-400 font-mono">Cabinet: {doc.cabinetRoom}</span>
                    <button
                      type="button"
                      onClick={() => showToast(`Virement généré pour ${doc.name}: ${formatMoney(doctorPayout, 'DZD')}`, 'success')}
                      className="px-2.5 py-1 rounded-lg bg-[#C4785A] text-white font-semibold text-[11px] shadow-2xs hover:bg-[#b3694c] transition-colors"
                    >
                      Émettre Règlement
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Clôture de Caisse Journalière (Secretary Cash Drawer) */}
      {billingMainTab === 'caisse' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Coins size={16} className="text-amber-500" />
                <span>Feuille de Caisse Journalière & Clôture Secrétariat</span>
              </h2>
              <p className="text-[11px] text-neutral-500">
                Pointage physique des espèces, tickets modérateurs et rapprochement automatique du tiroir-caisse
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cash Drawer Calculator Form */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-4 text-xs">
              <h3 className="font-bold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Comptage Physique du Tiroir Caisse (Aujourd'hui)
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Espèces Attendues (Système)</span>
                  <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {formatMoney(expectedCashTotal, 'DZD')}
                  </div>
                  <span className="text-[10px] text-neutral-500">Base tickets modérateurs encaissés</span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">
                    Espèces Comptées Physiquement (DZD)
                  </label>
                  <input
                    type="number"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold text-base text-neutral-900 dark:text-white"
                  />
                  {(() => {
                    const counted = parseFloat(countedCash) || 0;
                    const diff = counted - expectedCashTotal;
                    return (
                      <span className={`text-[10px] font-bold block mt-1 ${diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        Écart: {diff >= 0 ? `+${diff}` : diff} DZD {diff === 0 ? '(Caisse Juste ✓)' : diff > 0 ? '(Excédent)' : '(Déficit de caisse)'}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                  Observations et Justificatifs
                </label>
                <textarea
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <AtriumButton
                  variant="primary"
                  size="md"
                  icon={<Check size={14} />}
                  onClick={handleSaveCashClosure}
                >
                  <span>Valider & Signer la Clôture de Caisse</span>
                </AtriumButton>
              </div>
            </div>

            {/* Historical Closures List */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3 text-xs">
              <h3 className="font-bold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Historique des Clôtures de Caisse
              </h3>

              <div className="space-y-2">
                {dailyClosures.map((cl: DailyCashClosure) => (
                  <div
                    key={cl.id}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 dark:text-white font-mono">{cl.date}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{cl.verifiedAt || '17:30'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                      <span>Compté: {formatMoney(cl.countedCashDzd ?? cl.actualCashInDrawerDzd ?? 0, 'DZD')}</span>
                      <span className={cl.discrepancyDzd === 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        Écart: {cl.discrepancyDzd >= 0 ? `+${cl.discrepancyDzd}` : cl.discrepancyDzd} DZD
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 italic">
                      "{cl.notes || 'Clôture normale'}" — {cl.closedBySecretary || cl.closedByStaffName || 'Secrétariat'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Consommables & Stock Médical */}
      {billingMainTab === 'consumables' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} className="text-[#C4785A]" />
                <span>{isAr ? 'المخزون والمستهلكات السريرية' : 'Pharmacie Interne & Consommables de Soins'}</span>
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? 'متابعة حية لاستهلاك القفازات، الحقن، المحاليل والمستلزمات الطبية مع الإنذار المبكر'
                  : 'Niveaux de stock temps réel, auto-décrémentation par consultation/acte et alertes de réapprovisionnement'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                {consumables.length} {isAr ? 'عنصر مراقب' : 'fournitures tracées'}
              </span>
            </div>
          </div>

          {/* Consumables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consumables.map((item) => {
              const currentStock = item.currentStockUnits ?? item.currentStock ?? 0;
              const threshold = item.reorderThresholdUnits ?? item.minStockAlert ?? 10;
              const isCritical = currentStock <= threshold;
              const code = item.itemCode ?? item.id;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-white dark:bg-neutral-800 border flex flex-col justify-between shadow-2xs space-y-3 transition-all ${
                    isCritical
                      ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold">
                        {code} · {item.category}
                      </span>
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white mt-0.5">
                        {item.name}
                      </h4>
                    </div>
                    {isCritical ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                        Seuil Critique
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Stock Optimal
                      </span>
                    )}
                  </div>

                  {/* Stock Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Stock Actuel</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-xl font-bold font-mono ${isCritical ? 'text-rose-600' : 'text-neutral-900 dark:text-white'}`}>
                          {currentStock}
                        </span>
                        <span className="text-[10px] text-neutral-400">{item.unit}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Seuil d'Alerte</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-bold font-mono text-neutral-500">
                          {threshold}
                        </span>
                        <span className="text-[10px] text-neutral-400">{item.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Bar */}
                  <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isCritical ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{
                        width: `${Math.min(100, Math.max(8, (currentStock / (threshold * 2.5)) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        depleteConsumable(code, 1);
                        showToast(`-1 ${item.unit} déduit pour ${item.name}`, 'info');
                      }}
                      className="px-2 py-1 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      title="Déduire manuellement pour un acte"
                    >
                      -1 Unité
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        restockConsumable(code, 50);
                        showToast(`+50 ${item.unit} réapprovisionnés pour ${item.name}`, 'success');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#C4785A] hover:bg-[#b3684a] text-white shadow-2xs transition-colors"
                    >
                      +50 Réapprovisionner
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

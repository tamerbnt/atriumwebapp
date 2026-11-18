import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Pin,
  Printer,
  CreditCard,
} from 'lucide-react';
import {
  StaffMember,
  StaffSalaryAdvance,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
} from '../../../types/index';
import { AtriumButton } from '../../ui/AtriumButton';
import { PayslipPrintModal } from './PayslipPrintModal';
import { SalaryAdvanceModal } from './SalaryAdvanceModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  extractInitials,
  computeInitialsColor,
} from '../../ui/kinetic';

interface StaffPayrollSubViewProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  payrollSlips: StaffPayrollSlipRecord[];
  salaryAdvances: StaffSalaryAdvance[];
  onGeneratePayroll: (month: number, year: number) => void;
  onApprovePayroll: (runId: string) => void;
  onMarkSlipPaid: (slipId: string) => void;
  onCreateAdvance: (data: {
    staffId: string;
    staffName: string;
    amountDzd: number;
    paymentMethod: 'cash' | 'ccp' | 'bank_transfer';
    reason?: string;
  }) => void;
  language: string;
}

export const StaffPayrollSubView: React.FC<StaffPayrollSubViewProps> = ({
  staffList,
  payrollRuns,
  payrollSlips,
  salaryAdvances,
  onGeneratePayroll,
  onApprovePayroll,
  onMarkSlipPaid,
  onCreateAdvance,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [selectedSlip, setSelectedSlip] = useState<StaffPayrollSlipRecord | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [activeSlipForPrint, setActiveSlipForPrint] = useState<StaffPayrollSlipRecord | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  const months = [
    { value: 1, label: isAr ? 'جانفي' : isEn ? 'January' : 'Janvier' },
    { value: 2, label: isAr ? 'فيفري' : isEn ? 'February' : 'Février' },
    { value: 3, label: isAr ? 'مارس' : isEn ? 'March' : 'Mars' },
    { value: 4, label: isAr ? 'أفريل' : isEn ? 'April' : 'Avril' },
    { value: 5, label: isAr ? 'ماي' : isEn ? 'May' : 'Mai' },
    { value: 6, label: isAr ? 'جوان' : isEn ? 'June' : 'Juin' },
    { value: 7, label: isAr ? 'جويلية' : isEn ? 'July' : 'Juillet' },
    { value: 8, label: isAr ? 'أوت' : isEn ? 'August' : 'Août' },
    { value: 9, label: isAr ? 'سبتمبر' : isEn ? 'September' : 'Septembre' },
    { value: 10, label: isAr ? 'أكتوبر' : isEn ? 'October' : 'Octobre' },
    { value: 11, label: isAr ? 'نوفمبر' : isEn ? 'November' : 'Novembre' },
    { value: 12, label: isAr ? 'ديسمبر' : isEn ? 'December' : 'Décembre' },
  ];

  const activeRun = useMemo(() => {
    return payrollRuns.find((r) => r.periodMonth === selectedMonth && r.periodYear === selectedYear);
  }, [payrollRuns, selectedMonth, selectedYear]);

  const activeSlips = useMemo(() => {
    return payrollSlips.filter((s) => s.periodMonth === selectedMonth && s.periodYear === selectedYear);
  }, [payrollSlips, selectedMonth, selectedYear]);

  const filteredSlips = useMemo(() => {
    const list = activeSlips.filter((s) => {
      if (paidFilter === 'paid' && !s.isPaid) return false;
      if (paidFilter === 'pending' && s.isPaid) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.staffFullName.toLowerCase().includes(q) ||
          (s.matricule || '').toLowerCase().includes(q) ||
          (s.role || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.staffFullName.localeCompare(b.staffFullName);
    });
  }, [activeSlips, paidFilter, searchQuery, pinnedIds]);

  const totalNet = useMemo(() => activeSlips.reduce((sum, s) => sum + s.netAPayer, 0), [activeSlips]);
  const totalCnas = useMemo(() => activeSlips.reduce((sum, s) => sum + s.cnasSalarial + s.cnasPatronal, 0), [activeSlips]);
  const totalIrg = useMemo(() => activeSlips.reduce((sum, s) => sum + s.irgTax, 0), [activeSlips]);
  const totalAdvances = useMemo(() => activeSlips.reduce((sum, s) => sum + s.acomptesDeduits, 0), [activeSlips]);

  const handleGenerate = () => onGeneratePayroll(selectedMonth, selectedYear);
  const handleApprove = () => {
    if (activeRun) onApprovePayroll(activeRun.id);
  };

  const columns: ColumnDefinition<StaffPayrollSlipRecord>[] = useMemo(
    () => [
      {
        key: 'staffFullName',
        header: isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur',
        sortable: true,
        renderCell: (slip) => (
          <div>
            <div className="font-bold text-xs text-black dark:text-white">{slip.staffFullName}</div>
            <div className="text-[11px] font-mono text-black/62 dark:text-white/65">
              {slip.matricule} · {slip.role}
            </div>
          </div>
        ),
      },
      {
        key: 'paymentMethod',
        header: isAr ? 'طريقة الدفع' : isEn ? 'Method' : 'Mode',
        sortable: true,
        renderCell: (slip) => (
          <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#F3EDE7] dark:bg-[#262422] text-black/80 dark:text-white/85">
            {slip.paymentMethod}
          </span>
        ),
      },
      {
        key: 'isPaid',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        sortable: true,
        renderCell: (slip) => (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              slip.isPaid
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            }`}
          >
            {slip.isPaid ? (isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payé') : isAr ? 'معلق' : isEn ? 'Pending' : 'À Payer'}
          </span>
        ),
      },
      {
        key: 'netAPayer',
        header: isAr ? 'الصافي' : isEn ? 'Net Pay' : 'Net à Payer',
        sortable: true,
        renderCell: (slip) => (
          <span className="font-mono font-black text-xs text-[#d4522f] tabular-nums">
            {slip.netAPayer.toLocaleString()} DZD
          </span>
        ),
      },
    ],
    [isAr, isEn]
  );

  const getRowMeta = useCallback(
    (slip: StaffPayrollSlipRecord): Partial<KineticRowData> => {
      const primesNonImpTotal = slip.primesNonImposables?.reduce((s, p) => s + p.amount, 0) || 0;
      return {
        title: slip.staffFullName,
        subline: `${slip.matricule} · ${slip.role}`,
        avatarText: extractInitials(slip.staffFullName),
        avatarColor: computeInitialsColor(slip.staffFullName),
        categoryLabel: slip.paymentMethod.toUpperCase(),
        statusLabel: slip.isPaid ? (isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payé') : isAr ? 'قيد الدفع' : isEn ? 'Pending' : 'À Payer',
        statusVariant: slip.isPaid ? 'active' : 'warning',
        metricPrimary: `${slip.netAPayer.toLocaleString()} DZD`,
        metricSecondary: `${isAr ? 'إجمالي' : isEn ? 'Gross' : 'Brut'}: ${slip.salaireBrutCotisable.toLocaleString()} DZD`,
        detailCol1: {
          heading: isAr ? 'الراتب الأساسي والعلاوات' : isEn ? 'Base & Bonuses' : 'Salaire Base & Primes',
          primaryText: `${isAr ? 'الأساسي' : isEn ? 'Base' : 'Base'}: ${slip.baseSalary.toLocaleString()} DZD`,
          secondaryText: slip.coachingCommission
            ? `${isAr ? 'العلاوة' : isEn ? 'Commission' : 'Commission'}: +${slip.coachingCommission.toLocaleString()} DZD`
            : `${isAr ? 'البدلات' : isEn ? 'Allowances' : 'Indemnités'}: +${primesNonImpTotal.toLocaleString()} DZD`,
          tertiaryText: `${isAr ? 'إجمالي خاضع' : isEn ? 'Gross' : 'Brut cotisable'}: ${slip.salaireBrutCotisable.toLocaleString()} DZD`,
        },
        detailCol2: {
          heading: isAr ? 'الاقتطاعات القانونية' : isEn ? 'Statutory Deductions' : 'Retenues CNAS & IRG',
          primaryText: `CNAS (9%): -${slip.cnasSalarial.toLocaleString()} DZD`,
          secondaryText: `IRG: -${slip.irgTax.toLocaleString()} DZD`,
          tertiaryText: slip.acomptesDeduits > 0 ? `${isAr ? 'سلف مخصومة' : isEn ? 'Advances' : 'Acomptes'}: -${slip.acomptesDeduits.toLocaleString()} DZD` : isAr ? 'بدون سلفيات' : isEn ? 'No advances' : 'Aucun acompte déduit',
        },
        detailCol3: {
          heading: isAr ? 'التحويل وصافي الأجر' : isEn ? 'Disbursement' : 'Règlement & Net',
          primaryText: `${slip.netAPayer.toLocaleString()} DZD`,
          secondaryText: `${isAr ? 'الطريقة' : isEn ? 'Method' : 'Mode'}: ${slip.paymentMethod.toUpperCase()}`,
          tertiaryText: slip.matricule,
        },
      };
    },
    [isAr, isEn]
  );

  const getFanActions = useCallback(
    (slip: StaffPayrollSlipRecord): KineticRowFanAction[] => {
      const acts: KineticRowFanAction[] = [
        {
          id: 'print',
          label: isAr ? 'طباعة القسيمة' : isEn ? 'Print Slip' : 'Imprimer Bulletin',
          icon: <Printer className="w-[15px] h-[15px]" />,
          onClick: () => setActiveSlipForPrint(slip),
        },
      ];
      if (!slip.isPaid) {
        acts.push({
          id: 'pay',
          label: isAr ? 'تأكيد الدفع' : isEn ? 'Mark Paid' : 'Payer',
          icon: <CreditCard className="w-[15px] h-[15px]" />,
          onClick: () => onMarkSlipPaid(slip.id),
        });
      }
      return acts;
    },
    [isAr, isEn, onMarkSlipPaid]
  );

  const getDetailActions = useCallback(
    (slip: StaffPayrollSlipRecord): KineticDetailAction[] => {
      const acts: KineticDetailAction[] = [
        {
          id: 'print',
          label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
          icon: <FileText className="w-3.5 h-3.5" />,
          onClick: () => setActiveSlipForPrint(slip),
        },
      ];
      if (!slip.isPaid) {
        acts.push({
          id: 'pay',
          label: isAr ? 'دفع' : isEn ? 'Pay' : 'Payer',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#096b40]" />,
          onClick: () => onMarkSlipPaid(slip.id),
        });
      }
      acts.push({
        id: 'pin',
        label: pinnedIds.has(slip.id) ? (isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher') : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-3.5 h-3.5" />,
        onClick: () =>
          setPinnedIds((prev) => {
            const next = new Set(prev);
            if (next.has(slip.id)) next.delete(slip.id);
            else next.add(slip.id);
            return next;
          }),
      });
      return acts;
    },
    [isAr, isEn, onMarkSlipPaid, pinnedIds]
  );

  const activeInspectedSlip = useMemo(() => {
    if (!selectedSlip) return null;
    return filteredSlips.find((s) => s.id === selectedSlip.id) || selectedSlip;
  }, [selectedSlip, filteredSlips]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1C1B1A] rounded-2xl border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#F3EDE7] dark:bg-[#262422] px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] h-10">
            <Calendar className="w-4 h-4 text-[#d4522f]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-black dark:text-white focus:outline-hidden cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-black dark:text-white focus:outline-hidden cursor-pointer tabular-nums"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {activeRun ? (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeRun.status === 'paid'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60'
              }`}
            >
              {activeRun.status === 'paid'
                ? isAr ? 'رواتب مدفوعة' : isEn ? 'Closed & Paid' : 'Clôturée & Payée'
                : isAr ? 'مسودة قيد المراجعة' : isEn ? 'Draft' : 'Brouillon'}
            </span>
          ) : (
            <span className="text-xs text-black/60 dark:text-white/65 font-medium">
              {isAr ? 'لم يتم احتساب الرواتب بعد' : isEn ? 'Payroll not calculated yet' : 'Paie non encore générée'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <AtriumButton
            variant="secondary"
            size="md"
            onClick={() => setIsAdvanceModalOpen(true)}
            icon={<Plus className="w-4 h-4 text-[#d4522f]" />}
            className="h-10 text-xs font-semibold"
          >
            <span>{isAr ? 'سلفة' : isEn ? 'Advance' : 'Acompte'}</span>
          </AtriumButton>

          <AtriumButton
            variant="secondary"
            size="md"
            onClick={handleGenerate}
            icon={<RefreshCw className="w-4 h-4 text-black/70 dark:text-white/75" />}
            className="h-10 text-xs font-semibold"
          >
            <span>
              {activeSlips.length > 0
                ? isAr ? 'إعادة الحساب' : isEn ? 'Recalculate' : 'Recalculer'
                : isAr ? 'حساب' : isEn ? 'Calculate' : 'Calculer'}
            </span>
          </AtriumButton>

          {activeRun && activeRun.status !== 'paid' && (
            <AtriumButton
              variant="primary"
              size="md"
              onClick={handleApprove}
              icon={<CheckCircle2 className="w-4 h-4" />}
              className="h-10 text-xs font-semibold shadow-xs"
            >
              <span>{isAr ? 'اعتماد' : isEn ? 'Approve' : 'Valider'}</span>
            </AtriumButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-[18px] bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs">
          <p className="text-[11px] font-semibold text-black/70 dark:text-white/75 uppercase">{isAr ? 'صافي الأجور' : isEn ? 'Net Pay' : 'Net à Payer'}</p>
          <p className="text-[26px] leading-none font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-[#d4522f] mt-1.5 tabular-nums">
            {totalNet > 0 ? totalNet.toLocaleString() : '0'} <span className="text-xs font-sans font-normal text-black/62 dark:text-white/65">DZD</span>
          </p>
          <p className="text-[11px] text-black/62 dark:text-white/65 mt-1 tabular-nums">{activeSlips.length} {isAr ? 'قسيمة' : isEn ? 'slips' : 'bulletins'}</p>
        </div>

        <div className="p-4 rounded-[18px] bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs">
          <p className="text-[11px] font-semibold text-black/70 dark:text-white/75 uppercase">{isAr ? 'الضمان الاجتماعي' : isEn ? 'Social Security' : 'Cotisations'}</p>
          <p className="text-[26px] leading-none font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">
            {totalCnas > 0 ? totalCnas.toLocaleString() : '0'} <span className="text-xs font-sans font-normal text-black/62 dark:text-white/65">DZD</span>
          </p>
          <p className="text-[11px] text-black/62 dark:text-white/65 mt-1">{isAr ? 'الموظف وصاحب العمل' : isEn ? 'Staff + Employer' : 'Salarial + Patronal'}</p>
        </div>

        <div className="p-4 rounded-[18px] bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs">
          <p className="text-[11px] font-semibold text-black/70 dark:text-white/75 uppercase">{isAr ? 'ضريبة الدخل' : isEn ? 'Income Tax' : 'Impôt'}</p>
          <p className="text-[26px] leading-none font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white mt-1.5 tabular-nums">
            {totalIrg > 0 ? totalIrg.toLocaleString() : '0'} <span className="text-xs font-sans font-normal text-black/62 dark:text-white/65">DZD</span>
          </p>
          <p className="text-[11px] text-black/62 dark:text-white/65 mt-1">{isAr ? 'مقتطع' : isEn ? 'Withheld' : 'Retenue'}</p>
        </div>

        <div className="p-4 rounded-[18px] bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs">
          <p className="text-[11px] font-semibold text-black/70 dark:text-white/75 uppercase">{isAr ? 'السلفيات' : isEn ? 'Advances' : 'Acomptes'}</p>
          <p className="text-[26px] leading-none font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans text-amber-600 dark:text-amber-400 mt-1.5 tabular-nums">
            {totalAdvances > 0 ? totalAdvances.toLocaleString() : '0'} <span className="text-xs font-sans font-normal text-black/62 dark:text-white/65">DZD</span>
          </p>
          <p className="text-[11px] text-black/62 dark:text-white/65 mt-1">{isAr ? 'مخصوم' : isEn ? 'Deducted' : 'Déduits'}</p>
        </div>
      </div>

      <UniversalDataCollection<StaffPayrollSlipRecord>
        title={isAr ? 'جدول الرواتب' : isEn ? 'Payroll Sheet' : 'Livre de Paie'}
        items={filteredSlips}
        columns={columns}
        keyExtractor={(s) => s.id}
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        onViewModeChange={(m: string) => setViewMode(m === 'grid' ? 'grid' : 'list')}
        showViewToggle
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={isAr ? 'بحث بالاسم أو الرقم الوظيفي...' : isEn ? 'Search slip, matricule...' : 'Rechercher bulletin, matricule...'}
        filterOptions={[
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: activeSlips.length },
          { value: 'paid', label: isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payés', count: activeSlips.filter((s) => s.isPaid).length },
          { value: 'pending', label: isAr ? 'معلق' : isEn ? 'Pending' : 'À Payer', count: activeSlips.filter((s) => !s.isPaid).length },
        ]}
        filterValue={paidFilter}
        onFilterChange={(v) => setPaidFilter(v as any)}
        pinnedIds={pinnedIds}
        onPinToggle={(idOrItem) => {
          const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
          setPinnedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        openItemId={activeInspectedSlip?.id ?? null}
        onItemClick={(slip, el) => {
          setDrawerOpenerEl(el || null);
          setSelectedSlip(slip);
        }}
        onViewDetails={(slip, el) => {
          setDrawerOpenerEl(el || null);
          setSelectedSlip(slip);
        }}
        getRowMeta={getRowMeta}
        getFanActions={getFanActions}
        getDetailActions={getDetailActions}
        primaryActionLabel={isAr ? 'حساب الشهر' : isEn ? 'Run Payroll' : 'Calculer la Paie'}
        onAddFirstItem={handleGenerate}
        emptyTitle={isAr ? 'لا توجد رواتب' : isEn ? 'No payroll' : 'Aucune paie'}
        emptyDescription={isAr ? 'قم باحتساب رواتب الشهر' : isEn ? 'Run payroll calculation for this period' : 'Lancez le calcul de paie pour cette période'}
      />

      <div className="bg-white dark:bg-[#1C1B1A] rounded-2xl border border-[#E6DED6] dark:border-[#3A3734] p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6DED6] dark:border-[#3A3734]">
          <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider rtl:normal-case rtl:tracking-normal">
            {isAr ? 'السلفيات' : isEn ? 'Salary Advances' : 'Acomptes'}
          </h4>
          <button
            type="button"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#d4522f] bg-[#d4522f]/10 rounded-xl hover:bg-[#d4522f]/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'سلفة' : isEn ? 'New Advance' : 'Acompte'}</span>
          </button>
        </div>

        {salaryAdvances.length === 0 ? (
          <p className="text-xs text-black/62 dark:text-white/65 py-3 text-center">
            {isAr ? 'لا توجد سلفيات' : isEn ? 'No advances' : 'Aucun acompte'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {salaryAdvances.map((adv) => (
              <div
                key={adv.id}
                className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-black dark:text-white">{adv.staffName}</div>
                  <div className="text-[11px] font-mono text-black/62 dark:text-white/65 tabular-nums">
                    {adv.voucherNumber} · {adv.dateIssued}
                  </div>
                  {adv.reason && <div className="text-[11px] text-black/70 dark:text-white/75 italic mt-0.5">&quot;{adv.reason}&quot;</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-[#d4522f] tabular-nums">{adv.amountDzd.toLocaleString()} DZD</div>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                      adv.status === 'deducted'
                        ? 'bg-[#E6DED6] text-black/75 dark:bg-[#3A3734] dark:text-white/80'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {adv.status === 'deducted' ? 'Déduit' : 'En Attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <KineticSlideOverInspector<StaffPayrollSlipRecord>
        isOpen={Boolean(activeInspectedSlip)}
        item={activeInspectedSlip}
        allItems={filteredSlips}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeInspectedSlip?.staffFullName || ''}
        subtitle={`${activeInspectedSlip?.matricule || ''} · ${activeInspectedSlip?.role || ''}`}
        categoryLabel={activeInspectedSlip?.paymentMethod.toUpperCase()}
        avatarText={activeInspectedSlip ? extractInitials(activeInspectedSlip.staffFullName) : 'PR'}
        statusLabel={activeInspectedSlip?.isPaid ? (isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payé') : isAr ? 'قيد الدفع' : isEn ? 'Pending' : 'À Payer'}
        onSelectItem={(s) => setSelectedSlip(s)}
        onClose={() => setSelectedSlip(null)}
        renderBody={(slip) => {
          const primesNonImpTotal = slip.primesNonImposables?.reduce((s, p) => s + p.amount, 0) || 0;
          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'print',
                    label: isAr ? 'طباعة كشف الراتب' : isEn ? 'Print Slip' : 'Imprimer Bulletin',
                    icon: <Printer size={14} />,
                    primary: true,
                    onClick: () => setActiveSlipForPrint(slip),
                  },
                  ...(!slip.isPaid
                    ? [
                        {
                          id: 'pay',
                          label: isAr ? 'تأكيد الدفع' : isEn ? 'Mark Paid' : 'Marquer Payé',
                          icon: <CheckCircle2 size={14} />,
                          onClick: () => onMarkSlipPaid(slip.id),
                        },
                      ]
                    : []),
                ]}
              />
              <InspectorSection title={isAr ? 'تفاصيل كشف الراتب' : isEn ? 'Payslip Breakdown' : 'Détail Bulletin de Paie'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'الراتب الأساسي' : isEn ? 'Base Salary' : 'Salaire de Base'} value={`${slip.baseSalary.toLocaleString()} DZD`} mono />
                  <InspectorKeyValue label={isAr ? 'العلاوات' : isEn ? 'Bonuses' : 'Commissions / Primes'} value={`${(slip.coachingCommission || 0).toLocaleString()} DZD`} mono />
                  <InspectorKeyValue label={isAr ? 'الخاضع للضمان' : isEn ? 'Gross Taxable' : 'Salaire Brut Cotisable'} value={`${slip.salaireBrutCotisable.toLocaleString()} DZD`} mono />
                  <InspectorKeyValue label="CNAS (9%)" value={`-${slip.cnasSalarial.toLocaleString()} DZD`} mono />
                  <InspectorKeyValue label="IRG" value={`-${slip.irgTax.toLocaleString()} DZD`} mono />
                  <InspectorKeyValue label={isAr ? 'البدلات غير الخاضعة' : isEn ? 'Non-Taxable' : 'Indemnités Non Imp.'} value={`+${primesNonImpTotal.toLocaleString()} DZD`} mono />
                  <InspectorKeyValue label={isAr ? 'السلفيات المخصومة' : isEn ? 'Advances' : 'Acomptes Déduits'} value={`-${slip.acomptesDeduits.toLocaleString()} DZD`} mono />
                  <InspectorKeyValue label={isAr ? 'الصافي للدفع' : isEn ? 'Net Payable' : 'Net à Payer'} value={`${slip.netAPayer.toLocaleString()} DZD`} mono />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />

      <PayslipPrintModal
        isOpen={Boolean(activeSlipForPrint)}
        onClose={() => setActiveSlipForPrint(null)}
        slip={activeSlipForPrint}
        language={language}
      />

      <SalaryAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        staffList={staffList}
        onCreateAdvance={onCreateAdvance}
        language={language}
      />
    </div>
  );
};

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  Pin,
  Printer,
  CreditCard,
  AlertTriangle,
  Lock,
  Ban,
} from 'lucide-react';
import {
  FiscalProfile,
  StaffMember,
  StaffSalaryAdvance,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
} from '../../../types/index';
import type { StatutoryRateSet } from '../../../lib/supabase/services/referenceDataService';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSelect } from '../../ui/live/LiveSelect';
import { PayslipPrintModal } from './PayslipPrintModal';
import { SalaryAdvanceModal } from './SalaryAdvanceModal';
import { PayrollMigrationDryRunPanel } from './PayrollMigrationDryRunPanel';
import { useAtriumActions } from '../../../services/store';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import {
  KineticEmptyStateMotion,
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
  onGeneratePayroll: (month: number, year: number, opts?: { isAdjustment?: boolean }) => void;
  onApprovePayroll: (runId: string, opts?: { markPaid?: boolean }) => void;
  onMarkSlipPaid: (slipId: string) => void;
  onCreateAdvance: (data: {
    staffId: string;
    staffName: string;
    amountDzd: number;
    paymentMethod: 'cash' | 'ccp' | 'bank_transfer';
    reason?: string;
  }) => void;
  onWaiveAdvance?: (advanceId: string) => void;
  effectiveStatutoryRate?: StatutoryRateSet;
  businessName?: string;
  fiscalProfile?: FiscalProfile;
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
  onWaiveAdvance,
  effectiveStatutoryRate,
  businessName,
  fiscalProfile,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { canViewSensitivePayroll } = useAtriumActions();
  const canInspectPayrollDryRun = canViewSensitivePayroll();

  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
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

  const periodRuns = useMemo(() => {
    return payrollRuns
      .filter((r) => r.periodMonth === selectedMonth && r.periodYear === selectedYear)
      .sort((a, b) => Number(a.adjustmentSeq ?? 0) - Number(b.adjustmentSeq ?? 0));
  }, [payrollRuns, selectedMonth, selectedYear]);

  const activeRun = useMemo(() => {
    if (periodRuns.length === 0) return undefined;
    if (selectedRunId) {
      const explicit = periodRuns.find((r) => r.id === selectedRunId);
      if (explicit) return explicit;
    }
    return periodRuns[periodRuns.length - 1];
  }, [periodRuns, selectedRunId]);

  const activeSlips = useMemo(() => {
    if (activeRun) {
      const byRun = payrollSlips.filter((s) => s.payrollRunId === activeRun.id);
      if (byRun.length > 0 || periodRuns.length > 1) return byRun;
    }
    return payrollSlips.filter((s) => s.periodMonth === selectedMonth && s.periodYear === selectedYear);
  }, [payrollSlips, activeRun, periodRuns.length, selectedMonth, selectedYear]);

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

  const activeVerificationStatus =
    activeRun?.rateSnapshot?.verificationStatus || effectiveStatutoryRate?.verificationStatus || 'unverified';
  const activeRateBasis =
    activeRun?.rateBasis || (effectiveStatutoryRate?.isLegacyBaseline || !effectiveStatutoryRate ? 'legacy' : 'versioned');
  const activeSnmgDzd =
    activeRun?.rateSnapshot?.snmgDzd ?? effectiveStatutoryRate?.snmgDzd ?? null;
  const belowSnmgStaffCount = useMemo(() => {
    if (activeSnmgDzd === null) return 0;
    if (activeSlips.length > 0) {
      return activeSlips.filter((s) => s.baseSalary > 0 && s.baseSalary < activeSnmgDzd).length;
    }
    return staffList.filter((st) => st.status !== 'terminated' && st.salary > 0 && st.salary < activeSnmgDzd).length;
  }, [activeSnmgDzd, activeSlips, staffList]);

  const isLockedRun = Boolean(activeRun && (activeRun.status === 'approved' || activeRun.status === 'paid'));

  const handleGenerate = () => onGeneratePayroll(selectedMonth, selectedYear);
  const handleGenerateAdjustment = () => onGeneratePayroll(selectedMonth, selectedYear, { isAdjustment: true });
  const handleApproveLock = () => {
    if (activeRun) onApprovePayroll(activeRun.id, { markPaid: false });
  };
  const handleCloseAndPay = () => {
    if (activeRun) onApprovePayroll(activeRun.id, { markPaid: true });
  };

  const columns: ColumnDefinition<StaffPayrollSlipRecord>[] = useMemo(
    () => [
      {
        key: 'staffFullName',
        header: isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur',
        sortable: true,
        renderCell: (slip) => (
          <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
            <div className="t-label font-semibold text-[var(--text-1)] dark:text-white">{slip.staffFullName}</div>
            <div className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums">
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
          <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold bg-[#F3EDE7] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white/85">
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
            className={`inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold ${
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
          <span className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
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
          icon: <Printer className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => setActiveSlipForPrint(slip),
        },
      ];
      if (!slip.isPaid) {
        acts.push({
          id: 'pay',
          label: isAr ? 'تأكيد الدفع' : isEn ? 'Mark Paid' : 'Payer',
          icon: <CreditCard className="w-4 h-4" strokeWidth={1.5} />,
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
          icon: <FileText className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => setActiveSlipForPrint(slip),
        },
      ];
      if (!slip.isPaid) {
        acts.push({
          id: 'pay',
          label: isAr ? 'دفع' : isEn ? 'Pay' : 'Payer',
          icon: <CheckCircle2 className="w-4 h-4 text-[#096b40]" strokeWidth={1.5} />,
          onClick: () => onMarkSlipPaid(slip.id),
        });
      }
      acts.push({
        id: 'pin',
        label: pinnedIds.has(slip.id) ? (isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher') : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-4 h-4" strokeWidth={1.5} />,
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
    <div className="flex flex-col gap-[var(--s4,16px)]">
      <div className="sq-elev-card">
        <div
          data-sq="card"
          className="flex flex-col gap-[var(--s3,12px)] p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E]"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--s3,12px)] flex-wrap">
              <div className="flex items-center gap-[var(--s2,8px)]">
                <LiveSelect
                  size="md"
                  tone="soft"
                  value={String(selectedMonth)}
                  onValueChange={(v) => {
                    setSelectedMonth(Number(v));
                    setSelectedRunId(null);
                  }}
                  aria-label={isAr ? 'الشهر' : isEn ? 'Month' : 'Mois'}
                  options={months.map((m) => ({
                    value: String(m.value),
                    label: m.label,
                  }))}
                />
                <LiveSelect
                  size="md"
                  tone="soft"
                  value={String(selectedYear)}
                  onValueChange={(v) => {
                    setSelectedYear(Number(v));
                    setSelectedRunId(null);
                  }}
                  aria-label={isAr ? 'السنة' : isEn ? 'Year' : 'Année'}
                  options={[
                    { value: '2026', label: '2026' },
                    { value: '2025', label: '2025' },
                  ]}
                />
                {periodRuns.length > 1 && (
                  <LiveSelect
                    size="md"
                    tone="soft"
                    value={activeRun?.id || periodRuns[0].id}
                    onValueChange={(v) => setSelectedRunId(v)}
                    aria-label={isAr ? 'الدفعة' : isEn ? 'Payroll Run' : 'Cycle'}
                    options={periodRuns.map((r) => ({
                      value: r.id,
                      label:
                        r.runType === 'adjustment' || (r.adjustmentSeq ?? 0) > 0
                          ? `Adjustment #${r.adjustmentSeq ?? 1} (${r.status})`
                          : `Regular (${r.status})`,
                    }))}
                  />
                )}
              </div>

              {activeRun ? (
                <span
                  data-testid="payroll-run-status-pill"
                  className={`inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold ${
                    activeRun.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : activeRun.status === 'approved'
                      ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  {activeRun.status === 'paid'
                    ? isAr ? 'رواتب مدفوعة' : isEn ? 'Closed & Paid' : 'Clôturée & Payée'
                    : activeRun.status === 'approved'
                    ? isAr ? 'معتمدة (مغلقة)' : isEn ? 'Approved (Locked)' : 'Validée (Verrouillée)'
                    : isAr ? 'مسودة قيد المراجعة' : isEn ? 'Draft' : 'Brouillon'}
                </span>
              ) : (
                <span className="t-label text-[var(--text-2)] dark:text-white/65">
                  {isAr ? 'لم يتم احتساب الرواتب بعد' : isEn ? 'Payroll not calculated yet' : 'Paie non encore générée'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-[var(--s2,8px)] flex-wrap">
              <AtriumButton
                variant="secondary"
                size="md"
                onClick={() => setIsAdvanceModalOpen(true)}
                icon={<Plus className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" strokeWidth={1.5} />}
              >
                <span>{isAr ? 'سلفة' : isEn ? 'Advance' : 'Acompte'}</span>
              </AtriumButton>

              {isLockedRun ? (
                <AtriumButton
                  variant="secondary"
                  size="md"
                  data-testid="payroll-adjustment-btn"
                  onClick={handleGenerateAdjustment}
                  icon={<RefreshCw className="w-4 h-4 text-[var(--text-2)] dark:text-white/75" strokeWidth={1.5} />}
                >
                  <span>{isAr ? 'دفعة تسوية' : isEn ? 'Adjustment Run' : 'Paie Ajustement'}</span>
                </AtriumButton>
              ) : (
                <AtriumButton
                  variant="secondary"
                  size="md"
                  data-testid="payroll-calculate-btn"
                  onClick={handleGenerate}
                  icon={<RefreshCw className="w-4 h-4 text-[var(--text-2)] dark:text-white/75" strokeWidth={1.5} />}
                >
                  <span>
                    {activeSlips.length > 0
                      ? isAr ? 'إعادة الحساب' : isEn ? 'Recalculate' : 'Recalculer'
                      : isAr ? 'حساب' : isEn ? 'Calculate' : 'Calculer'}
                  </span>
                </AtriumButton>
              )}

              {activeRun && activeRun.status === 'draft' && (
                <>
                  <AtriumButton
                    variant="secondary"
                    size="md"
                    data-testid="payroll-approve-lock-btn"
                    onClick={handleApproveLock}
                    icon={<Lock className="w-4 h-4 text-blue-700 dark:text-blue-400" strokeWidth={1.5} />}
                  >
                    <span>{isAr ? 'اعتماد وقفل' : isEn ? 'Approve (Lock)' : 'Valider (Verrouiller)'}</span>
                  </AtriumButton>
                  <AtriumButton
                    variant="primary"
                    size="md"
                    data-testid="payroll-close-pay-btn"
                    onClick={handleCloseAndPay}
                    icon={<CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
                    className="shadow-xs"
                  >
                    <span>{isAr ? 'اعتماد ودفع' : isEn ? 'Close & Pay' : 'Valider & Payer'}</span>
                  </AtriumButton>
                </>
              )}

              {activeRun && activeRun.status === 'approved' && (
                <AtriumButton
                  variant="primary"
                  size="md"
                  data-testid="payroll-mark-all-paid-btn"
                  onClick={handleCloseAndPay}
                  icon={<CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
                  className="shadow-xs"
                >
                  <span>{isAr ? 'دفع الكل' : isEn ? 'Mark All Paid' : 'Marquer Tout Payé'}</span>
                </AtriumButton>
              )}
            </div>
          </div>

          {/* Statutory verification, legacy basis, and SNMG advisory badges */}
          {(activeVerificationStatus !== 'verified' ||
            activeRateBasis === 'legacy' ||
            activeSnmgDzd === null ||
            belowSnmgStaffCount > 0) && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-black/[0.06] dark:border-white/[0.06] t-cap">
              {activeVerificationStatus !== 'verified' && (
                <span
                  data-testid="payroll-rates-unverified-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Rates not verified
                </span>
              )}
              {activeRateBasis === 'legacy' && (
                <span
                  data-testid="payroll-legacy-basis-badge"
                  className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-[#F3EDE7] text-[var(--text-1)] dark:bg-[#2B2825] dark:text-white/85"
                >
                  Legacy basis
                </span>
              )}
              {activeSnmgDzd === null && (
                <span
                  data-testid="payroll-snmg-missing-warning"
                  className="text-amber-800 dark:text-amber-300 font-medium"
                >
                  {isAr
                    ? 'لم يتم ضبط الحد الأدنى للأجور SNMG — يرجى المراجعة.'
                    : isEn
                    ? 'SNMG not configured in active statutory rate set.'
                    : 'SNMG non configuré dans le barème actif.'}
                </span>
              )}
              {belowSnmgStaffCount > 0 && activeSnmgDzd !== null && (
                <span
                  data-testid="payroll-below-snmg-warning"
                  className="text-rose-700 dark:text-rose-400 font-medium"
                >
                  {isAr
                    ? `${belowSnmgStaffCount} موظف براتب أقل من SNMG (${activeSnmgDzd.toLocaleString()} دج)`
                    : isEn
                    ? `${belowSnmgStaffCount} staff below SNMG (${activeSnmgDzd.toLocaleString()} DZD)`
                    : `${belowSnmgStaffCount} collaborateur(s) sous le SNMG (${activeSnmgDzd.toLocaleString()} DZD)`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--card-gap,12px)]">
        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'صافي الأجور' : isEn ? 'Net Pay' : 'Net à Payer'}</p>
            <p className="t-kpi-m mt-auto text-[var(--brand-accent,#D9532B)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums flex items-baseline gap-[var(--num-unit-gap,6px)]">
              <span>{totalNet > 0 ? totalNet.toLocaleString() : '0'}</span>
              <span className="t-unit text-[var(--text-2)] dark:text-white/65">DZD</span>
            </p>
            <p className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums">{activeSlips.length} {isAr ? 'قسيمة' : isEn ? 'slips' : 'bulletins'}</p>
          </div>
        </div>

        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'الضمان الاجتماعي' : isEn ? 'Social Security' : 'Cotisations'}</p>
            <p className="t-kpi-m mt-auto text-emerald-600 dark:text-emerald-400 tabular-nums flex items-baseline gap-[var(--num-unit-gap,6px)]">
              <span>{totalCnas > 0 ? totalCnas.toLocaleString() : '0'}</span>
              <span className="t-unit text-[var(--text-2)] dark:text-white/65">DZD</span>
            </p>
            <p className="t-cap text-[var(--text-2)] dark:text-white/65">{isAr ? 'الموظف وصاحب العمل' : isEn ? 'Staff + Employer' : 'Salarial + Patronal'}</p>
          </div>
        </div>

        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'ضريبة الدخل' : isEn ? 'Income Tax' : 'Impôt'}</p>
            <p className="t-kpi-m mt-auto text-[var(--text-1)] dark:text-white tabular-nums flex items-baseline gap-[var(--num-unit-gap,6px)]">
              <span>{totalIrg > 0 ? totalIrg.toLocaleString() : '0'}</span>
              <span className="t-unit text-[var(--text-2)] dark:text-white/65">DZD</span>
            </p>
            <p className="t-cap text-[var(--text-2)] dark:text-white/65">{isAr ? 'مقتطع' : isEn ? 'Withheld' : 'Retenue'}</p>
          </div>
        </div>

        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'السلفيات' : isEn ? 'Advances' : 'Acomptes'}</p>
            <p className="t-kpi-m mt-auto text-amber-600 dark:text-amber-400 tabular-nums flex items-baseline gap-[var(--num-unit-gap,6px)]">
              <span>{totalAdvances > 0 ? totalAdvances.toLocaleString() : '0'}</span>
              <span className="t-unit text-[var(--text-2)] dark:text-white/65">DZD</span>
            </p>
            <p className="t-cap text-[var(--text-2)] dark:text-white/65">{isAr ? 'مخصوم' : isEn ? 'Deducted' : 'Déduits'}</p>
          </div>
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

      <div className="sq-elev-card">
        <div
          data-sq="panel"
          className="bg-white dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]"
        >
          <div
            className="flex items-center justify-between border-b border-[var(--atr-divider)]"
            style={{ padding: 'var(--pod-head-pad, 4px 12px 12px)' }}
          >
            <h4 className="t-pod text-[var(--text-1)] dark:text-white">
              {isAr ? 'السلفيات' : isEn ? 'Salary Advances' : 'Acomptes'}
            </h4>
            <button
              type="button"
              onClick={() => setIsAdvanceModalOpen(true)}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="flex items-center h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] gap-[var(--btn-sm-gap,6px)] t-btn text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] bg-[#d4522f]/10 hover:bg-[#d4522f]/20 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>{isAr ? 'سلفة' : isEn ? 'New Advance' : 'Acompte'}</span>
            </button>
          </div>

          {salaryAdvances.length === 0 ? (
            <KineticEmptyStateMotion motionKey={`staff-adv-empty-${language}`}>
              <EmptyState
                variant="compact"
                tone="neutral"
                icon={<CreditCard className="w-4 h-4" strokeWidth={1.5} />}
                title={isAr ? 'لا توجد سلفيات' : isEn ? 'No salary advances' : 'Aucun acompte'}
                description={
                  isAr
                    ? 'أضف سلفة راتب ليتم خصمها تلقائياً من مسير الشهر.'
                    : isEn
                    ? 'Record a salary advance to deduct it automatically from payroll.'
                    : 'Enregistrez un acompte sur salaire pour le déduire à la paie.'
                }
                secondaryAction={{
                  label: isAr ? 'سلفة جديدة' : isEn ? 'New Advance' : 'Nouvel acompte',
                  icon: <Plus className="w-4 h-4" strokeWidth={1.5} />,
                  onClick: () => setIsAdvanceModalOpen(true),
                }}
              />
            </KineticEmptyStateMotion>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--card-gap,12px)]">
              {salaryAdvances.map((adv) => (
                <div
                  key={adv.id}
                  data-sq="card"
                  className="p-[var(--card-pad,20px)] card-opt bg-[#FBF8F5] dark:bg-[#22201E] flex items-center justify-between gap-[var(--s3,12px)]"
                >
                  <div className="flex flex-col gap-[var(--title-cap-gap,2px)] min-w-0">
                    <div className="t-label font-semibold text-[var(--text-1)] dark:text-white truncate">{adv.staffName}</div>
                    <div className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums truncate">
                      {adv.voucherNumber} · {adv.dateIssued}
                    </div>
                    {adv.reason && <div className="t-cap text-[var(--text-2)] dark:text-white/75 italic truncate">&quot;{adv.reason}&quot;</div>}
                  </div>
                  <div className="text-right flex flex-col items-end gap-[var(--s1,4px)] shrink-0">
                    <div className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">{adv.amountDzd.toLocaleString()} DZD</div>
                    <div className="flex items-center gap-1.5">
                      {adv.status === 'pending' && onWaiveAdvance && (
                        <button
                          type="button"
                          data-testid={`waive-advance-${adv.id}`}
                          onClick={() => onWaiveAdvance(adv.id)}
                          className="inline-flex items-center gap-1 h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-[var(--text-2)] dark:text-white/80 transition-colors cursor-pointer"
                        >
                          <Ban className="w-3 h-3" />
                          <span>{isAr ? 'إلغاء' : isEn ? 'Waive' : 'Annuler'}</span>
                        </button>
                      )}
                      <span
                        className={`inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold ${
                          adv.status === 'deducted'
                            ? 'bg-[#E6DED6] text-[var(--text-1)] dark:bg-[#3A3734] dark:text-white/80'
                            : adv.status === 'waived'
                            ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {adv.status === 'deducted'
                          ? isAr ? 'مخصومة' : isEn ? 'Deducted' : 'Déduit'
                          : adv.status === 'waived'
                          ? isAr ? 'ملغاة' : isEn ? 'Waived' : 'Annulé'
                          : isAr ? 'قيد الانتظار' : isEn ? 'Pending' : 'En Attente'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
            <div className="flex flex-col gap-[var(--s4,16px)]">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'print',
                    label: isAr ? 'طباعة كشف الراتب' : isEn ? 'Print Slip' : 'Imprimer Bulletin',
                    icon: <Printer size={16} strokeWidth={1.5} />,
                    primary: true,
                    onClick: () => setActiveSlipForPrint(slip),
                  },
                  ...(!slip.isPaid
                    ? [
                        {
                          id: 'pay',
                          label: isAr ? 'تأكيد الدفع' : isEn ? 'Mark Paid' : 'Marquer Payé',
                          icon: <CheckCircle2 size={16} strokeWidth={1.5} />,
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
                  {(slip.advanceCarryover ?? 0) > 0 && (
                    <InspectorKeyValue label={isAr ? 'سلفة مرحلة' : isEn ? 'Advance Carryover' : 'Acompte Reporté'} value={`${(slip.advanceCarryover ?? 0).toLocaleString()} DZD`} mono />
                  )}
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
        businessName={businessName}
        fiscalProfile={fiscalProfile}
        language={language}
      />

      <SalaryAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        staffList={staffList}
        onCreateAdvance={onCreateAdvance}
        language={language}
      />

      {canInspectPayrollDryRun && <PayrollMigrationDryRunPanel language={language} />}
    </div>
  );
};

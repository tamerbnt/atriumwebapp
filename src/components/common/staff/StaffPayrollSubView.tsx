import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  Printer,
  ChevronDown,
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
  const [activeSlipForPrint, setActiveSlipForPrint] = useState<StaffPayrollSlipRecord | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  // Month names
  const months = [
    { value: 1, label: isAr ? 'جانفي' : 'Janvier' },
    { value: 2, label: isAr ? 'فيفري' : 'Février' },
    { value: 3, label: isAr ? 'مارس' : 'Mars' },
    { value: 4, label: isAr ? 'أفريل' : 'Avril' },
    { value: 5, label: isAr ? 'ماي' : 'Mai' },
    { value: 6, label: isAr ? 'جوان' : 'Juin' },
    { value: 7, label: isAr ? 'جويلية' : 'Juillet' },
    { value: 8, label: isAr ? 'أوت' : 'Août' },
    { value: 9, label: isAr ? 'سبتمبر' : 'Septembre' },
    { value: 10, label: isAr ? 'أكتوبر' : 'Octobre' },
    { value: 11, label: isAr ? 'نوفمبر' : 'Novembre' },
    { value: 12, label: isAr ? 'ديسمبر' : 'Décembre' },
  ];

  // Active Run for the selected period
  const runId = `payrun_${selectedYear}_${String(selectedMonth).padStart(2, '0')}`;
  const activeRun = useMemo(() => {
    return payrollRuns.find((r) => r.periodMonth === selectedMonth && r.periodYear === selectedYear);
  }, [payrollRuns, selectedMonth, selectedYear]);

  // Slips for the active run
  const activeSlips = useMemo(() => {
    return payrollSlips.filter((s) => s.periodMonth === selectedMonth && s.periodYear === selectedYear);
  }, [payrollSlips, selectedMonth, selectedYear]);

  // Aggregate Metrics for this period
  const totalNet = useMemo(() => activeSlips.reduce((sum, s) => sum + s.netAPayer, 0), [activeSlips]);
  const totalCnas = useMemo(() => activeSlips.reduce((sum, s) => sum + s.cnasSalarial + s.cnasPatronal, 0), [activeSlips]);
  const totalIrg = useMemo(() => activeSlips.reduce((sum, s) => sum + s.irgTax, 0), [activeSlips]);
  const totalAdvances = useMemo(() => activeSlips.reduce((sum, s) => sum + s.acomptesDeduits, 0), [activeSlips]);

  const handleGenerate = () => {
    onGeneratePayroll(selectedMonth, selectedYear);
  };

  const handleApprove = () => {
    if (activeRun) {
      onApprovePayroll(activeRun.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar: Exact 40px Standard Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#F3EDE7] dark:bg-neutral-700/50 px-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700 h-10">
            <Calendar className="w-4 h-4 text-[#d4522f]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
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
              className="bg-transparent text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
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
              {activeRun.status === 'paid' ? '✔️ ' + (isAr ? 'رواتب مدفوعة' : 'Clôturée & Payée') : '⏳ ' + (isAr ? 'مسودة قيد المراجعة' : 'Brouillon')}
            </span>
          ) : (
            <span className="text-xs text-neutral-400 font-medium">
              {isAr ? 'لم يتم احتساب الرواتب بعد' : 'Paie non encore générée'}
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
            icon={<RefreshCw className="w-4 h-4 text-neutral-500" />}
            className="h-10 text-xs font-semibold"
          >
            <span>{activeSlips.length > 0 ? (isAr ? 'إعادة الحساب' : isEn ? 'Recalculate' : 'Recalculer') : (isAr ? 'حساب' : isEn ? 'Calculate' : 'Calculer')}</span>
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

      {/* 4 Financial Aggregate KPI Cards — Pure White Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase">{isAr ? 'صافي الأجور' : isEn ? 'Net Pay' : 'Net à Payer'}</p>
          <p className="text-xl font-bold font-mono text-[#d4522f] mt-1">
            {totalNet > 0 ? totalNet.toLocaleString() : '0'} <span className="text-xs font-normal text-neutral-400">DZD</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{activeSlips.length} {isAr ? 'قسيمة' : isEn ? 'slips' : 'bulletins'}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase">{isAr ? 'الضمان الاجتماعي' : isEn ? 'Social Security' : 'Cotisations'}</p>
          <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {totalCnas > 0 ? totalCnas.toLocaleString() : '0'} <span className="text-xs font-normal text-neutral-400">DZD</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{isAr ? 'الموظف وصاحب العمل' : isEn ? 'Staff + Employer' : 'Salarial + Patronal'}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase">{isAr ? 'ضريبة الدخل' : isEn ? 'Income Tax' : 'Impôt'}</p>
          <p className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
            {totalIrg > 0 ? totalIrg.toLocaleString() : '0'} <span className="text-xs font-normal text-neutral-400">DZD</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{isAr ? 'مقتطع' : isEn ? 'Withheld' : 'Retenue'}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase">{isAr ? 'السلفيات' : isEn ? 'Advances' : 'Acomptes'}</p>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">
            {totalAdvances > 0 ? totalAdvances.toLocaleString() : '0'} <span className="text-xs font-normal text-neutral-400">DZD</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{isAr ? 'مخصوم' : isEn ? 'Deducted' : 'Déduits'}</p>
        </div>
      </div>

      {/* Main Payroll Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'جدول الرواتب' : isEn ? 'Payroll Sheet' : 'Livre de Paie'}
            </h4>
          </div>
          {activeSlips.length === 0 && (
            <AtriumButton onClick={handleGenerate} className="h-8 px-3 text-xs">
              {isAr ? 'حساب' : isEn ? 'Calculate' : 'Calculer'}
            </AtriumButton>
          )}
        </div>

        {activeSlips.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <h5 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              {isAr ? 'لا توجد رواتب' : isEn ? 'No payroll' : 'Aucune paie'}
            </h5>
            <AtriumButton onClick={handleGenerate} className="h-9 px-4 text-xs font-bold mt-3">
              {isAr ? 'حساب الشهر' : isEn ? 'Run Payroll' : 'Calculer'}
            </AtriumButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-[#202024] text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="p-3 font-semibold">{isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur'}</th>
                  <th className="p-3 font-semibold text-right">{isAr ? 'الأساسي' : isEn ? 'Base' : 'Base'}</th>
                  <th className="p-3 font-semibold text-right">{isAr ? 'العلاوات' : isEn ? 'Bonus' : 'Primes'}</th>
                  <th className="p-3 font-semibold text-right">{isAr ? 'الإجمالي' : isEn ? 'Gross' : 'Brut'}</th>
                  <th className="p-3 font-semibold text-right text-red-600">{isAr ? 'الضمان' : isEn ? 'Social' : 'Social'}</th>
                  <th className="p-3 font-semibold text-right text-red-600">{isAr ? 'الضريبة' : isEn ? 'Tax' : 'Impôt'}</th>
                  <th className="p-3 font-semibold text-right text-emerald-600">{isAr ? 'البدلات' : isEn ? 'Allowances' : 'Indemnités'}</th>
                  <th className="p-3 font-semibold text-right text-amber-600">{isAr ? 'السلف' : isEn ? 'Advances' : 'Acomptes'}</th>
                  <th className="p-3 font-semibold text-right font-bold text-neutral-900 dark:text-white">{isAr ? 'الصافي' : isEn ? 'Net' : 'Net'}</th>
                  <th className="p-3 font-semibold text-center">{isAr ? 'الدفع' : isEn ? 'Method' : 'Mode'}</th>
                  <th className="p-3 font-semibold text-right pr-4">{isAr ? 'إجراء' : isEn ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {activeSlips.map((slip) => {
                  const primesNonImpTotal = slip.primesNonImposables?.reduce((s, p) => s + p.amount, 0) || 0;
                  return (
                    <tr key={slip.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-neutral-900 dark:text-white">{slip.staffFullName}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">{slip.matricule} · {slip.role}</div>
                      </td>
                      <td className="p-3 text-right font-mono">{slip.baseSalary.toLocaleString()} DZD</td>
                      <td className="p-3 text-right font-mono">
                        {slip.coachingCommission ? `${slip.coachingCommission.toLocaleString()} DZD` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {slip.salaireBrutCotisable.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-red-600">
                        -{slip.cnasSalarial.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-red-600">
                        -{slip.irgTax.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600">
                        +{primesNonImpTotal.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-amber-600">
                        {slip.acomptesDeduits > 0 ? `-${slip.acomptesDeduits.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-sm text-[#d4522f]">
                        {slip.netAPayer.toLocaleString()} DZD
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {slip.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveSlipForPrint(slip)}
                            className="p-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-[#d4522f] hover:bg-[#d4522f]/10 transition-colors cursor-pointer"
                            title={isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer'}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {!slip.isPaid && (
                            <button
                              type="button"
                              onClick={() => onMarkSlipPaid(slip.id)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-pointer"
                            >
                              {isAr ? 'دفع' : isEn ? 'Pay' : 'Payer'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Advances (Acomptes) Register Card */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              {isAr ? 'السلفيات' : isEn ? 'Salary Advances' : 'Acomptes'}
            </h4>
          </div>
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
          <p className="text-xs text-neutral-400 py-3 text-center">{isAr ? 'لا توجد سلفيات' : isEn ? 'No advances' : 'Aucun acompte'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {salaryAdvances.map((adv) => (
              <div
                key={adv.id}
                className="p-3 rounded-xl bg-neutral-50 dark:bg-[#202024] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-neutral-900 dark:text-white">{adv.staffName}</div>
                  <div className="text-[11px] font-mono text-neutral-400">{adv.voucherNumber} · {adv.dateIssued}</div>
                  {adv.reason && <div className="text-[10px] text-neutral-500 italic mt-0.5">"{adv.reason}"</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-[#d4522f]">{adv.amountDzd.toLocaleString()} DZD</div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                      adv.status === 'deducted'
                        ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
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

      {/* Payslip Print Modal */}
      <PayslipPrintModal
        isOpen={Boolean(activeSlipForPrint)}
        onClose={() => setActiveSlipForPrint(null)}
        slip={activeSlipForPrint}
        language={language}
      />

      {/* Salary Advance Modal */}
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

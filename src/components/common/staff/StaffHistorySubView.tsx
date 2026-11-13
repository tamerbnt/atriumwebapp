import React, { useState, useMemo } from 'react';
import {
  History,
  FileText,
  Clock,
  Printer,
  Calendar,
  CheckCircle2,
  Filter,
  Search,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  StaffMember,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
  StaffAttendanceLogRecord,
} from '../../../types/index';
import { PayslipPrintModal } from './PayslipPrintModal';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AtriumButton } from '../../ui/AtriumButton';

interface StaffHistorySubViewProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  payrollSlips: StaffPayrollSlipRecord[];
  attendanceLogs: StaffAttendanceLogRecord[];
  language: string;
}

export const StaffHistorySubView: React.FC<StaffHistorySubViewProps> = ({
  staffList,
  payrollRuns,
  payrollSlips,
  attendanceLogs,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [historyMode, setHistoryMode] = useState<'salaires' | 'pointages'>('salaires');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [searchPunchQuery, setSearchPunchQuery] = useState<string>('');
  const [activeSlipForPrint, setActiveSlipForPrint] = useState<StaffPayrollSlipRecord | null>(null);

  // Filtered Punch Logs
  const filteredPunchLogs = useMemo(() => {
    return attendanceLogs.filter((log) => {
      if (selectedStaffFilter !== 'all' && log.staffId !== selectedStaffFilter) return false;
      if (searchPunchQuery.trim()) {
        const q = searchPunchQuery.toLowerCase();
        return (
          log.staffName.toLowerCase().includes(q) ||
          log.terminalId?.toLowerCase().includes(q) ||
          log.method.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [attendanceLogs, selectedStaffFilter, searchPunchQuery]);

  return (
    <div className="space-y-4">
      {/* Sub-Toggle Switcher: Exact 40px Standard Atrium Component */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
        <LiveSegmentedControl
          size="md"
          value={historyMode}
          onValueChange={(val) => setHistoryMode(val as 'salaires' | 'pointages')}
          options={[
            {
              value: 'salaires',
              label: isAr ? 'الرواتب' : isEn ? 'Payroll' : 'Salaires',
              icon: <FileText className="w-4 h-4 mr-1.5" />,
              count: payrollRuns.length,
            },
            {
              value: 'pointages',
              label: isAr ? 'الحضور' : isEn ? 'Logs' : 'Pointages',
              icon: <Clock className="w-4 h-4 mr-1.5" />,
              count: attendanceLogs.length,
            },
          ]}
          aria-label="Staff History Mode"
        />

        <div className="text-xs text-black/70 dark:text-white/75 font-medium px-2">
          {historyMode === 'salaires'
            ? (isAr ? 'أرشيف الرواتب' : isEn ? 'Payroll archive' : 'Archives paie')
            : (isAr ? 'سجل الحضور' : isEn ? 'Attendance logs' : 'Journal pointages')}
        </div>
      </div>

      {/* Mode 1: Historical Payroll Runs */}
      {historyMode === 'salaires' && (
        <div className="space-y-4">
          {payrollRuns.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#18181B] rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <FileText className="w-8 h-8 text-black/30 dark:text-white/35 mx-auto mb-2" />
              <p className="text-xs text-black/60 dark:text-white/65">
                {isAr ? 'لا يوجد أرشيف' : isEn ? 'No history' : 'Aucun historique'}
              </p>
            </div>
          ) : (
            payrollRuns.map((run) => {
              const runSlips = payrollSlips.filter((s) => s.payrollRunId === run.id);
              return (
                <div
                  key={run.id}
                  className="bg-white dark:bg-[#18181B] rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                          <span>{run.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 uppercase font-bold">
                            {run.status === 'paid' ? (isAr ? 'مدفوعة' : isEn ? 'Paid' : 'Payée') : (isAr ? 'مسودة' : isEn ? 'Draft' : 'Brouillon')}
                          </span>
                        </h4>
                        <p className="text-[11px] text-black/60 dark:text-white/65 font-mono tabular-nums">
                          {run.slipsCount} {isAr ? 'موظف' : isEn ? 'staff' : 'agents'} · {run.approvedAt?.slice(0, 10) || run.createdAt.slice(0, 10)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-black/60 dark:text-white/65 block text-[10px] font-sans">{isAr ? 'الصافي' : isEn ? 'Net' : 'Net'}</span>
                        <span className="font-bold text-sm text-[#d4522f]">{run.totalNet.toLocaleString()} DZD</span>
                      </div>
                      <div>
                        <span className="text-black/60 dark:text-white/65 block text-[10px] font-sans">{isAr ? 'الضمان' : isEn ? 'Social' : 'Social'}</span>
                        <span className="font-bold text-emerald-600">{(run.totalCnasSalarial + run.totalCnasPatronal).toLocaleString()} DZD</span>
                      </div>
                      <div>
                        <span className="text-black/60 dark:text-white/65 block text-[10px] font-sans">{isAr ? 'الضريبة' : isEn ? 'Tax' : 'Impôt'}</span>
                        <span className="font-bold text-black dark:text-white">{run.totalIrg.toLocaleString()} DZD</span>
                      </div>
                    </div>
                  </div>

                  {/* Bulletins List in this Run */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {runSlips.map((slip) => (
                      <div
                        key={slip.id}
                        className="p-3 rounded-xl bg-neutral-50 dark:bg-[#202024] border border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs text-black dark:text-white">{slip.staffFullName}</div>
                          <div className="text-[10px] font-mono text-black/60 dark:text-white/65 tabular-nums">{slip.matricule} · {slip.role}</div>
                          <div className="text-xs font-mono font-bold text-[#d4522f] mt-1 tabular-nums">{slip.netAPayer.toLocaleString()} DZD</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSlipForPrint(slip)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 text-black/80 dark:text-white/85 hover:text-[#d4522f] hover:border-[#d4522f] transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{isAr ? 'قسيمة' : isEn ? 'Slip' : 'Fiche'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Mode 2: Minute-by-Minute Punch Audit Log */}
      {historyMode === 'pointages' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {isAr ? 'سجل الحضور' : isEn ? 'Attendance Log' : 'Journal Pointages'}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-black dark:text-white"
              >
                <option value="all">{isAr ? 'الكل' : isEn ? 'All' : 'Tous'}</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={searchPunchQuery}
                  onChange={(e) => setSearchPunchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث...' : isEn ? 'Search...' : 'Rechercher...'}
                  className="px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/55 w-36 sm:w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="bg-neutral-50 dark:bg-[#202024] text-black/70 dark:text-white/75 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="p-3 font-semibold">{isAr ? 'الوقت' : isEn ? 'Time' : 'Date'}</th>
                  <th className="p-3 font-semibold">{isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur'}</th>
                  <th className="p-3 font-semibold text-center">{isAr ? 'النوع' : isEn ? 'Type' : 'Type'}</th>
                  <th className="p-3 font-semibold text-center">{isAr ? 'الطريقة' : isEn ? 'Method' : 'Méthode'}</th>
                  <th className="p-3 font-semibold">{isAr ? 'الجهاز' : isEn ? 'Terminal' : 'Borne'}</th>
                  <th className="p-3 font-semibold pr-4">{isAr ? 'ملاحظات' : isEn ? 'Notes' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredPunchLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-black/60 dark:text-white/65 text-xs">
                      {isAr ? 'لا توجد سجلات حضور مطابقة' : 'Aucun pointage correspondant aux critères.'}
                    </td>
                  </tr>
                ) : (
                  filteredPunchLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-black/75 dark:text-white/80">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : log.date}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-black dark:text-white">{log.staffName}</div>
                        <div className="text-[10px] text-black/60 dark:text-white/65">{log.staffRole}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.type === 'in'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {log.type === 'in' ? '🟢 Arrivée' : '🔴 Sortie'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-black/80 dark:text-white/85 font-bold uppercase">
                          {log.method}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-black/70 dark:text-white/75">
                        {log.terminalId || 'PORTIQUE_MAIN'}
                      </td>
                      <td className="p-3 text-[11px] text-black/70 dark:text-white/75 pr-4">
                        {log.lateMinutes ? (
                          <span className="text-amber-600 font-bold">Retard de {log.lateMinutes} min · </span>
                        ) : null}
                        {log.notes || 'Pointage régulier'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Print Modal */}
      <PayslipPrintModal
        isOpen={Boolean(activeSlipForPrint)}
        onClose={() => setActiveSlipForPrint(null)}
        slip={activeSlipForPrint}
        language={language}
      />
    </div>
  );
};

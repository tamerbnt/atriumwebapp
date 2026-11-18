import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Clock,
  Printer,
  CheckCircle2,
  Pin,
  Eye,
} from 'lucide-react';
import {
  StaffMember,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
  StaffAttendanceLogRecord,
} from '../../../types/index';
import { PayslipPrintModal } from './PayslipPrintModal';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  KineticSlideOverInspector,
  InspectorSection,
  InspectorCard,
  InspectorKeyValue,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  extractInitials,
  computeInitialsColor,
} from '../../ui/kinetic';

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
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [pinnedLogIds, setPinnedLogIds] = useState<Set<string>>(() => new Set<string>());
  const [selectedLog, setSelectedLog] = useState<StaffAttendanceLogRecord | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeSlipForPrint, setActiveSlipForPrint] = useState<StaffPayrollSlipRecord | null>(null);

  const filteredPunchLogs = useMemo(() => {
    const list = attendanceLogs.filter((log) => {
      if (selectedStaffFilter !== 'all' && log.staffId !== selectedStaffFilter) return false;
      if (searchPunchQuery.trim()) {
        const q = searchPunchQuery.toLowerCase();
        return (
          log.staffName.toLowerCase().includes(q) ||
          (log.terminalId || '').toLowerCase().includes(q) ||
          log.method.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const pa = pinnedLogIds.has(a.id) ? 0 : 1;
      const pb = pinnedLogIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (b.timestamp || b.date || '').localeCompare(a.timestamp || a.date || '');
    });
  }, [attendanceLogs, selectedStaffFilter, searchPunchQuery, pinnedLogIds]);

  const punchColumns: ColumnDefinition<StaffAttendanceLogRecord>[] = useMemo(
    () => [
      {
        key: 'staffName',
        header: isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur',
        sortable: true,
        renderCell: (log) => (
          <div>
            <div className="font-bold text-xs text-black dark:text-white">{log.staffName}</div>
            <div className="text-[11px] text-black/62 dark:text-white/65">{log.staffRole}</div>
          </div>
        ),
      },
      {
        key: 'method',
        header: isAr ? 'الطريقة' : isEn ? 'Method' : 'Méthode',
        sortable: true,
        renderCell: (log) => (
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#F3EDE7] dark:bg-[#262422] text-black/80 dark:text-white/85 font-bold uppercase">
            {log.method}
          </span>
        ),
      },
      {
        key: 'type',
        header: isAr ? 'النوع' : isEn ? 'Type' : 'Type',
        sortable: true,
        renderCell: (log) => (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
              log.type === 'in'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            {log.type === 'in' ? (isAr ? 'دخول' : isEn ? 'In' : 'Arrivée') : isAr ? 'خروج' : isEn ? 'Out' : 'Sortie'}
          </span>
        ),
      },
      {
        key: 'timestamp',
        header: isAr ? 'التوقيت' : isEn ? 'Time' : 'Date & Heure',
        sortable: true,
        renderCell: (log) => (
          <span className="font-mono text-[11px] text-black/75 dark:text-white/80 tabular-nums">
            {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : log.date}
          </span>
        ),
      },
    ],
    [isAr, isEn]
  );

  const getLogRowMeta = useCallback(
    (log: StaffAttendanceLogRecord): Partial<KineticRowData> => {
      const formattedTime = log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : log.date;
      return {
        title: log.staffName,
        subline: `${log.staffRole || 'Staff'} · ${formattedTime}`,
        avatarText: extractInitials(log.staffName),
        avatarColor: computeInitialsColor(log.staffName),
        categoryLabel: `${log.method.toUpperCase()} · ${log.terminalId || 'PORTIQUE_MAIN'}`,
        statusLabel: log.type === 'in' ? (isAr ? 'دخول' : isEn ? 'Clock In' : 'Arrivée') : isAr ? 'خروج' : isEn ? 'Clock Out' : 'Sortie',
        statusVariant: log.type === 'in' ? 'active' : 'warning',
        metricPrimary: formattedTime,
        metricSecondary: log.lateMinutes ? `${isAr ? 'تأخر' : isEn ? 'Late' : 'Retard'} ${log.lateMinutes}m` : log.terminalId || 'PORTIQUE_MAIN',
        detailCol1: {
          heading: isAr ? 'الموظف والتوقيت' : isEn ? 'Staff & Timestamp' : 'Collaborateur & Heure',
          primaryText: log.staffName,
          secondaryText: log.staffRole || 'Staff',
          tertiaryText: formattedTime,
        },
        detailCol2: {
          heading: isAr ? 'الجهاز والطريقة' : isEn ? 'Terminal & Method' : 'Borne & Méthode',
          primaryText: log.method.toUpperCase(),
          secondaryText: log.terminalId || 'PORTIQUE_MAIN',
          tertiaryText: log.type === 'in' ? (isAr ? 'تسجيل دخول' : isEn ? 'Entry scan' : 'Pointage entrée') : isAr ? 'تسجيل خروج' : isEn ? 'Exit scan' : 'Pointage sortie',
        },
        detailCol3: {
          heading: isAr ? 'الملاحظات والانضباط' : isEn ? 'Notes & Punctuality' : 'Notes & Ponctualité',
          primaryText: log.lateMinutes ? `${isAr ? 'تأخر' : isEn ? 'Late' : 'Retard'}: ${log.lateMinutes} min` : isAr ? 'في الوقت' : isEn ? 'On time' : 'À l’heure',
          secondaryText: log.notes || (isAr ? 'حضور منتظم' : isEn ? 'Regular punch' : 'Pointage régulier'),
        },
      };
    },
    [isAr, isEn]
  );

  const getLogFanActions = useCallback(
    (log: StaffAttendanceLogRecord): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'عرض التفاصيل' : isEn ? 'Inspect' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedLog(log);
        },
      },
      {
        id: 'pin',
        label: pinnedLogIds.has(log.id) ? (isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher') : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-[15px] h-[15px]" />,
        onClick: () =>
          setPinnedLogIds((prev) => {
            const next = new Set(prev);
            if (next.has(log.id)) next.delete(log.id);
            else next.add(log.id);
            return next;
          }),
      },
    ],
    [isAr, isEn, pinnedLogIds]
  );

  const getLogDetailActions = useCallback(
    (log: StaffAttendanceLogRecord): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'عرض السجل' : isEn ? 'Inspect Log' : 'Fiche Pointage',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => setSelectedLog(log),
      },
      {
        id: 'pin',
        label: pinnedLogIds.has(log.id) ? (isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher') : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-3.5 h-3.5" />,
        onClick: () =>
          setPinnedLogIds((prev) => {
            const next = new Set(prev);
            if (next.has(log.id)) next.delete(log.id);
            else next.add(log.id);
            return next;
          }),
      },
    ],
    [isAr, isEn, pinnedLogIds]
  );

  const activeLog = useMemo(() => {
    if (!selectedLog) return null;
    return filteredPunchLogs.find((l) => l.id === selectedLog.id) || selectedLog;
  }, [selectedLog, filteredPunchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1C1B1A] rounded-2xl border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs">
        <LiveSegmentedControl
          size="md"
          value={historyMode}
          onValueChange={(val) => setHistoryMode(val as 'salaires' | 'pointages')}
          options={[
            {
              value: 'salaires',
              label: isAr ? 'الرواتب' : isEn ? 'Payroll' : 'Salaires',
              tooltip: isAr ? 'سجل دفعات الرواتب' : isEn ? 'Payroll runs & slips' : 'Historique des salaires',
              icon: <FileText className="w-4 h-4 mr-1.5" />,
              count: payrollRuns.length,
            },
            {
              value: 'pointages',
              label: isAr ? 'الحضور' : isEn ? 'Logs' : 'Pointages',
              tooltip: isAr ? 'سجل الحضور والانصراف' : isEn ? 'Attendance punch logs' : 'Journal des pointages',
              icon: <Clock className="w-4 h-4 mr-1.5" />,
              count: attendanceLogs.length,
            },
          ]}
          aria-label="Staff History Mode"
        />

        <div className="text-xs text-black/70 dark:text-white/75 font-medium px-2">
          {historyMode === 'salaires'
            ? isAr ? 'أرشيف الرواتب' : isEn ? 'Payroll archive' : 'Archives paie'
            : isAr ? 'سجل الحضور' : isEn ? 'Attendance logs' : 'Journal pointages'}
        </div>
      </div>

      {historyMode === 'salaires' && (
        <div className="space-y-4">
          {payrollRuns.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#1C1B1A] rounded-2xl border border-[#E6DED6] dark:border-[#3A3734]">
              <FileText className="w-8 h-8 text-black/50 dark:text-white/55 mx-auto mb-2" />
              <p className="text-xs text-black/62 dark:text-white/65">
                {isAr ? 'لا يوجد أرشيف' : isEn ? 'No history' : 'Aucun historique'}
              </p>
            </div>
          ) : (
            payrollRuns.map((run) => {
              const runSlips = payrollSlips.filter((s) => s.payrollRunId === run.id);
              return (
                <div
                  key={run.id}
                  className="bg-white dark:bg-[#1C1B1A] rounded-2xl border border-[#E6DED6] dark:border-[#3A3734] p-5 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6DED6] dark:border-[#3A3734]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                          <span>{run.title}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 uppercase font-bold">
                            {run.status === 'paid' ? (isAr ? 'مدفوعة' : isEn ? 'Paid' : 'Payée') : isAr ? 'مسودة' : isEn ? 'Draft' : 'Brouillon'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums">
                          {run.slipsCount} {isAr ? 'موظف' : isEn ? 'staff' : 'agents'} · {run.approvedAt?.slice(0, 10) || run.createdAt.slice(0, 10)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px] font-sans">{isAr ? 'الصافي' : isEn ? 'Net' : 'Net'}</span>
                        <span className="font-bold text-sm text-[#d4522f]">{run.totalNet.toLocaleString()} DZD</span>
                      </div>
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px] font-sans">{isAr ? 'الضمان' : isEn ? 'Social' : 'Social'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{(run.totalCnasSalarial + run.totalCnasPatronal).toLocaleString()} DZD</span>
                      </div>
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px] font-sans">{isAr ? 'الضريبة' : isEn ? 'Tax' : 'Impôt'}</span>
                        <span className="font-bold text-black dark:text-white">{run.totalIrg.toLocaleString()} DZD</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {runSlips.map((slip) => (
                      <div
                        key={slip.id}
                        className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs text-black dark:text-white">{slip.staffFullName}</div>
                          <div className="text-[11px] font-mono text-black/62 dark:text-white/65 tabular-nums">{slip.matricule} · {slip.role}</div>
                          <div className="text-xs font-mono font-bold text-[#d4522f] mt-1 tabular-nums">{slip.netAPayer.toLocaleString()} DZD</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSlipForPrint(slip)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-[#1C1B1A] border border-[#D4C8BC] dark:border-[#3A3734] text-black/80 dark:text-white/85 hover:text-[#d4522f] hover:border-[#d4522f] transition-all cursor-pointer"
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

      {historyMode === 'pointages' && (
        <UniversalDataCollection<StaffAttendanceLogRecord>
          title={isAr ? 'سجل الحضور' : isEn ? 'Attendance Log' : 'Journal Pointages'}
          items={filteredPunchLogs}
          columns={punchColumns}
          keyExtractor={(l) => l.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          onViewModeChange={(m: string) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          showViewToggle
          searchQuery={searchPunchQuery}
          onSearchChange={setSearchPunchQuery}
          searchPlaceholder={isAr ? 'بحث...' : isEn ? 'Search...' : 'Rechercher...'}
          headerActions={
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              title={isAr ? 'تصفية حسب الموظف' : isEn ? 'Filter by staff member' : 'Filtrer par collaborateur'}
              className="h-9 px-3 text-xs font-medium rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-black dark:text-white"
            >
              <option value="all">{isAr ? 'الكل' : isEn ? 'All' : 'Tous'}</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id} title={s.fullName}>
                  {compactFilterLabel(s.fullName).label}
                </option>
              ))}
            </select>
          }
          pinnedIds={pinnedLogIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedLogIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          openItemId={activeLog?.id ?? null}
          onItemClick={(log, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedLog(log);
          }}
          onViewDetails={(log, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedLog(log);
          }}
          getRowMeta={getLogRowMeta}
          getFanActions={getLogFanActions}
          getDetailActions={getLogDetailActions}
          emptyTitle={isAr ? 'لا توجد سجلات حضور مطابقة' : isEn ? 'No matching punch logs' : 'Aucun pointage correspondant'}
          emptyDescription={isAr ? 'أعد ضبط الفلاتر' : isEn ? 'Adjust staff filter or search' : 'Modifiez le filtre collaborateur ou la recherche'}
        />
      )}

      <KineticSlideOverInspector<StaffAttendanceLogRecord>
        isOpen={Boolean(activeLog)}
        item={activeLog}
        allItems={filteredPunchLogs}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeLog?.staffName || ''}
        subtitle={activeLog?.staffRole || ''}
        categoryLabel={activeLog?.method.toUpperCase()}
        avatarText={activeLog ? extractInitials(activeLog.staffName) : 'LG'}
        statusLabel={activeLog?.type === 'in' ? (isAr ? 'دخول' : isEn ? 'Clock In' : 'Arrivée') : isAr ? 'خروج' : isEn ? 'Clock Out' : 'Sortie'}
        onSelectItem={(log) => setSelectedLog(log)}
        onClose={() => setSelectedLog(null)}
        renderBody={(log) => (
          <InspectorSection title={isAr ? 'تفاصيل البصمة' : isEn ? 'Punch Details' : 'Détails du Pointage'}>
            <InspectorCard>
              <InspectorKeyValue label={isAr ? 'التاريخ والوقت' : isEn ? 'Timestamp' : 'Date & Heure'} value={log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : log.date} mono />
              <InspectorKeyValue label={isAr ? 'النوع' : isEn ? 'Type' : 'Mouvement'} value={log.type === 'in' ? (isAr ? 'دخول' : 'Arrivée') : isAr ? 'خروج' : 'Sortie'} />
              <InspectorKeyValue label={isAr ? 'الطريقة' : isEn ? 'Method' : 'Méthode'} value={log.method.toUpperCase()} mono />
              <InspectorKeyValue label={isAr ? 'الجهاز' : isEn ? 'Terminal' : 'Borne'} value={log.terminalId || 'PORTIQUE_MAIN'} mono />
              <InspectorKeyValue label={isAr ? 'التأخر' : isEn ? 'Late Minutes' : 'Retard'} value={log.lateMinutes ? `${log.lateMinutes} min` : '0 min'} mono />
              <InspectorKeyValue label={isAr ? 'ملاحظات' : isEn ? 'Notes' : 'Notes'} value={log.notes || 'Pointage régulier'} />
            </InspectorCard>
          </InspectorSection>
        )}
      />

      <PayslipPrintModal
        isOpen={Boolean(activeSlipForPrint)}
        onClose={() => setActiveSlipForPrint(null)}
        slip={activeSlipForPrint}
        language={language}
      />
    </div>
  );
};

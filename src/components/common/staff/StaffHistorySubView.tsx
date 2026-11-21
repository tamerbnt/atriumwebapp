import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Clock,
  Printer,
  CheckCircle2,
  Pin,
  Eye,
  Undo2,
} from 'lucide-react';
import {
  StaffMember,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
  StaffAttendanceLogRecord,
  SupportedLanguage,
} from '../../../types/index';
import { useAtriumSelector, shallowEqualObjects } from '../../../services/store';
import { useUndoHistory } from '../../../services/undoEngine';
import { EmbeddedUndoHistoryPanel } from '../../ui/EmbeddedUndoHistoryPanel';
import { PayslipPrintModal } from './PayslipPrintModal';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import {
  KineticEmptyStateMotion,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorCard,
  InspectorKeyValue,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  ListAdvancedMenuButton,
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

  const { currentBusinessId, currentBranchId } = useAtriumSelector(
    (s) => ({
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
    }),
    shallowEqualObjects
  );
  const { entries: staffUndoEntries } = useUndoHistory(currentBusinessId, currentBranchId);
  const staffUndoCount = useMemo(
    () => staffUndoEntries.filter((e) => e.vertical === 'staff' && e.status === 'available').length,
    [staffUndoEntries]
  );

  const [historyMode, setHistoryMode] = useState<'salaires' | 'pointages' | 'annulations'>('salaires');
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
          <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
            <div className="t-label font-semibold text-[var(--text-1)] dark:text-white">{log.staffName}</div>
            <div className="t-cap text-[var(--text-2)] dark:text-white/65">{log.staffRole}</div>
          </div>
        ),
      },
      {
        key: 'method',
        header: isAr ? 'الطريقة' : isEn ? 'Method' : 'Méthode',
        sortable: true,
        renderCell: (log) => (
          <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white/85 t-small font-semibold">
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
            className={`inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold ${
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
          <span className="t-cap text-[var(--text-2)] dark:text-white/80 tabular-nums">
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
        icon: <Eye className="w-4 h-4" strokeWidth={1.5} />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedLog(log);
        },
      },
      {
        id: 'pin',
        label: pinnedLogIds.has(log.id) ? (isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher') : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-4 h-4" strokeWidth={1.5} />,
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
        icon: <Eye className="w-4 h-4" strokeWidth={1.5} />,
        onClick: () => setSelectedLog(log),
      },
      {
        id: 'pin',
        label: pinnedLogIds.has(log.id) ? (isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher') : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-4 h-4" strokeWidth={1.5} />,
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
    <div className="flex flex-col gap-[var(--s4,16px)]">
      <div className="sq-elev-card">
        <div
          data-sq="card"
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[var(--s3,12px)] p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E]"
        >
        <LiveSegmentedControl
          size="md"
          value={historyMode}
          onValueChange={(val) => setHistoryMode(val as 'salaires' | 'pointages' | 'annulations')}
          options={[
            {
              value: 'salaires',
              label: isAr ? 'الرواتب' : isEn ? 'Payroll' : 'Salaires',
              tooltip: isAr ? 'سجل دفعات الرواتب' : isEn ? 'Payroll runs & slips' : 'Historique des salaires',
              icon: <FileText className="w-4 h-4" strokeWidth={1.5} />,
              count: payrollRuns.length,
            },
            {
              value: 'pointages',
              label: isAr ? 'الحضور' : isEn ? 'Logs' : 'Pointages',
              tooltip: isAr ? 'سجل الحضور والانصراف' : isEn ? 'Attendance punch logs' : 'Journal des pointages',
              icon: <Clock className="w-4 h-4" strokeWidth={1.5} />,
              count: attendanceLogs.length,
            },
            {
              value: 'annulations',
              label: isAr ? 'الإلغاءات' : isEn ? 'Undos' : 'Annulations',
              tooltip: isAr ? 'سجل التراجع عن عمليات الموظفين' : isEn ? 'Staff undo & rollback log' : 'Annulations équipe & RH',
              icon: <Undo2 className="w-4 h-4" strokeWidth={1.5} />,
              count: staffUndoCount,
            },
          ]}
          aria-label="Staff History Mode"
        />

        <div className="flex items-center gap-2 px-[var(--s2,8px)]">
          <div className="t-label text-[var(--text-2)] dark:text-white/75">
            {historyMode === 'salaires'
              ? isAr ? 'أرشيف الرواتب' : isEn ? 'Payroll archive' : 'Archives paie'
              : historyMode === 'pointages'
              ? isAr ? 'سجل الحضور' : isEn ? 'Attendance logs' : 'Journal pointages'
              : isAr ? 'سجل الإلغاءات' : isEn ? 'Staff undo log' : 'Annulations RH'}
          </div>
          {historyMode !== 'pointages' && (
            <ListAdvancedMenuButton language={language} />
          )}
        </div>
        </div>
      </div>

      {historyMode === 'annulations' && (
        <EmbeddedUndoHistoryPanel
          businessId={currentBusinessId}
          branchId={currentBranchId}
          vertical="staff"
          language={(language as SupportedLanguage) || 'fr'}
          lockVerticalScope
        />
      )}

      {historyMode === 'salaires' && (
        <div className="flex flex-col gap-[var(--pod-gap,16px)]">
          {payrollRuns.length === 0 ? (
            <KineticEmptyStateMotion motionKey={`staff-hist-empty-${language}`}>
              <EmptyState
                variant="compact"
                tone="neutral"
                icon={<FileText className="w-4 h-4" strokeWidth={1.5} />}
                title={isAr ? 'لا يوجد أرشيف' : isEn ? 'No payroll history' : 'Aucun historique de paie'}
                description={
                  isAr
                    ? 'ستظهر مسيرات الرواتب المعتمدة هنا بعد إغلاقها.'
                    : isEn
                    ? 'Approved payroll runs will appear here once finalized.'
                    : 'Les clôtures de paie validées apparaîtront ici.'
                }
              />
            </KineticEmptyStateMotion>
          ) : (
            payrollRuns.map((run) => {
              const runSlips = payrollSlips.filter((s) => s.payrollRunId === run.id);
              return (
                <div key={run.id} className="sq-elev-card">
                  <div
                    data-sq="panel"
                    className="bg-white dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]"
                  >
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] border-b border-[var(--atr-divider)]"
                      style={{ padding: 'var(--pod-head-pad, 4px 12px 12px)' }}
                    >
                      <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                        <div
                          data-sq="tile"
                          className="w-[var(--tile-md,40px)] h-[var(--tile-md,40px)] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                        >
                          <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
                        </div>
                        <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
                          <h4 className="t-card text-[var(--text-1)] dark:text-white flex items-center gap-[var(--s2,8px)]">
                            <span>{run.title}</span>
                            <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 t-small font-semibold">
                              {run.status === 'paid' ? (isAr ? 'مدفوعة' : isEn ? 'Paid' : 'Payée') : isAr ? 'مسودة' : isEn ? 'Draft' : 'Brouillon'}
                            </span>
                          </h4>
                          <p className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums">
                            {run.slipsCount} {isAr ? 'موظف' : isEn ? 'staff' : 'agents'} · {run.approvedAt?.slice(0, 10) || run.createdAt.slice(0, 10)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-[var(--s4,16px)] tabular-nums">
                        <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
                          <span className="text-[var(--text-2)] dark:text-white/65 block t-cap">{isAr ? 'الصافي' : isEn ? 'Net' : 'Net'}</span>
                          <span className="t-card text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{run.totalNet.toLocaleString()} DZD</span>
                        </div>
                        <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
                          <span className="text-[var(--text-2)] dark:text-white/65 block t-cap">{isAr ? 'الضمان' : isEn ? 'Social' : 'Social'}</span>
                          <span className="t-label font-semibold text-emerald-600 dark:text-emerald-400">{(run.totalCnasSalarial + run.totalCnasPatronal).toLocaleString()} DZD</span>
                        </div>
                        <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
                          <span className="text-[var(--text-2)] dark:text-white/65 block t-cap">{isAr ? 'الضريبة' : isEn ? 'Tax' : 'Impôt'}</span>
                          <span className="t-label font-semibold text-[var(--text-1)] dark:text-white">{run.totalIrg.toLocaleString()} DZD</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--card-gap,12px)]">
                      {runSlips.map((slip) => (
                        <div
                          key={slip.id}
                          data-sq="card"
                          className="p-[var(--card-pad,20px)] card-opt bg-[#FBF8F5] dark:bg-[#22201E] flex items-center justify-between gap-[var(--s3,12px)]"
                        >
                          <div className="flex flex-col gap-[var(--title-cap-gap,2px)] min-w-0">
                            <div className="t-label font-semibold text-[var(--text-1)] dark:text-white truncate">{slip.staffFullName}</div>
                            <div className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums truncate">{slip.matricule} · {slip.role}</div>
                            <div className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">{slip.netAPayer.toLocaleString()} DZD</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveSlipForPrint(slip)}
                            data-sq="ctl-sm"
                            data-sq-border="none"
                            className="flex items-center h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] gap-[var(--btn-sm-gap,6px)] t-btn bg-[#F3EDE7] dark:bg-[#2B2825] hover:bg-[#EDE6DF] dark:hover:bg-[#332F2B] text-[var(--text-1)] dark:text-white/85 hover:text-[var(--brand-text,#BF431F)] transition-all cursor-pointer shrink-0"
                          >
                            <Printer className="w-4 h-4" strokeWidth={1.5} />
                            <span>{isAr ? 'قسيمة' : isEn ? 'Slip' : 'Fiche'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
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
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="h-[var(--btn-h,40px)] bg-[#F5F1EC] dark:bg-[#2B2825] flex items-center"
            >
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                title={isAr ? 'تصفية حسب الموظف' : isEn ? 'Filter by staff member' : 'Filtrer par collaborateur'}
                className="h-full px-[var(--s3,12px)] t-btn bg-transparent text-[var(--text-1)] dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all">{isAr ? 'الكل' : isEn ? 'All' : 'Tous'}</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id} title={s.fullName}>
                    {compactFilterLabel(s.fullName).label}
                  </option>
                ))}
              </select>
            </div>
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

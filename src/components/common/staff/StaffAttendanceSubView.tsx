import React, { useState, useMemo, useCallback } from 'react';
import {
  Clock,
  Plus,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  RotateCw,
  Pin,
  Eye,
} from 'lucide-react';
import { StaffMember, StaffAttendanceDayStatus, StaffAttendanceLogRecord } from '../../../types/index';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
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
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { X } from 'lucide-react';

interface StaffAttendanceSubViewProps {
  staffList: StaffMember[];
  attendanceLogs: StaffAttendanceLogRecord[];
  onOpenKiosk: () => void;
  onPunchStaff: (staffId: string) => void;
  onManualLog: (staffId: string, date: string, type: 'in' | 'out', time: string, notes?: string) => void;
  language: string;
}

export const StaffAttendanceSubView: React.FC<StaffAttendanceSubViewProps> = ({
  staffList,
  attendanceLogs,
  onOpenKiosk,
  onPunchStaff,
  onManualLog,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'leave'>('all');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualStaffId, setManualStaffId] = useState<string>(staffList[0]?.id || '');
  const [manualType, setManualType] = useState<'in' | 'out'>('in');
  const [manualTime, setManualTime] = useState<string>('08:00');
  const [manualNotes, setManualNotes] = useState<string>('');

  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const distanceToSaturday = (dayOfWeek + 1) % 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - distanceToSaturday + currentWeekOffset * 7);

    const days: { dateStr: string; labelFR: string; labelAR: string; labelEN: string; dayNum: number }[] = [];
    const labelsFR = ['Sam', 'Dim', 'Lun', 'Mar', 'Mer', 'Jeu'];
    const labelsEN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const labelsAR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(saturday);
      d.setDate(saturday.getDate() + i);
      days.push({
        dateStr: d.toISOString().slice(0, 10),
        labelFR: `${labelsFR[i]} ${d.getDate()}`,
        labelEN: `${labelsEN[i]} ${d.getDate()}`,
        labelAR: `${labelsAR[i]} ${d.getDate()}`,
        dayNum: d.getDate(),
      });
    }
    return days;
  }, [currentWeekOffset]);

  const [gridStatuses, setGridStatuses] = useState<Record<string, StaffAttendanceDayStatus>>({});

  const getDayStatus = useCallback(
    (staffId: string, dateStr: string): StaffAttendanceDayStatus => {
      const key = `${staffId}_${dateStr}`;
      if (gridStatuses[key]) return gridStatuses[key];

      const hasPunch = attendanceLogs.some((l) => l.staffId === staffId && l.date === dateStr);
      const member = staffList.find((s) => s.id === staffId);
      if (member?.status === 'on_leave' || member?.status === 'vacation') return 'vacation';
      if (hasPunch) return 'present';
      if (member?.isClockedInToday && dateStr === new Date().toISOString().slice(0, 10)) return 'present';

      const isPast = dateStr < new Date().toISOString().slice(0, 10);
      return isPast ? 'present' : 'rest';
    },
    [gridStatuses, attendanceLogs, staffList]
  );

  const cycleDayStatus = useCallback(
    (staffId: string, dateStr: string) => {
      const key = `${staffId}_${dateStr}`;
      const current = getDayStatus(staffId, dateStr);
      const order: StaffAttendanceDayStatus[] = ['present', 'late', 'half_day', 'absent_justified', 'absent_unjustified'];
      const nextIdx = (order.indexOf(current) + 1) % order.length;
      setGridStatuses((prev) => ({ ...prev, [key]: order[nextIdx] }));
    },
    [getDayStatus]
  );

  const getStatusText = useCallback(
    (status: StaffAttendanceDayStatus): string => {
      switch (status) {
        case 'present':
          return isAr ? 'حاضر (8س)' : isEn ? 'Present (8h)' : 'Présent (8h)';
        case 'late':
          return isAr ? 'متأخر (15د)' : isEn ? 'Late (15m)' : 'Retard (15m)';
        case 'half_day':
          return isAr ? 'نصف يوم (4س)' : isEn ? '1/2 Day (4h)' : '1/2 Jour (4h)';
        case 'absent_justified':
          return isAr ? 'غياب مبرر' : isEn ? 'Excused' : 'Justifié';
        case 'absent_unjustified':
          return isAr ? 'غياب غير مبرر' : isEn ? 'Unexcused' : 'Injustifié';
        case 'vacation':
          return isAr ? 'عطلة' : isEn ? 'On Leave' : 'Congé';
        default:
          return '—';
      }
    },
    [isAr, isEn]
  );

  const renderStatusBadge = (status: StaffAttendanceDayStatus) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] t-small font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/12 dark:bg-emerald-500/18 px-[var(--pill-px,10px)] rounded-full">
            {getStatusText(status)}
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] t-small font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/12 dark:bg-amber-500/18 px-[var(--pill-px,10px)] rounded-full">
            {getStatusText(status)}
          </span>
        );
      case 'half_day':
        return (
          <span className="inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] t-small font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/12 dark:bg-blue-500/18 px-[var(--pill-px,10px)] rounded-full">
            {getStatusText(status)}
          </span>
        );
      case 'absent_justified':
        return (
          <span className="inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] t-small font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/12 dark:bg-purple-500/18 px-[var(--pill-px,10px)] rounded-full">
            {getStatusText(status)}
          </span>
        );
      case 'absent_unjustified':
        return (
          <span className="inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] t-small font-semibold text-red-700 dark:text-red-300 bg-red-500/12 dark:bg-red-500/18 px-[var(--pill-px,10px)] rounded-full">
            {getStatusText(status)}
          </span>
        );
      case 'vacation':
        return (
          <span className="inline-flex items-center h-[var(--pill-h,24px)] gap-[var(--pill-gap,6px)] t-small font-semibold text-[var(--text-1)] dark:text-white/80 bg-[#F3EDE7] dark:bg-[#2B2825] px-[var(--pill-px,10px)] rounded-full">
            {getStatusText(status)}
          </span>
        );
      default:
        return <span className="text-[var(--text-2)] dark:text-white/60 t-small">—</span>;
    }
  };

  const computeWeeklyHours = useCallback(
    (staffId: string) => {
      let hours = 0;
      let presentDays = 0;
      let lateDays = 0;
      for (const d of weekDays) {
        const st = getDayStatus(staffId, d.dateStr);
        if (st === 'present') {
          hours += 8;
          presentDays++;
        } else if (st === 'late') {
          hours += 7.75;
          presentDays++;
          lateDays++;
        } else if (st === 'half_day') {
          hours += 4;
          presentDays++;
        }
      }
      return { hours, presentDays, lateDays };
    },
    [weekDays, getDayStatus]
  );

  const filteredStaff = useMemo(() => {
    const list = staffList.filter((m) => {
      if (statusFilter === 'present' && !m.isClockedInToday) return false;
      if (statusFilter === 'leave' && m.status !== 'on_leave' && m.status !== 'vacation') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.fullName.toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q) ||
          (m.phoneNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [staffList, statusFilter, searchQuery, pinnedIds]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    onManualLog(manualStaffId, today, manualType, manualTime, manualNotes);
    setIsManualModalOpen(false);
  };

  const presentCount = staffList.filter((s) => s.isClockedInToday).length;
  const onLeaveCount = staffList.filter((s) => s.status === 'on_leave' || s.status === 'vacation').length;
  const lateCount = attendanceLogs.filter((l) => l.date === new Date().toISOString().slice(0, 10) && (l.lateMinutes || 0) > 0).length;
  const todayStr = new Date().toISOString().slice(0, 10);

  const columns: ColumnDefinition<StaffMember>[] = useMemo(
    () => [
      {
        key: 'fullName',
        header: isAr ? 'الموظف' : isEn ? 'Staff Member' : 'Collaborateur',
        sortable: true,
        renderCell: (m) => (
          <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
            <div className="t-label font-semibold text-[var(--text-1)] dark:text-white">{m.fullName}</div>
            <div className="t-cap text-[var(--text-2)] dark:text-white/65">{m.role}</div>
          </div>
        ),
      },
      {
        key: 'role',
        header: isAr ? 'المنصب' : isEn ? 'Role' : 'Poste',
        sortable: true,
        renderCell: (m) => <span className="t-body text-[var(--text-2)] dark:text-white/80">{m.role || '—'}</span>,
      },
      {
        key: 'status',
        header: isAr ? 'حالة اليوم' : isEn ? 'Today' : 'Statut Jour',
        sortable: true,
        renderCell: (m) => renderStatusBadge(getDayStatus(m.id, todayStr)),
      },
      {
        key: 'hours',
        header: isAr ? 'الساعات الأسبوعية' : isEn ? 'Weekly Hours' : 'Heures Hebdo',
        renderCell: (m) => {
          const { hours } = computeWeeklyHours(m.id);
          return <span className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">{hours} h</span>;
        },
      },
    ],
    [isAr, isEn, getDayStatus, todayStr, computeWeeklyHours]
  );

  const getRowMeta = useCallback(
    (m: StaffMember): Partial<KineticRowData> => {
      const todayStatus = getDayStatus(m.id, todayStr);
      const { hours, presentDays, lateDays } = computeWeeklyHours(m.id);
      const daySummaries = weekDays.map((d) => {
        const lbl = isAr ? d.labelAR : isEn ? d.labelEN : d.labelFR;
        return `${lbl}: ${getStatusText(getDayStatus(m.id, d.dateStr))}`;
      });
      return {
        title: m.fullName,
        subline: `${m.role || 'Staff'} · ${m.badgeToken || m.cardId || m.phoneNumber || 'RFID'}`,
        avatarText: extractInitials(m.fullName),
        avatarColor: computeInitialsColor(m.fullName),
        categoryLabel: m.role || (m.contractType || 'CDI'),
        statusLabel: getStatusText(todayStatus),
        statusVariant:
          todayStatus === 'present'
            ? 'active'
            : todayStatus === 'late' || todayStatus === 'half_day'
            ? 'warning'
            : todayStatus === 'absent_unjustified'
            ? 'blocked'
            : 'info',
        metricPrimary: `${hours} h`,
        metricSecondary: `${presentDays}/6 ${isAr ? 'أيام' : isEn ? 'days' : 'j'}`,
        detailCol1: {
          heading: isAr ? 'ملخص الأسبوع' : isEn ? 'Week Summary' : 'Bilan Hebdo',
          primaryText: `${hours} h (${presentDays}/6 ${isAr ? 'أيام' : isEn ? 'days' : 'jours'})`,
          secondaryText: lateDays > 0 ? `${lateDays} ${isAr ? 'تأخر' : isEn ? 'late' : 'retard(s)'}` : isAr ? 'انضباط تام' : isEn ? 'Zero tardiness' : 'Aucun retard',
          tertiaryText: m.badgeToken ? `RFID: ${m.badgeToken}` : undefined,
        },
        detailCol2: {
          heading: isAr ? 'السبت - الإثنين' : isEn ? 'Sat – Mon' : 'Sam – Lun',
          primaryText: daySummaries[0],
          secondaryText: daySummaries[1],
          tertiaryText: daySummaries[2],
        },
        detailCol3: {
          heading: isAr ? 'الثلاثاء - الخميس' : isEn ? 'Tue – Thu' : 'Mar – Jeu',
          primaryText: daySummaries[3],
          secondaryText: daySummaries[4],
          tertiaryText: daySummaries[5],
        },
      };
    },
    [getDayStatus, todayStr, computeWeeklyHours, weekDays, isAr, isEn, getStatusText]
  );

  const getFanActions = useCallback(
    (m: StaffMember): KineticRowFanAction[] => [
      {
        id: 'punch',
        label: isAr ? 'تسجيل حضور' : isEn ? 'Clock In' : 'Pointer',
        icon: <Fingerprint className="w-4 h-4" strokeWidth={1.5} />,
        onClick: () => onPunchStaff(m.id),
      },
      {
        id: 'cycle',
        label: isAr ? 'تبديل حالة اليوم' : isEn ? 'Cycle Today' : 'Changer Statut Jour',
        icon: <RotateCw className="w-4 h-4" strokeWidth={1.5} />,
        onClick: () => cycleDayStatus(m.id, todayStr),
      },
    ],
    [isAr, isEn, onPunchStaff, cycleDayStatus, todayStr]
  );

  const getDetailActions = useCallback(
    (m: StaffMember): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'الجدول الأسبوعي' : isEn ? 'Weekly Sheet' : 'Grille Semaine',
        icon: <Eye className="w-4 h-4" strokeWidth={1.5} />,
        onClick: () => setSelectedStaff(m),
      },
      {
        id: 'punch',
        label: isAr ? 'تسجيل حضور' : isEn ? 'Clock In' : 'Pointer',
        icon: <Fingerprint className="w-4 h-4 text-[#096b40]" strokeWidth={1.5} />,
        onClick: () => onPunchStaff(m.id),
      },
      {
        id: 'cycle',
        label: isAr ? 'تبديل اليوم' : isEn ? 'Cycle Today' : 'Statut Jour',
        icon: <RotateCw className="w-4 h-4" strokeWidth={1.5} />,
        onClick: () => cycleDayStatus(m.id, todayStr),
      },
      {
        id: 'pin',
        label: pinnedIds.has(m.id) ? (isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher') : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-4 h-4" strokeWidth={1.5} />,
        onClick: () =>
          setPinnedIds((prev) => {
            const next = new Set(prev);
            if (next.has(m.id)) next.delete(m.id);
            else next.add(m.id);
            return next;
          }),
      },
    ],
    [isAr, isEn, onPunchStaff, cycleDayStatus, todayStr, pinnedIds]
  );

  const activeStaff = useMemo(() => {
    if (!selectedStaff) return null;
    return filteredStaff.find((s) => s.id === selectedStaff.id) || selectedStaff;
  }, [selectedStaff, filteredStaff]);

  return (
    <div className="flex flex-col gap-[var(--s4,16px)]">
      <div className="sq-elev-card">
        <div
          data-sq="card"
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[var(--s3,12px)] p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E]"
        >
          <div className="flex items-center gap-[var(--s3,12px)]">
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="flex items-center gap-[var(--s1,4px)] bg-[#F3EDE7] dark:bg-[#191716] p-[var(--seg-l-pad,4px)] h-[var(--seg-l-h,40px)]"
            >
              <button
                type="button"
                onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                data-sq="thumb"
                data-sq-border="none"
                className="w-[var(--seg-thumb-h,32px)] h-[var(--seg-thumb-h,32px)] flex items-center justify-center hover:bg-white dark:hover:bg-[#2B2825] text-[var(--text-1)] dark:text-white/80 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <span className="t-label font-semibold px-[var(--s2,8px)] text-[var(--text-1)] dark:text-white tabular-nums">
                {isAr ? 'أسبوع العمل' : isEn ? 'Week' : 'Semaine du'} {weekDays[0].labelFR} – {weekDays[5].labelFR}
              </span>
              <button
                type="button"
                onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                data-sq="thumb"
                data-sq-border="none"
                className="w-[var(--seg-thumb-h,32px)] h-[var(--seg-thumb-h,32px)] flex items-center justify-center hover:bg-white dark:hover:bg-[#2B2825] text-[var(--text-1)] dark:text-white/80 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            {currentWeekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setCurrentWeekOffset(0)}
                className="t-btn text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline cursor-pointer"
              >
                {isAr ? 'العودة لليوم' : isEn ? 'Current week' : 'Semaine actuelle'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-[var(--s2,8px)]">
            <AtriumButton
              variant="secondary"
              size="md"
              onClick={() => setIsManualModalOpen(true)}
              icon={<Plus className="w-4 h-4 text-[var(--text-2)] dark:text-white/75" strokeWidth={1.5} />}
            >
              <span>{isAr ? 'تسجيل يدوي' : isEn ? 'Manual Log' : 'Saisie Manuelle'}</span>
            </AtriumButton>

            <AtriumButton
              variant="primary"
              size="md"
              onClick={onOpenKiosk}
              icon={<QrCode className="w-4 h-4" strokeWidth={1.5} />}
              className="shadow-xs"
            >
              <span>{isAr ? 'كشك الحضور' : isEn ? 'Clock Kiosk' : 'Borne Badge'}</span>
            </AtriumButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--card-gap,12px)]">
        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'الحضور' : isEn ? 'Present' : 'Présents'}</p>
            <p className="t-kpi-m mt-auto text-emerald-600 dark:text-emerald-400 tabular-nums flex items-baseline gap-[var(--num-unit-gap,6px)]">
              <span>{presentCount}</span>
              <span className="t-unit text-[var(--text-2)] dark:text-white/65">/ {staffList.length}</span>
            </p>
          </div>
        </div>
        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'التأخير' : isEn ? 'Late' : 'Retards'}</p>
            <p className="t-kpi-m mt-auto text-amber-600 dark:text-amber-400 tabular-nums">{lateCount}</p>
          </div>
        </div>
        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'العطل' : isEn ? 'On Leave' : 'En Congé'}</p>
            <p className="t-kpi-m mt-auto text-[var(--text-1)] dark:text-white tabular-nums">{onLeaveCount}</p>
          </div>
        </div>
        <div className="sq-elev-card">
          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] card-opt min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] bg-white dark:bg-[#22201E]"
          >
            <p className="t-label text-[var(--text-2)] dark:text-white/75">{isAr ? 'الالتزام' : isEn ? 'Rate' : 'Assiduité'}</p>
            <p className="t-kpi-m mt-auto text-[var(--brand-accent,#D9532B)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
              {Math.round((presentCount / Math.max(1, staffList.length)) * 100)}%
            </p>
          </div>
        </div>
      </div>

      <UniversalDataCollection<StaffMember>
        title={isAr ? 'جدول الحضور الأسبوعي' : isEn ? 'Weekly Timesheet' : 'Grille Présence Hebdomadaire'}
        items={filteredStaff}
        columns={columns}
        keyExtractor={(m) => m.id}
        viewMode={viewMode}
        onViewModeChange={(m: string) => setViewMode(m === 'grid' ? 'grid' : m === 'calendar' ? 'calendar' : 'list')}
        showViewToggle
        showCalendarToggle
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={isAr ? 'بحث في جدول الحضور...' : isEn ? 'Search timesheet...' : 'Rechercher collaborateur...'}
        filterOptions={[
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: staffList.length },
          { value: 'present', label: isAr ? 'حاضر' : isEn ? 'Present' : 'Présents', count: presentCount },
          { value: 'leave', label: isAr ? 'عطلة' : isEn ? 'On Leave' : 'En Congé', count: onLeaveCount },
        ]}
        filterValue={statusFilter}
        onFilterChange={(v) => setStatusFilter(v as any)}
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
        openItemId={activeStaff?.id ?? null}
        onItemClick={(m, el) => {
          setDrawerOpenerEl(el || null);
          setSelectedStaff(m);
        }}
        onViewDetails={(m, el) => {
          setDrawerOpenerEl(el || null);
          setSelectedStaff(m);
        }}
        getRowMeta={getRowMeta}
        getFanActions={getFanActions}
        getDetailActions={getDetailActions}
        renderCalendarView={() => (
          <div className="flex flex-col gap-[var(--card-gap,12px)]">
            {filteredStaff.map((member) => {
              const { hours } = computeWeeklyHours(member.id);
              return (
                <div key={member.id} className="sq-elev-card">
                  <div
                    data-sq="panel"
                    className="p-[var(--pod-pad,12px)] bg-white dark:bg-[#191716] flex flex-col lg:flex-row lg:items-center justify-between gap-[var(--s3,12px)]"
                  >
                    <div className="min-w-[180px] px-[var(--s1,4px)] flex flex-col gap-[var(--title-cap-gap,2px)]">
                      <div className="t-label font-semibold text-[var(--text-1)] dark:text-white">{member.fullName}</div>
                      <div className="t-cap text-[var(--text-2)] dark:text-white/65">{member.role}</div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-[var(--s2,8px)] flex-1">
                      {weekDays.map((d) => {
                        const st = getDayStatus(member.id, d.dateStr);
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => cycleDayStatus(member.id, d.dateStr)}
                            data-sq="card"
                            className="p-[var(--s2,8px)] bg-[#FBF8F5] dark:bg-[#22201E] flex flex-col items-center gap-[var(--s1,4px)] cursor-pointer transition-colors"
                          >
                            <span className="t-small text-[var(--text-2)] dark:text-white/65">
                              {isAr ? d.labelAR : isEn ? d.labelEN : d.labelFR}
                            </span>
                            {renderStatusBadge(st)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="t-card text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums lg:text-right min-w-[60px] px-[var(--s1,4px)]">
                      {hours} h
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        emptyTitle={isAr ? 'لا يوجد موظفون' : isEn ? 'No staff records' : 'Aucun collaborateur'}
        emptyDescription={isAr ? 'أعد ضبط معايير البحث' : isEn ? 'Adjust search criteria' : 'Modifiez vos critères de recherche'}
      />

      <KineticSlideOverInspector<StaffMember>
        isOpen={Boolean(activeStaff)}
        item={activeStaff}
        allItems={filteredStaff}
        keyExtractor={(m) => m.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeStaff?.fullName || ''}
        subtitle={activeStaff?.role || ''}
        categoryLabel={activeStaff?.contractType || 'CDI'}
        avatarText={activeStaff ? extractInitials(activeStaff.fullName) : 'ST'}
        statusLabel={activeStaff ? getStatusText(getDayStatus(activeStaff.id, todayStr)) : undefined}
        onSelectItem={(m) => setSelectedStaff(m)}
        onClose={() => setSelectedStaff(null)}
        renderBody={(m) => {
          const { hours, presentDays, lateDays } = computeWeeklyHours(m.id);
          return (
            <div className="flex flex-col gap-[var(--s4,16px)]">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'punch',
                    label: isAr ? 'تسجيل حضور' : isEn ? 'Clock In' : 'Pointer',
                    icon: <Fingerprint size={16} strokeWidth={1.5} />,
                    primary: true,
                    onClick: () => onPunchStaff(m.id),
                  },
                  {
                    id: 'manual',
                    label: isAr ? 'إدخال يدوي' : isEn ? 'Manual Log' : 'Saisie Manuelle',
                    icon: <Clock size={16} strokeWidth={1.5} />,
                    onClick: () => {
                      setManualStaffId(m.id);
                      setIsManualModalOpen(true);
                    },
                  },
                ]}
              />
              <InspectorSection title={isAr ? 'ملخص الأسبوع' : isEn ? 'Weekly Summary' : 'Bilan Hebdomadaire'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'ساعات العمل' : isEn ? 'Total Hours' : 'Total Heures'} value={`${hours} h`} mono />
                  <InspectorKeyValue label={isAr ? 'أيام الحضور' : isEn ? 'Days Present' : 'Jours Présents'} value={`${presentDays} / 6`} />
                  <InspectorKeyValue label={isAr ? 'حالات التأخير' : isEn ? 'Late Count' : 'Retards'} value={String(lateDays)} />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection title={isAr ? 'تفصيل الأيام (اضغط للتغيير)' : isEn ? 'Daily Breakdown (Click to cycle)' : 'Détail des Jours (Cliquer pour modifier)'}>
                <div className="flex flex-col gap-[var(--s2,8px)]">
                  {weekDays.map((d) => {
                    const st = getDayStatus(m.id, d.dateStr);
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => cycleDayStatus(m.id, d.dateStr)}
                        data-sq="card"
                        className="w-full p-[var(--s3,12px)] bg-white dark:bg-[#22201E] hover:dark:bg-[#282523] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="t-label font-semibold text-[var(--text-1)] dark:text-white">
                          {isAr ? d.labelAR : isEn ? d.labelEN : d.labelFR} ({d.dateStr})
                        </span>
                        {renderStatusBadge(st)}
                      </button>
                    );
                  })}
                </div>
              </InspectorSection>
            </div>
          );
        }}
      />

      <KineticModalShell
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-[9990]"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          dir={isAr ? 'rtl' : 'ltr'}
          className="bg-white dark:bg-[#262422] w-full p-[var(--modal-pad,24px)] [--sq-stroke:var(--sq-stroke-pop)] flex flex-col gap-[var(--modal-gap,20px)]"
        >
              <div className="flex items-center justify-between gap-[var(--s3,12px)] pb-[var(--s3,12px)] border-b border-[var(--atr-divider)]">
                <h4 className="t-dialog text-[var(--text-1)] dark:text-white truncate">
                  {isAr ? 'تسجيل يدوي' : isEn ? 'Manual Log' : 'Pointage Manuel'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
                  className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] flex items-center justify-center rounded-full text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-white/65 dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#2B2825] transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-[var(--s4,16px)]">
                <LabelSelect
                  label={isAr ? 'الموظف' : isEn ? 'Staff' : 'Collaborateur'}
                  value={manualStaffId}
                  onChange={setManualStaffId}
                  height={40}
                  options={staffList.map((s) => ({
                    value: s.id,
                    label: `${s.fullName} (${s.role})`,
                  }))}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3,12px)] items-end">
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="block t-small font-medium text-[var(--text-2)] dark:text-white/80">
                      {isAr ? 'النوع' : isEn ? 'Type' : 'Type'}
                    </label>
                    <LiveSegmentedControl
                      fullWidth
                      size="md"
                      value={manualType}
                      onValueChange={(val) => setManualType(val as 'in' | 'out')}
                      aria-label={isAr ? 'النوع' : isEn ? 'Type' : 'Type'}
                      options={[
                        { value: 'in', label: isAr ? 'دخول' : isEn ? 'Clock In' : 'Arrivée' },
                        { value: 'out', label: isAr ? 'خروج' : isEn ? 'Clock Out' : 'Sortie' },
                      ]}
                    />
                  </div>
                  <LabelInput
                    label={isAr ? 'الوقت' : isEn ? 'Time' : 'Heure'}
                    type="time"
                    value={manualTime}
                    onChange={setManualTime}
                    height={40}
                  />
                </div>

                <LabelInput
                  label={isAr ? 'السبب' : isEn ? 'Note' : 'Motif'}
                  type="text"
                  value={manualNotes}
                  onChange={setManualNotes}
                  placeholder={isAr ? 'ملاحظة...' : isEn ? 'Optional note...' : 'Motif...'}
                  height={40}
                />

                <div className="flex justify-end gap-[var(--s2,8px)] pt-[var(--footer-gap,16px)] border-t border-[var(--atr-divider)]">
                  <Button
                    type="button"
                    tone="soft"
                    onClick={() => setIsManualModalOpen(false)}
                  >
                    {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
                  </Button>
                  <AtriumButton type="submit">{isAr ? 'حفظ' : isEn ? 'Save' : 'Valider'}</AtriumButton>
                </div>
              </form>
        </div>
      </KineticModalShell>
    </div>
  );
};

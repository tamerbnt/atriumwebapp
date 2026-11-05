import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  UserCheck,
  Plus,
  QrCode,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { StaffMember, StaffAttendanceDayStatus, StaffAttendanceLogRecord } from '../../../types/index';
import { AtriumButton } from '../../ui/AtriumButton';

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
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualStaffId, setManualStaffId] = useState<string>(staffList[0]?.id || '');
  const [manualType, setManualType] = useState<'in' | 'out'>('in');
  const [manualTime, setManualTime] = useState<string>('08:00');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Generate the 6 Algerian working days for the week (Saturday to Thursday)
  const weekDays = React.useMemo(() => {
    const today = new Date();
    // Move to Saturday of current week
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    const distanceToSaturday = (dayOfWeek + 1) % 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - distanceToSaturday + currentWeekOffset * 7);

    const days: { dateStr: string; labelFR: string; labelAR: string; dayNum: number }[] = [];
    const labelsFR = ['Sam', 'Dim', 'Lun', 'Mar', 'Mer', 'Jeu'];
    const labelsAR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(saturday);
      d.setDate(saturday.getDate() + i);
      days.push({
        dateStr: d.toISOString().slice(0, 10),
        labelFR: `${labelsFR[i]} ${d.getDate()}`,
        labelAR: `${labelsAR[i]} ${d.getDate()}`,
        dayNum: d.getDate(),
      });
    }
    return days;
  }, [currentWeekOffset]);

  // Dynamic day status state for the matrix
  const [gridStatuses, setGridStatuses] = useState<Record<string, StaffAttendanceDayStatus>>({});

  const getDayStatus = (staffId: string, dateStr: string): StaffAttendanceDayStatus => {
    const key = `${staffId}_${dateStr}`;
    if (gridStatuses[key]) return gridStatuses[key];

    // Check actual punch logs
    const hasPunch = attendanceLogs.some((l) => l.staffId === staffId && l.date === dateStr);
    const member = staffList.find((s) => s.id === staffId);
    if (member?.status === 'on_leave') return 'vacation';
    if (hasPunch) return 'present';
    if (member?.isClockedInToday && dateStr === new Date().toISOString().slice(0, 10)) return 'present';

    // Default simulation for earlier days in week
    const isPast = dateStr < new Date().toISOString().slice(0, 10);
    return isPast ? 'present' : 'rest';
  };

  const cycleDayStatus = (staffId: string, dateStr: string) => {
    const key = `${staffId}_${dateStr}`;
    const current = getDayStatus(staffId, dateStr);
    const order: StaffAttendanceDayStatus[] = ['present', 'late', 'half_day', 'absent_justified', 'absent_unjustified'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextStatus = order[nextIdx];
    setGridStatuses((prev) => ({ ...prev, [key]: nextStatus }));
  };

  // Status Styling Badge
  const renderStatusBadge = (status: StaffAttendanceDayStatus) => {
    switch (status) {
      case 'present':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">🟢 {isAr ? 'حاضر (8س)' : 'Présent (8h)'}</span>;
      case 'late':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40">🟡 {isAr ? 'متأخر (15د)' : 'Retard (15m)'}</span>;
      case 'half_day':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/40">🔵 {isAr ? 'نصف يوم (4س)' : '1/2 Jour (4h)'}</span>;
      case 'absent_justified':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/40">🟣 {isAr ? 'غياب مبرر' : 'Justifié'}</span>;
      case 'absent_unjustified':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-800/40">🔴 {isAr ? 'غياب غير مبرر' : 'Injustifié'}</span>;
      case 'vacation':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">🏖️ {isAr ? 'عطلة' : 'Congé'}</span>;
      default:
        return <span className="text-neutral-400 text-[11px]">-</span>;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    onManualLog(manualStaffId, today, manualType, manualTime, manualNotes);
    setIsManualModalOpen(false);
  };

  const presentCount = staffList.filter((s) => s.isClockedInToday).length;
  const lateCount = attendanceLogs.filter((l) => l.date === new Date().toISOString().slice(0, 10) && (l.lateMinutes || 0) > 0).length;

  return (
    <div className="space-y-4">
      {/* Top Action Bar: Exact 40px Standard Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F8F9FA] dark:bg-neutral-700/50 p-1 rounded-xl border border-neutral-200/80 dark:border-neutral-700 h-10">
            <button
              type="button"
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-neutral-700 dark:text-neutral-300 tabular-nums">
              {isAr ? 'أسبوع العمل' : 'Semaine du'} {weekDays[0].labelFR} {isAr ? 'إلى' : 'au'} {weekDays[5].labelFR}
            </span>
            <button
              type="button"
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {currentWeekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setCurrentWeekOffset(0)}
              className="text-xs text-[#d4522f] hover:underline font-semibold cursor-pointer"
            >
              {isAr ? 'العودة لليوم' : 'Semaine actuelle'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <AtriumButton
            variant="secondary"
            size="md"
            onClick={() => setIsManualModalOpen(true)}
            icon={<Plus className="w-4 h-4 text-neutral-500" />}
            className="h-10 text-xs font-semibold"
          >
            <span>{isAr ? 'تسجيل يدوي' : 'Pointage Manuel'}</span>
          </AtriumButton>

          <AtriumButton
            variant="primary"
            size="md"
            onClick={onOpenKiosk}
            icon={<QrCode className="w-4 h-4" />}
            className="h-10 text-xs font-semibold shadow-xs"
          >
            <span>{isAr ? 'كشك البصمة / RFID' : 'Kiosk Tactile / RFID'}</span>
          </AtriumButton>
        </div>
      </div>

      {/* 4 Mini KPI Strip — Pure White Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">{isAr ? 'الحاضرون اليوم' : 'Présents Aujourd\'hui'}</p>
          <p className="text-2xl font-black font-mono text-emerald-600 mt-1 tabular-nums">{presentCount} <span className="text-xs font-normal text-neutral-400">/ {staffList.length}</span></p>
        </div>
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">{isAr ? 'التأخيرات المسجلة' : 'Retards Détectés'}</p>
          <p className="text-2xl font-black font-mono text-amber-600 mt-1 tabular-nums">{lateCount} <span className="text-xs font-normal text-neutral-400">coll.</span></p>
        </div>
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">{isAr ? 'في عطلة رسمية' : 'En Congé Réglementaire'}</p>
          <p className="text-2xl font-black font-mono text-neutral-800 dark:text-neutral-200 mt-1 tabular-nums">1 <span className="text-xs font-normal text-neutral-400">coll.</span></p>
        </div>
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">{isAr ? 'نسبة الانضباط' : 'Taux d\'Assiduité'}</p>
          <p className="text-2xl font-black font-mono text-[#d4522f] mt-1 tabular-nums">{Math.round((presentCount / Math.max(1, staffList.length)) * 100)}%</p>
        </div>
      </div>

      {/* Weekly Timesheet Matrix Grid */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'جدول المداومة الأسبوعي التفاعلي' : 'Grille de Présence & Pointages Hebdomadaire'}
            </h4>
            <p className="text-xs text-neutral-500">
              {isAr ? 'اضغط على أي خانة لتغيير حالة الحضور أو تسجيل الساعات' : 'Cliquez sur n\'importe quelle cellule pour basculer le statut ou ajuster les heures'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-[#202024] text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="p-3 font-semibold w-56">{isAr ? 'الموظف / المدرب' : 'Collaborateur & Rôle'}</th>
                {weekDays.map((d) => (
                  <th key={d.dateStr} className="p-3 font-semibold text-center min-w-[110px]">
                    {isAr ? d.labelAR : d.labelFR}
                  </th>
                ))}
                <th className="p-3 font-semibold text-right pr-4 w-28">{isAr ? 'إجمالي الساعات' : 'Total Heures'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {staffList.map((member) => {
                let totalHours = 0;
                return (
                  <tr key={member.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-neutral-900 dark:text-white">{member.fullName}</div>
                      <div className="text-[11px] text-neutral-500">{member.role}</div>
                    </td>
                    {weekDays.map((d) => {
                      const status = getDayStatus(member.id, d.dateStr);
                      if (status === 'present') totalHours += 8;
                      else if (status === 'half_day') totalHours += 4;
                      else if (status === 'late') totalHours += 7.75;

                      return (
                        <td
                          key={d.dateStr}
                          onClick={() => cycleDayStatus(member.id, d.dateStr)}
                          className="p-2 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {renderStatusBadge(status)}
                        </td>
                      );
                    })}
                    <td className="p-3 text-right pr-4 font-mono font-bold text-neutral-900 dark:text-white">
                      {totalHours} h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Pointage Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'تسجيل نقطة حضور يدوية' : 'Enregistrer un Pointage Manuel'}
            </h4>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Collaborateur
                </label>
                <select
                  value={manualStaffId}
                  onChange={(e) => setManualStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-xs text-neutral-900 dark:text-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Type
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-xs text-neutral-900 dark:text-white"
                  >
                    <option value="in">🟢 Arrivée (Clock-in)</option>
                    <option value="out">🔴 Sortie (Clock-out)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-xs font-mono text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Justification / Motif
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ex: Oubli de badge, pointage extérieur..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#202024] text-xs text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                >
                  Annuler
                </button>
                <AtriumButton type="submit">Valider le Pointage</AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

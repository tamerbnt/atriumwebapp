import React, { useMemo, useState } from 'react';
import { Clock, CheckCircle2, Trash2, Plus, Users } from 'lucide-react';
import type { PMMilestone, PMProject, PMTimesheet, StaffMember } from '../../../types/index';
import { computeTeamUtilization } from '../../../utils/projectDepth';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { ScreenPod } from '../../ui/kinetic';

interface ProjectTimesheetsPanelProps {
  accountId: string;
  branchId: string;
  projects: PMProject[];
  milestones: PMMilestone[];
  staff: StaffMember[];
  timesheets: PMTimesheet[];
  defaultStaffName?: string;
  defaultStaffId?: string;
  onRecordTimesheet: (
    input: Omit<PMTimesheet, 'id' | 'createdAt' | 'approvalStatus'>
  ) => void;
  onApproveTimesheet: (id: string) => void;
  onDeleteTimesheet: (id: string) => void;
}

export const ProjectTimesheetsPanel: React.FC<ProjectTimesheetsPanelProps> = ({
  accountId,
  branchId,
  projects,
  milestones,
  staff,
  timesheets,
  defaultStaffName = '',
  defaultStaffId = '',
  onRecordTimesheet,
  onApproveTimesheet,
  onDeleteTimesheet,
}) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [milestoneId, setMilestoneId] = useState('');
  const [staffMemberId, setStaffMemberId] = useState(staff[0]?.id || defaultStaffId || '');
  const [customStaffName, setCustomStaffName] = useState(
    staff[0]?.fullName || defaultStaffName || ''
  );
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hoursWorked, setHoursWorked] = useState('4');
  const [capacityHours, setCapacityHours] = useState('8');
  const [hourlyCostDzd, setHourlyCostDzd] = useState('1500');
  const [hourlyBillDzd, setHourlyBillDzd] = useState('3500');
  const [billable, setBillable] = useState(true);
  const [taskSummary, setTaskSummary] = useState('');

  const effectiveProject = useMemo(
    () => projects.find((p) => p.id === projectId) || projects[0],
    [projects, projectId]
  );

  const projectMilestones = useMemo(
    () => milestones.filter((m) => m.projectId === (effectiveProject?.id || '')),
    [milestones, effectiveProject]
  );

  const utilization = useMemo(
    () => computeTeamUtilization(timesheets, 40),
    [timesheets]
  );

  const handleStaffSelect = (id: string) => {
    setStaffMemberId(id);
    const found = staff.find((s) => s.id === id);
    if (found) setCustomStaffName(found.fullName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveProject) return;
    const hrs = Number(hoursWorked);
    if (!Number.isFinite(hrs) || hrs <= 0 || !taskSummary.trim()) return;

    const chosenStaff = staff.find((s) => s.id === staffMemberId);
    const resolvedName = (chosenStaff?.fullName || customStaffName || defaultStaffName || 'Collaborateur').trim();

    onRecordTimesheet({
      tenantId: accountId || effectiveProject.tenantId,
      facilityId: branchId || effectiveProject.facilityId,
      projectId: effectiveProject.id,
      projectTitle: effectiveProject.title,
      milestoneId: milestoneId || undefined,
      staffMemberId: chosenStaff?.id || staffMemberId || undefined,
      staffName: resolvedName,
      workDate: workDate || new Date().toISOString().slice(0, 10),
      hoursWorked: hrs,
      capacityHours: Math.max(1, Number(capacityHours || 8)),
      billable,
      hourlyCostDzd: Math.max(0, Number(hourlyCostDzd || 0)),
      hourlyBillDzd: Math.max(0, Number(hourlyBillDzd || 0)),
      taskSummary: taskSummary.trim(),
    });
    setTaskSummary('');
  };

  return (
    <ScreenPod>
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'} data-testid="project-timesheets-panel">
        {/* Team Utilization KPI Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sq-elev-card">
            <div data-sq="card" data-sq-border="none" className="p-4 bg-white dark:bg-[#22201E]">
              <span className="t-cap text-black/55 dark:text-white/55 block">
                {t('pm_depth_ts_logged_hours')}
              </span>
              <span className="t-dialog font-semibold text-black dark:text-white tabular-nums">
                {utilization.totalLoggedHours} h
              </span>
            </div>
          </div>
          <div className="sq-elev-card">
            <div data-sq="card" data-sq-border="none" className="p-4 bg-white dark:bg-[#22201E]">
              <span className="t-cap text-black/55 dark:text-white/55 block">
                {t('pm_depth_ts_utilization_rate')}
              </span>
              <span className="t-dialog font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                {utilization.overallUtilizationPct}%
              </span>
            </div>
          </div>
          <div className="sq-elev-card">
            <div data-sq="card" data-sq-border="none" className="p-4 bg-white dark:bg-[#22201E]">
              <span className="t-cap text-black/55 dark:text-white/55 block">
                {t('pm_depth_ts_billable_ratio')}
              </span>
              <span className="t-dialog font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {utilization.overallBillabilityPct}% ({utilization.totalBillableHours} h)
              </span>
            </div>
          </div>
          <div className="sq-elev-card">
            <div data-sq="card" data-sq-border="none" className="p-4 bg-white dark:bg-[#22201E]">
              <span className="t-cap text-black/55 dark:text-white/55 block">
                {t('pm_depth_ts_labor_cost')}
              </span>
              <span className="t-dialog font-semibold text-black dark:text-white tabular-nums">
                {formatMoney(utilization.totalLaborCostDzd, 'DZD')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log Time Form */}
          <div className="sq-elev-card">
            <form
              onSubmit={handleSubmit}
              data-sq="card"
              data-sq-border="none"
              className="p-5 bg-white dark:bg-[#22201E] space-y-4"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <h3 className="t-label font-semibold text-black dark:text-white">
                  {t('pm_depth_ts_log_title')}
                </h3>
              </div>

              <LabelSelect
                field="TsProject"
                label={t('pm_depth_project_label')}
                value={effectiveProject?.id || ''}
                onChange={setProjectId}
                options={projects.map((p) => ({ value: p.id, label: p.title }))}
                height={40}
                corner={10}
              />

              {projectMilestones.length > 0 && (
                <LabelSelect
                  field="TsMilestone"
                  label={t('pm_depth_milestone_optional')}
                  value={milestoneId}
                  onChange={setMilestoneId}
                  options={[
                    { value: '', label: isAr ? 'بدون مرحلة' : isEn ? 'General' : 'Général projet' },
                    ...projectMilestones.map((m) => ({ value: m.id, label: m.title })),
                  ]}
                  height={40}
                  corner={10}
                />
              )}

              {staff.length > 0 ? (
                <LabelSelect
                  field="TsStaff"
                  label={t('pm_depth_ts_staff_member')}
                  value={staffMemberId}
                  onChange={handleStaffSelect}
                  options={staff.map((s) => ({ value: s.id, label: s.fullName }))}
                  height={40}
                  corner={10}
                />
              ) : (
                <LabelInput
                  field="TsStaffName"
                  label={t('pm_depth_ts_staff_member')}
                  value={customStaffName}
                  onChange={setCustomStaffName}
                  required
                  height={40}
                  corner={10}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="TsDate"
                  label={t('pm_depth_ts_date')}
                  type="date"
                  value={workDate}
                  onChange={setWorkDate}
                  height={40}
                  corner={10}
                />
                <LabelInput
                  field="TsHours"
                  label={t('pm_depth_ts_hours')}
                  type="number"
                  value={hoursWorked}
                  onChange={setHoursWorked}
                  required
                  height={40}
                  corner={10}
                />
                <LabelInput
                  field="TsCostRate"
                  label={t('pm_depth_ts_cost_rate')}
                  type="number"
                  value={hourlyCostDzd}
                  onChange={setHourlyCostDzd}
                  height={40}
                  corner={10}
                />
                <LabelInput
                  field="TsBillRate"
                  label={t('pm_depth_ts_bill_rate')}
                  type="number"
                  value={hourlyBillDzd}
                  onChange={setHourlyBillDzd}
                  height={40}
                  corner={10}
                />
              </div>

              <LabelInput
                field="TsCapacity"
                label={t('pm_depth_ts_daily_capacity')}
                type="number"
                value={capacityHours}
                onChange={setCapacityHours}
                height={40}
                corner={10}
              />

              <LabelInput
                field="TsTask"
                label={t('pm_depth_ts_task_summary')}
                value={taskSummary}
                onChange={setTaskSummary}
                required
                placeholder={
                  isAr
                    ? 'تصميم الهوية البصرية / تطوير الواجهة...'
                    : isEn
                    ? 'Sprint delivery, client workshop...'
                    : 'Maquette UI, atelier client, coordination...'
                }
                height={40}
                corner={10}
              />

              <div
                data-sq="ctl"
                data-sq-border="none"
                className="p-3 bg-[#F5F1EC] dark:bg-[#191716] flex items-center justify-between"
              >
                <span className="t-cap font-semibold text-black dark:text-white">
                  {t('pm_depth_ts_billable_toggle')}
                </span>
                <LiveSwitch
                  checked={billable}
                  onCheckedChange={setBillable}
                  aria-label={t('pm_depth_ts_billable_toggle')}
                />
              </div>

              <AtriumButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center"
                icon={<Plus className="w-4 h-4" />}
                disabled={!effectiveProject || !taskSummary.trim()}
              >
                {t('pm_depth_ts_submit')}
              </AtriumButton>
            </form>
          </div>

          {/* Utilization Leaderboard & Recent Logs */}
          <div className="lg:col-span-2 space-y-5">
            <div className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-5 bg-white dark:bg-[#22201E] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                    <h3 className="t-label font-semibold text-black dark:text-white">
                      {t('pm_depth_ts_utilization_board')}
                    </h3>
                  </div>
                  <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                    {utilization.rows.length} {isAr ? 'أعضاء' : isEn ? 'members' : 'membres'}
                  </span>
                </div>

                {utilization.rows.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    tone="neutral"
                    icon={<Clock size={20} />}
                    title={t('pm_depth_ts_empty_title')}
                    description={t('pm_depth_ts_empty_desc')}
                  />
                ) : (
                  <div className="space-y-3">
                    {utilization.rows.map((row) => (
                      <div key={row.staffId} className="space-y-1.5 t-cap">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-black dark:text-white">
                            {row.staffName}
                          </span>
                          <span className="tabular-nums text-black/65 dark:text-white/70">
                            {row.loggedHours}h / {row.capacityHours}h ·{' '}
                            <strong className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                              {row.utilizationPct}%
                            </strong>{' '}
                            ({row.billabilityPct}% {isAr ? 'قابلة للفوترة' : isEn ? 'billable' : 'facturable'})
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] overflow-hidden">
                          <div
                            className={`h-full ${
                              row.utilizationPct >= 85
                                ? 'bg-emerald-600'
                                : row.utilizationPct >= 50
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, row.utilizationPct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-5 bg-white dark:bg-[#22201E] space-y-3"
              >
                <h3 className="t-label font-semibold text-black dark:text-white">
                  {t('pm_depth_ts_entries_title')} ({timesheets.length})
                </h3>
                {timesheets.length === 0 ? (
                  <p className="t-cap text-black/55 dark:text-white/55 py-4 text-center">
                    {t('pm_depth_ts_empty_desc')}
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--atr-divider)]">
                    {timesheets.slice(0, 20).map((ts) => (
                      <div
                        key={ts.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="t-small font-semibold text-black dark:text-white">
                              {ts.staffName}
                            </span>
                            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                              {ts.workDate} · {ts.hoursWorked}h
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-[var(--r-check,6px)] text-[11px] font-semibold ${
                                ts.billable
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-[#F3EDE7] text-black/65 dark:bg-[#2B2825] dark:text-white/65'
                              }`}
                            >
                              {ts.billable
                                ? isAr
                                  ? 'قابل للفوترة'
                                  : isEn
                                  ? 'Billable'
                                  : 'Facturable'
                                : isAr
                                ? 'داخلي'
                                : isEn
                                ? 'Internal'
                                : 'Interne'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-[var(--r-check,6px)] text-[11px] font-semibold ${
                                ts.approvalStatus === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {ts.approvalStatus === 'approved'
                                ? isAr
                                  ? 'معتمد'
                                  : isEn
                                  ? 'Approved'
                                  : 'Validé'
                                : isAr
                                ? 'مُرسل'
                                : isEn
                                ? 'Submitted'
                                : 'Soumis'}
                            </span>
                          </div>
                          <p className="t-cap text-black/65 dark:text-white/70 truncate">
                            {ts.projectTitle} — {ts.taskSummary}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="t-small tabular-nums font-semibold text-black dark:text-white">
                            {formatMoney(Math.round(ts.hoursWorked * ts.hourlyCostDzd), 'DZD')}
                          </span>
                          {ts.approvalStatus !== 'approved' && (
                            <button
                              type="button"
                              aria-label={`Approve timesheet ${ts.staffName}`}
                              onClick={() => onApproveTimesheet(ts.id)}
                              data-sq="ctl-sm"
                              className="px-2.5 py-1 t-cap font-semibold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isAr ? 'اعتماد' : isEn ? 'Approve' : 'Valider'}
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Delete timesheet ${ts.taskSummary}`}
                            onClick={() => onDeleteTimesheet(ts.id)}
                            data-sq="ctl-sm"
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenPod>
  );
};

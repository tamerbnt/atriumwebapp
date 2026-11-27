import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Plus, AlertTriangle, Link2 } from 'lucide-react';
import type { PMMilestone, PMProject } from '../../../types/index';
import { buildGanttTimelineItems } from '../../../utils/projectDepth';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { ScreenPod } from '../../ui/kinetic';

interface ProjectGanttPanelProps {
  projects: PMProject[];
  milestones: PMMilestone[];
  selectedProjectId?: string;
  onSelectProjectId?: (projectId: string) => void;
  onUpsertMilestone: (input: Omit<PMMilestone, 'id'> & { id?: string }) => void;
  onApproveMilestonePartial: (milestoneId: string, approvedPct: number) => void;
}

export const ProjectGanttPanel: React.FC<ProjectGanttPanelProps> = ({
  projects,
  milestones,
  selectedProjectId,
  onSelectProjectId,
  onUpsertMilestone,
  onApproveMilestonePartial,
}) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [filterProjectId, setFilterProjectId] = useState<string>(selectedProjectId || 'all');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [msProjectId, setMsProjectId] = useState<string>(selectedProjectId || projects[0]?.id || '');
  const [msTitle, setMsTitle] = useState('');
  const [msPhase, setMsPhase] = useState<PMMilestone['phase']>('concept_kv');
  const [msStartDate, setMsStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [msTargetDate, setMsTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().slice(0, 10);
  });
  const [msAmountDzd, setMsAmountDzd] = useState('');
  const [msDependsOnId, setMsDependsOnId] = useState('');

  const scopedProjects = useMemo(() => {
    if (filterProjectId === 'all') return projects;
    return projects.filter((p) => p.id === filterProjectId);
  }, [projects, filterProjectId]);

  const scopedMilestones = useMemo(() => {
    const projSet = new Set(scopedProjects.map((p) => p.id));
    return milestones.filter((m) => projSet.has(m.projectId));
  }, [milestones, scopedProjects]);

  const gantt = useMemo(
    () =>
      buildGanttTimelineItems({
        projects: scopedProjects,
        milestones: scopedMilestones,
      }),
    [scopedProjects, scopedMilestones]
  );

  const milestoneById = useMemo(
    () => new Map(milestones.map((m) => [m.id, m])),
    [milestones]
  );

  const overdueCount = useMemo(
    () => gantt.items.filter((it) => it.isOverdue).length,
    [gantt.items]
  );

  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProj = projects.find((p) => p.id === (msProjectId || projects[0]?.id));
    if (!targetProj || !msTitle.trim() || !msTargetDate) return;
    onUpsertMilestone({
      projectId: targetProj.id,
      title: msTitle.trim(),
      phase: msPhase,
      startDate: msStartDate || targetProj.startDate,
      targetDate: msTargetDate,
      isCompleted: false,
      assignedRole:
        msPhase === 'concept_kv' || msPhase === 'bat_production'
          ? 'crea'
          : msPhase === 'field_rollcall'
          ? 'superviseur'
          : msPhase === 'ccp_payroll'
          ? 'compta'
          : 'chef_projet',
      amountDzd: Math.max(0, Number(msAmountDzd || 0)),
      dependsOnMilestoneId: msDependsOnId || undefined,
      approvedPct: 0,
      approvalStatus: 'pending',
    });
    setMsTitle('');
    setMsAmountDzd('');
    setMsDependsOnId('');
    setShowAddMilestone(false);
  };

  return (
    <ScreenPod>
      <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'} data-testid="project-gantt-panel">
        <div className="sq-elev-card">
          <div
            data-sq="card"
            data-sq-border="none"
            className="p-5 bg-white dark:bg-[#22201E] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div>
              <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                {t('pm_depth_gantt_badge')}
              </span>
              <h2 className="t-pod font-semibold text-black dark:text-white mt-0.5">
                {t('pm_depth_gantt_title')}
              </h2>
              <p className="t-cap text-black/60 dark:text-white/65 tabular-nums mt-0.5">
                {gantt.windowStart} → {gantt.windowEnd} · {gantt.totalDays}{' '}
                {isAr ? 'يوم' : isEn ? 'days' : 'jours'}
                {overdueCount > 0 && (
                  <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                    · {overdueCount} {t('pm_depth_overdue')}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-56">
                <LabelSelect
                  field="GanttProjectFilter"
                  label={t('pm_depth_filter_project')}
                  value={filterProjectId}
                  onChange={(val) => {
                    setFilterProjectId(val);
                    if (val !== 'all' && onSelectProjectId) {
                      onSelectProjectId(val);
                      setMsProjectId(val);
                    }
                  }}
                  options={[
                    { value: 'all', label: t('pm_depth_all_projects') },
                    ...projects.map((p) => ({ value: p.id, label: p.title })),
                  ]}
                  height={38}
                  corner={10}
                />
              </div>
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddMilestone((prev) => !prev)}
                disabled={projects.length === 0}
              >
                {t('pm_depth_add_milestone')}
              </AtriumButton>
            </div>
          </div>
        </div>

        {showAddMilestone && projects.length > 0 && (
          <div className="sq-elev-card">
            <form
              onSubmit={handleAddMilestoneSubmit}
              data-sq="card"
              data-sq-border="none"
              className="p-5 bg-white dark:bg-[#22201E] space-y-4"
            >
              <h3 className="t-label font-semibold text-black dark:text-white">
                {t('pm_depth_new_milestone_title')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <LabelSelect
                  field="MsProject"
                  label={t('pm_depth_project_label')}
                  value={msProjectId || projects[0]?.id || ''}
                  onChange={setMsProjectId}
                  options={projects.map((p) => ({ value: p.id, label: p.title }))}
                  height={40}
                  corner={10}
                />
                <LabelInput
                  field="MsTitle"
                  label={t('pm_depth_milestone_title')}
                  value={msTitle}
                  onChange={setMsTitle}
                  required
                  placeholder={
                    isAr
                      ? 'مثال: تسليم النموذج الأولي'
                      : isEn
                      ? 'e.g. Phase 1 Delivery'
                      : 'Ex: Validation Livrable Phase 1'
                  }
                  height={40}
                  corner={10}
                />
                <LabelSelect
                  field="MsPhase"
                  label={t('pm_depth_milestone_phase')}
                  value={msPhase}
                  onChange={(v) => setMsPhase(v as PMMilestone['phase'])}
                  options={[
                    { value: 'brief', label: isAr ? 'التأطير' : isEn ? 'Brief & Scope' : 'Brief & Cadrage' },
                    { value: 'concept_kv', label: isAr ? 'التصميم / التنفيذ' : isEn ? 'Concept / Production' : 'Concept KV / Prod' },
                    { value: 'client_signoff', label: isAr ? 'اعتماد العميل' : isEn ? 'Client Sign-Off' : 'Validation Client' },
                    { value: 'bat_production', label: isAr ? 'الإخراج / الاختبار' : isEn ? 'BAT / QA Release' : 'BAT / QA' },
                    { value: 'print_order', label: isAr ? 'الطباعة / التوريد' : isEn ? 'Print / Vendor Order' : 'Commande / Prod' },
                    { value: 'field_rollcall', label: isAr ? 'النشر الميداني' : isEn ? 'Field Deployment' : 'Déploiement Terrain' },
                    { value: 'ccp_payroll', label: isAr ? 'التسوية والمحاسبة' : isEn ? 'Payroll & Settlement' : 'Paie & Règlement' },
                  ]}
                  height={40}
                  corner={10}
                />
                <LabelInput
                  field="MsStartDate"
                  label={t('pm_dir_field_start_date')}
                  type="date"
                  value={msStartDate}
                  onChange={setMsStartDate}
                  height={40}
                  corner={10}
                />
                <LabelInput
                  field="MsTargetDate"
                  label={t('pm_dir_field_end_date')}
                  type="date"
                  value={msTargetDate}
                  onChange={setMsTargetDate}
                  required
                  height={40}
                  corner={10}
                />
                <LabelInput
                  field="MsAmount"
                  label={t('pm_depth_milestone_amount')}
                  type="number"
                  value={msAmountDzd}
                  onChange={setMsAmountDzd}
                  placeholder="250000"
                  height={40}
                  corner={10}
                />
                <LabelSelect
                  field="MsDependsOn"
                  label={t('pm_depth_depends_on')}
                  value={msDependsOnId}
                  onChange={setMsDependsOnId}
                  options={[
                    { value: '', label: isAr ? 'بدون اعتماد' : isEn ? 'None' : 'Aucune dépendance' },
                    ...milestones
                      .filter((m) => m.projectId === (msProjectId || projects[0]?.id))
                      .map((m) => ({ value: m.id, label: m.title })),
                  ]}
                  height={40}
                  corner={10}
                />
              </div>
              <div className="flex justify-end gap-2">
                <AtriumButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMilestone(false)}
                >
                  {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm">
                  {t('pm_depth_save_milestone')}
                </AtriumButton>
              </div>
            </form>
          </div>
        )}

        {gantt.items.length === 0 ? (
          <div className="sq-elev-card">
            <div data-sq="card" data-sq-border="none" className="p-8 bg-white dark:bg-[#22201E]">
              <EmptyState
                variant="compact"
                tone="neutral"
                icon={<Calendar size={22} />}
                title={t('pm_depth_gantt_empty_title')}
                description={t('pm_depth_gantt_empty_desc')}
              />
            </div>
          </div>
        ) : (
          <div className="sq-elev-card">
            <div
              data-sq="card"
              data-sq-border="none"
              className="p-5 bg-white dark:bg-[#22201E] space-y-3 overflow-x-auto"
            >
              <div className="min-w-[680px] space-y-2.5">
                <div className="grid grid-cols-12 gap-3 pb-2 border-b border-[var(--atr-divider)] t-cap font-semibold text-black/55 dark:text-white/55">
                  <div className="col-span-4">{t('pm_depth_gantt_col_task')}</div>
                  <div className="col-span-2 text-center">{t('pm_depth_gantt_col_dates')}</div>
                  <div className="col-span-5">{t('pm_depth_gantt_col_timeline')}</div>
                  <div className="col-span-1 text-right">{t('pm_depth_gantt_col_progress')}</div>
                </div>

                {gantt.items.map((item) => {
                  const isProject = item.kind === 'project';
                  const msId = !isProject ? item.id.replace('gantt-ms-', '') : null;
                  const msObj = msId ? milestoneById.get(msId) : undefined;
                  const depObj = item.dependsOnId ? milestoneById.get(item.dependsOnId) : undefined;

                  return (
                    <div
                      key={item.id}
                      data-testid={item.id}
                      className={`grid grid-cols-12 gap-3 items-center py-2 px-2 rounded-[var(--r-ctl-sm,10px)] ${
                        isProject
                          ? 'bg-[#F5F1EC] dark:bg-[#2B2825]/80 font-semibold'
                          : 'hover:bg-[#F5F1EC]/50 dark:hover:bg-[#2B2825]/40'
                      }`}
                    >
                      <div className="col-span-4 min-w-0">
                        <div className="flex items-center gap-2">
                          {isProject ? (
                            <Calendar className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
                          ) : msObj ? (
                            <button
                              type="button"
                              aria-label={
                                msObj.isCompleted
                                  ? `Mark ${msObj.title} pending`
                                  : `Complete ${msObj.title}`
                              }
                              onClick={() =>
                                onApproveMilestonePartial(msObj.id, msObj.isCompleted ? 0 : 100)
                              }
                              className="cursor-pointer shrink-0"
                            >
                              {msObj.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-600" />
                              )}
                            </button>
                          ) : null}
                          <div className="min-w-0">
                            <div
                              className={`truncate t-small ${
                                isProject
                                  ? 'font-semibold text-black dark:text-white'
                                  : 'font-medium text-black/85 dark:text-white/90 pl-2'
                              }`}
                            >
                              {item.title}
                            </div>
                            <div className="t-cap text-black/55 dark:text-white/55 truncate flex items-center gap-1.5">
                              <span>{item.subtitle}</span>
                              {msObj && (msObj.amountDzd || 0) > 0 && (
                                <span className="tabular-nums">
                                  · {formatMoney(msObj.amountDzd || 0, 'DZD')}
                                </span>
                              )}
                              {depObj && (
                                <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                                  <Link2 className="w-3 h-3" />
                                  {depObj.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 text-center t-cap tabular-nums text-black/65 dark:text-white/70">
                        <div>{item.startDate}</div>
                        <div className="text-[11px] opacity-75">
                          → {item.endDate} ({item.durationDays}d)
                        </div>
                      </div>

                      <div className="col-span-5 relative h-7 bg-[#F3EDE7] dark:bg-[#191716] rounded-[var(--r-check,6px)] overflow-hidden">
                        <div
                          className={`absolute top-1 bottom-1 rounded-[var(--r-check,6px)] transition-all flex items-center px-1.5 ${
                            item.isOverdue
                              ? 'bg-red-600/90 text-white'
                              : item.isCompleted
                              ? 'bg-emerald-600/90 text-white'
                              : isProject
                              ? 'bg-[#BF431F]/85 text-white'
                              : 'bg-blue-600/85 text-white'
                          }`}
                          style={{
                            left: `${item.leftPct}%`,
                            width: `${item.widthPct}%`,
                          }}
                          title={`${item.title}: ${item.startDate} → ${item.endDate}`}
                        >
                          {item.isOverdue && <AlertTriangle className="w-3 h-3 shrink-0 mr-1" />}
                          <span className="text-[10px] font-semibold truncate">
                            {item.progressPct}%
                          </span>
                        </div>
                      </div>

                      <div className="col-span-1 text-right t-small tabular-nums font-semibold">
                        <span
                          className={
                            item.isOverdue
                              ? 'text-red-600 dark:text-red-400'
                              : item.isCompleted
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-black dark:text-white'
                          }
                        >
                          {item.progressPct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenPod>
  );
};

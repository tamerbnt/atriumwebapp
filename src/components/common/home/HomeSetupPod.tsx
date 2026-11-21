import React from 'react';
import { CheckCircle2, Settings, ArrowUpRight, Sparkles, X, Circle } from 'lucide-react';
import {
  atriumActions,
  openSettingsTabAction,
  selectHomeSetupProgressFromState,
  useAtriumSelector,
} from '../../../services/store';
import { isExecutiveRole, type SetupEvaluationContext } from '../../../utils/businessConfig';
import { useTranslation } from '../../../utils/useTranslation';
import { DashboardPod } from '../dashboard';
import { AtriumButton } from '../../ui/AtriumButton';
import { useHomeRole } from './HomeShell';
import { getHomeStrings } from './homeLocalization';

export interface HomeSetupPodProps {
  roleKey?: string;
  setupOverrides?: Partial<SetupEvaluationContext>;
  onStepAction?: (stepId: string) => boolean | void;
  className?: string;
}

export const HomeSetupPod: React.FC<HomeSetupPodProps> = ({
  roleKey,
  setupOverrides,
  onStepAction,
  className = '',
}) => {
  const { language } = useTranslation();
  const strings = getHomeStrings(language);
  const contextRole = useHomeRole();
  const effectiveRole = roleKey || contextRole;

  const currentUser = useAtriumSelector((s) => s.currentUser);
  const progress = useAtriumSelector((s) =>
    selectHomeSetupProgressFromState(s, setupOverrides)
  );

  const canManageSetup =
    isExecutiveRole(effectiveRole) &&
    (currentUser ? isExecutiveRole(currentUser.role, currentUser.roleRank) : true);

  if (!canManageSetup) {
    return null;
  }

  if (progress.isComplete && progress.isDismissed) {
    return null;
  }

  if (progress.isComplete) {
    return (
      <section
        data-sq="panel"
        data-sq-border="solid"
        data-testid="home-setup-banner-complete"
        className={`relative bg-[#EFF7F1] dark:bg-[#19231D] px-[var(--s4,16px)] py-[var(--s3,12px)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] ${className}`}
      >
        <div className="flex items-center gap-[var(--s3,12px)] min-w-0">
          <div
            data-sq="ctl-sm"
            data-sq-border="none"
            className="w-[34px] h-[34px] bg-[#DDF5E8] dark:bg-[#1A3826] flex items-center justify-center text-[#0B7A45] dark:text-[#4ADE80] shrink-0"
          >
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="t-label font-semibold text-[#113B22] dark:text-[#DCFCE7] truncate">
              {strings.setupBannerCompleteTitle}
            </div>
            <div className="t-cap text-[#2D6242] dark:text-[#86EFAC]/80 truncate">
              {strings.setupBannerCompleteSubtitle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[var(--s2,8px)] shrink-0">
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => openSettingsTabAction('business_fiscal')}
            icon={<Settings size={14} />}
            className="whitespace-nowrap"
          >
            {strings.setupEditInSettings}
          </AtriumButton>
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={() => atriumActions.dismissSetupBanner()}
            icon={<X size={14} />}
            className="whitespace-nowrap"
          >
            {strings.setupDismiss}
          </AtriumButton>
        </div>
      </section>
    );
  }

  return (
    <DashboardPod
      title={strings.setupPodTitle}
      subtitle={strings.setupPodSubtitle}
      icon={<Sparkles size={17} />}
      badge={
        <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold tabular-nums bg-[#FCEEE9] dark:bg-[#2E1E19] text-[#B83B1B] dark:text-[#FB923C]">
          {progress.completedCount}/{progress.totalCount} ({progress.percent}%)
        </span>
      }
      rightControls={
        <AtriumButton
          variant="outline"
          size="sm"
          onClick={() => openSettingsTabAction('business_fiscal')}
          icon={<Settings size={14} />}
          className="whitespace-nowrap shrink-0"
        >
          {strings.setupEditInSettings}
        </AtriumButton>
      }
      className={`!bg-[#F3EDE7] dark:!bg-[#191716] ${className}`}
    >
      <div data-testid="home-row-setup" className="flex flex-col gap-[var(--s3,12px)] min-w-0">
        {/* Linear Setup Completion Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#E8DDD1] dark:bg-[#2B2520] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#d4522f] to-[#684DA8] dark:from-[#FB923C] dark:to-[#A78BFA] transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {/* 5 Category-Tailored Setup Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[var(--card-gap,12px)]">
          {progress.steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              data-no-liquid="true"
              data-sq="card"
              data-sq-border="solid"
              data-testid={`home-setup-step-${step.id}`}
              onClick={() => {
                if (onStepAction && onStepAction(step.id) === true) {
                  return;
                }
                openSettingsTabAction(step.targetTab, step.targetSection ?? null);
              }}
              className={`group/step relative sq-elev-card sq-elev-card-hover text-start p-[var(--s3,14px)] flex flex-col justify-between gap-[var(--s2,8px)] transition-colors duration-150 cursor-pointer min-w-0 ${
                step.completed
                  ? 'bg-[#FBFDFB] dark:bg-[#1D2520] hover:bg-[#F5FAF7] dark:hover:bg-[#222B25]'
                  : 'bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523]'
              }`}
            >
              <div className="flex flex-col gap-[var(--s1,6px)]">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 t-small font-semibold ${
                      step.completed
                        ? 'text-[#0B7A45] dark:text-[#4ADE80]'
                        : 'text-[#B83B1B] dark:text-[#FB923C]'
                    }`}
                  >
                    {step.completed ? <CheckCircle2 size={14} /> : <Circle size={13} />}
                    <span className="tabular-nums">{idx + 1}.</span>
                    <span>
                      {step.completed
                        ? strings.setupConfiguredBadge
                        : strings.setupActionNeededBadge}
                    </span>
                  </span>
                </div>

                <div className="t-label font-semibold text-[var(--text-1)] dark:text-white line-clamp-1">
                  {step.title}
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] line-clamp-2">
                  {step.description}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between gap-1 text-[#B83B1B] dark:text-[#FB923C] t-small font-semibold">
                <span className="truncate">{step.actionLabel}</span>
                <ArrowUpRight
                  size={14}
                  className="rtl:-scale-x-100 shrink-0 transition-transform duration-150 ltr:group-hover/step:translate-x-0.5 rtl:group-hover/step:-translate-x-0.5 group-hover/step:-translate-y-0.5 motion-reduce:transform-none"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </DashboardPod>
  );
};

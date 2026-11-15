import React from 'react';
import { ArrowUpRight, LayoutDashboard, Plus, ChevronDown, Compass } from 'lucide-react';
import { Menu, MenuEntry } from '@/atrium';
import {
  ActiveScreen,
  useDashboardShellState,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  useAtriumSelector,
  setScreenAction,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { DashboardBentoFrame } from '../dashboard';
import { AtriumButton } from '../../ui/AtriumButton';
import type { HomeColumnRatio, HomeQuickAction } from './homeTypes';
import {
  extractFirstName,
  getCategoryHomeTitle,
  getHomeRoleDisplayLabel,
  getHomeStrings,
  getTimeGreeting,
} from './homeLocalization';

/** Warm Walnut/Sandstone Pod surface for Pulse & Anchor column */
export const HOME_POD_PULSE_CLASS =
  '!bg-[#F2E6DA] dark:!bg-[#191512] !border-[#DFCFC0] dark:!border-[#382E25] !p-4 sm:!p-5 !space-y-3 lg:h-full [&>div:first-child>div:first-child>h2]:!text-[#2C1E15] dark:[&>div:first-child>div:first-child>h2]:!text-white [&>div:last-child]:!space-y-3';

/** Soft Complementary Lavender-Linen Pod surface for Workspaces Directory column */
export const HOME_POD_DIRECTORY_CLASS =
  '!bg-[#EFEBF7] dark:!bg-[#171420] !border-[#DDD4EC] dark:!border-[#312A44] !p-4 sm:!p-5 !space-y-3 lg:h-full [&>div:first-child>div:first-child>h2]:!text-[#241B38] dark:[&>div:first-child>div:first-child>h2]:!text-white [&>div:last-child]:!space-y-3';

export interface HomeShellProps {
  roleKey?: string;
  titleOverride?: string;
  subtitleOverride?: string;
  quickActions?: HomeQuickAction[];
  dashboardTarget?: ActiveScreen | null;
  dashboardLabel?: string;
  onNavigateDashboard?: () => void;
  extraHeaderActions?: React.ReactNode;
  testId?: string;
  children: React.ReactNode;
}

export const HomeShell: React.FC<HomeShellProps> = ({
  roleKey = 'owner',
  titleOverride,
  subtitleOverride,
  quickActions = [],
  dashboardTarget = 'dashboard',
  dashboardLabel,
  onNavigateDashboard,
  extraHeaderActions,
  testId = 'category-home-view',
  children,
}) => {
  const { language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();

  const currentBusiness = useAtriumSelector(selectCurrentBusinessFromState);
  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);
  const currentUser = useAtriumSelector((s) => s.currentUser);

  const strings = getHomeStrings(language);
  const firstName = extractFirstName(currentUser?.fullName);
  const greeting = getTimeGreeting(language);

  const hallTitle =
    titleOverride || getCategoryHomeTitle(currentBusiness?.category, language);
  const roleLabel = getHomeRoleDisplayLabel(
    currentBusiness?.category,
    roleKey,
    language
  );

  // Deduplicate branch when default branch shares business name (avoids "Atrium 1 · Atrium 1")
  const branchLabel =
    currentBranch?.name && currentBranch.name !== currentBusiness?.name
      ? currentBranch.name
      : null;

  const contextParts = [
    currentBusiness?.name,
    branchLabel,
    roleLabel,
  ].filter(Boolean);

  const menuItems: MenuEntry[] = quickActions.map((action) => ({
    id: action.id,
    label: action.label,
    description: action.description,
    icon: action.icon,
    onSelect: action.onClick,
  }));

  const handleOpenDashboard = () => {
    if (onNavigateDashboard) {
      onNavigateDashboard();
    } else if (dashboardTarget) {
      setScreenAction(dashboardTarget);
    }
  };

  return (
    <DashboardBentoFrame
      theme={theme}
      isRtl={isRtl}
      isOffline={networkMode === 'offline'}
      isTimedOut={false}
      isSyncing={isSyncing}
      lastSyncedAt={lastSyncedAt}
      onRetry={retryCloudSync}
      data-testid={testId}
      className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col !space-y-3.5"
    >
      {/* Reception Hall Welcome Header — Personalized Greeting */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-0.5 min-w-0 max-w-full shrink-0">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F2E3D5] to-[#EAE3F7] dark:from-[#2B2019] dark:to-[#221C34] border border-[#DDD0C4] dark:border-[#3D3350] shadow-2xs flex items-center justify-center text-[#5B41A1] dark:text-[#C4B5FD] shrink-0"
          >
            <Compass size={20} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] sm:text-[36px] font-extrabold uppercase leading-[0.95] tracking-[0.012em] text-[#241913] dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:text-[23px] rtl:sm:text-[28px] rtl:leading-tight rtl:tracking-normal truncate">
              {greeting}
              {firstName ? (
                <>
                  {language === 'ar' ? '، ' : ', '}
                  <span className="text-[#B84122] dark:text-[#FB923C]">{firstName}</span>
                </>
              ) : null}
            </h1>
            <p className="text-[12.5px] font-medium tracking-[-0.005em] text-[#4B3B31]/75 dark:text-white/65 truncate mt-1">
              <span className="font-semibold text-[#5B41A1] dark:text-[#C4B5FD]">
                {hallTitle}
              </span>
              {contextParts.length > 0 && (
                <>
                  {' · '}
                  <span className="text-[#4B3B31]/85 dark:text-white/80">
                    {contextParts.join(' · ')}
                  </span>
                </>
              )}
              {subtitleOverride ? ` · ${subtitleOverride}` : ''}
            </p>
          </div>
        </div>

        {/* Navigation & Quick Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {extraHeaderActions}

          {menuItems.length > 0 && (
            <Menu
              aria-label={strings.quickActions}
              placement={isRtl ? 'bottom-start' : 'bottom-end'}
              items={menuItems}
              trigger={(triggerProps) => (
                <AtriumButton
                  {...triggerProps}
                  variant="outline"
                  size="md"
                  icon={<Plus size={15} strokeWidth={2.2} />}
                  className="whitespace-nowrap shrink-0 !border-[#D8C9BC] dark:!border-[#3A312C] hover:!border-[#6B4122] dark:hover:!border-[#D9A97E]"
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {strings.quickActions}
                    <ChevronDown size={14} className="opacity-70" />
                  </span>
                </AtriumButton>
              )}
            />
          )}

          {dashboardTarget && (
            <AtriumButton
              variant="primary"
              size="md"
              onClick={handleOpenDashboard}
              icon={
                <ArrowUpRight
                  size={16}
                  strokeWidth={2.2}
                  className="rtl:-scale-x-100"
                />
              }
              iconPosition="right"
              className="whitespace-nowrap shrink-0"
              data-testid="home-open-dashboard-btn"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <LayoutDashboard size={15} strokeWidth={2.1} className="opacity-90" />
                {dashboardLabel || strings.dashboardCta}
              </span>
            </AtriumButton>
          )}
        </div>
      </header>

      {children}
    </DashboardBentoFrame>
  );
};

export interface HomePodGridProps {
  ratio?: HomeColumnRatio;
  children: React.ReactNode;
  className?: string;
}

const RATIO_GRID_CLASS: Record<HomeColumnRatio, string> = {
  '36_64': 'lg:grid-cols-[36fr_64fr]',
  '38_62': 'lg:grid-cols-[38fr_62fr]',
  '40_60': 'lg:grid-cols-[40fr_60fr]',
  '42_58': 'lg:grid-cols-[42fr_58fr]',
  '44_56': 'lg:grid-cols-[44fr_56fr]',
  '45_55': 'lg:grid-cols-[45fr_55fr]',
  '58_42': 'lg:grid-cols-[58fr_42fr]',
};

export const HomePodGrid: React.FC<HomePodGridProps> = ({
  ratio = '40_60',
  children,
  className = '',
}) => {
  return (
    <div
      className={`lg:flex-1 lg:min-h-0 grid grid-cols-1 ${RATIO_GRID_CLASS[ratio]} gap-4 items-stretch ${className}`}
    >
      {children}
    </div>
  );
};

export interface HomeCardsGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Balanced workspace card grid that guarantees symmetric filling with zero
 * orphan quadrants for 1, 2, 3 (auto-spans 3rd card full width), or 4 cards.
 */
export const HomeCardsGrid: React.FC<HomeCardsGridProps> = ({
  children,
  className = '',
}) => {
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const count = validChildren.length;

  const colsClass = count <= 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';

  return (
    <div
      className={`flex-1 min-h-0 grid ${colsClass} gap-3.5 auto-rows-fr items-stretch ${className}`}
    >
      {validChildren.map((child, idx) => {
        if (
          count === 3 &&
          idx === 2 &&
          React.isValidElement<{ className?: string }>(child)
        ) {
          return React.cloneElement(child, {
            className: `${child.props.className || ''} md:col-span-2`.trim(),
          });
        }
        return child;
      })}
    </div>
  );
};

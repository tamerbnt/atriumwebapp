import React from 'react';
import { Plus } from 'lucide-react';
import { AtriumButton } from '../AtriumButton';

export interface ScreenHeaderPrimaryAction {
  label: string;
  onClick: (originEl?: HTMLElement | null) => void;
  icon?: React.ReactNode;
  dataAction?: string;
  disabled?: boolean;
}

export interface ScreenHeaderBarProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  primaryAction?: ScreenHeaderPrimaryAction;
  addLabel?: string;
  onAdd?: (originEl?: HTMLElement | null) => void;
  addButtonDataAction?: string;
  secondaryActions?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ScreenHeaderBar: React.FC<ScreenHeaderBarProps> = React.memo(({
  icon,
  title,
  subtitle,
  primaryAction,
  addLabel,
  onAdd,
  addButtonDataAction = 'add-record',
  secondaryActions,
  actions,
  className = '',
}) => {
  const resolvedAction: ScreenHeaderPrimaryAction | undefined =
    primaryAction ||
        (onAdd && addLabel
      ? {
          label: addLabel,
          onClick: onAdd,
          icon: <Plus size={16} strokeWidth={1.5} />,
          dataAction: addButtonDataAction,
        }
      : undefined);

  const extraNodes = secondaryActions || actions;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--ph-gap,16px)] ${className}`}>
      <div className="flex items-center gap-[var(--ph-gap,16px)] min-w-0">
        <div className="sq-elev-card shrink-0">
          <div
            data-sq="tile-lg"
            data-sq-border="solid"
            className="relative w-[var(--ph-tile,48px)] h-[var(--ph-tile,48px)] bg-[#F3EDE7] dark:bg-white/[0.07] [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.7)] flex items-center justify-center text-[var(--text-1)] dark:text-white"
          >
            {icon}
          </div>
        </div>
        <div className="min-w-0 flex flex-col gap-[var(--ph-sub-gap,4px)]">
          <h1 className="t-page text-[var(--text-1)] dark:text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="t-body text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {(extraNodes || resolvedAction) && (
        <div className="flex items-center gap-[var(--s2,8px)] relative flex-wrap shrink-0">
          {extraNodes}
          {resolvedAction && (
            <AtriumButton
              variant="primary"
              size="md"
              disabled={resolvedAction.disabled}
              data-action={resolvedAction.dataAction || addButtonDataAction}
              onClick={(e) => resolvedAction.onClick(e.currentTarget)}
              icon={resolvedAction.icon ?? <Plus size={16} strokeWidth={1.5} />}
              className="shadow-xs"
            >
              {resolvedAction.label}
            </AtriumButton>
          )}
        </div>
      )}
    </div>
  );
});

ScreenHeaderBar.displayName = 'ScreenHeaderBar';

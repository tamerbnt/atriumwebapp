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
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: addButtonDataAction,
        }
      : undefined);

  const extraNodes = secondaryActions || actions;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 ${className}`}>
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
        <div className="sq-elev-card shrink-0">
          <div
            data-sq="tile-lg"
            data-sq-border="solid"
            className="relative w-11 h-11 sm:w-12 sm:h-12 bg-[#F3EDE7] dark:bg-white/[0.07] [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.7)] flex items-center justify-center text-black dark:text-white"
          >
            {icon}
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase rtl:normal-case leading-[0.98] rtl:leading-tight tracking-[0.012em] rtl:tracking-normal text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans truncate">
            {title}
          </h1>
        </div>
      </div>

      {(extraNodes || resolvedAction) && (
        <div className="flex items-end gap-3 relative flex-wrap shrink-0">
          {extraNodes}
          {resolvedAction && (
            <AtriumButton
              variant="primary"
              size="md"
              disabled={resolvedAction.disabled}
              data-action={resolvedAction.dataAction || addButtonDataAction}
              onClick={(e) => resolvedAction.onClick(e.currentTarget)}
              icon={resolvedAction.icon ?? <Plus size={16} strokeWidth={2.2} />}
              className="px-4 font-semibold shadow-xs"
            >
              <span className="text-xs sm:text-sm font-semibold">{resolvedAction.label}</span>
            </AtriumButton>
          )}
        </div>
      )}
    </div>
  );
});

ScreenHeaderBar.displayName = 'ScreenHeaderBar';

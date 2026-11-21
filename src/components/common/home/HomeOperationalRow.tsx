import React from 'react';
import { DashboardPod } from '../dashboard';
import { useTranslation } from '../../../utils/useTranslation';
import { getHomeStrings } from './homeLocalization';

export interface HomeOperationalRowProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  rightControls?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function getCardSpanClass(index: number, total: number): string {
  if (total <= 1) return 'col-span-1 md:col-span-6';
  if (total === 2) return 'col-span-1 md:col-span-3';
  if (total === 3) {
    return index === 2
      ? 'col-span-1 md:col-span-6 lg:col-span-2'
      : 'col-span-1 md:col-span-3 lg:col-span-2';
  }
  if (total === 4) return 'col-span-1 md:col-span-3';
  if (total === 5) {
    if (index < 3) {
      return index === 2
        ? 'col-span-1 md:col-span-3 lg:col-span-2'
        : 'col-span-1 md:col-span-3 lg:col-span-2';
    }
    return index === 3
      ? 'col-span-1 md:col-span-3 lg:col-span-3'
      : 'col-span-1 md:col-span-6 lg:col-span-3';
  }
  return 'col-span-1 md:col-span-3 lg:col-span-2';
}

export const HomeOperationalRow: React.FC<HomeOperationalRowProps> = ({
  title,
  subtitle,
  icon,
  badge,
  rightControls,
  footer,
  children,
  className = '',
}) => {
  const { language } = useTranslation();
  const strings = getHomeStrings(language);
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const total = validChildren.length;

  return (
    <DashboardPod
      title={title || strings.operationalModulesTitle}
      subtitle={subtitle || strings.operationalModulesSubtitle}
      icon={icon}
      badge={badge}
      rightControls={rightControls}
      className={`!bg-[#F3EDE7] dark:!bg-[#191716] ${className}`}
    >
      <div
        data-testid="home-row-operations"
        className="grid grid-cols-1 md:grid-cols-6 gap-[var(--card-gap,12px)] auto-rows-fr items-stretch min-w-0"
      >
        {validChildren.map((child, idx) => {
          const spanClass = getCardSpanClass(idx, total);
          if (React.isValidElement<{ className?: string }>(child)) {
            return React.cloneElement(child, {
              key: child.key || `op-card-${idx}`,
              className: `${child.props.className || ''} ${spanClass}`.trim(),
            });
          }
          return (
            <div key={`op-wrap-${idx}`} className={spanClass}>
              {child}
            </div>
          );
        })}
      </div>
      {footer ? <div className="pt-[var(--s1,4px)]">{footer}</div> : null}
    </DashboardPod>
  );
};

import React from 'react';
import { LiveSegmentedControl } from '../../../ui/live/LiveSegmentedControl';

export interface StatusTabItem {
  id: string;
  label: string;
  tooltip?: string;
  count: number;
}

export interface StatusTabsProps {
  tabs: StatusTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | number;
}

export const StatusTabs: React.FC<StatusTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Vue de la liste',
  className = '',
  size = 'md',
}) => {
  return (
    <LiveSegmentedControl
      size={size}
      className={className}
      options={tabs.map((tab) => ({
        value: tab.id,
        label: tab.label,
        tooltip: tab.tooltip,
        count: tab.count,
      }))}
      value={activeTab}
      onValueChange={onChange}
      aria-label={ariaLabel}
    />
  );
};

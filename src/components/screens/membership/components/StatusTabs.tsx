import React from 'react';

export interface StatusTabItem {
  id: string;
  label: string;
  count: number;
}

export interface StatusTabsProps {
  tabs: StatusTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  ariaLabel?: string;
  className?: string;
}

export const StatusTabs: React.FC<StatusTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Vue de la liste',
  className = '',
}) => {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`tabs inline-flex items-center border border-[#E6DED6] bg-white rounded-[12px] p-[3px] gap-[2px] shrink-0 select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isSelected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap h-[36px] border-0 rounded-[9px] px-3.5 font-medium text-[13px] flex items-center gap-2 transition-colors duration-160 cursor-pointer ${
              isSelected
                ? 'bg-[#C9441F] text-white shadow-xs'
                : 'bg-transparent text-[#1B1917] hover:bg-[#FBE7DF]'
            }`}
          >
            <span>{tab.label}</span>
            <b
              className={`font-mono text-[11px] font-bold py-0.5 px-1.5 rounded-[6px] transition-colors duration-160 ${
                isSelected
                  ? 'bg-white/25 text-white'
                  : 'bg-[#F3EDE7] text-[#1B1917]'
              }`}
            >
              {tab.count}
            </b>
          </button>
        );
      })}
    </div>
  );
};

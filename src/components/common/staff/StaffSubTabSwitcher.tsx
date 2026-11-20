import React from 'react';
import { Users, Clock, Receipt, History } from 'lucide-react';

export type StaffSubTabId = 'directory' | 'attendance' | 'payroll' | 'history';

interface StaffSubTabSwitcherProps {
  activeTab: StaffSubTabId;
  onChange: (tab: StaffSubTabId) => void;
  staffCount: number;
  presentCount: number;
  language: string;
}

export const StaffSubTabSwitcher: React.FC<StaffSubTabSwitcherProps> = ({
  activeTab,
  onChange,
  staffCount,
  presentCount,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const tabs: { id: StaffSubTabId; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'directory',
      label: isAr ? 'الفريق' : isEn ? 'Directory' : 'Équipe',
      icon: <Users className="w-4 h-4" strokeWidth={1.5} />,
      badge: String(staffCount),
    },
    {
      id: 'attendance',
      label: isAr ? 'الحضور' : isEn ? 'Attendance' : 'Présence',
      icon: <Clock className="w-4 h-4" strokeWidth={1.5} />,
      badge: String(presentCount),
    },
    {
      id: 'payroll',
      label: isAr ? 'الرواتب' : isEn ? 'Payroll' : 'Paie',
      icon: <Receipt className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      id: 'history',
      label: isAr ? 'السجل' : isEn ? 'History' : 'Historique',
      icon: <History className="w-4 h-4" strokeWidth={1.5} />,
    },
  ];

  return (
    <div
      data-sq="ctl"
      style={{ '--sq-stroke': 'var(--atr-border, #E6DED6)' } as React.CSSProperties}
      className="flex flex-wrap items-center gap-[var(--s1,4px)] p-[var(--seg-l-pad,4px)] min-h-[var(--seg-l-h,40px)] bg-[#F3EDE7] dark:bg-[#1C1B1A] w-full sm:w-fit"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            data-sq={isActive ? 'thumb' : 'none'}
            style={
              isActive
                ? ({ '--sq-stroke': 'var(--atr-border, rgba(0,0,0,0.08))' } as React.CSSProperties)
                : undefined
            }
            className={`h-[var(--seg-thumb-h,32px)] flex items-center gap-[var(--seg-badge-gap,6px)] px-[var(--seg-px,12px)] t-btn transition-all cursor-pointer select-none whitespace-nowrap ${
              isActive
                ? 'bg-white dark:bg-[#262422] text-[var(--text-1)] dark:text-white'
                : 'rounded-[var(--r-thumb,9px)] text-[var(--text-2)] dark:text-white/75 hover:text-[var(--text-1)] dark:hover:text-white hover:bg-black/3 dark:hover:bg-white/5'
            }`}
          >
            <span className={isActive ? 'text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]' : 'text-[var(--text-2)] dark:text-white/70'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`inline-flex items-center justify-center min-w-[var(--badge-min-w,22px)] h-[var(--badge-h,22px)] px-[var(--badge-px,6px)] rounded-full t-small font-semibold tabular-nums ${
                  isActive
                    ? 'bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                    : 'bg-[#E6DED6]/70 dark:bg-[#262422] text-[var(--text-2)] dark:text-white/75'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

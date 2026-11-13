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
      icon: <Users className="w-4 h-4" />,
      badge: String(staffCount),
    },
    {
      id: 'attendance',
      label: isAr ? 'الحضور' : isEn ? 'Attendance' : 'Présence',
      icon: <Clock className="w-4 h-4" />,
      badge: String(presentCount),
    },
    {
      id: 'payroll',
      label: isAr ? 'الرواتب' : isEn ? 'Payroll' : 'Paie',
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: isAr ? 'السجل' : isEn ? 'History' : 'Historique',
      icon: <History className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F3EDE7] dark:bg-[#1C1B1A] rounded-2xl w-full sm:w-fit border border-[#E6DED6] dark:border-[#3A3734] shadow-xs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer select-none whitespace-nowrap ${
              isActive
                ? 'bg-white dark:bg-[#262422] text-black dark:text-white shadow-sm border border-black/5 dark:border-white/10'
                : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:bg-black/3 dark:hover:bg-white/5'
            }`}
          >
            <span className={isActive ? 'text-[#d4522f]' : 'text-black/65 dark:text-white/70'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md font-bold tabular-nums ${
                  isActive
                    ? 'bg-[#d4522f]/10 text-[#d4522f]'
                    : 'bg-[#E6DED6]/70 dark:bg-[#262422] text-black/72 dark:text-white/75'
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

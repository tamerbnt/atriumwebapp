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
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F3F5] dark:bg-[#18181B] rounded-2xl w-full sm:w-fit border border-[#E2E8EC] dark:border-[#27272A] shadow-xs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer select-none whitespace-nowrap ${
              isActive
                ? 'bg-white dark:bg-[#262422] text-[#18181B] dark:text-white shadow-sm border border-black/5 dark:border-white/10'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/3 dark:hover:bg-white/5'
            }`}
          >
            <span className={isActive ? 'text-[#d4522f]' : 'text-neutral-500 dark:text-neutral-400'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                  isActive
                    ? 'bg-[#d4522f]/10 text-[#d4522f]'
                    : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
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

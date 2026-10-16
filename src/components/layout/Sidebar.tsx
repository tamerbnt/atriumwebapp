import React, { useState } from 'react';
import {
  Home,
  BarChart2,
  Users,
  ClipboardList,
  History,
  ShoppingBag,
  Calendar,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  FileText,
  Kanban,
} from 'lucide-react';
import { useAtriumStore, ActiveScreen } from '../../services/store';

interface SidebarProps {
  onOpenVoucherModal: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenVoucherModal,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { activeScreen, setScreen, terminology, currentBusiness } = useAtriumStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const isFreelance = currentBusiness?.category === 'freelance_solo';

  const dockNavItems: Array<{
    id: ActiveScreen;
    icon: React.ReactNode;
    title: string;
    label: string;
  }> = isFreelance
    ? [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: 'Solo Command Dashboard',
          label: 'Home',
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: 'Clients CRM & 360° Inspector',
          label: 'Clients',
        },
        {
          id: 'scheduler',
          icon: <Kanban size={19} />,
          title: 'Deliverables & Deadlines Kanban',
          label: 'Deliverables',
        },
        {
          id: 'analytics',
          icon: <Clock size={19} />,
          title: 'Time Tracker & Pomodoro',
          label: 'Time Tracker',
        },
        {
          id: 'registrations',
          icon: <ClipboardList size={19} />,
          title: 'Proposals & Inquiries',
          label: 'Proposals',
        },
        {
          id: 'shop',
          icon: <FileText size={19} />,
          title: 'Invoices & Billing Hub',
          label: 'Invoices',
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: 'Tax Reserves & Net Profit',
          label: 'Finance',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: 'Settings & Workspace',
          label: 'Settings',
        },
      ]
    : [
        {
          id: 'dashboard',
          icon: <Home size={19} />,
          title: 'Home Dashboard',
          label: 'Home',
        },
        {
          id: 'analytics',
          icon: <BarChart2 size={19} />,
          title: 'Facility Analytics',
          label: 'Analytics',
        },
        {
          id: 'members',
          icon: <Users size={19} />,
          title: `${terminology.members} Directory`,
          label: terminology.members,
        },
        {
          id: 'registrations',
          icon: <ClipboardList size={19} />,
          title: `${terminology.registration} & Intake`,
          label: terminology.registration,
        },
        {
          id: 'history',
          icon: <History size={19} />,
          title: 'Operations History',
          label: 'History',
        },
        {
          id: 'shop',
          icon: <ShoppingBag size={19} />,
          title: `${terminology.shop} & Products`,
          label: terminology.shop,
        },
        {
          id: 'scheduler',
          icon: <Calendar size={19} />,
          title: terminology.scheduler,
          label: terminology.scheduler,
        },
        {
          id: 'finance',
          icon: <Wallet size={19} />,
          title: 'Finance & Staff',
          label: 'Finance',
        },
        {
          id: 'settings',
          icon: <Settings size={19} />,
          title: 'Settings & License',
          label: 'Settings',
        },
      ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Floating Slim Dock Rail / Expandable Sidebar */}
      <aside
        style={{
          backgroundColor: 'var(--color-dock-bg)',
          borderRadius: 'var(--radius-dock)',
        }}
        className={`my-3 ml-3 flex flex-col items-center justify-between py-4 select-none shrink-0 z-40 fixed inset-y-0 left-0 transition-all duration-300 lg:static lg:translate-x-0 ${
          isExpanded ? 'w-[190px] px-3' : 'w-[60px]'
        } ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Logo Emblem with Expand Indicator */}
        <div className="relative group w-full flex items-center justify-center">
          <div
            onClick={onOpenVoucherModal}
            className={`rounded-2xl bg-[#2A2624] flex items-center cursor-pointer hover:bg-[#342F2B] transition-all p-2 ${
              isExpanded ? 'w-full gap-2.5 px-3' : 'w-10 h-10 justify-center'
            }`}
            title="Atrium Business Platform"
          >
            {/* 4-square geometric logo emblem matching desktop */}
            <div className="grid grid-cols-2 gap-1 w-5 h-5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
              <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
              <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
              <div className="w-1.5 h-1.5 rounded-xs bg-[#C4785A]" />
            </div>

            {isExpanded && (
              <span className="text-xs font-bold text-white tracking-wide truncate">
                ATRIUM
              </span>
            )}
          </div>

          {/* Tiny circular expand chevron overlapping right edge as seen on desktop */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            title={isExpanded ? 'Collapse Dock' : 'Expand Dock'}
            className="absolute -right-2 top-3 w-4 h-4 rounded-full bg-[#C4785A] text-white flex items-center justify-center shadow-xs cursor-pointer hover:scale-110 transition-transform"
          >
            {isExpanded ? (
              <ChevronLeft size={10} strokeWidth={3} />
            ) : (
              <ChevronRight size={10} strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Center Vertical Dock Navigation */}
        <nav className="flex flex-col items-center gap-2.5 my-auto w-full">
          {dockNavItems.map((item, index) => {
            const isActive = activeScreen === item.id;

            return (
              <button
                key={index}
                type="button"
                onClick={() => setScreen(item.id)}
                title={item.title}
                style={{
                  backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#A1A1AA',
                }}
                className={`rounded-2xl flex items-center transition-all cursor-pointer ${
                  isExpanded
                    ? 'w-full h-10 px-3 gap-3 justify-start text-xs font-medium'
                    : 'w-10 h-10 justify-center'
                } ${
                  isActive
                    ? 'shadow-md scale-102 font-bold'
                    : 'hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                {isExpanded && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Logo Script */}
        <div className="text-center pt-2">
          <span className="text-[9px] font-serif text-[#C4785A]/70 tracking-widest uppercase block select-none">
            {isExpanded ? 'ATRIUM ERP' : 'atrium'}
          </span>
        </div>
      </aside>
    </>
  );
};

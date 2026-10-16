import React, { useState, useEffect } from 'react';
import { useAtriumStore } from './services/store';
import { Member } from './types/index';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { MembersScreen } from './components/screens/MembersScreen';
import { RegistrationsScreen } from './components/screens/RegistrationsScreen';
import { ShopScreen } from './components/screens/ShopScreen';
import { SchedulerScreen } from './components/screens/SchedulerScreen';
import { FinanceStaffScreen } from './components/screens/FinanceStaffScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { VoucherModal } from './components/modals/VoucherModal';
import { MemberModal } from './components/modals/MemberModal';
import { LeadModal } from './components/modals/LeadModal';

export default function App() {
  const { activeScreen, theme, language } = useAtriumStore();

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sync theme & RTL on boot
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [theme, language]);

  // Close mobile sidebar on screen change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeScreen]);

  const handleOpenAddMember = () => {
    setMemberToEdit(null);
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (member: Member) => {
    setMemberToEdit(member);
    setIsMemberModalOpen(true);
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen onAddMember={handleOpenAddMember} />;
      case 'members':
        return (
          <MembersScreen
            onAddMember={handleOpenAddMember}
            onEditMember={handleOpenEditMember}
          />
        );
      case 'registrations':
        return <RegistrationsScreen onAddLead={() => setIsLeadModalOpen(true)} />;
      case 'shop':
        return <ShopScreen />;
      case 'scheduler':
        return <SchedulerScreen />;
      case 'finance':
        return <FinanceStaffScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen onOpenVoucherModal={() => setIsVoucherModalOpen(true)} />;
      default:
        return <DashboardScreen onAddMember={handleOpenAddMember} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-window-bg)]">
      {/* 288px Obsidian Sidebar with Mobile Drawer */}
      <Sidebar
        onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TopBar Header */}
        <TopBar
          onOpenVoucherModal={() => setIsVoucherModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Dynamic Screen Viewport wrapped in pure white desktop container */}
        <main className="flex-1 overflow-y-auto pr-3 pl-2 pb-3 min-w-0">
          <div className="bg-white dark:bg-[#18181B] rounded-[32px] p-6 sm:p-8 min-h-[calc(100vh-80px)] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
            {renderActiveScreen()}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
      />

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setMemberToEdit(null);
        }}
        memberToEdit={memberToEdit}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
      />
    </div>
  );
}

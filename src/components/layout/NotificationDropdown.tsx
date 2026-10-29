import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  TriangleAlert,
  CircleX,
  CircleCheck,
  Info,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { AppNotification, SupportedLanguage } from '../../types/index';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_BY_TYPE: Record<string, LucideIcon> = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    removeNotification,
    setScreen,
    language,
  } = useAtriumStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const isRtl = language === 'ar';

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !target.closest('button[aria-label="Open notifications menu"]')
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatRelativeTime = (timestamp: number, lang: SupportedLanguage) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (lang === 'ar') {
      if (mins < 1) return 'الآن';
      if (mins < 60) return `منذ ${mins} د`;
      if (hours < 24) return `منذ ${hours} س`;
      return `منذ ${days} ي`;
    }
    if (lang === 'fr') {
      if (mins < 1) return "À l'instant";
      if (mins < 60) return `il y a ${mins} min`;
      if (hours < 24) return `il y a ${hours} h`;
      return `il y a ${days} j`;
    }
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const dropdownNode = (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Notifications"
      className="fixed z-[99999] w-[360px] max-w-[calc(100vw-32px)] flex flex-col gap-2 pointer-events-auto select-none outline-none font-sans"
      style={{
        position: 'fixed',
        top: '76px', // Comfortably below the 64px bottom edge of TopBar
        right: isRtl ? 'auto' : '24px',
        left: isRtl ? '24px' : 'auto',
        zIndex: 99999,
        '--tst-r': '20px',
      } as React.CSSProperties}
    >
      {/* Floating Control Card (Dedicated Small Card for Title & Controls) */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-[16px] bg-white/95 dark:bg-[#1C1C20]/95 backdrop-blur-md border border-black/8 dark:border-white/12 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] text-[11px] text-neutral-500 dark:text-neutral-400 select-none">
        <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200 text-xs">
          <Bell size={13} className="text-[#C4785A]" />
          <span>{language === 'ar' ? 'الإشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}</span>
          {unreadNotificationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#C4785A] text-white leading-none">
              {unreadNotificationCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {notifications.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead()}
                className="hover:text-[#C4785A] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title={language === 'ar' ? 'تحديد الكل كمقروء' : language === 'fr' ? 'Tout marquer comme lu' : 'Mark all as read'}
              >
                <CheckCheck size={12} className="text-[#C4785A]" />
                <span className="hidden sm:inline">
                  {language === 'ar' ? 'قراءة الكل' : language === 'fr' ? 'Tout lire' : 'Mark all read'}
                </span>
              </button>
              <span className="text-neutral-200 dark:text-neutral-700">•</span>
              <button
                type="button"
                onClick={() => clearAllNotifications()}
                className="hover:text-rose-500 font-medium transition-colors cursor-pointer flex items-center gap-1"
                title={language === 'ar' ? 'مسح الكل' : language === 'fr' ? 'Effacer tout' : 'Clear all'}
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">
                  {language === 'ar' ? 'مسح' : language === 'fr' ? 'Effacer' : 'Clear all'}
                </span>
              </button>
              <span className="text-neutral-200 dark:text-neutral-700">•</span>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Floating Notification Rows (Each Row Floats Alone with Zero Enclosing Box) */}
      <div className="flex flex-col gap-2 max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar py-0.5">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-[20px] bg-white/95 dark:bg-[#1C1C20]/95 backdrop-blur-md border border-black/8 dark:border-white/12 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1),0_2px_6px_-1px_rgba(0,0,0,0.05)] text-xs font-semibold text-neutral-700 dark:text-neutral-200"
            >
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'لا توجد إشعارات جديدة حالياً'
                  : language === 'fr'
                  ? 'Toutes les notifications sont lues'
                  : 'All caught up! No active notifications.'}
              </span>
            </motion.div>
          ) : (
            notifications.map((notif: AppNotification) => {
              const isUnread = !notif.read;
              const Icon = ICON_BY_TYPE[notif.type] || Info;

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: -14, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 28, scale: 0.92, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 480, damping: 30 }}
                  className="group relative flex items-center gap-3 px-3.5 h-[64px] rounded-[20px] bg-white dark:bg-[#1C1C20] border border-black/8 dark:border-white/12 shadow-[0_10px_25px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-3px_rgba(0,0,0,0.14)] select-none shrink-0"
                  data-kind={notif.type}
                  onClick={() => {
                    if (isUnread) markNotificationAsRead(notif.id);
                  }}
                >
                  {/* Status Icon */}
                  <span className="tst-icon shrink-0">
                    <Icon size={18} strokeWidth={2.2} />
                  </span>

                  {/* Text Content */}
                  <div className="tst-text flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <b className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
                        <span className="truncate">{notif.title}</span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4785A] shrink-0" />
                        )}
                      </b>
                      <span className="text-[10px] text-neutral-400 shrink-0 font-normal tabular-nums">
                        {formatRelativeTime(notif.createdAt, language)}
                      </span>
                    </div>
                    <span className="text-[12px] text-neutral-500 dark:text-neutral-400 truncate block">
                      {notif.message}
                    </span>
                  </div>

                  {/* Action Pill Button */}
                  {(notif.action || notif.targetScreen) && (
                    <button
                      type="button"
                      className="tst-act shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationAsRead(notif.id);
                        if (notif.action?.onClick) {
                          notif.action.onClick();
                        } else {
                          const dest = notif.action?.targetScreen || notif.targetScreen;
                          if (dest) setScreen(dest as any);
                        }
                        onClose();
                      }}
                    >
                      {notif.action?.label || (language === 'ar' ? 'عرض' : language === 'fr' ? 'Afficher' : 'View')}
                    </button>
                  )}

                  {/* Dismiss Button */}
                  <button
                    type="button"
                    className="tst-x shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notif.id);
                    }}
                    title="Dismiss"
                    aria-label="Dismiss notification"
                  >
                    <X size={14} strokeWidth={2.2} />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(dropdownNode, document.body);
  }
  return dropdownNode;
};

export default NotificationDropdown;

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

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
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

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
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
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-label="Notifications"
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 460, damping: 32 }}
      className="tst fixed z-[99999] w-[390px] max-w-[calc(100vw-32px)] rounded-[24px] bg-white dark:bg-[#1C1C20] border border-black/8 dark:border-white/12 shadow-[0_14px_34px_rgba(0,0,0,0.14)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.52)] overflow-hidden flex flex-col pointer-events-auto select-none outline-none font-sans"
      style={{
        position: 'fixed',
        top: '76px',
        right: isRtl ? 'auto' : '24px',
        left: isRtl ? '24px' : 'auto',
        zIndex: 99999,
        transformOrigin: isRtl ? 'top left' : 'top right',
        '--tst-r': '20px',
      } as React.CSSProperties}
    >
      {/* Unified Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1C1C20] text-[11px] text-black/70 dark:text-white/75">
        <div className="flex items-center gap-2 font-bold text-black dark:text-white text-[13px]">
          <Bell size={14} className="text-[#d4522f] shrink-0" />
          <span>{language === 'ar' ? 'الإشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}</span>
          {unreadNotificationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-[#d4522f] text-white leading-none">
              {unreadNotificationCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {notifications.length > 0 && (
            <>
              <button
                type="button"
                data-no-liquid=""
                onClick={() => markAllNotificationsAsRead()}
                className="hover:text-[#d4522f] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title={language === 'ar' ? 'قراءة الكل' : language === 'fr' ? 'Tout lire' : 'Mark all read'}
              >
                <CheckCheck size={12} className="text-[#d4522f]" />
                <span className="hidden sm:inline">
                  {language === 'ar' ? 'قراءة الكل' : language === 'fr' ? 'Tout lire' : 'Mark all read'}
                </span>
              </button>
              <span className="text-black/30 dark:text-white/30">•</span>
              <button
                type="button"
                data-no-liquid=""
                onClick={() => clearAllNotifications()}
                className="hover:text-rose-500 font-medium transition-colors cursor-pointer flex items-center gap-1"
                title={language === 'ar' ? 'مسح الكل' : language === 'fr' ? 'Tout effacer' : 'Clear all'}
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">
                  {language === 'ar' ? 'مسح' : language === 'fr' ? 'Effacer' : 'Clear all'}
                </span>
              </button>
              <span className="text-black/30 dark:text-white/30">•</span>
            </>
          )}

          <button
            type="button"
            data-no-liquid=""
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black/55 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Enclosed Notification Rows List */}
      <div className="flex flex-col gap-2.5 p-3 max-h-[380px] overflow-y-auto no-scrollbar">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="tst-toast-item h-[60px] text-xs font-semibold text-black/80 dark:text-white/85"
              data-kind="success"
            >
              <span className="tst-icon shrink-0">
                <CheckCircle2 size={18} strokeWidth={2.2} />
              </span>
              <span>
                {language === 'ar'
                  ? 'لا توجد إشعارات'
                  : language === 'fr'
                  ? 'Aucune notification'
                  : 'No notifications'}
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
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.94, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 480, damping: 30 }}
                  className="tst-toast-item group h-[64px] cursor-pointer hover:-translate-y-0.5 select-none shrink-0"
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
                  <div className="tst-text flex-1 min-w-0 pr-0.5">
                    <div className="flex items-center justify-between gap-2 mb-0.5 min-w-0">
                      <b className="flex items-center gap-1.5 min-w-0 text-[13px] font-semibold text-black dark:text-white">
                        <em className="not-italic truncate">{notif.title}</em>
                        {isUnread && (
                          <i className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" aria-hidden="true" />
                        )}
                      </b>
                      <time className="text-[11px] text-black/50 dark:text-white/55 shrink-0 font-normal tabular-nums whitespace-nowrap">
                        {formatRelativeTime(notif.createdAt, language)}
                      </time>
                    </div>
                    <span className="block truncate">
                      {notif.message}
                    </span>
                  </div>

                  {/* Action Pill Button */}
                  {(notif.action || notif.targetScreen) && (
                    <button
                      type="button"
                      data-no-liquid=""
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
                    data-no-liquid=""
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

      {/* Unified Panel Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-neutral-50/70 dark:bg-white/[0.02] text-[11px] text-black/50 dark:text-white/55">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>
            {language === 'ar'
              ? 'مركز أتريوم المباشر'
              : language === 'fr'
              ? 'Centre Atrium Live'
              : 'Atrium Live Center'}
          </span>
        </div>
        <span className="text-black/45 dark:text-white/45">
          {language === 'ar'
            ? 'البث التشغيلي المباشر'
            : language === 'fr'
            ? 'Flux opérationnel en direct'
            : 'Realtime Operational Stream'}
        </span>
      </div>
    </motion.div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(dropdownNode, document.body);
  }
  return dropdownNode;
};

export default NotificationDropdown;

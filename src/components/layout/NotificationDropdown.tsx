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
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectUnreadNotificationCountFromState,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  removeNotification,
  setScreenAction as setScreen,
} from '../../services/store';
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
  if (!isOpen) return null;
  return <NotificationDropdownBody isOpen={isOpen} onClose={onClose} />;
};

const NotificationDropdownBody: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const { notifications, unreadNotificationCount, language } = useAtriumSelector(
    (s) => ({
      notifications: s.notifications || [],
      unreadNotificationCount: selectUnreadNotificationCountFromState(s),
      language: s.language,
    }),
    shallowEqualObjects
  );

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
      className="tst fixed z-[99999] w-[390px] max-w-[calc(100vw-32px)] sq-elev-pop pointer-events-auto select-none outline-none font-sans"
      style={{
        position: 'fixed',
        top: '76px',
        right: isRtl ? 'auto' : '24px',
        left: isRtl ? '24px' : 'auto',
        zIndex: 99999,
        transformOrigin: isRtl ? 'top left' : 'top right',
        '--tst-r': '16px',
      } as React.CSSProperties}
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="rounded-[var(--r-panel,28px)] bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] overflow-hidden flex flex-col"
      >
      {notifications.length > 0 && (
        <div className="flex items-center justify-end gap-[var(--s2,8px)] px-[var(--s3,12px)] pt-[var(--s3,12px)] t-small text-[var(--text-2)]">
          <button
            type="button"
            data-no-liquid=""
            onClick={() => markAllNotificationsAsRead()}
            className="hover:text-[var(--brand-text)] dark:hover:text-[var(--brand-on-dark)] t-small transition-colors cursor-pointer flex items-center gap-[var(--s1,4px)]"
            title={language === 'ar' ? 'قراءة الكل' : language === 'fr' ? 'Tout lire' : 'Mark all read'}
          >
            <CheckCheck size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
            <span>
              {language === 'ar' ? 'قراءة الكل' : language === 'fr' ? 'Tout lire' : 'Mark all read'}
            </span>
          </button>
          <span className="text-[var(--text-3)]">•</span>
          <button
            type="button"
            data-no-liquid=""
            onClick={() => clearAllNotifications()}
            className="hover:text-rose-600 t-small transition-colors cursor-pointer flex items-center gap-[var(--s1,4px)]"
            title={language === 'ar' ? 'مسح الكل' : language === 'fr' ? 'Tout effacer' : 'Clear all'}
          >
            <Trash2 size={16} strokeWidth={1.5} />
            <span>
              {language === 'ar' ? 'مسح' : language === 'fr' ? 'Effacer' : 'Clear all'}
            </span>
          </button>
        </div>
      )}

      {/* Enclosed Notification Rows List */}
      <div className="flex flex-col gap-[var(--s2,8px)] p-[var(--s3,12px)] max-h-[380px] overflow-y-auto no-scrollbar">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="tst-toast-item h-[var(--list-row-min-h,60px)] t-label text-black/80 dark:text-white/85"
              data-kind="success"
              data-sq="card"
              data-sq-border="solid"
            >
              <span className="tst-icon shrink-0">
                <CheckCircle2 size={16} strokeWidth={1.75} />
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
                  className="tst-toast-item group h-[var(--row-h,64px)] cursor-pointer hover:-translate-y-0.5 select-none shrink-0"
                  data-kind={notif.type}
                  data-sq="card"
                  data-sq-border="solid"
                  onClick={() => {
                    if (isUnread) markNotificationAsRead(notif.id);
                  }}
                >
                  {/* Status Icon */}
                  <span className="tst-icon shrink-0">
                    <Icon size={16} strokeWidth={1.75} />
                  </span>

                  {/* Text Content */}
                  <div className="tst-text flex-1 min-w-0 flex flex-col gap-[var(--s1,4px)]">
                    <div className="flex items-center justify-between gap-[var(--s2,8px)] min-w-0">
                      <b className="flex items-center gap-[var(--s2,8px)] min-w-0 t-label font-semibold text-[var(--text-1)]">
                        <em className="not-italic truncate">{notif.title}</em>
                        {isUnread && (
                          <i className="w-[var(--pill-dot,6px)] h-[var(--pill-dot,6px)] rounded-full bg-[var(--brand-accent)] shrink-0" aria-hidden="true" />
                        )}
                      </b>
                      <time className="t-cap text-[var(--text-3)] shrink-0 tabular-nums whitespace-nowrap">
                        {formatRelativeTime(notif.createdAt, language)}
                      </time>
                    </div>
                    <span className="block t-cap truncate">
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
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      </div>
    </motion.div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(dropdownNode, document.body);
  }
  return dropdownNode;
};

export default NotificationDropdown;

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { setActivePmSubScreenAction, setScreenAction } from '../../../services/store';
import { AtriumButton } from '../../ui/AtriumButton';
import {
  Sp,
  TUNES,
  checkReducedMotion,
  subscribeFrame,
  wake,
} from '../../ui/kinetic/kineticMotion';
import { computeInitialsColor, extractInitials } from '../../ui/kinetic/KineticRow';
import type { HomeDailyEvent, HomeHistoriqueTone } from './homeTypes';

const STATUS_BADGE_CLASSES: Record<HomeHistoriqueTone, string> = {
  positive:
    'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]',
  warning:
    'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]',
  danger:
    'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]',
  info:
    'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC]',
  neutral:
    'bg-[#F3EDE7] dark:bg-[#2B2825] text-black/80 dark:text-white/85',
};

export interface HomeKineticEventRowProps {
  event: HomeDailyEvent;
  index: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  openLabel: string;
}

export const HomeKineticEventRow: React.FC<HomeKineticEventRowProps> = React.memo(
  ({ event, index, isExpanded, onToggleExpand, openLabel }) => {
    const rowRef = useRef<HTMLDivElement | null>(null);
    const drawerRef = useRef<HTMLDivElement | null>(null);
    const drawerSpringRef = useRef<Sp | null>(null);
    const enterSpringRef = useRef<Sp | null>(null);
    const [detailMounted, setDetailMounted] = useState(isExpanded);

    useEffect(() => {
      if (typeof window === 'undefined' || checkReducedMotion()) {
        if (rowRef.current) {
          rowRef.current.style.opacity = '1';
          rowRef.current.style.transform = 'translateY(0px)';
        }
        return;
      }

      const sp = new Sp(0, TUNES.rowPresence);
      enterSpringRef.current = sp;
      const delay = Math.min(index * 28, 220);

      const unsub = subscribeFrame(() => {
        if (!rowRef.current) return;
        const p = Math.max(0, Math.min(1, sp.x));
        rowRef.current.style.opacity = String(p);
        rowRef.current.style.transform = `translateY(${((1 - p) * 10).toFixed(2)}px)`;
      });

      const timer = setTimeout(() => {
        sp.setTarget(1);
        wake();
      }, delay);

      return () => {
        clearTimeout(timer);
        unsub();
        sp.destroy();
        enterSpringRef.current = null;
      };
    }, [index]);

    useEffect(() => {
      if (isExpanded && !detailMounted) {
        setDetailMounted(true);
      }
      if (!isExpanded && detailMounted) {
        const t = setTimeout(() => setDetailMounted(false), 320);
        return () => clearTimeout(t);
      }
      return undefined;
    }, [isExpanded, detailMounted]);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const el = drawerRef.current;
      if (!el) return;

      if (checkReducedMotion()) {
        el.style.maxHeight = isExpanded ? '280px' : '0px';
        el.style.opacity = isExpanded ? '1' : '0';
        return;
      }

      if (!drawerSpringRef.current) {
        drawerSpringRef.current = new Sp(isExpanded ? 1 : 0, TUNES.rowExpand);
      }
      const sp = drawerSpringRef.current;
      const unsub = subscribeFrame(() => {
        if (!drawerRef.current) return;
        const p = Math.max(0, Math.min(1.04, sp.x));
        drawerRef.current.style.maxHeight = `${Math.round(p * 260)}px`;
        drawerRef.current.style.opacity = String(Math.max(0, Math.min(1, p)));
      });
      sp.setTarget(isExpanded ? 1 : 0);
      wake();

      return () => {
        unsub();
      };
    }, [isExpanded, detailMounted]);

    useEffect(() => {
      return () => {
        drawerSpringRef.current?.destroy();
        drawerSpringRef.current = null;
      };
    }, []);

    const handleNavigate = () => {
      if (event.onNavigate) {
        event.onNavigate();
        return;
      }
      if (event.targetScreen) {
        setScreenAction(event.targetScreen);
        if (event.targetPmSubScreen) {
          setActivePmSubScreenAction(event.targetPmSubScreen);
        }
      }
    };

    const initials = event.avatarText || extractInitials(event.title);
    const avatarBg = event.avatarColor || computeInitialsColor(event.title);
    const fanActions = (event.actions || []).slice(0, 3);
    const hasNavigation = Boolean(event.onNavigate || event.targetScreen);

    return (
      <div
        ref={rowRef}
        role="listitem"
        data-testid={`historique-row-${event.id}`}
        data-expanded={isExpanded ? 'true' : undefined}
        className="group/hrow relative bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] transition-colors duration-150 overflow-hidden"
        data-sq="row"
        data-sq-border="solid"
      >
        <div
          onClick={() => onToggleExpand(event.id)}
          className="px-[var(--s3,12px)] sm:px-[var(--s4,16px)] py-[var(--s2,10px)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] cursor-pointer select-none"
        >
          {/* Identity & Summary */}
          <div className="flex items-center gap-[var(--s3,12px)] min-w-0 flex-1">
            <span
              className="w-[var(--av-table,36px)] h-[var(--av-table,36px)] rounded-full grid place-items-center text-white t-small font-semibold shrink-0"
              style={{ backgroundColor: avatarBg }}
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1 flex flex-col gap-[2px]">
              <div className="flex items-center gap-[var(--s2,8px)] min-w-0 flex-wrap">
                <span className="t-label font-semibold text-[var(--text-1)] dark:text-white truncate">
                  {event.title}
                </span>
                <span className="inline-flex items-center h-[var(--pill-h,22px)] px-[var(--pill-px,8px)] rounded-full t-small bg-[var(--atr-hl,rgba(212,82,47,0.1))] dark:bg-[#2E1E19] text-[var(--atr-acc-text,#ab391a)] dark:text-[var(--brand-on-dark)] whitespace-nowrap shrink-0">
                  {event.categoryBadge}
                </span>
              </div>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate tabular-nums">
                {event.subtitle}
              </p>
            </div>
          </div>

          {/* Right Meta: Status + Metric + Time + Hover Fan + Expand */}
          <div className="flex items-center justify-between sm:justify-end gap-[var(--s3,12px)] shrink-0">
            <span
              className={`inline-flex items-center gap-[6px] h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small whitespace-nowrap ${STATUS_BADGE_CLASSES[event.statusTone]}`}
            >
              <i className="w-[6px] h-[6px] rounded-full bg-current shrink-0" />
              {event.statusLabel}
            </span>

            <div className="text-end min-w-[78px] hidden md:block">
              <div className="t-label font-semibold tabular-nums text-[var(--text-1)] dark:text-white whitespace-nowrap">
                {event.metricPrimary}
              </div>
              {event.metricSecondary && (
                <div className="t-cap tabular-nums text-[var(--text-2)] dark:text-[var(--text-dark-2)] whitespace-nowrap">
                  {event.metricSecondary}
                </div>
              )}
            </div>

            <div className="hidden lg:flex flex-col items-end min-w-[74px]">
              <span className="t-small font-medium tabular-nums text-[var(--text-1)] dark:text-white/90 whitespace-nowrap">
                {event.timeLabel}
              </span>
              <span className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate max-w-[110px]">
                {event.actorOrBranch}
              </span>
            </div>

            {/* Hover Action Fan (<= 200ms staggered right-to-left) */}
            {fanActions.length > 0 && (
              <div className="hidden sm:flex items-center gap-[4px]">
                {fanActions.map((act, idx) => {
                  const staggerIdx = fanActions.length - 1 - idx;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      data-no-liquid="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        act.onClick();
                      }}
                      aria-label={act.label}
                      title={act.label}
                      style={{
                        transitionDelay: `${staggerIdx * 28}ms`,
                      }}
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 opacity-0 translate-x-2 rtl:-translate-x-2 group-hover/hrow:opacity-100 group-hover/hrow:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 motion-reduce:opacity-100 motion-reduce:translate-x-0 ${
                        act.isDanger
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white'
                          : 'bg-[#F5EDE4] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white hover:bg-[#d4522f] hover:text-white dark:hover:bg-[#FB923C] dark:hover:text-[#151413]'
                      }`}
                    >
                      {act.icon}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              data-no-liquid="true"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(event.id);
              }}
              aria-expanded={isExpanded}
              aria-label={event.title}
              className="w-[32px] h-[32px] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] flex items-center justify-center text-[var(--text-1)] dark:text-white hover:bg-[#EADFD4] dark:hover:bg-white/[0.14] transition-colors cursor-pointer shrink-0"
            >
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 motion-reduce:transition-none ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Expandable Spring Detail Drawer */}
        {(isExpanded || detailMounted) && (
          <div
            ref={drawerRef}
            style={
              typeof window === 'undefined'
                ? { maxHeight: isExpanded ? '280px' : '0px', opacity: isExpanded ? 1 : 0 }
                : undefined
            }
            className="overflow-hidden border-t border-black/[0.04] dark:border-white/[0.055] bg-[#FBF8F5] dark:bg-[#191716]"
          >
            <div className="px-[var(--s4,16px)] py-[var(--s3,12px)] flex flex-col lg:flex-row lg:items-center justify-between gap-[var(--s3,12px)]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3,12px)] flex-1 min-w-0">
                {(event.detailCols || [
                  { label: event.categoryBadge, value: event.actorOrBranch },
                  { label: event.statusLabel, value: event.metricPrimary },
                  { label: event.timeLabel, value: event.metricSecondary || event.subtitle },
                ]).map((col, cIdx) => (
                  <div key={`${event.id}-det-${cIdx}`} className="min-w-0">
                    <div className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
                      {col.label}
                    </div>
                    <div className="t-label font-medium text-[var(--text-1)] dark:text-white truncate tabular-nums">
                      {col.value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-[var(--s3,12px)] shrink-0">
                {event.notes && (
                  <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] max-w-xs truncate">
                    {event.notes}
                  </p>
                )}
                {hasNavigation && (
                  <AtriumButton
                    variant="outline"
                    size="sm"
                    onClick={handleNavigate}
                    icon={<ArrowUpRight size={14} className="rtl:-scale-x-100" />}
                    iconPosition="right"
                    className="whitespace-nowrap shrink-0"
                  >
                    {event.ctaLabel || openLabel}
                  </AtriumButton>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

HomeKineticEventRow.displayName = 'HomeKineticEventRow';

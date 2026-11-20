import React, { useMemo, useState } from 'react';
import { History, RotateCcw, Search, ChevronDown } from 'lucide-react';
import { DashboardPod } from '../dashboard';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
import { HOME_POD_HISTORIQUE_CLASS } from './HomeShell';
import { HomeKineticEventRow } from './HomeKineticEventRow';
import { getHomeStrings } from './homeLocalization';
import type { HomeDailyEvent, HomeHistoriqueFilterOption } from './homeTypes';

export interface HomeLiveHistoryPodProps {
  title?: string;
  subtitle?: string;
  events: HomeDailyEvent[];
  filters?: HomeHistoriqueFilterOption[];
  initialLimit?: number;
  className?: string;
}

export const HomeLiveHistoryPod: React.FC<HomeLiveHistoryPodProps> = ({
  title,
  subtitle,
  events,
  filters = [],
  initialLimit = 8,
  className = '',
}) => {
  const { language } = useTranslation();
  const strings = getHomeStrings(language);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);

  const filterChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of events) {
      counts.set(ev.categoryKey, (counts.get(ev.categoryKey) || 0) + 1);
    }
    const base: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: strings.historiqueAllFilter, count: events.length },
    ];
    for (const f of filters) {
      const c = counts.get(f.id) || 0;
      if (c > 0 || f.id === activeFilter) {
        base.push({ id: f.id, label: f.label, count: c });
      }
    }
    return base;
  }, [events, filters, strings.historiqueAllFilter, activeFilter]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (activeFilter !== 'all' && ev.categoryKey !== activeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.subtitle.toLowerCase().includes(q) ||
        ev.statusLabel.toLowerCase().includes(q) ||
        ev.categoryBadge.toLowerCase().includes(q) ||
        ev.actorOrBranch.toLowerCase().includes(q)
      );
    });
  }, [events, activeFilter, searchQuery]);

  const visibleEvents = useMemo(() => {
    if (showAll) return filteredEvents;
    return filteredEvents.slice(0, initialLimit);
  }, [filteredEvents, showAll, initialLimit]);

  const hasFilters = activeFilter !== 'all' || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
  };

  return (
    <DashboardPod
      title={title || strings.historiqueTitle}
      subtitle={subtitle || strings.historiqueSubtitle}
      icon={<History size={17} />}
      badge={
        <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold tabular-nums bg-[#EFE7DF] dark:bg-[#262320] text-[#5B41A1] dark:text-[#C4B5FD] border border-black/[0.06] dark:border-white/[0.09]">
          {filteredEvents.length} {strings.historiqueEventsCount}
        </span>
      }
      rightControls={
        <div className="flex items-center gap-[var(--s2,8px)] flex-wrap">
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search
              size={14}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-2)] pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={strings.historiqueSearchPlaceholder}
              aria-label={strings.historiqueSearchPlaceholder}
              data-testid="home-historique-search"
              className="w-full h-[36px] ps-8 pe-3 rounded-[var(--r-ctl,10px)] bg-white dark:bg-[#1E1C1A] border border-black/[0.08] dark:border-white/[0.1] t-small text-[var(--text-1)] dark:text-white placeholder:text-[var(--text-2)] focus:outline-none focus:border-[#d4522f] dark:focus:border-[#FB923C] focus:ring-2 focus:ring-[#d4522f]/15 dark:focus:ring-[#FB923C]/20"
            />
          </div>

          {hasFilters && (
            <AtriumButton
              variant="outline"
              size="sm"
              onClick={resetFilters}
              icon={<RotateCcw size={13} />}
              className="whitespace-nowrap shrink-0"
            >
              {strings.historiqueReset}
            </AtriumButton>
          )}
        </div>
      }
      className={`${HOME_POD_HISTORIQUE_CLASS} ${className}`}
    >
      <div data-testid="home-row-historique" className="flex flex-col gap-[var(--s3,12px)] min-w-0">
        {/* Context/Role-Derived Filter Strip */}
        {filterChips.length > 1 && (
          <div className="flex items-center gap-[var(--s2,8px)] flex-wrap" role="tablist">
            {filterChips.map((chip) => {
              const isSelected = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-no-liquid="true"
                  onClick={() => setActiveFilter(chip.id)}
                  className={`inline-flex items-center gap-[6px] h-[30px] px-3 rounded-full t-small font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#2B1F19] dark:bg-[#FB923C] text-white dark:text-[#151413] border border-transparent'
                      : 'bg-white dark:bg-[#1E1C1A] text-[var(--text-2)] dark:text-[var(--text-dark-2)] border border-black/[0.07] dark:border-white/[0.09] hover:bg-[#FAF6F1] dark:hover:bg-white/[0.07] hover:text-[var(--text-1)] dark:hover:text-white'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`tabular-nums text-[11px] ${
                      isSelected ? 'opacity-85' : 'opacity-65'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Live Kinetic Activity Rows */}
        {visibleEvents.length > 0 ? (
          <div role="list" className="flex flex-col gap-[var(--s2,8px)] min-w-0">
            {visibleEvents.map((event, idx) => (
              <HomeKineticEventRow
                key={event.id}
                event={event}
                index={idx}
                isExpanded={expandedId === event.id}
                onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                openLabel={strings.openModule}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            variant="compact"
            tone="neutral"
            icon={<History size={20} />}
            title={strings.historiqueEmptyTitle}
            secondaryAction={
              hasFilters
                ? {
                    label: strings.historiqueEmptyCta,
                    onClick: resetFilters,
                  }
                : undefined
            }
          />
        )}

        {filteredEvents.length > initialLimit && (
          <div className="flex justify-center pt-[var(--s1,4px)]">
            <AtriumButton
              variant="outline"
              size="sm"
              onClick={() => setShowAll((prev) => !prev)}
              icon={
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-150 ${showAll ? 'rotate-180' : ''}`}
                />
              }
              iconPosition="right"
              className="whitespace-nowrap"
            >
              {showAll
                ? strings.historiqueShowLess
                : `${strings.historiqueShowAll} (${filteredEvents.length})`}
            </AtriumButton>
          </div>
        )}
      </div>
    </DashboardPod>
  );
};

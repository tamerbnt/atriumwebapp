import React from 'react';
import { MemberStatus, SupportedLanguage } from '../../types/index';
import { getStatusConfig } from '../../utils/rules';
import { useAtriumStore } from '../../services/store';

interface StatusBadgeProps {
  status: MemberStatus;
  size?: 'sm' | 'md';
  lang?: SupportedLanguage;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', lang }) => {
  const { language } = useAtriumStore();
  const config = getStatusConfig(status, lang || language);

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.color}25`,
      }}
      className={`inline-flex items-center rounded-full whitespace-nowrap transition-colors shadow-2xs t-small ${
        size === 'sm'
          ? 'h-[var(--badge-h,22px)] px-[var(--badge-px,6px)] gap-[var(--s1,4px)]'
          : 'h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] gap-[var(--pill-gap,6px)]'
      }`}
    >
      <span
        style={{ backgroundColor: config.color }}
        className="w-[var(--pill-dot,6px)] h-[var(--pill-dot,6px)] rounded-full shrink-0"
      />
      {config.label}
    </span>
  );
};

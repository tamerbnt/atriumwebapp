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
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap transition-colors shadow-2xs text-xs ${
        size === 'sm' ? 'h-[var(--badge-h,22px)] px-2 gap-1' : 'h-7 px-3 gap-2'
      }`}
    >
      <span
        style={{ backgroundColor: config.color }}
        className="w-1.5 h-1.5 rounded-full shrink-0"
      />
      {config.label}
    </span>
  );
};

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
      className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap transition-colors shadow-2xs ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
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

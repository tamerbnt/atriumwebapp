import React from 'react';
import { MemberStatus } from '../../types/index';
import { getStatusConfig } from '../../utils/rules';

interface StatusBadgeProps {
  status: MemberStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = getStatusConfig(status);

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
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

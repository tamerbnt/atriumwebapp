import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { clamp } from './kineticMath';

export interface InspectorSectionProps {
  index?: number;
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const InspectorSection: React.FC<InspectorSectionProps> = ({
  index = 0,
  title,
  action,
  children,
  className = '',
}) => (
  <section style={{ '--k': index } as React.CSSProperties} className={className}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-2.5 gap-2">
        {title ? <h3 className="!m-0">{title}</h3> : <span />}
        {action}
      </div>
    )}
    {children}
  </section>
);

export interface InspectorQuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  primary?: boolean;
  disabled?: boolean;
}

export const InspectorQuickActions: React.FC<{
  actions: InspectorQuickActionItem[];
  className?: string;
}> = ({ actions, className = '' }) => {
  if (!actions || actions.length === 0) return null;
  const colsClass =
    actions.length === 2
      ? 'grid-cols-2'
      : actions.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`qa grid ${colsClass} gap-2.5 ${className}`}>
      {actions.slice(0, 4).map((act) => (
        <button
          key={act.id}
          type="button"
          data-no-liquid="true"
          disabled={act.disabled}
          onClick={act.onClick}
          className={`flex flex-col items-center gap-2 pt-3.5 px-1.5 pb-3 rounded-[16px] border text-[12px] font-medium leading-tight text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            act.primary
              ? 'border-[#d4522f]/25 dark:border-[#52291F] bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A]'
              : 'border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-[var(--atr-ink,#000000)] dark:text-white'
          }`}
        >
          <span
            className={`ic w-[38px] h-[38px] rounded-[12px] grid place-items-center shrink-0 ${
              act.primary
                ? 'bg-white dark:bg-[#1C1B1A]'
                : 'bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1C1B1A]'
            }`}
          >
            {act.icon}
          </span>
          <span className="line-clamp-2">{act.label}</span>
        </button>
      ))}
    </div>
  );
};

export const InspectorCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-1.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] ${className}`}
  >
    {children}
  </div>
);

export type InspectorValueTone = 'default' | 'accent' | 'ok' | 'danger' | 'warn';

const TONE_COLOR_CLASS: Record<InspectorValueTone, string> = {
  default: 'text-[var(--atr-ink,#000000)] dark:text-white',
  accent: 'text-[var(--atr-acc,#d4522f)] dark:text-[#FF8D7A]',
  ok: 'text-[var(--atr-ok,#096b40)] dark:text-[#5BE3A3]',
  danger: 'text-[var(--atr-danger,#c0283d)] dark:text-[#FF8D7A]',
  warn: 'text-[#8A5A06] dark:text-[#FFD166]',
};

export interface InspectorKeyValueProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  mono?: boolean;
  tone?: InspectorValueTone;
  copyText?: string;
  onCopied?: (text: string) => void;
  isLast?: boolean;
}

export const InspectorKeyValue: React.FC<InspectorKeyValueProps> = ({
  label,
  value,
  icon,
  mono = true,
  tone = 'default',
  copyText,
  onCopied,
  isLast = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyText) return;
    try {
      navigator.clipboard?.writeText(copyText);
    } catch {
      // ignore clipboard errors
    }
    setCopied(true);
    onCopied?.(copyText);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className={`kv flex justify-between items-center gap-3 py-[11px] text-[13px] ${
        isLast ? '' : 'border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]'
      }`}
    >
      <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75 flex items-center gap-2 shrink-0">
        {icon}
        <span>{label}</span>
      </span>
      <span className="flex items-center gap-1.5 min-w-0 justify-end">
        <b
          className={`${mono ? 'font-mono tabular-nums' : 'font-sans'} text-[13px] text-right truncate ${
            TONE_COLOR_CLASS[tone]
          }`}
        >
          {value}
        </b>
        {copyText && (
          <button
            type="button"
            data-no-liquid="true"
            onClick={handleCopy}
            className="w-7 h-7 rounded-[8px] border-0 bg-transparent hover:bg-[var(--atr-hl,rgba(212,82,47,0.12))] grid place-items-center text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68 hover:text-[var(--atr-acc,#d4522f)] cursor-pointer shrink-0"
            aria-label={typeof label === 'string' ? `Copy ${label}` : 'Copy'}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[var(--atr-ok,#096b40)] dark:text-[#5BE3A3]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </span>
    </div>
  );
};

export const InspectorProgressBar: React.FC<{
  percent: number;
  tone?: 'ok' | 'accent' | 'danger' | 'warn';
  animateKey?: string | number;
}> = ({ percent, tone = 'ok', animateKey }) => {
  const fillRef = useRef<HTMLElement | null>(null);
  const clamped = clamp(percent, 0, 100);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.transform = 'scaleX(0)';
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (fillRef.current) {
          fillRef.current.style.transform = `scaleX(${clamped / 100})`;
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [clamped, animateKey]);

  const barTone =
    tone === 'danger'
      ? 'bg-[var(--atr-danger,#c0283d)] dark:bg-[#FF8D7A]'
      : tone === 'warn'
      ? 'bg-[#D97706] dark:bg-[#FFD166]'
      : tone === 'accent'
      ? 'bg-[var(--atr-acc,#d4522f)] dark:bg-[#FF8D7A]'
      : 'bg-[var(--atr-ok,#096b40)] dark:bg-[#5BE3A3]';

  return (
    <div className="bar2 h-[8px] rounded-[4px] bg-[var(--atr-line,#E6DED6)] dark:bg-[#3A3734] overflow-hidden mt-0.5 mb-3">
      <i
        ref={fillRef}
        className={`block w-full h-full rounded-[4px] ${barTone} origin-left rtl:origin-right`}
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
};

export const InspectorBigStat: React.FC<{
  value: React.ReactNode;
  tone?: 'accent' | 'ok' | 'danger' | 'default';
  caption?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    tone?: 'accent' | 'dark';
  };
}> = ({ value, tone = 'accent', caption, action }) => {
  const colorClass =
    tone === 'ok'
      ? 'text-[var(--atr-ok,#096b40)] dark:text-[#5BE3A3]'
      : tone === 'danger'
      ? 'text-[var(--atr-danger,#c0283d)] dark:text-[#FF8D7A]'
      : tone === 'default'
      ? 'text-[var(--atr-ink,#000000)] dark:text-white'
      : 'text-[var(--atr-acc,#d4522f)] dark:text-[#FF8D7A]';

  return (
    <div className="card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-3.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
      <div className={`big font-mono font-bold text-[32px] tabular-nums my-0.5 ${colorClass}`}>
        {value}
      </div>
      {caption && (
        <p className="text-[12px] text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/70 m-0 mt-0.5">
          {caption}
        </p>
      )}
      {action && (
        <button
          type="button"
          data-no-liquid="true"
          onClick={action.onClick}
          className={`wide mt-3 w-full h-[42px] border-0 rounded-[12px] font-semibold text-[13.5px] cursor-pointer transition-opacity hover:opacity-92 ${
            action.tone === 'dark'
              ? 'bg-[#1F1D1B] dark:bg-white text-white dark:text-black'
              : 'bg-[var(--atr-acc,#d4522f)] text-white'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export interface InspectorListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metaRight?: React.ReactNode;
  badge?: {
    label: string;
    tone?: 'ok' | 'danger' | 'warn' | 'accent' | 'neutral';
  };
  onClick?: () => void;
  isLast?: boolean;
}

const BADGE_CLASSES: Record<'ok' | 'danger' | 'warn' | 'accent' | 'neutral', string> = {
  ok: 'bg-[#DDF5E8] dark:bg-[#143324] text-[#096b40] dark:text-[#5BE3A3]',
  danger: 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#c0283d] dark:text-[#FF8D7A]',
  warn: 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]',
  accent: 'bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A]',
  neutral: 'bg-white dark:bg-[#1C1B1A] text-black/75 dark:text-white/80 border border-[#E6DED6] dark:border-[#3A3734]',
};

export const InspectorListItem: React.FC<InspectorListItemProps> = ({
  title,
  subtitle,
  metaRight,
  badge,
  onClick,
  isLast = false,
}) => (
  <div
    onClick={onClick}
    className={`li flex justify-between items-center py-[11px] text-[13px] gap-2 ${
      isLast ? '' : 'border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]'
    } ${onClick ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
  >
    <span className="min-w-0">
      <span className="font-medium block truncate text-[var(--atr-ink,#000000)] dark:text-white">
        {title}
      </span>
      {subtitle && (
        <small className="font-mono text-[11px] tabular-nums text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68 block truncate">
          {subtitle}
        </small>
      )}
    </span>
    <span className="flex items-center gap-2 shrink-0">
      {metaRight && (
        <b className="font-mono text-[12px] tabular-nums text-[var(--atr-ink,#000000)] dark:text-white">
          {metaRight}
        </b>
      )}
      {badge && (
        <span
          className={`pill px-2.5 py-[3px] rounded-md text-[11.5px] font-medium whitespace-nowrap ${
            BADGE_CLASSES[badge.tone || 'neutral']
          }`}
        >
          {badge.label}
        </span>
      )}
    </span>
  </div>
);

export const InspectorNotesField: React.FC<{
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}> = ({ value, onSave, placeholder = 'Ajouter une note…', ariaLabel = 'Notes' }) => {
  const [draft, setDraft] = useState(value);
  const lastSavedRef = useRef(value);

  useEffect(() => {
    setDraft(value);
    lastSavedRef.current = value;
  }, [value]);

  return (
    <textarea
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim();
        if (trimmed !== (lastSavedRef.current || '').trim()) {
          lastSavedRef.current = trimmed;
          onSave(trimmed);
        }
      }}
      placeholder={placeholder}
      className="w-full box-border min-h-[84px] rounded-[16px] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-3.5 py-3 text-[13px] text-[var(--atr-ink,#000000)] dark:text-white placeholder:text-black/48 dark:placeholder:text-white/50 resize-y focus:outline-none focus:border-[#d4522f]"
    />
  );
};

export const InspectorWideButton: React.FC<{
  label: string;
  icon?: React.ReactNode;
  tone?: 'accent' | 'dark' | 'neutral';
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, icon, tone = 'accent', disabled = false, onClick }) => (
  <button
    type="button"
    data-no-liquid="true"
    disabled={disabled}
    onClick={onClick}
    className={`wide w-full h-[42px] rounded-[12px] font-semibold text-[13.5px] flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-92 disabled:opacity-40 disabled:cursor-not-allowed ${
      tone === 'dark'
        ? 'border-0 bg-[#1F1D1B] dark:bg-white text-white dark:text-black'
        : tone === 'neutral'
        ? 'border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-[var(--atr-ink,#000000)] dark:text-white hover:bg-[#F3EDE7]'
        : 'border-0 bg-[var(--atr-acc,#d4522f)] text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

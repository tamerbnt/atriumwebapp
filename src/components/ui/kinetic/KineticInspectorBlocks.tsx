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
  <section style={{ '--k': index } as React.CSSProperties} className={`flex flex-col gap-[var(--s3,12px)] ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center gap-[var(--s2,8px)]">
        {title ? (
          <h3 className="!m-0 t-pod text-[var(--text-1)]">
            {title}
          </h3>
        ) : (
          <span />
        )}
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
    <div className={`qa grid ${colsClass} gap-[var(--s3,12px)] ${className}`}>
      {actions.slice(0, 4).map((act) => (
        <button
          key={act.id}
          type="button"
          data-no-liquid="true"
          data-sq="card"
          data-sq-border="solid"
          disabled={act.disabled}
          onClick={act.onClick}
          className={`flex flex-col items-center gap-[var(--s2,8px)] p-[var(--s3,12px)] rounded-[var(--r-card,16px)] t-small text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            act.primary
              ? '[--sq-stroke:rgba(212,82,47,0.25)] dark:[--sq-stroke:#52291F] bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[var(--brand-on-dark)]'
              : '[--sq-stroke:var(--atr-line,#E6DED6)] dark:[--sq-stroke:#3A3734] bg-white dark:bg-[#262422] text-[var(--text-1)]'
          }`}
        >
          <span
            data-sq="tile"
            data-sq-border="none"
            className={`ic w-[var(--tile,40px)] h-[var(--tile,40px)] rounded-[var(--r-tile,12px)] grid place-items-center shrink-0 ${
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
    data-sq="card"
    data-sq-border="solid"
    className={`card rounded-[var(--r-card,16px)] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[var(--s4,16px)] py-[var(--s2,8px)] [--sq-stroke:var(--atr-line,#E6DED6)] dark:[--sq-stroke:#3A3734] ${className}`}
  >
    {children}
  </div>
);

export type InspectorValueTone = 'default' | 'accent' | 'ok' | 'danger' | 'warn';

const TONE_COLOR_CLASS: Record<InspectorValueTone, string> = {
  default: 'text-[var(--text-1)]',
  accent: 'text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]',
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
      className={`kv flex justify-between items-center gap-[var(--s3,12px)] py-[var(--s3,12px)] t-body ${
        isLast ? '' : 'border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]'
      }`}
    >
      <span className="text-[var(--text-2)] flex items-center gap-[var(--s2,8px)] shrink-0">
        {icon}
        <span>{label}</span>
      </span>
      <span className="flex items-center gap-[var(--s2,8px)] min-w-0 justify-end">
        <b
          className={`${mono ? 'tabular-nums' : ''} t-label text-right truncate ${
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
            className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full border-0 bg-transparent hover:bg-[var(--atr-hl,rgba(212,82,47,0.12))] grid place-items-center text-[var(--text-2)] hover:text-[var(--brand-text)] dark:hover:text-[var(--brand-on-dark)] cursor-pointer shrink-0"
            aria-label={typeof label === 'string' ? `Copy ${label}` : 'Copy'}
          >
            {copied ? (
              <Check className="w-4 h-4 text-[var(--atr-ok,#096b40)] dark:text-[#5BE3A3]" strokeWidth={1.5} />
            ) : (
              <Copy className="w-4 h-4" strokeWidth={1.5} />
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
      ? 'bg-[var(--brand-fill,#C9461F)] dark:bg-[#FF8D7A]'
      : 'bg-[var(--atr-ok,#096b40)] dark:bg-[#5BE3A3]';

  return (
    <div className="bar2 h-2 rounded-full bg-[var(--atr-line,#E6DED6)] dark:bg-[#3A3734] overflow-hidden">
      <i
        ref={fillRef}
        className={`block w-full h-full rounded-full ${barTone} origin-left rtl:origin-right`}
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
      ? 'text-[var(--text-1)]'
      : 'text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]';

  return (
    <div
      data-sq="card"
      data-sq-border="solid"
      className="card rounded-[var(--r-card,16px)] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] p-[var(--card-pad,20px)] card-opt [--sq-stroke:var(--atr-line,#E6DED6)] dark:[--sq-stroke:#3A3734] flex flex-col gap-[var(--s3,12px)]"
    >
      <div className={`big t-kpi-m rtl:font-sans rtl:text-2xl ${colorClass}`}>
        {value}
      </div>
      {caption && (
        <p className="t-cap text-[var(--text-2)] m-0">
          {caption}
        </p>
      )}
      {action && (
        <button
          type="button"
          data-no-liquid="true"
          data-sq="ctl"
          data-sq-border="none"
          onClick={action.onClick}
          className={`wide w-full h-[var(--btn-h,40px)] border-0 rounded-[var(--r-ctl,12px)] t-btn font-semibold cursor-pointer transition-opacity hover:opacity-92 ${
            action.tone === 'dark'
              ? 'bg-[#1F1D1B] dark:bg-white text-white dark:text-black'
              : 'bg-[var(--brand-fill)] text-white'
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
  neutral: 'bg-white dark:bg-[#1C1B1A] text-[var(--text-1)] border border-[#E6DED6] dark:border-[#3A3734]',
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
    className={`li flex justify-between items-center py-[var(--s3,12px)] t-body gap-[var(--s3,12px)] ${
      isLast ? '' : 'border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]'
    } ${onClick ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
  >
    <span className="min-w-0 flex flex-col gap-[var(--name-sub-gap,2px)]">
      <span className="t-label block truncate text-[var(--text-1)]">
        {title}
      </span>
      {subtitle && (
        <small className="t-cap tabular-nums text-[var(--text-2)] block truncate">
          {subtitle}
        </small>
      )}
    </span>
    <span className="flex items-center gap-[var(--s2,8px)] shrink-0">
      {metaRight && (
        <b className="t-small tabular-nums text-[var(--text-1)]">
          {metaRight}
        </b>
      )}
      {badge && (
        <span
          className={`pill px-[var(--badge-px,6px)] h-[var(--badge-h,22px)] inline-flex items-center rounded-full t-small whitespace-nowrap ${
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
    <div
      data-sq="card"
      data-sq-border="solid"
      className="relative rounded-[var(--r-card,16px)] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] [--sq-stroke:var(--atr-line,#E6DED6)] dark:[--sq-stroke:#3A3734] focus-within:[--sq-stroke:#d4522f]"
    >
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
        className="w-full box-border min-h-[84px] rounded-[var(--r-card,16px)] border-0 bg-transparent px-[var(--s4,16px)] py-[var(--s3,12px)] t-body text-[var(--text-1)] placeholder:text-[var(--text-3)] resize-y focus:outline-none"
      />
    </div>
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
    data-sq="ctl"
    data-sq-border={tone === 'neutral' ? 'solid' : 'none'}
    disabled={disabled}
    onClick={onClick}
    className={`wide w-full h-[var(--btn-h,40px)] rounded-[var(--r-ctl,12px)] t-btn font-semibold flex items-center justify-center gap-[var(--btn-icon-gap,8px)] cursor-pointer transition-opacity hover:opacity-92 disabled:opacity-40 disabled:cursor-not-allowed ${
      tone === 'dark'
        ? 'border-0 bg-[#1F1D1B] dark:bg-white text-white dark:text-black'
        : tone === 'neutral'
        ? 'bg-white dark:bg-[#262422] [--sq-stroke:var(--atr-line,#E6DED6)] dark:[--sq-stroke:#3A3734] text-[var(--text-1)] hover:bg-[#F3EDE7]'
        : 'border-0 bg-[var(--brand-fill)] text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

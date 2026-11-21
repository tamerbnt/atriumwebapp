import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Trash2, X } from 'lucide-react';
import { Sp, TUNES, subscribeFrame, wake } from './kineticMotion';
import { computeBulkBarMetrics } from './kineticMath';

export interface KineticBulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'accent';
}

export interface KineticFloatingBulkBarProps {
  selectedCount: number;
  language?: string;
  actions?: KineticBulkAction[];
  onExport?: () => void;
  onDelete?: () => void;
  onClear: () => void;
  className?: string;
}

export const KineticFloatingBulkBar: React.FC<KineticFloatingBulkBarProps> = ({
  selectedCount,
  language = 'fr',
  actions = [],
  onExport,
  onDelete,
  onClear,
  className = '',
}) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const springRef = useRef<Sp | null>(null);
  const lastDrawKeyRef = useRef<string>('');
  const willChangeActiveRef = useRef<boolean>(false);

  if (!springRef.current) {
    springRef.current = new Sp(selectedCount > 0 ? 100 : 0, TUNES.bulkBar);
  }

  const drawBar = () => {
    const el = barRef.current;
    const sp = springRef.current;
    if (!el || !sp) return;
    const moving = !sp.rest();
    const xQ = Math.round(sp.x * 10) / 10;
    const key = `${xQ}|${sp.t}|${moving ? 1 : 0}`;
    if (key === lastDrawKeyRef.current) return;
    lastDrawKeyRef.current = key;

    if (willChangeActiveRef.current !== moving) {
      willChangeActiveRef.current = moving;
      el.style.willChange = moving ? 'transform, opacity' : '';
    }

    const m = computeBulkBarMetrics(sp.x, sp.t);
    el.style.visibility = m.visible ? 'visible' : 'hidden';
    el.style.pointerEvents = m.visible && sp.t > 0 ? 'auto' : 'none';
    el.style.opacity = String(Math.round(m.opacity * 100) / 100);
    el.style.transform = `translate3d(-50%, ${Math.round(m.translateY * 2) / 2}px, 0) scale(${
      Math.round(m.scale * 1000) / 1000
    })`;
  };

  useLayoutEffect(() => {
    const unsub = subscribeFrame(drawBar);
    drawBar();
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const sp = springRef.current;
    if (!sp) return;
    sp.setTarget(selectedCount > 0 ? 100 : 0);
    drawBar();
    wake();
  }, [selectedCount]);

  useEffect(() => {
    return () => {
      springRef.current?.destroy();
      springRef.current = null;
    };
  }, []);

  const selectedLabel =
    language === 'ar'
      ? `${selectedCount} محدد`
      : language === 'fr'
      ? `${selectedCount} ${selectedCount > 1 ? 'sélectionnés' : 'sélectionné'}`
      : `${selectedCount} selected`;

  const barNode = (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={language === 'ar' ? 'إجراءات جماعية' : language === 'fr' ? 'Actions groupées' : 'Bulk actions'}
      aria-hidden={selectedCount === 0}
      className={`bar fixed left-1/2 top-[var(--inset,12px)] flex items-center gap-[var(--s2,8px)] h-14 max-w-[calc(100vw-24px)] overflow-x-auto pl-[var(--s5,20px)] pr-[var(--s2,8px)] rounded-full bg-[#262422] text-[#F4EDE6] z-[45] shadow-[0_12px_32px_rgba(27,25,23,0.3)] select-none ${className}`}
      style={{
        visibility: selectedCount > 0 ? 'visible' : 'hidden',
        pointerEvents: selectedCount > 0 ? 'auto' : 'none',
        opacity: selectedCount > 0 ? 1 : 0,
      }}
    >
      <b className="t-label font-semibold tabular-nums pr-[var(--s2,8px)] whitespace-nowrap text-white">
        {selectedLabel}
      </b>

      {actions.map((act) => (
        <button
          key={act.id}
          type="button"
          data-no-liquid="true"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={act.onClick}
          className={`h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] border-0 rounded-full text-[#F4EDE6] flex items-center gap-[var(--btn-icon-gap,8px)] t-btn transition-colors cursor-pointer whitespace-nowrap ${
            act.tone === 'danger'
              ? 'bg-[#F4EDE6]/12 hover:bg-[var(--brand-fill)] hover:text-white'
              : act.tone === 'accent'
              ? 'bg-[var(--brand-fill)] hover:bg-[var(--brand-accent)] text-white'
              : 'bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25'
          }`}
        >
          {act.icon}
          <span>{act.label}</span>
        </button>
      ))}

      {onExport && (
        <button
          type="button"
          data-no-liquid="true"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={onExport}
          className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] border-0 rounded-full bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] flex items-center gap-[var(--btn-icon-gap,8px)] t-btn transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="w-4 h-4" strokeWidth={1.5} />
          <span>{language === 'ar' ? 'تصدير' : language === 'fr' ? 'Exporter' : 'Export'}</span>
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          data-no-liquid="true"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={onDelete}
          className="h-[var(--btn-h,40px)] px-[var(--btn-px,16px)] border-0 rounded-full bg-[#F4EDE6]/12 hover:bg-[var(--brand-fill)] text-[#F4EDE6] hover:text-white flex items-center gap-[var(--btn-icon-gap,8px)] t-btn transition-colors cursor-pointer whitespace-nowrap"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          <span>{language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete'}</span>
        </button>
      )}

      <button
        type="button"
        data-no-liquid="true"
        tabIndex={selectedCount > 0 ? 0 : -1}
        onClick={onClear}
        aria-label={language === 'ar' ? 'مسح التحديد' : language === 'fr' ? 'Effacer la sélection' : 'Clear selection'}
        className="w-[var(--btn-h,40px)] h-[var(--btn-h,40px)] p-0 border-0 rounded-full bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] grid place-items-center transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(barNode, document.body) : barNode;
};

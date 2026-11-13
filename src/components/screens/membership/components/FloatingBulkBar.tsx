import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Mail, RotateCcw, Download, Archive, Trash2, X } from 'lucide-react';
import { Sp, TUNES, subscribeFrame, wake } from '../motion/adherentsMotion';
import { computeBulkBarMetrics } from '../motion/adherentsMath';

export interface FloatingBulkBarProps {
  selectedCount: number;
  onMail?: () => void;
  onRenew?: () => void;
  onExport?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onClear: () => void;
  className?: string;
}

export const FloatingBulkBar: React.FC<FloatingBulkBarProps> = ({
  selectedCount,
  onMail,
  onRenew,
  onExport,
  onArchive,
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

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Actions groupées"
      aria-hidden={selectedCount === 0}
      className={`bar fixed left-1/2 bottom-[26px] flex items-center gap-1.5 h-[58px] pl-[22px] pr-[10px] rounded-[29px] bg-[#1F1D1B] text-[#F4EDE6] z-[40] shadow-[0_12px_32px_rgba(27,25,23,0.3)] select-none border border-white/[0.1] ${className}`}
      style={{
        visibility: selectedCount > 0 ? 'visible' : 'hidden',
        opacity: selectedCount > 0 ? 1 : 0,
      }}
    >
      <b className="font-mono text-[13px] font-bold tracking-wider tabular-nums mr-3 whitespace-nowrap text-white">
        {selectedCount} {selectedCount > 1 ? 'SÉLECTIONNÉS' : 'SÉLECTIONNÉ'}
      </b>

      {onMail && (
        <button
          type="button"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={onMail}
          className="h-[38px] px-3.5 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] flex items-center gap-2 font-medium text-[13px] transition-colors cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          <span>E-mail</span>
        </button>
      )}

      {onRenew && (
        <button
          type="button"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={onRenew}
          className="h-[38px] px-3.5 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] flex items-center gap-2 font-medium text-[13px] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Renouveler</span>
        </button>
      )}

      {onExport && (
        <button
          type="button"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={onExport}
          className="h-[38px] px-3.5 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] flex items-center gap-2 font-medium text-[13px] transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exporter</span>
        </button>
      )}

      {onArchive && (
        <button
          type="button"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={onArchive}
          className="h-[38px] px-3.5 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] flex items-center gap-2 font-medium text-[13px] transition-colors cursor-pointer"
        >
          <Archive className="w-4 h-4" />
          <span>Archiver</span>
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          tabIndex={selectedCount > 0 ? 0 : -1}
          onClick={onDelete}
          className="h-[38px] px-3.5 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#d4522f] text-[#F4EDE6] flex items-center gap-2 font-medium text-[13px] transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Supprimer</span>
        </button>
      )}

      <button
        type="button"
        tabIndex={selectedCount > 0 ? 0 : -1}
        onClick={onClear}
        aria-label="Effacer la sélection"
        className="w-[38px] h-[38px] p-0 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] grid place-items-center ml-1 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

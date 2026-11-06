import React, { useEffect, useRef, useState } from 'react';
import { Mail, RotateCcw, Download, Archive, Trash2, X } from 'lucide-react';
import { Sp, clamp } from '../motion/adherentsMotion';

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
  const springRef = useRef<Sp | null>(null);
  const [val, setVal] = useState(0);

  if (!springRef.current) {
    springRef.current = new Sp(0, 26);
  }

  useEffect(() => {
    const s = springRef.current!;
    const unsub = s.subscribe((v) => setVal(v));
    return () => unsub();
  }, []);

  useEffect(() => {
    const s = springRef.current!;
    s.setTarget(selectedCount > 0 ? 100 : 0);
  }, [selectedCount]);

  useEffect(() => {
    return () => {
      springRef.current?.destroy();
      springRef.current = null;
    };
  }, []);

  const bp = clamp(val / 100, 0, 1.15);
  const isVisible = val >= 1 || selectedCount > 0;
  const opacity = clamp(bp * 1.6, 0, 1);
  const transform = `translate(-50%, ${(1 - bp) * 46}px) scale(${0.9 + 0.1 * bp})`;

  if (!isVisible) return null;

  return (
    <div
      role="toolbar"
      aria-label="Actions groupées"
      className={`bar fixed left-1/2 bottom-[26px] flex items-center gap-1.5 h-[58px] pl-[22px] pr-[10px] rounded-[29px] bg-[#1B1917] text-[#F4EDE6] z-[50] shadow-[0_12px_32px_rgba(27,25,23,0.3)] select-none border border-[#3E3A36] ${className}`}
      style={{
        opacity,
        transform,
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      <b className="font-mono text-[13px] font-bold tracking-wider mr-3 whitespace-nowrap text-white">
        {selectedCount} {selectedCount > 1 ? 'SÉLECTIONNÉS' : 'SÉLECTIONNÉ'}
      </b>

      {onMail && (
        <button
          type="button"
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
          onClick={onDelete}
          className="h-[38px] px-3.5 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#C9441F] text-[#F4EDE6] flex items-center gap-2 font-medium text-[13px] transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Supprimer</span>
        </button>
      )}

      <button
        type="button"
        onClick={onClear}
        aria-label="Effacer la sélection"
        className="w-[38px] h-[38px] p-0 border-0 rounded-[19px] bg-[#F4EDE6]/12 hover:bg-[#F4EDE6]/25 text-[#F4EDE6] grid place-items-center ml-1 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

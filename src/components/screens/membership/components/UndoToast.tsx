import React, { useEffect, useRef, useState } from 'react';
import { Sp, clamp } from '../motion/adherentsMotion';

export interface UndoToastProps {
  message: string;
  visible: boolean;
  onUndo?: (() => void) | null;
  className?: string;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  visible,
  onUndo,
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
    s.setTarget(visible ? 100 : 0);
  }, [visible]);

  useEffect(() => {
    return () => {
      springRef.current?.destroy();
      springRef.current = null;
    };
  }, []);

  const tq = clamp(val / 100, 0, 1.15);
  const isVisible = val >= 1 || visible;
  const opacity = clamp(tq * 1.6, 0, 1);
  const transform = `translateY(${(1 - tq) * 40}px) scale(${0.92 + 0.08 * tq})`;

  if (!isVisible && !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast fixed left-[116px] bottom-[26px] flex items-center gap-3.5 h-[50px] pl-5 pr-2.5 rounded-[25px] bg-[#1B1917] text-[#F4EDE6] z-[65] font-medium text-[13px] shadow-[0_12px_32px_rgba(27,25,23,0.3)] select-none border border-[#3E3A36] ${className}`}
      style={{
        opacity,
        transform,
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      <span className="truncate max-w-[320px]">{message}</span>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="h-8 px-3.5 border-0 rounded-[16px] bg-[#C9441F] hover:bg-[#B03B1B] text-white font-semibold text-[12px] transition-colors cursor-pointer shrink-0"
        >
          Annuler
        </button>
      )}
    </div>
  );
};

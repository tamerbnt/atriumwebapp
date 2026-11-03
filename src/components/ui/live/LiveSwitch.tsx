import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle } from 'react';
import { LiquidSwitchController } from '../../../utils/atriumSprings';
import { LiveButtonSize } from './LiveButton';

export interface LiveSwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: LiveButtonSize;
  name?: string;
}

const tu = {
  root: 'o',
  track: 'p',
  pool: 'c',
  knob: 'l',
};

function getSizeProps(size?: LiveButtonSize, style?: React.CSSProperties) {
  if (size === undefined) return { style };
  if (typeof size === 'number') {
    return {
      style: {
        ...style,
        '--atr-h': `${size}px`,
      } as React.CSSProperties,
    };
  }
  return {
    'data-atr-size': size,
    style,
  };
}

export const LiveSwitch = forwardRef<HTMLButtonElement, LiveSwitchProps>(function LiveSwitch(
  {
    checked: controlledChecked,
    defaultChecked = false,
    onCheckedChange,
    size,
    name,
    className = '',
    style,
    disabled,
    onClick,
    ...props
  },
  ref
) {
  const isControlled = controlledChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState<boolean>(defaultChecked);
  const currentChecked = isControlled ? controlledChecked : internalChecked;

  const rootRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const poolRef = useRef<HTMLSpanElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<LiquidSwitchController | null>(null);

  useImperativeHandle(ref, () => rootRef.current as HTMLButtonElement);

  const toggle = () => {
    if (disabled) return;
    const next = !currentChecked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
  };

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const pool = poolRef.current;
    const knob = knobRef.current;
    if (!root || !track || !pool || !knob) return;

    const ctrl = new LiquidSwitchController(root, track, pool, knob);
    controllerRef.current = ctrl;
    ctrl.setChecked(currentChecked, false);

    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setChecked(currentChecked, true);
  }, [currentChecked]);

  // Pointer drag support
  const dragRef = useRef<{ startX: number; moved: boolean; initialChecked: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    dragRef.current = {
      startX: e.clientX,
      moved: false,
      initialChecked: currentChecked,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || disabled) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 4) {
      drag.moved = true;
      const targetVal = dx > 0 ? 1 : 0;
      controllerRef.current?.dragTo(targetVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    if (drag.moved) {
      const dx = e.clientX - drag.startX;
      const nextChecked = dx > 8 ? true : dx < -8 ? false : drag.initialChecked;
      if (nextChecked !== currentChecked) {
        if (!isControlled) {
          setInternalChecked(nextChecked);
        }
        onCheckedChange?.(nextChecked);
      } else {
        controllerRef.current?.setChecked(currentChecked, true);
      }
    } else {
      toggle();
    }
  };

  const sizeProps = getSizeProps(size, style);
  const classes = [tu.root, className].filter(Boolean).join(' ');

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        role="switch"
        aria-checked={currentChecked}
        disabled={disabled}
        className={classes}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          controllerRef.current?.setChecked(currentChecked, true);
        }}
        onClick={(e) => {
          onClick?.(e);
        }}
        {...sizeProps}
        {...props}
      >
        <span ref={trackRef} className={tu.track}>
          <span ref={poolRef} className={tu.pool} />
          <span ref={knobRef} className={tu.knob} />
        </span>
      </button>
      {name && <input type="hidden" name={name} value={currentChecked ? 'true' : 'false'} />}
    </>
  );
});

LiveSwitch.displayName = 'LiveSwitch';

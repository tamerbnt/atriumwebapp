import React, { forwardRef } from 'react';
import { Toggle as AtriumToggle } from '@/atrium/core';
import type { ToggleProps, Size } from '@/atrium/core';

export interface LiveSwitchProps extends ToggleProps {
  size?: Size;
}

export const LiveSwitch = forwardRef<HTMLButtonElement, LiveSwitchProps>(
  function LiveSwitch(props, ref) {
    return <AtriumToggle ref={ref} {...props} />;
  }
);

LiveSwitch.displayName = 'LiveSwitch';

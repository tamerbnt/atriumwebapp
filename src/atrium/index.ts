/**
 * Atrium UI
 *
 *   import '@/atrium/styles/tokens.css';            // once, in app/layout.tsx
 *   import { Button, Segmented, Menu } from '@/atrium';
 *
 * Components are client components. Each one is tree-shakable.
 */
export { Button } from './components/Button/Button';
export type { ButtonProps, Tone } from './components/Button/Button';

export { IconButton, Badge, StatusDot } from './components/IconButton/IconButton';
export type { IconButtonProps, BadgeProps } from './components/IconButton/IconButton';

export { Segmented } from './components/Segmented/Segmented';
export type { SegmentedProps, SegmentedOption } from './components/Segmented/Segmented';

export { Menu } from './components/Menu/Menu';
export type { MenuProps, MenuEntry, MenuTriggerProps } from './components/Menu/Menu';

export { Select } from './components/Select/Select';
export type { SelectProps, SelectOption } from './components/Select/Select';

export { Toggle } from './components/Toggle/Toggle';
export type { ToggleProps } from './components/Toggle/Toggle';

export { LiquidButton } from './components/LiquidButton/LiquidButton';
export type { LiquidButtonProps, LiquidKind, LiquidStatus, LiquidLabels } from './components/LiquidButton/LiquidButton';

export { LiquidLoader } from './components/LiquidLoader/LiquidLoader';
export type { LiquidLoaderProps } from './components/LiquidLoader/LiquidLoader';

export { Sidebar } from './components/Shell/Sidebar';
export type { SidebarProps, SidebarItem } from './components/Shell/Sidebar';
export { AppShell, ShellContext } from './components/Shell/AppShell';
export type { AppShellProps, ShellContextValue } from './components/Shell/AppShell';

export { AtriumLogo } from './components/Logo/AtriumLogo';
export type { AtriumLogoProps } from './components/Logo/AtriumLogo';

export type { Size } from './hooks';
export type { Placement } from './components/Panel/position';

export { configureMotion, motion, PHI, ZETA } from './motion';
export type { MotionTier, MotionConfig } from './motion';

export * from './charts';


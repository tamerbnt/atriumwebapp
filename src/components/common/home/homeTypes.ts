import React from 'react';
import type { ActiveScreen } from '../../../services/store';

export type HomeColumnRatio =
  | '36_64'
  | '38_62'
  | '40_60'
  | '42_58'
  | '44_56'
  | '45_55'
  | '58_42';

export type HomeRowStatusTone = 'positive' | 'warning' | 'danger' | 'neutral';

export type HomeCardTone = 'terracotta' | 'brown' | 'lavender';

export interface HomePreviewRow {
  id: string;
  primary: string;
  secondary?: string;
  trailing?: string;
  statusTone?: HomeRowStatusTone;
  onClick?: () => void;
}

export interface HomePreviewCardConfig {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  count?: number | string;
  countLabel?: string;
  items: HomePreviewRow[];
  targetScreen: ActiveScreen;
  targetPmSubScreen?: string;
  viewAllLabel?: string;
  emptyTitle: string;
  emptyCtaLabel: string;
  onEmptyAction?: () => void;
  onNavigate?: () => void;
  accent?: 'default' | 'featured';
  tone?: HomeCardTone;
}

export interface HomeCompactStripConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  count: number | string;
  statusText?: string;
  targetScreen: ActiveScreen;
  targetPmSubScreen?: string;
  onNavigate?: () => void;
  tone?: HomeCardTone;
}

export interface HomeQuickAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface HomeKioskConfig {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  icon: React.ReactNode;
  metricValue: string | number;
  metricLabel: string;
  items: HomePreviewRow[];
  targetScreen: ActiveScreen;
  onNavigate?: () => void;
}

export interface HomeAnchorMetricConfig {
  label: string;
  value: string | number;
  unit?: string;
  badgeText?: string;
  badgeVariant?: 'amber' | 'orange' | 'green' | 'red' | 'neutral';
  sublabel?: string;
  targetScreen?: ActiveScreen;
  onNavigate?: () => void;
}

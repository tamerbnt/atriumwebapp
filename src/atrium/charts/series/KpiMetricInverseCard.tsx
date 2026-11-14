import React from 'react';
import { KpiSparkCard } from './KpiSparkCard';
import { KpiSparkCardProps } from '../types';

/**
 * Component #2 — Dark-surface inverse KPI variant (.dk KPI posture in Main.dc.html)
 * where downward changes (e.g. churn, no-shows, overdue count, scrap) highlight
 * positively (#5BE3A3) and upward increases trigger coral warning (#EE7452).
 */
export const KpiMetricInverseCard: React.FC<KpiSparkCardProps> = React.memo(
  ({
    surface = 'dark',
    inlineDark = true,
    higherIsBetter = false,
    ...rest
  }) => {
    return (
      <KpiSparkCard
        surface={surface}
        inlineDark={inlineDark}
        higherIsBetter={higherIsBetter}
        {...rest}
      />
    );
  }
);

KpiMetricInverseCard.displayName = 'KpiMetricInverseCard';

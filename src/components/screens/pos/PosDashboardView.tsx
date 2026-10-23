import React from 'react';
import {
  MembershipDashboardView,
  MembershipDashboardViewProps,
} from '../membership/MembershipDashboardView';

export interface PosDashboardViewProps extends MembershipDashboardViewProps {}

export const PosDashboardView: React.FC<PosDashboardViewProps> = (props) => {
  return <MembershipDashboardView {...props} />;
};

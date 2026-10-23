import React from 'react';
import {
  MembershipDashboardView,
  MembershipDashboardViewProps,
} from '../membership/MembershipDashboardView';

export interface AppointmentDashboardViewProps extends MembershipDashboardViewProps {}

export const AppointmentDashboardView: React.FC<AppointmentDashboardViewProps> = (props) => {
  return <MembershipDashboardView {...props} />;
};

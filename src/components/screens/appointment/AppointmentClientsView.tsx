import React from 'react';
import {
  MembershipMembersView,
  MembershipMembersViewProps,
} from '../membership/MembershipMembersView';

export interface AppointmentClientsViewProps extends MembershipMembersViewProps {}

export const AppointmentClientsView: React.FC<AppointmentClientsViewProps> = (props) => {
  return <MembershipMembersView {...props} />;
};

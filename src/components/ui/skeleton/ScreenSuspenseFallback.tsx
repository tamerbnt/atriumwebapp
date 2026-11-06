import React from 'react';
import {
  SkeletonDashboardGym,
  SkeletonDashboardSalon,
  SkeletonDashboardPos,
  SkeletonDashboardEducation,
  SkeletonDashboardMedical,
  SkeletonDashboardGarage,
  SkeletonDashboardRealEstate,
  SkeletonDashboardManufacturing,
  SkeletonDashboardLegal,
  SkeletonDashboardLogistics,
  SkeletonDashboardContractor,
  SkeletonDashboardAgriculture,
  SkeletonDashboardFreelance,
  SkeletonDashboardVenue,
  SkeletonDashboardTrading,
  SkeletonDashboardProject,
  SkeletonSchedulerView,
  SkeletonPosRegister,
  SkeletonCalendarTimeline,
  SkeletonKanbanPipeline,
  SkeletonFinanceAudit,
  SkeletonCollectionScreen,
  SkeletonAnalytics,
} from './StructuralSkeletons';

interface ScreenSuspenseFallbackProps {
  category?: string;
  screen?: string;
}

export const ScreenSuspenseFallback: React.FC<ScreenSuspenseFallbackProps> = ({
  category = 'membership_fitness',
  screen = 'dashboard',
}) => {
  // 1. Category Dashboards
  if (screen === 'dashboard' || screen.endsWith('_dashboard')) {
    switch (category) {
      case 'appointment_service':
        return <SkeletonDashboardSalon />;
      case 'pos_inventory':
        return <SkeletonDashboardPos />;
      case 'education_cohort':
        return <SkeletonDashboardEducation />;
      case 'medical_clinic':
        return <SkeletonDashboardMedical />;
      case 'auto_garage':
        return <SkeletonDashboardGarage />;
      case 'real_estate':
        return <SkeletonDashboardRealEstate />;
      case 'manufacturing_production':
        return <SkeletonDashboardManufacturing />;
      case 'legal_accounting':
        return <SkeletonDashboardLegal />;
      case 'logistics_delivery':
        return <SkeletonDashboardLogistics />;
      case 'construction_contractor':
        return <SkeletonDashboardContractor />;
      case 'agriculture_farming':
        return <SkeletonDashboardAgriculture />;
      case 'freelance_solo':
        return <SkeletonDashboardFreelance />;
      case 'rental_booking':
        return <SkeletonDashboardVenue />;
      case 'trading_commercial':
        return <SkeletonDashboardTrading />;
      case 'project_milestone':
        return <SkeletonDashboardProject />;
      case 'membership_fitness':
      default:
        return <SkeletonDashboardGym />;
    }
  }

  // 2. Schedulers, Agendas, Timetables
  if (
    screen === 'scheduler' ||
    screen === 'schedule' ||
    screen === 'agenda' ||
    screen === 'timetable' ||
    screen.includes('timetable') ||
    screen.includes('schedule')
  ) {
    return <SkeletonSchedulerView />;
  }

  // 3. POS Cash Register
  if (screen === 'register' || screen === 'pos_register') {
    return <SkeletonPosRegister />;
  }

  // 4. Calendar Timeline
  if (screen === 'timeline' || screen === 'venue_timeline') {
    return <SkeletonCalendarTimeline />;
  }

  // 5. Analytics View
  if (screen === 'analytics') {
    return <SkeletonAnalytics />;
  }

  // 6. Finance & Billing Audits
  if (screen.includes('finance') || screen.includes('billing') || screen.includes('trust')) {
    return <SkeletonFinanceAudit />;
  }

  // 7. Kanban Pipelines & Admissions
  if (
    screen.includes('kanban') ||
    screen.includes('admissions') ||
    screen.includes('deliverables') ||
    screen.includes('pipeline') ||
    screen.includes('queue')
  ) {
    return <SkeletonKanbanPipeline />;
  }

  // 8. Default Collection Grid & Table Screen
  return <SkeletonCollectionScreen />;
};

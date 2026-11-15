import React from 'react';
import { selectCurrentBusinessFromState, useAtriumSelector } from '../../../services/store';
import { SkeletonHomeView } from '../../ui/skeleton/StructuralSkeletons';
import type { HomeViewProps } from './CoreServiceHomeViews';

const MembershipHomeView = React.lazy(() =>
  import('./CoreServiceHomeViews').then((m) => ({ default: m.MembershipHomeView }))
);
const AppointmentHomeView = React.lazy(() =>
  import('./CoreServiceHomeViews').then((m) => ({ default: m.AppointmentHomeView }))
);
const PosHomeView = React.lazy(() =>
  import('./CoreServiceHomeViews').then((m) => ({ default: m.PosHomeView }))
);
const EducationHomeView = React.lazy(() =>
  import('./CoreServiceHomeViews').then((m) => ({ default: m.EducationHomeView }))
);

const ProjectHomeView = React.lazy(() =>
  import('./CoreBusinessHomeViews').then((m) => ({ default: m.ProjectHomeView }))
);
const VenueHomeView = React.lazy(() =>
  import('./CoreBusinessHomeViews').then((m) => ({ default: m.VenueHomeView }))
);
const FreelanceHomeView = React.lazy(() =>
  import('./CoreBusinessHomeViews').then((m) => ({ default: m.FreelanceHomeView }))
);
const TradingHomeView = React.lazy(() =>
  import('./CoreBusinessHomeViews').then((m) => ({ default: m.TradingHomeView }))
);

const MedicalHomeView = React.lazy(() =>
  import('./ClinicalWorkshopHomeViews').then((m) => ({ default: m.MedicalHomeView }))
);
const AutoGarageHomeView = React.lazy(() =>
  import('./ClinicalWorkshopHomeViews').then((m) => ({ default: m.AutoGarageHomeView }))
);
const RealEstateHomeView = React.lazy(() =>
  import('./ClinicalWorkshopHomeViews').then((m) => ({ default: m.RealEstateHomeView }))
);
const ManufacturingHomeView = React.lazy(() =>
  import('./ClinicalWorkshopHomeViews').then((m) => ({ default: m.ManufacturingHomeView }))
);

const LegalHomeView = React.lazy(() =>
  import('./FieldAdvisoryHomeViews').then((m) => ({ default: m.LegalHomeView }))
);
const LogisticsHomeView = React.lazy(() =>
  import('./FieldAdvisoryHomeViews').then((m) => ({ default: m.LogisticsHomeView }))
);
const ContractorHomeView = React.lazy(() =>
  import('./FieldAdvisoryHomeViews').then((m) => ({ default: m.ContractorHomeView }))
);
const AgricultureHomeView = React.lazy(() =>
  import('./FieldAdvisoryHomeViews').then((m) => ({ default: m.AgricultureHomeView }))
);

export const CategoryHomeView: React.FC<HomeViewProps> = (props) => {
  const currentBusiness = useAtriumSelector(selectCurrentBusinessFromState);
  const category = currentBusiness?.category || 'membership_session';

  const renderHomeForCategory = () => {
    switch (category) {
      case 'membership_session':
        return <MembershipHomeView {...props} />;
      case 'appointment_service':
        return <AppointmentHomeView {...props} />;
      case 'pos_inventory':
        return <PosHomeView {...props} />;
      case 'education_cohort':
        return <EducationHomeView {...props} />;
      case 'project_milestone':
        return <ProjectHomeView {...props} />;
      case 'rental_booking':
        return <VenueHomeView {...props} />;
      case 'freelance_solo':
        return <FreelanceHomeView {...props} />;
      case 'trading_commercial':
        return <TradingHomeView {...props} />;
      case 'medical_clinic':
        return <MedicalHomeView {...props} />;
      case 'auto_garage':
        return <AutoGarageHomeView {...props} />;
      case 'real_estate':
        return <RealEstateHomeView {...props} />;
      case 'manufacturing_production':
        return <ManufacturingHomeView {...props} />;
      case 'legal_accounting':
        return <LegalHomeView {...props} />;
      case 'logistics_delivery':
        return <LogisticsHomeView {...props} />;
      case 'construction_contractor':
        return <ContractorHomeView {...props} />;
      case 'agriculture_farming':
        return <AgricultureHomeView {...props} />;
      default:
        return <MembershipHomeView {...props} />;
    }
  };

  return (
    <React.Suspense fallback={<SkeletonHomeView category={category} />}>
      {renderHomeForCategory()}
    </React.Suspense>
  );
};

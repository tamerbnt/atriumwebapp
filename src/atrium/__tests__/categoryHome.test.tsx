import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  useAtriumStore,
  useAtriumSelector,
  setScreenAction,
  setLanguageAction,
  setThemeAction,
  switchBusinessAction,
  setActivePmRoleAction,
} from '../../services/store';
import {
  MembershipHomeView,
  AppointmentHomeView,
  PosHomeView,
  EducationHomeView,
} from '../../components/screens/home/CoreServiceHomeViews';
import {
  ProjectHomeView,
  VenueHomeView,
  FreelanceHomeView,
  TradingHomeView,
} from '../../components/screens/home/CoreBusinessHomeViews';
import {
  MedicalHomeView,
  AutoGarageHomeView,
  RealEstateHomeView,
  ManufacturingHomeView,
} from '../../components/screens/home/ClinicalWorkshopHomeViews';
import {
  LegalHomeView,
  LogisticsHomeView,
  ContractorHomeView,
  AgricultureHomeView,
} from '../../components/screens/home/FieldAdvisoryHomeViews';
import { SkeletonHomeView } from '../../components/ui/skeleton/StructuralSkeletons';

const CATEGORIES = [
  'membership_session',
  'appointment_service',
  'pos_inventory',
  'education_cohort',
  'project_milestone',
  'rental_booking',
  'freelance_solo',
  'trading_commercial',
  'medical_clinic',
  'auto_garage',
  'real_estate',
  'manufacturing_production',
  'legal_accounting',
  'logistics_delivery',
  'construction_contractor',
  'agriculture_farming',
] as const;

function readStoreSnapshot() {
  let activeScreen = '';
  let businesses: Array<{ id: string; category: string }> = [];
  let storeActions: ReturnType<typeof useAtriumStore> | null = null;
  const Probe: React.FC = () => {
    activeScreen = useAtriumSelector((s) => s.activeScreen);
    businesses = useAtriumSelector((s) =>
      s.businesses.map((b) => ({ id: b.id, category: b.category }))
    );
    storeActions = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  return { activeScreen, businesses, storeActions: storeActions! };
}

function switchToCategoryBusiness(category: string) {
  const { businesses } = readStoreSnapshot();
  const match = businesses.find((b) => b.category === category);
  if (match) {
    switchBusinessAction(match.id);
  }
}

describe("Salle d'accueil Category Home Screens", () => {
  beforeEach(() => {
    setLanguageAction('fr');
    setThemeAction('light');
  });

  it('defaults to home and preserves dashboard route separation', () => {
    const initial = readStoreSnapshot();
    expect(initial.activeScreen).toBe('home');

    setScreenAction('dashboard');
    expect(readStoreSnapshot().activeScreen).toBe('dashboard');

    setScreenAction('home');
    expect(readStoreSnapshot().activeScreen).toBe('home');
  });

  it('resets to home on role changes and business category switches', () => {
    switchToCategoryBusiness('project_milestone');
    setScreenAction('pm_dir_dashboard');
    expect(readStoreSnapshot().activeScreen).toBe('pm_dir_dashboard');
    setActivePmRoleAction('chef_projet');
    expect(readStoreSnapshot().activeScreen).toBe('home');

    setScreenAction('dashboard');
    switchToCategoryBusiness('trading_commercial');
    expect(readStoreSnapshot().activeScreen).toBe('home');
  });

  it('renders skeletons for all 16 categories without errors', () => {
    for (const cat of CATEGORIES) {
      const html = renderToStaticMarkup(<SkeletonHomeView category={cat} />);
      expect(html.length).toBeGreaterThan(100);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }
  });

  it('renders Core Service categories cleanly in owner and staff modes', () => {
    const { storeActions } = readStoreSnapshot();

    switchToCategoryBusiness('membership_session');
    storeActions.setActiveMembershipRole('owner');
    const gymOwner = renderToStaticMarkup(<MembershipHomeView />);
    expect(gymOwner).toContain('home-membership-owner');
    expect(gymOwner).toContain('grid-cols-1');
    expect(gymOwner).not.toContain('NaN');

    storeActions.setActiveMembershipRole('staff');
    expect(readStoreSnapshot().activeScreen).toBe('home');
    expect(renderToStaticMarkup(<MembershipHomeView />)).toContain('home-membership-staff');

    switchToCategoryBusiness('appointment_service');
    storeActions.setActiveAppointmentRole('owner');
    expect(renderToStaticMarkup(<AppointmentHomeView />)).toContain('home-appointment-owner');
    storeActions.setActiveAppointmentRole('staff');
    expect(renderToStaticMarkup(<AppointmentHomeView />)).toContain('home-appointment-staff');

    switchToCategoryBusiness('pos_inventory');
    storeActions.setActivePosRole('owner');
    expect(renderToStaticMarkup(<PosHomeView />)).toContain('home-pos-owner');
    storeActions.setActivePosRole('staff');
    expect(renderToStaticMarkup(<PosHomeView />)).toContain('home-pos-staff');

    switchToCategoryBusiness('education_cohort');
    storeActions.setActiveEducationRole('owner');
    expect(renderToStaticMarkup(<EducationHomeView />)).toContain('home-education-owner');
    storeActions.setActiveEducationRole('staff');
    expect(renderToStaticMarkup(<EducationHomeView />)).toContain('home-education-staff');
  });

  it('renders Core Business categories and all 6 PM roles', () => {
    switchToCategoryBusiness('project_milestone');
    const pmRoles = ['direction', 'chef_projet', 'crea', 'superviseur', 'rh', 'compta'] as const;
    for (const role of pmRoles) {
      setActivePmRoleAction(role);
      const html = renderToStaticMarkup(<ProjectHomeView />);
      expect(html).toContain(`home-project-${role}`);
      expect(html).not.toContain('NaN');
    }

    switchToCategoryBusiness('rental_booking');
    expect(renderToStaticMarkup(<VenueHomeView />)).toContain('home-venue');

    switchToCategoryBusiness('freelance_solo');
    expect(renderToStaticMarkup(<FreelanceHomeView />)).toContain('home-freelance');

    switchToCategoryBusiness('trading_commercial');
    expect(renderToStaticMarkup(<TradingHomeView />)).toContain('home-trading');
  });

  it('renders Clinical & Workshop categories across all roles including Manufacturing operator kiosk', () => {
    const { storeActions } = readStoreSnapshot();

    switchToCategoryBusiness('medical_clinic');
    expect(renderToStaticMarkup(<MedicalHomeView />)).toContain('home-medical');

    switchToCategoryBusiness('auto_garage');
    const garageRoles = ['gerant', 'reception', 'mecanicien', 'magasinier', 'caisse'] as const;
    for (const role of garageRoles) {
      storeActions.setActiveGarageRole(role);
      expect(renderToStaticMarkup(<AutoGarageHomeView />)).toContain(`home-garage-${role}`);
    }

    switchToCategoryBusiness('real_estate');
    const reRoles = ['direction', 'negociateur', 'gestionnaire_locatif', 'notaire_compta'] as const;
    for (const role of reRoles) {
      storeActions.setActiveRealEstateRole(role);
      expect(renderToStaticMarkup(<RealEstateHomeView />)).toContain(`home-realestate-${role}`);
    }

    switchToCategoryBusiness('manufacturing_production');
    const mfgRoles = ['gerant', 'chef_atelier', 'operateur', 'magasinier', 'qualite'] as const;
    for (const role of mfgRoles) {
      storeActions.setActiveManufacturingRole(role);
      expect(renderToStaticMarkup(<ManufacturingHomeView />)).toContain(`home-manufacturing-${role}`);
    }
  });

  it('renders Field & Advisory categories across all roles plus Arabic RTL & Dark theme', () => {
    const { storeActions } = readStoreSnapshot();

    switchToCategoryBusiness('legal_accounting');
    const legalRoles = ['avocat_associe', 'notaire_titulaire', 'expert_comptable', 'secretaire_caisse'] as const;
    for (const role of legalRoles) {
      storeActions.setActiveLegalRole(role);
      expect(renderToStaticMarkup(<LegalHomeView />)).toContain(`home-legal-${role}`);
    }

    switchToCategoryBusiness('logistics_delivery');
    const logRoles = ['gerant', 'dispatcher', 'hub_sorter', 'stop_desk_agent'] as const;
    for (const role of logRoles) {
      storeActions.setActiveLogisticsRole(role);
      expect(renderToStaticMarkup(<LogisticsHomeView />)).toContain(`home-logistics-${role}`);
    }

    switchToCategoryBusiness('construction_contractor');
    const btpRoles = ['gerant', 'conducteur', 'chef_chantier', 'metreur', 'comptable'] as const;
    for (const role of btpRoles) {
      storeActions.setActiveContractorRole(role);
      expect(renderToStaticMarkup(<ContractorHomeView />)).toContain(`home-contractor-${role}`);
    }

    switchToCategoryBusiness('agriculture_farming');
    const agriRoles = ['gerant', 'chef_culture', 'zootechnicien', 'magasinier'] as const;
    for (const role of agriRoles) {
      storeActions.setActiveAgriRole(role);
      expect(renderToStaticMarkup(<AgricultureHomeView />)).toContain(`home-agriculture-${role}`);
    }

    // Verify Arabic RTL + Dark Theme
    setLanguageAction('ar');
    setThemeAction('dark');
    storeActions.setActiveAgriRole('gerant');
    const arHtml = renderToStaticMarkup(<AgricultureHomeView />);
    expect(arHtml).toContain('dir="rtl"');
    expect(arHtml).toContain('rtl:-scale-x-100');
  });
});

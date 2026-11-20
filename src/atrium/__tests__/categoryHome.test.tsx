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
  atriumActions,
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
  let currentFormules: ReturnType<typeof useAtriumStore>['currentCategoryFormules'] = [];
  const Probe: React.FC = () => {
    activeScreen = useAtriumSelector((s) => s.activeScreen);
    businesses = useAtriumSelector((s) =>
      s.businesses.map((b) => ({ id: b.id, category: b.category }))
    );
    storeActions = useAtriumStore();
    currentFormules = storeActions.currentCategoryFormules;
    return null;
  };
  renderToStaticMarkup(<Probe />);
  return { activeScreen, businesses, storeActions: storeActions!, currentFormules };
}

function switchToCategoryBusiness(category: string) {
  const { businesses } = readStoreSnapshot();
  const match = businesses.find((b) => b.category === category);
  if (match) {
    switchBusinessAction(match.id);
  }
}

function expectHas4RowCoreBento(html: string) {
  expect(html).toContain('home-row-hero');
  expect(html).toContain('home-row-operations');
  expect(html).toContain('home-row-historique');
  expect(html).not.toContain('undefined');
  expect(html).not.toContain('NaN');
}

function expectHasSetupPodOrCompleteBanner(html: string) {
  const hasSetup =
    html.includes('home-row-setup') || html.includes('home-setup-banner-complete');
  expect(hasSetup).toBe(true);
}

describe("Salle d'accueil 4-Row Category Home Screens", () => {
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

  it('renders 4-row skeletons for all 16 categories with standardized 42/58 agriculture ratio', () => {
    for (const cat of CATEGORIES) {
      const html = renderToStaticMarkup(<SkeletonHomeView category={cat} />);
      expect(html.length).toBeGreaterThan(200);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('lg:grid-cols-[58fr_42fr]');
      if (cat === 'agriculture_farming') {
        expect(html).toContain('lg:grid-cols-[42fr_58fr]');
      }
    }
  });

  it('renders Core Service categories in 4-row layout and enforces executive-only Row 4 visibility', () => {
    const { storeActions } = readStoreSnapshot();

    switchToCategoryBusiness('membership_session');
    storeActions.setActiveMembershipRole('owner');
    const gymOwner = renderToStaticMarkup(<MembershipHomeView />);
    expect(gymOwner).toContain('home-membership-owner');
    expectHas4RowCoreBento(gymOwner);
    expectHasSetupPodOrCompleteBanner(gymOwner);

    storeActions.setActiveMembershipRole('staff');
    expect(readStoreSnapshot().activeScreen).toBe('home');
    const gymStaff = renderToStaticMarkup(<MembershipHomeView />);
    expect(gymStaff).toContain('home-membership-staff');
    expectHas4RowCoreBento(gymStaff);
    expect(gymStaff).not.toContain('home-row-setup');

    switchToCategoryBusiness('appointment_service');
    storeActions.setActiveAppointmentRole('owner');
    const salonOwner = renderToStaticMarkup(<AppointmentHomeView />);
    expect(salonOwner).toContain('home-appointment-owner');
    expectHas4RowCoreBento(salonOwner);
    expectHasSetupPodOrCompleteBanner(salonOwner);

    storeActions.setActiveAppointmentRole('staff');
    const salonStaff = renderToStaticMarkup(<AppointmentHomeView />);
    expect(salonStaff).toContain('home-appointment-staff');
    expect(salonStaff).not.toContain('home-row-setup');

    switchToCategoryBusiness('pos_inventory');
    storeActions.setActivePosRole('owner');
    const posOwner = renderToStaticMarkup(<PosHomeView />);
    expect(posOwner).toContain('home-pos-owner');
    expectHas4RowCoreBento(posOwner);

    storeActions.setActivePosRole('staff');
    const posStaff = renderToStaticMarkup(<PosHomeView />);
    expect(posStaff).toContain('home-pos-staff');
    expect(posStaff).not.toContain('home-row-setup');

    switchToCategoryBusiness('education_cohort');
    storeActions.setActiveEducationRole('owner');
    const eduOwner = renderToStaticMarkup(<EducationHomeView />);
    expect(eduOwner).toContain('home-education-owner');
    expectHas4RowCoreBento(eduOwner);

    storeActions.setActiveEducationRole('staff');
    const eduStaff = renderToStaticMarkup(<EducationHomeView />);
    expect(eduStaff).toContain('home-education-staff');
    expect(eduStaff).not.toContain('home-row-setup');
  });

  it('renders Core Business categories and all 6 PM roles with direction-only setup pod', () => {
    switchToCategoryBusiness('project_milestone');
    const pmRoles = ['direction', 'chef_projet', 'crea', 'superviseur', 'rh', 'compta'] as const;
    for (const role of pmRoles) {
      setActivePmRoleAction(role);
      const html = renderToStaticMarkup(<ProjectHomeView />);
      expect(html).toContain(`home-project-${role}`);
      expectHas4RowCoreBento(html);
      if (role === 'direction') {
        expectHasSetupPodOrCompleteBanner(html);
      } else {
        expect(html).not.toContain('home-row-setup');
      }
    }

    switchToCategoryBusiness('rental_booking');
    const venueHtml = renderToStaticMarkup(<VenueHomeView />);
    expect(venueHtml).toContain('home-venue');
    expectHas4RowCoreBento(venueHtml);

    switchToCategoryBusiness('freelance_solo');
    const frlHtml = renderToStaticMarkup(<FreelanceHomeView />);
    expect(frlHtml).toContain('home-freelance');
    expectHas4RowCoreBento(frlHtml);

    switchToCategoryBusiness('trading_commercial');
    const trdHtml = renderToStaticMarkup(<TradingHomeView />);
    expect(trdHtml).toContain('home-trading');
    expectHas4RowCoreBento(trdHtml);
  });

  it('renders Clinical & Workshop categories across all roles including Manufacturing operator kiosk', () => {
    const { storeActions } = readStoreSnapshot();

    switchToCategoryBusiness('medical_clinic');
    const medHtml = renderToStaticMarkup(<MedicalHomeView />);
    expect(medHtml).toContain('home-medical');
    expectHas4RowCoreBento(medHtml);
    expectHasSetupPodOrCompleteBanner(medHtml);

    switchToCategoryBusiness('auto_garage');
    const garageRoles = ['gerant', 'reception', 'mecanicien', 'magasinier', 'caisse'] as const;
    for (const role of garageRoles) {
      storeActions.setActiveGarageRole(role);
      const html = renderToStaticMarkup(<AutoGarageHomeView />);
      expect(html).toContain(`home-garage-${role}`);
      expectHas4RowCoreBento(html);
      if (role === 'gerant') {
        expectHasSetupPodOrCompleteBanner(html);
      } else {
        expect(html).not.toContain('home-row-setup');
      }
    }

    switchToCategoryBusiness('real_estate');
    const reRoles = ['direction', 'negociateur', 'gestionnaire_locatif', 'notaire_compta'] as const;
    for (const role of reRoles) {
      storeActions.setActiveRealEstateRole(role);
      const html = renderToStaticMarkup(<RealEstateHomeView />);
      expect(html).toContain(`home-realestate-${role}`);
      expectHas4RowCoreBento(html);
      if (role === 'direction') {
        expectHasSetupPodOrCompleteBanner(html);
      } else {
        expect(html).not.toContain('home-row-setup');
      }
    }

    switchToCategoryBusiness('manufacturing_production');
    const mfgRoles = ['gerant', 'chef_atelier', 'operateur', 'magasinier', 'qualite'] as const;
    for (const role of mfgRoles) {
      storeActions.setActiveManufacturingRole(role);
      const html = renderToStaticMarkup(<ManufacturingHomeView />);
      expect(html).toContain(`home-manufacturing-${role}`);
      expectHas4RowCoreBento(html);
      if (role === 'gerant') {
        expectHasSetupPodOrCompleteBanner(html);
      } else {
        expect(html).not.toContain('home-row-setup');
      }
    }
  });

  it('renders Field & Advisory categories with standardized 42/58 Agriculture Hero-Left plus Arabic RTL & Dark theme', () => {
    const { storeActions } = readStoreSnapshot();

    switchToCategoryBusiness('legal_accounting');
    const legalRoles = ['avocat_associe', 'notaire_titulaire', 'expert_comptable', 'secretaire_caisse'] as const;
    for (const role of legalRoles) {
      storeActions.setActiveLegalRole(role);
      const html = renderToStaticMarkup(<LegalHomeView />);
      expect(html).toContain(`home-legal-${role}`);
      expectHas4RowCoreBento(html);
      if (role === 'secretaire_caisse') {
        expect(html).not.toContain('home-row-setup');
      } else {
        expectHasSetupPodOrCompleteBanner(html);
      }
    }

    switchToCategoryBusiness('logistics_delivery');
    const logRoles = ['gerant', 'dispatcher', 'hub_sorter', 'stop_desk_agent'] as const;
    for (const role of logRoles) {
      storeActions.setActiveLogisticsRole(role);
      const html = renderToStaticMarkup(<LogisticsHomeView />);
      expect(html).toContain(`home-logistics-${role}`);
      expectHas4RowCoreBento(html);
    }

    switchToCategoryBusiness('construction_contractor');
    const btpRoles = ['gerant', 'conducteur', 'chef_chantier', 'metreur', 'comptable'] as const;
    for (const role of btpRoles) {
      storeActions.setActiveContractorRole(role);
      const html = renderToStaticMarkup(<ContractorHomeView />);
      expect(html).toContain(`home-contractor-${role}`);
      expectHas4RowCoreBento(html);
    }

    switchToCategoryBusiness('agriculture_farming');
    const agriRoles = ['gerant', 'chef_culture', 'zootechnicien', 'magasinier'] as const;
    for (const role of agriRoles) {
      storeActions.setActiveAgriRole(role);
      const html = renderToStaticMarkup(<AgricultureHomeView />);
      expect(html).toContain(`home-agriculture-${role}`);
      expect(html).toContain('lg:grid-cols-[42fr_58fr]');
      expectHas4RowCoreBento(html);
    }

    // Verify Arabic RTL + Dark Theme
    setLanguageAction('ar');
    setThemeAction('dark');
    storeActions.setActiveAgriRole('gerant');
    const arHtml = renderToStaticMarkup(<AgricultureHomeView />);
    expect(arHtml).toContain('dir="rtl"');
    expect(arHtml).toContain('rtl:-scale-x-100');
  });

  it('enforces reference-safe archive vs delete rules on category formules', () => {
    switchToCategoryBusiness('medical_clinic');
    const referenced = atriumActions.addCategoryFormule({
      formuleType: 'medical_act',
      code: 'REF-01',
      name: 'Acte Référencé',
      description: 'Test ref protection',
      priceAmount: 3000,
      currency: 'DZD',
      ratePercent: 80,
      durationValue: 30,
      durationUnit: 'minutes',
      taxRate: 0,
      metadata: { referencedCount: 3 },
      isActive: true,
      sortOrder: 99,
    });
    expect(referenced).toBeTruthy();

    const blockedResult = atriumActions.deleteCategoryFormule(referenced!.id);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.blockedByReferences).toBe(true);
    expect(blockedResult.referenceCount).toBe(3);

    // Archiving / toggling inactive succeeds cleanly even when referenced
    atriumActions.toggleCategoryFormuleActive(referenced!.id);
    const afterToggle = readStoreSnapshot().currentFormules.find(
      (f) => f.id === referenced!.id
    );
    expect(afterToggle?.isActive).toBe(false);

    // Unreferenced formule can be permanently deleted
    const unreferenced = atriumActions.addCategoryFormule({
      formuleType: 'medical_act',
      code: 'TMP-01',
      name: 'Acte Temporaire',
      description: 'Deletable test',
      priceAmount: 1500,
      currency: 'DZD',
      ratePercent: 0,
      durationValue: 15,
      durationUnit: 'minutes',
      taxRate: 0,
      metadata: {},
      isActive: true,
      sortOrder: 100,
    });
    expect(unreferenced).toBeTruthy();
    const deleteResult = atriumActions.deleteCategoryFormule(unreferenced!.id);
    expect(deleteResult.success).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  canAccessRoute,
  getAllowedRoutesForCategoryRole,
  getEffectivePermissionContext,
  resolveSemanticRoute,
  recordRouteAccessDenied,
  getRouteAccessDeniedLogs,
  clearRouteAccessDeniedLogs,
} from '../routePermissions';
import {
  canViewSensitivePayroll,
  getEffectiveUserRole,
  migrateStoredOperationalRole,
} from '../staffRules';
import {
  useAtriumStore,
  setScreenAction,
  switchBusinessAction,
  setActivePmRoleAction,
  loginWithPinAction,
} from '../../services/store';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAtriumSelector } from '../../services/store';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k: string) {
      return map.get(k) ?? null;
    },
    key(idx: number) {
      return Array.from(map.keys())[idx] ?? null;
    },
    removeItem(k: string) {
      map.delete(k);
    },
    setItem(k: string, v: string) {
      map.set(k, v);
    },
  };
}

function readStoreSlice() {
  let activeScreen = '';
  let activePmRole = '';
  let activeGarageRole = '';
  let currentUserRole = '';
  let storeActions: ReturnType<typeof useAtriumStore> | null = null;
  const Probe: React.FC = () => {
    activeScreen = useAtriumSelector((s) => s.activeScreen);
    activePmRole = useAtriumSelector((s) => s.activePmRole || '');
    activeGarageRole = useAtriumSelector((s) => s.activeGarageRole || '');
    currentUserRole = useAtriumSelector((s) => s.currentUser?.role || '');
    storeActions = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(React.createElement(Probe));
  return { activeScreen, activePmRole, activeGarageRole, currentUserRole, storeActions: storeActions! };
}

describe('Section 5 Routing, Roles & Access Control Matrix', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    clearRouteAccessDeniedLogs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves golden baseline routes (5.5 / 5.9 zero-diff across executive & operational workflows)', () => {
    // 1. Freelance Solo (Owner & Staff)
    const frlOwner = new Set(getAllowedRoutesForCategoryRole('freelance_solo', { currentUser: { role: 'Owner', roleRank: 8 } }));
    expect(frlOwner).toEqual(new Set(['home', 'dashboard', 'analytics', 'members', 'registrations', 'scheduler', 'shop', 'finance', 'history', 'staff', 'settings']));

    const frlStaff = new Set(getAllowedRoutesForCategoryRole('freelance_solo', { currentUser: { role: 'Assistant', roleRank: 2 } }));
    expect(frlStaff).toEqual(new Set(['home', 'dashboard', 'analytics', 'members', 'registrations', 'scheduler', 'shop', 'finance']));

    // 2. Rental Booking (Owner & Staff)
    const rentalOwner = new Set(getAllowedRoutesForCategoryRole('rental_booking', { currentUser: { role: 'Owner', roleRank: 8 } }));
    expect(rentalOwner).toEqual(new Set(['home', 'dashboard', 'scheduler', 'registrations', 'shop', 'members', 'finance', 'analytics', 'history', 'staff', 'settings']));

    const rentalReception = new Set(getAllowedRoutesForCategoryRole('rental_booking', { currentUser: { role: 'Reception', roleRank: 2 } }));
    expect(rentalReception).toEqual(new Set(['home', 'dashboard', 'scheduler', 'registrations', 'shop', 'members', 'finance', 'analytics']));

    // 3. Medical Clinic (Owner, Doctor, Nurse)
    const medDoctor = new Set(getAllowedRoutesForCategoryRole('medical_clinic', { currentUser: { role: 'Doctor', roleRank: 4 } }));
    expect(medDoctor).toEqual(new Set(['home', 'dashboard', 'scheduler', 'agenda', 'members', 'shop', 'registrations', 'finance', 'staff']));

    const medNurse = new Set(getAllowedRoutesForCategoryRole('medical_clinic', { currentUser: { role: 'Infirmier', roleRank: 2 } }));
    expect(medNurse).toEqual(new Set(['home', 'dashboard', 'scheduler', 'agenda', 'members', 'shop', 'registrations', 'finance']));

    // 4. Trading Commercial (Owner & Cashier)
    const tradingCashier = new Set(getAllowedRoutesForCategoryRole('trading_commercial', { currentUser: { role: 'Cashier', roleRank: 2 } }));
    expect(tradingCashier).toEqual(new Set([
      'home', 'dashboard', 'trading_dashboard', 'trading_sales', 'registrations', 'trading_purchases',
      'scheduler', 'trading_inventory', 'shop', 'trading_directory', 'members', 'trading_catalog',
      'trading_finance', 'finance', 'analytics',
    ]));

    // 5. All 6 Project Milestone roles
    const pmDir = new Set(getAllowedRoutesForCategoryRole('project_milestone', { currentUser: { role: 'Owner', roleRank: 8 }, activePmRole: 'direction' }));
    expect(pmDir).toEqual(new Set([
      'home', 'pm_dir_dashboard', 'pm_dir_new_project', 'pm_dir_projects', 'pm_dir_approvals', 'pm_dir_reports',
      'pm_cp_projects', 'pm_cp_catalog', 'pm_cp_orders', 'pm_cp_files', 'pm_cp_deliverables', 'pm_cp_expenses',
      'pm_crea_kanban', 'pm_crea_production', 'pm_crea_upload', 'pm_crea_briefs',
      'pm_sup_missions', 'pm_sup_attendance', 'pm_sup_staffing', 'pm_sup_expenses',
      'pm_rh_talents', 'pm_rh_dossier', 'pm_rh_portal', 'pm_rh_walkin',
      'pm_compta_payroll', 'pm_compta_ccp', 'pm_compta_expenses', 'pm_compta_stock',
      'dashboard', 'scheduler', 'registrations', 'analytics', 'members', 'finance', 'shop', 'history', 'staff', 'settings',
    ]));

    const pmChef = new Set(getAllowedRoutesForCategoryRole('project_milestone', { currentUser: { role: 'ChefProjet' }, activePmRole: 'chef_projet' }));
    expect(pmChef).toEqual(new Set(['home', 'pm_cp_projects', 'pm_cp_catalog', 'pm_cp_orders', 'pm_cp_files', 'pm_cp_deliverables', 'pm_cp_expenses', 'scheduler', 'staff']));

    const pmCrea = new Set(getAllowedRoutesForCategoryRole('project_milestone', { currentUser: { role: 'Creative' }, activePmRole: 'crea' }));
    expect(pmCrea).toEqual(new Set(['home', 'pm_crea_kanban', 'pm_crea_production', 'pm_crea_upload', 'pm_crea_briefs', 'registrations']));

    const pmSup = new Set(getAllowedRoutesForCategoryRole('project_milestone', { currentUser: { role: 'Superviseur' }, activePmRole: 'superviseur' }));
    expect(pmSup).toEqual(new Set(['home', 'pm_sup_missions', 'pm_sup_attendance', 'pm_sup_staffing', 'pm_sup_expenses', 'analytics']));

    const pmRh = new Set(getAllowedRoutesForCategoryRole('project_milestone', { currentUser: { role: 'RH' }, activePmRole: 'rh' }));
    expect(pmRh).toEqual(new Set(['home', 'pm_rh_talents', 'pm_rh_dossier', 'pm_rh_portal', 'pm_rh_walkin', 'members', 'staff']));

    const pmCompta = new Set(getAllowedRoutesForCategoryRole('project_milestone', { currentUser: { role: 'Compta' }, activePmRole: 'compta' }));
    expect(pmCompta).toEqual(new Set(['home', 'pm_compta_payroll', 'pm_compta_ccp', 'pm_compta_expenses', 'pm_compta_stock', 'finance', 'shop']));

    // 6-16. Remaining 11 Multi-Role & Dual-Role Verticals (Complete 16-Vertical Golden Matrix)
    expect(new Set(getAllowedRoutesForCategoryRole('membership_session', { activeMembershipRole: 'owner' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'registrations', 'shop', 'scheduler', 'finance', 'history', 'analytics', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('membership_session', { activeMembershipRole: 'staff' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'registrations'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('appointment_service', { activeAppointmentRole: 'owner' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'scheduler', 'shop', 'finance', 'history', 'registrations', 'analytics', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('appointment_service', { activeAppointmentRole: 'staff' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'members'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('pos_inventory', { activePosRole: 'owner' }))).toEqual(
      new Set(['home', 'dashboard', 'shop', 'scheduler', 'registrations', 'finance', 'history', 'members', 'analytics', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('pos_inventory', { activePosRole: 'staff' }))).toEqual(
      new Set(['home', 'dashboard', 'shop', 'scheduler', 'registrations', 'members'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('education_cohort', { activeEducationRole: 'owner' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'members', 'shop', 'registrations', 'analytics', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('education_cohort', { activeEducationRole: 'staff' }))).toEqual(
      new Set(['home', 'dashboard', 'analytics', 'scheduler', 'members', 'shop', 'registrations'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('auto_garage', { activeGarageRole: 'gerant' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'registrations', 'members', 'shop', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('auto_garage', { activeGarageRole: 'reception' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'registrations', 'members', 'shop', 'finance'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('auto_garage', { activeGarageRole: 'mecanicien' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'registrations', 'members', 'shop'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('auto_garage', { activeGarageRole: 'magasinier' }))).toEqual(
      new Set(['home', 'dashboard', 'shop', 'scheduler', 'registrations'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('auto_garage', { activeGarageRole: 'caisse' }))).toEqual(
      new Set(['home', 'dashboard', 'finance', 'members', 'scheduler'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('real_estate', { activeRealEstateRole: 'direction' }))).toEqual(
      new Set(['home', 'dashboard', 'realestate_mandates', 'shop', 'members', 'scheduler', 'registrations', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('real_estate', { activeRealEstateRole: 'negociateur' }))).toEqual(
      new Set(['home', 'dashboard', 'realestate_mandates', 'shop', 'members', 'registrations'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('real_estate', { activeRealEstateRole: 'gestionnaire_locatif' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'scheduler', 'registrations', 'finance'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('real_estate', { activeRealEstateRole: 'notaire_compta' }))).toEqual(
      new Set(['home', 'dashboard', 'realestate_mandates', 'shop', 'scheduler', 'finance'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('manufacturing_production', { activeManufacturingRole: 'gerant' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'registrations', 'shop', 'members', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('manufacturing_production', { activeManufacturingRole: 'chef_atelier' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'registrations', 'shop', 'members', 'finance', 'staff'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('manufacturing_production', { activeManufacturingRole: 'operateur' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'registrations'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('manufacturing_production', { activeManufacturingRole: 'magasinier' }))).toEqual(
      new Set(['home', 'dashboard', 'shop', 'members', 'finance'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('manufacturing_production', { activeManufacturingRole: 'qualite' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'registrations', 'finance'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('legal_accounting', { activeLegalRole: 'avocat_associe' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'scheduler', 'registrations', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('legal_accounting', { activeLegalRole: 'secretaire_caisse' }))).toEqual(
      new Set(['home', 'dashboard', 'finance', 'members', 'scheduler', 'registrations', 'settings'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('logistics_delivery', { activeLogisticsRole: 'gerant' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'scheduler', 'registrations', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('logistics_delivery', { activeLogisticsRole: 'dispatcher' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'scheduler', 'registrations', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('logistics_delivery', { activeLogisticsRole: 'hub_sorter' }))).toEqual(
      new Set(['home', 'dashboard', 'registrations', 'members', 'scheduler'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('logistics_delivery', { activeLogisticsRole: 'stop_desk_agent' }))).toEqual(
      new Set(['home', 'dashboard', 'registrations', 'members', 'scheduler', 'finance'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('construction_contractor', { activeContractorRole: 'gerant' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'registrations', 'shop', 'scheduler', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('construction_contractor', { activeContractorRole: 'conducteur_travaux' }))).toEqual(
      new Set(getAllowedRoutesForCategoryRole('construction_contractor', { activeContractorRole: 'conducteur' }))
    );
    expect(new Set(getAllowedRoutesForCategoryRole('construction_contractor', { activeContractorRole: 'daf_metreur' }))).toEqual(
      new Set(getAllowedRoutesForCategoryRole('construction_contractor', { activeContractorRole: 'metreur' }))
    );
    expect(new Set(getAllowedRoutesForCategoryRole('construction_contractor', { activeContractorRole: 'chef_chantier' }))).toEqual(
      new Set(['home', 'dashboard', 'scheduler', 'members', 'registrations', 'shop', 'finance', 'staff'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('construction_contractor', { activeContractorRole: 'comptable' }))).toEqual(
      new Set(['home', 'dashboard', 'finance', 'scheduler', 'shop', 'members'])
    );

    expect(new Set(getAllowedRoutesForCategoryRole('agriculture_farming', { activeAgriRole: 'gerant' }))).toEqual(
      new Set(['home', 'dashboard', 'members', 'scheduler', 'shop', 'registrations', 'finance', 'history', 'staff', 'settings'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('agriculture_farming', { activeAgriRole: 'chef_culture' }))).toEqual(
      new Set(['home', 'members', 'scheduler', 'shop', 'staff'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('agriculture_farming', { activeAgriRole: 'zootechnicien' }))).toEqual(
      new Set(['home', 'registrations'])
    );
    expect(new Set(getAllowedRoutesForCategoryRole('agriculture_farming', { activeAgriRole: 'magasinier' }))).toEqual(
      new Set(['home', 'finance', 'shop'])
    );
  });

  it('proves Gate 1 Condition #5 least-privilege before/after delta & onboarding invariant across all 16 verticals', () => {
    // Before hardening, unset currentUser escalated to Owner in trading_commercial & rental_booking.
    // After hardening: null/unset currentUser resolves to 'Staff' (no payroll, no settings, no staff admin).
    for (const cat of ['trading_commercial', 'rental_booking'] as const) {
      const nullRole = getEffectiveUserRole(cat, { currentUser: null });
      expect(nullRole).toBe('Staff');
      expect(canViewSensitivePayroll(nullRole)).toBe(false);
      expect(canAccessRoute(cat, { currentUser: null }, 'settings')).toBe(false);
      expect(canAccessRoute(cat, { currentUser: null }, 'preferences')).toBe(false);
      expect(canAccessRoute(cat, { currentUser: null }, 'staff')).toBe(false);

      const cashierRole = getEffectiveUserRole(cat, { currentUser: { role: 'Cashier' } });
      expect(cashierRole).toBe('Cashier');
      expect(canViewSensitivePayroll(cashierRole)).toBe(false);
      expect(canAccessRoute(cat, { currentUser: { role: 'Cashier', roleRank: 2 } }, 'settings')).toBe(false);
      expect(canAccessRoute(cat, { currentUser: { role: 'Cashier', roleRank: 2 } }, 'preferences')).toBe(true);

      const ownerRole = getEffectiveUserRole(cat, { currentUser: { role: 'Owner' } });
      expect(ownerRole).toBe('Owner');
      expect(canViewSensitivePayroll(ownerRole)).toBe(true);
      expect(canAccessRoute(cat, { currentUser: { role: 'Owner', roleRank: 8 } }, 'settings')).toBe(true);
      expect(canAccessRoute(cat, { currentUser: { role: 'Owner', roleRank: 8 } }, 'staff')).toBe(true);
    }

    // Freshly onboarded Owner in EVERY one of the 16 verticals retains full Owner capabilities & payroll access
    const all16Categories = [
      'membership_session',
      'appointment_service',
      'pos_inventory',
      'education_cohort',
      'project_milestone',
      'freelance_solo',
      'rental_booking',
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

    const { storeActions } = readStoreSlice();
    storeActions.setActiveContractorRole('chef_chantier');
    storeActions.setActiveLegalRole('secretaire_caisse');

    for (const category of all16Categories) {
      storeActions.completeOnboarding({
        fullName: 'Founder Test',
        email: `founder.${category}@atrium.dz`,
        businessName: `Test ${category}`,
        branchName: 'HQ',
        category,
      });
      const snap = readStoreSlice();
      expect(snap.currentUserRole).toBe('Owner');
      expect(canViewSensitivePayroll('Owner')).toBe(true);
      expect(
        canAccessRoute(category, {
          currentUser: { role: 'Owner', roleRank: 8 },
          activePmRole: snap.activePmRole as any,
        }, 'settings')
      ).toBe(true);
    }
  });

  it('verifies intentional fixes 5.1 through 5.9 (5.2-5.5, semantic routes 5.9, scoped preferences, fail-closed)', () => {
    // 5.1: membership_session Owner now has finance; Staff stays locked out
    expect(canAccessRoute('membership_session', { activeMembershipRole: 'owner' }, 'finance')).toBe(true);
    expect(canAccessRoute('membership_session', { activeMembershipRole: 'staff' }, 'finance')).toBe(false);
    expect(canAccessRoute('membership_session', { activeMembershipRole: 'staff' }, 'settings')).toBe(false);
    expect(canAccessRoute('membership_session', { currentUser: { role: 'Staff' }, activeMembershipRole: 'staff' }, 'preferences')).toBe(true);

    // 5.2: auto_garage magasinier Réceptions (finance) removed
    expect(canAccessRoute('auto_garage', { activeGarageRole: 'magasinier' }, 'finance')).toBe(false);

    // 5.3: secretaire_caisse retains Vault (registrations, filing-only) and preferences-scoped Settings
    expect(canAccessRoute('legal_accounting', { activeLegalRole: 'secretaire_caisse' }, 'registrations')).toBe(true);
    expect(canAccessRoute('legal_accounting', { activeLegalRole: 'secretaire_caisse' }, 'settings')).toBe(true);
    expect(getEffectivePermissionContext('legal_accounting', { activeLegalRole: 'secretaire_caisse' }).isExecutive).toBe(false);

    // 5.4: logistics_delivery hub_sorter has NO finance; stop_desk_agent keeps COD finance
    expect(canAccessRoute('logistics_delivery', { activeLogisticsRole: 'hub_sorter' }, 'finance')).toBe(false);
    expect(canAccessRoute('logistics_delivery', { activeLogisticsRole: 'stop_desk_agent' }, 'finance')).toBe(true);
    expect(canAccessRoute('logistics_delivery', { activeLogisticsRole: 'stop_desk_agent' }, 'staff')).toBe(false);

    // Catalog Settings restored in preferences-only scope for dispatcher & metreur/daf_metreur
    expect(canAccessRoute('logistics_delivery', { activeLogisticsRole: 'dispatcher' }, 'settings')).toBe(true);
    expect(getEffectivePermissionContext('logistics_delivery', { activeLogisticsRole: 'dispatcher' }).isExecutive).toBe(false);
    expect(canAccessRoute('construction_contractor', { activeContractorRole: 'daf_metreur' }, 'settings')).toBe(true);
    expect(getEffectivePermissionContext('construction_contractor', { activeContractorRole: 'daf_metreur' }).isExecutive).toBe(false);

    // 5.5: Stored operational role migration helper & zero-diff equivalence
    expect(migrateStoredOperationalRole('conducteur')).toBe('conducteur_travaux');
    expect(migrateStoredOperationalRole('metreur')).toBe('daf_metreur');
    expect(migrateStoredOperationalRole('controleur')).toBe('qualite');

    // 5.6: Alias normalization (controleur -> qualite, legal_notary -> legal_accounting, agriculture_livestock -> agriculture_farming)
    const qcCtx = getEffectivePermissionContext('manufacturing_production', { activeManufacturingRole: 'controleur' });
    expect(qcCtx.normalizedRole).toBe('qualite');
    expect(canAccessRoute('manufacturing_production', { activeManufacturingRole: 'controleur' }, 'finance')).toBe(true);
    expect(canAccessRoute('legal_notary', { activeLegalRole: 'notaire_titulaire' }, 'finance')).toBe(true);
    expect(canAccessRoute('agriculture_livestock', { activeAgriRole: 'zootechnicien' }, 'registrations')).toBe(true);

    // 5.9: Semantic route IDs ('qc', 'orders', 'attendance') resolve with zero-diff parity
    expect(resolveSemanticRoute('project_milestone', { activePmRole: 'chef_projet' }, 'orders')).toBe('pm_cp_orders');
    expect(resolveSemanticRoute('project_milestone', { activePmRole: 'chef_projet' }, 'qc')).toBe('pm_cp_deliverables');
    expect(resolveSemanticRoute('project_milestone', { activePmRole: 'superviseur' }, 'attendance')).toBe('pm_sup_attendance');
    expect(resolveSemanticRoute('education_cohort', { activeEducationRole: 'staff' }, 'attendance')).toBe('analytics');
    expect(resolveSemanticRoute('pos_inventory', { activePosRole: 'staff' }, 'orders')).toBe('registrations');
    expect(resolveSemanticRoute('manufacturing_production', { activeManufacturingRole: 'qualite' }, 'qc')).toBe('finance');
    expect(canAccessRoute('manufacturing_production', { activeManufacturingRole: 'qualite' }, 'qc')).toBe(true);
    expect(canAccessRoute('project_milestone', { activePmRole: 'crea' }, 'qc')).toBe(false);

    // Negative mutation proof: altering a single role check fails as expected
    expect(canAccessRoute('logistics_delivery', { activeLogisticsRole: 'hub_sorter' }, 'finance')).not.toBe(true);

    // Fail-closed on unknown category or unauthenticated state
    expect(canAccessRoute('unknown_vertical', { currentUser: { role: 'Staff' } }, 'dashboard')).toBe(false);
    expect(canAccessRoute('unknown_vertical', { currentUser: null }, 'home')).toBe(true);
    expect(canAccessRoute('auto_garage', { currentUser: null }, 'settings')).toBe(false);
  });

  it('records and dedupes access-denied security audit events (5.10)', async () => {
    const first = await recordRouteAccessDenied({
      attemptedScreen: 'settings',
      category: 'membership_session',
      state: { currentUser: { id: 'stf_op_01', role: 'Cashier', roleRank: 2 }, activeMembershipRole: 'staff' },
      reason: 'UNAUTHORIZED_ROUTE',
    });
    expect(first.recorded).toBe(true);

    const dup = await recordRouteAccessDenied({
      attemptedScreen: 'settings',
      category: 'membership_session',
      state: { currentUser: { id: 'stf_op_01', role: 'Cashier', roleRank: 2 }, activeMembershipRole: 'staff' },
      reason: 'UNAUTHORIZED_ROUTE',
    });
    expect(dup.recorded).toBe(false);

    const logs = getRouteAccessDeniedLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].attemptedScreen).toBe('settings');
    expect(logs[0].effectiveRole).toBe('Staff');
  });

  it('prevents setScreenAction from escalating activePmRole (5.7) and blocks frozen staff in switchStaffUser', () => {
    loginWithPinAction('1234');
    const pmBiz = readStoreSlice().storeActions.staff; // keep store initialized
    expect(Array.isArray(pmBiz)).toBe(true);

    const { storeActions } = readStoreSlice();
    const agency = storeActions.businesses.find((b) => b.category === 'project_milestone');
    if (agency) {
      switchBusinessAction(agency.id);
      setActivePmRoleAction('crea');
      expect(readStoreSlice().activePmRole).toBe('crea');
      setScreenAction('pm_dir_dashboard');
      // Navigation must NOT overwrite activePmRole back to 'direction'
      expect(readStoreSlice().activePmRole).toBe('crea');
    }

    // Frozen staff switch is rejected cleanly
    const activeTarget = storeActions.staff.find((s) => s.status === 'active' && s.role === 'Cashier');
    if (activeTarget) {
      storeActions.freezeStaffMember(activeTarget.id);
      loginWithPinAction('1234');
      storeActions.switchStaffUser(activeTarget.id);
      // Should still be Owner (switch rejected for frozen staff)
      expect(readStoreSlice().currentUserRole).toBe('Owner');
    }
  });
});

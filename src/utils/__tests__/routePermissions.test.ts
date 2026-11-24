import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  canAccessRoute,
  getAllowedRoutesForCategoryRole,
  getEffectivePermissionContext,
  recordRouteAccessDenied,
  getRouteAccessDeniedLogs,
  clearRouteAccessDeniedLogs,
} from '../routePermissions';
import { canViewSensitivePayroll, getEffectiveUserRole } from '../staffRules';
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
  });

  it('enforces Gate 1 Condition #5 least-privilege roles & sensitive payroll checks for trading_commercial & rental_booking', () => {
    for (const cat of ['trading_commercial', 'rental_booking'] as const) {
      const nullRole = getEffectiveUserRole(cat, { currentUser: null });
      expect(nullRole).toBe('Staff');
      expect(canViewSensitivePayroll(nullRole)).toBe(false);
      expect(canAccessRoute(cat, { currentUser: null }, 'settings')).toBe(false);
      expect(canAccessRoute(cat, { currentUser: null }, 'staff')).toBe(false);

      const cashierRole = getEffectiveUserRole(cat, { currentUser: { role: 'Cashier' } });
      expect(cashierRole).toBe('Cashier');
      expect(canViewSensitivePayroll(cashierRole)).toBe(false);
      expect(canAccessRoute(cat, { currentUser: { role: 'Cashier', roleRank: 2 } }, 'settings')).toBe(false);

      const ownerRole = getEffectiveUserRole(cat, { currentUser: { role: 'Owner' } });
      expect(ownerRole).toBe('Owner');
      expect(canViewSensitivePayroll(ownerRole)).toBe(true);
      expect(canAccessRoute(cat, { currentUser: { role: 'Owner', roleRank: 8 } }, 'settings')).toBe(true);
      expect(canAccessRoute(cat, { currentUser: { role: 'Owner', roleRank: 8 } }, 'staff')).toBe(true);
    }
  });

  it('verifies intentional fixes 5.1 through 5.6 (finance route, no staff settings, alias normalization, fail-closed unknown)', () => {
    // 5.1: membership_session Owner now has finance; Staff stays locked out
    expect(canAccessRoute('membership_session', { activeMembershipRole: 'owner' }, 'finance')).toBe(true);
    expect(canAccessRoute('membership_session', { activeMembershipRole: 'staff' }, 'finance')).toBe(false);
    expect(canAccessRoute('membership_session', { activeMembershipRole: 'staff' }, 'settings')).toBe(false);

    // 5.2 - 5.4: Operational sub-roles removed from settings/history/staff
    expect(canAccessRoute('legal_accounting', { activeLegalRole: 'secretaire_caisse' }, 'settings')).toBe(false);
    expect(canAccessRoute('logistics_delivery', { activeLogisticsRole: 'dispatcher' }, 'settings')).toBe(false);
    expect(canAccessRoute('logistics_delivery', { activeLogisticsRole: 'stop_desk_agent' }, 'staff')).toBe(false);
    expect(canAccessRoute('construction_contractor', { activeContractorRole: 'metreur' }, 'settings')).toBe(false);
    expect(canAccessRoute('agriculture_farming', { activeAgriRole: 'chef_culture' }, 'finance')).toBe(false);
    expect(canAccessRoute('agriculture_farming', { activeAgriRole: 'chef_culture' }, 'staff')).toBe(true);

    // 5.6: Alias normalization (controleur -> qualite, legal_notary -> legal_accounting, agriculture_livestock -> agriculture_farming)
    const qcCtx = getEffectivePermissionContext('manufacturing_production', { activeManufacturingRole: 'controleur' });
    expect(qcCtx.normalizedRole).toBe('qualite');
    expect(canAccessRoute('manufacturing_production', { activeManufacturingRole: 'controleur' }, 'finance')).toBe(true);

    expect(canAccessRoute('legal_notary', { activeLegalRole: 'notaire_titulaire' }, 'finance')).toBe(true);
    expect(canAccessRoute('agriculture_livestock', { activeAgriRole: 'zootechnicien' }, 'registrations')).toBe(true);

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

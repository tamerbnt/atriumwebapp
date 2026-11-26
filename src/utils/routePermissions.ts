import { BusinessCategory, RbacPermissionRule } from '../types/index';
import {
  canAccessStaffScreen,
  getEffectiveUserRole,
  normalizeBusinessCategory,
  normalizeOperationalRole,
} from './staffRules';
import { can as rbacCan, mapScreenToRbacResource, normalizeRbacRole } from './rbacEngine';
import { auditService } from '../lib/supabase/services/auditService';

export interface RolePermissionState {
  currentUser?: {
    id?: string;
    role?: string;
    roleRank?: number;
  } | null;
  accountId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  activePmRole?: string;
  activeGarageRole?: string;
  activeRealEstateRole?: string;
  activeManufacturingRole?: string;
  activeLegalRole?: string;
  activeLogisticsRole?: string;
  activeContractorRole?: string;
  activeAgriRole?: string;
  activeMembershipRole?: string;
  activeAppointmentRole?: string;
  activePosRole?: string;
  activeEducationRole?: string;
  rbacMatrix?: RbacPermissionRule[];
}

export interface EffectivePermissionContext {
  category: string;
  effectiveRole: string;
  normalizedRole: string;
  rawRole: string;
  roleRank: number;
  isExecutive: boolean;
}

const EXECUTIVE_ROLES = new Set([
  'owner',
  'gerant',
  'directeur_general',
  'admin',
  'direction',
  'avocat_associe',
  'notaire_titulaire',
  'expert_comptable',
]);

export const PREFERENCES_ONLY_SETTINGS_ROLES = new Set([
  'secretaire_caisse',
  'dispatcher',
  'metreur',
  'daf_metreur',
]);

export function resolveSemanticRoute(
  category: BusinessCategory | string,
  _state: RolePermissionState,
  screen: string
): string {
  const canonicalCategory = normalizeBusinessCategory(category);
  switch (screen) {
    case 'qc':
      if (canonicalCategory === 'manufacturing_production') return 'finance';
      if (canonicalCategory === 'construction_contractor') return 'scheduler';
      if (canonicalCategory === 'project_milestone') return 'pm_cp_deliverables';
      return 'qc';
    case 'orders':
      if (canonicalCategory === 'project_milestone') return 'pm_cp_orders';
      if (canonicalCategory === 'auto_garage' || canonicalCategory === 'manufacturing_production') {
        return 'scheduler';
      }
      if (canonicalCategory === 'pos_inventory') return 'registrations';
      if (canonicalCategory === 'trading_commercial') return 'trading_purchases';
      return 'orders';
    case 'attendance':
      if (canonicalCategory === 'project_milestone') return 'pm_sup_attendance';
      if (canonicalCategory === 'education_cohort') return 'analytics';
      if (canonicalCategory === 'construction_contractor') return 'scheduler';
      if (canonicalCategory === 'agriculture_farming') return 'shop';
      return 'staff';
    case 'pm_dir_projects':
      return 'pm_dir_dashboard';
    case 'pm_cp_files':
      return 'pm_cp_deliverables';
    default:
      return screen;
  }
}

export function getEffectivePermissionContext(
  category: BusinessCategory | string,
  state: RolePermissionState
): EffectivePermissionContext {
  const canonicalCategory = normalizeBusinessCategory(category);
  const effectiveRole = getEffectiveUserRole(canonicalCategory, state);
  const normalizedRole = normalizeOperationalRole(effectiveRole).toLowerCase();
  const rawRole = normalizeOperationalRole(state.currentUser?.role || '').toLowerCase();
  const roleRank = Number(state.currentUser?.roleRank ?? 0);

  const isExecutive =
    EXECUTIVE_ROLES.has(normalizedRole) ||
    (['freelance_solo', 'trading_commercial', 'rental_booking', 'medical_clinic'].includes(
      canonicalCategory
    ) &&
      (roleRank >= 8 || EXECUTIVE_ROLES.has(rawRole)));

  return {
    category: canonicalCategory,
    effectiveRole,
    normalizedRole,
    rawRole,
    roleRank,
    isExecutive,
  };
}

const PM_DIRECTION_ROUTES = new Set([
  'home',
  'dashboard',
  'scheduler',
  'registrations',
  'analytics',
  'members',
  'finance',
  'shop',
  'history',
  'settings',
  'staff',
  'pm_dir_dashboard',
  'pm_dir_new_project',
  'pm_dir_projects',
  'pm_dir_approvals',
  'pm_dir_reports',
  'pm_cp_projects',
  'pm_cp_catalog',
  'pm_cp_orders',
  'pm_cp_files',
  'pm_cp_deliverables',
  'pm_cp_expenses',
  'pm_crea_kanban',
  'pm_crea_production',
  'pm_crea_upload',
  'pm_crea_briefs',
  'pm_sup_missions',
  'pm_sup_attendance',
  'pm_sup_staffing',
  'pm_sup_expenses',
  'pm_rh_talents',
  'pm_rh_dossier',
  'pm_rh_portal',
  'pm_rh_walkin',
  'pm_compta_payroll',
  'pm_compta_ccp',
  'pm_compta_expenses',
  'pm_compta_stock',
]);

const PM_ROLE_ROUTES: Record<string, Set<string>> = {
  direction: PM_DIRECTION_ROUTES,
  owner: PM_DIRECTION_ROUTES,
  gerant: PM_DIRECTION_ROUTES,
  directeur_general: PM_DIRECTION_ROUTES,
  admin: PM_DIRECTION_ROUTES,
  chef_projet: new Set([
    'home',
    'pm_cp_projects',
    'pm_cp_catalog',
    'pm_cp_orders',
    'pm_cp_files',
    'pm_cp_deliverables',
    'pm_cp_expenses',
    'scheduler',
    'staff',
  ]),
  crea: new Set([
    'home',
    'pm_crea_kanban',
    'pm_crea_production',
    'pm_crea_upload',
    'pm_crea_briefs',
    'registrations',
  ]),
  superviseur: new Set([
    'home',
    'pm_sup_missions',
    'pm_sup_attendance',
    'pm_sup_staffing',
    'pm_sup_expenses',
    'analytics',
  ]),
  rh: new Set([
    'home',
    'pm_rh_talents',
    'pm_rh_dossier',
    'pm_rh_portal',
    'pm_rh_walkin',
    'members',
    'staff',
  ]),
  compta: new Set([
    'home',
    'pm_compta_payroll',
    'pm_compta_ccp',
    'pm_compta_expenses',
    'pm_compta_stock',
    'finance',
    'shop',
  ]),
};

const ROUTE_ALLOWLIST_BY_CATEGORY_ROLE: Record<string, Record<string, Set<string>>> = {
  membership_session: {
    owner: new Set([
      'home',
      'dashboard',
      'members',
      'registrations',
      'history',
      'shop',
      'scheduler',
      'finance',
      'analytics',
      'staff',
      'settings',
    ]),
    staff: new Set(['home', 'dashboard', 'members', 'registrations']),
  },
  appointment_service: {
    owner: new Set([
      'home',
      'dashboard',
      'scheduler',
      'members',
      'shop',
      'history',
      'analytics',
      'finance',
      'registrations',
      'staff',
      'settings',
    ]),
    staff: new Set(['home', 'dashboard', 'scheduler', 'members']),
  },
  pos_inventory: {
    owner: new Set([
      'home',
      'dashboard',
      'shop',
      'scheduler',
      'registrations',
      'members',
      'history',
      'finance',
      'analytics',
      'staff',
      'settings',
    ]),
    staff: new Set(['home', 'dashboard', 'shop', 'scheduler', 'registrations', 'members']),
  },
  education_cohort: {
    owner: new Set([
      'home',
      'dashboard',
      'scheduler',
      'members',
      'shop',
      'registrations',
      'analytics',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    staff: new Set(['home', 'dashboard', 'analytics', 'scheduler', 'members', 'shop', 'registrations']),
  },
  auto_garage: {
    gerant: new Set([
      'home',
      'dashboard',
      'scheduler',
      'registrations',
      'members',
      'shop',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    reception: new Set(['home', 'scheduler', 'registrations', 'members', 'finance', 'dashboard', 'shop']),
    mecanicien: new Set(['home', 'scheduler', 'registrations', 'dashboard', 'members', 'shop']),
    magasinier: new Set(['home', 'shop', 'dashboard', 'scheduler', 'registrations']),
    caisse: new Set(['home', 'finance', 'dashboard', 'members', 'scheduler']),
  },
  real_estate: {
    direction: new Set([
      'home',
      'dashboard',
      'realestate_mandates',
      'shop',
      'members',
      'scheduler',
      'registrations',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    negociateur: new Set(['home', 'dashboard', 'realestate_mandates', 'shop', 'members', 'registrations']),
    gestionnaire_locatif: new Set(['home', 'dashboard', 'members', 'scheduler', 'finance', 'registrations']),
    notaire_compta: new Set(['home', 'dashboard', 'finance', 'scheduler', 'realestate_mandates', 'shop']),
  },
  manufacturing_production: {
    gerant: new Set([
      'home',
      'dashboard',
      'scheduler',
      'registrations',
      'shop',
      'members',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    chef_atelier: new Set(['home', 'dashboard', 'scheduler', 'registrations', 'shop', 'members', 'finance', 'staff']),
    operateur: new Set(['home', 'dashboard', 'scheduler', 'registrations']),
    magasinier: new Set(['home', 'dashboard', 'shop', 'members', 'finance']),
    qualite: new Set(['home', 'dashboard', 'scheduler', 'registrations', 'finance']),
  },
  legal_accounting: {
    avocat_associe: new Set([
      'home',
      'dashboard',
      'members',
      'scheduler',
      'registrations',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    notaire_titulaire: new Set([
      'home',
      'dashboard',
      'members',
      'scheduler',
      'registrations',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    expert_comptable: new Set([
      'home',
      'dashboard',
      'members',
      'scheduler',
      'registrations',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    avocat_collaborateur: new Set(['home', 'dashboard', 'members', 'scheduler', 'registrations', 'finance', 'history']),
    clerc_notaire: new Set(['home', 'dashboard', 'members', 'scheduler', 'registrations', 'finance', 'history']),
    secretaire_caisse: new Set([
      'home',
      'dashboard',
      'finance',
      'members',
      'scheduler',
      'registrations',
      'settings',
    ]),
  },
  logistics_delivery: {
    gerant: new Set([
      'home',
      'dashboard',
      'members',
      'scheduler',
      'registrations',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    dispatcher: new Set([
      'home',
      'scheduler',
      'members',
      'registrations',
      'dashboard',
      'staff',
      'settings',
    ]),
    hub_sorter: new Set(['home', 'dashboard', 'registrations', 'members', 'scheduler']),
    stop_desk_agent: new Set(['home', 'dashboard', 'registrations', 'members', 'scheduler', 'finance']),
  },
  construction_contractor: {
    gerant: new Set([
      'home',
      'dashboard',
      'members',
      'registrations',
      'shop',
      'scheduler',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    conducteur: new Set(['home', 'dashboard', 'members', 'registrations', 'shop', 'scheduler', 'finance', 'staff']),
    chef_chantier: new Set(['home', 'dashboard', 'scheduler', 'members', 'registrations', 'shop', 'finance', 'staff']),
    metreur: new Set([
      'home',
      'dashboard',
      'shop',
      'scheduler',
      'finance',
      'members',
      'registrations',
      'settings',
    ]),
    comptable: new Set(['home', 'dashboard', 'finance', 'scheduler', 'shop', 'members']),
  },
  agriculture_farming: {
    gerant: new Set([
      'home',
      'dashboard',
      'members',
      'scheduler',
      'shop',
      'registrations',
      'finance',
      'history',
      'staff',
      'settings',
    ]),
    chef_culture: new Set(['home', 'members', 'scheduler', 'shop', 'staff']),
    zootechnicien: new Set(['home', 'registrations']),
    magasinier: new Set(['home', 'finance', 'shop']),
  },
};

const OPERATIONAL_ROUTES_NO_SWITCHER: Record<string, Set<string>> = {
  freelance_solo: new Set([
    'home',
    'dashboard',
    'analytics',
    'members',
    'registrations',
    'scheduler',
    'shop',
    'finance',
  ]),
  trading_commercial: new Set([
    'home',
    'dashboard',
    'trading_dashboard',
    'trading_sales',
    'registrations',
    'trading_purchases',
    'scheduler',
    'trading_inventory',
    'shop',
    'trading_directory',
    'members',
    'trading_catalog',
    'trading_finance',
    'finance',
    'analytics',
  ]),
  rental_booking: new Set(['home', 'dashboard', 'scheduler', 'registrations', 'shop', 'members', 'finance', 'analytics']),
  medical_clinic: new Set([
    'home',
    'dashboard',
    'scheduler',
    'agenda',
    'members',
    'shop',
    'registrations',
    'finance',
  ]),
};

export function canAccessRoute(
  category: BusinessCategory | string,
  state: RolePermissionState,
  screen: string,
  options?: { isDev?: boolean }
): boolean {
  if (!screen) return false;

  const ctx = getEffectivePermissionContext(category, state);
  const targetScreen = resolveSemanticRoute(ctx.category, state, screen);

  if (targetScreen === 'home') return true;
  if (targetScreen === 'chart_catalog') return Boolean(options?.isDev);

  if (targetScreen === 'preferences') {
    return Boolean(state.currentUser || ctx.rawRole || ctx.normalizedRole !== 'staff');
  }

  // Evaluate explicit owner-configured RBAC matrix cell override when configured for this business
  const mappedResource = mapScreenToRbacResource(ctx.category, targetScreen);
  if (mappedResource && state.rbacMatrix && state.rbacMatrix.length > 0) {
    const roleKey = normalizeRbacRole(ctx.effectiveRole);
    const hasExplicitRule = state.rbacMatrix.some(
      (r) =>
        !r.deletedAt &&
        (!state.businessId || r.businessId === state.businessId) &&
        normalizeRbacRole(r.roleKey) === roleKey &&
        r.resource === mappedResource &&
        r.action === 'view'
    );
    if (hasExplicitRule) {
      return rbacCan(
        {
          id: state.currentUser?.id,
          role: ctx.effectiveRole,
          roleRank: ctx.roleRank,
        },
        mappedResource,
        'view',
        {
          category: ctx.category,
          businessId: state.businessId,
          rbacMatrix: state.rbacMatrix,
          isExecutiveOverride: ctx.isExecutive,
        }
      );
    }
  }

  if (targetScreen === 'staff') {
    return canAccessStaffScreen(ctx.category, ctx.effectiveRole);
  }

  if (targetScreen === 'settings') {
    return (
      ctx.isExecutive ||
      PREFERENCES_ONLY_SETTINGS_ROLES.has(ctx.normalizedRole) ||
      PREFERENCES_ONLY_SETTINGS_ROLES.has(ctx.rawRole)
    );
  }

  if (ctx.category === 'project_milestone') {
    const allowedSet = PM_ROLE_ROUTES[ctx.normalizedRole];
    return Boolean(allowedSet?.has(targetScreen));
  }

  const noSwitcherRoutes = OPERATIONAL_ROUTES_NO_SWITCHER[ctx.category];
  if (noSwitcherRoutes) {
    if (ctx.isExecutive) {
      return noSwitcherRoutes.has(targetScreen) || targetScreen === 'history' || targetScreen === 'settings';
    }
    return noSwitcherRoutes.has(targetScreen);
  }

  const categoryMap = ROUTE_ALLOWLIST_BY_CATEGORY_ROLE[ctx.category];
  if (categoryMap) {
    if (categoryMap[ctx.normalizedRole]) {
      return categoryMap[ctx.normalizedRole].has(targetScreen);
    }
    if (ctx.isExecutive) {
      const execKey = Object.keys(categoryMap).find((k) => EXECUTIVE_ROLES.has(k));
      if (execKey && categoryMap[execKey]) {
        return categoryMap[execKey].has(targetScreen);
      }
    }
    // Fail-closed for unknown or unauthenticated staff role in multi-role/dual-role verticals
    return false;
  }

  return false;
}

export function getAllowedRoutesForCategoryRole(
  category: BusinessCategory | string,
  state: RolePermissionState,
  options?: { isDev?: boolean }
): string[] {
  const canonicalCategory = normalizeBusinessCategory(category);
  if (canonicalCategory === 'project_milestone') {
    return Array.from(PM_DIRECTION_ROUTES).filter((screen) => canAccessRoute(canonicalCategory, state, screen, options));
  }
  const allCandidateScreens = new Set<string>([
    'home',
    'dashboard',
    'members',
    'registrations',
    'shop',
    'scheduler',
    'agenda',
    'finance',
    'history',
    'analytics',
    'staff',
    'settings',
    'realestate_mandates',
    'trading_dashboard',
    'trading_sales',
    'trading_purchases',
    'trading_inventory',
    'trading_directory',
    'trading_catalog',
    'trading_finance',
  ]);
  return Array.from(allCandidateScreens).filter((screen) => canAccessRoute(canonicalCategory, state, screen, options));
}

export interface AccessDeniedAuditEvent {
  attemptedScreen: string;
  category: string;
  effectiveRole: string;
  rawRole: string;
  userId?: string | null;
  reason: string;
  occurredAt: string;
}

const SECURITY_AUDIT_STORAGE_KEY = 'atrium_security_audit_logs_v1';
const MAX_LOCAL_SECURITY_AUDIT_LOGS = 200;
const recentDeniedKeys = new Map<string, number>();

export function getRouteAccessDeniedLogs(): AccessDeniedAuditEvent[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SECURITY_AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearRouteAccessDeniedLogs(): void {
  recentDeniedKeys.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SECURITY_AUDIT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage unavailability
  }
}

export async function recordRouteAccessDenied(params: {
  attemptedScreen: string;
  category: string;
  state: RolePermissionState;
  reason?: string;
}): Promise<{ recorded: boolean; event: AccessDeniedAuditEvent }> {
  const ctx = getEffectivePermissionContext(params.category, params.state);
  const userId = params.state.currentUser?.id || 'anonymous';
  const dedupeKey = `${userId}:${ctx.category}:${ctx.effectiveRole}:${params.attemptedScreen}`;
  const nowMs = Date.now();
  const prevMs = recentDeniedKeys.get(dedupeKey);

  const event: AccessDeniedAuditEvent = {
    attemptedScreen: params.attemptedScreen,
    category: ctx.category,
    effectiveRole: ctx.effectiveRole,
    rawRole: ctx.rawRole || 'none',
    userId,
    reason: params.reason || 'ROLE_NOT_AUTHORIZED',
    occurredAt: new Date(nowMs).toISOString(),
  };

  if (prevMs !== undefined && nowMs - prevMs < 4000) {
    return { recorded: false, event };
  }
  recentDeniedKeys.set(dedupeKey, nowMs);

  try {
    if (typeof localStorage !== 'undefined') {
      const current = getRouteAccessDeniedLogs();
      const next = [event, ...current].slice(0, MAX_LOCAL_SECURITY_AUDIT_LOGS);
      localStorage.setItem(SECURITY_AUDIT_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore local storage quota errors
  }

  await auditService.logAccessDeniedEvent({
    accountId: params.state.accountId ?? null,
    businessId: params.state.businessId ?? null,
    branchId: params.state.branchId ?? null,
    actorStaffId: params.state.currentUser?.id ?? null,
    attemptedScreen: event.attemptedScreen,
    category: event.category,
    effectiveRole: event.effectiveRole,
    rawRole: event.rawRole,
    reason: event.reason,
    occurredAt: event.occurredAt,
  });

  return { recorded: true, event };
}

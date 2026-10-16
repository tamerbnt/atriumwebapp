import { useState, useEffect } from 'react';
import {
  Account,
  AccountSubscription,
  Appointment,
  AppointmentStatus,
  AppTheme,
  Business,
  BusinessCategory,
  Branch,
  CurrentUser,
  Device,
  Member,
  MemberStatus,
  MembershipPlan,
  OnboardingParams,
  Product,
  RegistrationLead,
  Sale,
  ScheduleEvent,
  ServiceItem,
  StaffMember,
  StaffRole,
  SubscriptionPlan,
  SupportedLanguage,
  FreelanceClient,
  FreelanceProject,
  FreelanceDeliverable,
  TimeLogEntry,
  FreelanceInvoice,
  FreelanceProposal,
  FreelanceExpense,
  ActiveTimerState,
  CurrencyCode,
  DeliverableStage,
  InvoiceStatus,
  ProposalStatus,
} from '../types/index';
import {
  INITIAL_ACCOUNT,
  INITIAL_APPOINTMENTS,
  INITIAL_BRANCHES,
  INITIAL_BUSINESSES,
  INITIAL_DEVICES,
  INITIAL_LEADS,
  INITIAL_MEMBERS,
  INITIAL_PLANS,
  INITIAL_PLANS_BY_BRANCH,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_SALON_SERVICES,
  INITIAL_SCHEDULE,
  INITIAL_STAFF,
  INITIAL_FREELANCE_CLIENTS,
  INITIAL_FREELANCE_PROJECTS,
  INITIAL_TIME_LOGS,
  INITIAL_FREELANCE_INVOICES,
  INITIAL_FREELANCE_PROPOSALS,
  INITIAL_FREELANCE_EXPENSES,
  INITIAL_ACTIVE_TIMER,
} from './seedData';
import { checkQuota, getCategoryTerminology, validateVoucherCode } from '../utils/rules';
import {
  isSupabaseConfigured,
  authService,
  tenantService,
  licenseService,
  memberService,
  staffService,
  realtimeService,
} from '../lib/supabase/index';

const STORAGE_KEY = 'atrium_erp_desktop_v2';

export type ActiveScreen =
  | 'dashboard'
  | 'analytics'
  | 'members'
  | 'registrations'
  | 'shop'
  | 'scheduler'
  | 'finance'
  | 'history'
  | 'settings';

export type SupabaseStatus = 'connected' | 'connecting' | 'offline' | 'unconfigured';

interface AppState {
  account: Account;
  subscription: AccountSubscription;
  businesses: Business[];
  branches: Branch[];
  currentBusinessId: string;
  currentBranchId: string;
  activeScreen: ActiveScreen;
  theme: AppTheme;
  language: SupportedLanguage;
  members: Member[];
  leads: RegistrationLead[];
  plansByBranch: Record<string, MembershipPlan[]>;
  products: Product[];
  sales: Sale[];
  staff: StaffMember[];
  schedule: ScheduleEvent[];
  devices: Device[];
  appointments: Appointment[];
  servicesCatalog: ServiceItem[];
  selectedMemberId: string | null;
  isDetailOpen: boolean;
  currentUser: CurrentUser;
  isAuthenticated: boolean;
  isOnboardingOpen: boolean;
  isFastSwitchOpen: boolean;
  // Supabase Integration & Sync
  supabaseStatus: SupabaseStatus;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncErrorMessage: string | null;
  // Freelancer & Solo Practitioner (Category 16)
  freelanceClients: FreelanceClient[];
  freelanceProjects: FreelanceProject[];
  timeLogs: TimeLogEntry[];
  freelanceInvoices: FreelanceInvoice[];
  freelanceProposals: FreelanceProposal[];
  freelanceExpenses: FreelanceExpense[];
  activeTimer: ActiveTimerState;
}

const DEFAULT_USER: CurrentUser = {
  id: 'stf_01',
  fullName: 'Amine Bentouati (Tamer)',
  email: 'bentouatitamer@gmail.com',
  role: 'Owner',
  roleRank: 8,
  pinCode: '1234',
};

const DEFAULT_STATE: AppState = {
  account: INITIAL_ACCOUNT,
  subscription: {
    id: 'sub_active',
    accountId: INITIAL_ACCOUNT.id,
    planId: 'plan_trial',
    status: 'trial',
    isLifetime: false,
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    plan: INITIAL_PLANS[0],
  },
  businesses: INITIAL_BUSINESSES,
  branches: INITIAL_BRANCHES,
  currentBusinessId: INITIAL_BUSINESSES[0].id,
  currentBranchId: INITIAL_BRANCHES[0].id,
  activeScreen: 'dashboard',
  theme: 'light',
  language: 'en',
  members: INITIAL_MEMBERS,
  leads: INITIAL_LEADS,
  plansByBranch: INITIAL_PLANS_BY_BRANCH,
  products: INITIAL_PRODUCTS,
  sales: INITIAL_SALES,
  staff: INITIAL_STAFF,
  schedule: INITIAL_SCHEDULE,
  devices: INITIAL_DEVICES,
  appointments: INITIAL_APPOINTMENTS,
  servicesCatalog: INITIAL_SALON_SERVICES,
  selectedMemberId: INITIAL_MEMBERS[0]?.id || null,
  isDetailOpen: false,
  currentUser: DEFAULT_USER,
  isAuthenticated: true,
  isOnboardingOpen: false,
  isFastSwitchOpen: false,
  supabaseStatus: isSupabaseConfigured() ? 'connecting' : 'unconfigured',
  isSyncing: false,
  lastSyncedAt: null,
  syncErrorMessage: null,
  // Freelancer & Solo Practitioner
  freelanceClients: INITIAL_FREELANCE_CLIENTS,
  freelanceProjects: INITIAL_FREELANCE_PROJECTS,
  timeLogs: INITIAL_TIME_LOGS,
  freelanceInvoices: INITIAL_FREELANCE_INVOICES,
  freelanceProposals: INITIAL_FREELANCE_PROPOSALS,
  freelanceExpenses: INITIAL_FREELANCE_EXPENSES,
  activeTimer: INITIAL_ACTIVE_TIMER,
};

// Global reactive subscribers
type Listener = () => void;
let globalState: AppState = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        appointments: parsed.appointments && parsed.appointments.length > 0 ? parsed.appointments : INITIAL_APPOINTMENTS,
        servicesCatalog: parsed.servicesCatalog && parsed.servicesCatalog.length > 0 ? parsed.servicesCatalog : INITIAL_SALON_SERVICES,
        freelanceClients: parsed.freelanceClients && parsed.freelanceClients.length > 0 ? parsed.freelanceClients : INITIAL_FREELANCE_CLIENTS,
        freelanceProjects: parsed.freelanceProjects && parsed.freelanceProjects.length > 0 ? parsed.freelanceProjects : INITIAL_FREELANCE_PROJECTS,
        timeLogs: parsed.timeLogs && parsed.timeLogs.length > 0 ? parsed.timeLogs : INITIAL_TIME_LOGS,
        freelanceInvoices: parsed.freelanceInvoices && parsed.freelanceInvoices.length > 0 ? parsed.freelanceInvoices : INITIAL_FREELANCE_INVOICES,
        freelanceProposals: parsed.freelanceProposals && parsed.freelanceProposals.length > 0 ? parsed.freelanceProposals : INITIAL_FREELANCE_PROPOSALS,
        freelanceExpenses: parsed.freelanceExpenses && parsed.freelanceExpenses.length > 0 ? parsed.freelanceExpenses : INITIAL_FREELANCE_EXPENSES,
        activeTimer: parsed.activeTimer || INITIAL_ACTIVE_TIMER,
        currentUser: parsed.currentUser || DEFAULT_USER,
        isAuthenticated: parsed.isAuthenticated !== undefined ? parsed.isAuthenticated : true,
        isOnboardingOpen: false,
        isFastSwitchOpen: false,
        supabaseStatus: isSupabaseConfigured() ? 'connecting' : 'unconfigured',
        isSyncing: false,
      };
    }
  } catch (e) {
    console.warn('Failed to load Atrium state from localStorage', e);
  }
  return DEFAULT_STATE;
})();

const listeners = new Set<Listener>();

function notify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
  } catch (e) {
    console.warn('Failed to persist state', e);
  }
  listeners.forEach((l) => l());
}

const EMPTY_PLANS: MembershipPlan[] = [];

export function useAtriumStore() {
  const [state, setState] = useState<AppState>(globalState);

  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const syncWithSupabase = async () => {
    if (!isSupabaseConfigured()) {
      globalState = {
        ...globalState,
        supabaseStatus: 'unconfigured',
        isSyncing: false,
      };
      notify();
      return;
    }

    globalState = {
      ...globalState,
      isSyncing: true,
      syncErrorMessage: null,
    };
    notify();

    try {
      const session = await authService.getSession();
      const accountId = session?.user?.id || globalState.account.id;

      const [businesses, branches, members, leads, staff] = await Promise.all([
        tenantService.fetchBusinesses(accountId),
        tenantService.fetchBranches(accountId),
        memberService.fetchMembers(globalState.currentBranchId),
        memberService.fetchRegistrationRequests(globalState.currentBranchId),
        staffService.fetchStaffForSync(accountId, globalState.currentBranchId),
      ]);

      const updates: Partial<AppState> = {
        supabaseStatus: 'connected',
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        syncErrorMessage: null,
      };

      if (businesses.length > 0) updates.businesses = businesses;
      if (branches.length > 0) updates.branches = branches;
      if (members.length > 0) {
        const otherMembers = globalState.members.filter((m) => m.facilityId !== globalState.currentBranchId);
        updates.members = [...members, ...otherMembers];
      }
      if (leads.length > 0) {
        const otherLeads = globalState.leads.filter((l) => l.facilityId !== globalState.currentBranchId);
        updates.leads = [...leads, ...otherLeads];
      }
      if (staff.length > 0) {
        updates.staff = staff;
      }

      globalState = {
        ...globalState,
        ...updates,
      };
      notify();
    } catch (err: any) {
      console.warn('[store] syncWithSupabase failed:', err);
      globalState = {
        ...globalState,
        supabaseStatus: 'offline',
        isSyncing: false,
        syncErrorMessage: err.message || 'Network error syncing with Supabase',
      };
      notify();
    }
  };

  // Synchronize on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      syncWithSupabase();
    }
  }, []);

  // Real-time synchronization subscription for current active branch
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = realtimeService.subscribeToBranch(state.currentBranchId, {
      onMemberChange: () => {
        memberService.fetchMembers(state.currentBranchId).then((newMembers) => {
          if (newMembers.length > 0) {
            const others = globalState.members.filter((m) => m.facilityId !== state.currentBranchId);
            globalState = {
              ...globalState,
              members: [...newMembers, ...others],
              lastSyncedAt: new Date().toISOString(),
            };
            notify();
          }
        });
      },
      onLeadChange: () => {
        memberService.fetchRegistrationRequests(state.currentBranchId).then((newLeads) => {
          if (newLeads.length > 0) {
            const others = globalState.leads.filter((l) => l.facilityId !== state.currentBranchId);
            globalState = {
              ...globalState,
              leads: [...newLeads, ...others],
              lastSyncedAt: new Date().toISOString(),
            };
            notify();
          }
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, [state.currentBranchId]);

  // Active Timer Background Tick
  useEffect(() => {
    if (!state.activeTimer.isRunning || state.activeTimer.isPaused) return;

    const interval = setInterval(() => {
      const current = globalState.activeTimer;
      if (!current.isRunning || current.isPaused) return;

      const newElapsed = current.elapsedSeconds + 1;
      let newPomodoroSecs = current.pomodoroRemainingSeconds;
      let newPomodoroMode = current.pomodoroMode;

      if (current.isPomodoro) {
        if (newPomodoroSecs <= 1) {
          newPomodoroMode = current.pomodoroMode === 'work' ? 'break' : 'work';
          newPomodoroSecs = newPomodoroMode === 'work' ? 1500 : 300;
        } else {
          newPomodoroSecs -= 1;
        }
      }

      globalState = {
        ...globalState,
        activeTimer: {
          ...current,
          elapsedSeconds: newElapsed,
          pomodoroRemainingSeconds: newPomodoroSecs,
          pomodoroMode: newPomodoroMode,
        },
      };
      notify();
    }, 1000);

    return () => clearInterval(interval);
  }, [state.activeTimer.isRunning, state.activeTimer.isPaused]);

  // Helpers
  const currentBusiness =
    state.businesses.find((b) => b.id === state.currentBusinessId) || state.businesses[0];
  const currentBranch =
    state.branches.find((b) => b.id === state.currentBranchId) || state.branches[0];
  const terminology = getCategoryTerminology(currentBusiness.category, state.language);

  // Quotas
  const plan = state.subscription.plan;
  const businessQuota = checkQuota(state.businesses.length, plan.maxBusinesses);
  const branchQuota = checkQuota(state.branches.length, plan.maxBranches);
  const deviceQuota = checkQuota(state.devices.length, plan.maxDevices);
  const staffQuota = checkQuota(state.staff.length, plan.maxStaff);

  // Scoped lists
  const currentMembers = state.members.filter((m) => m.facilityId === state.currentBranchId);
  const currentLeads = state.leads.filter((l) => l.facilityId === state.currentBranchId);
  const currentProducts = state.products.filter((p) => p.facilityId === state.currentBranchId);
  const currentStaff = state.staff.filter((s) => s.facilityId === state.currentBranchId);
  const currentSales = state.sales.filter((s) => s.facilityId === state.currentBranchId);
  const currentSchedule = state.schedule.filter((sc) => sc.facilityId === state.currentBranchId);
  const currentPlans = state.plansByBranch[state.currentBranchId] || EMPTY_PLANS;
  const currentAppointments = (state.appointments || []).filter((a) => a.facilityId === state.currentBranchId);
  const currentServices = (state.servicesCatalog || []).filter((s) => s.facilityId === state.currentBranchId);

  const selectedMember = state.selectedMemberId
    ? state.members.find((m) => m.id === state.selectedMemberId) || null
    : null;

  // Actions
  const setScreen = (activeScreen: ActiveScreen) => {
    globalState = { ...globalState, activeScreen };
    notify();
  };

  const setTheme = (theme: AppTheme) => {
    globalState = { ...globalState, theme };
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    notify();
  };

  const setLanguage = (language: SupportedLanguage) => {
    globalState = { ...globalState, language };
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    notify();
  };

  const switchFacility = (businessId: string, branchId?: string) => {
    const targetBranches = state.branches.filter((b) => b.businessId === businessId);
    const targetBranchId = branchId || (targetBranches[0]?.id ?? state.branches[0].id);
    globalState = {
      ...globalState,
      currentBusinessId: businessId,
      currentBranchId: targetBranchId,
      selectedMemberId: null,
      isDetailOpen: false,
    };
    notify();
  };

  const switchBusiness = (businessId: string) => {
    switchFacility(businessId);
  };

  const switchBranch = (branchId: string) => {
    switchFacility(state.currentBusinessId, branchId);
  };

  const selectMember = (memberId: string | null) => {
    globalState = {
      ...globalState,
      selectedMemberId: memberId,
      isDetailOpen: memberId !== null,
    };
    notify();
  };

  const closeDetail = () => {
    globalState = { ...globalState, isDetailOpen: false };
    notify();
  };

  const addMember = (newMember: Omit<Member, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>) => {
    const member: Member = {
      ...newMember,
      id: `mem_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      members: [member, ...globalState.members],
      selectedMemberId: member.id,
      isDetailOpen: true,
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService.createMember(member).catch((err) => {
        console.warn('[store] Failed to save member to Supabase:', err);
      });
    }

    return member;
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    globalState = {
      ...globalState,
      members: globalState.members.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      ),
    };
    notify();

    if (isSupabaseConfigured()) {
      const target = globalState.members.find((m) => m.id === id);
      if (target) {
        memberService.updateMember(target).catch((err) => {
          console.warn('[store] Failed to update member in Supabase:', err);
        });
      }
    }
  };

  const deleteMember = (id: string) => {
    globalState = {
      ...globalState,
      members: globalState.members.filter((m) => m.id !== id),
      selectedMemberId: globalState.selectedMemberId === id ? null : globalState.selectedMemberId,
      isDetailOpen: globalState.selectedMemberId === id ? false : globalState.isDetailOpen,
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService.deleteMember(id).catch((err) => {
        console.warn('[store] Failed to delete member in Supabase:', err);
      });
    }
  };

  const addLead = (newLead: Omit<RegistrationLead, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>) => {
    const lead: RegistrationLead = {
      ...newLead,
      id: `lead_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      leads: [lead, ...globalState.leads],
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService.createRegistrationRequest(lead).catch((err) => {
        console.warn('[store] Failed to save lead to Supabase:', err);
      });
    }

    return lead;
  };

  const updateLeadStatus = (leadId: string, status: 'Pending' | 'Approved' | 'Declined') => {
    globalState = {
      ...globalState,
      leads: globalState.leads.map((l) =>
        l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l
      ),
    };
    notify();
  };

  const convertLeadToMember = (
    leadId: string,
    planId: string,
    planName: string,
    durationDays: number
  ) => {
    const lead = globalState.leads.find((l) => l.id === leadId);
    if (!lead) return;

    const startDate = new Date().toISOString().split('T')[0];
    const expDateObj = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const expirationDate = expDateObj.toISOString().split('T')[0];

    const newMember: Member = {
      id: `mem_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      fullName: lead.fullName,
      email: lead.email,
      phoneNumber: lead.phoneNumber,
      cardId: `RFID-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Active',
      startDate,
      expirationDate,
      membershipPlanId: planId,
      membershipPlanName: planName,
      remainingSessions: durationDays >= 90 ? 999 : 30,
      gender: 'Other',
      source: lead.source,
      notes: `Converted from registration lead (${lead.source}). Original notes: ${lead.notes || 'None'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      leads: globalState.leads.map((l) => (l.id === leadId ? { ...l, status: 'Approved' } : l)),
      members: [newMember, ...globalState.members],
      selectedMemberId: newMember.id,
      isDetailOpen: true,
      activeScreen: 'members',
    };
    notify();
  };

  const processSale = (
    items: Array<{ product: Product; quantity: number }>,
    paymentMethod: 'Cash' | 'Card' | 'MemberBalance',
    memberId?: string,
    notes?: string
  ) => {
    const totalAmount = items.reduce((sum, item) => sum + item.product.price.amount * item.quantity, 0);
    const member = memberId ? globalState.members.find((m) => m.id === memberId) : undefined;

    const sale: Sale = {
      id: `sale_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      memberId,
      memberName: member?.fullName,
      totalAmount,
      paymentMethod,
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price.amount,
        totalPrice: i.product.price.amount * i.quantity,
      })),
      notes,
      createdAt: new Date().toISOString(),
    };

    // Decrement stock quantities
    const updatedProducts = globalState.products.map((p) => {
      const match = items.find((item) => item.product.id === p.id);
      if (match) {
        return { ...p, stockQuantity: Math.max(0, p.stockQuantity - match.quantity) };
      }
      return p;
    });

    globalState = {
      ...globalState,
      products: updatedProducts,
      sales: [sale, ...globalState.sales],
    };
    notify();
    return sale;
  };

  const createAppointment = (
    aptData: Omit<Appointment, 'id' | 'createdAt' | 'tenantId' | 'facilityId'>
  ) => {
    const newApt: Appointment = {
      ...aptData,
      id: `apt_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      appointments: [newApt, ...(globalState.appointments || [])],
    };
    notify();
    return newApt;
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    };
    notify();
  };

  const rescheduleAppointment = (
    id: string,
    date: string,
    startTime: string,
    endTime: string,
    staffId?: string,
    staffName?: string
  ) => {
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).map((a) => {
        if (a.id === id) {
          return {
            ...a,
            date,
            startTime,
            endTime,
            ...(staffId ? { staffId, staffName: staffName || a.staffName } : {}),
          };
        }
        return a;
      }),
    };
    notify();
  };

  const deleteAppointment = (id: string) => {
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).filter((a) => a.id !== id),
    };
    notify();
  };

  const addServiceItem = (serviceData: Omit<ServiceItem, 'id' | 'facilityId'>) => {
    const newService: ServiceItem = {
      ...serviceData,
      id: `srv_${Date.now()}`,
      facilityId: state.currentBranchId,
    };
    globalState = {
      ...globalState,
      servicesCatalog: [...(globalState.servicesCatalog || []), newService],
    };
    notify();
    return newService;
  };

  const checkoutAppointment = (
    appointmentId: string,
    paymentMethod: 'Cash' | 'Card' | 'MemberBalance' = 'Cash'
  ) => {
    const apt = (globalState.appointments || []).find((a) => a.id === appointmentId);
    if (!apt) throw new Error('Appointment not found');

    const sale: Sale = {
      id: `sale_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      memberId: apt.clientId,
      memberName: apt.clientName,
      totalAmount: apt.price,
      paymentMethod,
      items: [
        {
          productId: apt.serviceId,
          productName: `${apt.serviceName} (${apt.staffName})`,
          quantity: 1,
          unitPrice: apt.price,
          totalPrice: apt.price,
        },
      ],
      notes: `Salon Appointment Checkout — Stylist: ${apt.staffName}`,
      createdAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).map((a) =>
        a.id === appointmentId ? { ...a, status: 'Completed' as AppointmentStatus } : a
      ),
      sales: [sale, ...globalState.sales],
    };
    notify();
    return sale;
  };

  const addStaff = (staffData: Omit<StaffMember, 'id' | 'tenantId' | 'facilityId'>) => {
    if (!staffQuota.isAllowed) {
      throw new Error(`Staff limit reached for ${plan.name} plan. Upgrade to expand capacity.`);
    }

    const newStaff: StaffMember = {
      ...staffData,
      id: `stf_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
    };
    globalState = {
      ...globalState,
      staff: [...globalState.staff, newStaff],
    };
    notify();
    return newStaff;
  };

  const addBranch = (name: string, code: string, address?: string, phone?: string) => {
    if (!branchQuota.isAllowed) {
      throw new Error(`Branch limit reached for ${plan.name} plan. Redeem a lifetime voucher to upgrade.`);
    }

    const newBranch: Branch = {
      id: `branch_${Date.now()}`,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
      name,
      code,
      address,
      phone,
      isMainBranch: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      branches: [...globalState.branches, newBranch],
      currentBranchId: newBranch.id,
    };
    notify();

    if (isSupabaseConfigured()) {
      tenantService
        .createBranch(state.account.id, state.currentBusinessId, name, address, phone)
        .catch((err) => {
          console.warn('[store] Failed to create branch on Supabase:', err);
        });
    }

    return newBranch;
  };

  const registerDevice = (label: string, hardwareId: string) => {
    if (!deviceQuota.isAllowed) {
      throw new Error(`Device limit reached for ${plan.name} plan.`);
    }

    const newDevice: Device = {
      id: `dev_${Date.now()}`,
      accountId: state.account.id,
      branchId: state.currentBranchId,
      label,
      hardwareId,
      isActive: true,
      lastSeenAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      devices: [...globalState.devices, newDevice],
    };
    notify();
    return newDevice;
  };

  const revokeDevice = (deviceId: string) => {
    globalState = {
      ...globalState,
      devices: globalState.devices.filter((d) => d.id !== deviceId),
    };
    notify();
  };

  const redeemVoucher = (code: string) => {
    const res = validateVoucherCode(code);
    if (!res.isValid || !res.tierRank) {
      return { success: false, message: res.error || 'Invalid voucher code.' };
    }

    const matchingPlan = INITIAL_PLANS.find((p) => p.tierRank === res.tierRank);
    if (!matchingPlan) {
      return { success: false, message: 'Tier not configured in catalog.' };
    }

    const updatedSubscription: AccountSubscription = {
      ...globalState.subscription,
      planId: matchingPlan.id,
      status: 'active',
      isLifetime: true,
      activatedByVoucher: code.toUpperCase().trim(),
      plan: matchingPlan,
    };

    globalState = {
      ...globalState,
      subscription: updatedSubscription,
    };
    notify();

    if (isSupabaseConfigured()) {
      licenseService.redeemVoucher(globalState.account.id, code).catch((err) => {
        console.warn('[store] Supabase redeem_license_voucher notice:', err);
      });
    }

    return {
      success: true,
      message: `Congratulations! Activated Atrium ${matchingPlan.name} Perpetual Lifetime License.`,
      plan: matchingPlan,
    };
  };

  const addProduct = (productData: Omit<Product, 'id' | 'tenantId' | 'facilityId'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
    };
    globalState = {
      ...globalState,
      products: [newProduct, ...globalState.products],
    };
    notify();
    return newProduct;
  };

  const login = (email: string, _password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const staffMatch = globalState.staff.find((s) => s.email.toLowerCase() === cleanEmail);
    if (staffMatch) {
      const user: CurrentUser = {
        id: staffMatch.id,
        fullName: staffMatch.fullName,
        email: staffMatch.email,
        role: staffMatch.role,
        roleRank: staffMatch.roleRank,
        branchId: staffMatch.facilityId,
        pinCode: staffMatch.pinCode,
      };
      globalState = {
        ...globalState,
        currentUser: user,
        isAuthenticated: true,
      };
      notify();
      return { success: true, user };
    }

    // Check account owner
    if (
      cleanEmail === globalState.account.email.toLowerCase() ||
      cleanEmail === 'owner@atrium.dz' ||
      cleanEmail === 'bentouatitamer@gmail.com'
    ) {
      const ownerUser: CurrentUser = {
        id: 'stf_01',
        fullName: globalState.account.fullName,
        email: globalState.account.email,
        role: 'Owner',
        roleRank: 8,
        pinCode: '1234',
      };
      globalState = {
        ...globalState,
        currentUser: ownerUser,
        isAuthenticated: true,
      };
      notify();
      return { success: true, user: ownerUser };
    }

    // Default friendly login for any valid email format
    const namePart = cleanEmail.split('@')[0];
    const friendlyName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const fallbackUser: CurrentUser = {
      id: `usr_${Date.now()}`,
      fullName: friendlyName,
      email: cleanEmail,
      role: 'Owner',
      roleRank: 8,
      pinCode: '1234',
    };
    globalState = {
      ...globalState,
      currentUser: fallbackUser,
      isAuthenticated: true,
    };
    notify();
    return { success: true, user: fallbackUser };
  };

  const loginWithPin = (pin: string) => {
    const cleanPin = pin.trim();
    const staffMatch = globalState.staff.find((s) => s.pinCode === cleanPin);
    if (staffMatch) {
      const user: CurrentUser = {
        id: staffMatch.id,
        fullName: staffMatch.fullName,
        email: staffMatch.email,
        role: staffMatch.role,
        roleRank: staffMatch.roleRank,
        branchId: staffMatch.facilityId,
        pinCode: staffMatch.pinCode,
      };
      globalState = {
        ...globalState,
        currentUser: user,
        isAuthenticated: true,
        isFastSwitchOpen: false,
      };
      notify();
      return { success: true, user };
    }

    if (cleanPin === '1234') {
      const ownerUser: CurrentUser = {
        id: 'stf_01',
        fullName: globalState.account.fullName,
        email: globalState.account.email,
        role: 'Owner',
        roleRank: 8,
        pinCode: '1234',
      };
      globalState = {
        ...globalState,
        currentUser: ownerUser,
        isAuthenticated: true,
        isFastSwitchOpen: false,
      };
      notify();
      return { success: true, user: ownerUser };
    }

    return { success: false, message: 'Invalid 4-digit PIN code. (Try 1234 for Owner, 5566 for Manager, 9988 for Cashier)' };
  };

  const switchStaffUser = (staffId: string) => {
    const target = globalState.staff.find((s) => s.id === staffId);
    if (target) {
      globalState = {
        ...globalState,
        currentUser: {
          id: target.id,
          fullName: target.fullName,
          email: target.email,
          role: target.role,
          roleRank: target.roleRank,
          branchId: target.facilityId,
          pinCode: target.pinCode,
        },
        isFastSwitchOpen: false,
      };
      notify();
    }
  };

  const logout = () => {
    globalState = {
      ...globalState,
      isAuthenticated: false,
      isFastSwitchOpen: false,
    };
    notify();
  };

  const openOnboarding = () => {
    globalState = { ...globalState, isOnboardingOpen: true };
    notify();
  };

  const closeOnboarding = () => {
    globalState = { ...globalState, isOnboardingOpen: false };
    notify();
  };

  const openFastSwitch = () => {
    globalState = { ...globalState, isFastSwitchOpen: true };
    notify();
  };

  const closeFastSwitch = () => {
    globalState = { ...globalState, isFastSwitchOpen: false };
    notify();
  };

  const completeOnboarding = (params: OnboardingParams) => {
    const accountId = `acc_${Date.now()}`;
    const businessId = `biz_${Date.now()}`;
    const branchId = `branch_${Date.now()}`;
    const staffId = `stf_${Date.now()}`;

    const newAccount: Account = {
      id: accountId,
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const newBusiness: Business = {
      id: businessId,
      accountId,
      category: params.category,
      name: params.businessName,
      displayName: params.businessName,
      address: params.branchAddress,
      phone: params.branchPhone || params.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const newBranch: Branch = {
      id: branchId,
      accountId,
      businessId,
      name: params.branchName || 'Main Facility',
      code: params.branchName.substring(0, 3).toUpperCase() || 'M01',
      address: params.branchAddress,
      phone: params.branchPhone || params.phone,
      isMainBranch: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    let chosenPlan = INITIAL_PLANS[0]; // Free Trial default
    let isLifetime = false;
    let activatedVoucher: string | undefined = undefined;

    if (params.voucherCode) {
      const vRes = validateVoucherCode(params.voucherCode);
      if (vRes.isValid && vRes.tierRank) {
        const matching = INITIAL_PLANS.find((p) => p.tierRank === vRes.tierRank);
        if (matching) {
          chosenPlan = matching;
          isLifetime = true;
          activatedVoucher = params.voucherCode.trim().toUpperCase();
        }
      }
    }

    const newSubscription: AccountSubscription = {
      id: `sub_${Date.now()}`,
      accountId,
      planId: chosenPlan.id,
      status: 'active',
      isLifetime,
      trialEndsAt: isLifetime ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      activatedByVoucher: activatedVoucher,
      plan: chosenPlan,
    };

    const newOwnerStaff: StaffMember = {
      id: staffId,
      tenantId: accountId,
      facilityId: branchId,
      fullName: params.fullName,
      email: params.email,
      phoneNumber: params.phone || '+213 550 00 00 00',
      role: 'Owner',
      roleRank: 8,
      isActive: true,
      hireDate: new Date().toISOString().split('T')[0],
      salary: 0,
      paymentDay: 28,
      pinCode: '1234',
      cardId: `STF-OWNER-${Date.now().toString().slice(-4)}`,
      allowedModules: ['all'],
    };

    // Bootstrap initial category plans
    const samplePlans: MembershipPlan[] = [
      {
        id: `plan_${Date.now()}_1`,
        tenantId: accountId,
        facilityId: branchId,
        name:
          params.category === 'membership_session'
            ? 'Full Access Monthly'
            : params.category === 'appointment_service'
            ? 'Signature Hair & Care Pass'
            : params.category === 'pos_inventory'
            ? 'VIP Customer Membership'
            : params.category === 'project_milestone'
            ? 'Monthly Agency Retainer'
            : params.category === 'rental_booking'
            ? 'Dedicated Desk / Space Tier'
            : 'Cohort Standard Tuition',
        description: 'Standard plan with core amenities and priority booking',
        durationDays: 30,
        price: { amount: 6500, currency: 'DZD' },
        isActive: true,
        sessionsPerWeek: 3,
        isWalkIn: false,
        isPersonalTraining: false,
        genderRule: 0,
      },
      {
        id: `plan_${Date.now()}_2`,
        tenantId: accountId,
        facilityId: branchId,
        name:
          params.category === 'membership_session'
            ? 'Quarterly Pro Membership'
            : params.category === 'appointment_service'
            ? 'Bridal & Deluxe Package'
            : params.category === 'pos_inventory'
            ? 'Executive Lunch Subscription'
            : params.category === 'project_milestone'
            ? 'Growth Project Sprint'
            : params.category === 'rental_booking'
            ? 'Full Studio Booking Pack'
            : 'Quarterly Masterclass Program',
        description: 'Comprehensive tier with unlimited amenities',
        durationDays: 90,
        price: { amount: 18000, currency: 'DZD' },
        isActive: true,
        sessionsPerWeek: 0,
        isWalkIn: false,
        isPersonalTraining: false,
        genderRule: 0,
      },
    ];

    const sampleMembers: Member[] = [
      {
        id: `mem_${Date.now()}_1`,
        tenantId: accountId,
        facilityId: branchId,
        fullName: 'Amira Cherif',
        email: 'amira.cherif@gmail.com',
        phoneNumber: '+213 550 11 22 33',
        cardId: 'RFID-100201',
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        membershipPlanId: samplePlans[0].id,
        membershipPlanName: samplePlans[0].name,
        remainingSessions: 24,
        gender: 'Female',
        source: 'Instagram',
        notes: 'Welcome member. Prefers morning slots.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `mem_${Date.now()}_2`,
        tenantId: accountId,
        facilityId: branchId,
        fullName: 'Sara Bouzid',
        email: 'sara.b@yahoo.fr',
        phoneNumber: '+213 661 44 55 66',
        cardId: 'RFID-100202',
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        membershipPlanId: samplePlans[1].id,
        membershipPlanName: samplePlans[1].name,
        remainingSessions: 999,
        gender: 'Female',
        source: 'Referral',
        notes: 'VIP client. Enrolled in auto-renewal.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const sampleLeads: RegistrationLead[] = [
      {
        id: `lead_${Date.now()}`,
        tenantId: accountId,
        facilityId: branchId,
        fullName: 'Yacine Brahimi',
        email: 'yacine.b@gmail.com',
        phoneNumber: '+213 770 99 88 77',
        source: 'Website',
        status: 'Pending',
        preferredPlanId: samplePlans[0].id,
        preferredPlanName: samplePlans[0].name,
        notes: 'Requested facility tour and pricing inquiry.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const sampleProducts: Product[] = [
      {
        id: `prod_${Date.now()}_1`,
        tenantId: accountId,
        facilityId: branchId,
        name:
          params.category === 'membership_session'
            ? 'Mineral Water 500ml'
            : params.category === 'appointment_service'
            ? 'Argan Hair Serum 100ml'
            : params.category === 'pos_inventory'
            ? 'Specialty Roast Espresso'
            : 'Billable Consulting Hour',
        description: 'Standard retail item',
        price: { amount: 150, currency: 'DZD' },
        cost: { amount: 70, currency: 'DZD' },
        stockQuantity: 48,
        sku: 'AT-RET-01',
        category: 'Beverage',
        reorderLevel: 10,
        isActive: true,
        isPinned: true,
      },
    ];

    const newCurrentUser: CurrentUser = {
      id: staffId,
      fullName: params.fullName,
      email: params.email,
      role: 'Owner',
      roleRank: 8,
      branchId,
      pinCode: '1234',
    };

    globalState = {
      ...globalState,
      account: newAccount,
      subscription: newSubscription,
      businesses: [newBusiness, ...globalState.businesses],
      branches: [newBranch, ...globalState.branches],
      currentBusinessId: businessId,
      currentBranchId: branchId,
      plansByBranch: {
        ...globalState.plansByBranch,
        [branchId]: samplePlans,
      },
      members: [...sampleMembers, ...globalState.members],
      leads: [...sampleLeads, ...globalState.leads],
      products: [...sampleProducts, ...globalState.products],
      staff: [newOwnerStaff, ...globalState.staff],
      currentUser: newCurrentUser,
      isAuthenticated: true,
      isOnboardingOpen: false,
      activeScreen: 'dashboard',
    };

    notify();

    if (isSupabaseConfigured()) {
      tenantService
        .onboardOwnerAccount({
          ownerId: accountId,
          fullName: params.fullName,
          email: params.email,
          businessName: params.businessName,
          branchName: params.branchName,
          category: params.category,
          voucherCode: params.voucherCode,
        })
        .catch((err) => {
          console.warn('[store] Supabase onboard_owner_account RPC notice:', err);
        });
    }

    return { success: true, account: newAccount, business: newBusiness, branch: newBranch };
  };

  // ==========================================
  // Freelancer & Solo Actions
  // ==========================================

  const startTimer = (
    clientId: string,
    clientName: string,
    projectId: string,
    projectTitle: string,
    taskDescription: string,
    deliverableId?: string,
    deliverableTitle?: string,
    isBillable = true,
    isPomodoro = false
  ) => {
    globalState = {
      ...globalState,
      activeTimer: {
        isRunning: true,
        isPaused: false,
        clientId,
        clientName,
        projectId,
        projectTitle,
        deliverableId,
        deliverableTitle,
        taskDescription,
        elapsedSeconds: 0,
        isBillable,
        isPomodoro,
        pomodoroRemainingSeconds: 1500,
        pomodoroMode: 'work',
        startedAt: new Date().toISOString(),
      },
    };
    notify();
  };

  const pauseTimer = () => {
    globalState = {
      ...globalState,
      activeTimer: { ...globalState.activeTimer, isPaused: true },
    };
    notify();
  };

  const resumeTimer = () => {
    globalState = {
      ...globalState,
      activeTimer: { ...globalState.activeTimer, isPaused: false },
    };
    notify();
  };

  const stopTimer = () => {
    const timer = globalState.activeTimer;
    if (timer.elapsedSeconds >= 10) {
      const client = globalState.freelanceClients.find((c) => c.id === timer.clientId);
      const rate = client?.hourlyRate || 85;
      const currency = client?.currency || 'EUR';

      const newEntry: TimeLogEntry = {
        id: `time_${Date.now()}`,
        tenantId: state.account.id,
        facilityId: state.currentBranchId,
        clientId: timer.clientId,
        clientName: timer.clientName,
        projectId: timer.projectId,
        projectTitle: timer.projectTitle,
        deliverableId: timer.deliverableId,
        deliverableTitle: timer.deliverableTitle,
        taskDescription: timer.taskDescription || 'Focus sprint session',
        durationSeconds: timer.elapsedSeconds,
        isBillable: timer.isBillable,
        isInvoiced: false,
        rateAtMoment: rate,
        currency,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      const additionalHours = Number((timer.elapsedSeconds / 3600).toFixed(2));
      const updatedProjects = globalState.freelanceProjects.map((p) => {
        if (p.id === timer.projectId) {
          const updatedDeliverables = p.deliverables.map((d) => {
            if (d.id === timer.deliverableId) {
              return { ...d, loggedHours: Number((d.loggedHours + additionalHours).toFixed(2)) };
            }
            return d;
          });
          return {
            ...p,
            loggedHours: Number((p.loggedHours + additionalHours).toFixed(2)),
            deliverables: updatedDeliverables,
          };
        }
        return p;
      });

      globalState = {
        ...globalState,
        timeLogs: [newEntry, ...globalState.timeLogs],
        freelanceProjects: updatedProjects,
        activeTimer: {
          ...timer,
          isRunning: false,
          isPaused: false,
          elapsedSeconds: 0,
          startedAt: null,
        },
      };
      notify();
      return newEntry;
    } else {
      globalState = {
        ...globalState,
        activeTimer: {
          ...timer,
          isRunning: false,
          isPaused: false,
          elapsedSeconds: 0,
          startedAt: null,
        },
      };
      notify();
      return null;
    }
  };

  const resetTimer = () => {
    globalState = {
      ...globalState,
      activeTimer: {
        ...globalState.activeTimer,
        isRunning: false,
        isPaused: false,
        elapsedSeconds: 0,
        startedAt: null,
      },
    };
    notify();
  };

  const addFreelanceClient = (clientData: Omit<FreelanceClient, 'id' | 'tenantId' | 'facilityId' | 'lifetimeBilled' | 'createdAt'>) => {
    const newClient: FreelanceClient = {
      ...clientData,
      id: `fcli_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      lifetimeBilled: 0,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      freelanceClients: [newClient, ...globalState.freelanceClients],
    };
    notify();
    return newClient;
  };

  const updateFreelanceClient = (id: string, updates: Partial<FreelanceClient>) => {
    globalState = {
      ...globalState,
      freelanceClients: globalState.freelanceClients.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    };
    notify();
  };

  const addFreelanceProject = (projectData: Omit<FreelanceProject, 'id' | 'tenantId' | 'facilityId' | 'loggedHours' | 'createdAt'>) => {
    const newProject: FreelanceProject = {
      ...projectData,
      id: `fproj_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      loggedHours: 0,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      freelanceProjects: [newProject, ...globalState.freelanceProjects],
    };
    notify();
    return newProject;
  };

  const updateProjectStage = (projectId: string, stage: DeliverableStage) => {
    globalState = {
      ...globalState,
      freelanceProjects: globalState.freelanceProjects.map((p) => (p.id === projectId ? { ...p, stage } : p)),
    };
    notify();
  };

  const addDeliverable = (projectId: string, title: string, estimatedHours: number, dueDate: string, description?: string) => {
    const newDeliv: FreelanceDeliverable = {
      id: `deliv_${Date.now()}`,
      projectId,
      title,
      description,
      stage: 'InProgress',
      estimatedHours,
      loggedHours: 0,
      dueDate,
      isCompleted: false,
    };
    globalState = {
      ...globalState,
      freelanceProjects: globalState.freelanceProjects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            estimatedHours: p.estimatedHours + estimatedHours,
            deliverables: [...p.deliverables, newDeliv],
          };
        }
        return p;
      }),
    };
    notify();
    return newDeliv;
  };

  const updateDeliverableStage = (projectId: string, deliverableId: string, stage: DeliverableStage) => {
    globalState = {
      ...globalState,
      freelanceProjects: globalState.freelanceProjects.map((p) => {
        if (p.id === projectId) {
          const updated = p.deliverables.map((d) =>
            d.id === deliverableId ? { ...d, stage, isCompleted: stage === 'Approved' || stage === 'Billed' } : d
          );
          return { ...p, deliverables: updated };
        }
        return p;
      }),
    };
    notify();
  };

  const logTimeEntry = (entryData: Omit<TimeLogEntry, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'isInvoiced'>) => {
    const entry: TimeLogEntry = {
      ...entryData,
      id: `time_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      isInvoiced: false,
      createdAt: new Date().toISOString(),
    };

    const addHours = Number((entry.durationSeconds / 3600).toFixed(2));
    const updatedProjects = globalState.freelanceProjects.map((p) => {
      if (p.id === entry.projectId) {
        return {
          ...p,
          loggedHours: Number((p.loggedHours + addHours).toFixed(2)),
          deliverables: p.deliverables.map((d) =>
            d.id === entry.deliverableId ? { ...d, loggedHours: Number((d.loggedHours + addHours).toFixed(2)) } : d
          ),
        };
      }
      return p;
    });

    globalState = {
      ...globalState,
      timeLogs: [entry, ...globalState.timeLogs],
      freelanceProjects: updatedProjects,
    };
    notify();
    return entry;
  };

  const billUnbilledHours = (clientId: string, taxPercent = 0, notes?: string) => {
    const client = globalState.freelanceClients.find((c) => c.id === clientId);
    if (!client) throw new Error('Client not found');

    const unbilled = globalState.timeLogs.filter(
      (t) => t.clientId === clientId && t.isBillable && !t.isInvoiced
    );
    if (unbilled.length === 0) throw new Error('No unbilled hours available for this client');

    const totalHours = unbilled.reduce((sum, item) => sum + item.durationSeconds / 3600, 0);
    const subtotal = unbilled.reduce((sum, item) => sum + (item.durationSeconds / 3600) * item.rateAtMoment, 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const taxAmount = Math.round((roundedSubtotal * (taxPercent / 100)) * 100) / 100;
    const totalAmount = roundedSubtotal + taxAmount;

    const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const newInvoice: FreelanceInvoice = {
      id: `inv_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      clientId,
      clientName: client.name,
      clientCompany: client.company,
      clientEmail: client.email,
      invoiceNumber: invoiceNum,
      currency: client.currency,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'Sent',
      items: unbilled.map((t) => ({
        id: `item_${t.id}`,
        description: `${t.projectTitle}: ${t.taskDescription} (${(t.durationSeconds / 3600).toFixed(1)} hrs)`,
        quantity: Number((t.durationSeconds / 3600).toFixed(2)),
        unitRate: t.rateAtMoment,
        total: Math.round(((t.durationSeconds / 3600) * t.rateAtMoment) * 100) / 100,
      })),
      subtotal: roundedSubtotal,
      taxPercent,
      taxAmount,
      totalAmount,
      notes: notes || `Itemized bill for ${totalHours.toFixed(1)} hours of professional services.`,
      paymentDetails: {
        bankName: 'BEA / International Wire or Algérie Poste',
        accountHolder: state.account.fullName,
        ribOrIban: '002 00012 34567890 12',
      },
      createdAt: new Date().toISOString(),
    };

    const unbilledIds = new Set(unbilled.map((t) => t.id));
    const updatedTimeLogs = globalState.timeLogs.map((t) =>
      unbilledIds.has(t.id) ? { ...t, isInvoiced: true } : t
    );

    globalState = {
      ...globalState,
      freelanceInvoices: [newInvoice, ...globalState.freelanceInvoices],
      timeLogs: updatedTimeLogs,
      freelanceClients: globalState.freelanceClients.map((c) =>
        c.id === clientId ? { ...c, lifetimeBilled: c.lifetimeBilled + totalAmount } : c
      ),
    };
    notify();
    return newInvoice;
  };

  const createFreelanceInvoice = (invoiceData: Omit<FreelanceInvoice, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newInv: FreelanceInvoice = {
      ...invoiceData,
      id: `inv_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      freelanceInvoices: [newInv, ...globalState.freelanceInvoices],
      freelanceClients: globalState.freelanceClients.map((c) =>
        c.id === newInv.clientId ? { ...c, lifetimeBilled: c.lifetimeBilled + newInv.totalAmount } : c
      ),
    };
    notify();
    return newInv;
  };

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus) => {
    globalState = {
      ...globalState,
      freelanceInvoices: globalState.freelanceInvoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status,
              paidAt: status === 'Paid' ? new Date().toISOString() : inv.paidAt,
            }
          : inv
      ),
    };
    notify();
  };

  const createFreelanceProposal = (proposalData: Omit<FreelanceProposal, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newProp: FreelanceProposal = {
      ...proposalData,
      id: `prop_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      freelanceProposals: [newProp, ...globalState.freelanceProposals],
    };
    notify();
    return newProp;
  };

  const convertProposalToProject = (proposalId: string) => {
    const prop = globalState.freelanceProposals.find((p) => p.id === proposalId);
    if (!prop) throw new Error('Proposal not found');

    let client = globalState.freelanceClients.find(
      (c) => c.email.toLowerCase() === prop.clientEmail.toLowerCase()
    );
    if (!client) {
      client = {
        id: `fcli_${Date.now()}`,
        tenantId: state.account.id,
        facilityId: state.currentBranchId,
        name: prop.clientName,
        company: prop.clientCompany,
        email: prop.clientEmail,
        currency: prop.currency,
        hourlyRate: prop.pricingModel === 'Hourly' ? 85 : 0,
        status: 'ProjectBased',
        lifetimeBilled: 0,
        createdAt: new Date().toISOString(),
      };
      globalState = {
        ...globalState,
        freelanceClients: [client, ...globalState.freelanceClients],
      };
    }

    const newProject: FreelanceProject = {
      id: `fproj_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      clientId: client.id,
      clientName: client.company || client.name,
      title: prop.title,
      description: prop.overview,
      pricingModel: prop.pricingModel,
      currency: prop.currency,
      budget: prop.proposedBudget,
      estimatedHours: prop.estimatedTimelineWeeks * 20,
      loggedHours: 0,
      stage: 'InProgress',
      startDate: new Date().toISOString().split('T')[0],
      deadline: prop.validUntil,
      deliverables: prop.scopeItems.map((item, idx) => ({
        id: `deliv_${Date.now()}_${idx}`,
        projectId: `fproj_${Date.now()}`,
        title: item,
        stage: idx === 0 ? 'InProgress' : 'Briefing',
        estimatedHours: Math.round((prop.estimatedTimelineWeeks * 20) / (prop.scopeItems.length || 1)),
        loggedHours: 0,
        dueDate: prop.validUntil,
        isCompleted: false,
      })),
      createdAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      freelanceProjects: [newProject, ...globalState.freelanceProjects],
      freelanceProposals: globalState.freelanceProposals.map((p) =>
        p.id === proposalId ? { ...p, status: 'Accepted' } : p
      ),
    };
    notify();
    return newProject;
  };

  const addFreelanceExpense = (expenseData: Omit<FreelanceExpense, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newExp: FreelanceExpense = {
      ...expenseData,
      id: `exp_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      freelanceExpenses: [newExp, ...globalState.freelanceExpenses],
    };
    notify();
    return newExp;
  };

  const deleteFreelanceExpense = (id: string) => {
    globalState = {
      ...globalState,
      freelanceExpenses: globalState.freelanceExpenses.filter((e) => e.id !== id),
    };
    notify();
  };

  const resetAllData = () => {
    globalState = DEFAULT_STATE;
    notify();
  };

  return {
    account: state.account,
    subscription: state.subscription,
    businesses: state.businesses,
    branches: state.branches,
    currentBusinessId: state.currentBusinessId,
    currentBranchId: state.currentBranchId,
    currentBusiness,
    currentBranch,
    activeScreen: state.activeScreen,
    theme: state.theme,
    language: state.language,
    terminology,
    quotas: {
      businesses: businessQuota,
      branches: branchQuota,
      devices: deviceQuota,
      staff: staffQuota,
    },
    // Supabase Sync & Connection State
    supabaseStatus: state.supabaseStatus,
    isSyncing: state.isSyncing,
    lastSyncedAt: state.lastSyncedAt,
    syncErrorMessage: state.syncErrorMessage,
    isSupabaseConfigured: isSupabaseConfigured(),
    syncWithSupabase,
    // Freelancer Collections
    freelanceClients: state.freelanceClients,
    freelanceProjects: state.freelanceProjects,
    timeLogs: state.timeLogs,
    freelanceInvoices: state.freelanceInvoices,
    freelanceProposals: state.freelanceProposals,
    freelanceExpenses: state.freelanceExpenses,
    activeTimer: state.activeTimer,
    // Auth State
    currentUser: state.currentUser,
    isAuthenticated: state.isAuthenticated,
    isOnboardingOpen: state.isOnboardingOpen,
    isFastSwitchOpen: state.isFastSwitchOpen,
    // Lists
    members: currentMembers,
    leads: currentLeads,
    products: currentProducts,
    staff: currentStaff,
    sales: currentSales,
    schedule: currentSchedule,
    plans: currentPlans,
    appointments: currentAppointments,
    servicesCatalog: currentServices,
    devices: state.devices.filter((d) => d.branchId === state.currentBranchId),
    selectedMember,
    isDetailOpen: state.isDetailOpen,
    // Actions
    setScreen,
    setTheme,
    setLanguage,
    switchFacility,
    switchBusiness,
    switchBranch,
    selectMember,
    closeDetail,
    addMember,
    updateMember,
    deleteMember,
    addLead,
    updateLeadStatus,
    convertLeadToMember,
    addProduct,
    processSale,
    addStaff,
    addBranch,
    registerDevice,
    revokeDevice,
    redeemVoucher,
    resetAllData,
    // Appointment Actions
    createAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    deleteAppointment,
    addServiceItem,
    checkoutAppointment,
    // Freelance Actions
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    addFreelanceClient,
    updateFreelanceClient,
    addFreelanceProject,
    updateProjectStage,
    addDeliverable,
    updateDeliverableStage,
    logTimeEntry,
    billUnbilledHours,
    createFreelanceInvoice,
    updateInvoiceStatus,
    createFreelanceProposal,
    convertProposalToProject,
    addFreelanceExpense,
    deleteFreelanceExpense,
    // Auth Actions
    login,
    loginWithPin,
    switchStaffUser,
    logout,
    openOnboarding,
    closeOnboarding,
    openFastSwitch,
    closeFastSwitch,
    completeOnboarding,
  };
}

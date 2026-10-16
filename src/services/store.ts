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
} from './seedData';
import { checkQuota, getCategoryTerminology, validateVoucherCode } from '../utils/rules';

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
        currentUser: parsed.currentUser || DEFAULT_USER,
        isAuthenticated: parsed.isAuthenticated !== undefined ? parsed.isAuthenticated : true,
        isOnboardingOpen: false,
        isFastSwitchOpen: false,
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
  };

  const deleteMember = (id: string) => {
    globalState = {
      ...globalState,
      members: globalState.members.filter((m) => m.id !== id),
      selectedMemberId: globalState.selectedMemberId === id ? null : globalState.selectedMemberId,
      isDetailOpen: globalState.selectedMemberId === id ? false : globalState.isDetailOpen,
    };
    notify();
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
    return { success: true, account: newAccount, business: newBusiness, branch: newBranch };
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

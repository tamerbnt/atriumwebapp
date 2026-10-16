import { useState, useEffect } from 'react';
import {
  Account,
  AccountSubscription,
  AppTheme,
  Business,
  Branch,
  Device,
  Member,
  MemberStatus,
  MembershipPlan,
  Product,
  RegistrationLead,
  Sale,
  ScheduleEvent,
  StaffMember,
  SubscriptionPlan,
  SupportedLanguage,
} from '../types/index';
import {
  INITIAL_ACCOUNT,
  INITIAL_BRANCHES,
  INITIAL_BUSINESSES,
  INITIAL_DEVICES,
  INITIAL_LEADS,
  INITIAL_MEMBERS,
  INITIAL_PLANS,
  INITIAL_PLANS_BY_BRANCH,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_SCHEDULE,
  INITIAL_STAFF,
} from './seedData';
import { checkQuota, getCategoryTerminology, validateVoucherCode } from '../utils/rules';

const STORAGE_KEY = 'atrium_erp_desktop_v2';

export type ActiveScreen =
  | 'dashboard'
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
  selectedMemberId: string | null;
  isDetailOpen: boolean;
}

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
  selectedMemberId: INITIAL_MEMBERS[0]?.id || null,
  isDetailOpen: false,
};

// Global reactive subscribers
type Listener = () => void;
let globalState: AppState = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
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
    memberId?: string
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
    // Lists
    members: currentMembers,
    leads: currentLeads,
    products: currentProducts,
    staff: currentStaff,
    sales: currentSales,
    schedule: currentSchedule,
    plans: currentPlans,
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
  };
}

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
  ParkedOrder,
  StockMovement,
  ReceiptConfig,
  PaymentDetail,
  RentableUnit,
  RentalBooking,
  RentalRenter,
  SecurityDepositRecord,
  BookingAddon,
  ToastNotification,
  ToastType,
  ToastSyncStatus,
  AppNotification,
  NotificationCategory,
  EduCourse,
  EduClassroom,
  EduCohort,
  EduStudent,
  EduEnrollment,
  EduSession,
  EduAttendance,
  EduGrade,
  EduCertificate,
  EduAdmissionLead,
  AdmissionStage,
  CohortStatus,
  StudentStatus,
  AttendanceStatus,
  EnrollmentPaymentStatus,
  PMRole,
  GarageRole,
  RealEstateRole,
  ManufacturingRole,
  LegalRole,
  LogisticsRole,
  ContractorRole,
  AgriRole,
  PMClient,
  PMProject,
  PMMilestone,
  PMCollateralItem,
  PMPrintOrder,
  PMBatDeliverable,
  PMTalent,
  PMMission,
  PMAttendance,
  PMExpense,
  PMPayrollBatch,
  PMCcpSlip,
  PMEquipmentStock,
  SalonWorkstation,
  StylistPayout,
  B2bClient,
  B2bSupplier,
  WarehouseDepot,
  CommercialDocument,
  PurchaseDocument,
  StockMovementVoucher,
  CommercialDocType,
  PurchaseDocType,
  StockVoucherType,
  StandardRole,
  MemberCheckInLog,
  WalkInTicket,
  SalonChairStation,
  EduQuickAttendanceRecord,
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
  INITIAL_SALON_WORKSTATIONS,
  INITIAL_STYLIST_PAYOUTS,
  INITIAL_SALON_CLIENTS,
  INITIAL_SCHEDULE,
  INITIAL_STAFF,
  INITIAL_FREELANCE_CLIENTS,
  INITIAL_FREELANCE_PROJECTS,
  INITIAL_TIME_LOGS,
  INITIAL_FREELANCE_INVOICES,
  INITIAL_FREELANCE_PROPOSALS,
  INITIAL_FREELANCE_EXPENSES,
  INITIAL_ACTIVE_TIMER,
  INITIAL_PARKED_ORDERS,
  INITIAL_STOCK_MOVEMENTS,
  DEFAULT_RECEIPT_CONFIG,
  INITIAL_RENTABLE_UNITS,
  INITIAL_RENTAL_BOOKINGS,
  createInitialRentalBookings,
  INITIAL_RENTAL_RENTERS,
  INITIAL_SECURITY_DEPOSITS,
  createInitialSecurityDeposits,
  INITIAL_EDU_COURSES,
  INITIAL_EDU_CLASSROOMS,
  INITIAL_EDU_COHORTS,
  INITIAL_EDU_STUDENTS,
  INITIAL_EDU_ENROLLMENTS,
  INITIAL_EDU_SESSIONS,
  INITIAL_EDU_ATTENDANCE,
  INITIAL_EDU_GRADES,
  INITIAL_EDU_CERTIFICATES,
  INITIAL_EDU_ADMISSIONS,
  INITIAL_PM_CLIENTS,
  INITIAL_PM_PROJECTS,
  INITIAL_PM_MILESTONES,
  INITIAL_PM_COLLATERAL_CATALOG,
  INITIAL_PM_PRINT_ORDERS,
  INITIAL_PM_BAT_DELIVERABLES,
  INITIAL_PM_TALENTS,
  INITIAL_PM_MISSIONS,
  INITIAL_PM_ATTENDANCES,
  INITIAL_PM_EXPENSES,
  INITIAL_PM_PAYROLL_BATCHES,
  INITIAL_PM_CCP_SLIPS,
  INITIAL_PM_EQUIPMENT_STOCK,
  INITIAL_WAREHOUSES,
  INITIAL_B2B_CLIENTS,
  INITIAL_B2B_SUPPLIERS,
  INITIAL_COMMERCIAL_DOCS,
  INITIAL_PURCHASE_DOCS,
  INITIAL_STOCK_VOUCHERS,
  INITIAL_TRADING_PRODUCTS,
} from './seedData';

import { checkQuota, getCategoryTerminology, validateVoucherCode, calculateDaysRemaining, formatMoney } from '../utils/rules';
import { numberToWordsFrench, numberToWordsArabic } from '../utils/algerianPtt';
import { getInitialLanguageConfig, getSystemDefaultLanguage, t, getLocalizedServiceName } from '../utils/i18n';

import {
  isSupabaseConfigured,
  authService,
  tenantService,
  licenseService,
  memberService,
  staffService,
  realtimeService,
  freelanceService,
  appointmentService,
  posService,
  rentalService,
  projectMilestoneService,
} from '../lib/supabase/index';


export const ATRIUM_STORAGE_VERSION = 2;
const STORAGE_KEY = 'atrium_erp_desktop_v2';

export type ActiveScreen =
  | 'dashboard'
  | 'analytics'
  | 'members'
  | 'registrations'
  | 'shop'
  | 'scheduler'
  | 'agenda'
  | 'finance'
  | 'history'
  | 'settings'
  // PM Direction Screens
  | 'pm_dir_dashboard'
  | 'pm_dir_new_project'
  | 'pm_dir_projects'
  | 'pm_dir_approvals'
  | 'pm_dir_reports'
  // PM Chef de Projet Screens
  | 'pm_cp_projects'
  | 'pm_cp_catalog'
  | 'pm_cp_orders'
  | 'pm_cp_files'
  | 'pm_cp_deliverables'
  | 'pm_cp_expenses'
  // PM Créa Screens
  | 'pm_crea_kanban'
  | 'pm_crea_production'
  | 'pm_crea_upload'
  | 'pm_crea_briefs'
  // PM Superviseur Screens
  | 'pm_sup_missions'
  | 'pm_sup_attendance'
  | 'pm_sup_staffing'
  | 'pm_sup_expenses'
  // PM RH Screens
  | 'pm_rh_talents'
  | 'pm_rh_dossier'
  | 'pm_rh_portal'
  | 'pm_rh_walkin'
  // PM Compta Screens
  | 'pm_compta_payroll'
  | 'pm_compta_ccp'
  | 'pm_compta_expenses'
  | 'pm_compta_stock'
  // B2B Trading & Commercial Management (Category 8: trading_commercial)
  | 'trading_dashboard'
  | 'trading_sales'
  | 'trading_purchases'
  | 'trading_inventory'
  | 'trading_directory'
  | 'trading_catalog'
  | 'trading_finance'
  // Category 11: Real Estate & Property Management (Algeria)
  | 'realestate_mandates';

export type SupabaseStatus = 'connected' | 'connecting' | 'offline' | 'unconfigured';

interface AppState {
  storageVersion: number;
  account: Account;
  subscription: AccountSubscription;
  businesses: Business[];
  branches: Branch[];
  currentBusinessId: string;
  currentBranchId: string;
  activeScreen: ActiveScreen;
  theme: AppTheme;
  language: SupportedLanguage;
  isLanguageAuto: boolean;
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
  isDesktopUpgradeModalOpen: boolean;
  desktopUpgradeReason: 'branch_limit' | 'business_limit' | 'general';
  // Supabase Integration & Sync
  supabaseStatus: SupabaseStatus;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncErrorMessage: string | null;
  networkMode: 'online' | 'slow_3g' | 'offline' | 'force_skeleton';
  isSyncTimeout: boolean;
  // Freelancer & Solo Practitioner (Category 16)
  freelanceClients: FreelanceClient[];
  freelanceProjects: FreelanceProject[];
  timeLogs: TimeLogEntry[];
  freelanceInvoices: FreelanceInvoice[];
  freelanceProposals: FreelanceProposal[];
  freelanceExpenses: FreelanceExpense[];
  activeTimer: ActiveTimerState;
  // POS & Inventory System
  parkedOrders: ParkedOrder[];
  stockMovements: StockMovement[];
  receiptConfig: ReceiptConfig;
  // Rentals & Venue Management (Category 14)
  rentableUnits: RentableUnit[];
  rentalBookings: RentalBooking[];
  rentalRenters: RentalRenter[];
  securityDeposits: SecurityDepositRecord[];
  // Education & Training (Category 15)
  eduCourses: EduCourse[];
  eduClassrooms: EduClassroom[];
  eduCohorts: EduCohort[];
  eduStudents: EduStudent[];
  eduEnrollments: EduEnrollment[];
  eduSessions: EduSession[];
  eduAttendance: EduAttendance[];
  eduGrades: EduGrade[];
  eduCertificates: EduCertificate[];
  eduAdmissions: EduAdmissionLead[];
  // Project & Milestone (Category 13)
  activePmRole: PMRole;
  activePmSubScreen: string;
  pmClients: PMClient[];
  pmProjects: PMProject[];
  pmMilestones: PMMilestone[];
  pmCollateralCatalog: PMCollateralItem[];
  pmPrintOrders: PMPrintOrder[];
  pmBatDeliverables: PMBatDeliverable[];
  pmTalents: PMTalent[];
  pmMissions: PMMission[];
  pmAttendances: PMAttendance[];
  pmExpenses: PMExpense[];
  pmPayrollBatches: PMPayrollBatch[];
  pmCcpSlips: PMCcpSlip[];
  pmEquipmentStock: PMEquipmentStock[];
  // Salon, Spa & Beauty Care
  salonWorkstations: SalonWorkstation[];
  stylistPayouts: StylistPayout[];
  // Automotive Garage & Fleet Maintenance (Category 10: auto_garage)
  activeGarageRole: GarageRole;
  // Real Estate & Property Brokerage (Category 11: real_estate)
  activeRealEstateRole: RealEstateRole;
  // Light Manufacturing & Workshop Production (Category 12: manufacturing_production)
  activeManufacturingRole: ManufacturingRole;
  // Legal Cabinet, Notary Study & Accounting Firm (Category 13: legal_accounting)
  activeLegalRole: LegalRole;
  // Logistics, Couriers & Parcel Dispatch (Category 14: logistics_delivery)
  activeLogisticsRole: LogisticsRole;
  // Construction & BTP Contracting (Category 15: construction_contractor)
  activeContractorRole: ContractorRole;
  // Agriculture & Livestock Farming (Category 17: agriculture_farming)
  activeAgriRole: AgriRole;
  // Dual-Role (Owner / Staff) State for Gym, Salon, POS, Education
  activeMembershipRole: StandardRole;
  activeAppointmentRole: StandardRole;
  activePosRole: StandardRole;
  activeEducationRole: StandardRole;
  memberCheckIns: MemberCheckInLog[];
  walkInTickets: WalkInTicket[];
  salonChairStations: SalonChairStation[];
  eduQuickAttendance: EduQuickAttendanceRecord[];
  // B2B Commercial Trading & Wholesale (Category 8: trading_commercial)
  b2bClients: B2bClient[];
  b2bSuppliers: B2bSupplier[];
  warehouses: WarehouseDepot[];
  commercialDocs: CommercialDocument[];
  purchaseDocs: PurchaseDocument[];
  stockVouchers: StockMovementVoucher[];
  // Toast & Notifications Center
  toasts: ToastNotification[];
  notifications: AppNotification[];
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-alert-stock',
    title: 'Low Stock Threshold Warning',
    message: 'Whey Isolate 1kg is down to 3 units in main depot. Restock required.',
    type: 'warning',
    category: 'alert',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 12,
    targetScreen: 'shop',
    action: {
      label: 'View Inventory',
      targetScreen: 'shop',
    },
  },
  {
    id: 'notif-act-sale',
    title: 'Transaction Settled',
    message: 'Invoice #INV-2026-004 settled for 380,000 DZD by Algérie Telecom.',
    type: 'success',
    category: 'activity',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 45,
    targetScreen: 'finance',
    action: {
      label: 'Open Invoices',
      targetScreen: 'finance',
    },
  },
  {
    id: 'notif-sys-cloud',
    title: 'Realtime Cloud Ready',
    message: 'Hybrid storage active. Workspace synchronized with PostgreSQL database.',
    type: 'info',
    category: 'system',
    read: true,
    createdAt: Date.now() - 1000 * 60 * 180,
    targetScreen: 'settings',
  },
];

const DEFAULT_USER: CurrentUser = {
  id: 'stf_01',
  fullName: 'Amine Bentouati (Tamer)',
  email: 'bentouatitamer@gmail.com',
  role: 'Owner',
  roleRank: 8,
  pinCode: '1234',
};

const initialLangConfig = getInitialLanguageConfig();

const DEFAULT_STATE: AppState = {
  storageVersion: ATRIUM_STORAGE_VERSION,
  account: INITIAL_ACCOUNT,
  subscription: {
    id: 'sub_active',
    accountId: INITIAL_ACCOUNT.id,
    planId: 'plan_free_web',
    status: 'active',
    isLifetime: true,
    activatedByVoucher: 'WEB-FREE-EDITION',
    plan: INITIAL_PLANS[0],
  },
  businesses: INITIAL_BUSINESSES,
  branches: INITIAL_BRANCHES,
  currentBusinessId: 'biz_freelance',
  currentBranchId: 'branch_freelance_main',
  activeScreen: 'dashboard',
  theme: 'light',
  language: initialLangConfig.language,
  isLanguageAuto: initialLangConfig.isAuto,
  members: INITIAL_MEMBERS,
  leads: INITIAL_LEADS,
  plansByBranch: INITIAL_PLANS_BY_BRANCH,
  products: [...INITIAL_PRODUCTS, ...INITIAL_TRADING_PRODUCTS],
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
  isDesktopUpgradeModalOpen: false,
  desktopUpgradeReason: 'general',
  supabaseStatus: isSupabaseConfigured() ? 'connecting' : 'unconfigured',
  isSyncing: false,
  lastSyncedAt: null,
  syncErrorMessage: null,
  networkMode: 'online',
  isSyncTimeout: false,
  // Freelancer & Solo Practitioner
  freelanceClients: INITIAL_FREELANCE_CLIENTS,
  freelanceProjects: INITIAL_FREELANCE_PROJECTS,
  timeLogs: INITIAL_TIME_LOGS,
  freelanceInvoices: INITIAL_FREELANCE_INVOICES,
  freelanceProposals: INITIAL_FREELANCE_PROPOSALS,
  freelanceExpenses: INITIAL_FREELANCE_EXPENSES,
  activeTimer: INITIAL_ACTIVE_TIMER,
  parkedOrders: INITIAL_PARKED_ORDERS,
  stockMovements: INITIAL_STOCK_MOVEMENTS,
  receiptConfig: DEFAULT_RECEIPT_CONFIG,
  // Rentals & Venue Management
  rentableUnits: INITIAL_RENTABLE_UNITS,
  rentalBookings: INITIAL_RENTAL_BOOKINGS,
  rentalRenters: INITIAL_RENTAL_RENTERS,
  securityDeposits: INITIAL_SECURITY_DEPOSITS,
  // Education & Training
  eduCourses: INITIAL_EDU_COURSES,
  eduClassrooms: INITIAL_EDU_CLASSROOMS,
  eduCohorts: INITIAL_EDU_COHORTS,
  eduStudents: INITIAL_EDU_STUDENTS,
  eduEnrollments: INITIAL_EDU_ENROLLMENTS,
  eduSessions: INITIAL_EDU_SESSIONS,
  eduAttendance: INITIAL_EDU_ATTENDANCE,
  eduGrades: INITIAL_EDU_GRADES,
  eduCertificates: INITIAL_EDU_CERTIFICATES,
  eduAdmissions: INITIAL_EDU_ADMISSIONS,
  // Project & Milestone
  activePmRole: 'direction',
  activePmSubScreen: 'dashboard',
  pmClients: INITIAL_PM_CLIENTS,
  pmProjects: INITIAL_PM_PROJECTS,
  pmMilestones: INITIAL_PM_MILESTONES,
  pmCollateralCatalog: INITIAL_PM_COLLATERAL_CATALOG,
  pmPrintOrders: INITIAL_PM_PRINT_ORDERS,
  pmBatDeliverables: INITIAL_PM_BAT_DELIVERABLES,
  pmTalents: INITIAL_PM_TALENTS,
  pmMissions: INITIAL_PM_MISSIONS,
  pmAttendances: INITIAL_PM_ATTENDANCES,
  pmExpenses: INITIAL_PM_EXPENSES,
  pmPayrollBatches: INITIAL_PM_PAYROLL_BATCHES,
  pmCcpSlips: INITIAL_PM_CCP_SLIPS,
  pmEquipmentStock: INITIAL_PM_EQUIPMENT_STOCK,
  salonWorkstations: INITIAL_SALON_WORKSTATIONS,
  stylistPayouts: INITIAL_STYLIST_PAYOUTS,
  activeGarageRole: 'gerant',
  activeRealEstateRole: 'direction',
  activeManufacturingRole: 'gerant',
  activeLegalRole: 'avocat_associe',
  activeLogisticsRole: 'gerant',
  activeContractorRole: 'gerant',
  activeAgriRole: 'gerant',
  // Dual-role defaults
  activeMembershipRole: 'owner',
  activeAppointmentRole: 'owner',
  activePosRole: 'owner',
  activeEducationRole: 'owner',
  memberCheckIns: [],
  walkInTickets: [],
  salonChairStations: [],
  eduQuickAttendance: [],
  // B2B Commercial Trading & Wholesale
  b2bClients: INITIAL_B2B_CLIENTS,
  b2bSuppliers: INITIAL_B2B_SUPPLIERS,
  warehouses: INITIAL_WAREHOUSES,
  commercialDocs: INITIAL_COMMERCIAL_DOCS,
  purchaseDocs: INITIAL_PURCHASE_DOCS,
  stockVouchers: INITIAL_STOCK_VOUCHERS,
  toasts: [],
  notifications: INITIAL_NOTIFICATIONS,
};


// In-memory Quadruple Traceability Normalizer
function backfillTraceability(state: AppState): AppState {
  const accountId = state.account?.id || 'acc_01';
  const businessId = state.currentBusinessId || state.businesses[0]?.id || 'biz_01';
  const branchId = state.currentBranchId || state.branches[0]?.id || 'branch_gym_main';
  const defaultStaffId = state.currentUser?.id || state.staff?.[0]?.id || 'stf_01';

  const patch = <T extends Record<string, any>>(item: T): T => {
    const itemBranch = item.branchId || item.facilityId || branchId;
    const branchManager = (state.staff || []).find(
      (s) =>
        (s.branchId === itemBranch || s.facilityId === itemBranch) &&
        ['owner', 'manager', 'admin', 'agencydirector'].includes((s.role || '').toLowerCase())
    );
    const resolvedStaffId = item.staffId || state.currentUser?.id || branchManager?.id || state.staff?.[0]?.id || defaultStaffId;

    return {
      ...item,
      accountId: item.accountId || item.tenantId || accountId,
      businessId: item.businessId || businessId,
      branchId: itemBranch,
      staffId: resolvedStaffId,
    };
  };

  return {
    ...state,
    members: (state.members || []).map(patch),
    leads: (state.leads || []).map(patch),
    products: (state.products || []).map(patch),
    sales: (state.sales || []).map(patch),
    parkedOrders: (state.parkedOrders || []).map(patch),
    stockMovements: (state.stockMovements || []).map(patch),
    staff: (state.staff || []).map((s) => ({
      ...s,
      accountId: s.accountId || s.tenantId || accountId,
      businessId: s.businessId || businessId,
      branchId: s.branchId || s.facilityId || branchId,
    })),
    appointments: (state.appointments || []).map(patch),
    freelanceClients: (state.freelanceClients || []).map(patch),
    freelanceProjects: (state.freelanceProjects || []).map(patch),
    timeLogs: (state.timeLogs || []).map(patch),
    freelanceInvoices: (state.freelanceInvoices || []).map(patch),
    freelanceProposals: (state.freelanceProposals || []).map(patch),
    freelanceExpenses: (state.freelanceExpenses || []).map(patch),
    rentableUnits: (state.rentableUnits || []).map(patch),
    rentalBookings: (state.rentalBookings || []).map(patch),
    rentalRenters: (state.rentalRenters || []).map(patch),
    securityDeposits: (state.securityDeposits || []).map(patch),
    eduStudents: (state.eduStudents || []).map(patch),
    eduCohorts: (state.eduCohorts || []).map(patch),
    eduSessions: (state.eduSessions || []).map(patch),
    eduAttendance: (state.eduAttendance || []).map(patch),
    eduGrades: (state.eduGrades || []).map(patch),
    eduCertificates: (state.eduCertificates || []).map(patch),
    eduEnrollments: (state.eduEnrollments || []).map(patch),
    eduAdmissions: (state.eduAdmissions || []).map(patch),
    pmClients: (state.pmClients || []).map(patch),
    pmProjects: (state.pmProjects || []).map(patch),
    pmPrintOrders: (state.pmPrintOrders || []).map(patch),
    pmBatDeliverables: (state.pmBatDeliverables || []).map(patch),
    pmTalents: (state.pmTalents || []).map(patch),
    pmMissions: (state.pmMissions || []).map(patch),
    pmAttendances: (state.pmAttendances || []).map(patch),
    pmExpenses: (state.pmExpenses || []).map(patch),
    pmPayrollBatches: (state.pmPayrollBatches || []).map(patch),
    pmCcpSlips: (state.pmCcpSlips || []).map(patch),
    pmEquipmentStock: (state.pmEquipmentStock || []).map(patch),
    b2bClients: (state.b2bClients || []).map(patch),
    b2bSuppliers: (state.b2bSuppliers || []).map(patch),
    warehouses: (state.warehouses || []).map(patch),
    commercialDocs: (state.commercialDocs || []).map(patch),
    purchaseDocs: (state.purchaseDocs || []).map(patch),
    stockVouchers: (state.stockVouchers || []).map(patch),
  };
}

// Global reactive subscribers
type Listener = () => void;
let globalState: AppState = backfillTraceability((() => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawBusinesses = Array.isArray(parsed.businesses) && parsed.businesses.length > 0 ? parsed.businesses : INITIAL_BUSINESSES;
        const businesses = rawBusinesses.map((b: any) => {
          if (b.id === 'biz_restaurant' && b.name === 'Bistrot Saint-Germain') {
            return { ...b, name: 'Artis Commerce & Point of Sale', displayName: 'Artis Retail & POS Store' };
          }
          return b;
        });

        const rawBranches = Array.isArray(parsed.branches) && parsed.branches.length > 0 ? parsed.branches : INITIAL_BRANCHES;
        const branches = rawBranches.map((br: any) => {
          if (br.id === 'branch_rest_didouche' && br.name === 'Bistrot Didouche Central') {
            return { ...br, name: 'Artis Flagship Store', code: 'POS-01' };
          }
          return br;
        });
        
        // Ensure valid current business and branch IDs
        const hasValidBusiness = businesses.some((b: any) => b.id === parsed.currentBusinessId);
        const currentBusinessId = hasValidBusiness ? parsed.currentBusinessId : businesses[0].id;
        
        const validBranchesForBiz = branches.filter((br: any) => br.businessId === currentBusinessId);
        const hasValidBranch = branches.some((br: any) => br.id === parsed.currentBranchId);
        const currentBranchId = hasValidBranch ? parsed.currentBranchId : (validBranchesForBiz[0]?.id || branches[0].id);

        const isVersion2 = parsed.storageVersion === ATRIUM_STORAGE_VERSION;

        let mergedProducts = [];
        let mergedSales = [];
        let mergedMembers = [];
        let mergedStaff = [];

        if (isVersion2) {
          mergedProducts = Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS;
          mergedSales = Array.isArray(parsed.sales) ? parsed.sales : INITIAL_SALES;
          mergedMembers = Array.isArray(parsed.members) ? parsed.members : INITIAL_MEMBERS;
          mergedStaff = Array.isArray(parsed.staff) ? parsed.staff : INITIAL_STAFF;
        } else {
          // One-time legacy upgrade backfill
          const storedProducts = Array.isArray(parsed.products) ? parsed.products : [];
          const storedProdIds = new Set(storedProducts.map((p: any) => p.id));
          mergedProducts = [
            ...storedProducts,
            ...INITIAL_PRODUCTS.filter((p) => !storedProdIds.has(p.id)),
          ];

          const storedSales = Array.isArray(parsed.sales) ? parsed.sales : [];
          const storedSaleIds = new Set(storedSales.map((s: any) => s.id));
          mergedSales = [
            ...storedSales,
            ...INITIAL_SALES.filter((s) => !storedSaleIds.has(s.id)),
          ];

          const storedMembers = Array.isArray(parsed.members) ? parsed.members : [];
          const storedMemberIds = new Set(storedMembers.map((m: any) => m.id));
          mergedMembers = [
            ...storedMembers,
            ...INITIAL_MEMBERS.filter((m) => !storedMemberIds.has(m.id)),
            ...INITIAL_SALON_CLIENTS.filter((m) => !storedMemberIds.has(m.id)),
          ];

          const storedStaff = Array.isArray(parsed.staff) ? parsed.staff : [];
          const storedStaffIds = new Set(storedStaff.map((s: any) => s.id));
          mergedStaff = [
            ...storedStaff,
            ...INITIAL_STAFF.filter((s) => !storedStaffIds.has(s.id)),
          ];
        }

        const langConfig = getInitialLanguageConfig();
        const effectiveLanguage = langConfig.isAuto ? getSystemDefaultLanguage() : (parsed.language || langConfig.language);
        const effectiveIsAuto = langConfig.isAuto;

        return {
          ...DEFAULT_STATE,
          ...parsed,
          storageVersion: ATRIUM_STORAGE_VERSION,
          language: effectiveLanguage,
          isLanguageAuto: effectiveIsAuto,
          businesses,
          branches,
          currentBusinessId,
          currentBranchId,
          subscription: parsed.subscription?.plan ? parsed.subscription : DEFAULT_STATE.subscription,
          members: mergedMembers,
          leads: Array.isArray(parsed.leads) ? parsed.leads : INITIAL_LEADS,
          products: mergedProducts,
          sales: mergedSales,
          staff: mergedStaff,
          schedule: Array.isArray(parsed.schedule) ? parsed.schedule : INITIAL_SCHEDULE,
          devices: Array.isArray(parsed.devices) ? parsed.devices : INITIAL_DEVICES,
          appointments: Array.isArray(parsed.appointments) ? parsed.appointments : INITIAL_APPOINTMENTS,
          servicesCatalog: Array.isArray(parsed.servicesCatalog) ? parsed.servicesCatalog : INITIAL_SALON_SERVICES,
          salonWorkstations: Array.isArray(parsed.salonWorkstations) ? parsed.salonWorkstations : INITIAL_SALON_WORKSTATIONS,
          stylistPayouts: Array.isArray(parsed.stylistPayouts) ? parsed.stylistPayouts : INITIAL_STYLIST_PAYOUTS,
          freelanceClients: Array.isArray(parsed.freelanceClients) ? parsed.freelanceClients : INITIAL_FREELANCE_CLIENTS,
          freelanceProjects: Array.isArray(parsed.freelanceProjects) ? parsed.freelanceProjects : INITIAL_FREELANCE_PROJECTS,
          timeLogs: Array.isArray(parsed.timeLogs) ? parsed.timeLogs : INITIAL_TIME_LOGS,
          freelanceInvoices: Array.isArray(parsed.freelanceInvoices) ? parsed.freelanceInvoices : INITIAL_FREELANCE_INVOICES,
          freelanceProposals: Array.isArray(parsed.freelanceProposals) ? parsed.freelanceProposals : INITIAL_FREELANCE_PROPOSALS,
          freelanceExpenses: Array.isArray(parsed.freelanceExpenses) ? parsed.freelanceExpenses : INITIAL_FREELANCE_EXPENSES,
          activeTimer: parsed.activeTimer || INITIAL_ACTIVE_TIMER,
          parkedOrders: Array.isArray(parsed.parkedOrders) ? parsed.parkedOrders : INITIAL_PARKED_ORDERS,
          stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : INITIAL_STOCK_MOVEMENTS,
          receiptConfig: parsed.receiptConfig || DEFAULT_RECEIPT_CONFIG,
          rentableUnits: Array.isArray(parsed.rentableUnits) ? parsed.rentableUnits : INITIAL_RENTABLE_UNITS,
          rentalBookings: Array.isArray(parsed.rentalBookings) ? parsed.rentalBookings : INITIAL_RENTAL_BOOKINGS,
          rentalRenters: Array.isArray(parsed.rentalRenters) ? parsed.rentalRenters : INITIAL_RENTAL_RENTERS,
          securityDeposits: Array.isArray(parsed.securityDeposits) ? parsed.securityDeposits : INITIAL_SECURITY_DEPOSITS,
          eduCourses: Array.isArray(parsed.eduCourses) ? parsed.eduCourses : INITIAL_EDU_COURSES,
          eduClassrooms: Array.isArray(parsed.eduClassrooms) ? parsed.eduClassrooms : INITIAL_EDU_CLASSROOMS,
          eduCohorts: Array.isArray(parsed.eduCohorts) ? parsed.eduCohorts : INITIAL_EDU_COHORTS,
          eduStudents: Array.isArray(parsed.eduStudents) ? parsed.eduStudents : INITIAL_EDU_STUDENTS,
          eduEnrollments: Array.isArray(parsed.eduEnrollments) ? parsed.eduEnrollments : INITIAL_EDU_ENROLLMENTS,
          eduSessions: Array.isArray(parsed.eduSessions) ? parsed.eduSessions : INITIAL_EDU_SESSIONS,
          eduAttendance: Array.isArray(parsed.eduAttendance) ? parsed.eduAttendance : INITIAL_EDU_ATTENDANCE,
          eduGrades: Array.isArray(parsed.eduGrades) ? parsed.eduGrades : INITIAL_EDU_GRADES,
          eduCertificates: Array.isArray(parsed.eduCertificates) ? parsed.eduCertificates : INITIAL_EDU_CERTIFICATES,
          eduAdmissions: Array.isArray(parsed.eduAdmissions) ? parsed.eduAdmissions : INITIAL_EDU_ADMISSIONS,
          // PM Hydration
          activePmRole: parsed.activePmRole || 'direction',
          pmClients: Array.isArray(parsed.pmClients) ? parsed.pmClients : INITIAL_PM_CLIENTS,
          pmProjects: Array.isArray(parsed.pmProjects) ? parsed.pmProjects : INITIAL_PM_PROJECTS,
          pmMilestones: Array.isArray(parsed.pmMilestones) ? parsed.pmMilestones : INITIAL_PM_MILESTONES,
          pmCollateralCatalog: Array.isArray(parsed.pmCollateralCatalog) ? parsed.pmCollateralCatalog : INITIAL_PM_COLLATERAL_CATALOG,
          pmPrintOrders: Array.isArray(parsed.pmPrintOrders) ? parsed.pmPrintOrders : INITIAL_PM_PRINT_ORDERS,
          pmBatDeliverables: Array.isArray(parsed.pmBatDeliverables) ? parsed.pmBatDeliverables : INITIAL_PM_BAT_DELIVERABLES,
          pmTalents: Array.isArray(parsed.pmTalents) ? parsed.pmTalents : INITIAL_PM_TALENTS,
          pmMissions: Array.isArray(parsed.pmMissions) ? parsed.pmMissions : INITIAL_PM_MISSIONS,
          pmAttendances: Array.isArray(parsed.pmAttendances) ? parsed.pmAttendances : INITIAL_PM_ATTENDANCES,
          pmExpenses: Array.isArray(parsed.pmExpenses) ? parsed.pmExpenses : INITIAL_PM_EXPENSES,
          pmPayrollBatches: Array.isArray(parsed.pmPayrollBatches) ? parsed.pmPayrollBatches : INITIAL_PM_PAYROLL_BATCHES,
          pmCcpSlips: Array.isArray(parsed.pmCcpSlips) ? parsed.pmCcpSlips : INITIAL_PM_CCP_SLIPS,
          pmEquipmentStock: Array.isArray(parsed.pmEquipmentStock) ? parsed.pmEquipmentStock : INITIAL_PM_EQUIPMENT_STOCK,
          // B2B Trading & Commercial Hydration
          b2bClients: Array.isArray(parsed.b2bClients) ? parsed.b2bClients : INITIAL_B2B_CLIENTS,
          b2bSuppliers: Array.isArray(parsed.b2bSuppliers) ? parsed.b2bSuppliers : INITIAL_B2B_SUPPLIERS,
          warehouses: Array.isArray(parsed.warehouses) ? parsed.warehouses : INITIAL_WAREHOUSES,
          commercialDocs: Array.isArray(parsed.commercialDocs) ? parsed.commercialDocs : INITIAL_COMMERCIAL_DOCS,
          purchaseDocs: Array.isArray(parsed.purchaseDocs) ? parsed.purchaseDocs : INITIAL_PURCHASE_DOCS,
          stockVouchers: Array.isArray(parsed.stockVouchers) ? parsed.stockVouchers : INITIAL_STOCK_VOUCHERS,
          currentUser: parsed.currentUser || DEFAULT_USER,
          // Dual-Role Hydration
          activeMembershipRole: parsed.activeMembershipRole || 'owner',
          activeAppointmentRole: parsed.activeAppointmentRole || 'owner',
          activePosRole: parsed.activePosRole || 'owner',
          activeEducationRole: parsed.activeEducationRole || 'owner',
          memberCheckIns: Array.isArray(parsed.memberCheckIns) ? parsed.memberCheckIns : [],
          walkInTickets: Array.isArray(parsed.walkInTickets) ? parsed.walkInTickets : [],
          salonChairStations: Array.isArray(parsed.salonChairStations) ? parsed.salonChairStations : [],
          eduQuickAttendance: Array.isArray(parsed.eduQuickAttendance) ? parsed.eduQuickAttendance : [],
          isAuthenticated: parsed.isAuthenticated !== undefined ? parsed.isAuthenticated : true,
          isOnboardingOpen: false,
          isFastSwitchOpen: false,
          isDesktopUpgradeModalOpen: false,
          desktopUpgradeReason: 'general',
          supabaseStatus: isSupabaseConfigured() ? 'connecting' : 'unconfigured',
          isSyncing: false,
          notifications: Array.isArray(parsed.notifications) && parsed.notifications.length > 0 ? parsed.notifications : INITIAL_NOTIFICATIONS,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load Atrium state from localStorage, falling back to clean default state', e);
  }
  return DEFAULT_STATE;
})());

const listeners = new Set<Listener>();

function notify() {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
    }
  } catch (e) {
    console.warn('Failed to persist state', e);
  }
  listeners.forEach((l) => l());
}

const EMPTY_PLANS: MembershipPlan[] = [];

// Module-level singletons to prevent race conditions across multiple hook consumers
let hasInitialSynced = false;
let activeBranchSub: (() => void) | null = null;
let activeSubscribedBranchId: string | null = null;
let activeTimerInterval: ReturnType<typeof setInterval> | null = null;

function ensureBranchSubscription(branchId: string) {
  if (!isSupabaseConfigured()) return;
  if (activeSubscribedBranchId === branchId && activeBranchSub) {
    return;
  }
  if (activeBranchSub) {
    try {
      activeBranchSub();
    } catch (e) {
      console.warn('[store] Cleanup old branch realtime failed:', e);
    }
    activeBranchSub = null;
  }
  activeSubscribedBranchId = branchId;
  activeBranchSub = realtimeService.subscribeToBranch(branchId, {
    onMemberChange: () => {
      memberService.fetchMembers(branchId).then((newMembers) => {
        if (newMembers.length > 0) {
          const others = globalState.members.filter((m) => m.facilityId !== branchId);
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
      memberService.fetchRegistrationRequests(branchId).then((newLeads) => {
        if (newLeads.length > 0) {
          const others = globalState.leads.filter((l) => l.facilityId !== branchId);
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
}

function ensureTimerTick(isRunning: boolean, isPaused: boolean) {
  if (isRunning && !isPaused) {
    if (!activeTimerInterval) {
      activeTimerInterval = setInterval(() => {
        const current = globalState.activeTimer;
        if (!current.isRunning || current.isPaused) {
          if (activeTimerInterval) {
            clearInterval(activeTimerInterval);
            activeTimerInterval = null;
          }
          return;
        }

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
    }
  } else {
    if (activeTimerInterval) {
      clearInterval(activeTimerInterval);
      activeTimerInterval = null;
    }
  }
}

export function dismissToast(id: string) {
  globalState = {
    ...globalState,
    toasts: (globalState.toasts || []).filter((t) => t.id !== id),
  };
  notify();
}

export function markNotificationAsRead(id: string) {
  globalState = {
    ...globalState,
    notifications: (globalState.notifications || []).map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  };
  notify();
}

export function markAllNotificationsAsRead() {
  globalState = {
    ...globalState,
    notifications: (globalState.notifications || []).map((n) => ({ ...n, read: true })),
  };
  notify();
}

export function clearAllNotifications() {
  globalState = {
    ...globalState,
    notifications: [],
  };
  notify();
}

export function removeNotification(id: string) {
  globalState = {
    ...globalState,
    notifications: (globalState.notifications || []).filter((n) => n.id !== id),
  };
  notify();
}

export function addNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
    id?: string;
    read?: boolean;
    createdAt?: number;
  }
) {
  const newNotif: AppNotification = {
    id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: notification.title,
    message: notification.message,
    type: notification.type || 'info',
    category: notification.category || 'activity',
    read: notification.read ?? false,
    createdAt: notification.createdAt || Date.now(),
    targetScreen: notification.targetScreen,
    action: notification.action,
  };

  globalState = {
    ...globalState,
    notifications: [newNotif, ...(globalState.notifications || [])].slice(0, 50),
  };
  notify();
  return newNotif;
}

export function showToast(
  toastInputOrMessage:
    | string
    | {
        type: ToastType;
        title: string;
        message: string;
        duration?: number;
        syncStatus?: ToastSyncStatus;
        table?: string;
        category?: BusinessCategory;
        action?: {
          label: string;
          onClick: () => void;
        };
      },
  toastType?: ToastType
) {
  const isString = typeof toastInputOrMessage === 'string';
  const type: ToastType = isString ? (toastType || 'info') : toastInputOrMessage.type;
  const title: string = isString
    ? (type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : type === 'warning' ? 'Attention' : 'Notification')
    : toastInputOrMessage.title;
  const message: string = isString ? toastInputOrMessage : toastInputOrMessage.message;
  const duration = isString ? 3000 : (toastInputOrMessage.duration ?? 3000);
  const syncStatus = isString ? undefined : toastInputOrMessage.syncStatus;
  const table = isString ? undefined : toastInputOrMessage.table;
  const category = isString ? undefined : toastInputOrMessage.category;
  const action = isString ? undefined : toastInputOrMessage.action;

  const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newToast: ToastNotification = {
    id,
    type,
    title,
    message,
    duration,
    syncStatus,
    table,
    category,
    action,
    createdAt: Date.now(),
  };

  // Log into persistent notification history so user never misses critical updates
  const notifCategory: NotificationCategory =
    type === 'error' || type === 'warning'
      ? 'alert'
      : syncStatus
      ? 'system'
      : 'activity';

  const newNotification: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    type,
    category: notifCategory,
    read: false,
    createdAt: Date.now(),
    action,
  };

  globalState = {
    ...globalState,
    toasts: [...(globalState.toasts || []), newToast],
    notifications: [newNotification, ...(globalState.notifications || [])].slice(0, 60),
  };
  notify();

  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, newToast.duration);
  }
}

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

      const [
        businesses,
        branches,
        members,
        leads,
        staff,
        appointments,
        products,
        sales,
        freelanceClients,
        freelanceProjects,
        freelanceTimeLogs,
        freelanceInvoices,
        freelanceProposals,
        freelanceExpenses,
        rentableUnits,
        rentalBookings,
        rentalRenters,
        securityDeposits,
      ] = await Promise.all([
        tenantService.fetchBusinesses(accountId),
        tenantService.fetchBranches(accountId),
        memberService.fetchMembers(globalState.currentBranchId),
        memberService.fetchRegistrationRequests(globalState.currentBranchId),
        staffService.fetchStaffForSync(accountId, globalState.currentBranchId),
        appointmentService.fetchAppointments(globalState.currentBranchId),
        posService.fetchProducts(globalState.currentBranchId),
        posService.fetchSales(globalState.currentBranchId),
        freelanceService.fetchClients(globalState.currentBranchId),
        freelanceService.fetchProjects(globalState.currentBranchId),
        freelanceService.fetchTimeLogs(globalState.currentBranchId),
        freelanceService.fetchInvoices(globalState.currentBranchId),
        freelanceService.fetchProposals(globalState.currentBranchId),
        freelanceService.fetchExpenses(globalState.currentBranchId),
        rentalService.fetchUnits(globalState.currentBranchId),
        rentalService.fetchBookings(globalState.currentBranchId),
        rentalService.fetchRenters(globalState.currentBranchId),
        rentalService.fetchDeposits(globalState.currentBranchId),
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
      if (appointments.length > 0) {
        updates.appointments = appointments;
      }
      if (products.length > 0) {
        updates.products = products;
      }
      if (sales.length > 0) {
        updates.sales = sales;
      }
      if (freelanceClients.length > 0) {
        updates.freelanceClients = freelanceClients;
      }
      if (freelanceProjects.length > 0) {
        updates.freelanceProjects = freelanceProjects;
      }
      if (freelanceTimeLogs.length > 0) {
        updates.timeLogs = freelanceTimeLogs;
      }
      if (freelanceInvoices.length > 0) {
        updates.freelanceInvoices = freelanceInvoices;
      }
      if (freelanceProposals.length > 0) {
        updates.freelanceProposals = freelanceProposals;
      }
      if (freelanceExpenses.length > 0) {
        updates.freelanceExpenses = freelanceExpenses;
      }
      if (rentableUnits.length > 0) {
        const otherUnits = globalState.rentableUnits.filter((u) => u.facilityId !== globalState.currentBranchId);
        updates.rentableUnits = [...rentableUnits, ...otherUnits];
      }
      if (rentalBookings.length > 0) {
        const otherBookings = globalState.rentalBookings.filter((b) => b.facilityId !== globalState.currentBranchId);
        updates.rentalBookings = [...rentalBookings, ...otherBookings];
      }
      if (rentalRenters.length > 0) {
        const otherRenters = globalState.rentalRenters.filter((r) => r.facilityId !== globalState.currentBranchId);
        updates.rentalRenters = [...rentalRenters, ...otherRenters];
      }
      if (securityDeposits.length > 0) {
        const otherDeposits = globalState.securityDeposits.filter((d) => d.facilityId !== globalState.currentBranchId);
        updates.securityDeposits = [...securityDeposits, ...otherDeposits];
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

  // Synchronize on mount if configured (once across the application)
  useEffect(() => {
    if (isSupabaseConfigured() && !hasInitialSynced) {
      hasInitialSynced = true;
      syncWithSupabase();
    }
  }, []);

  // Supabase Auth state listener for seamless Google OAuth session hydration
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubscribe = authService.onAuthStateChange(async (session) => {
      if (session?.user) {
        await authService.ensureUserAccount(session.user);
        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'Atrium Owner';
        globalState = {
          ...globalState,
          currentUser: {
            ...globalState.currentUser,
            id: session.user.id,
            email: session.user.email || globalState.currentUser.email,
            fullName,
          },
          isAuthenticated: true,
        };
        notify();
        syncWithSupabase();
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time synchronization subscription for current active branch
  useEffect(() => {
    ensureBranchSubscription(state.currentBranchId);
  }, [state.currentBranchId]);

  // Active Timer Background Tick
  useEffect(() => {
    ensureTimerTick(state.activeTimer.isRunning, state.activeTimer.isPaused);
  }, [state.activeTimer.isRunning, state.activeTimer.isPaused]);

  // Helpers
  const currentBusiness =
    (state.businesses && state.businesses.find((b) => b.id === state.currentBusinessId)) ||
    (state.businesses && state.businesses[0]) ||
    INITIAL_BUSINESSES[0];
  const currentBranch =
    (state.branches && state.branches.find((b) => b.id === state.currentBranchId)) ||
    (state.branches && state.branches[0]) ||
    INITIAL_BRANCHES[0];
  const terminology = getCategoryTerminology(currentBusiness?.category || 'pos_inventory', state.language);

  // Quotas
  const plan = state.subscription?.plan || INITIAL_PLANS[0];
  const businessQuota = checkQuota((state.businesses || []).length, plan?.maxBusinesses || 1);
  const branchQuota = checkQuota((state.branches || []).length, plan?.maxBranches || 1);
  const deviceQuota = checkQuota((state.devices || []).length, plan?.maxDevices || 1);
  const staffQuota = checkQuota((state.staff || []).length, plan?.maxStaff || 1);

  // Scoped lists
  const currentMembers = (state.members || []).filter((m) => m.facilityId === state.currentBranchId);
  const currentLeads = (state.leads || []).filter((l) => l.facilityId === state.currentBranchId);
  const currentProducts = (state.products || []).filter((p) => p.facilityId === state.currentBranchId);
  const currentStaff = (state.staff || []).filter((s) => s.facilityId === state.currentBranchId);
  const currentSales = (state.sales || []).filter((s) => s.facilityId === state.currentBranchId);
  const currentSchedule = (state.schedule || []).filter((sc) => sc.facilityId === state.currentBranchId);
  const currentPlans = (state.plansByBranch && state.plansByBranch[state.currentBranchId]) || EMPTY_PLANS;
  const currentAppointments = (state.appointments || []).filter((a) => a.facilityId === state.currentBranchId);
  const currentServices = (state.servicesCatalog || []).filter((s) => s.facilityId === state.currentBranchId);
  const currentParkedOrders = (state.parkedOrders || []).filter((p) => p.facilityId === state.currentBranchId);
  const currentStockMovements = (state.stockMovements || []).filter((sm) => sm.facilityId === state.currentBranchId);
  const currentFreelanceClients = (() => {
    const list = state.freelanceClients || [];
    const direct = list.filter((c) => c.facilityId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultFreelance = list.filter((c) => c.facilityId === 'branch_freelance_main');
    return defaultFreelance.length > 0 ? defaultFreelance : list;
  })();
  const currentFreelanceProjects = (() => {
    const list = state.freelanceProjects || [];
    const direct = list.filter((p) => p.facilityId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultFreelance = list.filter((p) => p.facilityId === 'branch_freelance_main');
    return defaultFreelance.length > 0 ? defaultFreelance : list;
  })();
  const currentTimeLogs = (() => {
    const list = state.timeLogs || [];
    const direct = list.filter((t) => t.facilityId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultFreelance = list.filter((t) => t.facilityId === 'branch_freelance_main');
    return defaultFreelance.length > 0 ? defaultFreelance : list;
  })();
  const currentFreelanceInvoices = (() => {
    const list = state.freelanceInvoices || [];
    const direct = list.filter((i) => i.facilityId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultFreelance = list.filter((i) => i.facilityId === 'branch_freelance_main');
    return defaultFreelance.length > 0 ? defaultFreelance : list;
  })();
  const currentFreelanceProposals = (() => {
    const list = state.freelanceProposals || [];
    const direct = list.filter((pr) => pr.facilityId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultFreelance = list.filter((pr) => pr.facilityId === 'branch_freelance_main');
    return defaultFreelance.length > 0 ? defaultFreelance : list;
  })();
  const currentFreelanceExpenses = (() => {
    const list = state.freelanceExpenses || [];
    const direct = list.filter((e) => e.facilityId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultFreelance = list.filter((e) => e.facilityId === 'branch_freelance_main');
    return defaultFreelance.length > 0 ? defaultFreelance : list;
  })();
  const currentRentableUnits = (() => {
    const list = state.rentableUnits || [];
    const direct = list.filter((u) => u.facilityId === state.currentBranchId || u.branchId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultVenue = list.filter((u) => u.facilityId === 'branch_venue_main' || u.branchId === 'branch_venue_main');
    return defaultVenue.length > 0 ? defaultVenue : list;
  })();

  const currentRentalBookings = (() => {
    const list = state.rentalBookings || [];
    const direct = list.filter((b) => b.facilityId === state.currentBranchId || b.branchId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultVenue = list.filter((b) => b.facilityId === 'branch_venue_main' || b.branchId === 'branch_venue_main');
    return defaultVenue.length > 0 ? defaultVenue : list;
  })();

  const currentRentalRenters = (() => {
    const list = state.rentalRenters || [];
    const direct = list.filter((r) => r.facilityId === state.currentBranchId || r.branchId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultVenue = list.filter((r) => r.facilityId === 'branch_venue_main' || r.branchId === 'branch_venue_main');
    return defaultVenue.length > 0 ? defaultVenue : list;
  })();

  const currentSecurityDeposits = (() => {
    const list = state.securityDeposits || [];
    const direct = list.filter((d) => d.facilityId === state.currentBranchId || d.branchId === state.currentBranchId);
    if (direct.length > 0) return direct;
    const defaultVenue = list.filter((d) => d.facilityId === 'branch_venue_main' || d.branchId === 'branch_venue_main');
    return defaultVenue.length > 0 ? defaultVenue : list;
  })();
  const currentEduCourses = (state.eduCourses || []).filter((c) => c.facilityId === state.currentBranchId);
  const currentEduClassrooms = (state.eduClassrooms || []).filter((cr) => cr.facilityId === state.currentBranchId);
  const currentEduCohorts = (state.eduCohorts || []).filter((ch) => ch.facilityId === state.currentBranchId);
  const currentEduStudents = (state.eduStudents || []).filter((s) => s.facilityId === state.currentBranchId);
  const currentEduEnrollments = (state.eduEnrollments || []).filter((e) => e.facilityId === state.currentBranchId);
  const currentEduSessions = (state.eduSessions || []).filter((se) => se.facilityId === state.currentBranchId);
  const currentEduAttendance = (state.eduAttendance || []).filter((at) => at.facilityId === state.currentBranchId);
  const currentEduGrades = (state.eduGrades || []).filter((g) => g.facilityId === state.currentBranchId);
  const currentEduCertificates = (state.eduCertificates || []).filter((ce) => ce.facilityId === state.currentBranchId);
  const currentEduAdmissions = (state.eduAdmissions || []).filter((ad) => ad.facilityId === state.currentBranchId);

  const selectedMember = state.selectedMemberId
    ? state.members.find((m) => m.id === state.selectedMemberId) || null
    : null;

  // Actions
  const setScreen = (activeScreen: ActiveScreen) => {
    let nextRole = globalState.activePmRole;
    let nextSubScreen = globalState.activePmSubScreen;

    // Role 1: Direction
    if (activeScreen === 'pm_dir_dashboard') {
      nextRole = 'direction';
      nextSubScreen = 'dashboard';
    } else if (activeScreen === 'pm_dir_new_project') {
      nextRole = 'direction';
      nextSubScreen = 'new_project';
    } else if (activeScreen === 'pm_dir_projects') {
      nextRole = 'direction';
      nextSubScreen = 'dashboard';
    } else if (activeScreen === 'pm_dir_approvals') {
      nextRole = 'direction';
      nextSubScreen = 'approvals';
    } else if (activeScreen === 'pm_dir_reports') {
      nextRole = 'direction';
      nextSubScreen = 'reports';
    // Role 2: Chef de Projet
    } else if (activeScreen === 'pm_cp_projects') {
      nextRole = 'chef_projet';
      nextSubScreen = 'portfolio';
    } else if (activeScreen === 'pm_cp_catalog') {
      nextRole = 'chef_projet';
      nextSubScreen = 'catalog';
    } else if (activeScreen === 'pm_cp_orders') {
      nextRole = 'chef_projet';
      nextSubScreen = 'orders';
    } else if (activeScreen === 'pm_cp_deliverables' || activeScreen === 'pm_cp_files') {
      nextRole = 'chef_projet';
      nextSubScreen = 'bat';
    } else if (activeScreen === 'pm_cp_expenses') {
      nextRole = 'chef_projet';
      nextSubScreen = 'expenses';
    // Role 3: Créa Studio
    } else if (activeScreen === 'pm_crea_kanban') {
      nextRole = 'crea';
      nextSubScreen = 'demandes';
    } else if (activeScreen === 'pm_crea_production') {
      nextRole = 'crea';
      nextSubScreen = 'production';
    } else if (activeScreen === 'pm_crea_upload') {
      nextRole = 'crea';
      nextSubScreen = 'upload';
    } else if (activeScreen === 'pm_crea_briefs') {
      nextRole = 'crea';
      nextSubScreen = 'briefs';
    // Role 4: Superviseur Terrain
    } else if (activeScreen === 'pm_sup_missions') {
      nextRole = 'superviseur';
      nextSubScreen = 'missions';
    } else if (activeScreen === 'pm_sup_attendance') {
      nextRole = 'superviseur';
      nextSubScreen = 'attendance';
    } else if (activeScreen === 'pm_sup_staffing') {
      nextRole = 'superviseur';
      nextSubScreen = 'staffing';
    } else if (activeScreen === 'pm_sup_expenses') {
      nextRole = 'superviseur';
      nextSubScreen = 'expense';
    // Role 5: Ressources Humaines
    } else if (activeScreen === 'pm_rh_talents') {
      nextRole = 'rh';
      nextSubScreen = 'talents';
    } else if (activeScreen === 'pm_rh_dossier') {
      nextRole = 'rh';
      nextSubScreen = 'dossier';
    } else if (activeScreen === 'pm_rh_portal') {
      nextRole = 'rh';
      nextSubScreen = 'portal';
    } else if (activeScreen === 'pm_rh_walkin') {
      nextRole = 'rh';
      nextSubScreen = 'walkin';
    // Role 6: Comptabilité & Finance
    } else if (activeScreen === 'pm_compta_payroll') {
      nextRole = 'compta';
      nextSubScreen = 'payroll';
    } else if (activeScreen === 'pm_compta_ccp') {
      nextRole = 'compta';
      nextSubScreen = 'ccp';
    } else if (activeScreen === 'pm_compta_expenses') {
      nextRole = 'compta';
      nextSubScreen = 'expenses';
    } else if (activeScreen === 'pm_compta_stock') {
      nextRole = 'compta';
      nextSubScreen = 'stock';
    // Category mapping when in Agency mode
    } else if (currentBusiness?.category === 'project_milestone') {
      if (activeScreen === 'dashboard') {
        nextRole = 'direction';
        nextSubScreen = 'dashboard';
      } else if (activeScreen === 'scheduler') {
        nextRole = 'chef_projet';
        nextSubScreen = 'portfolio';
      } else if (activeScreen === 'registrations') {
        nextRole = 'crea';
        nextSubScreen = 'demandes';
      } else if (activeScreen === 'analytics') {
        nextRole = 'superviseur';
        nextSubScreen = 'missions';
      } else if (activeScreen === 'members') {
        nextRole = 'rh';
        nextSubScreen = 'talents';
      } else if (activeScreen === 'finance' || activeScreen === 'shop') {
        nextRole = 'compta';
        nextSubScreen = 'payroll';
      }
    }

    globalState = {
      ...globalState,
      activeScreen,
      activePmRole: nextRole,
      activePmSubScreen: nextSubScreen,
    };
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

  const setLanguage = (language: SupportedLanguage, isAuto = false) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('atrium_language', language);
        localStorage.setItem('atrium_language_mode', isAuto ? 'auto' : 'manual');
      }
    } catch {}
    globalState = { ...globalState, language, isLanguageAuto: isAuto };
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    notify();
  };

  const setSystemDefaultLanguage = () => {
    const sysLang = getSystemDefaultLanguage();
    setLanguage(sysLang, true);
  };

  const switchFacility = (businessId: string, branchId?: string) => {
    const targetBranches = state.branches.filter((b) => b.businessId === businessId);
    const targetBranchId = branchId || (targetBranches[0]?.id ?? state.branches[0].id);
    const targetBusiness = state.businesses.find((b) => b.id === businessId);

    let nextScreen = globalState.activeScreen;
    if (targetBusiness?.category === 'pos_inventory') {
      if (nextScreen === 'scheduler' || nextScreen === 'registrations') {
        nextScreen = 'shop';
      }
    } else if (targetBusiness?.category === 'freelance_solo') {
      if (nextScreen === 'history') {
        nextScreen = 'dashboard';
      }
    } else if (targetBusiness?.category === 'appointment_service') {
      if (nextScreen === 'registrations') {
        nextScreen = 'scheduler';
      }
    }

    const prevBusinessId = state.currentBusinessId;
    const prevBranchId = state.currentBranchId;

    globalState = {
      ...globalState,
      currentBusinessId: businessId,
      currentBranchId: targetBranchId,
      activeScreen: nextScreen,
      selectedMemberId: null,
      isDetailOpen: false,
    };
    notify();

    showToast({
      type: 'info',
      title: 'Facility Switched',
      message: `Active workspace changed to ${targetBusiness?.name || 'facility'}.`,
      category: targetBusiness?.category,
      action: {
        label: 'Undo Switch',
        onClick: () => {
          switchFacility(prevBusinessId, prevBranchId);
        },
      },
    });
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

  const getTraceContext = () => {
    const branchManager = (state.staff || []).find(
      (s) =>
        (s.branchId === state.currentBranchId || s.facilityId === state.currentBranchId) &&
        ['owner', 'manager', 'admin', 'agencydirector'].includes((s.role || '').toLowerCase())
    );
    const activeStaffId =
      state.currentUser?.id || branchManager?.id || (state.staff && state.staff.length > 0 ? state.staff[0].id : undefined);

    return {
      accountId: state.account.id,
      businessId: state.currentBusinessId,
      branchId: state.currentBranchId,
      staffId: activeStaffId,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
    };
  };

  const addMember = (newMember: Omit<Member, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>) => {
    const trace = getTraceContext();
    const member: Member = {
      ...trace,
      ...newMember,
      id: `mem_${Date.now()}`,
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

    const currentBiz = globalState.businesses.find((b) => b.id === globalState.currentBusinessId);
    const cat = currentBiz?.category || 'membership_session';
    const lang = globalState.language || 'fr';
    const terms = getCategoryTerminology(cat, lang);

    showToast({
      type: 'success',
      title: `${terms.memberSingle} : ${t('toast_member_enrolled_title', lang)}`,
      message: `${member.fullName} ${t('toast_member_enrolled_msg', lang)} ${member.membershipPlanName || 'Standard'}.`,
      category: cat,
      action: {
        label: t('nav_members', lang),
        onClick: () => {
          globalState = {
            ...globalState,
            selectedMemberId: member.id,
            isDetailOpen: true,
            activeScreen: 'members',
          };
          notify();
        },
      },
    });

    if (isSupabaseConfigured()) {
      memberService.createMember(member).catch((err) => {
        console.warn('[store] Failed to save member to Supabase:', err);
      });
    }

    return member;
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    const target = globalState.members.find((m) => m.id === id);
    globalState = {
      ...globalState,
      members: globalState.members.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      ),
    };
    notify();

    const currentBiz = globalState.businesses.find((b) => b.id === globalState.currentBusinessId);
    const cat = currentBiz?.category || 'membership_session';
    const lang = globalState.language || 'fr';
    showToast({
      type: 'info',
      title: t('toast_profile_updated_title', lang),
      message: `${updates.fullName || target?.fullName || 'Record'} : ${t('toast_profile_updated_msg', lang)}`,
      category: cat,
    });

    if (isSupabaseConfigured()) {
      if (target) {
        memberService.updateMember({ ...target, ...updates }).catch((err) => {
          console.warn('[store] Failed to update member in Supabase:', err);
        });
      }
    }
  };

  const deleteMember = (id: string) => {
    const target = globalState.members.find((m) => m.id === id);
    globalState = {
      ...globalState,
      members: globalState.members.filter((m) => m.id !== id),
      selectedMemberId: globalState.selectedMemberId === id ? null : globalState.selectedMemberId,
      isDetailOpen: globalState.selectedMemberId === id ? false : globalState.isDetailOpen,
    };
    notify();

    const currentBiz = globalState.businesses.find((b) => b.id === globalState.currentBusinessId);
    const cat = currentBiz?.category || 'membership_session';
    const lang = globalState.language || 'fr';
    const terms = getCategoryTerminology(cat, lang);
    showToast({
      type: 'warning',
      title: `${terms.memberSingle} : ${t('toast_member_removed_title', lang)}`,
      message: `${target?.fullName || 'Record'} ${t('toast_member_removed_msg', lang)}`,
      category: cat,
    });

    if (isSupabaseConfigured()) {
      memberService.deleteMember(id).catch((err) => {
        console.warn('[store] Failed to delete member in Supabase:', err);
      });
    }
  };

  const checkInMember = (id: string) => {
    const member = globalState.members.find((m) => m.id === id);
    if (!member) return;

    const currentBiz = globalState.businesses.find((b) => b.id === globalState.currentBusinessId);
    const cat = currentBiz?.category || 'membership_session';
    const lang = globalState.language || 'fr';

    // 1. Check suspended/blocked status
    if (member.status === 'Banned' || member.status === 'Suspended' || member.status === 'Frozen') {
      showToast({
        type: 'error',
        title: t('toast_checkin_blocked_title', lang),
        message: `${member.fullName}: ${t('toast_checkin_blocked_msg', lang)}`,
        category: cat,
      });
      return;
    }

    // 2. Check expiration
    const daysLeft = calculateDaysRemaining(false, member.expirationDate);
    const isExpiredDate = member.expirationDate ? new Date(member.expirationDate).getTime() < Date.now() : false;
    if (daysLeft <= 0 || member.status === 'Expired' || isExpiredDate) {
      showToast({
        type: 'warning',
        title: t('toast_checkin_expired_title', lang),
        message: `${member.fullName}: ${t('toast_checkin_expired_msg', lang)}`,
        category: cat,
      });
      return;
    }

    // 3. Check remaining visits if finite
    if (member.remainingSessions !== undefined && member.remainingSessions <= 0) {
      showToast({
        type: 'warning',
        title: t('toast_checkin_expired_title', lang),
        message: `${member.fullName}: ${t('toast_checkin_quota_exhausted', lang)}`,
        category: cat,
      });
      return;
    }

    // 4. Access Granted
    const updatedSessions = member.remainingSessions !== undefined ? Math.max(0, member.remainingSessions - 1) : undefined;
    globalState = {
      ...globalState,
      members: globalState.members.map((m) =>
        m.id === id
          ? {
              ...m,
              remainingSessions: updatedSessions !== undefined ? updatedSessions : m.remainingSessions,
              updatedAt: new Date().toISOString(),
            }
          : m
      ),
    };
    notify();

    showToast({
      type: 'success',
      title: t('toast_checkin_granted_title', lang),
      message: `${member.fullName} (${member.cardId || 'RFID'}): ${t('toast_checkin_granted_msg', lang)}`,
      category: cat,
    });
  };

  const addLead = (newLead: Omit<RegistrationLead, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>) => {
    const activeStaffId = state.currentUser?.id || state.staff[0]?.id || undefined;
    const lead: RegistrationLead = {
      ...newLead,
      id: `lead_${Date.now()}`,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
      branchId: state.currentBranchId,
      staffId: activeStaffId,
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

  const deleteLead = (leadId: string) => {
    globalState = {
      ...globalState,
      leads: globalState.leads.filter((l) => l.id !== leadId),
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

    const trace = getTraceContext();
    const newMember: Member = {
      ...trace,
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
    items: Array<{
      product: Product;
      quantity: number;
      discount?: number;
      notes?: string;
    }>,
    paymentMethod: 'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer' | 'Split' | 'Credit' = 'Cash',
    memberId?: string,
    notes?: string,
    extra?: {
      discount?: number;
      discountAmount?: number;
      taxAmount?: number;
      subtotal?: number;
      payments?: PaymentDetail[];
      amountTendered?: number;
      changeGiven?: number;
      cashierName?: string;
      customerPhone?: string;
      customerName?: string;
    }
  ) => {
    const rawSubtotal = items.reduce((sum, item) => {
      const lineTotal = item.product.price.amount * item.quantity;
      const lineDiscount = item.discount || 0;
      return sum + Math.max(0, lineTotal - lineDiscount);
    }, 0);
    const subtotal = extra?.subtotal !== undefined ? extra.subtotal : rawSubtotal;
    const discountAmount = extra?.discountAmount !== undefined ? extra.discountAmount : (extra?.discount || 0);
    const taxAmount = extra?.taxAmount || 0;
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

    const member = memberId ? globalState.members.find((m) => m.id === memberId) : undefined;
    const finalCustomerName = extra?.customerName || member?.fullName || (memberId ? undefined : 'Walk-in Customer');

    const sale: Sale = {
      ...getTraceContext(),
      id: `sale_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      memberId,
      memberName: finalCustomerName,
      customerPhone: extra?.customerPhone || member?.phoneNumber,
      subtotal,
      discount: extra?.discount,
      discountAmount,
      taxAmount,
      totalAmount,
      paymentMethod,
      payments: extra?.payments,
      amountTendered: extra?.amountTendered,
      changeGiven: extra?.changeGiven,
      cashierName: extra?.cashierName || globalState.currentUser?.fullName || 'Cashier Desk',
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price.amount,
        totalPrice: i.product.price.amount * i.quantity - (i.discount || 0),
        costPrice: i.product.costPrice ?? i.product.cost?.amount,
        barcode: i.product.barcode,
        unit: i.product.unit,
        discount: i.discount,
        notes: i.notes,
      })),
      notes,
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    // Decrement stock quantities and record movements
    const newMovements: StockMovement[] = [];
    const updatedProducts = globalState.products.map((p) => {
      const match = items.find((item) => item.product.id === p.id);
      if (match) {
        const prev = p.stockQuantity;
        const next = Math.max(0, prev - match.quantity);
        newMovements.push({
          ...getTraceContext(),
          id: `sm_${Date.now()}_${p.id}`,
          tenantId: state.account.id,
          facilityId: state.currentBranchId,
          productId: p.id,
          productName: p.name,
          type: 'Sale',
          quantity: -match.quantity,
          previousStock: prev,
          newStock: next,
          reason: `Register Sale #${sale.id.slice(-6).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          createdBy: globalState.currentUser?.fullName || 'Cashier Desk',
        });
        return { ...p, stockQuantity: next };
      }
      return p;
    });

    globalState = {
      ...globalState,
      products: updatedProducts,
      sales: [sale, ...globalState.sales],
      stockMovements: [...newMovements, ...(globalState.stockMovements || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      posService.createSale(sale).catch((err) => {
        console.warn('[store] Failed to save sale to Supabase:', err);
      });
    }

    return sale;
  };

  const refundSale = (saleId: string, reason?: string) => {
    const sale = globalState.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'Refunded') return;

    const returnMovements: StockMovement[] = [];
    const updatedProducts = globalState.products.map((p) => {
      const match = sale.items.find((item) => item.productId === p.id);
      if (match) {
        const prev = p.stockQuantity;
        const next = prev + match.quantity;
        returnMovements.push({
          ...getTraceContext(),
          id: `sm_${Date.now()}_${p.id}`,
          tenantId: state.account.id,
          facilityId: state.currentBranchId,
          productId: p.id,
          productName: p.name,
          type: 'Return',
          quantity: match.quantity,
          previousStock: prev,
          newStock: next,
          reason: `Refund #${sale.id.slice(-6).toUpperCase()}: ${reason || 'Customer Return'}`,
          createdAt: new Date().toISOString(),
          createdBy: globalState.currentUser?.fullName || 'Manager',
        });
        return { ...p, stockQuantity: next };
      }
      return p;
    });

    globalState = {
      ...globalState,
      products: updatedProducts,
      sales: globalState.sales.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'Refunded' as const,
              refundReason: reason || 'Customer Return',
              refundedAt: new Date().toISOString(),
            }
          : s
      ),
      stockMovements: [...returnMovements, ...(globalState.stockMovements || [])],
    };
    notify();
  };

  const adjustStock = (
    productId: string,
    quantity: number,
    mode: 'delta' | 'set',
    reason: string,
    type: StockMovement['type'] = 'Adjustment'
  ) => {
    let movement: StockMovement | null = null;
    const updatedProducts = globalState.products.map((p) => {
      if (p.id === productId) {
        const prev = p.stockQuantity;
        const next = mode === 'set' ? Math.max(0, quantity) : Math.max(0, prev + quantity);
        const delta = next - prev;
        movement = {
          ...getTraceContext(),
          id: `sm_${Date.now()}_${p.id}`,
          tenantId: state.account.id,
          facilityId: state.currentBranchId,
          productId: p.id,
          productName: p.name,
          type,
          quantity: delta,
          previousStock: prev,
          newStock: next,
          reason,
          createdAt: new Date().toISOString(),
          createdBy: globalState.currentUser?.fullName || 'Manager',
        };
        return { ...p, stockQuantity: next };
      }
      return p;
    });

    globalState = {
      ...globalState,
      products: updatedProducts,
      stockMovements: movement ? [movement, ...(globalState.stockMovements || [])] : globalState.stockMovements,
    };
    notify();

    if (movement) {
      const mv: StockMovement = movement;
      showToast({
        type: 'info',
        title: 'Inventory Adjusted',
        message: `${mv.productName} updated: ${mv.previousStock} → ${mv.newStock} (${reason}).`,
        category: 'pos_inventory',
        action: {
          label: 'Inventory',
          onClick: () => {
            globalState = { ...globalState, activeScreen: 'shop' };
            notify();
          },
        },
      });
    }
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    globalState = {
      ...globalState,
      products: globalState.products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    };
    notify();
  };

  const deleteProduct = (productId: string) => {
    const target = globalState.products.find((p) => p.id === productId);
    globalState = {
      ...globalState,
      products: globalState.products.filter((p) => p.id !== productId),
    };
    notify();

    showToast({
      type: 'warning',
      title: 'Product Removed',
      message: `${target?.name || 'Item'} removed from store inventory.`,
      category: 'pos_inventory',
    });
  };

  const parkOrder = (
    orderData: Omit<ParkedOrder, 'id' | 'createdAt' | 'tenantId' | 'facilityId'>
  ) => {
    const trace = getTraceContext();
    const parked: ParkedOrder = {
      ...trace,
      ...orderData,
      id: `park_${Date.now()}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      parkedOrders: [parked, ...(globalState.parkedOrders || [])],
    };
    notify();
    return parked;
  };

  const resumeParkedOrder = (orderId: string) => {
    const target = (globalState.parkedOrders || []).find((p) => p.id === orderId);
    if (target) {
      globalState = {
        ...globalState,
        parkedOrders: (globalState.parkedOrders || []).filter((p) => p.id !== orderId),
      };
      notify();
    }
    return target;
  };

  const deleteParkedOrder = (orderId: string) => {
    globalState = {
      ...globalState,
      parkedOrders: (globalState.parkedOrders || []).filter((p) => p.id !== orderId),
    };
    notify();
  };

  const updateReceiptConfig = (config: Partial<ReceiptConfig>) => {
    globalState = {
      ...globalState,
      receiptConfig: {
        ...(globalState.receiptConfig || DEFAULT_RECEIPT_CONFIG),
        ...config,
      },
    };
    notify();
  };

  const seedDemoInventory = (branchId?: string) => {
    const targetBranchId = branchId || state.currentBranchId;
    const demoItems: Product[] = [
      {
        id: `prod_demo_01_${Date.now()}`,
        tenantId: state.account.id,
        facilityId: targetBranchId,
        name: 'Single Origin Roasted Espresso Beans (1kg)',
        description: '100% Arabica dark roast whole beans blend',
        price: { amount: 3200, currency: 'DZD' },
        cost: { amount: 1900, currency: 'DZD' },
        costPrice: 1900,
        stockQuantity: 40,
        sku: 'POS-COF-01',
        barcode: '6131100200101',
        category: 'Beverage',
        unit: 'pack',
        taxRate: 19,
        reorderLevel: 10,
        isActive: true,
        isPinned: true,
      },
      {
        id: `prod_demo_02_${Date.now()}`,
        tenantId: state.account.id,
        facilityId: targetBranchId,
        name: 'Organic Extra Virgin Olive Oil (750ml)',
        description: 'Cold-pressed first harvest from Kabylie olive groves',
        price: { amount: 1850, currency: 'DZD' },
        cost: { amount: 1100, currency: 'DZD' },
        costPrice: 1100,
        stockQuantity: 28,
        sku: 'POS-OIL-750',
        barcode: '6131100200102',
        category: 'Grocery',
        unit: 'pcs',
        taxRate: 9,
        reorderLevel: 8,
        isActive: true,
        isPinned: true,
      },
      {
        id: `prod_demo_03_${Date.now()}`,
        tenantId: state.account.id,
        facilityId: targetBranchId,
        name: 'French Butter Croissant (Box of 4)',
        description: 'Freshly baked laminated dough with Normandy butter',
        price: { amount: 480, currency: 'DZD' },
        cost: { amount: 220, currency: 'DZD' },
        costPrice: 220,
        stockQuantity: 35,
        sku: 'POS-BAK-04',
        barcode: '6131100200104',
        category: 'Bakery',
        unit: 'box',
        taxRate: 9,
        reorderLevel: 10,
        isActive: true,
        isPinned: true,
      },
      {
        id: `prod_demo_04_${Date.now()}`,
        tenantId: state.account.id,
        facilityId: targetBranchId,
        name: 'Artisan Dark Chocolate Bar 72% (100g)',
        description: 'Handcrafted bean-to-bar dark chocolate',
        price: { amount: 650, currency: 'DZD' },
        cost: { amount: 320, currency: 'DZD' },
        costPrice: 320,
        stockQuantity: 60,
        sku: 'POS-CHOC-72',
        barcode: '6131100200105',
        category: 'Bakery',
        unit: 'pcs',
        taxRate: 19,
        reorderLevel: 15,
        isActive: true,
        isPinned: false,
      },
      {
        id: `prod_demo_05_${Date.now()}`,
        tenantId: state.account.id,
        facilityId: targetBranchId,
        name: 'Cold-Pressed Citrus Juice (330ml)',
        description: '100% natural orange and clementine juice',
        price: { amount: 350, currency: 'DZD' },
        cost: { amount: 160, currency: 'DZD' },
        costPrice: 160,
        stockQuantity: 4,
        sku: 'POS-JUICE-330',
        barcode: '6131100200106',
        category: 'Beverage',
        unit: 'pcs',
        taxRate: 9,
        reorderLevel: 10,
        isActive: true,
        isPinned: true,
      },
    ];
    const trace = getTraceContext();
    const enrichedDemoItems: Product[] = demoItems.map((item) => ({
      ...trace,
      ...item,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
      branchId: targetBranchId,
      tenantId: state.account.id,
      facilityId: targetBranchId,
    }));
    globalState = {
      ...globalState,
      products: [...enrichedDemoItems, ...globalState.products],
    };
    notify();
  };

  const batchDeleteProducts = (productIds: string[]) => {
    const idSet = new Set(productIds);
    globalState = {
      ...globalState,
      products: globalState.products.filter((p) => !idSet.has(p.id)),
    };
    notify();
    showToast({
      type: 'warning',
      title: 'Products Removed',
      message: `${productIds.length} items removed from inventory.`,
      category: 'pos_inventory',
    });
  };

  const batchRestockProducts = (productIds: string[], restockQty = 10) => {
    const idSet = new Set(productIds);
    const trace = getTraceContext();
    const newMovements: StockMovement[] = [];

    const updated = globalState.products.map((p) => {
      if (idSet.has(p.id)) {
        const prev = p.stockQuantity;
        const next = prev + restockQty;
        newMovements.push({
          ...trace,
          id: `sm_${Date.now()}_${p.id}`,
          tenantId: state.account.id,
          facilityId: state.currentBranchId,
          productId: p.id,
          productName: p.name,
          type: 'Restock',
          quantity: restockQty,
          previousStock: prev,
          newStock: next,
          reason: `Batch Restock (+${restockQty} units)`,
          createdAt: new Date().toISOString(),
          createdBy: globalState.currentUser?.fullName || 'Manager',
        });
        return { ...p, stockQuantity: next };
      }
      return p;
    });

    globalState = {
      ...globalState,
      products: updated,
      stockMovements: [...newMovements, ...(globalState.stockMovements || [])],
    };
    notify();

    showToast({
      type: 'success',
      title: 'Batch Restock Complete',
      message: `Restocked +${restockQty} units across ${productIds.length} items.`,
      category: 'pos_inventory',
    });
  };

  const resetPosMockData = () => {
    const targetBranchId = state.currentBranchId || 'branch_rest_didouche';
    const trace = getTraceContext();

    const posProducts = INITIAL_PRODUCTS.filter(
      (p) => p.facilityId === 'branch_rest_didouche' || p.sku.startsWith('POS-')
    ).map((p) => ({
      ...trace,
      ...p,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
    }));

    const posSales = INITIAL_SALES.filter(
      (s) => s.facilityId === 'branch_rest_didouche' || s.id.startsWith('sale_pos_')
    ).map((s) => ({
      ...trace,
      ...s,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
    }));

    const posParked = INITIAL_PARKED_ORDERS.map((po) => ({
      ...trace,
      ...po,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
    }));

    const posMovements = INITIAL_STOCK_MOVEMENTS.map((sm) => ({
      ...trace,
      ...sm,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
    }));

    globalState = {
      ...globalState,
      products: [...posProducts, ...globalState.products.filter((p) => p.facilityId !== targetBranchId && !p.sku.startsWith('POS-'))],
      sales: [...posSales, ...globalState.sales.filter((s) => s.facilityId !== targetBranchId && !s.id.startsWith('sale_pos_'))],
      parkedOrders: posParked,
      stockMovements: posMovements,
      receiptConfig: DEFAULT_RECEIPT_CONFIG,
    };
    notify();

    showToast({
      type: 'success',
      title: 'POS Catalog & Ledger Recharged',
      message: `${posProducts.length} retail items, recent transactions, and held orders restored.`,
      category: 'pos_inventory',
    });
  };

  const createAppointment = (
    aptData: Omit<Appointment, 'id' | 'createdAt' | 'tenantId' | 'facilityId'>
  ) => {
    const newApt: Appointment = {
      ...getTraceContext(),
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

    const lang = globalState.language || 'fr';
    showToast({
      type: 'success',
      title: t('toast_apt_booked_title', lang),
      message: t('toast_apt_booked_msg', lang)
        .replace('{client}', newApt.clientName)
        .replace('{stylist}', newApt.staffName)
        .replace('{date}', newApt.date)
        .replace('{time}', newApt.startTime),
      category: 'appointment_service',
      action: {
        label: t('toast_action_schedule', lang),
        onClick: () => {
          globalState = { ...globalState, activeScreen: 'scheduler' };
          notify();
        },
      },
    });

    if (isSupabaseConfigured()) {
      appointmentService.upsertAppointment(newApt).catch((err) => {
        console.warn('[store] Failed to save appointment to Supabase:', err);
      });
    }

    return newApt;
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    const apt = (globalState.appointments || []).find((a) => a.id === id);
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    };
    notify();

    const lang = globalState.language || 'fr';
    if (status === 'InChair') {
      showToast({
        type: 'info',
        title: t('toast_apt_seated_title', lang),
        message: t('toast_apt_seated_msg', lang)
          .replace('{client}', apt?.clientName || 'Client')
          .replace('{stylist}', apt?.staffName || 'Stylist'),
        category: 'appointment_service',
        action: {
          label: t('toast_action_timer', lang),
          onClick: () => {
            globalState = { ...globalState, activeScreen: 'scheduler' };
            notify();
          },
        },
      });
    } else if (status === 'Cancelled') {
      showToast({
        type: 'warning',
        title: t('toast_apt_cancelled_title', lang),
        message: t('toast_apt_cancelled_msg', lang).replace('{client}', apt?.clientName || 'Client'),
        category: 'appointment_service',
      });
    }

    if (isSupabaseConfigured()) {
      appointmentService.updateStatus(id, status).catch((err) => {
        console.warn('[store] Failed to update appointment status in Supabase:', err);
      });
    }
  };

  const rescheduleAppointment = (
    id: string,
    date: string,
    startTime: string,
    endTime: string,
    staffId?: string,
    staffName?: string
  ) => {
    const apt = (globalState.appointments || []).find((a) => a.id === id);
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

    const lang = globalState.language || 'fr';
    showToast({
      type: 'info',
      title: t('toast_apt_rescheduled_title', lang),
      message: t('toast_apt_rescheduled_msg', lang)
        .replace('{client}', apt?.clientName || 'Client')
        .replace('{date}', date)
        .replace('{time}', startTime),
      category: 'appointment_service',
    });

    if (isSupabaseConfigured()) {
      const target = globalState.appointments?.find((a) => a.id === id);
      if (target) {
        appointmentService.upsertAppointment(target).catch((err) => {
          console.warn('[store] Failed to reschedule appointment in Supabase:', err);
        });
      }
    }
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
      ...getTraceContext(),
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
      ...getTraceContext(),
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

    const checkoutLang = globalState.language || 'fr';
    const localizedService = getLocalizedServiceName(apt.serviceId, apt.serviceName, checkoutLang);
    showToast({
      type: 'success',
      title: t('toast_apt_checkout_title', checkoutLang),
      message: t('toast_apt_checkout_msg', checkoutLang)
        .replace('{service}', localizedService)
        .replace('{client}', apt.clientName)
        .replace('{price}', formatMoney(apt.price)),
      category: 'appointment_service',
      action: {
        label: t('toast_action_receipt', checkoutLang),
        onClick: () => window.print?.(),
      },
    });

    return sale;
  };

  const batchDeleteAppointments = (ids: string[]) => {
    const idSet = new Set(ids);
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).filter((a) => !idSet.has(a.id)),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Rendez-vous supprimés',
      message: `${ids.length} rendez-vous ont été retirés de l'agenda.`,
      category: 'appointment_service',
    });
  };

  const batchUpdateAppointmentStatus = (ids: string[], status: AppointmentStatus) => {
    const idSet = new Set(ids);
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).map((a) =>
        idSet.has(a.id) ? { ...a, status } : a
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Statuts mis à jour',
      message: `${ids.length} rendez-vous passés en état "${status}".`,
      category: 'appointment_service',
    });
  };

  const updateServiceItem = (id: string, updates: Partial<ServiceItem>) => {
    globalState = {
      ...globalState,
      servicesCatalog: (globalState.servicesCatalog || []).map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Prestation mise à jour',
      message: 'Les détails du service et son tarif ont été modifiés.',
      category: 'appointment_service',
    });
  };

  const deleteServiceItem = (id: string) => {
    globalState = {
      ...globalState,
      servicesCatalog: (globalState.servicesCatalog || []).filter((s) => s.id !== id),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Prestation supprimée',
      message: 'Le service a été retiré du catalogue.',
      category: 'appointment_service',
    });
  };

  const batchDeleteServiceItems = (ids: string[]) => {
    const idSet = new Set(ids);
    globalState = {
      ...globalState,
      servicesCatalog: (globalState.servicesCatalog || []).filter((s) => !idSet.has(s.id)),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Prestations supprimées',
      message: `${ids.length} prestations ont été retirées du catalogue.`,
      category: 'appointment_service',
    });
  };

  const updateStylistPayoutStatus = (id: string, status: 'Pending' | 'Approved' | 'Paid', paymentMethod?: string) => {
    globalState = {
      ...globalState,
      stylistPayouts: (globalState.stylistPayouts || []).map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              ...(paymentMethod ? { paymentMethod } : {}),
              ...(status === 'Paid' ? { paidAt: new Date().toISOString().split('T')[0] } : {}),
            }
          : p
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Commission styliste mise à jour',
      message: `Bordereau de commission passé en état ${status}.`,
      category: 'appointment_service',
    });
  };

  const resetSalonMockData = () => {
    const targetBranchId = state.currentBranchId || 'branch_salon_hydra';
    const trace = getTraceContext();

    const salonServices = INITIAL_SALON_SERVICES.map((s) => ({
      ...trace,
      ...s,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
    }));

    const salonAppointments = INITIAL_APPOINTMENTS.map((a) => ({
      ...trace,
      ...a,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
    }));

    const salonClients = INITIAL_SALON_CLIENTS.map((c) => ({
      ...trace,
      ...c,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: state.account.id,
      businessId: state.currentBusinessId,
    }));

    const existingNonSalonMembers = (globalState.members || []).filter((m) => m.facilityId !== targetBranchId);
    const existingNonSalonServices = (globalState.servicesCatalog || []).filter((s) => s.facilityId !== targetBranchId);
    const existingNonSalonAppointments = (globalState.appointments || []).filter((a) => a.facilityId !== targetBranchId);

    globalState = {
      ...globalState,
      servicesCatalog: [...salonServices, ...existingNonSalonServices],
      appointments: [...salonAppointments, ...existingNonSalonAppointments],
      members: [...salonClients, ...existingNonSalonMembers],
      salonWorkstations: INITIAL_SALON_WORKSTATIONS,
      stylistPayouts: INITIAL_STYLIST_PAYOUTS,
    };
    notify();

    showToast({
      type: 'success',
      title: 'Salon & Spa Data Recharged',
      message: `${salonAppointments.length} appointments, ${salonServices.length} treatments, and ${salonClients.length} client diagnostics restored.`,
      category: 'appointment_service',
    });
  };


  const addStaff = (staffData: Omit<StaffMember, 'id' | 'tenantId' | 'facilityId'>) => {
    if (!staffQuota.isAllowed) {
      throw new Error(`Staff limit reached for ${plan.name} plan. Upgrade to expand capacity.`);
    }

    const newStaff: StaffMember = {
      ...getTraceContext(),
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

    if (isSupabaseConfigured()) {
      staffService.createStaff(newStaff).catch((err) => {
        console.warn('[store] Supabase createStaff notice:', err);
      });
    }

    return newStaff;
  };

  const addBusiness = (name: string, category: BusinessCategory, address?: string, phone?: string) => {
    if (!businessQuota.isAllowed) {
      openDesktopUpgradeModal('business_limit');
      throw new Error(`Business limit reached for ${plan.name} (${plan.maxBusinesses}). Upgrade to Atrium Desktop to unlock multi-business management.`);
    }

    const newBiz: Business = {
      id: `biz_${Date.now()}`,
      accountId: state.account.id,
      name,
      displayName: name,
      category,
      address,
      phone,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const newBranch: Branch = {
      id: `branch_${Date.now()}`,
      accountId: state.account.id,
      businessId: newBiz.id,
      name: `${name} Main`,
      code: name.substring(0, 3).toUpperCase() || 'M01',
      address,
      phone,
      isMainBranch: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      businesses: [...globalState.businesses, newBiz],
      branches: [...globalState.branches, newBranch],
      currentBusinessId: newBiz.id,
      currentBranchId: newBranch.id,
    };
    notify();

    if (isSupabaseConfigured()) {
      tenantService
        .createBusiness(state.account.id, name, category, address, phone)
        .catch((err) => {
          console.warn('[store] Failed to create business on Supabase:', err);
        });
    }

    return newBiz;
  };

  const addBranch = (name: string, code: string, address?: string, phone?: string) => {
    if (!branchQuota.isAllowed) {
      openDesktopUpgradeModal('branch_limit');
      throw new Error(`Branch limit reached for ${plan.name}. Upgrade to Atrium Desktop to unlock multi-branch management.`);
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

    showToast({
      type: 'success',
      title: 'Perpetual License Active',
      message: `Lifetime ${matchingPlan.name} entitlement unlocked successfully.`,
      action: {
        label: 'Entitlements',
        onClick: () => {
          globalState = { ...globalState, activeScreen: 'settings' };
          notify();
        },
      },
    });

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
      ...getTraceContext(),
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

    showToast({
      type: 'success',
      title: 'Product Created',
      message: `${newProduct.name} added to inventory (${newProduct.stockQuantity} in stock).`,
      category: 'pos_inventory',
      action: {
        label: 'Register',
        onClick: () => {
          globalState = { ...globalState, activeScreen: 'shop' };
          notify();
        },
      },
    });

    if (isSupabaseConfigured()) {
      posService.upsertProduct(newProduct).catch((err) => {
        console.warn('[store] Failed to save product to Supabase:', err);
      });
    }

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

  const openDesktopUpgradeModal = (reason: 'branch_limit' | 'business_limit' | 'general' = 'general') => {
    globalState = {
      ...globalState,
      isDesktopUpgradeModalOpen: true,
      desktopUpgradeReason: reason,
    };
    notify();
  };

  const closeDesktopUpgradeModal = () => {
    globalState = {
      ...globalState,
      isDesktopUpgradeModalOpen: false,
    };
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

    let chosenPlan = INITIAL_PLANS[0]; // Free Web default
    let isLifetime = true;
    let activatedVoucher: string | undefined = 'WEB-FREE-EDITION';

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

    const sampleMembers: Member[] = params.category === 'pos_inventory'
      ? [
          {
            id: `mem_${Date.now()}_1`,
            tenantId: accountId,
            facilityId: branchId,
            fullName: 'Karim Bouzid',
            email: 'karim.bouzid@gmail.com',
            phoneNumber: '+213 551 22 33 44',
            cardId: 'CUST-001',
            status: 'Active',
            startDate: new Date().toISOString().split('T')[0],
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            membershipPlanId: samplePlans[0].id,
            membershipPlanName: samplePlans[0].name,
            remainingSessions: 999,
            gender: 'Male',
            source: 'Walk-in',
            notes: 'Regular retail customer. VIP cash/card buyer.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: `mem_${Date.now()}_2`,
            tenantId: accountId,
            facilityId: branchId,
            fullName: 'Amira Benali',
            email: 'amira.benali@outlook.com',
            phoneNumber: '+213 770 45 67 89',
            cardId: 'CUST-002',
            status: 'Active',
            startDate: new Date().toISOString().split('T')[0],
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            membershipPlanId: samplePlans[1].id,
            membershipPlanName: samplePlans[1].name,
            remainingSessions: 999,
            gender: 'Female',
            source: 'Referral',
            notes: 'Commercial account. Regular weekly orders.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
      : [
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

    const sampleLeads: RegistrationLead[] = params.category === 'pos_inventory'
      ? []
      : [
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
      businesses: [newBusiness],
      branches: [newBranch],
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
      activeScreen: params.category === 'pos_inventory' ? 'shop' : 'dashboard',
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

      const hours = Math.floor(newEntry.durationSeconds / 3600);
      const mins = Math.floor((newEntry.durationSeconds % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${newEntry.durationSeconds % 60}s`;
      showToast({
        type: 'success',
        title: 'Time Logged',
        message: `${timeStr} recorded for "${newEntry.projectTitle || 'Project'}".`,
        category: 'freelance_solo',
        action: {
          label: 'Invoice',
          onClick: () => {
            globalState = { ...globalState, activeScreen: 'shop' };
            notify();
          },
        },
      });

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
      ...getTraceContext(),
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

    if (isSupabaseConfigured()) {
      freelanceService.upsertClient(newClient).catch((err) => {
        console.warn('[store] Supabase upsertClient notice:', err);
      });
    }

    return newClient;
  };

  const updateFreelanceClient = (id: string, updates: Partial<FreelanceClient>) => {
    const updatedClients = globalState.freelanceClients.map((c) => (c.id === id ? { ...c, ...updates } : c));
    globalState = {
      ...globalState,
      freelanceClients: updatedClients,
    };
    notify();

    const target = updatedClients.find((c) => c.id === id);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertClient(target).catch((err) => {
        console.warn('[store] Supabase updateClient notice:', err);
      });
    }
  };

  const deleteFreelanceClient = (clientId: string, cascade = false) => {
    const target = globalState.freelanceClients.find((c) => c.id === clientId);
    const updatedClients = globalState.freelanceClients.filter((c) => c.id !== clientId);
    let updatedProjects = globalState.freelanceProjects;
    let updatedTimeLogs = globalState.timeLogs;
    let updatedInvoices = globalState.freelanceInvoices;
    let updatedProposals = globalState.freelanceProposals;

    if (cascade) {
      updatedProjects = updatedProjects.filter((p) => p.clientId !== clientId);
      updatedTimeLogs = updatedTimeLogs.filter((t) => t.clientId !== clientId);
      updatedInvoices = updatedInvoices.filter((i) => i.clientId !== clientId);
      if (target?.email) {
        updatedProposals = updatedProposals.filter((p) => p.clientEmail.toLowerCase() !== target.email.toLowerCase());
      }
    }

    globalState = {
      ...globalState,
      freelanceClients: updatedClients,
      freelanceProjects: updatedProjects,
      timeLogs: updatedTimeLogs,
      freelanceInvoices: updatedInvoices,
      freelanceProposals: updatedProposals,
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.deleteClient(clientId).catch((err) => {
        console.warn('[store] Supabase deleteClient notice:', err);
      });
    }
  };

  const addFreelanceProject = (projectData: Omit<FreelanceProject, 'id' | 'tenantId' | 'facilityId' | 'loggedHours' | 'createdAt'>) => {
    const newProject: FreelanceProject = {
      ...getTraceContext(),
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

    if (isSupabaseConfigured()) {
      freelanceService.upsertProject(newProject).catch((err) => {
        console.warn('[store] Supabase upsertProject notice:', err);
      });
    }

    return newProject;
  };

  const updateFreelanceProject = (projectId: string, updates: Partial<FreelanceProject>) => {
    const updatedProjects = globalState.freelanceProjects.map((p) =>
      p.id === projectId ? { ...p, ...updates } : p
    );
    globalState = {
      ...globalState,
      freelanceProjects: updatedProjects,
    };
    notify();

    const target = updatedProjects.find((p) => p.id === projectId);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertProject(target).catch((err) => {
        console.warn('[store] Supabase updateFreelanceProject notice:', err);
      });
    }
  };

  const deleteFreelanceProject = (projectId: string) => {
    globalState = {
      ...globalState,
      freelanceProjects: globalState.freelanceProjects.filter((p) => p.id !== projectId),
      timeLogs: globalState.timeLogs.filter((t) => t.projectId !== projectId),
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.deleteProject(projectId).catch((err) => {
        console.warn('[store] Supabase deleteProject notice:', err);
      });
    }
  };

  const updateProjectStage = (projectId: string, stage: DeliverableStage) => {
    const updatedProjects = globalState.freelanceProjects.map((p) => (p.id === projectId ? { ...p, stage } : p));
    globalState = {
      ...globalState,
      freelanceProjects: updatedProjects,
    };
    notify();

    const target = updatedProjects.find((p) => p.id === projectId);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertProject(target).catch((err) => {
        console.warn('[store] Supabase updateProjectStage notice:', err);
      });
    }
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
    const updatedProjects = globalState.freelanceProjects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          estimatedHours: p.estimatedHours + estimatedHours,
          deliverables: [...p.deliverables, newDeliv],
        };
      }
      return p;
    });

    globalState = {
      ...globalState,
      freelanceProjects: updatedProjects,
    };
    notify();

    const target = updatedProjects.find((p) => p.id === projectId);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertProject(target).catch((err) => {
        console.warn('[store] Supabase addDeliverable project notice:', err);
      });
    }

    return newDeliv;
  };

  const updateDeliverable = (
    projectId: string,
    deliverableId: string,
    updates: Partial<FreelanceDeliverable>
  ) => {
    const updatedProjects = globalState.freelanceProjects.map((p) => {
      if (p.id === projectId) {
        const updatedDeliverables = p.deliverables.map((d) => {
          if (d.id === deliverableId) {
            const nextStage = updates.stage || d.stage;
            const isCompleted =
              updates.isCompleted !== undefined
                ? updates.isCompleted
                : nextStage === 'Approved' || nextStage === 'Billed';
            return { ...d, ...updates, isCompleted };
          }
          return d;
        });

        const newTotalEstimated = updatedDeliverables.reduce((acc, curr) => acc + (curr.estimatedHours || 0), 0);
        const allCompleted = updatedDeliverables.length > 0 && updatedDeliverables.every((d) => d.isCompleted);
        const nextProjectStage: DeliverableStage = allCompleted && p.stage !== 'Approved' && p.stage !== 'Billed' ? 'Approved' : p.stage;

        return {
          ...p,
          estimatedHours: newTotalEstimated > 0 ? newTotalEstimated : p.estimatedHours,
          stage: nextProjectStage,
          deliverables: updatedDeliverables,
        };
      }
      return p;
    });

    globalState = {
      ...globalState,
      freelanceProjects: updatedProjects,
    };
    notify();

    const target = updatedProjects.find((p) => p.id === projectId);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertProject(target).catch((err) => {
        console.warn('[store] Supabase updateDeliverable notice:', err);
      });
    }
  };

  const deleteDeliverable = (projectId: string, deliverableId: string) => {
    const updatedProjects = globalState.freelanceProjects.map((p) => {
      if (p.id === projectId) {
        const removed = p.deliverables.find((d) => d.id === deliverableId);
        const filtered = p.deliverables.filter((d) => d.id !== deliverableId);
        const estDiff = removed ? removed.estimatedHours : 0;
        const loggedDiff = removed ? removed.loggedHours : 0;
        return {
          ...p,
          estimatedHours: Math.max(0, p.estimatedHours - estDiff),
          loggedHours: Math.max(0, Number((p.loggedHours - loggedDiff).toFixed(2))),
          deliverables: filtered,
        };
      }
      return p;
    });

    globalState = {
      ...globalState,
      freelanceProjects: updatedProjects,
    };
    notify();

    const target = updatedProjects.find((p) => p.id === projectId);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertProject(target).catch((err) => {
        console.warn('[store] Supabase deleteDeliverable notice:', err);
      });
    }
  };

  const updateDeliverableStage = (projectId: string, deliverableId: string, stage: DeliverableStage) => {
    updateDeliverable(projectId, deliverableId, { stage });
  };

  const logTimeEntry = (entryData: Omit<TimeLogEntry, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'isInvoiced'>) => {
    const trace = getTraceContext();
    const entry: TimeLogEntry = {
      ...trace,
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

    if (isSupabaseConfigured()) {
      freelanceService.upsertTimeLog(entry).catch((err) => {
        console.warn('[store] Supabase upsertTimeLog notice:', err);
      });
    }

    return entry;
  };

  const updateTimeLog = (id: string, updates: Partial<TimeLogEntry>) => {
    const current = globalState.timeLogs.find((t) => t.id === id);
    if (!current) return;

    const diffHours = updates.durationSeconds !== undefined
      ? Number(((updates.durationSeconds - current.durationSeconds) / 3600).toFixed(2))
      : 0;

    let updatedProjects = globalState.freelanceProjects;
    if (diffHours !== 0) {
      updatedProjects = updatedProjects.map((p) => {
        if (p.id === current.projectId) {
          return {
            ...p,
            loggedHours: Math.max(0, Number((p.loggedHours + diffHours).toFixed(2))),
            deliverables: p.deliverables.map((d) =>
              d.id === current.deliverableId
                ? { ...d, loggedHours: Math.max(0, Number((d.loggedHours + diffHours).toFixed(2))) }
                : d
            ),
          };
        }
        return p;
      });
    }

    const updatedLogs = globalState.timeLogs.map((t) => (t.id === id ? { ...t, ...updates } : t));

    globalState = {
      ...globalState,
      timeLogs: updatedLogs,
      freelanceProjects: updatedProjects,
    };
    notify();

    const target = updatedLogs.find((t) => t.id === id);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertTimeLog(target).catch((err) => {
        console.warn('[store] Supabase upsertTimeLog notice:', err);
      });
    }
  };

  const deleteTimeLog = (id: string) => {
    const current = globalState.timeLogs.find((t) => t.id === id);
    if (!current) return;

    const hoursToRemove = Number((current.durationSeconds / 3600).toFixed(2));
    const updatedProjects = globalState.freelanceProjects.map((p) => {
      if (p.id === current.projectId) {
        return {
          ...p,
          loggedHours: Math.max(0, Number((p.loggedHours - hoursToRemove).toFixed(2))),
          deliverables: p.deliverables.map((d) =>
            d.id === current.deliverableId
              ? { ...d, loggedHours: Math.max(0, Number((d.loggedHours - hoursToRemove).toFixed(2))) }
              : d
          ),
        };
      }
      return p;
    });

    globalState = {
      ...globalState,
      timeLogs: globalState.timeLogs.filter((t) => t.id !== id),
      freelanceProjects: updatedProjects,
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.deleteTimeLog(id).catch((err) => {
        console.warn('[store] Supabase deleteTimeLog notice:', err);
      });
    }
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
      ...getTraceContext(),
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
      notes: notes || (globalState.language === 'ar' ? `فاتورة مفصلة عن ${totalHours.toFixed(1)} ساعة من الخدمات الاحترافية.` : globalState.language === 'fr' ? `Facturation détaillée pour ${totalHours.toFixed(1)} heures de prestations professionnelles.` : `Itemized bill for ${totalHours.toFixed(1)} hours of professional services.`),
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

    if (isSupabaseConfigured()) {
      freelanceService.upsertInvoice(newInvoice).catch((err) => {
        console.warn('[store] Failed to save invoice to Supabase:', err);
      });
      unbilled.forEach((t) => {
        freelanceService.upsertTimeLog({ ...t, isInvoiced: true }).catch((err) => {
          console.warn('[store] Failed to update time log in Supabase:', err);
        });
      });
    }

    return newInvoice;
  };

  const createFreelanceInvoice = (invoiceData: Omit<FreelanceInvoice, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newInv: FreelanceInvoice = {
      ...getTraceContext(),
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

    const lang = globalState.language || 'en';
    showToast({
      type: 'success',
      title: t('toast_invoice_gen_title', lang),
      message: `${t('toast_invoice_gen_msg', lang)} ${newInv.clientName} (#${newInv.invoiceNumber} - ${newInv.totalAmount.toLocaleString()} ${newInv.currency}).`,
      category: 'freelance_solo',
      action: {
        label: t('toast_invoice_preview_btn', lang),
        onClick: () => {
          globalState = { ...globalState, activeScreen: 'shop' };
          notify();
        },
      },
    });

    if (isSupabaseConfigured()) {
      freelanceService.upsertInvoice(newInv).catch((err) => {
        console.warn('[store] Supabase upsertInvoice notice:', err);
      });
    }

    return newInv;
  };

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus) => {
    const updatedInvoices = globalState.freelanceInvoices.map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            status,
            paidAt: status === 'Paid' ? new Date().toISOString() : inv.paidAt,
          }
        : inv
    );
    globalState = {
      ...globalState,
      freelanceInvoices: updatedInvoices,
    };
    notify();

    const target = updatedInvoices.find((inv) => inv.id === invoiceId);
    const lang = globalState.language || 'en';
    if (target && status === 'Paid') {
      showToast({
        type: 'success',
        title: t('toast_invoice_settled_title', lang),
        message: `${target.clientName} ${t('toast_invoice_settled_msg', lang)} #${target.invoiceNumber} (${target.totalAmount.toLocaleString()} ${target.currency}).`,
        category: 'freelance_solo',
        action: {
          label: t('toast_invoice_receipt_btn', lang),
          onClick: () => window.print?.(),
        },
      });
    } else if (target && status === 'Sent') {
      showToast({
        type: 'info',
        title: t('toast_invoice_dispatched_title', lang),
        message: `${t('toast_invoice_dispatched_title', lang)}: #${target.invoiceNumber} ${t('toast_invoice_dispatched_msg', lang)} ${target.clientName}.`,
        category: 'freelance_solo',
      });
    }

    if (target && isSupabaseConfigured()) {
      freelanceService.upsertInvoice(target).catch((err) => {
        console.warn('[store] Supabase updateInvoice notice:', err);
      });
    }
  };

  const deleteFreelanceInvoice = (invoiceId: string) => {
    const target = globalState.freelanceInvoices.find((inv) => inv.id === invoiceId);
    if (!target) return;

    // Identify any time log IDs contained in the invoice items
    const loggedIds = new Set(
      target.items
        .filter((item) => item.id.startsWith('item_time_'))
        .map((item) => item.id.replace('item_', ''))
    );

    // If invoice had time logs, release them back to uninvoiced
    const updatedTimeLogs = globalState.timeLogs.map((t) =>
      loggedIds.has(t.id) ? { ...t, isInvoiced: false } : t
    );

    // Deduct lifetimeBilled if client exists
    const updatedClients = globalState.freelanceClients.map((c) =>
      c.id === target.clientId
        ? { ...c, lifetimeBilled: Math.max(0, c.lifetimeBilled - target.totalAmount) }
        : c
    );

    globalState = {
      ...globalState,
      freelanceInvoices: globalState.freelanceInvoices.filter((inv) => inv.id !== invoiceId),
      timeLogs: updatedTimeLogs,
      freelanceClients: updatedClients,
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.deleteInvoice(invoiceId).catch((err) => {
        console.warn('[store] Supabase deleteInvoice notice:', err);
      });
      loggedIds.forEach((tId) => {
        const logItem = updatedTimeLogs.find((l) => l.id === tId);
        if (logItem) {
          freelanceService.upsertTimeLog(logItem).catch((err) => {
            console.warn('[store] Failed to update time log in Supabase:', err);
          });
        }
      });
    }
  };

  const createFreelanceProposal = (proposalData: Omit<FreelanceProposal, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newProp: FreelanceProposal = {
      ...getTraceContext(),
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

    if (isSupabaseConfigured()) {
      freelanceService.upsertProposal(newProp).catch((err) => {
        console.warn('[store] Supabase upsertProposal notice:', err);
      });
    }

    return newProp;
  };

  const updateFreelanceProposal = (id: string, updates: Partial<FreelanceProposal>) => {
    const updatedProps = globalState.freelanceProposals.map((p) => (p.id === id ? { ...p, ...updates } : p));
    globalState = {
      ...globalState,
      freelanceProposals: updatedProps,
    };
    notify();

    const target = updatedProps.find((p) => p.id === id);
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertProposal(target).catch((err) => {
        console.warn('[store] Supabase updateProposal notice:', err);
      });
    }
  };

  const deleteFreelanceProposal = (id: string) => {
    globalState = {
      ...globalState,
      freelanceProposals: globalState.freelanceProposals.filter((p) => p.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.deleteProposal(id).catch((err) => {
        console.warn('[store] Supabase deleteProposal notice:', err);
      });
    }
  };

  const convertProposalToProject = (proposalId: string) => {
    const prop = globalState.freelanceProposals.find((p) => p.id === proposalId);
    if (!prop) throw new Error('Proposal not found');

    let client = globalState.freelanceClients.find(
      (c) => c.email.toLowerCase() === prop.clientEmail.toLowerCase()
    );
    if (!client) {
      client = {
        ...getTraceContext(),
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
      ...getTraceContext(),
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

    const lang = globalState.language || 'en';
    showToast({
      type: 'success',
      title: t('toast_prop_converted_title', lang),
      message: `"${prop.title}" ${t('toast_prop_converted_msg', lang)} ${newProject.deliverables.length} ${t('free_prop_deliverable_item', lang)}.`,
      category: 'freelance_solo',
      action: {
        label: t('toast_prop_kanban_btn', lang),
        onClick: () => {
          globalState = { ...globalState, activeScreen: 'scheduler' };
          notify();
        },
      },
    });

    if (isSupabaseConfigured()) {
      freelanceService.upsertProject(newProject).catch((err) => {
        console.warn('[store] Failed to save converted project to Supabase:', err);
      });
      if (prop) {
        freelanceService.upsertProposal({ ...prop, status: 'Accepted' }).catch((err) => {
          console.warn('[store] Failed to update proposal status in Supabase:', err);
        });
      }
    }

    return newProject;
  };

  const addFreelanceExpense = (expenseData: Omit<FreelanceExpense, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newExp: FreelanceExpense = {
      ...getTraceContext(),
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

    if (isSupabaseConfigured()) {
      freelanceService.upsertExpense(newExp).catch((err) => {
        console.warn('[store] Supabase upsertExpense notice:', err);
      });
    }

    return newExp;
  };

  const deleteFreelanceExpense = (id: string) => {
    globalState = {
      ...globalState,
      freelanceExpenses: globalState.freelanceExpenses.filter((e) => e.id !== id),
    };
    notify();
  };

  // ==========================================
  // Rentals & Venue Management Actions
  // ==========================================

  const createRentalBooking = (
    bookingData: Omit<RentalBooking, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>
  ) => {
    const bookingId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bk_${Date.now()}`;
    const newBooking: RentalBooking = {
      ...getTraceContext(),
      ...bookingData,
      id: bookingId,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Auto-create or link deposit record if deposit > 0
    let newDeposit: SecurityDepositRecord | null = null;
    if (newBooking.depositAmount > 0 && newBooking.depositStatus === 'Held') {
      const depositId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dep_${Date.now()}`;
      newDeposit = {
        ...getTraceContext(),
        id: depositId,
        tenantId: state.account.id,
        facilityId: state.currentBranchId,
        bookingId: newBooking.id,
        renterName: newBooking.renterName,
        unitName: newBooking.unitName,
        amount: newBooking.depositAmount,
        currency: newBooking.currency,
        paymentMethod: 'Cash',
        status: 'Held',
        collectedAt: new Date().toISOString(),
      };
    }

    // Update unit status if checked in
    const updatedUnits = globalState.rentableUnits.map((u) => {
      if (u.id === newBooking.unitId && newBooking.status === 'CheckedIn') {
        return { ...u, status: 'Occupied' as const };
      }
      return u;
    });

    globalState = {
      ...globalState,
      rentalBookings: [newBooking, ...globalState.rentalBookings],
      securityDeposits: newDeposit
        ? [newDeposit, ...globalState.securityDeposits]
        : globalState.securityDeposits,
      rentableUnits: updatedUnits,
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService
        .upsertBooking(newBooking)
        .then((res) => {
          if (res.success) {
            showToast({
              type: 'success',
              title: 'Reservation Saved to Cloud',
              message: `Booking for ${newBooking.renterName} in "${newBooking.unitName}" successfully written to Supabase ("rental_bookings").`,
              syncStatus: 'synced',
              table: 'rental_bookings',
            });
          } else {
            showToast({
              type: 'warning',
              title: 'Saved Locally (Cloud Alert)',
              message: `Booking saved in offline storage. Supabase notice: ${res.error || 'Check table schema/permissions'}`,
              syncStatus: 'error',
              table: 'rental_bookings',
            });
          }
        })
        .catch((err) => {
          showToast({
            type: 'warning',
            title: 'Saved Locally',
            message: `Booking stored locally. Network notice: ${err?.message || 'Offline mode'}`,
            syncStatus: 'local',
          });
        });

      if (newDeposit) {
        rentalService.upsertDeposit(newDeposit).catch((err) => console.warn('[store] Supabase upsertDeposit notice:', err));
      }
      const chgUnit = updatedUnits.find((u) => u.id === newBooking.unitId);
      if (chgUnit) {
        rentalService.upsertUnit(chgUnit).catch((err) => console.warn('[store] Supabase upsertUnit notice:', err));
      }
    } else {
      showToast({
        type: 'success',
        title: 'Reservation Saved',
        message: `Booking for ${newBooking.renterName} in "${newBooking.unitName}" saved to local storage.`,
        syncStatus: 'local',
      });
    }

    return newBooking;
  };

  const updateRentalBooking = (id: string, updates: Partial<RentalBooking>) => {
    const updatedBookings = globalState.rentalBookings.map((b) =>
      b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
    );
    globalState = {
      ...globalState,
      rentalBookings: updatedBookings,
    };
    notify();

    const target = updatedBookings.find((b) => b.id === id);
    if (target && isSupabaseConfigured()) {
      rentalService
        .upsertBooking(target)
        .then((res) => {
          if (res.success) {
            showToast({
              type: 'success',
              title: 'Reservation Updated & Synced',
              message: `Changes for "${target.renterName}" written to Supabase cloud.`,
              syncStatus: 'synced',
              table: 'rental_bookings',
            });
          } else {
            showToast({
              type: 'info',
              title: 'Reservation Updated',
              message: `Changes saved locally. Cloud notice: ${res.error || 'Pending sync'}`,
              syncStatus: 'local',
            });
          }
        })
        .catch((err) => console.warn('[store] Supabase updateRentalBooking notice:', err));
    } else if (target) {
      showToast({
        type: 'info',
        title: 'Reservation Updated',
        message: `Changes for "${target.renterName}" saved to local storage.`,
        syncStatus: 'local',
      });
    }
  };

  const deleteRentalBooking = (id: string) => {
    const target = globalState.rentalBookings.find((b) => b.id === id);
    globalState = {
      ...globalState,
      rentalBookings: globalState.rentalBookings.filter((b) => b.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService
        .deleteBooking(id)
        .then((res) => {
          showToast({
            type: 'info',
            title: 'Reservation Removed',
            message: res.success ? `Booking for "${target?.renterName || 'guest'}" deleted from Supabase cloud.` : 'Booking removed from local storage.',
            syncStatus: res.success ? 'synced' : 'local',
          });
        })
        .catch((err) => console.warn('[store] Supabase deleteRentalBooking notice:', err));
    } else {
      showToast({
        type: 'info',
        title: 'Reservation Removed',
        message: 'Booking removed from local storage.',
        syncStatus: 'local',
      });
    }
  };

  const checkInBooking = (id: string) => {
    const booking = globalState.rentalBookings.find((b) => b.id === id);
    if (!booking) return;

    const updatedBookings = globalState.rentalBookings.map((b) =>
      b.id === id ? { ...b, status: 'CheckedIn' as const, updatedAt: new Date().toISOString() } : b
    );
    const updatedUnits = globalState.rentableUnits.map((u) =>
      u.id === booking.unitId ? { ...u, status: 'Occupied' as const } : u
    );

    globalState = {
      ...globalState,
      rentalBookings: updatedBookings,
      rentableUnits: updatedUnits,
    };
    notify();

    if (isSupabaseConfigured()) {
      const b = updatedBookings.find((x) => x.id === id);
      if (b) rentalService.upsertBooking(b).catch(console.warn);
      const u = updatedUnits.find((x) => x.id === booking.unitId);
      if (u) rentalService.upsertUnit(u).catch(console.warn);
    }

    const lang = globalState.language;
    showToast({
      type: 'success',
      title: lang === 'ar' ? 'تم تسجيل دخول الضيف' : lang === 'fr' ? 'Client Enregistré' : 'Guest Checked In',
      message: lang === 'ar'
        ? `تم تسجيل دخول ${booking.renterName} إلى "${booking.unitName}". الفضاء الآن قيد الاستخدام.`
        : lang === 'fr'
        ? `${booking.renterName} est installé dans « ${booking.unitName} ». L'espace est désormais occupé.`
        : `${booking.renterName} checked into "${booking.unitName}". Space is now marked Occupied.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'rental_bookings',
      category: 'rental_booking',
    });
  };

  const checkOutBooking = (id: string) => {
    const booking = globalState.rentalBookings.find((b) => b.id === id);
    if (!booking) return;

    const updatedBookings = globalState.rentalBookings.map((b) =>
      b.id === id ? { ...b, status: 'Completed' as const, updatedAt: new Date().toISOString() } : b
    );
    const updatedUnits = globalState.rentableUnits.map((u) =>
      u.id === booking.unitId ? { ...u, status: 'Available' as const } : u
    );

    globalState = {
      ...globalState,
      rentalBookings: updatedBookings,
      rentableUnits: updatedUnits,
    };
    notify();

    if (isSupabaseConfigured()) {
      const b = updatedBookings.find((x) => x.id === id);
      if (b) rentalService.upsertBooking(b).catch(console.warn);
      const u = updatedUnits.find((x) => x.id === booking.unitId);
      if (u) rentalService.upsertUnit(u).catch(console.warn);
    }

    const lang = globalState.language;
    showToast({
      type: 'info',
      title: lang === 'ar' ? 'اكتمل تسليم وإخلاء القاعة' : lang === 'fr' ? 'Restitution & Sortie Terminées' : 'Handover & Check-Out Complete',
      message: lang === 'ar'
        ? `تم إخلاء "${booking.unitName}" بنجاح وأصبح متاحاً لحجوزات جديدة.`
        : lang === 'fr'
        ? `« ${booking.unitName} » a été libéré et est de nouveau disponible.`
        : `"${booking.unitName}" has been freed and marked Available for new bookings.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'rental_bookings',
      category: 'rental_booking',
    });
  };

  const createRentableUnit = (
    unitData: Omit<RentableUnit, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>
  ) => {
    const unitId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `unit_${Date.now()}`;
    const newUnit: RentableUnit = {
      ...getTraceContext(),
      ...unitData,
      id: unitId,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      rentableUnits: [newUnit, ...globalState.rentableUnits],
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService
        .upsertUnit(newUnit)
        .then((res) => {
          if (res.success) {
            showToast({
              type: 'success',
              title: 'Space Added & Synced',
              message: `"${newUnit.name}" (${newUnit.code}) written to Supabase ("rentable_units").`,
              syncStatus: 'synced',
              table: 'rentable_units',
            });
          } else {
            showToast({
              type: 'warning',
              title: 'Space Added Locally',
              message: `"${newUnit.name}" saved locally. Supabase notice: ${res.error || 'Pending'}`,
              syncStatus: 'error',
            });
          }
        })
        .catch((err) => console.warn('[store] Supabase upsertUnit notice:', err));
    } else {
      showToast({
        type: 'info',
        title: 'Space Added',
        message: `"${newUnit.name}" (${newUnit.code}) saved locally.`,
        syncStatus: 'local',
      });
    }

    return newUnit;
  };

  const updateRentableUnit = (id: string, updates: Partial<RentableUnit>) => {
    const updatedUnits = globalState.rentableUnits.map((u) => (u.id === id ? { ...u, ...updates } : u));
    globalState = {
      ...globalState,
      rentableUnits: updatedUnits,
    };
    notify();

    const target = updatedUnits.find((u) => u.id === id);
    if (target && isSupabaseConfigured()) {
      rentalService
        .upsertUnit(target)
        .then((res) => {
          if (res.success) {
            showToast({
              type: 'success',
              title: 'Space Updated & Synced',
              message: `Changes to "${target.name}" synced to Supabase ("rentable_units").`,
              syncStatus: 'synced',
              table: 'rentable_units',
            });
          }
        })
        .catch((err) => console.warn('[store] Supabase updateRentableUnit notice:', err));
    } else if (target) {
      showToast({
        type: 'info',
        title: 'Space Updated',
        message: `"${target.name}" updated locally.`,
        syncStatus: 'local',
      });
    }
  };

  const deleteRentableUnit = (id: string) => {
    const target = globalState.rentableUnits.find((u) => u.id === id);
    globalState = {
      ...globalState,
      rentableUnits: globalState.rentableUnits.filter((u) => u.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService
        .deleteUnit(id)
        .then((res) => {
          showToast({
            type: 'info',
            title: 'Space Removed',
            message: res.success ? `"${target?.name || 'Unit'}" removed from Supabase cloud.` : 'Space removed from local view.',
            syncStatus: res.success ? 'synced' : 'local',
          });
        })
        .catch((err) => console.warn('[store] Supabase deleteRentableUnit notice:', err));
    } else {
      showToast({
        type: 'info',
        title: 'Space Removed',
        message: 'Space removed from local view.',
        syncStatus: 'local',
      });
    }
  };

  const createRentalRenter = (
    renterData: Omit<RentalRenter, 'id' | 'tenantId' | 'facilityId' | 'totalBookings' | 'totalSpent' | 'createdAt'>
  ) => {
    const renterId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rnt_${Date.now()}`;
    const newRenter: RentalRenter = {
      ...getTraceContext(),
      ...renterData,
      id: renterId,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      totalBookings: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      rentalRenters: [newRenter, ...globalState.rentalRenters],
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService
        .upsertRenter(newRenter)
        .then((res) => {
          if (res.success) {
            showToast({
              type: 'success',
              title: 'Renter Created & Synced',
              message: `"${newRenter.fullName}" written to Supabase ("rental_renters").`,
              syncStatus: 'synced',
              table: 'rental_renters',
            });
          } else {
            showToast({
              type: 'warning',
              title: 'Renter Saved Locally',
              message: `"${newRenter.fullName}" saved locally. Supabase notice: ${res.error || 'Pending'}`,
              syncStatus: 'error',
            });
          }
        })
        .catch((err) => console.warn('[store] Supabase upsertRenter notice:', err));
    } else {
      showToast({
        type: 'info',
        title: 'Renter Added',
        message: `"${newRenter.fullName}" saved locally.`,
        syncStatus: 'local',
      });
    }

    return newRenter;
  };

  const updateRentalRenter = (id: string, updates: Partial<RentalRenter>) => {
    const updatedRenters = globalState.rentalRenters.map((r) => (r.id === id ? { ...r, ...updates } : r));
    globalState = {
      ...globalState,
      rentalRenters: updatedRenters,
    };
    notify();

    const target = updatedRenters.find((r) => r.id === id);
    if (target && isSupabaseConfigured()) {
      rentalService
        .upsertRenter(target)
        .then((res) => {
          if (res.success) {
            showToast({
              type: 'success',
              title: 'Renter Profile Synced',
              message: `Changes to "${target.fullName}" synced to Supabase ("rental_renters").`,
              syncStatus: 'synced',
              table: 'rental_renters',
            });
          }
        })
        .catch((err) => console.warn('[store] Supabase updateRentalRenter notice:', err));
    } else if (target) {
      showToast({
        type: 'info',
        title: 'Renter Updated',
        message: `Profile for "${target.fullName}" saved locally.`,
        syncStatus: 'local',
      });
    }
  };

  const deleteRentalRenter = (id: string) => {
    const target = globalState.rentalRenters.find((r) => r.id === id);
    globalState = {
      ...globalState,
      rentalRenters: globalState.rentalRenters.filter((r) => r.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService
        .deleteRenter(id)
        .then((res) => {
          showToast({
            type: 'info',
            title: 'Renter Removed',
            message: res.success ? `"${target?.fullName || 'Renter'}" removed from Supabase cloud.` : 'Renter removed from local directory.',
            syncStatus: res.success ? 'synced' : 'local',
          });
        })
        .catch((err) => console.warn('[store] Supabase deleteRentalRenter notice:', err));
    } else {
      showToast({
        type: 'info',
        title: 'Renter Removed',
        message: 'Renter removed from directory.',
        syncStatus: 'local',
      });
    }
  };

  const releaseSecurityDeposit = (depositId: string) => {
    const updatedDeposits = globalState.securityDeposits.map((d) =>
      d.id === depositId
        ? { ...d, status: 'Released' as const, releasedAt: new Date().toISOString() }
        : d
    );
    const target = globalState.securityDeposits.find((d) => d.id === depositId);
    let updatedBookings = globalState.rentalBookings;
    if (target?.bookingId) {
      updatedBookings = updatedBookings.map((b) =>
        b.id === target.bookingId ? { ...b, depositStatus: 'Refunded' as const } : b
      );
    }
    globalState = {
      ...globalState,
      securityDeposits: updatedDeposits,
      rentalBookings: updatedBookings,
    };
    notify();

    if (isSupabaseConfigured()) {
      const dep = updatedDeposits.find((d) => d.id === depositId);
      if (dep) rentalService.upsertDeposit(dep).catch(console.warn);
      if (target?.bookingId) {
        const bk = updatedBookings.find((b) => b.id === target.bookingId);
        if (bk) rentalService.upsertBooking(bk).catch(console.warn);
      }
    }

    const lang = globalState.language;
    showToast({
      type: 'success',
      title: lang === 'ar' ? 'تم استرجاع كفالة التأمين' : lang === 'fr' ? 'Caution Restituée' : 'Security Caution Refunded',
      message: lang === 'ar'
        ? `تم رد مبلغ الضمان الخاص بالمستأجر "${target?.renterName || 'الزبون'}".`
        : lang === 'fr'
        ? `Le dépôt de garantie pour « ${target?.renterName || 'Client'} » a été restitué.`
        : `Deposit for "${target?.renterName || 'Client'}" has been released back to renter.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'security_deposits',
      category: 'rental_booking',
      action: {
        label: lang === 'ar' ? 'سجل الكفالات' : lang === 'fr' ? 'Registre Cautions' : 'Deposit Log',
        onClick: () => {
          globalState = { ...globalState, activeScreen: 'finance' };
          notify();
        },
      },
    });
  };

  const deductSecurityDeposit = (depositId: string, reason: string, deductedAmount?: number) => {
    const target = globalState.securityDeposits.find((d) => d.id === depositId);
    if (!target) return;

    const updatedDeposits = globalState.securityDeposits.map((d) =>
      d.id === depositId
        ? {
            ...d,
            status: 'Deducted' as const,
            deductionReason: reason,
            amount: deductedAmount !== undefined ? deductedAmount : d.amount,
            releasedAt: new Date().toISOString(),
          }
        : d
    );
    let updatedBookings = globalState.rentalBookings;
    if (target.bookingId) {
      updatedBookings = updatedBookings.map((b) =>
        b.id === target.bookingId ? { ...b, depositStatus: 'Retained' as const } : b
      );
    }
    globalState = {
      ...globalState,
      securityDeposits: updatedDeposits,
      rentalBookings: updatedBookings,
    };
    notify();

    if (isSupabaseConfigured()) {
      const dep = updatedDeposits.find((d) => d.id === depositId);
      if (dep) rentalService.upsertDeposit(dep).catch(console.warn);
      if (target?.bookingId) {
        const bk = updatedBookings.find((b) => b.id === target.bookingId);
        if (bk) rentalService.upsertBooking(bk).catch(console.warn);
      }
    }

    const lang = globalState.language;
    showToast({
      type: 'warning',
      title: lang === 'ar' ? 'تم خصم من كفالة التأمين' : lang === 'fr' ? 'Caution Retenue pour Dégradation' : 'Caution Escrow Deducted',
      message: lang === 'ar'
        ? `تم احتجاز مبلغ من الكفالة. السبب: ${reason}.`
        : lang === 'fr'
        ? `Dépôt retenu. Motif : ${reason}.`
        : `Deposit retained. Reason: ${reason}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'security_deposits',
      category: 'rental_booking',
    });
  };

  const resetVenueMockData = () => {
    const targetFacilityId = state.currentBranchId || 'branch_venue_main';
    const targetAccountId = state.account.id || 'acc_01';
    const targetBusinessId = state.currentBusinessId || 'biz_venue';

    const freshBookings = createInitialRentalBookings().map((b) => ({
      ...b,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshDeposits = createInitialSecurityDeposits().map((d) => ({
      ...d,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshUnits = INITIAL_RENTABLE_UNITS.map((u) => ({
      ...u,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshRenters = INITIAL_RENTAL_RENTERS.map((r) => ({
      ...r,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));

    globalState = {
      ...globalState,
      rentableUnits: targetFacilityId === 'branch_venue_main' ? freshUnits : [...freshUnits, ...INITIAL_RENTABLE_UNITS],
      rentalRenters: targetFacilityId === 'branch_venue_main' ? freshRenters : [...freshRenters, ...INITIAL_RENTAL_RENTERS],
      rentalBookings: targetFacilityId === 'branch_venue_main' ? freshBookings : [...freshBookings, ...createInitialRentalBookings()],
      securityDeposits: targetFacilityId === 'branch_venue_main' ? freshDeposits : [...freshDeposits, ...createInitialSecurityDeposits()],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Données Démo Espace & Lieux',
      message: `${freshRenters.length} locataires, ${freshUnits.length} espaces, et ${freshBookings.length} réservations chargés.`,
      category: 'rental_booking',
    });
  };

  const resetEduMockData = () => {
    const targetFacilityId = state.currentBranchId || 'branch_edu_main';
    const targetAccountId = state.account.id || 'acc_01';
    const targetBusinessId = state.currentBusinessId || 'biz_edu';

    const freshStudents = INITIAL_EDU_STUDENTS.map((s) => ({
      ...s,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshCohorts = INITIAL_EDU_COHORTS.map((c) => ({
      ...c,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshEnrollments = INITIAL_EDU_ENROLLMENTS.map((e) => ({
      ...e,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshSessions = INITIAL_EDU_SESSIONS.map((sess) => ({
      ...sess,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshAttendance = INITIAL_EDU_ATTENDANCE.map((a) => ({
      ...a,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshGrades = INITIAL_EDU_GRADES.map((g) => ({
      ...g,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshCerts = INITIAL_EDU_CERTIFICATES.map((cert) => ({
      ...cert,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));
    const freshAdmissions = INITIAL_EDU_ADMISSIONS.map((adm) => ({
      ...adm,
      facilityId: targetFacilityId,
      branchId: targetFacilityId,
      businessId: targetBusinessId,
      accountId: targetAccountId,
    }));

    globalState = {
      ...globalState,
      eduStudents: freshStudents,
      eduCohorts: freshCohorts,
      eduEnrollments: freshEnrollments,
      eduSessions: freshSessions,
      eduAttendance: freshAttendance,
      eduGrades: freshGrades,
      eduCertificates: freshCerts,
      eduAdmissions: freshAdmissions,
    };
    notify();
    showToast({
      type: 'success',
      title: 'Données Démo Académie & Formation',
      message: `${freshStudents.length} étudiants, ${freshCohorts.length} promotions et ${freshAdmissions.length} dossiers d'admission réinitialisés.`,
      category: 'education_cohort',
    });
  };

  const resetFreelanceMockData = () => {
    const targetFacilityId = state.currentBranchId || 'branch_freelance_main';
    const targetAccountId = state.account.id || 'acc_01';

    const freshClients = INITIAL_FREELANCE_CLIENTS.map((c) => ({
      ...c,
      facilityId: targetFacilityId,
      tenantId: targetAccountId,
    }));
    const freshProjects = INITIAL_FREELANCE_PROJECTS.map((p) => ({
      ...p,
      facilityId: targetFacilityId,
      tenantId: targetAccountId,
    }));
    const freshTimeLogs = INITIAL_TIME_LOGS.map((t) => ({
      ...t,
      facilityId: targetFacilityId,
      tenantId: targetAccountId,
    }));
    const freshInvoices = INITIAL_FREELANCE_INVOICES.map((inv) => ({
      ...inv,
      facilityId: targetFacilityId,
      tenantId: targetAccountId,
    }));
    const freshProposals = INITIAL_FREELANCE_PROPOSALS.map((prop) => ({
      ...prop,
      facilityId: targetFacilityId,
      tenantId: targetAccountId,
    }));
    const freshExpenses = INITIAL_FREELANCE_EXPENSES.map((exp) => ({
      ...exp,
      facilityId: targetFacilityId,
      tenantId: targetAccountId,
    }));

    globalState = {
      ...globalState,
      freelanceClients: freshClients,
      freelanceProjects: freshProjects,
      timeLogs: freshTimeLogs,
      freelanceInvoices: freshInvoices,
      freelanceProposals: freshProposals,
      freelanceExpenses: freshExpenses,
    };
    notify();
    showToast({
      type: 'success',
      title: 'Données Démo Freelance & Studio',
      message: `${freshClients.length} clients, ${freshProjects.length} projets et ${freshInvoices.length} factures réinitialisés.`,
      category: 'freelance_solo',
    });
  };

  // ==========================================
  // Education & Academy Actions (Category 15)
  // ==========================================

  const addEduStudent = (studentData: Omit<EduStudent, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newStudent: EduStudent = {
      ...getTraceContext(),
      ...studentData,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduStudents: [newStudent, ...(globalState.eduStudents || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Student Enrolled',
      message: `${newStudent.fullName} added to student directory.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_students',
    });
    return newStudent;
  };

  const updateEduStudent = (studentId: string, updates: Partial<EduStudent>) => {
    globalState = {
      ...globalState,
      eduStudents: (globalState.eduStudents || []).map((s) =>
        s.id === studentId ? { ...s, ...updates } : s
      ),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Student Updated',
      message: `Student profile updated successfully.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_students',
    });
  };

  const deleteEduStudent = (studentId: string) => {
    const student = (globalState.eduStudents || []).find((s) => s.id === studentId);
    globalState = {
      ...globalState,
      eduStudents: (globalState.eduStudents || []).filter((s) => s.id !== studentId),
      eduEnrollments: (globalState.eduEnrollments || []).filter((e) => e.studentId !== studentId),
      eduAttendance: (globalState.eduAttendance || []).filter((a) => a.studentId !== studentId),
      eduGrades: (globalState.eduGrades || []).filter((g) => g.studentId !== studentId),
    };
    notify();
    showToast({
      type: 'warning',
      title: 'Student Removed',
      message: `${student?.fullName || 'Student'} deleted from directory.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_students',
    });
  };

  const addEduCohort = (cohortData: Omit<EduCohort, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'enrolledCount'>) => {
    const newCohort: EduCohort = {
      ...getTraceContext(),
      ...cohortData,
      id: `cohort_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      enrolledCount: 0,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduCohorts: [newCohort, ...(globalState.eduCohorts || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Cohort Created',
      message: `Batch "${newCohort.name}" initialized.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_cohorts',
    });
    return newCohort;
  };

  const updateEduCohort = (cohortId: string, updates: Partial<EduCohort>) => {
    globalState = {
      ...globalState,
      eduCohorts: (globalState.eduCohorts || []).map((ch) =>
        ch.id === cohortId ? { ...ch, ...updates } : ch
      ),
    };
    notify();
  };

  const deleteEduCohort = (cohortId: string) => {
    globalState = {
      ...globalState,
      eduCohorts: (globalState.eduCohorts || []).filter((ch) => ch.id !== cohortId),
      eduSessions: (globalState.eduSessions || []).filter((s) => s.cohortId !== cohortId),
    };
    notify();
    showToast({
      type: 'warning',
      title: 'Cohort Deleted',
      message: 'Cohort and syllabus schedule removed.',
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_cohorts',
    });
  };

  const addEduSession = (sessionData: Omit<EduSession, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newSession: EduSession = {
      ...getTraceContext(),
      ...sessionData,
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduSessions: [...(globalState.eduSessions || []), newSession],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Class Scheduled',
      message: `Session for ${newSession.cohortName} booked on ${newSession.date}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_sessions',
    });
    return newSession;
  };

  const updateEduSession = (sessionId: string, updates: Partial<EduSession>) => {
    globalState = {
      ...globalState,
      eduSessions: (globalState.eduSessions || []).map((se) =>
        se.id === sessionId ? { ...se, ...updates } : se
      ),
    };
    notify();
  };

  const deleteEduSession = (sessionId: string) => {
    globalState = {
      ...globalState,
      eduSessions: (globalState.eduSessions || []).filter((se) => se.id !== sessionId),
    };
    notify();
  };

  const batchRecordAttendance = (
    sessionId: string,
    cohortId: string,
    records: { studentId: string; studentName: string; status: AttendanceStatus; minutesLate?: number; excuseNote?: string }[]
  ) => {
    const nowIso = new Date().toISOString();
    const trace = getTraceContext();
    const newRecords: EduAttendance[] = records.map((r) => ({
      ...trace,
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      sessionId,
      cohortId,
      studentId: r.studentId,
      studentName: r.studentName,
      status: r.status,
      minutesLate: r.minutesLate,
      excuseNote: r.excuseNote,
      recordedAt: nowIso,
    }));

    const existing = (globalState.eduAttendance || []).filter((a) => a.sessionId !== sessionId);
    const updatedAttendance = [...newRecords, ...existing];

    const updatedSessions = (globalState.eduSessions || []).map((s) =>
      s.id === sessionId ? { ...s, status: 'Completed' as const } : s
    );

    const updatedStudents = (globalState.eduStudents || []).map((st) => {
      const studentRecords = updatedAttendance.filter((a) => a.studentId === st.id);
      if (studentRecords.length === 0) return st;
      const presentCount = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
      const rate = Math.round((presentCount / studentRecords.length) * 1000) / 10;
      return { ...st, attendanceRatePercent: rate };
    });

    globalState = {
      ...globalState,
      eduAttendance: updatedAttendance,
      eduSessions: updatedSessions,
      eduStudents: updatedStudents,
    };
    notify();

    const presentTally = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
    showToast({
      type: 'success',
      title: 'Roll Call Submitted',
      message: `${presentTally}/${records.length} students logged present.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_attendance',
    });
  };

  const recordEduGrade = (gradeData: Omit<EduGrade, 'id' | 'tenantId' | 'facilityId' | 'gradedAt'>) => {
    const newGrade: EduGrade = {
      ...getTraceContext(),
      ...gradeData,
      id: `grd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      gradedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduGrades: [newGrade, ...(globalState.eduGrades || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Grade Recorded',
      message: `${newGrade.studentName}: ${newGrade.score}/${newGrade.maxScore} on ${newGrade.assessmentTitle}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_grades',
    });
    return newGrade;
  };

  const deleteEduGrade = (gradeId: string) => {
    globalState = {
      ...globalState,
      eduGrades: (globalState.eduGrades || []).filter((g) => g.id !== gradeId),
    };
    notify();
  };

  const recordTuitionPayment = (
    enrollmentId: string,
    installmentIndex: number,
    amount: number,
    paymentMethod: string = 'Cash'
  ) => {
    const nowIso = new Date().toISOString();
    globalState = {
      ...globalState,
      eduEnrollments: (globalState.eduEnrollments || []).map((en) => {
        if (en.id !== enrollmentId) return en;
        const newPaid = Math.min(en.agreedTuition, (en.paidAmount || 0) + amount);
        const newBalance = Math.max(0, en.agreedTuition - newPaid);
        const newStatus: EnrollmentPaymentStatus = newBalance === 0 ? 'Paid' : 'Partial';

        const updatedInstallments = (en.installments || []).map((inst, idx) => {
          if (idx === installmentIndex) {
            return { ...inst, isPaid: true, paidAt: nowIso };
          }
          return inst;
        });

        return {
          ...en,
          paidAmount: newPaid,
          balanceDue: newBalance,
          paymentStatus: newStatus,
          installments: updatedInstallments,
        };
      }),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Tuition Payment Logged',
      message: `Recorded payment of ${amount.toLocaleString()} DZD via ${paymentMethod}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_enrollments',
      category: 'education_cohort',
      action: {
        label: 'Receipt',
        onClick: () => window.print?.(),
      },
    });
  };

  const addEduEnrollment = (enrollmentData: Omit<EduEnrollment, 'id' | 'tenantId' | 'facilityId' | 'enrolledAt'>) => {
    const newEnrollment: EduEnrollment = {
      ...getTraceContext(),
      ...enrollmentData,
      id: `enr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      enrolledAt: new Date().toISOString(),
    };

    const updatedCohorts = (globalState.eduCohorts || []).map((c) =>
      c.id === newEnrollment.cohortId
        ? { ...c, enrolledCount: (c.enrolledCount || 0) + 1 }
        : c
    );

    globalState = {
      ...globalState,
      eduEnrollments: [newEnrollment, ...(globalState.eduEnrollments || [])],
      eduCohorts: updatedCohorts,
    };
    notify();
    showToast({
      type: 'success',
      title: 'Enrollment Confirmed',
      message: `${newEnrollment.studentName} enrolled in ${newEnrollment.cohortName}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_enrollments',
    });
    return newEnrollment;
  };

  const addEduAdmissionLead = (leadData: Omit<EduAdmissionLead, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newLead: EduAdmissionLead = {
      ...getTraceContext(),
      ...leadData,
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduAdmissions: [newLead, ...(globalState.eduAdmissions || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Prospect Added',
      message: `${newLead.studentName} logged in admissions pipeline.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_admissions',
    });
    return newLead;
  };

  const updateAdmissionStage = (leadId: string, stage: AdmissionStage) => {
    globalState = {
      ...globalState,
      eduAdmissions: (globalState.eduAdmissions || []).map((l) =>
        l.id === leadId ? { ...l, stage } : l
      ),
    };
    notify();
  };

  const updateEduAdmissionLead = (leadId: string, updates: Partial<EduAdmissionLead>) => {
    globalState = {
      ...globalState,
      eduAdmissions: (globalState.eduAdmissions || []).map((l) =>
        l.id === leadId ? { ...l, ...updates } : l
      ),
    };
    notify();
  };

  const deleteEduAdmissionLead = (leadId: string) => {
    globalState = {
      ...globalState,
      eduAdmissions: (globalState.eduAdmissions || []).filter((l) => l.id !== leadId),
    };
    notify();
  };

  const convertAdmissionToStudent = (leadId: string, cohortId: string, initialDeposit: number = 0) => {
    const lead = (globalState.eduAdmissions || []).find((l) => l.id === leadId);
    const cohort = (globalState.eduCohorts || []).find((c) => c.id === cohortId);
    if (!lead || !cohort) return;

    const trace = getTraceContext();
    const newStudent: EduStudent = {
      ...trace,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      fullName: lead.studentName,
      email: lead.email,
      phone: lead.phone,
      guardianName: lead.guardianName,
      status: 'Active',
      attendanceRatePercent: 100,
      createdAt: new Date().toISOString(),
    };

    const tuition = cohort.tuitionFee;
    const tranche1 = Math.round(tuition * 0.5);
    const tranche2 = tuition - tranche1;

    const paid = Math.min(tuition, Math.max(0, initialDeposit));
    const isFirstPaid = paid >= tranche1;
    const isFullyPaid = paid >= tuition;

    const newEnrollment: EduEnrollment = {
      ...trace,
      id: `enr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      cohortId: cohort.id,
      cohortName: cohort.name,
      enrolledAt: new Date().toISOString(),
      agreedTuition: tuition,
      discountAmount: 0,
      paidAmount: paid,
      balanceDue: Math.max(0, tuition - paid),
      currency: cohort.currency,
      paymentStatus: isFullyPaid ? 'Paid' : paid > 0 ? 'Partial' : 'Pending',
      status: 'Active',
      installments: [
        { dueDate: cohort.startDate, amount: tranche1, isPaid: isFirstPaid },
        { dueDate: cohort.endDate, amount: tranche2, isPaid: isFullyPaid },
      ],
    };

    globalState = {
      ...globalState,
      eduStudents: [newStudent, ...(globalState.eduStudents || [])],
      eduEnrollments: [newEnrollment, ...(globalState.eduEnrollments || [])],
      eduCohorts: (globalState.eduCohorts || []).map((c) =>
        c.id === cohort.id ? { ...c, enrolledCount: (c.enrolledCount || 0) + 1 } : c
      ),
      eduAdmissions: (globalState.eduAdmissions || []).map((l) =>
        l.id === leadId ? { ...l, stage: 'Enrolled' as const } : l
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Student Enrolled',
      message: `${newStudent.fullName} admitted & enrolled in ${cohort.name}!${paid > 0 ? ` (Acompte: ${paid.toLocaleString()} DZD)` : ''}`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_students',
      category: 'education_cohort',
      action: {
        label: 'Cohorts',
        onClick: () => {
          globalState = { ...globalState, activeScreen: 'shop' };
          notify();
        },
      },
    });
  };

  const issueEduCertificate = (certData: Omit<EduCertificate, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'certificateNumber' | 'verificationHash'>) => {
    const certNum = `ATRIUM-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = '0x' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newCert: EduCertificate = {
      ...getTraceContext(),
      ...certData,
      id: `cert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      certificateNumber: certNum,
      verificationHash: hash,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduCertificates: [newCert, ...(globalState.eduCertificates || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Certificate Issued',
      message: `Accredited diploma #${certNum} issued for ${newCert.studentName}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      table: 'edu_certificates',
      category: 'education_cohort',
      action: {
        label: 'View Cert',
        onClick: () => window.print?.(),
      },
    });
    return newCert;
  };

  const addEduClassroom = (classroomData: Omit<EduClassroom, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newRoom: EduClassroom = {
      ...getTraceContext(),
      ...classroomData,
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduClassrooms: [...(globalState.eduClassrooms || []), newRoom],
    };
    notify();
    return newRoom;
  };

  const addEduCourse = (courseData: Omit<EduCourse, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const newCourse: EduCourse = {
      ...getTraceContext(),
      ...courseData,
      id: `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduCourses: [newCourse, ...(globalState.eduCourses || [])],
    };
    notify();
    return newCourse;
  };

  // ============================================================
  // Project & Milestone Actions (ProjectMilestone)
  // ============================================================
  const setActivePmRole = (role: PMRole) => {
    let defaultSubScreen = 'dashboard';
    let defaultScreen: ActiveScreen = 'pm_dir_dashboard';

    if (role === 'direction') {
      defaultSubScreen = 'dashboard';
      defaultScreen = 'pm_dir_dashboard';
    } else if (role === 'chef_projet') {
      defaultSubScreen = 'portfolio';
      defaultScreen = 'pm_cp_projects';
    } else if (role === 'crea') {
      defaultSubScreen = 'kanban';
      defaultScreen = 'pm_crea_kanban';
    } else if (role === 'superviseur') {
      defaultSubScreen = 'missions';
      defaultScreen = 'pm_sup_missions';
    } else if (role === 'rh') {
      defaultSubScreen = 'talents';
      defaultScreen = 'pm_rh_talents';
    } else if (role === 'compta') {
      defaultSubScreen = 'payroll';
      defaultScreen = 'pm_compta_payroll';
    }

    globalState = {
      ...globalState,
      activePmRole: role,
      activePmSubScreen: defaultSubScreen,
      activeScreen: defaultScreen,
    };
    notify();
  };

  const setActiveGarageRole = (role: GarageRole) => {
    let defaultScreen: ActiveScreen = 'dashboard';
    if (role === 'gerant') {
      defaultScreen = 'dashboard';
    } else if (role === 'reception') {
      defaultScreen = 'scheduler';
    } else if (role === 'mecanicien') {
      defaultScreen = 'scheduler';
    } else if (role === 'magasinier') {
      defaultScreen = 'shop';
    } else if (role === 'caisse') {
      defaultScreen = 'finance';
    }

    globalState = {
      ...globalState,
      activeGarageRole: role,
      activeScreen: defaultScreen,
    };
    notify();
  };

  const setActiveRealEstateRole = (role: RealEstateRole) => {
    let defaultScreen: ActiveScreen = 'dashboard';
    if (role === 'direction') {
      defaultScreen = 'dashboard';
    } else if (role === 'negociateur') {
      defaultScreen = 'dashboard';
    } else if (role === 'gestionnaire_locatif') {
      defaultScreen = 'scheduler';
    } else if (role === 'notaire_compta') {
      defaultScreen = 'finance';
    }

    globalState = {
      ...globalState,
      activeRealEstateRole: role,
      activeScreen: defaultScreen,
    };
    notify();
  };

  const setActiveManufacturingRole = (role: ManufacturingRole) => {
    let defaultScreen: ActiveScreen = 'dashboard';
    if (role === 'gerant') {
      defaultScreen = 'dashboard';
    } else if (role === 'chef_atelier') {
      defaultScreen = 'scheduler';
    } else if (role === 'operateur') {
      defaultScreen = 'dashboard';
    } else if (role === 'magasinier') {
      defaultScreen = 'members';
    } else if (role === 'qualite') {
      defaultScreen = 'finance';
    }

    globalState = {
      ...globalState,
      activeManufacturingRole: role,
      activeScreen: defaultScreen,
    };
    notify();
  };

  const setActiveLegalRole = (role: LegalRole) => {
    let defaultScreen: ActiveScreen = 'dashboard';
    if (role === 'avocat_associe') {
      defaultScreen = 'dashboard';
    } else if (role === 'notaire_titulaire') {
      defaultScreen = 'members';
    } else if (role === 'expert_comptable') {
      defaultScreen = 'finance';
    } else if (role === 'secretaire_caisse') {
      defaultScreen = 'dashboard';
    }

    globalState = {
      ...globalState,
      activeLegalRole: role,
      activeScreen: defaultScreen,
    };
    notify();
  };

  const setActiveLogisticsRole = (role: LogisticsRole) => {
    let defaultScreen: ActiveScreen = 'dashboard';
    if (role === 'gerant') {
      defaultScreen = 'dashboard';
    } else if (role === 'dispatcher') {
      defaultScreen = 'scheduler';
    } else if (role === 'hub_sorter') {
      defaultScreen = 'registrations';
    } else if (role === 'stop_desk_agent') {
      defaultScreen = 'members';
    }

    globalState = {
      ...globalState,
      activeLogisticsRole: role,
      activeScreen: defaultScreen,
    };
    notify();
  };

  const setActivePmSubScreen = (subScreen: string) => {
    let nextScreen = globalState.activeScreen;
    const role = globalState.activePmRole;

    if (role === 'direction') {
      if (subScreen === 'dashboard') nextScreen = 'pm_dir_dashboard';
      else if (subScreen === 'new_project') nextScreen = 'pm_dir_new_project';
      else if (subScreen === 'approvals') nextScreen = 'pm_dir_approvals';
      else if (subScreen === 'reports') nextScreen = 'pm_dir_reports';
    } else if (role === 'chef_projet') {
      if (subScreen === 'portfolio') nextScreen = 'pm_cp_projects';
      else if (subScreen === 'catalog') nextScreen = 'pm_cp_catalog';
      else if (subScreen === 'orders') nextScreen = 'pm_cp_orders';
      else if (subScreen === 'files' || subScreen === 'bat') nextScreen = 'pm_cp_files';
      else if (subScreen === 'expenses') nextScreen = 'pm_cp_expenses';
    } else if (role === 'crea') {
      if (subScreen === 'demandes' || subScreen === 'kanban') nextScreen = 'pm_crea_kanban';
      else if (subScreen === 'production') nextScreen = 'pm_crea_production';
      else if (subScreen === 'upload' || subScreen === 'livrables') nextScreen = 'pm_crea_upload';
      else if (subScreen === 'briefs') nextScreen = 'pm_crea_briefs';
    } else if (role === 'superviseur') {
      if (subScreen === 'missions') nextScreen = 'pm_sup_missions';
      else if (subScreen === 'attendance') nextScreen = 'pm_sup_attendance';
      else if (subScreen === 'staffing') nextScreen = 'pm_sup_staffing';
      else if (subScreen === 'expense' || subScreen === 'expenses') nextScreen = 'pm_sup_expenses';
    } else if (role === 'rh') {
      if (subScreen === 'talents') nextScreen = 'pm_rh_talents';
      else if (subScreen === 'dossier') nextScreen = 'pm_rh_dossier';
      else if (subScreen === 'portal') nextScreen = 'pm_rh_portal';
      else if (subScreen === 'walkin') nextScreen = 'pm_rh_walkin';
    } else if (role === 'compta') {
      if (subScreen === 'payroll') nextScreen = 'pm_compta_payroll';
      else if (subScreen === 'ccp') nextScreen = 'pm_compta_ccp';
      else if (subScreen === 'expenses') nextScreen = 'pm_compta_expenses';
      else if (subScreen === 'stock') nextScreen = 'pm_compta_stock';
    }

    globalState = {
      ...globalState,
      activePmSubScreen: subScreen,
      activeScreen: nextScreen,
    };
    notify();
  };

  const addPmProject = (projectData: Omit<PMProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProj: PMProject = {
      ...getTraceContext(),
      ...projectData,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      pmProjects: [newProj, ...(globalState.pmProjects || [])],
    };
    notify();
    projectMilestoneService.upsertProject(newProj).catch(() => {});
    showToast({
      type: 'success',
      title: 'Projet Initié',
      message: `${newProj.title} créé avec un plafond budgétaire de ${newProj.budgetCapDzd.toLocaleString()} DA.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      category: 'project_milestone',
    });
    return newProj;
  };

  const updatePmProjectStatus = (projectId: string, status: PMProject['status']) => {
    globalState = {
      ...globalState,
      pmProjects: (globalState.pmProjects || []).map((p) =>
        p.id === projectId ? { ...p, status, updatedAt: new Date().toISOString() } : p
      ),
    };
    notify();
    const updated = globalState.pmProjects.find((p) => p.id === projectId);
    if (updated) projectMilestoneService.upsertProject(updated).catch(() => {});
  };

  const addPmPrintOrder = (orderData: Omit<PMPrintOrder, 'id' | 'createdAt'>) => {
    const newOrder: PMPrintOrder = {
      ...getTraceContext(),
      ...orderData,
      id: `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      pmPrintOrders: [newOrder, ...(globalState.pmPrintOrders || [])],
    };
    notify();
    projectMilestoneService.createPrintOrder(newOrder).catch(() => {});
    showToast({
      type: 'success',
      title: 'Bon de Commande Impression Transmis',
      message: `${newOrder.orderNumber} transmis à la Créa (${newOrder.items.length} références).`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      category: 'project_milestone',
    });
    return newOrder;
  };

  const updatePmPrintOrderStatus = (orderId: string, status: PMPrintOrder['status']) => {
    globalState = {
      ...globalState,
      pmPrintOrders: (globalState.pmPrintOrders || []).map((o) =>
        o.id === orderId ? { ...o, status } : o
      ),
    };
    notify();
  };

  const addPmBatDeliverable = (batData: Omit<PMBatDeliverable, 'id' | 'createdAt'>) => {
    const newBat: PMBatDeliverable = {
      ...getTraceContext(),
      ...batData,
      id: `bat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      pmBatDeliverables: [newBat, ...(globalState.pmBatDeliverables || [])],
    };
    notify();
    projectMilestoneService.upsertBatDeliverable(newBat).catch(() => {});
    showToast({
      type: 'success',
      title: 'Livrable BAT Déposé',
      message: `${newBat.title} (${newBat.versionCode}) soumis pour validation technique.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      category: 'project_milestone',
    });
    return newBat;
  };

  const reviewPmBatDeliverable = (batId: string, status: 'approved' | 'revision_requested', comments?: string) => {
    globalState = {
      ...globalState,
      pmBatDeliverables: (globalState.pmBatDeliverables || []).map((b) =>
        b.id === batId
          ? {
              ...b,
              approvalStatus: status,
              revisionComments: comments || b.revisionComments,
            }
          : b
      ),
    };
    notify();
    const updated = globalState.pmBatDeliverables.find((b) => b.id === batId);
    if (updated) projectMilestoneService.upsertBatDeliverable(updated).catch(() => {});
    showToast({
      type: status === 'approved' ? 'success' : 'warning',
      title: status === 'approved' ? 'BAT Validé Bon à Tirer' : 'Corrections Demandées',
      message: status === 'approved' ? 'Livrable prêt pour impression et déblocage imprimeur.' : 'Remarques transmises au Studio Créa.',
      category: 'project_milestone',
    });
  };

  const addPmTalent = (talentData: Omit<PMTalent, 'id' | 'createdAt' | 'consolidatedScore'>) => {
    const score = Number(((talentData.initialHrScore + talentData.averageMissionRating) / 2).toFixed(2));
    const newTalent: PMTalent = {
      ...getTraceContext(),
      ...talentData,
      id: `talent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      consolidatedScore: score,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      pmTalents: [newTalent, ...(globalState.pmTalents || [])],
    };
    notify();
    projectMilestoneService.upsertTalent(newTalent).catch(() => {});
    showToast({
      type: 'success',
      title: 'Profil Candidat Enregistré',
      message: `${newTalent.fullName} (Wilaya ${newTalent.wilayaCode} - ${newTalent.wilayaName}) inscrit avec CCP ${newTalent.ccpNumber}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      category: 'project_milestone',
    });
    return newTalent;
  };

  const updatePmTalentStatus = (talentId: string, status: PMTalent['status']) => {
    globalState = {
      ...globalState,
      pmTalents: (globalState.pmTalents || []).map((t) =>
        t.id === talentId ? { ...t, status } : t
      ),
    };
    notify();
    const updated = globalState.pmTalents.find((t) => t.id === talentId);
    if (updated) projectMilestoneService.upsertTalent(updated).catch(() => {});
  };

  const addPmMission = (missionData: Omit<PMMission, 'id' | 'createdAt'>) => {
    const newMission: PMMission = {
      ...getTraceContext(),
      ...missionData,
      id: `mis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      pmMissions: [newMission, ...(globalState.pmMissions || [])],
    };
    notify();
    projectMilestoneService.upsertMission(newMission).catch(() => {});
    showToast({
      type: 'success',
      title: 'Mission Terrain Planifiée',
      message: `${newMission.code}: ${newMission.title} à ${newMission.venueName}.`,
      syncStatus: isSupabaseConfigured() ? 'synced' : 'local',
      category: 'project_milestone',
    });
    return newMission;
  };

  const updatePmAttendanceStatus = (
    attendanceId: string,
    status: PMAttendance['status'],
    minutesLate?: number,
    shiftRating?: number
  ) => {
    globalState = {
      ...globalState,
      pmAttendances: (globalState.pmAttendances || []).map((a) => {
        if (a.id === attendanceId) {
          const grossPayableDzd = ['present', 'late', 'replacement'].includes(status) ? a.dayRateDzd : 0;
          return {
            ...a,
            status,
            minutesLate: minutesLate !== undefined ? minutesLate : a.minutesLate,
            shiftRating: shiftRating !== undefined ? shiftRating : a.shiftRating,
            grossPayableDzd,
            checkInTime: a.checkInTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return a;
      }),
    };
    notify();
  };

  const closePmRollCall = (missionId: string) => {
    const mission = (globalState.pmMissions || []).find((m) => m.id === missionId);
    if (!mission) return;

    const missionAtts = (globalState.pmAttendances || []).filter((a) => a.missionId === missionId);
    let totalDzd = 0;
    let count = 0;

    const lockedAtts = (globalState.pmAttendances || []).map((a) => {
      if (a.missionId === missionId) {
        if (['present', 'late', 'replacement'].includes(a.status)) {
          totalDzd += a.grossPayableDzd;
          count += 1;
        }
        return { ...a, isLocked: true, lockedAt: new Date().toISOString() };
      }
      return a;
    });

    const batchNumber = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;
    const newBatch: PMPayrollBatch = {
      ...getTraceContext(),
      id: `batch_${Date.now()}`,
      tenantId: mission.tenantId,
      facilityId: mission.facilityId,
      projectId: mission.projectId,
      projectTitle: mission.projectTitle,
      missionId: mission.id,
      missionCode: mission.code,
      batchNumber,
      totalBeneficiaries: count,
      totalAmountDzd: totalDzd,
      status: 'pending_direction_approval',
      createdAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      pmAttendances: lockedAtts,
      pmPayrollBatches: [newBatch, ...(globalState.pmPayrollBatches || [])],
    };
    notify();

    projectMilestoneService.closeRollCall(missionId, mission.supervisorId, missionAtts).catch(() => {});

    showToast({
      type: 'success',
      title: 'Pointage Clôturé & Verrouillé',
      message: `${count} animateurs pointés pour ${totalDzd.toLocaleString()} DA. Lot de paie ${batchNumber} en attente DG.`,
      category: 'project_milestone',
    });
  };

  const addPmExpense = (expenseData: Omit<PMExpense, 'id' | 'createdAt' | 'status'>) => {
    const newExp: PMExpense = {
      ...getTraceContext(),
      ...expenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'pending_direction_approval',
      createdAt: new Date().toISOString(),
    };

    // Slide 11: Auto-create indirect stock code and lifecycle entry
    const nextAssetNum = 148 + (globalState.pmEquipmentStock?.length || 0);
    const dateFormatted = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const newStockItem: PMEquipmentStock = {
      ...getTraceContext(),
      id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: newExp.tenantId,
      facilityId: newExp.facilityId,
      assetCode: `NCH-A-00${nextAssetNum}`,
      title: newExp.title,
      category: 'counter_desk',
      acquisitionCostDzd: newExp.amountDzd,
      currentStatus: 'deployed_on_mission',
      currentCustodianName: newExp.declaredByUserName,
      conditionReport: 'good',
      qrLabelCode: `QR-NCH-A-00${nextAssetNum}`,
      history: [
        {
          date: dateFormatted,
          stage: 'Acheté & codé',
          detail: `${newExp.title} — ${newExp.amountDzd.toLocaleString()} DA`,
        },
        {
          date: dateFormatted,
          stage: 'Affecté',
          detail: newExp.projectTitle || 'Roadshow Ooredoo',
        },
        {
          date: 'Auj.',
          stage: 'En stock',
          detail: 'Disponible — état : bon',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      pmExpenses: [newExp, ...(globalState.pmExpenses || [])],
      pmEquipmentStock: [newStockItem, ...(globalState.pmEquipmentStock || [])],
    };
    notify();
    projectMilestoneService.upsertExpense(newExp).catch(() => {});
    showToast({
      type: 'warning',
      title: 'Achat Déclaré & Stock Codé',
      message: `${newStockItem.assetCode} (${newExp.title}) ajouté à l'inventaire et soumis à la DG.`,
      category: 'project_milestone',
    });
    return newExp;
  };

  const approvePmExpense = (expenseId: string, notes?: string) => {
    globalState = {
      ...globalState,
      pmExpenses: (globalState.pmExpenses || []).map((e) =>
        e.id === expenseId
          ? {
              ...e,
              status: 'approved_by_direction',
              directionApprovedAt: new Date().toISOString(),
              directionNotes: notes || e.directionNotes,
            }
          : e
      ),
    };
    notify();
    projectMilestoneService.approveDisbursement('expense', expenseId, state.currentUser.id, notes).catch(() => {});
    showToast({
      type: 'success',
      title: 'Frais Validé par la Direction',
      message: 'Autorisation de décaissement transmise à la Comptabilité.',
      category: 'project_milestone',
    });
  };

  const rejectPmExpense = (expenseId: string, notes?: string) => {
    globalState = {
      ...globalState,
      pmExpenses: (globalState.pmExpenses || []).map((e) =>
        e.id === expenseId
          ? {
              ...e,
              status: 'rejected',
              directionNotes: notes || 'Rejeté par la Direction.',
            }
          : e
      ),
    };
    notify();
    showToast({
      type: 'error',
      title: 'Frais Rejeté',
      message: notes || 'Le remboursement a été refusé.',
      category: 'project_milestone',
    });
  };

  const approvePmPayrollBatch = (batchId: string) => {
    globalState = {
      ...globalState,
      pmPayrollBatches: (globalState.pmPayrollBatches || []).map((b) =>
        b.id === batchId
          ? {
              ...b,
              status: 'approved_by_direction',
              directionApprovedAt: new Date().toISOString(),
            }
          : b
      ),
    };
    notify();
    projectMilestoneService.approveDisbursement('payroll_batch', batchId, state.currentUser.id).catch(() => {});
    showToast({
      type: 'success',
      title: 'Lot de Paie Validé (Double-Clé)',
      message: 'Déblocage accordé pour l\'émission des bordereaux CCP SFP 01 en Comptabilité.',
      category: 'project_milestone',
    });
  };

  const generatePmCcpSlipsForBatch = (batchId: string) => {
    const batch = (globalState.pmPayrollBatches || []).find((b) => b.id === batchId);
    if (!batch) return;

    const attendances = (globalState.pmAttendances || []).filter((a) => a.missionId === batch.missionId);
    const talentsMap = new Map((globalState.pmTalents || []).map((t) => [t.id, t]));

    const trace = getTraceContext();
    const newSlips: PMCcpSlip[] = [];
    for (const att of attendances) {
      if (!['present', 'late', 'replacement'].includes(att.status)) continue;
      const talent = talentsMap.get(att.talentId);
      if (!talent) continue;

      const amt = att.grossPayableDzd || 3500;
      newSlips.push({
        ...trace,
        id: `slip_${att.id}_${Date.now()}`,
        accountId: batch.accountId || batch.tenantId || trace.accountId,
        businessId: batch.businessId || trace.businessId,
        branchId: batch.branchId || batch.facilityId || trace.branchId,
        staffId: batch.staffId || trace.staffId,
        tenantId: batch.tenantId,
        facilityId: batch.facilityId,
        batchId: batch.id,
        talentId: talent.id,
        beneficiaryName: talent.fullName,
        ccpNumber: talent.ccpNumber,
        ccpKey: talent.ccpKey,
        wilayaName: talent.wilayaName,
        amountDzd: amt,
        amountInWordsFr: numberToWordsFrench(amt),
        amountInWordsAr: numberToWordsArabic(amt),
        transactionReference: `Paie ${batch.missionCode} - ${batch.projectTitle}`,
        isPrinted: false,
        createdAt: new Date().toISOString(),
      });
    }

    globalState = {
      ...globalState,
      pmCcpSlips: [...newSlips, ...(globalState.pmCcpSlips || [])],
      pmPayrollBatches: (globalState.pmPayrollBatches || []).map((b) =>
        b.id === batchId ? { ...b, status: 'ccp_generated', ccpGeneratedAt: new Date().toISOString() } : b
      ),
    };
    notify();

    projectMilestoneService.generateCcpBatchSlips(batch, attendances, talentsMap).catch(() => {});

    showToast({
      type: 'success',
      title: 'Bordereaux CCP SFP 01 Générés',
      message: `${newSlips.length} mandats postaux prêts pour impression et virement Algérie Poste.`,
      category: 'project_milestone',
    });
  };

  const markPmCcpSlipPrinted = (slipId: string) => {
    globalState = {
      ...globalState,
      pmCcpSlips: (globalState.pmCcpSlips || []).map((s) =>
        s.id === slipId ? { ...s, isPrinted: true, printedAt: new Date().toISOString() } : s
      ),
    };
    notify();
  };

  const addPmEquipmentStock = (itemData: Omit<PMEquipmentStock, 'id' | 'createdAt'>) => {
    const newItem: PMEquipmentStock = {
      ...getTraceContext(),
      ...itemData,
      id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      pmEquipmentStock: [newItem, ...(globalState.pmEquipmentStock || [])],
    };
    notify();
    projectMilestoneService.upsertEquipmentStock(newItem).catch(() => {});
    showToast({
      type: 'success',
      title: 'Matériel Enregistré',
      message: `${newItem.assetCode}: ${newItem.title} ajouté à l\'inventaire d\'agence.`,
      category: 'project_milestone',
    });
    return newItem;
  };

  const updatePmEquipmentStatus = (
    assetId: string,
    status: PMEquipmentStock['currentStatus'],
    conditionReport?: PMEquipmentStock['conditionReport']
  ) => {
    globalState = {
      ...globalState,
      pmEquipmentStock: (globalState.pmEquipmentStock || []).map((eq) =>
        eq.id === assetId
          ? {
              ...eq,
              currentStatus: status,
              conditionReport: conditionReport || eq.conditionReport,
            }
          : eq
      ),
    };
    notify();
    const updated = globalState.pmEquipmentStock.find((e) => e.id === assetId);
    if (updated) projectMilestoneService.upsertEquipmentStock(updated).catch(() => {});
  };

  const resetPmMockData = () => {
    const targetFacilityId = state.currentBranchId || 'branch_agency_main';
    const targetAccountId = state.account.id || 'acc_01';
    const targetBizId = state.currentBusinessId || 'biz_agency';

    const freshClients = INITIAL_PM_CLIENTS.map((c) => ({
      ...c,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshProjects = INITIAL_PM_PROJECTS.map((p) => ({
      ...p,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshMilestones = INITIAL_PM_MILESTONES.map((m) => ({
      ...m,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshCollateral = INITIAL_PM_COLLATERAL_CATALOG.map((c) => ({
      ...c,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshPrintOrders = INITIAL_PM_PRINT_ORDERS.map((po) => ({
      ...po,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshBatDeliverables = INITIAL_PM_BAT_DELIVERABLES.map((b) => ({
      ...b,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshTalents = INITIAL_PM_TALENTS.map((t) => ({
      ...t,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshMissions = INITIAL_PM_MISSIONS.map((m) => ({
      ...m,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshAttendances = INITIAL_PM_ATTENDANCES.map((a) => ({
      ...a,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshExpenses = INITIAL_PM_EXPENSES.map((e) => ({
      ...e,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshPayrollBatches = INITIAL_PM_PAYROLL_BATCHES.map((pb) => ({
      ...pb,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshCcpSlips = INITIAL_PM_CCP_SLIPS.map((s) => ({
      ...s,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));
    const freshEquipment = INITIAL_PM_EQUIPMENT_STOCK.map((eq) => ({
      ...eq,
      tenantId: targetAccountId,
      facilityId: targetFacilityId,
      accountId: targetAccountId,
      businessId: targetBizId,
      branchId: targetFacilityId,
    }));

    globalState = {
      ...globalState,
      pmClients: freshClients,
      pmProjects: freshProjects,
      pmMilestones: freshMilestones,
      pmCollateralCatalog: freshCollateral,
      pmPrintOrders: freshPrintOrders,
      pmBatDeliverables: freshBatDeliverables,
      pmTalents: freshTalents,
      pmMissions: freshMissions,
      pmAttendances: freshAttendances,
      pmExpenses: freshExpenses,
      pmPayrollBatches: freshPayrollBatches,
      pmCcpSlips: freshCcpSlips,
      pmEquipmentStock: freshEquipment,
    };
    notify();
    showToast({
      type: 'success',
      title: 'Données Démo Agence Réinitialisées',
      message: `${freshProjects.length} projets, ${freshMissions.length} missions et ${freshTalents.length} talents rechargés avec succès.`,
      category: 'project_milestone',
    });
  };

  const deletePmProject = (projectId: string) => {
    globalState = {
      ...globalState,
      pmProjects: (globalState.pmProjects || []).filter((p) => p.id !== projectId),
    };
    notify();
  };

  const batchDeletePmProjects = (projectIds: string[]) => {
    const idSet = new Set(projectIds);
    globalState = {
      ...globalState,
      pmProjects: (globalState.pmProjects || []).filter((p) => !idSet.has(p.id)),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Projets Supprimés',
      message: `${projectIds.length} projet(s) supprimé(s).`,
      category: 'project_milestone',
    });
  };

  const batchUpdatePmProjectStatus = (projectIds: string[], status: PMProject['status']) => {
    const idSet = new Set(projectIds);
    globalState = {
      ...globalState,
      pmProjects: (globalState.pmProjects || []).map((p) =>
        idSet.has(p.id) ? { ...p, status, updatedAt: new Date().toISOString() } : p
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Statuts Projets Mis à Jour',
      message: `${projectIds.length} projet(s) passés en statut '${status}'.`,
      category: 'project_milestone',
    });
  };

  const batchApprovePmExpenses = (expenseIds: string[], notes?: string) => {
    const idSet = new Set(expenseIds);
    globalState = {
      ...globalState,
      pmExpenses: (globalState.pmExpenses || []).map((e) =>
        idSet.has(e.id)
          ? {
              ...e,
              status: 'approved_by_direction',
              directionApprovedAt: new Date().toISOString(),
              directionNotes: notes || e.directionNotes,
            }
          : e
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Frais Validés en Lot',
      message: `${expenseIds.length} demande(s) de frais validée(s) par la Direction.`,
      category: 'project_milestone',
    });
  };

  const batchRejectPmExpenses = (expenseIds: string[], notes?: string) => {
    const idSet = new Set(expenseIds);
    globalState = {
      ...globalState,
      pmExpenses: (globalState.pmExpenses || []).map((e) =>
        idSet.has(e.id)
          ? {
              ...e,
              status: 'rejected',
              directionNotes: notes || 'Rejeté en lot par la Direction.',
            }
          : e
      ),
    };
    notify();
    showToast({
      type: 'error',
      title: 'Frais Rejetés en Lot',
      message: `${expenseIds.length} demande(s) de frais rejetée(s).`,
      category: 'project_milestone',
    });
  };

  const batchDeletePmExpenses = (expenseIds: string[]) => {
    const idSet = new Set(expenseIds);
    globalState = {
      ...globalState,
      pmExpenses: (globalState.pmExpenses || []).filter((e) => !idSet.has(e.id)),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Frais Supprimés',
      message: `${expenseIds.length} entrée(s) de frais supprimée(s).`,
      category: 'project_milestone',
    });
  };

  const batchApprovePmPayrollBatches = (batchIds: string[]) => {
    const idSet = new Set(batchIds);
    globalState = {
      ...globalState,
      pmPayrollBatches: (globalState.pmPayrollBatches || []).map((b) =>
        idSet.has(b.id)
          ? {
              ...b,
              status: 'approved_by_direction',
              directionApprovedAt: new Date().toISOString(),
            }
          : b
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Lots de Paie Validés (Double-Clé)',
      message: `${batchIds.length} lot(s) de paie validé(s) pour virement CCP.`,
      category: 'project_milestone',
    });
  };

  const batchUpdatePmPrintOrderStatus = (orderIds: string[], status: PMPrintOrder['status']) => {
    const idSet = new Set(orderIds);
    globalState = {
      ...globalState,
      pmPrintOrders: (globalState.pmPrintOrders || []).map((o) =>
        idSet.has(o.id) ? { ...o, status } : o
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Commandes Impression Mises à Jour',
      message: `${orderIds.length} bon(s) de commande mis à jour.`,
      category: 'project_milestone',
    });
  };

  const batchDeletePmPrintOrders = (orderIds: string[]) => {
    const idSet = new Set(orderIds);
    globalState = {
      ...globalState,
      pmPrintOrders: (globalState.pmPrintOrders || []).filter((o) => !idSet.has(o.id)),
    };
    notify();
  };

  const batchReviewPmBatDeliverables = (
    batIds: string[],
    status: 'approved' | 'revision_requested',
    comments?: string
  ) => {
    const idSet = new Set(batIds);
    globalState = {
      ...globalState,
      pmBatDeliverables: (globalState.pmBatDeliverables || []).map((b) =>
        idSet.has(b.id)
          ? {
              ...b,
              approvalStatus: status,
              revisionComments: comments || b.revisionComments,
            }
          : b
      ),
    };
    notify();
    showToast({
      type: status === 'approved' ? 'success' : 'warning',
      title: status === 'approved' ? 'BAT Validés en Lot' : 'Révisions Demandées',
      message: `${batIds.length} livrable(s) ${status === 'approved' ? 'validé(s) Bon à Tirer' : 'renvoyé(s) pour correction'}.`,
      category: 'project_milestone',
    });
  };

  const batchDeletePmBatDeliverables = (batIds: string[]) => {
    const idSet = new Set(batIds);
    globalState = {
      ...globalState,
      pmBatDeliverables: (globalState.pmBatDeliverables || []).filter((b) => !idSet.has(b.id)),
    };
    notify();
  };

  const batchDeletePmTalents = (talentIds: string[]) => {
    const idSet = new Set(talentIds);
    globalState = {
      ...globalState,
      pmTalents: (globalState.pmTalents || []).filter((t) => !idSet.has(t.id)),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Talents Supprimés',
      message: `${talentIds.length} profil(s) supprimé(s).`,
      category: 'project_milestone',
    });
  };

  const batchUpdatePmTalentStatus = (talentIds: string[], status: PMTalent['status']) => {
    const idSet = new Set(talentIds);
    globalState = {
      ...globalState,
      pmTalents: (globalState.pmTalents || []).map((t) =>
        idSet.has(t.id) ? { ...t, status } : t
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Statuts Talents Mis à Jour',
      message: `${talentIds.length} talent(s) mis à jour en '${status}'.`,
      category: 'project_milestone',
    });
  };

  const batchDeletePmMissions = (missionIds: string[]) => {
    const idSet = new Set(missionIds);
    globalState = {
      ...globalState,
      pmMissions: (globalState.pmMissions || []).filter((m) => !idSet.has(m.id)),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Missions Supprimées',
      message: `${missionIds.length} mission(s) retirée(s).`,
      category: 'project_milestone',
    });
  };

  const batchUpdatePmAttendanceStatus = (attendanceIds: string[], status: PMAttendance['status']) => {
    const idSet = new Set(attendanceIds);
    globalState = {
      ...globalState,
      pmAttendances: (globalState.pmAttendances || []).map((a) => {
        if (idSet.has(a.id)) {
          const grossPayableDzd = ['present', 'late', 'replacement'].includes(status) ? a.dayRateDzd : 0;
          return {
            ...a,
            status,
            grossPayableDzd,
            checkInTime: a.checkInTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return a;
      }),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Pointages Mis à Jour',
      message: `${attendanceIds.length} animateur(s) marqué(s) '${status}'.`,
      category: 'project_milestone',
    });
  };

  const batchMarkPmCcpSlipsPrinted = (slipIds: string[]) => {
    const idSet = new Set(slipIds);
    globalState = {
      ...globalState,
      pmCcpSlips: (globalState.pmCcpSlips || []).map((s) =>
        idSet.has(s.id) ? { ...s, isPrinted: true, printedAt: new Date().toISOString() } : s
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Bordereaux Marqués Imprimés',
      message: `${slipIds.length} bordereau(x) CCP SFP 01 prêts pour le guichet postal.`,
      category: 'project_milestone',
    });
  };

  const batchUpdatePmEquipmentStatus = (
    assetIds: string[],
    status: PMEquipmentStock['currentStatus']
  ) => {
    const idSet = new Set(assetIds);
    globalState = {
      ...globalState,
      pmEquipmentStock: (globalState.pmEquipmentStock || []).map((eq) =>
        idSet.has(eq.id) ? { ...eq, currentStatus: status } : eq
      ),
    };
    notify();
    showToast({
      type: 'success',
      title: 'Matériels Mis à Jour',
      message: `${assetIds.length} équipement(s) mis à jour en '${status}'.`,
      category: 'project_milestone',
    });
  };

  const batchDeletePmEquipmentStock = (assetIds: string[]) => {
    const idSet = new Set(assetIds);
    globalState = {
      ...globalState,
      pmEquipmentStock: (globalState.pmEquipmentStock || []).filter((eq) => !idSet.has(eq.id)),
    };
    notify();
  };

  const resetAllData = () => {
    const previousSnapshot = { ...globalState };
    globalState = {
      ...DEFAULT_STATE,
      storageVersion: ATRIUM_STORAGE_VERSION,
      language: globalState.language,
      theme: globalState.theme,
      currentUser: globalState.currentUser,
    };
    notify();
    showToast({
      type: 'info',
      title: 'Toutes les données réinitialisées',
      message: 'La base de données locale a été réinitialisée avec les données de démonstration.',
      action: {
        label: 'Annuler',
        onClick: () => {
          globalState = previousSnapshot;
          notify();
          showToast({
            type: 'success',
            title: 'Annulation effectuée',
            message: 'Les données précédentes ont été rétablies.',
          });
        },
      },
    });
  };

  const resetToDefaultDemoData = (targetCategory?: BusinessCategory) => {
    const previousSnapshot = { ...globalState };
    if (!targetCategory) {
      resetAllData();
      return;
    }

    let updates: Partial<AppState> = {};
    if (targetCategory === 'rental_booking') {
      updates = {
        rentableUnits: INITIAL_RENTABLE_UNITS,
        rentalBookings: INITIAL_RENTAL_BOOKINGS,
        rentalRenters: INITIAL_RENTAL_RENTERS,
        securityDeposits: INITIAL_SECURITY_DEPOSITS,
      };
    } else if (targetCategory === 'education_cohort') {
      updates = {
        eduCourses: INITIAL_EDU_COURSES,
        eduClassrooms: INITIAL_EDU_CLASSROOMS,
        eduCohorts: INITIAL_EDU_COHORTS,
        eduStudents: INITIAL_EDU_STUDENTS,
        eduEnrollments: INITIAL_EDU_ENROLLMENTS,
        eduSessions: INITIAL_EDU_SESSIONS,
        eduAttendance: INITIAL_EDU_ATTENDANCE,
        eduGrades: INITIAL_EDU_GRADES,
        eduCertificates: INITIAL_EDU_CERTIFICATES,
        eduAdmissions: INITIAL_EDU_ADMISSIONS,
      };
    } else if (targetCategory === 'freelance_solo') {
      updates = {
        freelanceClients: INITIAL_FREELANCE_CLIENTS,
        freelanceProjects: INITIAL_FREELANCE_PROJECTS,
        timeLogs: INITIAL_TIME_LOGS,
        freelanceInvoices: INITIAL_FREELANCE_INVOICES,
        freelanceProposals: INITIAL_FREELANCE_PROPOSALS,
        freelanceExpenses: INITIAL_FREELANCE_EXPENSES,
      };
    } else if (targetCategory === 'pos_inventory') {
      updates = {
        products: INITIAL_PRODUCTS,
        sales: INITIAL_SALES,
        stockMovements: INITIAL_STOCK_MOVEMENTS,
        parkedOrders: INITIAL_PARKED_ORDERS,
      };
    } else if (targetCategory === 'appointment_service') {
      updates = {
        appointments: INITIAL_APPOINTMENTS,
        servicesCatalog: INITIAL_SALON_SERVICES,
        salonWorkstations: INITIAL_SALON_WORKSTATIONS,
        stylistPayouts: INITIAL_STYLIST_PAYOUTS,
      };
    } else if (targetCategory === 'project_milestone') {
      updates = {
        pmClients: INITIAL_PM_CLIENTS,
        pmProjects: INITIAL_PM_PROJECTS,
        pmMilestones: INITIAL_PM_MILESTONES,
        pmCollateralCatalog: INITIAL_PM_COLLATERAL_CATALOG,
        pmPrintOrders: INITIAL_PM_PRINT_ORDERS,
        pmBatDeliverables: INITIAL_PM_BAT_DELIVERABLES,
        pmTalents: INITIAL_PM_TALENTS,
        pmMissions: INITIAL_PM_MISSIONS,
        pmAttendances: INITIAL_PM_ATTENDANCES,
        pmExpenses: INITIAL_PM_EXPENSES,
        pmPayrollBatches: INITIAL_PM_PAYROLL_BATCHES,
        pmCcpSlips: INITIAL_PM_CCP_SLIPS,
        pmEquipmentStock: INITIAL_PM_EQUIPMENT_STOCK,
      };
    } else if (targetCategory === 'membership_session') {
      updates = {
        members: INITIAL_MEMBERS,
        leads: INITIAL_LEADS,
        schedule: INITIAL_SCHEDULE,
        devices: INITIAL_DEVICES,
      };
    } else if (targetCategory === 'trading_commercial') {
      updates = {
        b2bClients: INITIAL_B2B_CLIENTS,
        b2bSuppliers: INITIAL_B2B_SUPPLIERS,
        warehouses: INITIAL_WAREHOUSES,
        commercialDocs: INITIAL_COMMERCIAL_DOCS,
        purchaseDocs: INITIAL_PURCHASE_DOCS,
        stockVouchers: INITIAL_STOCK_VOUCHERS,
      };
    }

    globalState = {
      ...globalState,
      ...updates,
      storageVersion: ATRIUM_STORAGE_VERSION,
    };
    notify();

    showToast({
      type: 'info',
      title: 'Données de démo réinitialisées',
      message: `Le jeu de données de ${targetCategory} a été réinitialisé.`,
      action: {
        label: 'Annuler',
        onClick: () => {
          globalState = previousSnapshot;
          notify();
          showToast({
            type: 'success',
            title: 'Annulation effectuée',
            message: 'Les données précédentes ont été rétablies.',
          });
        },
      },
    });
  };

  // ============================================================
  // Category 8: B2B Commercial Trading & Wholesale Actions
  // ============================================================

  const createCommercialDoc = (doc: Omit<CommercialDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `cdoc_${Date.now()}`;
    const newDoc: CommercialDocument = {
      ...doc,
      id,
      accountId: doc.accountId || globalState.account?.id || 'acc_01',
      businessId: doc.businessId || globalState.currentBusinessId,
      branchId: doc.branchId || globalState.currentBranchId,
      facilityId: doc.facilityId || globalState.currentBranchId,
      tenantId: doc.tenantId || globalState.account?.id || 'acc_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      commercialDocs: [newDoc, ...(globalState.commercialDocs || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Document commercial créé',
      message: `${newDoc.docNumber} (${newDoc.clientName}) a été enregistré.`,
      category: 'trading_commercial',
    });
    return newDoc;
  };

  const updateCommercialDoc = (id: string, updates: Partial<CommercialDocument>) => {
    globalState = {
      ...globalState,
      commercialDocs: (globalState.commercialDocs || []).map((d) =>
        d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
      ),
    };
    notify();
    showToast({
      type: 'info',
      title: 'Document mis à jour',
      message: `Modifications enregistrées.`,
      category: 'trading_commercial',
    });
  };

  const deleteCommercialDoc = (id: string) => {
    const doc = (globalState.commercialDocs || []).find((d) => d.id === id);
    globalState = {
      ...globalState,
      commercialDocs: (globalState.commercialDocs || []).filter((d) => d.id !== id),
    };
    notify();
    showToast({
      type: 'warning',
      title: 'Document supprimé',
      message: `${doc?.docNumber || id} a été retiré.`,
      category: 'trading_commercial',
    });
  };

  const convertCommercialDoc = (sourceDocId: string, targetType: CommercialDocType) => {
    const sourceDoc = (globalState.commercialDocs || []).find((d) => d.id === sourceDocId);
    if (!sourceDoc) return null;

    const currentYear = new Date().getFullYear();
    const count = (globalState.commercialDocs || []).filter((d) => d.type === targetType).length + 1;
    const prefix = targetType === 'bl' ? 'BL' : targetType === 'facture' ? 'FAC' : targetType === 'commande' ? 'BC' : 'AV';
    const docNumber = `${prefix}-${currentYear}-${count.toString().padStart(4, '0')}`;

    const newDoc: CommercialDocument = {
      ...sourceDoc,
      id: `cdoc_${Date.now()}`,
      type: targetType,
      docNumber,
      date: new Date().toISOString().split('T')[0],
      status: targetType === 'facture' ? 'Validated' : targetType === 'bl' ? 'Delivered' : 'Draft',
      linkedDocId: sourceDoc.id,
      linkedDocNumber: sourceDoc.docNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedSource = {
      ...sourceDoc,
      status: targetType === 'bl' ? ('Delivered' as const) : ('Validated' as const),
      updatedAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      commercialDocs: [
        newDoc,
        ...globalState.commercialDocs.map((d) => (d.id === sourceDocId ? updatedSource : d)),
      ],
    };
    notify();

    showToast({
      type: 'success',
      title: `Conversion effectuée`,
      message: `${sourceDoc.docNumber} converti en ${newDoc.docNumber}.`,
      category: 'trading_commercial',
    });

    return newDoc;
  };

  const createPurchaseDoc = (doc: Omit<PurchaseDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `pdoc_${Date.now()}`;
    const newDoc: PurchaseDocument = {
      ...doc,
      id,
      accountId: doc.accountId || globalState.account?.id || 'acc_01',
      businessId: doc.businessId || globalState.currentBusinessId,
      branchId: doc.branchId || globalState.currentBranchId,
      facilityId: doc.facilityId || globalState.currentBranchId,
      tenantId: doc.tenantId || globalState.account?.id || 'acc_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      purchaseDocs: [newDoc, ...(globalState.purchaseDocs || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Commande Fournisseur Créée',
      message: `${newDoc.docNumber} (${newDoc.supplierName}) enregistrée.`,
      category: 'trading_commercial',
    });
    return newDoc;
  };

  const updatePurchaseDoc = (id: string, updates: Partial<PurchaseDocument>) => {
    globalState = {
      ...globalState,
      purchaseDocs: (globalState.purchaseDocs || []).map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    };
    notify();
  };

  const receivePurchaseDoc = (poId: string) => {
    const po = (globalState.purchaseDocs || []).find((p) => p.id === poId);
    if (!po) return null;

    const currentYear = new Date().getFullYear();
    const count = (globalState.purchaseDocs || []).filter((p) => p.type === 'br').length + 1;
    const brNumber = `BR-${currentYear}-${count.toString().padStart(4, '0')}`;

    const receivedItems = po.items.map((it) => ({
      ...it,
      receivedQty: it.orderedQty,
    }));

    const newBr: PurchaseDocument = {
      ...po,
      id: `pdoc_${Date.now()}`,
      type: 'br',
      docNumber: brNumber,
      status: 'Received',
      actualDeliveryDate: new Date().toISOString().split('T')[0],
      items: receivedItems,
      linkedPoId: po.id,
      linkedPoNumber: po.docNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const voucherCount = (globalState.stockVouchers || []).length + 1;
    const voucherNumber = `BE-${currentYear}-${voucherCount.toString().padStart(4, '0')}`;
    const newVoucher: StockMovementVoucher = {
      id: `svouch_${Date.now()}`,
      voucherNumber,
      type: 'entree',
      date: new Date().toISOString().split('T')[0],
      depotSourceId: po.depotId,
      depotSourceName: po.depotName || 'Dépôt Central Oued Smar',
      reason: 'reception_achat',
      operatorName: globalState.currentUser?.fullName || 'Responsable Réception',
      tenantId: po.tenantId,
      facilityId: po.facilityId,
      items: po.items.map((it) => ({
        productId: it.productId || '',
        productName: it.description,
        quantity: it.orderedQty,
        unitCostDzd: it.unitCostHt,
        unit: it.unit,
      })),
      totalValuationDzd: po.totalHt,
      notes: `Entrée automatique suite à la réception ${brNumber} (PO: ${po.docNumber}).`,
      createdAt: new Date().toISOString(),
    };

    const updatedProducts = (globalState.products || []).map((prod) => {
      const match = po.items.find((it) => it.productId === prod.id || it.description === prod.name);
      if (match) {
        return {
          ...prod,
          stockQuantity: (prod.stockQuantity || 0) + match.orderedQty,
        };
      }
      return prod;
    });

    const updatedPo: PurchaseDocument = {
      ...po,
      status: 'Received',
      updatedAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      purchaseDocs: [
        newBr,
        ...globalState.purchaseDocs.map((p) => (p.id === poId ? updatedPo : p)),
      ],
      stockVouchers: [newVoucher, ...(globalState.stockVouchers || [])],
      products: updatedProducts,
    };
    notify();

    showToast({
      type: 'success',
      title: 'Réception à Quai Validée',
      message: `${brNumber} généré. Les stocks ont été automatiquement incrémentés.`,
      category: 'trading_commercial',
    });

    return newBr;
  };

  const createStockVoucher = (voucher: Omit<StockMovementVoucher, 'id' | 'createdAt'>) => {
    const id = `svouch_${Date.now()}`;
    const newVoucher: StockMovementVoucher = {
      ...voucher,
      id,
      createdAt: new Date().toISOString(),
    };

    const updatedProducts = (globalState.products || []).map((prod) => {
      const match = voucher.items.find((it) => it.productId === prod.id);
      if (match) {
        const delta = voucher.type === 'entree' ? match.quantity : voucher.type === 'sortie' ? -match.quantity : 0;
        return {
          ...prod,
          stockQuantity: Math.max(0, (prod.stockQuantity || 0) + delta),
        };
      }
      return prod;
    });

    globalState = {
      ...globalState,
      stockVouchers: [newVoucher, ...(globalState.stockVouchers || [])],
      products: updatedProducts,
    };
    notify();

    showToast({
      type: 'info',
      title: `Mouvement de stock enregistré`,
      message: `${newVoucher.voucherNumber} (${voucher.reason}) validé.`,
      category: 'trading_commercial',
    });

    return newVoucher;
  };

  const createB2bClient = (client: Omit<B2bClient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `b2b_cli_${Date.now()}`;
    const newClient: B2bClient = {
      ...client,
      id,
      tenantId: client.tenantId || globalState.account?.id || 'acc_01',
      facilityId: client.facilityId || globalState.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      b2bClients: [newClient, ...(globalState.b2bClients || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Client B2B Créé',
      message: `${newClient.companyName} ajouté au répertoire commercial.`,
      category: 'trading_commercial',
    });
    return newClient;
  };

  const updateB2bClient = (id: string, updates: Partial<B2bClient>) => {
    globalState = {
      ...globalState,
      b2bClients: (globalState.b2bClients || []).map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    };
    notify();
  };

  const deleteB2bClient = (id: string) => {
    globalState = {
      ...globalState,
      b2bClients: (globalState.b2bClients || []).filter((c) => c.id !== id),
    };
    notify();
  };

  const createB2bSupplier = (supplier: Omit<B2bSupplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `b2b_sup_${Date.now()}`;
    const newSup: B2bSupplier = {
      ...supplier,
      id,
      tenantId: supplier.tenantId || globalState.account?.id || 'acc_01',
      facilityId: supplier.facilityId || globalState.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      b2bSuppliers: [newSup, ...(globalState.b2bSuppliers || [])],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Fournisseur Référencé',
      message: `${newSup.supplierName} enregistré.`,
      category: 'trading_commercial',
    });
    return newSup;
  };

  const updateB2bSupplier = (id: string, updates: Partial<B2bSupplier>) => {
    globalState = {
      ...globalState,
      b2bSuppliers: (globalState.b2bSuppliers || []).map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    };
    notify();
  };

  const deleteB2bSupplier = (id: string) => {
    globalState = {
      ...globalState,
      b2bSuppliers: (globalState.b2bSuppliers || []).filter((s) => s.id !== id),
    };
    notify();
  };

  const createWarehouseDepot = (depot: Omit<WarehouseDepot, 'id' | 'createdAt'>) => {
    const id = `depot_${Date.now()}`;
    const newDepot: WarehouseDepot = {
      ...depot,
      id,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      warehouses: [...(globalState.warehouses || []), newDepot],
    };
    notify();
    showToast({
      type: 'success',
      title: 'Dépôt Créé',
      message: `${newDepot.name} (${newDepot.code}) opérationnel.`,
      category: 'trading_commercial',
    });
    return newDepot;
  };

  const resetTradingMockData = () => {
    globalState = {
      ...globalState,
      b2bClients: INITIAL_B2B_CLIENTS,
      b2bSuppliers: INITIAL_B2B_SUPPLIERS,
      warehouses: INITIAL_WAREHOUSES,
      commercialDocs: INITIAL_COMMERCIAL_DOCS,
      purchaseDocs: INITIAL_PURCHASE_DOCS,
      stockVouchers: INITIAL_STOCK_VOUCHERS,
    };
    notify();
    showToast({
      type: 'info',
      title: 'Négoce Commercial Réinitialisé',
      message: 'Données de démonstration B2B restaurées.',
      category: 'trading_commercial',
    });
  };

  const exportDatabase = (): string => {
    return JSON.stringify(
      {
        ...globalState,
        storageVersion: ATRIUM_STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        version: 'atrium_v2_full',
      },
      null,
      2
    );
  };

  const importDatabase = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.businesses) ||
        !Array.isArray(parsed.branches) ||
        !parsed.account
      ) {
        showToast({
          type: 'error',
          title: 'Invalid Backup File',
          message: 'The selected file is missing essential Atrium database structures.',
        });
        return false;
      }

      globalState = {
        ...DEFAULT_STATE,
        ...parsed,
        storageVersion: ATRIUM_STORAGE_VERSION,
        toasts: [],
      };
      notify();
      showToast({
        type: 'success',
        title: 'Database Restored Successfully',
        message: `Restored ${parsed.businesses.length} businesses, ${parsed.branches.length} branches, and all workspace records.`,
      });
      return true;
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Restore Failed',
        message: err?.message || 'Failed to parse JSON backup file.',
      });
      return false;
    }
  };

  const setNetworkMode = (mode: 'online' | 'slow_3g' | 'offline' | 'force_skeleton') => {
    let syncState = globalState.isSyncing;
    let errorMsg = globalState.syncErrorMessage;
    let status = globalState.supabaseStatus;
    let isTimedOut = false;

    if (mode === 'force_skeleton') {
      syncState = true;
      isTimedOut = false;
    } else if (mode === 'offline') {
      syncState = false;
      status = 'offline';
      errorMsg = 'Network connection offline (simulation mode)';
      isTimedOut = true;
    } else if (mode === 'online') {
      syncState = false;
      errorMsg = null;
      status = isSupabaseConfigured() ? 'connected' : 'unconfigured';
      isTimedOut = false;
    } else if (mode === 'slow_3g') {
      syncState = true;
      isTimedOut = false;
      setTimeout(() => {
        globalState = {
          ...globalState,
          isSyncing: false,
          isSyncTimeout: true,
          lastSyncedAt: new Date().toISOString(),
        };
        notify();
      }, 3000);
    }

    globalState = {
      ...globalState,
      networkMode: mode,
      isSyncing: syncState,
      supabaseStatus: status,
      syncErrorMessage: errorMsg,
      isSyncTimeout: isTimedOut,
    };
    notify();
  };

  const retryCloudSync = async () => {
    globalState = {
      ...globalState,
      isSyncing: true,
      syncErrorMessage: null,
      isSyncTimeout: false,
    };
    notify();

    try {
      if (globalState.networkMode === 'offline') {
        await new Promise((r) => setTimeout(r, 1200));
        globalState = {
          ...globalState,
          isSyncing: false,
          isSyncTimeout: true,
          syncErrorMessage: 'Simulated connection failed: device is offline.',
        };
        notify();
        return;
      }
      await syncWithSupabase();
    } finally {
      globalState = {
        ...globalState,
        isSyncing: false,
        isSyncTimeout: false,
        lastSyncedAt: new Date().toISOString(),
      };
      notify();
    }
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
    isLanguageAuto: state.isLanguageAuto,
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
    networkMode: state.networkMode || 'online',
    isSyncTimeout: state.isSyncTimeout || false,
    setNetworkMode,
    retryCloudSync,
    isSupabaseConfigured: isSupabaseConfigured(),
    syncWithSupabase,
    // Freelancer Collections (Strictly Scoped by Active Branch)
    freelanceClients: currentFreelanceClients,
    freelanceProjects: currentFreelanceProjects,
    timeLogs: currentTimeLogs,
    freelanceInvoices: currentFreelanceInvoices,
    freelanceProposals: currentFreelanceProposals,
    freelanceExpenses: currentFreelanceExpenses,
    activeTimer: state.activeTimer,
    // Auth State
    currentUser: state.currentUser,
    isAuthenticated: state.isAuthenticated,
    isOnboardingOpen: state.isOnboardingOpen,
    isFastSwitchOpen: state.isFastSwitchOpen,
    isDesktopUpgradeModalOpen: state.isDesktopUpgradeModalOpen,
    desktopUpgradeReason: state.desktopUpgradeReason,
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
    parkedOrders: currentParkedOrders,
    stockMovements: currentStockMovements,
    receiptConfig: state.receiptConfig || DEFAULT_RECEIPT_CONFIG,
    // Rentals & Venue Collections (Strictly Scoped by Active Branch)
    rentableUnits: currentRentableUnits,
    rentalBookings: currentRentalBookings,
    rentalRenters: currentRentalRenters,
    securityDeposits: currentSecurityDeposits,
    // Education & Academy Collections (Strictly Scoped by Active Branch)
    eduCourses: currentEduCourses,
    eduClassrooms: currentEduClassrooms,
    eduCohorts: currentEduCohorts,
    eduStudents: currentEduStudents,
    eduEnrollments: currentEduEnrollments,
    eduSessions: currentEduSessions,
    eduAttendance: currentEduAttendance,
    eduGrades: currentEduGrades,
    eduCertificates: currentEduCertificates,
    eduAdmissions: currentEduAdmissions,
    selectedMember,
    isDetailOpen: state.isDetailOpen,
    // Actions
    setScreen,
    setTheme,
    setLanguage,
    setSystemDefaultLanguage,
    switchFacility,
    switchBusiness,
    switchBranch,
    selectMember,
    closeDetail,
    addMember,
    updateMember,
    deleteMember,
    checkInMember,
    addLead,
    updateLeadStatus,
    deleteLead,
    convertLeadToMember,
    addProduct,
    updateProduct,
    deleteProduct,
    processSale,
    refundSale,
    adjustStock,
    parkOrder,
    resumeParkedOrder,
    deleteParkedOrder,
    updateReceiptConfig,
    seedDemoInventory,
    batchDeleteProducts,
    batchRestockProducts,
    resetPosMockData,
    addStaff,
    addBusiness,
    addBranch,
    registerDevice,
    revokeDevice,
    redeemVoucher,
    resetAllData,
    resetToDefaultDemoData,
    exportDatabase,
    importDatabase,
    // Appointment & Salon Actions

    createAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    deleteAppointment,
    batchDeleteAppointments,
    batchUpdateAppointmentStatus,
    addServiceItem,
    updateServiceItem,
    deleteServiceItem,
    batchDeleteServiceItems,
    checkoutAppointment,
    updateStylistPayoutStatus,
    resetSalonMockData,
    salonWorkstations: state.salonWorkstations || INITIAL_SALON_WORKSTATIONS,
    stylistPayouts: state.stylistPayouts || INITIAL_STYLIST_PAYOUTS,

    // Freelance Actions
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    addFreelanceClient,
    updateFreelanceClient,
    deleteFreelanceClient,
    addFreelanceProject,
    updateFreelanceProject,
    deleteFreelanceProject,
    updateProjectStage,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    updateDeliverableStage,
    logTimeEntry,
    updateTimeLog,
    deleteTimeLog,
    billUnbilledHours,
    createFreelanceInvoice,
    updateInvoiceStatus,
    deleteFreelanceInvoice,
    createFreelanceProposal,
    updateFreelanceProposal,
    deleteFreelanceProposal,
    convertProposalToProject,
    addFreelanceExpense,
    deleteFreelanceExpense,
    resetFreelanceMockData,
    // Rentals & Venue Actions
    createRentalBooking,
    updateRentalBooking,
    deleteRentalBooking,
    checkInBooking,
    checkOutBooking,
    createRentableUnit,
    updateRentableUnit,
    deleteRentableUnit,
    createRentalRenter,
    updateRentalRenter,
    deleteRentalRenter,
    releaseSecurityDeposit,
    deductSecurityDeposit,
    resetVenueMockData,
    // Education & Academy Actions
    resetEduMockData,
    addEduStudent,
    updateEduStudent,
    deleteEduStudent,
    addEduCohort,
    updateEduCohort,
    deleteEduCohort,
    addEduSession,
    updateEduSession,
    deleteEduSession,
    batchRecordAttendance,
    recordEduGrade,
    deleteEduGrade,
    recordTuitionPayment,
    addEduEnrollment,
    addEduAdmissionLead,
    updateAdmissionStage,
    updateEduAdmissionLead,
    deleteEduAdmissionLead,
    convertAdmissionToStudent,
    issueEduCertificate,
    addEduClassroom,
    addEduCourse,
    // Project & Milestone State & Actions
    activePmRole: state.activePmRole || 'direction',
    setActivePmRole,
    activePmSubScreen: state.activePmSubScreen || 'dashboard',
    setActivePmSubScreen,
    pmClients: state.pmClients || [],
    pmProjects: state.pmProjects || [],
    pmMilestones: state.pmMilestones || [],
    pmCollateralCatalog: state.pmCollateralCatalog || [],
    pmPrintOrders: state.pmPrintOrders || [],
    pmBatDeliverables: state.pmBatDeliverables || [],
    pmTalents: state.pmTalents || [],
    pmMissions: state.pmMissions || [],
    pmAttendances: state.pmAttendances || [],
    pmExpenses: state.pmExpenses || [],
    pmPayrollBatches: state.pmPayrollBatches || [],
    pmCcpSlips: state.pmCcpSlips || [],
    pmEquipmentStock: state.pmEquipmentStock || [],
    addPmProject,
    updatePmProjectStatus,
    addPmPrintOrder,
    updatePmPrintOrderStatus,
    addPmBatDeliverable,
    reviewPmBatDeliverable,
    addPmTalent,
    updatePmTalentStatus,
    addPmMission,
    updatePmAttendanceStatus,
    closePmRollCall,
    addPmExpense,
    approvePmExpense,
    rejectPmExpense,
    approvePmPayrollBatch,
    generatePmCcpSlipsForBatch,
    markPmCcpSlipPrinted,
    addPmEquipmentStock,
    updatePmEquipmentStatus,
    resetPmMockData,
    deletePmProject,
    batchDeletePmProjects,
    batchUpdatePmProjectStatus,
    batchApprovePmExpenses,
    batchRejectPmExpenses,
    batchDeletePmExpenses,
    batchApprovePmPayrollBatches,
    batchUpdatePmPrintOrderStatus,
    batchDeletePmPrintOrders,
    batchReviewPmBatDeliverables,
    batchDeletePmBatDeliverables,
    batchDeletePmTalents,
    batchUpdatePmTalentStatus,
    batchDeletePmMissions,
    batchUpdatePmAttendanceStatus,
    batchMarkPmCcpSlipsPrinted,
    batchUpdatePmEquipmentStatus,
    batchDeletePmEquipmentStock,
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
    openDesktopUpgradeModal,
    closeDesktopUpgradeModal,
    // B2B Trading & Commercial Collections & Actions
    b2bClients: (state.b2bClients || []).filter(
      (c) => c.facilityId === state.currentBranchId || c.branchId === state.currentBranchId
    ),
    allB2bClients: state.b2bClients || [],
    b2bSuppliers: state.b2bSuppliers || [],
    warehouses: (state.warehouses || []).filter(
      (w) => w.businessId === state.currentBusinessId
    ),
    allWarehouses: state.warehouses || [],
    commercialDocs: (state.commercialDocs || []).filter(
      (d) => d.facilityId === state.currentBranchId || d.branchId === state.currentBranchId
    ),
    allCommercialDocs: state.commercialDocs || [],
    purchaseDocs: (state.purchaseDocs || []).filter(
      (p) => p.facilityId === state.currentBranchId || p.branchId === state.currentBranchId
    ),
    allPurchaseDocs: state.purchaseDocs || [],
    stockVouchers: (state.stockVouchers || []).filter(
      (v) => v.facilityId === state.currentBranchId || v.branchId === state.currentBranchId
    ),
    allStockVouchers: state.stockVouchers || [],
    createCommercialDoc,
    updateCommercialDoc,
    deleteCommercialDoc,
    convertCommercialDoc,
    createPurchaseDoc,
    updatePurchaseDoc,
    receivePurchaseDoc,
    createStockVoucher,
    createB2bClient,
    updateB2bClient,
    deleteB2bClient,
    createB2bSupplier,
    updateB2bSupplier,
    deleteB2bSupplier,
    createWarehouseDepot,
    resetTradingMockData,
    // Automotive Garage Role State & Actions
    activeGarageRole: state.activeGarageRole || 'gerant',
    setActiveGarageRole,
    // Real Estate Operational Role State & Actions
    activeRealEstateRole: state.activeRealEstateRole || 'direction',
    setActiveRealEstateRole,
    // Light Manufacturing Operational Role State & Actions
    activeManufacturingRole: state.activeManufacturingRole || 'gerant',
    setActiveManufacturingRole,
    // Legal Cabinet & Accounting Operational Role State & Actions
    activeLegalRole: state.activeLegalRole || 'avocat_associe',
    setActiveLegalRole,
    // Logistics, Couriers & Parcel Dispatch Operational Role State & Actions
    activeLogisticsRole: state.activeLogisticsRole || 'gerant',
    setActiveLogisticsRole,
    // Construction & BTP Contracting Operational Role State & Actions
    activeContractorRole: state.activeContractorRole || 'gerant',
    setActiveContractorRole: (role: ContractorRole) => {
      let defaultScreen: ActiveScreen = 'dashboard';
      if (role === 'gerant') {
        defaultScreen = 'dashboard';
      } else if (role === 'conducteur' || role === 'conducteur_travaux') {
        defaultScreen = 'members';
      } else if (role === 'chef_chantier') {
        defaultScreen = 'scheduler';
      } else if (role === 'metreur' || role === 'daf_metreur') {
        defaultScreen = 'shop';
      } else if (role === 'comptable') {
        defaultScreen = 'finance';
      }
      globalState = {
        ...globalState,
        activeContractorRole: role,
        activeScreen: defaultScreen,
      };
      notify();
    },
    // Agriculture & Livestock Operational Role State & Actions
    activeAgriRole: state.activeAgriRole || 'gerant',
    setActiveAgriRole: (role: AgriRole) => {
      let defaultScreen: ActiveScreen = 'dashboard';
      if (role === 'gerant') {
        defaultScreen = 'dashboard';
      } else if (role === 'chef_culture') {
        defaultScreen = 'members'; // Parcelles
      } else if (role === 'zootechnicien') {
        defaultScreen = 'registrations'; // Cheptel & Traite
      } else if (role === 'magasinier') {
        defaultScreen = 'finance'; // Pont-bascule & Caisse
      }
      globalState = {
        ...globalState,
        activeAgriRole: role,
        activeScreen: defaultScreen,
      };
      notify();
    },
    // Dual-Role (Owner / Staff) State & Actions for Gym, Salon, POS, Education
    activeMembershipRole: state.activeMembershipRole || 'owner',
    setActiveMembershipRole: (role: StandardRole) => {
      globalState = {
        ...globalState,
        activeMembershipRole: role,
        activeScreen: 'dashboard',
      };
      notify();
    },
    activeAppointmentRole: state.activeAppointmentRole || 'owner',
    setActiveAppointmentRole: (role: StandardRole) => {
      globalState = {
        ...globalState,
        activeAppointmentRole: role,
        activeScreen: 'dashboard',
      };
      notify();
    },
    activePosRole: state.activePosRole || 'owner',
    setActivePosRole: (role: StandardRole) => {
      globalState = {
        ...globalState,
        activePosRole: role,
        activeScreen: role === 'staff' ? 'shop' : 'dashboard',
      };
      notify();
    },
    activeEducationRole: state.activeEducationRole || 'owner',
    setActiveEducationRole: (role: StandardRole) => {
      globalState = {
        ...globalState,
        activeEducationRole: role,
        activeScreen: role === 'staff' ? 'analytics' : 'dashboard',
      };
      notify();
    },
    memberCheckIns: state.memberCheckIns || [],
    addMemberCheckIn: (checkIn: MemberCheckInLog) => {
      globalState = {
        ...globalState,
        memberCheckIns: [checkIn, ...(globalState.memberCheckIns || [])],
      };
      notify();
    },
    walkInTickets: state.walkInTickets || [],
    addWalkInTicket: (ticket: WalkInTicket) => {
      globalState = {
        ...globalState,
        walkInTickets: [ticket, ...(globalState.walkInTickets || [])],
      };
      notify();
    },
    salonChairStations: state.salonChairStations || [],
    updateSalonChairStation: (station: SalonChairStation) => {
      const existing = (globalState.salonChairStations || []).findIndex(
        (s) => s.workstationId === station.workstationId
      );
      let nextStations = [...(globalState.salonChairStations || [])];
      if (existing >= 0) {
        nextStations[existing] = station;
      } else {
        nextStations.push(station);
      }
      globalState = {
        ...globalState,
        salonChairStations: nextStations,
      };
      notify();
    },
    eduQuickAttendance: state.eduQuickAttendance || [],
    recordQuickAttendance: (record: EduQuickAttendanceRecord) => {
      const existing = (globalState.eduQuickAttendance || []).findIndex(
        (r) => r.sessionId === record.sessionId && r.studentId === record.studentId
      );
      let nextRecords = [...(globalState.eduQuickAttendance || [])];
      if (existing >= 0) {
        nextRecords[existing] = record;
      } else {
        nextRecords.push(record);
      }
      globalState = {
        ...globalState,
        eduQuickAttendance: nextRecords,
      };
      notify();
    },
    // Toast Notifications & Notification Center
    toasts: state.toasts || [],
    notifications: state.notifications || [],
    unreadNotificationCount: (state.notifications || []).filter((n) => !n.read).length,
    showToast,
    dismissToast,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    removeNotification,
    addNotification,
  };
}

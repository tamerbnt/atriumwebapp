import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Account,
  AccountSubscription,
  Appointment,
  AppointmentStatus,
  AppTheme,
  AppDensity,
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
  GymClassEnrollment,
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
  StaffAttendanceLogRecord,
  StaffWeeklyAttendance,
  StaffSalaryAdvance,
  StaffPayrollSlipRecord,
  StaffPayrollRunRecord,
  SettingsTabId,
  BusinessCategoryConfig,
  CategoryFormule,
  HomeSetupProgress,
  OnboardingContext,
  UndoOperationType,
  PosCashSession,
  PosCashMovement,
  PosZReport,
  UnifiedDocument,
  UnifiedDocType,
  UnifiedDocStatus,
  UnifiedCurrency,
  TimbreCalculationBasis,
  UnifiedPayment,
  UnifiedPaymentMethod,
  ChequeInstrumentStatus,
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
  INITIAL_STAFF_ATTENDANCE_LOGS,
  INITIAL_STAFF_SALARY_ADVANCES,
  INITIAL_STAFF_PAYROLL_RUNS,
  INITIAL_STAFF_PAYROLL_SLIPS,
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
import {
  ensureLocaleLoadedSync,
  getInitialLanguageConfig,
  getLocalizedServiceName,
  getSystemDefaultLanguage,
  isLocaleLoaded,
  loadLocale,
  t,
} from '../utils/i18n';
import {
  isSoleActiveOwner,
  validateStaffCredentials,
  canAccessStaffScreen,
  canViewSensitivePayroll,
  normalizePhone,
  getCategoryPerformanceMetricLabel,
  getEffectiveUserRole,
  migrateStoredOperationalRole,
  hydrateCurrentUserSafe,
  normalizeBusinessCategory,
} from '../utils/staffRules';
import { resolveSemanticRoute } from '../utils/routePermissions';
import { calculateAlgerianGrossToNet } from '../utils/algerianPayroll';
import {
  resolveNextAdjustmentSeq,
  executePayrollMigrationBackfill,
} from '../utils/payrollMigrationDryRun';
import {
  isExecutiveRole,
  createDefaultBusinessConfig,
  createStarterFormulesForCategory,
  deriveCategoryConfigDefaultsFromOnboarding,
  computeHomeSetupProgress,
  type SetupEvaluationContext,
} from '../utils/businessConfig';
import {
  applyFacilityAccentCssVars,
  cloneSnapshot,
  configureUndoToastBridge,
  getFacilityAccentForCategory,
  getUndoButtonLabel,
  isApplyingUndo,
  registerUndoEntry,
  REGULAR_TOAST_DURATION_MS,
  UNDO_EXIT_ANIMATION_MS,
  UNDO_HOVER_GRACE_MS,
  UNDO_TOAST_DURATION_MS,
} from './undoEngine';

import {
  isSupabaseConfigured,
  authService,
  tenantService,
  licenseService,
  memberService,
  staffService,
  referenceDataService,
  getLocalCodeBaselineStatutoryRate,
  realtimeService,
  freelanceService,
  appointmentService,
  posService,
  rentalService,
  educationService,
  projectMilestoneService,
  tradingService,
  configService,
  sequenceService,
  invoicingService,
  syncCoordinator,
  subscribeConcurrencyConflicts,
  emitConcurrencyResolution,
  registerQueueAlertListener,
  MAX_QUEUE_SIZE,
  mapMemberFromDb,
  mapLeadFromDb,
  mapMembershipPlanFromDb,
  mapBusinessConfigFromDb,
  mapCategoryFormuleFromDb,
  mapBusinessFromDb,
  mapBranchFromDb,
  mapDeviceFromDb,
  mapStaffFromDb,
  mapAttendanceLogFromDb,
  mapSalaryAdvanceFromDb,
  mapPayrollRunFromDb,
  mapPayrollSlipFromDb,
  mapProductFromDb,
  mapSaleFromDb,
  mapAppointmentFromDb,
  mapScheduleEventFromDb,
  mapClassEnrollmentFromDb,
  mapParkedOrderFromDb,
  mapStockMovementFromDb,
  mapSalonServiceFromDb,
  mapSalonWorkstationFromDb,
  mapStylistPayoutFromDb,
  mapFreelanceClientFromDb,
  mapFreelanceProjectFromDb,
  mapTimeLogFromDb,
  mapFreelanceInvoiceFromDb,
  mapFreelanceProposalFromDb,
  mapFreelanceExpenseFromDb,
  mapRentalUnitFromDb,
  mapRentalRenterFromDb,
  mapRentalBookingFromDb,
  mapRentalDepositFromDb,
  mapEduCourseFromDb,
  mapEduClassroomFromDb,
  mapEduCohortFromDb,
  mapEduStudentFromDb,
  mapEduEnrollmentFromDb,
  mapEduSessionFromDb,
  mapEduAttendanceFromDb,
  mapEduGradeFromDb,
  mapEduCertificateFromDb,
  mapEduAdmissionFromDb,
  mapPmClientFromDb,
  mapPmProjectFromDb,
  mapPmMilestoneFromDb,
  mapPmPrintOrderFromDb,
  mapPmBatDeliverableFromDb,
  mapPmTalentFromDb,
  mapPmMissionFromDb,
  mapPmAttendanceFromDb,
  mapPmExpenseFromDb,
  mapPmPayrollBatchFromDb,
  mapPmCcpSlipFromDb,
  mapPmEquipmentStockFromDb,
  mapWarehouseFromDb,
  mapB2bClientFromDb,
  mapB2bSupplierFromDb,
  mapTradingProductFromDb,
  mapCommercialDocFromDb,
  mapPurchaseDocFromDb,
  mapStockVoucherFromDb,
  runWithConcurrency,
  getActiveDeviceId,
  isUuid,
  toValidUuid,
  normalizeUuidOrNull,
  isDemoModeEnabled,
  requireTenantAccountId,
  TenantContextMissingError,
  type StatutoryRateSet,
} from '../lib/supabase/index';
import type { ConcurrencyConflictEvent } from '../lib/supabase/index';
import {
  evaluateClassEnrollment,
  planWeekDuplication,
  prepareDepositReceiptPrint,
} from '../utils/step5Actions';
import { dzdToCentimes, centimesToDzd } from '../utils/money';
import {
  calculateUnifiedDocumentTotals,
  buildUnifiedFiscalHeader,
  formatDraftDocNumber,
  formatServerFiscalNumber,
  buildCreditNoteDraftFromInvoice,
  allocatePaymentAcrossDocuments,
  applyChequeStatusTransition,
  isDateInClosedPeriod,
  normalizeUnifiedPaymentMethod,
  type UnifiedLineInput,
} from '../utils/invoicingEngine';
import {
  evaluateMemberCheckIn,
  CheckInEvaluationResult,
  dedupeEduAttendanceRecords,
  appendEduAttendanceChange,
  buildPersistedChairStation,
  computeDrawerExpectedCentimes,
  computeVarianceCentimes,
  evaluateProvisionalZReportDrift,
  sumSalePaymentCentimes,
  clampPartialRefundItems,
  type RefundLineRequest,
} from '../utils/step6Persistence';

const generateClientUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return toValidUuid(`gen_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
};


export const ATRIUM_STORAGE_VERSION = 2;
const STORAGE_KEY = 'atrium_erp_desktop_v2';

export type ActiveScreen =
  | 'home'
  | 'dashboard'
  | 'analytics'
  | 'members'
  | 'staff'
  | 'registrations'
  | 'shop'
  | 'scheduler'
  | 'agenda'
  | 'finance'
  | 'history'
  | 'settings'
  | 'preferences'
  | 'qc'
  | 'orders'
  | 'attendance'
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
  | 'realestate_mandates'
  // Dev-only Phase 1 Component Catalog
  | 'chart_catalog';

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
  density: AppDensity;
  language: SupportedLanguage;
  isLanguageAuto: boolean;
  members: Member[];
  leads: RegistrationLead[];
  plansByBranch: Record<string, MembershipPlan[]>;
  products: Product[];
  sales: Sale[];
  staff: StaffMember[];
  staffAttendanceLogs: StaffAttendanceLogRecord[];
  staffSalaryAdvances: StaffSalaryAdvance[];
  staffPayrollRuns: StaffPayrollRunRecord[];
  staffPayrollSlips: StaffPayrollSlipRecord[];
  effectiveStatutoryRate: StatutoryRateSet;
  schedule: ScheduleEvent[];
  classEnrollments: GymClassEnrollment[];
  devices: Device[];
  appointments: Appointment[];
  servicesCatalog: ServiceItem[];
  selectedMemberId: string | null;
  pendingShopMemberId: string | null;
  isDetailOpen: boolean;
  currentUser: CurrentUser;
  isAuthenticated: boolean;
  isOnboardingOpen: boolean;
  isFastSwitchOpen: boolean;
  isDesktopUpgradeModalOpen: boolean;
  desktopUpgradeReason: 'branch_limit' | 'business_limit' | 'general';
  isTopBarCollapsed: boolean;
  isTopBarAutoHide: boolean;
  isListPodExpanded: boolean;
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
  posCashSessions: PosCashSession[];
  posCashMovements: PosCashMovement[];
  posZReports: PosZReport[];
  // B2B Commercial Trading & Wholesale (Category 8: trading_commercial)
  b2bClients: B2bClient[];
  b2bSuppliers: B2bSupplier[];
  warehouses: WarehouseDepot[];
  commercialDocs: CommercialDocument[];
  purchaseDocs: PurchaseDocument[];
  stockVouchers: StockMovementVoucher[];
  // Phase 2 Shared Horizontal Foundations (6.1 & 6.2)
  unifiedDocuments: UnifiedDocument[];
  unifiedPayments: UnifiedPayment[];
  // Business Configuration & Formules Engine
  businessConfigs: Record<string, BusinessCategoryConfig>;
  categoryFormules: CategoryFormule[];
  settingsTab: SettingsTabId;
  settingsFocusSection: string | null;
  // Toast & Notifications Center
  toasts: ToastNotification[];
  notifications: AppNotification[];
  concurrencyConflicts: ConcurrencyConflictEvent[];
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

const buildInitialBusinessConfigs = (): Record<string, BusinessCategoryConfig> => {
  const result: Record<string, BusinessCategoryConfig> = {};
  for (const biz of INITIAL_BUSINESSES) {
    const mainBranch =
      INITIAL_BRANCHES.find((br) => br.businessId === biz.id && br.isMainBranch) ||
      INITIAL_BRANCHES.find((br) => br.businessId === biz.id);
    result[biz.id] = createDefaultBusinessConfig(biz, undefined, mainBranch?.id);
  }
  return result;
};

const buildInitialCategoryFormules = (
  configs: Record<string, BusinessCategoryConfig>
): CategoryFormule[] => {
  const all: CategoryFormule[] = [];
  for (const biz of INITIAL_BUSINESSES) {
    const mainBranch =
      INITIAL_BRANCHES.find((br) => br.businessId === biz.id && br.isMainBranch) ||
      INITIAL_BRANCHES.find((br) => br.businessId === biz.id);
    const cfg = configs[biz.id];
    const items = createStarterFormulesForCategory(
      biz.category,
      biz.id,
      biz.accountId,
      mainBranch?.id,
      cfg?.currency || 'DZD',
      cfg?.defaultTvaRate ?? 19
    );
    all.push(...items);
  }
  return all;
};

const INITIAL_BUSINESS_CONFIGS = buildInitialBusinessConfigs();
const INITIAL_CATEGORY_FORMULES = buildInitialCategoryFormules(INITIAL_BUSINESS_CONFIGS);

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
  currentBusinessId: 'biz_gym',
  currentBranchId: 'branch_gym_main',
  activeScreen: 'home',
  theme: 'light',
  density: (typeof localStorage !== 'undefined' && localStorage.getItem('atrium_density') === 'compact') ? 'compact' : 'default',
  language: initialLangConfig.language,
  isLanguageAuto: initialLangConfig.isAuto,
  members: INITIAL_MEMBERS,
  leads: INITIAL_LEADS,
  plansByBranch: INITIAL_PLANS_BY_BRANCH,
  products: [...INITIAL_PRODUCTS, ...INITIAL_TRADING_PRODUCTS],
  sales: INITIAL_SALES,
  staff: INITIAL_STAFF,
  staffAttendanceLogs: INITIAL_STAFF_ATTENDANCE_LOGS,
  staffSalaryAdvances: INITIAL_STAFF_SALARY_ADVANCES,
  staffPayrollRuns: INITIAL_STAFF_PAYROLL_RUNS,
  staffPayrollSlips: INITIAL_STAFF_PAYROLL_SLIPS,
  effectiveStatutoryRate: getLocalCodeBaselineStatutoryRate(),
  schedule: INITIAL_SCHEDULE,
  classEnrollments: [],
  devices: INITIAL_DEVICES,
  appointments: INITIAL_APPOINTMENTS,
  servicesCatalog: INITIAL_SALON_SERVICES,
  selectedMemberId: INITIAL_MEMBERS[0]?.id || null,
  pendingShopMemberId: null,
  isDetailOpen: false,
  currentUser: DEFAULT_USER,
  isAuthenticated: true,
  isOnboardingOpen: false,
  isFastSwitchOpen: false,
  isDesktopUpgradeModalOpen: false,
  desktopUpgradeReason: 'general',
  isTopBarCollapsed: false,
  isTopBarAutoHide: false,
  isListPodExpanded:
    typeof localStorage !== 'undefined' && localStorage.getItem('atrium_list_pod_expanded') === 'true',
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
  posCashSessions: [],
  posCashMovements: [],
  posZReports: [],
  // B2B Commercial Trading & Wholesale
  b2bClients: INITIAL_B2B_CLIENTS,
  b2bSuppliers: INITIAL_B2B_SUPPLIERS,
  warehouses: INITIAL_WAREHOUSES,
  commercialDocs: INITIAL_COMMERCIAL_DOCS,
  purchaseDocs: INITIAL_PURCHASE_DOCS,
  stockVouchers: INITIAL_STOCK_VOUCHERS,
  unifiedDocuments: [],
  unifiedPayments: [],
  businessConfigs: INITIAL_BUSINESS_CONFIGS,
  categoryFormules: INITIAL_CATEGORY_FORMULES,
  settingsTab: 'preferences',
  settingsFocusSection: null,
  toasts: [],
  notifications: INITIAL_NOTIFICATIONS,
  concurrencyConflicts: [],
};


// In-memory Quadruple Traceability Normalizer
function backfillTraceability(state: AppState): AppState {
  const accountId =
    (state.account?.id || '').trim() || (isDemoModeEnabled() ? INITIAL_ACCOUNT.id : '');
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
          const normalizedCat = normalizeBusinessCategory(b.category);
          if (b.id === 'biz_restaurant' && b.name === 'Bistrot Saint-Germain') {
            return { ...b, category: normalizedCat, name: 'Artis Commerce & Point of Sale', displayName: 'Artis Retail & POS Store' };
          }
          return b.category === normalizedCat ? b : { ...b, category: normalizedCat };
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

        mergedStaff = mergedStaff.map((s: any) => {
          const migratedRole = migrateStoredOperationalRole(s?.role);
          return migratedRole && migratedRole !== s?.role ? { ...s, role: migratedRole } : s;
        });

        const langConfig = getInitialLanguageConfig();
        const effectiveLanguage = langConfig.isAuto ? getSystemDefaultLanguage() : (parsed.language || langConfig.language);
        const effectiveIsAuto = langConfig.isAuto;

        return {
          ...DEFAULT_STATE,
          ...parsed,
          storageVersion: ATRIUM_STORAGE_VERSION,
          density: parsed.density === 'compact' ? 'compact' : DEFAULT_STATE.density,
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
          classEnrollments: Array.isArray(parsed.classEnrollments) ? parsed.classEnrollments : [],
          pendingShopMemberId: null,
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
          unifiedDocuments: Array.isArray(parsed.unifiedDocuments) ? parsed.unifiedDocuments : [],
          unifiedPayments: Array.isArray(parsed.unifiedPayments) ? parsed.unifiedPayments : [],
          currentUser:
            parsed.currentUser === undefined
              ? DEFAULT_USER
              : hydrateCurrentUserSafe(parsed.currentUser, mergedStaff, parsed.account),
          // Dual-Role Hydration + Legacy Operational Role Migration (5.5)
          activeMembershipRole: parsed.activeMembershipRole || 'owner',
          activeAppointmentRole: parsed.activeAppointmentRole || 'owner',
          activePosRole: parsed.activePosRole || 'owner',
          activeEducationRole: parsed.activeEducationRole || 'owner',
          activeManufacturingRole: (parsed.activeManufacturingRole
            ? migrateStoredOperationalRole(parsed.activeManufacturingRole)
            : 'gerant') as any,
          activeContractorRole: (parsed.activeContractorRole
            ? migrateStoredOperationalRole(parsed.activeContractorRole)
            : 'gerant') as any,
          memberCheckIns: Array.isArray(parsed.memberCheckIns) ? parsed.memberCheckIns : [],
          walkInTickets: Array.isArray(parsed.walkInTickets) ? parsed.walkInTickets : [],
          salonChairStations: Array.isArray(parsed.salonChairStations) ? parsed.salonChairStations : [],
          eduQuickAttendance: Array.isArray(parsed.eduQuickAttendance) ? parsed.eduQuickAttendance : [],
          posCashSessions: Array.isArray(parsed.posCashSessions) ? parsed.posCashSessions : [],
          posCashMovements: Array.isArray(parsed.posCashMovements) ? parsed.posCashMovements : [],
          posZReports: Array.isArray(parsed.posZReports) ? parsed.posZReports : [],
          isAuthenticated: parsed.isAuthenticated !== undefined ? parsed.isAuthenticated : true,
          isOnboardingOpen: false,
          isFastSwitchOpen: false,
          isDesktopUpgradeModalOpen: false,
          desktopUpgradeReason: 'general',
          supabaseStatus: isSupabaseConfigured() ? 'connecting' : 'unconfigured',
          isSyncing: false,
          businessConfigs: {
            ...INITIAL_BUSINESS_CONFIGS,
            ...(parsed.businessConfigs && typeof parsed.businessConfigs === 'object'
              ? parsed.businessConfigs
              : {}),
          },
          categoryFormules:
            Array.isArray(parsed.categoryFormules) && parsed.categoryFormules.length > 0
              ? parsed.categoryFormules
              : INITIAL_CATEGORY_FORMULES,
          settingsTab: parsed.settingsTab || 'preferences',
          settingsFocusSection: null,
          notifications: Array.isArray(parsed.notifications) && parsed.notifications.length > 0 ? parsed.notifications : INITIAL_NOTIFICATIONS,
          concurrencyConflicts: [],
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load Atrium state from localStorage, falling back to clean default state', e);
  }
  return DEFAULT_STATE;
})());

const listeners = new Set<Listener>();

let timerState: ActiveTimerState = globalState.activeTimer;
const timerListeners = new Set<() => void>();

function notifyTimerListeners() {
  timerListeners.forEach((l) => l());
}

function setTimerMicroState(nextTimer: ActiveTimerState, syncToGlobal = false) {
  timerState = nextTimer;
  if (syncToGlobal) {
    globalState = { ...globalState, activeTimer: nextTimer };
  }
  notifyTimerListeners();
}

export function getTimerState(): ActiveTimerState {
  return timerState;
}

export function subscribeAtriumStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeTimerState(listener: () => void): () => void {
  timerListeners.add(listener);
  return () => {
    timerListeners.delete(listener);
  };
}

export function useTimerState(): ActiveTimerState {
  const [timer, setTimer] = useState<ActiveTimerState>(timerState);
  useEffect(() => {
    const listener = () => setTimer(timerState);
    timerListeners.add(listener);
    setTimer(timerState);
    return () => {
      timerListeners.delete(listener);
    };
  }, []);
  return timer;
}

export function useTimerSelector<T>(
  selector: (timer: ActiveTimerState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;

  const [selected, setSelected] = useState<T>(() => selectorRef.current(timerState));
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const checkAndSync = () => {
      const next = selectorRef.current(timerState);
      if (!isEqualRef.current(selectedRef.current, next)) {
        selectedRef.current = next;
        setSelected(next);
      }
    };
    timerListeners.add(checkAndSync);
    checkAndSync();
    return () => {
      timerListeners.delete(checkAndSync);
    };
  }, []);

  return selected;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistIdleId: number | null = null;
let lastPersistedSnapshot: AppState = globalState;
let hasPendingPersist = false;

const TRANSIENT_UI_KEYS = new Set<keyof AppState>([
  'toasts',
  'concurrencyConflicts',
  'isSyncing',
  'isSyncTimeout',
  'syncErrorMessage',
  'supabaseStatus',
  'isOnboardingOpen',
  'isFastSwitchOpen',
  'isDesktopUpgradeModalOpen',
  'desktopUpgradeReason',
]);

function buildPersistableState(state: AppState): Partial<AppState> {
  const {
    toasts: _toasts,
    concurrencyConflicts: _concurrencyConflicts,
    isSyncing: _isSyncing,
    isSyncTimeout: _isSyncTimeout,
    syncErrorMessage: _syncErrorMessage,
    supabaseStatus: _supabaseStatus,
    isOnboardingOpen: _isOnboardingOpen,
    isFastSwitchOpen: _isFastSwitchOpen,
    isDesktopUpgradeModalOpen: _isDesktopUpgradeModalOpen,
    desktopUpgradeReason: _desktopUpgradeReason,
    ...persistable
  } = state;
  return persistable;
}

export function flushAtriumPersist(): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (persistIdleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(persistIdleId);
    persistIdleId = null;
  }
  const timerDrifted = timerState !== globalState.activeTimer;
  if (timerDrifted) {
    globalState = { ...globalState, activeTimer: timerState };
    hasPendingPersist = true;
  }
  if (!hasPendingPersist) return;
  hasPendingPersist = false;
  lastPersistedSnapshot = globalState;
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistableState(globalState)));
    }
  } catch (e) {
    console.warn('Failed to persist state', e);
  }
}

function isOnlyToastsChanged(prev: AppState, next: AppState): boolean {
  if (prev === next) return true;
  const keys = Object.keys(next) as (keyof AppState)[];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (TRANSIENT_UI_KEYS.has(k)) continue;
    if (prev[k] !== next[k]) return false;
  }
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAtriumPersist);
  window.addEventListener('beforeunload', flushAtriumPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAtriumPersist();
    }
  });
}

function notify(immediatePersist = false, uiOnly = false) {
  if (!uiOnly && !isOnlyToastsChanged(lastPersistedSnapshot, globalState)) {
    hasPendingPersist = true;
    if (immediatePersist) {
      flushAtriumPersist();
    } else if (persistTimer === null && persistIdleId === null && typeof window !== 'undefined') {
      persistTimer = setTimeout(() => {
        persistTimer = null;
        if ('requestIdleCallback' in window) {
          persistIdleId = (window as any).requestIdleCallback(
            () => {
              persistIdleId = null;
              flushAtriumPersist();
            },
            { timeout: 1200 }
          );
        } else {
          flushAtriumPersist();
        }
      }, 450);
    }
  }
  listeners.forEach((l) => l());
}

export function shallowEqualObjects<T extends Record<string, any>>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) {
      return false;
    }
  }
  return true;
}

export function useAtriumSelector<T>(
  selector: (state: AppState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;

  const [selected, setSelected] = useState<T>(() => selectorRef.current(globalState));
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const checkAndSync = () => {
      const next = selectorRef.current(globalState);
      if (!isEqualRef.current(selectedRef.current, next)) {
        selectedRef.current = next;
        setSelected(next);
      }
    };
    listeners.add(checkAndSync);
    checkAndSync();
    return () => {
      listeners.delete(checkAndSync);
    };
  }, []);

  return selected;
}

export function selectCurrentBusinessFromState(state: AppState) {
  return (
    (state.businesses && state.businesses.find((b) => b.id === state.currentBusinessId)) ||
    (state.businesses && state.businesses[0]) ||
    INITIAL_BUSINESSES[0]
  );
}

export function selectCurrentBranchFromState(state: AppState) {
  return (
    (state.branches && state.branches.find((b) => b.id === state.currentBranchId)) ||
    (state.branches && state.branches[0]) ||
    INITIAL_BRANCHES[0]
  );
}

export function selectCurrentPlansFromState(state: AppState) {
  return (state.plansByBranch && state.plansByBranch[state.currentBranchId]) || EMPTY_PLANS;
}

let cachedMembersSrc: Member[] | null = null;
let cachedMembersBranch = '';
let cachedMembersResult: Member[] = [];

export function selectCurrentMembersFromState(state: AppState): Member[] {
  if (state.members === cachedMembersSrc && state.currentBranchId === cachedMembersBranch) {
    return cachedMembersResult;
  }
  cachedMembersSrc = state.members;
  cachedMembersBranch = state.currentBranchId;
  cachedMembersResult = state.members.filter((m) => m.facilityId === state.currentBranchId);
  return cachedMembersResult;
}

export function selectSelectedMemberFromState(state: AppState): Member | null {
  if (!state.selectedMemberId) return null;
  const list = selectCurrentMembersFromState(state);
  return list.find((m) => m.id === state.selectedMemberId) || null;
}

let cachedTermCategory: BusinessCategory | null = null;
let cachedTermLanguage: SupportedLanguage | null = null;
let cachedTermResult: ReturnType<typeof getCategoryTerminology> | null = null;

export function selectTerminologyFromState(state: AppState) {
  const biz = selectCurrentBusinessFromState(state);
  const cat = biz.category;
  const lang = state.language;
  if (cachedTermCategory === cat && cachedTermLanguage === lang && cachedTermResult) {
    return cachedTermResult;
  }
  cachedTermCategory = cat;
  cachedTermLanguage = lang;
  cachedTermResult = getCategoryTerminology(cat, lang);
  return cachedTermResult;
}

function createBranchSelector<T>(
  getList: (state: AppState) => T[] | undefined,
  predicate: (item: T, branchId: string, state: AppState) => boolean,
  fallbackBranchId?: string
): (state: AppState) => T[] {
  let cachedList: T[] | undefined;
  let cachedBranch = '';
  let cachedResult: T[] = [];

  return (state: AppState): T[] => {
    const list = getList(state) || [];
    const branchId = state.currentBranchId;
    if (list === cachedList && branchId === cachedBranch) {
      return cachedResult;
    }
    cachedList = list;
    cachedBranch = branchId;
    const direct = list.filter((item) => predicate(item, branchId, state));
    if (direct.length > 0 || !fallbackBranchId) {
      cachedResult = direct;
      return cachedResult;
    }
    const fallback = list.filter((item) => predicate(item, fallbackBranchId, state));
    cachedResult = fallback.length > 0 ? fallback : list;
    return cachedResult;
  };
}

export const selectCurrentLeadsFromState = createBranchSelector<RegistrationLead>(
  (s) => s.leads,
  (l, b) => l.facilityId === b
);
export const selectCurrentProductsFromState = createBranchSelector<Product>(
  (s) => s.products,
  (p, b) => p.facilityId === b
);
export const selectCurrentStaffFromState = createBranchSelector<StaffMember>(
  (s) => s.staff,
  (st, b) => st.facilityId === b
);
export const selectCurrentSalesFromState = createBranchSelector<Sale>(
  (s) => s.sales,
  (sa, b) => sa.facilityId === b
);
export const selectCurrentScheduleFromState = createBranchSelector<ScheduleEvent>(
  (s) => s.schedule,
  (sc, b) => sc.facilityId === b
);
export const selectCurrentClassEnrollmentsFromState = createBranchSelector<GymClassEnrollment>(
  (s) => s.classEnrollments || [],
  (ce, b) => (ce.branchId || '') === b
);
export const selectCurrentAppointmentsFromState = createBranchSelector<Appointment>(
  (s) => s.appointments,
  (a, b) => a.facilityId === b
);
export const selectCurrentServicesFromState = createBranchSelector<ServiceItem>(
  (s) => s.servicesCatalog,
  (sv, b) => sv.facilityId === b
);
export const selectCurrentParkedOrdersFromState = createBranchSelector<ParkedOrder>(
  (s) => s.parkedOrders,
  (po, b) => po.facilityId === b
);
export const selectCurrentStockMovementsFromState = createBranchSelector<StockMovement>(
  (s) => s.stockMovements,
  (sm, b) => sm.facilityId === b
);
export const selectCurrentDevicesFromState = createBranchSelector<Device>(
  (s) => s.devices,
  (d, b) => d.branchId === b
);
export const selectCurrentMemberCheckInsFromState = createBranchSelector<MemberCheckInLog>(
  (s) => s.memberCheckIns,
  (c, b) => (c.branchId || 'branch_gym_hydra') === b
);
export const selectCurrentWalkInTicketsFromState = createBranchSelector<WalkInTicket>(
  (s) => s.walkInTickets,
  (w, b) => w.branchId === b
);
export const selectCurrentSalonChairStationsFromState = createBranchSelector<SalonChairStation>(
  (s) => s.salonChairStations,
  () => true
);
export const selectCurrentPosCashSessionsFromState = createBranchSelector<PosCashSession>(
  (s) => s.posCashSessions,
  (cs, b) => cs.branchId === b
);
export const selectCurrentPosCashMovementsFromState = createBranchSelector<PosCashMovement>(
  (s) => s.posCashMovements,
  (cm, b) => cm.branchId === b
);
export const selectCurrentPosZReportsFromState = createBranchSelector<PosZReport>(
  (s) => s.posZReports,
  (zr, b) => zr.branchId === b
);

export const selectCurrentFreelanceClientsFromState = createBranchSelector<FreelanceClient>(
  (s) => s.freelanceClients,
  (c, b) => c.facilityId === b,
  'branch_freelance_main'
);
export const selectCurrentFreelanceProjectsFromState = createBranchSelector<FreelanceProject>(
  (s) => s.freelanceProjects,
  (p, b) => p.facilityId === b,
  'branch_freelance_main'
);
export const selectCurrentTimeLogsFromState = createBranchSelector<TimeLogEntry>(
  (s) => s.timeLogs,
  (t, b) => t.facilityId === b,
  'branch_freelance_main'
);
export const selectCurrentFreelanceInvoicesFromState = createBranchSelector<FreelanceInvoice>(
  (s) => s.freelanceInvoices,
  (i, b) => i.facilityId === b,
  'branch_freelance_main'
);
export const selectCurrentFreelanceProposalsFromState = createBranchSelector<FreelanceProposal>(
  (s) => s.freelanceProposals,
  (pr, b) => pr.facilityId === b,
  'branch_freelance_main'
);
export const selectCurrentFreelanceExpensesFromState = createBranchSelector<FreelanceExpense>(
  (s) => s.freelanceExpenses,
  (e, b) => e.facilityId === b,
  'branch_freelance_main'
);

export const selectCurrentRentableUnitsFromState = createBranchSelector<RentableUnit>(
  (s) => s.rentableUnits,
  (u, b) => u.facilityId === b || u.branchId === b,
  'branch_venue_main'
);
export const selectCurrentRentalBookingsFromState = createBranchSelector<RentalBooking>(
  (s) => s.rentalBookings,
  (bk, b) => bk.facilityId === b || bk.branchId === b,
  'branch_venue_main'
);
export const selectCurrentRentalRentersFromState = createBranchSelector<RentalRenter>(
  (s) => s.rentalRenters,
  (r, b) => r.facilityId === b || r.branchId === b,
  'branch_venue_main'
);
export const selectCurrentSecurityDepositsFromState = createBranchSelector<SecurityDepositRecord>(
  (s) => s.securityDeposits,
  (d, b) => d.facilityId === b || d.branchId === b,
  'branch_venue_main'
);

export const selectCurrentEduCoursesFromState = createBranchSelector<EduCourse>(
  (s) => s.eduCourses,
  (c, b) => c.facilityId === b
);
export const selectCurrentEduClassroomsFromState = createBranchSelector<EduClassroom>(
  (s) => s.eduClassrooms,
  (cr, b) => cr.facilityId === b
);
export const selectCurrentEduCohortsFromState = createBranchSelector<EduCohort>(
  (s) => s.eduCohorts,
  (ch, b) => ch.facilityId === b
);
export const selectCurrentEduStudentsFromState = createBranchSelector<EduStudent>(
  (s) => s.eduStudents,
  (st, b) => st.facilityId === b
);
export const selectCurrentEduEnrollmentsFromState = createBranchSelector<EduEnrollment>(
  (s) => s.eduEnrollments,
  (e, b) => e.facilityId === b
);
export const selectCurrentEduSessionsFromState = createBranchSelector<EduSession>(
  (s) => s.eduSessions,
  (se, b) => se.facilityId === b
);
export const selectCurrentEduAttendanceFromState = createBranchSelector<EduAttendance>(
  (s) => s.eduAttendance,
  (at, b) => at.facilityId === b
);
export const selectCurrentEduGradesFromState = createBranchSelector<EduGrade>(
  (s) => s.eduGrades,
  (g, b) => g.facilityId === b
);
export const selectCurrentEduCertificatesFromState = createBranchSelector<EduCertificate>(
  (s) => s.eduCertificates,
  (ce, b) => ce.facilityId === b
);
export const selectCurrentEduAdmissionsFromState = createBranchSelector<EduAdmissionLead>(
  (s) => s.eduAdmissions,
  (ad, b) => ad.facilityId === b
);

const pmBranchMatch = (item: { facilityId?: string; branchId?: string }, b: string) =>
  (item.facilityId || item.branchId || 'branch_agency_main') === b;

export const selectCurrentPmProjectsFromState = createBranchSelector<PMProject>(
  (s) => s.pmProjects,
  pmBranchMatch
);
let cachedPmMilestonesSrc: PMMilestone[] | undefined;
let cachedPmMilestonesProjects: PMProject[] | undefined;
let cachedPmMilestonesBranch = '';
let cachedPmMilestonesResult: PMMilestone[] = [];
export function selectCurrentPmMilestonesFromState(state: AppState): PMMilestone[] {
  const milestones = state.pmMilestones || [];
  const projects = selectCurrentPmProjectsFromState(state);
  if (
    milestones === cachedPmMilestonesSrc &&
    projects === cachedPmMilestonesProjects &&
    state.currentBranchId === cachedPmMilestonesBranch
  ) {
    return cachedPmMilestonesResult;
  }
  cachedPmMilestonesSrc = milestones;
  cachedPmMilestonesProjects = projects;
  cachedPmMilestonesBranch = state.currentBranchId;
  const projectIds = new Set(projects.map((p) => p.id));
  cachedPmMilestonesResult = milestones.filter((m) =>
    m.branchId ? m.branchId === state.currentBranchId : projectIds.has(m.projectId)
  );
  return cachedPmMilestonesResult;
}
export const selectCurrentPmPrintOrdersFromState = createBranchSelector<PMPrintOrder>(
  (s) => s.pmPrintOrders,
  pmBranchMatch
);
export const selectCurrentPmBatDeliverablesFromState = createBranchSelector<PMBatDeliverable>(
  (s) => s.pmBatDeliverables,
  pmBranchMatch
);
export const selectCurrentPmTalentsFromState = createBranchSelector<PMTalent>(
  (s) => s.pmTalents,
  pmBranchMatch
);
export const selectCurrentPmMissionsFromState = createBranchSelector<PMMission>(
  (s) => s.pmMissions,
  pmBranchMatch
);
export const selectCurrentPmAttendancesFromState = createBranchSelector<PMAttendance>(
  (s) => s.pmAttendances,
  pmBranchMatch
);
export const selectCurrentPmExpensesFromState = createBranchSelector<PMExpense>(
  (s) => s.pmExpenses,
  pmBranchMatch
);
export const selectCurrentPmPayrollBatchesFromState = createBranchSelector<PMPayrollBatch>(
  (s) => s.pmPayrollBatches,
  pmBranchMatch
);
export const selectCurrentPmCcpSlipsFromState = createBranchSelector<PMCcpSlip>(
  (s) => s.pmCcpSlips,
  pmBranchMatch
);
export const selectCurrentPmEquipmentStockFromState = createBranchSelector<PMEquipmentStock>(
  (s) => s.pmEquipmentStock,
  pmBranchMatch
);

export const selectCurrentB2bClientsFromState = createBranchSelector<B2bClient>(
  (s) => s.b2bClients,
  (c, b) => c.facilityId === b || c.branchId === b
);
let cachedWarehousesSrc: WarehouseDepot[] | undefined;
let cachedWarehousesBranch = '';
let cachedWarehousesBiz = '';
let cachedWarehousesResult: WarehouseDepot[] = [];
export function selectCurrentWarehousesFromState(state: AppState): WarehouseDepot[] {
  const list = state.warehouses || [];
  if (
    list === cachedWarehousesSrc &&
    state.currentBranchId === cachedWarehousesBranch &&
    state.currentBusinessId === cachedWarehousesBiz
  ) {
    return cachedWarehousesResult;
  }
  cachedWarehousesSrc = list;
  cachedWarehousesBranch = state.currentBranchId;
  cachedWarehousesBiz = state.currentBusinessId;
  cachedWarehousesResult = list.filter((w) =>
    w.branchId || w.facilityId
      ? w.branchId === state.currentBranchId || w.facilityId === state.currentBranchId
      : w.businessId === state.currentBusinessId
  );
  return cachedWarehousesResult;
}
export const selectCurrentCommercialDocsFromState = createBranchSelector<CommercialDocument>(
  (s) => s.commercialDocs,
  (d, b) => d.facilityId === b || d.branchId === b
);
export const selectCurrentPurchaseDocsFromState = createBranchSelector<PurchaseDocument>(
  (s) => s.purchaseDocs,
  (p, b) => p.facilityId === b || p.branchId === b
);
export const selectCurrentStockVouchersFromState = createBranchSelector<StockMovementVoucher>(
  (s) => s.stockVouchers,
  (v, b) => v.facilityId === b || v.branchId === b
);
export const selectCurrentUnifiedDocumentsFromState = createBranchSelector<UnifiedDocument>(
  (s) => s.unifiedDocuments,
  (d, b) => d.branchId === b
);
export const selectCurrentUnifiedPaymentsFromState = createBranchSelector<UnifiedPayment>(
  (s) => s.unifiedPayments,
  (p, b) => p.branchId === b
);

let cachedNotifSrc: AppNotification[] | undefined;
let cachedNotifCount = 0;
export function selectUnreadNotificationCountFromState(state: AppState): number {
  const list = state.notifications || [];
  if (list === cachedNotifSrc) return cachedNotifCount;
  cachedNotifSrc = list;
  let count = 0;
  for (let i = 0; i < list.length; i++) {
    if (!list[i].read) count++;
  }
  cachedNotifCount = count;
  return count;
}

const safeReadLocalArray = (key: string): any[] => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let cachedBizConfigBiz: Business | undefined;
let cachedBizConfigBranchId = '';
let cachedBizConfigStored: BusinessCategoryConfig | undefined;
let cachedBizConfigResult: BusinessCategoryConfig | null = null;

export function selectCurrentBusinessConfigFromState(state: AppState): BusinessCategoryConfig {
  const biz = selectCurrentBusinessFromState(state);
  const branchId = state.currentBranchId;
  const stored = state.businessConfigs?.[biz.id];
  if (
    cachedBizConfigResult !== null &&
    cachedBizConfigBiz === biz &&
    cachedBizConfigBranchId === branchId &&
    cachedBizConfigStored === stored
  ) {
    return cachedBizConfigResult;
  }
  const base = createDefaultBusinessConfig(biz, undefined, branchId);
  const result: BusinessCategoryConfig = !stored
    ? base
    : {
        ...base,
        ...stored,
        fiscalProfile: {
          ...base.fiscalProfile,
          ...(stored.fiscalProfile || {}),
        },
        onboardingContext: {
          ...base.onboardingContext,
          ...(stored.onboardingContext || {}),
        },
        categorySettings: {
          ...base.categorySettings,
          ...(stored.categorySettings || {}),
        },
        setupState: {
          ...base.setupState,
          ...(stored.setupState || {}),
        },
      };
  cachedBizConfigBiz = biz;
  cachedBizConfigBranchId = branchId;
  cachedBizConfigStored = stored;
  cachedBizConfigResult = result;
  return result;
}

let cachedFormulesSrc: CategoryFormule[] | undefined;
let cachedFormulesBizId = '';
let cachedFormulesResult: CategoryFormule[] = [];

export function selectCurrentFormulesFromState(state: AppState): CategoryFormule[] {
  const biz = selectCurrentBusinessFromState(state);
  const src = state.categoryFormules;
  if (cachedFormulesSrc === src && cachedFormulesBizId === biz.id) {
    return cachedFormulesResult;
  }
  cachedFormulesSrc = src;
  cachedFormulesBizId = biz.id;
  cachedFormulesResult = (src || []).filter((f) => f.businessId === biz.id);
  return cachedFormulesResult;
}

let cachedQuotaCountsKey = '';
let cachedQuotasResult: {
  businesses: ReturnType<typeof checkQuota>;
  branches: ReturnType<typeof checkQuota>;
  devices: ReturnType<typeof checkQuota>;
  staff: ReturnType<typeof checkQuota>;
} | null = null;

export function selectQuotasFromState(state: AppState) {
  const plan = state.subscription?.plan || INITIAL_PLANS[0];
  const bizCount = (state.businesses || []).length;
  const branchCount = (state.branches || []).length;
  const deviceCount = (state.devices || []).length;
  const staffCount = (state.staff || []).length;
  const key = `${bizCount}/${plan?.maxBusinesses || 1}|${branchCount}/${plan?.maxBranches || 1}|${deviceCount}/${plan?.maxDevices || 1}|${staffCount}/${plan?.maxStaff || 1}`;
  if (cachedQuotasResult && cachedQuotaCountsKey === key) {
    return cachedQuotasResult;
  }
  cachedQuotaCountsKey = key;
  cachedQuotasResult = {
    businesses: checkQuota(bizCount, plan?.maxBusinesses || 1),
    branches: checkQuota(branchCount, plan?.maxBranches || 1),
    devices: checkQuota(deviceCount, plan?.maxDevices || 1),
    staff: checkQuota(staffCount, plan?.maxStaff || 1),
  };
  return cachedQuotasResult;
}

export { isSupabaseConfigured };

export function selectHomeSetupProgressFromState(
  state: AppState,
  overrides?: Partial<SetupEvaluationContext>
): HomeSetupProgress {
  const biz = selectCurrentBusinessFromState(state);
  const config = selectCurrentBusinessConfigFromState(state);
  const staff = selectCurrentStaffFromState(state);
  const plans = selectCurrentPlansFromState(state);
  const schedule = selectCurrentScheduleFromState(state);
  const servicesCatalog = selectCurrentServicesFromState(state);
  const products = selectCurrentProductsFromState(state);
  const rentableUnits = selectCurrentRentableUnitsFromState(state);
  const eduCourses = selectCurrentEduCoursesFromState(state);
  const eduClassrooms = selectCurrentEduClassroomsFromState(state);
  const freelanceClients = selectCurrentFreelanceClientsFromState(state);
  const warehouses = selectCurrentWarehousesFromState(state);

  const ctx: SetupEvaluationContext = {
    business: biz,
    config,
    staff,
    plans,
    schedule,
    servicesCatalog,
    salonWorkstations: state.salonWorkstations || INITIAL_SALON_WORKSTATIONS,
    products,
    receiptConfig: state.receiptConfig || DEFAULT_RECEIPT_CONFIG,
    categoryFormules: state.categoryFormules || [],
    pmCollateralCatalog: state.pmCollateralCatalog || [],
    rentableUnits,
    eduCourses,
    eduClassrooms,
    freelanceClients,
    warehouses,
    medicalConsultations: overrides?.medicalConsultations ?? safeReadLocalArray('atrium_medical_consultations_v2'),
    garageOrders: overrides?.garageOrders ?? safeReadLocalArray('atrium_garage_orders_v2'),
    reProperties: overrides?.reProperties ?? safeReadLocalArray('atrium_realestate_props_v2'),
    mfgWorkstations: overrides?.mfgWorkstations ?? [],
    mfgBomRecipes: overrides?.mfgBomRecipes ?? safeReadLocalArray('atrium_mfg_boms'),
    legalMatters: overrides?.legalMatters ?? safeReadLocalArray('atrium_legal_matters'),
    logisticsTariffs: overrides?.logisticsTariffs ?? [],
    btpProjects: overrides?.btpProjects ?? safeReadLocalArray('atrium_contractor_projects'),
    agriParcels: overrides?.agriParcels ?? safeReadLocalArray('atrium_agri_parcels_v2'),
    language: state.language || 'fr',
    ...overrides,
  };

  return computeHomeSetupProgress(ctx);
}

export function getResolvedInitialLanguage(): SupportedLanguage {
  return globalState.language;
}

function applyResolvedLanguage(language: SupportedLanguage, isAuto: boolean) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('atrium_language', language);
      localStorage.setItem('atrium_language_mode', isAuto ? 'auto' : 'manual');
    }
  } catch {}
  globalState = { ...globalState, language, isLanguageAuto: isAuto };
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }
  notify();
}

export function setSystemDefaultLanguageAction() {
  const sysLang = getSystemDefaultLanguage();
  if (isLocaleLoaded(sysLang) || ensureLocaleLoadedSync(sysLang)) {
    applyResolvedLanguage(sysLang, true);
    return;
  }
  void loadLocale(sysLang).then(() => {
    applyResolvedLanguage(sysLang, true);
  });
}

export function setLanguageAction(language: SupportedLanguage, isAuto = false) {
  if (isLocaleLoaded(language) || ensureLocaleLoadedSync(language)) {
    applyResolvedLanguage(language, isAuto);
    return;
  }
  void loadLocale(language).then(() => {
    applyResolvedLanguage(language, isAuto);
  });
}

export function setThemeAction(theme: AppTheme) {
  globalState = { ...globalState, theme };
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const biz = selectCurrentBusinessFromState(globalState);
    applyFacilityAccentCssVars(biz?.category, theme);
  }
  notify();
}

export function setDensityAction(density: AppDensity) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('atrium_density', density);
    }
  } catch {}
  globalState = { ...globalState, density };
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-density', density);
  }
  notify();
}

export function setScreenAction(activeScreen: ActiveScreen) {
  const currentBusiness = selectCurrentBusinessFromState(globalState);
  const effectiveScreen = resolveSemanticRoute(
    normalizeBusinessCategory(currentBusiness?.category),
    globalState,
    activeScreen
  );
  let nextSubScreen = globalState.activePmSubScreen;

  if (effectiveScreen === 'pm_dir_dashboard') {
    nextSubScreen = 'dashboard';
  } else if (effectiveScreen === 'pm_dir_new_project') {
    nextSubScreen = 'new_project';
  } else if (effectiveScreen === 'pm_dir_projects') {
    nextSubScreen = 'dashboard';
  } else if (effectiveScreen === 'pm_dir_approvals') {
    nextSubScreen = 'approvals';
  } else if (effectiveScreen === 'pm_dir_reports') {
    nextSubScreen = 'reports';
  } else if (effectiveScreen === 'pm_cp_projects') {
    nextSubScreen = 'portfolio';
  } else if (effectiveScreen === 'pm_cp_catalog') {
    nextSubScreen = 'catalog';
  } else if (effectiveScreen === 'pm_cp_orders' || activeScreen === 'orders') {
    nextSubScreen = 'orders';
  } else if (
    effectiveScreen === 'pm_cp_deliverables' ||
    effectiveScreen === 'pm_cp_files' ||
    activeScreen === 'qc'
  ) {
    nextSubScreen = 'bat';
  } else if (effectiveScreen === 'pm_cp_expenses') {
    nextSubScreen = 'expenses';
  } else if (activeScreen === 'pm_crea_kanban') {
    nextSubScreen = 'demandes';
  } else if (activeScreen === 'pm_crea_production') {
    nextSubScreen = 'production';
  } else if (activeScreen === 'pm_crea_upload') {
    nextSubScreen = 'upload';
  } else if (activeScreen === 'pm_crea_briefs') {
    nextSubScreen = 'briefs';
  } else if (effectiveScreen === 'pm_sup_missions') {
    nextSubScreen = 'missions';
  } else if (effectiveScreen === 'pm_sup_attendance' || activeScreen === 'attendance') {
    nextSubScreen = 'attendance';
  } else if (activeScreen === 'pm_sup_staffing') {
    nextSubScreen = 'staffing';
  } else if (activeScreen === 'pm_sup_expenses') {
    nextSubScreen = 'expense';
  } else if (activeScreen === 'pm_rh_talents') {
    nextSubScreen = 'talents';
  } else if (activeScreen === 'pm_rh_dossier') {
    nextSubScreen = 'dossier';
  } else if (activeScreen === 'pm_rh_portal') {
    nextSubScreen = 'portal';
  } else if (activeScreen === 'pm_rh_walkin') {
    nextSubScreen = 'walkin';
  } else if (activeScreen === 'pm_compta_payroll') {
    nextSubScreen = 'payroll';
  } else if (activeScreen === 'pm_compta_ccp') {
    nextSubScreen = 'ccp';
  } else if (activeScreen === 'pm_compta_expenses') {
    nextSubScreen = 'expenses';
  } else if (activeScreen === 'pm_compta_stock') {
    nextSubScreen = 'stock';
  } else if (currentBusiness?.category === 'project_milestone') {
    if (activeScreen === 'dashboard') {
      nextSubScreen = 'dashboard';
    } else if (activeScreen === 'scheduler') {
      nextSubScreen = 'portfolio';
    } else if (activeScreen === 'registrations') {
      nextSubScreen = 'demandes';
    } else if (activeScreen === 'analytics') {
      nextSubScreen = 'missions';
    } else if (activeScreen === 'members') {
      nextSubScreen = 'talents';
    } else if (activeScreen === 'finance' || activeScreen === 'shop') {
      nextSubScreen = 'payroll';
    }
  }

  globalState = {
    ...globalState,
    activeScreen,
    activePmSubScreen: nextSubScreen,
  };
  notify(false, true);
}

export function openOnboardingAction() {
  globalState = { ...globalState, isOnboardingOpen: true };
  notify();
}

export function closeOnboardingAction() {
  globalState = { ...globalState, isOnboardingOpen: false };
  notify();
}

export function openFastSwitchAction() {
  globalState = { ...globalState, isFastSwitchOpen: true };
  notify();
}

export function closeFastSwitchAction() {
  globalState = { ...globalState, isFastSwitchOpen: false };
  notify();
}

export function openDesktopUpgradeModalAction(reason: 'branch_limit' | 'business_limit' | 'general' = 'general') {
  globalState = {
    ...globalState,
    isDesktopUpgradeModalOpen: true,
    desktopUpgradeReason: reason,
  };
  notify();
}

export function closeDesktopUpgradeModalAction() {
  globalState = { ...globalState, isDesktopUpgradeModalOpen: false };
  notify();
}

export function logoutAction() {
  globalState = {
    ...globalState,
    isAuthenticated: false,
    isFastSwitchOpen: false,
  };
  notify();
}

export function toggleTopBarCollapsedAction() {
  globalState = { ...globalState, isTopBarCollapsed: !globalState.isTopBarCollapsed };
  notify();
}

export function setTopBarCollapsedAction(collapsed: boolean) {
  globalState = { ...globalState, isTopBarCollapsed: collapsed };
  notify();
}

export function toggleTopBarAutoHideAction() {
  globalState = { ...globalState, isTopBarAutoHide: !globalState.isTopBarAutoHide };
  notify();
}

export function toggleListPodExpandedAction() {
  const next = !globalState.isListPodExpanded;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('atrium_list_pod_expanded', next ? 'true' : 'false');
  }
  globalState = { ...globalState, isListPodExpanded: next };
  notify();
}

export function setListPodExpandedAction(expanded: boolean) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('atrium_list_pod_expanded', expanded ? 'true' : 'false');
  }
  globalState = { ...globalState, isListPodExpanded: expanded };
  notify();
}

export function openSettingsTabAction(tab: SettingsTabId, focusSection?: string | null) {
  globalState = {
    ...globalState,
    activeScreen: 'settings',
    settingsTab: tab,
    settingsFocusSection: focusSection ?? null,
  };
  notify();
}

export function setSettingsTabAction(tab: SettingsTabId) {
  globalState = {
    ...globalState,
    settingsTab: tab,
    settingsFocusSection: null,
  };
  notify(false, true);
}

export function clearSettingsFocusSectionAction() {
  if (!globalState.settingsFocusSection) return;
  globalState = { ...globalState, settingsFocusSection: null };
  notify(false, true);
}

function resolveSubRolesForUserGlobal(user: CurrentUser) {
  const isOwner = user.role === 'Owner' || Boolean(user.roleRank && user.roleRank >= 8);
  const r = (user.role || '').toLowerCase();
  const isManager = isOwner || r.includes('gerant') || r.includes('directeur') || r.includes('manager');
  return {
    activePmRole: (isOwner || r.includes('direction') || r.includes('directeur')
      ? 'direction'
      : r.includes('chef') || r.includes('projet') || r.includes('projectmanager')
      ? 'chef_projet'
      : r.includes('crea')
      ? 'crea'
      : r.includes('supervis')
      ? 'superviseur'
      : r.includes('rh') || r.includes('humain')
      ? 'rh'
      : r.includes('compt')
      ? 'compta'
      : 'superviseur') as any,
    activeMembershipRole: (isOwner ? 'owner' : 'staff') as any,
    activeAppointmentRole: (isOwner ? 'owner' : 'staff') as any,
    activePosRole: (isOwner ? 'owner' : 'staff') as any,
    activeEducationRole: (isOwner ? 'owner' : 'staff') as any,
    activeGarageRole: (isManager ? 'gerant' : (r.includes('mecanic') ? 'mecanicien' : r.includes('magasin') ? 'magasinier' : r.includes('caisse') || r.includes('cash') ? 'caisse' : 'reception')) as any,
    activeRealEstateRole: (isManager ? 'direction' : (r.includes('gest') ? 'gestionnaire_locatif' : r.includes('compt') || r.includes('notair') ? 'notaire_compta' : 'negociateur')) as any,
    activeManufacturingRole: (isManager ? 'gerant' : (r.includes('atelier') ? 'chef_atelier' : r.includes('magasin') ? 'magasinier' : r.includes('qualit') || r.includes('control') ? 'qualite' : 'operateur')) as any,
    activeLegalRole: (isOwner || r.includes('assoc') || r.includes('titul') || r.includes('expert') ? 'avocat_associe' : (r.includes('avocat') ? 'avocat_collaborateur' : r.includes('clerc') ? 'clerc_notaire' : 'secretaire_caisse')) as any,
    activeLogisticsRole: (isManager ? 'gerant' : (r.includes('dispatch') ? 'dispatcher' : r.includes('stop') ? 'stop_desk_agent' : 'hub_sorter')) as any,
    activeContractorRole: (isManager ? 'gerant' : (r.includes('conduct') ? 'conducteur_travaux' : r.includes('metreur') ? 'daf_metreur' : r.includes('compt') ? 'comptable' : 'chef_chantier')) as any,
    activeAgriRole: (isManager ? 'gerant' : (r.includes('culture') ? 'chef_culture' : r.includes('magasin') ? 'magasinier' : 'zootechnicien')) as any,
  };
}

export function loginWithPinAction(pin: string) {
  const cleanPin = pin.trim();
  const staffMatch = globalState.staff.find((s) => s.pinCode === cleanPin);
  if (staffMatch) {
    if (
      (staffMatch.status === 'frozen' || staffMatch.status === 'terminated') &&
      !isSoleActiveOwner(staffMatch.id, globalState.staff)
    ) {
      const lang = globalState.language || 'fr';
      return {
        success: false,
        message:
          lang === 'ar'
            ? 'هذا الحساب معلق أو منتهي الخدمة حالياً.'
            : lang === 'en'
            ? 'This account is currently suspended or disabled.'
            : 'Ce compte est actuellement suspendu ou désactivé.',
      };
    }
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
      activeScreen: 'home',
      ...resolveSubRolesForUserGlobal(user),
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
      activeScreen: 'home',
      ...resolveSubRolesForUserGlobal(ownerUser),
    };
    notify();
    return { success: true, user: ownerUser };
  }

  return { success: false, message: 'Invalid 4-digit PIN code. (Try 1234 for Owner, 5566 for Manager, 9988 for Cashier)' };
}

export { getCategoryTerminology };

function getTraceContextFromGlobal() {
  const branchManager = (globalState.staff || []).find(
    (s) =>
      (s.branchId === globalState.currentBranchId || s.facilityId === globalState.currentBranchId) &&
      ['owner', 'manager', 'admin', 'agencydirector'].includes((s.role || '').toLowerCase())
  );
  const activeStaffId =
    globalState.currentUser?.id ||
    branchManager?.id ||
    (globalState.staff && globalState.staff.length > 0 ? globalState.staff[0].id : undefined);

  return {
    accountId: globalState.account.id,
    businessId: globalState.currentBusinessId,
    branchId: globalState.currentBranchId,
    staffId: activeStaffId,
    tenantId: globalState.account.id,
    facilityId: globalState.currentBranchId,
  };
}

export function switchFacilityAction(businessId: string, branchId?: string) {
  const targetBranches = globalState.branches.filter((b) => b.businessId === businessId);
  const targetBranchId = branchId || (targetBranches[0]?.id ?? globalState.branches[0].id);
  const targetBusiness = globalState.businesses.find((b) => b.id === businessId);

  const prevBusiness = globalState.businesses.find((b) => b.id === globalState.currentBusinessId);
  let nextScreen: ActiveScreen =
    prevBusiness?.id !== targetBusiness?.id || prevBusiness?.category !== targetBusiness?.category
      ? 'home'
      : globalState.activeScreen;

  const prevBusinessId = globalState.currentBusinessId;
  const prevBranchId = globalState.currentBranchId;

  globalState = {
    ...globalState,
    currentBusinessId: businessId,
    currentBranchId: targetBranchId,
    activeScreen: nextScreen,
    selectedMemberId: null,
    isDetailOpen: false,
  };
  applyFacilityAccentCssVars(targetBusiness?.category, globalState.theme);
  ensureBranchSubscription(targetBranchId);
  notify();

  showToast({
    type: 'info',
    title: 'Facility Switched',
    message: `Active workspace changed to ${targetBusiness?.name || 'facility'}.`,
    category: targetBusiness?.category,
    hasUndo: true,
    undoLabel: getUndoButtonLabel(globalState.language),
    onUndo: () => {
      switchFacilityAction(prevBusinessId, prevBranchId);
    },
  });
}

export function switchBusinessAction(businessId: string) {
  switchFacilityAction(businessId);
}

export function switchBranchAction(branchId: string) {
  const targetBranch = globalState.branches.find((b) => b.id === branchId);
  switchFacilityAction(targetBranch?.businessId || globalState.currentBusinessId, branchId);
}

function ul(en: string, fr: string, ar: string): string {
  const lang = globalState.language || 'fr';
  return lang === 'ar' ? ar : lang === 'en' ? en : fr;
}

function captureStoreSlices<K extends keyof AppState>(keys: K[]): Pick<AppState, K> {
  const snapshot = {} as Pick<AppState, K>;
  for (const k of keys) {
    const val = k === 'activeTimer' ? (timerState as AppState[K]) : globalState[k];
    snapshot[k] = cloneSnapshot(val);
  }
  return snapshot;
}

function restoreStoreSlices<K extends keyof AppState>(snapshot: Pick<AppState, K>) {
  globalState = {
    ...globalState,
    ...cloneSnapshot(snapshot),
  };
  if ('activeTimer' in snapshot && snapshot.activeTimer) {
    setTimerMicroState(globalState.activeTimer, false);
  }
  notify();
}

export function startTimerAction(
  clientId: string,
  clientName: string,
  projectId: string,
  projectTitle: string,
  taskDescription: string,
  deliverableId?: string,
  deliverableTitle?: string,
  isBillable = true,
  isPomodoro = false
) {
  const nextTimer: ActiveTimerState = {
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
  };
  setTimerMicroState(nextTimer, true);
  ensureTimerTick(true, false);
  notify();
}

export function pauseTimerAction() {
  const nextTimer: ActiveTimerState = { ...timerState, isPaused: true };
  setTimerMicroState(nextTimer, true);
  ensureTimerTick(nextTimer.isRunning, true);
  notify();
}

export function resumeTimerAction() {
  const nextTimer: ActiveTimerState = { ...timerState, isPaused: false };
  setTimerMicroState(nextTimer, true);
  ensureTimerTick(nextTimer.isRunning, false);
  notify();
}

export function stopTimerAction() {
  const timer = timerState;
  if (timer.elapsedSeconds >= 10) {
    const before = captureStoreSlices(['timeLogs', 'freelanceProjects', 'activeTimer']);
    const client = globalState.freelanceClients.find((c) => c.id === timer.clientId);
    const rate = client?.hourlyRate || 85;
    const currency = client?.currency || 'EUR';

    const newEntry: TimeLogEntry = {
      id: `time_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const stoppedTimer: ActiveTimerState = {
      ...timer,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      startedAt: null,
    };

    globalState = {
      ...globalState,
      timeLogs: [newEntry, ...globalState.timeLogs],
      freelanceProjects: updatedProjects,
      activeTimer: stoppedTimer,
    };
    setTimerMicroState(stoppedTimer, false);
    ensureTimerTick(false, false);
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.upsertTimeLog(newEntry).catch(() => {});
      const updatedProject = updatedProjects.find((p) => p.id === timer.projectId);
      if (updatedProject) {
        freelanceService.upsertProject(updatedProject).catch(() => {});
      }
    }

    const after = captureStoreSlices(['timeLogs', 'freelanceProjects', 'activeTimer']);
    const hours = Math.floor(newEntry.durationSeconds / 3600);
    const mins = Math.floor((newEntry.durationSeconds % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${newEntry.durationSeconds % 60}s`;
    const msg = `${timeStr} recorded for "${newEntry.projectTitle || 'Project'}".`;
    registerUndoEntry({
      vertical: 'freelance_solo',
      operationType: 'create',
      summary: ul(
        `Logged ${timeStr} for ${newEntry.projectTitle || 'Project'}`,
        `Temps enregistré (${timeStr}) — ${newEntry.projectTitle || 'Projet'}`,
        `تسجيل وقت (${timeStr}) — ${newEntry.projectTitle || 'المشروع'}`
      ),
      entityLabel: newEntry.projectTitle || newEntry.taskDescription,
      toastType: 'success',
      toastTitle: ul('Time Logged', 'Temps enregistré', 'تم تسجيل الوقت'),
      toastMessage: msg,
      undo: () => {
        restoreStoreSlices({ timeLogs: before.timeLogs, freelanceProjects: before.freelanceProjects });
        if (isSupabaseConfigured()) {
          freelanceService.deleteTimeLog(newEntry.id, globalState.currentUser?.id).catch(() => {});
          const prevProj = before.freelanceProjects.find((p) => p.id === timer.projectId);
          if (prevProj) freelanceService.upsertProject(prevProj).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices({ timeLogs: after.timeLogs, freelanceProjects: after.freelanceProjects });
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_time_logs', newEntry.id, globalState.currentUser?.id).catch(() => {});
          freelanceService.upsertTimeLog(newEntry).catch(() => {});
          const nextProj = after.freelanceProjects.find((p) => p.id === timer.projectId);
          if (nextProj) freelanceService.upsertProject(nextProj).catch(() => {});
        }
      },
    });

    return newEntry;
  } else {
    const stoppedTimer: ActiveTimerState = {
      ...timer,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      startedAt: null,
    };
    setTimerMicroState(stoppedTimer, true);
    ensureTimerTick(false, false);
    notify();
    return null;
  }
}

export function resetTimerAction() {
  const before = captureStoreSlices(['activeTimer']);
  const hadProgress = before.activeTimer.elapsedSeconds > 0 || before.activeTimer.isRunning;
  const resetTimer: ActiveTimerState = {
    ...timerState,
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    startedAt: null,
  };
  setTimerMicroState(resetTimer, true);
  ensureTimerTick(false, false);
  notify();
  if (hadProgress) {
    const after = captureStoreSlices(['activeTimer']);
    registerUndoEntry({
      vertical: 'freelance_solo',
      operationType: 'edit',
      summary: ul('Reset active timer', 'Chronomètre réinitialisé', 'إعادة ضبط المؤقت'),
      entityLabel: before.activeTimer.projectTitle || 'Timer',
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        ensureTimerTick(before.activeTimer.isRunning, before.activeTimer.isPaused);
      },
      redo: () => {
        restoreStoreSlices(after);
        ensureTimerTick(false, false);
      },
    });
  }
}

export function setActivePmRoleAction(role: PMRole) {
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
    activeScreen: 'home',
  };
  notify();
}

export function setActivePmSubScreenAction(subScreen: string) {
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
}

export function addPmProjectAction(projectData: Omit<PMProject, 'id' | 'createdAt' | 'updatedAt'>) {
  const before = captureStoreSlices(['pmProjects']);
  const newProj: PMProject = {
    ...getTraceContextFromGlobal(),
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
  const after = captureStoreSlices(['pmProjects']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'create',
    summary: ul(`Created project ${newProj.title}`, `Projet créé : ${newProj.title}`, `تم إنشاء المشروع: ${newProj.title}`),
    entityLabel: newProj.title,
    toastType: 'success',
    toastTitle: ul('Project Initiated', 'Projet Initié', 'تم إطلاق المشروع'),
    toastMessage: `${newProj.title} (${newProj.budgetCapDzd.toLocaleString()} DA)`,
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        projectMilestoneService.deleteProject(newProj.id, globalState.currentUser?.id).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        syncCoordinator.restoreRow('pm_projects', newProj.id, globalState.currentUser?.id).catch(() => {});
        projectMilestoneService.upsertProject(newProj).catch(() => {});
      }
    },
  });
  return newProj;
}

export function approvePmExpenseAction(expenseId: string, notes?: string) {
  const before = captureStoreSlices(['pmExpenses']);
  const prevExp = (before.pmExpenses || []).find((e) => e.id === expenseId);
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
  projectMilestoneService.approveDisbursement('expense', expenseId, globalState.currentUser.id, notes).catch(() => {});
  const after = captureStoreSlices(['pmExpenses']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'status',
    summary: ul(
      `Approved expense ${prevExp?.title || expenseId}`,
      `Frais validé : ${prevExp?.title || expenseId}`,
      `اعتماد مصروف: ${prevExp?.title || expenseId}`
    ),
    entityLabel: prevExp?.title,
    toastType: 'success',
    toastTitle: ul('Expense Approved', 'Frais Validé par la Direction', 'تمت الموافقة على المصروف'),
    toastMessage: ul(
      'Disbursement authorization sent to Accounting.',
      'Autorisation de décaissement transmise à la Comptabilité.',
      'تم إرسال إذن الصرف إلى المحاسبة.'
    ),
    undo: () => {
      restoreStoreSlices(before);
      if (prevExp && isSupabaseConfigured()) {
        projectMilestoneService.upsertExpense(prevExp).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      const nextExp = (after.pmExpenses || []).find((e) => e.id === expenseId);
      if (nextExp && isSupabaseConfigured()) {
        projectMilestoneService.upsertExpense(nextExp).catch(() => {});
      }
    },
  });
}

export function rejectPmExpenseAction(expenseId: string, notes?: string) {
  const before = captureStoreSlices(['pmExpenses']);
  const prevExp = (before.pmExpenses || []).find((e) => e.id === expenseId);
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
  const updated = (globalState.pmExpenses || []).find((e) => e.id === expenseId);
  if (updated && isSupabaseConfigured()) {
    projectMilestoneService.upsertExpense(updated).catch(() => {});
  }
  const after = captureStoreSlices(['pmExpenses']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'status',
    summary: ul(
      `Rejected expense ${prevExp?.title || expenseId}`,
      `Frais rejeté : ${prevExp?.title || expenseId}`,
      `رفض مصروف: ${prevExp?.title || expenseId}`
    ),
    entityLabel: prevExp?.title,
    toastType: 'warning',
    toastTitle: ul('Expense Rejected', 'Frais Rejeté', 'تم رفض المصروف'),
    toastMessage: notes || ul('Reimbursement declined.', 'Le remboursement a été refusé.', 'تم رفض التعويض.'),
    undo: () => {
      restoreStoreSlices(before);
      if (prevExp && isSupabaseConfigured()) {
        projectMilestoneService.upsertExpense(prevExp).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (updated && isSupabaseConfigured()) {
        projectMilestoneService.upsertExpense(updated).catch(() => {});
      }
    },
  });
}

export function approvePmPayrollBatchAction(batchId: string) {
  const before = captureStoreSlices(['pmPayrollBatches']);
  const prevBatch = (before.pmPayrollBatches || []).find((b) => b.id === batchId);
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
  projectMilestoneService.approveDisbursement('payroll_batch', batchId, globalState.currentUser.id).catch(() => {});
  const after = captureStoreSlices(['pmPayrollBatches']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'status',
    summary: ul(
      `Approved payroll batch ${prevBatch?.batchNumber || batchId}`,
      `Lot de paie validé : ${prevBatch?.batchNumber || batchId}`,
      `اعتماد دفعة الرواتب: ${prevBatch?.batchNumber || batchId}`
    ),
    entityLabel: prevBatch?.batchNumber,
    toastType: 'success',
    toastTitle: ul('Payroll Batch Approved', 'Lot de Paie Validé (Double-Clé)', 'تم اعتماد دفعة الرواتب'),
    toastMessage: ul(
      'Released for CCP SFP 01 slip generation.',
      "Déblocage accordé pour l'émission des bordereaux CCP SFP 01 en Comptabilité.",
      'تم الإفراج عن الدفعة لإصدار حوالات CCP SFP 01.'
    ),
    undo: () => {
      restoreStoreSlices(before);
      if (prevBatch && isSupabaseConfigured()) {
        syncCoordinator
          .mutateOrQueueUpdate('pm_payroll_batches', batchId, {
            status: prevBatch.status,
            direction_approved_at: prevBatch.directionApprovedAt || null,
          })
          .catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        projectMilestoneService.approveDisbursement('payroll_batch', batchId, globalState.currentUser.id).catch(() => {});
      }
    },
  });
}

export function deletePmProjectAction(projectId: string) {
  const before = captureStoreSlices(['pmProjects']);
  const target = (before.pmProjects || []).find((p) => p.id === projectId);
  globalState = {
    ...globalState,
    pmProjects: (globalState.pmProjects || []).filter((p) => p.id !== projectId),
  };
  notify();
  if (isSupabaseConfigured()) {
    projectMilestoneService.deleteProject(projectId, globalState.currentUser?.id).catch(() => {});
  }
  const after = captureStoreSlices(['pmProjects']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'delete',
    summary: ul(
      `Deleted project ${target?.title || projectId}`,
      `Projet supprimé : ${target?.title || projectId}`,
      `حذف المشروع: ${target?.title || projectId}`
    ),
    entityLabel: target?.title,
    toastType: 'warning',
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        syncCoordinator.restoreRow('pm_projects', projectId, globalState.currentUser?.id).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        projectMilestoneService.deleteProject(projectId, globalState.currentUser?.id).catch(() => {});
      }
    },
  });
}

export function batchDeletePmProjectsAction(projectIds: string[]) {
  if (projectIds.length === 0) return;
  const before = captureStoreSlices(['pmProjects']);
  const idSet = new Set(projectIds);
  globalState = {
    ...globalState,
    pmProjects: (globalState.pmProjects || []).filter((p) => !idSet.has(p.id)),
  };
  notify();
  if (isSupabaseConfigured()) {
    runWithConcurrency(
      projectIds.map((id) => () => projectMilestoneService.deleteProject(id, globalState.currentUser?.id)),
      4
    ).catch(() => {});
  }
  const after = captureStoreSlices(['pmProjects']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'bulk',
    affectedCount: projectIds.length,
    summary: ul(
      `Deleted ${projectIds.length} project(s)`,
      `${projectIds.length} projet(s) supprimé(s)`,
      `حذف ${projectIds.length} مشاريع`
    ),
    toastType: 'warning',
    toastTitle: ul('Projects Deleted', 'Projets Supprimés', 'تم حذف المشاريع'),
    toastMessage: ul(`${projectIds.length} project(s) deleted.`, `${projectIds.length} projet(s) supprimé(s).`, `تم حذف ${projectIds.length} مشاريع.`),
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        runWithConcurrency(
          projectIds.map((id) => () => syncCoordinator.restoreRow('pm_projects', id, globalState.currentUser?.id)),
          4
        ).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        runWithConcurrency(
          projectIds.map((id) => () => projectMilestoneService.deleteProject(id, globalState.currentUser?.id)),
          4
        ).catch(() => {});
      }
    },
  });
}

export function batchUpdatePmProjectStatusAction(projectIds: string[], status: PMProject['status']) {
  if (projectIds.length === 0) return;
  const before = captureStoreSlices(['pmProjects']);
  const idSet = new Set(projectIds);
  const updatedProjects = (globalState.pmProjects || []).map((p) =>
    idSet.has(p.id) ? { ...p, status, updatedAt: new Date().toISOString() } : p
  );
  globalState = {
    ...globalState,
    pmProjects: updatedProjects,
  };
  notify();
  if (isSupabaseConfigured()) {
    const affected = updatedProjects.filter((p) => idSet.has(p.id));
    runWithConcurrency(
      affected.map((p) => () => projectMilestoneService.upsertProject(p)),
      4
    ).catch(() => {});
  }
  const after = captureStoreSlices(['pmProjects']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'bulk',
    affectedCount: projectIds.length,
    summary: ul(
      `Updated ${projectIds.length} project(s) → ${status}`,
      `${projectIds.length} projet(s) → ${status}`,
      `تحديث حالة ${projectIds.length} مشاريع → ${status}`
    ),
    toastType: 'success',
    toastTitle: ul('Project Statuses Updated', 'Statuts Projets Mis à Jour', 'تم تحديث حالات المشاريع'),
    toastMessage: ul(
      `${projectIds.length} project(s) set to '${status}'.`,
      `${projectIds.length} projet(s) passés en statut '${status}'.`,
      `تم تغيير حالة ${projectIds.length} مشاريع إلى '${status}'.`
    ),
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        const prevAffected = (before.pmProjects || []).filter((p) => idSet.has(p.id));
        runWithConcurrency(
          prevAffected.map((p) => () => projectMilestoneService.upsertProject(p)),
          4
        ).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        const nextAffected = (after.pmProjects || []).filter((p) => idSet.has(p.id));
        runWithConcurrency(
          nextAffected.map((p) => () => projectMilestoneService.upsertProject(p)),
          4
        ).catch(() => {});
      }
    },
  });
}

export function batchApprovePmExpensesAction(expenseIds: string[], notes?: string) {
  if (expenseIds.length === 0) return;
  const before = captureStoreSlices(['pmExpenses']);
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
  if (isSupabaseConfigured()) {
    runWithConcurrency(
      expenseIds.map((id) => () => projectMilestoneService.approveDisbursement('expense', id, globalState.currentUser.id, notes)),
      4
    ).catch(() => {});
  }
  const after = captureStoreSlices(['pmExpenses']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'bulk',
    affectedCount: expenseIds.length,
    summary: ul(
      `Approved ${expenseIds.length} expense(s)`,
      `${expenseIds.length} frais validé(s) en lot`,
      `اعتماد ${expenseIds.length} مصاريف`
    ),
    toastType: 'success',
    toastTitle: ul('Expenses Approved', 'Frais Validés en Lot', 'تم اعتماد المصاريف'),
    toastMessage: ul(
      `${expenseIds.length} expense request(s) approved.`,
      `${expenseIds.length} demande(s) de frais validée(s) par la Direction.`,
      `تمت الموافقة على ${expenseIds.length} طلبات مصاريف.`
    ),
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        const prevAffected = (before.pmExpenses || []).filter((e) => idSet.has(e.id));
        runWithConcurrency(
          prevAffected.map((e) => () => projectMilestoneService.upsertExpense(e)),
          4
        ).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        runWithConcurrency(
          expenseIds.map((id) => () => projectMilestoneService.approveDisbursement('expense', id, globalState.currentUser.id, notes)),
          4
        ).catch(() => {});
      }
    },
  });
}

export function batchRejectPmExpensesAction(expenseIds: string[], notes?: string) {
  if (expenseIds.length === 0) return;
  const before = captureStoreSlices(['pmExpenses']);
  const idSet = new Set(expenseIds);
  const updatedExpenses = (globalState.pmExpenses || []).map((e) =>
    idSet.has(e.id)
      ? {
          ...e,
          status: 'rejected' as const,
          directionNotes: notes || 'Rejeté en lot par la Direction.',
        }
      : e
  );
  globalState = {
    ...globalState,
    pmExpenses: updatedExpenses,
  };
  notify();
  if (isSupabaseConfigured()) {
    const affected = updatedExpenses.filter((e) => idSet.has(e.id));
    runWithConcurrency(
      affected.map((e) => () => projectMilestoneService.upsertExpense(e)),
      4
    ).catch(() => {});
  }
  const after = captureStoreSlices(['pmExpenses']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'bulk',
    affectedCount: expenseIds.length,
    summary: ul(
      `Rejected ${expenseIds.length} expense(s)`,
      `${expenseIds.length} frais rejeté(s) en lot`,
      `رفض ${expenseIds.length} مصاريف`
    ),
    toastType: 'warning',
    toastTitle: ul('Expenses Rejected', 'Frais Rejetés en Lot', 'تم رفض المصاريف'),
    toastMessage: ul(
      `${expenseIds.length} expense request(s) rejected.`,
      `${expenseIds.length} demande(s) de frais rejetée(s).`,
      `تم رفض ${expenseIds.length} طلبات مصاريف.`
    ),
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        const prevAffected = (before.pmExpenses || []).filter((e) => idSet.has(e.id));
        runWithConcurrency(
          prevAffected.map((e) => () => projectMilestoneService.upsertExpense(e)),
          4
        ).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        const nextAffected = (after.pmExpenses || []).filter((e) => idSet.has(e.id));
        runWithConcurrency(
          nextAffected.map((e) => () => projectMilestoneService.upsertExpense(e)),
          4
        ).catch(() => {});
      }
    },
  });
}

export function batchDeletePmExpensesAction(expenseIds: string[]) {
  if (expenseIds.length === 0) return;
  const before = captureStoreSlices(['pmExpenses']);
  const idSet = new Set(expenseIds);
  globalState = {
    ...globalState,
    pmExpenses: (globalState.pmExpenses || []).filter((e) => !idSet.has(e.id)),
  };
  notify();
  if (isSupabaseConfigured()) {
    runWithConcurrency(
      expenseIds.map((id) => () => projectMilestoneService.deleteExpense(id, globalState.currentUser?.id)),
      4
    ).catch(() => {});
  }
  const after = captureStoreSlices(['pmExpenses']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'bulk',
    affectedCount: expenseIds.length,
    summary: ul(
      `Deleted ${expenseIds.length} expense(s)`,
      `${expenseIds.length} frais supprimé(s)`,
      `حذف ${expenseIds.length} مصاريف`
    ),
    toastType: 'warning',
    toastTitle: ul('Expenses Deleted', 'Frais Supprimés', 'تم حذف المصاريف'),
    toastMessage: ul(
      `${expenseIds.length} expense(s) removed.`,
      `${expenseIds.length} entrée(s) de frais supprimée(s).`,
      `تم حذف ${expenseIds.length} مصاريف.`
    ),
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        runWithConcurrency(
          expenseIds.map((id) => () => syncCoordinator.restoreRow('pm_expenses', id, globalState.currentUser?.id)),
          4
        ).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        runWithConcurrency(
          expenseIds.map((id) => () => projectMilestoneService.deleteExpense(id, globalState.currentUser?.id)),
          4
        ).catch(() => {});
      }
    },
  });
}

export function batchApprovePmPayrollBatchesAction(batchIds: string[]) {
  if (batchIds.length === 0) return;
  const before = captureStoreSlices(['pmPayrollBatches']);
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
  if (isSupabaseConfigured()) {
    runWithConcurrency(
      batchIds.map((id) => () => projectMilestoneService.approveDisbursement('payroll_batch', id, globalState.currentUser.id)),
      4
    ).catch(() => {});
  }
  const after = captureStoreSlices(['pmPayrollBatches']);
  registerUndoEntry({
    vertical: 'project_milestone',
    operationType: 'bulk',
    affectedCount: batchIds.length,
    summary: ul(
      `Approved ${batchIds.length} payroll batch(es)`,
      `${batchIds.length} lot(s) de paie validé(s)`,
      `اعتماد ${batchIds.length} دفعات رواتب`
    ),
    toastType: 'success',
    toastTitle: ul('Payroll Batches Approved', 'Lots de Paie Validés (Double-Clé)', 'تم اعتماد دفعات الرواتب'),
    toastMessage: ul(
      `${batchIds.length} payroll batch(es) cleared for CCP.`,
      `${batchIds.length} lot(s) de paie validé(s) pour virement CCP.`,
      `تم اعتماد ${batchIds.length} دفعات للتحويل البريدي.`
    ),
    undo: () => {
      restoreStoreSlices(before);
      if (isSupabaseConfigured()) {
        const prevAffected = (before.pmPayrollBatches || []).filter((b) => idSet.has(b.id));
        runWithConcurrency(
          prevAffected.map((b) => () =>
            syncCoordinator.mutateOrQueueUpdate('pm_payroll_batches', b.id, {
              status: b.status,
              direction_approved_at: b.directionApprovedAt || null,
            })
          ),
          4
        ).catch(() => {});
      }
    },
    redo: () => {
      restoreStoreSlices(after);
      if (isSupabaseConfigured()) {
        runWithConcurrency(
          batchIds.map((id) => () => projectMilestoneService.approveDisbursement('payroll_batch', id, globalState.currentUser.id)),
          4
        ).catch(() => {});
      }
    },
  });
}

function mergeById<T extends { id: string }>(existing: T[] = [], incoming: T[] = []): T[] {
  if (incoming.length === 0) return existing;
  const map = new Map<string, T>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

function getActiveCategoryForBranch(branchId: string): BusinessCategory {
  const branch = globalState.branches.find((b) => b.id === branchId);
  const bizId = branch?.businessId || globalState.currentBusinessId;
  const biz = globalState.businesses.find((b) => b.id === bizId);
  return biz?.category || 'membership_session';
}

function isTradingCategory(): boolean {
  return getActiveCategoryForBranch(globalState.currentBranchId) === 'trading_commercial';
}

function pruneDeletedRecords(
  state: AppState,
  deletedIdsByTable?: Record<string, string[]>
): Partial<AppState> {
  if (!deletedIdsByTable) return {};
  const entries = Object.entries(deletedIdsByTable).filter(([, ids]) => ids && ids.length > 0);
  if (entries.length === 0) return {};

  const tableToStateKey: Record<string, keyof AppState> = {
    businesses: 'businesses',
    branches: 'branches',
    devices: 'devices',
    staff: 'staff',
    staff_attendance_logs: 'staffAttendanceLogs',
    staff_salary_advances: 'staffSalaryAdvances',
    staff_payroll_runs: 'staffPayrollRuns',
    staff_payroll_slips: 'staffPayrollSlips',
    gym_members: 'members',
    gym_registration_leads: 'leads',
    gym_schedule_events: 'schedule',
    gym_class_enrollments: 'classEnrollments',
    gym_check_ins: 'memberCheckIns',
    gym_walk_in_tickets: 'walkInTickets',
    salon_appointments: 'appointments',
    salon_services: 'servicesCatalog',
    salon_workstations: 'salonWorkstations',
    salon_stylist_payouts: 'stylistPayouts',
    salon_chair_stations: 'salonChairStations',
    pos_products: 'products',
    pos_sales: 'sales',
    pos_parked_orders: 'parkedOrders',
    pos_stock_movements: 'stockMovements',
    pos_cash_sessions: 'posCashSessions',
    pos_cash_movements: 'posCashMovements',
    pos_z_reports: 'posZReports',
    freelance_clients: 'freelanceClients',
    freelance_projects: 'freelanceProjects',
    freelance_time_logs: 'timeLogs',
    freelance_invoices: 'freelanceInvoices',
    freelance_proposals: 'freelanceProposals',
    freelance_expenses: 'freelanceExpenses',
    rental_units: 'rentableUnits',
    rental_bookings: 'rentalBookings',
    rental_renters: 'rentalRenters',
    rental_security_deposits: 'securityDeposits',
    edu_courses: 'eduCourses',
    edu_classrooms: 'eduClassrooms',
    edu_cohorts: 'eduCohorts',
    edu_students: 'eduStudents',
    edu_enrollments: 'eduEnrollments',
    edu_sessions: 'eduSessions',
    edu_attendance: 'eduAttendance',
    edu_grades: 'eduGrades',
    edu_certificates: 'eduCertificates',
    edu_admissions: 'eduAdmissions',
    pm_clients: 'pmClients',
    pm_projects: 'pmProjects',
    pm_milestones: 'pmMilestones',
    pm_collateral_catalog: 'pmCollateralCatalog',
    pm_print_orders: 'pmPrintOrders',
    pm_bat_deliverables: 'pmBatDeliverables',
    pm_talents: 'pmTalents',
    pm_missions: 'pmMissions',
    pm_attendances: 'pmAttendances',
    pm_expenses: 'pmExpenses',
    pm_payroll_batches: 'pmPayrollBatches',
    pm_ccp_slips: 'pmCcpSlips',
    pm_equipment_stock: 'pmEquipmentStock',
    trading_warehouses: 'warehouses',
    trading_b2b_clients: 'b2bClients',
    trading_b2b_suppliers: 'b2bSuppliers',
    trading_products: 'products',
    trading_commercial_docs: 'commercialDocs',
    trading_purchase_docs: 'purchaseDocs',
    trading_stock_vouchers: 'stockVouchers',
    unified_documents: 'unifiedDocuments',
    unified_payments: 'unifiedPayments',
    category_formules: 'categoryFormules',
  };

  const patch: Partial<AppState> = {};
  for (const [table, ids] of entries) {
    if (table === 'gym_plans') {
      const idSet = new Set(ids);
      const nextByBranch: Record<string, MembershipPlan[]> = {};
      let changed = false;
      for (const [brId, plans] of Object.entries(state.plansByBranch || {})) {
        const filtered = plans.filter((p) => !idSet.has(p.id));
        if (filtered.length !== plans.length) changed = true;
        nextByBranch[brId] = filtered;
      }
      if (changed) patch.plansByBranch = nextByBranch;
      continue;
    }
    const key = tableToStateKey[table];
    if (!key) continue;
    const currentList = state[key];
    if (!Array.isArray(currentList)) continue;
    const idSet = new Set(ids);
    const filtered = (currentList as Array<{ id: string }>).filter((item) => !idSet.has(item.id));
    if (filtered.length !== currentList.length) {
      (patch as any)[key] = filtered;
    }
  }
  return patch;
}

export interface SyncActionOptions {
  onlyTables?: string[];
  deletedIdsByTable?: Record<string, string[]>;
}

export async function syncWithSupabaseAction(options?: SyncActionOptions) {
  if (!isSupabaseConfigured()) {
    globalState = {
      ...globalState,
      supabaseStatus: 'unconfigured',
      isSyncing: false,
    };
    notify();
    return;
  }

  const branchId = globalState.currentBranchId;
  const activeCategory = getActiveCategoryForBranch(branchId);

  if (options?.deletedIdsByTable) {
    const deletePatch = pruneDeletedRecords(globalState, options.deletedIdsByTable);
    if (Object.keys(deletePatch).length > 0) {
      globalState = {
        ...globalState,
        ...deletePatch,
        lastSyncedAt: new Date().toISOString(),
      };
      notify();
    }
  }

  const tableFilterSet =
    options?.onlyTables && options.onlyTables.length > 0 ? new Set(options.onlyTables) : null;
  const shouldSyncTable = (...tables: string[]) =>
    !tableFilterSet || tables.some((tbl) => tableFilterSet.has(tbl));

  const singleFlightKey = tableFilterSet
    ? `branch:${branchId}:delta:${Array.from(tableFilterSet).sort().join(',')}`
    : `branch:${branchId}:${activeCategory}`;

  return syncCoordinator.runSingleFlight(singleFlightKey, async () => {
    const session = await authService.getSession();
    const accountId = session?.user?.id || globalState.account.id;
    lastSyncedAuthUserId = session?.user?.id || lastSyncedAuthUserId;
    const updatedAfter = syncCoordinator.getDeltaCursor(branchId, activeCategory);

    const updates: Partial<AppState> = {
      supabaseStatus: 'connected',
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      syncErrorMessage: null,
    };

    const tasks: Array<() => Promise<void>> = [];

    if (shouldSyncTable('businesses')) {
      tasks.push(async () => {
        const businesses = await tenantService.fetchBusinesses(accountId);
        if (businesses.length > 0) updates.businesses = businesses;
      });
    }
    if (shouldSyncTable('branches')) {
      tasks.push(async () => {
        const branches = await tenantService.fetchBranches(accountId);
        if (branches.length > 0) updates.branches = branches;
      });
    }
    if (shouldSyncTable('staff')) {
      tasks.push(async () => {
        const staff = await staffService.fetchStaffForSync(accountId, branchId, updatedAfter);
        if (staff.length > 0) {
          updates.staff = updatedAfter ? mergeById(globalState.staff, staff) : staff;
        }
      });
    }
    if (shouldSyncTable('statutory_rates')) {
      tasks.push(async () => {
        const rate = await referenceDataService.fetchEffectiveStatutoryRate();
        if (rate) {
          updates.effectiveStatutoryRate = rate;
        }
      });
    }
    if (shouldSyncTable('staff_attendance_logs')) {
      tasks.push(async () => {
        const logs = await staffService.fetchAttendanceLogs(branchId, updatedAfter);
        if (updatedAfter) {
          if (logs.length > 0) {
            updates.staffAttendanceLogs = mergeById(globalState.staffAttendanceLogs || [], logs);
          }
        } else if (isUuid(accountId)) {
          const others = (globalState.staffAttendanceLogs || []).filter(
            (r) => r.branchId && r.branchId !== branchId
          );
          updates.staffAttendanceLogs = [...logs, ...others];
        } else if (logs.length > 0) {
          updates.staffAttendanceLogs = mergeById(globalState.staffAttendanceLogs || [], logs);
        }
      });
    }
    if (shouldSyncTable('staff_salary_advances')) {
      tasks.push(async () => {
        const advances = await staffService.fetchSalaryAdvances(branchId, updatedAfter);
        if (updatedAfter) {
          if (advances.length > 0) {
            updates.staffSalaryAdvances = mergeById(globalState.staffSalaryAdvances || [], advances);
          }
        } else if (isUuid(accountId)) {
          const others = (globalState.staffSalaryAdvances || []).filter(
            (r) => r.branchId && r.branchId !== branchId
          );
          updates.staffSalaryAdvances = [...advances, ...others];
        } else if (advances.length > 0) {
          updates.staffSalaryAdvances = mergeById(globalState.staffSalaryAdvances || [], advances);
        }
      });
    }
    if (shouldSyncTable('staff_payroll_runs')) {
      tasks.push(async () => {
        const runs = await staffService.fetchPayrollRuns(branchId, updatedAfter);
        if (updatedAfter) {
          if (runs.length > 0) {
            updates.staffPayrollRuns = mergeById(globalState.staffPayrollRuns || [], runs);
          }
        } else if (isUuid(accountId)) {
          const others = (globalState.staffPayrollRuns || []).filter(
            (r) => r.branchId && r.branchId !== branchId
          );
          updates.staffPayrollRuns = [...runs, ...others];
        } else if (runs.length > 0) {
          updates.staffPayrollRuns = mergeById(globalState.staffPayrollRuns || [], runs);
        }
      });
    }
    if (shouldSyncTable('staff_payroll_slips')) {
      tasks.push(async () => {
        const slips = await staffService.fetchPayrollSlips(branchId, updatedAfter);
        if (updatedAfter) {
          if (slips.length > 0) {
            updates.staffPayrollSlips = mergeById(globalState.staffPayrollSlips || [], slips);
          }
        } else if (isUuid(accountId)) {
          const otherBranchRunIds = new Set(
            (globalState.staffPayrollRuns || [])
              .filter((r) => r.branchId && r.branchId !== branchId)
              .map((r) => r.id)
          );
          const others = (globalState.staffPayrollSlips || []).filter((s) =>
            otherBranchRunIds.has(s.payrollRunId)
          );
          updates.staffPayrollSlips = [...slips, ...others];
        } else if (slips.length > 0) {
          updates.staffPayrollSlips = mergeById(globalState.staffPayrollSlips || [], slips);
        }
      });
    }

    if (shouldSyncTable('business_configs')) {
      tasks.push(async () => {
        const cfgs = await configService.fetchBusinessConfigs(accountId);
        if (cfgs.length > 0) {
          const nextMap: Record<string, BusinessCategoryConfig> = {
            ...(globalState.businessConfigs || {}),
          };
          for (const c of cfgs) {
            nextMap[c.businessId] = c;
          }
          updates.businessConfigs = nextMap;
        }
      });
    }
    if (shouldSyncTable('category_formules')) {
      tasks.push(async () => {
        const formules = await configService.fetchCategoryFormules(accountId, undefined, updatedAfter);
        if (formules.length > 0) {
          updates.categoryFormules = updatedAfter
            ? mergeById(globalState.categoryFormules || [], formules)
            : formules;
        }
      });
    }
    if (shouldSyncTable('unified_documents')) {
      tasks.push(async () => {
        const docs = await invoicingService.fetchUnifiedDocuments(branchId, updatedAfter);
        if (docs.length > 0 || !updatedAfter) {
          const others = (globalState.unifiedDocuments || []).filter((d) => d.branchId !== branchId);
          const cur = (globalState.unifiedDocuments || []).filter((d) => d.branchId === branchId);
          if (updatedAfter && docs.length > 0) {
            updates.unifiedDocuments = [...mergeById(cur, docs), ...others];
          } else if (docs.length > 0) {
            updates.unifiedDocuments = [...docs, ...others];
          }
        }
      });
    }
    if (shouldSyncTable('unified_payments', 'unified_payment_allocations')) {
      tasks.push(async () => {
        const pays = await invoicingService.fetchUnifiedPayments(branchId, updatedAfter);
        if (pays.length > 0 || !updatedAfter) {
          const others = (globalState.unifiedPayments || []).filter((p) => p.branchId !== branchId);
          const cur = (globalState.unifiedPayments || []).filter((p) => p.branchId === branchId);
          if (updatedAfter && pays.length > 0) {
            updates.unifiedPayments = [...mergeById(cur, pays), ...others];
          } else if (pays.length > 0) {
            updates.unifiedPayments = [...pays, ...others];
          }
        }
      });
    }

    if (activeCategory === 'membership_session') {
      if (shouldSyncTable('gym_plans')) {
        tasks.push(async () => {
          const plans = await memberService.fetchPlans(branchId);
          if (plans.length > 0) {
            updates.plansByBranch = {
              ...(globalState.plansByBranch || {}),
              [branchId]: plans,
            };
          }
        });
      }
      if (shouldSyncTable('gym_members')) {
        tasks.push(async () => {
          const members = await memberService.fetchMembers(branchId, updatedAfter);
          if (members.length > 0) {
            const otherMembers = globalState.members.filter((m) => m.facilityId !== branchId);
            const currentBranchMembers = globalState.members.filter((m) => m.facilityId === branchId);
            updates.members = [
              ...(updatedAfter ? mergeById(currentBranchMembers, members) : members),
              ...otherMembers,
            ];
          }
        });
      }
      if (shouldSyncTable('gym_registration_leads')) {
        tasks.push(async () => {
          const leads = await memberService.fetchRegistrationRequests(branchId, updatedAfter);
          if (leads.length > 0) {
            const otherLeads = globalState.leads.filter((l) => l.facilityId !== branchId);
            const currentBranchLeads = globalState.leads.filter((l) => l.facilityId === branchId);
            updates.leads = [
              ...(updatedAfter ? mergeById(currentBranchLeads, leads) : leads),
              ...otherLeads,
            ];
          }
        });
      }
      if (shouldSyncTable('gym_schedule_events')) {
        tasks.push(async () => {
          const events = await memberService.fetchScheduleEvents(branchId);
          if (events.length > 0) {
            const others = (globalState.schedule || []).filter((e) => e.facilityId !== branchId && e.branchId !== branchId);
            updates.schedule = [...events, ...others];
          }
        });
      }
      if (shouldSyncTable('gym_class_enrollments')) {
        tasks.push(async () => {
          const enrollments = await memberService.fetchClassEnrollments(branchId);
          if (enrollments.length > 0) {
            const others = (globalState.classEnrollments || []).filter((e) => e.branchId !== branchId);
            updates.classEnrollments = [...enrollments, ...others];
          }
        });
      }
      if (shouldSyncTable('gym_check_ins')) {
        tasks.push(async () => {
          const checkIns = await memberService.fetchCheckIns(branchId, updatedAfter);
          if (checkIns.length > 0) {
            const others = (globalState.memberCheckIns || []).filter((c) => c.branchId !== branchId);
            const cur = (globalState.memberCheckIns || []).filter((c) => c.branchId === branchId);
            updates.memberCheckIns = [
              ...(updatedAfter ? mergeById(cur, checkIns) : checkIns),
              ...others,
            ];
          }
        });
      }
      if (shouldSyncTable('gym_walk_in_tickets')) {
        tasks.push(async () => {
          const tickets = await memberService.fetchWalkInTickets(branchId, updatedAfter);
          if (tickets.length > 0) {
            const others = (globalState.walkInTickets || []).filter((t) => t.branchId !== branchId);
            const cur = (globalState.walkInTickets || []).filter((t) => t.branchId === branchId);
            updates.walkInTickets = [
              ...(updatedAfter ? mergeById(cur, tickets) : tickets),
              ...others,
            ];
          }
        });
      }
    } else if (activeCategory === 'appointment_service') {
      if (shouldSyncTable('salon_appointments')) {
        tasks.push(async () => {
          const appointments = await appointmentService.fetchAppointments(branchId, updatedAfter);
          if (appointments.length > 0) {
            updates.appointments = updatedAfter
              ? mergeById(globalState.appointments || [], appointments)
              : appointments;
          }
        });
      }
      if (shouldSyncTable('salon_services')) {
        tasks.push(async () => {
          const services = await appointmentService.fetchServices(branchId, updatedAfter);
          if (services.length > 0) {
            updates.servicesCatalog = mergeById(globalState.servicesCatalog || [], services);
          }
        });
      }
      if (shouldSyncTable('salon_workstations')) {
        tasks.push(async () => {
          const workstations = await appointmentService.fetchWorkstations(branchId);
          if (workstations.length > 0) updates.salonWorkstations = workstations;
        });
      }
      if (shouldSyncTable('salon_stylist_payouts')) {
        tasks.push(async () => {
          const payouts = await appointmentService.fetchStylistPayouts(branchId);
          if (payouts.length > 0) updates.stylistPayouts = payouts;
        });
      }
      if (shouldSyncTable('salon_chair_stations')) {
        tasks.push(async () => {
          const stations = await appointmentService.fetchChairStations(branchId, updatedAfter);
          if (stations.length > 0) {
            updates.salonChairStations = updatedAfter
              ? (() => {
                  const map = new Map<string, SalonChairStation>();
                  (globalState.salonChairStations || []).forEach((s) => map.set(toValidUuid(s.workstationId), s));
                  stations.forEach((s) => map.set(toValidUuid(s.workstationId), s));
                  return Array.from(map.values());
                })()
              : stations;
          }
        });
      }
    } else if (activeCategory === 'pos_inventory') {
      if (shouldSyncTable('pos_products')) {
        tasks.push(async () => {
          const products = await posService.fetchProducts(branchId, updatedAfter);
          if (products.length > 0) {
            updates.products = updatedAfter ? mergeById(globalState.products || [], products) : products;
          }
        });
      }
      if (shouldSyncTable('pos_sales', 'pos_sale_items')) {
        tasks.push(async () => {
          const sales = await posService.fetchSales(branchId, updatedAfter);
          if (sales.length > 0) {
            updates.sales = updatedAfter ? mergeById(globalState.sales || [], sales) : sales;
          }
        });
      }
      if (shouldSyncTable('pos_parked_orders')) {
        tasks.push(async () => {
          const parked = await posService.fetchParkedOrders(branchId);
          if (parked.length > 0) updates.parkedOrders = parked;
        });
      }
      if (shouldSyncTable('pos_stock_movements')) {
        tasks.push(async () => {
          const movements = await posService.fetchStockMovements(branchId);
          if (movements.length > 0) {
            updates.stockMovements = mergeById(globalState.stockMovements || [], movements);
          }
        });
      }
      if (shouldSyncTable('pos_cash_sessions')) {
        tasks.push(async () => {
          const sessions = await posService.fetchCashSessions(branchId, updatedAfter);
          if (sessions.length > 0) {
            const others = (globalState.posCashSessions || []).filter((s) => s.branchId !== branchId);
            const cur = (globalState.posCashSessions || []).filter((s) => s.branchId === branchId);
            updates.posCashSessions = [
              ...(updatedAfter ? mergeById(cur, sessions) : sessions),
              ...others,
            ];
          }
        });
      }
      if (shouldSyncTable('pos_cash_movements')) {
        tasks.push(async () => {
          const mvs = await posService.fetchCashMovements(branchId, updatedAfter);
          if (mvs.length > 0) {
            const others = (globalState.posCashMovements || []).filter((m) => m.branchId !== branchId);
            const cur = (globalState.posCashMovements || []).filter((m) => m.branchId === branchId);
            updates.posCashMovements = [
              ...(updatedAfter ? mergeById(cur, mvs) : mvs),
              ...others,
            ];
          }
        });
      }
      if (shouldSyncTable('pos_z_reports')) {
        tasks.push(async () => {
          const reports = await posService.fetchZReports(branchId, updatedAfter);
          if (reports.length > 0) {
            const others = (globalState.posZReports || []).filter((r) => r.branchId !== branchId);
            const cur = (globalState.posZReports || []).filter((r) => r.branchId === branchId);
            updates.posZReports = [
              ...(updatedAfter ? mergeById(cur, reports) : reports),
              ...others,
            ];
          }
        });
      }
    } else if (activeCategory === 'freelance_solo') {
      if (shouldSyncTable('freelance_clients')) {
        tasks.push(async () => {
          const rows = await freelanceService.fetchClients(branchId, updatedAfter);
          if (rows.length > 0) updates.freelanceClients = mergeById(globalState.freelanceClients, rows);
        });
      }
      if (shouldSyncTable('freelance_projects')) {
        tasks.push(async () => {
          const rows = await freelanceService.fetchProjects(branchId, updatedAfter);
          if (rows.length > 0) updates.freelanceProjects = mergeById(globalState.freelanceProjects, rows);
        });
      }
      if (shouldSyncTable('freelance_time_logs')) {
        tasks.push(async () => {
          const rows = await freelanceService.fetchTimeLogs(branchId, updatedAfter);
          if (rows.length > 0) updates.timeLogs = mergeById(globalState.timeLogs, rows);
        });
      }
      if (shouldSyncTable('freelance_invoices', 'freelance_invoice_items')) {
        tasks.push(async () => {
          const rows = await freelanceService.fetchInvoices(branchId, updatedAfter);
          if (rows.length > 0) updates.freelanceInvoices = mergeById(globalState.freelanceInvoices, rows);
        });
      }
      if (shouldSyncTable('freelance_proposals')) {
        tasks.push(async () => {
          const rows = await freelanceService.fetchProposals(branchId, updatedAfter);
          if (rows.length > 0) updates.freelanceProposals = mergeById(globalState.freelanceProposals, rows);
        });
      }
      if (shouldSyncTable('freelance_expenses')) {
        tasks.push(async () => {
          const rows = await freelanceService.fetchExpenses(branchId, updatedAfter);
          if (rows.length > 0) updates.freelanceExpenses = mergeById(globalState.freelanceExpenses, rows);
        });
      }
    } else if (activeCategory === 'rental_booking') {
      if (shouldSyncTable('rental_units')) {
        tasks.push(async () => {
          const units = await rentalService.fetchUnits(branchId, updatedAfter);
          if (units.length > 0) {
            const others = globalState.rentableUnits.filter((u) => u.facilityId !== branchId);
            const cur = globalState.rentableUnits.filter((u) => u.facilityId === branchId);
            updates.rentableUnits = [...(updatedAfter ? mergeById(cur, units) : units), ...others];
          }
        });
      }
      if (shouldSyncTable('rental_bookings', 'rental_booking_addons')) {
        tasks.push(async () => {
          const bookings = await rentalService.fetchBookings(branchId, updatedAfter);
          if (bookings.length > 0) {
            const others = globalState.rentalBookings.filter((b) => b.facilityId !== branchId);
            const cur = globalState.rentalBookings.filter((b) => b.facilityId === branchId);
            updates.rentalBookings = [...(updatedAfter ? mergeById(cur, bookings) : bookings), ...others];
          }
        });
      }
      if (shouldSyncTable('rental_renters')) {
        tasks.push(async () => {
          const renters = await rentalService.fetchRenters(branchId, updatedAfter);
          if (renters.length > 0) {
            const others = globalState.rentalRenters.filter((r) => r.facilityId !== branchId);
            const cur = globalState.rentalRenters.filter((r) => r.facilityId === branchId);
            updates.rentalRenters = [...(updatedAfter ? mergeById(cur, renters) : renters), ...others];
          }
        });
      }
      if (shouldSyncTable('rental_security_deposits')) {
        tasks.push(async () => {
          const deposits = await rentalService.fetchDeposits(branchId, updatedAfter);
          if (deposits.length > 0) {
            const others = globalState.securityDeposits.filter((d) => d.facilityId !== branchId);
            const cur = globalState.securityDeposits.filter((d) => d.facilityId === branchId);
            updates.securityDeposits = [...(updatedAfter ? mergeById(cur, deposits) : deposits), ...others];
          }
        });
      }
    } else if (activeCategory === 'education_cohort') {
      if (shouldSyncTable('edu_courses')) {
        tasks.push(async () => {
          const rows = await educationService.fetchCourses(branchId, updatedAfter);
          if (rows.length > 0) updates.eduCourses = mergeById(globalState.eduCourses || [], rows);
        });
      }
      if (shouldSyncTable('edu_classrooms')) {
        tasks.push(async () => {
          const rows = await educationService.fetchClassrooms(branchId);
          if (rows.length > 0) updates.eduClassrooms = mergeById(globalState.eduClassrooms || [], rows);
        });
      }
      if (shouldSyncTable('edu_cohorts')) {
        tasks.push(async () => {
          const rows = await educationService.fetchCohorts(branchId, updatedAfter);
          if (rows.length > 0) updates.eduCohorts = mergeById(globalState.eduCohorts || [], rows);
        });
      }
      if (shouldSyncTable('edu_students')) {
        tasks.push(async () => {
          const rows = await educationService.fetchStudents(branchId, updatedAfter);
          if (rows.length > 0) updates.eduStudents = mergeById(globalState.eduStudents || [], rows);
        });
      }
      if (shouldSyncTable('edu_enrollments')) {
        tasks.push(async () => {
          const rows = await educationService.fetchEnrollments(branchId);
          if (rows.length > 0) updates.eduEnrollments = mergeById(globalState.eduEnrollments || [], rows);
        });
      }
      if (shouldSyncTable('edu_sessions')) {
        tasks.push(async () => {
          const rows = await educationService.fetchSessions(branchId);
          if (rows.length > 0) updates.eduSessions = mergeById(globalState.eduSessions || [], rows);
        });
      }
      if (shouldSyncTable('edu_attendance')) {
        tasks.push(async () => {
          const rows = await educationService.fetchAttendance(branchId, updatedAfter);
          if (rows.length > 0) {
            updates.eduAttendance = dedupeEduAttendanceRecords(
              mergeById(globalState.eduAttendance || [], rows)
            );
          }
        });
      }
      if (shouldSyncTable('edu_grades')) {
        tasks.push(async () => {
          const rows = await educationService.fetchGrades(branchId);
          if (rows.length > 0) updates.eduGrades = mergeById(globalState.eduGrades || [], rows);
        });
      }
      if (shouldSyncTable('edu_certificates')) {
        tasks.push(async () => {
          const rows = await educationService.fetchCertificates(branchId);
          if (rows.length > 0) updates.eduCertificates = mergeById(globalState.eduCertificates || [], rows);
        });
      }
      if (shouldSyncTable('edu_admissions')) {
        tasks.push(async () => {
          const rows = await educationService.fetchAdmissions(branchId);
          if (rows.length > 0) updates.eduAdmissions = mergeById(globalState.eduAdmissions || [], rows);
        });
      }
    } else if (activeCategory === 'project_milestone') {
      if (shouldSyncTable('pm_clients')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchClients(branchId, updatedAfter);
          if (rows.length > 0) updates.pmClients = mergeById(globalState.pmClients || [], rows);
        });
      }
      if (shouldSyncTable('pm_projects')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchProjects(branchId, updatedAfter);
          if (rows.length > 0) updates.pmProjects = mergeById(globalState.pmProjects || [], rows);
        });
      }
      if (shouldSyncTable('pm_milestones')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchMilestones(branchId, updatedAfter);
          if (rows.length > 0) updates.pmMilestones = mergeById(globalState.pmMilestones || [], rows);
        });
      }
      if (shouldSyncTable('pm_collateral_catalog')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchCollateralCatalog(branchId, updatedAfter);
          if (rows.length > 0) updates.pmCollateralCatalog = mergeById(globalState.pmCollateralCatalog || [], rows);
        });
      }
      if (shouldSyncTable('pm_print_orders')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchPrintOrders(branchId, updatedAfter);
          if (rows.length > 0) updates.pmPrintOrders = mergeById(globalState.pmPrintOrders || [], rows);
        });
      }
      if (shouldSyncTable('pm_bat_deliverables')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchBatDeliverables(branchId, updatedAfter);
          if (rows.length > 0) updates.pmBatDeliverables = mergeById(globalState.pmBatDeliverables || [], rows);
        });
      }
      if (shouldSyncTable('pm_talents')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchTalents(branchId, updatedAfter);
          if (rows.length > 0) updates.pmTalents = mergeById(globalState.pmTalents || [], rows);
        });
      }
      if (shouldSyncTable('pm_missions', 'pm_mission_staff')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchMissions(branchId, updatedAfter);
          if (rows.length > 0) updates.pmMissions = mergeById(globalState.pmMissions || [], rows);
        });
      }
      if (shouldSyncTable('pm_attendances')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchAttendances(branchId, undefined, updatedAfter);
          if (rows.length > 0) updates.pmAttendances = mergeById(globalState.pmAttendances || [], rows);
        });
      }
      if (shouldSyncTable('pm_expenses')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchExpenses(branchId, updatedAfter);
          if (rows.length > 0) updates.pmExpenses = mergeById(globalState.pmExpenses || [], rows);
        });
      }
      if (shouldSyncTable('pm_payroll_batches', 'pm_ccp_slips')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchPayrollBatches(branchId, updatedAfter);
          if (rows.length > 0) updates.pmPayrollBatches = mergeById(globalState.pmPayrollBatches || [], rows);
        });
      }
      if (shouldSyncTable('pm_equipment_stock')) {
        tasks.push(async () => {
          const rows = await projectMilestoneService.fetchEquipmentStock(branchId, updatedAfter);
          if (rows.length > 0) updates.pmEquipmentStock = mergeById(globalState.pmEquipmentStock || [], rows);
        });
      }
    } else if (activeCategory === 'trading_commercial') {
      if (shouldSyncTable('trading_warehouses')) {
        tasks.push(async () => {
          const rows = await tradingService.fetchWarehouses(branchId, updatedAfter);
          if (rows.length > 0) updates.warehouses = mergeById(globalState.warehouses || [], rows);
        });
      }
      if (shouldSyncTable('trading_b2b_clients')) {
        tasks.push(async () => {
          const rows = await tradingService.fetchClients(branchId, updatedAfter);
          if (rows.length > 0) updates.b2bClients = mergeById(globalState.b2bClients || [], rows);
        });
      }
      if (shouldSyncTable('trading_b2b_suppliers')) {
        tasks.push(async () => {
          const rows = await tradingService.fetchSuppliers(branchId, updatedAfter);
          if (rows.length > 0) updates.b2bSuppliers = mergeById(globalState.b2bSuppliers || [], rows);
        });
      }
      if (shouldSyncTable('trading_products')) {
        tasks.push(async () => {
          const rows = await tradingService.fetchProducts(branchId, updatedAfter);
          if (rows.length > 0) updates.products = mergeById(globalState.products || [], rows);
        });
      }
      if (shouldSyncTable('trading_commercial_docs', 'trading_commercial_doc_items')) {
        tasks.push(async () => {
          const rows = await tradingService.fetchCommercialDocs(branchId, updatedAfter);
          if (rows.length > 0) updates.commercialDocs = mergeById(globalState.commercialDocs || [], rows);
        });
      }
      if (shouldSyncTable('trading_purchase_docs', 'trading_purchase_doc_items')) {
        tasks.push(async () => {
          const rows = await tradingService.fetchPurchaseDocs(branchId, updatedAfter);
          if (rows.length > 0) updates.purchaseDocs = mergeById(globalState.purchaseDocs || [], rows);
        });
      }
      if (shouldSyncTable('trading_stock_vouchers', 'trading_stock_voucher_items')) {
        tasks.push(async () => {
          const rows = await tradingService.fetchStockVouchers(branchId, updatedAfter);
          if (rows.length > 0) updates.stockVouchers = mergeById(globalState.stockVouchers || [], rows);
        });
      }
    }

    if (tableFilterSet && tasks.length === 0) {
      syncCoordinator.markSynced(branchId, activeCategory, updates.lastSyncedAt || new Date().toISOString());
      return;
    }

    globalState = {
      ...globalState,
      isSyncing: true,
      syncErrorMessage: null,
    };
    notify();

    try {
      if (!tableFilterSet) {
        await syncCoordinator.flushQueue().catch((err) => {
          console.warn('[store] flushQueue warning:', err);
        });
      }

      await runWithConcurrency(tasks, 4);
      syncCoordinator.markSynced(branchId, activeCategory, updates.lastSyncedAt || new Date().toISOString());

      const mergedState = { ...globalState, ...updates };
      const postDeletePatch = pruneDeletedRecords(mergedState, options?.deletedIdsByTable);
      globalState = { ...mergedState, ...postDeletePatch };
      notify();

      if (activeCategory === 'pos_inventory' && globalState.networkMode !== 'offline') {
        void atriumActions.finalizeProvisionalPosZReports();
      }
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
  });
}

export function setNetworkModeAction(mode: 'online' | 'slow_3g' | 'offline' | 'force_skeleton') {
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
}

export async function retryCloudSyncAction() {
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
    await syncWithSupabaseAction();
  } finally {
    globalState = {
      ...globalState,
      isSyncing: false,
      isSyncTimeout: false,
      lastSyncedAt: new Date().toISOString(),
    };
    notify();
  }
}

export function useDashboardShellState() {
  const shell = useAtriumSelector(
    (s) => ({
      theme: s.theme,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  return {
    ...shell,
    retryCloudSync: retryCloudSyncAction,
  };
}

export function useAtriumStoreLifecycle() {
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentAccountId = useAtriumSelector((s) => s.account.id || s.currentUser.id);
  const activeCategory = useAtriumSelector((s) => {
    const branch = s.branches.find((b) => b.id === s.currentBranchId);
    const biz = s.businesses.find((b) => b.id === (branch?.businessId || s.currentBusinessId));
    return biz?.category || 'membership_session';
  });
  const timerRunning = useAtriumSelector((s) => s.activeTimer.isRunning);
  const timerPaused = useAtriumSelector((s) => s.activeTimer.isPaused);

  useEffect(() => {
    if (isSupabaseConfigured() && !hasInitialSynced) {
      hasInitialSynced = true;
      void syncWithSupabaseAction();
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubscribe = authService.onAuthStateChange(async (session, event) => {
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (session?.user) {
        const userId = session.user.id;
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
            id: userId,
            email: session.user.email || globalState.currentUser.email,
            fullName,
          },
          isAuthenticated: true,
        };
        notify();

        const isDuplicateInitialSession =
          event === 'INITIAL_SESSION' && hasInitialSynced && lastSyncedAuthUserId === userId;
        if (!isDuplicateInitialSession) {
          lastSyncedAuthUserId = userId;
          void syncWithSupabaseAction();
        }
      } else if (event === 'SIGNED_OUT') {
        lastSyncedAuthUserId = null;
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    ensureBranchSubscription(currentBranchId, activeCategory, currentAccountId);
  }, [currentBranchId, activeCategory, currentAccountId]);

  useEffect(() => {
    ensureTimerTick(timerRunning, timerPaused);
  }, [timerRunning, timerPaused]);
}

export function selectMemberAction(memberId: string | null) {
  if (
    globalState.selectedMemberId === memberId &&
    globalState.isDetailOpen === (memberId !== null)
  ) {
    return;
  }
  globalState = {
    ...globalState,
    selectedMemberId: memberId,
    isDetailOpen: memberId !== null,
  };
  notify();
}

export function closeDetailAction() {
  if (!globalState.isDetailOpen) return;
  globalState = { ...globalState, isDetailOpen: false };
  notify();
}

export function addMemberAction(
  newMember: Omit<Member, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>
) {
  return atriumActions.addMember(newMember);
}

export function updateMemberAction(id: string, updates: Partial<Member>) {
  return atriumActions.updateMember(id, updates);
}

export function deleteMemberAction(id: string) {
  return atriumActions.deleteMember(id);
}

export function checkInMemberAction(
  id: string,
  options?: {
    method?: 'rfid' | 'qr' | 'manual' | 'turnstile';
    overrideByStaffId?: string;
    overrideReason?: string;
    duplicateWindowMinutes?: number;
    logDenied?: boolean;
  }
) {
  return atriumActions.checkInMember(id, options);
}

const EMPTY_PLANS: MembershipPlan[] = [];

// Module-level singletons to prevent race conditions across multiple hook consumers
let hasInitialSynced = false;
let lastSyncedAuthUserId: string | null = null;
let activeBranchSub: (() => void) | null = null;
let activeSubscribedScopeKey: string | null = null;
let activeTimerInterval: ReturnType<typeof setInterval> | null = null;

function ensureBranchSubscription(
  branchId: string,
  categoryOverride?: BusinessCategory,
  accountIdOverride?: string | null
) {
  if (!isSupabaseConfigured()) return;
  const activeCategory = categoryOverride || getActiveCategoryForBranch(branchId);
  const accountId = accountIdOverride || globalState.account.id || globalState.currentUser.id || null;
  const scopeKey = `${branchId}:${activeCategory}:${accountId || ''}`;
  if (activeSubscribedScopeKey === scopeKey && activeBranchSub) {
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
  activeSubscribedScopeKey = scopeKey;
  activeBranchSub = realtimeService.subscribeToBranch(
    branchId,
    {
      onDeltaChange: (changedTables, deletedIdsByTable) => {
        void syncWithSupabaseAction({
          onlyTables: changedTables,
          deletedIdsByTable,
        });
      },
    },
    activeCategory,
    accountId
  );
}

export interface BackupValidationResult {
  valid: boolean;
  schemaVersion: number | string;
  exportedAt?: string;
  primaryBusiness?: string;
  entityCounts: Record<string, number>;
  totalRecords: number;
  checksum: string;
  warnings: string[];
  errors: string[];
  parsed?: Record<string, any>;
}

function computeFnv1aChecksum(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function validateBackupSnapshot(
  rawInput: string | Record<string, any>
): BackupValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let parsed: any = null;
  let normalizedText = '';

  if (typeof rawInput === 'string') {
    normalizedText = rawInput;
    try {
      parsed = JSON.parse(rawInput);
    } catch {
      return {
        valid: false,
        schemaVersion: 'unknown',
        entityCounts: {},
        totalRecords: 0,
        checksum: computeFnv1aChecksum(rawInput || ''),
        warnings,
        errors: ['Invalid JSON syntax. The backup file appears corrupted or truncated.'],
      };
    }
  } else if (rawInput && typeof rawInput === 'object') {
    parsed = rawInput;
    try {
      normalizedText = JSON.stringify(rawInput);
    } catch {
      normalizedText = '';
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      schemaVersion: 'unknown',
      entityCounts: {},
      totalRecords: 0,
      checksum: computeFnv1aChecksum(normalizedText),
      warnings,
      errors: ['Backup root payload must be a JSON object.'],
    };
  }

  if (!parsed.account || typeof parsed.account !== 'object') {
    errors.push('Missing account metadata object.');
  }
  if (!Array.isArray(parsed.businesses)) {
    errors.push('Missing or invalid businesses array.');
  }
  if (!Array.isArray(parsed.branches)) {
    errors.push('Missing or invalid branches array.');
  }

  const schemaVersion = parsed.storageVersion ?? parsed.version ?? 'legacy';
  if (parsed.storageVersion !== undefined && parsed.storageVersion !== ATRIUM_STORAGE_VERSION) {
    warnings.push(
      `Snapshot schema v${String(parsed.storageVersion)} differs from current v${ATRIUM_STORAGE_VERSION}; defaults will backfill missing fields.`
    );
  }
  if (!parsed.exportedAt) {
    warnings.push('Snapshot does not contain an exportedAt timestamp.');
  }
  if (Array.isArray(parsed.businesses) && parsed.businesses.length === 0) {
    warnings.push('Snapshot contains 0 businesses.');
  }

  const countKeys = [
    'businesses',
    'branches',
    'staff',
    'members',
    'products',
    'sales',
    'appointments',
    'freelanceClients',
    'freelanceProjects',
    'freelanceInvoices',
    'rentableUnits',
    'rentalBookings',
    'eduStudents',
    'eduCohorts',
    'pmProjects',
    'commercialDocs',
    'purchaseDocs',
    'categoryFormules',
  ] as const;

  const entityCounts: Record<string, number> = {};
  let totalRecords = 0;
  for (const key of countKeys) {
    const val = parsed[key];
    const count = Array.isArray(val) ? val.length : 0;
    entityCounts[key] = count;
    totalRecords += count;
  }

  return {
    valid: errors.length === 0,
    schemaVersion,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
    primaryBusiness:
      Array.isArray(parsed.businesses) && parsed.businesses[0]?.name
        ? String(parsed.businesses[0].name)
        : undefined,
    entityCounts,
    totalRecords,
    checksum: computeFnv1aChecksum(normalizedText),
    warnings,
    errors,
    parsed: errors.length === 0 ? parsed : undefined,
  };
}

export function applyResolvedRowToSlice(
  table: string,
  recordId: string,
  row: Record<string, any> | null,
  versionCol: string,
  resolvedVersion: number
): Partial<AppState> {
  if (!row) return {};
  const patchList = <T extends { id: string; version?: number }>(
    list: T[],
    mapper?: (r: any) => T
  ): T[] => {
    let found = false;
    const mappedItem = mapper ? mapper(row) : null;
    const cleanMapped: Record<string, any> = {};
    if (mappedItem) {
      for (const [k, v] of Object.entries(mappedItem as Record<string, any>)) {
        if (v !== undefined && !(typeof v === 'number' && Number.isNaN(v))) {
          cleanMapped[k] = v;
        }
      }
    }
    const next = list.map((item) => {
      if (toValidUuid(item.id) !== toValidUuid(recordId) && item.id !== recordId) return item;
      found = true;
      if (mappedItem) {
        return {
          ...item,
          ...cleanMapped,
          id: item.id,
          version: Number(row[versionCol] ?? resolvedVersion),
        };
      }
      return { ...item, version: Number(row[versionCol] ?? resolvedVersion) };
    });
    return found ? next : list;
  };

  switch (table) {
    case 'businesses':
      return { businesses: patchList(globalState.businesses, mapBusinessFromDb) };
    case 'branches':
      return { branches: patchList(globalState.branches, mapBranchFromDb) };
    case 'devices':
      return { devices: patchList(globalState.devices, mapDeviceFromDb) };
    case 'gym_members':
      return { members: patchList(globalState.members, mapMemberFromDb) };
    case 'gym_registration_leads':
      return { leads: patchList(globalState.leads, mapLeadFromDb) };
    case 'gym_schedule_events':
      return { schedule: patchList(globalState.schedule, mapScheduleEventFromDb) };
    case 'gym_class_enrollments':
      return { classEnrollments: patchList(globalState.classEnrollments || [], mapClassEnrollmentFromDb) };
    case 'staff':
      return { staff: patchList(globalState.staff, (r) => mapStaffFromDb(r)) };
    case 'staff_attendance_logs':
      return { staffAttendanceLogs: patchList(globalState.staffAttendanceLogs, mapAttendanceLogFromDb) };
    case 'staff_salary_advances':
      return { staffSalaryAdvances: patchList(globalState.staffSalaryAdvances, mapSalaryAdvanceFromDb) };
    case 'staff_payroll_runs':
      return { staffPayrollRuns: patchList(globalState.staffPayrollRuns, mapPayrollRunFromDb) };
    case 'staff_payroll_slips':
      return { staffPayrollSlips: patchList(globalState.staffPayrollSlips, mapPayrollSlipFromDb) };
    case 'pos_products':
      return { products: patchList(globalState.products, mapProductFromDb) };
    case 'pos_sales':
      return {
        sales: patchList(globalState.sales, (r) => {
          const mapped = mapSaleFromDb(r);
          if (!Array.isArray(r.items)) {
            const { items: _omit, ...rest } = mapped;
            return rest as Sale;
          }
          return mapped;
        }),
      };
    case 'pos_parked_orders':
      return { parkedOrders: patchList(globalState.parkedOrders, mapParkedOrderFromDb) };
    case 'pos_stock_movements':
      return { stockMovements: patchList(globalState.stockMovements || [], mapStockMovementFromDb) };
    case 'salon_appointments':
      return { appointments: patchList(globalState.appointments, mapAppointmentFromDb) };
    case 'salon_services':
      return { servicesCatalog: patchList(globalState.servicesCatalog, mapSalonServiceFromDb) };
    case 'salon_workstations':
      return { salonWorkstations: patchList(globalState.salonWorkstations || [], mapSalonWorkstationFromDb) };
    case 'salon_stylist_payouts':
      return { stylistPayouts: patchList(globalState.stylistPayouts, mapStylistPayoutFromDb) };
    case 'freelance_clients':
      return { freelanceClients: patchList(globalState.freelanceClients, mapFreelanceClientFromDb) };
    case 'freelance_projects':
      return { freelanceProjects: patchList(globalState.freelanceProjects, mapFreelanceProjectFromDb) };
    case 'freelance_time_logs':
      return { timeLogs: patchList(globalState.timeLogs, mapTimeLogFromDb) };
    case 'freelance_invoices':
      return { freelanceInvoices: patchList(globalState.freelanceInvoices, mapFreelanceInvoiceFromDb) };
    case 'freelance_proposals':
      return { freelanceProposals: patchList(globalState.freelanceProposals, mapFreelanceProposalFromDb) };
    case 'freelance_expenses':
      return { freelanceExpenses: patchList(globalState.freelanceExpenses, mapFreelanceExpenseFromDb) };
    case 'rental_units':
      return { rentableUnits: patchList(globalState.rentableUnits, mapRentalUnitFromDb) };
    case 'rental_renters':
      return { rentalRenters: patchList(globalState.rentalRenters, mapRentalRenterFromDb) };
    case 'rental_bookings':
      return { rentalBookings: patchList(globalState.rentalBookings, mapRentalBookingFromDb) };
    case 'rental_security_deposits':
      return { securityDeposits: patchList(globalState.securityDeposits, mapRentalDepositFromDb) };
    case 'edu_courses':
      return { eduCourses: patchList(globalState.eduCourses, mapEduCourseFromDb) };
    case 'edu_classrooms':
      return { eduClassrooms: patchList(globalState.eduClassrooms, mapEduClassroomFromDb) };
    case 'edu_cohorts':
      return { eduCohorts: patchList(globalState.eduCohorts, mapEduCohortFromDb) };
    case 'edu_students':
      return { eduStudents: patchList(globalState.eduStudents, mapEduStudentFromDb) };
    case 'edu_enrollments':
      return { eduEnrollments: patchList(globalState.eduEnrollments, mapEduEnrollmentFromDb) };
    case 'edu_sessions':
      return { eduSessions: patchList(globalState.eduSessions, mapEduSessionFromDb) };
    case 'edu_attendance':
      return { eduAttendance: patchList(globalState.eduAttendance, mapEduAttendanceFromDb) };
    case 'edu_grades':
      return { eduGrades: patchList(globalState.eduGrades, mapEduGradeFromDb) };
    case 'edu_certificates':
      return { eduCertificates: patchList(globalState.eduCertificates, mapEduCertificateFromDb) };
    case 'edu_admissions':
      return { eduAdmissions: patchList(globalState.eduAdmissions, mapEduAdmissionFromDb) };
    case 'pm_clients':
      return { pmClients: patchList(globalState.pmClients, mapPmClientFromDb) };
    case 'pm_projects':
      return { pmProjects: patchList(globalState.pmProjects, mapPmProjectFromDb) };
    case 'pm_milestones':
      return { pmMilestones: patchList(globalState.pmMilestones, mapPmMilestoneFromDb) };
    case 'pm_print_orders':
      return { pmPrintOrders: patchList(globalState.pmPrintOrders, mapPmPrintOrderFromDb) };
    case 'pm_bat_deliverables':
      return { pmBatDeliverables: patchList(globalState.pmBatDeliverables, mapPmBatDeliverableFromDb) };
    case 'pm_talents':
      return { pmTalents: patchList(globalState.pmTalents, mapPmTalentFromDb) };
    case 'pm_missions':
      return { pmMissions: patchList(globalState.pmMissions, mapPmMissionFromDb) };
    case 'pm_attendances':
      return { pmAttendances: patchList(globalState.pmAttendances, mapPmAttendanceFromDb) };
    case 'pm_expenses':
      return { pmExpenses: patchList(globalState.pmExpenses, mapPmExpenseFromDb) };
    case 'pm_payroll_batches':
      return { pmPayrollBatches: patchList(globalState.pmPayrollBatches, mapPmPayrollBatchFromDb) };
    case 'pm_ccp_slips':
      return { pmCcpSlips: patchList(globalState.pmCcpSlips, mapPmCcpSlipFromDb) };
    case 'pm_equipment_stock':
      return { pmEquipmentStock: patchList(globalState.pmEquipmentStock, mapPmEquipmentStockFromDb) };
    case 'trading_warehouses':
      return { warehouses: patchList(globalState.warehouses, mapWarehouseFromDb) };
    case 'trading_b2b_clients':
      return { b2bClients: patchList(globalState.b2bClients, mapB2bClientFromDb) };
    case 'trading_b2b_suppliers':
      return { b2bSuppliers: patchList(globalState.b2bSuppliers, mapB2bSupplierFromDb) };
    case 'trading_products':
      return { products: patchList(globalState.products, mapTradingProductFromDb) };
    case 'trading_commercial_docs':
      return { commercialDocs: patchList(globalState.commercialDocs, mapCommercialDocFromDb) };
    case 'trading_purchase_docs':
      return { purchaseDocs: patchList(globalState.purchaseDocs, mapPurchaseDocFromDb) };
    case 'trading_stock_vouchers':
      return { stockVouchers: patchList(globalState.stockVouchers, mapStockVoucherFromDb) };
    case 'business_configs': {
      const mapped = mapBusinessConfigFromDb(row);
      return {
        businessConfigs: {
          ...(globalState.businessConfigs || {}),
          [mapped.businessId]: {
            ...mapped,
            version: Number(row[versionCol] ?? resolvedVersion),
          },
        },
      };
    }
    case 'category_formules':
      return { categoryFormules: patchList(globalState.categoryFormules || [], mapCategoryFormuleFromDb) };
    case 'gym_plans': {
      const mapped = mapMembershipPlanFromDb(row);
      const nextByBranch: Record<string, MembershipPlan[]> = { ...(globalState.plansByBranch || {}) };
      for (const brId of Object.keys(nextByBranch)) {
        nextByBranch[brId] = patchList(nextByBranch[brId], mapMembershipPlanFromDb);
      }
      return { plansByBranch: nextByBranch };
    }
    default:
      return {};
  }
}

export function dismissConcurrencyConflictAction(conflictId: string) {
  globalState = {
    ...globalState,
    concurrencyConflicts: (globalState.concurrencyConflicts || []).filter(
      (c) => c.id !== conflictId
    ),
  };
  notify(false, true);
}

export async function resolveConcurrencyConflictAction(
  conflictId: string,
  strategy: 'server' | 'overwrite' | 'merge',
  mergedPatch?: Record<string, any>
): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
  const conflict = (globalState.concurrencyConflicts || []).find((c) => c.id === conflictId);
  if (!conflict) {
    return { success: false, error: 'Conflict no longer active.' };
  }

  const versionCol = conflict.versionColumn || 'version';
  const lang = globalState.language || 'fr';

  if (strategy === 'server') {
    const serverPatch = applyResolvedRowToSlice(
      conflict.table,
      conflict.recordId,
      conflict.serverData,
      versionCol,
      conflict.serverVersion
    );
    globalState = {
      ...globalState,
      ...serverPatch,
      concurrencyConflicts: (globalState.concurrencyConflicts || []).filter(
        (c) => c.id !== conflictId
      ),
    };
    notify();
    emitConcurrencyResolution({
      table: conflict.table,
      recordId: conflict.recordId,
      strategy: 'server',
      resolvedVersion: conflict.serverVersion,
      resolvedRecord: conflict.serverData,
      resolvedAt: new Date().toISOString(),
    });
    if (conflict.serverData && conflict.onApplyResolution) {
      await conflict.onApplyResolution(conflict.serverData, 'server');
    }
    showToast({
      type: 'info',
      title:
        lang === 'ar'
          ? 'تم اعتماد نسخة الخادم'
          : lang === 'fr'
          ? 'Version serveur conservée'
          : 'Server version applied',
      message:
        conflict.entityLabel ||
        (lang === 'ar'
          ? 'تم تحديث السجل بأحدث نسخة محفوظة.'
          : lang === 'fr'
          ? 'L’enregistrement a été rechargé depuis le serveur.'
          : 'Record reloaded with the latest server snapshot.'),
    });
    return { success: true };
  }

  const resolvedPayload: Record<string, any> =
    strategy === 'overwrite'
      ? {
          ...(conflict.serverData || {}),
          ...conflict.localData,
          id: toValidUuid(conflict.recordId),
          [versionCol]: conflict.serverVersion,
          updated_at: new Date().toISOString(),
        }
      : {
          ...(conflict.serverData || {}),
          ...conflict.localData,
          ...(mergedPatch || {}),
          id: toValidUuid(conflict.recordId),
          [versionCol]: conflict.serverVersion,
          updated_at: new Date().toISOString(),
        };

  // Remove stale pending conflict first; if another conflict triggers, listener re-adds the fresh one
  globalState = {
    ...globalState,
    concurrencyConflicts: (globalState.concurrencyConflicts || []).filter(
      (c) => c.id !== conflictId
    ),
  };
  notify(false, true);

  const res = await syncCoordinator.mutateOrQueueUpsert(conflict.table, resolvedPayload, {
    expectedVersion: conflict.serverVersion,
    versionColumn: versionCol,
    entityType: conflict.entityType,
    entityLabel: conflict.entityLabel,
    localData: resolvedPayload,
    onApplyResolution: conflict.onApplyResolution,
  });

  if (res.success) {
    const nextVersion = res.newVersion ?? conflict.serverVersion + 1;
    const slicePatch = applyResolvedRowToSlice(
      conflict.table,
      conflict.recordId,
      { ...resolvedPayload, [versionCol]: nextVersion },
      versionCol,
      nextVersion
    );
    if (Object.keys(slicePatch).length > 0) {
      globalState = { ...globalState, ...slicePatch };
      notify();
    }
    emitConcurrencyResolution({
      table: conflict.table,
      recordId: conflict.recordId,
      strategy,
      resolvedVersion: nextVersion,
      resolvedRecord: { ...resolvedPayload, [versionCol]: nextVersion },
      resolvedAt: new Date().toISOString(),
    });
    if (conflict.onApplyResolution) {
      await conflict.onApplyResolution(
        { ...resolvedPayload, [versionCol]: nextVersion },
        strategy
      );
    }
    showToast({
      type: 'success',
      title:
        lang === 'ar'
          ? 'تم حل التعارض وحفظ التعديلات'
          : lang === 'fr'
          ? 'Conflit résolu et enregistré'
          : 'Conflict resolved & saved',
      message: `${conflict.entityLabel || conflict.table} (v${nextVersion})`,
    });
    return { success: true };
  }

  if (res.conflict) {
    return { success: false, conflict: true, error: res.error };
  }

  return { success: res.queued ? true : false, error: res.error };
}

subscribeConcurrencyConflicts((event) => {
  const existing = globalState.concurrencyConflicts || [];
  const filtered = existing.filter(
    (c) => !(c.table === event.table && c.recordId === event.recordId)
  );
  globalState = {
    ...globalState,
    concurrencyConflicts: [event, ...filtered],
  };
  notify(false, true);
});

let lastNearCapToastAt = 0;
registerQueueAlertListener((alert) => {
  const lang = globalState.language || 'fr';
  if (alert.type === 'at_capacity') {
    showToast({
      type: 'error',
      title: t('offline_queue_full_title', lang),
      message: t('offline_queue_full_msg', lang),
      duration: 8000,
    });
  } else if (alert.type === 'item_quarantined') {
    showToast({
      type: 'warning',
      title: t('offline_queue_quarantined_title', lang),
      message: t('offline_queue_quarantined_msg', lang, {
        reason: (alert.item as any)?.quarantineReason || 'sync_error',
      }),
      duration: 7000,
    });
  } else if (alert.type === 'near_capacity') {
    const now = Date.now();
    if (now - lastNearCapToastAt > 30_000) {
      lastNearCapToastAt = now;
      showToast({
        type: 'warning',
        title: t('offline_queue_near_cap_title', lang),
        message: t('offline_queue_near_cap_msg', lang, {
          pending: String(alert.pendingCount),
          max: String(MAX_QUEUE_SIZE),
        }),
        duration: 6000,
      });
    }
  }
});

function ensureTimerTick(isRunning: boolean, isPaused: boolean) {
  if (isRunning && !isPaused) {
    if (!activeTimerInterval) {
      activeTimerInterval = setInterval(() => {
        const current = timerState;
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

        setTimerMicroState(
          {
            ...current,
            elapsedSeconds: newElapsed,
            pomodoroRemainingSeconds: newPomodoroSecs,
            pomodoroMode: newPomodoroMode,
          },
          false
        );
      }, 1000);
    }
  } else {
    if (activeTimerInterval) {
      clearInterval(activeTimerInterval);
      activeTimerInterval = null;
    }
  }
}

let toastDispatcherTimer: ReturnType<typeof setInterval> | null = null;
const toastExitTimers = new Map<string, ReturnType<typeof setTimeout>>();

function stopToastDispatcherIfEmpty() {
  if ((globalState.toasts || []).length === 0 && toastDispatcherTimer !== null) {
    clearInterval(toastDispatcherTimer);
    toastDispatcherTimer = null;
  }
}

function ensureToastDispatcherRunning() {
  if (toastDispatcherTimer !== null) return;
  toastDispatcherTimer = setInterval(() => {
    const active = globalState.toasts || [];
    if (active.length === 0) {
      stopToastDispatcherIfEmpty();
      return;
    }
    const now = Date.now();
    for (const t of active) {
      if (t.isPaused || t.isExiting) continue;
      const dur = t.duration ?? (t.hasUndo ? UNDO_TOAST_DURATION_MS : REGULAR_TOAST_DURATION_MS);
      if (dur > 0 && now - t.createdAt >= dur) {
        beginToastExit(t.id);
      }
    }
  }, 500);
}

export function dismissToast(id: string) {
  const existingExit = toastExitTimers.get(id);
  if (existingExit) {
    clearTimeout(existingExit);
    toastExitTimers.delete(id);
  }
  globalState = {
    ...globalState,
    toasts: (globalState.toasts || []).filter((t) => t.id !== id),
  };
  stopToastDispatcherIfEmpty();
  notify(false, true);
}

export function beginToastExit(id: string) {
  const target = (globalState.toasts || []).find((t) => t.id === id);
  if (!target || target.isExiting) return;

  globalState = {
    ...globalState,
    toasts: (globalState.toasts || []).map((t) =>
      t.id === id ? { ...t, isExiting: true } : t
    ),
  };
  notify(false, true);

  if (toastExitTimers.has(id)) {
    clearTimeout(toastExitTimers.get(id)!);
  }
  const timer = setTimeout(() => {
    toastExitTimers.delete(id);
    dismissToast(id);
  }, UNDO_EXIT_ANIMATION_MS);
  toastExitTimers.set(id, timer);
}

export function pauseToast(id: string) {
  const target = (globalState.toasts || []).find((t) => t.id === id);
  if (!target || target.isPaused || target.isExiting) return;
  globalState = {
    ...globalState,
    toasts: (globalState.toasts || []).map((t) =>
      t.id === id ? { ...t, isPaused: true } : t
    ),
  };
  notify(false, true);
}

export function resumeToast(id: string) {
  const target = (globalState.toasts || []).find((t) => t.id === id);
  if (!target || !target.isPaused || target.isExiting) return;
  const dur = target.duration ?? (target.hasUndo ? UNDO_TOAST_DURATION_MS : REGULAR_TOAST_DURATION_MS);
  const elapsed = Date.now() - target.createdAt;
  const remaining = dur - elapsed;
  // Ensure at least UNDO_HOVER_GRACE_MS (2s) remains upon mouse leave
  const nextCreatedAt =
    remaining < UNDO_HOVER_GRACE_MS
      ? Date.now() - Math.max(0, dur - UNDO_HOVER_GRACE_MS)
      : target.createdAt;

  globalState = {
    ...globalState,
    toasts: (globalState.toasts || []).map((t) =>
      t.id === id ? { ...t, isPaused: false, createdAt: nextCreatedAt } : t
    ),
  };
  notify(false, true);
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

/**
 * Resolves the active tenant accountId from store state or candidate list.
 * Fails closed (shows visible localized error toast, returns null) when missing.
 */
export function resolveActiveAccountIdOrFail(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  const active = globalState.account?.id?.trim();
  if (active) return active;
  showToast({
    type: 'error',
    title: t('tenant_context_missing_title', globalState.language),
    message: t('tenant_context_missing_msg', globalState.language),
  });
  return null;
}

/**
 * Resolves active quadruple tenant trace scope (accountId, businessId, branchId, staffId),
 * failing closed with visible error toast when tenant account or branch is missing.
 */
export function resolveActiveScopeOrFail(overrides?: {
  accountId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  staffId?: string | null;
}): { accountId: string; businessId: string; branchId: string; staffId?: string } | null {
  const accountId = resolveActiveAccountIdOrFail(overrides?.accountId);
  if (!accountId) return null;
  const branchId = (overrides?.branchId || globalState.currentBranchId || '').trim();
  if (!branchId) {
    showToast({
      type: 'error',
      title: t('tenant_context_missing_title', globalState.language),
      message: t('tenant_context_missing_msg', globalState.language),
    });
    return null;
  }
  return {
    accountId,
    businessId: (overrides?.businessId || globalState.currentBusinessId || '').trim(),
    branchId,
    staffId: overrides?.staffId || globalState.currentUser?.id || undefined,
  };
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
        hasUndo?: boolean;
        undoLabel?: string;
        onUndo?: () => Promise<void> | void;
        action?: {
          label: string;
          onClick: () => Promise<void> | void;
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
  const syncStatus = isString ? undefined : toastInputOrMessage.syncStatus;
  const table = isString ? undefined : toastInputOrMessage.table;
  const currentBiz = selectCurrentBusinessFromState(globalState);
  const category = (isString ? undefined : toastInputOrMessage.category) || currentBiz?.category;
  const action = isString ? undefined : toastInputOrMessage.action;
  const explicitOnUndo = isString ? undefined : toastInputOrMessage.onUndo;
  const explicitHasUndo = isString ? false : Boolean(toastInputOrMessage.hasUndo || explicitOnUndo);
  const isActionUndo =
    !explicitHasUndo &&
    Boolean(action?.label) &&
    /undo|annul|تراجع/i.test(action!.label);
  const hasUndo = explicitHasUndo || isActionUndo;
  const undoHandler = explicitOnUndo || (isActionUndo ? action?.onClick : undefined);
  const undoLabel =
    (!isString && toastInputOrMessage.undoLabel) ||
    (isActionUndo && action?.label) ||
    getUndoButtonLabel(globalState.language);

  const duration = isString
    ? REGULAR_TOAST_DURATION_MS
    : toastInputOrMessage.duration ??
      (hasUndo ? UNDO_TOAST_DURATION_MS : REGULAR_TOAST_DURATION_MS);

  const { accent } = getFacilityAccentForCategory(category, globalState.theme);
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
    hasUndo,
    undoLabel: hasUndo ? undoLabel : undefined,
    onUndo: hasUndo ? undoHandler : undefined,
    isExiting: false,
    isPaused: false,
    facilityAccent: accent,
    action: hasUndo ? undefined : action,
    createdAt: Date.now(),
  };

  // Clear any pending exit timers for replaced toasts (MaxVisibleToasts = 1)
  for (const prev of globalState.toasts || []) {
    const pendingExit = toastExitTimers.get(prev.id);
    if (pendingExit) {
      clearTimeout(pendingExit);
      toastExitTimers.delete(prev.id);
    }
  }

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
    action: hasUndo && undoHandler
      ? { label: undoLabel, onClick: undoHandler }
      : action,
  };

  globalState = {
    ...globalState,
    // MaxVisibleToasts = 1 per desktop guide §2.4
    toasts: [newToast],
    notifications: [newNotification, ...(globalState.notifications || [])].slice(0, 60),
  };
  notify();

  if (duration > 0) {
    ensureToastDispatcherRunning();
  }
}

configureUndoToastBridge({
  emitToast: (opts) => showToast(opts),
  getContext: () => {
    const biz = selectCurrentBusinessFromState(globalState);
    return {
      businessId: globalState.currentBusinessId,
      branchId: globalState.currentBranchId,
      category: biz?.category || 'membership_session',
      language: globalState.language || 'fr',
    };
  },
});

if (typeof document !== 'undefined') {
  applyFacilityAccentCssVars(
    selectCurrentBusinessFromState(globalState)?.category,
    globalState.theme
  );
}


function createAtriumActions() {
  // Actions
  const setScreen = setScreenAction;
  const setTheme = setThemeAction;
  const setDensity = setDensityAction;
  const setLanguage = setLanguageAction;
  const setSystemDefaultLanguage = setSystemDefaultLanguageAction;
  const switchFacility = switchFacilityAction;
  const switchBusiness = switchBusinessAction;
  const switchBranch = switchBranchAction;

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
    const branchManager = (globalState.staff || []).find(
      (s) =>
        (s.branchId === globalState.currentBranchId || s.facilityId === globalState.currentBranchId) &&
        ['owner', 'manager', 'admin', 'agencydirector'].includes((s.role || '').toLowerCase())
    );
    const activeStaffId =
      globalState.currentUser?.id || branchManager?.id || (globalState.staff && globalState.staff.length > 0 ? globalState.staff[0].id : undefined);

    return {
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId: globalState.currentBranchId,
      staffId: activeStaffId,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
    };
  };

  const addMember = (newMember: Omit<Member, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>) => {
    const before = captureStoreSlices(['members', 'selectedMemberId', 'isDetailOpen']);
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

    if (isSupabaseConfigured()) {
      memberService.createMember(member).catch((err) => {
        console.warn('[store] Failed to save member to Supabase:', err);
      });
    }

    const after = captureStoreSlices(['members', 'selectedMemberId', 'isDetailOpen']);
    registerUndoEntry({
      vertical: cat,
      operationType: 'create',
      summary: ul(
        `Added ${terms.memberSingle}: ${member.fullName}`,
        `Ajout ${terms.memberSingle} : ${member.fullName}`,
        `إضافة ${terms.memberSingle}: ${member.fullName}`
      ),
      entityLabel: member.fullName,
      toastType: 'success',
      toastTitle: `${terms.memberSingle} : ${t('toast_member_enrolled_title', lang)}`,
      toastMessage: `${member.fullName} ${t('toast_member_enrolled_msg', lang)} ${member.membershipPlanName || 'Standard'}.`,
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.deleteMember(member.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_members', member.id, globalState.currentUser?.id).catch(() => {});
          memberService.createMember(member).catch(() => {});
        }
      },
    });

    return member;
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    const target = globalState.members.find((m) => m.id === id);
    if (!target) return;
    const before = captureStoreSlices(['members']);
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

    const updatedMember = globalState.members.find((m) => m.id === id);
    if (isSupabaseConfigured() && updatedMember) {
      memberService.updateMember(updatedMember).catch((err) => {
        console.warn('[store] Failed to update member in Supabase:', err);
      });
    }

    const after = captureStoreSlices(['members']);
    const isStatusOnly =
      updates.status !== undefined &&
      Object.keys(updates).every((k) => k === 'status' || k === 'updatedAt');
    registerUndoEntry({
      vertical: cat,
      operationType: isStatusOnly ? 'status' : 'edit',
      summary: ul(
        `Updated ${updates.fullName || target.fullName}`,
        `Modifié : ${updates.fullName || target.fullName}`,
        `تعديل: ${updates.fullName || target.fullName}`
      ),
      entityLabel: updates.fullName || target.fullName,
      toastType: 'info',
      toastTitle: t('toast_profile_updated_title', lang),
      toastMessage: `${updates.fullName || target.fullName} : ${t('toast_profile_updated_msg', lang)}`,
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.updateMember(target).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updatedMember && isSupabaseConfigured()) {
          memberService.updateMember(updatedMember).catch(() => {});
        }
      },
    });
  };

  const deleteMember = (id: string) => {
    const target = globalState.members.find((m) => m.id === id);
    if (!target) return;
    const before = captureStoreSlices(['members', 'selectedMemberId', 'isDetailOpen']);
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

    if (isSupabaseConfigured()) {
      memberService.deleteMember(id, globalState.currentUser?.id).catch((err) => {
        console.warn('[store] Failed to delete member in Supabase:', err);
      });
    }

    const after = captureStoreSlices(['members', 'selectedMemberId', 'isDetailOpen']);
    registerUndoEntry({
      vertical: cat,
      operationType: 'delete',
      summary: ul(
        `Deleted ${terms.memberSingle}: ${target.fullName}`,
        `Supprimé : ${target.fullName}`,
        `حذف: ${target.fullName}`
      ),
      entityLabel: target.fullName,
      toastType: 'warning',
      toastTitle: `${terms.memberSingle} : ${t('toast_member_removed_title', lang)}`,
      toastMessage: `${target.fullName} ${t('toast_member_removed_msg', lang)}`,
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_members', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          memberService.deleteMember(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const checkInMember = (
    id: string,
    options?: {
      method?: 'rfid' | 'qr' | 'manual' | 'turnstile';
      overrideByStaffId?: string;
      overrideReason?: string;
      duplicateWindowMinutes?: number;
      logDenied?: boolean;
    }
  ): CheckInEvaluationResult | null => {
    const member = globalState.members.find((m) => m.id === id);
    if (!member) return null;

    const currentBiz = globalState.businesses.find((b) => b.id === globalState.currentBusinessId);
    const cat = currentBiz?.category || 'membership_session';
    const lang = globalState.language || 'fr';
    const nowIso = new Date().toISOString();

    const evaluation = evaluateMemberCheckIn(
      member,
      globalState.memberCheckIns || [],
      nowIso,
      {
        duplicateWindowMinutes: options?.duplicateWindowMinutes,
        overrideReason: options?.overrideReason,
      }
    );

    if (evaluation.duplicateBlocked) {
      showToast({
        type: 'warning',
        title: ul(
          'Duplicate Check-In Blocked (5 min window)',
          'Double pointage bloqué (fenêtre 5 min)',
          'تم حظر تسجيل الدخول المكرر (نافذة 5 دقائق)'
        ),
        message: ul(
          `${member.fullName}: Owner PIN & override reason required.`,
          `${member.fullName} : Code PIN gérant et motif requis pour forcer.`,
          `${member.fullName}: مطلوب رمز المدير وسبب التجاوز.`
        ),
        category: cat,
      });
      return evaluation;
    }

    const mappedMethod: MemberCheckInLog['checkInMethod'] =
      options?.method === 'qr'
        ? 'barcode_scanner'
        : options?.method === 'manual'
        ? 'manual_click'
        : 'nfc_card';

    if (!evaluation.allowed) {
      if (evaluation.reasonCode === 'denied_frozen') {
        showToast({
          type: 'error',
          title: t('toast_checkin_blocked_title', lang),
          message: `${member.fullName}: ${t('toast_checkin_blocked_msg', lang)}`,
          category: cat,
        });
      } else if (evaluation.reasonCode === 'denied_quota') {
        showToast({
          type: 'warning',
          title: t('toast_checkin_expired_title', lang),
          message: `${member.fullName}: ${t('toast_checkin_quota_exhausted', lang)}`,
          category: cat,
        });
      } else {
        showToast({
          type: 'warning',
          title: t('toast_checkin_expired_title', lang),
          message: `${member.fullName}: ${t('toast_checkin_expired_msg', lang)}`,
          category: cat,
        });
      }

      if (options?.logDenied) {
        const deniedId = generateClientUuid();
        const deniedLog: MemberCheckInLog = {
          id: deniedId,
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: globalState.currentBranchId,
          staffId: globalState.currentUser?.id || '',
          memberId: member.id,
          memberName: member.fullName,
          planId: member.membershipPlanId || 'standard',
          planName: member.membershipPlanName || 'Standard',
          timestamp: nowIso,
          accessStatus: evaluation.accessStatus,
          remainingSessionsBefore: member.remainingSessions,
          remainingSessionsAfter: member.remainingSessions,
          checkInMethod: mappedMethod,
        };
        globalState = {
          ...globalState,
          memberCheckIns: [deniedLog, ...(globalState.memberCheckIns || [])],
        };
        notify();
        if (isSupabaseConfigured()) {
          memberService
            .recordCheckIn(
              globalState.currentBranchId,
              id,
              options?.method || 'rfid',
              getActiveDeviceId(),
              { checkInId: deniedId }
            )
            .catch(() => {});
        }
      }
      return evaluation;
    }

    const before = captureStoreSlices(['members', 'memberCheckIns']);
    const checkInId = generateClientUuid();
    const updatedSessions = evaluation.shouldDecrementSession
      ? evaluation.remainingSessionsAfter
      : member.remainingSessions;

    const checkInLog: MemberCheckInLog = {
      id: checkInId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId: globalState.currentBranchId,
      staffId: globalState.currentUser?.id || '',
      memberId: member.id,
      memberName: member.fullName,
      planId: member.membershipPlanId || 'standard',
      planName: member.membershipPlanName || 'Standard',
      timestamp: nowIso,
      accessStatus: evaluation.accessStatus,
      remainingSessionsBefore: member.remainingSessions,
      remainingSessionsAfter: updatedSessions,
      checkInMethod: mappedMethod,
      overrideByStaffId: options?.overrideByStaffId,
      overrideReason: options?.overrideReason,
    };

    globalState = {
      ...globalState,
      members: globalState.members.map((m) =>
        m.id === id
          ? {
              ...m,
              remainingSessions: updatedSessions ?? m.remainingSessions,
              status: updatedSessions === 0 ? 'Expired' : m.status,
              lastVisitDate: nowIso,
              updatedAt: nowIso,
            }
          : m
      ),
      memberCheckIns: [checkInLog, ...(globalState.memberCheckIns || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService
        .recordCheckIn(
          globalState.currentBranchId,
          id,
          options?.method || 'rfid',
          getActiveDeviceId(),
          {
            checkInId,
            duplicateWindowMinutes: options?.duplicateWindowMinutes ?? 5,
            overrideByStaffId: options?.overrideByStaffId,
            overrideReason: options?.overrideReason,
          }
        )
        .catch((err) => {
          console.warn('[store] Failed to record check-in in Supabase:', err);
        });
    }

    const after = captureStoreSlices(['members', 'memberCheckIns']);
    registerUndoEntry({
      vertical: cat,
      operationType: 'create',
      summary: ul(
        `Check-in: ${member.fullName}`,
        `Passage validé : ${member.fullName}`,
        `تسجيل دخول: ${member.fullName}`
      ),
      entityLabel: member.fullName,
      toastType: evaluation.accessStatus === 'Warning_Expiring' ? 'warning' : 'success',
      toastTitle: t('toast_checkin_granted_title', lang),
      toastMessage: `${member.fullName} (${member.cardId || 'RFID'}): ${t('toast_checkin_granted_msg', lang)}`,
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('gym_check_ins', checkInId, globalState.currentUser?.id).catch(() => {});
          memberService.updateMember(member).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        const updatedM = after.members.find((m) => m.id === id);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_check_ins', checkInId, globalState.currentUser?.id).catch(() => {});
          if (updatedM) memberService.updateMember(updatedM).catch(() => {});
        }
      },
    });
    return evaluation;
  };

  const addLead = (newLead: Omit<RegistrationLead, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>) => {
    const before = captureStoreSlices(['leads']);
    const activeStaffId = globalState.currentUser?.id || globalState.staff[0]?.id || undefined;
    const lead: RegistrationLead = {
      ...newLead,
      id: `lead_${Date.now()}`,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId: globalState.currentBranchId,
      staffId: activeStaffId,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const after = captureStoreSlices(['leads']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(`Added lead ${lead.fullName}`, `Prospect ajouté : ${lead.fullName}`, `إضافة مهتم: ${lead.fullName}`),
      entityLabel: lead.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.deleteLead(lead.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_registration_leads', lead.id, globalState.currentUser?.id).catch(() => {});
          memberService.createRegistrationRequest(lead).catch(() => {});
        }
      },
    });

    return lead;
  };

  const updateLeadStatus = (leadId: string, status: 'Pending' | 'Approved' | 'Declined') => {
    const existingLead = globalState.leads.find((l) => l.id === leadId);
    if (!existingLead) return;
    const before = captureStoreSlices(['leads']);
    globalState = {
      ...globalState,
      leads: globalState.leads.map((l) =>
        l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l
      ),
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService.updateLeadStatus(leadId, status, existingLead.version).catch(() => {});
    }

    const after = captureStoreSlices(['leads']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Lead ${existingLead.fullName} → ${status}`,
        `Prospect ${existingLead.fullName} → ${status}`,
        `حالة الطلب ${existingLead.fullName} → ${status}`
      ),
      entityLabel: existingLead.fullName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.updateLeadStatus(leadId, existingLead.status).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          memberService.updateLeadStatus(leadId, status).catch(() => {});
        }
      },
    });
  };

  const deleteLead = (leadId: string) => {
    const existingLead = globalState.leads.find((l) => l.id === leadId);
    if (!existingLead) return;
    const before = captureStoreSlices(['leads']);
    globalState = {
      ...globalState,
      leads: globalState.leads.filter((l) => l.id !== leadId),
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService.deleteLead(leadId, globalState.currentUser?.id).catch(() => {});
    }

    const after = captureStoreSlices(['leads']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted lead ${existingLead.fullName}`,
        `Prospect supprimé : ${existingLead.fullName}`,
        `حذف الطلب: ${existingLead.fullName}`
      ),
      entityLabel: existingLead.fullName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_registration_leads', leadId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          memberService.deleteLead(leadId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const convertLeadToMember = (
    leadId: string,
    planId: string,
    planName: string,
    durationDays: number
  ) => {
    const lead = globalState.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const before = captureStoreSlices(['leads', 'members', 'selectedMemberId', 'isDetailOpen', 'activeScreen']);

    const startDate = new Date().toISOString().split('T')[0];
    const expDateObj = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const expirationDate = expDateObj.toISOString().split('T')[0];

    const trace = getTraceContext();
    const newMember: Member = {
      ...trace,
      id: `mem_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    if (isSupabaseConfigured()) {
      memberService.updateLeadStatus(leadId, 'Approved', lead.version).catch(() => {});
      memberService.createMember(newMember).catch((err) => {
        console.warn('[store] Failed to save converted member to Supabase:', err);
      });
    }

    const after = captureStoreSlices(['leads', 'members', 'selectedMemberId', 'isDetailOpen', 'activeScreen']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Converted lead ${lead.fullName} to member`,
        `Prospect converti en adhérent : ${lead.fullName}`,
        `تحويل الطلب إلى عضو: ${lead.fullName}`
      ),
      entityLabel: lead.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.updateLeadStatus(leadId, lead.status).catch(() => {});
          memberService.deleteMember(newMember.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          memberService.updateLeadStatus(leadId, 'Approved').catch(() => {});
          syncCoordinator.restoreRow('gym_members', newMember.id, globalState.currentUser?.id).catch(() => {});
          memberService.createMember(newMember).catch(() => {});
        }
      },
    });
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
    const before = captureStoreSlices(['products', 'sales', 'stockMovements']);
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
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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
          tenantId: globalState.account.id,
          facilityId: globalState.currentBranchId,
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

    const after = captureStoreSlices(['products', 'sales', 'stockMovements']);
    const activeCat = getActiveCategoryForBranch(globalState.currentBranchId);
    const touchedIds = new Set(items.map((i) => i.product.id));
    registerUndoEntry({
      vertical: activeCat,
      operationType: 'create',
      summary: ul(
        `Sale #${sale.id.slice(-6).toUpperCase()} (${sale.totalAmount.toLocaleString()})`,
        `Vente #${sale.id.slice(-6).toUpperCase()} (${sale.totalAmount.toLocaleString()})`,
        `عملية بيع #${sale.id.slice(-6).toUpperCase()} (${sale.totalAmount.toLocaleString()})`
      ),
      entityLabel: sale.memberName || `Sale #${sale.id.slice(-6).toUpperCase()}`,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('pos_sales', sale.id, globalState.currentUser?.id).catch(() => {});
          const prevProds = before.products.filter((p) => touchedIds.has(p.id));
          runWithConcurrency(
            prevProds.map((p) => () => posService.upsertProduct(p)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('pos_sales', sale.id, globalState.currentUser?.id).catch(() => {});
          const nextProds = after.products.filter((p) => touchedIds.has(p.id));
          runWithConcurrency(
            nextProds.map((p) => () => posService.upsertProduct(p)),
            4
          ).catch(() => {});
        }
      },
    });

    return sale;
  };

  const refundSale = (saleId: string, reason?: string, itemsToRefund?: RefundLineRequest[]) => {
    const sale = globalState.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'Refunded') return null;

    const clamped = clampPartialRefundItems(sale, itemsToRefund, globalState.stockMovements || []);
    if (clamped.validItems.length === 0) {
      showToast({
        type: 'warning',
        title: ul('Nothing to refund', 'Aucun article à rembourser', 'لا توجد عناصر للاسترجاع'),
        message: ul(
          'All quantities on this receipt have already been returned.',
          'Toutes les quantités de ce ticket ont déjà été retournées.',
          'تم استرجاع جميع الكميات لهذا الإيصال مسبقاً.'
        ),
      });
      return null;
    }

    const before = captureStoreSlices(['products', 'sales', 'stockMovements']);
    const nowIso = new Date().toISOString();
    const shortId = sale.id.slice(-6).toUpperCase();
    const normalizedReason = reason?.trim() || 'Customer Return';
    const movementIds = clamped.validItems.map(() => generateClientUuid());

    const returnMovements: StockMovement[] = [];
    const refundQtyByProductId = new Map<string, number>();
    const refundQtyByProductName = new Map<string, number>();
    clamped.validItems.forEach((line, idx) => {
      if (line.productId) {
        refundQtyByProductId.set(
          line.productId,
          (refundQtyByProductId.get(line.productId) || 0) + line.quantity
        );
      } else {
        refundQtyByProductName.set(
          line.productName,
          (refundQtyByProductName.get(line.productName) || 0) + line.quantity
        );
      }

      const prod = globalState.products.find((p) =>
        line.productId ? p.id === line.productId : p.name === line.productName
      );
      const prev = prod?.stockQuantity ?? 0;
      const next = prev + line.quantity;
      returnMovements.push({
        ...getTraceContext(),
        id: movementIds[idx],
        tenantId: globalState.account.id,
        facilityId: globalState.currentBranchId,
        productId: prod?.id || line.productId,
        productName: prod?.name || line.productName,
        type: 'Return',
        quantity: line.quantity,
        previousStock: prev,
        newStock: next,
        reason: `Refund #${shortId}: ${normalizedReason}`,
        createdAt: nowIso,
        createdBy: globalState.currentUser?.fullName || 'Manager',
      });
    });

    const updatedProducts = globalState.products.map((p) => {
      const addQty = refundQtyByProductId.get(p.id) || refundQtyByProductName.get(p.name) || 0;
      if (addQty <= 0) return p;
      return { ...p, stockQuantity: p.stockQuantity + addQty };
    });

    const prevRefundedItems = Array.isArray(sale.refundedItems) ? sale.refundedItems : [];
    const mergedRefundedItemsMap = new Map<string, { productId: string; productName: string; quantity: number }>();
    [...prevRefundedItems, ...clamped.validItems].forEach((entry) => {
      const key = entry.productId || entry.productName;
      const existing = mergedRefundedItemsMap.get(key);
      if (existing) {
        existing.quantity += entry.quantity;
      } else {
        mergedRefundedItemsMap.set(key, { ...entry });
      }
    });

    globalState = {
      ...globalState,
      products: updatedProducts,
      sales: globalState.sales.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: clamped.isFullRefund ? ('Refunded' as const) : (s.status || 'Completed'),
              refundReason: normalizedReason,
              refundedAt: nowIso,
              refundedItems: Array.from(mergedRefundedItemsMap.values()),
              notes: clamped.isFullRefund
                ? `Refund: ${normalizedReason}`
                : `${s.notes ? `${s.notes} · ` : ''}Partial refund: ${normalizedReason}`,
            }
          : s
      ),
      stockMovements: [...returnMovements, ...(globalState.stockMovements || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      posService
        .refundSaleWithStock({
          branchId: globalState.currentBranchId,
          saleId,
          items: clamped.validItems,
          reason: normalizedReason,
          movementIds,
        })
        .catch(() => {});
    }

    const after = captureStoreSlices(['products', 'sales', 'stockMovements']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `${clamped.isFullRefund ? 'Refunded' : 'Partially refunded'} sale #${shortId}`,
        `${clamped.isFullRefund ? 'Vente remboursée' : 'Avoir partiel'} #${shortId}`,
        `${clamped.isFullRefund ? 'استرجاع كامل' : 'استرجاع جزئي'} #${shortId}`
      ),
      entityLabel: `Sale #${shortId}`,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          posService
            .undoRefundSaleWithStock({
              branchId: globalState.currentBranchId,
              saleId,
              movementIds,
              prevStatus: sale.status || 'Completed',
              prevNotes: sale.notes || null,
            })
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          posService
            .refundSaleWithStock({
              branchId: globalState.currentBranchId,
              saleId,
              items: clamped.validItems,
              reason: normalizedReason,
              movementIds,
            })
            .catch(() => {});
        }
      },
    });

    return {
      clamped,
      movementIds,
    };
  };

  const adjustStock = (
    productId: string,
    quantity: number,
    mode: 'delta' | 'set',
    reason: string,
    type: StockMovement['type'] = 'Adjustment'
  ) => {
    const before = captureStoreSlices(['products', 'stockMovements']);
    let movement: StockMovement | null = null;
    const updatedProducts = globalState.products.map((p) => {
      if (p.id === productId) {
        const prev = p.stockQuantity;
        const next = mode === 'set' ? Math.max(0, quantity) : Math.max(0, prev + quantity);
        const delta = next - prev;
        movement = {
          ...getTraceContext(),
          id: `sm_${Date.now()}_${p.id}`,
          tenantId: globalState.account.id,
          facilityId: globalState.currentBranchId,
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

    if (isSupabaseConfigured()) {
      const targetProd = updatedProducts.find((p) => p.id === productId);
      if (targetProd) {
        (isTradingCategory()
          ? tradingService.upsertProduct(targetProd)
          : posService.upsertProduct(targetProd)
        ).catch(() => {});
      }
      if (movement) {
        const mv: StockMovement = movement;
        const dbMovementType =
          mv.type === 'Sale'
            ? 'sale'
            : mv.type === 'Restock'
            ? 'in'
            : mv.type === 'Return'
            ? 'refund'
            : 'adjustment';
        const mvPayload = {
          id: toValidUuid(mv.id),
          account_id: toValidUuid(globalState.account.id),
          business_id: toValidUuid(globalState.currentBusinessId),
          branch_id: toValidUuid(globalState.currentBranchId),
          staff_id: normalizeUuidOrNull(globalState.currentUser?.id),
          updated_by_staff_id: normalizeUuidOrNull(globalState.currentUser?.id),
          device_id: getActiveDeviceId(),
          product_id: toValidUuid(mv.productId),
          product_name: mv.productName,
          movement_type: dbMovementType,
          quantity: mv.quantity,
          previous_stock: mv.previousStock,
          new_stock: mv.newStock,
          reason: mv.reason || null,
        };
        syncCoordinator
          .mutateOrQueueUpsert('pos_stock_movements', mvPayload, {
            expectedVersion: mv.version,
            entityType: 'StockMovement',
            entityLabel: mv.productName,
            localData: mvPayload,
          })
          .catch(() => {});
      }
    }

    if (movement) {
      const mv: StockMovement = movement;
      const after = captureStoreSlices(['products', 'stockMovements']);
      const tradingMode = isTradingCategory();
      registerUndoEntry({
        vertical: tradingMode ? 'trading_commercial' : 'pos_inventory',
        operationType: 'edit',
        summary: ul(
          `Stock ${mv.productName}: ${mv.previousStock} → ${mv.newStock}`,
          `Stock ${mv.productName} : ${mv.previousStock} → ${mv.newStock}`,
          `تعديل المخزون ${mv.productName}: ${mv.previousStock} → ${mv.newStock}`
        ),
        entityLabel: mv.productName,
        toastType: 'info',
        toastTitle: ul('Inventory Adjusted', 'Stock Ajusté', 'تم تعديل المخزون'),
        toastMessage: `${mv.productName} : ${mv.previousStock} → ${mv.newStock} (${reason}).`,
        undo: () => {
          restoreStoreSlices(before);
          const prevProd = before.products.find((p) => p.id === productId);
          if (prevProd && isSupabaseConfigured()) {
            (tradingMode ? tradingService.upsertProduct(prevProd) : posService.upsertProduct(prevProd)).catch(() => {});
          }
        },
        redo: () => {
          restoreStoreSlices(after);
          const nextProd = after.products.find((p) => p.id === productId);
          if (nextProd && isSupabaseConfigured()) {
            (tradingMode ? tradingService.upsertProduct(nextProd) : posService.upsertProduct(nextProd)).catch(() => {});
          }
        },
      });
    }
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    const prevProd = globalState.products.find((p) => p.id === productId);
    if (!prevProd) return;
    const before = captureStoreSlices(['products']);
    const updatedProducts = globalState.products.map((p) =>
      p.id === productId ? { ...p, ...updates } : p
    );
    globalState = {
      ...globalState,
      products: updatedProducts,
    };
    notify();

    const target = updatedProducts.find((p) => p.id === productId);
    const tradingMode = isTradingCategory();
    if (target && isSupabaseConfigured()) {
      (tradingMode
        ? tradingService.upsertProduct(target)
        : posService.upsertProduct(target)
      ).catch(() => {});
    }

    const after = captureStoreSlices(['products']);
    registerUndoEntry({
      vertical: tradingMode ? 'trading_commercial' : 'pos_inventory',
      operationType: 'edit',
      summary: ul(
        `Updated product ${target?.name || prevProd.name}`,
        `Produit modifié : ${target?.name || prevProd.name}`,
        `تعديل المنتج: ${target?.name || prevProd.name}`
      ),
      entityLabel: target?.name || prevProd.name,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          (tradingMode ? tradingService.upsertProduct(prevProd) : posService.upsertProduct(prevProd)).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          (tradingMode ? tradingService.upsertProduct(target) : posService.upsertProduct(target)).catch(() => {});
        }
      },
    });
  };

  const deleteProduct = (productId: string) => {
    const target = globalState.products.find((p) => p.id === productId);
    if (!target) return;
    const before = captureStoreSlices(['products']);
    globalState = {
      ...globalState,
      products: globalState.products.filter((p) => p.id !== productId),
    };
    notify();

    const tradingMode = isTradingCategory();
    if (isSupabaseConfigured()) {
      (tradingMode
        ? tradingService.deleteProduct(productId, globalState.currentUser?.id)
        : posService.deleteProduct(productId, globalState.currentUser?.id)
      ).catch(() => {});
    }

    const after = captureStoreSlices(['products']);
    registerUndoEntry({
      vertical: tradingMode ? 'trading_commercial' : 'pos_inventory',
      operationType: 'delete',
      summary: ul(
        `Removed product ${target.name}`,
        `Produit supprimé : ${target.name}`,
        `حذف المنتج: ${target.name}`
      ),
      entityLabel: target.name,
      toastType: 'warning',
      toastTitle: ul('Product Removed', 'Produit Supprimé', 'تم حذف المنتج'),
      toastMessage: `${target.name} removed from inventory.`,
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow(tradingMode ? 'trading_products' : 'pos_products', productId, globalState.currentUser?.id)
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          (tradingMode
            ? tradingService.deleteProduct(productId, globalState.currentUser?.id)
            : posService.deleteProduct(productId, globalState.currentUser?.id)
          ).catch(() => {});
        }
      },
    });
  };

  const deleteSale = (saleId: string) => {
    const target = globalState.sales.find((s) => s.id === saleId);
    if (!target) return;
    const before = captureStoreSlices(['sales']);
    globalState = {
      ...globalState,
      sales: globalState.sales.filter((s) => s.id !== saleId),
    };
    notify();
    if (isSupabaseConfigured()) {
      syncCoordinator.softDeleteRow('pos_sales', saleId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['sales']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted sale #${saleId.slice(-6).toUpperCase()}`,
        `Vente supprimée #${saleId.slice(-6).toUpperCase()}`,
        `حذف عملية بيع #${saleId.slice(-6).toUpperCase()}`
      ),
      entityLabel: target.memberName || `Sale #${saleId.slice(-6).toUpperCase()}`,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('pos_sales', saleId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('pos_sales', saleId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const batchDeleteSales = (saleIds: string[]) => {
    if (saleIds.length === 0) return;
    const before = captureStoreSlices(['sales']);
    const idSet = new Set(saleIds);
    globalState = {
      ...globalState,
      sales: globalState.sales.filter((s) => !idSet.has(s.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        saleIds.map((id) => () =>
          syncCoordinator.softDeleteRow('pos_sales', id, globalState.currentUser?.id)
        ),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['sales']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: saleIds.length,
      summary: ul(
        `Deleted ${saleIds.length} sale(s)`,
        `${saleIds.length} vente(s) supprimée(s)`,
        `حذف ${saleIds.length} مبيعات`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            saleIds.map((id) => () => syncCoordinator.restoreRow('pos_sales', id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            saleIds.map((id) => () => syncCoordinator.softDeleteRow('pos_sales', id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const upsertScheduleEvent = (event: ScheduleEvent) => {
    const activeAccountId =
      (event.tenantId && event.tenantId !== INITIAL_ACCOUNT.id ? event.tenantId : undefined) ||
      globalState.account?.id?.trim();
    if (!activeAccountId || !globalState.currentBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', globalState.language),
        message: t('tenant_context_missing_msg', globalState.language),
      });
      return;
    }
    const before = captureStoreSlices(['schedule']);
    const scoped: ScheduleEvent = {
      ...getTraceContext(),
      ...event,
      tenantId: activeAccountId,
      facilityId: event.facilityId || globalState.currentBranchId,
      businessId: event.businessId || globalState.currentBusinessId,
      branchId: event.branchId || globalState.currentBranchId,
      staffId: event.staffId || globalState.currentUser?.id,
    };
    const existingItem = (globalState.schedule || []).find((sc) => sc.id === scoped.id);
    const existing = Boolean(existingItem);
    globalState = {
      ...globalState,
      schedule: existing
        ? (globalState.schedule || []).map((sc) => (sc.id === scoped.id ? scoped : sc))
        : [scoped, ...(globalState.schedule || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService
        .upsertScheduleEvent(scoped, {
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: globalState.currentBranchId,
          staffId: globalState.currentUser?.id,
        })
        .catch(() => {});
    }

    const after = captureStoreSlices(['schedule']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: existing ? 'edit' : 'create',
      summary: ul(
        `${existing ? 'Updated' : 'Created'} session: ${scoped.title}`,
        `${existing ? 'Séance modifiée' : 'Séance créée'} : ${scoped.title}`,
        `${existing ? 'تعديل حصة' : 'إنشاء حصة'}: ${scoped.title}`
      ),
      entityLabel: scoped.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          if (existingItem) {
            memberService
              .upsertScheduleEvent(existingItem, {
                accountId: globalState.account.id,
                businessId: globalState.currentBusinessId,
                branchId: globalState.currentBranchId,
                staffId: globalState.currentUser?.id,
              })
              .catch(() => {});
          } else {
            memberService.deleteScheduleEvent(scoped.id, globalState.currentUser?.id).catch(() => {});
          }
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          if (!existing) {
            syncCoordinator.restoreRow('gym_schedule_events', scoped.id, globalState.currentUser?.id).catch(() => {});
          }
          memberService
            .upsertScheduleEvent(scoped, {
              accountId: globalState.account.id,
              businessId: globalState.currentBusinessId,
              branchId: globalState.currentBranchId,
              staffId: globalState.currentUser?.id,
            })
            .catch(() => {});
        }
      },
    });

    return scoped;
  };

  const deleteScheduleEvent = (eventId: string) => {
    const existingItem = (globalState.schedule || []).find((sc) => sc.id === eventId);
    if (!existingItem) return;
    const before = captureStoreSlices(['schedule']);
    globalState = {
      ...globalState,
      schedule: (globalState.schedule || []).filter((sc) => sc.id !== eventId),
    };
    notify();
    if (isSupabaseConfigured()) {
      memberService.deleteScheduleEvent(eventId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['schedule']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted session: ${existingItem.title}`,
        `Séance supprimée : ${existingItem.title}`,
        `حذف الحصة: ${existingItem.title}`
      ),
      entityLabel: existingItem.title,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_schedule_events', eventId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          memberService.deleteScheduleEvent(eventId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const batchDeleteScheduleEvents = (eventIds: string[]) => {
    if (eventIds.length === 0) return;
    const before = captureStoreSlices(['schedule']);
    const idSet = new Set(eventIds);
    globalState = {
      ...globalState,
      schedule: (globalState.schedule || []).filter((sc) => !idSet.has(sc.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        eventIds.map((id) => () => memberService.deleteScheduleEvent(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['schedule']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: eventIds.length,
      summary: ul(
        `Deleted ${eventIds.length} session(s)`,
        `${eventIds.length} séance(s) supprimée(s)`,
        `حذف ${eventIds.length} حصص`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            eventIds.map((id) => () => syncCoordinator.restoreRow('gym_schedule_events', id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            eventIds.map((id) => () => memberService.deleteScheduleEvent(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const openShopForMember = (memberId: string) => {
    globalState = {
      ...globalState,
      pendingShopMemberId: memberId,
      isDetailOpen: false,
    };
    setScreenAction('shop');
  };

  const clearPendingShopMember = () => {
    if (!globalState.pendingShopMemberId) return;
    globalState = { ...globalState, pendingShopMemberId: null };
    notify();
  };

  const enrollMemberInClass = (
    eventId: string,
    memberId: string,
    notes?: string
  ): {
    success: boolean;
    status?: 'enrolled' | 'waitlisted';
    error?: 'EVENT_NOT_FOUND' | 'MEMBER_NOT_FOUND' | 'DUPLICATE_ENROLLMENT';
  } => {
    const targetEvent = (globalState.schedule || []).find((sc) => sc.id === eventId);
    if (!targetEvent) return { success: false, error: 'EVENT_NOT_FOUND' };
    const targetMember = (globalState.members || []).find((m) => m.id === memberId);
    if (!targetMember) return { success: false, error: 'MEMBER_NOT_FOUND' };

    const check = evaluateClassEnrollment({
      eventId,
      memberId,
      capacity: targetEvent.capacity,
      enrolledCount: targetEvent.enrolledCount,
      existingEnrollments: globalState.classEnrollments || [],
    });

    if (!check.allowed || !check.assignedStatus) {
      return { success: false, error: 'DUPLICATE_ENROLLMENT' };
    }

    const before = captureStoreSlices(['schedule', 'classEnrollments']);
    const trace = getTraceContext();
    const enrollment: GymClassEnrollment = {
      id: `enr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...trace,
      branchId: targetEvent.branchId || globalState.currentBranchId,
      eventId,
      memberId,
      memberName: targetMember.fullName,
      status: check.assignedStatus,
      enrolledAt: new Date().toISOString(),
      notes,
    };

    const updatedEvent: ScheduleEvent = {
      ...targetEvent,
      enrolledCount: check.nextEnrolledCount,
    };

    globalState = {
      ...globalState,
      classEnrollments: [enrollment, ...(globalState.classEnrollments || [])],
      schedule: (globalState.schedule || []).map((sc) =>
        sc.id === eventId ? updatedEvent : sc
      ),
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService
        .upsertClassEnrollment(enrollment, {
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: targetEvent.branchId || globalState.currentBranchId,
          staffId: globalState.currentUser?.id,
        })
        .catch(() => {});
      if (check.assignedStatus === 'enrolled') {
        memberService
          .upsertScheduleEvent(updatedEvent, {
            accountId: globalState.account.id,
            businessId: globalState.currentBusinessId,
            branchId: targetEvent.branchId || globalState.currentBranchId,
            staffId: globalState.currentUser?.id,
          })
          .catch(() => {});
      }
    }

    const after = captureStoreSlices(['schedule', 'classEnrollments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `${targetMember.fullName} ${check.assignedStatus === 'waitlisted' ? 'waitlisted for' : 'enrolled in'} ${targetEvent.title}`,
        `${targetMember.fullName} ${check.assignedStatus === 'waitlisted' ? 'en liste d’attente pour' : 'inscrit à'} ${targetEvent.title}`,
        `${check.assignedStatus === 'waitlisted' ? 'قائمة انتظار' : 'تسجيل'} ${targetMember.fullName} في ${targetEvent.title}`
      ),
      entityLabel: targetMember.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.deleteClassEnrollment(enrollment.id, globalState.currentUser?.id).catch(() => {});
          memberService.upsertScheduleEvent(targetEvent).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_class_enrollments', enrollment.id, globalState.currentUser?.id).catch(() => {});
          memberService.upsertClassEnrollment(enrollment).catch(() => {});
          memberService.upsertScheduleEvent(updatedEvent).catch(() => {});
        }
      },
    });

    return { success: true, status: check.assignedStatus };
  };

  const confirmScheduleCoach = (eventId: string) => {
    const targetEvent = (globalState.schedule || []).find((sc) => sc.id === eventId);
    if (!targetEvent || targetEvent.coachConfirmed) return;
    const before = captureStoreSlices(['schedule']);
    const updatedEvent: ScheduleEvent = {
      ...targetEvent,
      coachConfirmed: true,
      coachConfirmedAt: new Date().toISOString(),
      coachConfirmedBy: globalState.currentUser?.id,
    };

    globalState = {
      ...globalState,
      schedule: (globalState.schedule || []).map((sc) =>
        sc.id === eventId ? updatedEvent : sc
      ),
    };
    notify();

    if (isSupabaseConfigured()) {
      memberService
        .upsertScheduleEvent(updatedEvent, {
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: targetEvent.branchId || globalState.currentBranchId,
          staffId: globalState.currentUser?.id,
        })
        .catch(() => {});
    }

    const after = captureStoreSlices(['schedule']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Coach confirmed: ${targetEvent.trainerOrStaff} (${targetEvent.title})`,
        `Coach confirmé : ${targetEvent.trainerOrStaff} (${targetEvent.title})`,
        `تم تأكيد المدرب: ${targetEvent.trainerOrStaff} (${targetEvent.title})`
      ),
      entityLabel: targetEvent.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.upsertScheduleEvent(targetEvent).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          memberService.upsertScheduleEvent(updatedEvent).catch(() => {});
        }
      },
    });
  };

  const duplicateScheduleWeek = (options?: { selectedIds?: string[]; dayOffset?: number }) => {
    const currentBranchSchedule = selectCurrentScheduleFromState(globalState);
    const plan = planWeekDuplication(currentBranchSchedule, {
      selectedIds: options?.selectedIds,
      dayOffset: options?.dayOffset ?? 1,
      generateId: (_src, idx) => `sched_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
    });

    if (plan.created.length === 0) {
      return plan;
    }

    const before = captureStoreSlices(['schedule']);
    const scopedCreated = plan.created.map((ev) => ({
      ...ev,
      ...getTraceContext(),
      facilityId: globalState.currentBranchId,
      branchId: globalState.currentBranchId,
      coachConfirmed: false,
      coachConfirmedAt: undefined,
      coachConfirmedBy: undefined,
    }));

    globalState = {
      ...globalState,
      schedule: [...scopedCreated, ...(globalState.schedule || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      runWithConcurrency(
        scopedCreated.map((ev) => () =>
          memberService.upsertScheduleEvent(ev, {
            accountId: globalState.account.id,
            businessId: globalState.currentBusinessId,
            branchId: globalState.currentBranchId,
            staffId: globalState.currentUser?.id,
          })
        ),
        4
      ).catch(() => {});
    }

    const after = captureStoreSlices(['schedule']);
    const createdIds = scopedCreated.map((e) => e.id);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: scopedCreated.length,
      summary: ul(
        `Duplicated ${scopedCreated.length} session(s) (${plan.conflicts.length} conflict(s) skipped)`,
        `${scopedCreated.length} séance(s) dupliquée(s) (${plan.conflicts.length} conflit(s) ignoré(s))`,
        `تم تكرار ${scopedCreated.length} حصة (تجاوز ${plan.conflicts.length} تعارض)`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            createdIds.map((id) => () => memberService.deleteScheduleEvent(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            scopedCreated.map((ev) => () =>
              syncCoordinator
                .restoreRow('gym_schedule_events', ev.id, globalState.currentUser?.id)
                .then(() => memberService.upsertScheduleEvent(ev))
            ),
            4
          ).catch(() => {});
        }
      },
    });

    return plan;
  };

  const createStaffMember = (staffData: Omit<StaffMember, 'id' | 'tenantId' | 'facilityId'>) => {
    const before = captureStoreSlices(['staff']);
    const trace = getTraceContext();
    const newStaff: StaffMember = {
      ...trace,
      ...staffData,
      id: `stf_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      branchId: globalState.currentBranchId,
      isActive: staffData.status ? staffData.status === 'active' : true,
      status: staffData.status || 'active',
      hireDate: staffData.hireDate || new Date().toISOString().split('T')[0],
      salary: staffData.salary || 0,
      paymentDay: staffData.paymentDay || 28,
      allowedModules: staffData.allowedModules || ['all'],
      isClockedInToday: false,
    };

    globalState = {
      ...globalState,
      staff: [newStaff, ...globalState.staff],
    };
    notify();

    if (isSupabaseConfigured()) {
      staffService.createStaff(newStaff).catch(() => {});
    }

    const after = captureStoreSlices(['staff']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added staff member: ${newStaff.fullName}`,
        `Collaborateur créé : ${newStaff.fullName}`,
        `تمت إضافة موظف: ${newStaff.fullName}`
      ),
      entityLabel: newStaff.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          staffService.deleteStaff(newStaff.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('staff', newStaff.id, globalState.currentUser?.id)
            .then(() => staffService.createStaff(newStaff))
            .catch(() => {});
        }
      },
    });

    return newStaff;
  };

  const updateStaffMember = (id: string, updates: Partial<StaffMember>) => {
    const target = globalState.staff.find((s) => s.id === id);
    if (!target) return;

    if (updates.status && updates.status !== 'active') {
      if (isSoleActiveOwner(id, globalState.staff)) {
        throw new Error('Impossible de modifier le statut : ce collaborateur est le seul propriétaire actif de l\'établissement.');
      }
    }

    const before = captureStoreSlices(['staff']);
    const updatedStaffList = globalState.staff.map((s) =>
      s.id === id
        ? {
            ...s,
            ...updates,
            isActive: updates.status ? updates.status === 'active' : (updates.isActive ?? s.isActive),
          }
        : s
    );

    globalState = {
      ...globalState,
      staff: updatedStaffList,
    };
    notify();

    const updated = updatedStaffList.find((s) => s.id === id);
    if (updated && isSupabaseConfigured()) {
      staffService.updateStaff(updated).catch(() => {});
    }

    const after = captureStoreSlices(['staff']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.status && updates.status !== target.status ? 'status' : 'edit',
      summary: ul(
        `Updated staff member: ${target.fullName}`,
        `Fiche mise à jour : ${target.fullName}`,
        `تحديث بيانات الموظف: ${target.fullName}`
      ),
      entityLabel: target.fullName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          staffService.updateStaff(target).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          staffService.updateStaff(updated).catch(() => {});
        }
      },
    });
  };

  const freezeStaffMember = (id: string) => {
    if (isSoleActiveOwner(id, globalState.staff)) {
      throw new Error('Action refusée : le seul propriétaire actif ne peut pas être gelé.');
    }
    const target = globalState.staff.find((s) => s.id === id);
    if (!target) return;
    const before = captureStoreSlices(['staff']);
    const updatedStaffList = globalState.staff.map((s) =>
      s.id === id ? { ...s, status: 'frozen' as const, isActive: false } : s
    );
    globalState = {
      ...globalState,
      staff: updatedStaffList,
    };
    notify();
    const updated = updatedStaffList.find((s) => s.id === id);
    if (updated && isSupabaseConfigured()) {
      staffService.updateStaff(updated).catch(() => {});
    }
    const after = captureStoreSlices(['staff']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Froze staff account: ${target.fullName}`,
        `Compte gelé : ${target.fullName}`,
        `تجميد حساب الموظف: ${target.fullName}`
      ),
      entityLabel: target.fullName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          staffService.updateStaff(target).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          staffService.updateStaff(updated).catch(() => {});
        }
      },
    });
  };

  const vacationStaffMember = (id: string, vacationUntil?: string) => {
    if (isSoleActiveOwner(id, globalState.staff)) {
      const lang = globalState.language || 'fr';
      throw new Error(
        lang === 'ar'
          ? 'الإجراء مرفوض: لا يمكن وضع المالك الوحيد النشط في عطلة.'
          : lang === 'en'
          ? 'Action denied: the sole active owner cannot be placed on leave.'
          : 'Action refusée : le seul propriétaire actif ne peut pas être mis en congé.'
      );
    }
    const target = globalState.staff.find((s) => s.id === id);
    if (!target) return;
    const before = captureStoreSlices(['staff']);
    const updatedStaffList = globalState.staff.map((s) =>
      s.id === id
        ? {
            ...s,
            status: 'vacation' as const,
            isActive: false,
            vacationUntil: vacationUntil || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          }
        : s
    );
    globalState = {
      ...globalState,
      staff: updatedStaffList,
    };
    notify();
    const updated = updatedStaffList.find((s) => s.id === id);
    if (updated && isSupabaseConfigured()) {
      staffService.updateStaff(updated).catch(() => {});
    }
    const after = captureStoreSlices(['staff']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Marked on leave: ${target.fullName}`,
        `En congé : ${target.fullName}`,
        `في عطلة: ${target.fullName}`
      ),
      entityLabel: target.fullName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          staffService.updateStaff(target).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          staffService.updateStaff(updated).catch(() => {});
        }
      },
    });
  };

  const terminateStaffMember = (id: string, terminationDate?: string) => {
    if (isSoleActiveOwner(id, globalState.staff)) {
      throw new Error('Action refusée : le seul propriétaire actif ne peut pas être arrêté définitivement.');
    }
    const target = globalState.staff.find((s) => s.id === id);
    if (!target) return;
    const before = captureStoreSlices(['staff']);
    const updatedStaffList = globalState.staff.map((s) =>
      s.id === id
        ? {
            ...s,
            status: 'terminated' as const,
            isActive: false,
            terminationDate: terminationDate || new Date().toISOString().split('T')[0],
          }
        : s
    );
    globalState = {
      ...globalState,
      staff: updatedStaffList,
    };
    notify();
    const updated = updatedStaffList.find((s) => s.id === id);
    if (updated && isSupabaseConfigured()) {
      staffService.updateStaff(updated).catch(() => {});
    }
    const after = captureStoreSlices(['staff']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Terminated contract: ${target.fullName}`,
        `Contrat arrêté : ${target.fullName}`,
        `إنهاء عقد الموظف: ${target.fullName}`
      ),
      entityLabel: target.fullName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          staffService.updateStaff(target).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          staffService.updateStaff(updated).catch(() => {});
        }
      },
    });
  };

  const deleteStaffMember = (id: string) => {
    if (isSoleActiveOwner(id, globalState.staff)) {
      throw new Error('Action refusée : suppression interdite du seul propriétaire actif.');
    }
    const target = globalState.staff.find((s) => s.id === id);
    if (!target) return;
    const before = captureStoreSlices(['staff']);
    globalState = {
      ...globalState,
      staff: globalState.staff.filter((s) => s.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      staffService.deleteStaff(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['staff']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted staff member: ${target.fullName}`,
        `Collaborateur supprimé : ${target.fullName}`,
        `تم حذف الموظف: ${target.fullName}`
      ),
      entityLabel: target.fullName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('staff', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          staffService.deleteStaff(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const punchStaffAttendance = (idOrToken: string) => {
    const clean = idOrToken.trim().toUpperCase();
    const target = globalState.staff.find(
      (s) =>
        s.id === idOrToken ||
        (s.cardId && s.cardId.toUpperCase() === clean) ||
        (s.pinCode && s.pinCode === idOrToken) ||
        normalizePhone(s.phoneNumber) === normalizePhone(idOrToken)
    );

    if (!target) {
      showToast({
        type: 'warning',
        title: 'Badge ou identifiant non reconnu',
        message: `Aucun membre ne correspond au badge ou code : ${idOrToken}`,
      });
      return { success: false, message: 'Badge non reconnu' };
    }

    if (target.status === 'terminated' || target.status === 'frozen') {
      showToast({
        type: 'warning',
        title: 'Accès refusé',
        message: `${target.fullName} est actuellement marqué comme ${target.status === 'frozen' ? 'gelé' : 'résilié'}. Pointage bloqué.`,
      });
      return { success: false, message: 'Membre inactif' };
    }

    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const isClockingIn = !target.isClockedInToday;

    const logMethod: 'pin' | 'rfid' | 'kiosk' =
      target.pinCode === idOrToken
        ? 'pin'
        : (target.cardId && target.cardId.toUpperCase() === clean) ||
          (target.badgeToken && target.badgeToken.toUpperCase() === clean)
        ? 'rfid'
        : 'kiosk';

    const newLogEntry: StaffAttendanceLogRecord = {
      id: generateClientUuid(),
      accountId: target.accountId || globalState.account.id,
      businessId: target.businessId || globalState.currentBusinessId,
      branchId: target.branchId || target.facilityId || globalState.currentBranchId,
      staffId: target.id,
      staffName: target.fullName,
      staffRole: target.role,
      timestamp: nowIso,
      date: todayStr,
      type: isClockingIn ? 'in' : 'out',
      method: logMethod,
      source: logMethod,
      enteredBy: globalState.currentUser?.id,
      enteredByName: globalState.currentUser?.fullName,
      terminalId: 'KIOSK_DESK_MAIN',
      notes: isClockingIn ? 'Pointage d\'arrivée enregistré' : 'Pointage de sortie enregistré',
    };

    globalState = {
      ...globalState,
      staff: globalState.staff.map((s) =>
        s.id === target.id
          ? {
              ...s,
              isClockedInToday: isClockingIn,
              lastClockInTime: isClockingIn ? nowTime : s.lastClockInTime,
              lastClockOutTime: !isClockingIn ? nowTime : s.lastClockOutTime,
            }
          : s
      ),
      staffAttendanceLogs: [newLogEntry, ...(globalState.staffAttendanceLogs || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      staffService.upsertAttendanceLog(newLogEntry).catch(() => {});
    }

    return {
      success: true,
      staff: target,
      action: isClockingIn ? 'clock_in' : 'clock_out',
      time: nowTime,
    };
  };

  const createStaffSalaryAdvance = (data: {
    staffId: string;
    staffName: string;
    amountDzd: number;
    paymentMethod: 'cash' | 'ccp' | 'bank_transfer';
    reason?: string;
  }) => {
    const before = captureStoreSlices(['staffSalaryAdvances']);
    const newAdvance: StaffSalaryAdvance = {
      id: generateClientUuid(),
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId: globalState.currentBranchId,
      staffId: data.staffId,
      staffName: data.staffName,
      amountDzd: data.amountDzd,
      dateIssued: new Date().toISOString().slice(0, 10),
      paymentMethod: data.paymentMethod,
      reason: data.reason || 'Acompte sur salaire',
      voucherNumber: `VCH-ACP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      status: 'pending',
    };
    globalState = {
      ...globalState,
      staffSalaryAdvances: [newAdvance, ...(globalState.staffSalaryAdvances || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      staffService.upsertSalaryAdvance(newAdvance).catch(() => {});
    }
    const after = captureStoreSlices(['staffSalaryAdvances']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Salary advance: ${data.staffName} (${data.amountDzd.toLocaleString()} DZD)`,
        `Acompte enregistré : ${data.staffName} (${data.amountDzd.toLocaleString()} DZD)`,
        `تسبيق راتب: ${data.staffName} (${data.amountDzd.toLocaleString()} دج)`
      ),
      entityLabel: data.staffName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('staff_salary_advances', newAdvance.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('staff_salary_advances', newAdvance.id, globalState.currentUser?.id)
            .then(() => staffService.upsertSalaryAdvance(newAdvance))
            .catch(() => {});
        }
      },
    });
    return newAdvance;
  };

  const waiveStaffSalaryAdvance = (advanceId: string) => {
    const prevTarget = (globalState.staffSalaryAdvances || []).find((a) => a.id === advanceId);
    if (!prevTarget) return;
    if (prevTarget.status === 'deducted' || prevTarget.status === 'waived') {
      showToast({
        type: 'warning',
        title: ul('Advance locked', 'Acompte verrouillé', 'التسبيق مقفل'),
        message: ul(
          'Deducted or waived salary advances are immutable.',
          'Les acomptes déduits ou remis sont immuables.',
          'التسبيقات المخصومة أو الملغاة غير قابلة للتعديل.'
        ),
      });
      return;
    }

    const updatedAdvances = (globalState.staffSalaryAdvances || []).map((a) =>
      a.id === advanceId ? { ...a, status: 'waived' as const } : a
    );
    globalState = {
      ...globalState,
      staffSalaryAdvances: updatedAdvances,
    };
    notify();

    if (isSupabaseConfigured()) {
      staffService.waiveSalaryAdvance(prevTarget).catch(() => {});
    }

    showToast({
      type: 'info',
      title: ul('Salary advance waived', 'Acompte remis / annulé', 'تم إلغاء التسبيق'),
      message: `${prevTarget.staffName} · ${prevTarget.voucherNumber}`,
    });
  };

  const generateStaffPayrollRun = (
    month: number,
    year: number,
    category = 'membership_session',
    options?: { isAdjustment?: boolean }
  ) => {
    const businessId = globalState.currentBusinessId;
    const branchId = globalState.currentBranchId;
    const periodRuns = (globalState.staffPayrollRuns || []).filter((r) => {
      const bizOk = !businessId || !r.businessId || r.businessId === businessId;
      const brOk = !branchId || !r.branchId || r.branchId === branchId;
      return bizOk && brOk && r.periodYear === year && r.periodMonth === month;
    });
    const existingRegularRun = periodRuns.find((r) => (r.runType || 'regular') === 'regular');

    if (existingRegularRun && existingRegularRun.status !== 'draft' && !options?.isAdjustment) {
      showToast({
        type: 'warning',
        title: ul(
          'Payroll period locked',
          'Période déjà clôturée',
          'فترة الرواتب معتمدة'
        ),
        message: ul(
          'The regular payroll run is approved/paid. Generate an Adjustment Run instead.',
          'La paie régulière est validée/payée. Créez un cycle d\'ajustement à la place.',
          'كشف الرواتب الأساسي معتمد أو مدفوع. أنشئ كشف تسوية بدلاً من ذلك.'
        ),
      });
      return null;
    }

    const activeRateSet = globalState.effectiveStatutoryRate ?? getLocalCodeBaselineStatutoryRate();
    const isAdjustment = Boolean(options?.isAdjustment);
    const runType: 'regular' | 'adjustment' = isAdjustment ? 'adjustment' : 'regular';
    const adjustmentSeq = isAdjustment
      ? resolveNextAdjustmentSeq(globalState.staffPayrollRuns || [], businessId, branchId, year, month)
      : 0;

    const before = captureStoreSlices(['staffPayrollRuns', 'staffPayrollSlips']);
    const dateObj = new Date(year, month - 1, 1);
    const periodMonthName = dateObj.toLocaleString('fr-FR', { month: 'long' });
    const capitalizedPeriod = periodMonthName.charAt(0).toUpperCase() + periodMonthName.slice(1) + ' ' + year;
    const runId = !isAdjustment && existingRegularRun
      ? existingRegularRun.id
      : generateClientUuid();

    const staffPool = (globalState.staff || []).filter((s) => {
      if (s.status === 'terminated') return false;
      if (branchId && s.branchId && s.branchId !== branchId) return false;
      return true;
    });

    let totalGross = 0;
    let totalCnasSal = 0;
    let totalCnasPat = 0;
    let totalIrg = 0;
    let totalNet = 0;
    let totalCarryover = 0;

    const existingSlipsForRun = new Map(
      (globalState.staffPayrollSlips || [])
        .filter((s) => s.payrollRunId === runId)
        .map((s) => [s.staffId, s])
    );

    const slips: StaffPayrollSlipRecord[] = staffPool.map((member, idx) => {
      const pendingAdvances = isAdjustment
        ? []
        : (globalState.staffSalaryAdvances || []).filter(
            (a) => a.staffId === member.id && a.status === 'pending'
          );
      const advancesSum = pendingAdvances.reduce((sum, a) => sum + a.amountDzd, 0);

      const coachingCommission = member.serviceCommissionRate ? (member.salary * member.serviceCommissionRate) / 100 : 0;
      const primesCotisables = coachingCommission > 0 ? [{ label: 'Commissions Séances & Pass', amount: Math.round(coachingCommission) }] : [];

      const calc = calculateAlgerianGrossToNet({
        baseSalary: member.salary || 50000,
        workedDays: 22,
        standardDays: 22,
        primesCotisables,
        advancesDeducted: advancesSum,
        statutoryRateSet: activeRateSet,
      });

      totalGross += calc.salaireBrutCotisable;
      totalCnasSal += calc.cnasSalarial;
      totalCnasPat += calc.cnasPatronal;
      totalIrg += calc.irgTax;
      totalNet += calc.netAPayer;
      totalCarryover += calc.advanceCarryover;

      const existingSlip = existingSlipsForRun.get(member.id);

      return {
        id: existingSlip?.id || generateClientUuid(),
        payrollRunId: runId,
        staffId: member.id,
        matricule: existingSlip?.matricule || `MAT-GYM-${String(idx + 1).padStart(3, '0')}`,
        staffFullName: member.fullName,
        role: member.role,
        periodMonth: month,
        periodYear: year,
        periodLabel: isAdjustment ? `${capitalizedPeriod} (Aj. #${adjustmentSeq})` : capitalizedPeriod,
        baseSalary: calc.baseSalary,
        actualBaseSalary: calc.actualBaseSalary,
        workedDays: calc.workedDays,
        standardDays: calc.standardDays,
        coachingCommission: Math.round(coachingCommission),
        primesCotisables: calc.primesCotisables,
        salaireBrutCotisable: calc.salaireBrutCotisable,
        cnasSalarial: calc.cnasSalarial,
        cnasPatronal: calc.cnasPatronal,
        salaireBrutImposable: calc.salaireBrutImposable,
        irgTax: calc.irgTax,
        primesNonImposables: calc.primesNonImposables,
        acomptesDeduits: calc.acomptesDeduits,
        advanceCarryover: calc.advanceCarryover,
        autresRetenues: calc.autresRetenues,
        netAPayer: calc.netAPayer,
        paymentMethod: member.paymentMethod || 'cash',
        ccpNumber: member.ccpNumber,
        ccpKey: member.ccpKey,
        bankRib: member.bankRib,
        nss: member.nss || existingSlip?.nss,
        isPaid: false,
        receiptNumber: existingSlip?.receiptNumber || `FP-${year}-${String(month).padStart(2, '0')}-${isAdjustment ? `A${adjustmentSeq}-` : ''}${String(idx + 1).padStart(3, '0')}`,
        rateSetId: calc.rateSetId,
        rateBasis: calc.rateBasis,
        rateSnapshot: calc.rateSnapshot,
        version: existingSlip?.version,
      };
    });

    const newRun: StaffPayrollRunRecord = {
      id: runId,
      accountId: globalState.account.id,
      businessId,
      branchId,
      category,
      periodMonth: month,
      periodYear: year,
      title: isAdjustment
        ? `Paie ${capitalizedPeriod} (Ajustement #${adjustmentSeq})`
        : `Paie ${capitalizedPeriod}`,
      status: 'draft',
      runType,
      adjustmentSeq,
      rateSetId: slips[0]?.rateSetId ?? (isUuid(activeRateSet.id) ? activeRateSet.id : null),
      rateBasis: slips[0]?.rateBasis ?? (isUuid(activeRateSet.id) && !activeRateSet.isLegacyBaseline ? 'versioned' : 'legacy'),
      rateSnapshot: slips[0]?.rateSnapshot ?? null,
      totalGrossCotisable: totalGross,
      totalCnasSalarial: totalCnasSal,
      totalCnasPatronal: totalCnasPat,
      totalIrg: totalIrg,
      totalNet: totalNet,
      slipsCount: slips.length,
      createdAt: existingRegularRun && !isAdjustment ? existingRegularRun.createdAt : new Date().toISOString(),
      version: existingRegularRun && !isAdjustment ? existingRegularRun.version : undefined,
    };

    const existingRuns = (globalState.staffPayrollRuns || []).filter((r) => r.id !== runId);
    const existingSlips = (globalState.staffPayrollSlips || []).filter((s) => s.payrollRunId !== runId);

    globalState = {
      ...globalState,
      staffPayrollRuns: [newRun, ...existingRuns],
      staffPayrollSlips: [...slips, ...existingSlips],
    };
    notify();

    if (totalCarryover > 0) {
      showToast({
        type: 'info',
        title: ul('Advance deduction capped', 'Déduction d\'acompte plafonnée', 'تم تحديد سقف خصم التسبيق'),
        message: ul(
          `${totalCarryover.toLocaleString()} DZD carried over because advances exceeded net pay.`,
          `${totalCarryover.toLocaleString()} DZD reportés car l'acompte dépasse le net à payer.`,
          `تم ترحيل ${totalCarryover.toLocaleString()} دج لأن التسبيقات تتجاوز صافي الأجر.`
        ),
      });
    }

    if (isSupabaseConfigured()) {
      const ctx = {
        accountId: globalState.account.id,
        businessId,
        branchId,
      };
      staffService
        .upsertPayrollRun(newRun, category)
        .then(() =>
          runWithConcurrency(
            slips.map((slip) => () => staffService.upsertPayrollSlip(slip, ctx)),
            4
          )
        )
        .catch(() => {});
    }

    const after = captureStoreSlices(['staffPayrollRuns', 'staffPayrollSlips']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Generated payroll: ${newRun.title} (${slips.length} slips)`,
        `Paie calculée : ${newRun.title} (${slips.length} bulletins)`,
        `احتساب الرواتب: ${newRun.title} (${slips.length})`
      ),
      entityLabel: newRun.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('staff_payroll_runs', runId, globalState.currentUser?.id).catch(() => {});
          runWithConcurrency(
            slips.map((s) => () => syncCoordinator.softDeleteRow('staff_payroll_slips', s.id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          const ctx = {
            accountId: globalState.account.id,
            businessId,
            branchId,
          };
          syncCoordinator.restoreRow('staff_payroll_runs', runId, globalState.currentUser?.id)
            .then(() => staffService.upsertPayrollRun(newRun, category))
            .then(() =>
              runWithConcurrency(
                slips.map((slip) => () =>
                  syncCoordinator.restoreRow('staff_payroll_slips', slip.id, globalState.currentUser?.id)
                    .then(() => staffService.upsertPayrollSlip(slip, ctx))
                ),
                4
              )
            )
            .catch(() => {});
        }
      },
    });

    return newRun;
  };

  const approveStaffPayrollRun = (runId: string, options?: { markPaid?: boolean }) => {
    const run = (globalState.staffPayrollRuns || []).find((r) => r.id === runId);
    if (!run) return;
    if (run.status === 'paid') return;

    const markPaid = Boolean(options?.markPaid);
    if (run.status === 'approved' && !markPaid) return;

    const periodKey = `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`;
    const nowIso = new Date().toISOString();
    const todayIso = nowIso.slice(0, 10);
    const runSlips = (globalState.staffPayrollSlips || []).filter((s) => s.payrollRunId === runId);
    const staffWithDeductedAdvances = new Set(
      runSlips.filter((s) => s.acomptesDeduits > 0).map((s) => s.staffId)
    );
    const targetAdvanceIds =
      run.status === 'draft'
        ? (globalState.staffSalaryAdvances || [])
            .filter(
              (adv) =>
                adv.status === 'pending' &&
                staffWithDeductedAdvances.has(adv.staffId) &&
                (!adv.branchId || !run.branchId || adv.branchId === run.branchId)
            )
            .map((adv) => adv.id)
        : [];
    const targetAdvanceSet = new Set(targetAdvanceIds);

    const nextStatus: StaffPayrollRunRecord['status'] = markPaid ? 'paid' : 'approved';
    const updatedAdvances =
      run.status === 'draft'
        ? (globalState.staffSalaryAdvances || []).map((adv) =>
            targetAdvanceSet.has(adv.id)
              ? { ...adv, status: 'deducted' as const, deductedInPeriod: periodKey }
              : adv
          )
        : globalState.staffSalaryAdvances || [];

    const updatedRuns = (globalState.staffPayrollRuns || []).map((r) =>
      r.id === runId
        ? {
            ...r,
            status: nextStatus,
            approvedAt: r.approvedAt || nowIso,
            approvedBy: r.approvedBy || globalState.currentUser?.id || null,
          }
        : r
    );
    const updatedSlips = markPaid
      ? (globalState.staffPayrollSlips || []).map((s) =>
          s.payrollRunId === runId && !s.isPaid ? { ...s, isPaid: true, paidDate: todayIso } : s
        )
      : globalState.staffPayrollSlips || [];

    globalState = {
      ...globalState,
      staffPayrollRuns: updatedRuns,
      staffPayrollSlips: updatedSlips,
      staffSalaryAdvances: updatedAdvances,
    };
    notify();

    if (isSupabaseConfigured()) {
      staffService
        .approvePayrollRun(runId, {
          markPaid,
          advanceIds: run.status === 'draft' ? targetAdvanceIds : undefined,
          expectedVersion: run.version,
          title: run.title,
        })
        .catch(() => {});
    }

    showToast({
      type: 'success',
      title: markPaid
        ? ul('Payroll closed & paid', 'Paie clôturée & payée', 'تم اعتماد وصرف الرواتب')
        : ul('Payroll run approved', 'Paie validée (immuable)', 'تم اعتماد كشف الرواتب'),
      message: run.title,
    });
  };

  const markStaffPayrollSlipPaid = (slipId: string) => {
    const prevTarget = (globalState.staffPayrollSlips || []).find((s) => s.id === slipId);
    if (!prevTarget || prevTarget.isPaid) return;
    const paidDate = new Date().toISOString().slice(0, 10);
    const updatedSlips = (globalState.staffPayrollSlips || []).map((s) =>
      s.id === slipId ? { ...s, isPaid: true, paidDate } : s
    );
    globalState = {
      ...globalState,
      staffPayrollSlips: updatedSlips,
    };
    notify();

    if (isSupabaseConfigured()) {
      staffService.markPayrollSlipPaid(prevTarget, paidDate).catch(() => {});
    }

    showToast({
      type: 'success',
      title: ul('Payslip marked paid', 'Bulletin marqué payé', 'تم صرف قسيمة الراتب'),
      message: `${prevTarget.staffFullName} · ${prevTarget.periodLabel}`,
    });
  };

  const logStaffAttendanceManual = (
    staffId: string,
    date: string,
    type: 'in' | 'out',
    time: string,
    notes?: string
  ) => {
    const target = (globalState.staff || []).find((s) => s.id === staffId);
    if (!target) return;

    const logEntry: StaffAttendanceLogRecord = {
      id: generateClientUuid(),
      accountId: target.accountId || globalState.account.id,
      businessId: target.businessId || globalState.currentBusinessId,
      branchId: target.branchId || target.facilityId || globalState.currentBranchId,
      staffId: target.id,
      staffName: target.fullName,
      staffRole: target.role,
      timestamp: `${date}T${time}:00Z`,
      date,
      type,
      method: 'manual',
      source: 'manual',
      enteredBy: globalState.currentUser?.id,
      enteredByName: globalState.currentUser?.fullName,
      terminalId: 'PORTAIL_MANAGER',
      notes: notes || 'Pointage manuel manager',
    };

    globalState = {
      ...globalState,
      staffAttendanceLogs: [logEntry, ...(globalState.staffAttendanceLogs || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      staffService.upsertAttendanceLog(logEntry).catch(() => {});
    }

    showToast({
      type: 'success',
      title: ul('Manual attendance logged', 'Pointage manuel enregistré', 'تم تسجيل الحضور اليدوي'),
      message: `${target.fullName} · ${time}`,
    });
  };

  const executePayrollMigrationBackfillAction = async (force = false) => {
    if (!isSupabaseConfigured()) {
      showToast({
        type: 'warning',
        title: ul('Cloud sync not configured', 'Synchronisation cloud non configurée', 'المزامنة السحابية غير مفعلة'),
        message: ul(
          'Connect Supabase before running database migration backfill.',
          'Connectez Supabase avant d\'exécuter la reprise en base de données.',
          'قم بالاتصال بقاعدة البيانات قبل تنفيذ الترحيل.'
        ),
      });
      return null;
    }

    const activeBiz = (globalState.businesses || []).find((b) => b.id === globalState.currentBusinessId);
    const category = activeBiz?.category || 'membership_session';

    const result = await executePayrollMigrationBackfill({
      force,
      remoteState: {
        businessId: globalState.currentBusinessId,
        branchId: globalState.currentBranchId,
        staffList: globalState.staff || [],
        attendanceLogs: globalState.staffAttendanceLogs || [],
        salaryAdvances: globalState.staffSalaryAdvances || [],
        payrollRuns: globalState.staffPayrollRuns || [],
        payrollSlips: globalState.staffPayrollSlips || [],
      },
      persistInsertOnly: (payload) =>
        staffService.insertOnlyBackfillPayroll({
          ctx: {
            accountId: globalState.account.id,
            businessId: globalState.currentBusinessId,
            branchId: globalState.currentBranchId,
            category,
          },
          attendanceLogs: payload.attendanceLogs,
          salaryAdvances: payload.salaryAdvances,
          payrollRuns: payload.payrollRuns,
          payrollSlips: payload.payrollSlips,
        }),
    });

    if (result.errors.length > 0) {
      showToast({
        type: 'error',
        title: ul('Backfill completed with warnings', 'Reprise terminée avec erreurs', 'اكتمل الترحيل مع أخطاء'),
        message: result.errors[0],
      });
    } else if (result.alreadyCompleted) {
      showToast({
        type: 'info',
        title: ul('Backfill already executed', 'Reprise déjà effectuée', 'تم الترحيل مسبقاً'),
        message: result.marker.completedAt.slice(0, 10),
      });
    } else {
      await syncWithSupabaseAction({
        onlyTables: [
          'staff_attendance_logs',
          'staff_salary_advances',
          'staff_payroll_runs',
          'staff_payroll_slips',
        ],
      }).catch(() => {});

      showToast({
        type: 'success',
        title: ul('Database backfill completed', 'Reprise en base terminée', 'اكتمل ترحيل البيانات'),
        message: `${result.marker.runsInserted} runs · ${result.marker.slipsInserted} slips · ${result.marker.skippedCollisions.length} skipped`,
      });
    }

    return result;
  };

  const parkOrder = (
    orderData: Omit<ParkedOrder, 'id' | 'createdAt' | 'tenantId' | 'facilityId'>
  ) => {
    const before = captureStoreSlices(['parkedOrders']);
    const trace = getTraceContext();
    const parked: ParkedOrder = {
      ...trace,
      ...orderData,
      id: `park_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      parkedOrders: [parked, ...(globalState.parkedOrders || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      posService.upsertParkedOrder(parked).catch(() => {});
    }
    const after = captureStoreSlices(['parkedOrders']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Parked order: ${parked.referenceName || parked.customerName || parked.id.slice(-4)}`,
        `Commande mise en attente : ${parked.referenceName || parked.customerName || parked.id.slice(-4)}`,
        `تعليق طلب: ${parked.referenceName || parked.customerName || parked.id.slice(-4)}`
      ),
      entityLabel: parked.referenceName || parked.customerName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          posService.deleteParkedOrder(parked.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('pos_parked_orders', parked.id, globalState.currentUser?.id)
            .then(() => posService.upsertParkedOrder(parked))
            .catch(() => {});
        }
      },
    });
    return parked;
  };

  const resumeParkedOrder = (orderId: string) => {
    const target = (globalState.parkedOrders || []).find((p) => p.id === orderId);
    if (target) {
      const before = captureStoreSlices(['parkedOrders']);
      globalState = {
        ...globalState,
        parkedOrders: (globalState.parkedOrders || []).filter((p) => p.id !== orderId),
      };
      notify();
      if (isSupabaseConfigured()) {
        posService.deleteParkedOrder(orderId, globalState.currentUser?.id).catch(() => {});
      }
      const after = captureStoreSlices(['parkedOrders']);
      registerUndoEntry({
        vertical: getActiveCategoryForBranch(globalState.currentBranchId),
        operationType: 'status',
        summary: ul(
          `Resumed parked order: ${target.referenceName || target.customerName || orderId.slice(-4)}`,
          `Commande reprise : ${target.referenceName || target.customerName || orderId.slice(-4)}`,
          `استئناف طلب معلق: ${target.referenceName || target.customerName || orderId.slice(-4)}`
        ),
        entityLabel: target.referenceName || target.customerName,
        toastType: 'info',
        undo: () => {
          restoreStoreSlices(before);
          if (isSupabaseConfigured()) {
            syncCoordinator.restoreRow('pos_parked_orders', orderId, globalState.currentUser?.id).catch(() => {});
          }
        },
        redo: () => {
          restoreStoreSlices(after);
          if (isSupabaseConfigured()) {
            posService.deleteParkedOrder(orderId, globalState.currentUser?.id).catch(() => {});
          }
        },
      });
    }
    return target;
  };

  const deleteParkedOrder = (orderId: string) => {
    const target = (globalState.parkedOrders || []).find((p) => p.id === orderId);
    if (!target) return;
    const before = captureStoreSlices(['parkedOrders']);
    globalState = {
      ...globalState,
      parkedOrders: (globalState.parkedOrders || []).filter((p) => p.id !== orderId),
    };
    notify();
    if (isSupabaseConfigured()) {
      posService.deleteParkedOrder(orderId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['parkedOrders']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted parked order: ${target.referenceName || target.customerName || orderId.slice(-4)}`,
        `Commande en attente supprimée : ${target.referenceName || target.customerName || orderId.slice(-4)}`,
        `حذف طلب معلق: ${target.referenceName || target.customerName || orderId.slice(-4)}`
      ),
      entityLabel: target.referenceName || target.customerName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('pos_parked_orders', orderId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          posService.deleteParkedOrder(orderId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const updateReceiptConfig = (config: Partial<ReceiptConfig>) => {
    const before = captureStoreSlices(['receiptConfig']);
    const prevConfig = globalState.receiptConfig || DEFAULT_RECEIPT_CONFIG;
    const nextConfig: ReceiptConfig = {
      ...prevConfig,
      ...config,
    };
    globalState = {
      ...globalState,
      receiptConfig: nextConfig,
    };
    notify();
    if (isSupabaseConfigured()) {
      posService
        .upsertReceiptConfig(nextConfig, {
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: globalState.currentBranchId,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['receiptConfig']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'edit',
      summary: ul(
        'Updated receipt configuration',
        'Configuration des reçus mise à jour',
        'تحديث إعدادات الإيصال'
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          posService.upsertReceiptConfig(prevConfig, {
            accountId: globalState.account.id,
            businessId: globalState.currentBusinessId,
            branchId: globalState.currentBranchId,
          }).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          posService.upsertReceiptConfig(nextConfig, {
            accountId: globalState.account.id,
            businessId: globalState.currentBusinessId,
            branchId: globalState.currentBranchId,
          }).catch(() => {});
        }
      },
    });
  };

  const seedDemoInventory = (branchId?: string) => {
    const before = captureStoreSlices(['products']);
    const targetBranchId = branchId || globalState.currentBranchId;
    const demoItems: Product[] = [
      {
        id: `prod_demo_01_${Date.now()}`,
        tenantId: globalState.account.id,
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
        tenantId: globalState.account.id,
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
        tenantId: globalState.account.id,
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
        tenantId: globalState.account.id,
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
        tenantId: globalState.account.id,
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
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId: targetBranchId,
      tenantId: globalState.account.id,
      facilityId: targetBranchId,
    }));
    globalState = {
      ...globalState,
      products: [...enrichedDemoItems, ...globalState.products],
    };
    notify();
    const after = captureStoreSlices(['products']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: enrichedDemoItems.length,
      summary: ul(
        `Seeded ${enrichedDemoItems.length} demo inventory items`,
        `${enrichedDemoItems.length} produits démo ajoutés`,
        `إضافة ${enrichedDemoItems.length} منتجات تجريبية`
      ),
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };

  const batchDeleteProducts = (productIds: string[]) => {
    if (productIds.length === 0) return;
    const before = captureStoreSlices(['products']);
    const idSet = new Set(productIds);
    const tradingMode = isTradingCategory();
    const tableName = tradingMode ? 'trading_products' : 'pos_products';
    globalState = {
      ...globalState,
      products: globalState.products.filter((p) => !idSet.has(p.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        productIds.map((id) => () =>
          tradingMode
            ? tradingService.deleteProduct(id, globalState.currentUser?.id)
            : posService.deleteProduct(id, globalState.currentUser?.id)
        ),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['products']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: productIds.length,
      summary: ul(
        `Deleted ${productIds.length} product(s)`,
        `${productIds.length} produit(s) supprimé(s)`,
        `حذف ${productIds.length} منتجات`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            productIds.map((id) => () => syncCoordinator.restoreRow(tableName, id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            productIds.map((id) => () =>
              tradingMode
                ? tradingService.deleteProduct(id, globalState.currentUser?.id)
                : posService.deleteProduct(id, globalState.currentUser?.id)
            ),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchRestockProducts = (productIds: string[], restockQty = 10) => {
    if (productIds.length === 0) return;
    const before = captureStoreSlices(['products', 'stockMovements']);
    const idSet = new Set(productIds);
    const trace = getTraceContext();
    const newMovements: StockMovement[] = [];
    const tradingMode = isTradingCategory();

    const updated = globalState.products.map((p) => {
      if (idSet.has(p.id)) {
        const prev = p.stockQuantity;
        const next = prev + restockQty;
        newMovements.push({
          ...trace,
          id: `sm_${Date.now()}_${p.id}`,
          tenantId: globalState.account.id,
          facilityId: globalState.currentBranchId,
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

    if (isSupabaseConfigured()) {
      const restocked = updated.filter((p) => idSet.has(p.id));
      runWithConcurrency(
        restocked.map((p) => () =>
          tradingMode ? tradingService.upsertProduct(p) : posService.upsertProduct(p)
        ),
        4
      ).catch(() => {});
      runWithConcurrency(
        newMovements.map((mv) => () => {
          const mvPayload = {
            id: toValidUuid(mv.id),
            account_id: toValidUuid(globalState.account.id),
            business_id: toValidUuid(globalState.currentBusinessId),
            branch_id: toValidUuid(globalState.currentBranchId),
            staff_id: normalizeUuidOrNull(globalState.currentUser?.id),
            updated_by_staff_id: normalizeUuidOrNull(globalState.currentUser?.id),
            device_id: getActiveDeviceId(),
            product_id: toValidUuid(mv.productId),
            product_name: mv.productName,
            movement_type: 'in',
            quantity: mv.quantity,
            previous_stock: mv.previousStock,
            new_stock: mv.newStock,
            reason: mv.reason || null,
          };
          return syncCoordinator.mutateOrQueueUpsert('pos_stock_movements', mvPayload, {
            expectedVersion: mv.version,
            entityType: 'StockMovement',
            entityLabel: mv.productName,
            localData: mvPayload,
          });
        }),
        4
      ).catch(() => {});
    }

    const after = captureStoreSlices(['products', 'stockMovements']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: productIds.length,
      summary: ul(
        `Restocked ${productIds.length} product(s) (+${restockQty})`,
        `Réapprovisionné ${productIds.length} produit(s) (+${restockQty})`,
        `تمت إعادة تموين ${productIds.length} منتجات (+${restockQty})`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          const prevProds = before.products.filter((p) => idSet.has(p.id));
          runWithConcurrency(
            [
              ...prevProds.map((p) => () =>
                tradingMode ? tradingService.upsertProduct(p) : posService.upsertProduct(p)
              ),
              ...newMovements.map((mv) => () =>
                syncCoordinator.softDeleteRow('pos_stock_movements', mv.id, globalState.currentUser?.id)
              ),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          const nextProds = after.products.filter((p) => idSet.has(p.id));
          runWithConcurrency(
            [
              ...nextProds.map((p) => () =>
                tradingMode ? tradingService.upsertProduct(p) : posService.upsertProduct(p)
              ),
              ...newMovements.map((mv) => () =>
                syncCoordinator.restoreRow('pos_stock_movements', mv.id, globalState.currentUser?.id)
              ),
            ],
            4
          ).catch(() => {});
        }
      },
    });
  };

  const resetPosMockData = () => {
    const before = captureStoreSlices(['products', 'sales', 'parkedOrders', 'stockMovements', 'receiptConfig']);
    const targetBranchId = globalState.currentBranchId || 'branch_rest_didouche';
    const trace = getTraceContext();

    const posProducts = INITIAL_PRODUCTS.filter(
      (p) => p.facilityId === 'branch_rest_didouche' || p.sku.startsWith('POS-')
    ).map((p) => ({
      ...trace,
      ...p,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
    }));

    const posSales = INITIAL_SALES.filter(
      (s) => s.facilityId === 'branch_rest_didouche' || s.id.startsWith('sale_pos_')
    ).map((s) => ({
      ...trace,
      ...s,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
    }));

    const posParked = INITIAL_PARKED_ORDERS.map((po) => ({
      ...trace,
      ...po,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
    }));

    const posMovements = INITIAL_STOCK_MOVEMENTS.map((sm) => ({
      ...trace,
      ...sm,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
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

    const after = captureStoreSlices(['products', 'sales', 'parkedOrders', 'stockMovements', 'receiptConfig']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: posProducts.length,
      summary: ul(
        'POS demo catalog recharged',
        'Catalogue POS réinitialisé',
        'إعادة ضبط بيانات نقطة البيع'
      ),
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };

  const createAppointment = (
    aptData: Omit<Appointment, 'id' | 'createdAt' | 'tenantId' | 'facilityId'>
  ) => {
    const before = captureStoreSlices(['appointments']);
    const newApt: Appointment = {
      ...getTraceContext(),
      ...aptData,
      id: `apt_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      appointments: [newApt, ...(globalState.appointments || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      appointmentService.upsertAppointment(newApt).catch((err) => {
        console.warn('[store] Failed to save appointment to Supabase:', err);
      });
    }

    const after = captureStoreSlices(['appointments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Booked: ${newApt.clientName} (${newApt.startTime})`,
        `RDV créé : ${newApt.clientName} (${newApt.startTime})`,
        `حجز موعد: ${newApt.clientName} (${newApt.startTime})`
      ),
      entityLabel: newApt.clientName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          appointmentService.deleteAppointment(newApt.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('salon_appointments', newApt.id, globalState.currentUser?.id)
            .then(() => appointmentService.upsertAppointment(newApt))
            .catch(() => {});
        }
      },
    });

    return newApt;
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    const apt = (globalState.appointments || []).find((a) => a.id === id);
    if (!apt) return;
    const before = captureStoreSlices(['appointments']);
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    };
    notify();

    if (isSupabaseConfigured()) {
      appointmentService.updateStatus(id, status, apt?.version).catch((err) => {
        console.warn('[store] Failed to update appointment status in Supabase:', err);
      });
    }

    const after = captureStoreSlices(['appointments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `${apt.clientName}: ${status}`,
        `${apt.clientName} : ${status}`,
        `${apt.clientName}: ${status}`
      ),
      entityLabel: apt.clientName,
      toastType: status === 'Cancelled' ? 'warning' : 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          appointmentService.updateStatus(id, apt.status, apt.version).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          appointmentService.updateStatus(id, status, apt.version).catch(() => {});
        }
      },
    });
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
    if (!apt) return;
    const before = captureStoreSlices(['appointments']);
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

    const updatedTarget = globalState.appointments?.find((a) => a.id === id);
    if (isSupabaseConfigured() && updatedTarget) {
      appointmentService.upsertAppointment(updatedTarget).catch((err) => {
        console.warn('[store] Failed to reschedule appointment in Supabase:', err);
      });
    }

    const after = captureStoreSlices(['appointments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'edit',
      summary: ul(
        `Rescheduled: ${apt.clientName} → ${date} ${startTime}`,
        `Reporté : ${apt.clientName} → ${date} ${startTime}`,
        `إعادة جدولة: ${apt.clientName} ← ${date} ${startTime}`
      ),
      entityLabel: apt.clientName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          appointmentService.upsertAppointment(apt).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured() && updatedTarget) {
          appointmentService.upsertAppointment(updatedTarget).catch(() => {});
        }
      },
    });
  };

  const deleteAppointment = (id: string) => {
    const target = (globalState.appointments || []).find((a) => a.id === id);
    if (!target) return;
    const before = captureStoreSlices(['appointments']);
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).filter((a) => a.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      appointmentService.deleteAppointment(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['appointments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted appointment: ${target.clientName}`,
        `Rendez-vous supprimé : ${target.clientName}`,
        `حذف موعد: ${target.clientName}`
      ),
      entityLabel: target.clientName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('salon_appointments', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          appointmentService.deleteAppointment(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const addServiceItem = (serviceData: Omit<ServiceItem, 'id' | 'facilityId'>) => {
    const activeAccountId = globalState.account?.id?.trim();
    const activeBranchId = globalState.currentBranchId?.trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', globalState.language),
        message: t('tenant_context_missing_msg', globalState.language),
      });
      throw new TenantContextMissingError();
    }
    const before = captureStoreSlices(['servicesCatalog']);
    const newService: ServiceItem = {
      ...getTraceContext(),
      ...serviceData,
      tenantId: serviceData.tenantId || activeAccountId,
      id: `srv_${Date.now()}`,
      facilityId: activeBranchId,
    };
    globalState = {
      ...globalState,
      servicesCatalog: [...(globalState.servicesCatalog || []), newService],
    };
    notify();
    if (isSupabaseConfigured()) {
      appointmentService.upsertService(newService).catch(() => {});
    }
    const after = captureStoreSlices(['servicesCatalog']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added service: ${newService.name}`,
        `Prestation ajoutée : ${newService.name}`,
        `إضافة خدمة: ${newService.name}`
      ),
      entityLabel: newService.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          appointmentService.deleteService(newService.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('salon_services', newService.id, globalState.currentUser?.id)
            .then(() => appointmentService.upsertService(newService))
            .catch(() => {});
        }
      },
    });
    return newService;
  };

  const checkoutAppointment = (
    appointmentId: string,
    paymentMethod: 'Cash' | 'Card' | 'MemberBalance' = 'Cash'
  ) => {
    const apt = (globalState.appointments || []).find((a) => a.id === appointmentId);
    if (!apt) throw new Error('Appointment not found');

    const before = captureStoreSlices(['appointments', 'sales']);
    const sale: Sale = {
      ...getTraceContext(),
      id: `sale_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    if (isSupabaseConfigured()) {
      appointmentService
        .checkoutAppointment(appointmentId, paymentMethod, getActiveDeviceId())
        .catch(() => {});
    }

    const checkoutLang = globalState.language || 'fr';
    const localizedService = getLocalizedServiceName(apt.serviceId, apt.serviceName, checkoutLang);
    const after = captureStoreSlices(['appointments', 'sales']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Checked out: ${apt.clientName} (${formatMoney(apt.price)})`,
        `Encaissé : ${apt.clientName} (${localizedService} · ${formatMoney(apt.price)})`,
        `تحصيل موعد: ${apt.clientName} (${formatMoney(apt.price)})`
      ),
      entityLabel: apt.clientName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          appointmentService.updateStatus(appointmentId, apt.status, apt.version).catch(() => {});
          syncCoordinator.softDeleteRow('pos_sales', sale.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          appointmentService.updateStatus(appointmentId, 'Completed', apt.version).catch(() => {});
          syncCoordinator.restoreRow('pos_sales', sale.id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });

    return sale;
  };

  const batchDeleteAppointments = (ids: string[]) => {
    if (ids.length === 0) return;
    const before = captureStoreSlices(['appointments']);
    const idSet = new Set(ids);
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).filter((a) => !idSet.has(a.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        ids.map((id) => () => appointmentService.deleteAppointment(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['appointments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: ids.length,
      summary: ul(
        `Deleted ${ids.length} appointment(s)`,
        `${ids.length} rendez-vous supprimé(s)`,
        `حذف ${ids.length} مواعيد`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            ids.map((id) => () => syncCoordinator.restoreRow('salon_appointments', id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            ids.map((id) => () => appointmentService.deleteAppointment(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchUpdateAppointmentStatus = (ids: string[], status: AppointmentStatus) => {
    if (ids.length === 0) return;
    const before = captureStoreSlices(['appointments']);
    const idSet = new Set(ids);
    const prevList = (globalState.appointments || []).filter((a) => idSet.has(a.id));
    const prevVersionMap = new Map(
      (globalState.appointments || []).map((a) => [a.id, a.version])
    );
    globalState = {
      ...globalState,
      appointments: (globalState.appointments || []).map((a) =>
        idSet.has(a.id) ? { ...a, status } : a
      ),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        ids.map((id) => () => appointmentService.updateStatus(id, status, prevVersionMap.get(id))),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['appointments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: ids.length,
      summary: ul(
        `Updated ${ids.length} appointment(s) → ${status}`,
        `${ids.length} rendez-vous passés en "${status}"`,
        `تحديث ${ids.length} مواعيد ← ${status}`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            prevList.map((a) => () => appointmentService.updateStatus(a.id, a.status, a.version)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            ids.map((id) => () => appointmentService.updateStatus(id, status, prevVersionMap.get(id))),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const updateServiceItem = (id: string, updates: Partial<ServiceItem>) => {
    const prev = (globalState.servicesCatalog || []).find((s) => s.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['servicesCatalog']);
    const updatedCatalog = (globalState.servicesCatalog || []).map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    globalState = {
      ...globalState,
      servicesCatalog: updatedCatalog,
    };
    notify();
    const target = updatedCatalog.find((s) => s.id === id);
    if (isSupabaseConfigured() && target) {
      appointmentService.upsertService(target).catch(() => {});
    }
    const after = captureStoreSlices(['servicesCatalog']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'edit',
      summary: ul(
        `Updated service: ${target?.name || prev.name}`,
        `Prestation mise à jour : ${target?.name || prev.name}`,
        `تحديث خدمة: ${target?.name || prev.name}`
      ),
      entityLabel: target?.name || prev.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          appointmentService.upsertService(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured() && target) {
          appointmentService.upsertService(target).catch(() => {});
        }
      },
    });
  };

  const deleteServiceItem = (id: string) => {
    const prev = (globalState.servicesCatalog || []).find((s) => s.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['servicesCatalog']);
    globalState = {
      ...globalState,
      servicesCatalog: (globalState.servicesCatalog || []).filter((s) => s.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      appointmentService.deleteService(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['servicesCatalog']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted service: ${prev.name}`,
        `Prestation supprimée : ${prev.name}`,
        `حذف خدمة: ${prev.name}`
      ),
      entityLabel: prev.name,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('salon_services', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          appointmentService.deleteService(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const batchDeleteServiceItems = (ids: string[]) => {
    if (ids.length === 0) return;
    const before = captureStoreSlices(['servicesCatalog']);
    const idSet = new Set(ids);
    globalState = {
      ...globalState,
      servicesCatalog: (globalState.servicesCatalog || []).filter((s) => !idSet.has(s.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        ids.map((id) => () => appointmentService.deleteService(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['servicesCatalog']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: ids.length,
      summary: ul(
        `Deleted ${ids.length} service(s)`,
        `${ids.length} prestation(s) supprimée(s)`,
        `حذف ${ids.length} خدمات`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            ids.map((id) => () => syncCoordinator.restoreRow('salon_services', id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            ids.map((id) => () => appointmentService.deleteService(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const updateStylistPayoutStatus = (id: string, status: 'Pending' | 'Approved' | 'Paid', paymentMethod?: string) => {
    const prev = (globalState.stylistPayouts || []).find((p) => p.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['stylistPayouts']);
    const updatedPayouts = (globalState.stylistPayouts || []).map((p) =>
      p.id === id
        ? {
            ...p,
            status,
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(status === 'Paid' ? { paidAt: new Date().toISOString().split('T')[0] } : {}),
          }
        : p
    );
    globalState = {
      ...globalState,
      stylistPayouts: updatedPayouts,
    };
    notify();
    const target = updatedPayouts.find((p) => p.id === id);
    if (isSupabaseConfigured() && target) {
      appointmentService
        .upsertStylistPayout(target, {
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: globalState.currentBranchId,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['stylistPayouts']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Stylist payout: ${prev.staffName} → ${status}`,
        `Commission styliste : ${prev.staffName} → ${status}`,
        `عمولة المصمم: ${prev.staffName} ← ${status}`
      ),
      entityLabel: prev.staffName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          appointmentService.upsertStylistPayout(prev, {
            accountId: globalState.account.id,
            businessId: globalState.currentBusinessId,
            branchId: globalState.currentBranchId,
          }).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured() && target) {
          appointmentService.upsertStylistPayout(target, {
            accountId: globalState.account.id,
            businessId: globalState.currentBusinessId,
            branchId: globalState.currentBranchId,
          }).catch(() => {});
        }
      },
    });
  };

  const resetSalonMockData = () => {
    const before = captureStoreSlices(['servicesCatalog', 'appointments', 'members', 'salonWorkstations', 'stylistPayouts']);
    const targetBranchId = globalState.currentBranchId || 'branch_salon_hydra';
    const trace = getTraceContext();

    const salonServices = INITIAL_SALON_SERVICES.map((s) => ({
      ...trace,
      ...s,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
    }));

    const salonAppointments = INITIAL_APPOINTMENTS.map((a) => ({
      ...trace,
      ...a,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
    }));

    const salonClients = INITIAL_SALON_CLIENTS.map((c) => ({
      ...trace,
      ...c,
      facilityId: targetBranchId,
      branchId: targetBranchId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
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

    const after = captureStoreSlices(['servicesCatalog', 'appointments', 'members', 'salonWorkstations', 'stylistPayouts']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: salonAppointments.length + salonServices.length,
      summary: ul(
        'Salon & Spa data recharged',
        'Données Salon & Spa réinitialisées',
        'إعادة ضبط بيانات الصالون'
      ),
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };


  const addStaff = (staffData: Omit<StaffMember, 'id' | 'tenantId' | 'facilityId'>) => {
    const plan = globalState.subscription?.plan || INITIAL_PLANS[0];
    const staffQuota = checkQuota((globalState.staff || []).length, plan?.maxStaff || 1);
    if (!staffQuota.isAllowed) {
      throw new Error(`Staff limit reached for ${plan.name} plan. Upgrade to expand capacity.`);
    }

    const before = captureStoreSlices(['staff']);
    const newStaff: StaffMember = {
      ...getTraceContext(),
      ...staffData,
      id: `stf_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const after = captureStoreSlices(['staff']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added staff: ${newStaff.fullName}`,
        `Collaborateur ajouté : ${newStaff.fullName}`,
        `إضافة موظف: ${newStaff.fullName}`
      ),
      entityLabel: newStaff.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          staffService.deleteStaff(newStaff.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('staff', newStaff.id, globalState.currentUser?.id)
            .then(() => staffService.createStaff(newStaff))
            .catch(() => {});
        }
      },
    });

    return newStaff;
  };

  const addBusiness = (name: string, category: BusinessCategory, address?: string, phone?: string) => {
    const plan = globalState.subscription?.plan || INITIAL_PLANS[0];
    const businessQuota = checkQuota((globalState.businesses || []).length, plan?.maxBusinesses || 1);
    if (!businessQuota.isAllowed) {
      openDesktopUpgradeModal("business_limit");
      throw new Error(`Business limit reached for ${plan.name} (${plan.maxBusinesses}). Upgrade to Atrium Desktop to unlock multi-business management.`);
    }

    const before = captureStoreSlices(['businesses', 'branches', 'currentBusinessId', 'currentBranchId']);
    const newBiz: Business = {
      id: `biz_${Date.now()}`,
      accountId: globalState.account.id,
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
      accountId: globalState.account.id,
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
        .createBusiness(globalState.account.id, name, category, address, phone)
        .catch((err) => {
          console.warn('[store] Failed to create business on Supabase:', err);
        });
    }

    const after = captureStoreSlices(['businesses', 'branches', 'currentBusinessId', 'currentBranchId']);
    registerUndoEntry({
      vertical: category,
      operationType: 'create',
      summary: ul(
        `Created business: ${name}`,
        `Établissement créé : ${name}`,
        `إنشاء منشأة: ${name}`
      ),
      entityLabel: name,
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });

    return newBiz;
  };

  const addBranch = (name: string, code: string, address?: string, phone?: string) => {
    const plan = globalState.subscription?.plan || INITIAL_PLANS[0];
    const branchQuota = checkQuota((globalState.branches || []).length, plan?.maxBranches || 1);
    if (!branchQuota.isAllowed) {
      openDesktopUpgradeModal("branch_limit");
      throw new Error(`Branch limit reached for ${plan.name}. Upgrade to Atrium Desktop to unlock multi-branch management.`);
    }

    const before = captureStoreSlices(['branches', 'currentBranchId']);
    const newBranch: Branch = {
      id: `branch_${Date.now()}`,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
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
        .createBranch(globalState.account.id, globalState.currentBusinessId, name, address, phone)
        .catch((err) => {
          console.warn('[store] Failed to create branch on Supabase:', err);
        });
    }

    const after = captureStoreSlices(['branches', 'currentBranchId']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added branch: ${name}`,
        `Succursale ajoutée : ${name}`,
        `إضافة فرع: ${name}`
      ),
      entityLabel: name,
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });

    return newBranch;
  };

  const registerDevice = (label: string, hardwareId: string) => {
    const plan = globalState.subscription?.plan || INITIAL_PLANS[0];
    const deviceQuota = checkQuota((globalState.devices || []).length, plan?.maxDevices || 1);
    if (!deviceQuota.isAllowed) {
      throw new Error(`Device limit reached for ${plan.name} plan.`);
    }

    const before = captureStoreSlices(['devices']);
    const newDevice: Device = {
      id: `dev_${Date.now()}`,
      accountId: globalState.account.id,
      branchId: globalState.currentBranchId,
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

    const devPayload = {
      id: toValidUuid(newDevice.id),
      account_id: toValidUuid(newDevice.accountId),
      business_id: toValidUuid(globalState.currentBusinessId),
      branch_id: toValidUuid(newDevice.branchId),
      hardware_id: newDevice.hardwareId,
      label: newDevice.label,
      is_active: true,
      last_seen_at: newDevice.lastSeenAt,
      registered_at: newDevice.registeredAt,
      updated_by_staff_id: normalizeUuidOrNull(globalState.currentUser?.id),
      device_id: getActiveDeviceId(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      syncCoordinator
        .mutateOrQueueUpsert('devices', devPayload, {
          expectedVersion: newDevice.version,
          entityType: 'Device',
          entityLabel: newDevice.label,
          localData: devPayload,
        })
        .catch(() => {});
    }

    const after = captureStoreSlices(['devices']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Registered device: ${label}`,
        `Terminal enregistré : ${label}`,
        `تسجيل جهاز: ${label}`
      ),
      entityLabel: label,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('devices', newDevice.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('devices', newDevice.id, globalState.currentUser?.id)
            .then(() =>
              syncCoordinator.mutateOrQueueUpsert('devices', devPayload, {
                expectedVersion: newDevice.version,
                entityType: 'Device',
                entityLabel: newDevice.label,
                localData: devPayload,
              })
            )
            .catch(() => {});
        }
      },
    });

    return newDevice;
  };

  const revokeDevice = (deviceId: string) => {
    const prev = (globalState.devices || []).find((d) => d.id === deviceId);
    if (!prev) return;
    const before = captureStoreSlices(['devices']);
    globalState = {
      ...globalState,
      devices: globalState.devices.filter((d) => d.id !== deviceId),
    };
    notify();
    if (isSupabaseConfigured()) {
      syncCoordinator.softDeleteRow('devices', deviceId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['devices']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Revoked device: ${prev.label}`,
        `Terminal révoqué : ${prev.label}`,
        `إلغاء صلاحية جهاز: ${prev.label}`
      ),
      entityLabel: prev.label,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('devices', deviceId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('devices', deviceId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
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
    const before = captureStoreSlices(['products']);
    const tradingMode = isTradingCategory();
    const tableName = tradingMode ? 'trading_products' : 'pos_products';
    const newProduct: Product = {
      ...getTraceContext(),
      ...productData,
      id: `prod_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
    };
    globalState = {
      ...globalState,
      products: [newProduct, ...globalState.products],
    };
    notify();

    if (isSupabaseConfigured()) {
      (tradingMode
        ? tradingService.upsertProduct(newProduct)
        : posService.upsertProduct(newProduct)
      ).catch((err) => {
        console.warn('[store] Failed to save product to Supabase:', err);
      });
    }

    const after = captureStoreSlices(['products']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Created product: ${newProduct.name}`,
        `Produit créé : ${newProduct.name}`,
        `إضافة منتج: ${newProduct.name}`
      ),
      entityLabel: newProduct.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          (tradingMode
            ? tradingService.deleteProduct(newProduct.id, globalState.currentUser?.id)
            : posService.deleteProduct(newProduct.id, globalState.currentUser?.id)
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow(tableName, newProduct.id, globalState.currentUser?.id)
            .then(() =>
              tradingMode
                ? tradingService.upsertProduct(newProduct)
                : posService.upsertProduct(newProduct)
            )
            .catch(() => {});
        }
      },
    });

    return newProduct;
  };

  const resolveSubRolesForUser = resolveSubRolesForUserGlobal;

  const login = (identifier: string, _password?: string) => {
    const cleanInput = identifier.trim().toLowerCase();
    const norm = normalizePhone(identifier);
    const staffMatch = globalState.staff.find((s) => {
      const matchEmail = (s.email || '').toLowerCase() === cleanInput;
      const matchPhone = norm.length >= 8 && normalizePhone(s.phoneNumber) === norm;
      return matchEmail || matchPhone;
    });

    if (staffMatch) {
      if (
        (staffMatch.status === 'frozen' || staffMatch.status === 'terminated') &&
        !isSoleActiveOwner(staffMatch.id, globalState.staff)
      ) {
        const lang = globalState.language || 'fr';
        return {
          success: false,
          message:
            lang === 'ar'
              ? 'هذا الحساب معلق أو منتهي الخدمة حالياً.'
              : lang === 'en'
              ? 'This account is currently suspended or disabled.'
              : 'Ce compte est actuellement suspendu ou désactivé.',
        };
      }
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
        ...resolveSubRolesForUser(user),
      };
      notify();
      return { success: true, user };
    }

    // Check account owner
    if (
      cleanInput === globalState.account.email.toLowerCase() ||
      cleanInput === 'owner@atrium.dz' ||
      cleanInput === 'bentouatitamer@gmail.com'
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
        ...resolveSubRolesForUser(ownerUser),
      };
      notify();
      return { success: true, user: ownerUser };
    }

    // Default friendly login for any valid email format
    const namePart = cleanInput.includes('@') ? cleanInput.split('@')[0] : 'User';
    const friendlyName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const fallbackUser: CurrentUser = {
      id: `usr_${Date.now()}`,
      fullName: friendlyName,
      email: cleanInput.includes('@') ? cleanInput : `${cleanInput}@atrium.dz`,
      role: 'Owner',
      roleRank: 8,
      pinCode: '1234',
    };
    globalState = {
      ...globalState,
      currentUser: fallbackUser,
      isAuthenticated: true,
      ...resolveSubRolesForUser(fallbackUser),
    };
    notify();
    return { success: true, user: fallbackUser };
  };

  const loginWithPin = (pin: string) => {
    const cleanPin = pin.trim();
    const staffMatch = globalState.staff.find((s) => s.pinCode === cleanPin);
    if (staffMatch) {
      if (
        (staffMatch.status === 'frozen' || staffMatch.status === 'terminated') &&
        !isSoleActiveOwner(staffMatch.id, globalState.staff)
      ) {
        const lang = globalState.language || 'fr';
        return {
          success: false,
          message:
            lang === 'ar'
              ? 'هذا الحساب معلق أو منتهي الخدمة حالياً.'
              : lang === 'en'
              ? 'This account is currently suspended or disabled.'
              : 'Ce compte est actuellement suspendu ou désactivé.',
        };
      }
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
        activeScreen: 'home',
        ...resolveSubRolesForUser(user),
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
        activeScreen: 'home',
        ...resolveSubRolesForUser(ownerUser),
      };
      notify();
      return { success: true, user: ownerUser };
    }

    return { success: false, message: 'Invalid 4-digit PIN code. (Try 1234 for Owner, 5566 for Manager, 9988 for Cashier)' };
  };

  const switchStaffUser = (staffId: string) => {
    const target = globalState.staff.find((s) => s.id === staffId);
    if (!target) return;
    if (
      (target.status === 'frozen' || target.status === 'terminated') &&
      !isSoleActiveOwner(target.id, globalState.staff)
    ) {
      const lang = globalState.language || 'fr';
      showToast({
        type: 'warning',
        title: lang === 'ar' ? 'الحساب موقوف' : lang === 'fr' ? 'Compte désactivé' : 'Account disabled',
        message:
          lang === 'ar'
            ? 'هذا الحساب معلق أو منتهي الخدمة حالياً.'
            : lang === 'fr'
            ? 'Ce compte est actuellement suspendu ou désactivé.'
            : 'This staff account is currently suspended or terminated.',
      });
      return;
    }
    const nextUser: CurrentUser = {
      id: target.id,
      fullName: target.fullName,
      email: target.email,
      role: target.role,
      roleRank: target.roleRank,
      branchId: target.facilityId,
      pinCode: target.pinCode,
    };
    globalState = {
      ...globalState,
      currentUser: nextUser,
      activeScreen: 'home',
      isFastSwitchOpen: false,
      ...resolveSubRolesForUser(nextUser),
    };
    notify();
  };

  const logout = logoutAction;
  const openOnboarding = openOnboardingAction;
  const closeOnboarding = closeOnboardingAction;
  const openFastSwitch = openFastSwitchAction;
  const closeFastSwitch = closeFastSwitchAction;
  const openDesktopUpgradeModal = openDesktopUpgradeModalAction;
  const closeDesktopUpgradeModal = closeDesktopUpgradeModalAction;

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
    let expiresAt: string | undefined = undefined;

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
    } else if (params.planTier && params.planTier !== 'free') {
      const tierMap: Record<string, number> = { starter: 1, pro: 2, enterprise: 3 };
      const rank = tierMap[params.planTier] || 1;
      const matching = INITIAL_PLANS.find((p) => p.tierRank === rank);
      if (matching) {
        chosenPlan = matching;
        isLifetime = false;
        activatedVoucher = `TRIAL-${params.planTier.toUpperCase()}-14D`;
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 14);
        expiresAt = trialExpiry.toISOString();
      }
    }

    const newSubscription: AccountSubscription = {
      id: `sub_${Date.now()}`,
      accountId,
      planId: chosenPlan.id,
      status: params.isTrial ? 'trial' : 'active',
      isLifetime,
      activatedByVoucher: activatedVoucher,
      plan: chosenPlan,
      trialEndsAt: expiresAt,
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

    // Build derived business config from captured onboarding data
    const onboardingCtx: OnboardingContext = {
      ...(params.onboardingContext || {}),
      wilayaCode: params.wilayaCode || params.onboardingContext?.wilayaCode || '16',
      capturedAt: new Date().toISOString(),
    };
    const newBusinessConfig = createDefaultBusinessConfig(newBusiness, onboardingCtx, branchId);

    // Bootstrap category plans + category formules across ALL 16 categories
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
        price: { amount: 6500, currency: newBusinessConfig.currency || 'DZD' },
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
        price: { amount: 18000, currency: newBusinessConfig.currency || 'DZD' },
        isActive: true,
        sessionsPerWeek: 0,
        isWalkIn: false,
        isPersonalTraining: false,
        genderRule: 0,
      },
    ];

    const starterFormules = createStarterFormulesForCategory(
      params.category,
      businessId,
      accountId,
      branchId,
      newBusinessConfig.currency,
      newBusinessConfig.defaultTvaRate
    );

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
        price: { amount: 150, currency: newBusinessConfig.currency || 'DZD' },
        cost: { amount: 70, currency: newBusinessConfig.currency || 'DZD' },
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
      businessConfigs: {
        ...(globalState.businessConfigs || {}),
        [businessId]: newBusinessConfig,
      },
      categoryFormules: [
        ...starterFormules,
        ...(globalState.categoryFormules || []),
      ],
      members: [...sampleMembers, ...globalState.members],
      leads: [...sampleLeads, ...globalState.leads],
      products: [...sampleProducts, ...globalState.products],
      staff: [newOwnerStaff, ...globalState.staff],
      currentUser: newCurrentUser,
      isAuthenticated: true,
      isOnboardingOpen: false,
      activeScreen: 'home',
      settingsTab: 'preferences',
      ...resolveSubRolesForUserGlobal(newCurrentUser),
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
        .then(() => {
          configService.upsertBusinessConfig(newBusinessConfig).catch(() => {});
          starterFormules.forEach((frm) => {
            configService
              .upsertCategoryFormule(frm, {
                accountId,
                businessId: newBusiness.id,
                branchId: newBranch.id,
                staffId: newOwnerStaff.id,
              })
              .catch(() => {});
          });
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

  const startTimer = startTimerAction;
  const pauseTimer = pauseTimerAction;
  const resumeTimer = resumeTimerAction;
  const stopTimer = stopTimerAction;
  const resetTimer = resetTimerAction;

  const addFreelanceClient = (clientData: Omit<FreelanceClient, 'id' | 'tenantId' | 'facilityId' | 'lifetimeBilled' | 'createdAt'>) => {
    const before = captureStoreSlices(['freelanceClients']);
    const newClient: FreelanceClient = {
      ...getTraceContext(),
      ...clientData,
      id: `fcli_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const after = captureStoreSlices(['freelanceClients']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added client: ${newClient.name}`,
        `Client ajouté : ${newClient.name}`,
        `إضافة عميل: ${newClient.name}`
      ),
      entityLabel: newClient.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteClient(newClient.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_clients', newClient.id, globalState.currentUser?.id)
            .then(() => freelanceService.upsertClient(newClient))
            .catch(() => {});
        }
      },
    });

    return newClient;
  };

  const updateFreelanceClient = (id: string, updates: Partial<FreelanceClient>) => {
    const prev = globalState.freelanceClients.find((c) => c.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceClients']);
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

    const after = captureStoreSlices(['freelanceClients']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'edit',
      summary: ul(
        `Updated client: ${target?.name || prev.name}`,
        `Client mis à jour : ${target?.name || prev.name}`,
        `تحديث بيانات العميل: ${target?.name || prev.name}`
      ),
      entityLabel: target?.name || prev.name,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertClient(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertClient(target).catch(() => {});
        }
      },
    });
  };

  const deleteFreelanceClient = (clientId: string, cascade = false) => {
    const target = globalState.freelanceClients.find((c) => c.id === clientId);
    if (!target) return;
    const before = captureStoreSlices([
      'freelanceClients',
      'freelanceProjects',
      'timeLogs',
      'freelanceInvoices',
      'freelanceProposals',
    ]);
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
      freelanceService.deleteClient(clientId, globalState.currentUser?.id).catch((err) => {
        console.warn('[store] Supabase deleteClient notice:', err);
      });
    }

    const after = captureStoreSlices([
      'freelanceClients',
      'freelanceProjects',
      'timeLogs',
      'freelanceInvoices',
      'freelanceProposals',
    ]);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted client: ${target.name}`,
        `Client supprimé : ${target.name}`,
        `حذف العميل: ${target.name}`
      ),
      entityLabel: target.name,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_clients', clientId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          freelanceService.deleteClient(clientId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const addFreelanceProject = (projectData: Omit<FreelanceProject, 'id' | 'tenantId' | 'facilityId' | 'loggedHours' | 'createdAt'>) => {
    const before = captureStoreSlices(['freelanceProjects']);
    const newProject: FreelanceProject = {
      ...getTraceContext(),
      ...projectData,
      id: `fproj_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const after = captureStoreSlices(['freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Created project: ${newProject.title}`,
        `Projet créé : ${newProject.title}`,
        `إنشاء مشروع: ${newProject.title}`
      ),
      entityLabel: newProject.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteProject(newProject.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_projects', newProject.id, globalState.currentUser?.id)
            .then(() => freelanceService.upsertProject(newProject))
            .catch(() => {});
        }
      },
    });

    return newProject;
  };

  const updateFreelanceProject = (projectId: string, updates: Partial<FreelanceProject>) => {
    const prev = globalState.freelanceProjects.find((p) => p.id === projectId);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceProjects']);
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

    const after = captureStoreSlices(['freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'edit',
      summary: ul(
        `Updated project: ${target?.title || prev.title}`,
        `Projet mis à jour : ${target?.title || prev.title}`,
        `تحديث المشروع: ${target?.title || prev.title}`
      ),
      entityLabel: target?.title || prev.title,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertProject(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertProject(target).catch(() => {});
        }
      },
    });
  };

  const deleteFreelanceProject = (projectId: string) => {
    const prev = globalState.freelanceProjects.find((p) => p.id === projectId);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceProjects', 'timeLogs']);
    globalState = {
      ...globalState,
      freelanceProjects: globalState.freelanceProjects.filter((p) => p.id !== projectId),
      timeLogs: globalState.timeLogs.filter((t) => t.projectId !== projectId),
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.deleteProject(projectId, globalState.currentUser?.id).catch((err) => {
        console.warn('[store] Supabase deleteProject notice:', err);
      });
    }

    const after = captureStoreSlices(['freelanceProjects', 'timeLogs']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted project: ${prev.title}`,
        `Projet supprimé : ${prev.title}`,
        `حذف المشروع: ${prev.title}`
      ),
      entityLabel: prev.title,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_projects', projectId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          freelanceService.deleteProject(projectId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const updateProjectStage = (projectId: string, stage: DeliverableStage) => {
    const prev = globalState.freelanceProjects.find((p) => p.id === projectId);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceProjects']);
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

    const after = captureStoreSlices(['freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `${prev.title}: ${stage}`,
        `${prev.title} : ${stage}`,
        `${prev.title}: ${stage}`
      ),
      entityLabel: prev.title,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertProject(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertProject(target).catch(() => {});
        }
      },
    });
  };

  const addDeliverable = (projectId: string, title: string, estimatedHours: number, dueDate: string, description?: string) => {
    const prev = globalState.freelanceProjects.find((p) => p.id === projectId);
    const before = captureStoreSlices(['freelanceProjects']);
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

    const after = captureStoreSlices(['freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added deliverable: ${title}`,
        `Livrable ajouté : ${title}`,
        `إضافة تسليم: ${title}`
      ),
      entityLabel: title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (prev && isSupabaseConfigured()) {
          freelanceService.upsertProject(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertProject(target).catch(() => {});
        }
      },
    });

    return newDeliv;
  };

  const updateDeliverable = (
    projectId: string,
    deliverableId: string,
    updates: Partial<FreelanceDeliverable>
  ) => {
    const prev = globalState.freelanceProjects.find((p) => p.id === projectId);
    if (!prev) return;
    const prevDeliv = prev.deliverables.find((d) => d.id === deliverableId);
    const before = captureStoreSlices(['freelanceProjects']);
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

    const after = captureStoreSlices(['freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.stage ? 'status' : 'edit',
      summary: ul(
        `Updated deliverable: ${prevDeliv?.title || deliverableId}`,
        `Livrable mis à jour : ${prevDeliv?.title || deliverableId}`,
        `تحديث التسليم: ${prevDeliv?.title || deliverableId}`
      ),
      entityLabel: prevDeliv?.title,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertProject(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertProject(target).catch(() => {});
        }
      },
    });
  };

  const deleteDeliverable = (projectId: string, deliverableId: string) => {
    const prev = globalState.freelanceProjects.find((p) => p.id === projectId);
    if (!prev) return;
    const removed = prev.deliverables.find((d) => d.id === deliverableId);
    if (!removed) return;
    const before = captureStoreSlices(['freelanceProjects']);
    const updatedProjects = globalState.freelanceProjects.map((p) => {
      if (p.id === projectId) {
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

    const after = captureStoreSlices(['freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted deliverable: ${removed.title}`,
        `Livrable supprimé : ${removed.title}`,
        `حذف التسليم: ${removed.title}`
      ),
      entityLabel: removed.title,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertProject(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertProject(target).catch(() => {});
        }
      },
    });
  };

  const updateDeliverableStage = (projectId: string, deliverableId: string, stage: DeliverableStage) => {
    updateDeliverable(projectId, deliverableId, { stage });
  };

  const logTimeEntry = (entryData: Omit<TimeLogEntry, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'isInvoiced'>) => {
    const before = captureStoreSlices(['timeLogs', 'freelanceProjects']);
    const prevProject = globalState.freelanceProjects.find((p) => p.id === entryData.projectId);
    const trace = getTraceContext();
    const entry: TimeLogEntry = {
      ...trace,
      ...entryData,
      id: `time_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const updatedProject = updatedProjects.find((p) => p.id === entry.projectId);
    const after = captureStoreSlices(['timeLogs', 'freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Logged time: ${entry.taskDescription} (${addHours}h)`,
        `Temps saisi : ${entry.taskDescription} (${addHours}h)`,
        `تسجيل وقت: ${entry.taskDescription} (${addHours}س)`
      ),
      entityLabel: entry.taskDescription,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteTimeLog(entry.id, globalState.currentUser?.id).catch(() => {});
          if (prevProject) freelanceService.upsertProject(prevProject).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_time_logs', entry.id, globalState.currentUser?.id)
            .then(() => freelanceService.upsertTimeLog(entry))
            .catch(() => {});
          if (updatedProject) freelanceService.upsertProject(updatedProject).catch(() => {});
        }
      },
    });

    return entry;
  };

  const updateTimeLog = (id: string, updates: Partial<TimeLogEntry>) => {
    const current = globalState.timeLogs.find((t) => t.id === id);
    if (!current) return;
    const before = captureStoreSlices(['timeLogs', 'freelanceProjects']);
    const prevProject = globalState.freelanceProjects.find((p) => p.id === current.projectId);

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

    const updatedProject = updatedProjects.find((p) => p.id === current.projectId);
    const after = captureStoreSlices(['timeLogs', 'freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'edit',
      summary: ul(
        `Updated time log: ${target?.taskDescription || current.taskDescription}`,
        `Entrée de temps mise à jour : ${target?.taskDescription || current.taskDescription}`,
        `تحديث سجل الوقت: ${target?.taskDescription || current.taskDescription}`
      ),
      entityLabel: target?.taskDescription || current.taskDescription,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertTimeLog(current).catch(() => {});
          if (prevProject) freelanceService.upsertProject(prevProject).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertTimeLog(target).catch(() => {});
          if (updatedProject) freelanceService.upsertProject(updatedProject).catch(() => {});
        }
      },
    });
  };

  const deleteTimeLog = (id: string) => {
    const current = globalState.timeLogs.find((t) => t.id === id);
    if (!current) return;
    const before = captureStoreSlices(['timeLogs', 'freelanceProjects']);
    const prevProject = globalState.freelanceProjects.find((p) => p.id === current.projectId);

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
      freelanceService.deleteTimeLog(id, globalState.currentUser?.id).catch((err) => {
        console.warn('[store] Supabase deleteTimeLog notice:', err);
      });
    }

    const updatedProject = updatedProjects.find((p) => p.id === current.projectId);
    const after = captureStoreSlices(['timeLogs', 'freelanceProjects']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted time log: ${current.taskDescription}`,
        `Entrée de temps supprimée : ${current.taskDescription}`,
        `حذف سجل الوقت: ${current.taskDescription}`
      ),
      entityLabel: current.taskDescription,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_time_logs', id, globalState.currentUser?.id).catch(() => {});
          if (prevProject) freelanceService.upsertProject(prevProject).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          freelanceService.deleteTimeLog(id, globalState.currentUser?.id).catch(() => {});
          if (updatedProject) freelanceService.upsertProject(updatedProject).catch(() => {});
        }
      },
    });
  };

  const billUnbilledHours = (clientId: string, taxPercent = 0, notes?: string) => {
    const client = globalState.freelanceClients.find((c) => c.id === clientId);
    if (!client) throw new Error('Client not found');

    const unbilled = globalState.timeLogs.filter(
      (t) => t.clientId === clientId && t.isBillable && !t.isInvoiced
    );
    if (unbilled.length === 0) throw new Error('No unbilled hours available for this client');

    const before = captureStoreSlices(['freelanceInvoices', 'timeLogs', 'freelanceClients']);
    const totalHours = unbilled.reduce((sum, item) => sum + item.durationSeconds / 3600, 0);
    const subtotal = unbilled.reduce((sum, item) => sum + (item.durationSeconds / 3600) * item.rateAtMoment, 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const taxAmount = Math.round((roundedSubtotal * (taxPercent / 100)) * 100) / 100;
    const totalAmount = roundedSubtotal + taxAmount;

    const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const newInvoice: FreelanceInvoice = {
      ...getTraceContext(),
      id: `inv_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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
        accountHolder: globalState.account.fullName,
        ribOrIban: '002 00012 34567890 12',
      },
      createdAt: new Date().toISOString(),
    };

    const unbilledIds = new Set(unbilled.map((t) => t.id));
    const updatedTimeLogs = globalState.timeLogs.map((t) =>
      unbilledIds.has(t.id) ? { ...t, isInvoiced: true } : t
    );
    const updatedClient = { ...client, lifetimeBilled: client.lifetimeBilled + totalAmount };

    globalState = {
      ...globalState,
      freelanceInvoices: [newInvoice, ...globalState.freelanceInvoices],
      timeLogs: updatedTimeLogs,
      freelanceClients: globalState.freelanceClients.map((c) =>
        c.id === clientId ? updatedClient : c
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

    const after = captureStoreSlices(['freelanceInvoices', 'timeLogs', 'freelanceClients']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Billed ${totalHours.toFixed(1)}h → ${invoiceNum}`,
        `Facturé ${totalHours.toFixed(1)}h → ${invoiceNum}`,
        `فوترة ${totalHours.toFixed(1)}س ← ${invoiceNum}`
      ),
      entityLabel: client.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteInvoice(newInvoice.id, globalState.currentUser?.id).catch(() => {});
          unbilled.forEach((t) => freelanceService.upsertTimeLog({ ...t, isInvoiced: false }).catch(() => {}));
          freelanceService.upsertClient(client).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_invoices', newInvoice.id, globalState.currentUser?.id)
            .then(() => freelanceService.upsertInvoice(newInvoice))
            .catch(() => {});
          unbilled.forEach((t) => freelanceService.upsertTimeLog({ ...t, isInvoiced: true }).catch(() => {}));
          freelanceService.upsertClient(updatedClient).catch(() => {});
        }
      },
    });

    return newInvoice;
  };

  const createFreelanceInvoice = (invoiceData: Omit<FreelanceInvoice, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['freelanceInvoices', 'freelanceClients']);
    const prevClient = globalState.freelanceClients.find((c) => c.id === invoiceData.clientId);
    const newInv: FreelanceInvoice = {
      ...getTraceContext(),
      ...invoiceData,
      id: `inv_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    const updatedClients = globalState.freelanceClients.map((c) =>
      c.id === newInv.clientId ? { ...c, lifetimeBilled: c.lifetimeBilled + newInv.totalAmount } : c
    );
    globalState = {
      ...globalState,
      freelanceInvoices: [newInv, ...globalState.freelanceInvoices],
      freelanceClients: updatedClients,
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.upsertInvoice(newInv).catch((err) => {
        console.warn('[store] Supabase upsertInvoice notice:', err);
      });
    }

    const updatedClient = updatedClients.find((c) => c.id === newInv.clientId);
    const after = captureStoreSlices(['freelanceInvoices', 'freelanceClients']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Created invoice #${newInv.invoiceNumber} (${newInv.clientName})`,
        `Facture créée #${newInv.invoiceNumber} (${newInv.clientName})`,
        `إنشاء فاتورة #${newInv.invoiceNumber} (${newInv.clientName})`
      ),
      entityLabel: newInv.clientName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteInvoice(newInv.id, globalState.currentUser?.id).catch(() => {});
          if (prevClient) freelanceService.upsertClient(prevClient).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_invoices', newInv.id, globalState.currentUser?.id)
            .then(() => freelanceService.upsertInvoice(newInv))
            .catch(() => {});
          if (updatedClient) freelanceService.upsertClient(updatedClient).catch(() => {});
        }
      },
    });

    return newInv;
  };

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus) => {
    const prev = globalState.freelanceInvoices.find((inv) => inv.id === invoiceId);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceInvoices']);
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
    if (target && isSupabaseConfigured()) {
      freelanceService.upsertInvoice(target).catch((err) => {
        console.warn('[store] Supabase updateInvoice notice:', err);
      });
    }

    const after = captureStoreSlices(['freelanceInvoices']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Invoice #${prev.invoiceNumber}: ${status}`,
        `Facture #${prev.invoiceNumber} : ${status}`,
        `الفاتورة #${prev.invoiceNumber}: ${status}`
      ),
      entityLabel: prev.clientName,
      toastType: status === 'Paid' ? 'success' : 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertInvoice(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertInvoice(target).catch(() => {});
        }
      },
    });
  };

  const deleteFreelanceInvoice = (invoiceId: string) => {
    const target = globalState.freelanceInvoices.find((inv) => inv.id === invoiceId);
    if (!target) return;
    const before = captureStoreSlices(['freelanceInvoices', 'timeLogs', 'freelanceClients']);
    const prevClient = globalState.freelanceClients.find((c) => c.id === target.clientId);

    const loggedIds = new Set(
      target.items
        .filter((item) => item.id.startsWith('item_time_'))
        .map((item) => item.id.replace('item_', ''))
    );

    const updatedTimeLogs = globalState.timeLogs.map((t) =>
      loggedIds.has(t.id) ? { ...t, isInvoiced: false } : t
    );

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
      freelanceService.deleteInvoice(invoiceId, globalState.currentUser?.id).catch((err) => {
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

    const updatedClient = updatedClients.find((c) => c.id === target.clientId);
    const after = captureStoreSlices(['freelanceInvoices', 'timeLogs', 'freelanceClients']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted invoice #${target.invoiceNumber}`,
        `Facture supprimée #${target.invoiceNumber}`,
        `حذف الفاتورة #${target.invoiceNumber}`
      ),
      entityLabel: target.clientName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_invoices', invoiceId, globalState.currentUser?.id).catch(() => {});
          loggedIds.forEach((tId) => {
            const logItem = before.timeLogs.find((l) => l.id === tId);
            if (logItem) freelanceService.upsertTimeLog(logItem).catch(() => {});
          });
          if (prevClient) freelanceService.upsertClient(prevClient).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          freelanceService.deleteInvoice(invoiceId, globalState.currentUser?.id).catch(() => {});
          loggedIds.forEach((tId) => {
            const logItem = updatedTimeLogs.find((l) => l.id === tId);
            if (logItem) freelanceService.upsertTimeLog(logItem).catch(() => {});
          });
          if (updatedClient) freelanceService.upsertClient(updatedClient).catch(() => {});
        }
      },
    });
  };

  const createFreelanceProposal = (proposalData: Omit<FreelanceProposal, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['freelanceProposals']);
    const newProp: FreelanceProposal = {
      ...getTraceContext(),
      ...proposalData,
      id: `prop_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const after = captureStoreSlices(['freelanceProposals']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Created proposal: ${newProp.title}`,
        `Proposition créée : ${newProp.title}`,
        `إنشاء عرض سعر: ${newProp.title}`
      ),
      entityLabel: newProp.clientName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteProposal(newProp.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_proposals', newProp.id, globalState.currentUser?.id)
            .then(() => freelanceService.upsertProposal(newProp))
            .catch(() => {});
        }
      },
    });

    return newProp;
  };

  const updateFreelanceProposal = (id: string, updates: Partial<FreelanceProposal>) => {
    const prev = globalState.freelanceProposals.find((p) => p.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceProposals']);
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

    const after = captureStoreSlices(['freelanceProposals']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.status && updates.status !== prev.status ? 'status' : 'edit',
      summary: ul(
        `Updated proposal: ${target?.title || prev.title}`,
        `Proposition mise à jour : ${target?.title || prev.title}`,
        `تحديث عرض السعر: ${target?.title || prev.title}`
      ),
      entityLabel: target?.clientName || prev.clientName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.upsertProposal(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          freelanceService.upsertProposal(target).catch(() => {});
        }
      },
    });
  };

  const deleteFreelanceProposal = (id: string) => {
    const prev = globalState.freelanceProposals.find((p) => p.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceProposals']);
    globalState = {
      ...globalState,
      freelanceProposals: globalState.freelanceProposals.filter((p) => p.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      freelanceService.deleteProposal(id, globalState.currentUser?.id).catch((err) => {
        console.warn('[store] Supabase deleteProposal notice:', err);
      });
    }

    const after = captureStoreSlices(['freelanceProposals']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted proposal: ${prev.title}`,
        `Proposition supprimée : ${prev.title}`,
        `حذف عرض السعر: ${prev.title}`
      ),
      entityLabel: prev.clientName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_proposals', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          freelanceService.deleteProposal(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const convertProposalToProject = (proposalId: string) => {
    const prop = globalState.freelanceProposals.find((p) => p.id === proposalId);
    if (!prop) throw new Error('Proposal not found');

    const before = captureStoreSlices(['freelanceClients', 'freelanceProjects', 'freelanceProposals']);
    let client = globalState.freelanceClients.find(
      (c) => c.email.toLowerCase() === prop.clientEmail.toLowerCase()
    );
    let createdNewClient: FreelanceClient | null = null;
    if (!client) {
      createdNewClient = {
        ...getTraceContext(),
        id: `fcli_${Date.now()}`,
        tenantId: globalState.account.id,
        facilityId: globalState.currentBranchId,
        name: prop.clientName,
        company: prop.clientCompany,
        email: prop.clientEmail,
        currency: prop.currency,
        hourlyRate: prop.pricingModel === 'Hourly' ? 85 : 0,
        status: 'ProjectBased',
        lifetimeBilled: 0,
        createdAt: new Date().toISOString(),
      };
      client = createdNewClient;
      globalState = {
        ...globalState,
        freelanceClients: [createdNewClient, ...globalState.freelanceClients],
      };
    }

    const newProjectId = `fproj_${Date.now()}`;
    const newProject: FreelanceProject = {
      ...getTraceContext(),
      id: newProjectId,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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
        projectId: newProjectId,
        title: item,
        stage: idx === 0 ? 'InProgress' : 'Briefing',
        estimatedHours: Math.round((prop.estimatedTimelineWeeks * 20) / (prop.scopeItems.length || 1)),
        loggedHours: 0,
        dueDate: prop.validUntil,
        isCompleted: false,
      })),
      createdAt: new Date().toISOString(),
    };

    const acceptedProp: FreelanceProposal = { ...prop, status: 'Accepted' };
    globalState = {
      ...globalState,
      freelanceProjects: [newProject, ...globalState.freelanceProjects],
      freelanceProposals: globalState.freelanceProposals.map((p) =>
        p.id === proposalId ? acceptedProp : p
      ),
    };
    notify();

    if (isSupabaseConfigured()) {
      if (createdNewClient) {
        freelanceService.upsertClient(createdNewClient).catch(() => {});
      }
      freelanceService.upsertProject(newProject).catch((err) => {
        console.warn('[store] Failed to save converted project to Supabase:', err);
      });
      freelanceService.upsertProposal(acceptedProp).catch((err) => {
        console.warn('[store] Failed to update proposal status in Supabase:', err);
      });
    }

    const after = captureStoreSlices(['freelanceClients', 'freelanceProjects', 'freelanceProposals']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Converted proposal → project: ${prop.title}`,
        `Proposition convertie en projet : ${prop.title}`,
        `تحويل العرض إلى مشروع: ${prop.title}`
      ),
      entityLabel: prop.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteProject(newProjectId, globalState.currentUser?.id).catch(() => {});
          freelanceService.upsertProposal(prop).catch(() => {});
          if (createdNewClient) {
            freelanceService.deleteClient(createdNewClient.id, globalState.currentUser?.id).catch(() => {});
          }
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          if (createdNewClient) {
            syncCoordinator.restoreRow('freelance_clients', createdNewClient.id, globalState.currentUser?.id)
              .then(() => freelanceService.upsertClient(createdNewClient!))
              .catch(() => {});
          }
          syncCoordinator.restoreRow('freelance_projects', newProjectId, globalState.currentUser?.id)
            .then(() => freelanceService.upsertProject(newProject))
            .catch(() => {});
          freelanceService.upsertProposal(acceptedProp).catch(() => {});
        }
      },
    });

    return newProject;
  };

  const addFreelanceExpense = (expenseData: Omit<FreelanceExpense, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['freelanceExpenses']);
    const newExp: FreelanceExpense = {
      ...getTraceContext(),
      ...expenseData,
      id: `exp_${Date.now()}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const after = captureStoreSlices(['freelanceExpenses']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added expense: ${newExp.vendor} (${newExp.amount.toLocaleString()} ${newExp.currency})`,
        `Dépense ajoutée : ${newExp.vendor} (${newExp.amount.toLocaleString()} ${newExp.currency})`,
        `إضافة مصروف: ${newExp.vendor}`
      ),
      entityLabel: newExp.vendor,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          freelanceService.deleteExpense(newExp.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_expenses', newExp.id, globalState.currentUser?.id)
            .then(() => freelanceService.upsertExpense(newExp))
            .catch(() => {});
        }
      },
    });

    return newExp;
  };

  const deleteFreelanceExpense = (id: string) => {
    const prev = globalState.freelanceExpenses.find((e) => e.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['freelanceExpenses']);
    globalState = {
      ...globalState,
      freelanceExpenses: globalState.freelanceExpenses.filter((e) => e.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      freelanceService.deleteExpense(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['freelanceExpenses']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted expense: ${prev.vendor}`,
        `Dépense supprimée : ${prev.vendor}`,
        `حذف المصروف: ${prev.vendor}`
      ),
      entityLabel: prev.vendor,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('freelance_expenses', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          freelanceService.deleteExpense(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  // ==========================================
  // Rentals & Venue Management Actions
  // ==========================================

  const createRentalBooking = (
    bookingData: Omit<RentalBooking, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'updatedAt'>
  ) => {
    const before = captureStoreSlices(['rentalBookings', 'securityDeposits', 'rentableUnits']);
    const bookingId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bk_${Date.now()}`;
    const newBooking: RentalBooking = {
      ...getTraceContext(),
      ...bookingData,
      id: bookingId,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let newDeposit: SecurityDepositRecord | null = null;
    if (newBooking.depositAmount > 0 && newBooking.depositStatus === 'Held') {
      const depositId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dep_${Date.now()}`;
      newDeposit = {
        ...getTraceContext(),
        id: depositId,
        tenantId: globalState.account.id,
        facilityId: globalState.currentBranchId,
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

    const prevUnit = globalState.rentableUnits.find((u) => u.id === newBooking.unitId);
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
      rentalService.upsertBooking(newBooking).catch(() => {});
      if (newDeposit) {
        rentalService.upsertDeposit(newDeposit).catch((err) => console.warn('[store] Supabase upsertDeposit notice:', err));
      }
      const chgUnit = updatedUnits.find((u) => u.id === newBooking.unitId);
      if (chgUnit && newBooking.status === 'CheckedIn') {
        rentalService.upsertUnit(chgUnit).catch((err) => console.warn('[store] Supabase upsertUnit notice:', err));
      }
    }

    const chgUnit = updatedUnits.find((u) => u.id === newBooking.unitId);
    const after = captureStoreSlices(['rentalBookings', 'securityDeposits', 'rentableUnits']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Booked: ${newBooking.renterName} (${newBooking.unitName})`,
        `Réservation créée : ${newBooking.renterName} (${newBooking.unitName})`,
        `حجز جديد: ${newBooking.renterName} (${newBooking.unitName})`
      ),
      entityLabel: newBooking.renterName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.deleteBooking(newBooking.id, globalState.currentUser?.id).catch(() => {});
          if (newDeposit) rentalService.deleteDeposit(newDeposit.id, globalState.currentUser?.id).catch(() => {});
          if (prevUnit && newBooking.status === 'CheckedIn') rentalService.upsertUnit(prevUnit).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('rental_bookings', newBooking.id, globalState.currentUser?.id)
            .then(() => rentalService.upsertBooking(newBooking))
            .catch(() => {});
          if (newDeposit) {
            syncCoordinator.restoreRow('rental_security_deposits', newDeposit.id, globalState.currentUser?.id)
              .then(() => rentalService.upsertDeposit(newDeposit!))
              .catch(() => {});
          }
          if (chgUnit && newBooking.status === 'CheckedIn') {
            rentalService.upsertUnit(chgUnit).catch(() => {});
          }
        }
      },
    });

    return newBooking;
  };

  const updateRentalBooking = (id: string, updates: Partial<RentalBooking>) => {
    const prev = globalState.rentalBookings.find((b) => b.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['rentalBookings']);
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
      rentalService.upsertBooking(target).catch((err) => console.warn('[store] Supabase updateRentalBooking notice:', err));
    }

    const after = captureStoreSlices(['rentalBookings']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.status && updates.status !== prev.status ? 'status' : 'edit',
      summary: ul(
        `Updated booking: ${target?.renterName || prev.renterName}`,
        `Réservation mise à jour : ${target?.renterName || prev.renterName}`,
        `تحديث الحجز: ${target?.renterName || prev.renterName}`
      ),
      entityLabel: target?.renterName || prev.renterName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.upsertBooking(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          rentalService.upsertBooking(target).catch(() => {});
        }
      },
    });
  };

  const deleteRentalBooking = (id: string) => {
    const target = globalState.rentalBookings.find((b) => b.id === id);
    if (!target) return;
    const before = captureStoreSlices(['rentalBookings']);
    globalState = {
      ...globalState,
      rentalBookings: globalState.rentalBookings.filter((b) => b.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService.deleteBooking(id, globalState.currentUser?.id).catch((err) => console.warn('[store] Supabase deleteRentalBooking notice:', err));
    }

    const after = captureStoreSlices(['rentalBookings']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted booking: ${target.renterName}`,
        `Réservation supprimée : ${target.renterName}`,
        `حذف الحجز: ${target.renterName}`
      ),
      entityLabel: target.renterName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('rental_bookings', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          rentalService.deleteBooking(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const checkInBooking = (id: string) => {
    const booking = globalState.rentalBookings.find((b) => b.id === id);
    if (!booking) return;
    const prevUnit = globalState.rentableUnits.find((u) => u.id === booking.unitId);
    const before = captureStoreSlices(['rentalBookings', 'rentableUnits']);

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

    const nextBooking = updatedBookings.find((x) => x.id === id);
    const nextUnit = updatedUnits.find((x) => x.id === booking.unitId);
    if (isSupabaseConfigured()) {
      if (nextBooking) rentalService.upsertBooking(nextBooking).catch(console.warn);
      if (nextUnit) rentalService.upsertUnit(nextUnit).catch(console.warn);
    }

    const after = captureStoreSlices(['rentalBookings', 'rentableUnits']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Checked in: ${booking.renterName} (${booking.unitName})`,
        `Arrivée enregistrée : ${booking.renterName} (${booking.unitName})`,
        `تسجيل دخول: ${booking.renterName} (${booking.unitName})`
      ),
      entityLabel: booking.renterName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.upsertBooking(booking).catch(() => {});
          if (prevUnit) rentalService.upsertUnit(prevUnit).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          if (nextBooking) rentalService.upsertBooking(nextBooking).catch(() => {});
          if (nextUnit) rentalService.upsertUnit(nextUnit).catch(() => {});
        }
      },
    });
  };

  const checkOutBooking = (id: string) => {
    const booking = globalState.rentalBookings.find((b) => b.id === id);
    if (!booking) return;
    const prevUnit = globalState.rentableUnits.find((u) => u.id === booking.unitId);
    const before = captureStoreSlices(['rentalBookings', 'rentableUnits']);

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

    const nextBooking = updatedBookings.find((x) => x.id === id);
    const nextUnit = updatedUnits.find((x) => x.id === booking.unitId);
    if (isSupabaseConfigured()) {
      if (nextBooking) rentalService.upsertBooking(nextBooking).catch(console.warn);
      if (nextUnit) rentalService.upsertUnit(nextUnit).catch(console.warn);
    }

    const after = captureStoreSlices(['rentalBookings', 'rentableUnits']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Checked out: ${booking.renterName} (${booking.unitName})`,
        `Sortie terminée : ${booking.renterName} (${booking.unitName})`,
        `تسجيل خروج: ${booking.renterName} (${booking.unitName})`
      ),
      entityLabel: booking.unitName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.upsertBooking(booking).catch(() => {});
          if (prevUnit) rentalService.upsertUnit(prevUnit).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          if (nextBooking) rentalService.upsertBooking(nextBooking).catch(() => {});
          if (nextUnit) rentalService.upsertUnit(nextUnit).catch(() => {});
        }
      },
    });
  };

  const createRentableUnit = (
    unitData: Omit<RentableUnit, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>
  ) => {
    const before = captureStoreSlices(['rentableUnits']);
    const unitId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `unit_${Date.now()}`;
    const newUnit: RentableUnit = {
      ...getTraceContext(),
      ...unitData,
      id: unitId,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      rentableUnits: [newUnit, ...globalState.rentableUnits],
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService.upsertUnit(newUnit).catch((err) => console.warn('[store] Supabase upsertUnit notice:', err));
    }

    const after = captureStoreSlices(['rentableUnits']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added space: ${newUnit.name}`,
        `Espace ajouté : ${newUnit.name}`,
        `إضافة مساحة: ${newUnit.name}`
      ),
      entityLabel: newUnit.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.deleteUnit(newUnit.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('rental_units', newUnit.id, globalState.currentUser?.id)
            .then(() => rentalService.upsertUnit(newUnit))
            .catch(() => {});
        }
      },
    });

    return newUnit;
  };

  const updateRentableUnit = (id: string, updates: Partial<RentableUnit>) => {
    const prev = globalState.rentableUnits.find((u) => u.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['rentableUnits']);
    const updatedUnits = globalState.rentableUnits.map((u) => (u.id === id ? { ...u, ...updates } : u));
    globalState = {
      ...globalState,
      rentableUnits: updatedUnits,
    };
    notify();

    const target = updatedUnits.find((u) => u.id === id);
    if (target && isSupabaseConfigured()) {
      rentalService.upsertUnit(target).catch((err) => console.warn('[store] Supabase updateRentableUnit notice:', err));
    }

    const after = captureStoreSlices(['rentableUnits']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.status && updates.status !== prev.status ? 'status' : 'edit',
      summary: ul(
        `Updated space: ${target?.name || prev.name}`,
        `Espace mis à jour : ${target?.name || prev.name}`,
        `تحديث المساحة: ${target?.name || prev.name}`
      ),
      entityLabel: target?.name || prev.name,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.upsertUnit(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          rentalService.upsertUnit(target).catch(() => {});
        }
      },
    });
  };

  const deleteRentableUnit = (id: string) => {
    const target = globalState.rentableUnits.find((u) => u.id === id);
    if (!target) return;
    const before = captureStoreSlices(['rentableUnits']);
    globalState = {
      ...globalState,
      rentableUnits: globalState.rentableUnits.filter((u) => u.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService.deleteUnit(id, globalState.currentUser?.id).catch((err) => console.warn('[store] Supabase deleteRentableUnit notice:', err));
    }

    const after = captureStoreSlices(['rentableUnits']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted space: ${target.name}`,
        `Espace supprimé : ${target.name}`,
        `حذف المساحة: ${target.name}`
      ),
      entityLabel: target.name,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('rental_units', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          rentalService.deleteUnit(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const createRentalRenter = (
    renterData: Omit<RentalRenter, 'id' | 'tenantId' | 'facilityId' | 'totalBookings' | 'totalSpent' | 'createdAt'>
  ) => {
    const before = captureStoreSlices(['rentalRenters']);
    const renterId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rnt_${Date.now()}`;
    const newRenter: RentalRenter = {
      ...getTraceContext(),
      ...renterData,
      id: renterId,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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
      rentalService.upsertRenter(newRenter).catch((err) => console.warn('[store] Supabase upsertRenter notice:', err));
    }

    const after = captureStoreSlices(['rentalRenters']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added renter: ${newRenter.fullName}`,
        `Locataire ajouté : ${newRenter.fullName}`,
        `إضافة مستأجر: ${newRenter.fullName}`
      ),
      entityLabel: newRenter.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.deleteRenter(newRenter.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('rental_renters', newRenter.id, globalState.currentUser?.id)
            .then(() => rentalService.upsertRenter(newRenter))
            .catch(() => {});
        }
      },
    });

    return newRenter;
  };

  const updateRentalRenter = (id: string, updates: Partial<RentalRenter>) => {
    const prev = globalState.rentalRenters.find((r) => r.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['rentalRenters']);
    const updatedRenters = globalState.rentalRenters.map((r) => (r.id === id ? { ...r, ...updates } : r));
    globalState = {
      ...globalState,
      rentalRenters: updatedRenters,
    };
    notify();

    const target = updatedRenters.find((r) => r.id === id);
    if (target && isSupabaseConfigured()) {
      rentalService.upsertRenter(target).catch((err) => console.warn('[store] Supabase updateRentalRenter notice:', err));
    }

    const after = captureStoreSlices(['rentalRenters']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'edit',
      summary: ul(
        `Updated renter: ${target?.fullName || prev.fullName}`,
        `Locataire mis à jour : ${target?.fullName || prev.fullName}`,
        `تحديث المستأجر: ${target?.fullName || prev.fullName}`
      ),
      entityLabel: target?.fullName || prev.fullName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.upsertRenter(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          rentalService.upsertRenter(target).catch(() => {});
        }
      },
    });
  };

  const deleteRentalRenter = (id: string) => {
    const target = globalState.rentalRenters.find((r) => r.id === id);
    if (!target) return;
    const before = captureStoreSlices(['rentalRenters']);
    globalState = {
      ...globalState,
      rentalRenters: globalState.rentalRenters.filter((r) => r.id !== id),
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService.deleteRenter(id, globalState.currentUser?.id).catch((err) => console.warn('[store] Supabase deleteRentalRenter notice:', err));
    }

    const after = captureStoreSlices(['rentalRenters']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted renter: ${target.fullName}`,
        `Locataire supprimé : ${target.fullName}`,
        `حذف المستأجر: ${target.fullName}`
      ),
      entityLabel: target.fullName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('rental_renters', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          rentalService.deleteRenter(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const releaseSecurityDeposit = (depositId: string) => {
    const target = globalState.securityDeposits.find((d) => d.id === depositId);
    if (!target) return;
    const prevBooking = target.bookingId
      ? globalState.rentalBookings.find((b) => b.id === target.bookingId)
      : undefined;
    const before = captureStoreSlices(['securityDeposits', 'rentalBookings']);

    const updatedDeposits = globalState.securityDeposits.map((d) =>
      d.id === depositId
        ? { ...d, status: 'Released' as const, releasedAt: new Date().toISOString() }
        : d
    );
    let updatedBookings = globalState.rentalBookings;
    if (target.bookingId) {
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

    const nextDeposit = updatedDeposits.find((d) => d.id === depositId);
    const nextBooking = target.bookingId ? updatedBookings.find((b) => b.id === target.bookingId) : undefined;
    if (isSupabaseConfigured()) {
      if (nextDeposit) rentalService.upsertDeposit(nextDeposit).catch(console.warn);
      if (nextBooking) rentalService.upsertBooking(nextBooking).catch(console.warn);
    }

    const after = captureStoreSlices(['securityDeposits', 'rentalBookings']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Released deposit: ${target.renterName}`,
        `Caution restituée : ${target.renterName}`,
        `رد الكفالة: ${target.renterName}`
      ),
      entityLabel: target.renterName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.upsertDeposit(target).catch(() => {});
          if (prevBooking) rentalService.upsertBooking(prevBooking).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          if (nextDeposit) rentalService.upsertDeposit(nextDeposit).catch(() => {});
          if (nextBooking) rentalService.upsertBooking(nextBooking).catch(() => {});
        }
      },
    });
  };

  const deductSecurityDeposit = (depositId: string, reason: string, deductedAmount?: number) => {
    const target = globalState.securityDeposits.find((d) => d.id === depositId);
    if (!target) return;
    const prevBooking = target.bookingId
      ? globalState.rentalBookings.find((b) => b.id === target.bookingId)
      : undefined;
    const before = captureStoreSlices(['securityDeposits', 'rentalBookings']);

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

    const nextDeposit = updatedDeposits.find((d) => d.id === depositId);
    const nextBooking = target.bookingId ? updatedBookings.find((b) => b.id === target.bookingId) : undefined;
    if (isSupabaseConfigured()) {
      if (nextDeposit) rentalService.upsertDeposit(nextDeposit).catch(console.warn);
      if (nextBooking) rentalService.upsertBooking(nextBooking).catch(console.warn);
    }

    const after = captureStoreSlices(['securityDeposits', 'rentalBookings']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Deducted deposit: ${target.renterName} (${reason})`,
        `Caution retenue : ${target.renterName}`,
        `خصم كفالة: ${target.renterName}`
      ),
      entityLabel: target.renterName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          rentalService.upsertDeposit(target).catch(() => {});
          if (prevBooking) rentalService.upsertBooking(prevBooking).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          if (nextDeposit) rentalService.upsertDeposit(nextDeposit).catch(() => {});
          if (nextBooking) rentalService.upsertBooking(nextBooking).catch(() => {});
        }
      },
    });
  };

  const issueDepositReceiptPrint = async (depositId: string) => {
    const target = globalState.securityDeposits.find((d) => d.id === depositId);
    if (!target) return null;

    let allocatedNumber = target.depositReceiptNumber || '';
    if (!allocatedNumber) {
      const branchId = target.branchId || target.facilityId || globalState.currentBranchId;
      const businessId = target.businessId || globalState.currentBusinessId;
      if (isSupabaseConfigured() && businessId && branchId) {
        const res = await sequenceService.allocateFromDeviceBlock({
          businessId,
          branchId,
          docType: 'deposit_receipt',
        });
        if (res.data?.formattedNumber) {
          allocatedNumber = res.data.formattedNumber;
        }
      }
      if (!allocatedNumber) {
        const year = new Date().getFullYear();
        const existingSeqs = globalState.securityDeposits
          .map((d) => {
            const match = String(d.depositReceiptNumber || '').match(/(\d+)$/);
            return match ? Number(match[1]) : 0;
          })
          .filter((n) => n > 0);
        const nextNum = (existingSeqs.length > 0 ? Math.max(...existingSeqs) : 0) + 1;
        allocatedNumber = `DR-${year}-${String(nextNum).padStart(5, '0')}`;
      }
    }

    const prep = prepareDepositReceiptPrint(
      allocatedNumber,
      target.printedCount,
      () => allocatedNumber
    );

    const updatedDeposit: SecurityDepositRecord = {
      ...target,
      depositReceiptNumber: prep.depositReceiptNumber,
      printedCount: prep.printedCount,
    };

    globalState = {
      ...globalState,
      securityDeposits: globalState.securityDeposits.map((d) =>
        d.id === depositId ? updatedDeposit : d
      ),
    };
    notify();

    if (isSupabaseConfigured()) {
      rentalService.upsertDeposit(updatedDeposit).catch(console.warn);
    }

    return {
      deposit: updatedDeposit,
      ...prep,
    };
  };

  const resetVenueMockData = () => {
    const before = captureStoreSlices(['rentableUnits', 'rentalRenters', 'rentalBookings', 'securityDeposits']);
    const targetFacilityId = globalState.currentBranchId || 'branch_venue_main';
    const targetAccountId =
      globalState.account?.id?.trim() || (isDemoModeEnabled() ? INITIAL_ACCOUNT.id : '');
    if (!targetAccountId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', globalState.language),
        message: t('tenant_context_missing_msg', globalState.language),
      });
      return;
    }
    const targetBusinessId = globalState.currentBusinessId || 'biz_venue';

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

    const after = captureStoreSlices(['rentableUnits', 'rentalRenters', 'rentalBookings', 'securityDeposits']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: freshBookings.length + freshUnits.length,
      summary: ul(
        'Venue & Rental demo data recharged',
        'Données Démo Espace & Lieux réinitialisées',
        'إعادة ضبط بيانات التأجير والقاعات'
      ),
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };

  const resetEduMockData = () => {
    const before = captureStoreSlices([
      'eduStudents',
      'eduCohorts',
      'eduEnrollments',
      'eduSessions',
      'eduAttendance',
      'eduGrades',
      'eduCertificates',
      'eduAdmissions',
    ]);
    const targetFacilityId = globalState.currentBranchId || 'branch_edu_main';
    const targetAccountId =
      globalState.account?.id?.trim() || (isDemoModeEnabled() ? INITIAL_ACCOUNT.id : '');
    if (!targetAccountId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', globalState.language),
        message: t('tenant_context_missing_msg', globalState.language),
      });
      return;
    }
    const targetBusinessId = globalState.currentBusinessId || 'biz_edu';

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

    const after = captureStoreSlices([
      'eduStudents',
      'eduCohorts',
      'eduEnrollments',
      'eduSessions',
      'eduAttendance',
      'eduGrades',
      'eduCertificates',
      'eduAdmissions',
    ]);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: freshStudents.length + freshCohorts.length,
      summary: ul(
        'Education & Academy demo data recharged',
        'Données Démo Académie réinitialisées',
        'إعادة ضبط بيانات الأكاديمية'
      ),
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };

  const resetFreelanceMockData = () => {
    const before = captureStoreSlices([
      'freelanceClients',
      'freelanceProjects',
      'timeLogs',
      'freelanceInvoices',
      'freelanceProposals',
      'freelanceExpenses',
    ]);
    const targetFacilityId = globalState.currentBranchId || 'branch_freelance_main';
    const targetAccountId =
      globalState.account?.id?.trim() || (isDemoModeEnabled() ? INITIAL_ACCOUNT.id : '');
    if (!targetAccountId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', globalState.language),
        message: t('tenant_context_missing_msg', globalState.language),
      });
      return;
    }

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

    const after = captureStoreSlices([
      'freelanceClients',
      'freelanceProjects',
      'timeLogs',
      'freelanceInvoices',
      'freelanceProposals',
      'freelanceExpenses',
    ]);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: freshClients.length + freshProjects.length,
      summary: ul(
        'Freelance & Studio demo data recharged',
        'Données Démo Freelance réinitialisées',
        'إعادة ضبط بيانات الاستوديو والعمل الحر'
      ),
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };

  // ==========================================
  // Education & Academy Actions (Category 15)
  // ==========================================

  const addEduStudent = (studentData: Omit<EduStudent, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['eduStudents']);
    const newStudent: EduStudent = {
      ...getTraceContext(),
      ...studentData,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduStudents: [newStudent, ...(globalState.eduStudents || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertStudent(newStudent).catch(() => {});
    }
    const after = captureStoreSlices(['eduStudents']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added student: ${newStudent.fullName}`,
        `Étudiant ajouté : ${newStudent.fullName}`,
        `إضافة طالب: ${newStudent.fullName}`
      ),
      entityLabel: newStudent.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.deleteStudent(newStudent.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_students', newStudent.id, globalState.currentUser?.id)
            .then(() => educationService.upsertStudent(newStudent))
            .catch(() => {});
        }
      },
    });
    return newStudent;
  };

  const updateEduStudent = (studentId: string, updates: Partial<EduStudent>) => {
    const prev = (globalState.eduStudents || []).find((s) => s.id === studentId);
    if (!prev) return;
    const before = captureStoreSlices(['eduStudents']);
    const updatedStudents = (globalState.eduStudents || []).map((s) =>
      s.id === studentId ? { ...s, ...updates } : s
    );
    globalState = {
      ...globalState,
      eduStudents: updatedStudents,
    };
    notify();
    const target = updatedStudents.find((s) => s.id === studentId);
    if (target && isSupabaseConfigured()) {
      educationService.upsertStudent(target).catch(() => {});
    }
    const after = captureStoreSlices(['eduStudents']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.status && updates.status !== prev.status ? 'status' : 'edit',
      summary: ul(
        `Updated student: ${target?.fullName || prev.fullName}`,
        `Étudiant mis à jour : ${target?.fullName || prev.fullName}`,
        `تحديث الطالب: ${target?.fullName || prev.fullName}`
      ),
      entityLabel: target?.fullName || prev.fullName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.upsertStudent(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          educationService.upsertStudent(target).catch(() => {});
        }
      },
    });
  };

  const deleteEduStudent = (studentId: string) => {
    const student = (globalState.eduStudents || []).find((s) => s.id === studentId);
    if (!student) return;
    const before = captureStoreSlices(['eduStudents', 'eduEnrollments', 'eduAttendance', 'eduGrades']);
    globalState = {
      ...globalState,
      eduStudents: (globalState.eduStudents || []).filter((s) => s.id !== studentId),
      eduEnrollments: (globalState.eduEnrollments || []).filter((e) => e.studentId !== studentId),
      eduAttendance: (globalState.eduAttendance || []).filter((a) => a.studentId !== studentId),
      eduGrades: (globalState.eduGrades || []).filter((g) => g.studentId !== studentId),
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.deleteStudent(studentId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['eduStudents', 'eduEnrollments', 'eduAttendance', 'eduGrades']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted student: ${student.fullName}`,
        `Étudiant supprimé : ${student.fullName}`,
        `حذف الطالب: ${student.fullName}`
      ),
      entityLabel: student.fullName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_students', studentId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          educationService.deleteStudent(studentId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const addEduCohort = (cohortData: Omit<EduCohort, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'enrolledCount'>) => {
    const before = captureStoreSlices(['eduCohorts']);
    const newCohort: EduCohort = {
      ...getTraceContext(),
      ...cohortData,
      id: `cohort_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      enrolledCount: 0,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduCohorts: [newCohort, ...(globalState.eduCohorts || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertCohort(newCohort).catch(() => {});
    }
    const after = captureStoreSlices(['eduCohorts']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Created cohort: ${newCohort.name}`,
        `Promotion créée : ${newCohort.name}`,
        `إنشاء فوج: ${newCohort.name}`
      ),
      entityLabel: newCohort.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.deleteCohort(newCohort.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_cohorts', newCohort.id, globalState.currentUser?.id)
            .then(() => educationService.upsertCohort(newCohort))
            .catch(() => {});
        }
      },
    });
    return newCohort;
  };

  const updateEduCohort = (cohortId: string, updates: Partial<EduCohort>) => {
    const prev = (globalState.eduCohorts || []).find((c) => c.id === cohortId);
    if (!prev) return;
    const before = captureStoreSlices(['eduCohorts']);
    const updatedCohorts = (globalState.eduCohorts || []).map((ch) =>
      ch.id === cohortId ? { ...ch, ...updates } : ch
    );
    globalState = {
      ...globalState,
      eduCohorts: updatedCohorts,
    };
    notify();
    const target = updatedCohorts.find((c) => c.id === cohortId);
    if (target && isSupabaseConfigured()) {
      educationService.upsertCohort(target).catch(() => {});
    }
    const after = captureStoreSlices(['eduCohorts']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.status && updates.status !== prev.status ? 'status' : 'edit',
      summary: ul(
        `Updated cohort: ${target?.name || prev.name}`,
        `Promotion mise à jour : ${target?.name || prev.name}`,
        `تحديث الفوج: ${target?.name || prev.name}`
      ),
      entityLabel: target?.name || prev.name,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.upsertCohort(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          educationService.upsertCohort(target).catch(() => {});
        }
      },
    });
  };

  const deleteEduCohort = (cohortId: string) => {
    const prev = (globalState.eduCohorts || []).find((c) => c.id === cohortId);
    if (!prev) return;
    const before = captureStoreSlices(['eduCohorts', 'eduSessions']);
    globalState = {
      ...globalState,
      eduCohorts: (globalState.eduCohorts || []).filter((ch) => ch.id !== cohortId),
      eduSessions: (globalState.eduSessions || []).filter((s) => s.cohortId !== cohortId),
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.deleteCohort(cohortId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['eduCohorts', 'eduSessions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted cohort: ${prev.name}`,
        `Promotion supprimée : ${prev.name}`,
        `حذف الفوج: ${prev.name}`
      ),
      entityLabel: prev.name,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_cohorts', cohortId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          educationService.deleteCohort(cohortId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const addEduSession = (sessionData: Omit<EduSession, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['eduSessions']);
    const newSession: EduSession = {
      ...getTraceContext(),
      ...sessionData,
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduSessions: [...(globalState.eduSessions || []), newSession],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertSession(newSession).catch(() => {});
    }
    const after = captureStoreSlices(['eduSessions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Scheduled class: ${newSession.cohortName} (${newSession.date})`,
        `Séance planifiée : ${newSession.cohortName} (${newSession.date})`,
        `جدولة حصة: ${newSession.cohortName}`
      ),
      entityLabel: newSession.cohortName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.deleteSession(newSession.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_sessions', newSession.id, globalState.currentUser?.id)
            .then(() => educationService.upsertSession(newSession))
            .catch(() => {});
        }
      },
    });
    return newSession;
  };

  const updateEduSession = (sessionId: string, updates: Partial<EduSession>) => {
    const prev = (globalState.eduSessions || []).find((se) => se.id === sessionId);
    if (!prev) return;
    const before = captureStoreSlices(['eduSessions']);
    const updatedSessions = (globalState.eduSessions || []).map((se) =>
      se.id === sessionId ? { ...se, ...updates } : se
    );
    globalState = {
      ...globalState,
      eduSessions: updatedSessions,
    };
    notify();
    const target = updatedSessions.find((s) => s.id === sessionId);
    if (target && isSupabaseConfigured()) {
      educationService.upsertSession(target).catch(() => {});
    }
    const after = captureStoreSlices(['eduSessions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.status && updates.status !== prev.status ? 'status' : 'edit',
      summary: ul(
        `Updated session: ${target?.cohortName || prev.cohortName}`,
        `Séance mise à jour : ${target?.cohortName || prev.cohortName}`,
        `تحديث الحصة: ${target?.cohortName || prev.cohortName}`
      ),
      entityLabel: target?.cohortName || prev.cohortName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.upsertSession(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          educationService.upsertSession(target).catch(() => {});
        }
      },
    });
  };

  const deleteEduSession = (sessionId: string) => {
    const prev = (globalState.eduSessions || []).find((se) => se.id === sessionId);
    if (!prev) return;
    const before = captureStoreSlices(['eduSessions']);
    globalState = {
      ...globalState,
      eduSessions: (globalState.eduSessions || []).filter((se) => se.id !== sessionId),
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.deleteSession(sessionId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['eduSessions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted session: ${prev.cohortName} (${prev.date})`,
        `Séance supprimée : ${prev.cohortName} (${prev.date})`,
        `حذف الحصة: ${prev.cohortName}`
      ),
      entityLabel: prev.cohortName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_sessions', sessionId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          educationService.deleteSession(sessionId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const batchRecordAttendance = (
    sessionId: string,
    cohortId: string,
    records: { studentId: string; studentName: string; status: AttendanceStatus; minutesLate?: number; excuseNote?: string; reason?: string }[]
  ) => {
    const before = captureStoreSlices(['eduAttendance', 'eduQuickAttendance', 'eduSessions', 'eduStudents']);
    const prevSession = (globalState.eduSessions || []).find((s) => s.id === sessionId);
    const prevAttendanceForSession = (globalState.eduAttendance || []).filter((a) => a.sessionId === sessionId);
    const nowIso = new Date().toISOString();
    const staffId = globalState.currentUser?.id || 'stf_01';
    const trace = getTraceContext();
    const newRecords: EduAttendance[] = records.map((r) => {
      const prevRec = prevAttendanceForSession.find((p) => p.studentId === r.studentId);
      const changeHistory = appendEduAttendanceChange(
        prevRec,
        r.status,
        staffId,
        r.reason || 'Roll call saved',
        nowIso
      );
      return {
        ...trace,
        id: prevRec?.id || generateClientUuid(),
        tenantId: globalState.account.id,
        facilityId: globalState.currentBranchId,
        sessionId,
        cohortId,
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status,
        minutesLate: r.minutesLate,
        excuseNote: r.excuseNote,
        recordedAt: nowIso,
        markedBy: staffId,
        markedAt: nowIso,
        isLocked: true,
        changeHistory,
      };
    });

    const existing = (globalState.eduAttendance || []).filter((a) => a.sessionId !== sessionId);
    const updatedAttendance = dedupeEduAttendanceRecords([...newRecords, ...existing]);

    const mappedQuick: EduQuickAttendanceRecord[] = newRecords.map((rec) => ({
      sessionId: rec.sessionId,
      cohortId: rec.cohortId,
      studentId: rec.studentId,
      studentName: rec.studentName,
      status: rec.status.toLowerCase() as EduQuickAttendanceRecord['status'],
      markedAt: nowIso,
      markedByStaffId: globalState.currentUser?.fullName || staffId,
      isLocked: true,
    }));
    const otherQuick = (globalState.eduQuickAttendance || []).filter((q) => q.sessionId !== sessionId);

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
      eduQuickAttendance: [...mappedQuick, ...otherQuick],
      eduSessions: updatedSessions,
      eduStudents: updatedStudents,
    };
    notify();

    const targetSession = updatedSessions.find((s) => s.id === sessionId);
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        [
          ...newRecords.map((rec) => () => educationService.upsertAttendance(rec)),
          ...(targetSession ? [() => educationService.upsertSession(targetSession)] : []),
        ],
        4
      ).catch(() => {});
    }

    const presentTally = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
    const after = captureStoreSlices(['eduAttendance', 'eduQuickAttendance', 'eduSessions', 'eduStudents']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'bulk',
      affectedCount: records.length,
      summary: ul(
        `Roll call: ${presentTally}/${records.length} present`,
        `Appel validé : ${presentTally}/${records.length} présents`,
        `تسجيل الحضور: ${presentTally}/${records.length}`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          const prevIds = new Set(prevAttendanceForSession.map((p) => p.id));
          runWithConcurrency(
            [
              ...newRecords
                .filter((rec) => !prevIds.has(rec.id))
                .map((rec) => () => syncCoordinator.softDeleteRow('edu_attendance', rec.id, globalState.currentUser?.id)),
              ...prevAttendanceForSession.map((rec) => () => educationService.upsertAttendance(rec)),
              ...(prevSession ? [() => educationService.upsertSession(prevSession)] : []),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              ...newRecords.map((rec) => () =>
                syncCoordinator.restoreRow('edu_attendance', rec.id, globalState.currentUser?.id)
                  .then(() => educationService.upsertAttendance(rec))
              ),
              ...(targetSession ? [() => educationService.upsertSession(targetSession)] : []),
            ],
            4
          ).catch(() => {});
        }
      },
    });
  };

  const recordEduGrade = (gradeData: Omit<EduGrade, 'id' | 'tenantId' | 'facilityId' | 'gradedAt'>) => {
    const before = captureStoreSlices(['eduGrades']);
    const newGrade: EduGrade = {
      ...getTraceContext(),
      ...gradeData,
      id: `grd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      gradedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduGrades: [newGrade, ...(globalState.eduGrades || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertGrade(newGrade).catch(() => {});
    }
    const after = captureStoreSlices(['eduGrades']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Recorded grade: ${newGrade.studentName} (${newGrade.score}/${newGrade.maxScore})`,
        `Note saisie : ${newGrade.studentName} (${newGrade.score}/${newGrade.maxScore})`,
        `رصد علامة: ${newGrade.studentName} (${newGrade.score}/${newGrade.maxScore})`
      ),
      entityLabel: newGrade.studentName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.deleteGrade(newGrade.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_grades', newGrade.id, globalState.currentUser?.id)
            .then(() => educationService.upsertGrade(newGrade))
            .catch(() => {});
        }
      },
    });
    return newGrade;
  };

  const deleteEduGrade = (gradeId: string) => {
    const prev = (globalState.eduGrades || []).find((g) => g.id === gradeId);
    if (!prev) return;
    const before = captureStoreSlices(['eduGrades']);
    globalState = {
      ...globalState,
      eduGrades: (globalState.eduGrades || []).filter((g) => g.id !== gradeId),
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.deleteGrade(gradeId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['eduGrades']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted grade: ${prev.studentName} (${prev.assessmentTitle})`,
        `Note supprimée : ${prev.studentName}`,
        `حذف علامة: ${prev.studentName}`
      ),
      entityLabel: prev.studentName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_grades', gradeId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          educationService.deleteGrade(gradeId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const recordTuitionPayment = (
    enrollmentId: string,
    installmentIndex: number,
    amount: number,
    paymentMethod: string = 'Cash'
  ) => {
    const prevEn = (globalState.eduEnrollments || []).find((e) => e.id === enrollmentId);
    if (!prevEn) return;
    const before = captureStoreSlices(['eduEnrollments']);
    const nowIso = new Date().toISOString();
    const updatedEnrollments = (globalState.eduEnrollments || []).map((en) => {
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
    });
    globalState = {
      ...globalState,
      eduEnrollments: updatedEnrollments,
    };
    notify();
    const updatedEn = updatedEnrollments.find((e) => e.id === enrollmentId);
    if (updatedEn && isSupabaseConfigured()) {
      educationService.upsertEnrollment(updatedEn).catch(() => {});
    }
    const after = captureStoreSlices(['eduEnrollments']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Tuition payment: ${prevEn.studentName} (${amount.toLocaleString()} DZD · ${paymentMethod})`,
        `Paiement scolarité : ${prevEn.studentName} (${amount.toLocaleString()} DZD)`,
        `دفع رسوم: ${prevEn.studentName} (${amount.toLocaleString()} دج)`
      ),
      entityLabel: prevEn.studentName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.upsertEnrollment(prevEn).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updatedEn && isSupabaseConfigured()) {
          educationService.upsertEnrollment(updatedEn).catch(() => {});
        }
      },
    });
  };

  const addEduEnrollment = (enrollmentData: Omit<EduEnrollment, 'id' | 'tenantId' | 'facilityId' | 'enrolledAt'>) => {
    const before = captureStoreSlices(['eduEnrollments', 'eduCohorts']);
    const prevCohort = (globalState.eduCohorts || []).find((c) => c.id === enrollmentData.cohortId);
    const newEnrollment: EduEnrollment = {
      ...getTraceContext(),
      ...enrollmentData,
      id: `enr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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
    const targetCohort = updatedCohorts.find((c) => c.id === newEnrollment.cohortId);
    if (isSupabaseConfigured()) {
      educationService.upsertEnrollment(newEnrollment).catch(() => {});
      if (targetCohort) educationService.upsertCohort(targetCohort).catch(() => {});
    }
    const after = captureStoreSlices(['eduEnrollments', 'eduCohorts']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Enrolled: ${newEnrollment.studentName} → ${newEnrollment.cohortName}`,
        `Inscription confirmée : ${newEnrollment.studentName}`,
        `تسجيل طالب: ${newEnrollment.studentName}`
      ),
      entityLabel: newEnrollment.studentName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('edu_enrollments', newEnrollment.id, globalState.currentUser?.id).catch(() => {});
          if (prevCohort) educationService.upsertCohort(prevCohort).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_enrollments', newEnrollment.id, globalState.currentUser?.id)
            .then(() => educationService.upsertEnrollment(newEnrollment))
            .catch(() => {});
          if (targetCohort) educationService.upsertCohort(targetCohort).catch(() => {});
        }
      },
    });
    return newEnrollment;
  };

  const addEduAdmissionLead = (leadData: Omit<EduAdmissionLead, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['eduAdmissions']);
    const newLead: EduAdmissionLead = {
      ...getTraceContext(),
      ...leadData,
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduAdmissions: [newLead, ...(globalState.eduAdmissions || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertAdmission(newLead).catch(() => {});
    }
    const after = captureStoreSlices(['eduAdmissions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added prospect: ${newLead.studentName}`,
        `Candidat ajouté : ${newLead.studentName}`,
        `إضافة طلب التحاق: ${newLead.studentName}`
      ),
      entityLabel: newLead.studentName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.deleteAdmission(newLead.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_admissions', newLead.id, globalState.currentUser?.id)
            .then(() => educationService.upsertAdmission(newLead))
            .catch(() => {});
        }
      },
    });
    return newLead;
  };

  const updateAdmissionStage = (leadId: string, stage: AdmissionStage) => {
    const prev = (globalState.eduAdmissions || []).find((l) => l.id === leadId);
    if (!prev) return;
    const before = captureStoreSlices(['eduAdmissions']);
    const updatedLeads = (globalState.eduAdmissions || []).map((l) =>
      l.id === leadId ? { ...l, stage } : l
    );
    globalState = {
      ...globalState,
      eduAdmissions: updatedLeads,
    };
    notify();
    const target = updatedLeads.find((l) => l.id === leadId);
    if (target && isSupabaseConfigured()) {
      educationService.upsertAdmission(target).catch(() => {});
    }
    const after = captureStoreSlices(['eduAdmissions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Admission stage: ${prev.studentName} → ${stage}`,
        `Admission : ${prev.studentName} → ${stage}`,
        `مرحلة القبول: ${prev.studentName} ← ${stage}`
      ),
      entityLabel: prev.studentName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.upsertAdmission(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          educationService.upsertAdmission(target).catch(() => {});
        }
      },
    });
  };

  const updateEduAdmissionLead = (leadId: string, updates: Partial<EduAdmissionLead>) => {
    const prev = (globalState.eduAdmissions || []).find((l) => l.id === leadId);
    if (!prev) return;
    const before = captureStoreSlices(['eduAdmissions']);
    const updatedLeads = (globalState.eduAdmissions || []).map((l) =>
      l.id === leadId ? { ...l, ...updates } : l
    );
    globalState = {
      ...globalState,
      eduAdmissions: updatedLeads,
    };
    notify();
    const target = updatedLeads.find((l) => l.id === leadId);
    if (target && isSupabaseConfigured()) {
      educationService.upsertAdmission(target).catch(() => {});
    }
    const after = captureStoreSlices(['eduAdmissions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: updates.stage && updates.stage !== prev.stage ? 'status' : 'edit',
      summary: ul(
        `Updated prospect: ${target?.studentName || prev.studentName}`,
        `Candidat mis à jour : ${target?.studentName || prev.studentName}`,
        `تحديث طلب الالتحاق: ${target?.studentName || prev.studentName}`
      ),
      entityLabel: target?.studentName || prev.studentName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          educationService.upsertAdmission(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          educationService.upsertAdmission(target).catch(() => {});
        }
      },
    });
  };

  const deleteEduAdmissionLead = (leadId: string) => {
    const prev = (globalState.eduAdmissions || []).find((l) => l.id === leadId);
    if (!prev) return;
    const before = captureStoreSlices(['eduAdmissions']);
    globalState = {
      ...globalState,
      eduAdmissions: (globalState.eduAdmissions || []).filter((l) => l.id !== leadId),
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.deleteAdmission(leadId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['eduAdmissions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'delete',
      summary: ul(
        `Deleted prospect: ${prev.studentName}`,
        `Candidat supprimé : ${prev.studentName}`,
        `حذف طلب الالتحاق: ${prev.studentName}`
      ),
      entityLabel: prev.studentName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_admissions', leadId, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          educationService.deleteAdmission(leadId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const convertAdmissionToStudent = (leadId: string, cohortId: string, initialDeposit: number = 0) => {
    const lead = (globalState.eduAdmissions || []).find((l) => l.id === leadId);
    const cohort = (globalState.eduCohorts || []).find((c) => c.id === cohortId);
    if (!lead || !cohort) return;

    const before = captureStoreSlices(['eduStudents', 'eduEnrollments', 'eduCohorts', 'eduAdmissions']);
    const trace = getTraceContext();
    const newStudent: EduStudent = {
      ...trace,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
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

    const updatedCohorts = (globalState.eduCohorts || []).map((c) =>
      c.id === cohort.id ? { ...c, enrolledCount: (c.enrolledCount || 0) + 1 } : c
    );
    const updatedAdmissions = (globalState.eduAdmissions || []).map((l) =>
      l.id === leadId ? { ...l, stage: 'Enrolled' as const } : l
    );

    globalState = {
      ...globalState,
      eduStudents: [newStudent, ...(globalState.eduStudents || [])],
      eduEnrollments: [newEnrollment, ...(globalState.eduEnrollments || [])],
      eduCohorts: updatedCohorts,
      eduAdmissions: updatedAdmissions,
    };
    notify();

    const updatedCohort = updatedCohorts.find((c) => c.id === cohort.id);
    const updatedLead = updatedAdmissions.find((l) => l.id === leadId);
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        [
          () => educationService.upsertStudent(newStudent),
          () => educationService.upsertEnrollment(newEnrollment),
          ...(updatedCohort ? [() => educationService.upsertCohort(updatedCohort)] : []),
          ...(updatedLead ? [() => educationService.upsertAdmission(updatedLead)] : []),
        ],
        4
      ).catch(() => {});
    }

    const after = captureStoreSlices(['eduStudents', 'eduEnrollments', 'eduCohorts', 'eduAdmissions']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'status',
      summary: ul(
        `Enrolled applicant: ${newStudent.fullName} → ${cohort.name}`,
        `Candidat inscrit : ${newStudent.fullName} → ${cohort.name}`,
        `تسجيل متقدم: ${newStudent.fullName}`
      ),
      entityLabel: newStudent.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => educationService.deleteStudent(newStudent.id, globalState.currentUser?.id),
              () => syncCoordinator.softDeleteRow('edu_enrollments', newEnrollment.id, globalState.currentUser?.id),
              () => educationService.upsertCohort(cohort),
              () => educationService.upsertAdmission(lead),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => syncCoordinator.restoreRow('edu_students', newStudent.id, globalState.currentUser?.id).then(() => educationService.upsertStudent(newStudent)),
              () => syncCoordinator.restoreRow('edu_enrollments', newEnrollment.id, globalState.currentUser?.id).then(() => educationService.upsertEnrollment(newEnrollment)),
              ...(updatedCohort ? [() => educationService.upsertCohort(updatedCohort)] : []),
              ...(updatedLead ? [() => educationService.upsertAdmission(updatedLead)] : []),
            ],
            4
          ).catch(() => {});
        }
      },
    });
  };

  const issueEduCertificate = (certData: Omit<EduCertificate, 'id' | 'tenantId' | 'facilityId' | 'createdAt' | 'certificateNumber' | 'verificationHash'>) => {
    const before = captureStoreSlices(['eduCertificates']);
    const certNum = `ATRIUM-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = '0x' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newCert: EduCertificate = {
      ...getTraceContext(),
      ...certData,
      id: `cert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      certificateNumber: certNum,
      verificationHash: hash,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduCertificates: [newCert, ...(globalState.eduCertificates || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertCertificate(newCert).catch(() => {});
    }
    const after = captureStoreSlices(['eduCertificates']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Issued certificate #${certNum} (${newCert.studentName})`,
        `Certificat émis #${certNum} (${newCert.studentName})`,
        `إصدار شهادة #${certNum} (${newCert.studentName})`
      ),
      entityLabel: newCert.studentName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('edu_certificates', newCert.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_certificates', newCert.id, globalState.currentUser?.id)
            .then(() => educationService.upsertCertificate(newCert))
            .catch(() => {});
        }
      },
    });
    return newCert;
  };

  const addEduClassroom = (classroomData: Omit<EduClassroom, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['eduClassrooms']);
    const newRoom: EduClassroom = {
      ...getTraceContext(),
      ...classroomData,
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduClassrooms: [...(globalState.eduClassrooms || []), newRoom],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertClassroom(newRoom).catch(() => {});
    }
    const after = captureStoreSlices(['eduClassrooms']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added classroom: ${newRoom.name}`,
        `Salle ajoutée : ${newRoom.name}`,
        `إضافة قاعة: ${newRoom.name}`
      ),
      entityLabel: newRoom.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('edu_classrooms', newRoom.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_classrooms', newRoom.id, globalState.currentUser?.id)
            .then(() => educationService.upsertClassroom(newRoom))
            .catch(() => {});
        }
      },
    });
    return newRoom;
  };

  const addEduCourse = (courseData: Omit<EduCourse, 'id' | 'tenantId' | 'facilityId' | 'createdAt'>) => {
    const before = captureStoreSlices(['eduCourses']);
    const newCourse: EduCourse = {
      ...getTraceContext(),
      ...courseData,
      id: `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      eduCourses: [newCourse, ...(globalState.eduCourses || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      educationService.upsertCourse(newCourse).catch(() => {});
    }
    const after = captureStoreSlices(['eduCourses']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Added course: ${newCourse.title}`,
        `Programme ajouté : ${newCourse.title}`,
        `إضافة برنامج: ${newCourse.title}`
      ),
      entityLabel: newCourse.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('edu_courses', newCourse.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('edu_courses', newCourse.id, globalState.currentUser?.id)
            .then(() => educationService.upsertCourse(newCourse))
            .catch(() => {});
        }
      },
    });
    return newCourse;
  };

  // ============================================================
  // Project & Milestone Actions (ProjectMilestone)
  // ============================================================
  const setActivePmRole = setActivePmRoleAction;

  const setActiveGarageRole = (role: GarageRole) => {
    globalState = {
      ...globalState,
      activeGarageRole: role,
      activeScreen: 'home',
    };
    notify();
  };

  const setActiveRealEstateRole = (role: RealEstateRole) => {
    globalState = {
      ...globalState,
      activeRealEstateRole: role,
      activeScreen: 'home',
    };
    notify();
  };

  const setActiveManufacturingRole = (role: ManufacturingRole) => {
    globalState = {
      ...globalState,
      activeManufacturingRole: role,
      activeScreen: 'home',
    };
    notify();
  };

  const setActiveLegalRole = (role: LegalRole) => {
    globalState = {
      ...globalState,
      activeLegalRole: role,
      activeScreen: 'home',
    };
    notify();
  };

  const setActiveLogisticsRole = (role: LogisticsRole) => {
    globalState = {
      ...globalState,
      activeLogisticsRole: role,
      activeScreen: 'home',
    };
    notify();
  };

  const setActivePmSubScreen = setActivePmSubScreenAction;

  const addPmProject = addPmProjectAction;

  const updatePmProjectStatus = (projectId: string, status: PMProject['status']) => {
    const prevProject = (globalState.pmProjects || []).find((p) => p.id === projectId);
    if (!prevProject) return;
    const before = captureStoreSlices(['pmProjects']);
    globalState = {
      ...globalState,
      pmProjects: (globalState.pmProjects || []).map((p) =>
        p.id === projectId ? { ...p, status, updatedAt: new Date().toISOString() } : p
      ),
    };
    notify();
    const updated = globalState.pmProjects.find((p) => p.id === projectId);
    if (updated) projectMilestoneService.upsertProject(updated).catch(() => {});
    const after = captureStoreSlices(['pmProjects']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        `Project ${prevProject.title} → ${status}`,
        `Projet ${prevProject.title} → ${status}`,
        `حالة المشروع ${prevProject.title} → ${status}`
      ),
      entityLabel: prevProject.title,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.upsertProject(prevProject).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          projectMilestoneService.upsertProject(updated).catch(() => {});
        }
      },
    });
  };

  const addPmPrintOrder = (orderData: Omit<PMPrintOrder, 'id' | 'createdAt'>) => {
    const before = captureStoreSlices(['pmPrintOrders']);
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
    const after = captureStoreSlices(['pmPrintOrders']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'create',
      summary: ul(
        `Print order sent: ${newOrder.orderNumber}`,
        `Bon d'impression transmis : ${newOrder.orderNumber}`,
        `إرسال أمر طباعة: ${newOrder.orderNumber}`
      ),
      entityLabel: newOrder.orderNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.deletePrintOrder(newOrder.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pm_print_orders', newOrder.id, globalState.currentUser?.id)
            .then(() => projectMilestoneService.createPrintOrder(newOrder))
            .catch(() => {});
        }
      },
    });
    return newOrder;
  };

  const updatePmPrintOrderStatus = (orderId: string, status: PMPrintOrder['status']) => {
    const prev = (globalState.pmPrintOrders || []).find((o) => o.id === orderId);
    if (!prev) return;
    const before = captureStoreSlices(['pmPrintOrders']);
    const updatedOrders = (globalState.pmPrintOrders || []).map((o) =>
      o.id === orderId ? { ...o, status } : o
    );
    globalState = {
      ...globalState,
      pmPrintOrders: updatedOrders,
    };
    notify();
    const target = updatedOrders.find((o) => o.id === orderId);
    if (target && isSupabaseConfigured()) {
      projectMilestoneService.createPrintOrder(target).catch(() => {});
    }
    const after = captureStoreSlices(['pmPrintOrders']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        `Print order ${prev.orderNumber} → ${status}`,
        `Bon ${prev.orderNumber} → ${status}`,
        `أمر الطباعة ${prev.orderNumber} → ${status}`
      ),
      entityLabel: prev.orderNumber,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.createPrintOrder(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          projectMilestoneService.createPrintOrder(target).catch(() => {});
        }
      },
    });
  };

  const addPmBatDeliverable = (batData: Omit<PMBatDeliverable, 'id' | 'createdAt'>) => {
    const before = captureStoreSlices(['pmBatDeliverables']);
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
    const after = captureStoreSlices(['pmBatDeliverables']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'create',
      summary: ul(
        `BAT submitted: ${newBat.title} (${newBat.versionCode})`,
        `Livrable BAT déposé : ${newBat.title} (${newBat.versionCode})`,
        `إيداع ملف الطباعة: ${newBat.title}`
      ),
      entityLabel: newBat.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.deleteBatDeliverable(newBat.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pm_bat_deliverables', newBat.id, globalState.currentUser?.id)
            .then(() => projectMilestoneService.upsertBatDeliverable(newBat))
            .catch(() => {});
        }
      },
    });
    return newBat;
  };

  const reviewPmBatDeliverable = (batId: string, status: 'approved' | 'revision_requested', comments?: string) => {
    const prev = (globalState.pmBatDeliverables || []).find((b) => b.id === batId);
    if (!prev) return;
    const before = captureStoreSlices(['pmBatDeliverables']);
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
    const after = captureStoreSlices(['pmBatDeliverables']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        status === 'approved' ? `BAT approved: ${prev.title}` : `BAT revision requested: ${prev.title}`,
        status === 'approved' ? `BAT validé : ${prev.title}` : `Corrections demandées : ${prev.title}`,
        status === 'approved' ? `اعتماد الملف: ${prev.title}` : `طلب تعديل الملف: ${prev.title}`
      ),
      entityLabel: prev.title,
      toastType: status === 'approved' ? 'success' : 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.upsertBatDeliverable(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          projectMilestoneService.upsertBatDeliverable(updated).catch(() => {});
        }
      },
    });
  };

  const addPmTalent = (talentData: Omit<PMTalent, 'id' | 'createdAt' | 'consolidatedScore'>) => {
    const before = captureStoreSlices(['pmTalents']);
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
    const after = captureStoreSlices(['pmTalents']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'create',
      summary: ul(
        `Talent registered: ${newTalent.fullName}`,
        `Candidat enregistré : ${newTalent.fullName}`,
        `تسجيل متعاون: ${newTalent.fullName}`
      ),
      entityLabel: newTalent.fullName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.deleteTalent(newTalent.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pm_talents', newTalent.id, globalState.currentUser?.id)
            .then(() => projectMilestoneService.upsertTalent(newTalent))
            .catch(() => {});
        }
      },
    });
    return newTalent;
  };

  const updatePmTalentStatus = (talentId: string, status: PMTalent['status']) => {
    const prev = (globalState.pmTalents || []).find((t) => t.id === talentId);
    if (!prev) return;
    const before = captureStoreSlices(['pmTalents']);
    globalState = {
      ...globalState,
      pmTalents: (globalState.pmTalents || []).map((t) =>
        t.id === talentId ? { ...t, status } : t
      ),
    };
    notify();
    const updated = globalState.pmTalents.find((t) => t.id === talentId);
    if (updated) projectMilestoneService.upsertTalent(updated).catch(() => {});
    const after = captureStoreSlices(['pmTalents']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        `Talent ${prev.fullName} → ${status}`,
        `Talent ${prev.fullName} → ${status}`,
        `حالة المتعاون ${prev.fullName} → ${status}`
      ),
      entityLabel: prev.fullName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.upsertTalent(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          projectMilestoneService.upsertTalent(updated).catch(() => {});
        }
      },
    });
  };

  const addPmMission = (missionData: Omit<PMMission, 'id' | 'createdAt'>) => {
    const before = captureStoreSlices(['pmMissions']);
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
    const after = captureStoreSlices(['pmMissions']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'create',
      summary: ul(
        `Mission scheduled: ${newMission.code} — ${newMission.title}`,
        `Mission planifiée : ${newMission.code} — ${newMission.title}`,
        `برمجة مهمة: ${newMission.code}`
      ),
      entityLabel: newMission.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.deleteMission(newMission.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pm_missions', newMission.id, globalState.currentUser?.id)
            .then(() => projectMilestoneService.upsertMission(newMission))
            .catch(() => {});
        }
      },
    });
    return newMission;
  };

  const updatePmAttendanceStatus = (
    attendanceId: string,
    status: PMAttendance['status'],
    minutesLate?: number,
    shiftRating?: number
  ) => {
    const prev = (globalState.pmAttendances || []).find((a) => a.id === attendanceId);
    if (!prev) return;
    const before = captureStoreSlices(['pmAttendances']);
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
    const updatedAtt = globalState.pmAttendances.find((a) => a.id === attendanceId);
    if (isSupabaseConfigured() && updatedAtt) {
      const patch = {
        status: updatedAtt.status,
        minutes_late: updatedAtt.minutesLate,
        shift_rating: updatedAtt.shiftRating,
        gross_payable_dzd: updatedAtt.grossPayableDzd,
        check_in_time: updatedAtt.checkInTime || null,
      };
      syncCoordinator
        .mutateOrQueueUpdate('pm_attendances', attendanceId, patch, {
          expectedVersion: updatedAtt.version,
          entityType: 'PMAttendance',
          entityLabel: updatedAtt.talentName,
          localData: patch,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['pmAttendances']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        `Attendance ${prev.talentName} → ${status}`,
        `Pointage ${prev.talentName} → ${status}`,
        `تسجيل حضور ${prev.talentName} → ${status}`
      ),
      entityLabel: prev.talentName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          const patch = {
            status: prev.status,
            minutes_late: prev.minutesLate,
            shift_rating: prev.shiftRating,
            gross_payable_dzd: prev.grossPayableDzd,
            check_in_time: prev.checkInTime || null,
          };
          syncCoordinator
            .mutateOrQueueUpdate('pm_attendances', attendanceId, patch, {
              expectedVersion: prev.version,
              entityType: 'PMAttendance',
              entityLabel: prev.talentName,
              localData: patch,
            })
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured() && updatedAtt) {
          const patch = {
            status: updatedAtt.status,
            minutes_late: updatedAtt.minutesLate,
            shift_rating: updatedAtt.shiftRating,
            gross_payable_dzd: updatedAtt.grossPayableDzd,
            check_in_time: updatedAtt.checkInTime || null,
          };
          syncCoordinator
            .mutateOrQueueUpdate('pm_attendances', attendanceId, patch, {
              expectedVersion: updatedAtt.version,
              entityType: 'PMAttendance',
              entityLabel: updatedAtt.talentName,
              localData: patch,
            })
            .catch(() => {});
        }
      },
    });
  };

  const closePmRollCall = (missionId: string) => {
    const mission = (globalState.pmMissions || []).find((m) => m.id === missionId);
    if (!mission) return;

    const before = captureStoreSlices(['pmAttendances', 'pmPayrollBatches']);
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
    const after = captureStoreSlices(['pmAttendances', 'pmPayrollBatches']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        `Roll call locked (${batchNumber}): ${count} staff · ${totalDzd.toLocaleString()} DA`,
        `Pointage clôturé (${batchNumber}) : ${count} animateurs · ${totalDzd.toLocaleString()} DA`,
        `إغلاق الحضور (${batchNumber}): ${count} متعاونين`
      ),
      entityLabel: batchNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => syncCoordinator.softDeleteRow('pm_payroll_batches', newBatch.id, globalState.currentUser?.id),
              ...missionAtts.map((a) => () =>
                syncCoordinator.mutateOrQueueUpdate(
                  'pm_attendances',
                  a.id,
                  { is_locked: Boolean(a.isLocked), locked_at: a.lockedAt || null },
                  { entityType: 'PMAttendance', entityLabel: a.talentName, localData: { is_locked: Boolean(a.isLocked) } }
                )
              ),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          projectMilestoneService.closeRollCall(missionId, mission.supervisorId, missionAtts).catch(() => {});
        }
      },
    });
  };

  const addPmExpense = (expenseData: Omit<PMExpense, 'id' | 'createdAt' | 'status'>) => {
    const before = captureStoreSlices(['pmExpenses', 'pmEquipmentStock']);
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
    const after = captureStoreSlices(['pmExpenses', 'pmEquipmentStock']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'create',
      summary: ul(
        `Expense declared: ${newExp.title} (${newStockItem.assetCode})`,
        `Achat déclaré : ${newExp.title} (${newStockItem.assetCode})`,
        `تصريح مصروف: ${newExp.title}`
      ),
      entityLabel: newExp.title,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.deleteExpense(newExp.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pm_expenses', newExp.id, globalState.currentUser?.id)
            .then(() => projectMilestoneService.upsertExpense(newExp))
            .catch(() => {});
        }
      },
    });
    return newExp;
  };

  const approvePmExpense = approvePmExpenseAction;
  const rejectPmExpense = rejectPmExpenseAction;
  const approvePmPayrollBatch = approvePmPayrollBatchAction;

  const generatePmCcpSlipsForBatch = (batchId: string) => {
    const batch = (globalState.pmPayrollBatches || []).find((b) => b.id === batchId);
    if (!batch) return;

    const before = captureStoreSlices(['pmCcpSlips', 'pmPayrollBatches']);
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
    const after = captureStoreSlices(['pmCcpSlips', 'pmPayrollBatches']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'create',
      summary: ul(
        `Generated ${newSlips.length} CCP slips (${batch.batchNumber})`,
        `${newSlips.length} bordereaux CCP SFP 01 générés (${batch.batchNumber})`,
        `إصدار ${newSlips.length} حوالة بريدية CCP`
      ),
      entityLabel: batch.batchNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () =>
                syncCoordinator.mutateOrQueueUpdate(
                  'pm_payroll_batches',
                  batchId,
                  { status: batch.status, ccp_generated_at: batch.ccpGeneratedAt || null },
                  { entityType: 'PMPayrollBatch', entityLabel: batch.batchNumber, localData: { status: batch.status } }
                ),
              ...attendances.map((a) => () =>
                syncCoordinator.softDeleteRow('pm_ccp_slips', `slip-${a.id}`, globalState.currentUser?.id)
              ),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          projectMilestoneService.generateCcpBatchSlips(batch, attendances, talentsMap).catch(() => {});
        }
      },
    });
  };

  const markPmCcpSlipPrinted = (slipId: string) => {
    const targetSlip = (globalState.pmCcpSlips || []).find((s) => s.id === slipId);
    if (!targetSlip) return;
    const before = captureStoreSlices(['pmCcpSlips']);
    const printedAt = new Date().toISOString();
    globalState = {
      ...globalState,
      pmCcpSlips: (globalState.pmCcpSlips || []).map((s) =>
        s.id === slipId ? { ...s, isPrinted: true, printedAt } : s
      ),
    };
    notify();
    if (isSupabaseConfigured()) {
      const patch = {
        is_printed: true,
        printed_at: printedAt,
      };
      syncCoordinator
        .mutateOrQueueUpdate('pm_ccp_slips', slipId, patch, {
          expectedVersion: targetSlip?.version,
          entityType: 'PMCcpSlip',
          entityLabel: targetSlip?.beneficiaryName,
          localData: patch,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['pmCcpSlips']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        `CCP slip printed: ${targetSlip.beneficiaryName}`,
        `Bordereau CCP imprimé : ${targetSlip.beneficiaryName}`,
        `طباعة حوالة CCP: ${targetSlip.beneficiaryName}`
      ),
      entityLabel: targetSlip.beneficiaryName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .mutateOrQueueUpdate(
              'pm_ccp_slips',
              slipId,
              { is_printed: Boolean(targetSlip.isPrinted), printed_at: targetSlip.printedAt || null },
              {
                expectedVersion: targetSlip.version,
                entityType: 'PMCcpSlip',
                entityLabel: targetSlip.beneficiaryName,
                localData: { is_printed: Boolean(targetSlip.isPrinted) },
              }
            )
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .mutateOrQueueUpdate(
              'pm_ccp_slips',
              slipId,
              { is_printed: true, printed_at: printedAt },
              {
                expectedVersion: targetSlip.version,
                entityType: 'PMCcpSlip',
                entityLabel: targetSlip.beneficiaryName,
                localData: { is_printed: true },
              }
            )
            .catch(() => {});
        }
      },
    });
  };

  const addPmEquipmentStock = (itemData: Omit<PMEquipmentStock, 'id' | 'createdAt'>) => {
    const before = captureStoreSlices(['pmEquipmentStock']);
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
    const after = captureStoreSlices(['pmEquipmentStock']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'create',
      summary: ul(
        `Equipment registered: ${newItem.assetCode} — ${newItem.title}`,
        `Matériel enregistré : ${newItem.assetCode} — ${newItem.title}`,
        `إضافة عتاد: ${newItem.assetCode}`
      ),
      entityLabel: newItem.title,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.deleteEquipmentStock(newItem.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pm_equipment_stock', newItem.id, globalState.currentUser?.id)
            .then(() => projectMilestoneService.upsertEquipmentStock(newItem))
            .catch(() => {});
        }
      },
    });
    return newItem;
  };

  const updatePmEquipmentStatus = (
    assetId: string,
    status: PMEquipmentStock['currentStatus'],
    conditionReport?: PMEquipmentStock['conditionReport']
  ) => {
    const prev = (globalState.pmEquipmentStock || []).find((eq) => eq.id === assetId);
    if (!prev) return;
    const before = captureStoreSlices(['pmEquipmentStock']);
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
    const after = captureStoreSlices(['pmEquipmentStock']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'status',
      summary: ul(
        `Asset ${prev.assetCode} → ${status}`,
        `Matériel ${prev.assetCode} → ${status}`,
        `حالة العتاد ${prev.assetCode} → ${status}`
      ),
      entityLabel: prev.title,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          projectMilestoneService.upsertEquipmentStock(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updated && isSupabaseConfigured()) {
          projectMilestoneService.upsertEquipmentStock(updated).catch(() => {});
        }
      },
    });
  };

  const resetPmMockData = () => {
    const pmKeys: (keyof AppState)[] = [
      'pmClients',
      'pmProjects',
      'pmMilestones',
      'pmCollateralCatalog',
      'pmPrintOrders',
      'pmBatDeliverables',
      'pmTalents',
      'pmMissions',
      'pmAttendances',
      'pmExpenses',
      'pmPayrollBatches',
      'pmCcpSlips',
      'pmEquipmentStock',
    ];
    const before = captureStoreSlices(pmKeys);
    const targetFacilityId = globalState.currentBranchId || 'branch_agency_main';
    const targetAccountId =
      globalState.account?.id?.trim() || (isDemoModeEnabled() ? INITIAL_ACCOUNT.id : '');
    if (!targetAccountId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', globalState.language),
        message: t('tenant_context_missing_msg', globalState.language),
      });
      return;
    }
    const targetBizId = globalState.currentBusinessId || 'biz_agency';

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
    const after = captureStoreSlices(pmKeys);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        'Agency demo data reset',
        'Données démo agence réinitialisées',
        'إعادة ضبط بيانات الوكالة'
      ),
      toastType: 'success',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };

  const deletePmProject = deletePmProjectAction;
  const batchDeletePmProjects = batchDeletePmProjectsAction;
  const batchUpdatePmProjectStatus = batchUpdatePmProjectStatusAction;
  const batchApprovePmExpenses = batchApprovePmExpensesAction;
  const batchRejectPmExpenses = batchRejectPmExpensesAction;
  const batchDeletePmExpenses = batchDeletePmExpensesAction;
  const batchApprovePmPayrollBatches = batchApprovePmPayrollBatchesAction;

  const batchUpdatePmPrintOrderStatus = (orderIds: string[], status: PMPrintOrder['status']) => {
    const idSet = new Set(orderIds);
    const prevOrders = (globalState.pmPrintOrders || []).filter((o) => idSet.has(o.id));
    if (prevOrders.length === 0) return;
    const before = captureStoreSlices(['pmPrintOrders']);
    const updatedOrders = (globalState.pmPrintOrders || []).map((o) =>
      idSet.has(o.id) ? { ...o, status } : o
    );
    globalState = {
      ...globalState,
      pmPrintOrders: updatedOrders,
    };
    notify();
    const affected = updatedOrders.filter((o) => idSet.has(o.id));
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        affected.map((o) => () => projectMilestoneService.createPrintOrder(o)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmPrintOrders']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Updated ${orderIds.length} print order(s) → ${status}`,
        `${orderIds.length} bon(s) d'impression → ${status}`,
        `تحديث ${orderIds.length} أمر طباعة`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            prevOrders.map((o) => () => projectMilestoneService.createPrintOrder(o)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            affected.map((o) => () => projectMilestoneService.createPrintOrder(o)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchDeletePmPrintOrders = (orderIds: string[]) => {
    const idSet = new Set(orderIds);
    const removed = (globalState.pmPrintOrders || []).filter((o) => idSet.has(o.id));
    if (removed.length === 0) return;
    const before = captureStoreSlices(['pmPrintOrders']);
    globalState = {
      ...globalState,
      pmPrintOrders: (globalState.pmPrintOrders || []).filter((o) => !idSet.has(o.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        orderIds.map((id) => () => projectMilestoneService.deletePrintOrder(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmPrintOrders']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Deleted ${removed.length} print order(s)`,
        `${removed.length} bon(s) d'impression supprimé(s)`,
        `حذف ${removed.length} أمر طباعة`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            removed.map((o) => () => syncCoordinator.restoreRow('pm_print_orders', o.id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            orderIds.map((id) => () => projectMilestoneService.deletePrintOrder(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchReviewPmBatDeliverables = (
    batIds: string[],
    status: 'approved' | 'revision_requested',
    comments?: string
  ) => {
    const idSet = new Set(batIds);
    const prevBats = (globalState.pmBatDeliverables || []).filter((b) => idSet.has(b.id));
    if (prevBats.length === 0) return;
    const before = captureStoreSlices(['pmBatDeliverables']);
    const updatedBats = (globalState.pmBatDeliverables || []).map((b) =>
      idSet.has(b.id)
        ? {
            ...b,
            approvalStatus: status,
            revisionComments: comments || b.revisionComments,
          }
        : b
    );
    globalState = {
      ...globalState,
      pmBatDeliverables: updatedBats,
    };
    notify();
    const affected = updatedBats.filter((b) => idSet.has(b.id));
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        affected.map((b) => () => projectMilestoneService.upsertBatDeliverable(b)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmBatDeliverables']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        status === 'approved'
          ? `Approved ${batIds.length} BAT deliverable(s)`
          : `Requested revision on ${batIds.length} BAT(s)`,
        status === 'approved'
          ? `${batIds.length} livrable(s) BAT validé(s)`
          : `Révisions demandées sur ${batIds.length} BAT`,
        `تحديث ${batIds.length} ملف طباعة`
      ),
      toastType: status === 'approved' ? 'success' : 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            prevBats.map((b) => () => projectMilestoneService.upsertBatDeliverable(b)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            affected.map((b) => () => projectMilestoneService.upsertBatDeliverable(b)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchDeletePmBatDeliverables = (batIds: string[]) => {
    const idSet = new Set(batIds);
    const removed = (globalState.pmBatDeliverables || []).filter((b) => idSet.has(b.id));
    if (removed.length === 0) return;
    const before = captureStoreSlices(['pmBatDeliverables']);
    globalState = {
      ...globalState,
      pmBatDeliverables: (globalState.pmBatDeliverables || []).filter((b) => !idSet.has(b.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        batIds.map((id) => () => projectMilestoneService.deleteBatDeliverable(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmBatDeliverables']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Deleted ${removed.length} BAT deliverable(s)`,
        `${removed.length} livrable(s) BAT supprimé(s)`,
        `حذف ${removed.length} ملف طباعة`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            removed.map((b) => () => syncCoordinator.restoreRow('pm_bat_deliverables', b.id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            batIds.map((id) => () => projectMilestoneService.deleteBatDeliverable(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchDeletePmTalents = (talentIds: string[]) => {
    const idSet = new Set(talentIds);
    const removed = (globalState.pmTalents || []).filter((t) => idSet.has(t.id));
    if (removed.length === 0) return;
    const before = captureStoreSlices(['pmTalents']);
    globalState = {
      ...globalState,
      pmTalents: (globalState.pmTalents || []).filter((t) => !idSet.has(t.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        talentIds.map((id) => () => projectMilestoneService.deleteTalent(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmTalents']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Deleted ${removed.length} talent profile(s)`,
        `${removed.length} profil(s) talent supprimé(s)`,
        `حذف ${removed.length} متعاون`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            removed.map((t) => () => syncCoordinator.restoreRow('pm_talents', t.id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            talentIds.map((id) => () => projectMilestoneService.deleteTalent(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchUpdatePmTalentStatus = (talentIds: string[], status: PMTalent['status']) => {
    const idSet = new Set(talentIds);
    const prevTalents = (globalState.pmTalents || []).filter((t) => idSet.has(t.id));
    if (prevTalents.length === 0) return;
    const before = captureStoreSlices(['pmTalents']);
    const updatedTalents = (globalState.pmTalents || []).map((t) =>
      idSet.has(t.id) ? { ...t, status } : t
    );
    globalState = {
      ...globalState,
      pmTalents: updatedTalents,
    };
    notify();
    const affected = updatedTalents.filter((t) => idSet.has(t.id));
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        affected.map((t) => () => projectMilestoneService.upsertTalent(t)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmTalents']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Updated ${talentIds.length} talent(s) → ${status}`,
        `${talentIds.length} talent(s) → ${status}`,
        `تحديث ${talentIds.length} متعاون → ${status}`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            prevTalents.map((t) => () => projectMilestoneService.upsertTalent(t)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            affected.map((t) => () => projectMilestoneService.upsertTalent(t)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchDeletePmMissions = (missionIds: string[]) => {
    const idSet = new Set(missionIds);
    const removed = (globalState.pmMissions || []).filter((m) => idSet.has(m.id));
    if (removed.length === 0) return;
    const before = captureStoreSlices(['pmMissions']);
    globalState = {
      ...globalState,
      pmMissions: (globalState.pmMissions || []).filter((m) => !idSet.has(m.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        missionIds.map((id) => () => projectMilestoneService.deleteMission(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmMissions']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Deleted ${removed.length} mission(s)`,
        `${removed.length} mission(s) supprimée(s)`,
        `حذف ${removed.length} مهمة`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            removed.map((m) => () => syncCoordinator.restoreRow('pm_missions', m.id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            missionIds.map((id) => () => projectMilestoneService.deleteMission(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchUpdatePmAttendanceStatus = (attendanceIds: string[], status: PMAttendance['status']) => {
    const idSet = new Set(attendanceIds);
    const prevAtts = (globalState.pmAttendances || []).filter((a) => idSet.has(a.id));
    if (prevAtts.length === 0) return;
    const before = captureStoreSlices(['pmAttendances']);
    const updatedAttendances = (globalState.pmAttendances || []).map((a) => {
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
    });
    globalState = {
      ...globalState,
      pmAttendances: updatedAttendances,
    };
    notify();
    const affected = updatedAttendances.filter((a) => idSet.has(a.id));
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        affected.map((a) => () => {
          const patch = {
            status: a.status,
            gross_payable_dzd: a.grossPayableDzd,
            check_in_time: a.checkInTime || null,
          };
          return syncCoordinator.mutateOrQueueUpdate('pm_attendances', a.id, patch, {
            expectedVersion: a.version,
            entityType: 'PMAttendance',
            entityLabel: a.talentName,
            localData: patch,
          });
        }),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmAttendances']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Updated ${attendanceIds.length} attendance(s) → ${status}`,
        `${attendanceIds.length} pointage(s) → ${status}`,
        `تحديث ${attendanceIds.length} سجل حضور`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            prevAtts.map((a) => () => {
              const patch = {
                status: a.status,
                gross_payable_dzd: a.grossPayableDzd,
                check_in_time: a.checkInTime || null,
              };
              return syncCoordinator.mutateOrQueueUpdate('pm_attendances', a.id, patch, {
                expectedVersion: a.version,
                entityType: 'PMAttendance',
                entityLabel: a.talentName,
                localData: patch,
              });
            }),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            affected.map((a) => () => {
              const patch = {
                status: a.status,
                gross_payable_dzd: a.grossPayableDzd,
                check_in_time: a.checkInTime || null,
              };
              return syncCoordinator.mutateOrQueueUpdate('pm_attendances', a.id, patch, {
                expectedVersion: a.version,
                entityType: 'PMAttendance',
                entityLabel: a.talentName,
                localData: patch,
              });
            }),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchMarkPmCcpSlipsPrinted = (slipIds: string[]) => {
    const idSet = new Set(slipIds);
    const prevSlips = (globalState.pmCcpSlips || []).filter((s) => idSet.has(s.id));
    if (prevSlips.length === 0) return;
    const before = captureStoreSlices(['pmCcpSlips']);
    const slipMap = new Map((globalState.pmCcpSlips || []).map((s) => [s.id, s]));
    const printedAt = new Date().toISOString();
    globalState = {
      ...globalState,
      pmCcpSlips: (globalState.pmCcpSlips || []).map((s) =>
        idSet.has(s.id) ? { ...s, isPrinted: true, printedAt } : s
      ),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        slipIds.map((id) => () => {
          const slip = slipMap.get(id);
          const patch = {
            is_printed: true,
            printed_at: printedAt,
          };
          return syncCoordinator.mutateOrQueueUpdate('pm_ccp_slips', id, patch, {
            expectedVersion: slip?.version,
            entityType: 'PMCcpSlip',
            entityLabel: slip?.beneficiaryName,
            localData: patch,
          });
        }),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmCcpSlips']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Marked ${slipIds.length} CCP slip(s) printed`,
        `${slipIds.length} bordereau(x) CCP marqués imprimés`,
        `طباعة ${slipIds.length} حوالة بريدية CCP`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            prevSlips.map((s) => () =>
              syncCoordinator.mutateOrQueueUpdate(
                'pm_ccp_slips',
                s.id,
                { is_printed: Boolean(s.isPrinted), printed_at: s.printedAt || null },
                {
                  expectedVersion: s.version,
                  entityType: 'PMCcpSlip',
                  entityLabel: s.beneficiaryName,
                  localData: { is_printed: Boolean(s.isPrinted) },
                }
              )
            ),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            slipIds.map((id) => () => {
              const slip = slipMap.get(id);
              const patch = { is_printed: true, printed_at: printedAt };
              return syncCoordinator.mutateOrQueueUpdate('pm_ccp_slips', id, patch, {
                expectedVersion: slip?.version,
                entityType: 'PMCcpSlip',
                entityLabel: slip?.beneficiaryName,
                localData: patch,
              });
            }),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchUpdatePmEquipmentStatus = (
    assetIds: string[],
    status: PMEquipmentStock['currentStatus']
  ) => {
    const idSet = new Set(assetIds);
    const prevStock = (globalState.pmEquipmentStock || []).filter((eq) => idSet.has(eq.id));
    if (prevStock.length === 0) return;
    const before = captureStoreSlices(['pmEquipmentStock']);
    const updatedStock = (globalState.pmEquipmentStock || []).map((eq) =>
      idSet.has(eq.id) ? { ...eq, currentStatus: status } : eq
    );
    globalState = {
      ...globalState,
      pmEquipmentStock: updatedStock,
    };
    notify();
    const affected = updatedStock.filter((eq) => idSet.has(eq.id));
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        affected.map((eq) => () => projectMilestoneService.upsertEquipmentStock(eq)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmEquipmentStock']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Updated ${assetIds.length} asset(s) → ${status}`,
        `${assetIds.length} équipement(s) → ${status}`,
        `تحديث ${assetIds.length} عتاد`
      ),
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            prevStock.map((eq) => () => projectMilestoneService.upsertEquipmentStock(eq)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            affected.map((eq) => () => projectMilestoneService.upsertEquipmentStock(eq)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const batchDeletePmEquipmentStock = (assetIds: string[]) => {
    const idSet = new Set(assetIds);
    const removed = (globalState.pmEquipmentStock || []).filter((eq) => idSet.has(eq.id));
    if (removed.length === 0) return;
    const before = captureStoreSlices(['pmEquipmentStock']);
    globalState = {
      ...globalState,
      pmEquipmentStock: (globalState.pmEquipmentStock || []).filter((eq) => !idSet.has(eq.id)),
    };
    notify();
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        assetIds.map((id) => () => projectMilestoneService.deleteEquipmentStock(id, globalState.currentUser?.id)),
        4
      ).catch(() => {});
    }
    const after = captureStoreSlices(['pmEquipmentStock']);
    registerUndoEntry({
      vertical: 'project_milestone',
      operationType: 'bulk',
      summary: ul(
        `Deleted ${removed.length} equipment asset(s)`,
        `${removed.length} équipement(s) supprimé(s)`,
        `حذف ${removed.length} عتاد`
      ),
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            removed.map((eq) => () => syncCoordinator.restoreRow('pm_equipment_stock', eq.id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            assetIds.map((id) => () => projectMilestoneService.deleteEquipmentStock(id, globalState.currentUser?.id)),
            4
          ).catch(() => {});
        }
      },
    });
  };

  const resetAllData = () => {
    const previousSnapshot = cloneSnapshot(globalState);
    globalState = {
      ...DEFAULT_STATE,
      storageVersion: ATRIUM_STORAGE_VERSION,
      language: globalState.language,
      theme: globalState.theme,
      density: globalState.density,
      currentUser: globalState.currentUser,
      toasts: globalState.toasts,
    };
    notify();
    const afterSnapshot = cloneSnapshot(globalState);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'bulk',
      summary: ul(
        'All local data reset to demo defaults',
        'Toutes les données réinitialisées',
        'إعادة ضبط كافة البيانات المحلية'
      ),
      toastType: 'warning',
      undo: () => {
        globalState = { ...cloneSnapshot(previousSnapshot), toasts: globalState.toasts };
        notify();
      },
      redo: () => {
        globalState = { ...cloneSnapshot(afterSnapshot), toasts: globalState.toasts };
        notify();
      },
    });
  };

  const resetToDefaultDemoData = (targetCategory?: BusinessCategory) => {
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

    const sliceKeys = Object.keys(updates) as (keyof AppState)[];
    const before = captureStoreSlices(sliceKeys);
    globalState = {
      ...globalState,
      ...updates,
      storageVersion: ATRIUM_STORAGE_VERSION,
    };
    notify();
    const after = captureStoreSlices(sliceKeys);

    registerUndoEntry({
      vertical: targetCategory,
      operationType: 'bulk',
      summary: ul(
        `Demo dataset reset (${targetCategory})`,
        `Jeu de données démo réinitialisé (${targetCategory})`,
        `إعادة ضبط البيانات التجريبية (${targetCategory})`
      ),
      toastType: 'info',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };

  // ============================================================
  // Category 8: B2B Commercial Trading & Wholesale Actions
  // ============================================================

  const createCommercialDoc = (doc: Omit<CommercialDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const resolvedAccountId = requireTenantAccountId(doc.accountId, doc.tenantId, globalState.account?.id);
    const before = captureStoreSlices(['commercialDocs']);
    const id = `cdoc_${Date.now()}`;
    const newDoc: CommercialDocument = {
      ...doc,
      id,
      accountId: resolvedAccountId,
      businessId: doc.businessId || globalState.currentBusinessId,
      branchId: doc.branchId || globalState.currentBranchId,
      facilityId: doc.facilityId || globalState.currentBranchId,
      tenantId: resolvedAccountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      commercialDocs: [newDoc, ...(globalState.commercialDocs || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.upsertCommercialDoc(newDoc).catch(() => {});
    }
    const after = captureStoreSlices(['commercialDocs']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'create',
      summary: ul(
        `Created document ${newDoc.docNumber} (${newDoc.clientName})`,
        `Document créé : ${newDoc.docNumber} (${newDoc.clientName})`,
        `إنشاء مستند تجاري: ${newDoc.docNumber}`
      ),
      entityLabel: newDoc.docNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.deleteCommercialDoc(id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('trading_commercial_docs', id, globalState.currentUser?.id)
            .then(() => tradingService.upsertCommercialDoc(newDoc))
            .catch(() => {});
        }
      },
    });
    return newDoc;
  };

  const updateCommercialDoc = (id: string, updates: Partial<CommercialDocument>) => {
    const prev = (globalState.commercialDocs || []).find((d) => d.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['commercialDocs']);
    const updatedDocs = (globalState.commercialDocs || []).map((d) =>
      d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
    );
    globalState = {
      ...globalState,
      commercialDocs: updatedDocs,
    };
    notify();
    const target = updatedDocs.find((d) => d.id === id);
    if (target && isSupabaseConfigured()) {
      tradingService.upsertCommercialDoc(target).catch(() => {});
    }
    const after = captureStoreSlices(['commercialDocs']);
    const opType: UndoOperationType = updates.status && updates.status !== prev.status ? 'status' : 'edit';
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: opType,
      summary: ul(
        `Updated document ${prev.docNumber}`,
        `Document mis à jour : ${prev.docNumber}`,
        `تحديث المستند: ${prev.docNumber}`
      ),
      entityLabel: prev.docNumber,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.upsertCommercialDoc(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          tradingService.upsertCommercialDoc(target).catch(() => {});
        }
      },
    });
  };

  const deleteCommercialDoc = (id: string) => {
    const doc = (globalState.commercialDocs || []).find((d) => d.id === id);
    if (!doc) return;
    const before = captureStoreSlices(['commercialDocs']);
    globalState = {
      ...globalState,
      commercialDocs: (globalState.commercialDocs || []).filter((d) => d.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.deleteCommercialDoc(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['commercialDocs']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'delete',
      summary: ul(
        `Deleted document ${doc.docNumber}`,
        `Document supprimé : ${doc.docNumber}`,
        `حذف المستند: ${doc.docNumber}`
      ),
      entityLabel: doc.docNumber,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('trading_commercial_docs', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          tradingService.deleteCommercialDoc(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const convertCommercialDoc = (sourceDocId: string, targetType: CommercialDocType) => {
    const sourceDoc = (globalState.commercialDocs || []).find((d) => d.id === sourceDocId);
    if (!sourceDoc) return null;

    const before = captureStoreSlices(['commercialDocs']);
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

    if (isSupabaseConfigured()) {
      tradingService.convertCommercialDoc(sourceDocId, targetType, docNumber).catch(() => {});
      tradingService.upsertCommercialDoc(newDoc).catch(() => {});
      tradingService.upsertCommercialDoc(updatedSource).catch(() => {});
    }

    const after = captureStoreSlices(['commercialDocs']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'status',
      summary: ul(
        `Converted ${sourceDoc.docNumber} → ${newDoc.docNumber}`,
        `${sourceDoc.docNumber} converti en ${newDoc.docNumber}`,
        `تحويل ${sourceDoc.docNumber} ← ${newDoc.docNumber}`
      ),
      entityLabel: newDoc.docNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => tradingService.deleteCommercialDoc(newDoc.id, globalState.currentUser?.id),
              () => tradingService.upsertCommercialDoc(sourceDoc),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => syncCoordinator.restoreRow('trading_commercial_docs', newDoc.id, globalState.currentUser?.id).then(() => tradingService.upsertCommercialDoc(newDoc)),
              () => tradingService.upsertCommercialDoc(updatedSource),
            ],
            4
          ).catch(() => {});
        }
      },
    });

    return newDoc;
  };

  const createPurchaseDoc = (doc: Omit<PurchaseDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const resolvedAccountId = requireTenantAccountId(doc.accountId, doc.tenantId, globalState.account?.id);
    const before = captureStoreSlices(['purchaseDocs']);
    const id = `pdoc_${Date.now()}`;
    const newDoc: PurchaseDocument = {
      ...doc,
      id,
      accountId: resolvedAccountId,
      businessId: doc.businessId || globalState.currentBusinessId,
      branchId: doc.branchId || globalState.currentBranchId,
      facilityId: doc.facilityId || globalState.currentBranchId,
      tenantId: resolvedAccountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      purchaseDocs: [newDoc, ...(globalState.purchaseDocs || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.upsertPurchaseDoc(newDoc).catch(() => {});
    }
    const after = captureStoreSlices(['purchaseDocs']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'create',
      summary: ul(
        `Purchase order created: ${newDoc.docNumber}`,
        `Commande fournisseur créée : ${newDoc.docNumber}`,
        `إنشاء طلب شراء: ${newDoc.docNumber}`
      ),
      entityLabel: newDoc.docNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.deletePurchaseDoc(id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('trading_purchase_docs', id, globalState.currentUser?.id)
            .then(() => tradingService.upsertPurchaseDoc(newDoc))
            .catch(() => {});
        }
      },
    });
    return newDoc;
  };

  const updatePurchaseDoc = (id: string, updates: Partial<PurchaseDocument>) => {
    const prev = (globalState.purchaseDocs || []).find((p) => p.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['purchaseDocs']);
    const updatedDocs = (globalState.purchaseDocs || []).map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    globalState = {
      ...globalState,
      purchaseDocs: updatedDocs,
    };
    notify();
    const target = updatedDocs.find((p) => p.id === id);
    if (target && isSupabaseConfigured()) {
      tradingService.upsertPurchaseDoc(target).catch(() => {});
    }
    const after = captureStoreSlices(['purchaseDocs']);
    const opType: UndoOperationType = updates.status && updates.status !== prev.status ? 'status' : 'edit';
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: opType,
      summary: ul(
        `Updated purchase doc ${prev.docNumber}`,
        `Document d'achat mis à jour : ${prev.docNumber}`,
        `تحديث مستند الشراء: ${prev.docNumber}`
      ),
      entityLabel: prev.docNumber,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.upsertPurchaseDoc(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          tradingService.upsertPurchaseDoc(target).catch(() => {});
        }
      },
    });
  };

  const receivePurchaseDoc = (poId: string) => {
    const po = (globalState.purchaseDocs || []).find((p) => p.id === poId);
    if (!po) return null;

    const before = captureStoreSlices(['purchaseDocs', 'stockVouchers', 'products']);
    const prevTouchedProducts = (globalState.products || []).filter((prod) =>
      po.items.some((it) => it.productId === prod.id || it.description === prod.name)
    );
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
      accountId: po.accountId || globalState.account.id,
      businessId: po.businessId || globalState.currentBusinessId,
      branchId: po.branchId || globalState.currentBranchId,
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

    const touchedProds = updatedProducts.filter((prod) =>
      po.items.some((it) => it.productId === prod.id || it.description === prod.name)
    );
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        [
          () => tradingService.upsertPurchaseDoc(newBr),
          () => tradingService.upsertPurchaseDoc(updatedPo),
          () => tradingService.upsertStockVoucher(newVoucher),
          ...touchedProds.map((p) => () => tradingService.upsertProduct(p, po.depotId)),
        ],
        4
      ).catch(() => {});
    }

    const after = captureStoreSlices(['purchaseDocs', 'stockVouchers', 'products']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'status',
      summary: ul(
        `Received ${po.docNumber} → ${brNumber}`,
        `Réception validée : ${brNumber} (stock incrémenté)`,
        `تأكيد الاستلام: ${brNumber}`
      ),
      entityLabel: brNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => tradingService.deletePurchaseDoc(newBr.id, globalState.currentUser?.id),
              () => tradingService.upsertPurchaseDoc(po),
              () => tradingService.deleteStockVoucher(newVoucher.id, globalState.currentUser?.id),
              ...prevTouchedProducts.map((p) => () => tradingService.upsertProduct(p, po.depotId)),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => syncCoordinator.restoreRow('trading_purchase_docs', newBr.id, globalState.currentUser?.id).then(() => tradingService.upsertPurchaseDoc(newBr)),
              () => tradingService.upsertPurchaseDoc(updatedPo),
              () => syncCoordinator.restoreRow('trading_stock_vouchers', newVoucher.id, globalState.currentUser?.id).then(() => tradingService.upsertStockVoucher(newVoucher)),
              ...touchedProds.map((p) => () => tradingService.upsertProduct(p, po.depotId)),
            ],
            4
          ).catch(() => {});
        }
      },
    });

    return newBr;
  };

  const createStockVoucher = (voucher: Omit<StockMovementVoucher, 'id' | 'createdAt'>) => {
    const before = captureStoreSlices(['stockVouchers', 'products']);
    const prevTouchedProducts = (globalState.products || []).filter((prod) =>
      voucher.items.some((it) => it.productId === prod.id)
    );
    const id = `svouch_${Date.now()}`;
    const newVoucher: StockMovementVoucher = {
      ...getTraceContext(),
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

    const touchedProds = updatedProducts.filter((prod) =>
      voucher.items.some((it) => it.productId === prod.id)
    );
    if (isSupabaseConfigured()) {
      runWithConcurrency(
        [
          () => tradingService.upsertStockVoucher(newVoucher),
          ...touchedProds.map((p) => () => tradingService.upsertProduct(p, voucher.depotSourceId)),
        ],
        4
      ).catch(() => {});
    }

    const after = captureStoreSlices(['stockVouchers', 'products']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'create',
      summary: ul(
        `Stock voucher: ${newVoucher.voucherNumber}`,
        `Mouvement de stock : ${newVoucher.voucherNumber}`,
        `حركة مخزون: ${newVoucher.voucherNumber}`
      ),
      entityLabel: newVoucher.voucherNumber,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => tradingService.deleteStockVoucher(id, globalState.currentUser?.id),
              ...prevTouchedProducts.map((p) => () => tradingService.upsertProduct(p, voucher.depotSourceId)),
            ],
            4
          ).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          runWithConcurrency(
            [
              () => syncCoordinator.restoreRow('trading_stock_vouchers', id, globalState.currentUser?.id).then(() => tradingService.upsertStockVoucher(newVoucher)),
              ...touchedProds.map((p) => () => tradingService.upsertProduct(p, voucher.depotSourceId)),
            ],
            4
          ).catch(() => {});
        }
      },
    });

    return newVoucher;
  };

  const createB2bClient = (client: Omit<B2bClient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const resolvedAccountId = requireTenantAccountId(client.accountId, client.tenantId, globalState.account?.id);
    const before = captureStoreSlices(['b2bClients']);
    const id = `b2b_cli_${Date.now()}`;
    const newClient: B2bClient = {
      ...getTraceContext(),
      ...client,
      id,
      accountId: resolvedAccountId,
      tenantId: resolvedAccountId,
      facilityId: client.facilityId || globalState.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      b2bClients: [newClient, ...(globalState.b2bClients || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.upsertClient(newClient).catch(() => {});
    }
    const after = captureStoreSlices(['b2bClients']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'create',
      summary: ul(
        `Created B2B client: ${newClient.companyName}`,
        `Client B2B créé : ${newClient.companyName}`,
        `إضافة عميل B2B: ${newClient.companyName}`
      ),
      entityLabel: newClient.companyName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.deleteClient(id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('trading_b2b_clients', id, globalState.currentUser?.id)
            .then(() => tradingService.upsertClient(newClient))
            .catch(() => {});
        }
      },
    });
    return newClient;
  };

  const updateB2bClient = (id: string, updates: Partial<B2bClient>) => {
    const prev = (globalState.b2bClients || []).find((c) => c.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['b2bClients']);
    const updatedClients = (globalState.b2bClients || []).map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    );
    globalState = {
      ...globalState,
      b2bClients: updatedClients,
    };
    notify();
    const target = updatedClients.find((c) => c.id === id);
    if (target && isSupabaseConfigured()) {
      tradingService.upsertClient(target).catch(() => {});
    }
    const after = captureStoreSlices(['b2bClients']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'edit',
      summary: ul(
        `Updated B2B client: ${prev.companyName}`,
        `Client B2B modifié : ${prev.companyName}`,
        `تعديل عميل B2B: ${prev.companyName}`
      ),
      entityLabel: prev.companyName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.upsertClient(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          tradingService.upsertClient(target).catch(() => {});
        }
      },
    });
  };

  const deleteB2bClient = (id: string) => {
    const prev = (globalState.b2bClients || []).find((c) => c.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['b2bClients']);
    globalState = {
      ...globalState,
      b2bClients: (globalState.b2bClients || []).filter((c) => c.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.deleteClient(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['b2bClients']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'delete',
      summary: ul(
        `Deleted B2B client: ${prev.companyName}`,
        `Client B2B supprimé : ${prev.companyName}`,
        `حذف عميل B2B: ${prev.companyName}`
      ),
      entityLabel: prev.companyName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('trading_b2b_clients', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          tradingService.deleteClient(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const createB2bSupplier = (supplier: Omit<B2bSupplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    const resolvedAccountId = requireTenantAccountId(supplier.accountId, supplier.tenantId, globalState.account?.id);
    const before = captureStoreSlices(['b2bSuppliers']);
    const id = `b2b_sup_${Date.now()}`;
    const newSup: B2bSupplier = {
      ...getTraceContext(),
      ...supplier,
      id,
      accountId: resolvedAccountId,
      tenantId: resolvedAccountId,
      facilityId: supplier.facilityId || globalState.currentBranchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      b2bSuppliers: [newSup, ...(globalState.b2bSuppliers || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.upsertSupplier(newSup).catch(() => {});
    }
    const after = captureStoreSlices(['b2bSuppliers']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'create',
      summary: ul(
        `Supplier added: ${newSup.supplierName}`,
        `Fournisseur référencé : ${newSup.supplierName}`,
        `إضافة مورد: ${newSup.supplierName}`
      ),
      entityLabel: newSup.supplierName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.deleteSupplier(id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('trading_b2b_suppliers', id, globalState.currentUser?.id)
            .then(() => tradingService.upsertSupplier(newSup))
            .catch(() => {});
        }
      },
    });
    return newSup;
  };

  const updateB2bSupplier = (id: string, updates: Partial<B2bSupplier>) => {
    const prev = (globalState.b2bSuppliers || []).find((s) => s.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['b2bSuppliers']);
    const updatedSuppliers = (globalState.b2bSuppliers || []).map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    globalState = {
      ...globalState,
      b2bSuppliers: updatedSuppliers,
    };
    notify();
    const target = updatedSuppliers.find((s) => s.id === id);
    if (target && isSupabaseConfigured()) {
      tradingService.upsertSupplier(target).catch(() => {});
    }
    const after = captureStoreSlices(['b2bSuppliers']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'edit',
      summary: ul(
        `Updated supplier: ${prev.supplierName}`,
        `Fournisseur modifié : ${prev.supplierName}`,
        `تعديل المورد: ${prev.supplierName}`
      ),
      entityLabel: prev.supplierName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.upsertSupplier(prev).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (target && isSupabaseConfigured()) {
          tradingService.upsertSupplier(target).catch(() => {});
        }
      },
    });
  };

  const deleteB2bSupplier = (id: string) => {
    const prev = (globalState.b2bSuppliers || []).find((s) => s.id === id);
    if (!prev) return;
    const before = captureStoreSlices(['b2bSuppliers']);
    globalState = {
      ...globalState,
      b2bSuppliers: (globalState.b2bSuppliers || []).filter((s) => s.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.deleteSupplier(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['b2bSuppliers']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'delete',
      summary: ul(
        `Deleted supplier: ${prev.supplierName}`,
        `Fournisseur supprimé : ${prev.supplierName}`,
        `حذف المورد: ${prev.supplierName}`
      ),
      entityLabel: prev.supplierName,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('trading_b2b_suppliers', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          tradingService.deleteSupplier(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };

  const createWarehouseDepot = (depot: Omit<WarehouseDepot, 'id' | 'createdAt'>) => {
    const before = captureStoreSlices(['warehouses']);
    const id = `depot_${Date.now()}`;
    const newDepot: WarehouseDepot = {
      ...getTraceContext(),
      ...depot,
      businessId: depot.businessId || globalState.currentBusinessId,
      branchId: depot.branchId || globalState.currentBranchId,
      facilityId: depot.facilityId || globalState.currentBranchId,
      id,
      createdAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      warehouses: [...(globalState.warehouses || []), newDepot],
    };
    notify();
    if (isSupabaseConfigured()) {
      tradingService.upsertWarehouse(newDepot).catch(() => {});
    }
    const after = captureStoreSlices(['warehouses']);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'create',
      summary: ul(
        `Warehouse created: ${newDepot.name}`,
        `Dépôt créé : ${newDepot.name}`,
        `إضافة مستودع: ${newDepot.name}`
      ),
      entityLabel: newDepot.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          tradingService.deleteWarehouse(id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('trading_warehouses', id, globalState.currentUser?.id)
            .then(() => tradingService.upsertWarehouse(newDepot))
            .catch(() => {});
        }
      },
    });
    return newDepot;
  };

  const resetTradingMockData = () => {
    const keys: (keyof AppState)[] = [
      'b2bClients',
      'b2bSuppliers',
      'warehouses',
      'commercialDocs',
      'purchaseDocs',
      'stockVouchers',
    ];
    const before = captureStoreSlices(keys);
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
    const after = captureStoreSlices(keys);
    registerUndoEntry({
      vertical: 'trading_commercial',
      operationType: 'bulk',
      summary: ul(
        'B2B Trading demo data reset',
        'Négoce commercial réinitialisé',
        'إعادة ضبط بيانات التجارة'
      ),
      toastType: 'info',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
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
    const report = validateBackupSnapshot(jsonString);
    if (!report.valid || !report.parsed) {
      showToast({
        type: 'error',
        title: 'Invalid Backup File',
        message:
          report.errors[0] ||
          'The selected file is missing essential Atrium database structures.',
      });
      return false;
    }

    const previousSnapshot = cloneSnapshot(globalState);
    const parsed = report.parsed;
    globalState = {
      ...DEFAULT_STATE,
      ...parsed,
      storageVersion: ATRIUM_STORAGE_VERSION,
      businessConfigs: {
        ...INITIAL_BUSINESS_CONFIGS,
        ...(parsed.businessConfigs && typeof parsed.businessConfigs === 'object'
          ? parsed.businessConfigs
          : {}),
      },
      categoryFormules: Array.isArray(parsed.categoryFormules)
        ? parsed.categoryFormules
        : INITIAL_CATEGORY_FORMULES,
      toasts: globalState.toasts,
      concurrencyConflicts: [],
    };
    notify();
    const afterSnapshot = cloneSnapshot(globalState);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'bulk',
      summary: ul(
        `Database restored (${report.totalRecords} records)`,
        `Sauvegarde importée (${report.totalRecords} enregistrements)`,
        `استعادة قاعدة البيانات (${report.totalRecords} سجل)`
      ),
      toastType: 'success',
      undo: () => {
        globalState = { ...cloneSnapshot(previousSnapshot), toasts: globalState.toasts };
        notify();
      },
      redo: () => {
        globalState = { ...cloneSnapshot(afterSnapshot), toasts: globalState.toasts };
        notify();
      },
    });
    return true;
  };

  const setNetworkMode = setNetworkModeAction;
  const retryCloudSync = retryCloudSyncAction;


  const syncWithSupabase = syncWithSupabaseAction;
  const setActiveContractorRole = (role: ContractorRole) => {
    globalState = { ...globalState, activeContractorRole: role, activeScreen: "home" };
    notify();
  };
  const setActiveAgriRole = (role: AgriRole) => {
    globalState = { ...globalState, activeAgriRole: role, activeScreen: "home" };
    notify();
  };
  const setActiveMembershipRole = (role: StandardRole) => {
    globalState = { ...globalState, activeMembershipRole: role, activeScreen: "home" };
    notify();
  };
  const setActiveAppointmentRole = (role: StandardRole) => {
    globalState = { ...globalState, activeAppointmentRole: role, activeScreen: "home" };
    notify();
  };
  const setActivePosRole = (role: StandardRole) => {
    globalState = { ...globalState, activePosRole: role, activeScreen: "home" };
    notify();
  };
  const setActiveEducationRole = (role: StandardRole) => {
    globalState = { ...globalState, activeEducationRole: role, activeScreen: "home" };
    notify();
  };
  const addMemberCheckIn = (checkIn: MemberCheckInLog) => {
    const before = captureStoreSlices(['memberCheckIns']);
    const id = checkIn.id || generateClientUuid();
    const scopedCheckIn: MemberCheckInLog = {
      ...checkIn,
      id,
      businessId: checkIn.businessId || globalState.currentBusinessId,
      branchId: checkIn.branchId || globalState.currentBranchId,
    };
    globalState = {
      ...globalState,
      memberCheckIns: [scopedCheckIn, ...(globalState.memberCheckIns || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      const rpcMethod =
        scopedCheckIn.checkInMethod === 'barcode_scanner'
          ? 'qr'
          : scopedCheckIn.checkInMethod === 'manual_click'
          ? 'manual'
          : 'rfid';
      memberService
        .recordCheckIn(
          scopedCheckIn.branchId,
          scopedCheckIn.memberId,
          rpcMethod,
          getActiveDeviceId(),
          {
            checkInId: id,
            duplicateWindowMinutes: 5,
            overrideByStaffId: scopedCheckIn.overrideByStaffId,
            overrideReason: scopedCheckIn.overrideReason,
          }
        )
        .catch(() => {});
    }

    const after = captureStoreSlices(['memberCheckIns']);
    registerUndoEntry({
      vertical: 'membership_session',
      operationType: 'create',
      summary: ul(
        `Check-in logged: ${scopedCheckIn.memberName}`,
        `Passage enregistré : ${scopedCheckIn.memberName}`,
        `تسجيل دخول عضو: ${scopedCheckIn.memberName}`
      ),
      entityLabel: scopedCheckIn.memberName,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('gym_check_ins', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_check_ins', id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };
  const addWalkInTicket = (ticket: WalkInTicket) => {
    const before = captureStoreSlices(['walkInTickets']);
    const normalizedTicket: WalkInTicket = {
      ...ticket,
      id: ticket.id && /^[0-9a-f]{8}-/i.test(ticket.id) ? ticket.id : generateClientUuid(),
    };
    globalState = {
      ...globalState,
      walkInTickets: [normalizedTicket, ...(globalState.walkInTickets || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      memberService
        .upsertWalkInTicket(normalizedTicket, {
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: globalState.currentBranchId,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['walkInTickets']);
    registerUndoEntry({
      vertical: getActiveCategoryForBranch(globalState.currentBranchId),
      operationType: 'create',
      summary: ul(
        `Walk-in ticket issued: ${normalizedTicket.ticketNumber || normalizedTicket.id}`,
        `Ticket sans RDV émis : ${normalizedTicket.ticketNumber || normalizedTicket.id}`,
        `تذكرة دخول فوري: ${normalizedTicket.ticketNumber || normalizedTicket.id}`
      ),
      entityLabel: normalizedTicket.ticketNumber || normalizedTicket.id,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('gym_walk_in_tickets', normalizedTicket.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('gym_walk_in_tickets', normalizedTicket.id, globalState.currentUser?.id)
            .then(() =>
              memberService.upsertWalkInTicket(normalizedTicket, {
                accountId: globalState.account.id,
                businessId: globalState.currentBusinessId,
                branchId: globalState.currentBranchId,
              })
            )
            .catch(() => {});
        }
      },
    });
  };
  const updateSalonChairStation = (station: SalonChairStation) => {
    const before = captureStoreSlices(['salonChairStations']);
    const targetUuid = toValidUuid(station.workstationId);
    const normalizedInput: SalonChairStation = buildPersistedChairStation({
      ...station,
      servicePriceCentimes:
        station.servicePriceCentimes != null
          ? Math.round(station.servicePriceCentimes)
          : station.servicePriceDzd != null
          ? dzdToCentimes(station.servicePriceDzd)
          : undefined,
      servicePriceDzd:
        station.servicePriceDzd != null
          ? station.servicePriceDzd
          : station.servicePriceCentimes != null
          ? centimesToDzd(station.servicePriceCentimes)
          : undefined,
    });
    const existing = (globalState.salonChairStations || []).findIndex(
      (s) => s.workstationId === station.workstationId || toValidUuid(s.workstationId) === targetUuid
    );
    const prevStation = existing >= 0 ? (globalState.salonChairStations || [])[existing] : null;
    const nextStations = [...(globalState.salonChairStations || [])];
    if (existing >= 0) nextStations[existing] = normalizedInput;
    else nextStations.push(normalizedInput);
    globalState = { ...globalState, salonChairStations: nextStations };
    notify();
    if (isSupabaseConfigured()) {
      appointmentService
        .upsertChairStation(normalizedInput, {
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId: globalState.currentBranchId,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['salonChairStations']);
    registerUndoEntry({
      vertical: 'appointment_service',
      operationType: 'status',
      summary: ul(
        `Chair station updated: ${normalizedInput.workstationName || normalizedInput.workstationId}`,
        `Poste salon mis à jour : ${normalizedInput.workstationName || normalizedInput.workstationId}`,
        `تحديث كرسي الصالون: ${normalizedInput.workstationName || normalizedInput.workstationId}`
      ),
      entityLabel: normalizedInput.clientName || normalizedInput.workstationName || normalizedInput.workstationId,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          if (prevStation) {
            appointmentService
              .upsertChairStation(prevStation, {
                accountId: globalState.account.id,
                businessId: globalState.currentBusinessId,
                branchId: globalState.currentBranchId,
              })
              .catch(() => {});
          } else {
            syncCoordinator.softDeleteRow('salon_chair_stations', normalizedInput.workstationId, globalState.currentUser?.id).catch(() => {});
          }
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('salon_chair_stations', normalizedInput.workstationId, globalState.currentUser?.id)
            .then(() =>
              appointmentService.upsertChairStation(normalizedInput, {
                accountId: globalState.account.id,
                businessId: globalState.currentBusinessId,
                branchId: globalState.currentBranchId,
              })
            )
            .catch(() => {});
        }
      },
    });
  };
  const recordQuickAttendance = (
    record: EduQuickAttendanceRecord & { changeReason?: string }
  ) => {
    const before = captureStoreSlices(['eduQuickAttendance', 'eduAttendance', 'eduStudents']);
    const existingQuick = (globalState.eduQuickAttendance || []).findIndex(
      (r) => r.sessionId === record.sessionId && r.studentId === record.studentId
    );
    const nextQuick = [...(globalState.eduQuickAttendance || [])];
    const cleanQuick: EduQuickAttendanceRecord = {
      sessionId: record.sessionId,
      cohortId: record.cohortId,
      studentId: record.studentId,
      studentName: record.studentName,
      status: record.status,
      markedAt: record.markedAt,
      markedByStaffId: record.markedByStaffId,
      isLocked: record.isLocked,
    };
    if (existingQuick >= 0) nextQuick[existingQuick] = cleanQuick;
    else nextQuick.push(cleanQuick);

    const statusMap: Record<EduQuickAttendanceRecord['status'], AttendanceStatus> = {
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      excused: 'Excused',
    };
    const nextStatus = statusMap[record.status] || 'Present';
    const prevEdu = (globalState.eduAttendance || []).find(
      (a) => a.sessionId === record.sessionId && a.studentId === record.studentId
    );
    const staffId = globalState.currentUser?.id || record.markedByStaffId || 'stf_01';
    const nowIso = record.markedAt || new Date().toISOString();
    const changeHistory = appendEduAttendanceChange(
      prevEdu,
      nextStatus,
      staffId,
      record.changeReason || 'Roll call update',
      nowIso
    );
    const eduRecord: EduAttendance = {
      ...getTraceContext(),
      id: prevEdu?.id || generateClientUuid(),
      tenantId: globalState.account.id,
      facilityId: globalState.currentBranchId,
      sessionId: record.sessionId,
      cohortId: record.cohortId,
      studentId: record.studentId,
      studentName: record.studentName,
      status: nextStatus,
      recordedAt: prevEdu?.recordedAt || nowIso,
      markedBy: staffId,
      markedAt: nowIso,
      isLocked: record.isLocked,
      changeHistory,
      version: prevEdu?.version,
    };

    const nextEduAttendance = dedupeEduAttendanceRecords([
      ...(globalState.eduAttendance || []).filter(
        (a) => !(a.sessionId === record.sessionId && a.studentId === record.studentId)
      ),
      eduRecord,
    ]);

    const updatedStudents = (globalState.eduStudents || []).map((st) => {
      if (st.id !== record.studentId) return st;
      const studentRecords = nextEduAttendance.filter((a) => a.studentId === st.id);
      if (studentRecords.length === 0) return st;
      const presentCount = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
      const rate = Math.round((presentCount / studentRecords.length) * 1000) / 10;
      return { ...st, attendanceRatePercent: rate };
    });

    globalState = {
      ...globalState,
      eduQuickAttendance: nextQuick,
      eduAttendance: nextEduAttendance,
      eduStudents: updatedStudents,
    };
    notify();

    if (isSupabaseConfigured()) {
      educationService.upsertAttendance(eduRecord).catch(() => {});
    }

    const after = captureStoreSlices(['eduQuickAttendance', 'eduAttendance', 'eduStudents']);
    registerUndoEntry({
      vertical: 'education_cohort',
      operationType: 'status',
      summary: ul(
        `Roll call marked (${record.status})`,
        `Présence enregistrée (${record.status})`,
        `تسجيل حضور سريع (${record.status})`
      ),
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          if (prevEdu) {
            educationService.upsertAttendance(prevEdu).catch(() => {});
          } else {
            syncCoordinator.softDeleteRow('edu_attendance', eduRecord.id, globalState.currentUser?.id).catch(() => {});
          }
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('edu_attendance', eduRecord.id, globalState.currentUser?.id)
            .then(() => educationService.upsertAttendance(eduRecord))
            .catch(() => {});
        }
      },
    });
  };
  const unlockEduSessionAttendance = (sessionId: string, reason: string) => {
    const before = captureStoreSlices(['eduQuickAttendance', 'eduAttendance']);
    const nowIso = new Date().toISOString();
    const staffId = globalState.currentUser?.id || 'stf_01';
    const nextEdu = (globalState.eduAttendance || []).map((a) =>
      a.sessionId === sessionId
        ? {
            ...a,
            isLocked: false,
            markedBy: staffId,
            markedAt: nowIso,
            changeHistory: [
              ...(Array.isArray(a.changeHistory) ? a.changeHistory : []),
              {
                previousStatus: a.status,
                newStatus: a.status,
                changedBy: staffId,
                changedAt: nowIso,
                reason: `Unlocked: ${reason.trim() || 'PIN verified'}`,
              },
            ],
          }
        : a
    );
    const nextQuick = (globalState.eduQuickAttendance || []).map((q) =>
      q.sessionId === sessionId ? { ...q, isLocked: false } : q
    );
    globalState = { ...globalState, eduAttendance: nextEdu, eduQuickAttendance: nextQuick };
    notify();

    const changedRows = nextEdu.filter((a) => a.sessionId === sessionId);
    if (isSupabaseConfigured() && changedRows.length > 0) {
      runWithConcurrency(
        changedRows.map((rec) => () => educationService.upsertAttendance(rec)),
        4
      ).catch(() => {});
    }

    const after = captureStoreSlices(['eduQuickAttendance', 'eduAttendance']);
    registerUndoEntry({
      vertical: 'education_cohort',
      operationType: 'status',
      summary: ul('Roll call unlocked', 'Appel déverrouillé', 'إلغاء قفل الحضور'),
      toastType: 'info',
      undo: () => restoreStoreSlices(before),
      redo: () => restoreStoreSlices(after),
    });
  };
  const openPosCashSession = (params: { openingFloatCentimes: number; notes?: string }): PosCashSession => {
    const before = captureStoreSlices(['posCashSessions']);
    const nowIso = new Date().toISOString();
    const floatCentimes = Math.max(0, Math.round(params.openingFloatCentimes || 0));
    const session: PosCashSession = {
      id: generateClientUuid(),
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId: globalState.currentBranchId,
      staffId: globalState.currentUser?.id,
      openedByStaffId: globalState.currentUser?.id,
      openedByName: globalState.currentUser?.fullName || 'Cashier',
      openedAt: nowIso,
      openingFloatCentimes: floatCentimes,
      expectedCashCentimes: floatCentimes,
      varianceCentimes: 0,
      status: 'open',
      notes: params.notes?.trim() || undefined,
    };
    globalState = {
      ...globalState,
      posCashSessions: [session, ...(globalState.posCashSessions || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      posService.upsertCashSession(session).catch(() => {});
    }
    const after = captureStoreSlices(['posCashSessions']);
    registerUndoEntry({
      vertical: 'pos_inventory',
      operationType: 'create',
      summary: ul('Opened cash drawer', 'Caisse ouverte', 'فتح درج الصندوق'),
      entityLabel: session.openedByName,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.softDeleteRow('pos_cash_sessions', session.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pos_cash_sessions', session.id, globalState.currentUser?.id)
            .then(() => posService.upsertCashSession(session))
            .catch(() => {});
        }
      },
    });
    return session;
  };
  const addPosCashMovement = (params: {
    sessionId?: string;
    reference?: string;
    payee: string;
    category: PosCashMovement['category'];
    paymentMethod: PosCashMovement['paymentMethod'];
    direction?: 'in' | 'out';
    amountCentimes: number;
    notes?: string;
  }): PosCashMovement => {
    const before = captureStoreSlices(['posCashMovements']);
    const existingCount = (globalState.posCashMovements || []).filter(
      (m) => m.branchId === globalState.currentBranchId
    ).length;
    const mv: PosCashMovement = {
      id: generateClientUuid(),
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId: globalState.currentBranchId,
      staffId: globalState.currentUser?.id,
      sessionId: params.sessionId,
      reference: params.reference || `DEC-${String(existingCount + 1).padStart(3, '0')}`,
      payee: params.payee.trim(),
      category: params.category,
      paymentMethod: params.paymentMethod,
      direction: params.direction || 'out',
      amountCentimes: Math.max(0, Math.round(params.amountCentimes || 0)),
      paidBy: globalState.currentUser?.fullName || 'Cashier',
      notes: params.notes?.trim() || undefined,
      occurredAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      posCashMovements: [mv, ...(globalState.posCashMovements || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      posService.upsertCashMovement(mv).catch(() => {});
    }
    const after = captureStoreSlices(['posCashMovements']);
    registerUndoEntry({
      vertical: 'pos_inventory',
      operationType: 'create',
      summary: ul(
        `Cash movement: ${mv.payee}`,
        `Mouvement de caisse : ${mv.payee}`,
        `حركة صندوق: ${mv.payee}`
      ),
      entityLabel: mv.payee,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          posService.deleteCashMovement(mv.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pos_cash_movements', mv.id, globalState.currentUser?.id)
            .then(() => posService.upsertCashMovement(mv))
            .catch(() => {});
        }
      },
    });
    return mv;
  };
  const deletePosCashMovement = (movementId: string) => {
    const target = (globalState.posCashMovements || []).find((m) => m.id === movementId);
    if (!target) return;
    const before = captureStoreSlices(['posCashMovements']);
    globalState = {
      ...globalState,
      posCashMovements: (globalState.posCashMovements || []).filter((m) => m.id !== movementId),
    };
    notify();
    if (isSupabaseConfigured()) {
      posService.deleteCashMovement(movementId, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['posCashMovements']);
    registerUndoEntry({
      vertical: 'pos_inventory',
      operationType: 'delete',
      summary: ul(
        `Deleted movement: ${target.payee}`,
        `Mouvement supprimé : ${target.payee}`,
        `حذف حركة: ${target.payee}`
      ),
      entityLabel: target.payee,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('pos_cash_movements', movementId, globalState.currentUser?.id)
            .then(() => posService.upsertCashMovement(target))
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          posService.deleteCashMovement(movementId, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
  };
  const closePosCashSessionAndIssueZReport = async (params: {
    sessionId?: string;
    openingFloatCentimes?: number;
    actualCashCentimes: number;
    variancePinVerified: boolean;
    varianceVerifiedByStaffId?: string;
    notes?: string;
  }): Promise<PosZReport> => {
    const nowIso = new Date().toISOString();
    const businessDate = nowIso.slice(0, 10);
    const branchId = globalState.currentBranchId;
    const existingSession = params.sessionId
      ? (globalState.posCashSessions || []).find((s) => s.id === params.sessionId)
      : (globalState.posCashSessions || []).find(
          (s) => s.branchId === branchId && s.status === 'open'
        );

    const openingFloatCentimes =
      existingSession?.openingFloatCentimes ??
      Math.max(0, Math.round(params.openingFloatCentimes ?? 0));

    const branchSalesToday = (globalState.sales || []).filter(
      (s) =>
        (s.facilityId === branchId || s.branchId === branchId) &&
        s.createdAt.startsWith(businessDate)
    );
    const paymentTotals = sumSalePaymentCentimes(branchSalesToday);

    const branchMovements = (globalState.posCashMovements || []).filter(
      (m) =>
        m.branchId === branchId &&
        (existingSession ? m.sessionId === existingSession.id || !m.sessionId : m.occurredAt.startsWith(businessDate))
    );

    const drawerSummary = computeDrawerExpectedCentimes({
      openingFloatCentimes,
      cashSalesCentimes: paymentTotals.cashSalesCentimes,
      cashMovements: branchMovements,
      cashRefundsCentimes: 0,
    });

    const actualCashCentimes = Math.max(0, Math.round(params.actualCashCentimes));
    const varianceCentimes = computeVarianceCentimes(
      actualCashCentimes,
      drawerSummary.expectedCashCentimes
    );

    const closedSession: PosCashSession = existingSession
      ? {
          ...existingSession,
          closedByStaffId: globalState.currentUser?.id,
          closedByName: globalState.currentUser?.fullName || 'Cashier',
          closedAt: nowIso,
          expectedCashCentimes: drawerSummary.expectedCashCentimes,
          actualCashCentimes,
          varianceCentimes,
          variancePinVerified: params.variancePinVerified,
          varianceVerifiedByStaffId: params.varianceVerifiedByStaffId,
          status: 'closed',
          notes: params.notes?.trim() || existingSession.notes,
        }
      : {
          id: generateClientUuid(),
          accountId: globalState.account.id,
          businessId: globalState.currentBusinessId,
          branchId,
          staffId: globalState.currentUser?.id,
          openedByStaffId: globalState.currentUser?.id,
          openedByName: globalState.currentUser?.fullName || 'Cashier',
          closedByStaffId: globalState.currentUser?.id,
          closedByName: globalState.currentUser?.fullName || 'Cashier',
          openedAt: nowIso,
          closedAt: nowIso,
          openingFloatCentimes,
          expectedCashCentimes: drawerSummary.expectedCashCentimes,
          actualCashCentimes,
          varianceCentimes,
          variancePinVerified: params.variancePinVerified,
          varianceVerifiedByStaffId: params.varianceVerifiedByStaffId,
          status: 'closed',
          notes: params.notes?.trim() || undefined,
        };

    const reportId = generateClientUuid();
    const localCloseRef = `ZLOC-${businessDate.replace(/-/g, '')}-${reportId.slice(0, 6).toUpperCase()}`;
    const provisionalReport: PosZReport = {
      id: reportId,
      accountId: globalState.account.id,
      businessId: globalState.currentBusinessId,
      branchId,
      sessionId: closedSession.id,
      zNumber: null,
      localCloseRef,
      status: 'provisional_pending_sync',
      businessDate,
      closedByStaffId: globalState.currentUser?.id,
      closedByName: globalState.currentUser?.fullName || 'Cashier',
      openingFloatCentimes,
      cashSalesCentimes: paymentTotals.cashSalesCentimes,
      cardSalesCentimes: paymentTotals.cardSalesCentimes,
      baridimobSalesCentimes: paymentTotals.baridimobSalesCentimes,
      refundsTotalCentimes: paymentTotals.refundsTotalCentimes,
      cashInCentimes: drawerSummary.cashInCentimes,
      cashOutCentimes: drawerSummary.cashOutCentimes,
      expectedCashCentimes: drawerSummary.expectedCashCentimes,
      actualCashCentimes,
      varianceCentimes,
      variancePinVerified: params.variancePinVerified,
      closedAt: nowIso,
      driftDetected: false,
      reprintedCount: 0,
      notes: params.notes?.trim() || undefined,
    };

    const nextSessions = existingSession
      ? (globalState.posCashSessions || []).map((s) =>
          s.id === closedSession.id ? closedSession : s
        )
      : [closedSession, ...(globalState.posCashSessions || [])];

    globalState = {
      ...globalState,
      posCashSessions: nextSessions,
      posZReports: [provisionalReport, ...(globalState.posZReports || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      await posService.upsertCashSession(closedSession).catch(() => {});
    }

    const canFinalizeOnline = isSupabaseConfigured() && globalState.networkMode !== 'offline';
    if (canFinalizeOnline) {
      const res = await posService.upsertZReport(provisionalReport).catch(() => null);
      if (res?.zNumber) {
        const finalizedAt = new Date().toISOString();
        const finalizedReport: PosZReport = {
          ...provisionalReport,
          zNumber: res.zNumber,
          status: res.status,
          finalizedAt,
        };
        globalState = {
          ...globalState,
          posZReports: (globalState.posZReports || []).map((r) =>
            r.id === reportId ? finalizedReport : r
          ),
        };
        notify();
        return finalizedReport;
      }
    } else if (isSupabaseConfigured()) {
      // Queue provisional close when offline
      await posService.upsertZReport(provisionalReport).catch(() => {});
    }

    return provisionalReport;
  };
  const reprintPosZReport = (reportId: string) => {
    const target = (globalState.posZReports || []).find((r) => r.id === reportId);
    if (!target) return;
    const nextCount = (target.reprintedCount || 0) + 1;
    globalState = {
      ...globalState,
      posZReports: (globalState.posZReports || []).map((r) =>
        r.id === reportId ? { ...r, reprintedCount: nextCount } : r
      ),
    };
    notify();
    if (isSupabaseConfigured()) {
      posService.incrementZReportReprint(reportId, nextCount, target.version).catch(() => {});
    }
  };
  const finalizeProvisionalPosZReports = async () => {
    if (!isSupabaseConfigured() || globalState.networkMode === 'offline') return;
    const branchId = globalState.currentBranchId;
    const pending = (globalState.posZReports || []).filter(
      (r) =>
        r.branchId === branchId &&
        r.status === 'provisional_pending_sync' &&
        !r.zNumber
    );
    if (pending.length === 0) return;

    for (const report of pending) {
      const salesForDay = (globalState.sales || []).filter(
        (s) =>
          (s.facilityId === branchId || s.branchId === branchId) &&
          s.createdAt.startsWith(report.businessDate)
      );
      const serverTotals = sumSalePaymentCentimes(salesForDay);
      const driftEval = evaluateProvisionalZReportDrift(report, serverTotals);
      const candidate: PosZReport = {
        ...report,
        driftDetected: driftEval.driftDetected,
        driftDetails: driftEval.driftDetails,
        status: driftEval.nextStatus,
      };
      const res = await posService.upsertZReport(candidate).catch(() => null);
      if (res) {
        const finalStatus: PosZReport['status'] = driftEval.driftDetected
          ? 'drift_flagged'
          : res.status;
        const finalizedAt = new Date().toISOString();
        globalState = {
          ...globalState,
          posZReports: (globalState.posZReports || []).map((r) =>
            r.id === report.id
              ? {
                  ...candidate,
                  zNumber: res.zNumber || r.zNumber,
                  status: finalStatus,
                  finalizedAt: r.finalizedAt || finalizedAt,
                }
              : r
          ),
        };
        notify();
      }
    }
  };
  const toggleTopBarCollapsed = toggleTopBarCollapsedAction;
  const toggleTopBarAutoHide = toggleTopBarAutoHideAction;
  const setTopBarAutoHide = (autoHide: boolean) => {
    globalState = { ...globalState, isTopBarAutoHide: autoHide };
    notify();
  };
  const setTopBarCollapsed = (collapsed: boolean) => {
    globalState = { ...globalState, isTopBarCollapsed: collapsed };
    notify();
  };
  const toggleListPodExpanded = toggleListPodExpandedAction;
  const setListPodExpanded = setListPodExpandedAction;
  const canAccessStaffScreenFn = (cat: BusinessCategory | string, role?: string) => {
    const resolvedCategory = cat || selectCurrentBusinessFromState(globalState).category;
    const effectiveRole = role ?? getEffectiveUserRole(resolvedCategory, globalState);
    return canAccessStaffScreen(resolvedCategory, effectiveRole);
  };
  const canViewSensitivePayrollFn = (role?: string) => {
    const resolvedCategory = selectCurrentBusinessFromState(globalState).category;
    const effectiveRole = role ?? getEffectiveUserRole(resolvedCategory, globalState);
    return canViewSensitivePayroll(effectiveRole);
  };

  const ensureExecutiveGuard = (): boolean => {
    const allowed = isExecutiveRole(globalState.currentUser?.role, globalState.currentUser?.roleRank);
    if (!allowed) {
      const lang = globalState.language || 'fr';
      showToast({
        type: 'warning',
        title:
          lang === 'ar'
            ? 'صلاحية محصورة بالإدارة'
            : lang === 'fr'
            ? 'Accès réservé à la direction'
            : 'Executive role required',
        message:
          lang === 'ar'
            ? 'تعديل الإعدادات والباقات مخصص للمالك أو المدير فقط.'
            : lang === 'fr'
            ? 'Seuls le gérant ou le propriétaire peuvent modifier les formules et paramètres fiscaux.'
            : 'Only owners or managers can edit fiscal rules and formules.',
      });
    }
    return allowed;
  };

  const updateBusinessIdentityAction = (updates: {
    name?: string;
    displayName?: string;
    address?: string;
    phone?: string;
  }) => {
    if (!ensureExecutiveGuard()) return false;
    const before = captureStoreSlices(['businesses', 'branches']);
    const biz = selectCurrentBusinessFromState(globalState);
    const updatedBusinesses = globalState.businesses.map((b) =>
      b.id === biz.id
        ? {
            ...b,
            name: updates.name !== undefined ? updates.name : b.name,
            displayName: updates.displayName !== undefined ? updates.displayName : b.displayName,
            address: updates.address !== undefined ? updates.address : b.address,
            phone: updates.phone !== undefined ? updates.phone : b.phone,
          }
        : b
    );
    const updatedBranches = globalState.branches.map((br) =>
      br.businessId === biz.id && (br.isMainBranch || br.id === globalState.currentBranchId)
        ? {
            ...br,
            address: updates.address !== undefined ? updates.address : br.address,
            phone: updates.phone !== undefined ? updates.phone : br.phone,
          }
        : br
    );
    globalState = {
      ...globalState,
      businesses: updatedBusinesses,
      branches: updatedBranches,
    };
    notify();

    const targetBiz = updatedBusinesses.find((b) => b.id === biz.id) || biz;
    if (isSupabaseConfigured()) {
      configService
        .updateBusinessIdentity({
          businessId: biz.id,
          name: targetBiz.name,
          displayName: targetBiz.displayName,
          address: targetBiz.address,
          phone: targetBiz.phone,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['businesses', 'branches']);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'edit',
      summary: ul(
        `Updated business profile: ${targetBiz.displayName || targetBiz.name}`,
        `Identité mise à jour : ${targetBiz.displayName || targetBiz.name}`,
        `تحديث هوية النشاط: ${targetBiz.displayName || targetBiz.name}`
      ),
      entityLabel: targetBiz.displayName || targetBiz.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          configService
            .updateBusinessIdentity({
              businessId: biz.id,
              name: biz.name,
              displayName: biz.displayName,
              address: biz.address,
              phone: biz.phone,
            })
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          configService
            .updateBusinessIdentity({
              businessId: biz.id,
              name: targetBiz.name,
              displayName: targetBiz.displayName,
              address: targetBiz.address,
              phone: targetBiz.phone,
            })
            .catch(() => {});
        }
      },
    });
    return true;
  };

  const updateBusinessConfigAction = (
    patch: Partial<
      Pick<
        BusinessCategoryConfig,
        'currency' | 'defaultTvaRate' | 'applyTimbreFiscal' | 'fiscalProfile' | 'categorySettings' | 'setupState'
      >
    >
  ) => {
    if (!ensureExecutiveGuard()) return null;
    const before = captureStoreSlices(['businessConfigs']);
    const biz = selectCurrentBusinessFromState(globalState);
    const current = selectCurrentBusinessConfigFromState(globalState);
    const nextConfig: BusinessCategoryConfig = {
      ...current,
      ...patch,
      fiscalProfile: {
        ...current.fiscalProfile,
        ...(patch.fiscalProfile || {}),
      },
      categorySettings: {
        ...current.categorySettings,
        ...(patch.categorySettings || {}),
      },
      setupState: {
        ...current.setupState,
        ...(patch.setupState || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      businessConfigs: {
        ...(globalState.businessConfigs || {}),
        [biz.id]: nextConfig,
      },
    };
    notify();
    if (isSupabaseConfigured()) {
      configService.upsertBusinessConfig(nextConfig).catch(() => {});
    }
    const after = captureStoreSlices(['businessConfigs']);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'edit',
      summary: ul(
        `Updated configuration (${biz.displayName || biz.name})`,
        `Configuration mise à jour (${biz.displayName || biz.name})`,
        `تحديث إعدادات النشاط`
      ),
      entityLabel: biz.displayName || biz.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          configService.upsertBusinessConfig(current).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          configService.upsertBusinessConfig(nextConfig).catch(() => {});
        }
      },
    });
    return nextConfig;
  };

  const dismissSetupBannerAction = () => {
    const current = selectCurrentBusinessConfigFromState(globalState);
    return updateBusinessConfigAction({
      setupState: {
        ...current.setupState,
        dismissed: true,
        dismissedAt: new Date().toISOString(),
      },
    });
  };

  const restoreSetupBannerAction = () => {
    const current = selectCurrentBusinessConfigFromState(globalState);
    return updateBusinessConfigAction({
      setupState: {
        ...current.setupState,
        dismissed: false,
      },
    });
  };

  const addMembershipPlanAction = (
    input: Omit<MembershipPlan, 'id' | 'tenantId' | 'facilityId'>
  ) => {
    if (!ensureExecutiveGuard()) return null;
    const before = captureStoreSlices(['plansByBranch']);
    const biz = selectCurrentBusinessFromState(globalState);
    const branchId = globalState.currentBranchId;
    const plan: MembershipPlan = {
      ...input,
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId: globalState.account.id,
      facilityId: branchId,
      accountId: globalState.account.id,
      businessId: biz.id,
      branchId,
    };
    const existing = globalState.plansByBranch[branchId] || [];
    globalState = {
      ...globalState,
      plansByBranch: {
        ...globalState.plansByBranch,
        [branchId]: [plan, ...existing],
      },
    };
    notify();
    if (isSupabaseConfigured()) {
      memberService
        .upsertPlan(plan, {
          accountId: globalState.account.id,
          businessId: biz.id,
          branchId,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['plansByBranch']);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'create',
      summary: ul(
        `Added plan: ${plan.name}`,
        `Formule ajoutée : ${plan.name}`,
        `إضافة باقة اشتراك: ${plan.name}`
      ),
      entityLabel: plan.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService.deletePlan(plan.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('gym_plans', plan.id, globalState.currentUser?.id)
            .then(() =>
              memberService.upsertPlan(plan, {
                accountId: globalState.account.id,
                businessId: biz.id,
                branchId,
              })
            )
            .catch(() => {});
        }
      },
    });
    return plan;
  };

  const updateMembershipPlanAction = (id: string, updates: Partial<MembershipPlan>) => {
    if (!ensureExecutiveGuard()) return null;
    const biz = selectCurrentBusinessFromState(globalState);
    const branchId = globalState.currentBranchId;
    const existing = globalState.plansByBranch[branchId] || [];
    const prevPlan = existing.find((p) => p.id === id);
    if (!prevPlan) return null;
    const before = captureStoreSlices(['plansByBranch']);
    let updatedTarget: MembershipPlan | null = null;
    const nextList = existing.map((p) => {
      if (p.id !== id) return p;
      updatedTarget = { ...p, ...updates };
      return updatedTarget;
    });
    globalState = {
      ...globalState,
      plansByBranch: {
        ...globalState.plansByBranch,
        [branchId]: nextList,
      },
    };
    notify();
    if (updatedTarget && isSupabaseConfigured()) {
      memberService
        .upsertPlan(updatedTarget, {
          accountId: globalState.account.id,
          businessId: biz.id,
          branchId,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['plansByBranch']);
    const opType: UndoOperationType =
      updates.isActive !== undefined && updates.isActive !== prevPlan.isActive ? 'status' : 'edit';
    registerUndoEntry({
      vertical: 'settings',
      operationType: opType,
      summary: ul(
        `Updated plan: ${prevPlan.name}`,
        `Formule mise à jour : ${prevPlan.name}`,
        `تعديل الباقة: ${prevPlan.name}`
      ),
      entityLabel: prevPlan.name,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          memberService
            .upsertPlan(prevPlan, {
              accountId: globalState.account.id,
              businessId: biz.id,
              branchId,
            })
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (updatedTarget && isSupabaseConfigured()) {
          memberService
            .upsertPlan(updatedTarget, {
              accountId: globalState.account.id,
              businessId: biz.id,
              branchId,
            })
            .catch(() => {});
        }
      },
    });
    return updatedTarget;
  };

  const toggleMembershipPlanActiveAction = (id: string) => {
    const existing = globalState.plansByBranch[globalState.currentBranchId] || [];
    const target = existing.find((p) => p.id === id);
    if (!target) return null;
    return updateMembershipPlanAction(id, { isActive: !target.isActive });
  };

  const deleteMembershipPlanAction = (
    id: string
  ): { success: boolean; blockedByReferences?: boolean; referenceCount?: number } => {
    if (!ensureExecutiveGuard()) return { success: false };
    const branchId = globalState.currentBranchId;
    const refMembers = (globalState.members || []).filter((m) => m.membershipPlanId === id).length;
    const refLeads = (globalState.leads || []).filter((l) => l.preferredPlanId === id).length;
    const totalRefs = refMembers + refLeads;
    if (totalRefs > 0) {
      return { success: false, blockedByReferences: true, referenceCount: totalRefs };
    }
    const existing = globalState.plansByBranch[branchId] || [];
    const prevPlan = existing.find((p) => p.id === id);
    if (!prevPlan) return { success: false };
    const before = captureStoreSlices(['plansByBranch']);
    globalState = {
      ...globalState,
      plansByBranch: {
        ...globalState.plansByBranch,
        [branchId]: existing.filter((p) => p.id !== id),
      },
    };
    notify();
    if (isSupabaseConfigured()) {
      memberService.deletePlan(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['plansByBranch']);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'delete',
      summary: ul(
        `Deleted plan: ${prevPlan.name}`,
        `Formule supprimée : ${prevPlan.name}`,
        `حذف الباقة: ${prevPlan.name}`
      ),
      entityLabel: prevPlan.name,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('gym_plans', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          memberService.deletePlan(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
    return { success: true };
  };

  const addCategoryFormuleAction = (
    input: Omit<CategoryFormule, 'id' | 'accountId' | 'businessId' | 'branchId' | 'category'>
  ) => {
    if (!ensureExecutiveGuard()) return null;
    const before = captureStoreSlices(['categoryFormules']);
    const biz = selectCurrentBusinessFromState(globalState);
    const frm: CategoryFormule = {
      ...input,
      id: `frm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: globalState.account.id,
      businessId: biz.id,
      branchId: globalState.currentBranchId,
      category: biz.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      categoryFormules: [frm, ...(globalState.categoryFormules || [])],
    };
    notify();
    if (isSupabaseConfigured()) {
      configService
        .upsertCategoryFormule(frm, {
          accountId: frm.accountId || globalState.account.id,
          businessId: frm.businessId || biz.id,
          branchId: frm.branchId || globalState.currentBranchId,
          staffId: globalState.currentUser?.id,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['categoryFormules']);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'create',
      summary: ul(
        `Added formule: ${frm.name}`,
        `Formule métier ajoutée : ${frm.name}`,
        `إضافة صيغة عمل: ${frm.name}`
      ),
      entityLabel: frm.name,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          configService.deleteCategoryFormule(frm.id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('category_formules', frm.id, globalState.currentUser?.id)
            .then(() =>
              configService.upsertCategoryFormule(frm, {
                accountId: frm.accountId || globalState.account.id,
                businessId: frm.businessId || biz.id,
                branchId: frm.branchId || globalState.currentBranchId,
                staffId: globalState.currentUser?.id,
              })
            )
            .catch(() => {});
        }
      },
    });
    return frm;
  };

  const updateCategoryFormuleAction = (id: string, updates: Partial<CategoryFormule>) => {
    if (!ensureExecutiveGuard()) return null;
    const existing = (globalState.categoryFormules || []).find((f) => f.id === id);
    if (!existing) return null;
    const before = captureStoreSlices(['categoryFormules']);
    const updatedTarget: CategoryFormule = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const nextList = (globalState.categoryFormules || []).map((f) =>
      f.id === id ? updatedTarget : f
    );
    globalState = {
      ...globalState,
      categoryFormules: nextList,
    };
    notify();
    if (isSupabaseConfigured()) {
      configService
        .upsertCategoryFormule(updatedTarget, {
          accountId: updatedTarget.accountId || globalState.account.id,
          businessId:
            updatedTarget.businessId || selectCurrentBusinessFromState(globalState).id,
          branchId: updatedTarget.branchId || globalState.currentBranchId,
          staffId: globalState.currentUser?.id,
        })
        .catch(() => {});
    }
    const after = captureStoreSlices(['categoryFormules']);
    const opType: UndoOperationType =
      updates.isActive !== undefined && updates.isActive !== existing.isActive ? 'status' : 'edit';
    registerUndoEntry({
      vertical: 'settings',
      operationType: opType,
      summary: ul(
        `Updated formule: ${existing.name}`,
        `Formule mise à jour : ${existing.name}`,
        `تعديل الصيغة: ${existing.name}`
      ),
      entityLabel: existing.name,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          configService
            .upsertCategoryFormule(existing, {
              accountId: existing.accountId || globalState.account.id,
              businessId:
                existing.businessId || selectCurrentBusinessFromState(globalState).id,
              branchId: existing.branchId || globalState.currentBranchId,
              staffId: globalState.currentUser?.id,
            })
            .catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          configService
            .upsertCategoryFormule(updatedTarget, {
              accountId: updatedTarget.accountId || globalState.account.id,
              businessId:
                updatedTarget.businessId || selectCurrentBusinessFromState(globalState).id,
              branchId: updatedTarget.branchId || globalState.currentBranchId,
              staffId: globalState.currentUser?.id,
            })
            .catch(() => {});
        }
      },
    });
    return updatedTarget;
  };

  const toggleCategoryFormuleActiveAction = (id: string) => {
    const target = (globalState.categoryFormules || []).find((f) => f.id === id);
    if (!target) return null;
    return updateCategoryFormuleAction(id, { isActive: !target.isActive });
  };

  const duplicateCategoryFormuleAction = (id: string) => {
    const target = (globalState.categoryFormules || []).find((f) => f.id === id);
    if (!target) return null;
    const lang = globalState.language || 'fr';
    const copySuffix = lang === 'ar' ? ' (نسخة)' : lang === 'fr' ? ' (Copie)' : ' (Copy)';
    return addCategoryFormuleAction({
      formuleType: target.formuleType,
      code: target.code ? `${target.code}-COPY` : undefined,
      name: `${target.name}${copySuffix}`,
      description: target.description,
      priceAmount: target.priceAmount,
      ratePercent: target.ratePercent,
      durationValue: target.durationValue,
      durationUnit: target.durationUnit,
      currency: target.currency,
      taxRate: target.taxRate,
      metadata: target.metadata ? { ...target.metadata } : {},
      isActive: target.isActive,
      sortOrder: (target.sortOrder || 0) + 1,
    });
  };

  const deleteCategoryFormuleAction = (
    id: string
  ): { success: boolean; blockedByReferences?: boolean; referenceCount?: number } => {
    if (!ensureExecutiveGuard()) return { success: false };
    const target = (globalState.categoryFormules || []).find((f) => f.id === id);
    if (!target) return { success: false };

    let refs = 0;
    if (target.metadata?.referencedCount && Number(target.metadata.referencedCount) > 0) {
      refs += Number(target.metadata.referencedCount);
    }
    if ((globalState.freelanceProjects || []).some((p) => (p as any).formuleId === id)) refs += 1;
    if ((globalState.commercialDocs || []).some((d) => (d as any).formuleId === id)) refs += 1;
    if ((globalState.sales || []).some((s) => s.items?.some((it) => it.productId === id))) refs += 1;

    if (refs > 0) {
      return { success: false, blockedByReferences: true, referenceCount: refs };
    }

    const before = captureStoreSlices(['categoryFormules']);
    globalState = {
      ...globalState,
      categoryFormules: (globalState.categoryFormules || []).filter((f) => f.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      configService.deleteCategoryFormule(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['categoryFormules']);
    registerUndoEntry({
      vertical: 'settings',
      operationType: 'delete',
      summary: ul(
        `Deleted formule: ${target.name}`,
        `Formule supprimée : ${target.name}`,
        `حذف الصيغة: ${target.name}`
      ),
      entityLabel: target.name,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('category_formules', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          configService.deleteCategoryFormule(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
    return { success: true };
  };

  // ============================================================
  // Phase 2 Shared Horizontal Modules (6.1 & 6.2): Unified Invoicing & Payments
  // ============================================================

  const resolveUnifiedContext = (sourceVertical?: string) => {
    const accountId = requireTenantAccountId(globalState.account?.id);
    const business =
      (globalState.businesses || []).find((b) => b.id === globalState.currentBusinessId) ||
      globalState.businesses?.[0];
    const branch =
      (globalState.branches || []).find((br) => br.id === globalState.currentBranchId) ||
      globalState.branches?.[0];
    const cfg = globalState.businessConfigs?.[business?.id || globalState.currentBusinessId];
    return {
      accountId,
      businessId: business?.id || globalState.currentBusinessId,
      branchId: branch?.id || globalState.currentBranchId,
      sourceVertical: sourceVertical || business?.category || 'trading_commercial',
      header: buildUnifiedFiscalHeader(business, branch, cfg),
    };
  };

  const createUnifiedDocument = (input: {
    docType: UnifiedDocType;
    sourceVertical?: string;
    partyId?: string;
    partyName: string;
    partyNif?: string;
    partyNis?: string;
    partyRc?: string;
    partyAi?: string;
    partyAddress?: string;
    partyPhone?: string;
    depotId?: string;
    depotName?: string;
    docDate?: string;
    dueDate?: string;
    validityDays?: number;
    paymentMethod?: UnifiedPaymentMethod | string;
    paymentTerms?: string;
    currency?: UnifiedCurrency;
    fxRate?: number;
    timbreBasis?: TimbreCalculationBasis;
    isCashFiscalStampEnabled?: boolean;
    generalDiscountPercent?: number;
    guaranteeRetentionPercent?: number;
    includeStampSignature?: boolean;
    notesTop?: string;
    notesBottom?: string;
    linkedDocId?: string;
    linkedDocNumber?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    items: UnifiedLineInput[];
    issueImmediately?: boolean;
  }): UnifiedDocument => {
    const ctx = resolveUnifiedContext(input.sourceVertical);
    const closedPeriods =
      globalState.businessConfigs?.[ctx.businessId]?.accountingPeriodClosedMonths || [];
    const docDate = input.docDate || new Date().toISOString().slice(0, 10);
    if (isDateInClosedPeriod(docDate, closedPeriods)) {
      throw new Error('PERIOD_CLOSED_LOCKED');
    }

    const before = captureStoreSlices(['unifiedDocuments']);
    const id = generateClientUuid();
    const nowIso = new Date().toISOString();
    const calc = calculateUnifiedDocumentTotals({
      items: input.items,
      generalDiscountPercent: input.generalDiscountPercent,
      guaranteeRetentionPercent: input.guaranteeRetentionPercent,
      paymentMethod: input.paymentMethod,
      timbreBasis: input.timbreBasis,
      isCashFiscalStampEnabled: input.isCashFiscalStampEnabled,
      currency: input.currency || 'DZD',
      fxRate: input.fxRate ?? 1,
      statutoryRate: globalState.effectiveStatutoryRate,
    });

    const newDoc: UnifiedDocument = {
      id,
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      sourceVertical: ctx.sourceVertical,
      docType: input.docType,
      draftNumber: formatDraftDocNumber(input.docType, id),
      docNumber: null,
      fiscalYear: Number(docDate.slice(0, 4)) || new Date().getFullYear(),
      status: 'Draft',
      partyId: input.partyId,
      partyName: input.partyName || 'Client',
      partyNif: input.partyNif,
      partyNis: input.partyNis,
      partyRc: input.partyRc,
      partyAi: input.partyAi,
      partyAddress: input.partyAddress,
      partyPhone: input.partyPhone,
      depotId: input.depotId,
      depotName: input.depotName,
      docDate,
      dueDate: input.dueDate,
      validityDays: input.validityDays,
      paymentMethod: input.paymentMethod || 'bank_transfer',
      paymentTerms: input.paymentTerms || 'Comptant',
      currency: input.currency || 'DZD',
      fxRate: input.fxRate ?? 1,
      fxRateDate: docDate,
      timbreBasis:
        input.timbreBasis ||
        (input.isCashFiscalStampEnabled ? 'commercial_cash' : 'exempt'),
      rateSetId: globalState.effectiveStatutoryRate?.id ?? null,
      items: calc.items,
      tvaBreakdown: calc.tvaBreakdown,
      totalHtRawCentimes: calc.totalHtRawCentimes,
      generalDiscountPercent: input.generalDiscountPercent || 0,
      totalHtFinalCentimes: calc.totalHtFinalCentimes,
      totalTvaCentimes: calc.totalTvaCentimes,
      timbreFiscalCentimes: calc.timbreFiscalCentimes,
      totalTtcCentimes: calc.totalTtcCentimes,
      guaranteeRetentionPercent: input.guaranteeRetentionPercent || 0,
      guaranteeRetentionCentimes: calc.guaranteeRetentionCentimes,
      netToPayCentimes: calc.netToPayCentimes,
      paidCentimes: 0,
      balanceDueCentimes: calc.netToPayCentimes,
      fiscalHeaderSnapshot: ctx.header,
      totalsInWordsFr: calc.totalsInWordsFr,
      totalsInWordsAr: calc.totalsInWordsAr,
      includeStampSignature: input.includeStampSignature ?? true,
      notesTop: input.notesTop,
      notesBottom: input.notesBottom,
      linkedDocId: input.linkedDocId,
      linkedDocNumber: input.linkedDocNumber,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      printedCount: 0,
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    globalState = {
      ...globalState,
      unifiedDocuments: [newDoc, ...(globalState.unifiedDocuments || [])],
    };
    notify();

    if (isSupabaseConfigured()) {
      invoicingService.upsertUnifiedDocument(newDoc, globalState.currentUser?.id).catch(() => {});
    }

    const after = captureStoreSlices(['unifiedDocuments']);
    registerUndoEntry({
      vertical: ctx.sourceVertical,
      operationType: 'create',
      summary: ul(
        `Created draft ${newDoc.draftNumber} (${newDoc.partyName})`,
        `Brouillon créé : ${newDoc.draftNumber} (${newDoc.partyName})`,
        `تم إنشاء مسودة: ${newDoc.draftNumber}`
      ),
      entityLabel: newDoc.draftNumber,
      toastType: 'success',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          invoicingService.deleteUnifiedDraft(id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          syncCoordinator
            .restoreRow('unified_documents', id, globalState.currentUser?.id)
            .then(() => invoicingService.upsertUnifiedDocument(newDoc, globalState.currentUser?.id))
            .catch(() => {});
        }
      },
    });

    if (input.issueImmediately) {
      return issueUnifiedDocument(newDoc.id) || newDoc;
    }
    return newDoc;
  };

  const updateUnifiedDraft = (
    id: string,
    patch: Partial<{
      partyId: string;
      partyName: string;
      partyNif: string;
      partyNis: string;
      partyRc: string;
      partyAi: string;
      partyAddress: string;
      partyPhone: string;
      depotId: string;
      depotName: string;
      docDate: string;
      dueDate: string;
      validityDays: number;
      paymentMethod: UnifiedPaymentMethod | string;
      paymentTerms: string;
      currency: UnifiedCurrency;
      fxRate: number;
      timbreBasis: TimbreCalculationBasis;
      isCashFiscalStampEnabled: boolean;
      generalDiscountPercent: number;
      guaranteeRetentionPercent: number;
      includeStampSignature: boolean;
      notesTop: string;
      notesBottom: string;
      items: UnifiedLineInput[];
    }>
  ): UnifiedDocument | null => {
    const prev = (globalState.unifiedDocuments || []).find((d) => d.id === id);
    if (!prev) return null;
    if (prev.status !== 'Draft') {
      showToast({
        type: 'error',
        title: ul('Document Locked', 'Document Verrouillé', 'المستند مقفل'),
        message: ul(
          'Issued documents are immutable. Create a credit note (avoir) instead.',
          'Les pièces émises sont immuables. Veuillez créer une facture d’avoir.',
          'المستندات الصادرة غير قابلة للتعديل. يرجى إصدار إشعار دائن.'
        ),
      });
      return null;
    }

    const before = captureStoreSlices(['unifiedDocuments']);
    const nextCurrency = patch.currency || prev.currency;
    const nextFxRate = patch.fxRate ?? prev.fxRate;
    const nextPaymentMethod = patch.paymentMethod ?? prev.paymentMethod;
    const nextTimbreBasis = patch.timbreBasis ?? prev.timbreBasis;
    const nextGenDiscount = patch.generalDiscountPercent ?? prev.generalDiscountPercent;
    const nextRetention = patch.guaranteeRetentionPercent ?? prev.guaranteeRetentionPercent;
    const nextItemsInput: UnifiedLineInput[] =
      patch.items ||
      prev.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        description: i.description,
        isService: i.isService,
        quantity: i.quantity,
        unit: i.unit,
        unitPriceHt: i.unitPriceHt,
        tvaPercent: i.tvaPercent,
        discountPercent: i.discountPercent,
      }));

    const calc = calculateUnifiedDocumentTotals({
      items: nextItemsInput,
      generalDiscountPercent: nextGenDiscount,
      guaranteeRetentionPercent: nextRetention,
      paymentMethod: nextPaymentMethod,
      timbreBasis: nextTimbreBasis,
      isCashFiscalStampEnabled: patch.isCashFiscalStampEnabled ?? nextTimbreBasis !== 'exempt',
      currency: nextCurrency,
      fxRate: nextFxRate,
      statutoryRate: globalState.effectiveStatutoryRate,
    });

    const nextDoc: UnifiedDocument = {
      ...prev,
      ...patch,
      currency: nextCurrency,
      fxRate: nextFxRate,
      paymentMethod: nextPaymentMethod,
      timbreBasis: nextTimbreBasis,
      generalDiscountPercent: nextGenDiscount,
      guaranteeRetentionPercent: nextRetention,
      items: calc.items,
      tvaBreakdown: calc.tvaBreakdown,
      totalHtRawCentimes: calc.totalHtRawCentimes,
      totalHtFinalCentimes: calc.totalHtFinalCentimes,
      totalTvaCentimes: calc.totalTvaCentimes,
      timbreFiscalCentimes: calc.timbreFiscalCentimes,
      totalTtcCentimes: calc.totalTtcCentimes,
      guaranteeRetentionCentimes: calc.guaranteeRetentionCentimes,
      netToPayCentimes: calc.netToPayCentimes,
      balanceDueCentimes: Math.max(0, calc.netToPayCentimes - prev.paidCentimes),
      totalsInWordsFr: calc.totalsInWordsFr,
      totalsInWordsAr: calc.totalsInWordsAr,
      updatedAt: new Date().toISOString(),
    };

    globalState = {
      ...globalState,
      unifiedDocuments: (globalState.unifiedDocuments || []).map((d) => (d.id === id ? nextDoc : d)),
    };
    notify();

    if (isSupabaseConfigured()) {
      invoicingService.upsertUnifiedDocument(nextDoc, globalState.currentUser?.id).catch(() => {});
    }

    const after = captureStoreSlices(['unifiedDocuments']);
    registerUndoEntry({
      vertical: prev.sourceVertical,
      operationType: 'edit',
      summary: ul(
        `Updated draft ${prev.draftNumber}`,
        `Brouillon modifié : ${prev.draftNumber}`,
        `تعديل المسودة: ${prev.draftNumber}`
      ),
      entityLabel: prev.draftNumber,
      toastType: 'info',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          invoicingService.upsertUnifiedDocument(prev, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          invoicingService.upsertUnifiedDocument(nextDoc, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
    return nextDoc;
  };

  const deleteUnifiedDraft = (id: string): boolean => {
    const target = (globalState.unifiedDocuments || []).find((d) => d.id === id);
    if (!target) return false;
    if (target.status !== 'Draft') {
      showToast({
        type: 'error',
        title: ul('Cannot Delete Issued Document', 'Suppression Bloquée', 'لا يمكن حذف مستند صادر'),
        message: ul(
          'Issued documents cannot be deleted. Issue a credit note (avoir) or void.',
          'Une pièce émise ne peut être supprimée ; émettez un avoir.',
          'لا يمكن حذف المستندات الصادرة؛ قم بإصدار إشعار دائن.'
        ),
      });
      return false;
    }
    const before = captureStoreSlices(['unifiedDocuments']);
    globalState = {
      ...globalState,
      unifiedDocuments: (globalState.unifiedDocuments || []).filter((d) => d.id !== id),
    };
    notify();
    if (isSupabaseConfigured()) {
      invoicingService.deleteUnifiedDraft(id, globalState.currentUser?.id).catch(() => {});
    }
    const after = captureStoreSlices(['unifiedDocuments']);
    registerUndoEntry({
      vertical: target.sourceVertical,
      operationType: 'delete',
      summary: ul(
        `Deleted draft ${target.draftNumber}`,
        `Brouillon supprimé : ${target.draftNumber}`,
        `حذف المسودة: ${target.draftNumber}`
      ),
      entityLabel: target.draftNumber,
      toastType: 'warning',
      undo: () => {
        restoreStoreSlices(before);
        if (isSupabaseConfigured()) {
          syncCoordinator.restoreRow('unified_documents', id, globalState.currentUser?.id).catch(() => {});
        }
      },
      redo: () => {
        restoreStoreSlices(after);
        if (isSupabaseConfigured()) {
          invoicingService.deleteUnifiedDraft(id, globalState.currentUser?.id).catch(() => {});
        }
      },
    });
    return true;
  };

  const issueUnifiedDocument = (id: string): UnifiedDocument | null => {
    const doc = (globalState.unifiedDocuments || []).find((d) => d.id === id);
    if (!doc) return null;
    if (doc.status !== 'Draft') return doc;

    const existingSeq = (globalState.unifiedDocuments || []).filter(
      (d) =>
        d.businessId === doc.businessId &&
        d.docType === doc.docType &&
        d.fiscalYear === doc.fiscalYear &&
        d.docNumber
    ).length;
    const provisionalNumber = formatServerFiscalNumber(doc.docType, doc.fiscalYear, existingSeq + 1);
    const nextStatus: UnifiedDocStatus = doc.docType === 'bl' ? 'Delivered' : 'Issued';
    const nowIso = new Date().toISOString();

    const issuedDoc: UnifiedDocument = {
      ...doc,
      docNumber: provisionalNumber,
      status: nextStatus,
      issuedAt: nowIso,
      issuedByStaffId: globalState.currentUser?.id,
      updatedAt: nowIso,
    };

    globalState = {
      ...globalState,
      unifiedDocuments: (globalState.unifiedDocuments || []).map((d) => (d.id === id ? issuedDoc : d)),
    };
    notify();

    if (isSupabaseConfigured()) {
      invoicingService
        .upsertUnifiedDocument(doc, globalState.currentUser?.id)
        .then(() => invoicingService.issueUnifiedDocument(doc.id, doc.fiscalYear))
        .then((res) => {
          if (res.docNumber) {
            globalState = {
              ...globalState,
              unifiedDocuments: (globalState.unifiedDocuments || []).map((d) =>
                d.id === id
                  ? {
                      ...d,
                      docNumber: res.docNumber || d.docNumber,
                      status: res.status || d.status,
                    }
                  : d
              ),
            };
            notify();
          }
        })
        .catch(() => {});
    }

    showToast({
      type: 'success',
      title: ul('Document Issued', 'Document Émis', 'تم إصدار المستند'),
      message: ul(
        `Fiscal number assigned: ${issuedDoc.docNumber}`,
        `Numéro officiel attribué : ${issuedDoc.docNumber}`,
        `تم تعيين الرقم الرسمي: ${issuedDoc.docNumber}`
      ),
    });
    return issuedDoc;
  };

  const createCreditNoteForDocument = (
    invoiceId: string,
    reason: string,
    partialItems?: Array<{ lineId: string; quantity: number }>,
    issueImmediately = false
  ): UnifiedDocument | null => {
    const source = (globalState.unifiedDocuments || []).find((d) => d.id === invoiceId);
    if (!source) return null;
    try {
      const creditDraft = buildCreditNoteDraftFromInvoice(source, reason, partialItems);
      creditDraft.id = generateClientUuid();
      creditDraft.draftNumber = formatDraftDocNumber('avoir', creditDraft.id);
      globalState = {
        ...globalState,
        unifiedDocuments: [creditDraft, ...(globalState.unifiedDocuments || [])],
      };
      notify();
      if (isSupabaseConfigured()) {
        invoicingService.upsertUnifiedDocument(creditDraft, globalState.currentUser?.id).catch(() => {});
      }
      if (issueImmediately) {
        return issueUnifiedDocument(creditDraft.id) || creditDraft;
      }
      return creditDraft;
    } catch (err: any) {
      showToast({
        type: 'error',
        title: ul('Credit Note Error', 'Erreur Avoir', 'خطأ في الإشعار الدائن'),
        message: err?.message || 'Cannot create credit note.',
      });
      return null;
    }
  };

  const voidUnifiedDocument = (id: string, reason: string): boolean => {
    const doc = (globalState.unifiedDocuments || []).find((d) => d.id === id);
    if (!doc || doc.status === 'Voided') return false;
    const nowIso = new Date().toISOString();
    const voided: UnifiedDocument = {
      ...doc,
      status: 'Voided',
      voidedAt: nowIso,
      voidedReason: reason.trim() || 'Annulé',
      updatedAt: nowIso,
    };
    globalState = {
      ...globalState,
      unifiedDocuments: (globalState.unifiedDocuments || []).map((d) => (d.id === id ? voided : d)),
    };
    notify();
    if (isSupabaseConfigured()) {
      invoicingService.upsertUnifiedDocument(voided, globalState.currentUser?.id).catch(() => {});
    }
    return true;
  };

  const incrementUnifiedPrintCount = (id: string) => {
    const target = (globalState.unifiedDocuments || []).find((d) => d.id === id);
    if (!target) return;
    const updated: UnifiedDocument = {
      ...target,
      printedCount: (target.printedCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    globalState = {
      ...globalState,
      unifiedDocuments: (globalState.unifiedDocuments || []).map((d) => (d.id === id ? updated : d)),
    };
    notify();
    if (isSupabaseConfigured()) {
      invoicingService.upsertUnifiedDocument(updated, globalState.currentUser?.id).catch(() => {});
    }
  };

  const recordUnifiedPayment = (input: {
    sourceVertical?: string;
    partyId?: string;
    partyName: string;
    method: UnifiedPaymentMethod | string;
    direction?: 'inflow' | 'outflow';
    amountDzd: number;
    currency?: UnifiedCurrency;
    fxRate?: number;
    paymentDate?: string;
    allocations?: Array<{ documentId: string; requestedDzd?: number }>;
    instrumentNumber?: string;
    instrumentBank?: string;
    instrumentDueDate?: string;
    notes?: string;
    idempotencyKey?: string;
  }): UnifiedPayment | null => {
    const amountCentimes = dzdToCentimes(Math.max(0, Number(input.amountDzd || 0)));
    if (amountCentimes <= 0) return null;

    const ctx = resolveUnifiedContext(input.sourceVertical);
    const paymentDate = input.paymentDate || new Date().toISOString().slice(0, 10);
    const closedPeriods =
      globalState.businessConfigs?.[ctx.businessId]?.accountingPeriodClosedMonths || [];
    if (isDateInClosedPeriod(paymentDate, closedPeriods)) {
      throw new Error('PERIOD_CLOSED_LOCKED');
    }

    const method = normalizeUnifiedPaymentMethod(input.method);
    const isInstrument = method === 'cheque' || method === 'traite';
    const existingCount = (globalState.unifiedPayments || []).filter(
      (p) => p.businessId === ctx.businessId
    ).length;
    const year = Number(paymentDate.slice(0, 4)) || new Date().getFullYear();
    const paymentNumber = `REG-${year}-${String(existingCount + 1).padStart(5, '0')}`;
    const paymentId = generateClientUuid();
    const idempotencyKey = input.idempotencyKey || `${paymentId}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const targets = (input.allocations || [])
      .map((a) => {
        const doc = (globalState.unifiedDocuments || []).find((d) => d.id === a.documentId);
        if (!doc || doc.balanceDueCentimes <= 0) return null;
        return {
          documentId: doc.id,
          documentNumber: doc.docNumber || doc.draftNumber,
          openBalanceCentimes: doc.balanceDueCentimes,
          requestedCentimes: a.requestedDzd != null ? dzdToCentimes(a.requestedDzd) : undefined,
        };
      })
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    const plan =
      targets.length > 0
        ? allocatePaymentAcrossDocuments(amountCentimes, targets)
        : { allocations: [], totalAllocatedCentimes: 0, unallocatedCreditCentimes: amountCentimes };

    const openCashSession =
      method === 'cash'
        ? (globalState.posCashSessions || []).find(
            (s) => s.branchId === ctx.branchId && s.status === 'open'
          )
        : undefined;

    const paymentRecord: UnifiedPayment = {
      id: paymentId,
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      sourceVertical: ctx.sourceVertical,
      partyId: input.partyId,
      partyName: input.partyName || 'Client',
      paymentNumber,
      method,
      direction: input.direction || 'inflow',
      amountCentimes,
      unallocatedCreditCentimes: plan.unallocatedCreditCentimes,
      currency: input.currency || 'DZD',
      fxRate: input.fxRate ?? 1,
      paymentDate,
      recordedByStaffId: globalState.currentUser?.id,
      cashSessionId: openCashSession?.id,
      idempotencyKey,
      status: isInstrument ? 'pending_clearance' : 'posted',
      instrumentStatus: isInstrument ? 'received' : undefined,
      instrumentNumber: input.instrumentNumber,
      instrumentBank: input.instrumentBank,
      instrumentDueDate: input.instrumentDueDate,
      notes: input.notes,
      allocations: plan.allocations.map((a) => ({
        id: generateClientUuid(),
        paymentId,
        documentId: a.documentId,
        documentNumber: a.documentNumber,
        allocatedCentimes: a.allocatedCentimes,
        createdAt: nowIso,
      })),
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const allocByDoc = new Map(plan.allocations.map((a) => [a.documentId, a.allocatedCentimes]));
    const updatedUnifiedDocs = (globalState.unifiedDocuments || []).map((doc) => {
      const alloc = allocByDoc.get(doc.id);
      if (!alloc) return doc;
      const nextPaid = Math.min(doc.netToPayCentimes, doc.paidCentimes + alloc);
      const nextBalance = Math.max(0, doc.netToPayCentimes - nextPaid);
      const nextStatus: UnifiedDocStatus =
        nextBalance === 0 ? 'Paid' : nextPaid > 0 ? 'PartiallyPaid' : doc.status;
      return {
        ...doc,
        paidCentimes: nextPaid,
        balanceDueCentimes: nextBalance,
        status: nextStatus,
        updatedAt: nowIso,
      };
    });

    const settledAmountDzd = centimesToDzd(amountCentimes);
    const updatedMembers = input.partyId
      ? (globalState.members || []).map((m) =>
          m.id === input.partyId
            ? {
                ...m,
                balanceDue: Math.max(0, Number(m.balanceDue ?? m.balance ?? 0) - settledAmountDzd),
                balance: Math.max(0, Number(m.balanceDue ?? m.balance ?? 0) - settledAmountDzd),
              }
            : m
        )
      : globalState.members;

    const updatedB2bClients = input.partyId
      ? (globalState.b2bClients || []).map((c) =>
          c.id === input.partyId
            ? {
                ...c,
                outstandingBalance: Math.max(0, Number(c.outstandingBalance || 0) - settledAmountDzd),
              }
            : c
        )
      : globalState.b2bClients;

    globalState = {
      ...globalState,
      unifiedDocuments: updatedUnifiedDocs,
      unifiedPayments: [paymentRecord, ...(globalState.unifiedPayments || [])],
      members: updatedMembers,
      b2bClients: updatedB2bClients,
    };
    notify();

    if (isSupabaseConfigured()) {
      invoicingService
        .recordPaymentWithAllocations(paymentRecord)
        .then((res) => {
          if (res.paymentNumber) {
            globalState = {
              ...globalState,
              unifiedPayments: (globalState.unifiedPayments || []).map((p) =>
                p.id === paymentId ? { ...p, paymentNumber: res.paymentNumber! } : p
              ),
            };
            notify();
          }
        })
        .catch(() => {});
    }

    showToast({
      type: isInstrument ? 'info' : 'success',
      title: ul('Payment Recorded', 'Règlement Enregistré', 'تم تسجيل الدفع'),
      message: ul(
        `${paymentRecord.paymentNumber} · ${paymentRecord.partyName}`,
        `${paymentRecord.paymentNumber} · ${paymentRecord.partyName}`,
        `${paymentRecord.paymentNumber} · ${paymentRecord.partyName}`
      ),
    });
    return paymentRecord;
  };

  const transitionChequeStatus = (
    paymentId: string,
    nextStatus: ChequeInstrumentStatus,
    reason?: string
  ): boolean => {
    const pay = (globalState.unifiedPayments || []).find((p) => p.id === paymentId);
    if (!pay) return false;
    try {
      const { updatedPayment, updatedDocuments, reopenedCount } = applyChequeStatusTransition(
        pay,
        globalState.unifiedDocuments || [],
        nextStatus,
        reason
      );

      let nextB2bClients = globalState.b2bClients;
      let nextMembers = globalState.members;
      if (nextStatus === 'bounced' && pay.partyId) {
        const restoreDzd = centimesToDzd(pay.amountCentimes);
        nextB2bClients = (globalState.b2bClients || []).map((c) =>
          c.id === pay.partyId
            ? { ...c, outstandingBalance: Number(c.outstandingBalance || 0) + restoreDzd }
            : c
        );
        nextMembers = (globalState.members || []).map((m) =>
          m.id === pay.partyId
            ? {
                ...m,
                balanceDue: Number(m.balanceDue ?? m.balance ?? 0) + restoreDzd,
                balance: Number(m.balanceDue ?? m.balance ?? 0) + restoreDzd,
              }
            : m
        );
      }

      globalState = {
        ...globalState,
        unifiedPayments: (globalState.unifiedPayments || []).map((p) =>
          p.id === paymentId ? updatedPayment : p
        ),
        unifiedDocuments: updatedDocuments,
        b2bClients: nextB2bClients,
        members: nextMembers,
      };
      notify();

      if (
        isSupabaseConfigured() &&
        (nextStatus === 'deposited' || nextStatus === 'cleared' || nextStatus === 'bounced')
      ) {
        invoicingService.transitionChequeTraiteStatus(paymentId, nextStatus, reason).catch(() => {});
      }

      showToast({
        type: nextStatus === 'bounced' ? 'warning' : 'success',
        title:
          nextStatus === 'bounced'
            ? ul('Instrument Bounced', 'Effet Impayé', 'شيك / كمبيالة مرفوضة')
            : nextStatus === 'cleared'
              ? ul('Instrument Cleared', 'Effet Encaissé', 'تم تحصيل الصك')
              : ul('Instrument Deposited', 'Remis en Banque', 'أودع في البنك'),
        message:
          nextStatus === 'bounced' && reopenedCount > 0
            ? ul(
                `${reopenedCount} invoice balance(s) reopened.`,
                `${reopenedCount} solde(s) de facture réouvert(s).`,
                `تمت إعادة فتح رصيد ${reopenedCount} فاتورة.`
              )
            : updatedPayment.paymentNumber,
      });
      return true;
    } catch (err: any) {
      showToast({
        type: 'error',
        title: ul('Transition Blocked', 'Transition Bloquée', 'تعذر تحديث الحالة'),
        message: err?.message || 'Invalid status transition.',
      });
      return false;
    }
  };

  return {
    setScreen,
    setTheme,
    setDensity,
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
    processSale,
    refundSale,
    adjustStock,
    updateProduct,
    deleteProduct,
    deleteSale,
    batchDeleteSales,
    upsertScheduleEvent,
    deleteScheduleEvent,
    batchDeleteScheduleEvents,
    openShopForMember,
    clearPendingShopMember,
    enrollMemberInClass,
    confirmScheduleCoach,
    duplicateScheduleWeek,
    createStaffMember,
    updateStaffMember,
    freezeStaffMember,
    vacationStaffMember,
    terminateStaffMember,
    deleteStaffMember,
    punchStaffAttendance,
    createStaffSalaryAdvance,
    waiveStaffSalaryAdvance,
    generateStaffPayrollRun,
    approveStaffPayrollRun,
    markStaffPayrollSlipPaid,
    logStaffAttendanceManual,
    executePayrollMigrationBackfill: executePayrollMigrationBackfillAction,
    parkOrder,
    resumeParkedOrder,
    deleteParkedOrder,
    updateReceiptConfig,
    seedDemoInventory,
    batchDeleteProducts,
    batchRestockProducts,
    resetPosMockData,
    createAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    deleteAppointment,
    addServiceItem,
    checkoutAppointment,
    batchDeleteAppointments,
    batchUpdateAppointmentStatus,
    updateServiceItem,
    deleteServiceItem,
    batchDeleteServiceItems,
    updateStylistPayoutStatus,
    resetSalonMockData,
    addStaff,
    addBusiness,
    addBranch,
    registerDevice,
    revokeDevice,
    redeemVoucher,
    addProduct,
    resolveSubRolesForUser,
    login,
    loginWithPin,
    switchStaffUser,
    logout,
    openOnboarding,
    closeOnboarding,
    openFastSwitch,
    closeFastSwitch,
    openDesktopUpgradeModal,
    closeDesktopUpgradeModal,
    completeOnboarding,
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
    issueDepositReceiptPrint,
    resetVenueMockData,
    resetEduMockData,
    resetFreelanceMockData,
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
    setActivePmRole,
    setActiveGarageRole,
    setActiveRealEstateRole,
    setActiveManufacturingRole,
    setActiveLegalRole,
    setActiveLogisticsRole,
    setActivePmSubScreen,
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
    resetAllData,
    resetToDefaultDemoData,
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
    exportDatabase,
    importDatabase,
    validateBackupSnapshot,
    resolveConcurrencyConflict: resolveConcurrencyConflictAction,
    dismissConcurrencyConflict: dismissConcurrencyConflictAction,
    setNetworkMode,
    retryCloudSync,
    syncWithSupabase,
    setActiveContractorRole,
    setActiveAgriRole,
    setActiveMembershipRole,
    setActiveAppointmentRole,
    setActivePosRole,
    setActiveEducationRole,
    addMemberCheckIn,
    addWalkInTicket,
    updateSalonChairStation,
    recordQuickAttendance,
    unlockEduSessionAttendance,
    openPosCashSession,
    addPosCashMovement,
    deletePosCashMovement,
    closePosCashSessionAndIssueZReport,
    reprintPosZReport,
    finalizeProvisionalPosZReports,
    toggleTopBarCollapsed,
    toggleTopBarAutoHide,
    setTopBarAutoHide,
    setTopBarCollapsed,
    toggleListPodExpanded,
    setListPodExpanded,
    openSettingsTab: openSettingsTabAction,
    setSettingsTab: setSettingsTabAction,
    clearSettingsFocusSection: clearSettingsFocusSectionAction,
    updateBusinessIdentity: updateBusinessIdentityAction,
    updateBusinessConfig: updateBusinessConfigAction,
    dismissSetupBanner: dismissSetupBannerAction,
    restoreSetupBanner: restoreSetupBannerAction,
    addMembershipPlan: addMembershipPlanAction,
    updateMembershipPlan: updateMembershipPlanAction,
    toggleMembershipPlanActive: toggleMembershipPlanActiveAction,
    deleteMembershipPlan: deleteMembershipPlanAction,
    addCategoryFormule: addCategoryFormuleAction,
    updateCategoryFormule: updateCategoryFormuleAction,
    toggleCategoryFormuleActive: toggleCategoryFormuleActiveAction,
    duplicateCategoryFormule: duplicateCategoryFormuleAction,
    deleteCategoryFormule: deleteCategoryFormuleAction,
    canAccessStaffScreen: canAccessStaffScreenFn,
    canViewSensitivePayroll: canViewSensitivePayrollFn,
    createUnifiedDocument,
    updateUnifiedDraft,
    deleteUnifiedDraft,
    issueUnifiedDocument,
    createCreditNoteForDocument,
    voidUnifiedDocument,
    incrementUnifiedPrintCount,
    recordUnifiedPayment,
    transitionChequeStatus,
  };
}

export const atriumActions = createAtriumActions();
export type AtriumActions = typeof atriumActions;
export function getAtriumActions(): AtriumActions {
  return atriumActions;
}
export function useAtriumActions(): AtriumActions {
  return atriumActions;
}

export function useAtriumStore() {
  const [state, setState] = useState<AppState>(globalState);

  useEffect(() => {
    const listener = () => setState(globalState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const syncWithSupabase = syncWithSupabaseAction;

  // Helpers (cached per state reference via module selectors)
  const currentBusiness = selectCurrentBusinessFromState(state);
  const currentBranch = selectCurrentBranchFromState(state);
  const terminology = selectTerminologyFromState(state);

  // Quotas
  const plan = state.subscription?.plan || INITIAL_PLANS[0];
  const businessQuota = checkQuota((state.businesses || []).length, plan?.maxBusinesses || 1);
  const branchQuota = checkQuota((state.branches || []).length, plan?.maxBranches || 1);
  const deviceQuota = checkQuota((state.devices || []).length, plan?.maxDevices || 1);
  const staffQuota = checkQuota((state.staff || []).length, plan?.maxStaff || 1);

  // Scoped lists (cached at module level per slice + branchId so consumers stay render-stable)
  const currentMembers = selectCurrentMembersFromState(state);
  const currentLeads = selectCurrentLeadsFromState(state);
  const currentProducts = selectCurrentProductsFromState(state);
  const currentStaff = selectCurrentStaffFromState(state);
  const currentSales = selectCurrentSalesFromState(state);
  const currentSchedule = selectCurrentScheduleFromState(state);
  const currentClassEnrollments = selectCurrentClassEnrollmentsFromState(state);
  const currentPlans = selectCurrentPlansFromState(state);
  const currentAppointments = selectCurrentAppointmentsFromState(state);
  const currentServices = selectCurrentServicesFromState(state);
  const currentParkedOrders = selectCurrentParkedOrdersFromState(state);
  const currentStockMovements = selectCurrentStockMovementsFromState(state);
  const currentFreelanceClients = selectCurrentFreelanceClientsFromState(state);
  const currentFreelanceProjects = selectCurrentFreelanceProjectsFromState(state);
  const currentTimeLogs = selectCurrentTimeLogsFromState(state);
  const currentFreelanceInvoices = selectCurrentFreelanceInvoicesFromState(state);
  const currentFreelanceProposals = selectCurrentFreelanceProposalsFromState(state);
  const currentFreelanceExpenses = selectCurrentFreelanceExpensesFromState(state);
  const currentRentableUnits = selectCurrentRentableUnitsFromState(state);
  const currentRentalBookings = selectCurrentRentalBookingsFromState(state);
  const currentRentalRenters = selectCurrentRentalRentersFromState(state);
  const currentSecurityDeposits = selectCurrentSecurityDepositsFromState(state);
  const currentEduCourses = selectCurrentEduCoursesFromState(state);
  const currentEduClassrooms = selectCurrentEduClassroomsFromState(state);
  const currentEduCohorts = selectCurrentEduCohortsFromState(state);
  const currentEduStudents = selectCurrentEduStudentsFromState(state);
  const currentEduEnrollments = selectCurrentEduEnrollmentsFromState(state);
  const currentEduSessions = selectCurrentEduSessionsFromState(state);
  const currentEduAttendance = selectCurrentEduAttendanceFromState(state);
  const currentEduGrades = selectCurrentEduGradesFromState(state);
  const currentEduCertificates = selectCurrentEduCertificatesFromState(state);
  const currentEduAdmissions = selectCurrentEduAdmissionsFromState(state);
  const currentPmProjects = selectCurrentPmProjectsFromState(state);
  const currentPmMilestones = selectCurrentPmMilestonesFromState(state);
  const currentPmPrintOrders = selectCurrentPmPrintOrdersFromState(state);
  const currentPmBatDeliverables = selectCurrentPmBatDeliverablesFromState(state);
  const currentPmTalents = selectCurrentPmTalentsFromState(state);
  const currentPmMissions = selectCurrentPmMissionsFromState(state);
  const currentPmAttendances = selectCurrentPmAttendancesFromState(state);
  const currentPmExpenses = selectCurrentPmExpensesFromState(state);
  const currentPmPayrollBatches = selectCurrentPmPayrollBatchesFromState(state);
  const currentPmCcpSlips = selectCurrentPmCcpSlipsFromState(state);
  const currentPmEquipmentStock = selectCurrentPmEquipmentStockFromState(state);
  const currentDevices = selectCurrentDevicesFromState(state);
  const currentB2bClients = selectCurrentB2bClientsFromState(state);
  const currentWarehouses = selectCurrentWarehousesFromState(state);
  const currentCommercialDocs = selectCurrentCommercialDocsFromState(state);
  const currentPurchaseDocs = selectCurrentPurchaseDocsFromState(state);
  const currentStockVouchers = selectCurrentStockVouchersFromState(state);
  const currentUnifiedDocuments = selectCurrentUnifiedDocumentsFromState(state);
  const currentUnifiedPayments = selectCurrentUnifiedPaymentsFromState(state);
  const currentMemberCheckIns = selectCurrentMemberCheckInsFromState(state);
  const unreadNotificationCount = selectUnreadNotificationCountFromState(state);
  const selectedMember = selectSelectedMemberFromState(state);
  const currentBusinessConfig = selectCurrentBusinessConfigFromState(state);
  const currentCategoryFormules = selectCurrentFormulesFromState(state);
  const homeSetupProgress = selectHomeSetupProgressFromState(state);

  return {
    ...atriumActions,
    account: state.account,
    subscription: state.subscription,
    businesses: state.businesses,
    branches: state.branches,
    currentBusinessId: state.currentBusinessId,
    currentBranchId: state.currentBranchId,
    currentBusiness,
    currentBranch,
    businessConfigs: state.businessConfigs || {},
    currentBusinessConfig,
    categoryFormules: state.categoryFormules || [],
    currentCategoryFormules,
    homeSetupProgress,
    settingsTab: state.settingsTab || 'preferences',
    settingsFocusSection: state.settingsFocusSection || null,
    activeScreen: state.activeScreen,
    theme: state.theme,
    density: state.density || 'default',
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
    isSupabaseConfigured: isSupabaseConfigured(),
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
    isTopBarCollapsed: state.isTopBarCollapsed || false,
    isTopBarAutoHide: state.isTopBarAutoHide ?? false,
    isListPodExpanded: state.isListPodExpanded || false,
    // Lists
    members: currentMembers,
    leads: currentLeads,
    products: currentProducts,
    staff: currentStaff,
    sales: currentSales,
    schedule: currentSchedule,
    classEnrollments: currentClassEnrollments,
    pendingShopMemberId: state.pendingShopMemberId || null,
    plans: currentPlans,
    appointments: currentAppointments,
    servicesCatalog: currentServices,
    devices: currentDevices,
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
    salonWorkstations: state.salonWorkstations || INITIAL_SALON_WORKSTATIONS,
    stylistPayouts: state.stylistPayouts || INITIAL_STYLIST_PAYOUTS,
    // Project & Milestone State
    activePmRole: state.activePmRole || 'direction',
    activePmSubScreen: state.activePmSubScreen || 'dashboard',
    pmClients: state.pmClients || [],
    pmProjects: currentPmProjects,
    pmMilestones: currentPmMilestones,
    pmCollateralCatalog: state.pmCollateralCatalog || [],
    pmPrintOrders: currentPmPrintOrders,
    pmBatDeliverables: currentPmBatDeliverables,
    pmTalents: currentPmTalents,
    pmMissions: currentPmMissions,
    pmAttendances: currentPmAttendances,
    pmExpenses: currentPmExpenses,
    pmPayrollBatches: currentPmPayrollBatches,
    pmCcpSlips: currentPmCcpSlips,
    pmEquipmentStock: currentPmEquipmentStock,
    // B2B Trading & Commercial Collections
    b2bClients: currentB2bClients,
    allB2bClients: state.b2bClients || [],
    b2bSuppliers: state.b2bSuppliers || [],
    warehouses: currentWarehouses,
    allWarehouses: state.warehouses || [],
    commercialDocs: currentCommercialDocs,
    allCommercialDocs: state.commercialDocs || [],
    purchaseDocs: currentPurchaseDocs,
    allPurchaseDocs: state.purchaseDocs || [],
    stockVouchers: currentStockVouchers,
    allStockVouchers: state.stockVouchers || [],
    unifiedDocuments: currentUnifiedDocuments,
    allUnifiedDocuments: state.unifiedDocuments || [],
    unifiedPayments: currentUnifiedPayments,
    allUnifiedPayments: state.unifiedPayments || [],
    // Operational Role State
    activeGarageRole: state.activeGarageRole || 'gerant',
    activeRealEstateRole: state.activeRealEstateRole || 'direction',
    activeManufacturingRole: state.activeManufacturingRole || 'gerant',
    activeLegalRole: state.activeLegalRole || 'avocat_associe',
    activeLogisticsRole: state.activeLogisticsRole || 'gerant',
    activeContractorRole: state.activeContractorRole || 'gerant',
    activeAgriRole: state.activeAgriRole || 'gerant',
    activeMembershipRole: state.activeMembershipRole || 'owner',
    activeAppointmentRole: state.activeAppointmentRole || 'owner',
    activePosRole: state.activePosRole || 'owner',
    activeEducationRole: state.activeEducationRole || 'owner',
    memberCheckIns: currentMemberCheckIns,
    walkInTickets: selectCurrentWalkInTicketsFromState(state),
    salonChairStations: state.salonChairStations || [],
    eduQuickAttendance: state.eduQuickAttendance || [],
    posCashSessions: selectCurrentPosCashSessionsFromState(state),
    posCashMovements: selectCurrentPosCashMovementsFromState(state),
    posZReports: selectCurrentPosZReportsFromState(state),
    // Toast Notifications & Notification Center
    toasts: state.toasts || [],
    notifications: state.notifications || [],
    concurrencyConflicts: state.concurrencyConflicts || [],
    unreadNotificationCount,
    // Universal Workforce & Staff Management Collections
    staffAttendanceLogs: state.staffAttendanceLogs || [],
    staffSalaryAdvances: state.staffSalaryAdvances || [],
    staffPayrollRuns: state.staffPayrollRuns || [],
    staffPayrollSlips: state.staffPayrollSlips || [],
  };
}

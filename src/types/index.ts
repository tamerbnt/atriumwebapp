// Atrium ERP & CRM — Core Type Definitions

export type BusinessCategory =
  | 'membership_session'  // Gym & Fitness (FacilityType: 1)
  | 'appointment_service' // Salon & Beauty (FacilityType: 5)
  | 'pos_inventory'       // Restaurant & Retail (FacilityType: 6)
  | 'project_milestone'   // Projects & Agency (FacilityType: 13)
  | 'rental_booking'      // Rentals & Venue (FacilityType: 14)
  | 'education_cohort'    // Education & Training (FacilityType: 15)
  | 'freelance_solo';     // Freelancers & Solo Work (FacilityType: 16)

export type SupportedLanguage = 'en' | 'fr' | 'ar';
export type AppTheme = 'light' | 'dark';

export type MemberStatus =
  | 'Active'
  | 'Expired'
  | 'Frozen'
  | 'Suspended'
  | 'Pending'
  | 'Banned'
  | 'Lead'
  | 'Unknown';

export type Gender = 'Male' | 'Female' | 'Other';

export interface Money {
  amount: number;
  currency: string;
}

export interface Account {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Business {
  id: string;
  accountId: string;
  category: BusinessCategory;
  name: string;
  displayName: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  accountId: string;
  businessId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Device {
  id: string;
  accountId: string;
  branchId: string;
  hardwareId: string;
  label: string;
  isActive: boolean;
  lastSeenAt: string;
  registeredAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: 'Free Trial' | 'Starter' | 'Pro' | 'Enterprise';
  tierRank: 0 | 1 | 2 | 3;
  maxBusinesses: number;
  maxBranches: number;
  maxDevices: number;
  maxStaff: number;
  crossBranchReports: boolean;
  sharedMembers: boolean;
  isFreeTier: boolean;
  trialDays: number;
  priceLabel: string;
}

export interface AccountSubscription {
  id: string;
  accountId: string;
  planId: string;
  status: 'active' | 'trial' | 'expired' | 'grace';
  isLifetime: boolean;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  graceEndsAt?: string;
  activatedByVoucher?: string;
  plan: SubscriptionPlan;
}

export interface LicenseVoucher {
  id: string;
  code: string; // ATR-{TIER}-LIFE-{XXXX}-{XXXX}
  planTier: 1 | 2 | 3;
  planName: 'Starter' | 'Pro' | 'Enterprise';
  durationMonths: number; // 0 = perpetual lifetime
  isRedeemed: boolean;
  redeemedByAccountId?: string;
  redeemedAt?: string;
}

export interface Member {
  id: string;
  tenantId: string;
  facilityId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImageUrl?: string;
  cardId?: string; // RFID / Barcode
  status: MemberStatus;
  startDate: string;
  expirationDate: string;
  membershipPlanId?: string;
  membershipPlanName?: string;
  remainingSessions: number;
  dateOfBirth?: string;
  gender: Gender;
  source?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  segmentData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlan {
  id: string;
  tenantId: string;
  facilityId: string;
  name: string;
  description: string;
  durationDays: number;
  price: Money;
  isActive: boolean;
  sessionsPerWeek: number; // 0 = unlimited
  isWalkIn: boolean;
  isPersonalTraining: boolean;
  genderRule: 0 | 1 | 2; // 0=Both, 1=Male, 2=Female
}

export interface RegistrationLead {
  id: string;
  tenantId: string;
  facilityId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  source: string;
  status: 'Pending' | 'Approved' | 'Declined';
  notes?: string;
  preferredPlanId?: string;
  preferredPlanName?: string;
  preferredStartDate?: string;
  interestPayload?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type StaffRole =
  | 'Owner'
  | 'Manager'
  | 'Cashier'
  | 'Technician'
  | 'Stylist'
  | 'Waiter'
  | 'Staff'
  | 'AgencyDirector'
  | 'ProjectManager'
  | 'Creative';

export interface StaffMember {
  id: string;
  tenantId: string;
  facilityId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: StaffRole;
  roleRank: number; // 8=Owner, 1=Manager, 2=Cashier, 3=Technician, 4=Waiter, 7=Staff, 20=AgencyDirector
  isActive: boolean;
  hireDate: string;
  salary: number;
  paymentDay: number; // 1-31
  pinCode?: string;
  cardId?: string;
  allowedModules: string[];
}

export interface Product {
  id: string;
  tenantId: string;
  facilityId: string;
  name: string;
  description: string;
  price: Money;
  cost: Money;
  stockQuantity: number;
  sku: string;
  category:
    | 'Supplement'
    | 'Equipment'
    | 'Beverage'
    | 'Clothing'
    | 'Service'
    | 'Food'
    | 'Hair Care'
    | 'Skin Care'
    | 'Beauty Products'
    | 'Nails & Spa'
    | 'Accessories'
    | 'Other'
    | (string & {});
  imageUrl?: string;
  reorderLevel: number;
  isActive: boolean;
  isPinned: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  facilityId: string;
  memberId?: string;
  memberName?: string;
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer';
  items: SaleItem[];
  discount?: number;
  notes?: string;
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  tenantId: string;
  facilityId: string;
  title: string;
  trainerOrStaff: string;
  roomOrArea: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  capacity: number;
  enrolledCount: number;
  category: string;
}

export interface CategoryTerminology {
  members: Record<SupportedLanguage, string>;
  memberSingle: Record<SupportedLanguage, string>;
  registration: Record<SupportedLanguage, string>;
  plan: Record<SupportedLanguage, string>;
  shop: Record<SupportedLanguage, string>;
  scheduler: Record<SupportedLanguage, string>;
  facility: Record<SupportedLanguage, string>;
}

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  roleRank: number;
  avatar?: string;
  branchId?: string;
  pinCode?: string;
}

export interface OnboardingParams {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  businessName: string;
  category: BusinessCategory;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  voucherCode?: string;
}

export type AppointmentStatus = 'Confirmed' | 'InChair' | 'Completed' | 'Cancelled' | 'NoShow';

export interface ServiceItem {
  id: string;
  facilityId: string;
  name: string;
  category: 'Hair' | 'Nails' | 'Facial' | 'Massage' | 'Bridal' | 'Barber';
  durationMinutes: number;
  price: number;
  colorCode: string;
  description?: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  facilityId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  price: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

// ==========================================
// Freelancer & Solo Practitioner (Category 16)
// ==========================================

export type CurrencyCode = 'DZD' | 'EUR' | 'USD';

export type FreelanceClientStatus =
  | 'ActiveRetainer'
  | 'ProjectBased'
  | 'Prospect'
  | 'Archived';

export interface FreelanceClient {
  id: string;
  tenantId: string;
  facilityId: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  country?: string;
  currency: CurrencyCode;
  hourlyRate: number;
  status: FreelanceClientStatus;
  avatarUrl?: string;
  monthlyRetainerHours?: number;
  monthlyRetainerAmount?: number;
  notes?: string;
  lifetimeBilled: number;
  createdAt: string;
}

export type PricingModel = 'Fixed' | 'Hourly' | 'Retainer';

export type DeliverableStage =
  | 'Briefing'
  | 'InProgress'
  | 'ClientReview'
  | 'Approved'
  | 'Billed';

export interface FreelanceDeliverable {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  stage: DeliverableStage;
  estimatedHours: number;
  loggedHours: number;
  dueDate: string;
  isCompleted: boolean;
}

export interface FreelanceProject {
  id: string;
  tenantId: string;
  facilityId: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  pricingModel: PricingModel;
  currency: CurrencyCode;
  budget: number;
  hourlyRate?: number;
  estimatedHours: number;
  loggedHours: number;
  stage: DeliverableStage;
  startDate: string;
  deadline: string;
  deliverables: FreelanceDeliverable[];
  createdAt: string;
}

export interface TimeLogEntry {
  id: string;
  tenantId: string;
  facilityId: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectTitle: string;
  deliverableId?: string;
  deliverableTitle?: string;
  taskDescription: string;
  durationSeconds: number; // in seconds
  isBillable: boolean;
  isInvoiced: boolean;
  rateAtMoment: number;
  currency: CurrencyCode;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export interface FreelanceInvoiceItem {
  id: string;
  description: string;
  quantity: number; // e.g. hours or 1 for fixed milestone
  unitRate: number;
  total: number;
}

export interface FreelanceInvoice {
  id: string;
  tenantId: string;
  facilityId: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  clientEmail: string;
  invoiceNumber: string; // e.g. INV-2026-001
  currency: CurrencyCode;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: FreelanceInvoiceItem[];
  subtotal: number;
  taxPercent: number; // e.g. 0% for international or 19%
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  paymentDetails?: {
    bankName: string;
    accountHolder: string;
    ribOrIban: string;
    swift?: string;
  };
  paidAt?: string;
  createdAt: string;
}

export type ProposalStatus = 'Pending' | 'Accepted' | 'Declined';

export interface FreelanceProposal {
  id: string;
  tenantId: string;
  facilityId: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  title: string;
  overview: string;
  scopeItems: string[];
  pricingModel: PricingModel;
  proposedBudget: number;
  currency: CurrencyCode;
  estimatedTimelineWeeks: number;
  validUntil: string;
  status: ProposalStatus;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Software'
  | 'Hardware'
  | 'Office'
  | 'Subcontractor'
  | 'Travel'
  | 'Other';

export interface FreelanceExpense {
  id: string;
  tenantId: string;
  facilityId: string;
  vendor: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: CurrencyCode;
  date: string;
  isTaxDeductible: boolean;
  receiptUrl?: string;
  createdAt: string;
}

export interface ActiveTimerState {
  isRunning: boolean;
  isPaused: boolean;
  clientId: string;
  clientName: string;
  projectId: string;
  projectTitle: string;
  deliverableId?: string;
  deliverableTitle?: string;
  taskDescription: string;
  elapsedSeconds: number;
  isBillable: boolean;
  isPomodoro: boolean;
  pomodoroRemainingSeconds: number; // 25 mins = 1500
  pomodoroMode: 'work' | 'break';
  startedAt: string | null;
}


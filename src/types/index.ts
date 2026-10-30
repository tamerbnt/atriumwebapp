// Atrium ERP & CRM — Core Type Definitions

export type BusinessCategory =
  | 'membership_session'       // Gym & Fitness (FacilityType: 1)
  | 'appointment_service'      // Salon & Beauty (FacilityType: 5)
  | 'pos_inventory'            // Restaurant & Retail (FacilityType: 6)
  | 'project_milestone'        // Projects & Agency (FacilityType: 13)
  | 'rental_booking'           // Universal Rentals (Hotels, Venues, Cars, Gear) (FacilityType: 14)
  | 'education_cohort'         // Education & Training (FacilityType: 15)
  | 'freelance_solo'           // Freelancers & Solo Work (FacilityType: 16)
  | 'trading_commercial'       // B2B Trading & Wholesale (FacilityType: 17)
  | 'medical_clinic'           // Universal Healthcare & Clinical Practice (FacilityType: 18)
  | 'auto_garage'              // Automotive Repair, Garages & Fleet (FacilityType: 19)
  | 'real_estate'              // Real Estate Brokerage & Property Leases (FacilityType: 20)
  | 'manufacturing_production' // Light Manufacturing & Workshop BOM (FacilityType: 21)
  | 'legal_accounting'         // Law Firms, Notaries & Accounting Cabinets (FacilityType: 22)
  | 'logistics_delivery'       // Couriers, Parcel Dispatch & COD Logistics (FacilityType: 23)
  | 'construction_contractor'  // BTP, General Contracting & Progress Billings (FacilityType: 24)
  | 'agriculture_farming';     // Agro-Business, Crop Parcels & Livestock (FacilityType: 25);

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
  name: 'Free Web' | 'Free Trial' | 'Starter' | 'Pro' | 'Enterprise';
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  lastVisitDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlan {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  name: string;
  description: string;
  price: Money;
  cost: Money;
  costPrice?: number;
  stockQuantity: number;
  sku: string;
  barcode?: string;
  unit?: 'pcs' | 'kg' | 'g' | 'l' | 'ml' | 'pack' | 'box' | string;
  taxRate?: number; // e.g. 0, 9, 19 (%)
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
    | 'Bakery'
    | 'Grocery'
    | 'General'
    | 'Other'
    | (string & {});
  imageUrl?: string;
  reorderLevel: number;
  isActive: boolean;
  isPinned: boolean;
  supplier?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice?: number;
  barcode?: string;
  unit?: string;
  discount?: number;
  notes?: string;
}

export interface PaymentDetail {
  method: 'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer' | 'Credit' | 'Mobile';
  amount: number;
  reference?: string;
}

export interface Sale {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  memberId?: string;
  memberName?: string;
  customerPhone?: string;
  totalAmount: number;
  subtotal?: number;
  discount?: number;
  discountAmount?: number;
  taxAmount?: number;
  paymentMethod: 'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer' | 'Split' | 'Credit';
  payments?: PaymentDetail[];
  amountTendered?: number;
  changeGiven?: number;
  cashierName?: string;
  items: SaleItem[];
  notes?: string;
  status?: 'Completed' | 'Refunded' | 'Voided';
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
}

export interface ParkedOrder {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  referenceName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  discount: number;
  notes?: string;
  createdAt: string;
  subtotal: number;
  totalAmount: number;
}

export interface StockMovement {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  productId: string;
  productName: string;
  type: 'Sale' | 'Restock' | 'Damage' | 'Return' | 'Adjustment' | 'Initial';
  quantity: number; // positive or negative change
  previousStock: number;
  newStock: number;
  reason?: string;
  createdAt: string;
  createdBy?: string;
}

export interface ReceiptConfig {
  headerTitle: string;
  subHeader?: string;
  address?: string;
  phone?: string;
  taxId?: string;
  footerMessage?: string;
  showTaxBreakdown: boolean;
  showCashier: boolean;
  showBarcode: boolean;
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

export type AppointmentStatus = 'Confirmed' | 'InChair' | 'Completed' | 'Cancelled' | 'NoShow' | 'Booked';

export interface ServiceItem {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId?: string;
  facilityId: string;
  name: string;
  category: 'Hair' | 'Nails' | 'Facial' | 'Massage' | 'Bridal' | 'Barber';
  durationMinutes: number;
  price: number;
  colorCode?: string;
  color?: string;
  description?: string;
  costPrice?: number;
  commissionRate?: number;
  bufferMinutes?: number;
  isActive?: boolean;
}

export interface Appointment {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
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
  chairId?: string;
  chairName?: string;
  colorFormula?: string;
  hairDiagnostic?: string;
  paymentMethod?: 'Cash' | 'Dahabia_CIB' | 'BaridiMob' | 'Card';
  isPaid?: boolean;
  stylistCommission?: number;
  retailProductsTotal?: number;
  tipAmount?: number;
}

export interface StylistPayout {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  totalServicesCount: number;
  totalServiceRevenue: number;
  commissionRate: number; // e.g. 40%
  commissionAmount: number;
  retailSalesCount: number;
  retailSalesRevenue: number;
  retailCommissionAmount: number;
  retailCommissionRate?: number;
  totalPayout: number;
  status: 'Pending' | 'Approved' | 'Paid';
  paidAt?: string;
  paymentMethod?: string;
}

export interface SalonWorkstation {
  id: string;
  name: string;
  type: 'StylingChair' | 'WashBasin' | 'SpaCabin' | 'NailStation';
  assignedStaffId?: string;
  assignedStaffName?: string;
  isAvailable: boolean;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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

// ==========================================
// Rentals & Venue Management Types
// ==========================================

export type RentableUnitType = 'Hall' | 'Room' | 'Court' | 'Studio' | 'Desk' | 'Equipment';
export type RentableUnitStatus = 'Available' | 'Occupied' | 'Maintenance';

export interface RentableUnit {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  name: string;
  code: string;
  type: RentableUnitType;
  capacity: number;
  surfaceAreaSqm?: number;
  hourlyRate: number;
  dailyRate: number;
  currency: 'DZD' | 'EUR' | 'USD' | string;
  amenities: string[];
  status: RentableUnitStatus;
  description: string;
  colorHex?: string;
  createdAt: string;
}

export type BookingStatus = 'Tentative' | 'Confirmed' | 'CheckedIn' | 'Completed' | 'Cancelled';
export type DepositStatus = 'Pending' | 'Held' | 'Refunded' | 'Retained';

export interface BookingAddon {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface RentalBooking {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterEmail?: string;
  renterCompany?: string;
  unitId: string;
  unitName: string;
  unitType: RentableUnitType;
  purpose: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  durationHours: number;
  attendeeCount: number;
  status: BookingStatus;
  baseAmount: number;
  addonsAmount: number;
  totalAmount: number;
  currency: 'DZD' | 'EUR' | 'USD' | string;
  depositAmount: number; // Caution / security deposit
  depositStatus: DepositStatus;
  paidAmount: number;
  balanceDue: number;
  addons: BookingAddon[];
  contractSigned: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalRenter {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  idDocNumber?: string;
  totalBookings: number;
  totalSpent: number;
  currency: 'DZD' | 'EUR' | 'USD' | string;
  notes?: string;
  createdAt: string;
}

export interface SecurityDepositRecord {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  bookingId: string;
  renterName: string;
  unitName: string;
  amount: number;
  currency: 'DZD' | 'EUR' | 'USD' | string;
  paymentMethod: 'Cash' | 'Card' | 'Check';
  status: 'Held' | 'Released' | 'Deducted';
  deductionReason?: string;
  collectedAt: string;
  releasedAt?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastSyncStatus = 'synced' | 'local' | 'error';

export interface ToastNotification {
  id: string;
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
  createdAt: number;
}

export type NotificationCategory = 'alert' | 'activity' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  category: NotificationCategory;
  read: boolean;
  createdAt: number;
  targetScreen?: string;
  action?: {
    label: string;
    onClick?: () => void;
    targetScreen?: string;
  };
}

// ==========================================
// Education, Academy & Training Types (Category 15)
// ==========================================

export interface EduCourse {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  title: string;
  code: string;
  category: 'Language' | 'Technology' | 'Academic' | 'Vocational' | 'Arts' | 'Driving' | 'Sports' | string;
  description: string;
  durationWeeks: number;
  totalHours: number;
  defaultPrice: number;
  currency: string;
  createdAt: string;
}

export interface EduClassroom {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  name: string;
  capacity: number;
  hasProjector: boolean;
  hasComputers: boolean;
  colorHex: string;
  createdAt: string;
}

export type CohortStatus = 'Upcoming' | 'Enrolling' | 'InProgress' | 'Completed' | 'Archived';

export interface EduCohort {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  classroomId?: string;
  classroomName?: string;
  name: string; // e.g. "IELTS Advanced - Batch 04"
  cohortCode?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  maxStudents: number;
  enrolledCount: number;
  tuitionFee: number;
  currency: string;
  scheduleSummary: string; // e.g. "Mon & Wed 18:00 - 20:00"
  status: CohortStatus;
  syllabusMilestones?: { title: string; completed: boolean }[];
  createdAt: string;
}

export type StudentStatus = 'Active' | 'Suspended' | 'Graduated' | 'Alumni' | 'Applicant';

export interface EduStudent {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  fullName: string;
  email?: string;
  phone: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: 'Father' | 'Mother' | 'Sponsor' | 'Self' | string;
  birthDate?: string;
  rfidBadgeCode?: string;
  schoolGrade?: string; // e.g. "Terminal (BAC)", "Adult Learner", "High School"
  status: StudentStatus;
  attendanceRatePercent?: number;
  notes?: string;
  createdAt: string;
}

export type EnrollmentPaymentStatus = 'Paid' | 'Partial' | 'Pending' | 'Overdue';

export interface EduEnrollment {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  studentId: string;
  studentName: string;
  cohortId: string;
  cohortName: string;
  enrolledAt: string;
  agreedTuition: number;
  discountAmount: number;
  discountReason?: string;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  paymentStatus: EnrollmentPaymentStatus;
  status: 'Active' | 'Dropped' | 'Completed';
  installments?: {
    dueDate: string;
    amount: number;
    isPaid: boolean;
    paidAt?: string;
  }[];
}

export interface EduSession {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  cohortId: string;
  cohortName: string;
  classroomId?: string;
  classroomName?: string;
  instructorId: string;
  instructorName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
  topic?: string;
  status: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface EduAttendance {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  sessionId: string;
  cohortId: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  minutesLate?: number;
  excuseNote?: string;
  recordedAt: string;
}

export interface EduGrade {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  cohortId: string;
  studentId: string;
  studentName: string;
  assessmentTitle: string; // e.g. "Midterm Exam", "Final Project"
  score: number;
  maxScore: number;
  weightPercent: number;
  teacherRemarks?: string;
  gradedAt: string;
}

export interface EduCertificate {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  certificateNumber: string;
  studentId: string;
  studentName: string;
  cohortId: string;
  courseTitle: string;
  issueDate: string;
  averageGradeScore?: number;
  honors?: string;
  signatoryName: string;
  signatoryTitle: string;
  verificationHash: string;
  createdAt: string;
}

export type AdmissionStage = 'Inquiry' | 'PlacementTest' | 'TrialClass' | 'Admitted' | 'Enrolled' | 'Declined';

export interface EduAdmissionLead {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  studentName: string;
  email?: string;
  phone: string;
  desiredCourseId: string;
  desiredCourseTitle: string;
  stage: AdmissionStage;
  guardianName?: string;
  placementScore?: string;
  source?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// Project & Milestone (ProjectMilestone) — NCH Market Activator Types
// ============================================================================

export type PMRole =
  | 'direction'    // General Management & Executive Leadership
  | 'chef_projet'  // Project Manager
  | 'crea'         // Creative & Graphic Design Studio
  | 'superviseur'  // Field Operations Supervisor
  | 'rh'           // HR & Talent Pool Management
  | 'compta';      // Accounting, Payroll & Stock

// ============================================================================
// Automotive Garage & Fleet Maintenance — Dedicated Role Types
// ============================================================================

export type GarageRole =
  | 'gerant'      // General Manager & Workshop Owner (Executive KPIs, Margins, Overrides)
  | 'reception'   // Service Advisor (Intake Walkaround, 360 Damage, WhatsApp Quotes, Gate Pass)
  | 'mecanicien'  // Workshop Technicians (Bay Kanban, Lift Timers, OBD DTC Codes, Requisitions)
  | 'magasinier'  // Spare Parts Depot (Parts Queue, Bin Locations, Low-Stock POs, Delivery BL)
  | 'caisse';     // Cashier & Fleet Billing (DGI Invoices 19%+Stamp, Bons, Fleet Statements, Z)

// ============================================================================
// Real Estate & Property Brokerage — Dedicated Operational Roles
// ============================================================================

export type RealEstateRole =
  | 'direction'            // Direction & Gérant (All agency screens, KPIs, Settings)
  | 'negociateur'          // Négociateur Commercial (Mandats 09-18, Biens & Titres, Bons de Visite GPS)
  | 'gestionnaire_locatif' // Gestionnaire Locatif (Tableau Baux, Biens Locatifs, Quittances Art. 317, États des Lieux)
  | 'notaire_compta';      // Notaire & Comptabilité Caisse (Notaire Décret 08-243, Quittances & Règlements Propriétaires)

// ============================================================================
// Light Manufacturing & Workshop Production — Dedicated Operational Roles
// ============================================================================

export type ManufacturingRole =
  | 'gerant'        // Direction & Gérant (Tableau de Bord Usine, Marges, Facturation DGI, Settings)
  | 'chef_atelier'  // Chef d'Atelier & Méthodes (Ordres de Fabrication OF, Nomenclatures BOM, Bons de Sortie)
  | 'operateur'     // Opérateur Machine Kiosk Tablette (Mes Tâches, Chrono Poste, Déclaration Pièces & Rebuts)
  | 'magasinier'    // Magasinier & Gestion des Stocks (Matières Premières, Bons de Réception BR, Bons de Sortie BSM Décret 05-468)
  | 'qualite';      // Contrôle Qualité & Métrologie (Fiches Contrôle Qualité, Lots Quarantaine, Rebuts, ONML)

// ============================================================================
// Legal Cabinet, Notary Study & Accounting Firm — Dedicated Operational Roles
// ============================================================================

export type LegalRole =
  | 'avocat_associe'     // Avocat Associé / Plaideur (Contentieux, Audiences, Délais CPCA, Conventions Honoraires)
  | 'notaire_titulaire'  // Notaire Titulaire de l'Étude (Répertoire des Actes, Séquestre, Cadastre, Décret 08-243)
  | 'expert_comptable'   // Expert-Comptable & Commissaire aux Comptes (Grand Livre SCF, Bilan/TCR, G50 DGI, Audit)
  | 'secretaire_caisse'; // Secrétaire Générale & Caisse (Accueil, Formalités, Caisse Art. 317, PV de clôture)





export interface PMClient {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  name: string;
  logoUrl?: string;
  contactPerson: string;
  email: string;
  phone: string;
  wilaya: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export type PMProjectStatus =
  | 'framing'      // En cadrage
  | 'crea_active'  // Créa en cours
  | 'print_ready'  // Prêt pour impression
  | 'field_active' // En exécution terrain
  | 'closed';      // Clôturé

export interface PMProject {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  clientId: string;
  clientName: string;
  title: string;
  scopeOfWork: string; // Cahier des charges
  budgetCapDzd: number;
  maxFieldExpensesDzd: number;
  targetGrossMarginPercent: number;
  startDate: string;
  endDate: string;
  kvDeadline: string;
  printDeadline: string;
  executionStartDate: string;
  projectManagerId: string;
  projectManagerName: string;
  leadCreativeId: string;
  leadCreativeName: string;
  status: PMProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PMMilestone {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  projectId: string;
  title: string;
  phase: 'brief' | 'concept_kv' | 'client_signoff' | 'print_order' | 'bat_production' | 'field_rollcall' | 'ccp_payroll';
  targetDate: string;
  completedAt?: string;
  isCompleted: boolean;
  assignedRole: PMRole;
}

export interface PMCollateralItem {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  sku: string;
  title: string;
  category: 'banner' | 'flyer' | 'pos_display' | 'apparel' | 'stand' | 'podium';
  dimensions: string;
  material: string;
  unitCostDzd: number;
  imageUrl?: string;
  isCustomizable: boolean;
}

export interface PMPrintOrder {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  projectId: string;
  projectTitle: string;
  orderNumber: string;
  items: Array<{
    collateralItemId: string;
    itemTitle: string;
    quantity: number;
    unitPriceDzd: number;
    finishOption?: string;
    notes?: string;
  }>;
  totalCostDzd: number;
  status: 'sent_to_crea' | 'bat_in_progress' | 'bat_approved' | 'in_print' | 'delivered';
  createdAt: string;
}

export interface PMBatDeliverable {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  projectId: string;
  projectTitle: string;
  printOrderId?: string;
  title: string;
  fileFormat: 'pdf' | 'ai' | 'psd' | 'tiff' | 'png' | 'mp4';
  colorSpace: 'CMJN' | 'RVB';
  resolutionDpi: number; // e.g. 300
  bleedMm: number; // e.g. 3
  hasBleedIncluded: boolean;
  version: number;
  versionCode: string; // e.g. "v1", "v2"
  previewUrl: string;
  masterSourceUrl?: string;
  fileSizeBytes: number;
  uploadedByCreativeId: string;
  uploadedByCreativeName: string;
  approvalStatus: 'pending_review' | 'approved' | 'revision_requested';
  revisionComments?: string;
  createdAt: string;
}

export interface PMTalent {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  fullName: string;
  gender: 'Male' | 'Female';
  birthDate: string;
  age: number;
  phone: string;
  email?: string;
  wilayaCode: string;
  wilayaName: string;
  commune: string;
  hasDriverLicense: boolean;
  isVehicleOwner: boolean;
  desiredRoles: string[]; // ['Animator', 'Hostess', 'Supervisor', 'MysteryShopper']
  languages: string[]; // ['Arabic', 'French', 'English', 'Berber']
  portraitPhotoUrl?: string;
  fullBodyPhotoUrl?: string;
  cvDocumentUrl?: string;
  cniDocumentUrl?: string;
  ccpNumber: string; // 10 digits
  ccpKey: string;    // 2 digits
  initialHrScore: number; // 1 - 5
  averageMissionRating: number; // 1 - 5
  consolidatedScore: number; // (Initial + Avg) / 2
  completedMissionsCount: number;
  absencesCount: number;
  isHrVerified: boolean;
  status: 'active' | 'in_review' | 'paused' | 'blacklisted';
  hrNotes?: string;
  createdAt: string;
}

export interface PMMission {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  code: string; // e.g. "MIS-104"
  title: string;
  activationType: 'GMS_InStore' | 'Roadshow' | 'Street_Marketing' | 'Sampling' | 'Mall_Expo' | 'Custom';
  venueName: string;
  address: string;
  wilayaCode: string;
  wilayaName: string;
  startDate: string;
  endDate: string;
  dailyStartHour: string; // "09:00"
  dailyEndHour: string;   // "18:00"
  supervisorId: string;
  supervisorName: string;
  requiredStaffCount: number;
  status: 'upcoming' | 'live_today' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface PMMissionStaff {
  id: string;
  missionId: string;
  talentId: string;
  talentName: string;
  talentPhoto?: string;
  phone: string;
  dayRateDzd: number;
  assignedRoleTitle: string;
  invitationStatus: 'confirmed' | 'standby' | 'declined';
}

export type AttendanceRollStatus = 'present' | 'late' | 'absent' | 'replacement';

export interface PMAttendance {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  missionId: string;
  talentId: string;
  talentName: string;
  talentPhoto?: string;
  date: string;
  checkInTime?: string;
  status: AttendanceRollStatus;
  minutesLate?: number;
  replacementForTalentId?: string;
  replacementTalentName?: string;
  shiftRating: number; // 1 to 5 stars
  dayRateDzd: number;
  grossPayableDzd: number;
  isLocked: boolean;
  lockedAt?: string;
  supervisorNotes?: string;
}

export interface PMExpense {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  projectId: string;
  projectTitle: string;
  missionId?: string;
  missionCode?: string;
  title: string;
  category: 'transport' | 'catering' | 'materials' | 'venue_rental' | 'emergency_supplies' | 'equipment';
  amountDzd: number;
  declaredByUserId: string;
  declaredByUserName: string;
  declaredByRole: PMRole;
  receiptPhotoUrl?: string;
  hasFiscalInvoice: boolean;
  fiscalNif?: string;
  status: 'pending_direction_approval' | 'approved_by_direction' | 'rejected' | 'audited_and_paid';
  directionApprovedAt?: string;
  directionNotes?: string;
  isEquipmentAutoCreated?: boolean;
  createdAt: string;
}

export interface PMPayrollBatch {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  projectId: string;
  projectTitle: string;
  missionId: string;
  missionCode: string;
  batchNumber: string;
  totalBeneficiaries: number;
  totalAmountDzd: number;
  status: 'pending_direction_approval' | 'approved_by_direction' | 'ccp_generated' | 'disbursed';
  directionApprovedAt?: string;
  directionApprovedBy?: string;
  ccpGeneratedAt?: string;
  disbursedAt?: string;
  createdAt: string;
}

export interface PMCcpSlip {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  batchId: string;
  talentId: string;
  beneficiaryName: string;
  ccpNumber: string;
  ccpKey: string;
  wilayaName: string;
  amountDzd: number;
  amountInWordsFr: string;
  amountInWordsAr: string;
  transactionReference: string;
  isPrinted: boolean;
  printedAt?: string;
  createdAt: string;
}

export interface PMEquipmentStock {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  assetCode: string; // e.g. "NCH-EQ-00214"
  title: string;
  category: 'rollup_base' | 'umbrella_stand' | 'counter_desk' | 'sound_system' | 'uniform' | 'display_stand';
  acquisitionCostDzd: number;
  currentStatus: 'in_stock' | 'deployed_on_mission' | 'in_maintenance' | 'decommissioned';
  currentCustodianId?: string;
  currentCustodianName?: string;
  assignedMissionId?: string;
  conditionReport: 'good' | 'minor_wear' | 'damaged';
  qrLabelCode: string;
  history?: Array<{
    date: string;
    stage: 'Acheté & codé' | 'Affecté' | 'Retour stock' | 'En stock';
    detail: string;
  }>;
  createdAt: string;
}

// ============================================================
// Category 8: B2B Commercial Trading & Wholesale Types
// ============================================================

export type CommercialDocType = 'devis' | 'commande' | 'bl' | 'facture' | 'avoir' | 'retour';
export type PurchaseDocType = 'po' | 'br' | 'facture_fournisseur' | 'avoir_fournisseur' | 'retour_fournisseur';
export type StockVoucherType = 'entree' | 'sortie' | 'transfert';

export interface B2bClient {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  companyName: string;
  sector?: string;
  email: string;
  phone: string;
  fax?: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  rc: string; // Registre de Commerce
  nif: string; // 15-digit tax ID
  nis: string; // Statistical ID
  ai: string; // Article d'Imposition (NART)
  ribCcp?: string;
  tags?: string[];
  // Primary Contact
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactRole?: string;
  // Financial terms
  creditLimit: number;
  outstandingBalance: number;
  paymentTermsDays: number;
  defaultPaymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface B2bSupplier {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  supplierName: string;
  sector?: string;
  email: string;
  phone: string;
  fax?: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  rc?: string;
  nif?: string;
  nis?: string;
  ai?: string;
  ribCcp?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentTermsDays: number;
  outstandingPayable: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseDepot {
  id: string;
  accountId?: string;
  businessId: string;
  branchId: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  code: string; // e.g. "DEP-01"
  name: string;
  address: string;
  city: string;
  managerName?: string;
  isMain: boolean;
  totalSkusCount: number;
  totalValuationDzd: number;
  createdAt: string;
}

export interface CommercialDocItem {
  id: string;
  productId?: string;
  description: string;
  isService: boolean;
  quantity: number;
  unit: string; // e.g. 'u', 'm', 'kg', 'm²', 'carton', 'forfait'
  unitPriceHt: number;
  tvaPercent: number; // 0, 9, 19
  discountPercent?: number;
  totalHt: number;
  totalTtc: number;
}

export interface CommercialDocument {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  type: CommercialDocType;
  docNumber: string; // e.g. "DEV-2026-0042", "BL-2026-0118", "FAC-2026-0095"
  clientId: string;
  clientName: string;
  clientNif?: string;
  clientRc?: string;
  clientAi?: string;
  depotId: string;
  depotName?: string;
  date: string;
  validityDays?: number;
  dueDate?: string;
  paymentMethod: string;
  paymentTerms: string;
  status: 'Draft' | 'Validated' | 'Delivered' | 'Paid' | 'Canceled';
  items: CommercialDocItem[];
  // Calculations
  totalHtRaw: number;
  generalDiscountPercent: number;
  totalHtFinal: number;
  totalTva: number;
  timbreFiscal: number;
  totalTtc: number;
  guaranteeRetentionPercent: number; // Retenue de garantie (e.g. 5% or 10%)
  guaranteeRetentionAmount: number;
  netToPay: number;
  currency: string; // 'DZD', 'EUR', 'USD'
  notesTop?: string;
  notesBottom?: string;
  includeStampSignature: boolean;
  linkedDocId?: string; // e.g. Devis that spawned this BL, or BL that spawned this Facture
  linkedDocNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDocItem {
  id: string;
  productId?: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitCostHt: number;
  tvaPercent: number;
  totalHt: number;
}

export interface PurchaseDocument {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  type: PurchaseDocType;
  docNumber: string; // e.g. "PO-2026-0031", "BR-2026-0028", "FF-2026-0019"
  supplierId: string;
  supplierName: string;
  depotId: string;
  depotName?: string;
  orderDate: string;
  deliveryExpectedDate?: string;
  actualDeliveryDate?: string;
  status: 'Draft' | 'Ordered' | 'PartiallyReceived' | 'Received' | 'Paid' | 'Canceled';
  items: PurchaseDocItem[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  currency: string;
  linkedPoId?: string;
  linkedPoNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementVoucher {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  voucherNumber: string; // e.g. "BE-2026-0081", "BS-2026-0044", "BT-2026-0012"
  type: StockVoucherType;
  date: string;
  depotSourceId: string;
  depotSourceName: string;
  depotTargetId?: string; // For transfers
  depotTargetName?: string;
  reason: 'reception_achat' | 'ajustement_inventaire' | 'sortie_client' | 'consommation_interne' | 'rebut_casse' | 'transfert';
  operatorName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCostDzd: number;
    unit: string;
  }>;
  totalValuationDzd: number;
  notes?: string;
  createdAt: string;
}

// ==========================================
// CATEGORY 9: MEDICAL & HEALTHCARE CLINIC
// ==========================================
export interface MedicalPractitioner {
  id: string;
  fullName: string;
  name?: string; // Alias for fullName
  specialty: string;
  department: string;
  licenseNumber: string; // Ordre des Médecins
  roomNumber: string; // Cabinet 1, 2, Salle de Soins
  cabinetRoom?: string; // Alias for roomNumber
  phone: string;
  email?: string;
  commissionRatePercent: number; // e.g. 70%
  commissionPercent?: number; // Alias
  color: string;
  isAvailable: boolean;
  avatarUrl?: string;
}

export interface DoctorOrdonnanceConfig {
  doctorId: string;
  doctorName: string;
  specialtyTitle: string;
  academicCredentials: string;
  licenseNumber: string;
  cabinetPhone: string;
  emergencyPhone: string;
  clinicAddress: string;
  paperFormat: 'A5' | 'A4';
  printMode: 'full_digital' | 'preprinted_paper';
  themeAccent: 'emerald' | 'navy' | 'burgundy' | 'obsidian' | 'terracotta';
  showWatermark: boolean;
  footerConsultationHours: string;
  footerLegalNotice: string;
  digitalStampText?: string;
  isStampEnabled: boolean;
  // Aliases for studio compatibility
  paperSize?: 'A5' | 'A4';
  usePreprintedStationery?: boolean;
  accentColor?: string;
  qualifications?: string;
  councilOrderNumber?: string;
  digitalStampUrl?: string;
}

export interface BiometricVitalsPoint {
  date: string;
  systolic: number;
  diastolic: number;
  pulseBpm: number;
  tempCelsius: number;
  weightKg: number;
  bloodSugarMgDl?: number;
  spO2Percent?: number;
  // Aliases for flexible charting
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  heightCm?: number;
  spO2?: number;
  temperatureCelsius?: number;
  recordedByDoctor?: string;
}

export interface MedicalPatient {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  fullName: string;
  nationalId?: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string[];
  chronicConditions?: string[];
  chifaCardNumber?: string;
  socialSecurityNumber?: string;
  hasChifa100PercentAld?: boolean; // 100% ALD exoneration
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  vitalsHistory?: BiometricVitalsPoint[];
  createdAt: string;
}

export interface MedicalConsultation {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string; // Attending Doctor ID
  doctorName?: string;
  doctorSpecialty?: string;
  cabinetRoom?: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  consultationDate: string;
  chiefComplaint: string;
  vitals?: {
    bloodPressure?: string;
    temperatureCelsius?: number;
    heartRateBpm?: number;
    weightKg?: number;
    heightCm?: number;
    bmi?: number;
    bloodSugarMgDl?: number;
    spO2Percent?: number;
  };
  clinicalExam?: string;
  diagnosis: string;
  icdCode?: string;
  treatmentPlan?: string;
  status: 'InWaitingQueue' | 'TriageNurse' | 'InConsultation' | 'Completed' | 'Cancelled';
  urgencyLevel?: 'Normal' | 'Prioritaire' | 'Urgence';
  ticketNumber?: string; // e.g. T-104
  ngapCode?: 'C' | 'CS' | 'K' | 'KE' | 'AMI';
  consultationFeeDzd: number;
  copayAmountDzd: number;
  insuranceShareDzd: number;
  isPaid: boolean;
  paymentMethod?: 'Cash' | 'BaridiMob' | 'Card' | 'ChifaDirect';
  notes?: string;
  createdAt: string;
}

export interface MedicalAppointmentSlot {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  date: string;
  startTime: string; // HH:mm
  durationMinutes: number; // 15, 30, 45
  reason: string;
  status: 'Booked' | 'Arrived' | 'InRoom' | 'Completed' | 'Cancelled' | 'NoShow';
  urgency?: 'Normal' | 'Prioritaire';
  isEmergencyBypass?: boolean;
  emergencyBypassReason?: string;
  notes?: string;
}

export interface MedicalPrescriptionItem {
  drugName: string;
  form?: string; // Comprimé, Sirop, Injectable, Pommade, Gélule
  dosage: string; // e.g. 1000mg
  frequency: string; // e.g. 1 sachet matin et soir au milieu des repas
  durationDays: number;
  instructions?: string;
}

export interface MedicalPrescription {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  prescribingDoctorId?: string;
  prescribingDoctorName?: string;
  consultationId?: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  prescriptionDate: string;
  items: MedicalPrescriptionItem[];
  qrCodeHash: string;
  isSigned?: boolean;
  doctorConfig?: Partial<DoctorOrdonnanceConfig>;
  notes?: string;
  createdAt?: string;
}

export interface MedicalLabParameter {
  name: string;
  value: string;
  unit: string;
  min: number;
  max: number;
  isAbnormal: boolean;
  status: 'normal' | 'high' | 'low';
}

export interface MedicalLabRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  orderingDoctor?: string; // alias
  panelName?: string; // alias for testCategory
  testCategory: 'Hématologie (NFS)' | 'Biochimie Sanguine' | 'Bilan Lipidique' | 'Inflammatoire & Cardiaque' | 'Imagerie & Échographie' | string;
  date?: string;
  testDate?: string; // alias
  status?: 'Demande' | 'En Analyse' | 'Validé' | string;
  parameters: MedicalLabParameter[];
  clinicalConclusion?: string;
  imagingReport?: string;
  imagingModality?: 'Échographie Doppler' | 'Radiographie Thoracique' | 'Scanner TDM' | 'Électrocardiogramme (ECG)' | string;
}

export interface MedicalCertificateRecord {
  id: string;
  certificateType: 'ArretDeTravail' | 'AptitudePhysique' | 'CertificatDescriptifITT' | 'LettreOrientation';
  patientId: string;
  patientName: string;
  patientDob?: string;
  patientAddress?: string;
  patientEmployer?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  issueDate: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  resumptionDate?: string; // Date de reprise
  ittDays?: number; // Incapacité Totale de Travail
  purpose?: string; // e.g. Licence sportive Football, Embauche
  clinicalFindings: string;
  qrHash: string;
  isSigned: boolean;
}

export interface ChifaClaimRecord {
  id: string;
  claimNumber?: string;
  bordereauNumber?: string;
  monthPeriod?: string;
  consultationId: string;
  patientId?: string;
  patientName: string;
  chifaNumber: string;
  socialSecurityNumber?: string;
  ngapCode: 'C' | 'CS' | 'K' | 'KE' | string;
  totalAmountDzd: number;
  chifaCoveragePercent?: number; // 80 or 100
  coverageRate?: number; // alias
  chifaShareDzd?: number;
  cnasShareDzd?: number; // alias
  copayPaidDzd?: number;
  ticketModerateurDzd?: number; // alias
  claimDate?: string;
  submissionDate?: string;
  isTransmitted?: boolean;
  status?: 'Pending' | 'Submitted' | 'Reimbursed' | 'Rejected' | string;
  batchNumber?: string;
}

export interface ClinicConsumableItem {
  id: string;
  itemCode?: string;
  name: string;
  category: 'Injection' | 'Pansement & Suture' | 'Hygiène & Protection' | 'Diagnostics Rapides';
  currentStock: number;
  currentStockUnits?: number;
  minStockAlert: number;
  reorderThresholdUnits?: number;
  unit: string;
  unitCostDzd: number;
}

export interface DailyCashClosure {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  date?: string;
  closureDate?: string;
  closedByStaffName?: string;
  closedBySecretary?: string;
  totalConsultationsCount?: number;
  openingCashFloatDzd?: number;
  openingFloatDzd?: number;
  expectedCashDzd?: number;
  countedCashDzd?: number;
  totalCashCollectedDzd?: number;
  totalCashReceivedDzd?: number;
  totalCashDisbursedDzd?: number;
  theoreticalCashDzd?: number;
  actualPhysicalCashCountedDzd?: number;
  actualCashInDrawerDzd?: number;
  totalBaridiMobDzd?: number;
  totalChifaVouchersDzd?: number;
  totalTimbreAccruedDzd?: number;
  discrepancyDzd: number;
  status?: 'balanced' | 'variance_flagged' | string;
  notes?: string;
  isClosed?: boolean;
  verifiedAt?: string;
}

// ==========================================
// CATEGORY 10: AUTO GARAGE & FLEET REPAIR
// ==========================================
export interface GarageVehicle {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  engineType: string;
  color?: string;
  ownerName: string;
  ownerPhone: string;
  currentOdometer: number;
  createdAt: string;
}

export interface GarageWorkOrder {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  orderNumber: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  clientName: string;
  clientPhone: string;
  intakeOdometer: number;
  fuelLevelFraction: string;
  intakeNotes: string;
  damagesMap?: Array<{ x: number; y: number; label: string; severity: 'scratch' | 'dent' | 'crack' }>;
  status: 'Intake' | 'Diagnosing' | 'DevisAwaitingApproval' | 'InRepair' | 'Testing' | 'Ready' | 'Delivered' | 'Cancelled';
  assignedTechnicianName?: string;
  partsTotalDzd: number;
  laborTotalDzd: number;
  totalAmountDzd: number;
  isPaid: boolean;
  startDate: string;
  completedDate?: string;
  createdAt: string;
}

export interface AutoPart {
  id: string;
  sku: string;
  name: string;
  category: 'Filtration' | 'Freinage' | 'Suspension' | 'Moteur' | 'Électrique' | 'Huiles & Fluides' | string;
  stockQuantity: number;
  minThreshold: number;
  buyingPriceDzd: number;
  sellingPriceDzd: number;
  locationBin: string;
  compatibility?: string[];
  compatibilities?: string[];
  supplier?: string;
  oemReference?: string;
}

// ==========================================
// CATEGORY 11: REAL ESTATE & PROPERTY LEASES
// ==========================================
export type PropertyLegalTitleType =
  | 'Acte_Individuel_Livret'
  | 'Bien_Dans_Indivision'
  | 'Cession_OPGI_EPLF'
  | 'Papier_Timbre_Coutume';

export interface RealEstateProperty {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  title: string;
  propertyType: 'Apartment' | 'Villa' | 'Commercial' | 'Office' | 'Land' | 'Warehouse';
  listingType: 'Rental' | 'Sale';
  surfaceM2: number;
  roomsCount: number;
  address: string;
  cityWilaya: string;
  priceDzd: number;
  ownerName: string;
  ownerPhone: string;
  ownerNationalId?: string;
  status: 'Available' | 'Rented' | 'Sold' | 'UnderMaintenance';
  amenities?: string[];
  
  // Cadastral Title Passport (Algerian Legal Standard)
  legalTitleType?: PropertyLegalTitleType;
  hasLivretFoncier?: boolean;
  livretFoncierNumber?: string;
  volumeNumber?: string;
  caseNumber?: string;
  cadastralSection?: string;
  cadastralIlot?: string;
  cadastralLot?: string;
  hasNegativeCertificate?: boolean;
  hasCertificatConformite?: boolean;
  isEligibleBankMortgage?: boolean;
  isIndivision?: boolean;
  fridhaNumber?: string;
  
  // Mandate Binding
  mandateId?: string;
  mandateNumber?: string;
  
  photoUrls?: string[];
  featuredPhotoUrl?: string;
  createdAt: string;
}

export type MandateType =
  | 'Vente_Exclusif'
  | 'Vente_Simple'
  | 'Location_Habitation'
  | 'Location_Commercial'
  | 'Gestion_Locative';

export type MandateStatus = 'Draft' | 'Active' | 'Expiring' | 'Expired' | 'Renewed' | 'Executed' | 'Revoked';

export interface RealEstateMandate {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  negotiatorName?: string;
  
  mandateNumber: string; // e.g. "MND-2026-HYD-000142" (Sequential Décret 09-18)
  mandateType: MandateType;
  status: MandateStatus;
  
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyType: string;
  listingType: 'Sale' | 'Rental';
  
  ownerFullName: string;
  ownerPhone: string;
  ownerNationalId: string;
  ownerIdIssueDate?: string;
  ownerIdIssueDaira?: string;
  
  askingPriceDzd: number;
  minimumAcceptablePriceDzd: number;
  commissionCalculationMode: 'DecreeTranches' | 'FlatPercent' | 'FixedAmount';
  commissionRatePercent?: number;
  commissionFixedAmountDzd?: number;
  commissionEstimatedHtDzd: number;
  commissionEstimatedTtcDzd: number;
  commissionPayer: 'Seller' | 'Buyer' | 'Split50_50';
  
  startDate: string;
  endDate: string;
  renewalCount: number;
  isExclusive: boolean;
  scannedDocumentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealEstateLease {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  leaseNumber?: string;
  propertyId: string;
  propertyTitle: string;
  tenantName: string;
  tenantPhone: string;
  tenantNationalId?: string;
  ownerName?: string;
  ownerPhone?: string;
  startDate: string;
  endDate: string;
  monthlyRentDzd: number;
  securityDepositDzd: number;
  agencyFeeDzd?: number;
  agencyCommissionDzd?: number;
  agencyManagementRatePercent?: number; // e.g. 7% for rental management
  paymentCycle?: 'Monthly' | 'Quarterly' | 'Yearly';
  paymentFrequency?: 'Monthly' | 'Quarterly' | 'Biannual' | 'Yearly' | 'Annual' | string;
  lastPaymentDate?: string;
  arrearsDzd?: number;
  status: 'Active' | 'Expired' | 'Terminated';
  createdAt?: string;
}

export interface RentalQuittanceRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  
  quittanceNumber: string; // e.g. "QTC-2026-00389"
  leaseId: string;
  propertyId?: string;
  propertyTitle: string;
  tenantName: string;
  ownerName: string;
  
  periodMonth: number;
  periodYear: number;
  
  rentAmountDzd: number;
  chargesDzd: number;
  paymentMethod: 'Cash' | 'Cheque' | 'Virement' | 'BaridiMob';
  
  timbreFiscalDzd: number; // Article 317 Code du Timbre
  totalCollectedDzd: number;
  
  agencyCommissionFeeDzd: number;
  agencyCommissionTvaDzd: number;
  netDisbursedToOwnerDzd: number;
  isDisbursedToOwner: boolean;
  disbursementDate?: string;
  
  paymentDate: string;
  cashierStaffName: string;
  notes?: string;
  createdAt: string;
}

export interface BonDeVisiteRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  negotiatorName: string;
  
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  
  clientFullName: string;
  clientPhone: string;
  clientNationalId: string;
  
  visitTimestamp: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
  
  signatureSvgData: string;
  signedOffline: boolean;
  
  clientImpression?: 'Interested' | 'NeedsNegotiation' | 'PriceTooHigh' | 'Unfavorable' | 'OfferSubmitted';
  clientFeedbackNotes?: string;
  counterOfferDzd?: number;
  
  whatsappConfirmationSent: boolean;
  createdAt: string;
}

export interface RealEstateInspection {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  leaseId: string;
  propertyTitle: string;
  tenantName?: string;
  type?: 'CheckIn' | 'CheckOut' | 'Entry' | 'Exit';
  inspectionType?: 'CheckIn' | 'CheckOut' | 'Entry' | 'Exit' | string;
  inspectionDate: string;
  inspectorName?: string;
  meterReadings?: {
    electricKwh?: number;
    gasM3?: number;
    waterM3?: number;
    electricity?: number | string;
    gas?: number | string;
    water?: number | string;
  };
  meterElectricityKwh?: number;
  meterGasM3?: number;
  meterWaterM3?: number;
  keysCount?: number;
  keysDeliveredCount?: number;
  generalCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  observations?: string;
  notes?: string;
  isSigned?: boolean;
  signatureSvgData?: string;
  createdAt?: string;
}

export interface BuyerDemandProfile {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  clientFullName: string;
  clientPhone: string;
  clientEmail?: string;
  targetWilaya: string;
  targetCommune?: string;
  propertyType: 'Apartment' | 'Villa' | 'Commercial' | 'Office' | 'Land';
  maxBudgetDzd: number;
  minRooms?: number;
  minSurfaceM2?: number;
  financingType: 'Cash' | 'BankMortgage' | 'Mixed';
  searchUrgency: 'Immediate' | 'Within3Months' | 'Flexible';
  activeStatus: 'Active' | 'UnderOffer' | 'Archived';
  notes?: string;
  createdAt: string;
}

// ==========================================
// CATEGORY 12: MANUFACTURING & WORKSHOP PRODUCTION
// ==========================================

export interface ManufacturingBomComponent {
  id?: string;
  rawProductId: string;
  rawProductName: string;
  rawProductSku?: string;
  quantity: number;
  unit: string;
  scrapAllowancePercent?: number; // e.g. 5 for 5%
  unitCostDzd: number;
  subTotalCostDzd?: number;
  isSubAssembly?: boolean;
  subBomId?: string;
}

export interface ManufacturingRoutingStep {
  id: string;
  stepNumber: number;
  workCenterId: string;
  workCenterName: string;
  operationName: string;
  setupTimeMinutes: number;
  runTimePerUnitMinutes: number;
  operatorRateDzdPerHour: number;
  machineRateDzdPerHour: number;
  requiredSkillLevel?: string;
  safetyPpeNotes?: string;
}

export interface ManufacturingBom {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  finishedProductId: string;
  finishedProductName: string;
  finishedProductSku?: string;
  bomCode: string;
  version?: number;
  archetype?: 'Discrete' | 'CustomJob' | 'BatchProcess' | 'TextileApparel';
  batchYield: number;
  unit: string;
  standardLaborHours: number;
  components: ManufacturingBomComponent[];
  routingSteps?: ManufacturingRoutingStep[];
  totalMaterialCostDzd?: number;
  totalLaborCostDzd?: number;
  totalLaborMachineCostDzd?: number;
  estimatedCostDzd: number;
  suggestedSalePriceDzd?: number;
  targetMarginPercent?: number;
  isActive: boolean;
  status?: 'Draft' | 'UnderReview' | 'Active' | 'Archived';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ManufacturingOrder {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  orderNumber: string;
  bomId: string;
  bomCode?: string;
  productName: string;
  targetQuantity: number;
  quantityOrdered?: number;
  actualQuantityProduced?: number;
  quantityProduced?: number;
  quantityScrapped?: number;
  scrapQuantity?: number;
  scrapReasonCode?: string;
  assignedStation?: string;
  assignedWorkCenterIds?: string[];
  targetDueDate?: string;
  batchLotNumber: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  status: 'Draft' | 'Planned' | 'Scheduled' | 'MaterialsIssued' | 'InProduction' | 'QC' | 'QC_Pending' | 'Completed' | 'Cancelled';
  totalMaterialCostDzd: number;
  totalLaborCostDzd: number;
  totalCostDzd: number;
  clientOrderId?: string;
  clientName?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkstationSessionLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  operatorName: string;
  workCenterId: string;
  workCenterName: string;
  orderId: string;
  orderNumber: string;
  stepNumber: number;
  operationName: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  pauseDurationSeconds: number;
  pauseReason?: 'ToolingChange' | 'Breakdown' | 'ShiftChange' | 'MaterialWait';
  goodQuantity: number;
  scrapQuantity: number;
  scrapReason?: 'SetupPiece' | 'DimensionError' | 'BurntMaterial' | 'Cracked';
  status: 'Active' | 'Paused' | 'Submitted';
  createdAt: string;
}

export interface RawMaterialStockItem {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  sku: string;
  name: string;
  category: 'Metals' | 'Plastics' | 'Chemicals' | 'Wood' | 'Textiles' | 'Hardware' | 'Packaging';
  currentStock: number;
  allocatedStock: number;
  availableStock: number;
  reorderThreshold: number;
  unit: string;
  unitCostPmpDzd: number;
  totalValuationDzd: number;
  warehouseLocation: string;
  supplierLotNumber?: string;
  onmlCertificateRef?: string;
  createdAt: string;
}

export interface MaterialTransferVoucher {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  voucherNumber: string; // e.g. "BSM-2026-00421"
  voucherType: 'BonDeSortie' | 'BonDeReception' | 'BonDeTransfert';
  orderId?: string;
  orderNumber?: string;
  recipientStaffName: string;
  transferDate: string;
  items: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitCostDzd: number;
    lotNumber?: string;
  }>;
  totalValueDzd: number;
  notes?: string;
}

export interface QualityInspectionRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  inspectionNumber: string; // e.g. "QC-2026-00084"
  orderId: string;
  orderNumber: string;
  batchLotNumber: string;
  productName: string;
  sampleSize: number;
  inspectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  verdict: 'Accepted' | 'AcceptedWithDerogation' | 'Quarantined' | 'Scrapped';
  checkpoints: Array<{
    parameter: string;
    nominalValue: string;
    tolerance: string;
    measuredValue: string;
    passed: boolean;
  }>;
  inspectorName: string;
  inspectionDate: string;
  certificateOfConformityGenerated: boolean;
  notes?: string;
}

// ==========================================
// CATEGORY 13: LEGAL & ACCOUNTING CABINETS
// ==========================================
export interface LegalMatter {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  matterNumber: string;
  title: string;
  titleAr?: string;
  category: 'Commercial' | 'Civil' | 'Penal' | 'Labor' | 'TaxAdvisory' | 'NotaryAct' | 'Administrative' | 'RealEstate';
  clientName: string;
  clientNameAr?: string;
  clientPhone: string;
  clientNinOrNif?: string;
  adversePartyName?: string;
  adversePartyNameAr?: string;
  courtJurisdiction?: string;
  chamber?: string;
  assignedLawyer: string;
  retainerAmountDzd: number;
  trustEscrowBalanceDzd: number;
  status: 'Active' | 'PendingHearing' | 'UnderDeliberation' | 'Closed' | 'Archived';
  nextHearingDate?: string;
  cpcaDeadlineId?: string;
  notes?: string;
  createdAt: string;
}

export interface LegalHearing {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  matterId: string;
  matterNumber?: string;
  matterTitle?: string;
  matterTitleAr?: string;
  hearingDate: string;
  hearingTime?: string;
  courtName?: string;
  courtRoom?: string;
  chamber?: string;
  benchJudge?: string;
  presidingJudge?: string;
  purpose?: string;
  purposeAr?: string;
  objective?: string;
  resultSummary?: string;
  outcomeNotes?: string;
  postponementCode?: string; // e.g. "RPP" (Pièces), "RPO" (Observations), "Delibere"
  isCompleted?: boolean;
  nextDate?: string;
  status?: 'Scheduled' | 'Attended' | 'Postponed' | 'Ruled' | string;
  createdAt?: string;
}

export interface CPCADeadline {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  matterId: string;
  caseNumber: string;
  courtJurisdiction: string;
  chamber: string;
  recourseType: 'appel_civil' | 'appel_commercial' | 'appel_social' | 'opposition' | 'pourvoi_cassation' | 'appel_refere';
  notificationDate: string;
  bailiffName: string;
  domicileCategory: 'local' | 'grand_sud' | 'abroad';
  statutoryBaseDays: number;
  distanceExtensionDays: number;
  terminalExpiryDate: string;
  isRolledOver: boolean;
  rolloverReason?: string;
  status: 'running' | 'approaching' | 'critical' | 'filed' | 'forfeited';
  appealFilingReceipt?: {
    filingDate: string;
    greffeRegistrationNumber: string;
    greffierName: string;
  };
  notes?: string;
  createdAt: string;
}

export interface NotaryDeed {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  repertoireNumber: string;
  repertoireIndex: number;
  actType: 'vente_immobiliere' | 'donation' | 'bail_commercial' | 'fredha' | 'statuts_societe' | 'procuration';
  title: string;
  titleAr: string;
  transactionValueDzd: number;
  parties: {
    vendorName: string;
    vendorNin: string;
    purchaserName: string;
    purchaserNin: string;
  };
  cadastralReference?: {
    wilaya: string;
    commune: string;
    section: string;
    ilot: string;
    lotNumber: string;
    livretFoncierNumber?: string;
  };
  financials: {
    honorairesHtDzd: number;
    tvaAmountDzd: number;
    droitsEnregistrementDzd: number;
    droitsPubliciteDzd: number;
    totalProvisionClientDzd: number;
  };
  status: 'draft' | 'minute_signed' | 'enregistre_impots' | 'publie_conservation' | 'annule_au_repertoire';
  signedAt?: string;
  conservationVolume?: string;
  conservationNumber?: string;
  createdAt: string;
}

export interface EscrowAccount {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  matterId: string;
  matterReference: string;
  clientName: string;
  beneficiaryName: string;
  totalDepositedDzd: number;
  totalDisbursedDzd: number;
  currentBalanceDzd: number;
  isLocked: boolean;
  cadastralClearanceProof?: {
    volume: string;
    number: string;
    recordedAt: string;
  };
  transactions: EscrowTransaction[];
}

export interface EscrowTransaction {
  id: string;
  escrowAccountId: string;
  date: string;
  type: 'deposit_received' | 'tax_disbursement' | 'seller_final_payout' | 'reimbursement';
  amountDzd: number;
  paymentMode: 'virement_bancaire' | 'cheque_de_banque' | 'tresor_public';
  bankReference: string;
  authorizedByStaff: string;
  notes?: string;
}

export interface SCFJournalEntry {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  entryNumber: string;
  journalCode: 'VE' | 'AC' | 'BQ' | 'CA' | 'OD';
  date: string;
  pieceJustificativeRef: string;
  libelle: string;
  lines: Array<{
    id: string;
    accountNumber: string;
    accountLabel: string;
    debitDzd: number;
    creditDzd: number;
  }>;
  totalDebitDzd: number;
  totalCreditDzd: number;
  isBalanced: boolean;
  status: 'validated' | 'draft' | 'closed_period';
}

export interface CashReceipt {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  receiptNumber: string;
  clientName: string;
  matterTitle: string;
  totalHtDzd: number;
  tvaDzd: number;
  paymentMethod: 'especes' | 'cheque' | 'virement' | 'baridimob';
  timbreFiscalDzd: number;
  netCollectedDzd: number;
  cashierName: string;
  createdAt: string;
}


export interface LegalClientEntity {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  clientType: 'personne_physique' | 'personne_morale';
  nameFr: string;
  nameAr: string;
  ninOrNif: string;
  commercialRegistryNumber?: string;
  phone: string;
  email?: string;
  addressFr: string;
  addressAr: string;
  wilaya: string;
  courtJurisdiction: string;
  activeMattersCount: number;
  outstandingBalanceDzd: number;
  createdAt: string;
}


// ==========================================
// CATEGORY 14: LOGISTICS & COURIER DISPATCH
// ==========================================
export interface LogisticsShipment {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  trackingCode: string;
  merchantName: string;
  recipientName: string;
  recipientPhone: string;
  destinationWilaya: string;
  destinationAddress: string;
  codAmountDzd: number;
  shippingFeeDzd: number;
  weightKg: number;
  status: 'Created' | 'HubIntake' | 'ReceivedAtHub' | 'Sorted' | 'OutForDelivery' | 'Delivered' | 'Postponed' | 'Returned' | 'Cancelled';
  assignedDriverName?: string;
  podSignatureUrl?: string;
  createdAt: string;
}

export interface LogisticsManifest {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  manifestNumber: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  dispatchDate: string;
  zoneWilaya: string;
  shipmentIds: string[];
  totalShipmentsCount: number;
  totalCodExpectedDzd: number;
  totalCodCollectedDzd: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Reconciled';
  createdAt: string;
}

// ==========================================
// CATEGORY 15: CONSTRUCTION & BTP CONTRACTING
// ==========================================
export interface ContractorProject {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  siteLocation: string;
  contractAmountDzd: number;
  retentionGuaranteePercent: number;
  retentionAmountDzd: number;
  startDate: string;
  targetEndDate: string;
  supervisorName: string;
  progressPercent: number;
  status: 'Tendering' | 'SitePreparation' | 'InProgress' | 'ProvisionalHandover' | 'DefinitiveHandover' | 'Archived';
  createdAt: string;
}

export interface ContractorBoqItem {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  itemCode: string;
  designation: string;
  unit: 'm2' | 'm3' | 'ml' | 'kg' | 'ton' | 'forfait' | 'unit';
  plannedQty: number;
  executedQty: number;
  unitPriceDzd: number;
  totalPlannedDzd: number;
  totalExecutedDzd: number;
  createdAt: string;
}

export interface ContractorDailyLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  date: string;
  logDate?: string;
  weather: 'Ensoleillé' | 'Pluvieux' | 'Venteux / Sirocco' | 'Canicule' | string;
  weatherCondition?: string;
  headcountWorkers: number;
  workforceCount?: number;
  equipmentOnSite: string[];
  tasksAccomplished: string;
  worksSummary?: string;
  incidentsSafety: string;
  incidentsOrDelays?: string;
  supervisorSignature: string;
  createdAt: string;
}

export interface ContractorDgp {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  dgpNumber: string; // e.g. DGP-04-CHANT-08
  periodLabel: string; // e.g. Situation Mensuelle Mai 2026
  grossCompletedDzd: number;
  previousCumulDzd: number;
  periodGrossDzd: number;
  retentionGuaranteePercent: number; // usually 5%
  retentionGuaranteeDzd: number;
  advanceAmortizationDzd: number;
  tvaPercent: number; // 9% or 19%
  tvaAmountDzd: number;
  netPayableDzd: number;
  status: 'Draft' | 'SubmittedClient' | 'ApprovedBE' | 'Paid';
  issuedDate: string;
  createdAt: string;
}

// ==========================================
// CATEGORY 16: AGRI-BUSINESS & LIVESTOCK FARMING
// ==========================================
export interface AgriParcel {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  name: string;
  surfaceHectares: number;
  irrigationType: 'Drip' | 'Pivot' | 'Sprinkler' | 'Gravity' | 'Rainfed';
  soilType: string;
  currentCrop?: string;
  plantingDate?: string;
  expectedHarvestDate?: string;
  status: 'Fallow' | 'Planted' | 'Growing' | 'Harvesting';
  createdAt: string;
}

export interface AgriLivestock {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  earTagNumber: string;
  species: 'Bovine' | 'Ovine' | 'Caprine' | 'Poultry' | 'Equine';
  breed: string;
  gender: Gender;
  birthDate: string;
  healthStatus: 'Healthy' | 'InTreatment' | 'Quarantined' | 'Sold' | 'Deceased';
  dailyProductionLiters?: number;
  notes?: string;
  createdAt: string;
}

export interface AgriTreatmentLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  parcelId: string;
  treatmentDate: string;
  commercialProductName: string;
  activeIngredient: string;
  targetPestDisease: string;
  dosagePerHa: string;
  darDays: number; // Délai Avant Récolte (Pre-harvest interval)
  harvestAllowedDate: string;
  operatorName: string;
  notes?: string;
  createdAt: string;
}

export interface AgriHarvestTicket {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  ticketNumber: string; // e.g. PES-2026-041
  ticketCode?: string;
  parcelId: string;
  cropDesignation: string;
  cropVariety?: string;
  qualityGrade?: string;
  vehiclePlate: string;
  driverName: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  cratesCount?: number;
  unitPriceDzdPerKg: number;
  totalGrossDzd: number;
  mandataireFeePercent: number; // e.g. 5%
  netFarmPayoutDzd: number;
  destinationWholesaleMarket: string; // e.g. Marché de Gros des Eucalyptus
  destinationStorage?: string;
  date: string;
  harvestDate?: string;
  createdAt: string;
}







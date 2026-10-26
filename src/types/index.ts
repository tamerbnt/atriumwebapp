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
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface MedicalConsultation {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string; // Doctor
  patientId: string;
  patientName: string;
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
  };
  clinicalExam?: string;
  diagnosis: string;
  icdCode?: string;
  status: 'InWaitingQueue' | 'InConsultation' | 'InProgress' | 'Completed' | 'Cancelled';
  consultationFeeDzd: number;
  copayAmountDzd: number;
  insuranceShareDzd: number;
  isPaid: boolean;
  notes?: string;
  createdAt: string;
}

export interface MedicalPrescriptionItem {
  drugName: string;
  form: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface MedicalPrescription {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  consultationId: string;
  patientId: string;
  patientName: string;
  prescriptionDate: string;
  items: MedicalPrescriptionItem[];
  qrCodeHash: string;
  isSigned: boolean;
  notes?: string;
  createdAt: string;
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

// ==========================================
// CATEGORY 11: REAL ESTATE & PROPERTY LEASES
// ==========================================
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
  status: 'Available' | 'Rented' | 'Sold' | 'UnderMaintenance';
  amenities?: string[];
  createdAt: string;
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
  startDate: string;
  endDate: string;
  monthlyRentDzd: number;
  securityDepositDzd: number;
  agencyFeeDzd?: number;
  agencyCommissionDzd?: number;
  paymentCycle?: 'Monthly' | 'Quarterly' | 'Yearly';
  paymentFrequency?: 'Monthly' | 'Quarterly' | 'Biannual' | 'Yearly' | 'Annual' | string;
  status: 'Active' | 'Expired' | 'Terminated';
  createdAt?: string;
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
  createdAt?: string;
}

// ==========================================
// CATEGORY 12: MANUFACTURING & WORKSHOP BOM
// ==========================================
export interface ManufacturingBom {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  finishedProductId: string;
  finishedProductName: string;
  bomCode: string;
  batchYield: number;
  unit: string;
  standardLaborHours: number;
  components: Array<{
    rawProductId: string;
    rawProductName: string;
    quantity: number;
    unit: string;
    unitCostDzd: number;
  }>;
  estimatedCostDzd: number;
  isActive: boolean;
  createdAt: string;
}

export interface ManufacturingOrder {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  orderNumber: string;
  bomId: string;
  productName: string;
  targetQuantity: number;
  quantityOrdered?: number;
  actualQuantityProduced?: number;
  quantityProduced?: number;
  quantityScrapped?: number;
  assignedStation?: string;
  targetDueDate?: string;
  batchLotNumber: string;
  startDate: string;
  dueDate: string;
  status: 'Draft' | 'Planned' | 'Scheduled' | 'MaterialsIssued' | 'InProduction' | 'QC' | 'Completed' | 'Cancelled';
  totalMaterialCostDzd: number;
  totalLaborCostDzd: number;
  totalCostDzd: number;
  notes?: string;
  createdAt: string;
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
  category: 'Commercial' | 'Civil' | 'Penal' | 'Labor' | 'TaxAdvisory' | 'NotaryAct' | 'Administrative' | 'RealEstate';
  clientName: string;
  clientPhone: string;
  adversePartyName?: string;
  courtJurisdiction?: string;
  assignedLawyer: string;
  retainerAmountDzd: number;
  trustEscrowBalanceDzd: number;
  status: 'Active' | 'PendingHearing' | 'UnderDeliberation' | 'Closed' | 'Archived';
  nextHearingDate?: string;
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
  hearingDate: string;
  hearingTime?: string;
  courtName?: string;
  courtRoom?: string;
  benchJudge?: string;
  presidingJudge?: string;
  purpose?: string;
  objective?: string;
  resultSummary?: string;
  outcomeNotes?: string;
  isCompleted?: boolean;
  nextDate?: string;
  status?: 'Scheduled' | 'Attended' | 'Postponed' | 'Ruled' | string;
  createdAt?: string;
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
  weather: 'Ensoleillé' | 'Pluvieux' | 'Venteux / Sirocco' | 'Canicule';
  headcountWorkers: number;
  equipmentOnSite: string[];
  tasksAccomplished: string;
  incidentsSafety: string;
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
  parcelId: string;
  cropDesignation: string;
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
  date: string;
  createdAt: string;
}







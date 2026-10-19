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

// ==========================================
// Rentals & Venue Management Types
// ==========================================

export type RentableUnitType = 'Hall' | 'Room' | 'Court' | 'Studio' | 'Desk' | 'Equipment';
export type RentableUnitStatus = 'Available' | 'Occupied' | 'Maintenance';

export interface RentableUnit {
  id: string;
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



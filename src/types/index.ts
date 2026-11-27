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
export type AppDensity = 'default' | 'compact';

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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  balance?: number;
  balanceLabel?: string;
  segmentData?: Record<string, any>;
  lastVisitDate?: string;
  autoRenew?: boolean;
  billingCycleDays?: number;
  familyGroupId?: string;
  familyRole?: 'primary' | 'dependent';
  frozenAt?: string;
  freezeUntil?: string;
  freezeDaysUsed?: number;
  freezeFeeCentimes?: number;
  freezeReason?: string;
  qrToken?: string;
  clientType?: 'regular' | 'vip' | 'walkin';
  version?: number;
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
  durationDays: number | null;
  totalSessions?: number | null;
  price: Money;
  isActive: boolean;
  sessionsPerWeek: number; // 0 = unlimited
  isWalkIn: boolean;
  isPersonalTraining: boolean;
  genderRule: 0 | 1 | 2; // 0=Both, 1=Male, 2=Female
  version?: number;
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
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export type StaffLifecycleStatus = 'active' | 'frozen' | 'vacation' | 'on_leave' | 'terminated';

export type RecruitmentLegalType = 'cdi' | 'cdd' | 'stage' | 'vacataire' | 'prestataire';

export type StaffPaymentMethod = 'cash' | 'ccp' | 'bank_transfer';

export interface StaffPerformanceMetric {
  kpiLabel: string;
  kpiValue: string | number;
  kpiUnit: string;
  targetValue?: number;
  scorePercentage: number;
  history30Days?: number[];
}

export interface StaffCategoryProperties {
  // Medical Polyclinic
  orderRegistrationNumber?: string;
  medicalSpecialty?: string;
  canPrescribe?: boolean;
  // BTP / Construction
  cacobatphCardNumber?: string;
  assignedChantierId?: string;
  safetyCertifications?: string[];
  // Logistics & Delivery
  drivingLicenseCategory?: string;
  assignedVehiclePlate?: string;
  deliveryZoneWilayas?: number[];
  // Light Manufacturing
  assignedWorkstationId?: string;
  machineSafetyClearance?: boolean;
  qualityInspectorClearance?: boolean;
  // Agriculture & Livestock
  assignedParcelId?: string;
  milkingParlorStation?: string;
  phytosanitaryLicense?: boolean;
  // Auto Garage
  assignedBayId?: string;
  technicalSpecialty?: string;
  // Real Estate
  carteProfessionnelleNumber?: string;
  canSignMandates?: boolean;
  // Legal & Notary
  barAssociationNumber?: string;
  swornClerkClearance?: boolean;
  // POS & Retail / Wholesale Trading
  assignedRegisterId?: string;
  maxCashFloatLimit?: number;
  // Salon & Gym / Fitness
  assignedChairOrStudio?: string;
  serviceCommissionRate?: number;
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
  | 'Creative'
  | string;

export interface StaffMember {
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
  age?: number;
  address?: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;
  role: StaffRole;
  roleRank: number; // 8=Owner, 4=Manager/Doctor/Director, 2=Supervisor/Cashier, 1=Staff/Operator
  isActive: boolean;
  status?: StaffLifecycleStatus;
  hireDate: string;
  terminationDate?: string;
  vacationUntil?: string;
  salary: number;
  paymentDay: number; // 1-31
  paymentMethod?: StaffPaymentMethod;
  ccpNumber?: string;
  ccpKey?: string;
  bankRib?: string;
  nss?: string;
  recruitmentType?: RecruitmentLegalType;
  contractType?: string;
  pinCode?: string;
  cardId?: string;
  badgeToken?: string;
  canLoginEmail?: boolean;
  canLoginPhone?: boolean;
  canLoginPin?: boolean;
  isClockedInToday?: boolean;
  lastClockInTime?: string;
  lastClockOutTime?: string;
  attendanceLogs?: Array<{ id: string; timestamp: string; type: 'in' | 'out'; method: 'rfid' | 'pin' | 'manual' }>;
  allowedModules: string[];
  // Medical Emergency
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  medicalNotes?: string;
  notes?: string;
  // Domain Specific & Performance
  categoryProperties?: StaffCategoryProperties;
  performance?: StaffPerformanceMetric;
  // Category-specific convenience top-level fields (synced with categoryProperties)
  assignedParcelId?: string;
  milkingParlorStation?: string;
  phytosanitaryLicense?: boolean;
  chairOrStudio?: string;
  assignedChairOrStudio?: string;
  serviceCommissionRate?: number;
  assignedRegisterId?: string;
  maxCashFloatLimit?: number;
  assignedBayId?: string;
  technicalSpecialty?: string;
  orderRegistrationNumber?: string;
  medicalSpecialty?: string;
  canPrescribe?: boolean;
  cacobatphCardNumber?: string;
  assignedChantierId?: string;
  safetyCertifications?: string[];
  drivingLicenseCategory?: string;
  assignedVehiclePlate?: string;
  deliveryZoneWilayas?: number[];
  assignedWorkstationId?: string;
  machineSafetyClearance?: boolean;
  qualityInspectorClearance?: boolean;
  carteProfessionnelleNumber?: string;
  canSignMandates?: boolean;
  barAssociationNumber?: string;
  swornClerkClearance?: boolean;
  assignedCohortId?: string;
  canSignAttendance?: boolean;
  assignedStageOrHall?: string;
  eventAccessBadge?: string;
  dailyRate?: number;
  portfolioUrl?: string;
  version?: number;
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
  variants?: ProductVariant[];
  modifierGroups?: ProductModifierGroup[];
  recipeBom?: ProductRecipeIngredient[];
  isWeighted?: boolean;
  pluCode?: string;
  expiryDate?: string;
  version?: number;
}

export interface SaleItem {
  lineId?: string;
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
  variantId?: string;
  variantLabel?: string;
  modifiers?: PosSelectedModifier[];
  modifiersUnitDeltaDzd?: number;
  weightKg?: number;
  pluCode?: string;
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
  tipAmount?: number;
  orderChannel?: PosOrderChannel;
  tableId?: string;
  tableLabel?: string;
  deliveryAddress?: string;
  deliveryCourier?: string;
  deliveryFee?: number;
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
  refundedItems?: Array<{ productId: string; productName: string; quantity: number }>;
  voidedByStaffId?: string;
  voidReason?: string;
  voidPinVerified?: boolean;
  voidedAt?: string;
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
}

export interface ScheduleEvent {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  coachConfirmed?: boolean;
  coachConfirmedAt?: string;
  coachConfirmedBy?: string;
  version?: number;
}

export interface GymClassEnrollment {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  eventId: string;
  memberId: string;
  memberName: string;
  status: 'enrolled' | 'waitlisted' | 'cancelled';
  enrolledAt: string;
  cancelledAt?: string;
  notes?: string;
  version?: number;
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
  wilayaCode?: string;
  voucherCode?: string;
  planTier?: 'free' | 'starter' | 'pro' | 'enterprise';
  isTrial?: boolean;
  onboardingContext?: OnboardingContext;
}

export type AppointmentStatus = 'Confirmed' | 'InChair' | 'Completed' | 'Cancelled' | 'NoShow' | 'Booked';

export interface ServiceConsumableItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string;
}

export interface ServiceItem {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId?: string;
  facilityId: string;
  name: string;
  category: 'Hair' | 'Nails' | 'Facial' | 'Massage' | 'Bridal' | 'Barber' | 'Tattoo' | 'Laser' | 'Hammam';
  durationMinutes: number;
  price: number;
  colorCode?: string;
  color?: string;
  description?: string;
  costPrice?: number;
  commissionRate?: number;
  bufferMinutes?: number;
  consumables?: ServiceConsumableItem[];
  allergyKeywords?: string[];
  requiresConsent?: boolean;
  isActive?: boolean;
  version?: number;
}

export type AppointmentBookingChannel = 'desk' | 'online' | 'whatsapp' | 'walkin';
export type AppointmentDepositStatus = 'none' | 'held' | 'applied' | 'refunded' | 'forfeited';

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
  depositCentimes?: number;
  depositStatus?: AppointmentDepositStatus;
  cancellationCutoffHours?: number;
  refundedDepositCentimes?: number;
  allergyOverrideConfirmed?: boolean;
  bookingChannel?: AppointmentBookingChannel;
  consumablesDeducted?: boolean;
  packageId?: string;
  giftCardCode?: string;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  version?: number;
}

export interface StylistDayHours {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakStart?: string; // HH:mm
  breakEnd?: string; // HH:mm
}

export interface StylistTimeOffRange {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
}

export interface StylistScheduleConfig {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId: string;
  staffName: string;
  salonClosingTime: string; // HH:mm e.g. '20:00'
  weeklyHours: Record<number, StylistDayHours>; // 0=Sun..6=Sat
  timeOffRanges: StylistTimeOffRange[];
  version?: number;
  updatedAt?: string;
}

export interface SalonPrepaidPackage {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  clientId: string;
  clientName: string;
  packageName: string;
  serviceIds: string[];
  categoryFilter?: string;
  totalSessions: number;
  remainingSessions: number;
  priceCentimes: number;
  expiresAt?: string;
  status: 'active' | 'exhausted' | 'expired' | 'refunded';
  createdAt: string;
  version?: number;
}

export interface SalonGiftCard {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  code: string;
  recipientName: string;
  recipientPhone?: string;
  purchaserName?: string;
  initialCentimes: number;
  remainingCentimes: number;
  expiresAt?: string;
  status: 'active' | 'redeemed' | 'expired' | 'void';
  createdAt: string;
  version?: number;
}

export interface SalonLoyaltyEntry {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  clientId: string;
  clientName?: string;
  appointmentId?: string;
  pointsDelta: number;
  balanceAfter: number;
  reason: string;
  recordedAt: string;
  version?: number;
}

export type SalonConsentProtocolType = 'tattoo' | 'laser' | 'chemical' | 'aesthetic' | 'other';

export interface SalonConsentForm {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  clientId: string;
  clientName: string;
  appointmentId?: string;
  serviceId?: string;
  serviceName: string;
  protocolType: SalonConsentProtocolType;
  medicalChecklist: Record<string, boolean>;
  allergiesAcknowledged: boolean;
  signatureDataUrl: string;
  beforePhotoPath?: string;
  afterPhotoPath?: string;
  signedAt: string;
  version?: number;
}

export type HammamGenderBlock = 'women' | 'men' | 'private';
export type HammamSessionStatus = 'Booked' | 'InSession' | 'Completed' | 'Cancelled';

export interface SalonHammamSession {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  cabinName: string;
  genderBlock: HammamGenderBlock;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  attendantId?: string;
  attendantName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity: number;
  bookedCount: number;
  addons: string[]; // e.g. ['Savon Noir', 'Gommage Kessa', 'Argile Ghassoul']
  priceCentimes: number;
  status: HammamSessionStatus;
  notes?: string;
  createdAt: string;
  version?: number;
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
  version?: number;
}

export interface SalonWorkstation {
  id: string;
  name: string;
  type: 'StylingChair' | 'WashBasin' | 'SpaCabin' | 'NailStation';
  assignedStaffId?: string;
  assignedStaffName?: string;
  isAvailable: boolean;
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  depositReceiptNumber?: string;
  printedCount?: number;
  collectedAt: string;
  releasedAt?: string;
  version?: number;
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
  hasUndo?: boolean;
  undoLabel?: string;
  onUndo?: () => Promise<void> | void;
  isExiting?: boolean;
  isPaused?: boolean;
  facilityAccent?: string;
  action?: {
    label: string;
    onClick: () => Promise<void> | void;
  };
  createdAt: number;
}

export type UndoOperationType = 'create' | 'edit' | 'status' | 'delete' | 'bulk';
export type UndoVerticalKey = BusinessCategory | 'staff' | 'settings';
export type UndoEntryStatus = 'available' | 'undone' | 'error';

export interface UndoHistoryEntry {
  id: string;
  vertical: UndoVerticalKey;
  businessId: string;
  branchId: string;
  operationType: UndoOperationType;
  summary: string;
  entityLabel?: string;
  affectedCount?: number;
  status: UndoEntryStatus;
  createdAt: number;
  undoneAt?: number;
  canRedo: boolean;
  lastError?: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  markedBy?: string;
  markedAt?: string;
  isLocked?: boolean;
  changeHistory?: Array<{
    previousStatus: AttendanceStatus;
    newStatus: AttendanceStatus;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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

// ============================================================================
// Logistics, Couriers & Parcel Dispatch — Dedicated Operational Roles
// ============================================================================

export type LogisticsRole =
  | 'gerant'          // Gérant / Direction (Tarifs, KPIs 69 Wilayas, Bilan COD, Règlements CCP)
  | 'dispatcher'      // Régulateur / Dispatcher (Tournées Chauffeurs, Manifestes LVR, Arbitrage Échecs)
  | 'hub_sorter'      // Agent de Tri Hub (Scanner Haute Cadence, Sacs-Navette & Scellés de Sécurité)
  | 'stop_desk_agent';// Agent Guichetier Stop-Desk (Rayonnage, Retrait OTP, CNI & Caisse Journalière)





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
  version?: number;
  createdAt: string;
}

export type PMProjectStatus =
  | 'framing'           // En cadrage / Cahier des charges
  | 'crea_active'       // Créa en cours
  | 'print_ready'       // Prêt pour impression
  | 'field_active'      // En exécution terrain
  | 'closed'            // Clôturé
  | 'creative_kv'       // KV Créa
  | 'client_validated'  // Validé Client
  | 'production'        // En Production
  | 'field_execution'   // Terrain Live
  | 'completed'         // Clôturé
  | 'archived';         // Archivé

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
  currency?: UnifiedCurrency;
  fxRateToDzd?: number;
  budgetAlertThresholdPct?: number;
  isNonPrintPreset?: boolean;
  maxRevisionLoops?: number;
  version?: number;
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
  startDate?: string;
  targetDate: string;
  completedAt?: string;
  isCompleted: boolean;
  assignedRole: PMRole;
  amountDzd?: number;
  billingPct?: number;
  approvalStatus?: 'pending' | 'partial_approved' | 'approved';
  approvedPct?: number;
  invoicedAmountDzd?: number;
  invoicedDocumentId?: string;
  dependsOnMilestoneId?: string;
  version?: number;
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
  version?: number;
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
  metadataStatus?: 'verified' | 'manual / unverified';
  version: number;
  versionCode: string; // e.g. "v1", "v2"
  previewUrl: string;
  masterSourceUrl?: string;
  fileSizeBytes: number;
  uploadedByCreativeId: string;
  uploadedByCreativeName: string;
  approvalStatus: 'pending_review' | 'approved' | 'revision_requested';
  revisionComments?: string;
  revisionCount?: number;
  maxRevisionLoops?: number;
  clientPortalToken?: string;
  clientApprovedAt?: string;
  clientApprovedByName?: string;
  clientFeedback?: string;
  deliverableKind?: 'print_bat' | 'digital_asset' | 'software_build' | 'strategy_deck';
  rowVersion?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  missingReceiptFlagged?: boolean;
  missingReceiptOverrideReason?: string;
  isEquipmentAutoCreated?: boolean;
  version?: number;
  createdAt: string;
}

export interface PMTimesheet {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  projectId: string;
  projectTitle: string;
  milestoneId?: string;
  staffMemberId?: string;
  staffName: string;
  workDate: string;
  hoursWorked: number;
  capacityHours: number;
  billable: boolean;
  hourlyCostDzd: number;
  hourlyBillDzd: number;
  taskSummary: string;
  approvalStatus: 'draft' | 'submitted' | 'approved';
  version?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PMClientPortalReview {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  tenantId: string;
  facilityId: string;
  projectId: string;
  deliverableId: string;
  reviewerName: string;
  decision: 'approved' | 'revision_requested' | 'override_granted';
  comments?: string;
  revisionRound: number;
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  ngapCode?: 'C' | 'CS' | 'K' | 'KE' | 'AMI' | 'ECG';
  consultationFeeDzd: number;
  copayAmountDzd: number;
  insuranceShareDzd: number;
  isPaid: boolean;
  paymentMethod?: 'Cash' | 'BaridiMob' | 'Card' | 'ChifaDirect';
  notes?: string;
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  ngapCode: 'C' | 'CS' | 'K' | 'KE' | 'ECG' | string;
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
  version?: number;
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
  version?: number;
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
  isReconciled?: boolean;
  signedOffByOwner?: boolean;
  cashDrawerLimitDzd?: number;
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  validatedBy?: string;
  validatedAt?: string;
  isLocked?: boolean;
  version?: number;
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
  version?: number;
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
  rowVersion?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
}

export interface MfgNcrRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  ncrNumber: string;
  orderId?: string;
  qcInspectionId?: string;
  ofNumber: string;
  lotNumber?: string;
  productName: string;
  scrappedQuantity: number;
  reason: string;
  disposition: 'Scrapped' | 'Quarantined' | 'Rework';
  status: 'Open' | 'Reviewed' | 'Closed';
  cmupAdjustmentHeld: boolean;
  notes?: string;
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  version?: number;
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
  deliveryMode?: 'HomeDelivery' | 'StopDesk';
  dimensionsCm?: { length: number; width: number; height: number };
  bagId?: string;
  stopDeskShelfCode?: string;
  pickupOtpCode?: string;
  recipientIdNumber?: string;
  returnReasonCode?: string;
  attemptCount?: number;
  stampDutyDzd?: number;
  assignedDriverName?: string;
  podSignatureUrl?: string;
  version?: number;
  createdAt: string;
}

export interface TransportBag {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  bagCode: string; // e.g. "BAG-16-ORN-0042"
  originHubWilaya: number;
  destinationHubWilaya: number;
  securitySealNumber: string; // e.g. "SL-994821"
  shipmentIds: string[];
  totalItemCount: number;
  totalWeightKg: number;
  status: 'Open' | 'Sealed' | 'InTransit' | 'Received' | 'Discrepancy';
  sealedAt?: string;
  receivedAt?: string;
  version?: number;
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
  driverNin?: string; // Numéro d'Identification Nationale (NIN)
  vehiclePlate: string;
  transportCardNumber?: string;
  dispatchDate: string;
  zoneWilaya: string;
  originHub?: string;
  destinationHub?: string;
  bagIds?: string[];
  sealNumbers?: string[];
  shipmentIds: string[];
  totalShipmentsCount: number;
  totalCodExpectedDzd: number;
  totalCodCollectedDzd: number;
  totalGrossWeightKg?: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Reconciled';
  version?: number;
  createdAt: string;
}

export interface CourierCashDischarge {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  cashierStaffId: string;
  courierStaffId: string;
  manifestId: string;
  dischargeNumber: string; // "DECH-2026-0891"
  deliveredCount: number;
  returnedCount: number;
  expectedCodDzd: number;
  actualCashTurnedInDzd: number;
  discrepancyDzd: number;
  banknotesCount: {
    note2000: number;
    note1000: number;
    note500: number;
    note200: number;
    coins: number;
  };
  courierSignatureConfirmed: boolean;
  status: 'Clean' | 'Shortage' | 'Surplus';
  timestamp: string;
  version?: number;
}

export interface StopDeskInventoryItem {
  id: string;
  shipmentId: string;
  trackingCode: string;
  recipientName: string;
  recipientPhone: string;
  shelfCode: string; // e.g. "RACK-B-04"
  arrivedAt: string;
  otpCode: string;
  status: 'InRack' | 'Delivered' | 'ReturnScheduled';
  recipientIdType?: 'CNI_Biometrique' | 'Permis' | 'Passeport';
  recipientIdNumber?: string;
  deliveredTimestamp?: string;
}

export interface MerchantRemittanceBatch {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  batchNumber: string;
  merchantName: string;
  ccpAccount: string;
  ccpKey: number;
  grossCodDzd: number;
  shippingFeesDzd: number;
  returnFeesDzd: number;
  netPayoutDzd: number;
  paymentChannel: 'AlgeriePoste_SFP01' | 'BaridiMob' | 'Virement_Bancaire' | 'Especes';
  status: 'Draft' | 'Approved' | 'Executed';
  executedAt?: string;
  version?: number;
}

// ==========================================
// CATEGORY 15: CONSTRUCTION & BTP CONTRACTING
export type ContractorRole =
  | 'gerant'
  | 'conducteur'
  | 'chef_chantier'
  | 'metreur'
  | 'comptable'
  | 'conducteur_travaux'
  | 'daf_metreur';

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
  wilayaNumber?: number;
  contractAmountDzd: number;
  retentionGuaranteePercent: number;
  retentionAmountDzd: number;
  hasBankCautionReplacement?: boolean;
  bankCautionReference?: string;
  startDate: string;
  targetEndDate: string;
  revisedEndDate?: string;
  supervisorName: string;
  progressPercent: number;
  status: 'Tendering' | 'SitePreparation' | 'InProgress' | 'ProvisionalHandover' | 'DefinitiveHandover' | 'Archived';
  version?: number;
  createdAt: string;
}

export interface ContractorBoqItem {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  lotCode?: string; // e.g. "LOT_01_GROS_OEUVRE"
  lotTitle?: string; // e.g. "Gros Œuvre & Fondations"
  itemCode: string;
  designation: string;
  unit: 'm2' | 'm3' | 'ml' | 'kg' | 'ton' | 'forfait' | 'unit';
  plannedQty: number;
  executedQty: number;
  unitPriceDzd: number;
  totalPlannedDzd: number;
  totalExecutedDzd: number;
  isAdditionalWork?: boolean;
  avenantReference?: string;
  version?: number;
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
  temperatureMinC?: number;
  temperatureMaxC?: number;
  hasWorkStoppage?: boolean;
  stoppageReason?: 'IntemperiesRain' | 'IntemperiesHeat' | 'Administrative' | 'LackOfMaterial' | string;
  stoppageHours?: number;
  cacobatphNoticeFiled?: boolean;
  onmBulletinReference?: string;
  headcountWorkers: number;
  workforceCount?: number;
  workersPresent?: {
    engineers: number;
    specializedCrafts: number;
    laborers: number;
  };
  equipmentOnSite: string[];
  tasksAccomplished: string;
  worksSummary?: string;
  incidentsSafety: string;
  incidentsOrDelays?: string;
  ctcVisit?: boolean;
  ctcObservationNotes?: string;
  isSignedByBet?: boolean;
  supervisorSignature: string;
  version?: number;
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
  hasBankCautionReplacement?: boolean;
  advanceAmortizationDzd: number;
  penaltiesDeductedDzd?: number;
  tvaPercent: number; // 9% or 19%
  tvaAmountDzd: number;
  netPayableDzd: number;
  status: 'Draft' | 'SubmittedClient' | 'ApprovedBE' | 'Paid';
  tresorMandatReference?: string;
  issuedDate: string;
  version?: number;
  createdAt: string;
}

export interface ContractorServiceOrder {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  osNumber: string; // e.g. "OS N° 03/2026"
  osType: 'Commencement' | 'Suspension' | 'Resumption' | 'Modification';
  effectiveDate: string;
  notificationDate: string;
  reason: 'GeneralStart' | 'IntemperiesWeather' | 'ObstacleSonelgaz' | 'PaymentDelay' | 'DesignRevision';
  durationDaysGranted: number;
  issuerName: string;
  hasReservationLetter?: boolean;
  status: 'Notified' | 'AcceptedWithReservations' | 'Executed';
  version?: number;
  createdAt: string;
}

export interface ConcretePourRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  pourDate: string;
  elementPoured: string; // e.g. "Poteaux & Poutres R+2"
  supplierName: string;
  deliverySlipNumber: string;
  volumePouredM3: number;
  concreteGrade: 'B15' | 'B20' | 'B25' | 'B30' | 'B35';
  slumpCm: number;
  testCylindersTaken: number;
  strength7DaysMpa?: number;
  strength28DaysMpa?: number;
  ctcClearanceObtained: boolean;
  status: 'CastPending7D' | 'Passed7D' | 'Passed28D' | 'NonConforming';
  version?: number;
  createdAt: string;
}

export interface SubcontractorAgreement {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  subcontractorName: string;
  tradeType: string; // e.g. "Étanchéité", "Ferraillage", "Plomberie"
  contactPhone: string;
  contractAmountDzd: number;
  retentionPercent: number; // 5% to 10%
  paidAmountDzd: number;
  retentionHeldDzd: number;
  progressPercent: number;
  quitusSigned: boolean;
  status: 'Active' | 'Completed' | 'Terminated';
  version?: number;
  createdAt: string;
}

export interface EquipmentLogRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  equipmentName: string;
  equipmentCategory: 'Excavator' | 'TowerCrane' | 'BackhoeLoader' | 'DumpTruck' | 'Generator';
  matriculeNumber: string;
  operatingHours: number;
  fuelAddedLiters: number;
  theoreticalHourlyBurnRate: number;
  actualHourlyBurnRate: number;
  hasOverconsumptionAlert: boolean;
  date: string;
  operatorName: string;
  version?: number;
  createdAt: string;
}

export interface CaisseExpenseRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  projectId: string;
  expenseDate: string;
  beneficiaryName: string;
  expenseCategory: 'EmergencyHardware' | 'SiteSecurity' | 'SandQuarry' | 'CateringMuster' | 'FuelTransport';
  amountDzd: number;
  timbreFiscalDzd: number;
  netCashDisbursedDzd: number;
  voucherNumber: string;
  approvedBy: string;
  version?: number;
  createdAt: string;
}

// ==========================================
// CATEGORY 16/17: AGRI-BUSINESS & DAIRY LIVESTOCK FARMING (ALGERIA)
// ==========================================
export type AgriRole = 'gerant' | 'chef_culture' | 'zootechnicien' | 'magasinier';

export type AgriTenureType = 'concession_loi_10_03' | 'propriete_melk' | 'fermage_location';
export type AgriIrrigationType = 'Drip' | 'Pivot' | 'Sprinkler' | 'Gravity' | 'Rainfed';
export type AgriParcelStatus = 'Fallow' | 'Planted' | 'Growing' | 'Harvesting' | 'Damaged';

export interface AgriParcel {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  name: string;
  code?: string;
  tenureType?: AgriTenureType;
  cadastralSection?: string;
  cadastralDeedRef?: string;
  surfaceHectares: number;
  irrigationType: AgriIrrigationType;
  soilType: string;
  soilPh?: number;
  waterSourceId?: string;
  waterMeterReadingM3?: number;
  anrhAnnualQuotaM3?: number;
  anrhConsumedM3?: number;
  currentCrop?: string;
  plantingDate?: string;
  expectedHarvestDate?: string;
  status: AgriParcelStatus;
  notes?: string;
  version?: number;
  createdAt: string;
}

export type AgriCyclePhase = 'planned' | 'sowing' | 'vegetative' | 'treatment_locked' | 'ready_harvest' | 'closed';

export interface AgriCropCycle {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  parcelId: string;
  cropName: string;
  variety: string;
  campaignYear: number;
  surfaceAllocatedHa: number;
  seedLotNumber?: string;
  seedQuantityKg?: number;
  sowingDate: string;
  projectedHarvestDate: string;
  projectedYieldQtx: number;
  actualYieldQtx?: number;
  currentPhase: AgriCyclePhase;
  activeDarLockoutUntil?: string;
  activePestWarning?: string;
  totalInputCostDzd: number;
  totalLaborCostDzd: number;
  totalMachineryCostDzd: number;
  version?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AgriTreatmentLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  parcelId: string;
  cropCycleId?: string;
  treatmentDate: string;
  commercialProductName: string;
  activeIngredient: string;
  targetPestDisease: string;
  dosagePerHa: string;
  totalQuantityUsed?: number;
  darDays: number; // Délai Avant Récolte (Pre-harvest interval)
  harvestAllowedDate: string;
  operatorName: string;
  safetyGearConfirmed?: boolean;
  notes?: string;
  version?: number;
  createdAt: string;
}

export type AgriWorkerType = 'seasonal_piecework' | 'seasonal_daily' | 'permanent_salary';

export interface AgriWorker {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  fullName: string;
  ninOrIdCard?: string;
  phone?: string;
  workerType: AgriWorkerType;
  defaultDailyRateDzd: number;
  defaultPieceRateDzd: number;
  active: boolean;
  version?: number;
  createdAt: string;
}

export interface AgriDailyPointage {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  workerId: string;
  workerName: string;
  parcelId: string;
  parcelName?: string;
  date: string;
  cratesCollected: number;
  calculatedWageDzd: number;
  cashAdvancePaidDzd: number;
  netDueDzd: number;
  isPaid: boolean;
  paidAt?: string;
  supervisorStaffId: string;
  version?: number;
  createdAt: string;
}

export type BovineBreed = 'Holstein' | 'Montbéliarde' | 'Fleckvieh' | 'Brune de l Atlas' | 'Croisée Locale';
export type CowReproStatus = 'Génisse' | 'Lactation' | 'Tarissement' | 'Gestante' | 'Quarantaine' | 'Réformée';

export interface AgriDairyCow {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  earTagNumber: string; // e.g. DZ-16-10482
  nameOrNumber: string;
  breed: BovineBreed | string;
  birthDate: string;
  reproStatus: CowReproStatus;
  lactationNumber: number;
  dailyAvgLiters: number;
  isInWithholdingLockout: boolean;
  withholdingLockoutUntil?: string;
  withholdingReason?: string;
  motherTag?: string;
  sireCode?: string;
  notes?: string;
  species?: 'Bovine' | 'Ovine' | 'Caprine' | 'Other';
  gender?: 'Female' | 'Male';
  healthStatus?: 'Healthy' | 'InTreatment' | 'Quarantine' | 'Sick';
  dailyProductionLiters?: number;
  version?: number;
  createdAt: string;
}

export interface AgriMilkingRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  sessionDate: string;
  sessionPeriod: 'morning' | 'evening';
  totalTankLiters: number;
  rejectedWithholdingLiters: number;
  conformingLiters: number;
  tankTemperatureCelsius: number;
  destinationDairy: string;
  dairyDeliverySlipNo?: string;
  fatContentMg?: number;
  density?: number;
  onilSubsidyRateDzd: number; // 12 DZD/L
  onilTotalSubsidyDzd: number;
  operatorStaffId: string;
  version?: number;
  createdAt: string;
}

export type AgriSalePaymentMethod = 'cash' | 'baridimob' | 'bank_transfer' | 'check' | 'credit_mandataire';

export interface AgriWeighbridgeTicket {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  ticketNumber: string; // e.g. PB-2026-0042
  ticketCode?: string;
  buyerName: string;
  truckPlate: string;
  vehiclePlate?: string;
  driverName?: string;
  parcelId?: string;
  cropDesignation: string;
  grossWeightKg: number;
  truckTareKg: number;
  tareWeightKg?: number;
  crateCount: number;
  cratesCount?: number;
  crateUnitTareKg: number;
  totalCrateTareKg: number;
  netWeightKg: number;
  netWeightQuintaux: number;
  unitPriceDzdPerKg: number;
  subtotalProduceDzd: number;
  totalGrossDzd?: number;
  mandataireFeePercent?: number;
  netFarmPayoutDzd?: number;
  cropVariety?: string;
  qualityGrade?: string;
  paymentMethod: AgriSalePaymentMethod;
  timbreFiscalDzd: number;
  totalAmountDzd: number;
  paidAmountDzd: number;
  remainingDueDzd: number;
  destinationWholesaleMarket: string;
  destinationStorage?: string;
  date: string;
  harvestDate?: string;
  version?: number;
  createdAt: string;
}

// Backwards-compatibility alias
export type AgriHarvestTicket = AgriWeighbridgeTicket;
export type AgriLivestock = AgriDairyCow;

// ==========================================
// DUAL-ROLE (OWNER / STAFF) RBAC & WORKSPACE TYPES
// Categories: membership_session, appointment_service, pos_inventory, education_cohort
// ==========================================

export type StandardRole = 'owner' | 'staff';

export interface MemberCheckInLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  timestamp: string;
  accessStatus: 'Granted' | 'Warning_Expiring' | 'Denied_Expired' | 'Denied_Frozen';
  remainingSessionsBefore?: number;
  remainingSessionsAfter?: number;
  checkInMethod: 'barcode_scanner' | 'manual_click' | 'nfc_card';
  overrideByStaffId?: string;
  overrideReason?: string;
  version?: number;
}

export interface WalkInTicket {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  ticketNumber: string; // e.g. "WI-2026-0041"
  clientName: string;
  phone?: string;
  amountDzd: number;
  paymentMethod: 'cash' | 'baridimob' | 'cib';
  timbreFiscalDzd: number;
  issuedAt: string;
  version?: number;
}

export type SalonChairStage = 'waiting' | 'in_progress' | 'completed' | 'paid';

export interface SalonChairStation {
  workstationId: string;
  workstationName: string;
  currentStylistId?: string;
  currentStylistName?: string;
  currentAppointmentId?: string;
  clientName?: string;
  serviceId?: string;
  serviceName?: string;
  servicePriceDzd?: number;
  servicePriceCentimes?: number;
  stage: SalonChairStage;
  startTime?: string;
  elapsedMinutes?: number;
  version?: number;
}

export interface EduQuickAttendanceRecord {
  sessionId: string;
  cohortId: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedAt: string;
  markedByStaffId: string;
  isLocked: boolean;
}

export interface PosCashSession {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId: string;
  staffId?: string;
  openedByStaffId?: string;
  openedByName: string;
  closedByStaffId?: string;
  closedByName?: string;
  openedAt: string;
  closedAt?: string;
  openingFloatCentimes: number;
  expectedCashCentimes: number;
  actualCashCentimes?: number;
  varianceCentimes: number;
  variancePinVerified?: boolean;
  varianceVerifiedByStaffId?: string;
  status: 'open' | 'closed';
  notes?: string;
  version?: number;
}

export interface PosCashMovement {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId: string;
  staffId?: string;
  sessionId?: string;
  reference: string;
  payee: string;
  category: 'Supplies' | 'Supplier' | 'Maintenance' | 'Transport' | 'StaffMeal' | 'FloatIn' | 'Other';
  paymentMethod: 'Cash' | 'Card' | 'BaridiMob';
  direction: 'in' | 'out';
  amountCentimes: number;
  paidBy: string;
  notes?: string;
  occurredAt: string;
  version?: number;
}

export interface PosZReport {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId: string;
  sessionId?: string;
  zNumber?: string | null;
  localCloseRef: string;
  status: 'finalized' | 'provisional_pending_sync' | 'drift_flagged';
  businessDate: string;
  closedByStaffId?: string;
  closedByName: string;
  openingFloatCentimes: number;
  cashSalesCentimes: number;
  cardSalesCentimes: number;
  baridimobSalesCentimes: number;
  refundsTotalCentimes: number;
  cashInCentimes: number;
  cashOutCentimes: number;
  expectedCashCentimes: number;
  actualCashCentimes: number;
  varianceCentimes: number;
  variancePinVerified: boolean;
  closedAt: string;
  finalizedAt?: string;
  driftDetected?: boolean;
  driftDetails?: string;
  reprintedCount: number;
  notes?: string;
  version?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFORCE ERP: ATTENDANCE, SALARY ADVANCES & STATUTORY PAYROLL
// ─────────────────────────────────────────────────────────────────────────────

export type StaffAttendanceDayStatus =
  | 'present'
  | 'late'
  | 'half_day'
  | 'absent_justified'
  | 'absent_unjustified'
  | 'vacation'
  | 'rest';

export interface StaffAttendanceLogRecord {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId: string;
  staffName: string;
  staffRole?: string;
  timestamp: string; // ISO datetime
  date: string; // YYYY-MM-DD
  type: 'in' | 'out';
  method: 'rfid' | 'pin' | 'kiosk' | 'manual';
  source?: 'rfid' | 'pin' | 'kiosk' | 'manual';
  enteredBy?: string;
  enteredByName?: string;
  terminalId?: string;
  notes?: string;
  lateMinutes?: number;
  version?: number;
}

export interface StaffWeeklyAttendanceDay {
  date: string; // YYYY-MM-DD
  dayLabel: string; // Sam, Dim, Lun, Mar, Mer, Jeu, Ven
  status: StaffAttendanceDayStatus;
  hoursWorked: number;
  lateMinutes?: number;
  overtimeHours?: number;
}

export interface StaffWeeklyAttendance {
  staffId: string;
  staffName: string;
  role: string;
  weekStartDate: string; // YYYY-MM-DD (Saturday)
  days: Record<string, StaffWeeklyAttendanceDay>; // key is YYYY-MM-DD
  totalHoursWorked: number;
  totalLateMinutes: number;
  totalOvertimeHours: number;
  isValidatedByManager?: boolean;
}

export interface StaffSalaryAdvance {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId: string;
  staffName: string;
  amountDzd: number;
  dateIssued: string; // YYYY-MM-DD
  paymentMethod: 'cash' | 'ccp' | 'bank_transfer';
  reason?: string;
  voucherNumber: string;
  status: 'pending' | 'deducted' | 'waived';
  deductedInPeriod?: string; // e.g. "2026-11"
  version?: number;
}

export interface StatutoryRateSnapshot {
  versionId: string;
  versionCode: string;
  effectiveFrom: string | null;
  verificationStatus: 'unverified' | 'verified' | 'superseded';
  cnasSalarialRate: number | null;
  cnasPatronalRate: number | null;
  irgBrackets: Array<{ min_dzd: number; max_dzd: number | null; rate: number }> | null;
  irgAbatementRate: number | null;
  irgAbatementMinDzd: number | null;
  irgAbatementMaxDzd: number | null;
  irgExemptionThresholdDzd: number | null;
  irgTransitionalMaxDzd: number | null;
  irgTransitionalConfig: Record<string, unknown> | null;
  snmgDzd: number | null;
  overtimeMultiplier50: number | null;
  overtimeMultiplier100: number | null;
}

export interface StaffPayrollSlipRecord {
  id: string;
  payrollRunId: string;
  staffId: string;
  matricule: string;
  staffFullName: string;
  role: string;
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  baseSalary: number;
  actualBaseSalary: number;
  workedDays: number;
  standardDays: number;
  coachingCommission?: number;
  primesCotisables: Array<{ label: string; amount: number }>;
  salaireBrutCotisable: number;
  cnasSalarial: number; // 9%
  cnasPatronal: number; // 26%
  salaireBrutImposable: number;
  irgTax: number;
  primesNonImposables: Array<{ label: string; amount: number }>;
  acomptesDeduits: number;
  advanceCarryover?: number;
  autresRetenues: number;
  netAPayer: number;
  paymentMethod: 'cash' | 'ccp' | 'bank_transfer';
  ccpNumber?: string;
  ccpKey?: string;
  bankRib?: string;
  nss?: string;
  isPaid: boolean;
  paidDate?: string;
  receiptNumber: string;
  rateSetId?: string | null;
  rateBasis?: 'legacy' | 'versioned';
  rateSnapshot?: StatutoryRateSnapshot | null;
  version?: number;
}

export interface StaffPayrollRunRecord {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  category?: string;
  periodMonth: number;
  periodYear: number;
  title: string;
  status: 'draft' | 'approved' | 'paid';
  runType?: 'regular' | 'adjustment';
  adjustmentSeq?: number;
  rateSetId?: string | null;
  rateBasis?: 'legacy' | 'versioned';
  rateSnapshot?: StatutoryRateSnapshot | null;
  totalGrossCotisable: number;
  totalCnasSalarial: number;
  totalCnasPatronal: number;
  totalIrg: number;
  totalNet: number;
  slipsCount: number;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string | null;
  version?: number;
}

// ============================================================================
// PER-CATEGORY CONFIGURATION, FISCAL RULES, FORMULES & HOME SETUP ENGINE
// ============================================================================

export type SettingsTabId =
  | 'preferences'
  | 'business_fiscal'
  | 'formules'
  | 'reference_rates'
  | 'reminders'
  | 'data_import'
  | 'security_rbac'
  | 'platform_governance'
  | 'branches_devices'
  | 'license'
  | 'cloud_backup';

export interface FiscalProfile {
  companyLegalName?: string;
  address?: string;
  phone?: string;
  email?: string;
  ribCcp?: string;
  nif?: string; // Numéro d'Identification Fiscale (15 digits)
  nis?: string; // Numéro d'Identification Statistique
  rc?: string; // Registre du Commerce
  ai?: string; // Article d'Imposition
  ifu?: string; // Impôt Forfaitaire Unique (Auto-entrepreneur / solo / TPE)
  licenseNumber?: string; // CNOM / N° Ordre / Barreau / Carte Pro / CACOBATPH / ANRH
  licenseLabel?: string;
  legalForm?: 'SARL' | 'EURL' | 'SPA' | 'SNC' | 'AutoEntrepreneur' | 'Liberal' | 'PersonnePhysique';
  wilayaCode?: string;
  ccp?: string;
  rib?: string;
}

export interface OnboardingContext {
  primaryFrustration?:
    | 'manual_tracking'
    | 'lost_revenue'
    | 'staff_coordination'
    | 'compliance_invoicing'
    | 'scheduling'
    | 'inventory'
    | 'billing_creep'
    | 'postal_payments'
    | 'paper_records'
    | 'commercial_invoicing';
  selectedGoalId?: string;
  dailyWorkflow?: 'walkin_pos' | 'appointment_schedule' | 'membership_turnstile' | 'project_deliverables' | 'patient_queue' | 'wholesale_dispatch';
  teamScale?: 'solo' | 'small' | 'mid' | 'large';
  settlementStyle?: 'pos_cash' | 'b2b_tva' | 'ccp_postal' | 'recurring_retainer';
  selectedTradeId?: string;
  referralSource?: string;
  wilayaCode?: string;
  capturedAt?: string;
}

export interface CategorySpecificSettings {
  // 1. membership_session
  rfidExpiryWarningDays?: number;
  maxFreezeDaysPerYear?: number;
  defaultDayPassDzd?: number;
  studioCapacity?: number;
  // 2. appointment_service
  defaultCommissionPercent?: number;
  slotIntervalMinutes?: 15 | 30 | 60;
  cancellationWindowHours?: number;
  // 3. pos_inventory
  openingCashFloatDzd?: number;
  lowStockThreshold?: number;
  allowNegativeStock?: boolean;
  // 4. project_milestone
  directionApprovalThresholdDzd?: number;
  targetMarginPercent?: number;
  requireBatBeforePrint?: boolean;
  // 5. rental_booking
  defaultSecurityDepositPercent?: number;
  turnoverBufferHours?: number;
  overtimeHourlyFeeDzd?: number;
  // 6. education_cohort
  registrationFeeDzd?: number;
  passingGradeOutOf20?: number;
  minAttendancePercentForCertificate?: number;
  // 7. freelance_solo
  defaultHourlyRate?: number;
  taxReservePercent?: number;
  invoicePaymentTermsDays?: number;
  // 8. trading_commercial
  defaultCreditLimitDzd?: number;
  defaultNetDays?: number;
  requireLegalIdsOnFacture?: boolean;
  // 9. medical_clinic
  cnasChifaEnabled?: boolean;
  ordonnancePaperSize?: 'A4' | 'A5';
  queueTicketPrefix?: string;
  // 10. auto_garage
  workshopHourlyRateDzd?: number;
  warrantyDays?: number;
  warrantyKm?: number;
  // 11. real_estate
  defaultAgencyManagementFeePercent?: number;
  defaultSaleCommissionPercent?: number;
  quittanceBillingDay?: number;
  // 12. manufacturing_production
  overheadPercent?: number;
  scrapTolerancePercent?: number;
  batchCodePrefix?: string;
  // 13. legal_accounting
  legalPracticeMode?: 'Avocat' | 'Notaire' | 'Comptable';
  cpcaAlertDays?: number;
  defaultRetainerPercent?: number;
  // 14. logistics_delivery
  codRemittanceFeePercent?: number;
  baseWeightThresholdKg?: number;
  parcelTrackingPrefix?: string;
  // 15. construction_contractor
  retenueGarantiePercent?: number;
  avanceForfaitairePercent?: number;
  defaultSituationsUnit?: 'm2' | 'm3' | 'ml' | 'forfait';
  // 16. agriculture_farming
  waterQuotaM3PerHa?: number;
  onilMilkPricePerLiterDzd?: number;
  onilSubsidyPerLiterDzd?: number;
}

export interface HomeSetupState {
  dismissed?: boolean;
  dismissedAt?: string;
  completedStepIds?: string[];
}

export interface BusinessCategoryConfig {
  id: string;
  accountId?: string;
  businessId: string;
  branchId?: string;
  category: BusinessCategory;
  currency: CurrencyCode;
  defaultTvaRate: number; // 0, 9, or 19
  applyTimbreFiscal: boolean;
  fiscalProfile: FiscalProfile;
  onboardingContext: OnboardingContext;
  categorySettings: CategorySpecificSettings;
  setupState: HomeSetupState;
  accountingPeriodClosedMonths?: string[];
  invoiceFooter?: string;
  systemLanguage?: SupportedLanguage;
  version?: number;
  updatedAt?: string;
}

export type CategoryFormuleType =
  | 'membership_plan'
  | 'salon_service'
  | 'pos_combo'
  | 'agency_retainer'
  | 'venue_addon'
  | 'tuition_installment'
  | 'freelance_package'
  | 'wholesale_tier'
  | 'medical_act'
  | 'garage_pack'
  | 'realestate_commission'
  | 'mfg_preset'
  | 'legal_honoraire'
  | 'courier_tier'
  | 'btp_boq_rate'
  | 'agri_piecework';

export type FormuleDurationUnit = 'minutes' | 'hours' | 'days' | 'months' | 'sessions' | 'unit';

export interface CategoryFormule {
  id: string;
  accountId?: string;
  businessId: string;
  branchId?: string;
  category: BusinessCategory;
  formuleType: CategoryFormuleType;
  code?: string;
  name: string;
  description?: string;
  priceAmount: number;
  ratePercent: number;
  durationValue: number;
  durationUnit: FormuleDurationUnit;
  currency: CurrencyCode;
  taxRate: number;
  metadata?: Record<string, any>;
  isActive: boolean;
  sortOrder?: number;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeDailyActivityItem {
  id: string;
  timestamp: string;
  displayTime: string;
  title: string;
  subtitle: string;
  actorOrClient: string;
  filterKey: string;
  filterLabel: string;
  statusLabel: string;
  tone: 'neutral' | 'emerald' | 'amber' | 'rose' | 'brand';
  amountText?: string;
  secondaryDetail?: string;
  locationOrRef?: string;
  targetScreen?: string;
  targetActionLabel?: string;
}

export interface HomeSetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  targetTab: SettingsTabId;
  targetSection?: string;
  actionLabel: string;
  modalId?: string;
}

export interface HomeSetupProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
  isComplete: boolean;
  isDismissed: boolean;
  steps: HomeSetupStep[];
}

// ============================================================
// PHASE 2 (6.1 & 6.2): UNIFIED INVOICING ENGINE & PAYMENTS LEDGER
// ============================================================

export type UnifiedDocType =
  | 'devis'
  | 'commande'
  | 'bl'
  | 'facture'
  | 'avoir'
  | 'retour'
  | 'receipt'
  | 'proforma';

export type UnifiedDocStatus =
  | 'Draft'
  | 'Issued'
  | 'PartiallyPaid'
  | 'Paid'
  | 'Delivered'
  | 'Voided'
  | 'Canceled';

export type UnifiedCurrency = 'DZD' | 'EUR' | 'USD';

export type TimbreCalculationBasis = 'commercial_cash' | 'art_317' | 'exempt';

export type UnifiedPaymentMethod =
  | 'cash'
  | 'ccp'
  | 'bank_transfer'
  | 'cib'
  | 'baridimob'
  | 'cheque'
  | 'traite'
  | 'member_balance'
  | 'credit';

export type ChequeInstrumentStatus = 'received' | 'deposited' | 'cleared' | 'bounced';

export interface UnifiedTvaBreakdownEntry {
  ratePercent: number;
  baseHtCentimes: number;
  tvaCentimes: number;
}

export interface UnifiedFiscalHeaderSnapshot {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  ribCcp?: string;
  logoUrl?: string;
  footerNote?: string;
  templateLanguage?: 'fr' | 'ar' | 'en';
}

export interface UnifiedDocumentLine {
  id: string;
  productId?: string;
  description: string;
  isService: boolean;
  quantity: number;
  unit: string;
  unitPriceHt: number;
  tvaPercent: number;
  discountPercent?: number;
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
}

export interface UnifiedDocument {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  sourceVertical: string;
  docType: UnifiedDocType;
  draftNumber: string;
  docNumber: string | null;
  fiscalYear: number;
  status: UnifiedDocStatus;
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
  docDate: string;
  dueDate?: string;
  validityDays?: number;
  paymentMethod: UnifiedPaymentMethod | string;
  paymentTerms: string;
  currency: UnifiedCurrency;
  fxRate: number;
  fxRateDate: string;
  timbreBasis: TimbreCalculationBasis;
  rateSetId?: string | null;
  items: UnifiedDocumentLine[];
  tvaBreakdown: UnifiedTvaBreakdownEntry[];
  totalHtRawCentimes: number;
  generalDiscountPercent: number;
  totalHtFinalCentimes: number;
  totalTvaCentimes: number;
  timbreFiscalCentimes: number;
  totalTtcCentimes: number;
  guaranteeRetentionPercent: number;
  guaranteeRetentionCentimes: number;
  netToPayCentimes: number;
  paidCentimes: number;
  balanceDueCentimes: number;
  fiscalHeaderSnapshot: UnifiedFiscalHeaderSnapshot;
  totalsInWordsFr: string;
  totalsInWordsAr: string;
  includeStampSignature: boolean;
  notesTop?: string;
  notesBottom?: string;
  linkedDocId?: string;
  linkedDocNumber?: string;
  creditNoteForDocId?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  issuedAt?: string;
  issuedByStaffId?: string;
  voidedAt?: string;
  voidedReason?: string;
  printedCount: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedPaymentAllocation {
  id: string;
  paymentId: string;
  documentId: string;
  documentNumber?: string;
  allocatedCentimes: number;
  createdAt: string;
}

export interface UnifiedPayment {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  sourceVertical: string;
  partyId?: string;
  partyName: string;
  paymentNumber: string;
  method: UnifiedPaymentMethod;
  direction: 'inflow' | 'outflow';
  amountCentimes: number;
  unallocatedCreditCentimes: number;
  currency: UnifiedCurrency;
  fxRate: number;
  paymentDate: string;
  recordedByStaffId?: string;
  cashSessionId?: string;
  idempotencyKey?: string;
  status: 'posted' | 'pending_clearance' | 'bounced' | 'reversed';
  instrumentStatus?: ChequeInstrumentStatus;
  instrumentNumber?: string;
  instrumentBank?: string;
  instrumentDueDate?: string;
  bouncedReason?: string;
  reversedPaymentId?: string;
  reversalReason?: string;
  notes?: string;
  allocations: UnifiedPaymentAllocation[];
  version?: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PHASE 2 SECTION 6.3: SHARED ACCOUNTING LAYER (SCF LOI 07-11)
// ==========================================
export type ScfJournalCode = 'VE' | 'AC' | 'BQ' | 'CA' | 'PA' | 'ST' | 'OD';

export type ScfAccountClass = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ScfAccountType = 'asset' | 'liability' | 'equity' | 'expense' | 'revenue';

export type ScfPostingEventType =
  | 'sale_invoice'
  | 'pos_sale'
  | 'purchase_receipt'
  | 'payment'
  | 'instrument_clear'
  | 'instrument_bounce'
  | 'payroll_run'
  | 'stock_movement'
  | 'legal_scf'
  | 'reversal'
  | 'manual';

export interface ScfAccount {
  id: string;
  accountId: string;
  businessId: string;
  code: string;
  labelFr: string;
  labelAr: string;
  labelEn: string;
  scfClass: ScfAccountClass;
  normalBalance: 'debit' | 'credit';
  accountType: ScfAccountType;
  isReconcilable: boolean;
  isSystem: boolean;
  isActive: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScfAccountingPeriod {
  id: string;
  accountId: string;
  businessId: string;
  periodKey: string; // YYYY-MM
  fiscalYear: number;
  periodMonth: number;
  status: 'open' | 'closed';
  closedAt?: string;
  closedByStaffId?: string;
  reopenedAt?: string;
  reopenedByStaffId?: string;
  reopenReason?: string;
  version?: number;
  updatedAt?: string;
}

export interface ScfJournalLine {
  id: string;
  lineNo: number;
  accountCode: string;
  accountLabel: string;
  partyId?: string;
  partyName?: string;
  debitCentimes: number;
  creditCentimes: number;
  originalCurrency: UnifiedCurrency;
  originalAmountCentimes: number;
  fxRate: number;
  reconciled: boolean;
  reconciledAt?: string;
  reconciliationRef?: string;
  statementDate?: string;
}

export interface ScfJournalEntry {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  entryNumber: string;
  journalCode: ScfJournalCode;
  entryDate: string; // YYYY-MM-DD
  periodKey: string; // YYYY-MM
  fiscalYear: number;
  pieceRef: string;
  libelle: string;
  sourceVertical: string;
  sourceEventType: ScfPostingEventType;
  sourceDocId?: string;
  idempotencyKey?: string;
  currency: UnifiedCurrency;
  fxRate: number;
  totalDebitCentimes: number;
  totalCreditCentimes: number;
  lines: ScfJournalLine[];
  status: 'posted' | 'reversed';
  reversedEntryId?: string;
  reversalReason?: string;
  postedByStaffId?: string;
  postedAt: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScfPostingFailure {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  sourceVertical: string;
  sourceEventType: ScfPostingEventType;
  sourceDocId?: string;
  sourceRef: string;
  entryDate: string;
  payload: Record<string, any>;
  errorCode: string;
  errorMessage: string;
  status: 'pending' | 'resolved' | 'dismissed';
  attempts: number;
  lastAttemptAt: string;
  resolvedEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PHASE 2 SECTION 6.4: UNIFIED CRM & COMMUNICATION (PARTY MASTER & 360)
// ============================================================================

export type CrmPartyKind = 'person' | 'company';

export type CrmChannel = 'sms' | 'whatsapp' | 'email';

export type CrmTaskChannel = 'in_app' | 'sms' | 'whatsapp' | 'email' | 'call';

export type CrmTaskStatus = 'open' | 'done' | 'snoozed' | 'cancelled';

export type CrmCommunicationStatus = 'queued' | 'sent' | 'failed' | 'blocked_opt_out';

export type CrmLinkEntityType =
  | 'member'
  | 'lead'
  | 'b2b_client'
  | 'b2b_supplier'
  | 'patient'
  | 'renter'
  | 'student'
  | 'freelance_client'
  | 'appointment_client'
  | 'owner'
  | 'merchant';

export interface CrmParty {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  partyKind: CrmPartyKind;
  displayName: string;
  phoneRaw?: string;
  phoneE164?: string;
  phoneLocal?: string;
  phoneValid: boolean;
  sharedPhoneGroup?: boolean;
  email?: string;
  nif?: string;
  rc?: string;
  nis?: string;
  ai?: string;
  address?: string;
  wilayaCode?: string;
  preferredLanguage: 'en' | 'fr' | 'ar';
  consentSms: boolean;
  consentWhatsapp: boolean;
  consentEmail: boolean;
  optOutAll: boolean;
  optOutReason?: string;
  optOutAt?: string;
  mergedIntoPartyId?: string;
  mergedAt?: string;
  mergedByStaffId?: string;
  notes?: string;
  tags?: string[];
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CrmPartyLink {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  partyId: string;
  sourceVertical: string;
  entityType: CrmLinkEntityType;
  entityId: string;
  entityLabel?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CrmPartyNote {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  partyId: string;
  sourceVertical?: string;
  authorStaffId?: string;
  authorName?: string;
  noteType: 'note' | 'call' | 'visit' | 'incident';
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CrmFollowUpTask {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  partyId: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  title: string;
  description?: string;
  channel: CrmTaskChannel;
  dueAt: string;
  status: CrmTaskStatus;
  completedAt?: string;
  createdByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CrmMessageTemplate {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  code: string;
  channel: CrmChannel;
  name: string;
  subjectFr?: string;
  subjectAr?: string;
  subjectEn?: string;
  bodyFr: string;
  bodyAr: string;
  bodyEn: string;
  variables: string[];
  isSystem?: boolean;
  isActive: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CrmCommunicationLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  partyId: string;
  templateId?: string;
  channel: CrmChannel;
  recipientAddress: string;
  language: 'en' | 'fr' | 'ar';
  subject?: string;
  renderedBody: string;
  missingVariables: string[];
  status: CrmCommunicationStatus;
  providerName?: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  lastAttemptAt: string;
  sentAt?: string;
  sentByStaffId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================================================
// PHASE 2 SECTION 6.5: REMINDER & NOTIFICATION ENGINE
// ============================================================================

export type ReminderEventType =
  | 'membership_expiring'
  | 'invoice_overdue'
  | 'installment_due'
  | 'rent_due'
  | 'appointment_tomorrow'
  | 'low_stock'
  | 'expiry_date'
  | 'service_due'
  | 'dar_lockout'
  | 'cheque_due'
  | 'deadline_cpca'
  | 'contract_expiry'
  | 'vehicle_documents_expiry';

export type ReminderChannel = 'in_app' | 'sms' | 'whatsapp' | 'email';

export type ReminderDeliveryStatus =
  | 'scheduled'
  | 'sent'
  | 'deferred_quiet_hours'
  | 'blocked_opt_out'
  | 'failed'
  | 'skipped_duplicate';

export interface ReminderQuietHoursConfig {
  id: string;
  accountId: string;
  businessId: string;
  enabled: boolean;
  startTime: string; // HH:mm e.g. '21:00'
  endTime: string;   // HH:mm e.g. '08:00'
  timezone: string;  // e.g. 'Africa/Algiers'
  allowInAppDuringQuiet: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ReminderRule {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  eventType: ReminderEventType;
  name: string;
  isEnabled: boolean;
  leadDays: number;
  channels: ReminderChannel[];
  templateId?: string;
  respectQuietHours: boolean;
  cooldownHours: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ReminderDeliveryLog {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  ruleId?: string;
  eventType: ReminderEventType;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  partyId?: string;
  channel: ReminderChannel;
  idempotencyKey: string;
  status: ReminderDeliveryStatus;
  scheduledFor?: string;
  deliveredAt?: string;
  title: string;
  message: string;
  crmCommLogId?: string;
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================================================
// PHASE 2 SECTION 6.6: SHARED INVENTORY / WMS SERVICES
// ============================================================================

export type WmsNegativeStockPolicy = 'block' | 'warn' | 'allow';
export type WmsLotRecallStatus = 'active' | 'quarantined' | 'recalled' | 'expired';
export type WmsSerialStatus = 'in_stock' | 'reserved' | 'sold' | 'returned' | 'damaged' | 'recalled';
export type WmsCycleCountStatus = 'open' | 'counting' | 'posted' | 'cancelled';
export type WmsTransferStatus = 'draft' | 'in_transit' | 'received' | 'partial' | 'cancelled';
export type WmsLandedCostMethod = 'by_value' | 'by_quantity';
export type WmsConsignmentMovementType = 'issued' | 'returned' | 'lost_charged';

export interface WmsBin {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  warehouseId: string;
  code: string;
  name: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  isDefault: boolean;
  capacityUnits?: number;
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsStockLot {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  warehouseId?: string;
  binId?: string;
  productId: string;
  productName: string;
  sku?: string;
  lotNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  qtyOnHand: number;
  qtyReserved: number;
  unitCostCentimes: number;
  recallStatus: WmsLotRecallStatus;
  recallReason?: string;
  supplierName?: string;
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsSerialNumber {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  warehouseId?: string;
  binId?: string;
  lotId?: string;
  productId: string;
  productName: string;
  serialNumber: string;
  status: WmsSerialStatus;
  sourceDocId?: string;
  saleId?: string;
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsUnitConversion {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  productId?: string;
  productName?: string;
  fromUnit: string;
  toBaseUnit: string;
  conversionFactor: number;
  barcode?: string;
  isDefaultPurchase: boolean;
  isDefaultSale: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsReorderRule {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  warehouseId?: string;
  productId: string;
  productName: string;
  minQty: number;
  maxQty: number;
  reorderQty: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  leadTimeDays: number;
  isActive: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsCycleCountLine {
  id: string;
  cycleCountId: string;
  productId: string;
  productName: string;
  lotId?: string;
  lotNumber?: string;
  binId?: string;
  systemQty: number;
  activeSalesDeltaQty: number;
  countedQty: number;
  varianceQty: number;
  unitCostCentimes: number;
  varianceCentimes: number;
  reason?: string;
}

export interface WmsCycleCount {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  warehouseId?: string;
  countNumber: string;
  status: WmsCycleCountStatus;
  startedAt: string;
  postedAt?: string;
  countedByStaffId?: string;
  countedByName?: string;
  snapshotTakenAt: string;
  totalVarianceUnits: number;
  totalVarianceCentimes: number;
  lines: WmsCycleCountLine[];
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsStockTransferItem {
  productId: string;
  productName: string;
  sku?: string;
  lotId?: string;
  lotNumber?: string;
  quantity: number;
  receivedQuantity?: number;
  unit?: string;
  unitCostCentimes?: number;
}

export interface WmsStockTransfer {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  transferNumber: string;
  fromWarehouseId?: string;
  fromWarehouseName?: string;
  toWarehouseId?: string;
  toWarehouseName?: string;
  status: WmsTransferStatus;
  dispatchedAt?: string;
  receivedAt?: string;
  carrierName?: string;
  items: WmsStockTransferItem[];
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsLandedCostLine {
  productId: string;
  productName: string;
  lotId?: string;
  lotNumber?: string;
  quantity: number;
  baseUnitCostCentimes: number;
  allocatedExtraCentimes: number;
  newUnitCostCentimes: number;
}

export interface WmsLandedCostAllocation {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  purchaseDocId?: string;
  referenceNumber: string;
  allocationMethod: WmsLandedCostMethod;
  currency: string;
  fxRate: number;
  freightCentimes: number;
  customsCentimes: number;
  insuranceCentimes: number;
  otherCentimes: number;
  totalLandedCentimes: number;
  lines: WmsLandedCostLine[];
  status: 'draft' | 'applied';
  appliedAt?: string;
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface WmsConsignmentEntry {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  partyId?: string;
  partyName: string;
  packagingCode: string;
  packagingName: string;
  movementType: WmsConsignmentMovementType;
  quantity: number;
  unitDepositCentimes: number;
  totalDepositCentimes: number;
  referenceDoc?: string;
  movementDate: string;
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================================================
// PHASE 2 SECTION 6.7: CSV / EXCEL IMPORT & ONBOARDING DATA TOOLS
// ============================================================================

export type ImportEntityType =
  | 'members'
  | 'clients'
  | 'patients'
  | 'products'
  | 'suppliers'
  | 'staff'
  | 'vehicles'
  | 'parcels'
  | 'properties'
  | 'students';

export type ImportEncoding = 'auto' | 'utf-8' | 'utf-16le' | 'windows-1256' | 'iso-8859-1';
export type ImportDelimiter = 'auto' | ',' | ';' | '\t';
export type ImportDuplicatePolicy = 'skip' | 'update' | 'merge';
export type ImportJobStatus =
  | 'previewed'
  | 'dry_run'
  | 'committing'
  | 'committed'
  | 'rolled_back'
  | 'partial_failed'
  | 'failed';

export interface ImportRowError {
  rowNumber: number; // 1-indexed data row (excluding header)
  column?: string;
  errorCode: string;
  messageEn: string;
  messageFr: string;
  messageAr: string;
  rawValue?: string;
}

export interface ImportColumnMapping {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  entityType: ImportEntityType;
  templateName: string;
  encoding: ImportEncoding;
  delimiter: ImportDelimiter;
  duplicatePolicy: ImportDuplicatePolicy;
  columnMap: Record<string, string>; // sourceHeader -> targetFieldKey
  createdByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ImportJob {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  entityType: ImportEntityType;
  mappingId?: string;
  fileName: string;
  encoding: ImportEncoding;
  delimiter: ImportDelimiter;
  duplicatePolicy: ImportDuplicatePolicy;
  status: ImportJobStatus;
  totalRows: number;
  validRows: number;
  insertedRows: number;
  updatedRows: number;
  mergedRows: number;
  skippedRows: number;
  errorRows: number;
  chunkSize: number;
  chunksTotal: number;
  chunksCommitted: number;
  errorSummary: ImportRowError[];
  createdRecordIds: string[];
  startedAt: string;
  completedAt?: string;
  createdByStaffId?: string;
  createdByName?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================================================
// PHASE 2 SECTION 6.8: CONFIGURABLE RBAC, SECURITY POLICY & LAW 18-07 AID
// ============================================================================

export type RbacAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export type RbacResource =
  | 'dashboard'
  | 'members'
  | 'registrations'
  | 'shop'
  | 'scheduler'
  | 'finance'
  | 'history'
  | 'analytics'
  | 'staff'
  | 'settings'
  | 'medical_records'
  | 'legal_records'
  | 'wms'
  | 'data_import'
  | 'rbac'
  | 'data_protection';

export interface RbacPermissionRule {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  category: string;
  roleKey: string;
  resource: RbacResource;
  action: RbacAction;
  allowed: boolean;
  updatedByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SecurityWorkspacePolicy {
  id: string;
  accountId: string;
  businessId: string;
  owner2faEnabled: boolean;
  owner2faSecretMasked?: string;
  owner2faVerifier?: string;
  owner2faRecoveryHashes: string[];
  owner2faVerifiedAt?: string;
  sessionTimeoutMinutes: number;
  pinLockMaxAttempts: number;
  pinLockoutSeconds: number;
  requirePinOnIdle: boolean;
  logSensitiveReads: boolean;
  dataRetentionDays: number;
  law1807ReviewStatus: 'pending_counsel_review' | 'counsel_reviewed';
  counselReviewNotes?: string;
  updatedByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type DataConsentSubjectType =
  | 'member'
  | 'patient'
  | 'legal_client'
  | 'student'
  | 'customer'
  | 'staff'
  | 'party';

export type DataConsentStatus = 'granted' | 'withdrawn' | 'expired';

export interface DataProtectionConsent {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  subjectType: DataConsentSubjectType;
  subjectId: string;
  subjectName: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation';
  status: DataConsentStatus;
  consentMethod: 'signed_paper' | 'digital_pin' | 'portal_checkbox';
  capturedByStaffId?: string;
  grantedAt: string;
  withdrawnAt?: string;
  notes?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type DataSubjectRequestType = 'export' | 'erase' | 'rectify';
export type DataSubjectRequestStatus = 'requested' | 'exported' | 'erased' | 'rejected';

export interface DataSubjectRequest {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  subjectType: DataConsentSubjectType;
  subjectId: string;
  subjectName: string;
  requestType: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  requestedByStaffId?: string;
  processedByStaffId?: string;
  exportSummary?: Record<string, any> | null;
  reason?: string;
  processedAt?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SensitiveReadEvent {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string | null;
  actorStaffId?: string | null;
  targetTable: string;
  recordLabel: string;
  vertical: string;
  role: string;
  occurredAt: string;
}

export interface PinAttemptTracker {
  failedAttempts: number;
  firstFailedAtMs?: number;
  lockedUntilMs?: number;
}

export interface SessionLockState {
  isLocked: boolean;
  lockedReason?: 'idle_timeout' | 'manual_lock' | '2fa_required';
  lockedAt?: string;
  lastActivityAtMs: number;
}

// ============================================================================
// PHASE 2 SECTION 6.9: APPROVALS, ATTACHMENTS, CUSTOM FIELDS, API & WEBHOOKS
// ============================================================================

export type ApprovalActionScope =
  | 'discount'
  | 'refund'
  | 'expense'
  | 'payroll_release'
  | 'price_change';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PlatformApprovalRule {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  actionScope: ApprovalActionScope;
  ruleName: string;
  thresholdCentimes: number;
  thresholdPercent?: number | null;
  approverRoles: string[];
  requireDualControl: boolean;
  isActive: boolean;
  updatedByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PlatformApprovalRequest {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  ruleId?: string | null;
  actionScope: ApprovalActionScope;
  entityType: string;
  entityId: string;
  entityLabel: string;
  amountCentimes: number;
  percentDelta?: number | null;
  reason: string;
  status: ApprovalRequestStatus;
  requestedByStaffId?: string;
  requestedByName?: string;
  decidedByStaffId?: string;
  decidedByName?: string;
  decisionNote?: string;
  decidedAt?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type VirusScanStatus = 'pending' | 'clean' | 'quarantined';

export interface PlatformAttachmentRecord {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  bucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  virusScanStatus: VirusScanStatus;
  signedUrlToken?: string;
  signedUrlExpiresAt?: string;
  retentionDays: number;
  legalHold: boolean;
  eSignatureDataUrl?: string;
  customMetadata?: Record<string, any>;
  uploadedByStaffId?: string;
  purgedAt?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type PlatformCustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface PlatformCustomField {
  id: string;
  accountId: string;
  businessId: string;
  entityType: string;
  fieldKey: string;
  labelEn: string;
  labelFr: string;
  labelAr: string;
  fieldType: PlatformCustomFieldType;
  options: string[];
  isRequired: boolean;
  isActive: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type PrintTemplateDocType =
  | 'invoice'
  | 'quote'
  | 'receipt'
  | 'payslip'
  | 'credit_note'
  | 'report';

export interface PlatformPrintTemplate {
  id: string;
  accountId: string;
  businessId: string;
  docType: PrintTemplateDocType;
  headerNote?: string;
  footerNote?: string;
  accentColor: string;
  showQr: boolean;
  showStamp: boolean;
  showSignature: boolean;
  rtlMirrorLayout: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type PlatformApiScope =
  | 'invoices:read'
  | 'invoices:write'
  | 'payments:read'
  | 'crm:read'
  | 'crm:write'
  | 'wms:read'
  | 'bi:read'
  | 'approvals:read'
  | 'attachments:read';

export interface PlatformApiKey {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  label: string;
  keyPrefix: string;
  keyHash: string;
  scopes: PlatformApiScope[];
  rateLimitPerMinute: number;
  status: 'active' | 'revoked';
  expiresAt?: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type PlatformWebhookEventType =
  | 'invoice.issued'
  | 'payment.recorded'
  | 'approval.decided'
  | 'stock.low'
  | 'crm.party.merged'
  | 'attachment.uploaded'
  | 'dsr.processed';

export interface PlatformWebhook {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  label: string;
  endpointUrl: string;
  subscribedEvents: PlatformWebhookEventType[];
  signingSecretMasked: string;
  signingSecretHash: string;
  status: 'active' | 'paused';
  maxRetries: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'retrying' | 'dead_letter';

export interface PlatformWebhookDelivery {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  webhookId: string;
  eventType: PlatformWebhookEventType;
  idempotencyKey: string;
  payloadJson: Record<string, any>;
  signatureHeader: string;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  httpStatus?: number | null;
  responseSnippet?: string;
  nextRetryAt?: string;
  deliveredAt?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ==========================================
// PHASE 2 SECTION 6.10: UNIFIED BI KPI REGISTRY & CROSS-VERTICAL REPORTS
// ==========================================

export type BiKpiCategory =
  | 'revenue'
  | 'collections'
  | 'receivables'
  | 'inventory'
  | 'workforce'
  | 'operations';

export type BiKpiUnitType = 'centimes' | 'count' | 'percent' | 'days';

export type BiDateRangePreset = 'today' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

export type BiReportType =
  | 'executive_overview'
  | 'receivables_aging'
  | 'inventory_valuation'
  | 'workforce_payroll'
  | 'branch_comparison';

export interface BiKpiDefinition {
  id: string;
  accountId: string;
  businessId?: string;
  kpiCode: string;
  category: BiKpiCategory;
  labelEn: string;
  labelFr: string;
  labelAr: string;
  formulaSpec: string;
  unitType: BiKpiUnitType;
  sourceTables: string[];
  targetValue?: number | null;
  isActive: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface BiKpiEvaluation {
  kpiCode: string;
  category: BiKpiCategory;
  labelEn: string;
  labelFr: string;
  labelAr: string;
  formulaSpec: string;
  unitType: BiKpiUnitType;
  sourceTables: string[];
  currentValue: number;
  previousValue: number;
  deltaValue: number;
  deltaPercent: number;
  targetValue?: number | null;
  trend: 'up' | 'down' | 'flat';
}

export type BiAgingBucketKey = 'current' | '1_30' | '31_60' | '61_90' | '90_plus';

export interface BiAgingBucketSummary {
  bucket: BiAgingBucketKey;
  docCount: number;
  amountCentimes: number;
  sharePercent: number;
}

export interface BiBranchComparisonRow {
  branchId: string;
  branchName: string;
  branchCode: string;
  revenueCentimes: number;
  collectionsCentimes: number;
  receivablesCentimes: number;
  expensesCentimes: number;
  collectionRatePercent: number;
  activeDocumentsCount: number;
}

export interface BiSavedReport {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  title: string;
  reportType: BiReportType;
  kpiCodes: string[];
  dateRangePreset: BiDateRangePreset;
  comparePreviousPeriod: boolean;
  scheduleCron?: string;
  scheduleRecipients: string[];
  lastDispatchedAt?: string;
  createdByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface BiReportSnapshot {
  id: string;
  accountId: string;
  businessId: string;
  branchId?: string;
  reportId?: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
  metricsJson: Record<string, number>;
  branchBreakdownJson: BiBranchComparisonRow[];
  agingBucketsJson: BiAgingBucketSummary[];
  generatedByStaffId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface MembershipFreezePolicy {
  maxFreezeDaysPerCycle: number;
  defaultFreezeFeeCentimes: number;
  activeCheckInWindowMinutes: number;
  autoExtendExpiryOnResume: boolean;
}

export interface GymMemberFreezeLog {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  memberId: string;
  memberName?: string;
  staffId?: string;
  action: 'freeze' | 'resume';
  daysFrozen: number;
  feeCentimes: number;
  extendedExpiryTo?: string;
  duringActiveCheckInWindow: boolean;
  overrideReason?: string;
  recordedAt: string;
  version?: number;
}

export interface GymTrainerCommission {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId: string;
  staffName?: string;
  memberId?: string;
  scheduleEventId?: string;
  sourceLabel: string;
  grossAmountCentimes: number;
  commissionRateBps: number;
  commissionCentimes: number;
  status: 'pending' | 'posted_to_payroll' | 'cancelled';
  payrollRunId?: string;
  earnedDate: string;
  version?: number;
}

export type PosSubRole = 'waiter' | 'cashier' | 'kitchen';
export type PosOrderChannel = 'counter' | 'dine_in' | 'takeaway' | 'delivery';

export interface ProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  label: string; // e.g., "M / Black" or "42 / Blue"
  attributes?: Record<string, string>;
  priceDzd?: number;
  costDzd?: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductModifierOption {
  id: string;
  name: string;
  priceDeltaDzd: number;
}

export interface ProductModifierGroup {
  id: string;
  name: string;
  required?: boolean;
  multiSelect?: boolean;
  maxSelect?: number;
  options: ProductModifierOption[];
}

export interface ProductRecipeIngredient {
  ingredientProductId: string;
  ingredientName: string;
  quantityPerUnit: number;
  unit?: string;
}

export interface PosSelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDeltaDzd: number;
}

export interface PosFloorTable {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId: string;
  tableCode: string;
  label: string;
  zone: string;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrderId?: string;
  waiterStaffId?: string;
  waiterName?: string;
  notes?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosKitchenOrderItem {
  lineKey: string;
  productId: string;
  productName: string;
  quantity: number;
  baseUnitPriceDzd: number;
  modifiersUnitDeltaDzd: number;
  unitPriceDzd: number;
  lineTotalDzd: number;
  variantId?: string;
  variantLabel?: string;
  modifiers?: PosSelectedModifier[];
  weightKg?: number;
  pluCode?: string;
  notes?: string;
}

export interface PosKitchenOrderDelta {
  lineKey: string;
  productId: string;
  productName: string;
  changeType: 'added' | 'removed' | 'increased' | 'decreased';
  previousQty: number;
  newQty: number;
  deltaQty: number;
  variantLabel?: string;
  modifiersSummary?: string;
}

export interface PosKitchenOrder {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId: string;
  orderNumber: string;
  orderChannel: PosOrderChannel;
  tableId?: string;
  tableLabel?: string;
  waiterStaffId?: string;
  waiterName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryCourier?: string;
  deliveryFeeCentimes: number;
  kdsStatus: 'draft' | 'sent' | 'preparing' | 'ready' | 'served' | 'settled' | 'voided';
  revision: number;
  currentItems: PosKitchenOrderItem[];
  sentSnapshotItems: PosKitchenOrderItem[];
  deltaItems: PosKitchenOrderDelta[];
  discountCentimes: number;
  tipCentimes: number;
  subtotalCentimes: number;
  totalCentimes: number;
  settledSaleId?: string;
  voidReason?: string;
  voidPinVerified?: boolean;
  voidedByStaffId?: string;
  voidedAt?: string;
  notes?: string;
  sentAt?: string;
  readyAt?: string;
  servedAt?: string;
  settledAt?: string;
  version?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PosCustomerCreditEntry {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  entryType: 'charge' | 'repayment' | 'adjustment';
  amountCentimes: number;
  creditLimitCentimes: number;
  paymentMethod?: string;
  saleId?: string;
  unifiedPaymentId?: string;
  reference: string;
  notes?: string;
  recordedByStaffId?: string;
  recordedByName?: string;
  occurredAt: string;
  version?: number;
}

export interface PosOpticalPrescription {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  prescriberName?: string;
  prescribedAt: string;
  odSphere?: number;
  odCylinder?: number;
  odAxis?: number;
  odAdd?: number;
  osSphere?: number;
  osCylinder?: number;
  osAxis?: number;
  osAdd?: number;
  pdMm?: number;
  lensType?: string;
  frameModel?: string;
  labStatus: 'measured' | 'ordered_lab' | 'edging' | 'ready' | 'delivered';
  saleId?: string;
  notes?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}









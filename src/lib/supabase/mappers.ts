import type { Database, StaffRoleEnum } from './types';
import type {
  Account,
  Business,
  Branch,
  Device,
  Member,
  StaffMember,
  RegistrationLead,
  StaffRole,
  Appointment,
  Product,
  Sale,
  StaffAttendanceLogRecord,
  StaffSalaryAdvance,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
  BusinessCategoryConfig,
  CategoryFormule,
  BusinessCategory,
  CurrencyCode,
  CategoryFormuleType,
  FormuleDurationUnit,
} from '../../types/index';

type DbBusiness = Database['public']['Tables']['businesses']['Row'];
type DbBranch = Database['public']['Tables']['branches']['Row'];
type DbDevice = Database['public']['Tables']['devices']['Row'];

export const mapStaffRoleToDb = (role: StaffRole): StaffRoleEnum => {
  switch (role) {
    case 'Owner':
      return 'owner';
    case 'Manager':
      return 'manager';
    case 'Cashier':
      return 'cashier';
    case 'Technician':
      return 'technician';
    case 'Stylist':
      return 'stylist';
    case 'Waiter':
      return 'waiter';
    case 'AgencyDirector':
      return 'agency_director';
    case 'ProjectManager':
      return 'project_manager';
    case 'Creative':
      return 'creative';
    default:
      return 'staff';
  }
};

export const mapDbRoleToStaffRole = (dbRole: string): StaffRole => {
  switch ((dbRole || '').toLowerCase()) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'cashier':
      return 'Cashier';
    case 'technician':
      return 'Technician';
    case 'stylist':
      return 'Stylist';
    case 'waiter':
      return 'Waiter';
    case 'agency_director':
      return 'AgencyDirector';
    case 'project_manager':
      return 'ProjectManager';
    case 'creative':
      return 'Creative';
    default:
      return 'Staff';
  }
};

export const mapAccountFromDb = (row: any): Account => ({
  id: row.id,
  fullName: row.full_name || 'Account Owner',
  email: row.email,
  phone: row.phone_number || row.phone || undefined,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const mapBusinessFromDb = (
  row: Omit<DbBusiness, 'updated_at'> & { updated_at?: string; version?: number }
): Business => ({
  id: row.id,
  accountId: row.account_id,
  category: row.category,
  name: row.name,
  displayName: row.display_name || row.name,
  address: row.address || undefined,
  phone: row.phone || undefined,
  logoUrl: row.logo_url || undefined,
  isActive: row.is_active,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapBranchFromDb = (
  row: Omit<DbBranch, 'updated_at'> & { updated_at?: string; version?: number }
): Branch => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  name: row.name,
  code: row.code || 'BR-01',
  address: row.address || undefined,
  phone: row.phone || undefined,
  isMainBranch: row.is_main_branch,
  isActive: row.is_active,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapDeviceFromDb = (row: DbDevice): Device => ({
  id: row.id,
  accountId: row.account_id,
  branchId: row.branch_id,
  hardwareId: row.hardware_id,
  label: row.label || 'POS Terminal',
  isActive: row.is_active,
  lastSeenAt: row.last_seen_at || new Date().toISOString(),
  registeredAt: row.registered_at,
  version: (row as any).version != null ? Number((row as any).version) : undefined,
});

export const mapStaffFromDb = (row: any, facilityId?: string): StaffMember => {
  const role = mapDbRoleToStaffRole(String(row.role || 'staff'));
  const roleRankMap: Record<StaffRole, number> = {
    Owner: 8,
    Manager: 1,
    Cashier: 2,
    Technician: 3,
    Stylist: 7,
    Waiter: 4,
    Staff: 7,
    AgencyDirector: 20,
    ProjectManager: 10,
    Creative: 5,
  };

  return {
    id: row.id,
    accountId: row.account_id || row.tenant_id,
    businessId: row.business_id || undefined,
    branchId: row.branch_id || row.primary_facility_id || facilityId || undefined,
    tenantId: row.account_id || row.tenant_id,
    facilityId: facilityId || row.branch_id || row.primary_facility_id || '',
    fullName: row.full_name,
    email: row.email || '',
    phoneNumber: row.phone || '',
    role,
    roleRank: roleRankMap[role] ?? 7,
    isActive: row.is_active ?? true,
    hireDate: (row.created_at || new Date().toISOString()).split('T')[0],
    salary: Number(row.salary || 0),
    paymentDay: Number(row.payment_day || 1),
    ccpNumber: row.ccp_number || undefined,
    ccpKey: row.ccp_key || undefined,
    bankRib: row.bank_rib || undefined,
    paymentMethod: row.payment_method || 'cash',
    cardId: row.card_id || undefined,
    badgeToken: row.badge_token || undefined,
    status: row.status || 'active',
    pinCode: '****', // Server stores bcrypt pin_hash; client never hydrates plaintext PINs
    allowedModules: ['dashboard', 'members', 'registrations', 'shop', 'scheduler'],
    version: row.version != null ? Number(row.version) : undefined,
  };
};

export const mapMemberFromDb = (row: any): Member => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id || undefined,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  fullName: row.full_name,
  email: row.email || '',
  phoneNumber: row.phone_number || row.phone || '',
  cardId: row.card_id || row.rfid_tag || row.barcode || undefined,
  membershipPlanId: row.plan_id || undefined,
  membershipPlanName: row.plan_name || undefined,
  status: row.status || (row.is_active ? 'Active' : 'Expired'),
  startDate: row.start_date || (row.created_at || new Date().toISOString()).split('T')[0],
  expirationDate:
    row.expiration_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  remainingSessions: row.remaining_sessions !== undefined && row.remaining_sessions !== null ? Number(row.remaining_sessions) : 12,
  gender: row.gender || 'Other',
  notes: row.notes || undefined,
  emergencyContactName: row.emergency_contact_name || undefined,
  emergencyContactPhone: row.emergency_contact_phone || undefined,
  profileImageUrl: row.profile_image_url || row.photo_url || undefined,
  autoRenew: row.auto_renew !== undefined ? Boolean(row.auto_renew) : undefined,
  billingCycleDays: row.billing_cycle_days != null ? Number(row.billing_cycle_days) : undefined,
  familyGroupId: row.family_group_id || undefined,
  familyRole: row.family_role || undefined,
  frozenAt: row.frozen_at || undefined,
  freezeUntil: row.freeze_until || undefined,
  freezeDaysUsed: row.freeze_days_used != null ? Number(row.freeze_days_used) : undefined,
  freezeFeeCentimes: row.freeze_fee_centimes != null ? Number(row.freeze_fee_centimes) : undefined,
  freezeReason: row.freeze_reason || undefined,
  qrToken: row.qr_token || undefined,
  clientType: row.client_type || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
});

export const mapLeadFromDb = (row: any): RegistrationLead => {
  const p = (row.payload as any) || {};
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id || undefined,
    branchId: row.branch_id,
    staffId: row.staff_id || undefined,
    tenantId: row.account_id,
    facilityId: row.branch_id,
    fullName: row.full_name || p.fullName || p.full_name || 'Web Applicant',
    email: row.email || p.email || '',
    phoneNumber: row.phone_number || p.phoneNumber || p.phone || '',
    source: row.source || p.source || 'Web Form',
    status:
      row.status === 'Approved' || row.status === 'approved'
        ? 'Approved'
        : row.status === 'Declined' || row.status === 'declined'
        ? 'Declined'
        : 'Pending',
    notes: row.notes || p.notes,
    preferredPlanName: row.preferred_plan_name || p.preferredPlanName,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.requested_at || row.created_at,
    updatedAt: row.processed_at || row.updated_at || row.requested_at || row.created_at,
  };
};

export const mapAppointmentFromDb = (row: any): Appointment => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id || undefined,
  branchId: row.branch_id,
  staffId: row.stylist_id || row.staff_id || '',
  tenantId: row.account_id,
  facilityId: row.branch_id,
  clientId: row.client_id || '',
  clientName: row.client_name,
  clientPhone: row.client_phone || '',
  staffName: row.staff_name,
  serviceId: row.service_id || '',
  serviceName: row.service_name,
  date: row.appointment_date || row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  durationMinutes: Number(row.duration_minutes || 45),
  price: Number(row.price || 0),
  status: row.status || 'Confirmed',
  notes: row.notes || undefined,
  depositCentimes: row.deposit_centimes != null ? Number(row.deposit_centimes) : undefined,
  depositStatus: row.deposit_status || undefined,
  cancellationCutoffHours: row.cancellation_cutoff_hours != null ? Number(row.cancellation_cutoff_hours) : undefined,
  refundedDepositCentimes: row.refunded_deposit_centimes != null ? Number(row.refunded_deposit_centimes) : undefined,
  allergyOverrideConfirmed: Boolean(row.allergy_override_confirmed),
  bookingChannel: row.booking_channel || undefined,
  consumablesDeducted: Boolean(row.consumables_deducted),
  packageId: row.package_id || undefined,
  giftCardCode: row.gift_card_code || undefined,
  loyaltyPointsUsed: row.loyalty_points_used != null ? Number(row.loyalty_points_used) : undefined,
  loyaltyPointsEarned: row.loyalty_points_earned != null ? Number(row.loyalty_points_earned) : undefined,
  isPaid: row.is_paid !== undefined ? Boolean(row.is_paid) : undefined,
  paymentMethod: row.payment_method || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapProductFromDb = (row: any): Product => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id || undefined,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  name: row.name,
  description: row.description || '',
  price: { amount: Number(row.price_amount ?? row.price ?? 0), currency: 'DZD' },
  cost: { amount: Number(row.cost_amount ?? row.cost ?? 0), currency: 'DZD' },
  stockQuantity: Number(row.stock_quantity || 0),
  sku: row.sku || 'SKU-GEN',
  barcode: row.barcode || undefined,
  unit: row.unit || undefined,
  category: String(row.category || 'General'),
  imageUrl: row.image_url || undefined,
  reorderLevel: Number(row.reorder_level || 5),
  isActive: row.is_active ?? true,
  isPinned: Boolean(row.is_pinned),
  variants: Array.isArray(row.variants) ? row.variants : undefined,
  modifierGroups: Array.isArray(row.modifier_groups) ? row.modifier_groups : undefined,
  recipeBom: Array.isArray(row.recipe_bom) ? row.recipe_bom : undefined,
  isWeighted: row.is_weighted != null ? Boolean(row.is_weighted) : undefined,
  pluCode: row.plu_code || undefined,
  expiryDate: row.expiry_date || undefined,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapSaleFromDb = (row: any): Sale => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id || undefined,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  memberId: row.customer_id || row.member_id || undefined,
  memberName: row.customer_name || row.member_name || undefined,
  totalAmount: Number(row.total_amount || 0),
  tipAmount: row.tip_centimes != null ? Number(row.tip_centimes) / 100 : undefined,
  orderChannel: row.order_channel || undefined,
  tableId: row.table_id || undefined,
  tableLabel: row.table_label || undefined,
  deliveryAddress: row.delivery_address || undefined,
  deliveryCourier: row.delivery_courier || undefined,
  deliveryFee: row.delivery_fee_centimes != null ? Number(row.delivery_fee_centimes) / 100 : undefined,
  paymentMethod: row.payment_method || 'Cash',
  status: (row.status || 'Completed') as Sale['status'],
  items: Array.isArray(row.items) ? row.items : [],
  notes: row.notes || undefined,
  voidedByStaffId: row.voided_by_staff_id || undefined,
  voidReason: row.void_reason || undefined,
  voidPinVerified: row.void_pin_verified != null ? Boolean(row.void_pin_verified) : undefined,
  voidedAt: row.voided_at || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.sold_at || row.created_at,
});

export const mapAttendanceLogFromDb = (row: any): StaffAttendanceLogRecord => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  staffName: row.staff_name,
  staffRole: row.staff_role,
  timestamp: row.log_timestamp,
  date: row.log_date,
  type: row.type,
  method: row.method,
  source: row.source || row.method || 'kiosk',
  enteredBy: row.entered_by || undefined,
  enteredByName: row.entered_by_name || undefined,
  terminalId: row.terminal_id || undefined,
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapSalaryAdvanceFromDb = (row: any): StaffSalaryAdvance => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  staffName: row.staff_name,
  amountDzd: Number(row.amount_dzd || 0),
  dateIssued: row.date_issued,
  paymentMethod: row.payment_method,
  reason: row.reason || undefined,
  voucherNumber: row.voucher_number,
  status: row.status,
  deductedInPeriod: row.deducted_in_period || undefined,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapPayrollRunFromDb = (row: any): StaffPayrollRunRecord => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  category: row.category || undefined,
  periodMonth: Number(row.period_month),
  periodYear: Number(row.period_year),
  title: row.title,
  status: row.status,
  runType: (row.run_type || 'regular') as 'regular' | 'adjustment',
  adjustmentSeq: row.adjustment_seq != null ? Number(row.adjustment_seq) : 0,
  rateSetId: row.rate_set_id ?? null,
  rateBasis: (row.rate_basis || (row.rate_set_id ? 'versioned' : 'legacy')) as 'legacy' | 'versioned',
  rateSnapshot: row.rate_snapshot ?? null,
  totalGrossCotisable: Number(row.total_gross_cotisable || 0),
  totalCnasSalarial: Number(row.total_cnas_salarial || 0),
  totalCnasPatronal: Number(row.total_cnas_patronal || 0),
  totalIrg: Number(row.total_irg || 0),
  totalNet: Number(row.total_net || 0),
  slipsCount: Number(row.slips_count || 0),
  approvedAt: row.approved_at || undefined,
  approvedBy: row.approved_by || null,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPayrollSlipFromDb = (row: any): StaffPayrollSlipRecord => ({
  id: row.id,
  payrollRunId: row.payroll_run_id,
  staffId: row.staff_id,
  matricule: row.matricule,
  staffFullName: row.staff_full_name,
  role: row.role,
  periodMonth: Number(row.period_month),
  periodYear: Number(row.period_year),
  periodLabel: row.period_label,
  baseSalary: Number(row.base_salary || 0),
  actualBaseSalary: Number(row.actual_base_salary || 0),
  workedDays: Number(row.worked_days || 22),
  standardDays: Number(row.standard_days || 22),
  coachingCommission: Number(row.coaching_commission || 0),
  primesCotisables: Array.isArray(row.primes_cotisables) ? row.primes_cotisables : [],
  salaireBrutCotisable: Number(row.salaire_brut_cotisable || 0),
  cnasSalarial: Number(row.cnas_salarial || 0),
  cnasPatronal: Number(row.cnas_patronal || 0),
  salaireBrutImposable: Number(row.salaire_brut_imposable || 0),
  irgTax: Number(row.irg_tax || 0),
  primesNonImposables: Array.isArray(row.primes_non_imposables) ? row.primes_non_imposables : [],
  acomptesDeduits: Number(row.acomptes_deduits || 0),
  autresRetenues: Number(row.autres_retenues || 0),
  netAPayer: Number(row.net_a_payer || 0),
  paymentMethod: row.payment_method,
  ccpNumber: row.ccp_number || undefined,
  ccpKey: row.ccp_key || undefined,
  bankRib: row.bank_rib || undefined,
  nss: row.nss || undefined,
  isPaid: Boolean(row.is_paid),
  paidDate: row.paid_date || undefined,
  receiptNumber: row.receipt_number,
  rateSetId: row.rate_set_id ?? null,
  rateBasis: (row.rate_basis || (row.rate_set_id ? 'versioned' : 'legacy')) as 'legacy' | 'versioned',
  rateSnapshot: row.rate_snapshot ?? null,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapBusinessConfigFromDb = (row: any): BusinessCategoryConfig => ({
  id: row.id,
  accountId: row.account_id || undefined,
  businessId: row.business_id,
  branchId: row.branch_id || undefined,
  category: (row.category || 'membership_session') as BusinessCategory,
  currency: (row.currency || 'DZD') as CurrencyCode,
  defaultTvaRate: Number(row.default_tva_rate ?? 19),
  applyTimbreFiscal: Boolean(row.apply_timbre_fiscal ?? true),
  fiscalProfile: (row.fiscal_ids && typeof row.fiscal_ids === 'object' ? row.fiscal_ids : {}) as any,
  onboardingContext: (row.onboarding_context && typeof row.onboarding_context === 'object' ? row.onboarding_context : {}) as any,
  categorySettings: (row.category_settings && typeof row.category_settings === 'object' ? row.category_settings : {}) as any,
  setupState: (row.setup_state && typeof row.setup_state === 'object' ? row.setup_state : { dismissed: false }) as any,
  version: row.version != null ? Number(row.version) : undefined,
  updatedAt: row.updated_at || undefined,
});

export const mapCategoryFormuleFromDb = (row: any): CategoryFormule => ({
  id: row.id,
  accountId: row.account_id || undefined,
  businessId: row.business_id,
  branchId: row.branch_id || undefined,
  category: (row.category || 'membership_session') as BusinessCategory,
  formuleType: (row.formule_type || 'pos_combo') as CategoryFormuleType,
  code: row.code || undefined,
  name: row.name,
  description: row.description || undefined,
  priceAmount: Number(row.price_amount ?? 0),
  ratePercent: Number(row.rate_percent ?? 0),
  durationValue: Number(row.duration_value ?? 0),
  durationUnit: (row.duration_unit || 'days') as FormuleDurationUnit,
  currency: (row.currency || 'DZD') as CurrencyCode,
  taxRate: Number(row.tax_rate ?? 19),
  metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, any>,
  isActive: row.is_active ?? true,
  sortOrder: Number(row.sort_order ?? 0),
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at || undefined,
  updatedAt: row.updated_at || undefined,
});


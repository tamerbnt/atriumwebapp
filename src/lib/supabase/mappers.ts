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
} from '../../types/index';

type DbAccount = Database['public']['Tables']['accounts']['Row'];
type DbBusiness = Database['public']['Tables']['businesses']['Row'];
type DbBranch = Database['public']['Tables']['branches']['Row'];
type DbDevice = Database['public']['Tables']['devices']['Row'];
type DbStaff = Database['public']['Tables']['staff']['Row'];
type DbMember = Database['public']['Tables']['members_directory']['Row'];
type DbRegistrationRequest = Database['public']['Tables']['registration_requests']['Row'];

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
    case 'Creative':
      return 'creative';
    default:
      return 'staff';
  }
};

export const mapDbRoleToStaffRole = (dbRole: string): StaffRole => {
  switch (dbRole.toLowerCase()) {
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

export const mapBusinessFromDb = (row: DbBusiness): Business => ({
  id: row.id,
  accountId: row.account_id,
  category: row.category,
  name: row.name,
  displayName: row.display_name || row.name,
  address: row.address || undefined,
  phone: row.phone || undefined,
  logoUrl: row.logo_url || undefined,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const mapBranchFromDb = (row: DbBranch): Branch => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  name: row.name,
  code: row.code || 'BR-01',
  address: row.address || undefined,
  phone: row.phone || undefined,
  isMainBranch: row.is_main_branch,
  isActive: row.is_active,
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
});

export const mapStaffFromDb = (row: DbStaff, facilityId?: string): StaffMember => {
  const role = mapDbRoleToStaffRole(row.role);
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
    tenantId: row.account_id,
    facilityId: facilityId || '',
    fullName: row.full_name,
    email: row.email || '',
    phoneNumber: row.phone || '',
    role,
    roleRank: roleRankMap[role] ?? 7,
    isActive: row.is_active,
    hireDate: row.created_at.split('T')[0],
    salary: 2500,
    paymentDay: 1,
    pinCode: '1234',
    allowedModules: ['dashboard', 'members', 'registrations', 'shop', 'scheduler'],
  };
};

export const mapMemberFromDb = (row: DbMember): Member => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  fullName: row.full_name,
  email: row.email || '',
  phoneNumber: row.phone || '',
  cardId: row.rfid_tag || row.barcode || undefined,
  status: (row.status as any) || (row.is_active ? 'Active' : 'Expired'),
  startDate: row.created_at.split('T')[0],
  expirationDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  remainingSessions: 12,
  gender: (row.gender as any) || 'Other',
  profileImageUrl: row.photo_url || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
});

export const mapLeadFromDb = (row: DbRegistrationRequest): RegistrationLead => {
  const p = (row.payload as any) || {};
  return {
    id: row.id,
    tenantId: row.account_id,
    facilityId: row.branch_id,
    fullName: p.fullName || p.full_name || 'Web Applicant',
    email: p.email || '',
    phoneNumber: p.phoneNumber || p.phone || '',
    source: p.source || 'Web Form',
    status: row.status === 'approved' ? 'Approved' : row.status === 'declined' ? 'Declined' : 'Pending',
    notes: p.notes,
    preferredPlanName: p.preferredPlanName,
    createdAt: row.requested_at,
    updatedAt: row.processed_at || row.requested_at,
  };
};

export const mapAppointmentFromDb = (row: Database['public']['Tables']['appointments']['Row']): Appointment => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  clientId: row.client_id || '',
  clientName: row.client_name,
  clientPhone: row.client_phone || '',
  staffId: row.staff_id || '',
  staffName: row.staff_name,
  serviceId: row.service_id || '',
  serviceName: row.service_name,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  durationMinutes: Number(row.duration_minutes || 45),
  price: Number(row.price || 0),
  status: (row.status as any) || 'Confirmed',
  notes: row.notes || undefined,
  createdAt: row.created_at,
});

export const mapProductFromDb = (row: Database['public']['Tables']['products']['Row']): Product => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  name: row.name,
  description: row.description || '',
  price: { amount: Number(row.price || 0), currency: 'DZD' },
  cost: { amount: Number(row.cost || 0), currency: 'DZD' },
  stockQuantity: Number(row.stock_quantity || 0),
  sku: row.sku || 'SKU-GEN',
  category: row.category || 'General',
  imageUrl: row.image_url || undefined,
  reorderLevel: Number(row.reorder_level || 5),
  isActive: row.is_active,
  isPinned: false,
});

export const mapSaleFromDb = (row: Database['public']['Tables']['sales']['Row']): Sale => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  memberId: row.member_id || undefined,
  memberName: row.member_name || undefined,
  totalAmount: Number(row.total_amount || 0),
  paymentMethod: (row.payment_method as any) || 'Cash',
  items: Array.isArray(row.items) ? (row.items as any) : [],
  notes: row.notes || undefined,
  createdAt: row.created_at,
});

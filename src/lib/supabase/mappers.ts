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
    default:
      return 'Staff';
  }
};

export const mapAccountFromDb = (row: DbAccount): Account => ({
  id: row.id,
  fullName: row.full_name || 'Account Owner',
  email: row.email,
  phone: row.phone || undefined,
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
  status: row.is_active ? 'Active' : 'Expired',
  startDate: row.created_at.split('T')[0],
  expirationDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  remainingSessions: 12,
  gender: 'Other',
  createdAt: row.created_at,
  updatedAt: row.created_at,
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

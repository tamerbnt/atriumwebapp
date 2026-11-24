import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, normalizeUuidOrNull, syncCoordinator } from '../syncCoordinator';
import type {
  PMClient,
  PMProject,
  PMMilestone,
  PMCollateralItem,
  PMPrintOrder,
  PMBatDeliverable,
  PMTalent,
  PMMission,
  PMMissionStaff,
  PMAttendance,
  PMExpense,
  PMPayrollBatch,
  PMCcpSlip,
  PMEquipmentStock,
} from '../../../types/index';
import { numberToWordsFrench, numberToWordsArabic } from '../../../utils/algerianPtt';

export interface PMStaffMember {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId?: string;
  fullName: string;
  agencyRole: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  version?: number;
  createdAt: string;
}

export const mapPmClientFromDb = (row: any): PMClient => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  name: row.name,
  logoUrl: row.logo_url || undefined,
  contactPerson: row.contact_person,
  email: row.email,
  phone: row.phone,
  wilaya: row.wilaya,
  address: row.address || undefined,
  isActive: row.is_active ?? true,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPmProjectFromDb = (row: any): PMProject => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  clientId: row.client_id,
  clientName: row.client_name,
  title: row.title,
  scopeOfWork: row.scope_of_work,
  budgetCapDzd: Number(row.budget_cap_dzd || 0),
  maxFieldExpensesDzd: Number(row.max_field_expenses_dzd || 0),
  targetGrossMarginPercent: Number(row.target_gross_margin_percent || 25),
  startDate: row.start_date,
  endDate: row.end_date,
  kvDeadline: row.kv_deadline,
  printDeadline: row.print_deadline,
  executionStartDate: row.execution_start_date,
  projectManagerId: row.project_manager_id,
  projectManagerName: row.project_manager_name,
  leadCreativeId: row.lead_creative_id,
  leadCreativeName: row.lead_creative_name,
  status: row.status,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapPmMilestoneFromDb = (row: any): PMMilestone => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  projectId: row.project_id,
  title: row.title,
  phase: row.phase,
  targetDate: row.target_date,
  completedAt: row.completed_at || undefined,
  isCompleted: Boolean(row.is_completed),
  assignedRole: row.assigned_role || 'project_manager',
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapPmPrintOrderFromDb = (row: any): PMPrintOrder => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  projectId: row.project_id,
  projectTitle: row.project_title,
  orderNumber: row.order_number,
  items: row.items || [],
  totalCostDzd: Number(row.total_cost_dzd || 0),
  status: row.status,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPmBatDeliverableFromDb = (row: any): PMBatDeliverable => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  projectId: row.project_id,
  projectTitle: row.project_title,
  printOrderId: row.print_order_id || undefined,
  title: row.title,
  fileFormat: row.file_format,
  colorSpace: row.color_space,
  resolutionDpi: Number(row.resolution_dpi || 300),
  bleedMm: Number(row.bleed_mm || 3),
  hasBleedIncluded: Boolean(row.has_bleed_included),
  version: Number(row.version || 1),
  versionCode: row.version_code || 'v1',
  previewUrl: row.preview_url,
  masterSourceUrl: row.master_source_url || undefined,
  fileSizeBytes: Number(row.file_size_bytes || 0),
  uploadedByCreativeId: row.uploaded_by_creative_id,
  uploadedByCreativeName: row.uploaded_by_creative_name,
  approvalStatus: row.approval_status,
  revisionComments: row.revision_comments || undefined,
  createdAt: row.created_at,
});

export const mapPmTalentFromDb = (row: any): PMTalent => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  fullName: row.full_name,
  gender: row.gender,
  birthDate: row.birth_date,
  age: Number(row.age || 22),
  phone: row.phone,
  email: row.email || undefined,
  wilayaCode: row.wilaya_code,
  wilayaName: row.wilaya_name,
  commune: row.commune,
  hasDriverLicense: Boolean(row.has_driver_license),
  isVehicleOwner: Boolean(row.is_vehicle_owner),
  desiredRoles: row.desired_roles || ['Animator'],
  languages: row.languages || ['Arabic', 'French'],
  portraitPhotoUrl: row.portrait_photo_url || undefined,
  fullBodyPhotoUrl: row.full_body_photo_url || undefined,
  cvDocumentUrl: row.cv_document_url || undefined,
  cniDocumentUrl: row.cni_document_url || undefined,
  ccpNumber: row.ccp_number,
  ccpKey: row.ccp_key,
  initialHrScore: Number(row.initial_hr_score || 4.0),
  averageMissionRating: Number(row.average_mission_rating || 4.5),
  consolidatedScore: Number(row.consolidated_score || 4.25),
  completedMissionsCount: Number(row.completed_missions_count || 0),
  absencesCount: Number(row.absences_count || 0),
  isHrVerified: Boolean(row.is_hr_verified),
  status: row.status,
  hrNotes: row.hr_notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPmMissionFromDb = (row: any): PMMission => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  projectId: row.project_id,
  projectTitle: row.project_title,
  clientName: row.client_name,
  code: row.code,
  title: row.title,
  activationType: row.activation_type,
  venueName: row.venue_name,
  address: row.address,
  wilayaCode: row.wilaya_code,
  wilayaName: row.wilaya_name,
  startDate: row.start_date,
  endDate: row.end_date,
  dailyStartHour: row.daily_start_hour,
  dailyEndHour: row.daily_end_hour,
  supervisorId: row.supervisor_id,
  supervisorName: row.supervisor_name,
  requiredStaffCount: Number(row.required_staff_count || 4),
  status: row.status,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPmAttendanceFromDb = (row: any): PMAttendance => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  missionId: row.mission_id,
  talentId: row.talent_id,
  talentName: row.talent_name,
  talentPhoto: row.talent_photo || undefined,
  date: row.date,
  checkInTime: row.check_in_time || undefined,
  status: row.status,
  minutesLate: row.minutes_late ? Number(row.minutes_late) : 0,
  replacementForTalentId: row.replacement_for_talent_id || undefined,
  replacementTalentName: row.replacement_talent_name || undefined,
  shiftRating: Number(row.shift_rating || 5),
  dayRateDzd: Number(row.day_rate_dzd || 3500),
  grossPayableDzd: Number(row.gross_payable_dzd || 3500),
  isLocked: Boolean(row.is_locked),
  lockedAt: row.locked_at || undefined,
  supervisorNotes: row.supervisor_notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapPmExpenseFromDb = (row: any): PMExpense => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  projectId: row.project_id,
  projectTitle: row.project_title,
  missionId: row.mission_id || undefined,
  missionCode: row.mission_code || undefined,
  title: row.title,
  category: row.category,
  amountDzd: Number(row.amount_dzd || 0),
  declaredByUserId: row.declared_by_user_id,
  declaredByUserName: row.declared_by_user_name,
  declaredByRole: row.declared_by_role,
  receiptPhotoUrl: row.receipt_photo_url || undefined,
  hasFiscalInvoice: Boolean(row.has_fiscal_invoice),
  fiscalNif: row.fiscal_nif || undefined,
  status: row.status,
  directionApprovedAt: row.direction_approved_at || undefined,
  directionNotes: row.direction_notes || undefined,
  isEquipmentAutoCreated: Boolean(row.is_equipment_auto_created),
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPmPayrollBatchFromDb = (row: any): PMPayrollBatch => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  projectId: row.project_id,
  projectTitle: row.project_title,
  missionId: row.mission_id,
  missionCode: row.mission_code,
  batchNumber: row.batch_number,
  totalBeneficiaries: Number(row.total_beneficiaries || 0),
  totalAmountDzd: Number(row.total_amount_dzd || 0),
  status: row.status,
  directionApprovedAt: row.direction_approved_at || undefined,
  ccpGeneratedAt: row.ccp_generated_at || undefined,
  disbursedAt: row.disbursed_at || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPmCcpSlipFromDb = (row: any): PMCcpSlip => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  batchId: row.batch_id,
  talentId: row.talent_id,
  beneficiaryName: row.beneficiary_name,
  ccpNumber: row.ccp_number,
  ccpKey: row.ccp_key,
  wilayaName: row.wilaya_name,
  amountDzd: Number(row.amount_dzd || 0),
  amountInWordsFr: row.amount_in_words_fr,
  amountInWordsAr: row.amount_in_words_ar,
  transactionReference: row.transaction_reference,
  isPrinted: Boolean(row.is_printed),
  printedAt: row.printed_at || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapPmEquipmentStockFromDb = (row: any): PMEquipmentStock => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  assetCode: row.asset_code,
  title: row.title,
  category: row.category,
  acquisitionCostDzd: Number(row.acquisition_cost_dzd || 0),
  currentStatus: row.current_status,
  currentCustodianId: row.current_custodian_id || undefined,
  currentCustodianName: row.current_custodian_name || undefined,
  assignedMissionId: row.assigned_mission_id || undefined,
  conditionReport: row.condition_report,
  qrLabelCode: row.qr_label_code,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const projectMilestoneService = {
  // ============================================================
  // PM Staff
  // ============================================================
  async fetchPmStaff(branchId: string, updatedAfter?: string | null): Promise<PMStaffMember[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_staff')
          .select(
            'id, account_id, business_id, branch_id, staff_id, full_name, agency_role, email, phone, is_active, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('full_name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): PMStaffMember => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        fullName: row.full_name,
        agencyRole: row.agency_role || 'project_manager',
        email: row.email || undefined,
        phone: row.phone || undefined,
        isActive: row.is_active ?? true,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertPmStaff(member: PMStaffMember): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: member.accountId,
      businessId: member.businessId,
      branchId: member.branchId,
      staffId: member.staffId,
    });
    const payload = {
      id: toValidUuid(member.id),
      ...trace,
      full_name: member.fullName,
      agency_role: member.agencyRole || 'project_manager',
      email: member.email || null,
      phone: member.phone || null,
      is_active: member.isActive,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_staff', payload, {
      expectedVersion: member.version,
      entityType: 'PMStaffMember',
      entityLabel: member.fullName,
      localData: payload,
    });
    return res.success;
  },

  async deletePmStaff(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_staff', id, deletedByStaffId);
    return res.success;
  },

  // ============================================================
  // Clients (Advertisers)
  // ============================================================
  async fetchClients(branchId: string, updatedAfter?: string | null): Promise<PMClient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_clients')
          .select(
            'id, account_id, business_id, branch_id, staff_id, name, logo_url, contact_person, email, phone, wilaya, address, is_active, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmClientFromDb);
    } catch {
      return [];
    }
  },

  async upsertClient(clientItem: PMClient): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: clientItem.accountId || clientItem.tenantId,
      businessId: clientItem.businessId,
      branchId: clientItem.branchId || clientItem.facilityId,
      staffId: clientItem.staffId,
    });
    const payload = {
      id: toValidUuid(clientItem.id),
      ...trace,
      name: clientItem.name,
      logo_url: clientItem.logoUrl || null,
      contact_person: clientItem.contactPerson,
      email: clientItem.email,
      phone: clientItem.phone,
      wilaya: clientItem.wilaya,
      address: clientItem.address || null,
      is_active: clientItem.isActive,
      created_at: clientItem.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_clients', payload, {
      expectedVersion: clientItem.version,
      entityType: 'PMClient',
      entityLabel: clientItem.name,
      localData: payload,
    });
    return res.success;
  },

  async deleteClient(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_clients', id, deletedByStaffId);
    return res.success;
  },

  // ============================================================
  // Projects & Milestones
  // ============================================================
  async fetchProjects(branchId: string, updatedAfter?: string | null): Promise<PMProject[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_projects')
          .select(
            'id, account_id, business_id, branch_id, staff_id, client_id, client_name, title, scope_of_work, budget_cap_dzd, max_field_expenses_dzd, target_gross_margin_percent, start_date, end_date, kv_deadline, print_deadline, execution_start_date, project_manager_id, project_manager_name, lead_creative_id, lead_creative_name, status, version, created_at, updated_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmProjectFromDb);
    } catch {
      return [];
    }
  },

  async upsertProject(project: PMProject): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: project.accountId || project.tenantId,
      businessId: project.businessId,
      branchId: project.branchId || project.facilityId,
      staffId: project.staffId,
    });
    const payload = {
      id: toValidUuid(project.id),
      ...trace,
      client_id: project.clientId ? toValidUuid(project.clientId) : null,
      client_name: project.clientName,
      title: project.title,
      scope_of_work: project.scopeOfWork,
      budget_cap_dzd: project.budgetCapDzd,
      max_field_expenses_dzd: project.maxFieldExpensesDzd,
      target_gross_margin_percent: project.targetGrossMarginPercent,
      start_date: project.startDate,
      end_date: project.endDate,
      kv_deadline: project.kvDeadline,
      print_deadline: project.printDeadline,
      execution_start_date: project.executionStartDate,
      project_manager_id: normalizeUuidOrNull(project.projectManagerId),
      project_manager_name: project.projectManagerName,
      lead_creative_id: normalizeUuidOrNull(project.leadCreativeId),
      lead_creative_name: project.leadCreativeName,
      status: project.status,
      created_at: project.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_projects', payload, {
      expectedVersion: project.version,
      entityType: 'PMProject',
      entityLabel: project.title,
      localData: payload,
    });
    return res.success;
  },

  async deleteProject(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_projects', id, deletedByStaffId);
    return res.success;
  },

  async fetchMilestones(branchId: string, updatedAfter?: string | null): Promise<PMMilestone[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_milestones')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, title, phase, target_date, completed_at, is_completed, assigned_role, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('target_date', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmMilestoneFromDb);
    } catch {
      return [];
    }
  },

  async upsertMilestone(
    milestone: PMMilestone,
    ctx?: { accountId?: string; businessId?: string; branchId?: string; staffId?: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: milestone.accountId || ctx?.accountId,
      businessId: milestone.businessId || ctx?.businessId,
      branchId: milestone.branchId || ctx?.branchId,
      staffId: milestone.staffId || ctx?.staffId,
    });
    const payload = {
      id: toValidUuid(milestone.id),
      ...trace,
      project_id: toValidUuid(milestone.projectId),
      title: milestone.title,
      phase: milestone.phase,
      target_date: milestone.targetDate,
      completed_at: milestone.completedAt || null,
      is_completed: milestone.isCompleted,
      assigned_role: milestone.assignedRole,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_milestones', payload, {
      expectedVersion: milestone.version,
      entityType: 'PMMilestone',
      entityLabel: milestone.title,
      localData: payload,
    });
    return res.success;
  },

  async deleteMilestone(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_milestones', id, deletedByStaffId);
    return res.success;
  },

  // ============================================================
  // Collateral Catalog & Print Orders
  // ============================================================
  async fetchCollateralCatalog(branchId?: string, updatedAfter?: string | null): Promise<PMCollateralItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_collateral_catalog')
          .select(
            'id, account_id, business_id, branch_id, staff_id, sku, title, category, dimensions, material, unit_cost_dzd, image_url, is_customizable'
          )
          .is('deleted_at', null)
          .order('title', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (branchId) query = query.eq('branch_id', toValidUuid(branchId));
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): PMCollateralItem => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        sku: row.sku,
        title: row.title,
        category: row.category,
        dimensions: row.dimensions,
        material: row.material,
        unitCostDzd: Number(row.unit_cost_dzd || 0),
        imageUrl: row.image_url || undefined,
        isCustomizable: Boolean(row.is_customizable),
      }));
    } catch {
      return [];
    }
  },

  async fetchPrintOrders(branchId: string, updatedAfter?: string | null): Promise<PMPrintOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_print_orders')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, project_title, order_number, items, total_cost_dzd, status, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmPrintOrderFromDb);
    } catch {
      return [];
    }
  },

  async createPrintOrder(order: PMPrintOrder): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: order.accountId || order.tenantId,
      businessId: order.businessId,
      branchId: order.branchId || order.facilityId,
      staffId: order.staffId,
    });
    const payload = {
      id: toValidUuid(order.id),
      ...trace,
      project_id: toValidUuid(order.projectId),
      project_title: order.projectTitle,
      order_number: order.orderNumber,
      items: order.items,
      total_cost_dzd: order.totalCostDzd,
      status: order.status,
      created_at: order.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_print_orders', payload, {
      expectedVersion: order.version,
      entityType: 'PMPrintOrder',
      entityLabel: order.orderNumber,
      localData: payload,
    });
    return res.success;
  },

  async deletePrintOrder(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_print_orders', id, deletedByStaffId);
    return res.success;
  },

  // ============================================================
  // BAT Deliverables
  // ============================================================
  async fetchBatDeliverables(branchId: string, updatedAfter?: string | null): Promise<PMBatDeliverable[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_bat_deliverables')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, project_title, print_order_id, title, file_format, color_space, resolution_dpi, bleed_mm, has_bleed_included, version, version_code, preview_url, master_source_url, file_size_bytes, uploaded_by_creative_id, uploaded_by_creative_name, approval_status, revision_comments, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmBatDeliverableFromDb);
    } catch {
      return [];
    }
  },

  async upsertBatDeliverable(bat: PMBatDeliverable): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: bat.accountId || bat.tenantId,
      businessId: bat.businessId,
      branchId: bat.branchId || bat.facilityId,
      staffId: bat.staffId,
    });
    const payload = {
      id: toValidUuid(bat.id),
      ...trace,
      project_id: toValidUuid(bat.projectId),
      project_title: bat.projectTitle,
      print_order_id: bat.printOrderId ? toValidUuid(bat.printOrderId) : null,
      title: bat.title,
      file_format: bat.fileFormat,
      color_space: bat.colorSpace,
      resolution_dpi: bat.resolutionDpi,
      bleed_mm: bat.bleedMm,
      has_bleed_included: bat.hasBleedIncluded,
      version: bat.version,
      version_code: bat.versionCode,
      preview_url: bat.previewUrl,
      master_source_url: bat.masterSourceUrl || null,
      file_size_bytes: bat.fileSizeBytes,
      uploaded_by_creative_id: normalizeUuidOrNull(bat.uploadedByCreativeId),
      uploaded_by_creative_name: bat.uploadedByCreativeName,
      approval_status: bat.approvalStatus,
      revision_comments: bat.revisionComments || null,
      created_at: bat.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_bat_deliverables', payload, {
      expectedVersion: bat.version,
      entityType: 'PMBatDeliverable',
      entityLabel: bat.title,
      localData: payload,
    });
    return res.success;
  },

  async deleteBatDeliverable(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_bat_deliverables', id, deletedByStaffId);
    return res.success;
  },

  // ============================================================
  // Talents (69 Wilayas + CCP Banking)
  // ============================================================
  async fetchTalents(branchId: string, updatedAfter?: string | null): Promise<PMTalent[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_talents')
          .select(
            'id, account_id, business_id, branch_id, staff_id, full_name, gender, birth_date, age, phone, email, wilaya_code, wilaya_name, commune, has_driver_license, is_vehicle_owner, desired_roles, languages, portrait_photo_url, full_body_photo_url, cv_document_url, cni_document_url, ccp_number, ccp_key, initial_hr_score, average_mission_rating, consolidated_score, completed_missions_count, absences_count, is_hr_verified, status, hr_notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('consolidated_score', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmTalentFromDb);
    } catch {
      return [];
    }
  },

  async upsertTalent(talent: PMTalent): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: talent.accountId || talent.tenantId,
      businessId: talent.businessId,
      branchId: talent.branchId || talent.facilityId,
      staffId: talent.staffId,
    });
    const payload = {
      id: toValidUuid(talent.id),
      ...trace,
      full_name: talent.fullName,
      gender: talent.gender,
      birth_date: talent.birthDate,
      age: talent.age,
      phone: talent.phone,
      email: talent.email || null,
      wilaya_code: talent.wilayaCode,
      wilaya_name: talent.wilayaName,
      commune: talent.commune,
      has_driver_license: talent.hasDriverLicense,
      is_vehicle_owner: talent.isVehicleOwner,
      desired_roles: talent.desiredRoles,
      languages: talent.languages,
      portrait_photo_url: talent.portraitPhotoUrl || null,
      full_body_photo_url: talent.fullBodyPhotoUrl || null,
      cv_document_url: talent.cvDocumentUrl || null,
      cni_document_url: talent.cniDocumentUrl || null,
      ccp_number: talent.ccpNumber,
      ccp_key: talent.ccpKey,
      initial_hr_score: talent.initialHrScore,
      average_mission_rating: talent.averageMissionRating,
      consolidated_score: talent.consolidatedScore,
      completed_missions_count: talent.completedMissionsCount,
      absences_count: talent.absencesCount,
      is_hr_verified: talent.isHrVerified,
      status: talent.status,
      hr_notes: talent.hrNotes || null,
      created_at: talent.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_talents', payload, {
      expectedVersion: talent.version,
      entityType: 'PMTalent',
      entityLabel: talent.fullName,
      localData: payload,
    });
    return res.success;
  },

  async deleteTalent(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_talents', id, deletedByStaffId);
    return res.success;
  },

  // ============================================================
  // Missions & Mission Staffing
  // ============================================================
  async fetchMissions(branchId: string, updatedAfter?: string | null): Promise<PMMission[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_missions')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, project_title, client_name, code, title, activation_type, venue_name, address, wilaya_code, wilaya_name, start_date, end_date, daily_start_hour, daily_end_hour, supervisor_id, supervisor_name, required_staff_count, status, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('start_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmMissionFromDb);
    } catch {
      return [];
    }
  },

  async upsertMission(mission: PMMission): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: mission.accountId || mission.tenantId,
      businessId: mission.businessId,
      branchId: mission.branchId || mission.facilityId,
      staffId: mission.staffId,
    });
    const payload = {
      id: toValidUuid(mission.id),
      ...trace,
      project_id: toValidUuid(mission.projectId),
      project_title: mission.projectTitle,
      client_name: mission.clientName,
      code: mission.code,
      title: mission.title,
      activation_type: mission.activationType,
      venue_name: mission.venueName,
      address: mission.address,
      wilaya_code: mission.wilayaCode,
      wilaya_name: mission.wilayaName,
      start_date: mission.startDate,
      end_date: mission.endDate,
      daily_start_hour: mission.dailyStartHour,
      daily_end_hour: mission.dailyEndHour,
      supervisor_id: normalizeUuidOrNull(mission.supervisorId),
      supervisor_name: mission.supervisorName,
      required_staff_count: mission.requiredStaffCount,
      status: mission.status,
      created_at: mission.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_missions', payload, {
      expectedVersion: mission.version,
      entityType: 'PMMission',
      entityLabel: mission.title,
      localData: payload,
    });
    return res.success;
  },

  async deleteMission(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_missions', id, deletedByStaffId);
    return res.success;
  },

  async fetchMissionStaff(branchId: string, updatedAfter?: string | null): Promise<PMMissionStaff[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_mission_staff')
          .select(
            'id, mission_id, talent_id, talent_name, talent_photo, phone, day_rate_dzd, assigned_role_title, invitation_status, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): PMMissionStaff => ({
        id: row.id,
        missionId: row.mission_id,
        talentId: row.talent_id,
        talentName: row.talent_name,
        talentPhoto: row.talent_photo || undefined,
        phone: row.phone,
        dayRateDzd: Number(row.day_rate_dzd || 3500),
        assignedRoleTitle: row.assigned_role_title || 'Animator',
        invitationStatus: row.invitation_status || 'confirmed',
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertMissionStaff(
    item: PMMissionStaff,
    ctx: { accountId: string; businessId: string; branchId: string; staffId?: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(item.id),
      ...trace,
      mission_id: toValidUuid(item.missionId),
      talent_id: toValidUuid(item.talentId),
      talent_name: item.talentName,
      talent_photo: item.talentPhoto || null,
      phone: item.phone,
      day_rate_dzd: item.dayRateDzd,
      assigned_role_title: item.assignedRoleTitle,
      invitation_status: item.invitationStatus,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_mission_staff', payload, {
      expectedVersion: item.version,
      entityType: 'PMMissionStaff',
      entityLabel: item.talentName,
      localData: payload,
    });
    return res.success;
  },

  async deleteMissionStaff(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_mission_staff', id, deletedByStaffId);
    return res.success;
  },

  // ============================================================
  // Mobile Touch Roll Call & Attendance
  // ============================================================
  async fetchAttendances(
    branchId: string,
    missionId?: string,
    updatedAfter?: string | null
  ): Promise<PMAttendance[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_attendances')
          .select(
            'id, account_id, business_id, branch_id, staff_id, mission_id, talent_id, talent_name, talent_photo, date, check_in_time, status, minutes_late, replacement_for_talent_id, replacement_talent_name, shift_rating, day_rate_dzd, gross_payable_dzd, is_locked, locked_at, supervisor_notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null);

        if (missionId) {
          query = query.eq('mission_id', toValidUuid(missionId));
        }
        if (updatedAfter) {
          query = query.gt('updated_at', updatedAfter);
        }

        return query
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
      });

      return rows.map(mapPmAttendanceFromDb);
    } catch {
      return [];
    }
  },

  async closeRollCall(
    missionId: string,
    supervisorId: string,
    attendances: PMAttendance[]
  ): Promise<{ success: boolean; batchId?: string; totalAmountDzd?: number }> {
    const res = await syncCoordinator.rpcOrQueue<any>('pm_close_roll_call', {
      p_mission_id: toValidUuid(missionId),
      p_supervisor_id: normalizeUuidOrNull(supervisorId),
      p_attendances: attendances,
    });
    if (!res.success) {
      return { success: false };
    }
    if (res.data && typeof res.data === 'object') {
      return { success: true, ...res.data };
    }
    return { success: true };
  },

  // ============================================================
  // Field Expenses & Double-Lock Clearances
  // ============================================================
  async fetchExpenses(branchId: string, updatedAfter?: string | null): Promise<PMExpense[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_expenses')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, project_title, mission_id, mission_code, title, category, amount_dzd, declared_by_user_id, declared_by_user_name, declared_by_role, receipt_photo_url, has_fiscal_invoice, fiscal_nif, status, direction_approved_at, direction_notes, is_equipment_auto_created, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmExpenseFromDb);
    } catch {
      return [];
    }
  },

  async upsertExpense(expense: PMExpense): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: expense.accountId || expense.tenantId,
      businessId: expense.businessId,
      branchId: expense.branchId || expense.facilityId,
      staffId: expense.staffId,
    });
    const payload = {
      id: toValidUuid(expense.id),
      ...trace,
      project_id: toValidUuid(expense.projectId),
      project_title: expense.projectTitle,
      mission_id: expense.missionId ? toValidUuid(expense.missionId) : null,
      mission_code: expense.missionCode || null,
      title: expense.title,
      category: expense.category,
      amount_dzd: expense.amountDzd,
      declared_by_user_id: normalizeUuidOrNull(expense.declaredByUserId),
      declared_by_user_name: expense.declaredByUserName,
      declared_by_role: expense.declaredByRole,
      receipt_photo_url: expense.receiptPhotoUrl || null,
      has_fiscal_invoice: expense.hasFiscalInvoice,
      fiscal_nif: expense.fiscalNif || null,
      status: expense.status,
      direction_approved_at: expense.directionApprovedAt || null,
      direction_notes: expense.directionNotes || null,
      is_equipment_auto_created: Boolean(expense.isEquipmentAutoCreated),
      created_at: expense.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_expenses', payload, {
      expectedVersion: expense.version,
      entityType: 'PMExpense',
      entityLabel: expense.title,
      localData: payload,
    });
    return res.success;
  },

  async deleteExpense(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_expenses', id, deletedByStaffId);
    return res.success;
  },

  async approveDisbursement(
    type: 'expense' | 'payroll_batch',
    id: string,
    approverId: string,
    notes?: string
  ): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('pm_approve_disbursement', {
      p_type: type,
      p_id: toValidUuid(id),
      p_approver_id: normalizeUuidOrNull(approverId),
      p_notes: notes || null,
    });
    return res.success;
  },

  // ============================================================
  // Payroll & Algerian Post (CCP SFP 01) Generator
  // ============================================================
  async fetchPayrollBatches(branchId: string, updatedAfter?: string | null): Promise<PMPayrollBatch[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_payroll_batches')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, project_title, mission_id, mission_code, batch_number, total_beneficiaries, total_amount_dzd, status, direction_approved_at, ccp_generated_at, disbursed_at, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmPayrollBatchFromDb);
    } catch {
      return [];
    }
  },

  async fetchCcpSlips(batchId: string, updatedAfter?: string | null): Promise<PMCcpSlip[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_ccp_slips')
          .select(
            'id, account_id, business_id, branch_id, staff_id, batch_id, talent_id, beneficiary_name, ccp_number, ccp_key, wilaya_name, amount_dzd, amount_in_words_fr, amount_in_words_ar, transaction_reference, is_printed, printed_at, version, created_at'
          )
          .eq('batch_id', toValidUuid(batchId))
          .is('deleted_at', null)
          .order('beneficiary_name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmCcpSlipFromDb);
    } catch {
      return [];
    }
  },

  async generateCcpBatchSlips(
    batch: PMPayrollBatch,
    attendances: PMAttendance[],
    talentsMap: Map<string, PMTalent>
  ): Promise<PMCcpSlip[]> {
    const slips: PMCcpSlip[] = [];

    for (const att of attendances) {
      if (!['present', 'late', 'replacement'].includes(att.status)) continue;
      const talent = talentsMap.get(att.talentId);
      if (!talent) continue;

      const amount = att.grossPayableDzd || 3500;
      const slip: PMCcpSlip = {
        id: `slip-${att.id}`,
        accountId: batch.accountId || batch.tenantId,
        businessId: batch.businessId,
        branchId: batch.branchId || batch.facilityId,
        staffId: batch.staffId,
        tenantId: batch.tenantId,
        facilityId: batch.facilityId,
        batchId: batch.id,
        talentId: talent.id,
        beneficiaryName: talent.fullName,
        ccpNumber: talent.ccpNumber,
        ccpKey: talent.ccpKey,
        wilayaName: talent.wilayaName,
        amountDzd: amount,
        amountInWordsFr: numberToWordsFrench(amount),
        amountInWordsAr: numberToWordsArabic(amount),
        transactionReference: `Paie ${batch.missionCode} - ${batch.projectTitle}`,
        isPrinted: false,
        createdAt: new Date().toISOString(),
      };
      slips.push(slip);
    }

    if (slips.length > 0) {
      const trace = buildTraceEnvelope({
        accountId: batch.accountId || batch.tenantId,
        businessId: batch.businessId,
        branchId: batch.branchId || batch.facilityId,
        staffId: batch.staffId,
      });

      await syncCoordinator.rpcOrQueue('pm_generate_ccp_batch_slips_atomic', {
        p_batch: {
          id: toValidUuid(batch.id),
          ...trace,
          project_id: toValidUuid(batch.projectId),
          project_title: batch.projectTitle,
          mission_id: toValidUuid(batch.missionId),
          mission_code: batch.missionCode,
          batch_number: batch.batchNumber,
          total_beneficiaries: batch.totalBeneficiaries,
          total_amount_dzd: batch.totalAmountDzd,
          ccp_generated_at: new Date().toISOString(),
        },
        p_slips: slips.map((s) => ({
          id: toValidUuid(s.id),
          talent_id: toValidUuid(s.talentId),
          beneficiary_name: s.beneficiaryName,
          ccp_number: s.ccpNumber,
          ccp_key: s.ccpKey,
          wilaya_name: s.wilayaName,
          amount_dzd: s.amountDzd,
          amount_in_words_fr: s.amountInWordsFr,
          amount_in_words_ar: s.amountInWordsAr,
          transaction_reference: s.transactionReference,
          is_printed: s.isPrinted,
          created_at: s.createdAt,
        })),
      });
    }

    return slips;
  },

  // ============================================================
  // Indirect Equipment Stock
  // ============================================================
  async fetchEquipmentStock(branchId: string, updatedAfter?: string | null): Promise<PMEquipmentStock[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pm_equipment_stock')
          .select(
            'id, account_id, business_id, branch_id, staff_id, asset_code, title, category, acquisition_cost_dzd, current_status, current_custodian_id, current_custodian_name, assigned_mission_id, condition_report, qr_label_code, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('asset_code', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapPmEquipmentStockFromDb);
    } catch {
      return [];
    }
  },

  async upsertEquipmentStock(item: PMEquipmentStock): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: item.accountId || item.tenantId,
      businessId: item.businessId,
      branchId: item.branchId || item.facilityId,
      staffId: item.staffId,
    });
    const payload = {
      id: toValidUuid(item.id),
      ...trace,
      asset_code: item.assetCode,
      title: item.title,
      category: item.category,
      acquisition_cost_dzd: item.acquisitionCostDzd,
      current_status: item.currentStatus,
      current_custodian_id: normalizeUuidOrNull(item.currentCustodianId),
      current_custodian_name: item.currentCustodianName || null,
      assigned_mission_id: item.assignedMissionId ? toValidUuid(item.assignedMissionId) : null,
      condition_report: item.conditionReport,
      qr_label_code: item.qrLabelCode,
      created_at: item.createdAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pm_equipment_stock', payload, {
      expectedVersion: item.version,
      entityType: 'PMEquipmentStock',
      entityLabel: item.title,
      localData: payload,
    });
    return res.success;
  },

  async deleteEquipmentStock(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pm_equipment_stock', id, deletedByStaffId);
    return res.success;
  },
};

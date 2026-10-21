import { getSupabaseClient } from '../client';
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

export const projectMilestoneService = {
  // ============================================================
  // Clients (Advertisers)
  // ============================================================
  async fetchClients(facilityId: string): Promise<PMClient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_clients')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[projectMilestoneService] fetchClients warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): PMClient => ({
        id: row.id,
        accountId: row.account_id || row.tenant_id,
        businessId: row.business_id,
        branchId: row.branch_id || row.facility_id,
        staffId: row.staff_id,
        tenantId: row.account_id || row.tenant_id,
        facilityId: row.branch_id || row.facility_id,
        name: row.name,
        logoUrl: row.logo_url || undefined,
        contactPerson: row.contact_person,
        email: row.email,
        phone: row.phone,
        wilaya: row.wilaya,
        address: row.address || undefined,
        isActive: row.is_active,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertClient(clientItem: PMClient): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_clients')
        .upsert({
          id: clientItem.id,
          account_id: clientItem.accountId || clientItem.tenantId,
          business_id: clientItem.businessId,
          branch_id: clientItem.branchId || clientItem.facilityId,
          staff_id: clientItem.staffId || null,
          tenant_id: clientItem.accountId || clientItem.tenantId,
          facility_id: clientItem.branchId || clientItem.facilityId,
          name: clientItem.name,
          logo_url: clientItem.logoUrl || null,
          contact_person: clientItem.contactPerson,
          email: clientItem.email,
          phone: clientItem.phone,
          wilaya: clientItem.wilaya,
          address: clientItem.address || null,
          is_active: clientItem.isActive,
          created_at: clientItem.createdAt,
        });

      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Projects & Milestones
  // ============================================================
  async fetchProjects(facilityId: string): Promise<PMProject[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_projects')
        .select('*')
        .or(`facility_id.eq.${facilityId},branch_id.eq.${facilityId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[projectMilestoneService] fetchProjects warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): PMProject => ({
        id: row.id,
        accountId: row.account_id || row.tenant_id,
        businessId: row.business_id,
        branchId: row.branch_id || row.facility_id,
        staffId: row.staff_id,
        tenantId: row.account_id || row.tenant_id,
        facilityId: row.branch_id || row.facility_id,
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
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertProject(project: PMProject): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_projects')
        .upsert({
          id: project.id,
          account_id: project.accountId || project.tenantId,
          business_id: project.businessId,
          branch_id: project.branchId || project.facilityId,
          staff_id: project.staffId || null,
          tenant_id: project.accountId || project.tenantId,
          facility_id: project.branchId || project.facilityId,
          client_id: project.clientId,
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
          project_manager_id: project.projectManagerId,
          project_manager_name: project.projectManagerName,
          lead_creative_id: project.leadCreativeId,
          lead_creative_name: project.leadCreativeName,
          status: project.status,
          created_at: project.createdAt,
          updated_at: new Date().toISOString(),
        });

      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Collateral Catalog & Print Orders
  // ============================================================
  async fetchCollateralCatalog(): Promise<PMCollateralItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_collateral_catalog')
        .select('*')
        .order('title', { ascending: true });

      if (error) return [];

      return (data || []).map((row: any): PMCollateralItem => ({
        id: row.id,
        sku: row.sku,
        title: row.title,
        category: row.category,
        dimensions: row.dimensions,
        material: row.material,
        unitCostDzd: Number(row.unit_cost_dzd || 0),
        imageUrl: row.image_url || undefined,
        isCustomizable: row.is_customizable,
      }));
    } catch {
      return [];
    }
  },

  async fetchPrintOrders(facilityId: string): Promise<PMPrintOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_print_orders')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any): PMPrintOrder => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
        projectId: row.project_id,
        projectTitle: row.project_title,
        orderNumber: row.order_number,
        items: row.items || [],
        totalCostDzd: Number(row.total_cost_dzd || 0),
        status: row.status,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async createPrintOrder(order: PMPrintOrder): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_print_orders')
        .insert({
          id: order.id,
          tenant_id: order.tenantId,
          facility_id: order.facilityId,
          project_id: order.projectId,
          project_title: order.projectTitle,
          order_number: order.orderNumber,
          items: order.items,
          total_cost_dzd: order.totalCostDzd,
          status: order.status,
          created_at: order.createdAt,
        });

      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================
  // BAT Deliverables
  // ============================================================
  async fetchBatDeliverables(facilityId: string): Promise<PMBatDeliverable[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_bat_deliverables')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any): PMBatDeliverable => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
        projectId: row.project_id,
        projectTitle: row.project_title,
        printOrderId: row.print_order_id || undefined,
        title: row.title,
        fileFormat: row.file_format,
        colorSpace: row.color_space,
        resolutionDpi: Number(row.resolution_dpi || 300),
        bleedMm: Number(row.bleed_mm || 3),
        hasBleedIncluded: row.has_bleed_included,
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
      }));
    } catch {
      return [];
    }
  },

  async upsertBatDeliverable(bat: PMBatDeliverable): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_bat_deliverables')
        .upsert({
          id: bat.id,
          tenant_id: bat.tenantId,
          facility_id: bat.facilityId,
          project_id: bat.projectId,
          project_title: bat.projectTitle,
          print_order_id: bat.printOrderId || null,
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
          uploaded_by_creative_id: bat.uploadedByCreativeId,
          uploaded_by_creative_name: bat.uploadedByCreativeName,
          approval_status: bat.approvalStatus,
          revision_comments: bat.revisionComments || null,
          created_at: bat.createdAt,
        });

      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Talents (58 Wilayas + CCP Banking)
  // ============================================================
  async fetchTalents(facilityId: string): Promise<PMTalent[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_talents')
        .select('*')
        .eq('facility_id', facilityId)
        .order('consolidated_score', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any): PMTalent => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
        fullName: row.full_name,
        gender: row.gender,
        birthDate: row.birth_date,
        age: Number(row.age || 22),
        phone: row.phone,
        email: row.email || undefined,
        wilayaCode: row.wilaya_code,
        wilayaName: row.wilaya_name,
        commune: row.commune,
        hasDriverLicense: row.has_driver_license,
        isVehicleOwner: row.is_vehicle_owner,
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
        isHrVerified: row.is_hr_verified,
        status: row.status,
        hrNotes: row.hr_notes || undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertTalent(talent: PMTalent): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_talents')
        .upsert({
          id: talent.id,
          tenant_id: talent.tenantId,
          facility_id: talent.facilityId,
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
        });

      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Missions & Field Operations
  // ============================================================
  async fetchMissions(facilityId: string): Promise<PMMission[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_missions')
        .select('*')
        .eq('facility_id', facilityId)
        .order('start_date', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any): PMMission => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
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
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertMission(mission: PMMission): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_missions')
        .upsert({
          id: mission.id,
          tenant_id: mission.tenantId,
          facility_id: mission.facilityId,
          project_id: mission.projectId,
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
          supervisor_id: mission.supervisorId,
          supervisor_name: mission.supervisorName,
          required_staff_count: mission.requiredStaffCount,
          status: mission.status,
          created_at: mission.createdAt,
        });

      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Mobile Touch Roll Call & Attendance
  // ============================================================
  async fetchAttendances(facilityId: string, missionId?: string): Promise<PMAttendance[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('pm_attendances')
        .select('*')
        .eq('facility_id', facilityId);

      if (missionId) {
        query = query.eq('mission_id', missionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any): PMAttendance => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
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
        isLocked: row.is_locked,
        lockedAt: row.locked_at || undefined,
        supervisorNotes: row.supervisor_notes || undefined,
      }));
    } catch {
      return [];
    }
  },

  async closeRollCall(
    missionId: string,
    supervisorId: string,
    attendances: PMAttendance[]
  ): Promise<{ success: boolean; batchId?: string; totalAmountDzd?: number }> {
    const client = getSupabaseClient();
    if (!client) {
      // In-memory fallback
      return { success: true };
    }

    try {
      const { data, error } = await (client as any).rpc('pm_close_roll_call', {
        p_mission_id: missionId,
        p_supervisor_id: supervisorId,
        p_attendances: attendances,
      });

      if (error) {
        console.warn('[projectMilestoneService] closeRollCall error:', error.message);
        return { success: false };
      }

      return data;
    } catch {
      return { success: false };
    }
  },

  // ============================================================
  // Field Expenses & Double-Lock Clearances
  // ============================================================
  async fetchExpenses(facilityId: string): Promise<PMExpense[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_expenses')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any): PMExpense => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
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
        hasFiscalInvoice: row.has_fiscal_invoice,
        fiscalNif: row.fiscal_nif || undefined,
        status: row.status,
        directionApprovedAt: row.direction_approved_at || undefined,
        directionNotes: row.direction_notes || undefined,
        isEquipmentAutoCreated: row.is_equipment_auto_created,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertExpense(expense: PMExpense): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_expenses')
        .upsert({
          id: expense.id,
          tenant_id: expense.tenantId,
          facility_id: expense.facilityId,
          project_id: expense.projectId,
          project_title: expense.projectTitle,
          mission_id: expense.missionId || null,
          mission_code: expense.missionCode || null,
          title: expense.title,
          category: expense.category,
          amount_dzd: expense.amountDzd,
          declared_by_user_id: expense.declaredByUserId,
          declared_by_user_name: expense.declaredByUserName,
          declared_by_role: expense.declaredByRole,
          receipt_photo_url: expense.receiptPhotoUrl || null,
          has_fiscal_invoice: expense.hasFiscalInvoice,
          fiscal_nif: expense.fiscalNif || null,
          status: expense.status,
          direction_approved_at: expense.directionApprovedAt || null,
          direction_notes: expense.directionNotes || null,
          is_equipment_auto_created: expense.isEquipmentAutoCreated,
          created_at: expense.createdAt,
        });

      return !error;
    } catch {
      return false;
    }
  },

  async approveDisbursement(
    type: 'expense' | 'payroll_batch',
    id: string,
    approverId: string,
    notes?: string
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return true; // fallback

    try {
      const { error } = await (client as any).rpc('pm_approve_disbursement', {
        p_type: type,
        p_id: id,
        p_approver_id: approverId,
        p_notes: notes || null,
      });

      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Payroll & Algerian Post (CCP SFP 01) Generator
  // ============================================================
  async fetchPayrollBatches(facilityId: string): Promise<PMPayrollBatch[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_payroll_batches')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any): PMPayrollBatch => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
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
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async fetchCcpSlips(batchId: string): Promise<PMCcpSlip[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_ccp_slips')
        .select('*')
        .eq('batch_id', batchId)
        .order('beneficiary_name', { ascending: true });

      if (error) return [];

      return (data || []).map((row: any): PMCcpSlip => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
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
        isPrinted: row.is_printed,
        printedAt: row.printed_at || undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Generates official SFP 01 CCP slips for an approved batch with legal numbers in words.
   */
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

    const client = getSupabaseClient();
    if (client && slips.length > 0) {
      try {
        await (client as any).from('pm_ccp_slips').insert(
          slips.map(s => ({
            id: s.id,
            tenant_id: s.tenantId,
            facility_id: s.facilityId,
            batch_id: s.batchId,
            talent_id: s.talentId,
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
          }))
        );

        await (client as any)
          .from('pm_payroll_batches')
          .update({ status: 'ccp_generated', ccp_generated_at: new Date().toISOString() })
          .eq('id', batch.id);
      } catch (err) {
        console.warn('[projectMilestoneService] generateCcpBatchSlips insert warning:', err);
      }
    }

    return slips;
  },

  // ============================================================
  // Indirect Equipment Stock
  // ============================================================
  async fetchEquipmentStock(facilityId: string): Promise<PMEquipmentStock[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('pm_equipment_stock')
        .select('*')
        .eq('facility_id', facilityId)
        .order('asset_code', { ascending: true });

      if (error) return [];

      return (data || []).map((row: any): PMEquipmentStock => ({
        id: row.id,
        tenantId: row.tenant_id,
        facilityId: row.facility_id,
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
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertEquipmentStock(item: PMEquipmentStock): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('pm_equipment_stock')
        .upsert({
          id: item.id,
          tenant_id: item.tenantId,
          facility_id: item.facilityId,
          asset_code: item.assetCode,
          title: item.title,
          category: item.category,
          acquisition_cost_dzd: item.acquisitionCostDzd,
          current_status: item.currentStatus,
          current_custodian_id: item.currentCustodianId || null,
          current_custodian_name: item.currentCustodianName || null,
          assigned_mission_id: item.assignedMissionId || null,
          condition_report: item.conditionReport,
          qr_label_code: item.qrLabelCode,
          created_at: item.createdAt,
        });

      return !error;
    } catch {
      return false;
    }
  },
};

import { getSupabaseClient, toValidUuid } from '../client';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  FreelanceClient,
  FreelanceProject,
  TimeLogEntry,
  FreelanceInvoice,
  FreelanceProposal,
  FreelanceExpense,
  FreelanceDeliverable,
} from '../../../types/index';

export const freelanceService = {
  async fetchClients(branchId: string, updatedAfter?: string | null): Promise<FreelanceClient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('freelance_clients')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): FreelanceClient => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        name: row.name,
        company: row.company || undefined,
        email: row.email,
        phone: row.phone || undefined,
        currency: row.currency || 'DZD',
        hourlyRate: Number(row.hourly_rate || 0),
        status: row.status || 'ProjectBased',
        monthlyRetainerHours: row.monthly_retainer_hours ? Number(row.monthly_retainer_hours) : undefined,
        monthlyRetainerAmount: row.monthly_retainer_amount ? Number(row.monthly_retainer_amount) : undefined,
        notes: row.notes || undefined,
        lifetimeBilled: Number(row.lifetime_billed || 0),
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertClient(clientItem: FreelanceClient): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: clientItem.accountId || clientItem.tenantId,
      businessId: clientItem.businessId,
      branchId: clientItem.branchId || clientItem.facilityId,
      staffId: clientItem.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_clients', {
      id: toValidUuid(clientItem.id),
      ...trace,
      name: clientItem.name,
      company: clientItem.company || null,
      email: clientItem.email,
      phone: clientItem.phone || null,
      currency: clientItem.currency,
      hourly_rate: clientItem.hourlyRate,
      status: clientItem.status,
      monthly_retainer_hours: clientItem.monthlyRetainerHours || 0,
      monthly_retainer_amount: clientItem.monthlyRetainerAmount || 0,
      lifetime_billed: clientItem.lifetimeBilled,
      notes: clientItem.notes || null,
    });
    return res.success;
  },

  async fetchProjects(branchId: string, updatedAfter?: string | null): Promise<FreelanceProject[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('freelance_projects')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): FreelanceProject => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        clientId: row.client_id,
        clientName: row.client_name,
        title: row.title,
        description: row.description || '',
        pricingModel: row.pricing_model || 'Fixed',
        currency: row.currency || 'DZD',
        budget: Number(row.budget || 0),
        estimatedHours: Number(row.estimated_hours || 0),
        loggedHours: Number(row.logged_hours || 0),
        stage: row.stage || 'InProgress',
        startDate: row.created_at.split('T')[0],
        deadline: row.deadline || row.created_at.split('T')[0],
        deliverables: row.deliverables || [],
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertProject(project: FreelanceProject): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: project.accountId || project.tenantId,
      businessId: project.businessId,
      branchId: project.branchId || project.facilityId,
      staffId: project.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_projects', {
      id: toValidUuid(project.id),
      ...trace,
      client_id: toValidUuid(project.clientId),
      client_name: project.clientName,
      title: project.title,
      description: project.description,
      pricing_model: project.pricingModel,
      currency: project.currency,
      budget: project.budget,
      estimated_hours: project.estimatedHours,
      logged_hours: project.loggedHours,
      stage: project.stage,
      deadline: project.deadline || null,
      deliverables: project.deliverables || [],
    });
    return res.success;
  },

  async upsertDeliverable(
    deliverable: FreelanceDeliverable,
    ctx: { accountId: string; businessId: string; branchId: string; projectId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_deliverables', {
      id: toValidUuid(deliverable.id),
      ...trace,
      project_id: toValidUuid(ctx.projectId),
      title: deliverable.title,
      description: deliverable.description || null,
      stage: deliverable.stage,
      estimated_hours: deliverable.estimatedHours,
      logged_hours: deliverable.loggedHours,
      due_date: deliverable.dueDate || null,
      completed_at: deliverable.isCompleted ? new Date().toISOString() : null,
    });
    return res.success;
  },

  async fetchTimeLogs(branchId: string, updatedAfter?: string | null): Promise<TimeLogEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('freelance_time_logs')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): TimeLogEntry => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        clientId: row.client_id,
        clientName: row.client_name,
        projectId: row.project_id,
        projectTitle: row.project_title,
        deliverableId: row.deliverable_id || undefined,
        taskDescription: row.task_description,
        durationSeconds: Number(row.duration_seconds || 0),
        isBillable: row.is_billable ?? true,
        isInvoiced: row.is_invoiced ?? false,
        rateAtMoment: Number(row.rate_at_moment || 0),
        currency: row.currency || 'DZD',
        date: row.date || row.created_at.split('T')[0],
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertTimeLog(log: TimeLogEntry): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || log.tenantId,
      businessId: log.businessId,
      branchId: log.branchId || log.facilityId,
      staffId: log.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_time_logs', {
      id: toValidUuid(log.id),
      ...trace,
      client_id: toValidUuid(log.clientId),
      client_name: log.clientName,
      project_id: toValidUuid(log.projectId),
      project_title: log.projectTitle,
      deliverable_id: log.deliverableId ? toValidUuid(log.deliverableId) : null,
      task_description: log.taskDescription,
      duration_seconds: log.durationSeconds,
      is_billable: log.isBillable,
      is_invoiced: log.isInvoiced,
      rate_at_moment: log.rateAtMoment,
      currency: log.currency,
      date: log.date,
    });
    return res.success;
  },

  async fetchInvoices(branchId: string, updatedAfter?: string | null): Promise<FreelanceInvoice[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('freelance_invoices')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): FreelanceInvoice => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        clientId: row.client_id,
        clientName: row.client_name,
        clientCompany: row.client_company || undefined,
        clientEmail: row.client_email,
        invoiceNumber: row.invoice_number,
        currency: row.currency || 'DZD',
        issueDate: row.issue_date || row.created_at.split('T')[0],
        dueDate: row.due_date,
        status: row.status || 'Sent',
        items: row.items || [],
        subtotal: Number(row.subtotal || 0),
        taxPercent: Number(row.tax_percent || 0),
        taxAmount: Number(row.tax_amount || 0),
        totalAmount: Number(row.total_amount || 0),
        paymentDetails: row.payment_details || undefined,
        notes: row.notes || undefined,
        paidAt: row.paid_at || undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertInvoice(invoice: FreelanceInvoice): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: invoice.accountId || invoice.tenantId,
      businessId: invoice.businessId,
      branchId: invoice.branchId || invoice.facilityId,
      staffId: invoice.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_invoices', {
      id: toValidUuid(invoice.id),
      ...trace,
      client_id: toValidUuid(invoice.clientId),
      client_name: invoice.clientName,
      client_company: invoice.clientCompany || null,
      client_email: invoice.clientEmail,
      invoice_number: invoice.invoiceNumber,
      currency: invoice.currency,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      status: invoice.status,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax_percent: invoice.taxPercent,
      tax_amount: invoice.taxAmount,
      total_amount: invoice.totalAmount,
      payment_details: invoice.paymentDetails || null,
      notes: invoice.notes || null,
      paid_at: invoice.paidAt || null,
    });
    return res.success;
  },

  async fetchProposals(branchId: string, updatedAfter?: string | null): Promise<FreelanceProposal[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('freelance_proposals')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): FreelanceProposal => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        clientName: row.client_name,
        clientCompany: row.client_company || undefined,
        clientEmail: row.client_email,
        title: row.title,
        overview: row.overview || '',
        scopeItems: row.scope_items || [],
        pricingModel: row.pricing_model || 'Fixed',
        proposedBudget: Number(row.proposed_budget || row.amount || 0),
        currency: row.currency || 'DZD',
        estimatedTimelineWeeks: Number(row.estimated_timeline_weeks || 4),
        validUntil: row.valid_until || '',
        status: row.status || 'Pending',
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertProposal(prop: FreelanceProposal): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: prop.accountId || prop.tenantId,
      businessId: prop.businessId,
      branchId: prop.branchId || prop.facilityId,
      staffId: prop.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_proposals', {
      id: toValidUuid(prop.id),
      ...trace,
      client_name: prop.clientName,
      client_company: prop.clientCompany || null,
      client_email: prop.clientEmail,
      title: prop.title,
      overview: prop.overview,
      scope_items: prop.scopeItems,
      pricing_model: prop.pricingModel,
      proposed_budget: prop.proposedBudget,
      amount: prop.proposedBudget,
      currency: prop.currency,
      estimated_timeline_weeks: prop.estimatedTimelineWeeks,
      valid_until: prop.validUntil || null,
      status: prop.status,
    });
    return res.success;
  },

  async fetchExpenses(branchId: string, updatedAfter?: string | null): Promise<FreelanceExpense[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('freelance_expenses')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): FreelanceExpense => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        vendor: row.vendor || 'Vendor',
        description: row.description,
        category: row.category || 'Software',
        amount: Number(row.amount || 0),
        currency: row.currency || 'DZD',
        date: row.expense_date || row.date || row.created_at.split('T')[0],
        isTaxDeductible: row.is_tax_deductible ?? true,
        receiptUrl: undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertExpense(exp: FreelanceExpense): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: exp.accountId || exp.tenantId,
      businessId: exp.businessId,
      branchId: exp.branchId || exp.facilityId,
      staffId: exp.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_expenses', {
      id: toValidUuid(exp.id),
      ...trace,
      category: exp.category,
      vendor: exp.vendor,
      description: exp.description,
      amount: exp.amount,
      currency: exp.currency,
      expense_date: exp.date,
      is_tax_deductible: exp.isTaxDeductible,
    });
    return res.success;
  },

  async deleteClient(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_clients', id, deletedByStaffId);
    return res.success;
  },

  async deleteProject(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_projects', id, deletedByStaffId);
    return res.success;
  },

  async deleteTimeLog(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_time_logs', id, deletedByStaffId);
    return res.success;
  },

  async deleteInvoice(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_invoices', id, deletedByStaffId);
    return res.success;
  },

  async deleteProposal(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_proposals', id, deletedByStaffId);
    return res.success;
  },

  async deleteExpense(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_expenses', id, deletedByStaffId);
    return res.success;
  },
};

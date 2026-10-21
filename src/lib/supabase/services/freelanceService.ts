import { getSupabaseClient } from '../client';
import type {
  FreelanceClient,
  FreelanceProject,
  TimeLogEntry,
  FreelanceInvoice,
  FreelanceProposal,
  FreelanceExpense,
} from '../../../types/index';

export const freelanceService = {
  // ============================================================
  // Clients
  // ============================================================
  async fetchClients(branchId: string): Promise<FreelanceClient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('freelance_clients')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[freelanceService] fetchClients warning:', error.message);
        return [];
      }

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
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('freelance_clients')
        .upsert({
          id: clientItem.id,
          account_id: clientItem.accountId || clientItem.tenantId,
          business_id: clientItem.businessId,
          branch_id: clientItem.branchId || clientItem.facilityId,
          staff_id: clientItem.staffId || null,
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

      if (error) {
        console.warn('[freelanceService] upsertClient failed:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Projects
  // ============================================================
  async fetchProjects(branchId: string): Promise<FreelanceProject[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('freelance_projects')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[freelanceService] fetchProjects warning:', error.message);
        return [];
      }

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
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('freelance_projects')
        .upsert({
          id: project.id,
          account_id: project.accountId || project.tenantId,
          business_id: project.businessId,
          branch_id: project.branchId || project.facilityId,
          staff_id: project.staffId || null,
          client_id: project.clientId,
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

      if (error) {
        console.warn('[freelanceService] upsertProject warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Time Logs
  // ============================================================
  async fetchTimeLogs(branchId: string): Promise<TimeLogEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('freelance_time_logs')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[freelanceService] fetchTimeLogs warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): TimeLogEntry => ({
        id: row.id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        clientId: row.client_id,
        clientName: row.client_name,
        projectId: row.project_id,
        projectTitle: row.project_title,
        deliverableId: undefined,
        deliverableTitle: undefined,
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
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('freelance_time_logs')
        .upsert({
          id: log.id,
          account_id: log.tenantId,
          branch_id: log.facilityId,
          client_id: log.clientId,
          client_name: log.clientName,
          project_id: log.projectId,
          project_title: log.projectTitle,
          task_description: log.taskDescription,
          duration_seconds: log.durationSeconds,
          is_billable: log.isBillable,
          is_invoiced: log.isInvoiced,
          rate_at_moment: log.rateAtMoment,
          currency: log.currency,
          date: log.date,
        });

      if (error) {
        console.warn('[freelanceService] upsertTimeLog warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Invoices
  // ============================================================
  async fetchInvoices(branchId: string): Promise<FreelanceInvoice[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('freelance_invoices')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[freelanceService] fetchInvoices warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): FreelanceInvoice => ({
        id: row.id,
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
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('freelance_invoices')
        .upsert({
          id: invoice.id,
          account_id: invoice.tenantId,
          branch_id: invoice.facilityId,
          client_id: invoice.clientId,
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

      if (error) {
        console.warn('[freelanceService] upsertInvoice warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Proposals
  // ============================================================
  async fetchProposals(branchId: string): Promise<FreelanceProposal[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('freelance_proposals')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[freelanceService] fetchProposals warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): FreelanceProposal => ({
        id: row.id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        clientName: row.client_name,
        clientCompany: row.client_company || undefined,
        clientEmail: row.client_email,
        title: row.title,
        overview: row.overview || '',
        scopeItems: row.scope_items || [],
        pricingModel: row.pricing_model || 'Fixed',
        proposedBudget: Number(row.proposed_budget || 0),
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
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('freelance_proposals')
        .upsert({
          id: prop.id,
          account_id: prop.tenantId,
          branch_id: prop.facilityId,
          client_name: prop.clientName,
          client_company: prop.clientCompany || null,
          client_email: prop.clientEmail,
          title: prop.title,
          overview: prop.overview,
          scope_items: prop.scopeItems,
          pricing_model: prop.pricingModel,
          proposed_budget: prop.proposedBudget,
          currency: prop.currency,
          estimated_timeline_weeks: prop.estimatedTimelineWeeks,
          valid_until: prop.validUntil || null,
          status: prop.status,
        });

      if (error) {
        console.warn('[freelanceService] upsertProposal warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // ============================================================
  // Expenses
  // ============================================================
  async fetchExpenses(branchId: string): Promise<FreelanceExpense[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await (client as any)
        .from('freelance_expenses')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[freelanceService] fetchExpenses warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): FreelanceExpense => ({
        id: row.id,
        tenantId: row.account_id,
        facilityId: row.branch_id,
        vendor: row.vendor,
        description: row.description,
        category: row.category || 'Software',
        amount: Number(row.amount || 0),
        currency: row.currency || 'EUR',
        date: row.date || row.created_at.split('T')[0],
        isTaxDeductible: row.is_tax_deductible ?? true,
        receiptUrl: undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertExpense(exp: FreelanceExpense): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await (client as any)
        .from('freelance_expenses')
        .upsert({
          id: exp.id,
          account_id: exp.tenantId,
          branch_id: exp.facilityId,
          category: exp.category,
          vendor: exp.vendor,
          description: exp.description,
          amount: exp.amount,
          currency: exp.currency,
          date: exp.date,
          is_tax_deductible: exp.isTaxDeductible,
        });

      if (error) {
        console.warn('[freelanceService] upsertExpense warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteClient(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await (client as any).from('freelance_clients').delete().eq('id', id);
      if (error) {
        console.warn('[freelanceService] deleteClient warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await (client as any).from('freelance_projects').delete().eq('id', id);
      if (error) {
        console.warn('[freelanceService] deleteProject warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteTimeLog(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await (client as any).from('freelance_time_logs').delete().eq('id', id);
      if (error) {
        console.warn('[freelanceService] deleteTimeLog warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteInvoice(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await (client as any).from('freelance_invoices').delete().eq('id', id);
      if (error) {
        console.warn('[freelanceService] deleteInvoice warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteProposal(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await (client as any).from('freelance_proposals').delete().eq('id', id);
      if (error) {
        console.warn('[freelanceService] deleteProposal warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await (client as any).from('freelance_expenses').delete().eq('id', id);
      if (error) {
        console.warn('[freelanceService] deleteExpense warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },
};

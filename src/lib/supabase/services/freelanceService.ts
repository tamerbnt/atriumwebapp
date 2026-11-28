import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import {
  computeAuthoritativeElapsedSeconds,
  computeInvoiceDzdEquivalentCentimes,
  resolveFreelanceFxRate,
} from '../../../utils/freelanceDepth';
import type {
  ActiveTimerState,
  CurrencyCode,
  FreelanceAutoEntrepreneurConfig,
  FreelanceClient,
  FreelanceClientContract,
  FreelanceContractTemplate,
  FreelanceDeliverable,
  FreelanceExpense,
  FreelanceInvoice,
  FreelancePhotoShoot,
  FreelanceProject,
  FreelanceProposal,
  FreelanceTranslationEntry,
  TimeLogEntry,
} from '../../../types/index';

export const mapFreelanceClientFromDb = (row: any): FreelanceClient => ({
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
  crmPartyId: row.crm_party_id || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapFreelanceProjectFromDb = (row: any): FreelanceProject => {
  const createdDate = row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0];
  return {
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
    startDate: createdDate,
    deadline: row.deadline || createdDate,
    deliverables: row.deliverables || [],
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
  };
};

export const mapTimeLogFromDb = (row: any): TimeLogEntry => {
  const createdDate = row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0];
  return {
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
    date: row.date || createdDate,
    startedAt: row.started_at || undefined,
    endedAt: row.ended_at || undefined,
    splitGroupId: row.split_group_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
  };
};

export const mapFreelanceInvoiceFromDb = (row: any): FreelanceInvoice => {
  const createdDate = row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0];
  const currency = (row.currency || 'DZD') as CurrencyCode;
  const totalAmount = Number(row.total_amount || 0);
  const fxRateToDzd = resolveFreelanceFxRate(currency, row.fx_rate_to_dzd);
  const totalAmountDzdCentimes =
    row.total_amount_dzd_centimes != null && Number(row.total_amount_dzd_centimes) > 0
      ? Number(row.total_amount_dzd_centimes)
      : computeInvoiceDzdEquivalentCentimes(totalAmount, currency, fxRateToDzd);

  return {
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
    currency,
    fxRateToDzd,
    totalAmountDzdCentimes,
    unifiedDocumentId: row.unified_document_id || undefined,
    issueDate: row.issue_date || createdDate,
    dueDate: row.due_date,
    status: row.status || 'Sent',
    items: row.items || [],
    subtotal: Number(row.subtotal || 0),
    taxPercent: Number(row.tax_percent || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount,
    isRecurring: row.is_recurring ?? false,
    recurrenceInterval: row.recurrence_interval || undefined,
    nextRecurrenceDate: row.next_recurrence_date || undefined,
    lastRemindedAt: row.last_reminded_at || undefined,
    shareToken: row.share_token || undefined,
    paymentDetails: row.payment_details || undefined,
    notes: row.notes || undefined,
    paidAt: row.paid_at || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
  };
};

export const mapFreelanceProposalFromDb = (row: any): FreelanceProposal => ({
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
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapFreelanceExpenseFromDb = (row: any): FreelanceExpense => {
  const createdDate = row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0];
  return {
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
    date: row.expense_date || row.date || createdDate,
    isTaxDeductible: row.is_tax_deductible ?? true,
    receiptUrl: row.receipt_url || undefined,
    receiptStoragePath: row.receipt_storage_path || undefined,
    receiptFileName: row.receipt_file_name || undefined,
    receiptMimeType: row.receipt_mime_type || undefined,
    receiptSizeBytes: row.receipt_size_bytes != null ? Number(row.receipt_size_bytes) : undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
  };
};

export const mapActiveTimerFromDb = (row: any): ActiveTimerState => {
  const base: ActiveTimerState = {
    id: row.id,
    isRunning: Boolean(row.is_running),
    isPaused: Boolean(row.is_paused),
    clientId: row.client_id || '',
    clientName: row.client_name || '',
    projectId: row.project_id || '',
    projectTitle: row.project_title || '',
    deliverableId: row.deliverable_id || undefined,
    deliverableTitle: row.deliverable_title || undefined,
    taskDescription: row.task_description || '',
    accumulatedSeconds: Number(row.accumulated_seconds || 0),
    elapsedSeconds: 0,
    isBillable: row.is_billable ?? true,
    isPomodoro: row.is_pomodoro ?? false,
    pomodoroRemainingSeconds: Number(row.pomodoro_remaining_seconds || 1500),
    pomodoroMode: row.pomodoro_mode === 'break' ? 'break' : 'work',
    startedAt: row.started_at || null,
    lastHeartbeatAt: row.last_heartbeat_at || null,
    sourceDeviceId: row.source_device_id || row.device_id || null,
    version: row.version != null ? Number(row.version) : undefined,
  };
  return {
    ...base,
    elapsedSeconds: computeAuthoritativeElapsedSeconds(base, Date.now()),
  };
};

export const mapFreelanceAeConfigFromDb = (row: any): FreelanceAutoEntrepreneurConfig => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  effectiveFrom: row.effective_from || '2026-01-01',
  annualTurnoverCeilingDzd: Number(row.annual_turnover_ceiling_dzd || 5000000),
  contributionRatePct: Number(row.contribution_rate_pct ?? 5),
  taxRatePct: Number(row.tax_rate_pct ?? 0.5),
  tradeSpecialty: row.trade_specialty || undefined,
  verificationStatus: row.verification_status === 'verified' ? 'verified' : 'unverified',
  verifiedBy: row.verified_by || undefined,
  verifiedAt: row.verified_at || undefined,
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapFreelanceContractTemplateFromDb = (row: any): FreelanceContractTemplate => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  templateKey: row.template_key,
  category: row.category || 'service_agreement',
  title: row.title,
  bodyTemplate: row.body_template || '',
  variablesSchema: Array.isArray(row.variables_schema) ? row.variables_schema : [],
  isSystemPreset: Boolean(row.is_system_preset),
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapFreelanceClientContractFromDb = (row: any): FreelanceClientContract => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  clientId: row.client_id || '',
  clientName: row.client_name,
  templateId: row.template_id || undefined,
  contractNumber: row.contract_number,
  category: row.category || 'service_agreement',
  title: row.title,
  renderedBody: row.rendered_body || '',
  currency: (row.currency || 'DZD') as CurrencyCode,
  contractValue: Number(row.contract_value || 0),
  effectiveDate: row.effective_date || new Date().toISOString().slice(0, 10),
  expiryDate: row.expiry_date || undefined,
  status: row.status || 'draft',
  signedAt: row.signed_at || undefined,
  signerName: row.signer_name || undefined,
  signatureHash: row.signature_hash || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapFreelanceTranslationFromDb = (row: any): FreelanceTranslationEntry => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  registerNumber: row.register_number,
  clientId: row.client_id || '',
  clientName: row.client_name,
  sourceLanguage: row.source_language,
  targetLanguage: row.target_language,
  documentTitle: row.document_title,
  certificationKind: row.certification_kind || 'sworn_official',
  pricingUnit: row.pricing_unit || 'page',
  unitCount: Number(row.unit_count || 1),
  unitRate: Number(row.unit_rate || 0),
  totalAmount: Number(row.total_amount || 0),
  currency: (row.currency || 'DZD') as CurrencyCode,
  issuedDate: row.issued_date || new Date().toISOString().slice(0, 10),
  swornSealRef: row.sworn_seal_ref || undefined,
  invoiceId: row.invoice_id || undefined,
  status: row.status || 'logged',
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapFreelancePhotoShootFromDb = (row: any): FreelancePhotoShoot => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  clientId: row.client_id || '',
  clientName: row.client_name,
  shootTitle: row.shoot_title,
  location: row.location || undefined,
  shootDate: row.shoot_date,
  startTime: row.start_time,
  endTime: row.end_time,
  packageName: row.package_name || undefined,
  packageFee: Number(row.package_fee || 0),
  currency: (row.currency || 'DZD') as CurrencyCode,
  galleryUrl: row.gallery_url || undefined,
  galleryStatus: row.gallery_status || 'scheduled',
  deliverablesCount: Number(row.deliverables_count || 0),
  selectedCount: Number(row.selected_count || 0),
  watermarkEnabled: row.watermark_enabled ?? true,
  invoiceId: row.invoice_id || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const freelanceService = {
  async fetchClients(branchId: string, updatedAfter?: string | null): Promise<FreelanceClient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_clients')
          .select(
            'id, account_id, business_id, branch_id, staff_id, name, company, email, phone, currency, hourly_rate, status, monthly_retainer_hours, monthly_retainer_amount, notes, lifetime_billed, crm_party_id, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapFreelanceClientFromDb);
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
    const payload = {
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
      crm_party_id: clientItem.crmPartyId ? toValidUuid(clientItem.crmPartyId) : null,
      notes: clientItem.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_clients', payload, {
      expectedVersion: clientItem.version,
      entityType: 'FreelanceClient',
      entityLabel: clientItem.name,
      localData: payload,
    });
    return res.success;
  },

  async fetchProjects(branchId: string, updatedAfter?: string | null): Promise<FreelanceProject[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_projects')
          .select(
            'id, account_id, business_id, branch_id, staff_id, client_id, client_name, title, description, pricing_model, currency, budget, estimated_hours, logged_hours, stage, deadline, deliverables, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapFreelanceProjectFromDb);
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
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_projects', payload, {
      expectedVersion: project.version,
      entityType: 'FreelanceProject',
      entityLabel: project.title,
      localData: payload,
    });
    return res.success;
  },

  async upsertDeliverable(
    deliverable: FreelanceDeliverable,
    ctx: { accountId: string; businessId: string; branchId: string; projectId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_deliverables', payload, {
      expectedVersion: deliverable.version,
      entityType: 'FreelanceDeliverable',
      entityLabel: deliverable.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchTimeLogs(branchId: string, updatedAfter?: string | null): Promise<TimeLogEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_time_logs')
          .select(
            'id, account_id, business_id, branch_id, staff_id, client_id, client_name, project_id, project_title, deliverable_id, task_description, duration_seconds, is_billable, is_invoiced, rate_at_moment, currency, date, started_at, ended_at, split_group_id, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapTimeLogFromDb);
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
    const payload = {
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
      started_at: log.startedAt || null,
      ended_at: log.endedAt || null,
      split_group_id: log.splitGroupId || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_time_logs', payload, {
      expectedVersion: log.version,
      entityType: 'TimeLogEntry',
      entityLabel: log.taskDescription,
      localData: payload,
    });
    return res.success;
  },

  async fetchInvoices(branchId: string, updatedAfter?: string | null): Promise<FreelanceInvoice[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_invoices')
          .select(
            'id, account_id, business_id, branch_id, staff_id, client_id, client_name, client_company, client_email, invoice_number, currency, fx_rate_to_dzd, total_amount_dzd_centimes, unified_document_id, issue_date, due_date, status, items, subtotal, tax_percent, tax_amount, total_amount, is_recurring, recurrence_interval, next_recurrence_date, last_reminded_at, share_token, payment_details, notes, paid_at, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapFreelanceInvoiceFromDb);
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
    const fxRateToDzd = resolveFreelanceFxRate(invoice.currency, invoice.fxRateToDzd);
    const totalAmountDzdCentimes =
      invoice.totalAmountDzdCentimes != null && invoice.totalAmountDzdCentimes > 0
        ? invoice.totalAmountDzdCentimes
        : computeInvoiceDzdEquivalentCentimes(invoice.totalAmount, invoice.currency, fxRateToDzd);

    const payload = {
      id: toValidUuid(invoice.id),
      ...trace,
      client_id: toValidUuid(invoice.clientId),
      client_name: invoice.clientName,
      client_company: invoice.clientCompany || null,
      client_email: invoice.clientEmail,
      invoice_number: invoice.invoiceNumber,
      currency: invoice.currency,
      fx_rate_to_dzd: fxRateToDzd,
      total_amount_dzd_centimes: totalAmountDzdCentimes,
      unified_document_id: invoice.unifiedDocumentId ? toValidUuid(invoice.unifiedDocumentId) : null,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      status: invoice.status,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax_percent: invoice.taxPercent,
      tax_amount: invoice.taxAmount,
      total_amount: invoice.totalAmount,
      is_recurring: Boolean(invoice.isRecurring),
      recurrence_interval: invoice.recurrenceInterval || null,
      next_recurrence_date: invoice.nextRecurrenceDate || null,
      last_reminded_at: invoice.lastRemindedAt || null,
      share_token: invoice.shareToken || null,
      payment_details: invoice.paymentDetails || null,
      notes: invoice.notes || null,
      paid_at: invoice.paidAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_invoices', payload, {
      expectedVersion: invoice.version,
      entityType: 'FreelanceInvoice',
      entityLabel: invoice.invoiceNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchProposals(branchId: string, updatedAfter?: string | null): Promise<FreelanceProposal[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_proposals')
          .select(
            'id, account_id, business_id, branch_id, staff_id, client_name, client_company, client_email, title, overview, scope_items, pricing_model, proposed_budget, currency, estimated_timeline_weeks, valid_until, status, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapFreelanceProposalFromDb);
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
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_proposals', payload, {
      expectedVersion: prop.version,
      entityType: 'FreelanceProposal',
      entityLabel: prop.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchExpenses(branchId: string, updatedAfter?: string | null): Promise<FreelanceExpense[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_expenses')
          .select(
            'id, account_id, business_id, branch_id, staff_id, vendor, description, category, amount, currency, expense_date, is_tax_deductible, receipt_url, receipt_storage_path, receipt_file_name, receipt_mime_type, receipt_size_bytes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapFreelanceExpenseFromDb);
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
    const payload = {
      id: toValidUuid(exp.id),
      ...trace,
      category: exp.category,
      vendor: exp.vendor,
      description: exp.description,
      amount: exp.amount,
      currency: exp.currency,
      expense_date: exp.date,
      is_tax_deductible: exp.isTaxDeductible,
      receipt_url: exp.receiptUrl || null,
      receipt_storage_path: exp.receiptStoragePath || null,
      receipt_file_name: exp.receiptFileName || null,
      receipt_mime_type: exp.receiptMimeType || null,
      receipt_size_bytes: exp.receiptSizeBytes ?? null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_expenses', payload, {
      expectedVersion: exp.version,
      entityType: 'FreelanceExpense',
      entityLabel: `${exp.vendor} — ${exp.description}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchActiveTimer(branchId: string): Promise<ActiveTimerState | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await (client as any)
        .from('freelance_active_timers')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error || !Array.isArray(data) || data.length === 0) return null;
      return mapActiveTimerFromDb(data[0]);
    } catch {
      return null;
    }
  },

  async upsertActiveTimer(
    timer: ActiveTimerState,
    ctx: { accountId: string; businessId: string; branchId: string; staffId?: string | null }
  ): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueRpc('upsert_freelance_active_timer', {
      p_account_id: toValidUuid(ctx.accountId),
      p_business_id: toValidUuid(ctx.businessId),
      p_branch_id: toValidUuid(ctx.branchId),
      p_staff_id: ctx.staffId ? toValidUuid(ctx.staffId) : null,
      p_client_id: timer.clientId ? toValidUuid(timer.clientId) : null,
      p_client_name: timer.clientName || null,
      p_project_id: timer.projectId ? toValidUuid(timer.projectId) : null,
      p_project_title: timer.projectTitle || null,
      p_deliverable_id: timer.deliverableId ? toValidUuid(timer.deliverableId) : null,
      p_deliverable_title: timer.deliverableTitle || null,
      p_task_description: timer.taskDescription || '',
      p_started_at: timer.startedAt || new Date().toISOString(),
      p_accumulated_seconds: Math.max(0, Math.floor(timer.accumulatedSeconds ?? timer.elapsedSeconds ?? 0)),
      p_is_running: timer.isRunning,
      p_is_paused: timer.isPaused,
      p_is_billable: timer.isBillable,
      p_is_pomodoro: timer.isPomodoro,
      p_pomodoro_remaining_seconds: timer.pomodoroRemainingSeconds,
      p_pomodoro_mode: timer.pomodoroMode,
      p_device_id: timer.sourceDeviceId || null,
    });
    return res.success;
  },

  async stopActiveTimer(timerId: string, stopAtIso = new Date().toISOString()): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueRpc('stop_freelance_active_timer', {
      p_timer_id: toValidUuid(timerId),
      p_stop_at: stopAtIso,
    });
    return res.success;
  },

  async uninvoiceTimeLogs(invoiceId: string, timeLogIds: string[]): Promise<boolean> {
    if (timeLogIds.length === 0) return true;
    const res = await syncCoordinator.mutateOrQueueRpc('uninvoice_freelance_invoice_logs', {
      p_invoice_id: toValidUuid(invoiceId),
      p_time_log_ids: timeLogIds.map((id) => toValidUuid(id)),
    });
    return res.success;
  },

  async fetchAeConfigs(branchId: string, updatedAfter?: string | null): Promise<FreelanceAutoEntrepreneurConfig[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_auto_entrepreneur_configs')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('effective_from', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map(mapFreelanceAeConfigFromDb);
    } catch {
      return [];
    }
  },

  async upsertAeConfig(cfg: FreelanceAutoEntrepreneurConfig): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: cfg.accountId,
      businessId: cfg.businessId,
      branchId: cfg.branchId,
      staffId: cfg.staffId,
    });
    const payload = {
      id: toValidUuid(cfg.id),
      ...trace,
      effective_from: cfg.effectiveFrom,
      annual_turnover_ceiling_dzd: cfg.annualTurnoverCeilingDzd,
      contribution_rate_pct: cfg.contributionRatePct,
      tax_rate_pct: cfg.taxRatePct,
      trade_specialty: cfg.tradeSpecialty || null,
      verification_status: cfg.verificationStatus,
      verified_by: cfg.verifiedBy || null,
      verified_at: cfg.verifiedAt || null,
      notes: cfg.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_auto_entrepreneur_configs', payload, {
      expectedVersion: cfg.version,
      entityType: 'FreelanceAutoEntrepreneurConfig',
      entityLabel: `AE ${cfg.effectiveFrom}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchContractTemplates(branchId: string, updatedAfter?: string | null): Promise<FreelanceContractTemplate[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_contract_templates')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map(mapFreelanceContractTemplateFromDb);
    } catch {
      return [];
    }
  },

  async upsertContractTemplate(tpl: FreelanceContractTemplate): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: tpl.accountId,
      businessId: tpl.businessId,
      branchId: tpl.branchId,
    });
    const payload = {
      id: toValidUuid(tpl.id),
      ...trace,
      template_key: tpl.templateKey,
      category: tpl.category,
      title: tpl.title,
      body_template: tpl.bodyTemplate,
      variables_schema: tpl.variablesSchema || [],
      is_system_preset: Boolean(tpl.isSystemPreset),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_contract_templates', payload, {
      expectedVersion: tpl.version,
      entityType: 'FreelanceContractTemplate',
      entityLabel: tpl.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchClientContracts(branchId: string, updatedAfter?: string | null): Promise<FreelanceClientContract[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_client_contracts')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map(mapFreelanceClientContractFromDb);
    } catch {
      return [];
    }
  },

  async upsertClientContract(contract: FreelanceClientContract): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: contract.accountId,
      businessId: contract.businessId,
      branchId: contract.branchId,
      staffId: contract.staffId,
    });
    const payload = {
      id: toValidUuid(contract.id),
      ...trace,
      client_id: contract.clientId ? toValidUuid(contract.clientId) : null,
      client_name: contract.clientName,
      template_id: contract.templateId ? toValidUuid(contract.templateId) : null,
      contract_number: contract.contractNumber,
      category: contract.category,
      title: contract.title,
      rendered_body: contract.renderedBody,
      currency: contract.currency,
      contract_value: contract.contractValue,
      effective_date: contract.effectiveDate,
      expiry_date: contract.expiryDate || null,
      status: contract.status,
      signed_at: contract.signedAt || null,
      signer_name: contract.signerName || null,
      signature_hash: contract.signatureHash || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_client_contracts', payload, {
      expectedVersion: contract.version,
      entityType: 'FreelanceClientContract',
      entityLabel: contract.contractNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchTranslationRegisters(branchId: string, updatedAfter?: string | null): Promise<FreelanceTranslationEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_translation_registers')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map(mapFreelanceTranslationFromDb);
    } catch {
      return [];
    }
  },

  async upsertTranslationRegister(entry: FreelanceTranslationEntry): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      register_number: entry.registerNumber,
      client_id: entry.clientId ? toValidUuid(entry.clientId) : null,
      client_name: entry.clientName,
      source_language: entry.sourceLanguage,
      target_language: entry.targetLanguage,
      document_title: entry.documentTitle,
      certification_kind: entry.certificationKind,
      pricing_unit: entry.pricingUnit,
      unit_count: entry.unitCount,
      unit_rate: entry.unitRate,
      total_amount: entry.totalAmount,
      currency: entry.currency,
      issued_date: entry.issuedDate,
      sworn_seal_ref: entry.swornSealRef || null,
      invoice_id: entry.invoiceId ? toValidUuid(entry.invoiceId) : null,
      status: entry.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_translation_registers', payload, {
      expectedVersion: entry.version,
      entityType: 'FreelanceTranslationEntry',
      entityLabel: entry.registerNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchPhotoShoots(branchId: string, updatedAfter?: string | null): Promise<FreelancePhotoShoot[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('freelance_photo_shoots')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('shoot_date', { ascending: true })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map(mapFreelancePhotoShootFromDb);
    } catch {
      return [];
    }
  },

  async upsertPhotoShoot(shoot: FreelancePhotoShoot): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: shoot.accountId,
      businessId: shoot.businessId,
      branchId: shoot.branchId,
      staffId: shoot.staffId,
    });
    const payload = {
      id: toValidUuid(shoot.id),
      ...trace,
      client_id: shoot.clientId ? toValidUuid(shoot.clientId) : null,
      client_name: shoot.clientName,
      shoot_title: shoot.shootTitle,
      location: shoot.location || null,
      shoot_date: shoot.shootDate,
      start_time: shoot.startTime,
      end_time: shoot.endTime,
      package_name: shoot.packageName || null,
      package_fee: shoot.packageFee,
      currency: shoot.currency,
      gallery_url: shoot.galleryUrl || null,
      gallery_status: shoot.galleryStatus,
      deliverables_count: shoot.deliverablesCount,
      selected_count: shoot.selectedCount,
      watermark_enabled: shoot.watermarkEnabled,
      invoice_id: shoot.invoiceId ? toValidUuid(shoot.invoiceId) : null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('freelance_photo_shoots', payload, {
      expectedVersion: shoot.version,
      entityType: 'FreelancePhotoShoot',
      entityLabel: shoot.shootTitle,
      localData: payload,
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

  async deleteClientContract(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_client_contracts', id, deletedByStaffId);
    return res.success;
  },

  async deleteTranslationRegister(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_translation_registers', id, deletedByStaffId);
    return res.success;
  },

  async deletePhotoShoot(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('freelance_photo_shoots', id, deletedByStaffId);
    return res.success;
  },
};

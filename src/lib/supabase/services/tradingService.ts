import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  B2bClient,
  B2bSupplier,
  WarehouseDepot,
  Product,
  CommercialDocument,
  CommercialDocType,
  PurchaseDocument,
  PurchaseDocType,
  StockMovementVoucher,
  StockVoucherType,
} from '../../../types/index';

type DbCommercialDocType = 'devis' | 'commande' | 'bl' | 'facture' | 'avoir';
type DbPurchaseDocType = 'da' | 'po' | 'br' | 'facture_achat';
type DbVoucherType = 'entree' | 'sortie' | 'transfert' | 'inventaire';

const META_PREFIX = '__atrium_meta__:';

function packNotesWithMeta(plainNotes: string | undefined, meta: Record<string, any>): string {
  return `${META_PREFIX}${JSON.stringify({ notes: plainNotes || '', ...meta })}`;
}

function unpackNotesMeta(raw: string | null | undefined): { notes: string; meta: Record<string, any> } {
  if (!raw) return { notes: '', meta: {} };
  if (raw.startsWith(META_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(META_PREFIX.length));
      const { notes = '', ...meta } = parsed || {};
      return { notes, meta };
    } catch {
      return { notes: raw, meta: {} };
    }
  }
  return { notes: raw, meta: {} };
}

function toDbCommercialType(t: CommercialDocType): DbCommercialDocType {
  if (t === 'retour') return 'avoir';
  return t;
}

function toDbPurchaseType(t: PurchaseDocType): DbPurchaseDocType {
  if (t === 'facture_fournisseur' || t === 'avoir_fournisseur' || t === 'retour_fournisseur') {
    return 'facture_achat';
  }
  return t;
}

function toDbVoucherType(t: StockVoucherType): DbVoucherType {
  return t;
}

export const mapWarehouseFromDb = (row: any): WarehouseDepot => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  code: row.code,
  name: row.name,
  address: row.address || '',
  city: row.wilaya || '',
  managerName: row.manager_name || undefined,
  isMain: Boolean(row.is_default),
  totalSkusCount: 0,
  totalValuationDzd: 0,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapB2bClientFromDb = (row: any): B2bClient => {
  const { meta } = unpackNotesMeta(row.notes);
  const termsMatch = String(row.payment_terms || '').match(/(\d+)/);
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    staffId: row.staff_id || undefined,
    tenantId: row.account_id,
    facilityId: row.branch_id,
    companyName: row.company_name,
    sector: meta.sector || undefined,
    email: row.email || '',
    phone: row.phone || '',
    fax: meta.fax || undefined,
    address: row.address || '',
    city: row.wilaya || '',
    postalCode: meta.postalCode || undefined,
    country: meta.country || 'Algérie',
    rc: row.rc_number || '',
    nif: row.nif || '',
    nis: row.nis || '',
    ai: row.article_imposition || '',
    ribCcp: meta.ribCcp || undefined,
    tags: meta.tags || undefined,
    contactName: row.contact_name || '',
    contactEmail: meta.contactEmail || undefined,
    contactPhone: meta.contactPhone || undefined,
    contactRole: meta.contactRole || undefined,
    creditLimit: Number(row.credit_limit_dzd || 0),
    outstandingBalance: Number(row.current_balance_dzd || 0),
    paymentTermsDays: meta.paymentTermsDays ?? (termsMatch ? Number(termsMatch[1]) : 0),
    defaultPaymentMethod: meta.defaultPaymentMethod || row.payment_terms || 'Virement',
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapB2bSupplierFromDb = (row: any): B2bSupplier => {
  const { meta } = unpackNotesMeta(row.notes);
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    staffId: row.staff_id || undefined,
    tenantId: row.account_id,
    facilityId: row.branch_id,
    supplierName: row.supplier_name,
    sector: meta.sector || undefined,
    email: row.email || '',
    phone: row.phone || '',
    fax: meta.fax || undefined,
    address: row.address || '',
    city: row.wilaya || '',
    postalCode: meta.postalCode || undefined,
    country: meta.country || 'Algérie',
    rc: row.rc_number || undefined,
    nif: row.nif || undefined,
    nis: row.nis || undefined,
    ai: meta.ai || undefined,
    ribCcp: meta.ribCcp || undefined,
    contactName: row.contact_name || undefined,
    contactEmail: meta.contactEmail || undefined,
    contactPhone: meta.contactPhone || undefined,
    paymentTermsDays: meta.paymentTermsDays ?? Number(row.lead_time_days || 7),
    outstandingPayable: Number(row.balance_payable_dzd || 0),
    tags: meta.tags || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapTradingProductFromDb = (row: any): Product => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  sku: row.sku,
  name: row.name,
  description: row.name,
  category: row.category || 'General',
  unit: row.unit || 'pcs',
  price: { amount: Number(row.selling_price_ht || 0), currency: 'DZD' },
  cost: { amount: Number(row.purchase_price_ht || 0), currency: 'DZD' },
  costPrice: Number(row.purchase_price_ht || 0),
  taxRate: Number(row.tva_rate ?? 19),
  stockQuantity: Number(row.stock_quantity || 0),
  reorderLevel: Number(row.min_stock_alert || 10),
  isActive: row.is_active ?? true,
  isPinned: false,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapCommercialDocFromDb = (row: any): CommercialDocument => {
  const { notes, meta } = unpackNotesMeta(row.notes);
  const totalHtFinal = Number(row.total_ht || 0);
  const totalTtc = Number(row.total_ttc || 0);
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    staffId: row.staff_id || undefined,
    tenantId: row.account_id,
    facilityId: row.branch_id,
    type: (meta.origType || row.doc_type || 'devis') as CommercialDocType,
    docNumber: row.doc_number,
    clientId: row.client_id || '',
    clientName: row.client_name,
    clientNif: meta.clientNif || undefined,
    clientRc: meta.clientRc || undefined,
    clientAi: meta.clientAi || undefined,
    depotId: row.depot_id || '',
    depotName: meta.depotName || undefined,
    date: row.doc_date || (row.created_at ? String(row.created_at).split('T')[0] : ''),
    validityDays: meta.validityDays,
    dueDate: row.due_date || undefined,
    paymentMethod: row.payment_method || 'Virement',
    paymentTerms: meta.paymentTerms || 'Comptant',
    status: (row.status || 'Draft') as CommercialDocument['status'],
    items: Array.isArray(row.items) ? row.items : [],
    totalHtRaw: meta.totalHtRaw ?? totalHtFinal,
    generalDiscountPercent: meta.generalDiscountPercent ?? 0,
    totalHtFinal,
    totalTva: Number(row.total_tva || 0),
    timbreFiscal: Number(row.timbre_fiscal || 0),
    totalTtc,
    guaranteeRetentionPercent: meta.guaranteeRetentionPercent ?? 0,
    guaranteeRetentionAmount: meta.guaranteeRetentionAmount ?? 0,
    netToPay: meta.netToPay ?? totalTtc,
    currency: meta.currency || 'DZD',
    notesTop: notes || undefined,
    notesBottom: meta.notesBottom || undefined,
    includeStampSignature: meta.includeStampSignature ?? true,
    linkedDocId: row.linked_doc_id || undefined,
    linkedDocNumber: row.linked_doc_number || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapPurchaseDocFromDb = (row: any): PurchaseDocument => {
  const { notes, meta } = unpackNotesMeta(row.notes);
  const mappedType: PurchaseDocType =
    meta.origType || (row.doc_type === 'facture_achat' ? 'facture_fournisseur' : row.doc_type) || 'po';
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    staffId: row.staff_id || undefined,
    tenantId: row.account_id,
    facilityId: row.branch_id,
    type: mappedType,
    docNumber: row.doc_number,
    supplierId: row.supplier_id || '',
    supplierName: row.supplier_name,
    depotId: row.depot_id || '',
    depotName: row.depot_name || undefined,
    orderDate: row.doc_date || (row.created_at ? String(row.created_at).split('T')[0] : ''),
    deliveryExpectedDate: row.expected_delivery_date || undefined,
    actualDeliveryDate: row.actual_delivery_date || undefined,
    status: (row.status || 'Draft') as PurchaseDocument['status'],
    items: Array.isArray(row.items) ? row.items : [],
    totalHt: Number(row.total_ht || 0),
    totalTva: Number(row.total_tva || 0),
    totalTtc: Number(row.total_ttc || 0),
    currency: meta.currency || 'DZD',
    linkedPoId: row.linked_po_id || undefined,
    linkedPoNumber: row.linked_po_number || undefined,
    notes: notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapStockVoucherFromDb = (row: any): StockMovementVoucher => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  voucherNumber: row.voucher_number,
  type: (row.voucher_type === 'inventaire' ? 'entree' : row.voucher_type) as StockVoucherType,
  date: row.voucher_date || (row.created_at ? String(row.created_at).split('T')[0] : ''),
  depotSourceId: row.depot_source_id || '',
  depotSourceName: row.depot_source_name || '',
  depotTargetId: row.depot_dest_id || undefined,
  depotTargetName: row.depot_dest_name || undefined,
  reason: (row.reason || 'ajustement_inventaire') as StockMovementVoucher['reason'],
  operatorName: row.operator_name || 'Système',
  items: Array.isArray(row.items) ? row.items : [],
  totalValuationDzd: Number(row.total_valuation_dzd || 0),
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const tradingService = {
  async fetchWarehouses(branchId: string, updatedAfter?: string | null): Promise<WarehouseDepot[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('trading_warehouses')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapWarehouseFromDb);
    } catch {
      return [];
    }
  },

  async upsertWarehouse(warehouse: WarehouseDepot): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: warehouse.accountId || warehouse.tenantId || 'acc_01',
      businessId: warehouse.businessId,
      branchId: warehouse.branchId || warehouse.facilityId,
      staffId: warehouse.staffId,
    });
    const payload = {
      id: toValidUuid(warehouse.id),
      ...trace,
      code: warehouse.code,
      name: warehouse.name,
      wilaya: warehouse.city || null,
      address: warehouse.address || null,
      manager_name: warehouse.managerName || null,
      is_default: Boolean(warehouse.isMain),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('trading_warehouses', payload, {
      expectedVersion: warehouse.version,
      entityType: 'WarehouseDepot',
      entityLabel: warehouse.name,
      localData: payload,
    });
    return res.success;
  },

  async deleteWarehouse(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('trading_warehouses', id, deletedByStaffId);
    return res.success;
  },

  async fetchClients(branchId: string, updatedAfter?: string | null): Promise<B2bClient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('trading_b2b_clients')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapB2bClientFromDb);
    } catch {
      return [];
    }
  },

  async upsertClient(clientItem: B2bClient): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: clientItem.accountId || clientItem.tenantId || 'acc_01',
      businessId: clientItem.businessId,
      branchId: clientItem.branchId || clientItem.facilityId,
      staffId: clientItem.staffId,
    });
    const payload = {
      id: toValidUuid(clientItem.id),
      ...trace,
      company_name: clientItem.companyName,
      contact_name: clientItem.contactName || null,
      phone: clientItem.phone || null,
      email: clientItem.email || null,
      address: clientItem.address || null,
      wilaya: clientItem.city || null,
      rc_number: clientItem.rc || null,
      nif: clientItem.nif || null,
      nis: clientItem.nis || null,
      article_imposition: clientItem.ai || null,
      credit_limit_dzd: Number(clientItem.creditLimit || 0),
      current_balance_dzd: Number(clientItem.outstandingBalance || 0),
      payment_terms:
        clientItem.paymentTermsDays > 0
          ? `${clientItem.paymentTermsDays} jours`
          : clientItem.defaultPaymentMethod || 'Comptant',
      notes: packNotesWithMeta(undefined, {
        sector: clientItem.sector,
        fax: clientItem.fax,
        postalCode: clientItem.postalCode,
        country: clientItem.country,
        ribCcp: clientItem.ribCcp,
        tags: clientItem.tags,
        contactEmail: clientItem.contactEmail,
        contactPhone: clientItem.contactPhone,
        contactRole: clientItem.contactRole,
        paymentTermsDays: clientItem.paymentTermsDays,
        defaultPaymentMethod: clientItem.defaultPaymentMethod,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('trading_b2b_clients', payload, {
      expectedVersion: clientItem.version,
      entityType: 'B2bClient',
      entityLabel: clientItem.companyName,
      localData: payload,
    });
    return res.success;
  },

  async deleteClient(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('trading_b2b_clients', id, deletedByStaffId);
    return res.success;
  },

  async fetchSuppliers(branchId: string, updatedAfter?: string | null): Promise<B2bSupplier[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('trading_b2b_suppliers')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapB2bSupplierFromDb);
    } catch {
      return [];
    }
  },

  async upsertSupplier(supplier: B2bSupplier): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: supplier.accountId || supplier.tenantId || 'acc_01',
      businessId: supplier.businessId,
      branchId: supplier.branchId || supplier.facilityId,
      staffId: supplier.staffId,
    });
    const payload = {
      id: toValidUuid(supplier.id),
      ...trace,
      supplier_name: supplier.supplierName,
      contact_name: supplier.contactName || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address: supplier.address || null,
      wilaya: supplier.city || null,
      rc_number: supplier.rc || null,
      nif: supplier.nif || null,
      nis: supplier.nis || null,
      balance_payable_dzd: Number(supplier.outstandingPayable || 0),
      lead_time_days: Number(supplier.paymentTermsDays || 7),
      notes: packNotesWithMeta(undefined, {
        sector: supplier.sector,
        fax: supplier.fax,
        postalCode: supplier.postalCode,
        country: supplier.country,
        ai: supplier.ai,
        ribCcp: supplier.ribCcp,
        contactEmail: supplier.contactEmail,
        contactPhone: supplier.contactPhone,
        paymentTermsDays: supplier.paymentTermsDays,
        tags: supplier.tags,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('trading_b2b_suppliers', payload, {
      expectedVersion: supplier.version,
      entityType: 'B2bSupplier',
      entityLabel: supplier.supplierName,
      localData: payload,
    });
    return res.success;
  },

  async deleteSupplier(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('trading_b2b_suppliers', id, deletedByStaffId);
    return res.success;
  },

  async fetchProducts(branchId: string, updatedAfter?: string | null): Promise<Product[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('trading_products')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapTradingProductFromDb);
    } catch {
      return [];
    }
  },

  async upsertProduct(product: Product, depotId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: product.accountId || product.tenantId || 'acc_01',
      businessId: product.businessId,
      branchId: product.branchId || product.facilityId,
      staffId: product.staffId,
    });
    const payload = {
      id: toValidUuid(product.id),
      ...trace,
      sku: product.sku || product.id,
      name: product.name,
      category: product.category || 'Wholesale',
      unit: product.unit || 'U',
      purchase_price_ht: Number(product.costPrice ?? product.cost?.amount ?? 0),
      selling_price_ht: Number(product.price?.amount ?? 0),
      tva_rate: Number(product.taxRate ?? 19),
      stock_quantity: Number(product.stockQuantity ?? 0),
      min_stock_alert: Number(product.reorderLevel ?? 10),
      depot_id: depotId ? toValidUuid(depotId) : null,
      is_active: product.isActive ?? true,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('trading_products', payload, {
      expectedVersion: product.version,
      entityType: 'TradingProduct',
      entityLabel: product.name,
      localData: payload,
    });
    return res.success;
  },

  async deleteProduct(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('trading_products', id, deletedByStaffId);
    return res.success;
  },

  async fetchCommercialDocs(branchId: string, updatedAfter?: string | null): Promise<CommercialDocument[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('trading_commercial_docs')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapCommercialDocFromDb);
    } catch {
      return [];
    }
  },

  async upsertCommercialDoc(doc: CommercialDocument): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: doc.accountId || doc.tenantId || 'acc_01',
      businessId: doc.businessId,
      branchId: doc.branchId || doc.facilityId,
      staffId: doc.staffId,
    });
    const payload = {
      id: toValidUuid(doc.id),
      ...trace,
      doc_type: toDbCommercialType(doc.type),
      doc_number: doc.docNumber,
      doc_date: doc.date || new Date().toISOString().split('T')[0],
      due_date: doc.dueDate || null,
      client_id: doc.clientId ? toValidUuid(doc.clientId) : null,
      client_name: doc.clientName,
      depot_id: doc.depotId ? toValidUuid(doc.depotId) : null,
      status: doc.status,
      payment_method: doc.paymentMethod || 'Virement',
      payment_status: doc.status === 'Paid' ? 'Paid' : 'Unpaid',
      total_ht: Number(doc.totalHtFinal || 0),
      total_tva: Number(doc.totalTva || 0),
      timbre_fiscal: Number(doc.timbreFiscal || 0),
      total_ttc: Number(doc.totalTtc || 0),
      paid_amount: doc.status === 'Paid' ? Number(doc.netToPay || doc.totalTtc || 0) : 0,
      linked_doc_id: doc.linkedDocId ? toValidUuid(doc.linkedDocId) : null,
      linked_doc_number: doc.linkedDocNumber || null,
      items: doc.items || [],
      notes: packNotesWithMeta(doc.notesTop, {
        origType: doc.type,
        clientNif: doc.clientNif,
        clientRc: doc.clientRc,
        clientAi: doc.clientAi,
        depotName: doc.depotName,
        validityDays: doc.validityDays,
        paymentTerms: doc.paymentTerms,
        totalHtRaw: doc.totalHtRaw,
        generalDiscountPercent: doc.generalDiscountPercent,
        guaranteeRetentionPercent: doc.guaranteeRetentionPercent,
        guaranteeRetentionAmount: doc.guaranteeRetentionAmount,
        netToPay: doc.netToPay,
        currency: doc.currency,
        notesBottom: doc.notesBottom,
        includeStampSignature: doc.includeStampSignature,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('trading_commercial_docs', payload, {
      expectedVersion: doc.version,
      entityType: 'CommercialDocument',
      entityLabel: doc.docNumber,
      localData: payload,
    });
    return res.success;
  },

  async deleteCommercialDoc(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('trading_commercial_docs', id, deletedByStaffId);
    return res.success;
  },

  async convertCommercialDoc(
    sourceDocId: string,
    targetType: CommercialDocType,
    newDocNumber: string
  ): Promise<{ success: boolean; newDocId?: string; queued?: boolean }> {
    const res = await syncCoordinator.rpcOrQueue<{ success: boolean; newDocId?: string }>(
      'trading_convert_commercial_doc',
      {
        p_source_doc_id: toValidUuid(sourceDocId),
        p_target_type: toDbCommercialType(targetType),
        p_new_doc_number: newDocNumber,
      }
    );
    return {
      success: res.success,
      newDocId: res.data?.newDocId,
      queued: res.queued,
    };
  },

  async fetchPurchaseDocs(branchId: string, updatedAfter?: string | null): Promise<PurchaseDocument[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('trading_purchase_docs')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapPurchaseDocFromDb);
    } catch {
      return [];
    }
  },

  async upsertPurchaseDoc(doc: PurchaseDocument): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: doc.accountId || doc.tenantId || 'acc_01',
      businessId: doc.businessId,
      branchId: doc.branchId || doc.facilityId,
      staffId: doc.staffId,
    });
    const payload = {
      id: toValidUuid(doc.id),
      ...trace,
      doc_type: toDbPurchaseType(doc.type),
      doc_number: doc.docNumber,
      doc_date: doc.orderDate || new Date().toISOString().split('T')[0],
      expected_delivery_date: doc.deliveryExpectedDate || null,
      actual_delivery_date: doc.actualDeliveryDate || null,
      supplier_id: doc.supplierId ? toValidUuid(doc.supplierId) : null,
      supplier_name: doc.supplierName,
      depot_id: doc.depotId ? toValidUuid(doc.depotId) : null,
      depot_name: doc.depotName || null,
      status: doc.status,
      total_ht: Number(doc.totalHt || 0),
      total_tva: Number(doc.totalTva || 0),
      total_ttc: Number(doc.totalTtc || 0),
      linked_po_id: doc.linkedPoId ? toValidUuid(doc.linkedPoId) : null,
      linked_po_number: doc.linkedPoNumber || null,
      items: doc.items || [],
      notes: packNotesWithMeta(doc.notes, {
        origType: doc.type,
        currency: doc.currency,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('trading_purchase_docs', payload, {
      expectedVersion: doc.version,
      entityType: 'PurchaseDocument',
      entityLabel: doc.docNumber,
      localData: payload,
    });
    return res.success;
  },

  async deletePurchaseDoc(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('trading_purchase_docs', id, deletedByStaffId);
    return res.success;
  },

  async fetchStockVouchers(branchId: string, updatedAfter?: string | null): Promise<StockMovementVoucher[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('trading_stock_vouchers')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapStockVoucherFromDb);
    } catch {
      return [];
    }
  },

  async upsertStockVoucher(voucher: StockMovementVoucher): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: voucher.accountId || voucher.tenantId || 'acc_01',
      businessId: voucher.businessId,
      branchId: voucher.branchId || voucher.facilityId,
      staffId: voucher.staffId,
    });
    const payload = {
      id: toValidUuid(voucher.id),
      ...trace,
      voucher_number: voucher.voucherNumber,
      voucher_type: toDbVoucherType(voucher.type),
      voucher_date: voucher.date || new Date().toISOString().split('T')[0],
      depot_source_id: voucher.depotSourceId ? toValidUuid(voucher.depotSourceId) : null,
      depot_source_name: voucher.depotSourceName || null,
      depot_dest_id: voucher.depotTargetId ? toValidUuid(voucher.depotTargetId) : null,
      depot_dest_name: voucher.depotTargetName || null,
      reason: voucher.reason,
      operator_name: voucher.operatorName || null,
      total_valuation_dzd: Number(voucher.totalValuationDzd || 0),
      items: voucher.items || [],
      notes: voucher.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('trading_stock_vouchers', payload, {
      expectedVersion: voucher.version,
      entityType: 'StockMovementVoucher',
      entityLabel: voucher.voucherNumber,
      localData: payload,
    });
    return res.success;
  },

  async deleteStockVoucher(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('trading_stock_vouchers', id, deletedByStaffId);
    return res.success;
  },
};

import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { mapProductFromDb, mapSaleFromDb } from '../mappers';
import { buildTraceEnvelope, getActiveDeviceId, syncCoordinator } from '../syncCoordinator';
import type {
  Product,
  Sale,
  ParkedOrder,
  StockMovement,
  ReceiptConfig,
} from '../../../types/index';

export const mapParkedOrderFromDb = (row: any): ParkedOrder => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  referenceName: row.label,
  customerName: row.customer_name || undefined,
  items: Array.isArray(row.items) ? row.items : [],
  discount: Number(row.discount || 0),
  subtotal: Number(row.total_amount || 0),
  totalAmount: Number(row.total_amount || 0),
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapStockMovementFromDb = (row: any): StockMovement => {
  const mt = String(row.movement_type || '').toLowerCase();
  const mappedType: StockMovement['type'] =
    mt === 'out' || mt === 'sale'
      ? 'Sale'
      : mt === 'refund' || mt === 'return'
      ? 'Return'
      : mt === 'adjustment'
      ? 'Adjustment'
      : mt === 'damage'
      ? 'Damage'
      : mt === 'initial'
      ? 'Initial'
      : 'Restock';

  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id || undefined,
    branchId: row.branch_id,
    staffId: row.staff_id || undefined,
    tenantId: row.account_id,
    facilityId: row.branch_id,
    productId: row.product_id || '',
    productName: row.product_name,
    type: mappedType,
    quantity: Number(row.quantity || 0),
    previousStock: Number(row.previous_stock || 0),
    newStock: Number(row.new_stock || 0),
    reason: row.reason || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
  };
};

export const posService = {
  async fetchProducts(branchId: string, updatedAfter?: string | null): Promise<Product[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pos_products')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapProductFromDb);
    } catch {
      return [];
    }
  },

  async upsertProduct(product: Product): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: product.accountId || product.tenantId,
      businessId: product.businessId,
      branchId: product.branchId || product.facilityId,
      staffId: product.staffId,
    });

    const payload = {
      id: toValidUuid(product.id),
      ...trace,
      name: product.name,
      description: product.description || null,
      sku: product.sku || null,
      category: product.category || 'General',
      price_amount: product.price.amount,
      cost_amount: product.cost.amount,
      stock_quantity: product.stockQuantity,
      reorder_level: product.reorderLevel,
      image_url: product.imageUrl || null,
      is_pinned: Boolean(product.isPinned),
      is_active: product.isActive,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('pos_products', payload, {
      expectedVersion: product.version,
      entityType: 'Product',
      entityLabel: product.name,
      localData: payload,
    });
    return res.success;
  },

  async deleteProduct(productId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pos_products', productId, deletedByStaffId);
    return res.success;
  },

  async fetchSales(branchId: string, updatedAfter?: string | null): Promise<Sale[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pos_sales')
          .select('*, pos_sale_items(*)')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('sold_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any) =>
        mapSaleFromDb({
          ...row,
          items: Array.isArray(row.pos_sale_items)
            ? row.pos_sale_items.map((it: any) => ({
                productId: it.product_id || '',
                productName: it.product_name,
                quantity: Number(it.quantity || 1),
                unitPrice: Number(it.unit_price || 0),
                totalPrice: Number(it.total_price || 0),
              }))
            : [],
        })
      );
    } catch {
      return [];
    }
  },

  async createSale(sale: Sale): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('pos_process_sale', {
      p_branch_id: toValidUuid(sale.branchId || sale.facilityId),
      p_receipt_number: `POS-${Date.now().toString().slice(-6)}`,
      p_payment_method: sale.paymentMethod || 'Cash',
      p_items: (sale.items || []).map((it) => ({
        productId: it.productId ? toValidUuid(it.productId) : null,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
      p_customer_id: sale.memberId ? toValidUuid(sale.memberId) : null,
      p_customer_name: sale.memberName || null,
      p_discount_amount: Number((sale as { discountAmount?: number; discount?: number }).discountAmount ?? (sale as { discount?: number }).discount ?? 0),
      p_notes: sale.notes || null,
      p_device_id: getActiveDeviceId(),
    });
    return res.success;
  },

  async fetchParkedOrders(branchId: string): Promise<ParkedOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('pos_parked_orders')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    );
    return data.map(mapParkedOrderFromDb);
  },

  async upsertParkedOrder(order: ParkedOrder): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: order.accountId || order.tenantId,
      businessId: order.businessId,
      branchId: order.branchId || order.facilityId,
      staffId: order.staffId,
    });
    const payload = {
      id: toValidUuid(order.id),
      ...trace,
      label: order.referenceName,
      customer_name: order.customerName || null,
      items: order.items,
      discount: Number(order.discount || 0),
      total_amount: order.totalAmount,
      notes: order.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pos_parked_orders', payload, {
      expectedVersion: order.version,
      entityType: 'ParkedOrder',
      entityLabel: order.referenceName,
      localData: payload,
    });
    return res.success;
  },

  async deleteParkedOrder(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pos_parked_orders', id, deletedByStaffId);
    return res.success;
  },

  async fetchStockMovements(branchId: string): Promise<StockMovement[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('pos_stock_movements')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    );
    return data.map(mapStockMovementFromDb);
  },

  async upsertReceiptConfig(
    config: ReceiptConfig,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      ...trace,
      header_title: config.headerTitle,
      footer_message: config.footerMessage || null,
      show_tax_breakdown: config.showTaxBreakdown,
      paper_width_mm: 80,
      nif: config.taxId || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert(
      'pos_receipt_configs',
      payload,
      {
        onConflict: 'branch_id',
        expectedVersion: config.version,
        entityType: 'ReceiptConfig',
        entityLabel: config.headerTitle,
        localData: payload,
      }
    );
    return res.success;
  },
};

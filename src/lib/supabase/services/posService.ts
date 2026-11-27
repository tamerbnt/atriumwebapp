import { getSupabaseClient, isSupabaseConfigured, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { mapProductFromDb, mapSaleFromDb } from '../mappers';
import { buildTraceEnvelope, getActiveDeviceId, syncCoordinator } from '../syncCoordinator';
import { sequenceService } from './sequenceService';
import type {
  Product,
  Sale,
  ParkedOrder,
  StockMovement,
  ReceiptConfig,
  PosCashSession,
  PosCashMovement,
  PosZReport,
  PosFloorTable,
  PosKitchenOrder,
  PosCustomerCreditEntry,
  PosOpticalPrescription,
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
          .select(
            'id, account_id, business_id, branch_id, staff_id, name, description, price_amount, cost_amount, stock_quantity, sku, barcode, category, image_url, reorder_level, is_active, is_pinned, variants, modifier_groups, recipe_bom, is_weighted, plu_code, unit, expiry_date, version'
          )
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
      barcode: product.barcode || null,
      category: product.category || 'General',
      price_amount: product.price.amount,
      cost_amount: product.cost.amount,
      stock_quantity: product.stockQuantity,
      reorder_level: product.reorderLevel,
      image_url: product.imageUrl || null,
      is_pinned: Boolean(product.isPinned),
      is_active: product.isActive,
      variants: Array.isArray(product.variants) ? product.variants : [],
      modifier_groups: Array.isArray(product.modifierGroups) ? product.modifierGroups : [],
      recipe_bom: Array.isArray(product.recipeBom) ? product.recipeBom : [],
      is_weighted: Boolean(product.isWeighted),
      plu_code: product.pluCode || null,
      unit: product.unit || 'pcs',
      expiry_date: product.expiryDate || null,
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
          .select(
            'id, account_id, business_id, branch_id, staff_id, customer_id, customer_name, total_amount, tip_centimes, order_channel, table_id, table_label, delivery_address, delivery_courier, delivery_fee_centimes, payment_method, status, void_reason, void_pin_verified, voided_at, voided_by_staff_id, notes, sold_at, created_at, version, pos_sale_items(product_id, product_name, quantity, unit_price, total_price)'
          )
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
        .select(
          'id, account_id, business_id, branch_id, staff_id, label, customer_name, items, discount, total_amount, notes, version, created_at'
        )
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
        .select(
          'id, account_id, business_id, branch_id, staff_id, product_id, product_name, movement_type, quantity, previous_stock, new_stock, reason, version, created_at'
        )
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

  async fetchCashSessions(branchId: string, updatedAfter?: string | null): Promise<PosCashSession[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pos_cash_sessions')
          .select(
            'id, account_id, business_id, branch_id, staff_id, opened_by_staff_id, opened_by_name, closed_by_staff_id, closed_by_name, opened_at, closed_at, opening_float_centimes, expected_cash_centimes, actual_cash_centimes, variance_centimes, variance_pin_verified, variance_verified_by_staff_id, status, notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('opened_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): PosCashSession => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        openedByStaffId: row.opened_by_staff_id || undefined,
        openedByName: row.opened_by_name || '',
        closedByStaffId: row.closed_by_staff_id || undefined,
        closedByName: row.closed_by_name || undefined,
        openedAt: row.opened_at,
        closedAt: row.closed_at || undefined,
        openingFloatCentimes: Number(row.opening_float_centimes || 0),
        expectedCashCentimes: Number(row.expected_cash_centimes || 0),
        actualCashCentimes: row.actual_cash_centimes != null ? Number(row.actual_cash_centimes) : undefined,
        varianceCentimes: Number(row.variance_centimes || 0),
        variancePinVerified: Boolean(row.variance_pin_verified),
        varianceVerifiedByStaffId: row.variance_verified_by_staff_id || undefined,
        status: (row.status || 'open') as PosCashSession['status'],
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertCashSession(session: PosCashSession): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: session.accountId,
      businessId: session.businessId,
      branchId: session.branchId,
      staffId: session.staffId,
    });
    const payload = {
      id: toValidUuid(session.id),
      ...trace,
      opened_by_staff_id: session.openedByStaffId ? toValidUuid(session.openedByStaffId) : null,
      opened_by_name: session.openedByName,
      closed_by_staff_id: session.closedByStaffId ? toValidUuid(session.closedByStaffId) : null,
      closed_by_name: session.closedByName || null,
      opened_at: session.openedAt,
      closed_at: session.closedAt || null,
      opening_float_centimes: Math.round(session.openingFloatCentimes || 0),
      expected_cash_centimes: Math.round(session.expectedCashCentimes || 0),
      actual_cash_centimes:
        session.actualCashCentimes != null ? Math.round(session.actualCashCentimes) : null,
      variance_centimes: Math.round(session.varianceCentimes || 0),
      variance_pin_verified: Boolean(session.variancePinVerified),
      variance_verified_by_staff_id: session.varianceVerifiedByStaffId
        ? toValidUuid(session.varianceVerifiedByStaffId)
        : null,
      status: session.status,
      notes: session.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pos_cash_sessions', payload, {
      expectedVersion: session.version,
      entityType: 'PosCashSession',
      entityLabel: `${session.openedByName} (${session.status})`,
      localData: payload,
    });
    return res.success;
  },

  async fetchCashMovements(branchId: string, updatedAfter?: string | null): Promise<PosCashMovement[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pos_cash_movements')
          .select(
            'id, account_id, business_id, branch_id, staff_id, session_id, reference, payee, category, payment_method, direction, amount_centimes, paid_by, notes, occurred_at, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('occurred_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): PosCashMovement => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        sessionId: row.session_id || undefined,
        reference: row.reference,
        payee: row.payee,
        category: row.category || 'Other',
        paymentMethod: row.payment_method || 'Cash',
        direction: row.direction || 'out',
        amountCentimes: Number(row.amount_centimes || 0),
        paidBy: row.paid_by || '',
        notes: row.notes || undefined,
        occurredAt: row.occurred_at,
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertCashMovement(mv: PosCashMovement): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: mv.accountId,
      businessId: mv.businessId,
      branchId: mv.branchId,
      staffId: mv.staffId,
    });
    const payload = {
      id: toValidUuid(mv.id),
      ...trace,
      session_id: mv.sessionId ? toValidUuid(mv.sessionId) : null,
      reference: mv.reference,
      payee: mv.payee,
      category: mv.category,
      payment_method: mv.paymentMethod,
      direction: mv.direction,
      amount_centimes: Math.round(mv.amountCentimes || 0),
      paid_by: mv.paidBy,
      notes: mv.notes || null,
      occurred_at: mv.occurredAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pos_cash_movements', payload, {
      expectedVersion: mv.version,
      entityType: 'PosCashMovement',
      entityLabel: `${mv.reference} · ${mv.payee}`,
      localData: payload,
    });
    return res.success;
  },

  async deleteCashMovement(movementId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('pos_cash_movements', movementId, deletedByStaffId);
    return res.success;
  },

  async fetchZReports(branchId: string, updatedAfter?: string | null): Promise<PosZReport[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('pos_z_reports')
          .select(
            'id, account_id, business_id, branch_id, session_id, z_number, local_close_ref, status, business_date, closed_by_staff_id, closed_by_name, opening_float_centimes, cash_sales_centimes, card_sales_centimes, baridimob_sales_centimes, refunds_total_centimes, cash_in_centimes, cash_out_centimes, expected_cash_centimes, actual_cash_centimes, variance_centimes, variance_pin_verified, closed_at, finalized_at, drift_detected, drift_details, reprinted_count, notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('closed_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): PosZReport => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        sessionId: row.session_id || undefined,
        zNumber: row.z_number || null,
        localCloseRef: row.local_close_ref,
        status: row.status || 'finalized',
        businessDate: row.business_date,
        closedByStaffId: row.closed_by_staff_id || undefined,
        closedByName: row.closed_by_name || '',
        openingFloatCentimes: Number(row.opening_float_centimes || 0),
        cashSalesCentimes: Number(row.cash_sales_centimes || 0),
        cardSalesCentimes: Number(row.card_sales_centimes || 0),
        baridimobSalesCentimes: Number(row.baridimob_sales_centimes || 0),
        refundsTotalCentimes: Number(row.refunds_total_centimes || 0),
        cashInCentimes: Number(row.cash_in_centimes || 0),
        cashOutCentimes: Number(row.cash_out_centimes || 0),
        expectedCashCentimes: Number(row.expected_cash_centimes || 0),
        actualCashCentimes: Number(row.actual_cash_centimes || 0),
        varianceCentimes: Number(row.variance_centimes || 0),
        variancePinVerified: Boolean(row.variance_pin_verified),
        closedAt: row.closed_at,
        finalizedAt: row.finalized_at || undefined,
        driftDetected: Boolean(row.drift_detected),
        driftDetails: row.drift_details || undefined,
        reprintedCount: Number(row.reprinted_count || 0),
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertZReport(report: PosZReport): Promise<{ success: boolean; zNumber?: string | null; status: PosZReport['status'] }> {
    let resolvedZNumber = report.zNumber || null;
    let resolvedStatus: PosZReport['status'] = report.status;
    let finalizedAt = report.finalizedAt;

    if (!resolvedZNumber && isSupabaseConfigured() && report.businessId && report.branchId) {
      const seq = await sequenceService.allocateServerSequence({
        businessId: report.businessId,
        branchId: report.branchId,
        docType: 'z_report',
      });
      if (seq.data?.formattedNumber) {
        resolvedZNumber = seq.data.formattedNumber;
        resolvedStatus = 'finalized';
        finalizedAt = finalizedAt || new Date().toISOString();
      } else {
        resolvedStatus = 'provisional_pending_sync';
      }
    } else if (!resolvedZNumber) {
      resolvedStatus = 'provisional_pending_sync';
    }

    const trace = buildTraceEnvelope({
      accountId: report.accountId,
      businessId: report.businessId,
      branchId: report.branchId,
      staffId: report.closedByStaffId,
    });
    const payload = {
      id: toValidUuid(report.id),
      ...trace,
      session_id: report.sessionId ? toValidUuid(report.sessionId) : null,
      z_number: resolvedZNumber,
      local_close_ref: report.localCloseRef,
      status: resolvedStatus,
      business_date: report.businessDate,
      closed_by_staff_id: report.closedByStaffId ? toValidUuid(report.closedByStaffId) : null,
      closed_by_name: report.closedByName,
      opening_float_centimes: Math.round(report.openingFloatCentimes || 0),
      cash_sales_centimes: Math.round(report.cashSalesCentimes || 0),
      card_sales_centimes: Math.round(report.cardSalesCentimes || 0),
      baridimob_sales_centimes: Math.round(report.baridimobSalesCentimes || 0),
      refunds_total_centimes: Math.round(report.refundsTotalCentimes || 0),
      cash_in_centimes: Math.round(report.cashInCentimes || 0),
      cash_out_centimes: Math.round(report.cashOutCentimes || 0),
      expected_cash_centimes: Math.round(report.expectedCashCentimes || 0),
      actual_cash_centimes: Math.round(report.actualCashCentimes || 0),
      variance_centimes: Math.round(report.varianceCentimes || 0),
      variance_pin_verified: Boolean(report.variancePinVerified),
      closed_at: report.closedAt,
      finalized_at: finalizedAt || null,
      drift_detected: Boolean(report.driftDetected),
      drift_details: report.driftDetails || null,
      reprinted_count: report.reprintedCount || 0,
      notes: report.notes || null,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('pos_z_reports', payload, {
      expectedVersion: report.version,
      entityType: 'PosZReport',
      entityLabel: resolvedZNumber || report.localCloseRef,
      localData: payload,
    });

    return {
      success: res.success,
      zNumber: resolvedZNumber,
      status: resolvedStatus,
    };
  },

  async incrementZReportReprint(reportId: string, nextCount: number, expectedVersion?: number): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueUpdate(
      'pos_z_reports',
      reportId,
      { reprinted_count: nextCount },
      {
        expectedVersion,
        entityType: 'PosZReport',
      }
    );
    return res.success;
  },

  async refundSaleWithStock(params: {
    branchId: string;
    saleId: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
    reason?: string;
    movementIds?: string[];
  }) {
    return syncCoordinator.rpcOrQueue('pos_refund_with_stock', {
      p_branch_id: toValidUuid(params.branchId),
      p_sale_id: toValidUuid(params.saleId),
      p_items: params.items.map((it) => ({
        productId: it.productId ? toValidUuid(it.productId) : null,
        productName: it.productName,
        quantity: it.quantity,
      })),
      p_reason: params.reason || null,
      p_device_id: getActiveDeviceId(),
      p_movement_ids: (params.movementIds || []).map((id) => toValidUuid(id)),
    });
  },

  async undoRefundSaleWithStock(params: {
    branchId: string;
    saleId: string;
    movementIds: string[];
    prevStatus?: string;
    prevNotes?: string | null;
  }) {
    return syncCoordinator.rpcOrQueue('pos_undo_refund_with_stock', {
      p_branch_id: toValidUuid(params.branchId),
      p_sale_id: toValidUuid(params.saleId),
      p_movement_ids: params.movementIds.map((id) => toValidUuid(id)),
      p_prev_status: params.prevStatus || 'Completed',
      p_prev_notes: params.prevNotes || null,
    });
  },

  async fetchFloorTables(branchId: string): Promise<PosFloorTable[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('pos_floor_tables')
          .select('id, account_id, business_id, branch_id, table_code, label, zone, seats, status, current_order_id, waiter_staff_id, waiter_name, notes, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('table_code', { ascending: true })
          .range(from, to)
      );
      return rows.map((r: any): PosFloorTable => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        tableCode: r.table_code,
        label: r.label,
        zone: r.zone || 'Main Hall',
        seats: Number(r.seats || 4),
        status: r.status || 'available',
        currentOrderId: r.current_order_id || undefined,
        waiterStaffId: r.waiter_staff_id || undefined,
        waiterName: r.waiter_name || undefined,
        notes: r.notes || undefined,
        version: r.version != null ? Number(r.version) : undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertFloorTable(table: PosFloorTable): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: table.accountId,
      businessId: table.businessId,
      branchId: table.branchId,
      staffId: table.waiterStaffId,
    });
    const payload = {
      id: toValidUuid(table.id),
      ...trace,
      table_code: table.tableCode,
      label: table.label,
      zone: table.zone || 'Main Hall',
      seats: Math.max(1, Number(table.seats || 4)),
      status: table.status || 'available',
      current_order_id: table.currentOrderId ? toValidUuid(table.currentOrderId) : null,
      waiter_staff_id: table.waiterStaffId ? toValidUuid(table.waiterStaffId) : null,
      waiter_name: table.waiterName || null,
      notes: table.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pos_floor_tables', payload, {
      expectedVersion: table.version,
      entityType: 'PosFloorTable',
      entityLabel: table.label,
      localData: payload,
    });
    return res.success;
  },

  async fetchKitchenOrders(branchId: string): Promise<PosKitchenOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('pos_kitchen_orders')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((r: any): PosKitchenOrder => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        orderNumber: r.order_number,
        orderChannel: r.order_channel || 'dine_in',
        tableId: r.table_id || undefined,
        tableLabel: r.table_label || undefined,
        waiterStaffId: r.waiter_staff_id || undefined,
        waiterName: r.waiter_name || undefined,
        customerId: r.customer_id || undefined,
        customerName: r.customer_name || undefined,
        customerPhone: r.customer_phone || undefined,
        deliveryAddress: r.delivery_address || undefined,
        deliveryCourier: r.delivery_courier || undefined,
        deliveryFeeCentimes: Number(r.delivery_fee_centimes || 0),
        kdsStatus: r.kds_status || 'sent',
        revision: Number(r.revision || 1),
        currentItems: Array.isArray(r.current_items) ? r.current_items : [],
        sentSnapshotItems: Array.isArray(r.sent_snapshot_items) ? r.sent_snapshot_items : [],
        deltaItems: Array.isArray(r.delta_items) ? r.delta_items : [],
        discountCentimes: Number(r.discount_centimes || 0),
        tipCentimes: Number(r.tip_centimes || 0),
        subtotalCentimes: Number(r.subtotal_centimes || 0),
        totalCentimes: Number(r.total_centimes || 0),
        settledSaleId: r.settled_sale_id || undefined,
        voidReason: r.void_reason || undefined,
        voidPinVerified: Boolean(r.void_pin_verified),
        voidedByStaffId: r.voided_by_staff_id || undefined,
        voidedAt: r.voided_at || undefined,
        notes: r.notes || undefined,
        sentAt: r.sent_at || undefined,
        readyAt: r.ready_at || undefined,
        servedAt: r.served_at || undefined,
        settledAt: r.settled_at || undefined,
        version: r.version != null ? Number(r.version) : undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertKitchenOrder(order: PosKitchenOrder): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: order.accountId,
      businessId: order.businessId,
      branchId: order.branchId,
      staffId: order.waiterStaffId,
    });
    const payload = {
      id: toValidUuid(order.id),
      ...trace,
      order_number: order.orderNumber,
      order_channel: order.orderChannel,
      table_id: order.tableId ? toValidUuid(order.tableId) : null,
      table_label: order.tableLabel || null,
      waiter_staff_id: order.waiterStaffId ? toValidUuid(order.waiterStaffId) : null,
      waiter_name: order.waiterName || null,
      customer_id: order.customerId ? toValidUuid(order.customerId) : null,
      customer_name: order.customerName || null,
      customer_phone: order.customerPhone || null,
      delivery_address: order.deliveryAddress || null,
      delivery_courier: order.deliveryCourier || null,
      delivery_fee_centimes: Math.round(order.deliveryFeeCentimes || 0),
      kds_status: order.kdsStatus,
      revision: order.revision || 1,
      current_items: order.currentItems,
      sent_snapshot_items: order.sentSnapshotItems,
      delta_items: order.deltaItems,
      discount_centimes: Math.round(order.discountCentimes || 0),
      tip_centimes: Math.round(order.tipCentimes || 0),
      subtotal_centimes: Math.round(order.subtotalCentimes || 0),
      total_centimes: Math.round(order.totalCentimes || 0),
      settled_sale_id: order.settledSaleId ? toValidUuid(order.settledSaleId) : null,
      void_reason: order.voidReason || null,
      void_pin_verified: Boolean(order.voidPinVerified),
      voided_by_staff_id: order.voidedByStaffId ? toValidUuid(order.voidedByStaffId) : null,
      voided_at: order.voidedAt || null,
      notes: order.notes || null,
      sent_at: order.sentAt || null,
      ready_at: order.readyAt || null,
      served_at: order.servedAt || null,
      settled_at: order.settledAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pos_kitchen_orders', payload, {
      expectedVersion: order.version,
      entityType: 'PosKitchenOrder',
      entityLabel: order.orderNumber,
      localData: payload,
    });
    return res.success;
  },

  async sendKitchenOrderRpc(params: {
    orderId: string;
    tableId?: string;
    items: any[];
    deltaItems: any[];
    notes?: string;
  }) {
    return syncCoordinator.rpcOrQueue('pos_send_kitchen_order', {
      p_order_id: toValidUuid(params.orderId),
      p_table_id: params.tableId ? toValidUuid(params.tableId) : null,
      p_items: params.items,
      p_delta_items: params.deltaItems,
      p_notes: params.notes || null,
    });
  },

  async transferTableOrderRpc(orderId: string, targetTableId: string) {
    return syncCoordinator.rpcOrQueue('pos_transfer_table_order', {
      p_order_id: toValidUuid(orderId),
      p_target_table_id: toValidUuid(targetTableId),
    });
  },

  async voidKitchenOrSaleRpc(params: {
    targetType: 'kitchen_order' | 'sale';
    targetId: string;
    reason: string;
    pinVerified: boolean;
    voidedByStaffId?: string;
  }) {
    return syncCoordinator.rpcOrQueue('pos_void_kitchen_or_sale_order', {
      p_target_type: params.targetType,
      p_target_id: toValidUuid(params.targetId),
      p_reason: params.reason,
      p_pin_verified: params.pinVerified,
      p_voided_by_staff_id: params.voidedByStaffId ? toValidUuid(params.voidedByStaffId) : null,
    });
  },

  async fetchCarnetEntries(branchId: string): Promise<PosCustomerCreditEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('pos_customer_credit_entries')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('occurred_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((r: any): PosCustomerCreditEntry => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        customerId: r.customer_id || undefined,
        customerName: r.customer_name,
        customerPhone: r.customer_phone || undefined,
        entryType: r.entry_type,
        amountCentimes: Number(r.amount_centimes || 0),
        creditLimitCentimes: Number(r.credit_limit_centimes || 5000000),
        paymentMethod: r.payment_method || undefined,
        saleId: r.sale_id || undefined,
        unifiedPaymentId: r.unified_payment_id || undefined,
        reference: r.reference,
        notes: r.notes || undefined,
        recordedByStaffId: r.recorded_by_staff_id || undefined,
        recordedByName: r.recorded_by_name || undefined,
        occurredAt: r.occurred_at,
        version: r.version != null ? Number(r.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertCarnetEntry(entry: PosCustomerCreditEntry): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.recordedByStaffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      customer_id: entry.customerId ? toValidUuid(entry.customerId) : null,
      customer_name: entry.customerName,
      customer_phone: entry.customerPhone || null,
      entry_type: entry.entryType,
      amount_centimes: Math.round(entry.amountCentimes || 0),
      credit_limit_centimes: Math.round(entry.creditLimitCentimes || 5000000),
      payment_method: entry.paymentMethod || null,
      sale_id: entry.saleId ? toValidUuid(entry.saleId) : null,
      unified_payment_id: entry.unifiedPaymentId ? toValidUuid(entry.unifiedPaymentId) : null,
      reference: entry.reference,
      notes: entry.notes || null,
      recorded_by_staff_id: entry.recordedByStaffId ? toValidUuid(entry.recordedByStaffId) : null,
      recorded_by_name: entry.recordedByName || null,
      occurred_at: entry.occurredAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pos_customer_credit_entries', payload, {
      expectedVersion: entry.version,
      entityType: 'PosCustomerCreditEntry',
      entityLabel: `${entry.customerName} · ${entry.reference}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchOpticalPrescriptions(branchId: string): Promise<PosOpticalPrescription[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('pos_optical_prescriptions')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('prescribed_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((r: any): PosOpticalPrescription => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        customerId: r.customer_id || undefined,
        customerName: r.customer_name,
        customerPhone: r.customer_phone || undefined,
        prescriberName: r.prescriber_name || undefined,
        prescribedAt: r.prescribed_at,
        odSphere: r.od_sphere != null ? Number(r.od_sphere) : undefined,
        odCylinder: r.od_cylinder != null ? Number(r.od_cylinder) : undefined,
        odAxis: r.od_axis != null ? Number(r.od_axis) : undefined,
        odAdd: r.od_add != null ? Number(r.od_add) : undefined,
        osSphere: r.os_sphere != null ? Number(r.os_sphere) : undefined,
        osCylinder: r.os_cylinder != null ? Number(r.os_cylinder) : undefined,
        osAxis: r.os_axis != null ? Number(r.os_axis) : undefined,
        osAdd: r.os_add != null ? Number(r.os_add) : undefined,
        pdMm: r.pd_mm != null ? Number(r.pd_mm) : undefined,
        lensType: r.lens_type || undefined,
        frameModel: r.frame_model || undefined,
        labStatus: r.lab_status || 'measured',
        saleId: r.sale_id || undefined,
        notes: r.notes || undefined,
        version: r.version != null ? Number(r.version) : undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertOpticalPrescription(rx: PosOpticalPrescription): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: rx.accountId,
      businessId: rx.businessId,
      branchId: rx.branchId,
    });
    const payload = {
      id: toValidUuid(rx.id),
      ...trace,
      customer_id: rx.customerId ? toValidUuid(rx.customerId) : null,
      customer_name: rx.customerName,
      customer_phone: rx.customerPhone || null,
      prescriber_name: rx.prescriberName || null,
      prescribed_at: rx.prescribedAt,
      od_sphere: rx.odSphere ?? null,
      od_cylinder: rx.odCylinder ?? null,
      od_axis: rx.odAxis ?? null,
      od_add: rx.odAdd ?? null,
      os_sphere: rx.osSphere ?? null,
      os_cylinder: rx.osCylinder ?? null,
      os_axis: rx.osAxis ?? null,
      os_add: rx.osAdd ?? null,
      pd_mm: rx.pdMm ?? null,
      lens_type: rx.lensType || null,
      frame_model: rx.frameModel || null,
      lab_status: rx.labStatus || 'measured',
      sale_id: rx.saleId ? toValidUuid(rx.saleId) : null,
      notes: rx.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('pos_optical_prescriptions', payload, {
      expectedVersion: rx.version,
      entityType: 'PosOpticalPrescription',
      entityLabel: rx.customerName,
      localData: payload,
    });
    return res.success;
  },
};

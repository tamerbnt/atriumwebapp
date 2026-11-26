import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  WmsBin,
  WmsConsignmentEntry,
  WmsConsignmentMovementType,
  WmsCycleCount,
  WmsCycleCountLine,
  WmsCycleCountStatus,
  WmsLandedCostAllocation,
  WmsLandedCostMethod,
  WmsLotRecallStatus,
  WmsNegativeStockPolicy,
  WmsReorderRule,
  WmsSerialNumber,
  WmsSerialStatus,
  WmsStockLot,
  WmsStockTransfer,
  WmsTransferStatus,
  WmsUnitConversion,
} from '../../../types/index';

export function mapWmsBinFromDb(row: any): WmsBin {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    warehouseId: row.warehouse_id,
    code: row.code || '',
    name: row.name || '',
    zone: row.zone || undefined,
    aisle: row.aisle || undefined,
    rack: row.rack || undefined,
    isDefault: Boolean(row.is_default),
    capacityUnits: row.capacity_units != null ? Number(row.capacity_units) : undefined,
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsStockLotFromDb(row: any): WmsStockLot {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    warehouseId: row.warehouse_id || undefined,
    binId: row.bin_id || undefined,
    productId: row.product_id,
    productName: row.product_name || '',
    sku: row.sku || undefined,
    lotNumber: row.lot_number || '',
    manufactureDate: row.manufacture_date || undefined,
    expiryDate: row.expiry_date || undefined,
    qtyOnHand: Number(row.qty_on_hand ?? 0),
    qtyReserved: Number(row.qty_reserved ?? 0),
    unitCostCentimes: Number(row.unit_cost_centimes ?? 0),
    recallStatus: (row.recall_status || 'active') as WmsLotRecallStatus,
    recallReason: row.recall_reason || undefined,
    supplierName: row.supplier_name || undefined,
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsSerialNumberFromDb(row: any): WmsSerialNumber {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    warehouseId: row.warehouse_id || undefined,
    binId: row.bin_id || undefined,
    lotId: row.lot_id || undefined,
    productId: row.product_id,
    productName: row.product_name || '',
    serialNumber: row.serial_number || '',
    status: (row.status || 'in_stock') as WmsSerialStatus,
    sourceDocId: row.source_doc_id || undefined,
    saleId: row.sale_id || undefined,
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsUnitConversionFromDb(row: any): WmsUnitConversion {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    productId: row.product_id || undefined,
    productName: row.product_name || undefined,
    fromUnit: row.from_unit || '',
    toBaseUnit: row.to_base_unit || '',
    conversionFactor: Number(row.conversion_factor ?? 1),
    barcode: row.barcode || undefined,
    isDefaultPurchase: Boolean(row.is_default_purchase),
    isDefaultSale: Boolean(row.is_default_sale),
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsReorderRuleFromDb(row: any): WmsReorderRule {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    warehouseId: row.warehouse_id || undefined,
    productId: row.product_id,
    productName: row.product_name || '',
    minQty: Number(row.min_qty ?? 0),
    maxQty: Number(row.max_qty ?? 0),
    reorderQty: Number(row.reorder_qty ?? 0),
    preferredSupplierId: row.preferred_supplier_id || undefined,
    preferredSupplierName: row.preferred_supplier_name || undefined,
    leadTimeDays: Number(row.lead_time_days ?? 3),
    isActive: row.is_active !== false,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsCycleCountLineFromDb(row: any): WmsCycleCountLine {
  return {
    id: row.id,
    cycleCountId: row.cycle_count_id,
    productId: row.product_id,
    productName: row.product_name || '',
    lotId: row.lot_id || undefined,
    lotNumber: row.lot_number || undefined,
    binId: row.bin_id || undefined,
    systemQty: Number(row.system_qty ?? 0),
    activeSalesDeltaQty: Number(row.active_sales_delta_qty ?? 0),
    countedQty: Number(row.counted_qty ?? 0),
    varianceQty: Number(row.variance_qty ?? 0),
    unitCostCentimes: Number(row.unit_cost_centimes ?? 0),
    varianceCentimes: Number(row.variance_centimes ?? 0),
    reason: row.reason || undefined,
  };
}

export function mapWmsCycleCountFromDb(row: any, lines: WmsCycleCountLine[] = []): WmsCycleCount {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    warehouseId: row.warehouse_id || undefined,
    countNumber: row.count_number || '',
    status: (row.status || 'open') as WmsCycleCountStatus,
    startedAt: row.started_at,
    postedAt: row.posted_at || undefined,
    countedByStaffId: row.counted_by_staff_id || undefined,
    countedByName: row.counted_by_name || undefined,
    snapshotTakenAt: row.snapshot_taken_at,
    totalVarianceUnits: Number(row.total_variance_units ?? 0),
    totalVarianceCentimes: Number(row.total_variance_centimes ?? 0),
    lines,
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsStockTransferFromDb(row: any): WmsStockTransfer {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    transferNumber: row.transfer_number || '',
    fromWarehouseId: row.from_warehouse_id || undefined,
    fromWarehouseName: row.from_warehouse_name || undefined,
    toWarehouseId: row.to_warehouse_id || undefined,
    toWarehouseName: row.to_warehouse_name || undefined,
    status: (row.status || 'draft') as WmsTransferStatus,
    dispatchedAt: row.dispatched_at || undefined,
    receivedAt: row.received_at || undefined,
    carrierName: row.carrier_name || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsLandedCostFromDb(row: any): WmsLandedCostAllocation {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    purchaseDocId: row.purchase_doc_id || undefined,
    referenceNumber: row.reference_number || '',
    allocationMethod: (row.allocation_method || 'by_value') as WmsLandedCostMethod,
    currency: row.currency || 'DZD',
    fxRate: Number(row.fx_rate ?? 1),
    freightCentimes: Number(row.freight_centimes ?? 0),
    customsCentimes: Number(row.customs_centimes ?? 0),
    insuranceCentimes: Number(row.insurance_centimes ?? 0),
    otherCentimes: Number(row.other_centimes ?? 0),
    totalLandedCentimes: Number(row.total_landed_centimes ?? 0),
    lines: Array.isArray(row.lines) ? row.lines : [],
    status: (row.status === 'applied' ? 'applied' : 'draft'),
    appliedAt: row.applied_at || undefined,
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWmsConsignmentEntryFromDb(row: any): WmsConsignmentEntry {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    partyId: row.party_id || undefined,
    partyName: row.party_name || '',
    packagingCode: row.packaging_code || '',
    packagingName: row.packaging_name || '',
    movementType: (row.movement_type || 'issued') as WmsConsignmentMovementType,
    quantity: Number(row.quantity ?? 0),
    unitDepositCentimes: Number(row.unit_deposit_centimes ?? 0),
    totalDepositCentimes: Number(row.total_deposit_centimes ?? 0),
    referenceDoc: row.reference_doc || undefined,
    movementDate: row.movement_date,
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

async function fetchTenantTableRows<T>(
  table: string,
  businessId: string,
  mapper: (row: any) => T,
  updatedAfter?: string | null
): Promise<T[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from(table)
        .select('*')
        .eq('business_id', toValidUuid(businessId))
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return rows.map(mapper);
  } catch {
    return [];
  }
}

export const wmsService = {
  fetchBins: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_bins', businessId, mapWmsBinFromDb, updatedAfter),

  fetchStockLots: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_stock_lots', businessId, mapWmsStockLotFromDb, updatedAfter),

  fetchSerialNumbers: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_serial_numbers', businessId, mapWmsSerialNumberFromDb, updatedAfter),

  fetchUnitConversions: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_unit_conversions', businessId, mapWmsUnitConversionFromDb, updatedAfter),

  fetchReorderRules: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_reorder_rules', businessId, mapWmsReorderRuleFromDb, updatedAfter),

  fetchStockTransfers: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_stock_transfers', businessId, mapWmsStockTransferFromDb, updatedAfter),

  fetchLandedCostAllocations: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_landed_cost_allocations', businessId, mapWmsLandedCostFromDb, updatedAfter),

  fetchConsignmentEntries: (businessId: string, updatedAfter?: string | null) =>
    fetchTenantTableRows('wms_consignment_ledger', businessId, mapWmsConsignmentEntryFromDb, updatedAfter),

  async fetchCycleCounts(businessId: string, updatedAfter?: string | null): Promise<WmsCycleCount[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const headers = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('wms_cycle_counts')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('started_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      if (headers.length === 0) return [];
      const lineRows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('wms_cycle_count_lines')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .in(
            'cycle_count_id',
            headers.map((h) => h.id)
          )
          .order('id', { ascending: true })
          .range(from, to)
      );
      const linesByCount = new Map<string, WmsCycleCountLine[]>();
      for (const lr of lineRows) {
        const mapped = mapWmsCycleCountLineFromDb(lr);
        const list = linesByCount.get(mapped.cycleCountId) || [];
        list.push(mapped);
        linesByCount.set(mapped.cycleCountId, list);
      }
      return headers.map((h) => mapWmsCycleCountFromDb(h, linesByCount.get(h.id) || []));
    } catch {
      return [];
    }
  },

  async fetchWmsDataForBusiness(businessId: string, updatedAfter?: string | null) {
    const [
      bins,
      stockLots,
      serialNumbers,
      unitConversions,
      reorderRules,
      cycleCounts,
      stockTransfers,
      landedCostAllocations,
      consignmentEntries,
    ] = await Promise.all([
      this.fetchBins(businessId, updatedAfter),
      this.fetchStockLots(businessId, updatedAfter),
      this.fetchSerialNumbers(businessId, updatedAfter),
      this.fetchUnitConversions(businessId, updatedAfter),
      this.fetchReorderRules(businessId, updatedAfter),
      this.fetchCycleCounts(businessId, updatedAfter),
      this.fetchStockTransfers(businessId, updatedAfter),
      this.fetchLandedCostAllocations(businessId, updatedAfter),
      this.fetchConsignmentEntries(businessId, updatedAfter),
    ]);
    return {
      bins,
      stockLots,
      serialNumbers,
      unitConversions,
      reorderRules,
      cycleCounts,
      stockTransfers,
      landedCostAllocations,
      consignmentEntries,
    };
  },

  async upsertBin(bin: WmsBin, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: bin.accountId,
      businessId: bin.businessId,
      branchId: bin.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(bin.id),
      account_id: trace.account_id,
      business_id: toValidUuid(bin.businessId),
      branch_id: toValidUuid(bin.branchId),
      warehouse_id: toValidUuid(bin.warehouseId),
      code: bin.code.trim(),
      name: bin.name.trim(),
      zone: bin.zone || null,
      aisle: bin.aisle || null,
      rack: bin.rack || null,
      is_default: Boolean(bin.isDefault),
      capacity_units: bin.capacityUnits ?? null,
      notes: bin.notes || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_bins', payload, {
      expectedVersion: bin.version,
      entityType: 'WmsBin',
      entityLabel: `${bin.code} · ${bin.name}`,
      localData: payload,
    });
    return res.success;
  },

  async upsertStockLot(lot: WmsStockLot, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: lot.accountId,
      businessId: lot.businessId,
      branchId: lot.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(lot.id),
      account_id: trace.account_id,
      business_id: toValidUuid(lot.businessId),
      branch_id: toValidUuid(lot.branchId),
      warehouse_id: lot.warehouseId ? toValidUuid(lot.warehouseId) : null,
      bin_id: lot.binId ? toValidUuid(lot.binId) : null,
      product_id: toValidUuid(lot.productId),
      product_name: lot.productName.trim(),
      sku: lot.sku || null,
      lot_number: lot.lotNumber.trim(),
      manufacture_date: lot.manufactureDate || null,
      expiry_date: lot.expiryDate || null,
      qty_on_hand: Number(lot.qtyOnHand ?? 0),
      qty_reserved: Math.max(0, Number(lot.qtyReserved ?? 0)),
      unit_cost_centimes: Math.max(0, Math.round(lot.unitCostCentimes || 0)),
      recall_status: lot.recallStatus,
      recall_reason: lot.recallReason || null,
      supplier_name: lot.supplierName || null,
      notes: lot.notes || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_stock_lots', payload, {
      expectedVersion: lot.version,
      entityType: 'WmsStockLot',
      entityLabel: `${lot.lotNumber} · ${lot.productName}`,
      localData: payload,
    });
    return res.success;
  },

  async upsertSerialNumber(serial: WmsSerialNumber, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: serial.accountId,
      businessId: serial.businessId,
      branchId: serial.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(serial.id),
      account_id: trace.account_id,
      business_id: toValidUuid(serial.businessId),
      branch_id: toValidUuid(serial.branchId),
      warehouse_id: serial.warehouseId ? toValidUuid(serial.warehouseId) : null,
      bin_id: serial.binId ? toValidUuid(serial.binId) : null,
      lot_id: serial.lotId ? toValidUuid(serial.lotId) : null,
      product_id: toValidUuid(serial.productId),
      product_name: serial.productName.trim(),
      serial_number: serial.serialNumber.trim(),
      status: serial.status,
      source_doc_id: serial.sourceDocId || null,
      sale_id: serial.saleId || null,
      notes: serial.notes || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_serial_numbers', payload, {
      expectedVersion: serial.version,
      entityType: 'WmsSerialNumber',
      entityLabel: serial.serialNumber,
      localData: payload,
    });
    return res.success;
  },

  async upsertUnitConversion(conv: WmsUnitConversion, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: conv.accountId,
      businessId: conv.businessId,
      branchId: conv.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(conv.id),
      account_id: trace.account_id,
      business_id: toValidUuid(conv.businessId),
      branch_id: toValidUuid(conv.branchId),
      product_id: conv.productId ? toValidUuid(conv.productId) : null,
      product_name: conv.productName || null,
      from_unit: conv.fromUnit.trim(),
      to_base_unit: conv.toBaseUnit.trim(),
      conversion_factor: Number(conv.conversionFactor),
      barcode: conv.barcode || null,
      is_default_purchase: Boolean(conv.isDefaultPurchase),
      is_default_sale: Boolean(conv.isDefaultSale),
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_unit_conversions', payload, {
      expectedVersion: conv.version,
      entityType: 'WmsUnitConversion',
      entityLabel: `${conv.fromUnit} -> ${conv.toBaseUnit}`,
      localData: payload,
    });
    return res.success;
  },

  async upsertReorderRule(rule: WmsReorderRule, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: rule.accountId,
      businessId: rule.businessId,
      branchId: rule.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(rule.id),
      account_id: trace.account_id,
      business_id: toValidUuid(rule.businessId),
      branch_id: toValidUuid(rule.branchId),
      warehouse_id: rule.warehouseId ? toValidUuid(rule.warehouseId) : null,
      product_id: toValidUuid(rule.productId),
      product_name: rule.productName.trim(),
      min_qty: Math.max(0, Number(rule.minQty)),
      max_qty: Math.max(0, Number(rule.maxQty)),
      reorder_qty: Math.max(0, Number(rule.reorderQty)),
      preferred_supplier_id: rule.preferredSupplierId || null,
      preferred_supplier_name: rule.preferredSupplierName || null,
      lead_time_days: Math.max(0, Math.round(rule.leadTimeDays || 0)),
      is_active: Boolean(rule.isActive),
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_reorder_rules', payload, {
      expectedVersion: rule.version,
      entityType: 'WmsReorderRule',
      entityLabel: rule.productName,
      localData: payload,
    });
    return res.success;
  },

  async upsertCycleCount(count: WmsCycleCount, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: count.accountId,
      businessId: count.businessId,
      branchId: count.branchId,
      staffId,
    });
    const headerPayload = {
      id: toValidUuid(count.id),
      account_id: trace.account_id,
      business_id: toValidUuid(count.businessId),
      branch_id: toValidUuid(count.branchId),
      warehouse_id: count.warehouseId ? toValidUuid(count.warehouseId) : null,
      count_number: count.countNumber,
      status: count.status,
      started_at: count.startedAt,
      posted_at: count.postedAt || null,
      counted_by_staff_id: count.countedByStaffId ? toValidUuid(count.countedByStaffId) : null,
      counted_by_name: count.countedByName || null,
      snapshot_taken_at: count.snapshotTakenAt,
      total_variance_units: Number(count.totalVarianceUnits || 0),
      total_variance_centimes: Math.round(count.totalVarianceCentimes || 0),
      notes: count.notes || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_cycle_counts', headerPayload, {
      expectedVersion: count.version,
      entityType: 'WmsCycleCount',
      entityLabel: count.countNumber,
      localData: headerPayload,
    });
    for (const line of count.lines) {
      const linePayload = {
        id: toValidUuid(line.id),
        account_id: trace.account_id,
        business_id: toValidUuid(count.businessId),
        branch_id: toValidUuid(count.branchId),
        cycle_count_id: toValidUuid(count.id),
        product_id: toValidUuid(line.productId),
        product_name: line.productName,
        lot_id: line.lotId ? toValidUuid(line.lotId) : null,
        lot_number: line.lotNumber || null,
        bin_id: line.binId ? toValidUuid(line.binId) : null,
        system_qty: Number(line.systemQty || 0),
        active_sales_delta_qty: Number(line.activeSalesDeltaQty || 0),
        counted_qty: Number(line.countedQty || 0),
        variance_qty: Number(line.varianceQty || 0),
        unit_cost_centimes: Math.round(line.unitCostCentimes || 0),
        variance_centimes: Math.round(line.varianceCentimes || 0),
        reason: line.reason || null,
        updated_at: new Date().toISOString(),
      };
      await syncCoordinator.mutateOrQueueUpsert('wms_cycle_count_lines', linePayload, {
        entityType: 'WmsCycleCountLine',
        entityLabel: `${count.countNumber}:${line.productName}`,
        localData: linePayload,
      });
    }
    return res.success;
  },

  async postCycleCountAtomic(cycleCountId: string): Promise<{ success: boolean; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue(
      'wms_post_cycle_count',
      { p_cycle_count_id: toValidUuid(cycleCountId) },
      {
        table: 'wms_cycle_counts',
        recordId: toValidUuid(cycleCountId),
        entityType: 'WmsCycleCount',
        entityLabel: cycleCountId,
      }
    );
    return { success: res.success, error: res.error };
  },

  async upsertStockTransfer(transfer: WmsStockTransfer, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: transfer.accountId,
      businessId: transfer.businessId,
      branchId: transfer.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(transfer.id),
      account_id: trace.account_id,
      business_id: toValidUuid(transfer.businessId),
      branch_id: toValidUuid(transfer.branchId),
      transfer_number: transfer.transferNumber,
      from_warehouse_id: transfer.fromWarehouseId ? toValidUuid(transfer.fromWarehouseId) : null,
      from_warehouse_name: transfer.fromWarehouseName || null,
      to_warehouse_id: transfer.toWarehouseId ? toValidUuid(transfer.toWarehouseId) : null,
      to_warehouse_name: transfer.toWarehouseName || null,
      status: transfer.status,
      dispatched_at: transfer.dispatchedAt || null,
      received_at: transfer.receivedAt || null,
      carrier_name: transfer.carrierName || null,
      items: transfer.items,
      notes: transfer.notes || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_stock_transfers', payload, {
      expectedVersion: transfer.version,
      entityType: 'WmsStockTransfer',
      entityLabel: transfer.transferNumber,
      localData: payload,
    });
    return res.success;
  },

  async transitionStockTransferAtomic(
    transferId: string,
    action: 'dispatch' | 'receive' | 'partial'
  ): Promise<{ success: boolean; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue(
      'wms_transition_stock_transfer',
      { p_transfer_id: toValidUuid(transferId), p_action: action },
      {
        table: 'wms_stock_transfers',
        recordId: toValidUuid(transferId),
        entityType: 'WmsStockTransfer',
        entityLabel: `${transferId}:${action}`,
      }
    );
    return { success: res.success, error: res.error };
  },

  async upsertLandedCostAllocation(
    allocation: WmsLandedCostAllocation,
    staffId?: string
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: allocation.accountId,
      businessId: allocation.businessId,
      branchId: allocation.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(allocation.id),
      account_id: trace.account_id,
      business_id: toValidUuid(allocation.businessId),
      branch_id: toValidUuid(allocation.branchId),
      purchase_doc_id: allocation.purchaseDocId || null,
      reference_number: allocation.referenceNumber,
      allocation_method: allocation.allocationMethod,
      currency: allocation.currency || 'DZD',
      fx_rate: Number(allocation.fxRate || 1),
      freight_centimes: Math.round(allocation.freightCentimes || 0),
      customs_centimes: Math.round(allocation.customsCentimes || 0),
      insurance_centimes: Math.round(allocation.insuranceCentimes || 0),
      other_centimes: Math.round(allocation.otherCentimes || 0),
      total_landed_centimes: Math.round(allocation.totalLandedCentimes || 0),
      lines: allocation.lines,
      status: allocation.status,
      applied_at: allocation.appliedAt || null,
      notes: allocation.notes || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_landed_cost_allocations', payload, {
      expectedVersion: allocation.version,
      entityType: 'WmsLandedCostAllocation',
      entityLabel: allocation.referenceNumber,
      localData: payload,
    });
    return res.success;
  },

  async upsertConsignmentEntry(entry: WmsConsignmentEntry, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      account_id: trace.account_id,
      business_id: toValidUuid(entry.businessId),
      branch_id: toValidUuid(entry.branchId),
      party_id: entry.partyId ? toValidUuid(entry.partyId) : null,
      party_name: entry.partyName.trim(),
      packaging_code: entry.packagingCode.trim(),
      packaging_name: entry.packagingName.trim(),
      movement_type: entry.movementType,
      quantity: Number(entry.quantity),
      unit_deposit_centimes: Math.max(0, Math.round(entry.unitDepositCentimes || 0)),
      total_deposit_centimes: Math.max(0, Math.round(entry.totalDepositCentimes || 0)),
      reference_doc: entry.referenceDoc || null,
      movement_date: entry.movementDate,
      notes: entry.notes || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('wms_consignment_ledger', payload, {
      expectedVersion: entry.version,
      entityType: 'WmsConsignmentEntry',
      entityLabel: `${entry.packagingCode} · ${entry.partyName}`,
      localData: payload,
    });
    return res.success;
  },

  async atomicConsumeStock(params: {
    businessId: string;
    branchId: string;
    productId: string;
    quantity: number;
    warehouseId?: string;
    lotId?: string;
    negativeStockPolicy: WmsNegativeStockPolicy;
    referenceDoc?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue(
      'wms_atomic_consume_stock',
      {
        p_business_id: toValidUuid(params.businessId),
        p_branch_id: toValidUuid(params.branchId),
        p_product_id: toValidUuid(params.productId),
        p_quantity: Number(params.quantity),
        p_warehouse_id: params.warehouseId ? toValidUuid(params.warehouseId) : null,
        p_lot_id: params.lotId ? toValidUuid(params.lotId) : null,
        p_negative_stock_policy: params.negativeStockPolicy,
        p_reference_doc: params.referenceDoc || null,
      },
      {
        table: 'wms_stock_lots',
        recordId: toValidUuid(params.lotId || params.productId),
        entityType: 'WmsStockLot',
        entityLabel: params.referenceDoc || params.productId,
      }
    );
    return { success: res.success, error: res.error };
  },
};

import { getSupabaseClient, toValidUuid } from '../client';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  ManufacturingBom,
  ManufacturingBomComponent,
  ManufacturingOrder,
  WorkstationSessionLog,
  RawMaterialStockItem,
  MaterialTransferVoucher,
  QualityInspectionRecord,
} from '../../../types/index';

type DbOrderStatus = 'Planned' | 'Released' | 'InProgress' | 'QualityHold' | 'Completed' | 'Cancelled';
type DbQcResult = 'Pass' | 'Conditional' | 'Fail';
type DbVoucherType = 'consumption' | 'return' | 'restock';

function toDbOrderStatus(s: ManufacturingOrder['status']): DbOrderStatus {
  switch (s) {
    case 'Scheduled':
    case 'MaterialsIssued':
      return 'Released';
    case 'InProduction':
      return 'InProgress';
    case 'QC':
    case 'QC_Pending':
      return 'QualityHold';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
      return 'Cancelled';
    case 'Draft':
    case 'Planned':
    default:
      return 'Planned';
  }
}

function toDbQcVerdict(v: QualityInspectionRecord['verdict']): DbQcResult {
  if (v === 'Accepted') return 'Pass';
  if (v === 'AcceptedWithDerogation') return 'Conditional';
  return 'Fail';
}

function toDbVoucherType(v: MaterialTransferVoucher['voucherType']): DbVoucherType {
  if (v === 'BonDeReception') return 'restock';
  if (v === 'BonDeTransfert') return 'return';
  return 'consumption';
}

const META_PREFIX = '__atrium_mfg__:';

function packMeta(plain: string | undefined, meta: Record<string, any>): string {
  return `${META_PREFIX}${JSON.stringify({ plain: plain || '', ...meta })}`;
}

function unpackMeta(raw: string | null | undefined): { plain: string; meta: Record<string, any> } {
  if (!raw) return { plain: '', meta: {} };
  if (raw.startsWith(META_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(META_PREFIX.length));
      const { plain = '', ...meta } = parsed || {};
      return { plain, meta };
    } catch {
      return { plain: raw, meta: {} };
    }
  }
  return { plain: raw, meta: {} };
}

export const manufacturingService = {
  async fetchRawMaterials(branchId: string, updatedAfter?: string | null): Promise<RawMaterialStockItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('mfg_raw_materials')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): RawMaterialStockItem => {
        const { plain: supplierLotNumber, meta } = unpackMeta(row.supplier_name);
        const currentStock = Number(row.stock_quantity || 0);
        const allocatedStock = Number(meta.allocatedStock ?? 0);
        const unitCostPmpDzd = Number(row.unit_cost_dzd || 0);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          sku: row.sku,
          name: row.name,
          category: (meta.category || 'Metals') as RawMaterialStockItem['category'],
          currentStock,
          allocatedStock,
          availableStock: Math.max(0, currentStock - allocatedStock),
          reorderThreshold: Number(row.min_stock_alert || 20),
          unit: row.unit || 'kg',
          unitCostPmpDzd,
          totalValuationDzd: Number(meta.totalValuationDzd ?? currentStock * unitCostPmpDzd),
          warehouseLocation: meta.warehouseLocation || 'Magasin MP',
          supplierLotNumber: supplierLotNumber || undefined,
          onmlCertificateRef: meta.onmlCertificateRef || undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertRawMaterial(item: RawMaterialStockItem): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: item.accountId || 'acc_01',
      businessId: item.businessId,
      branchId: item.branchId,
      staffId: item.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_raw_materials', {
      id: toValidUuid(item.id),
      ...trace,
      sku: item.sku,
      name: item.name,
      unit: item.unit || 'kg',
      stock_quantity: Number(item.currentStock || 0),
      min_stock_alert: Number(item.reorderThreshold || 20),
      unit_cost_dzd: Number(item.unitCostPmpDzd || 0),
      supplier_name: packMeta(item.supplierLotNumber, {
        category: item.category,
        allocatedStock: item.allocatedStock,
        totalValuationDzd: item.totalValuationDzd,
        warehouseLocation: item.warehouseLocation,
        onmlCertificateRef: item.onmlCertificateRef,
      }),
    });
    return res.success;
  },

  async fetchBoms(branchId: string, updatedAfter?: string | null): Promise<ManufacturingBom[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let recipeQuery = (client as any)
        .from('mfg_bom_recipes')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) recipeQuery = recipeQuery.gt('updated_at', updatedAfter);

      const [{ data: recipes, error: rErr }, { data: ingredients }] = await Promise.all([
        recipeQuery,
        (client as any)
          .from('mfg_bom_ingredients')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null),
      ]);

      if (rErr) return [];

      const byBom = new Map<string, ManufacturingBomComponent[]>();
      (ingredients || []).forEach((ing: any) => {
        const list = byBom.get(ing.bom_id) || [];
        list.push({
          id: ing.id,
          rawProductId: ing.material_id || ing.id,
          rawProductName: ing.material_name,
          quantity: Number(ing.quantity_per_batch || 1),
          unit: ing.unit || 'kg',
          scrapAllowancePercent: Number(ing.scrap_factor_percent || 0),
          unitCostDzd: 0,
        });
        byBom.set(ing.bom_id, list);
      });

      return (recipes || []).map((row: any): ManufacturingBom => {
        const { meta } = unpackMeta(row.version);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          finishedProductId: meta.finishedProductId || row.id,
          finishedProductName: row.finished_product_name,
          finishedProductSku: meta.finishedProductSku,
          bomCode: row.code,
          version: Number(meta.versionNumber ?? 1),
          archetype: meta.archetype || 'Discrete',
          batchYield: Number(row.batch_size || 1),
          unit: row.output_unit || 'U',
          standardLaborHours: Number(row.standard_cycle_minutes || 60) / 60,
          components: Array.isArray(meta.components) && meta.components.length > 0
            ? meta.components
            : byBom.get(row.id) || [],
          routingSteps: Array.isArray(meta.routingSteps) ? meta.routingSteps : [],
          totalMaterialCostDzd: meta.totalMaterialCostDzd,
          totalLaborCostDzd: meta.totalLaborCostDzd,
          totalLaborMachineCostDzd: meta.totalLaborMachineCostDzd,
          estimatedCostDzd: Number(row.estimated_unit_cost_dzd || 0),
          suggestedSalePriceDzd: meta.suggestedSalePriceDzd,
          targetMarginPercent: meta.targetMarginPercent,
          isActive: row.is_active ?? true,
          status: meta.status || (row.is_active ? 'Active' : 'Archived'),
          notes: meta.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBom(bom: ManufacturingBom): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: bom.accountId || 'acc_01',
      businessId: bom.businessId,
      branchId: bom.branchId,
      staffId: bom.staffId,
    });
    const bomUuid = toValidUuid(bom.id);
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_bom_recipes', {
      id: bomUuid,
      ...trace,
      code: bom.bomCode,
      finished_product_name: bom.finishedProductName,
      output_unit: bom.unit || 'U',
      batch_size: Number(bom.batchYield || 1),
      estimated_unit_cost_dzd: Number(bom.estimatedCostDzd || 0),
      standard_cycle_minutes: Math.max(1, Math.round((bom.standardLaborHours || 1) * 60)),
      version: packMeta(`v${bom.version || 1}`, {
        finishedProductId: bom.finishedProductId,
        finishedProductSku: bom.finishedProductSku,
        versionNumber: bom.version || 1,
        archetype: bom.archetype,
        components: bom.components || [],
        routingSteps: bom.routingSteps || [],
        totalMaterialCostDzd: bom.totalMaterialCostDzd,
        totalLaborCostDzd: bom.totalLaborCostDzd,
        totalLaborMachineCostDzd: bom.totalLaborMachineCostDzd,
        suggestedSalePriceDzd: bom.suggestedSalePriceDzd,
        targetMarginPercent: bom.targetMarginPercent,
        status: bom.status,
        notes: bom.notes,
      }),
      is_active: bom.isActive ?? true,
    });

    for (const comp of bom.components || []) {
      await syncCoordinator.mutateOrQueueUpsert('mfg_bom_ingredients', {
        id: toValidUuid(comp.id || `${bom.id}_${comp.rawProductId}`),
        ...trace,
        bom_id: bomUuid,
        material_id: null,
        material_name: comp.rawProductName,
        quantity_per_batch: Number(comp.quantity || 1),
        unit: comp.unit || 'kg',
        scrap_factor_percent: Number(comp.scrapAllowancePercent || 0),
      });
    }

    return res.success;
  },

  async fetchOrders(branchId: string, updatedAfter?: string | null): Promise<ManufacturingOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('mfg_orders')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): ManufacturingOrder => {
        const { plain, meta } = unpackMeta(row.notes);
        const produced = Number(row.produced_quantity || 0);
        const scrapped = Number(row.scrap_quantity || 0);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          orderNumber: row.of_number,
          bomId: row.bom_id || meta.bomId || '',
          bomCode: meta.bomCode,
          productName: row.product_name,
          targetQuantity: Number(row.target_quantity || 1),
          quantityOrdered: Number(row.target_quantity || 1),
          actualQuantityProduced: produced,
          quantityProduced: produced,
          quantityScrapped: scrapped,
          scrapQuantity: scrapped,
          scrapReasonCode: meta.scrapReasonCode,
          assignedStation: row.workstation_name || undefined,
          assignedWorkCenterIds: meta.assignedWorkCenterIds,
          targetDueDate: row.due_date || undefined,
          batchLotNumber: meta.batchLotNumber || `LOT-${row.of_number}`,
          startDate: meta.startDate || (row.created_at ? row.created_at.split('T')[0] : ''),
          dueDate: row.due_date || '',
          completedDate: meta.completedDate,
          status: (meta.uiStatus || 'Planned') as ManufacturingOrder['status'],
          totalMaterialCostDzd: Number(meta.totalMaterialCostDzd ?? 0),
          totalLaborCostDzd: Number(meta.totalLaborCostDzd ?? 0),
          totalCostDzd: Number(meta.totalCostDzd ?? 0),
          clientOrderId: meta.clientOrderId,
          clientName: meta.clientName,
          notes: plain || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertOrder(order: ManufacturingOrder): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: order.accountId || 'acc_01',
      businessId: order.businessId,
      branchId: order.branchId,
      staffId: order.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_orders', {
      id: toValidUuid(order.id),
      ...trace,
      of_number: order.orderNumber,
      bom_id: order.bomId ? toValidUuid(order.bomId) : null,
      product_name: order.productName,
      target_quantity: Number(order.targetQuantity ?? order.quantityOrdered ?? 1),
      produced_quantity: Number(order.actualQuantityProduced ?? order.quantityProduced ?? 0),
      scrap_quantity: Number(order.quantityScrapped ?? order.scrapQuantity ?? 0),
      priority: 'Normal',
      status: toDbOrderStatus(order.status),
      due_date: order.dueDate || order.targetDueDate || null,
      workstation_name: order.assignedStation || null,
      notes: packMeta(order.notes, {
        uiStatus: order.status,
        bomId: order.bomId,
        bomCode: order.bomCode,
        scrapReasonCode: order.scrapReasonCode,
        assignedWorkCenterIds: order.assignedWorkCenterIds,
        batchLotNumber: order.batchLotNumber,
        startDate: order.startDate,
        completedDate: order.completedDate,
        totalMaterialCostDzd: order.totalMaterialCostDzd,
        totalLaborCostDzd: order.totalLaborCostDzd,
        totalCostDzd: order.totalCostDzd,
        clientOrderId: order.clientOrderId,
        clientName: order.clientName,
      }),
    });
    return res.success;
  },

  async fetchSessionLogs(branchId: string, updatedAfter?: string | null): Promise<WorkstationSessionLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('mfg_workstation_logs')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): WorkstationSessionLog | null => {
          const { meta } = unpackMeta(row.notes);
          return meta.log ? (meta.log as WorkstationSessionLog) : null;
        })
        .filter((l: WorkstationSessionLog | null): l is WorkstationSessionLog => Boolean(l));
    } catch {
      return [];
    }
  },

  async upsertSessionLog(log: WorkstationSessionLog): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || 'acc_01',
      businessId: log.businessId,
      branchId: log.branchId,
      staffId: log.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_workstation_logs', {
      id: toValidUuid(log.id),
      ...trace,
      workstation_id: null,
      order_id: log.orderId ? toValidUuid(log.orderId) : null,
      operator_name: log.operatorName,
      started_at: log.startTime || new Date().toISOString(),
      ended_at: log.endTime || null,
      good_units: Number(log.goodQuantity || 0),
      scrap_units: Number(log.scrapQuantity || 0),
      downtime_minutes: Math.round((log.pauseDurationSeconds || 0) / 60),
      notes: packMeta(log.operationName, { log }),
    });
    return res.success;
  },

  async fetchQcInspections(branchId: string, updatedAfter?: string | null): Promise<QualityInspectionRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('mfg_qc_inspections')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): QualityInspectionRecord => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          inspectionNumber: meta.inspectionNumber || `QC-${row.of_number}`,
          orderId: row.order_id || meta.orderId || '',
          orderNumber: row.of_number,
          batchLotNumber: meta.batchLotNumber || '',
          productName: meta.productName || '',
          sampleSize: Number(row.sample_size || 10),
          inspectedQuantity: Number(meta.inspectedQuantity ?? row.sample_size ?? 10),
          acceptedQuantity: Number(meta.acceptedQuantity ?? Math.max(0, Number(row.sample_size || 10) - Number(row.defects_found || 0))),
          rejectedQuantity: Number(row.defects_found || 0),
          verdict: meta.verdict || (row.result === 'Pass' ? 'Accepted' : row.result === 'Conditional' ? 'AcceptedWithDerogation' : 'Quarantined'),
          checkpoints: Array.isArray(row.checklist) ? row.checklist : [],
          inspectorName: row.inspector_name,
          inspectionDate: meta.inspectionDate || (row.inspected_at ? String(row.inspected_at).split('T')[0] : ''),
          certificateOfConformityGenerated: Boolean(meta.certificateOfConformityGenerated),
          notes: plain || undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertQcInspection(qc: QualityInspectionRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: qc.accountId || 'acc_01',
      businessId: qc.businessId,
      branchId: qc.branchId,
      staffId: qc.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_qc_inspections', {
      id: toValidUuid(qc.id),
      ...trace,
      order_id: qc.orderId ? toValidUuid(qc.orderId) : null,
      of_number: qc.orderNumber,
      inspector_name: qc.inspectorName,
      sample_size: Number(qc.sampleSize || 10),
      defects_found: Number(qc.rejectedQuantity || 0),
      result: toDbQcVerdict(qc.verdict),
      checklist: qc.checkpoints || [],
      notes: packMeta(qc.notes, {
        inspectionNumber: qc.inspectionNumber,
        orderId: qc.orderId,
        batchLotNumber: qc.batchLotNumber,
        productName: qc.productName,
        inspectedQuantity: qc.inspectedQuantity,
        acceptedQuantity: qc.acceptedQuantity,
        verdict: qc.verdict,
        inspectionDate: qc.inspectionDate,
        certificateOfConformityGenerated: qc.certificateOfConformityGenerated,
      }),
    });
    return res.success;
  },

  async fetchMaterialVouchers(branchId: string, updatedAfter?: string | null): Promise<MaterialTransferVoucher[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('mfg_material_vouchers')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): MaterialTransferVoucher => {
          const { plain, meta } = unpackMeta(row.notes);
          if (meta.voucher) return meta.voucher as MaterialTransferVoucher;
          return {
            id: row.id,
            accountId: row.account_id,
            businessId: row.business_id,
            branchId: row.branch_id,
            staffId: row.staff_id || 'staff_01',
            voucherNumber: row.voucher_number,
            voucherType: row.voucher_type === 'restock' ? 'BonDeReception' : 'BonDeSortie',
            orderId: row.order_id || undefined,
            recipientStaffName: row.operator_name || '',
            transferDate: row.created_at ? row.created_at.split('T')[0] : '',
            items: [
              {
                materialId: row.material_id,
                materialName: row.material_name,
                quantity: Number(row.quantity || 0),
                unit: 'kg',
                unitCostDzd: 0,
              },
            ],
            totalValueDzd: 0,
            notes: plain || undefined,
          };
        });
    } catch {
      return [];
    }
  },

  async processMaterialVoucher(voucher: MaterialTransferVoucher): Promise<boolean> {
    const firstItem = voucher.items?.[0];
    if (!firstItem) return false;

    const trace = buildTraceEnvelope({
      accountId: voucher.accountId || 'acc_01',
      businessId: voucher.businessId,
      branchId: voucher.branchId,
      staffId: voucher.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_material_vouchers', {
      id: toValidUuid(voucher.id),
      ...trace,
      voucher_number: voucher.voucherNumber,
      order_id: voucher.orderId ? toValidUuid(voucher.orderId) : null,
      material_id: toValidUuid(firstItem.materialId),
      material_name: firstItem.materialName,
      voucher_type: toDbVoucherType(voucher.voucherType),
      quantity: Number(firstItem.quantity || 0),
      operator_name: voucher.recipientStaffName || null,
      notes: packMeta(voucher.notes, { voucher }),
    });
    return res.success;
  },
};

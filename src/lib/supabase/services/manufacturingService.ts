import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  ManufacturingBom,
  ManufacturingBomComponent,
  ManufacturingOrder,
  WorkstationSessionLog,
  RawMaterialStockItem,
  MaterialTransferVoucher,
  QualityInspectionRecord,
  MfgNcrRecord,
  MfgAlertRecord,
  MfgFinishedGoodsLot,
  MfgMachineAsset,
  MfgMachineMaintenanceLog,
  MfgPieceRateEntry,
  MfgCuttingPlan,
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
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_raw_materials')
          .select(
            'id, account_id, business_id, branch_id, staff_id, sku, name, stock_quantity, min_stock_alert, unit, unit_cost_dzd, supplier_name, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): RawMaterialStockItem => {
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
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertRawMaterial(item: RawMaterialStockItem): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: item.accountId,
      businessId: item.businessId,
      branchId: item.branchId,
      staffId: item.staffId,
    });
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_raw_materials', payload, {
      expectedVersion: item.version,
      entityType: 'RawMaterial',
      entityLabel: item.name,
      localData: payload,
    });
    return res.success;
  },

  async fetchBoms(branchId: string, updatedAfter?: string | null): Promise<ManufacturingBom[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const [recipes, ingredients] = await Promise.all([
        fetchAllPages<any>((from, to) => {
          let recipeQuery = (client as any)
            .from('mfg_bom_recipes')
            .select(
              'id, account_id, business_id, branch_id, staff_id, code, finished_product_name, output_unit, batch_size, estimated_unit_cost_dzd, standard_cycle_minutes, version, row_version, bom_family_id, version_number, parent_bom_id, is_active, created_at, updated_at'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (updatedAfter) recipeQuery = recipeQuery.gt('updated_at', updatedAfter);
          return recipeQuery;
        }),
        fetchAllPages<any>((from, to) =>
          (client as any)
            .from('mfg_bom_ingredients')
            .select(
              'id, bom_id, material_id, material_name, quantity_per_batch, unit, scrap_factor_percent'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('id', { ascending: true })
            .range(from, to)
        ),
      ]);

      const byBom = new Map<string, ManufacturingBomComponent[]>();
      ingredients.forEach((ing: any) => {
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

      return recipes.map((row: any): ManufacturingBom => {
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
          bomFamilyId: row.bom_family_id || meta.bomFamilyId || row.id,
          parentBomId: row.parent_bom_id || meta.parentBomId || undefined,
          version: Number(row.version_number ?? meta.versionNumber ?? 1),
          rowVersion: row.row_version != null ? Number(row.row_version) : undefined,
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
      accountId: bom.accountId,
      businessId: bom.businessId,
      branchId: bom.branchId,
      staffId: bom.staffId,
    });
    const bomUuid = toValidUuid(bom.id);
    const pRecipe = {
      id: bomUuid,
      ...trace,
      code: bom.bomCode,
      finished_product_name: bom.finishedProductName,
      output_unit: bom.unit || 'U',
      batch_size: Number(bom.batchYield || 1),
      estimated_unit_cost_dzd: Number(bom.estimatedCostDzd || 0),
      standard_cycle_minutes: Math.max(1, Math.round((bom.standardLaborHours || 1) * 60)),
      bom_family_id: bom.bomFamilyId ? toValidUuid(bom.bomFamilyId) : bomUuid,
      version_number: Number(bom.version || 1),
      parent_bom_id: bom.parentBomId ? toValidUuid(bom.parentBomId) : null,
      version: packMeta(`v${bom.version || 1}`, {
        finishedProductId: bom.finishedProductId,
        finishedProductSku: bom.finishedProductSku,
        bomFamilyId: bom.bomFamilyId || bom.id,
        parentBomId: bom.parentBomId,
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
      ...(bom.rowVersion != null ? { expected_row_version: bom.rowVersion } : {}),
    };

    const pIngredients = (bom.components || []).map((comp) => ({
      id: toValidUuid(comp.id || `${bom.id}_${comp.rawProductId}`),
      material_id: null,
      material_name: comp.rawProductName,
      quantity_per_batch: Number(comp.quantity || 1),
      unit: comp.unit || 'kg',
      scrap_factor_percent: Number(comp.scrapAllowancePercent || 0),
    }));

    const res = await syncCoordinator.rpcOrQueue(
      'mfg_upsert_bom_atomic',
      {
        p_recipe: pRecipe,
        p_ingredients: pIngredients,
      },
      {
        table: 'mfg_bom_recipes',
        recordId: bomUuid,
        versionColumn: 'row_version',
        expectedVersion: bom.rowVersion,
        entityType: 'BOM',
        entityLabel: `${bom.bomCode} — ${bom.finishedProductName}`,
        localData: pRecipe,
      }
    );

    return res.success;
  },

  async forkBomVersion(sourceBomId: string, nextBom: ManufacturingBom): Promise<boolean> {
    const newUuid = toValidUuid(nextBom.id);
    const pNewRecipe = {
      id: newUuid,
      staff_id: toValidUuid(nextBom.staffId || 'staff_01'),
      finished_product_name: nextBom.finishedProductName,
      output_unit: nextBom.unit || 'U',
      batch_size: Number(nextBom.batchYield || 1),
      estimated_unit_cost_dzd: Number(nextBom.estimatedCostDzd || 0),
      standard_cycle_minutes: Math.max(1, Math.round((nextBom.standardLaborHours || 1) * 60)),
      version: packMeta(`v${nextBom.version || 2}`, {
        finishedProductId: nextBom.finishedProductId,
        finishedProductSku: nextBom.finishedProductSku,
        bomFamilyId: nextBom.bomFamilyId || sourceBomId,
        parentBomId: sourceBomId,
        versionNumber: nextBom.version || 2,
        archetype: nextBom.archetype,
        components: nextBom.components || [],
        routingSteps: nextBom.routingSteps || [],
        totalMaterialCostDzd: nextBom.totalMaterialCostDzd,
        totalLaborCostDzd: nextBom.totalLaborCostDzd,
        totalLaborMachineCostDzd: nextBom.totalLaborMachineCostDzd,
        suggestedSalePriceDzd: nextBom.suggestedSalePriceDzd,
        targetMarginPercent: nextBom.targetMarginPercent,
        status: nextBom.status || 'Active',
        notes: nextBom.notes,
      }),
    };
    const pNewIngredients = (nextBom.components || []).map((comp) => ({
      id: toValidUuid(comp.id || `${nextBom.id}_${comp.rawProductId}`),
      material_id: null,
      material_name: comp.rawProductName,
      quantity_per_batch: Number(comp.quantity || 1),
      unit: comp.unit || 'kg',
      scrap_factor_percent: Number(comp.scrapAllowancePercent || 0),
    }));

    const res = await syncCoordinator.rpcOrQueue(
      'mfg_create_bom_version',
      {
        p_source_bom_id: toValidUuid(sourceBomId),
        p_new_recipe: pNewRecipe,
        p_new_ingredients: pNewIngredients,
      },
      {
        table: 'mfg_bom_recipes',
        recordId: newUuid,
        entityType: 'BOMVersion',
        entityLabel: `${nextBom.bomCode} v${nextBom.version || 2}`,
        localData: pNewRecipe,
      }
    );
    return res.success;
  },

  async fetchOrders(branchId: string, updatedAfter?: string | null): Promise<ManufacturingOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_orders')
          .select(
            'id, account_id, business_id, branch_id, staff_id, of_number, bom_id, product_name, target_quantity, produced_quantity, scrap_quantity, workstation_name, due_date, notes, pinned_bom_version, bom_snapshot, unit_piece_rate_centimes, actual_material_cost_centimes, actual_labor_cost_centimes, cmup_recalc_delta_centimes, linked_unified_doc_id, version, created_at, updated_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): ManufacturingOrder => {
        const { plain, meta } = unpackMeta(row.notes);
        const produced = Number(row.produced_quantity || 0);
        const scrapped = Number(row.scrap_quantity || 0);
        const snapshot =
          row.bom_snapshot && typeof row.bom_snapshot === 'object' && row.bom_snapshot.bomId
            ? row.bom_snapshot
            : meta.bomSnapshot;
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          orderNumber: row.of_number,
          bomId: row.bom_id || meta.bomId || '',
          bomCode: meta.bomCode,
          pinnedBomVersion: row.pinned_bom_version != null ? Number(row.pinned_bom_version) : meta.pinnedBomVersion,
          bomSnapshot: snapshot,
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
          unitPieceRateCentimes:
            row.unit_piece_rate_centimes != null
              ? Number(row.unit_piece_rate_centimes)
              : meta.unitPieceRateCentimes,
          actualMaterialCostCentimes:
            row.actual_material_cost_centimes != null
              ? Number(row.actual_material_cost_centimes)
              : meta.actualMaterialCostCentimes,
          actualLaborCostCentimes:
            row.actual_labor_cost_centimes != null
              ? Number(row.actual_labor_cost_centimes)
              : meta.actualLaborCostCentimes,
          cmupRecalcDeltaCentimes:
            row.cmup_recalc_delta_centimes != null
              ? Number(row.cmup_recalc_delta_centimes)
              : meta.cmupRecalcDeltaCentimes,
          linkedUnifiedDocId: row.linked_unified_doc_id || meta.linkedUnifiedDocId,
          clientOrderId: meta.clientOrderId,
          clientName: meta.clientName,
          notes: plain || undefined,
          version: row.version != null ? Number(row.version) : undefined,
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
      accountId: order.accountId,
      businessId: order.businessId,
      branchId: order.branchId,
      staffId: order.staffId,
    });
    const payload = {
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
      pinned_bom_version: Number(order.pinnedBomVersion || 1),
      bom_snapshot: order.bomSnapshot || {},
      unit_piece_rate_centimes: Math.round(Number(order.unitPieceRateCentimes || 0)),
      actual_material_cost_centimes: Math.round(Number(order.actualMaterialCostCentimes || 0)),
      actual_labor_cost_centimes: Math.round(Number(order.actualLaborCostCentimes || 0)),
      cmup_recalc_delta_centimes: Math.round(Number(order.cmupRecalcDeltaCentimes || 0)),
      linked_unified_doc_id: order.linkedUnifiedDocId ? toValidUuid(order.linkedUnifiedDocId) : null,
      notes: packMeta(order.notes, {
        uiStatus: order.status,
        bomId: order.bomId,
        bomCode: order.bomCode,
        pinnedBomVersion: order.pinnedBomVersion,
        bomSnapshot: order.bomSnapshot,
        scrapReasonCode: order.scrapReasonCode,
        assignedWorkCenterIds: order.assignedWorkCenterIds,
        batchLotNumber: order.batchLotNumber,
        startDate: order.startDate,
        completedDate: order.completedDate,
        totalMaterialCostDzd: order.totalMaterialCostDzd,
        totalLaborCostDzd: order.totalLaborCostDzd,
        totalCostDzd: order.totalCostDzd,
        unitPieceRateCentimes: order.unitPieceRateCentimes,
        actualMaterialCostCentimes: order.actualMaterialCostCentimes,
        actualLaborCostCentimes: order.actualLaborCostCentimes,
        cmupRecalcDeltaCentimes: order.cmupRecalcDeltaCentimes,
        linkedUnifiedDocId: order.linkedUnifiedDocId,
        clientOrderId: order.clientOrderId,
        clientName: order.clientName,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_orders', payload, {
      expectedVersion: order.version,
      entityType: 'ManufacturingOrder',
      entityLabel: order.orderNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchSessionLogs(branchId: string, updatedAfter?: string | null): Promise<WorkstationSessionLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_workstation_logs')
          .select(
            'id, account_id, business_id, branch_id, staff_id, workstation_id, order_id, operator_staff_id, operator_name, pin_verified, pin_verified_at, ppe_checklist, ppe_verified, ppe_verified_at, session_status, piece_rate_centimes, downtime_reason, good_units, scrap_units, downtime_minutes, started_at, ended_at, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows
        .map((row: any): WorkstationSessionLog | null => {
          const { meta } = unpackMeta(row.notes);
          if (meta.log) {
            const embedded = meta.log as WorkstationSessionLog;
            return {
              ...embedded,
              operatorStaffId: row.operator_staff_id || embedded.operatorStaffId,
              pinVerified: row.pin_verified ?? embedded.pinVerified,
              pinVerifiedAt: row.pin_verified_at || embedded.pinVerifiedAt,
              ppeChecklist: row.ppe_checklist || embedded.ppeChecklist,
              ppeVerified: row.ppe_verified ?? embedded.ppeVerified,
              ppeVerifiedAt: row.ppe_verified_at || embedded.ppeVerifiedAt,
              status: (row.session_status || embedded.status || 'Submitted') as WorkstationSessionLog['status'],
              pieceRateCentimes:
                row.piece_rate_centimes != null ? Number(row.piece_rate_centimes) : embedded.pieceRateCentimes,
              downtimeReason: row.downtime_reason || embedded.downtimeReason,
              version: row.version != null ? Number(row.version) : embedded.version,
            };
          }
          return null;
        })
        .filter((l: WorkstationSessionLog | null): l is WorkstationSessionLog => Boolean(l));
    } catch {
      return [];
    }
  },

  async upsertSessionLog(log: WorkstationSessionLog): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId,
      businessId: log.businessId,
      branchId: log.branchId,
      staffId: log.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      workstation_id: log.workCenterId && isUuidLoose(log.workCenterId) ? log.workCenterId : null,
      order_id: log.orderId ? toValidUuid(log.orderId) : null,
      operator_staff_id: log.operatorStaffId ? toValidUuid(log.operatorStaffId) : null,
      operator_name: log.operatorName,
      pin_verified: Boolean(log.pinVerified),
      pin_verified_at: log.pinVerifiedAt || null,
      ppe_checklist: log.ppeChecklist || { glasses: false, gloves: false, shoes: false, helmet: false },
      ppe_verified: Boolean(log.ppeVerified),
      ppe_verified_at: log.ppeVerifiedAt || null,
      session_status: log.status || 'Submitted',
      piece_rate_centimes: Math.round(Number(log.pieceRateCentimes || 0)),
      downtime_reason: log.downtimeReason || log.pauseReason || null,
      started_at: log.startTime || new Date().toISOString(),
      ended_at: log.endTime || null,
      good_units: Number(log.goodQuantity || 0),
      scrap_units: Number(log.scrapQuantity || 0),
      downtime_minutes: Math.round((log.pauseDurationSeconds || 0) / 60),
      notes: packMeta(log.operationName, { log }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_workstation_logs', payload, {
      expectedVersion: log.version,
      entityType: 'WorkstationSessionLog',
      entityLabel: `${log.orderNumber} — ${log.operationName}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchQcInspections(branchId: string, updatedAfter?: string | null): Promise<QualityInspectionRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_qc_inspections')
          .select(
            'id, account_id, business_id, branch_id, staff_id, order_id, of_number, sample_size, defects_found, result, checklist, inspector_name, inspected_at, notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): QualityInspectionRecord => {
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
          version: row.version != null ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertQcInspection(qc: QualityInspectionRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: qc.accountId,
      businessId: qc.businessId,
      branchId: qc.branchId,
      staffId: qc.staffId,
    });
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_qc_inspections', payload, {
      expectedVersion: qc.version,
      entityType: 'QualityInspection',
      entityLabel: qc.inspectionNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchMaterialVouchers(branchId: string, updatedAfter?: string | null): Promise<MaterialTransferVoucher[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_material_vouchers')
          .select(
            'id, account_id, business_id, branch_id, staff_id, voucher_number, voucher_type, order_id, operator_name, material_id, material_name, quantity, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows
        .map((row: any): MaterialTransferVoucher => {
          const { plain, meta } = unpackMeta(row.notes);
          if (meta.voucher) {
            return {
              ...(meta.voucher as MaterialTransferVoucher),
              version: row.version != null ? Number(row.version) : (meta.voucher as MaterialTransferVoucher).version,
            };
          }
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
            version: row.version != null ? Number(row.version) : undefined,
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
      accountId: voucher.accountId,
      businessId: voucher.businessId,
      branchId: voucher.branchId,
      staffId: voucher.staffId,
    });
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_material_vouchers', payload, {
      expectedVersion: voucher.version,
      entityType: 'MaterialTransferVoucher',
      entityLabel: voucher.voucherNumber,
      localData: payload,
    });
    return res.success;
  },

  async deleteOrder(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('mfg_orders', id, deletedByStaffId);
    return res.success;
  },

  async deleteBom(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('mfg_bom_recipes', id, deletedByStaffId);
    return res.success;
  },

  async deleteRawMaterial(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('mfg_raw_materials', id, deletedByStaffId);
    return res.success;
  },

  async deleteQcInspection(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('mfg_qc_inspections', id, deletedByStaffId);
    return res.success;
  },

  async fetchNcrRecords(branchId: string, updatedAfter?: string | null): Promise<MfgNcrRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_ncr_records')
          .select(
            'id, account_id, business_id, branch_id, staff_id, ncr_number, order_id, qc_inspection_id, of_number, lot_number, product_name, scrapped_quantity, reason, disposition, status, cmup_adjustment_held, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): MfgNcrRecord => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || '',
        ncrNumber: row.ncr_number,
        orderId: row.order_id || undefined,
        qcInspectionId: row.qc_inspection_id || undefined,
        ofNumber: row.of_number,
        lotNumber: row.lot_number || undefined,
        productName: row.product_name,
        scrappedQuantity: Number(row.scrapped_quantity || 0),
        reason: row.reason || '',
        disposition: (row.disposition || 'Scrapped') as MfgNcrRecord['disposition'],
        status: (row.status || 'Open') as MfgNcrRecord['status'],
        cmupAdjustmentHeld: row.cmup_adjustment_held !== false,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async recordScrapWithNcr(params: {
    qcRecord: QualityInspectionRecord;
    ncrRecord: MfgNcrRecord;
  }): Promise<boolean> {
    const { qcRecord, ncrRecord } = params;
    const rpcPayload = {
      p_business_id: toValidUuid(ncrRecord.businessId),
      p_branch_id: toValidUuid(ncrRecord.branchId),
      p_order_id: ncrRecord.orderId ? toValidUuid(ncrRecord.orderId) : null,
      p_of_number: ncrRecord.ofNumber,
      p_lot_number: ncrRecord.lotNumber || null,
      p_product_name: ncrRecord.productName,
      p_inspector_name: qcRecord.inspectorName,
      p_scrapped_quantity: Number(ncrRecord.scrappedQuantity || 1),
      p_reason: ncrRecord.reason,
      p_notes: ncrRecord.notes || null,
      p_qc_id: toValidUuid(qcRecord.id),
      p_ncr_id: toValidUuid(ncrRecord.id),
    };

    const res = await syncCoordinator.rpcOrQueue('mfg_scrap_with_ncr', rpcPayload);
    return res.success;
  },

  async deleteNcrRecord(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('mfg_ncr_records', id, deletedByStaffId);
    return res.success;
  },

  async fetchAlerts(branchId: string, updatedAfter?: string | null): Promise<MfgAlertRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_alerts')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): MfgAlertRecord => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        alertNumber: row.alert_number,
        alertType: row.alert_type || 'AndonStop',
        severity: row.severity || 'critical',
        workstationId: row.workstation_id || undefined,
        workstationName: row.workstation_name || undefined,
        orderId: row.order_id || undefined,
        orderNumber: row.order_number || undefined,
        raisedByStaffId: row.raised_by_staff_id || undefined,
        raisedByName: row.raised_by_name || 'Opérateur',
        notifiedRoles: Array.isArray(row.notified_roles) ? row.notified_roles : ['gerant', 'chef_atelier'],
        message: row.message || '',
        status: row.status || 'Open',
        acknowledgedBy: row.acknowledged_by || undefined,
        acknowledgedAt: row.acknowledged_at || undefined,
        resolvedBy: row.resolved_by || undefined,
        resolvedAt: row.resolved_at || undefined,
        resolutionNotes: row.resolution_notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async triggerAndonAlert(alert: MfgAlertRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: alert.accountId,
      businessId: alert.businessId,
      branchId: alert.branchId,
      staffId: alert.staffId,
    });
    const payload = {
      id: toValidUuid(alert.id),
      ...trace,
      alert_number: alert.alertNumber,
      alert_type: alert.alertType,
      severity: alert.severity,
      workstation_id: alert.workstationId && isUuidLoose(alert.workstationId) ? alert.workstationId : null,
      workstation_name: alert.workstationName || null,
      order_id: alert.orderId ? toValidUuid(alert.orderId) : null,
      order_number: alert.orderNumber || null,
      raised_by_staff_id: alert.raisedByStaffId ? toValidUuid(alert.raisedByStaffId) : null,
      raised_by_name: alert.raisedByName,
      notified_roles: alert.notifiedRoles || ['gerant', 'chef_atelier'],
      message: alert.message,
      status: alert.status || 'Open',
    };
    const res = await syncCoordinator.rpcOrQueue(
      'mfg_trigger_andon_alert',
      { p_alert: payload },
      {
        table: 'mfg_alerts',
        recordId: payload.id,
        expectedVersion: alert.version,
        entityType: 'MfgAlert',
        entityLabel: alert.alertNumber,
        localData: payload,
      }
    );
    return res.success;
  },

  async resolveAndonAlert(params: {
    alertId: string;
    action: 'acknowledge' | 'resolve';
    actorName: string;
    resolutionNotes?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue(
      'mfg_resolve_andon_alert',
      {
        p_alert_id: toValidUuid(params.alertId),
        p_action: params.action,
        p_actor_name: params.actorName,
        p_resolution_notes: params.resolutionNotes || null,
      }
    );
    return res.success;
  },

  async fetchFinishedGoods(branchId: string, updatedAfter?: string | null): Promise<MfgFinishedGoodsLot[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_finished_goods')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('produced_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): MfgFinishedGoodsLot => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        lotNumber: row.lot_number,
        sku: row.sku,
        productName: row.product_name,
        orderId: row.order_id || undefined,
        orderNumber: row.order_number || undefined,
        qcInspectionId: row.qc_inspection_id || undefined,
        qtyProduced: Number(row.qty_produced || 0),
        qtyReserved: Number(row.qty_reserved || 0),
        qtyDelivered: Number(row.qty_delivered || 0),
        unit: row.unit || 'Unité',
        unitCmupCentimes: Number(row.unit_cmup_centimes || 0),
        warehouseLocation: row.warehouse_location || 'Magasin PF',
        releaseStatus: row.release_status || 'Quarantine',
        linkedUnifiedDocId: row.linked_unified_doc_id || undefined,
        producedAt: row.produced_at || row.created_at,
        releasedAt: row.released_at || undefined,
        releasedBy: row.released_by || undefined,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertFinishedGoodsLot(lot: MfgFinishedGoodsLot): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: lot.accountId,
      businessId: lot.businessId,
      branchId: lot.branchId,
      staffId: lot.staffId,
    });
    const payload = {
      id: toValidUuid(lot.id),
      ...trace,
      lot_number: lot.lotNumber,
      sku: lot.sku,
      product_name: lot.productName,
      order_id: lot.orderId ? toValidUuid(lot.orderId) : null,
      order_number: lot.orderNumber || null,
      qc_inspection_id: lot.qcInspectionId ? toValidUuid(lot.qcInspectionId) : null,
      qty_produced: Number(lot.qtyProduced || 0),
      qty_reserved: Number(lot.qtyReserved || 0),
      qty_delivered: Number(lot.qtyDelivered || 0),
      unit: lot.unit || 'Unité',
      unit_cmup_centimes: Math.round(Number(lot.unitCmupCentimes || 0)),
      warehouse_location: lot.warehouseLocation || 'Magasin PF',
      release_status: lot.releaseStatus || 'Quarantine',
      linked_unified_doc_id: lot.linkedUnifiedDocId ? toValidUuid(lot.linkedUnifiedDocId) : null,
      produced_at: lot.producedAt || new Date().toISOString(),
      released_at: lot.releasedAt || null,
      released_by: lot.releasedBy || null,
      notes: lot.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_finished_goods', payload, {
      expectedVersion: lot.version,
      entityType: 'MfgFinishedGoodsLot',
      entityLabel: lot.lotNumber,
      localData: payload,
    });
    return res.success;
  },

  async releaseFinishedGoodsLot(params: {
    fgId: string;
    inspectorName: string;
    qcInspectionId?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('mfg_release_finished_goods_lot', {
      p_fg_id: toValidUuid(params.fgId),
      p_inspector_name: params.inspectorName,
      p_qc_inspection_id: params.qcInspectionId ? toValidUuid(params.qcInspectionId) : null,
    });
    return res.success;
  },

  async fetchMachines(branchId: string, updatedAfter?: string | null): Promise<MfgMachineAsset[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_workstations')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('code', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): MfgMachineAsset => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        code: row.code,
        name: row.name,
        department: row.department || 'Atelier',
        machineType: row.machine_type || 'CNC',
        hourlyCostDzd: Number(row.hourly_cost_dzd || 0),
        status: row.status || 'Idle',
        currentOrderCode: row.current_order_code || undefined,
        runningHours: Number(row.running_hours || 0),
        cycleCount: Number(row.cycle_count || 0),
        maintenanceIntervalHours: Number(row.maintenance_interval_hours || 250),
        maintenanceIntervalDays: Number(row.maintenance_interval_days || 90),
        lastMaintenanceDate: row.last_maintenance_date || undefined,
        nextMaintenanceDueDate: row.next_maintenance_due_date || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertMachine(machine: MfgMachineAsset): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: machine.accountId,
      businessId: machine.businessId,
      branchId: machine.branchId,
      staffId: machine.staffId,
    });
    const payload = {
      id: toValidUuid(machine.id),
      ...trace,
      code: machine.code,
      name: machine.name,
      department: machine.department || 'Atelier',
      machine_type: machine.machineType || 'CNC',
      hourly_cost_dzd: Number(machine.hourlyCostDzd || 0),
      status: machine.status || 'Idle',
      current_order_code: machine.currentOrderCode || null,
      running_hours: Number(machine.runningHours || 0),
      cycle_count: Math.round(Number(machine.cycleCount || 0)),
      maintenance_interval_hours: Number(machine.maintenanceIntervalHours || 250),
      maintenance_interval_days: Math.round(Number(machine.maintenanceIntervalDays || 90)),
      last_maintenance_date: machine.lastMaintenanceDate || null,
      next_maintenance_due_date: machine.nextMaintenanceDueDate || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_workstations', payload, {
      expectedVersion: machine.version,
      entityType: 'MfgMachine',
      entityLabel: `${machine.code} — ${machine.name}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchMaintenanceLogs(branchId: string, updatedAfter?: string | null): Promise<MfgMachineMaintenanceLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_machine_maintenance')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('scheduled_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): MfgMachineMaintenanceLog => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        ticketNumber: row.ticket_number,
        machineId: row.machine_id,
        machineName: row.machine_name,
        maintenanceType: row.maintenance_type || 'Preventive',
        triggerReason: row.trigger_reason || 'ScheduledHours',
        runtimeHoursAtService: Number(row.runtime_hours_at_service || 0),
        cycleCountAtService: Number(row.cycle_count_at_service || 0),
        scheduledDate: row.scheduled_date,
        completedDate: row.completed_date || undefined,
        technicianName: row.technician_name || undefined,
        costCentimes: Number(row.cost_centimes || 0),
        status: row.status || 'Scheduled',
        checklistNotes: row.checklist_notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertMaintenanceLog(log: MfgMachineMaintenanceLog): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId,
      businessId: log.businessId,
      branchId: log.branchId,
      staffId: log.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      ticket_number: log.ticketNumber,
      machine_id: toValidUuid(log.machineId),
      machine_name: log.machineName,
      maintenance_type: log.maintenanceType,
      trigger_reason: log.triggerReason,
      runtime_hours_at_service: Number(log.runtimeHoursAtService || 0),
      cycle_count_at_service: Math.round(Number(log.cycleCountAtService || 0)),
      scheduled_date: log.scheduledDate,
      completed_date: log.completedDate || null,
      technician_name: log.technicianName || null,
      cost_centimes: Math.round(Number(log.costCentimes || 0)),
      status: log.status,
      checklist_notes: log.checklistNotes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_machine_maintenance', payload, {
      expectedVersion: log.version,
      entityType: 'MfgMaintenance',
      entityLabel: log.ticketNumber,
      localData: payload,
    });
    return res.success;
  },

  async completeMachineMaintenance(params: {
    maintenanceId: string;
    technicianName: string;
    costCentimes?: number;
    notes?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('mfg_complete_machine_maintenance', {
      p_maintenance_id: toValidUuid(params.maintenanceId),
      p_technician_name: params.technicianName,
      p_cost_centimes: Math.round(Number(params.costCentimes || 0)),
      p_notes: params.notes || null,
    });
    return res.success;
  },

  async fetchPieceRateEntries(branchId: string, updatedAfter?: string | null): Promise<MfgPieceRateEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_piece_rate_entries')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): MfgPieceRateEntry => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || row.operator_staff_id || 'staff_01',
        operatorStaffId: row.operator_staff_id || undefined,
        operatorName: row.operator_name,
        workstationLogId: row.workstation_log_id || undefined,
        orderId: row.order_id || undefined,
        orderNumber: row.order_number,
        periodMonth: row.period_month,
        goodUnits: Number(row.good_units || 0),
        scrapUnits: Number(row.scrap_units || 0),
        ratePerPieceCentimes: Number(row.rate_per_piece_centimes || 0),
        grossAmountCentimes: Number(row.gross_amount_centimes || 0),
        status: row.status || 'accrued',
        payrollRunId: row.payroll_run_id || undefined,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertPieceRateEntry(entry: MfgPieceRateEntry): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      operator_staff_id: entry.operatorStaffId ? toValidUuid(entry.operatorStaffId) : null,
      operator_name: entry.operatorName,
      workstation_log_id: entry.workstationLogId ? toValidUuid(entry.workstationLogId) : null,
      order_id: entry.orderId ? toValidUuid(entry.orderId) : null,
      order_number: entry.orderNumber,
      period_month: entry.periodMonth,
      good_units: Number(entry.goodUnits || 0),
      scrap_units: Number(entry.scrapUnits || 0),
      rate_per_piece_centimes: Math.round(Number(entry.ratePerPieceCentimes || 0)),
      gross_amount_centimes: Math.round(Number(entry.grossAmountCentimes || 0)),
      status: entry.status || 'accrued',
      payroll_run_id: entry.payrollRunId ? toValidUuid(entry.payrollRunId) : null,
      notes: entry.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_piece_rate_entries', payload, {
      expectedVersion: entry.version,
      entityType: 'MfgPieceRate',
      entityLabel: `${entry.operatorName} — ${entry.orderNumber}`,
      localData: payload,
    });
    return res.success;
  },

  async postPieceRateEntriesToPayroll(entryIds: string[], payrollRunId?: string): Promise<boolean> {
    if (!entryIds.length) return true;
    const res = await syncCoordinator.rpcOrQueue('mfg_post_piece_rate_to_payroll', {
      p_entry_ids: entryIds.map((id) => toValidUuid(id)),
      p_payroll_run_id: payrollRunId ? toValidUuid(payrollRunId) : null,
    });
    return res.success;
  },

  async fetchCuttingPlans(branchId: string, updatedAfter?: string | null): Promise<MfgCuttingPlan[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('mfg_cutting_plans')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): MfgCuttingPlan => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        planNumber: row.plan_number,
        title: row.title,
        tradeCategory: row.trade_category || 'Wood',
        cuttingMode: row.cutting_mode || '1d_linear',
        stockLengthMm: Number(row.stock_length_mm || 6000),
        stockWidthMm: Number(row.stock_width_mm || 1220),
        kerfMm: Number(row.kerf_mm || 4),
        parts: Array.isArray(row.parts) ? row.parts : [],
        layoutResult: row.layout_result || {
          mode: '1d_linear',
          stockUnitsRequired: 1,
          totalDemandedAreaOrLength: 0,
          totalStockAreaOrLength: 0,
          wastePercent: 0,
          reusableOffcutsCount: 0,
          reusableOffcutsSummary: [],
          layouts: [],
        },
        stockUnitsRequired: Number(row.stock_units_required || 1),
        wastePercent: Number(row.waste_percent || 0),
        reusableOffcuts: Array.isArray(row.reusable_offcuts) ? row.reusable_offcuts : [],
        linkedQuoteId: row.linked_quote_id || undefined,
        unitPriceCentimes: Number(row.unit_price_centimes || 0),
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertCuttingPlan(plan: MfgCuttingPlan): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: plan.accountId,
      businessId: plan.businessId,
      branchId: plan.branchId,
      staffId: plan.staffId,
    });
    const payload = {
      id: toValidUuid(plan.id),
      ...trace,
      plan_number: plan.planNumber,
      title: plan.title,
      trade_category: plan.tradeCategory,
      cutting_mode: plan.cuttingMode,
      stock_length_mm: Number(plan.stockLengthMm || 6000),
      stock_width_mm: Number(plan.stockWidthMm || 1220),
      kerf_mm: Number(plan.kerfMm ?? 4),
      parts: plan.parts || [],
      layout_result: plan.layoutResult || {},
      stock_units_required: Math.round(Number(plan.stockUnitsRequired || 1)),
      waste_percent: Number(plan.wastePercent || 0),
      reusable_offcuts: plan.reusableOffcuts || [],
      linked_quote_id: plan.linkedQuoteId ? toValidUuid(plan.linkedQuoteId) : null,
      unit_price_centimes: Math.round(Number(plan.unitPriceCentimes || 0)),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('mfg_cutting_plans', payload, {
      expectedVersion: plan.version,
      entityType: 'MfgCuttingPlan',
      entityLabel: plan.planNumber,
      localData: payload,
    });
    return res.success;
  },
};

function isUuidLoose(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

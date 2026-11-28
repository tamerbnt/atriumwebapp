import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import type { GarageTechCommission } from '../../../types';
import type {
  BodyShopInsuranceClaim,
  DetailingPackage,
  FlatRateLaborItem,
  GaragePurchaseOrderRecord,
  GarageSupplierRecord,
  InspectionCenterPv,
  TechnicianTimeLog,
  TireStorageEntry,
} from '../../../utils/garageDepth';
import type {
  WorkshopBay,
  CorporateFleetAccount,
  RepairOrder,
  VehicleAsset,
  SparePart,
  GarageInvoice,
} from '../../../components/screens/garage/garageData';

export interface GarageBranchContext {
  accountId?: string;
  businessId?: string;
  branchId: string;
  staffId?: string;
}

type DbOrderStatus =
  | 'Intake'
  | 'Diagnosing'
  | 'WaitingParts'
  | 'InProgress'
  | 'QualityCheck'
  | 'Ready'
  | 'Delivered';

function mapOrderStatusToDb(status: RepairOrder['status']): DbOrderStatus {
  switch (status) {
    case 'Diagnostic':
    case 'WaitingApproval':
      return 'Diagnosing';
    case 'WaitingParts':
      return 'WaitingParts';
    case 'InRepair':
      return 'InProgress';
    case 'Testing':
      return 'QualityCheck';
    case 'ReadyForPickup':
      return 'Ready';
    case 'Delivered':
      return 'Delivered';
    case 'Intake':
    default:
      return 'Intake';
  }
}

function mapOrderStatusFromDb(dbStatus: string, uiStatus?: RepairOrder['status']): RepairOrder['status'] {
  if (uiStatus) return uiStatus;
  switch (dbStatus) {
    case 'Diagnosing':
      return 'Diagnostic';
    case 'WaitingParts':
      return 'WaitingParts';
    case 'InProgress':
      return 'InRepair';
    case 'QualityCheck':
      return 'Testing';
    case 'Ready':
      return 'ReadyForPickup';
    case 'Delivered':
      return 'Delivered';
    case 'Intake':
    default:
      return 'Intake';
  }
}

const META_PREFIX = '__atrium_garage__:';

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

export const garageService = {
  async fetchBays(branchId: string, updatedAfter?: string | null): Promise<WorkshopBay[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_bays')
            .select(
              'id, branch_id, bay_code, name, bay_type, status, active_work_order_id, assigned_mechanic_name, version'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('bay_code', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );

      return data.map((row: any, idx: number): WorkshopBay => {
        const { plain: bayTypeStr, meta } = unpackMeta(row.bay_type);
        const bayNumMatch = String(row.bay_code || '').match(/(\d+)/);
        return {
          id: row.id,
          branchId: row.branch_id,
          bayNumber: meta.bayNumber ?? (bayNumMatch ? Number(bayNumMatch[1]) : idx + 1),
          name: row.name,
          bayType: (meta.uiBayType || bayTypeStr || 'lift_2post') as WorkshopBay['bayType'],
          maxTonnage: Number(meta.maxTonnage ?? 4.0),
          isOccupied: row.status === 'Occupied',
          activeOrderId: row.active_work_order_id || undefined,
          assignedTechnicianName: row.assigned_mechanic_name || undefined,
          version: typeof row.version === 'number' ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBay(bay: WorkshopBay, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: bay.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(bay.id),
      ...trace,
      bay_code: `BAY-${String(bay.bayNumber).padStart(2, '0')}`,
      name: bay.name,
      bay_type: packMeta(bay.bayType, {
        bayNumber: bay.bayNumber,
        uiBayType: bay.bayType,
        maxTonnage: bay.maxTonnage,
      }),
      status: bay.isOccupied ? 'Occupied' : 'Free',
      active_work_order_id: bay.activeOrderId ? toValidUuid(bay.activeOrderId) : null,
      assigned_mechanic_name: bay.assignedTechnicianName || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_bays', payload, {
      expectedVersion: bay.version,
      entityType: 'WorkshopBay',
      entityLabel: bay.name,
      localData: payload,
    });
    return res.success;
  },

  async assignBay(bayId: string, workOrderId: string, mechanicName: string): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('garage_assign_bay', {
      p_bay_id: toValidUuid(bayId),
      p_work_order_id: toValidUuid(workOrderId),
      p_mechanic_name: mechanicName,
    });
    return res.success;
  },

  async releaseBay(bayId: string): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('garage_release_bay', {
      p_bay_id: toValidUuid(bayId),
    });
    return res.success;
  },

  async fetchVehicles(branchId: string, updatedAfter?: string | null): Promise<VehicleAsset[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_vehicles')
            .select(
              'id, account_id, business_id, branch_id, staff_id, crm_party_id, vehicle_type, plate_format, plate_number, make, model, model_year, vin, fuel_type, owner_name, owner_phone, fleet_name, mileage_km, last_service_km, last_service_date, next_service_km, next_service_date, daily_avg_km, tech_control_expiry, insurance_expiry, carte_grise_number, ownership_history, notes, version'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );

      return data.map((row: any): VehicleAsset => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || undefined,
          crmPartyId: row.crm_party_id || meta.crmPartyId || undefined,
          vehicleType: (row.vehicle_type || meta.vehicleType || 'car') as VehicleAsset['vehicleType'],
          plateFormat: (row.plate_format || meta.plateFormat || 'algeria_standard') as VehicleAsset['plateFormat'],
          plateNumber: row.plate_number,
          brand: row.make,
          model: row.model,
          year: Number(row.model_year || 2020),
          vin: row.vin || '',
          fuelType: (row.fuel_type || 'Essence') as VehicleAsset['fuelType'],
          ownerName: row.owner_name,
          ownerPhone: row.owner_phone || '',
          ownerEmail: meta.ownerEmail || undefined,
          isFleet: Boolean(row.fleet_name || meta.isFleet),
          fleetId: meta.fleetId || undefined,
          fleetName: row.fleet_name || undefined,
          mileageKm: Number(row.mileage_km || 0),
          lastServiceKm: row.last_service_km ?? meta.lastServiceKm,
          lastServiceDate: row.last_service_date || meta.lastServiceDate,
          nextServiceKm: row.next_service_km ?? meta.nextServiceKm,
          nextServiceDate: row.next_service_date || meta.nextServiceDate,
          dailyAvgKm: row.daily_avg_km ?? meta.dailyAvgKm,
          techControlExpiry: row.tech_control_expiry || meta.techControlExpiry,
          insuranceExpiry: row.insurance_expiry || meta.insuranceExpiry,
          carteGriseNumber: row.carte_grise_number || meta.carteGriseNumber,
          ownershipHistory: Array.isArray(row.ownership_history)
            ? row.ownership_history
            : Array.isArray(meta.ownershipHistory)
            ? meta.ownershipHistory
            : [],
          notes: plain || undefined,
          version: typeof row.version === 'number' ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertVehicle(vehicle: VehicleAsset, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: vehicle.accountId || ctx.accountId,
      businessId: vehicle.businessId || ctx.businessId,
      branchId: vehicle.branchId || ctx.branchId,
      staffId: vehicle.staffId || ctx.staffId,
    });
    const payload = {
      id: toValidUuid(vehicle.id),
      ...trace,
      crm_party_id: vehicle.crmPartyId ? toValidUuid(vehicle.crmPartyId) : null,
      vehicle_type: vehicle.vehicleType || 'car',
      plate_format: vehicle.plateFormat || 'algeria_standard',
      plate_number: vehicle.plateNumber,
      vin: vehicle.vin || null,
      make: vehicle.brand,
      model: vehicle.model,
      model_year: vehicle.year || null,
      fuel_type: vehicle.fuelType || 'Essence',
      mileage_km: Number(vehicle.mileageKm || 0),
      last_service_km: vehicle.lastServiceKm ?? null,
      last_service_date: vehicle.lastServiceDate ? vehicle.lastServiceDate.slice(0, 10) : null,
      next_service_km: vehicle.nextServiceKm ?? null,
      next_service_date: vehicle.nextServiceDate ? vehicle.nextServiceDate.slice(0, 10) : null,
      daily_avg_km: vehicle.dailyAvgKm ?? 50,
      tech_control_expiry: vehicle.techControlExpiry ? vehicle.techControlExpiry.slice(0, 10) : null,
      insurance_expiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.slice(0, 10) : null,
      carte_grise_number: vehicle.carteGriseNumber || null,
      ownership_history: vehicle.ownershipHistory || [],
      owner_name: vehicle.ownerName,
      owner_phone: vehicle.ownerPhone || null,
      fleet_name: vehicle.fleetName || null,
      notes: packMeta(vehicle.notes, {
        ownerEmail: vehicle.ownerEmail,
        isFleet: vehicle.isFleet,
        fleetId: vehicle.fleetId,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_vehicles', payload, {
      expectedVersion: vehicle.version,
      entityType: 'VehicleAsset',
      entityLabel: `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber})`,
      localData: payload,
    });
    return res.success;
  },

  async deleteVehicle(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('garage_vehicles', id, deletedByStaffId);
    return res.success;
  },

  async fetchWorkOrders(branchId: string, updatedAfter?: string | null): Promise<RepairOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_work_orders')
            .select(
              'id, account_id, business_id, branch_id, staff_id, client_crm_party_id, order_number, plate_number, vehicle_label, client_name, client_phone, created_at, promised_at, diagnostic_summary, status, total_ttc_dzd, labor_total_dzd, parts_total_dzd, mechanic_name, bay_id, intake_mileage_km, estimate_status, estimate_approved_at, estimate_approved_by, estimate_photos, quote_unit_prices_snapshot, labor_lines, mileage_override_reason, detailing_package_id, is_locked_invoiced, reopen_credit_note_id, reopen_reason, reopened_at, unified_document_id, journal_entry_id, version'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );

      return data.map((row: any): RepairOrder => {
        const { plain, meta } = unpackMeta(row.diagnostic_summary);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || undefined,
          clientCrmPartyId: row.client_crm_party_id || meta.clientCrmPartyId || undefined,
          orderNumber: row.order_number,
          vehiclePlate: row.plate_number,
          vehicleModel: row.vehicle_label,
          clientName: row.client_name,
          clientPhone: row.client_phone || '',
          clientType: meta.clientType || 'individual',
          fleetId: meta.fleetId,
          fleetName: meta.fleetName,
          intakeDate: meta.intakeDate || (row.created_at ? row.created_at.split('T')[0] : ''),
          promisedDate: row.promised_at ? String(row.promised_at).split('T')[0] : meta.promisedDate,
          diagnosticNotes: plain,
          status: mapOrderStatusFromDb(row.status, meta.uiStatus),
          estimatedCostDzd: Number(meta.estimatedCostDzd ?? row.total_ttc_dzd ?? 0),
          finalCostDzd: Number(row.total_ttc_dzd || 0),
          laborHoursEstimated: meta.laborHoursEstimated,
          laborHoursActual: meta.laborHoursActual,
          hourlyRateDzd: meta.hourlyRateDzd,
          laborCostDzd: Number(row.labor_total_dzd || 0),
          partsCostDzd: Number(row.parts_total_dzd || 0),
          partsUsed: Array.isArray(meta.partsUsed) ? meta.partsUsed : [],
          laborLines: Array.isArray(row.labor_lines)
            ? row.labor_lines
            : Array.isArray(meta.laborLines)
            ? meta.laborLines
            : [],
          technicianName: row.mechanic_name || '',
          assignedBayId: row.bay_id || meta.assignedBayId || undefined,
          bayName: meta.bayName,
          fuelLevel: meta.fuelLevel || '50',
          inOdometerKm: Number(row.intake_mileage_km || 0),
          mileageOverrideReason: row.mileage_override_reason || meta.mileageOverrideReason || undefined,
          isVehicleDirty: meta.isVehicleDirty,
          damageMarkers: Array.isArray(meta.damageMarkers) ? meta.damageMarkers : [],
          clientSignatureSvg: meta.clientSignatureSvg,
          technicianChecklist: Array.isArray(meta.technicianChecklist) ? meta.technicianChecklist : [],
          estimateStatus: (row.estimate_status || meta.estimateStatus || 'draft') as RepairOrder['estimateStatus'],
          estimateApprovedAt: row.estimate_approved_at || meta.estimateApprovedAt || undefined,
          estimateApprovedBy: row.estimate_approved_by || meta.estimateApprovedBy || undefined,
          estimatePhotos: Array.isArray(row.estimate_photos)
            ? row.estimate_photos
            : Array.isArray(meta.estimatePhotos)
            ? meta.estimatePhotos
            : [],
          quoteUnitPricesSnapshot:
            row.quote_unit_prices_snapshot && typeof row.quote_unit_prices_snapshot === 'object'
              ? row.quote_unit_prices_snapshot
              : meta.quoteUnitPricesSnapshot || {},
          detailingPackageId: row.detailing_package_id || meta.detailingPackageId || undefined,
          isLockedInvoiced: Boolean(row.is_locked_invoiced ?? meta.isLockedInvoiced),
          reopenCreditNoteId: row.reopen_credit_note_id || meta.reopenCreditNoteId || undefined,
          reopenReason: row.reopen_reason || meta.reopenReason || undefined,
          reopenedAt: row.reopened_at || meta.reopenedAt || undefined,
          unifiedDocumentId: row.unified_document_id || meta.unifiedDocumentId || undefined,
          journalEntryId: row.journal_entry_id || meta.journalEntryId || undefined,
          billingType: meta.billingType || 'bon_caisse',
          isPaid: Boolean(meta.isPaid),
          invoiceId: meta.invoiceId,
          version: typeof row.version === 'number' ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertWorkOrder(order: RepairOrder, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: order.accountId || ctx.accountId,
      businessId: order.businessId || ctx.businessId,
      branchId: order.branchId || ctx.branchId,
      staffId: order.staffId || ctx.staffId,
    });
    const payload = {
      id: toValidUuid(order.id),
      ...trace,
      client_crm_party_id: order.clientCrmPartyId ? toValidUuid(order.clientCrmPartyId) : null,
      order_number: order.orderNumber,
      plate_number: order.vehiclePlate,
      vehicle_label: order.vehicleModel,
      client_name: order.clientName,
      client_phone: order.clientPhone || null,
      bay_id: order.assignedBayId ? toValidUuid(order.assignedBayId) : null,
      mechanic_name: order.technicianName || null,
      intake_mileage_km: Number(order.inOdometerKm || 0),
      mileage_override_reason: order.mileageOverrideReason || null,
      status: mapOrderStatusToDb(order.status),
      labor_total_dzd: Number(order.laborCostDzd || 0),
      parts_total_dzd: Number(order.partsCostDzd || 0),
      total_ttc_dzd: Number(order.finalCostDzd || order.estimatedCostDzd || 0),
      promised_at: order.promisedDate ? `${order.promisedDate}T18:00:00Z` : null,
      estimate_status: order.estimateStatus || 'draft',
      estimate_approved_at: order.estimateApprovedAt || null,
      estimate_approved_by: order.estimateApprovedBy || null,
      estimate_photos: order.estimatePhotos || [],
      quote_unit_prices_snapshot: order.quoteUnitPricesSnapshot || {},
      labor_lines: order.laborLines || [],
      detailing_package_id: order.detailingPackageId ? toValidUuid(order.detailingPackageId) : null,
      is_locked_invoiced: Boolean(order.isLockedInvoiced),
      reopen_credit_note_id: order.reopenCreditNoteId ? toValidUuid(order.reopenCreditNoteId) : null,
      reopen_reason: order.reopenReason || null,
      reopened_at: order.reopenedAt || null,
      unified_document_id: order.unifiedDocumentId ? toValidUuid(order.unifiedDocumentId) : null,
      journal_entry_id: order.journalEntryId ? toValidUuid(order.journalEntryId) : null,
      diagnostic_summary: packMeta(order.diagnosticNotes, {
        uiStatus: order.status,
        clientType: order.clientType,
        fleetId: order.fleetId,
        fleetName: order.fleetName,
        intakeDate: order.intakeDate,
        promisedDate: order.promisedDate,
        estimatedCostDzd: order.estimatedCostDzd,
        laborHoursEstimated: order.laborHoursEstimated,
        laborHoursActual: order.laborHoursActual,
        hourlyRateDzd: order.hourlyRateDzd,
        partsUsed: order.partsUsed || [],
        assignedBayId: order.assignedBayId,
        bayName: order.bayName,
        fuelLevel: order.fuelLevel,
        isVehicleDirty: order.isVehicleDirty,
        damageMarkers: order.damageMarkers || [],
        clientSignatureSvg: order.clientSignatureSvg,
        technicianChecklist: order.technicianChecklist || [],
        billingType: order.billingType,
        isPaid: order.isPaid,
        invoiceId: order.invoiceId,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_work_orders', payload, {
      expectedVersion: order.version,
      entityType: 'RepairOrder',
      entityLabel: `${order.orderNumber} (${order.vehiclePlate})`,
      localData: payload,
    });
    return res.success;
  },

  async deleteWorkOrder(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('garage_work_orders', id, deletedByStaffId);
    return res.success;
  },

  async reopenWorkOrderWithCreditNote(
    workOrderId: string,
    creditNoteId: string,
    reason: string
  ): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('garage_reopen_invoiced_order', {
      p_work_order_id: toValidUuid(workOrderId),
      p_credit_note_id: toValidUuid(creditNoteId),
      p_reason: reason,
    });
    return res.success;
  },

  async fetchParts(branchId: string, updatedAfter?: string | null): Promise<SparePart[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_parts')
            .select(
              'id, account_id, business_id, branch_id, staff_id, part_number, oem_reference, name, brand, category, stock_quantity, min_stock, cost_dzd, sell_price_dzd, bin_location, unit, supplier_id, compatibility, default_warranty_months, created_at, version'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('name', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );

      return data.map((row: any): SparePart => {
        const { plain: binLocation, meta } = unpackMeta(row.bin_location);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || undefined,
          sku: row.part_number,
          oemReference: row.oem_reference || meta.oemReference || undefined,
          name: row.name,
          brand: row.brand || undefined,
          category: (row.category || 'Filtration') as SparePart['category'],
          stockQuantity: Number(row.stock_quantity || 0),
          minThreshold: Number(row.min_stock || 2),
          buyingPriceDzd: Number(row.cost_dzd || 0),
          sellingPriceDzd: Number(row.sell_price_dzd || 0),
          locationBin: binLocation || 'Rayon A-01',
          unit: (row.unit || meta.unit || 'piece') as SparePart['unit'],
          supplierId: row.supplier_id || meta.supplierId || undefined,
          supplierName: meta.supplierName || undefined,
          defaultWarrantyMonths: Number(row.default_warranty_months ?? meta.defaultWarrantyMonths ?? 6),
          compatibility: Array.isArray(row.compatibility)
            ? row.compatibility
            : Array.isArray(meta.compatibility)
            ? meta.compatibility
            : [],
          createdAt: row.created_at,
          version: typeof row.version === 'number' ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPart(part: SparePart, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: part.accountId || ctx.accountId,
      businessId: part.businessId || ctx.businessId,
      branchId: part.branchId || ctx.branchId,
      staffId: part.staffId || ctx.staffId,
    });
    const payload = {
      id: toValidUuid(part.id),
      ...trace,
      part_number: part.sku,
      oem_reference: part.oemReference || null,
      name: part.name,
      brand: part.brand || null,
      category: part.category,
      stock_quantity: Number(part.stockQuantity || 0),
      min_stock: Number(part.minThreshold || 2),
      cost_dzd: Number(part.buyingPriceDzd || 0),
      sell_price_dzd: Number(part.sellingPriceDzd || 0),
      unit: part.unit || 'piece',
      supplier_id: part.supplierId ? toValidUuid(part.supplierId) : null,
      compatibility: part.compatibility || [],
      default_warranty_months: Number(part.defaultWarrantyMonths ?? 6),
      bin_location: packMeta(part.locationBin, {
        supplierName: part.supplierName,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_parts', payload, {
      expectedVersion: part.version,
      entityType: 'SparePart',
      entityLabel: `${part.name} (${part.sku})`,
      localData: payload,
    });
    return res.success;
  },

  async deletePart(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('garage_parts', id, deletedByStaffId);
    return res.success;
  },

  async requisitionPart(workOrderId: string, partId: string, quantity: number): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('garage_requisition_part', {
      p_work_order_id: toValidUuid(workOrderId),
      p_part_id: toValidUuid(partId),
      p_quantity: Number(quantity),
    });
    return res.success;
  },

  // Suppliers & Real Purchasing (Fix 5.2)
  async fetchSuppliers(branchId: string, updatedAfter?: string | null): Promise<GarageSupplierRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_suppliers')
            .select('id, branch_id, name, phone, wilaya, specialty, nif, rc_number, email, payment_terms_days, balance_dzd, crm_party_id, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('name', { ascending: true })
            .range(from, to);
          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );
      return data.map((row: any): GarageSupplierRecord => ({
        id: row.id,
        branchId: row.branch_id,
        name: row.name,
        phone: row.phone || '',
        wilaya: row.wilaya || 'Alger',
        specialty: row.specialty || 'Pièces Détachées Multi-marques',
        nif: row.nif || undefined,
        rcNumber: row.rc_number || undefined,
        email: row.email || undefined,
        paymentTermsDays: Number(row.payment_terms_days ?? 30),
        balanceDzd: Number(row.balance_dzd || 0),
        crmPartyId: row.crm_party_id || undefined,
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertSupplier(supplier: GarageSupplierRecord, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: supplier.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(supplier.id),
      ...trace,
      name: supplier.name,
      phone: supplier.phone || null,
      wilaya: supplier.wilaya || null,
      specialty: supplier.specialty || null,
      nif: supplier.nif || null,
      rc_number: supplier.rcNumber || null,
      email: supplier.email || null,
      payment_terms_days: Number(supplier.paymentTermsDays ?? 30),
      balance_dzd: Number(supplier.balanceDzd || 0),
      crm_party_id: supplier.crmPartyId ? toValidUuid(supplier.crmPartyId) : null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_suppliers', payload, {
      expectedVersion: supplier.version,
      entityType: 'GarageSupplier',
      entityLabel: supplier.name,
      localData: payload,
    });
    return res.success;
  },

  async fetchPurchaseOrders(branchId: string, updatedAfter?: string | null): Promise<GaragePurchaseOrderRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_purchase_orders')
            .select('id, branch_id, po_number, supplier_id, supplier_name, items, total_dzd, status, delivery_note_number, ordered_at, received_at, received_by_name, warranty_months, warranty_expiry_date, lines_received, notes, journal_entry_id, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to);
          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );
      return data.map((row: any): GaragePurchaseOrderRecord => ({
        id: row.id,
        branchId: row.branch_id,
        poNumber: row.po_number,
        supplierId: row.supplier_id || '',
        supplierName: row.supplier_name,
        status: row.status || 'Ordered',
        items: Array.isArray(row.items) ? row.items : [],
        totalDzd: Number(row.total_dzd || 0),
        deliveryNoteNumber: row.delivery_note_number || undefined,
        orderedAt: row.ordered_at || undefined,
        receivedAt: row.received_at || undefined,
        receivedByName: row.received_by_name || undefined,
        warrantyMonths: Number(row.warranty_months ?? 6),
        warrantyExpiryDate: row.warranty_expiry_date || undefined,
        linesReceived: Array.isArray(row.lines_received) ? row.lines_received : undefined,
        notes: row.notes || undefined,
        journalEntryId: row.journal_entry_id || undefined,
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertPurchaseOrder(po: GaragePurchaseOrderRecord, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: po.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(po.id),
      ...trace,
      po_number: po.poNumber,
      supplier_id: po.supplierId ? toValidUuid(po.supplierId) : null,
      supplier_name: po.supplierName,
      items: po.items || [],
      total_dzd: Number(po.totalDzd || 0),
      status: po.status,
      delivery_note_number: po.deliveryNoteNumber || null,
      ordered_at: po.orderedAt || null,
      received_at: po.receivedAt || null,
      received_by_name: po.receivedByName || null,
      warranty_months: Number(po.warrantyMonths ?? 6),
      warranty_expiry_date: po.warrantyExpiryDate || null,
      lines_received: po.linesReceived || [],
      notes: po.notes || null,
      journal_entry_id: po.journalEntryId ? toValidUuid(po.journalEntryId) : null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_purchase_orders', payload, {
      expectedVersion: po.version,
      entityType: 'GaragePurchaseOrder',
      entityLabel: po.poNumber,
      localData: payload,
    });
    return res.success;
  },

  async receivePurchaseOrder(
    poId: string,
    deliveryNoteNumber: string,
    receivedByName: string,
    linesReceived?: GaragePurchaseOrderRecord['linesReceived']
  ): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('garage_receive_purchase_order', {
      p_po_id: toValidUuid(poId),
      p_delivery_note: deliveryNoteNumber,
      p_received_by: receivedByName,
      p_lines: linesReceived || null,
    });
    return res.success;
  },

  // Flat-Rate Labor Catalog
  async fetchFlatRateLabor(branchId: string): Promise<FlatRateLaborItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('garage_flat_rate_labor')
            .select('id, branch_id, code, label, category, standard_hours, hourly_rate_centimes, is_active, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('code', { ascending: true })
            .range(from, to),
        { throwOnError: true }
      );
      return data.map((row: any): FlatRateLaborItem => ({
        id: row.id,
        branchId: row.branch_id,
        code: row.code,
        label: row.label,
        category: row.category || 'Mécanique',
        standardHours: Number(row.standard_hours || 1),
        hourlyRateDzd: centimesToDzd(Number(row.hourly_rate_centimes || 250000)),
        isActive: Boolean(row.is_active ?? true),
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertFlatRateLabor(item: FlatRateLaborItem, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: item.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(item.id),
      ...trace,
      code: item.code,
      label: item.label,
      category: item.category,
      standard_hours: Number(item.standardHours || 1),
      hourly_rate_centimes: dzdToCentimes(item.hourlyRateDzd),
      is_active: item.isActive,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_flat_rate_labor', payload, {
      expectedVersion: item.version,
      entityType: 'FlatRateLaborItem',
      entityLabel: `${item.code} ${item.label}`,
      localData: payload,
    });
    return res.success;
  },

  // Technician Time Logs & Commissions
  async fetchTechTimeLogs(branchId: string): Promise<TechnicianTimeLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('garage_technician_time_logs')
            .select('id, branch_id, work_order_id, order_number, technician_staff_id, technician_name, task_label, started_at, ended_at, duration_minutes, labor_revenue_centimes, commission_rate_bps, commission_centimes, status, notes, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('started_at', { ascending: false })
            .range(from, to),
        { throwOnError: true }
      );
      return data.map((row: any): TechnicianTimeLog => ({
        id: row.id,
        branchId: row.branch_id,
        workOrderId: row.work_order_id,
        orderNumber: row.order_number,
        technicianStaffId: row.technician_staff_id || undefined,
        technicianName: row.technician_name,
        taskLabel: row.task_label,
        startedAt: row.started_at,
        endedAt: row.ended_at || undefined,
        durationMinutes: Number(row.duration_minutes || 0),
        laborRevenueDzd: centimesToDzd(Number(row.labor_revenue_centimes || 0)),
        commissionRateBps: Number(row.commission_rate_bps ?? 1500),
        commissionDzd: centimesToDzd(Number(row.commission_centimes || 0)),
        status: row.status || 'completed',
        notes: row.notes || undefined,
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertTechTimeLog(log: TechnicianTimeLog, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: log.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      work_order_id: toValidUuid(log.workOrderId),
      order_number: log.orderNumber,
      technician_staff_id: log.technicianStaffId ? toValidUuid(log.technicianStaffId) : null,
      technician_name: log.technicianName,
      task_label: log.taskLabel,
      started_at: log.startedAt,
      ended_at: log.endedAt || null,
      duration_minutes: Number(log.durationMinutes || 0),
      labor_revenue_centimes: dzdToCentimes(log.laborRevenueDzd),
      commission_rate_bps: Number(log.commissionRateBps || 1500),
      commission_centimes: dzdToCentimes(log.commissionDzd),
      status: log.status,
      notes: log.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_technician_time_logs', payload, {
      expectedVersion: log.version,
      entityType: 'TechnicianTimeLog',
      entityLabel: `${log.technicianName} (${log.orderNumber})`,
      localData: payload,
    });
    return res.success;
  },

  async fetchTechCommissions(branchId: string): Promise<GarageTechCommission[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('garage_tech_commissions')
            .select('id, account_id, business_id, branch_id, technician_staff_id, technician_name, work_order_id, order_number, period_month, labor_base_centimes, commission_rate_bps, commission_centimes, status, payroll_run_id, version, created_at, updated_at')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to),
        { throwOnError: true }
      );
      return data.map((row: any): GarageTechCommission => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        technicianStaffId: row.technician_staff_id,
        technicianName: row.technician_name,
        workOrderId: row.work_order_id || undefined,
        orderNumber: row.order_number,
        periodMonth: row.period_month,
        laborBaseCentimes: Number(row.labor_base_centimes || 0),
        commissionRateBps: Number(row.commission_rate_bps || 1500),
        commissionCentimes: Number(row.commission_centimes || 0),
        commissionAmountDzd: centimesToDzd(Number(row.commission_centimes || 0)),
        status: row.status || 'pending',
        payrollRunId: row.payroll_run_id || undefined,
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertTechCommission(comm: GarageTechCommission): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: comm.accountId,
      businessId: comm.businessId,
      branchId: comm.branchId,
      staffId: comm.technicianStaffId,
    });
    const payload = {
      id: toValidUuid(comm.id),
      ...trace,
      technician_staff_id: toValidUuid(comm.technicianStaffId),
      technician_name: comm.technicianName,
      work_order_id: comm.workOrderId ? toValidUuid(comm.workOrderId) : null,
      order_number: comm.orderNumber,
      period_month: comm.periodMonth,
      labor_base_centimes: Number(comm.laborBaseCentimes || 0),
      commission_rate_bps: Number(comm.commissionRateBps || 1500),
      commission_centimes: Number(comm.commissionCentimes || 0),
      status: comm.status,
      payroll_run_id: comm.payrollRunId ? toValidUuid(comm.payrollRunId) : null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_tech_commissions', payload, {
      expectedVersion: comm.version,
      entityType: 'GarageTechCommission',
      entityLabel: `${comm.technicianName} (${comm.orderNumber})`,
      localData: payload,
    });
    return res.success;
  },

  // Specialties: Insurance Claims, Inspection Center PVs, Detailing Packages, Tire Storage
  async fetchInsuranceClaims(branchId: string): Promise<BodyShopInsuranceClaim[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('garage_insurance_claims')
            .select('id, branch_id, claim_number, work_order_id, insurer_name, policy_number, expert_name, accident_date, claimed_centimes, deductible_centimes, approved_centimes, status, expert_pv_ref, notes, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to),
        { throwOnError: true }
      );
      return data.map((row: any): BodyShopInsuranceClaim => {
        const claimed = Number(row.claimed_centimes || 0);
        const approved = Number(row.approved_centimes || 0);
        const deductible = Number(row.deductible_centimes || 0);
        const insurerCentimes = Math.max(0, approved - deductible);
        return {
          id: row.id,
          branchId: row.branch_id,
          claimNumber: row.claim_number,
          workOrderId: row.work_order_id,
          orderNumber: '',
          insurerName: row.insurer_name,
          policyNumber: row.policy_number || undefined,
          expertName: row.expert_name || undefined,
          accidentDate: row.accident_date || undefined,
          claimedDzd: centimesToDzd(claimed),
          deductibleDzd: centimesToDzd(deductible),
          approvedDzd: centimesToDzd(approved),
          insurerShareDzd: centimesToDzd(insurerCentimes),
          clientShareDzd: centimesToDzd(Math.max(0, claimed - insurerCentimes)),
          status: row.status || 'declared',
          expertPvRef: row.expert_pv_ref || undefined,
          notes: row.notes || undefined,
          version: typeof row.version === 'number' ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertInsuranceClaim(claim: BodyShopInsuranceClaim, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: claim.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(claim.id),
      ...trace,
      claim_number: claim.claimNumber,
      work_order_id: toValidUuid(claim.workOrderId),
      insurer_name: claim.insurerName,
      policy_number: claim.policyNumber || null,
      expert_name: claim.expertName || null,
      accident_date: claim.accidentDate || null,
      claimed_centimes: dzdToCentimes(claim.claimedDzd),
      deductible_centimes: dzdToCentimes(claim.deductibleDzd),
      approved_centimes: dzdToCentimes(claim.approvedDzd),
      status: claim.status,
      expert_pv_ref: claim.expertPvRef || null,
      notes: claim.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_insurance_claims', payload, {
      expectedVersion: claim.version,
      entityType: 'BodyShopInsuranceClaim',
      entityLabel: claim.claimNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchInspectionPvs(branchId: string): Promise<InspectionCenterPv[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('garage_inspection_pvs')
            .select('id, branch_id, pv_number, vehicle_id, work_order_id, plate_number, odometer_km, inspector_name, inspection_date, valid_until, verdict, checklist, defects_count, major_defects_count, notes, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('inspection_date', { ascending: false })
            .range(from, to),
        { throwOnError: true }
      );
      return data.map((row: any): InspectionCenterPv => ({
        id: row.id,
        branchId: row.branch_id,
        pvNumber: row.pv_number,
        vehicleId: row.vehicle_id || undefined,
        workOrderId: row.work_order_id || undefined,
        plateNumber: row.plate_number,
        odometerKm: Number(row.odometer_km || 0),
        inspectorName: row.inspector_name,
        inspectionDate: row.inspection_date,
        validUntil: row.valid_until || row.inspection_date,
        verdict: row.verdict || 'favorable',
        checklist: Array.isArray(row.checklist) ? row.checklist : [],
        defectsCount: Number(row.defects_count || 0),
        majorDefectsCount: Number(row.major_defects_count || 0),
        notes: row.notes || undefined,
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertInspectionPv(pv: InspectionCenterPv, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: pv.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(pv.id),
      ...trace,
      pv_number: pv.pvNumber,
      vehicle_id: pv.vehicleId ? toValidUuid(pv.vehicleId) : null,
      work_order_id: pv.workOrderId ? toValidUuid(pv.workOrderId) : null,
      plate_number: pv.plateNumber,
      odometer_km: Number(pv.odometerKm || 0),
      inspector_name: pv.inspectorName,
      inspection_date: pv.inspectionDate.slice(0, 10),
      valid_until: pv.validUntil ? pv.validUntil.slice(0, 10) : null,
      verdict: pv.verdict,
      checklist: pv.checklist || [],
      defects_count: Number(pv.defectsCount || 0),
      major_defects_count: Number(pv.majorDefectsCount || 0),
      notes: pv.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_inspection_pvs', payload, {
      expectedVersion: pv.version,
      entityType: 'InspectionCenterPv',
      entityLabel: pv.pvNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchDetailingPackages(branchId: string): Promise<DetailingPackage[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('garage_detailing_packages')
            .select('id, branch_id, code, name, tier, duration_minutes, price_centimes, included_steps, is_active, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('price_centimes', { ascending: true })
            .range(from, to),
        { throwOnError: true }
      );
      return data.map((row: any): DetailingPackage => ({
        id: row.id,
        branchId: row.branch_id,
        code: row.code,
        name: row.name,
        tier: row.tier || 'standard',
        durationMinutes: Number(row.duration_minutes || 120),
        priceDzd: centimesToDzd(Number(row.price_centimes || 800000)),
        includedSteps: Array.isArray(row.included_steps) ? row.included_steps : [],
        isActive: Boolean(row.is_active ?? true),
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertDetailingPackage(pkg: DetailingPackage, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: pkg.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(pkg.id),
      ...trace,
      code: pkg.code,
      name: pkg.name,
      tier: pkg.tier,
      duration_minutes: Number(pkg.durationMinutes || 120),
      price_centimes: dzdToCentimes(pkg.priceDzd),
      included_steps: pkg.includedSteps || [],
      is_active: pkg.isActive,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_detailing_packages', payload, {
      expectedVersion: pkg.version,
      entityType: 'DetailingPackage',
      entityLabel: pkg.name,
      localData: payload,
    });
    return res.success;
  },

  async fetchTireStorage(branchId: string): Promise<TireStorageEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('garage_tire_storage')
            .select('id, branch_id, storage_tag, vehicle_id, plate_number, owner_name, season, tire_size, brand, quantity, tread_depth_mm, rack_location, stored_at, due_swap_date, status, notes, version')
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('stored_at', { ascending: false })
            .range(from, to),
        { throwOnError: true }
      );
      return data.map((row: any): TireStorageEntry => ({
        id: row.id,
        branchId: row.branch_id,
        storageTag: row.storage_tag,
        vehicleId: row.vehicle_id || undefined,
        plateNumber: row.plate_number,
        ownerName: row.owner_name,
        season: row.season || 'winter',
        tireSize: row.tire_size,
        brand: row.brand || undefined,
        quantity: Number(row.quantity || 4),
        treadDepthMm: Number(row.tread_depth_mm ?? 6.0),
        rackLocation: row.rack_location || 'Rack A-01',
        storedAt: row.stored_at,
        dueSwapDate: row.due_swap_date || undefined,
        status: row.status || 'stored',
        notes: row.notes || undefined,
        version: typeof row.version === 'number' ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertTireStorage(entry: TireStorageEntry, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: entry.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      storage_tag: entry.storageTag,
      vehicle_id: entry.vehicleId ? toValidUuid(entry.vehicleId) : null,
      plate_number: entry.plateNumber,
      owner_name: entry.ownerName,
      season: entry.season,
      tire_size: entry.tireSize,
      brand: entry.brand || null,
      quantity: Number(entry.quantity || 4),
      tread_depth_mm: Number(entry.treadDepthMm ?? 6.0),
      rack_location: entry.rackLocation,
      stored_at: entry.storedAt.slice(0, 10),
      due_swap_date: entry.dueSwapDate ? entry.dueSwapDate.slice(0, 10) : null,
      status: entry.status,
      notes: entry.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_tire_storage', payload, {
      expectedVersion: entry.version,
      entityType: 'TireStorageEntry',
      entityLabel: entry.storageTag,
      localData: payload,
    });
    return res.success;
  },

  async fetchFleetAccounts(branchId: string, updatedAfter?: string | null): Promise<CorporateFleetAccount[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_fleet_contracts')
            .select(
              'id, account_id, business_id, branch_id, staff_id, company_name, contact_name, phone, discount_percent, vehicles_count, status, version'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('company_name', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );

      return data.map((row: any): CorporateFleetAccount => {
        const { plain: contactPerson, meta } = unpackMeta(row.contact_name);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          companyName: row.company_name,
          tradeName: meta.tradeName || row.company_name,
          contactPerson: contactPerson || '',
          phone: row.phone || '',
          email: meta.email || '',
          nif: meta.nif || '',
          nis: meta.nis || '',
          rcNumber: meta.rcNumber || '',
          articleImposition: meta.articleImposition || '',
          creditLimitDzd: Number(meta.creditLimitDzd ?? 0),
          currentOutstandingDzd: Number(meta.currentOutstandingDzd ?? 0),
          paymentTermsDays: Number(meta.paymentTermsDays ?? 30),
          negotiatedHourlyRateDzd: Number(meta.negotiatedHourlyRateDzd ?? 2000),
          partsDiscountPercent: Number(row.discount_percent || 0),
          activeVehicleCount: Number(row.vehicles_count || 1),
          contractActive: row.status === 'Active',
          version: typeof row.version === 'number' ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertFleetAccount(fleet: CorporateFleetAccount): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: fleet.accountId,
      businessId: fleet.businessId,
      branchId: fleet.branchId,
      staffId: fleet.staffId,
    });
    const payload = {
      id: toValidUuid(fleet.id),
      ...trace,
      company_name: fleet.companyName,
      contact_name: packMeta(fleet.contactPerson, {
        tradeName: fleet.tradeName,
        email: fleet.email,
        nif: fleet.nif,
        nis: fleet.nis,
        rcNumber: fleet.rcNumber,
        articleImposition: fleet.articleImposition,
        creditLimitDzd: fleet.creditLimitDzd,
        currentOutstandingDzd: fleet.currentOutstandingDzd,
        paymentTermsDays: fleet.paymentTermsDays,
        negotiatedHourlyRateDzd: fleet.negotiatedHourlyRateDzd,
      }),
      phone: fleet.phone || null,
      vehicles_count: Number(fleet.activeVehicleCount || 1),
      discount_percent: Number(fleet.partsDiscountPercent || 0),
      monthly_retainer_dzd: Number(fleet.creditLimitDzd || 0),
      status: fleet.contractActive ? 'Active' : 'Inactive',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_fleet_contracts', payload, {
      expectedVersion: fleet.version,
      entityType: 'CorporateFleetAccount',
      entityLabel: fleet.companyName,
      localData: payload,
    });
    return res.success;
  },

  async fetchInvoices(branchId: string, updatedAfter?: string | null): Promise<GarageInvoice[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('garage_invoices')
            .select(
              'id, account_id, business_id, branch_id, staff_id, invoice_number, work_order_id, plate_number, client_name, payment_method, total_ht_dzd, tva_dzd, total_ttc_dzd, created_at, status, version'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );

      return data.map((row: any): GarageInvoice => {
        const { plain: clientName, meta } = unpackMeta(row.client_name);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          invoiceNumber: row.invoice_number,
          orderId: row.work_order_id || meta.orderId || '',
          orderNumber: meta.orderNumber || '',
          vehiclePlate: row.plate_number || '',
          vehicleModel: meta.vehicleModel || '',
          clientId: meta.clientId || '',
          clientName,
          clientPhone: meta.clientPhone || '',
          clientType: meta.clientType || 'individual',
          clientNif: meta.clientNif,
          clientNis: meta.clientNis,
          clientRc: meta.clientRc,
          clientAi: meta.clientAi,
          billingType: meta.billingType || 'bon_caisse',
          paymentMethod: (row.payment_method || 'especes') as GarageInvoice['paymentMethod'],
          laborTotalHt: Number(meta.laborTotalHt ?? 0),
          partsTotalHt: Number(meta.partsTotalHt ?? 0),
          discountHt: Number(meta.discountHt ?? 0),
          subtotalHt: Number(row.total_ht_dzd || 0),
          tvaRate: Number(meta.tvaRate ?? 19),
          tvaAmount: Number(row.tva_dzd || 0),
          totalTtc: Number(row.total_ttc_dzd || 0),
          timbreFiscal: Number(meta.timbreFiscal ?? 0),
          netToPayDzd: Number(meta.netToPayDzd ?? row.total_ttc_dzd ?? 0),
          issuedAt: meta.issuedAt || row.created_at,
          isPaid: row.status === 'Paid',
          version: typeof row.version === 'number' ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertInvoice(inv: GarageInvoice): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: inv.accountId,
      businessId: inv.businessId,
      branchId: inv.branchId,
      staffId: inv.staffId,
    });
    const payload = {
      id: toValidUuid(inv.id),
      ...trace,
      invoice_number: inv.invoiceNumber,
      work_order_id: inv.orderId ? toValidUuid(inv.orderId) : null,
      client_name: packMeta(inv.clientName, {
        orderId: inv.orderId,
        orderNumber: inv.orderNumber,
        vehicleModel: inv.vehicleModel,
        clientId: inv.clientId,
        clientPhone: inv.clientPhone,
        clientType: inv.clientType,
        clientNif: inv.clientNif,
        clientNis: inv.clientNis,
        clientRc: inv.clientRc,
        clientAi: inv.clientAi,
        billingType: inv.billingType,
        laborTotalHt: inv.laborTotalHt,
        partsTotalHt: inv.partsTotalHt,
        discountHt: inv.discountHt,
        tvaRate: inv.tvaRate,
        timbreFiscal: inv.timbreFiscal,
        netToPayDzd: inv.netToPayDzd,
        issuedAt: inv.issuedAt,
      }),
      plate_number: inv.vehiclePlate || null,
      total_ht_dzd: Number(inv.subtotalHt || 0),
      tva_dzd: Number(inv.tvaAmount || 0),
      total_ttc_dzd: Number(inv.totalTtc || 0),
      paid_amount_dzd: inv.isPaid ? Number(inv.netToPayDzd || inv.totalTtc || 0) : 0,
      payment_method: inv.paymentMethod || 'especes',
      status: inv.isPaid ? 'Paid' : 'Unpaid',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_invoices', payload, {
      expectedVersion: inv.version,
      entityType: 'GarageInvoice',
      entityLabel: inv.invoiceNumber,
      localData: payload,
    });
    return res.success;
  },

  async deleteFleetAccount(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('garage_fleet_contracts', id, deletedByStaffId);
    return res.success;
  },

  async deleteInvoice(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('garage_invoices', id, deletedByStaffId);
    return res.success;
  },
};

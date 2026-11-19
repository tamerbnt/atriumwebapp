import { getSupabaseClient, toValidUuid } from '../client';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
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
      let query = (client as any)
        .from('garage_bays')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('bay_code', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any, idx: number): WorkshopBay => {
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
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBay(bay: WorkshopBay, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: bay.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_bays', {
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
      let query = (client as any)
        .from('garage_vehicles')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): VehicleAsset => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || undefined,
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
          lastServiceKm: meta.lastServiceKm,
          lastServiceDate: meta.lastServiceDate,
          nextServiceKm: meta.nextServiceKm,
          dailyAvgKm: meta.dailyAvgKm,
          carteGriseNumber: meta.carteGriseNumber,
          notes: plain || undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertVehicle(vehicle: VehicleAsset, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: vehicle.accountId || ctx.accountId || 'acc_01',
      businessId: vehicle.businessId || ctx.businessId,
      branchId: vehicle.branchId || ctx.branchId,
      staffId: vehicle.staffId || ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_vehicles', {
      id: toValidUuid(vehicle.id),
      ...trace,
      plate_number: vehicle.plateNumber,
      vin: vehicle.vin || null,
      make: vehicle.brand,
      model: vehicle.model,
      model_year: vehicle.year || null,
      fuel_type: vehicle.fuelType || 'Essence',
      mileage_km: Number(vehicle.mileageKm || 0),
      owner_name: vehicle.ownerName,
      owner_phone: vehicle.ownerPhone || null,
      fleet_name: vehicle.fleetName || null,
      notes: packMeta(vehicle.notes, {
        ownerEmail: vehicle.ownerEmail,
        isFleet: vehicle.isFleet,
        fleetId: vehicle.fleetId,
        lastServiceKm: vehicle.lastServiceKm,
        lastServiceDate: vehicle.lastServiceDate,
        nextServiceKm: vehicle.nextServiceKm,
        dailyAvgKm: vehicle.dailyAvgKm,
        carteGriseNumber: vehicle.carteGriseNumber,
      }),
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
      let query = (client as any)
        .from('garage_work_orders')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): RepairOrder => {
        const { plain, meta } = unpackMeta(row.diagnostic_summary);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || undefined,
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
          technicianName: row.mechanic_name || '',
          assignedBayId: row.bay_id || meta.assignedBayId || undefined,
          bayName: meta.bayName,
          fuelLevel: meta.fuelLevel || '50',
          inOdometerKm: Number(row.intake_mileage_km || 0),
          isVehicleDirty: meta.isVehicleDirty,
          damageMarkers: Array.isArray(meta.damageMarkers) ? meta.damageMarkers : [],
          clientSignatureSvg: meta.clientSignatureSvg,
          technicianChecklist: Array.isArray(meta.technicianChecklist) ? meta.technicianChecklist : [],
          billingType: meta.billingType || 'bon_caisse',
          isPaid: Boolean(meta.isPaid),
          invoiceId: meta.invoiceId,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertWorkOrder(order: RepairOrder, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: order.accountId || ctx.accountId || 'acc_01',
      businessId: order.businessId || ctx.businessId,
      branchId: order.branchId || ctx.branchId,
      staffId: order.staffId || ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_work_orders', {
      id: toValidUuid(order.id),
      ...trace,
      order_number: order.orderNumber,
      plate_number: order.vehiclePlate,
      vehicle_label: order.vehicleModel,
      client_name: order.clientName,
      client_phone: order.clientPhone || null,
      bay_id: order.assignedBayId ? toValidUuid(order.assignedBayId) : null,
      mechanic_name: order.technicianName || null,
      intake_mileage_km: Number(order.inOdometerKm || 0),
      status: mapOrderStatusToDb(order.status),
      labor_total_dzd: Number(order.laborCostDzd || 0),
      parts_total_dzd: Number(order.partsCostDzd || 0),
      total_ttc_dzd: Number(order.finalCostDzd || order.estimatedCostDzd || 0),
      promised_at: order.promisedDate ? `${order.promisedDate}T18:00:00Z` : null,
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
    });
    return res.success;
  },

  async deleteWorkOrder(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('garage_work_orders', id, deletedByStaffId);
    return res.success;
  },

  async fetchParts(branchId: string, updatedAfter?: string | null): Promise<SparePart[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('garage_parts')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): SparePart => {
        const { plain: binLocation, meta } = unpackMeta(row.bin_location);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || undefined,
          sku: row.part_number,
          oemReference: meta.oemReference || undefined,
          name: row.name,
          brand: row.brand || undefined,
          category: (row.category || 'Filtration') as SparePart['category'],
          stockQuantity: Number(row.stock_quantity || 0),
          minThreshold: Number(row.min_stock || 2),
          buyingPriceDzd: Number(row.cost_dzd || 0),
          sellingPriceDzd: Number(row.sell_price_dzd || 0),
          locationBin: binLocation || 'Rayon A-01',
          unit: meta.unit || 'piece',
          supplierName: meta.supplierName || undefined,
          compatibility: Array.isArray(meta.compatibility) ? meta.compatibility : [],
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPart(part: SparePart, ctx: GarageBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: part.accountId || ctx.accountId || 'acc_01',
      businessId: part.businessId || ctx.businessId,
      branchId: part.branchId || ctx.branchId,
      staffId: part.staffId || ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_parts', {
      id: toValidUuid(part.id),
      ...trace,
      part_number: part.sku,
      name: part.name,
      brand: part.brand || null,
      category: part.category,
      stock_quantity: Number(part.stockQuantity || 0),
      min_stock: Number(part.minThreshold || 2),
      cost_dzd: Number(part.buyingPriceDzd || 0),
      sell_price_dzd: Number(part.sellingPriceDzd || 0),
      bin_location: packMeta(part.locationBin, {
        oemReference: part.oemReference,
        unit: part.unit,
        supplierName: part.supplierName,
        compatibility: part.compatibility || [],
      }),
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

  async fetchFleetAccounts(branchId: string, updatedAfter?: string | null): Promise<CorporateFleetAccount[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('garage_fleet_contracts')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('company_name', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): CorporateFleetAccount => {
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
        };
      });
    } catch {
      return [];
    }
  },

  async upsertFleetAccount(fleet: CorporateFleetAccount): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: fleet.accountId || 'acc_01',
      businessId: fleet.businessId,
      branchId: fleet.branchId,
      staffId: fleet.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_fleet_contracts', {
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
    });
    return res.success;
  },

  async fetchInvoices(branchId: string, updatedAfter?: string | null): Promise<GarageInvoice[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('garage_invoices')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): GarageInvoice => {
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
        };
      });
    } catch {
      return [];
    }
  },

  async upsertInvoice(inv: GarageInvoice): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: inv.accountId || 'acc_01',
      businessId: inv.businessId,
      branchId: inv.branchId,
      staffId: inv.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('garage_invoices', {
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
    });
    return res.success;
  },
};

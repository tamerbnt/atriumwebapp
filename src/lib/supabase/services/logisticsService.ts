import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  LogisticsShipment,
  TransportBag,
  LogisticsManifest,
  CourierCashDischarge,
  MerchantRemittanceBatch,
} from '../../../types/index';
import type { TariffRule, WilayaZone } from '../../../utils/logisticsRules';

export interface LogisticsBranchContext {
  accountId?: string;
  businessId?: string;
  branchId: string;
  staffId?: string;
}

type DbParcelStatus =
  | 'Created'
  | 'PickedUp'
  | 'InHub'
  | 'InTransit'
  | 'OutForDelivery'
  | 'Delivered'
  | 'Returned'
  | 'Cancelled';

type DbBagStatus = 'Open' | 'Sealed' | 'InTransit' | 'Discharged';

function toDbParcelStatus(s: LogisticsShipment['status']): DbParcelStatus {
  switch (s) {
    case 'HubIntake':
      return 'PickedUp';
    case 'ReceivedAtHub':
    case 'Sorted':
      return 'InHub';
    case 'OutForDelivery':
    case 'Postponed':
      return 'OutForDelivery';
    case 'Delivered':
      return 'Delivered';
    case 'Returned':
      return 'Returned';
    case 'Cancelled':
      return 'Cancelled';
    case 'Created':
    default:
      return 'Created';
  }
}

function toDbBagStatus(s: TransportBag['status']): DbBagStatus {
  if (s === 'Sealed') return 'Sealed';
  if (s === 'InTransit') return 'InTransit';
  if (s === 'Received' || s === 'Discrepancy') return 'Discharged';
  return 'Open';
}

const META_PREFIX = '__atrium_log__:';

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

export const logisticsService = {
  async fetchShipments(branchId: string, updatedAfter?: string | null): Promise<LogisticsShipment[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('logistics_parcels')
          .select(
            'id, account_id, business_id, branch_id, staff_id, tracking_code, merchant_name, recipient_name, recipient_phone, wilaya_name, commune, cod_amount_dzd, delivery_fee_dzd, weight_kg, status, delivery_mode, bag_id, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): LogisticsShipment => {
        const { plain: destinationAddress, meta } = unpackMeta(row.commune);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          trackingCode: row.tracking_code,
          merchantName: row.merchant_name,
          recipientName: row.recipient_name,
          recipientPhone: row.recipient_phone,
          destinationWilaya: row.wilaya_name,
          destinationAddress: destinationAddress || '',
          codAmountDzd: Number(row.cod_amount_dzd || 0),
          shippingFeeDzd: Number(row.delivery_fee_dzd || 0),
          weightKg: Number(row.weight_kg || 1),
          status: (meta.uiStatus || row.status || 'Created') as LogisticsShipment['status'],
          deliveryMode: row.delivery_mode === 'StopDesk' ? 'StopDesk' : 'HomeDelivery',
          dimensionsCm: meta.dimensionsCm,
          bagId: row.bag_id || meta.bagId || undefined,
          stopDeskShelfCode: meta.stopDeskShelfCode,
          pickupOtpCode: meta.pickupOtpCode,
          recipientIdNumber: meta.recipientIdNumber,
          returnReasonCode: meta.returnReasonCode,
          attemptCount: meta.attemptCount,
          stampDutyDzd: meta.stampDutyDzd,
          assignedDriverName: meta.assignedDriverName,
          podSignatureUrl: meta.podSignatureUrl,
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertShipment(ship: LogisticsShipment): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ship.accountId,
      businessId: ship.businessId,
      branchId: ship.branchId,
      staffId: ship.staffId,
    });
    const wilayaCodeMatch = String(ship.destinationWilaya || '').match(/^(\d{1,2})/);
    const payload = {
      id: toValidUuid(ship.id),
      ...trace,
      tracking_code: ship.trackingCode,
      merchant_id: null,
      merchant_name: ship.merchantName,
      recipient_name: ship.recipientName,
      recipient_phone: ship.recipientPhone,
      wilaya_code: wilayaCodeMatch ? wilayaCodeMatch[1].padStart(2, '0') : '16',
      wilaya_name: ship.destinationWilaya,
      commune: packMeta(ship.destinationAddress, {
        uiStatus: ship.status,
        dimensionsCm: ship.dimensionsCm,
        bagId: ship.bagId,
        stopDeskShelfCode: ship.stopDeskShelfCode,
        pickupOtpCode: ship.pickupOtpCode,
        recipientIdNumber: ship.recipientIdNumber,
        returnReasonCode: ship.returnReasonCode,
        attemptCount: ship.attemptCount,
        stampDutyDzd: ship.stampDutyDzd,
        assignedDriverName: ship.assignedDriverName,
        podSignatureUrl: ship.podSignatureUrl,
      }),
      delivery_mode: ship.deliveryMode === 'StopDesk' ? 'StopDesk' : 'Domicile',
      weight_kg: Number(ship.weightKg || 1),
      is_fragile: false,
      cod_amount_dzd: Number(ship.codAmountDzd || 0),
      delivery_fee_dzd: Number(ship.shippingFeeDzd || 0),
      bag_id: ship.bagId ? toValidUuid(ship.bagId) : null,
      driver_id: null,
      status: toDbParcelStatus(ship.status),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_parcels', payload, {
      expectedVersion: ship.version,
      entityType: 'Shipment',
      entityLabel: ship.trackingCode,
      localData: payload,
    });
    return res.success;
  },

  async fetchBags(branchId: string, updatedAfter?: string | null): Promise<TransportBag[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('logistics_courier_bags')
          .select(
            'id, account_id, business_id, branch_id, staff_id, bag_code, origin_hub, destination_wilaya, seal_number, driver_name, parcel_count, status, sealed_at, discharged_at, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): TransportBag => {
        const { meta } = unpackMeta(row.driver_name);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          bagCode: row.bag_code,
          originHubWilaya: Number(meta.originHubWilaya ?? row.origin_hub ?? 16),
          destinationHubWilaya: Number(meta.destinationHubWilaya ?? row.destination_wilaya ?? 31),
          securitySealNumber: row.seal_number || '',
          shipmentIds: Array.isArray(meta.shipmentIds) ? meta.shipmentIds : [],
          totalItemCount: Number(row.parcel_count || 0),
          totalWeightKg: Number(meta.totalWeightKg ?? 0),
          status: (meta.uiStatus || row.status || 'Open') as TransportBag['status'],
          sealedAt: row.sealed_at || undefined,
          receivedAt: row.discharged_at || undefined,
          version: row.version != null ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBag(bag: TransportBag): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: bag.accountId,
      businessId: bag.businessId,
      branchId: bag.branchId,
      staffId: bag.staffId,
    });
    const payload = {
      id: toValidUuid(bag.id),
      ...trace,
      bag_code: bag.bagCode,
      seal_number: bag.securitySealNumber || null,
      origin_hub: String(bag.originHubWilaya),
      destination_wilaya: String(bag.destinationHubWilaya),
      driver_name: packMeta(undefined, {
        originHubWilaya: bag.originHubWilaya,
        destinationHubWilaya: bag.destinationHubWilaya,
        shipmentIds: bag.shipmentIds || [],
        totalWeightKg: bag.totalWeightKg,
        uiStatus: bag.status,
      }),
      parcel_count: Number(bag.totalItemCount ?? bag.shipmentIds?.length ?? 0),
      status: toDbBagStatus(bag.status),
      sealed_at: bag.sealedAt || null,
      discharged_at: bag.receivedAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_courier_bags', payload, {
      expectedVersion: bag.version,
      entityType: 'TransportBag',
      entityLabel: bag.bagCode,
      localData: payload,
    });
    return res.success;
  },

  async sealBag(bagId: string, sealNumber: string, shipmentIds: string[]): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('logistics_seal_bag', {
      p_bag_id: toValidUuid(bagId),
      p_seal_number: sealNumber,
      p_parcel_ids: (shipmentIds || []).map((id) => toValidUuid(id)),
    });
    return res.success;
  },

  async fetchManifests(branchId: string, updatedAfter?: string | null): Promise<LogisticsManifest[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('logistics_fleet')
          .select('id, vehicle_model, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows
        .map((row: any): LogisticsManifest | null => {
          const { meta } = unpackMeta(row.vehicle_model);
          if (!meta.manifest) return null;
          return {
            ...(meta.manifest as LogisticsManifest),
            version: row.version != null ? Number(row.version) : (meta.manifest as LogisticsManifest).version,
          };
        })
        .filter((m: LogisticsManifest | null): m is LogisticsManifest => Boolean(m));
    } catch {
      return [];
    }
  },

  async upsertManifest(manifest: LogisticsManifest): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: manifest.accountId,
      businessId: manifest.businessId,
      branchId: manifest.branchId,
      staffId: manifest.staffId,
    });
    const payload = {
      id: toValidUuid(manifest.id),
      ...trace,
      plate_number: manifest.vehiclePlate || manifest.manifestNumber,
      vehicle_model: packMeta(manifest.driverName, { manifest }),
      vehicle_type: manifest.zoneWilaya || 'Fourgon',
      capacity_kg: Number(manifest.totalGrossWeightKg || 1500),
      status: manifest.status === 'Dispatched' ? 'OnRoute' : 'Available',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_fleet', payload, {
      expectedVersion: manifest.version,
      entityType: 'LogisticsManifest',
      entityLabel: manifest.manifestNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchDischarges(branchId: string, updatedAfter?: string | null): Promise<CourierCashDischarge[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('logistics_discharges')
          .select('id, driver_name, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('discharged_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows
        .map((row: any): CourierCashDischarge | null => {
          const { meta } = unpackMeta(row.driver_name);
          if (!meta.discharge) return null;
          return {
            ...(meta.discharge as CourierCashDischarge),
            version: row.version != null ? Number(row.version) : (meta.discharge as CourierCashDischarge).version,
          };
        })
        .filter((d: CourierCashDischarge | null): d is CourierCashDischarge => Boolean(d));
    } catch {
      return [];
    }
  },

  async upsertDischarge(discharge: CourierCashDischarge): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: discharge.accountId,
      businessId: discharge.businessId,
      branchId: discharge.branchId,
      staffId: discharge.cashierStaffId,
    });
    const driverUuid = toValidUuid(discharge.courierStaffId || `drv_${discharge.branchId}`);
    await syncCoordinator.mutateOrQueueUpsert('logistics_drivers', {
      id: driverUuid,
      ...trace,
      full_name: `Livreur ${discharge.courierStaffId}`,
      phone: '0550000000',
      is_active: true,
    });
    const payload = {
      id: toValidUuid(discharge.id),
      ...trace,
      discharge_number: discharge.dischargeNumber,
      driver_id: driverUuid,
      driver_name: packMeta(discharge.courierStaffId, { discharge }),
      collected_cash_dzd: Number(discharge.actualCashTurnedInDzd || 0),
      delivered_count: Number(discharge.deliveredCount || 0),
      returned_count: Number(discharge.returnedCount || 0),
      discharged_at: discharge.timestamp || new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_discharges', payload, {
      expectedVersion: discharge.version,
      entityType: 'CourierCashDischarge',
      entityLabel: discharge.dischargeNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchRemittances(branchId: string, updatedAfter?: string | null): Promise<MerchantRemittanceBatch[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('logistics_remittances')
          .select(
            'id, account_id, business_id, branch_id, staff_id, remittance_number, merchant_name, gross_cod_dzd, fees_deducted_dzd, net_paid_dzd, payment_method, status, remitted_at, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('remitted_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map((row: any): MerchantRemittanceBatch => {
        const { plain: merchantName, meta } = unpackMeta(row.merchant_name);
        if (meta.batch) {
          return {
            ...(meta.batch as MerchantRemittanceBatch),
            version: row.version != null ? Number(row.version) : (meta.batch as MerchantRemittanceBatch).version,
          };
        }
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          batchNumber: row.remittance_number,
          merchantName,
          ccpAccount: meta.ccpAccount || '',
          ccpKey: Number(meta.ccpKey ?? 0),
          grossCodDzd: Number(row.gross_cod_dzd || 0),
          shippingFeesDzd: Number(row.fees_deducted_dzd || 0),
          returnFeesDzd: Number(meta.returnFeesDzd ?? 0),
          netPayoutDzd: Number(row.net_paid_dzd || 0),
          paymentChannel: (row.payment_method || 'AlgeriePoste_SFP01') as MerchantRemittanceBatch['paymentChannel'],
          status: (row.status || 'Draft') as MerchantRemittanceBatch['status'],
          executedAt: row.remitted_at || undefined,
          version: row.version != null ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertRemittance(batch: MerchantRemittanceBatch): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: batch.accountId,
      businessId: batch.businessId,
      branchId: batch.branchId,
      staffId: batch.staffId,
    });
    const merchantUuid = toValidUuid(`merchant_${batch.branchId}_${batch.merchantName}`);
    await syncCoordinator.mutateOrQueueUpsert('logistics_merchants', {
      id: merchantUuid,
      ...trace,
      store_name: batch.merchantName,
      phone: '0550000000',
      rib_ccp: `${batch.ccpAccount}${batch.ccpKey ? '-' + batch.ccpKey : ''}`,
    });
    const payload = {
      id: toValidUuid(batch.id),
      ...trace,
      remittance_number: batch.batchNumber,
      merchant_id: merchantUuid,
      merchant_name: packMeta(batch.merchantName, { batch }),
      gross_cod_dzd: Number(batch.grossCodDzd || 0),
      fees_deducted_dzd: Number((batch.shippingFeesDzd || 0) + (batch.returnFeesDzd || 0)),
      net_paid_dzd: Number(batch.netPayoutDzd || 0),
      parcel_ids: [],
      payment_method: batch.paymentChannel,
      status: batch.status,
      remitted_at: batch.executedAt || new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_remittances', payload, {
      expectedVersion: batch.version,
      entityType: 'MerchantRemittanceBatch',
      entityLabel: batch.batchNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchWilayaTariffs(branchId: string): Promise<Partial<Record<WilayaZone, TariffRule>>> {
    const client = getSupabaseClient();
    if (!client) return {};

    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('logistics_wilaya_tariffs')
          .select(
            'id, zone_id, base_weight_kg, home_base_price_dzd, stop_desk_base_price_dzd, overweight_per_kg_dzd, fragile_handling_surcharge_dzd'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('zone_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      );

      const map: Partial<Record<WilayaZone, TariffRule>> = {};
      rows.forEach((row: any) => {
        const zone = row.zone_id as WilayaZone;
        map[zone] = {
          zone,
          baseWeightKg: Number(row.base_weight_kg ?? 5),
          homeBasePriceDzd: Number(row.home_base_price_dzd ?? 600),
          stopDeskBasePriceDzd: Number(row.stop_desk_base_price_dzd ?? 400),
          overweightPerKgDzd: Number(row.overweight_per_kg_dzd ?? 50),
          fragileHandlingSurchargeDzd: Number(row.fragile_handling_surcharge_dzd ?? 150),
          insuranceRatePercent: 1.0,
        };
      });
      return map;
    } catch {
      return {};
    }
  },

  async upsertWilayaTariffs(
    rules: Record<WilayaZone, TariffRule>,
    ctx: LogisticsBranchContext
  ): Promise<boolean> {
    if (!ctx.accountId || !ctx.branchId) {
      return false;
    }
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const entries = Object.values(rules);
    if (entries.length === 0) return true;

    const pRules = entries.map((rule) => ({
      id: toValidUuid(`tariff_${ctx.branchId}_${rule.zone}`),
      account_id: trace.account_id,
      business_id: trace.business_id,
      staff_id: trace.staff_id,
      device_id: trace.device_id,
      zone_id: rule.zone,
      base_weight_kg: Number(rule.baseWeightKg || 5),
      home_base_price_dzd: Number(rule.homeBasePriceDzd || 600),
      stop_desk_base_price_dzd: Number(rule.stopDeskBasePriceDzd || 400),
      overweight_per_kg_dzd: Number(rule.overweightPerKgDzd || 50),
      fragile_handling_surcharge_dzd: Number(rule.fragileHandlingSurchargeDzd || 150),
    }));

    const res = await syncCoordinator.rpcOrQueue('logistics_upsert_wilaya_tariffs_batch', {
      p_branch_id: toValidUuid(ctx.branchId),
      p_rules: pRules,
    });
    return res.success;
  },

  async deleteShipment(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('logistics_parcels', id, deletedByStaffId);
    return res.success;
  },

  async deleteBag(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('logistics_courier_bags', id, deletedByStaffId);
    return res.success;
  },

  async deleteManifest(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('logistics_fleet', id, deletedByStaffId);
    return res.success;
  },

  async deleteDischarge(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('logistics_discharges', id, deletedByStaffId);
    return res.success;
  },

  async deleteRemittance(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('logistics_remittances', id, deletedByStaffId);
    return res.success;
  },
};

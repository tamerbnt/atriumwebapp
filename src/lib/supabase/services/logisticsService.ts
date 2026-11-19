import { getSupabaseClient, toValidUuid } from '../client';
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
      let query = (client as any)
        .from('logistics_parcels')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): LogisticsShipment => {
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
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertShipment(ship: LogisticsShipment): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ship.accountId || 'acc_01',
      businessId: ship.businessId,
      branchId: ship.branchId,
      staffId: ship.staffId,
    });
    const wilayaCodeMatch = String(ship.destinationWilaya || '').match(/^(\d{1,2})/);
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_parcels', {
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
    });
    return res.success;
  },

  async fetchBags(branchId: string, updatedAfter?: string | null): Promise<TransportBag[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('logistics_courier_bags')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): TransportBag => {
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
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBag(bag: TransportBag): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: bag.accountId || 'acc_01',
      businessId: bag.businessId,
      branchId: bag.branchId,
      staffId: bag.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_courier_bags', {
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
      let query = (client as any)
        .from('logistics_fleet')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): LogisticsManifest | null => {
          const { meta } = unpackMeta(row.vehicle_model);
          return meta.manifest ? (meta.manifest as LogisticsManifest) : null;
        })
        .filter((m: LogisticsManifest | null): m is LogisticsManifest => Boolean(m));
    } catch {
      return [];
    }
  },

  async upsertManifest(manifest: LogisticsManifest): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: manifest.accountId || 'acc_01',
      businessId: manifest.businessId,
      branchId: manifest.branchId,
      staffId: manifest.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_fleet', {
      id: toValidUuid(manifest.id),
      ...trace,
      plate_number: manifest.vehiclePlate || manifest.manifestNumber,
      vehicle_model: packMeta(manifest.driverName, { manifest }),
      vehicle_type: manifest.zoneWilaya || 'Fourgon',
      capacity_kg: Number(manifest.totalGrossWeightKg || 1500),
      status: manifest.status === 'Dispatched' ? 'OnRoute' : 'Available',
    });
    return res.success;
  },

  async fetchDischarges(branchId: string, updatedAfter?: string | null): Promise<CourierCashDischarge[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('logistics_discharges')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('discharged_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): CourierCashDischarge | null => {
          const { meta } = unpackMeta(row.driver_name);
          return meta.discharge ? (meta.discharge as CourierCashDischarge) : null;
        })
        .filter((d: CourierCashDischarge | null): d is CourierCashDischarge => Boolean(d));
    } catch {
      return [];
    }
  },

  async upsertDischarge(discharge: CourierCashDischarge): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: discharge.accountId || 'acc_01',
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
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_discharges', {
      id: toValidUuid(discharge.id),
      ...trace,
      discharge_number: discharge.dischargeNumber,
      driver_id: driverUuid,
      driver_name: packMeta(discharge.courierStaffId, { discharge }),
      collected_cash_dzd: Number(discharge.actualCashTurnedInDzd || 0),
      delivered_count: Number(discharge.deliveredCount || 0),
      returned_count: Number(discharge.returnedCount || 0),
      discharged_at: discharge.timestamp || new Date().toISOString(),
    });
    return res.success;
  },

  async fetchRemittances(branchId: string, updatedAfter?: string | null): Promise<MerchantRemittanceBatch[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('logistics_remittances')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('remitted_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): MerchantRemittanceBatch => {
        const { plain: merchantName, meta } = unpackMeta(row.merchant_name);
        if (meta.batch) return meta.batch as MerchantRemittanceBatch;
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
        };
      });
    } catch {
      return [];
    }
  },

  async upsertRemittance(batch: MerchantRemittanceBatch): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: batch.accountId || 'acc_01',
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
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_remittances', {
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
    });
    return res.success;
  },

  async fetchWilayaTariffs(branchId: string): Promise<Partial<Record<WilayaZone, TariffRule>>> {
    const client = getSupabaseClient();
    if (!client) return {};

    try {
      const { data, error } = await (client as any)
        .from('logistics_wilaya_tariffs')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null);

      if (error) return {};

      const map: Partial<Record<WilayaZone, TariffRule>> = {};
      (data || []).forEach((row: any) => {
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
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const entries = Object.values(rules);
    let allOk = true;
    for (const rule of entries) {
      const res = await syncCoordinator.mutateOrQueueUpsert(
        'logistics_wilaya_tariffs',
        {
          id: toValidUuid(`tariff_${ctx.branchId}_${rule.zone}`),
          ...trace,
          zone_id: rule.zone,
          base_weight_kg: Number(rule.baseWeightKg || 5),
          home_base_price_dzd: Number(rule.homeBasePriceDzd || 600),
          stop_desk_base_price_dzd: Number(rule.stopDeskBasePriceDzd || 400),
          overweight_per_kg_dzd: Number(rule.overweightPerKgDzd || 50),
          fragile_handling_surcharge_dzd: Number(rule.fragileHandlingSurchargeDzd || 150),
        },
        { onConflict: 'branch_id,zone_id' }
      );
      if (!res.success) allOk = false;
    }
    return allOk;
  },
};

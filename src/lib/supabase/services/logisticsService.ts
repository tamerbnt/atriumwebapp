import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  LogisticsShipment,
  TransportBag,
  LogisticsManifest,
  CourierCashDischarge,
  MerchantRemittanceBatch,
  LogisticsParcelEvent,
  LogisticsDeliveryPod,
  LogisticsDriverPayout,
  LogisticsVehicleLog,
  LogisticsMerchantFeeInvoice,
  LogisticsCarrierIntegration,
  LogisticsFreightWaybill,
  LogisticsMovingQuote,
  LogisticsColdChainLog,
  LogisticsCustomsDossier,
  LogisticsTowingDispatch,
} from '../../../types/index';
import type { TariffRule, WilayaZone } from '../../../utils/logisticsRules';
import { dzdToCentimes } from '../../../utils/money';

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
            'id, account_id, business_id, branch_id, staff_id, tracking_code, merchant_name, recipient_name, recipient_phone, wilaya_name, commune, cod_amount_dzd, delivery_fee_dzd, weight_kg, volumetric_weight_kg, status, delivery_mode, bag_id, pod_signature_url, pod_photo_path, pod_gps_lat, pod_gps_lng, pod_signed_at, pod_signed_by, otp_attempts, otp_locked_until, return_reason_code, attempt_count, assigned_driver_name, public_share_code, settled_at, version, created_at'
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
          volumetricWeightKg: row.volumetric_weight_kg != null ? Number(row.volumetric_weight_kg) : meta.volumetricWeightKg,
          status: (meta.uiStatus || row.status || 'Created') as LogisticsShipment['status'],
          deliveryMode: row.delivery_mode === 'StopDesk' ? 'StopDesk' : 'HomeDelivery',
          dimensionsCm: meta.dimensionsCm,
          bagId: row.bag_id || meta.bagId || undefined,
          stopDeskShelfCode: meta.stopDeskShelfCode,
          pickupOtpCode: meta.pickupOtpCode,
          recipientIdNumber: row.pod_signed_by || meta.recipientIdNumber,
          returnReasonCode: row.return_reason_code || meta.returnReasonCode,
          attemptCount: row.attempt_count != null ? Number(row.attempt_count) : meta.attemptCount,
          stampDutyDzd: meta.stampDutyDzd,
          assignedDriverName: row.assigned_driver_name || meta.assignedDriverName,
          podSignatureUrl: row.pod_signature_url || meta.podSignatureUrl,
          podPhotoPath: row.pod_photo_path || undefined,
          podGpsLat: row.pod_gps_lat != null ? Number(row.pod_gps_lat) : undefined,
          podGpsLng: row.pod_gps_lng != null ? Number(row.pod_gps_lng) : undefined,
          podSignedAt: row.pod_signed_at || undefined,
          podSignedBy: row.pod_signed_by || undefined,
          otpAttempts: row.otp_attempts != null ? Number(row.otp_attempts) : undefined,
          otpLockedUntil: row.otp_locked_until || undefined,
          publicShareCode: row.public_share_code || undefined,
          isSettled: Boolean(row.settled_at || meta.isSettled),
          settledAt: row.settled_at || undefined,
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
        volumetricWeightKg: ship.volumetricWeightKg,
        isSettled: ship.isSettled,
      }),
      delivery_mode: ship.deliveryMode === 'StopDesk' ? 'StopDesk' : 'Domicile',
      weight_kg: Number(ship.weightKg || 1),
      volumetric_weight_kg: ship.volumetricWeightKg != null ? Number(ship.volumetricWeightKg) : null,
      is_fragile: false,
      cod_amount_dzd: Number(ship.codAmountDzd || 0),
      delivery_fee_dzd: Number(ship.shippingFeeDzd || 0),
      bag_id: ship.bagId ? toValidUuid(ship.bagId) : null,
      driver_id: null,
      assigned_driver_name: ship.assignedDriverName || null,
      return_reason_code: ship.returnReasonCode || null,
      attempt_count: Number(ship.attemptCount || 0),
      pod_signature_url: ship.podSignatureUrl || null,
      pod_photo_path: ship.podPhotoPath || null,
      pod_gps_lat: ship.podGpsLat != null ? Number(ship.podGpsLat) : null,
      pod_gps_lng: ship.podGpsLng != null ? Number(ship.podGpsLng) : null,
      pod_signed_at: ship.podSignedAt || null,
      pod_signed_by: ship.podSignedBy || ship.recipientIdNumber || null,
      otp_attempts: Number(ship.otpAttempts || 0),
      otp_locked_until: ship.otpLockedUntil || null,
      public_share_code: ship.publicShareCode || null,
      settled_at: ship.settledAt || (ship.isSettled ? new Date().toISOString() : null),
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
      expected_parcel_count: Number(discharge.expectedParcelCount || 0),
      counterfeit_amount_centimes: dzdToCentimes(discharge.counterfeitAmountDzd || 0),
      damaged_amount_centimes: dzdToCentimes(discharge.damagedAmountDzd || 0),
      requires_supervisor_review: Boolean(discharge.requiresSupervisorReview),
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
      net_paid_centimes: dzdToCentimes(batch.netPayoutDzd || 0),
      ccp_validated: Boolean(batch.ccpValidated),
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

  async scanParcelGuarded(params: {
    parcelId: string;
    stage: string;
    bagId?: string;
    location?: string;
    allowOverride?: boolean;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('logistics_scan_parcel_guarded', {
      p_parcel_id: toValidUuid(params.parcelId),
      p_stage: params.stage,
      p_bag_id: params.bagId ? toValidUuid(params.bagId) : null,
      p_location: params.location || 'Hub National Alger',
      p_allow_override: Boolean(params.allowOverride),
    });
    return res.success;
  },

  async verifyStopDeskOtp(params: {
    parcelId: string;
    enteredOtp: string;
    expectedOtp: string;
    recipientIdNumber?: string;
    managerUnlock?: boolean;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('logistics_verify_stopdesk_otp', {
      p_parcel_id: toValidUuid(params.parcelId),
      p_entered_otp: params.enteredOtp,
      p_expected_otp: params.expectedOtp,
      p_recipient_id_number: params.recipientIdNumber || null,
      p_manager_unlock: Boolean(params.managerUnlock),
    });
    return res.success;
  },

  async recordDischargeWithVariance(params: {
    businessId: string;
    branchId: string;
    driverId: string;
    driverName: string;
    collectedCashDzd: number;
    deliveredCount: number;
    returnedCount: number;
    expectedParcelCount: number;
    counterfeitCentimes?: number;
    damagedCentimes?: number;
    expectedCashDzd?: number;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('logistics_record_discharge_with_variance', {
      p_business_id: toValidUuid(params.businessId),
      p_branch_id: toValidUuid(params.branchId),
      p_driver_id: toValidUuid(params.driverId),
      p_driver_name: params.driverName,
      p_collected_cash_dzd: params.collectedCashDzd,
      p_delivered_count: params.deliveredCount,
      p_returned_count: params.returnedCount,
      p_expected_parcel_count: params.expectedParcelCount,
      p_counterfeit_centimes: params.counterfeitCentimes ?? 0,
      p_damaged_centimes: params.damagedCentimes ?? 0,
      p_expected_cash_dzd: params.expectedCashDzd ?? 0,
    });
    return res.success;
  },

  async executeRemittanceValidated(remittanceId: string, ccpValidated: boolean): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('logistics_execute_remittance_validated', {
      p_remittance_id: toValidUuid(remittanceId),
      p_ccp_validated: ccpValidated,
    });
    return res.success;
  },

  async upsertParcelEvent(ev: LogisticsParcelEvent, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ev.accountId || ctx.accountId,
      businessId: ev.businessId || ctx.businessId,
      branchId: ev.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(ev.id),
      ...trace,
      parcel_id: toValidUuid(ev.parcelId),
      status: ev.status,
      location: ev.location || 'Hub',
      notes: ev.notes || null,
      notification_channel: ev.notificationChannel || null,
      notification_recipient: ev.notificationRecipient || null,
      notification_status: ev.notificationStatus || null,
      occurred_at: ev.occurredAt || new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_parcel_events', payload, {
      entityType: 'LogisticsParcelEvent',
      entityLabel: ev.trackingCode,
      localData: payload,
    });
    return res.success;
  },

  async upsertDeliveryPod(pod: LogisticsDeliveryPod, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: pod.accountId || ctx.accountId,
      businessId: pod.businessId || ctx.businessId,
      branchId: pod.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(pod.id),
      ...trace,
      parcel_id: toValidUuid(pod.parcelId),
      tracking_code: pod.trackingCode,
      driver_name: pod.driverName,
      outcome: pod.outcome,
      reason_code: pod.reasonCode || null,
      signature_svg: pod.signatureSvg || null,
      photo_storage_path: pod.photoStoragePath || null,
      gps_lat: pod.gpsLat != null ? Number(pod.gpsLat) : null,
      gps_lng: pod.gpsLng != null ? Number(pod.gpsLng) : null,
      recipient_signed_name: pod.recipientSignedName || null,
      notes: pod.notes || null,
      captured_at: pod.capturedAt || new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_delivery_pods', payload, {
      entityType: 'LogisticsDeliveryPod',
      entityLabel: pod.trackingCode,
      localData: payload,
    });
    return res.success;
  },

  async upsertDriverPayout(payout: LogisticsDriverPayout, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: payout.accountId || ctx.accountId,
      businessId: payout.businessId || ctx.businessId,
      branchId: payout.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(payout.id),
      ...trace,
      payout_number: payout.payoutNumber,
      driver_name: payout.driverName,
      employment_type: payout.employmentType,
      period_label: payout.periodLabel,
      delivered_count: payout.deliveredCount,
      returned_count: payout.returnedCount,
      shortage_deduction_centimes: dzdToCentimes(payout.shortageDeductionDzd),
      gross_compensation_centimes: dzdToCentimes(payout.grossCompensationDzd),
      tax_withheld_centimes: dzdToCentimes(payout.taxWithheldDzd),
      net_payable_centimes: dzdToCentimes(payout.netPayableDzd),
      status: payout.status,
      paid_at: payout.paidAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_driver_payouts', payload, {
      entityType: 'LogisticsDriverPayout',
      entityLabel: payout.payoutNumber,
      localData: payload,
    });
    return res.success;
  },

  async upsertVehicleLog(log: LogisticsVehicleLog, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || ctx.accountId,
      businessId: log.businessId || ctx.businessId,
      branchId: log.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      vehicle_plate: log.vehiclePlate,
      log_kind: log.logKind,
      odometer_km: Number(log.odometerKm || 0),
      liters: Number(log.liters || 0),
      cost_centimes: dzdToCentimes(log.costDzd),
      provider_name: log.providerName || null,
      notes: log.notes || null,
      logged_at: log.loggedAt || new Date().toISOString().slice(0, 10),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_vehicle_logs', payload, {
      entityType: 'LogisticsVehicleLog',
      entityLabel: log.vehiclePlate,
      localData: payload,
    });
    return res.success;
  },

  async upsertMerchantFeeInvoice(inv: LogisticsMerchantFeeInvoice, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: inv.accountId || ctx.accountId,
      businessId: inv.businessId || ctx.businessId,
      branchId: inv.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(inv.id),
      ...trace,
      invoice_number: inv.invoiceNumber,
      merchant_name: inv.merchantName,
      period_label: inv.periodLabel,
      delivered_count: inv.deliveredCount,
      returned_count: inv.returnedCount,
      gross_cod_centimes: dzdToCentimes(inv.grossCodDzd),
      total_fees_ttc_centimes: dzdToCentimes(inv.totalFeesTtcDzd),
      net_merchant_payable_centimes: dzdToCentimes(inv.netMerchantPayableDzd),
      scf_lines: inv.scfLines,
      status: inv.status,
      issued_at: inv.issuedAt || new Date().toISOString().slice(0, 10),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_merchant_fee_invoices', payload, {
      entityType: 'LogisticsMerchantFeeInvoice',
      entityLabel: inv.invoiceNumber,
      localData: payload,
    });
    return res.success;
  },

  async upsertCarrierIntegration(integ: LogisticsCarrierIntegration, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: integ.accountId || ctx.accountId,
      businessId: integ.businessId || ctx.businessId,
      branchId: integ.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(integ.id),
      ...trace,
      store_name: integ.storeName,
      platform: integ.platform,
      webhook_url: integ.webhookUrl,
      signing_secret_hint: integ.signingSecretHint || null,
      is_active: integ.isActive,
      last_synced_at: integ.lastSyncedAt || null,
      orders_imported_count: integ.ordersImportedCount || 0,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_carrier_integrations', payload, {
      entityType: 'LogisticsCarrierIntegration',
      entityLabel: integ.storeName,
      localData: payload,
    });
    return res.success;
  },

  async upsertFreightWaybill(wb: LogisticsFreightWaybill, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: wb.accountId || ctx.accountId,
      businessId: wb.businessId || ctx.businessId,
      branchId: wb.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(wb.id),
      ...trace,
      waybill_number: wb.waybillNumber,
      shipper_name: wb.shipperName,
      consignee_name: wb.consigneeName,
      origin_wilaya: wb.originWilaya,
      destination_wilaya: wb.destinationWilaya,
      cargo_description: wb.cargoDescription,
      weight_tons: wb.weightTons,
      distance_km: wb.distanceKm,
      rate_per_km_dzd: wb.ratePerKmDzd,
      fuel_surcharge_percent: wb.fuelSurchargePercent,
      loading_fee_dzd: wb.loadingFeeDzd,
      total_ttc_centimes: dzdToCentimes(wb.totalTtcDzd),
      vehicle_plate: wb.vehiclePlate || null,
      status: wb.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_freight_waybills', payload, {
      entityType: 'LogisticsFreightWaybill',
      entityLabel: wb.waybillNumber,
      localData: payload,
    });
    return res.success;
  },

  async upsertMovingQuote(q: LogisticsMovingQuote, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: q.accountId || ctx.accountId,
      businessId: q.businessId || ctx.businessId,
      branchId: q.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(q.id),
      ...trace,
      quote_number: q.quoteNumber,
      client_name: q.clientName,
      origin_address: q.originAddress,
      destination_address: q.destinationAddress,
      volume_m3: q.volumeM3,
      distance_km: q.distanceKm,
      origin_floor: q.originFloor,
      destination_floor: q.destinationFloor,
      has_elevator_origin: q.hasElevatorOrigin,
      has_elevator_dest: q.hasElevatorDest,
      packing_included: q.packingIncluded,
      crew_size: q.crewSize,
      total_ttc_centimes: dzdToCentimes(q.totalTtcDzd),
      move_date: q.moveDate || null,
      status: q.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_moving_quotes', payload, {
      entityType: 'LogisticsMovingQuote',
      entityLabel: q.quoteNumber,
      localData: payload,
    });
    return res.success;
  },

  async upsertColdChainLog(log: LogisticsColdChainLog, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || ctx.accountId,
      businessId: log.businessId || ctx.businessId,
      branchId: log.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      vehicle_plate: log.vehiclePlate,
      cargo_type: log.cargoType,
      recorded_temp_c: log.recordedTempC,
      min_allowed_temp_c: log.minAllowedTempC,
      max_allowed_temp_c: log.maxAllowedTempC,
      excursion_minutes: log.excursionMinutes,
      compliance_status: log.complianceStatus,
      requires_quarantine: log.requiresQuarantine,
      recorded_at: log.recordedAt || new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_cold_chain_logs', payload, {
      entityType: 'LogisticsColdChainLog',
      entityLabel: log.vehiclePlate,
      localData: payload,
    });
    return res.success;
  },

  async upsertCustomsDossier(dos: LogisticsCustomsDossier, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: dos.accountId || ctx.accountId,
      businessId: dos.businessId || ctx.businessId,
      branchId: dos.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(dos.id),
      ...trace,
      dossier_number: dos.dossierNumber,
      importer_name: dos.importerName,
      bl_awb_reference: dos.blAwbReference,
      port_name: dos.portName,
      hs_code: dos.hsCode,
      fob_value_dzd: dos.fobValueDzd,
      freight_dzd: dos.freightDzd,
      insurance_dzd: dos.insuranceDzd,
      customs_duty_rate_percent: dos.customsDutyRatePercent,
      total_payable_centimes: dzdToCentimes(dos.totalPayableDzd),
      status: dos.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_customs_dossiers', payload, {
      entityType: 'LogisticsCustomsDossier',
      entityLabel: dos.dossierNumber,
      localData: payload,
    });
    return res.success;
  },

  async upsertTowingDispatch(tow: LogisticsTowingDispatch, ctx: LogisticsBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: tow.accountId || ctx.accountId,
      businessId: tow.businessId || ctx.businessId,
      branchId: tow.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(tow.id),
      ...trace,
      dispatch_number: tow.dispatchNumber,
      caller_name: tow.callerName,
      caller_phone: tow.callerPhone,
      vehicle_class: tow.vehicleClass,
      pickup_location: tow.pickupLocation,
      dropoff_location: tow.dropoffLocation,
      distance_km: tow.distanceKm,
      is_night_or_weekend: tow.isNightOrWeekend,
      needs_winch_extraction: tow.needsWinchExtraction,
      total_centimes: dzdToCentimes(tow.totalDzd),
      status: tow.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('logistics_towing_dispatches', payload, {
      entityType: 'LogisticsTowingDispatch',
      entityLabel: tow.dispatchNumber,
      localData: payload,
    });
    return res.success;
  },
};

import { getSupabaseClient, toValidUuid } from '../client';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  AgriParcel,
  AgriCropCycle,
  AgriTreatmentLog,
  AgriWorker,
  AgriDailyPointage,
  AgriDairyCow,
  AgriMilkingRecord,
  AgriWeighbridgeTicket,
  AgriCyclePhase,
} from '../../../types/index';

type DbCropStage = 'Planned' | 'Sown' | 'Vegetative' | 'Flowering' | 'Harvesting' | 'Closed';
type DbHealthStatus = 'Healthy' | 'UnderTreatment' | 'Quarantine' | 'Sold';

function toDbCropStage(phase: AgriCyclePhase): DbCropStage {
  switch (phase) {
    case 'planned':
      return 'Planned';
    case 'sowing':
      return 'Sown';
    case 'vegetative':
      return 'Vegetative';
    case 'treatment_locked':
      return 'Flowering';
    case 'ready_harvest':
      return 'Harvesting';
    case 'closed':
      return 'Closed';
    default:
      return 'Sown';
  }
}

function toDbHealthStatus(cow: AgriDairyCow): DbHealthStatus {
  if (cow.isInWithholdingLockout || cow.reproStatus === 'Quarantaine' || cow.healthStatus === 'Quarantine') {
    return cow.healthStatus === 'Quarantine' || cow.reproStatus === 'Quarantaine' ? 'Quarantine' : 'UnderTreatment';
  }
  if (cow.healthStatus === 'InTreatment' || cow.healthStatus === 'Sick') return 'UnderTreatment';
  return 'Healthy';
}

const META_PREFIX = '__atrium_agri__:';

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

export const agricultureService = {
  async fetchParcels(branchId: string, updatedAfter?: string | null): Promise<AgriParcel[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_parcels')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('parcel_code', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): AgriParcel => {
        const { plain: soilType, meta } = unpackMeta(row.soil_type);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          name: row.name,
          code: row.parcel_code,
          tenureType: meta.tenureType,
          cadastralSection: meta.cadastralSection,
          cadastralDeedRef: meta.cadastralDeedRef,
          surfaceHectares: Number(row.surface_hectares || 1),
          irrigationType: (meta.irrigationType || 'Drip') as AgriParcel['irrigationType'],
          soilType: soilType || 'Argilo-Limoneux',
          soilPh: meta.soilPh,
          waterSourceId: meta.waterSourceId,
          waterMeterReadingM3: meta.waterMeterReadingM3,
          anrhAnnualQuotaM3: meta.anrhAnnualQuotaM3,
          anrhConsumedM3: meta.anrhConsumedM3,
          currentCrop: meta.currentCrop,
          plantingDate: meta.plantingDate,
          expectedHarvestDate: meta.expectedHarvestDate,
          status: (row.status || 'Planted') as AgriParcel['status'],
          notes: meta.notes,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertParcel(parcel: AgriParcel): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: parcel.accountId || 'acc_01',
      businessId: parcel.businessId,
      branchId: parcel.branchId,
      staffId: parcel.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_parcels', {
      id: toValidUuid(parcel.id),
      ...trace,
      parcel_code: parcel.code || parcel.id.slice(0, 8).toUpperCase(),
      name: parcel.name,
      surface_hectares: Number(parcel.surfaceHectares || 1),
      soil_type: packMeta(parcel.soilType, {
        tenureType: parcel.tenureType,
        cadastralSection: parcel.cadastralSection,
        cadastralDeedRef: parcel.cadastralDeedRef,
        irrigationType: parcel.irrigationType,
        soilPh: parcel.soilPh,
        waterSourceId: parcel.waterSourceId,
        waterMeterReadingM3: parcel.waterMeterReadingM3,
        anrhAnnualQuotaM3: parcel.anrhAnnualQuotaM3,
        anrhConsumedM3: parcel.anrhConsumedM3,
        currentCrop: parcel.currentCrop,
        plantingDate: parcel.plantingDate,
        expectedHarvestDate: parcel.expectedHarvestDate,
        notes: parcel.notes,
      }),
      irrigation_mode: parcel.irrigationType,
      status: parcel.status,
    });
    return res.success;
  },

  async fetchCropCycles(branchId: string, updatedAfter?: string | null): Promise<AgriCropCycle[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_crop_cycles')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('sowing_date', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): AgriCropCycle => {
        const { plain: variety, meta } = unpackMeta(row.variety);
        if (meta.cycle) return meta.cycle as AgriCropCycle;
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          parcelId: row.parcel_id,
          cropName: row.crop_name,
          variety: variety || '',
          campaignYear: new Date().getFullYear(),
          surfaceAllocatedHa: 1,
          sowingDate: row.sowing_date,
          projectedHarvestDate: row.expected_harvest_date || row.sowing_date,
          projectedYieldQtx: Number(row.estimated_yield_tons || 0) * 10,
          currentPhase: 'vegetative',
          totalInputCostDzd: 0,
          totalLaborCostDzd: 0,
          totalMachineryCostDzd: 0,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertCropCycle(cycle: AgriCropCycle, parcelName?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: cycle.accountId || 'acc_01',
      businessId: cycle.businessId,
      branchId: cycle.branchId,
      staffId: cycle.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_crop_cycles', {
      id: toValidUuid(cycle.id),
      ...trace,
      parcel_id: toValidUuid(cycle.parcelId),
      parcel_name: parcelName || cycle.parcelId,
      crop_name: cycle.cropName,
      variety: packMeta(cycle.variety, { cycle }),
      sowing_date: cycle.sowingDate,
      expected_harvest_date: cycle.projectedHarvestDate || null,
      stage: toDbCropStage(cycle.currentPhase),
      estimated_yield_tons: Number(cycle.projectedYieldQtx || 0) / 10,
    });
    return res.success;
  },

  async fetchTreatments(branchId: string, updatedAfter?: string | null): Promise<AgriTreatmentLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_treatments')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('application_date', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .filter((row: any) => row.target_type === 'crop')
        .map((row: any): AgriTreatmentLog => {
          const { plain, meta } = unpackMeta(row.notes);
          return {
            id: row.id,
            accountId: row.account_id,
            businessId: row.business_id,
            branchId: row.branch_id,
            staffId: row.staff_id || 'staff_01',
            parcelId: row.parcel_id || meta.parcelId || '',
            cropCycleId: meta.cropCycleId,
            treatmentDate: row.application_date,
            commercialProductName: row.product_name,
            activeIngredient: row.active_ingredient || '',
            targetPestDisease: meta.targetPestDisease || '',
            dosagePerHa: row.dosage || '',
            totalQuantityUsed: meta.totalQuantityUsed,
            darDays: Number(row.dar_days || 0),
            harvestAllowedDate: row.withholding_until_date || row.application_date,
            operatorName: meta.operatorName || 'Agronome',
            safetyGearConfirmed: meta.safetyGearConfirmed,
            notes: plain || undefined,
            createdAt: row.created_at,
          };
        });
    } catch {
      return [];
    }
  },

  async upsertTreatment(log: AgriTreatmentLog): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || 'acc_01',
      businessId: log.businessId,
      branchId: log.branchId,
      staffId: log.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_treatments', {
      id: toValidUuid(log.id),
      ...trace,
      target_type: 'crop',
      parcel_id: log.parcelId ? toValidUuid(log.parcelId) : null,
      animal_id: null,
      product_name: log.commercialProductName,
      active_ingredient: log.activeIngredient || null,
      dosage: log.dosagePerHa || null,
      application_date: log.treatmentDate || new Date().toISOString().split('T')[0],
      dar_days: Number(log.darDays || 0),
      withholding_until_date: log.harvestAllowedDate || null,
      notes: packMeta(log.notes, {
        parcelId: log.parcelId,
        cropCycleId: log.cropCycleId,
        targetPestDisease: log.targetPestDisease,
        totalQuantityUsed: log.totalQuantityUsed,
        operatorName: log.operatorName,
        safetyGearConfirmed: log.safetyGearConfirmed,
      }),
    });
    return res.success;
  },

  async fetchLivestock(branchId: string, updatedAfter?: string | null): Promise<AgriDairyCow[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_livestock')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('ear_tag', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): AgriDairyCow => {
        const { plain: breed, meta } = unpackMeta(row.breed);
        if (meta.cow) return meta.cow as AgriDairyCow;
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          earTagNumber: row.ear_tag,
          nameOrNumber: row.ear_tag,
          breed: breed || 'Holstein',
          birthDate: row.birth_date || '2022-01-01',
          reproStatus: 'Lactation',
          lactationNumber: 1,
          dailyAvgLiters: 20,
          isInWithholdingLockout: row.health_status === 'UnderTreatment' || row.health_status === 'Quarantine',
          withholdingLockoutUntil: row.antibiotic_withholding_until || undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertLivestock(cow: AgriDairyCow): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: cow.accountId || 'acc_01',
      businessId: cow.businessId,
      branchId: cow.branchId,
      staffId: cow.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_livestock', {
      id: toValidUuid(cow.id),
      ...trace,
      ear_tag: cow.earTagNumber,
      species: cow.species || 'Bovin Laitier',
      breed: packMeta(cow.breed, { cow }),
      birth_date: cow.birthDate || null,
      gender: cow.gender || 'Female',
      health_status: toDbHealthStatus(cow),
      antibiotic_withholding_until: cow.withholdingLockoutUntil || null,
    });
    return res.success;
  },

  async fetchMilkingLogs(branchId: string, updatedAfter?: string | null): Promise<AgriMilkingRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_milking_logs')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('milking_date', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): AgriMilkingRecord => {
        const { meta } = unpackMeta(row.lot_label);
        if (meta.record) return meta.record as AgriMilkingRecord;
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          sessionDate: row.milking_date,
          sessionPeriod: row.session_period === 'Soir' ? 'evening' : 'morning',
          totalTankLiters: Number(row.volume_liters || 0),
          rejectedWithholdingLiters: row.is_discarded ? Number(row.volume_liters || 0) : 0,
          conformingLiters: row.is_tank_approved ? Number(row.volume_liters || 0) : 0,
          tankTemperatureCelsius: 4.0,
          destinationDairy: 'Laiterie',
          dairyDeliverySlipNo: row.onil_bordereau_ref || undefined,
          onilSubsidyRateDzd: 12,
          onilTotalSubsidyDzd: (row.is_tank_approved ? Number(row.volume_liters || 0) : 0) * 12,
          operatorStaffId: row.staff_id || 'staff_01',
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertMilkingLog(rec: AgriMilkingRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: rec.accountId || 'acc_01',
      businessId: rec.businessId,
      branchId: rec.branchId,
      staffId: rec.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_milking_logs', {
      id: toValidUuid(rec.id),
      ...trace,
      animal_id: null,
      lot_label: packMeta(rec.destinationDairy, { record: rec }),
      milking_date: rec.sessionDate || new Date().toISOString().split('T')[0],
      session_period: rec.sessionPeriod === 'evening' ? 'Soir' : 'Matin',
      volume_liters: Number(rec.totalTankLiters || 0),
      fat_rate_percent: rec.fatContentMg ? Number(rec.fatContentMg) : null,
      is_tank_approved: Number(rec.conformingLiters || 0) > 0,
      is_discarded: Number(rec.rejectedWithholdingLiters || 0) > 0 && Number(rec.conformingLiters || 0) <= 0,
      onil_bordereau_ref: rec.dairyDeliverySlipNo || null,
    });
    return res.success;
  },

  async fetchHarvestTickets(branchId: string, updatedAfter?: string | null): Promise<AgriWeighbridgeTicket[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_harvests')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('harvest_date', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): AgriWeighbridgeTicket | null => {
          const { meta } = unpackMeta(row.weighbridge_ticket_number);
          return meta.ticket ? (meta.ticket as AgriWeighbridgeTicket) : null;
        })
        .filter((t: AgriWeighbridgeTicket | null): t is AgriWeighbridgeTicket => Boolean(t));
    } catch {
      return [];
    }
  },

  async upsertHarvestTicket(ticket: AgriWeighbridgeTicket, fallbackParcelId: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ticket.accountId || 'acc_01',
      businessId: ticket.businessId,
      branchId: ticket.branchId,
      staffId: ticket.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_harvests', {
      id: toValidUuid(ticket.id),
      ...trace,
      parcel_id: toValidUuid(ticket.parcelId || fallbackParcelId),
      crop_cycle_id: null,
      crop_name: ticket.cropDesignation,
      harvest_date: ticket.date || ticket.harvestDate || new Date().toISOString().split('T')[0],
      gross_weight_kg: Number(ticket.grossWeightKg || 0),
      net_weight_kg: Number(ticket.netWeightKg || 0),
      grade: ticket.qualityGrade || 'Extra',
      weighbridge_ticket_number: packMeta(ticket.ticketNumber, { ticket }),
    });
    return res.success;
  },

  async fetchWorkers(branchId: string, updatedAfter?: string | null): Promise<AgriWorker[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_staff')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): AgriWorker | null => {
          const { meta } = unpackMeta(row.role);
          return meta.worker ? (meta.worker as AgriWorker) : null;
        })
        .filter((w: AgriWorker | null): w is AgriWorker => Boolean(w));
    } catch {
      return [];
    }
  },

  async upsertWorker(worker: AgriWorker): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: worker.accountId || 'acc_01',
      businessId: worker.businessId,
      branchId: worker.branchId,
      staffId: worker.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_staff', {
      id: toValidUuid(worker.id),
      ...trace,
      full_name: worker.fullName,
      role: packMeta(worker.workerType, { worker }),
      is_active: worker.active,
    });
    return res.success;
  },

  async fetchPointages(branchId: string, updatedAfter?: string | null): Promise<AgriDailyPointage[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('agri_sales')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('sale_number', 'PTG-%')
        .order('sale_date', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): AgriDailyPointage | null => {
          const { meta } = unpackMeta(row.buyer_name);
          return meta.pointage ? (meta.pointage as AgriDailyPointage) : null;
        })
        .filter((p: AgriDailyPointage | null): p is AgriDailyPointage => Boolean(p));
    } catch {
      return [];
    }
  },

  async upsertPointage(p: AgriDailyPointage): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: p.accountId || 'acc_01',
      businessId: p.businessId,
      branchId: p.branchId,
      staffId: p.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('agri_sales', {
      id: toValidUuid(`ptg_${p.id}`),
      ...trace,
      sale_number: `PTG-${p.id.slice(0, 12)}`,
      buyer_name: packMeta(p.workerName, { pointage: p }),
      product_description: p.parcelName || p.parcelId,
      quantity: Number(p.cratesCollected || 0),
      unit: 'caisse',
      unit_price_dzd: 0,
      total_amount_dzd: Number(p.netDueDzd || 0),
      payment_status: p.isPaid ? 'Paid' : 'Unpaid',
      sale_date: p.date || new Date().toISOString().split('T')[0],
    });
    return res.success;
  },
};

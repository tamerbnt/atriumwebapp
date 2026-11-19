import { getSupabaseClient, toValidUuid } from '../client';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  RealEstateProperty,
  RealEstateMandate,
  RealEstateLease,
  RentalQuittanceRecord,
  BonDeVisiteRecord,
  RealEstateInspection,
  BuyerDemandProfile,
  MandateType,
  MandateStatus,
} from '../../../types/index';

type DbMandateType = 'Exclusif' | 'Simple' | 'GestionLocative';
type DbLeaseStatus = 'Draft' | 'Active' | 'Renewed' | 'Terminated';
type DbInspectionType = 'Entrée' | 'Sortie' | 'Périodique';

function toDbMandateType(t: MandateType): DbMandateType {
  if (t === 'Vente_Exclusif') return 'Exclusif';
  if (t === 'Gestion_Locative') return 'GestionLocative';
  return 'Simple';
}

function fromDbMandateType(db: string, fallback?: MandateType): MandateType {
  if (fallback) return fallback;
  if (db === 'Exclusif') return 'Vente_Exclusif';
  if (db === 'GestionLocative') return 'Gestion_Locative';
  return 'Vente_Simple';
}

function toDbLeaseStatus(s: RealEstateLease['status']): DbLeaseStatus {
  if (s === 'Expired' || s === 'Terminated') return 'Terminated';
  return 'Active';
}

function toDbInspectionType(t?: string): DbInspectionType {
  if (t === 'CheckOut' || t === 'Exit' || t === 'Sortie') return 'Sortie';
  return 'Entrée';
}

const META_PREFIX = '__atrium_re__:';

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

export const realEstateService = {
  async fetchProperties(branchId: string, updatedAfter?: string | null): Promise<RealEstateProperty[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('re_properties')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): RealEstateProperty => {
        const rawFeatures = row.features;
        let amenities: string[] = [];
        let meta: Record<string, any> = {};
        if (Array.isArray(rawFeatures)) {
          amenities = rawFeatures.filter((x: any) => typeof x === 'string');
        } else if (rawFeatures && typeof rawFeatures === 'object') {
          amenities = Array.isArray(rawFeatures.amenities) ? rawFeatures.amenities : [];
          meta = rawFeatures;
        }
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          title: row.title,
          propertyType: (meta.propertyType || row.property_type || 'Apartment') as RealEstateProperty['propertyType'],
          listingType: row.transaction_type === 'Vente' ? 'Sale' : 'Rental',
          surfaceM2: Number(row.surface_sqm || 0),
          roomsCount: Number(row.rooms || 3),
          address: row.address || '',
          cityWilaya: row.wilaya || '16 Alger',
          priceDzd: Number(row.transaction_type === 'Vente' ? row.asking_price_dzd : row.monthly_rent_dzd || row.asking_price_dzd || 0),
          ownerName: row.owner_name || '',
          ownerPhone: row.owner_phone || '',
          ownerNationalId: meta.ownerNationalId,
          status: (meta.uiStatus || 'Available') as RealEstateProperty['status'],
          amenities,
          legalTitleType: meta.legalTitleType || row.legal_act_type,
          hasLivretFoncier: meta.hasLivretFoncier,
          livretFoncierNumber: meta.livretFoncierNumber,
          volumeNumber: meta.volumeNumber,
          caseNumber: meta.caseNumber,
          cadastralSection: meta.cadastralSection,
          cadastralIlot: meta.cadastralIlot,
          cadastralLot: meta.cadastralLot,
          hasNegativeCertificate: meta.hasNegativeCertificate,
          hasCertificatConformite: meta.hasCertificatConformite,
          isEligibleBankMortgage: meta.isEligibleBankMortgage,
          isIndivision: meta.isIndivision,
          fridhaNumber: meta.fridhaNumber,
          mandateId: meta.mandateId,
          mandateNumber: meta.mandateNumber,
          photoUrls: meta.photoUrls,
          featuredPhotoUrl: meta.featuredPhotoUrl,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertProperty(prop: RealEstateProperty): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: prop.accountId || 'acc_01',
      businessId: prop.businessId,
      branchId: prop.branchId,
      staffId: prop.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('re_properties', {
      id: toValidUuid(prop.id),
      ...trace,
      reference_code: prop.mandateNumber || prop.id.slice(0, 10).toUpperCase(),
      title: prop.title,
      property_type: prop.propertyType,
      transaction_type: prop.listingType === 'Sale' ? 'Vente' : 'Location',
      wilaya: prop.cityWilaya || '16 Alger',
      address: prop.address || null,
      surface_sqm: Number(prop.surfaceM2 || 0),
      rooms: Number(prop.roomsCount || 3),
      asking_price_dzd: prop.listingType === 'Sale' ? Number(prop.priceDzd || 0) : 0,
      monthly_rent_dzd: prop.listingType === 'Rental' ? Number(prop.priceDzd || 0) : 0,
      owner_name: prop.ownerName || null,
      owner_phone: prop.ownerPhone || null,
      status: prop.status,
      legal_act_type: prop.legalTitleType || 'Acte Notarié',
      features: {
        amenities: prop.amenities || [],
        propertyType: prop.propertyType,
        uiStatus: prop.status,
        ownerNationalId: prop.ownerNationalId,
        legalTitleType: prop.legalTitleType,
        hasLivretFoncier: prop.hasLivretFoncier,
        livretFoncierNumber: prop.livretFoncierNumber,
        volumeNumber: prop.volumeNumber,
        caseNumber: prop.caseNumber,
        cadastralSection: prop.cadastralSection,
        cadastralIlot: prop.cadastralIlot,
        cadastralLot: prop.cadastralLot,
        hasNegativeCertificate: prop.hasNegativeCertificate,
        hasCertificatConformite: prop.hasCertificatConformite,
        isEligibleBankMortgage: prop.isEligibleBankMortgage,
        isIndivision: prop.isIndivision,
        fridhaNumber: prop.fridhaNumber,
        mandateId: prop.mandateId,
        mandateNumber: prop.mandateNumber,
        photoUrls: prop.photoUrls,
        featuredPhotoUrl: prop.featuredPhotoUrl,
      },
    });
    return res.success;
  },

  async deleteProperty(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('re_properties', id, deletedByStaffId);
    return res.success;
  },

  async fetchMandates(branchId: string, updatedAfter?: string | null): Promise<RealEstateMandate[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('re_mandates')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): RealEstateMandate => {
        const { plain: ownerFullName, meta } = unpackMeta(row.owner_name);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          negotiatorName: meta.negotiatorName,
          mandateNumber: row.mandate_number,
          mandateType: fromDbMandateType(row.mandate_type, meta.mandateType),
          status: (row.status || 'Active') as MandateStatus,
          propertyId: row.property_id || meta.propertyId || '',
          propertyTitle: row.property_title,
          propertyAddress: meta.propertyAddress || '',
          propertyType: meta.propertyType || 'Apartment',
          listingType: meta.listingType || 'Sale',
          ownerFullName,
          ownerPhone: meta.ownerPhone || '',
          ownerNationalId: meta.ownerNationalId || '',
          ownerIdIssueDate: meta.ownerIdIssueDate,
          ownerIdIssueDaira: meta.ownerIdIssueDaira,
          askingPriceDzd: Number(meta.askingPriceDzd ?? 0),
          minimumAcceptablePriceDzd: Number(meta.minimumAcceptablePriceDzd ?? 0),
          commissionCalculationMode: meta.commissionCalculationMode || 'FlatPercent',
          commissionRatePercent: Number(row.commission_percent || 2.5),
          commissionFixedAmountDzd: meta.commissionFixedAmountDzd,
          commissionEstimatedHtDzd: Number(meta.commissionEstimatedHtDzd ?? 0),
          commissionEstimatedTtcDzd: Number(meta.commissionEstimatedTtcDzd ?? 0),
          commissionPayer: meta.commissionPayer || 'Seller',
          startDate: row.start_date,
          endDate: row.end_date || row.start_date,
          renewalCount: Number(meta.renewalCount ?? 0),
          isExclusive: Boolean(meta.isExclusive ?? row.mandate_type === 'Exclusif'),
          scannedDocumentUrl: meta.scannedDocumentUrl,
          notes: meta.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertMandate(mandate: RealEstateMandate): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: mandate.accountId || 'acc_01',
      businessId: mandate.businessId,
      branchId: mandate.branchId,
      staffId: mandate.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('re_mandates', {
      id: toValidUuid(mandate.id),
      ...trace,
      mandate_number: mandate.mandateNumber,
      property_id: mandate.propertyId ? toValidUuid(mandate.propertyId) : null,
      property_title: mandate.propertyTitle,
      owner_name: packMeta(mandate.ownerFullName, {
        negotiatorName: mandate.negotiatorName,
        mandateType: mandate.mandateType,
        propertyId: mandate.propertyId,
        propertyAddress: mandate.propertyAddress,
        propertyType: mandate.propertyType,
        listingType: mandate.listingType,
        ownerPhone: mandate.ownerPhone,
        ownerNationalId: mandate.ownerNationalId,
        ownerIdIssueDate: mandate.ownerIdIssueDate,
        ownerIdIssueDaira: mandate.ownerIdIssueDaira,
        askingPriceDzd: mandate.askingPriceDzd,
        minimumAcceptablePriceDzd: mandate.minimumAcceptablePriceDzd,
        commissionCalculationMode: mandate.commissionCalculationMode,
        commissionFixedAmountDzd: mandate.commissionFixedAmountDzd,
        commissionEstimatedHtDzd: mandate.commissionEstimatedHtDzd,
        commissionEstimatedTtcDzd: mandate.commissionEstimatedTtcDzd,
        commissionPayer: mandate.commissionPayer,
        renewalCount: mandate.renewalCount,
        isExclusive: mandate.isExclusive,
        scannedDocumentUrl: mandate.scannedDocumentUrl,
        notes: mandate.notes,
      }),
      mandate_type: toDbMandateType(mandate.mandateType),
      commission_percent: Number(mandate.commissionRatePercent ?? 2.5),
      start_date: mandate.startDate,
      end_date: mandate.endDate || null,
      status: mandate.status,
    });
    return res.success;
  },

  async fetchLeases(branchId: string, updatedAfter?: string | null): Promise<RealEstateLease[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('re_leases')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): RealEstateLease => {
        const { plain: tenantName, meta } = unpackMeta(row.tenant_name);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          leaseNumber: row.lease_number,
          propertyId: row.property_id || meta.propertyId || '',
          propertyTitle: row.property_title,
          tenantName,
          tenantPhone: row.tenant_phone || '',
          tenantNationalId: meta.tenantNationalId,
          ownerName: meta.ownerName,
          ownerPhone: meta.ownerPhone,
          startDate: row.start_date,
          endDate: row.end_date || row.start_date,
          monthlyRentDzd: Number(row.monthly_rent_dzd || 0),
          securityDepositDzd: Number(row.security_deposit_dzd || 0),
          agencyFeeDzd: Number(row.agency_fee_dzd || 0),
          agencyCommissionDzd: Number(meta.agencyCommissionDzd ?? row.agency_fee_dzd ?? 0),
          agencyManagementRatePercent: meta.agencyManagementRatePercent,
          paymentCycle: meta.paymentCycle || 'Monthly',
          paymentFrequency: meta.paymentFrequency || 'Monthly',
          lastPaymentDate: meta.lastPaymentDate,
          arrearsDzd: Number(meta.arrearsDzd ?? 0),
          status: (meta.uiStatus || (row.status === 'Terminated' ? 'Terminated' : 'Active')) as RealEstateLease['status'],
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertLease(lease: RealEstateLease): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: lease.accountId || 'acc_01',
      businessId: lease.businessId,
      branchId: lease.branchId,
      staffId: lease.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('re_leases', {
      id: toValidUuid(lease.id),
      ...trace,
      lease_number: lease.leaseNumber || `BAIL-${lease.id.slice(0, 6).toUpperCase()}`,
      property_id: lease.propertyId ? toValidUuid(lease.propertyId) : null,
      property_title: lease.propertyTitle,
      tenant_name: packMeta(lease.tenantName, {
        propertyId: lease.propertyId,
        tenantNationalId: lease.tenantNationalId,
        ownerName: lease.ownerName,
        ownerPhone: lease.ownerPhone,
        agencyCommissionDzd: lease.agencyCommissionDzd,
        agencyManagementRatePercent: lease.agencyManagementRatePercent,
        paymentCycle: lease.paymentCycle,
        paymentFrequency: lease.paymentFrequency,
        lastPaymentDate: lease.lastPaymentDate,
        arrearsDzd: lease.arrearsDzd,
        uiStatus: lease.status,
      }),
      tenant_phone: lease.tenantPhone || null,
      monthly_rent_dzd: Number(lease.monthlyRentDzd || 0),
      security_deposit_dzd: Number(lease.securityDepositDzd || 0),
      agency_fee_dzd: Number(lease.agencyFeeDzd ?? lease.agencyCommissionDzd ?? 0),
      start_date: lease.startDate,
      end_date: lease.endDate || null,
      status: toDbLeaseStatus(lease.status),
    });
    return res.success;
  },

  async fetchQuittances(branchId: string, updatedAfter?: string | null): Promise<RentalQuittanceRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('re_rent_schedules')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): RentalQuittanceRecord | null => {
          const { meta } = unpackMeta(row.period_label);
          return meta.quittance ? (meta.quittance as RentalQuittanceRecord) : null;
        })
        .filter((q: RentalQuittanceRecord | null): q is RentalQuittanceRecord => Boolean(q));
    } catch {
      return [];
    }
  },

  async upsertQuittance(q: RentalQuittanceRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: q.accountId || 'acc_01',
      businessId: q.businessId,
      branchId: q.branchId,
      staffId: q.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('re_rent_schedules', {
      id: toValidUuid(q.id),
      ...trace,
      lease_id: toValidUuid(q.leaseId),
      period_label: packMeta(`${String(q.periodMonth).padStart(2, '0')}/${q.periodYear}`, { quittance: q }),
      due_date: q.paymentDate || new Date().toISOString().split('T')[0],
      amount_dzd: Number(q.totalCollectedDzd || 0),
      paid_amount_dzd: Number(q.totalCollectedDzd || 0),
      status: 'Paid',
      paid_at: q.paymentDate ? `${q.paymentDate}T12:00:00Z` : new Date().toISOString(),
    });
    return res.success;
  },

  async fetchBonsDeVisite(branchId: string, updatedAfter?: string | null): Promise<BonDeVisiteRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('re_visits')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): BonDeVisiteRecord => {
        const { plain, meta } = unpackMeta(row.feedback);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          negotiatorName: row.agent_name || '',
          propertyId: row.property_id || meta.propertyId || '',
          propertyTitle: row.property_title,
          propertyAddress: meta.propertyAddress || '',
          clientFullName: row.client_name,
          clientPhone: row.client_phone || '',
          clientNationalId: meta.clientNationalId || '',
          visitTimestamp: row.visit_at || row.created_at,
          gpsLatitude: meta.gpsLatitude,
          gpsLongitude: meta.gpsLongitude,
          gpsAccuracyMeters: meta.gpsAccuracyMeters,
          signatureSvgData: meta.signatureSvgData || '',
          signedOffline: Boolean(meta.signedOffline),
          clientImpression: meta.clientImpression,
          clientFeedbackNotes: plain || undefined,
          counterOfferDzd: meta.counterOfferDzd,
          whatsappConfirmationSent: Boolean(meta.whatsappConfirmationSent),
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBonDeVisite(visit: BonDeVisiteRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: visit.accountId || 'acc_01',
      businessId: visit.businessId,
      branchId: visit.branchId,
      staffId: visit.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('re_visits', {
      id: toValidUuid(visit.id),
      ...trace,
      property_id: visit.propertyId ? toValidUuid(visit.propertyId) : null,
      property_title: visit.propertyTitle,
      client_name: visit.clientFullName,
      client_phone: visit.clientPhone || null,
      agent_name: visit.negotiatorName || null,
      visit_at: visit.visitTimestamp || new Date().toISOString(),
      status: 'Completed',
      feedback: packMeta(visit.clientFeedbackNotes, {
        propertyId: visit.propertyId,
        propertyAddress: visit.propertyAddress,
        clientNationalId: visit.clientNationalId,
        gpsLatitude: visit.gpsLatitude,
        gpsLongitude: visit.gpsLongitude,
        gpsAccuracyMeters: visit.gpsAccuracyMeters,
        signatureSvgData: visit.signatureSvgData,
        signedOffline: visit.signedOffline,
        clientImpression: visit.clientImpression,
        counterOfferDzd: visit.counterOfferDzd,
        whatsappConfirmationSent: visit.whatsappConfirmationSent,
      }),
    });
    return res.success;
  },

  async fetchInspections(branchId: string, updatedAfter?: string | null): Promise<RealEstateInspection[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('re_inspections')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): RealEstateInspection => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          leaseId: row.lease_id || meta.leaseId || '',
          propertyTitle: row.property_title,
          tenantName: meta.tenantName,
          type: meta.type || (row.inspection_type === 'Sortie' ? 'CheckOut' : 'CheckIn'),
          inspectionType: meta.inspectionType || (row.inspection_type === 'Sortie' ? 'CheckOut' : 'CheckIn'),
          inspectionDate: row.inspection_date,
          inspectorName: row.inspector_name || undefined,
          meterReadings: meta.meterReadings,
          meterElectricityKwh: meta.meterElectricityKwh,
          meterGasM3: meta.meterGasM3,
          meterWaterM3: meta.meterWaterM3,
          keysCount: meta.keysCount,
          keysDeliveredCount: meta.keysDeliveredCount,
          generalCondition: (row.overall_condition || 'Good') as RealEstateInspection['generalCondition'],
          observations: plain || undefined,
          notes: plain || undefined,
          isSigned: meta.isSigned,
          signatureSvgData: meta.signatureSvgData,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertInspection(insp: RealEstateInspection): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: insp.accountId || 'acc_01',
      businessId: insp.businessId,
      branchId: insp.branchId,
      staffId: insp.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('re_inspections', {
      id: toValidUuid(insp.id),
      ...trace,
      lease_id: insp.leaseId ? toValidUuid(insp.leaseId) : null,
      property_title: insp.propertyTitle,
      inspection_type: toDbInspectionType(insp.inspectionType || insp.type),
      inspection_date: insp.inspectionDate || new Date().toISOString().split('T')[0],
      inspector_name: insp.inspectorName || null,
      checklist: insp.meterReadings ? [insp.meterReadings] : [],
      overall_condition: insp.generalCondition || 'Good',
      notes: packMeta(insp.observations || insp.notes, {
        leaseId: insp.leaseId,
        tenantName: insp.tenantName,
        type: insp.type,
        inspectionType: insp.inspectionType,
        meterReadings: insp.meterReadings,
        meterElectricityKwh: insp.meterElectricityKwh,
        meterGasM3: insp.meterGasM3,
        meterWaterM3: insp.meterWaterM3,
        keysCount: insp.keysCount,
        keysDeliveredCount: insp.keysDeliveredCount,
        isSigned: insp.isSigned,
        signatureSvgData: insp.signatureSvgData,
      }),
    });
    return res.success;
  },

  async fetchBuyerDemands(branchId: string, updatedAfter?: string | null): Promise<BuyerDemandProfile[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('re_leads')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): BuyerDemandProfile => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          clientFullName: row.full_name,
          clientPhone: row.phone || '',
          clientEmail: meta.clientEmail,
          targetWilaya: row.preferred_wilaya || '16 Alger',
          targetCommune: meta.targetCommune,
          propertyType: (row.interest_type || 'Apartment') as BuyerDemandProfile['propertyType'],
          maxBudgetDzd: Number(row.budget_dzd || 0),
          minRooms: meta.minRooms,
          minSurfaceM2: meta.minSurfaceM2,
          financingType: meta.financingType || 'Cash',
          searchUrgency: meta.searchUrgency || 'Within3Months',
          activeStatus: meta.activeStatus || 'Active',
          notes: plain || undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBuyerDemand(demand: BuyerDemandProfile): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: demand.accountId || 'acc_01',
      businessId: demand.businessId,
      branchId: demand.branchId,
      staffId: demand.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('re_leads', {
      id: toValidUuid(demand.id),
      ...trace,
      full_name: demand.clientFullName,
      phone: demand.clientPhone || null,
      source: 'Portefeuille Demande',
      interest_type: demand.propertyType,
      preferred_wilaya: demand.targetWilaya,
      budget_dzd: Number(demand.maxBudgetDzd || 0),
      stage: demand.activeStatus === 'UnderOffer' ? 'Negotiation' : demand.activeStatus === 'Archived' ? 'Lost' : 'Qualified',
      notes: packMeta(demand.notes, {
        clientEmail: demand.clientEmail,
        targetCommune: demand.targetCommune,
        minRooms: demand.minRooms,
        minSurfaceM2: demand.minSurfaceM2,
        financingType: demand.financingType,
        searchUrgency: demand.searchUrgency,
        activeStatus: demand.activeStatus,
      }),
    });
    return res.success;
  },
};

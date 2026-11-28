import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
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
  RealEstateSaleDeal,
  RealEstateOwnerLedgerEntry,
  RealEstateMaintenanceTicket,
  RealEstateAgentCommission,
  SyndicBuilding,
  SyndicFundCall,
  SyndicAssembly,
  DevProgram,
  DevLot,
  StudentHousingBed,
  VacationRentalStay,
  VisitGpsStatus,
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
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_properties')
          .select(
            'id, account_id, business_id, branch_id, staff_id, crm_party_id, title, property_type, transaction_type, surface_sqm, rooms, address, wilaya, asking_price_dzd, monthly_rent_dzd, owner_name, owner_phone, legal_act_type, photo_urls, featured_photo_url, portal_sync, features, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): RealEstateProperty => {
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
          crmPartyId: row.crm_party_id || meta.crmPartyId || undefined,
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
          photoUrls: Array.isArray(row.photo_urls) && row.photo_urls.length > 0 ? row.photo_urls : meta.photoUrls,
          featuredPhotoUrl: row.featured_photo_url || meta.featuredPhotoUrl,
          portalSync: row.portal_sync && typeof row.portal_sync === 'object' ? row.portal_sync : meta.portalSync,
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertProperty(prop: RealEstateProperty): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: prop.accountId,
      businessId: prop.businessId,
      branchId: prop.branchId,
      staffId: prop.staffId,
    });
    const payload = {
      id: toValidUuid(prop.id),
      ...trace,
      crm_party_id: prop.crmPartyId ? toValidUuid(prop.crmPartyId) : null,
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
      photo_urls: prop.photoUrls || [],
      featured_photo_url: prop.featuredPhotoUrl || null,
      portal_sync: prop.portalSync || {},
      features: {
        amenities: prop.amenities || [],
        propertyType: prop.propertyType,
        uiStatus: prop.status,
        crmPartyId: prop.crmPartyId,
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
        portalSync: prop.portalSync,
      },
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_properties', payload, {
      expectedVersion: prop.version,
      entityType: 'RealEstateProperty',
      entityLabel: prop.title,
      localData: payload,
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
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_mandates')
          .select(
            'id, account_id, business_id, branch_id, staff_id, mandate_number, mandate_type, is_exclusive, secondary_staff_id, secondary_negotiator_name, primary_split_bps, secondary_split_bps, status, property_id, property_title, owner_name, commission_percent, start_date, end_date, version, created_at, updated_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): RealEstateMandate => {
        const { plain: ownerFullName, meta } = unpackMeta(row.owner_name);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          negotiatorName: meta.negotiatorName,
          secondaryStaffId: row.secondary_staff_id || meta.secondaryStaffId || undefined,
          secondaryNegotiatorName: row.secondary_negotiator_name || meta.secondaryNegotiatorName || undefined,
          primarySplitBps: row.primary_split_bps != null ? Number(row.primary_split_bps) : meta.primarySplitBps,
          secondarySplitBps: row.secondary_split_bps != null ? Number(row.secondary_split_bps) : meta.secondarySplitBps,
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
          isExclusive: Boolean(row.is_exclusive ?? meta.isExclusive ?? row.mandate_type === 'Exclusif'),
          scannedDocumentUrl: meta.scannedDocumentUrl,
          notes: meta.notes,
          version: row.version != null ? Number(row.version) : undefined,
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
      accountId: mandate.accountId,
      businessId: mandate.businessId,
      branchId: mandate.branchId,
      staffId: mandate.staffId,
    });
    const hasSecondary = Boolean(mandate.secondaryStaffId || mandate.secondaryNegotiatorName);
    const primarySplitBps = hasSecondary ? Number(mandate.primarySplitBps ?? 5000) : 10000;
    const secondarySplitBps = hasSecondary ? Number(mandate.secondarySplitBps ?? 10000 - primarySplitBps) : 0;
    const payload = {
      id: toValidUuid(mandate.id),
      ...trace,
      mandate_number: mandate.mandateNumber,
      property_id: mandate.propertyId ? toValidUuid(mandate.propertyId) : null,
      property_title: mandate.propertyTitle,
      is_exclusive: Boolean(mandate.isExclusive || mandate.mandateType === 'Vente_Exclusif'),
      secondary_staff_id: mandate.secondaryStaffId ? toValidUuid(mandate.secondaryStaffId) : null,
      secondary_negotiator_name: mandate.secondaryNegotiatorName || null,
      primary_split_bps: primarySplitBps,
      secondary_split_bps: secondarySplitBps,
      owner_name: packMeta(mandate.ownerFullName, {
        negotiatorName: mandate.negotiatorName,
        secondaryStaffId: mandate.secondaryStaffId,
        secondaryNegotiatorName: mandate.secondaryNegotiatorName,
        primarySplitBps,
        secondarySplitBps,
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_mandates', payload, {
      expectedVersion: mandate.version,
      entityType: 'RealEstateMandate',
      entityLabel: mandate.mandateNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchLeases(branchId: string, updatedAfter?: string | null): Promise<RealEstateLease[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_leases')
          .select(
            'id, account_id, business_id, branch_id, staff_id, crm_party_id, lease_number, property_id, property_title, tenant_name, tenant_phone, start_date, end_date, monthly_rent_dzd, security_deposit_dzd, agency_fee_dzd, renewal_count, indexation_rate_percent, indexation_frequency, next_indexation_date, indexation_history, status, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): RealEstateLease => {
        const { plain: tenantName, meta } = unpackMeta(row.tenant_name);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          crmPartyId: row.crm_party_id || meta.crmPartyId || undefined,
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
          renewalCount: Number(row.renewal_count ?? meta.renewalCount ?? 0),
          indexationRatePercent:
            row.indexation_rate_percent != null
              ? Number(row.indexation_rate_percent)
              : meta.indexationRatePercent,
          indexationFrequency: row.indexation_frequency || meta.indexationFrequency || 'Annual',
          nextIndexationDate: row.next_indexation_date || meta.nextIndexationDate || undefined,
          indexationHistory: Array.isArray(row.indexation_history) && row.indexation_history.length > 0
            ? row.indexation_history
            : meta.indexationHistory || [],
          status: (meta.uiStatus || (row.status === 'Terminated' ? 'Terminated' : 'Active')) as RealEstateLease['status'],
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertLease(lease: RealEstateLease): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: lease.accountId,
      businessId: lease.businessId,
      branchId: lease.branchId,
      staffId: lease.staffId,
    });
    const payload = {
      id: toValidUuid(lease.id),
      ...trace,
      crm_party_id: lease.crmPartyId ? toValidUuid(lease.crmPartyId) : null,
      lease_number: lease.leaseNumber || `BAIL-${lease.id.slice(0, 6).toUpperCase()}`,
      property_id: lease.propertyId ? toValidUuid(lease.propertyId) : null,
      property_title: lease.propertyTitle,
      renewal_count: Number(lease.renewalCount || 0),
      indexation_rate_percent: Number(lease.indexationRatePercent || 0),
      indexation_frequency: lease.indexationFrequency || 'Annual',
      next_indexation_date: lease.nextIndexationDate || null,
      indexation_history: lease.indexationHistory || [],
      tenant_name: packMeta(lease.tenantName, {
        crmPartyId: lease.crmPartyId,
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
        renewalCount: lease.renewalCount,
        indexationRatePercent: lease.indexationRatePercent,
        indexationFrequency: lease.indexationFrequency,
        nextIndexationDate: lease.nextIndexationDate,
        indexationHistory: lease.indexationHistory,
        uiStatus: lease.status,
      }),
      tenant_phone: lease.tenantPhone || null,
      monthly_rent_dzd: Number(lease.monthlyRentDzd || 0),
      security_deposit_dzd: Number(lease.securityDepositDzd || 0),
      agency_fee_dzd: Number(lease.agencyFeeDzd ?? lease.agencyCommissionDzd ?? 0),
      start_date: lease.startDate,
      end_date: lease.endDate || null,
      status: toDbLeaseStatus(lease.status),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_leases', payload, {
      expectedVersion: lease.version,
      entityType: 'RealEstateLease',
      entityLabel: lease.leaseNumber || lease.propertyTitle,
      localData: payload,
    });
    return res.success;
  },

  async fetchQuittances(branchId: string, updatedAfter?: string | null): Promise<RentalQuittanceRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_rent_schedules')
          .select(
            'id, period_label, quittance_number, amount_dzd, paid_amount_dzd, remaining_due_dzd, partial_payment_seq, charges_dzd, payment_method, timbre_fiscal_dzd, status, unified_document_id, unified_payment_id, journal_entry_id, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): RentalQuittanceRecord | null => {
          const { meta } = unpackMeta(row.period_label);
          if (!meta.quittance) return null;
          const q = meta.quittance as RentalQuittanceRecord;
          return {
            ...q,
            quittanceNumber: row.quittance_number || q.quittanceNumber,
            amountDueDzd: row.amount_dzd != null ? Number(row.amount_dzd) : q.amountDueDzd,
            paidAmountDzd: row.paid_amount_dzd != null ? Number(row.paid_amount_dzd) : q.paidAmountDzd,
            remainingDueDzd: row.remaining_due_dzd != null ? Number(row.remaining_due_dzd) : q.remainingDueDzd,
            partialPaymentSeq: row.partial_payment_seq != null ? Number(row.partial_payment_seq) : q.partialPaymentSeq,
            paymentStatus: (row.status || q.paymentStatus || 'Paid') as RentalQuittanceRecord['paymentStatus'],
            isPartial: row.status === 'Partial' ? true : q.isPartial,
            unifiedDocumentId: row.unified_document_id || q.unifiedDocumentId,
            unifiedPaymentId: row.unified_payment_id || q.unifiedPaymentId,
            journalEntryId: row.journal_entry_id || q.journalEntryId,
            version: row.version != null ? Number(row.version) : q.version,
          };
        })
        .filter((q: RentalQuittanceRecord | null): q is RentalQuittanceRecord => Boolean(q));
    } catch {
      return [];
    }
  },

  async upsertQuittance(q: RentalQuittanceRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: q.accountId,
      businessId: q.businessId,
      branchId: q.branchId,
      staffId: q.staffId,
    });
    const dueDzd = Number(q.amountDueDzd ?? Number(q.rentAmountDzd || 0) + Number(q.chargesDzd || 0));
    const paidDzd = Number(q.paidAmountDzd ?? q.totalCollectedDzd ?? dueDzd);
    const remainingDzd = Number(q.remainingDueDzd ?? Math.max(0, dueDzd - paidDzd));
    const scheduleStatus = q.paymentStatus || (remainingDzd > 0 ? 'Partial' : 'Paid');
    const payload = {
      id: toValidUuid(q.id),
      ...trace,
      lease_id: toValidUuid(q.leaseId),
      quittance_number: q.quittanceNumber,
      charges_dzd: Number(q.chargesDzd || 0),
      payment_method: q.paymentMethod || 'Cash',
      timbre_fiscal_dzd: Number(q.timbreFiscalDzd || 0),
      remaining_due_dzd: remainingDzd,
      partial_payment_seq: Number(q.partialPaymentSeq || 1),
      unified_document_id: q.unifiedDocumentId ? toValidUuid(q.unifiedDocumentId) : null,
      unified_payment_id: q.unifiedPaymentId ? toValidUuid(q.unifiedPaymentId) : null,
      journal_entry_id: q.journalEntryId ? toValidUuid(q.journalEntryId) : null,
      period_label: packMeta(`${String(q.periodMonth).padStart(2, '0')}/${q.periodYear}`, { quittance: q }),
      due_date: q.paymentDate || new Date().toISOString().split('T')[0],
      amount_dzd: dueDzd,
      paid_amount_dzd: paidDzd,
      status: scheduleStatus,
      paid_at: q.paymentDate ? `${q.paymentDate}T12:00:00Z` : new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_rent_schedules', payload, {
      expectedVersion: q.version,
      entityType: 'RentalQuittanceRecord',
      entityLabel: `${String(q.periodMonth).padStart(2, '0')}/${q.periodYear}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchBonsDeVisite(branchId: string, updatedAfter?: string | null): Promise<BonDeVisiteRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_visits')
          .select(
            'id, account_id, business_id, branch_id, staff_id, agent_name, property_id, property_title, client_name, client_phone, visit_at, gps_status, gps_latitude, gps_longitude, gps_accuracy_meters, feedback, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): BonDeVisiteRecord => {
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
          gpsStatus: (row.gps_status || meta.gpsStatus || (row.gps_latitude != null || meta.gpsLatitude != null ? 'captured' : 'unavailable')) as VisitGpsStatus,
          gpsLatitude: row.gps_latitude != null ? Number(row.gps_latitude) : meta.gpsLatitude,
          gpsLongitude: row.gps_longitude != null ? Number(row.gps_longitude) : meta.gpsLongitude,
          gpsAccuracyMeters: row.gps_accuracy_meters != null ? Number(row.gps_accuracy_meters) : meta.gpsAccuracyMeters,
          signatureSvgData: meta.signatureSvgData || '',
          signedOffline: Boolean(meta.signedOffline),
          clientImpression: meta.clientImpression,
          clientFeedbackNotes: plain || undefined,
          counterOfferDzd: meta.counterOfferDzd,
          whatsappConfirmationSent: Boolean(meta.whatsappConfirmationSent),
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBonDeVisite(visit: BonDeVisiteRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: visit.accountId,
      businessId: visit.businessId,
      branchId: visit.branchId,
      staffId: visit.staffId,
    });
    const resolvedGpsStatus: VisitGpsStatus =
      visit.gpsStatus || (typeof visit.gpsLatitude === 'number' && typeof visit.gpsLongitude === 'number' ? 'captured' : 'unavailable');
    const payload = {
      id: toValidUuid(visit.id),
      ...trace,
      property_id: visit.propertyId ? toValidUuid(visit.propertyId) : null,
      property_title: visit.propertyTitle,
      client_name: visit.clientFullName,
      client_phone: visit.clientPhone || null,
      agent_name: visit.negotiatorName || null,
      visit_at: visit.visitTimestamp || new Date().toISOString(),
      gps_status: resolvedGpsStatus,
      gps_latitude: typeof visit.gpsLatitude === 'number' ? visit.gpsLatitude : null,
      gps_longitude: typeof visit.gpsLongitude === 'number' ? visit.gpsLongitude : null,
      gps_accuracy_meters: typeof visit.gpsAccuracyMeters === 'number' ? Math.round(visit.gpsAccuracyMeters) : null,
      status: 'Completed',
      feedback: packMeta(visit.clientFeedbackNotes, {
        propertyId: visit.propertyId,
        propertyAddress: visit.propertyAddress,
        clientNationalId: visit.clientNationalId,
        gpsStatus: resolvedGpsStatus,
        gpsLatitude: visit.gpsLatitude,
        gpsLongitude: visit.gpsLongitude,
        gpsAccuracyMeters: visit.gpsAccuracyMeters,
        signatureSvgData: visit.signatureSvgData,
        signedOffline: visit.signedOffline,
        clientImpression: visit.clientImpression,
        counterOfferDzd: visit.counterOfferDzd,
        whatsappConfirmationSent: visit.whatsappConfirmationSent,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_visits', payload, {
      expectedVersion: visit.version,
      entityType: 'BonDeVisiteRecord',
      entityLabel: `${visit.clientFullName} — ${visit.propertyTitle}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchInspections(branchId: string, updatedAfter?: string | null): Promise<RealEstateInspection[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_inspections')
          .select(
            'id, account_id, business_id, branch_id, staff_id, lease_id, property_title, inspection_type, inspection_date, inspector_name, overall_condition, notes, validated_by, validated_at, is_locked, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): RealEstateInspection => {
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
          validatedBy: row.validated_by || meta.validatedBy || undefined,
          validatedAt: row.validated_at || meta.validatedAt || undefined,
          isLocked: Boolean(row.is_locked ?? meta.isLocked),
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertInspection(insp: RealEstateInspection): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: insp.accountId,
      businessId: insp.businessId,
      branchId: insp.branchId,
      staffId: insp.staffId,
    });
    const payload = {
      id: toValidUuid(insp.id),
      ...trace,
      lease_id: insp.leaseId ? toValidUuid(insp.leaseId) : null,
      property_title: insp.propertyTitle,
      inspection_type: toDbInspectionType(insp.inspectionType || insp.type),
      inspection_date: insp.inspectionDate || new Date().toISOString().split('T')[0],
      inspector_name: insp.inspectorName || null,
      checklist: insp.meterReadings ? [insp.meterReadings] : [],
      overall_condition: insp.generalCondition || 'Good',
      validated_by: insp.validatedBy ? toValidUuid(insp.validatedBy) : null,
      validated_at: insp.validatedAt || null,
      is_locked: Boolean(insp.isLocked),
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
        validatedBy: insp.validatedBy,
        validatedAt: insp.validatedAt,
        isLocked: Boolean(insp.isLocked),
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_inspections', payload, {
      expectedVersion: insp.version,
      entityType: 'RealEstateInspection',
      entityLabel: insp.propertyTitle,
      localData: payload,
    });
    return res.success;
  },

  async fetchBuyerDemands(branchId: string, updatedAfter?: string | null): Promise<BuyerDemandProfile[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_leads')
          .select(
            'id, account_id, business_id, branch_id, staff_id, full_name, phone, preferred_wilaya, interest_type, budget_dzd, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): BuyerDemandProfile => {
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
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBuyerDemand(demand: BuyerDemandProfile): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: demand.accountId,
      businessId: demand.businessId,
      branchId: demand.branchId,
      staffId: demand.staffId,
    });
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_leads', payload, {
      expectedVersion: demand.version,
      entityType: 'BuyerDemandProfile',
      entityLabel: demand.clientFullName,
      localData: payload,
    });
    return res.success;
  },

  async deleteMandate(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('re_mandates', id, deletedByStaffId);
    return res.success;
  },

  async deleteLease(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('re_leases', id, deletedByStaffId);
    return res.success;
  },

  async deleteQuittance(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('re_rent_schedules', id, deletedByStaffId);
    return res.success;
  },

  async deleteBonDeVisite(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('re_visits', id, deletedByStaffId);
    return res.success;
  },

  async deleteInspection(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('re_inspections', id, deletedByStaffId);
    return res.success;
  },

  async deleteBuyerDemand(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('re_leads', id, deletedByStaffId);
    return res.success;
  },

  async fetchSaleDeals(branchId: string, updatedAfter?: string | null): Promise<RealEstateSaleDeal[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_sales')
          .select(
            'id, account_id, business_id, branch_id, staff_id, deal_number, property_id, property_title, mandate_id, buyer_name, buyer_phone, seller_name, notary_name, sale_price_dzd, deposit_paid_dzd, commission_ht_dzd, commission_tva_dzd, commission_ttc_dzd, primary_agent_staff_id, secondary_agent_staff_id, primary_split_bps, secondary_split_bps, stage, closing_date, closing_checklist, unified_document_id, unified_payment_id, journal_entry_id, notes, version, created_at, updated_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map((row: any): RealEstateSaleDeal => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          dealNumber: row.deal_number || `DEAL-${String(row.id).slice(0, 8).toUpperCase()}`,
          propertyId: row.property_id || '',
          propertyTitle: row.property_title || '',
          mandateId: row.mandate_id || undefined,
          buyerName: row.buyer_name || '',
          buyerPhone: row.buyer_phone || undefined,
          sellerName: row.seller_name || '',
          notaryName: row.notary_name || undefined,
          salePriceDzd: Number(row.sale_price_dzd || 0),
          depositPaidDzd: Number(row.deposit_paid_dzd || 0),
          commissionHtDzd: Number(row.commission_ht_dzd || 0),
          commissionTvaDzd: Number(row.commission_tva_dzd || 0),
          commissionTtcDzd: Number(row.commission_ttc_dzd || 0),
          primaryAgentStaffId: row.primary_agent_staff_id || undefined,
          secondaryAgentStaffId: row.secondary_agent_staff_id || undefined,
          primarySplitBps: Number(row.primary_split_bps ?? 10000),
          secondarySplitBps: Number(row.secondary_split_bps ?? 0),
          stage: (row.stage || 'Offer') as RealEstateSaleDeal['stage'],
          closingDate: row.closing_date || undefined,
          closingChecklist: {
            livretFoncierVerified: Boolean(row.closing_checklist?.livretFoncierVerified),
            certificatNegatifValid: Boolean(row.closing_checklist?.certificatNegatifValid),
            quitusFiscalCleared: Boolean(row.closing_checklist?.quitusFiscalCleared),
            mainleveeBankCleared: Boolean(row.closing_checklist?.mainleveeBankCleared),
            notaryActSigned: Boolean(row.closing_checklist?.notaryActSigned),
          },
          unifiedDocumentId: row.unified_document_id || undefined,
          unifiedPaymentId: row.unified_payment_id || undefined,
          journalEntryId: row.journal_entry_id || undefined,
          notes: plain || meta.notes || undefined,
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertSaleDeal(deal: RealEstateSaleDeal): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: deal.accountId,
      businessId: deal.businessId,
      branchId: deal.branchId,
      staffId: deal.staffId,
    });
    const payload = {
      id: toValidUuid(deal.id),
      ...trace,
      deal_number: deal.dealNumber,
      property_id: deal.propertyId ? toValidUuid(deal.propertyId) : null,
      property_title: deal.propertyTitle,
      mandate_id: deal.mandateId ? toValidUuid(deal.mandateId) : null,
      buyer_name: deal.buyerName,
      buyer_phone: deal.buyerPhone || null,
      seller_name: deal.sellerName,
      notary_name: deal.notaryName || null,
      sale_price_dzd: Number(deal.salePriceDzd || 0),
      deposit_paid_dzd: Number(deal.depositPaidDzd || 0),
      commission_ht_dzd: Number(deal.commissionHtDzd || 0),
      commission_tva_dzd: Number(deal.commissionTvaDzd || 0),
      commission_ttc_dzd: Number(deal.commissionTtcDzd || 0),
      primary_agent_staff_id: deal.primaryAgentStaffId ? toValidUuid(deal.primaryAgentStaffId) : null,
      secondary_agent_staff_id: deal.secondaryAgentStaffId ? toValidUuid(deal.secondaryAgentStaffId) : null,
      primary_split_bps: Number(deal.primarySplitBps ?? 10000),
      secondary_split_bps: Number(deal.secondarySplitBps ?? 0),
      stage: deal.stage,
      closing_date: deal.closingDate || null,
      closing_checklist: deal.closingChecklist || {},
      unified_document_id: deal.unifiedDocumentId ? toValidUuid(deal.unifiedDocumentId) : null,
      unified_payment_id: deal.unifiedPaymentId ? toValidUuid(deal.unifiedPaymentId) : null,
      journal_entry_id: deal.journalEntryId ? toValidUuid(deal.journalEntryId) : null,
      notes: deal.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_sales', payload, {
      expectedVersion: deal.version,
      entityType: 'RealEstateSaleDeal',
      entityLabel: deal.dealNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchOwnerLedger(branchId: string, updatedAfter?: string | null): Promise<RealEstateOwnerLedgerEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_owner_ledger')
          .select(
            'id, account_id, business_id, branch_id, staff_id, lease_id, property_id, owner_name, property_title, entry_type, amount_dzd, entry_date, reference, unified_payment_id, journal_entry_id, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('entry_date', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map((row: any): RealEstateOwnerLedgerEntry => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        leaseId: row.lease_id || undefined,
        propertyId: row.property_id || undefined,
        ownerName: row.owner_name,
        propertyTitle: row.property_title,
        entryType: row.entry_type,
        amountDzd: Number(row.amount_dzd || 0),
        entryDate: row.entry_date,
        reference: row.reference || undefined,
        unifiedPaymentId: row.unified_payment_id || undefined,
        journalEntryId: row.journal_entry_id || undefined,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertOwnerLedgerEntry(entry: RealEstateOwnerLedgerEntry): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      lease_id: entry.leaseId ? toValidUuid(entry.leaseId) : null,
      property_id: entry.propertyId ? toValidUuid(entry.propertyId) : null,
      owner_name: entry.ownerName,
      property_title: entry.propertyTitle,
      entry_type: entry.entryType,
      amount_dzd: Number(entry.amountDzd || 0),
      entry_date: entry.entryDate,
      reference: entry.reference || null,
      unified_payment_id: entry.unifiedPaymentId ? toValidUuid(entry.unifiedPaymentId) : null,
      journal_entry_id: entry.journalEntryId ? toValidUuid(entry.journalEntryId) : null,
      notes: entry.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_owner_ledger', payload, {
      expectedVersion: entry.version,
      entityType: 'RealEstateOwnerLedgerEntry',
      entityLabel: `${entry.ownerName} — ${entry.entryType}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchMaintenanceTickets(branchId: string, updatedAfter?: string | null): Promise<RealEstateMaintenanceTicket[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_maintenance_tickets')
          .select(
            'id, account_id, business_id, branch_id, staff_id, ticket_number, property_id, property_title, lease_id, owner_name, tenant_name, category, priority, title, description, vendor_name, vendor_phone, estimated_cost_dzd, actual_cost_dzd, charge_target, owner_ledger_entry_id, status, reported_at, resolved_at, version, created_at, updated_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map((row: any): RealEstateMaintenanceTicket => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        ticketNumber: row.ticket_number,
        propertyId: row.property_id || '',
        propertyTitle: row.property_title,
        leaseId: row.lease_id || undefined,
        ownerName: row.owner_name,
        tenantName: row.tenant_name || undefined,
        category: row.category,
        priority: row.priority,
        title: row.title,
        description: row.description || undefined,
        vendorName: row.vendor_name || undefined,
        vendorPhone: row.vendor_phone || undefined,
        estimatedCostDzd: Number(row.estimated_cost_dzd || 0),
        actualCostDzd: Number(row.actual_cost_dzd || 0),
        chargeTarget: row.charge_target,
        ownerLedgerEntryId: row.owner_ledger_entry_id || undefined,
        status: row.status,
        reportedAt: row.reported_at,
        resolvedAt: row.resolved_at || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertMaintenanceTicket(ticket: RealEstateMaintenanceTicket): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ticket.accountId,
      businessId: ticket.businessId,
      branchId: ticket.branchId,
      staffId: ticket.staffId,
    });
    const payload = {
      id: toValidUuid(ticket.id),
      ...trace,
      ticket_number: ticket.ticketNumber,
      property_id: ticket.propertyId ? toValidUuid(ticket.propertyId) : null,
      property_title: ticket.propertyTitle,
      lease_id: ticket.leaseId ? toValidUuid(ticket.leaseId) : null,
      owner_name: ticket.ownerName,
      tenant_name: ticket.tenantName || null,
      category: ticket.category,
      priority: ticket.priority,
      title: ticket.title,
      description: ticket.description || null,
      vendor_name: ticket.vendorName || null,
      vendor_phone: ticket.vendorPhone || null,
      estimated_cost_dzd: Number(ticket.estimatedCostDzd || 0),
      actual_cost_dzd: Number(ticket.actualCostDzd || 0),
      charge_target: ticket.chargeTarget,
      owner_ledger_entry_id: ticket.ownerLedgerEntryId ? toValidUuid(ticket.ownerLedgerEntryId) : null,
      status: ticket.status,
      reported_at: ticket.reportedAt,
      resolved_at: ticket.resolvedAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_maintenance_tickets', payload, {
      expectedVersion: ticket.version,
      entityType: 'RealEstateMaintenanceTicket',
      entityLabel: ticket.ticketNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchAgentCommissions(branchId: string, updatedAfter?: string | null): Promise<RealEstateAgentCommission[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('re_agent_commissions')
          .select(
            'id, account_id, business_id, branch_id, staff_id, agent_staff_id, agent_name, role_type, source_type, source_id, reference_number, period_month, gross_commission_centimes, split_bps, agent_share_centimes, status, payroll_run_id, version, created_at, updated_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map((row: any): RealEstateAgentCommission => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        agentStaffId: row.agent_staff_id,
        agentName: row.agent_name,
        roleType: row.role_type,
        sourceType: row.source_type,
        sourceId: row.source_id || undefined,
        referenceNumber: row.reference_number,
        periodMonth: row.period_month,
        grossCommissionCentimes: Number(row.gross_commission_centimes || 0),
        splitBps: Number(row.split_bps || 10000),
        agentShareCentimes: Number(row.agent_share_centimes || 0),
        agentShareDzd: Math.round(Number(row.agent_share_centimes || 0)) / 100,
        status: row.status,
        payrollRunId: row.payroll_run_id || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertAgentCommission(comm: RealEstateAgentCommission): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: comm.accountId,
      businessId: comm.businessId,
      branchId: comm.branchId,
      staffId: comm.agentStaffId,
    });
    const payload = {
      id: toValidUuid(comm.id),
      ...trace,
      agent_staff_id: toValidUuid(comm.agentStaffId),
      agent_name: comm.agentName,
      role_type: comm.roleType,
      source_type: comm.sourceType,
      source_id: comm.sourceId ? toValidUuid(comm.sourceId) : null,
      reference_number: comm.referenceNumber,
      period_month: comm.periodMonth,
      gross_commission_centimes: Math.round(Number(comm.grossCommissionCentimes || 0)),
      split_bps: Math.round(Number(comm.splitBps || 10000)),
      agent_share_centimes: Math.round(Number(comm.agentShareCentimes || 0)),
      status: comm.status,
      payroll_run_id: comm.payrollRunId ? toValidUuid(comm.payrollRunId) : null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_agent_commissions', payload, {
      expectedVersion: comm.version,
      entityType: 'RealEstateAgentCommission',
      entityLabel: `${comm.agentName} — ${comm.referenceNumber}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchSyndicBuildings(branchId: string): Promise<SyndicBuilding[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('re_syndic_buildings')
          .select('id, account_id, business_id, branch_id, staff_id, building_code, name, address, wilaya, total_lots, total_tantiemes, reserve_fund_dzd, manager_name, notes, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): SyndicBuilding => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        buildingCode: row.building_code,
        name: row.name,
        address: row.address,
        wilaya: row.wilaya || '16 Alger',
        totalLots: Number(row.total_lots || 1),
        totalTantiemes: Number(row.total_tantiemes || 1000),
        reserveFundDzd: Number(row.reserve_fund_dzd || 0),
        managerName: row.manager_name || undefined,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertSyndicBuilding(b: SyndicBuilding): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: b.accountId,
      businessId: b.businessId,
      branchId: b.branchId,
      staffId: b.staffId,
    });
    const payload = {
      id: toValidUuid(b.id),
      ...trace,
      building_code: b.buildingCode,
      name: b.name,
      address: b.address,
      wilaya: b.wilaya || '16 Alger',
      total_lots: Number(b.totalLots || 1),
      total_tantiemes: Number(b.totalTantiemes || 1000),
      reserve_fund_dzd: Number(b.reserveFundDzd || 0),
      manager_name: b.managerName || null,
      notes: b.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_syndic_buildings', payload, {
      expectedVersion: b.version,
      entityType: 'SyndicBuilding',
      entityLabel: b.name,
      localData: payload,
    });
    return res.success;
  },

  async fetchSyndicFundCalls(branchId: string): Promise<SyndicFundCall[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('re_syndic_fund_calls')
          .select('id, account_id, business_id, branch_id, staff_id, building_id, building_name, call_number, quarter_label, due_date, total_budget_dzd, total_tantiemes, allocations, collected_dzd, status, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): SyndicFundCall => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        buildingId: row.building_id,
        buildingName: row.building_name,
        callNumber: row.call_number,
        quarterLabel: row.quarter_label,
        dueDate: row.due_date,
        totalBudgetDzd: Number(row.total_budget_dzd || 0),
        totalTantiemes: Number(row.total_tantiemes || 1000),
        allocations: Array.isArray(row.allocations) ? row.allocations : [],
        collectedDzd: Number(row.collected_dzd || 0),
        status: row.status,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertSyndicFundCall(call: SyndicFundCall): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: call.accountId,
      businessId: call.businessId,
      branchId: call.branchId,
      staffId: call.staffId,
    });
    const payload = {
      id: toValidUuid(call.id),
      ...trace,
      building_id: toValidUuid(call.buildingId),
      building_name: call.buildingName,
      call_number: call.callNumber,
      quarter_label: call.quarterLabel,
      due_date: call.dueDate,
      total_budget_dzd: Number(call.totalBudgetDzd || 0),
      total_tantiemes: Number(call.totalTantiemes || 1000),
      allocations: call.allocations || [],
      collected_dzd: Number(call.collectedDzd || 0),
      status: call.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_syndic_fund_calls', payload, {
      expectedVersion: call.version,
      entityType: 'SyndicFundCall',
      entityLabel: call.callNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchSyndicAssemblies(branchId: string): Promise<SyndicAssembly[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('re_syndic_assemblies')
          .select('id, account_id, business_id, branch_id, staff_id, building_id, building_name, title, assembly_type, meeting_date, present_tantiemes, represented_tantiemes, total_tantiemes, quorum_percent, quorum_reached, resolutions_summary, status, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('meeting_date', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): SyndicAssembly => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        buildingId: row.building_id,
        buildingName: row.building_name,
        title: row.title,
        assemblyType: row.assembly_type,
        meetingDate: row.meeting_date,
        presentTantiemes: Number(row.present_tantiemes || 0),
        representedTantiemes: Number(row.represented_tantiemes || 0),
        totalTantiemes: Number(row.total_tantiemes || 1000),
        quorumPercent: Number(row.quorum_percent || 0),
        quorumReached: Boolean(row.quorum_reached),
        resolutionsSummary: row.resolutions_summary || undefined,
        status: row.status,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertSyndicAssembly(a: SyndicAssembly): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: a.accountId,
      businessId: a.businessId,
      branchId: a.branchId,
      staffId: a.staffId,
    });
    const payload = {
      id: toValidUuid(a.id),
      ...trace,
      building_id: toValidUuid(a.buildingId),
      building_name: a.buildingName,
      title: a.title,
      assembly_type: a.assemblyType,
      meeting_date: a.meetingDate,
      present_tantiemes: Number(a.presentTantiemes || 0),
      represented_tantiemes: Number(a.representedTantiemes || 0),
      total_tantiemes: Number(a.totalTantiemes || 1000),
      quorum_percent: Number(a.quorumPercent || 0),
      quorum_reached: Boolean(a.quorumReached),
      resolutions_summary: a.resolutionsSummary || null,
      status: a.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_syndic_assemblies', payload, {
      expectedVersion: a.version,
      entityType: 'SyndicAssembly',
      entityLabel: a.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchDevPrograms(branchId: string): Promise<DevProgram[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('re_dev_programs')
          .select('id, account_id, business_id, branch_id, staff_id, program_code, name, wilaya, commune, promoter_name, fgci_guarantee_ref, delivery_quarter, total_units, status, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): DevProgram => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        programCode: row.program_code,
        name: row.name,
        wilaya: row.wilaya,
        commune: row.commune || undefined,
        promoterName: row.promoter_name,
        fgciGuaranteeRef: row.fgci_guarantee_ref || undefined,
        deliveryQuarter: row.delivery_quarter,
        totalUnits: Number(row.total_units || 1),
        status: row.status,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertDevProgram(p: DevProgram): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: p.accountId,
      businessId: p.businessId,
      branchId: p.branchId,
      staffId: p.staffId,
    });
    const payload = {
      id: toValidUuid(p.id),
      ...trace,
      program_code: p.programCode,
      name: p.name,
      wilaya: p.wilaya,
      commune: p.commune || null,
      promoter_name: p.promoterName,
      fgci_guarantee_ref: p.fgciGuaranteeRef || null,
      delivery_quarter: p.deliveryQuarter,
      total_units: Number(p.totalUnits || 1),
      status: p.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_dev_programs', payload, {
      expectedVersion: p.version,
      entityType: 'DevProgram',
      entityLabel: p.name,
      localData: payload,
    });
    return res.success;
  },

  async fetchDevLots(branchId: string): Promise<DevLot[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('re_dev_lots')
          .select('id, account_id, business_id, branch_id, staff_id, program_id, program_name, lot_code, typology, floor_number, surface_m2, price_dzd, buyer_name, buyer_phone, milestones, paid_total_dzd, status, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): DevLot => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        programId: row.program_id,
        programName: row.program_name,
        lotCode: row.lot_code,
        typology: row.typology,
        floorNumber: Number(row.floor_number || 1),
        surfaceM2: Number(row.surface_m2 || 0),
        priceDzd: Number(row.price_dzd || 0),
        buyerName: row.buyer_name || undefined,
        buyerPhone: row.buyer_phone || undefined,
        milestones: Array.isArray(row.milestones) ? row.milestones : [],
        paidTotalDzd: Number(row.paid_total_dzd || 0),
        status: row.status,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertDevLot(lot: DevLot): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: lot.accountId,
      businessId: lot.businessId,
      branchId: lot.branchId,
      staffId: lot.staffId,
    });
    const payload = {
      id: toValidUuid(lot.id),
      ...trace,
      program_id: toValidUuid(lot.programId),
      program_name: lot.programName,
      lot_code: lot.lotCode,
      typology: lot.typology,
      floor_number: Number(lot.floorNumber || 1),
      surface_m2: Number(lot.surfaceM2 || 0),
      price_dzd: Number(lot.priceDzd || 0),
      buyer_name: lot.buyerName || null,
      buyer_phone: lot.buyerPhone || null,
      milestones: lot.milestones || [],
      paid_total_dzd: Number(lot.paidTotalDzd || 0),
      status: lot.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_dev_lots', payload, {
      expectedVersion: lot.version,
      entityType: 'DevLot',
      entityLabel: lot.lotCode,
      localData: payload,
    });
    return res.success;
  },

  async fetchStudentBeds(branchId: string): Promise<StudentHousingBed[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('re_student_beds')
          .select('id, account_id, business_id, branch_id, staff_id, residence_name, room_code, bed_code, semester_label, monthly_rate_dzd, semester_deposit_dzd, deposit_paid, student_name, student_phone, university_name, check_in_date, check_out_date, status, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): StudentHousingBed => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        residenceName: row.residence_name,
        roomCode: row.room_code,
        bedCode: row.bed_code,
        semesterLabel: row.semester_label,
        monthlyRateDzd: Number(row.monthly_rate_dzd || 0),
        semesterDepositDzd: Number(row.semester_deposit_dzd || 0),
        depositPaid: Boolean(row.deposit_paid),
        studentName: row.student_name || undefined,
        studentPhone: row.student_phone || undefined,
        universityName: row.university_name || undefined,
        checkInDate: row.check_in_date || undefined,
        checkOutDate: row.check_out_date || undefined,
        status: row.status,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertStudentBed(bed: StudentHousingBed): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: bed.accountId,
      businessId: bed.businessId,
      branchId: bed.branchId,
      staffId: bed.staffId,
    });
    const payload = {
      id: toValidUuid(bed.id),
      ...trace,
      residence_name: bed.residenceName,
      room_code: bed.roomCode,
      bed_code: bed.bedCode,
      semester_label: bed.semesterLabel,
      monthly_rate_dzd: Number(bed.monthlyRateDzd || 0),
      semester_deposit_dzd: Number(bed.semesterDepositDzd || 0),
      deposit_paid: Boolean(bed.depositPaid),
      student_name: bed.studentName || null,
      student_phone: bed.studentPhone || null,
      university_name: bed.universityName || null,
      check_in_date: bed.checkInDate || null,
      check_out_date: bed.checkOutDate || null,
      status: bed.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_student_beds', payload, {
      expectedVersion: bed.version,
      entityType: 'StudentHousingBed',
      entityLabel: `${bed.roomCode}/${bed.bedCode}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchVacationStays(branchId: string): Promise<VacationRentalStay[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('re_vacation_stays')
          .select('id, account_id, business_id, branch_id, staff_id, stay_code, property_id, property_title, guest_name, guest_phone, check_in_date, check_out_date, nights_count, nightly_rate_dzd, cleaning_fee_dzd, total_amount_dzd, deposit_dzd, cleaning_status, status, notes, version, created_at, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('check_in_date', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): VacationRentalStay => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        stayCode: row.stay_code,
        propertyId: row.property_id,
        propertyTitle: row.property_title,
        guestName: row.guest_name,
        guestPhone: row.guest_phone,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        nightsCount: Number(row.nights_count || 1),
        nightlyRateDzd: Number(row.nightly_rate_dzd || 0),
        cleaningFeeDzd: Number(row.cleaning_fee_dzd || 0),
        totalAmountDzd: Number(row.total_amount_dzd || 0),
        depositDzd: Number(row.deposit_dzd || 0),
        cleaningStatus: row.cleaning_status,
        status: row.status,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertVacationStay(stay: VacationRentalStay): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: stay.accountId,
      businessId: stay.businessId,
      branchId: stay.branchId,
      staffId: stay.staffId,
    });
    const payload = {
      id: toValidUuid(stay.id),
      ...trace,
      stay_code: stay.stayCode,
      property_id: toValidUuid(stay.propertyId),
      property_title: stay.propertyTitle,
      guest_name: stay.guestName,
      guest_phone: stay.guestPhone,
      check_in_date: stay.checkInDate,
      check_out_date: stay.checkOutDate,
      nights_count: Number(stay.nightsCount || 1),
      nightly_rate_dzd: Number(stay.nightlyRateDzd || 0),
      cleaning_fee_dzd: Number(stay.cleaningFeeDzd || 0),
      total_amount_dzd: Number(stay.totalAmountDzd || 0),
      deposit_dzd: Number(stay.depositDzd || 0),
      cleaning_status: stay.cleaningStatus,
      status: stay.status,
      notes: stay.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('re_vacation_stays', payload, {
      expectedVersion: stay.version,
      entityType: 'VacationRentalStay',
      entityLabel: stay.stayCode,
      localData: payload,
    });
    return res.success;
  },

  async recordPartialRentPaymentRpc(params: {
    scheduleId: string;
    paymentDzd: number;
    paymentMethod: string;
    timbreFiscalDzd: number;
    quittanceNumber?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('re_record_partial_rent_payment', {
      p_schedule_id: toValidUuid(params.scheduleId),
      p_payment_dzd: params.paymentDzd,
      p_payment_method: params.paymentMethod,
      p_timbre_fiscal_dzd: params.timbreFiscalDzd,
      p_quittance_number: params.quittanceNumber || null,
    });
    return res.success;
  },

  async applyLeaseIndexationRpc(params: {
    leaseId: string;
    ratePercent: number;
    asOfDate?: string;
    note?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('re_apply_lease_indexation', {
      p_lease_id: toValidUuid(params.leaseId),
      p_rate_percent: params.ratePercent,
      p_as_of_date: params.asOfDate || new Date().toISOString().slice(0, 10),
      p_note: params.note || null,
    });
    return res.success;
  },
};

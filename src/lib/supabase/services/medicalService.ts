import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, normalizeUuidOrNull, syncCoordinator } from '../syncCoordinator';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import type { NgapActDefinition } from '../../../utils/medicalDepth';
import type {
  MedicalPractitioner,
  DoctorOrdonnanceConfig,
  MedicalPatient,
  MedicalAppointmentSlot,
  MedicalConsultation,
  MedicalPrescription,
  MedicalLabRecord,
  MedicalCertificateRecord,
  ChifaClaimRecord,
  ClinicConsumableItem,
  MedicalConsumableLot,
  MedicalChifaBordereau,
  MedicalDoctorPayout,
  DailyCashClosure,
} from '../../../types/index';

export interface MedicalBranchContext {
  accountId?: string;
  businessId?: string;
  branchId: string;
  staffId?: string;
}

type DbMedicalAppointmentStatus = 'Scheduled' | 'WaitingRoom' | 'InConsultation' | 'Completed' | 'Cancelled';

function mapAppointmentStatusToDb(status: MedicalAppointmentSlot['status']): DbMedicalAppointmentStatus {
  switch (status) {
    case 'Arrived':
      return 'WaitingRoom';
    case 'InRoom':
      return 'InConsultation';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
    case 'NoShow':
      return 'Cancelled';
    case 'Booked':
    default:
      return 'Scheduled';
  }
}

function mapAppointmentStatusFromDb(
  status: string,
  metaStatus?: MedicalAppointmentSlot['status']
): MedicalAppointmentSlot['status'] {
  if (metaStatus) return metaStatus;
  switch (status) {
    case 'WaitingRoom':
      return 'Arrived';
    case 'InConsultation':
      return 'InRoom';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
      return 'Cancelled';
    case 'Scheduled':
    default:
      return 'Booked';
  }
}

const META_PREFIX = '__atrium_med__:';

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

export const medicalService = {
  async fetchPractitioners(branchId: string, updatedAfter?: string | null): Promise<MedicalPractitioner[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_staff')
          .select(
            'id, full_name, specialty, cnom_license, is_active, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('full_name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): MedicalPractitioner => {
        const { plain: licenseNumber, meta } = unpackMeta(row.cnom_license);
        return {
          id: row.id,
          fullName: row.full_name,
          specialty: row.specialty || 'Médecine Générale',
          department: meta.department || 'Médecine Générale',
          licenseNumber: licenseNumber || '',
          roomNumber: meta.roomNumber || 'Cabinet 1',
          phone: meta.phone || '',
          email: meta.email || undefined,
          commissionRatePercent: Number(meta.commissionRatePercent ?? 70),
          color: meta.color || '#0D9488',
          isAvailable: row.is_active ?? true,
          avatarUrl: meta.avatarUrl || undefined,
          version: row.version != null ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPractitioner(doc: MedicalPractitioner, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(doc.id),
      ...trace,
      full_name: doc.fullName,
      specialty: doc.specialty,
      cnom_license: packMeta(doc.licenseNumber, {
        department: doc.department,
        roomNumber: doc.roomNumber,
        phone: doc.phone,
        email: doc.email,
        commissionRatePercent: doc.commissionRatePercent,
        color: doc.color,
        avatarUrl: doc.avatarUrl,
      }),
      is_active: doc.isAvailable ?? true,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_staff', payload, {
      expectedVersion: doc.version,
      entityType: 'MedicalPractitioner',
      entityLabel: doc.fullName,
      localData: payload,
    });
    return res.success;
  },

  async deletePractitioner(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_staff', id, deletedByStaffId);
    return res.success;
  },

  async fetchOrdonnanceConfigs(branchId: string): Promise<Record<string, DoctorOrdonnanceConfig>> {
    const client = getSupabaseClient();
    if (!client) return {};

    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('medical_departments')
          .select('id, head_doctor_name, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('code', 'ORDCFG:%')
          .order('id', { ascending: true })
          .range(from, to)
      );

      const configs: Record<string, DoctorOrdonnanceConfig> = {};
      data.forEach((row: any) => {
        const { meta } = unpackMeta(row.head_doctor_name);
        if (meta.config && meta.config.doctorId) {
          configs[meta.config.doctorId] = {
            ...(meta.config as DoctorOrdonnanceConfig),
            version: row.version != null ? Number(row.version) : (meta.config as DoctorOrdonnanceConfig).version,
          };
        }
      });
      return configs;
    } catch {
      return {};
    }
  },

  async upsertOrdonnanceConfig(config: DoctorOrdonnanceConfig, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(`ordcfg_${ctx.branchId}_${config.doctorId}`),
      ...trace,
      name: `Ordonnance Config — ${config.doctorName}`,
      code: `ORDCFG:${config.doctorId}`,
      head_doctor_name: packMeta(config.doctorName, { config }),
      room_count: 1,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_departments', payload, {
      expectedVersion: config.version,
      entityType: 'DoctorOrdonnanceConfig',
      entityLabel: config.doctorName,
      localData: payload,
    });
    return res.success;
  },

  async fetchPatients(branchId: string, updatedAfter?: string | null): Promise<MedicalPatient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_patients')
          .select(
            'id, account_id, business_id, branch_id, staff_id, full_name, phone, gender, birth_date, blood_group, allergies, chronic_conditions, chifa_card_number, crm_party_id, national_id, social_security_number, has_chifa_100_percent_ald, emergency_contact, emergency_phone, vitals_history, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): MedicalPatient => {
        const { plain, meta } = unpackMeta(row.notes);
        const allergies = meta.allergies
          ? meta.allergies
          : row.allergies
          ? String(row.allergies).split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];
        const chronicConditions = meta.chronicConditions
          ? meta.chronicConditions
          : row.chronic_conditions
          ? String(row.chronic_conditions).split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];
        const vitalsHistory =
          Array.isArray(row.vitals_history) && row.vitals_history.length > 0
            ? row.vitals_history
            : Array.isArray(meta.vitalsHistory)
            ? meta.vitalsHistory
            : [];

        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          fullName: row.full_name,
          nationalId: row.national_id || meta.nationalId || undefined,
          phone: row.phone || '',
          gender: (row.gender === 'Male' ? 'Male' : 'Female'),
          dateOfBirth: row.birth_date || '1990-01-01',
          bloodGroup: row.blood_group || undefined,
          allergies,
          chronicConditions,
          chifaCardNumber: row.chifa_card_number || undefined,
          socialSecurityNumber: row.social_security_number || meta.socialSecurityNumber || undefined,
          hasChifa100PercentAld: Boolean(row.has_chifa_100_percent_ald ?? meta.hasChifa100PercentAld),
          emergencyContact: row.emergency_contact || undefined,
          emergencyPhone: row.emergency_phone || meta.emergencyPhone || undefined,
          crmPartyId: row.crm_party_id || meta.crmPartyId || undefined,
          notes: plain || undefined,
          vitalsHistory,
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPatient(patient: MedicalPatient): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: patient.accountId,
      businessId: patient.businessId,
      branchId: patient.branchId,
      staffId: patient.staffId,
    });
    const payload = {
      id: toValidUuid(patient.id),
      ...trace,
      file_number: patient.id.slice(0, 12).toUpperCase(),
      full_name: patient.fullName,
      birth_date: patient.dateOfBirth || null,
      gender: patient.gender || 'Female',
      blood_group: patient.bloodGroup || null,
      phone: patient.phone || null,
      chifa_card_number: patient.chifaCardNumber || null,
      crm_party_id: patient.crmPartyId ? normalizeUuidOrNull(patient.crmPartyId) : null,
      national_id: patient.nationalId || null,
      social_security_number: patient.socialSecurityNumber || null,
      has_chifa_100_percent_ald: Boolean(patient.hasChifa100PercentAld),
      allergies: (patient.allergies || []).join(', ') || null,
      chronic_conditions: (patient.chronicConditions || []).join(', ') || null,
      emergency_contact: patient.emergencyContact || null,
      emergency_phone: patient.emergencyPhone || null,
      vitals_history: patient.vitalsHistory || [],
      notes: packMeta(patient.notes, {
        crmPartyId: patient.crmPartyId,
        nationalId: patient.nationalId,
        socialSecurityNumber: patient.socialSecurityNumber,
        hasChifa100PercentAld: patient.hasChifa100PercentAld,
        emergencyPhone: patient.emergencyPhone,
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
        vitalsHistory: patient.vitalsHistory || [],
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_patients', payload, {
      expectedVersion: patient.version,
      entityType: 'MedicalPatient',
      entityLabel: patient.fullName,
      localData: payload,
    });
    return res.success;
  },

  async deletePatient(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_patients', id, deletedByStaffId);
    return res.success;
  },

  async fetchAppointments(branchId: string, updatedAfter?: string | null): Promise<MedicalAppointmentSlot[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_appointments')
          .select(
            'id, doctor_id, doctor_name, patient_id, patient_name, patient_phone, appointment_date, start_time, duration_minutes, reason, status, triage_priority, is_emergency_bypass, emergency_bypass_reason, notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('appointment_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): MedicalAppointmentSlot => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          doctorId: meta.doctorId || row.doctor_id || '',
          doctorName: row.doctor_name,
          patientId: row.patient_id || undefined,
          patientName: row.patient_name,
          patientPhone: row.patient_phone || undefined,
          date: row.appointment_date,
          startTime: row.start_time,
          durationMinutes: Number(row.duration_minutes || 30),
          reason: row.reason || '',
          status: mapAppointmentStatusFromDb(row.status, meta.uiStatus),
          urgency: row.triage_priority === 'Urgent' || row.triage_priority === 'Emergency' ? 'Prioritaire' : 'Normal',
          isEmergencyBypass: Boolean(row.is_emergency_bypass ?? meta.isEmergencyBypass),
          emergencyBypassReason: row.emergency_bypass_reason || meta.emergencyBypassReason || undefined,
          notes: plain || undefined,
          version: row.version != null ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertAppointment(appt: MedicalAppointmentSlot, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(appt.id),
      ...trace,
      patient_id: appt.patientId ? toValidUuid(appt.patientId) : null,
      patient_name: appt.patientName,
      patient_phone: appt.patientPhone || null,
      doctor_id: appt.doctorId ? normalizeUuidOrNull(appt.doctorId) : null,
      doctor_name: appt.doctorName,
      appointment_date: appt.date || new Date().toISOString().split('T')[0],
      start_time: appt.startTime || '09:00',
      duration_minutes: Number(appt.durationMinutes || 30),
      reason: appt.reason || null,
      triage_priority: appt.isEmergencyBypass ? 'Emergency' : appt.urgency === 'Prioritaire' ? 'Urgent' : 'Normal',
      status: mapAppointmentStatusToDb(appt.status),
      is_emergency_bypass: Boolean(appt.isEmergencyBypass),
      emergency_bypass_reason: appt.isEmergencyBypass ? appt.emergencyBypassReason || null : null,
      notes: packMeta(appt.notes, {
        doctorId: appt.doctorId,
        uiStatus: appt.status,
        isEmergencyBypass: appt.isEmergencyBypass,
        emergencyBypassReason: appt.emergencyBypassReason,
      }),
    };
    const res = await syncCoordinator.rpcOrQueue(
      'medical_upsert_appointment_atomic',
      { p_payload: payload },
      {
        table: 'medical_appointments',
        recordId: payload.id,
        expectedVersion: appt.version,
        entityType: 'MedicalAppointment',
        entityLabel: `${appt.patientName} — ${appt.doctorName}`,
        localData: payload,
      }
    );
    return res.success;
  },

  async deleteAppointment(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_appointments', id, deletedByStaffId);
    return res.success;
  },

  async fetchConsultations(branchId: string, updatedAfter?: string | null): Promise<MedicalConsultation[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_consultations')
          .select(
            'id, account_id, business_id, branch_id, staff_id, doctor_id, doctor_name, patient_id, patient_name, visit_date, chief_complaint, vitals, diagnosis, icd10_code, ngap_code, urgency_level, ticket_number, fee_centimes, copay_centimes, insurance_share_centimes, is_paid, payment_method, unified_document_id, journal_entry_id, notes, version, created_at'
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
        .filter((row: any) => !String(row.chief_complaint || '').startsWith('__'))
        .map((row: any): MedicalConsultation => {
          const { plain, meta } = unpackMeta(row.notes);
          const vitalsObj = row.vitals && typeof row.vitals === 'object' ? row.vitals : {};
          const feeDzd =
            row.fee_centimes != null && Number(row.fee_centimes) > 0
              ? centimesToDzd(Number(row.fee_centimes))
              : Number(meta.consultationFeeDzd ?? 2000);
          const copayDzd =
            row.copay_centimes != null
              ? centimesToDzd(Number(row.copay_centimes))
              : Number(meta.copayAmountDzd ?? feeDzd);
          const insuranceDzd =
            row.insurance_share_centimes != null
              ? centimesToDzd(Number(row.insurance_share_centimes))
              : Number(meta.insuranceShareDzd ?? 0);

          return {
            id: row.id,
            accountId: row.account_id,
            businessId: row.business_id,
            branchId: row.branch_id,
            staffId: meta.staffId || row.staff_id || row.doctor_id || 'staff_01',
            doctorName: row.doctor_name || undefined,
            doctorSpecialty: meta.doctorSpecialty || undefined,
            cabinetRoom: meta.cabinetRoom || undefined,
            patientId: row.patient_id || meta.patientId || '',
            patientName: row.patient_name,
            patientAge: meta.patientAge,
            consultationDate: row.visit_date || (row.created_at ? row.created_at.split('T')[0] : ''),
            chiefComplaint: row.chief_complaint || '',
            vitals: vitalsObj,
            clinicalExam: meta.clinicalExam || undefined,
            diagnosis: row.diagnosis || '',
            icdCode: row.icd10_code || undefined,
            treatmentPlan: meta.treatmentPlan || undefined,
            status: meta.status || 'InWaitingQueue',
            urgencyLevel: row.urgency_level || meta.urgencyLevel || 'Normal',
            ticketNumber: row.ticket_number || meta.ticketNumber || undefined,
            ngapCode: row.ngap_code || meta.ngapCode || 'C',
            consultationFeeDzd: feeDzd,
            copayAmountDzd: copayDzd,
            insuranceShareDzd: insuranceDzd,
            isPaid: Boolean(row.is_paid ?? meta.isPaid),
            paymentMethod: (row.payment_method || meta.paymentMethod || 'Cash') as MedicalConsultation['paymentMethod'],
            unifiedDocumentId: row.unified_document_id || meta.unifiedDocumentId || undefined,
            journalEntryId: row.journal_entry_id || meta.journalEntryId || undefined,
            notes: plain || undefined,
            version: row.version != null ? Number(row.version) : undefined,
            createdAt: row.created_at,
          };
        });
    } catch {
      return [];
    }
  },

  async upsertConsultation(con: MedicalConsultation): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: con.accountId,
      businessId: con.businessId,
      branchId: con.branchId,
      staffId: con.staffId,
    });
    const payload = {
      id: toValidUuid(con.id),
      ...trace,
      patient_id: con.patientId ? toValidUuid(con.patientId) : null,
      patient_name: con.patientName,
      doctor_id: con.staffId ? normalizeUuidOrNull(con.staffId) : null,
      doctor_name: con.doctorName || 'Médecin',
      visit_date: con.consultationDate || new Date().toISOString().split('T')[0],
      vitals: con.vitals || {},
      chief_complaint: con.chiefComplaint || '',
      diagnosis: con.diagnosis || '',
      icd10_code: con.icdCode || null,
      ngap_code: con.ngapCode || 'C',
      urgency_level: con.urgencyLevel || 'Normal',
      ticket_number: con.ticketNumber || null,
      fee_centimes: dzdToCentimes(Number(con.consultationFeeDzd || 0)),
      copay_centimes: dzdToCentimes(Number(con.copayAmountDzd || 0)),
      insurance_share_centimes: dzdToCentimes(Number(con.insuranceShareDzd || 0)),
      is_paid: Boolean(con.isPaid),
      payment_method: con.paymentMethod || 'Cash',
      unified_document_id: con.unifiedDocumentId ? normalizeUuidOrNull(con.unifiedDocumentId) : null,
      journal_entry_id: con.journalEntryId ? normalizeUuidOrNull(con.journalEntryId) : null,
      notes: packMeta(con.notes, {
        staffId: con.staffId,
        patientId: con.patientId,
        doctorSpecialty: con.doctorSpecialty,
        cabinetRoom: con.cabinetRoom,
        patientAge: con.patientAge,
        clinicalExam: con.clinicalExam,
        treatmentPlan: con.treatmentPlan,
        status: con.status,
        urgencyLevel: con.urgencyLevel,
        ticketNumber: con.ticketNumber,
        ngapCode: con.ngapCode,
        consultationFeeDzd: con.consultationFeeDzd,
        copayAmountDzd: con.copayAmountDzd,
        insuranceShareDzd: con.insuranceShareDzd,
        isPaid: con.isPaid,
        paymentMethod: con.paymentMethod,
        unifiedDocumentId: con.unifiedDocumentId,
        journalEntryId: con.journalEntryId,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', payload, {
      expectedVersion: con.version,
      entityType: 'MedicalConsultation',
      entityLabel: con.patientName,
      localData: payload,
    });
    return res.success;
  },

  async deleteConsultation(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_consultations', id, deletedByStaffId);
    return res.success;
  },

  async fetchPrescriptions(branchId: string, updatedAfter?: string | null): Promise<MedicalPrescription[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_consultations')
          .select(
            'id, account_id, business_id, branch_id, staff_id, doctor_name, patient_id, patient_name, visit_date, prescription_items, diagnosis, icd10_code, allergy_override_confirmed, allergy_override_reason, prescription_metadata, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('chief_complaint', '__rx__:%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): MedicalPrescription => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: meta.origId || row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || meta.staffId,
          doctorName: row.doctor_name,
          doctorSpecialty: meta.doctorSpecialty,
          prescribingDoctorId: meta.prescribingDoctorId,
          prescribingDoctorName: meta.prescribingDoctorName || row.doctor_name,
          consultationId: meta.consultationId,
          patientId: row.patient_id || meta.patientId || '',
          patientName: row.patient_name,
          patientAge: meta.patientAge,
          prescriptionDate: row.visit_date || (row.created_at ? row.created_at.split('T')[0] : ''),
          items: Array.isArray(row.prescription_items) ? row.prescription_items : [],
          qrCodeHash: row.diagnosis || '',
          isSigned: row.icd10_code === 'SIGNED',
          allergyOverrideConfirmed: Boolean(row.allergy_override_confirmed ?? meta.allergyOverrideConfirmed),
          allergyOverrideReason: row.allergy_override_reason || meta.allergyOverrideReason || undefined,
          doctorConfig: meta.doctorConfig,
          notes: plain || undefined,
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPrescription(rx: MedicalPrescription, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: rx.accountId || ctx.accountId,
      businessId: rx.businessId || ctx.businessId,
      branchId: rx.branchId || ctx.branchId,
      staffId: rx.staffId || ctx.staffId,
    });
    const payload = {
      id: toValidUuid(`rx_${rx.id}`),
      ...trace,
      patient_id: rx.patientId ? toValidUuid(rx.patientId) : null,
      patient_name: rx.patientName,
      doctor_id: rx.prescribingDoctorId ? normalizeUuidOrNull(rx.prescribingDoctorId) : null,
      doctor_name: rx.prescribingDoctorName || rx.doctorName || 'Médecin',
      visit_date: rx.prescriptionDate || new Date().toISOString().split('T')[0],
      chief_complaint: `__rx__:${rx.id}`,
      diagnosis: rx.qrCodeHash || '',
      icd10_code: rx.isSigned ? 'SIGNED' : 'UNSIGNED',
      prescription_items: rx.items || [],
      allergy_override_confirmed: Boolean(rx.allergyOverrideConfirmed),
      allergy_override_reason: rx.allergyOverrideReason || null,
      prescription_metadata: {
        qrCodeHash: rx.qrCodeHash,
        isSigned: Boolean(rx.isSigned),
        allergyOverrideConfirmed: Boolean(rx.allergyOverrideConfirmed),
        allergyOverrideReason: rx.allergyOverrideReason || null,
      },
      notes: packMeta(rx.notes, {
        origId: rx.id,
        staffId: rx.staffId,
        patientId: rx.patientId,
        doctorSpecialty: rx.doctorSpecialty,
        prescribingDoctorId: rx.prescribingDoctorId,
        prescribingDoctorName: rx.prescribingDoctorName,
        consultationId: rx.consultationId,
        patientAge: rx.patientAge,
        allergyOverrideConfirmed: rx.allergyOverrideConfirmed,
        allergyOverrideReason: rx.allergyOverrideReason,
        doctorConfig: rx.doctorConfig,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', payload, {
      expectedVersion: rx.version,
      entityType: 'MedicalPrescription',
      entityLabel: rx.patientName,
      localData: payload,
    });
    return res.success;
  },

  async deletePrescription(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_consultations', `rx_${id}`, deletedByStaffId);
    return res.success;
  },

  async fetchLabRecords(branchId: string, updatedAfter?: string | null): Promise<MedicalLabRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_consultations')
          .select(
            'id, patient_id, patient_name, doctor_name, diagnosis, visit_date, icd10_code, medical_acts, notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('chief_complaint', '__lab__:%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): MedicalLabRecord => {
        const { meta } = unpackMeta(row.notes);
        return {
          id: meta.origId || row.id,
          patientId: row.patient_id || meta.patientId || '',
          patientName: row.patient_name,
          doctorId: meta.doctorId,
          doctorName: row.doctor_name,
          orderingDoctor: row.doctor_name,
          panelName: meta.panelName || row.diagnosis,
          testCategory: row.diagnosis || 'Biochimie Sanguine',
          date: row.visit_date,
          testDate: row.visit_date,
          status: row.icd10_code || 'Validé',
          parameters: Array.isArray(row.medical_acts) ? row.medical_acts : [],
          clinicalConclusion: meta.clinicalConclusion,
          imagingReport: meta.imagingReport,
          imagingModality: meta.imagingModality,
          version: row.version != null ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertLabRecord(lab: MedicalLabRecord, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(`lab_${lab.id}`),
      ...trace,
      patient_id: lab.patientId ? toValidUuid(lab.patientId) : null,
      patient_name: lab.patientName,
      doctor_name: lab.doctorName || lab.orderingDoctor || 'Laboratoire',
      visit_date: lab.date || lab.testDate || new Date().toISOString().split('T')[0],
      chief_complaint: `__lab__:${lab.id}`,
      diagnosis: lab.testCategory || lab.panelName || 'Biochimie Sanguine',
      icd10_code: lab.status || 'Validé',
      medical_acts: lab.parameters || [],
      notes: packMeta(lab.clinicalConclusion, {
        origId: lab.id,
        patientId: lab.patientId,
        doctorId: lab.doctorId,
        panelName: lab.panelName,
        clinicalConclusion: lab.clinicalConclusion,
        imagingReport: lab.imagingReport,
        imagingModality: lab.imagingModality,
      }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', payload, {
      expectedVersion: lab.version,
      entityType: 'MedicalLabRecord',
      entityLabel: `${lab.patientName} — ${lab.panelName || lab.testCategory}`,
      localData: payload,
    });
    return res.success;
  },

  async deleteLabRecord(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_consultations', `lab_${id}`, deletedByStaffId);
    return res.success;
  },

  async fetchCertificates(branchId: string, updatedAfter?: string | null): Promise<MedicalCertificateRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_consultations')
          .select('id, notes, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('chief_complaint', '__cert__:%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): MedicalCertificateRecord | null => {
          const { meta } = unpackMeta(row.notes);
          if (!meta.cert) return null;
          return {
            ...(meta.cert as MedicalCertificateRecord),
            version: row.version != null ? Number(row.version) : (meta.cert as MedicalCertificateRecord).version,
          };
        })
        .filter((c: MedicalCertificateRecord | null): c is MedicalCertificateRecord => Boolean(c));
    } catch {
      return [];
    }
  },

  async upsertCertificate(cert: MedicalCertificateRecord, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(`cert_${cert.id}`),
      ...trace,
      patient_id: cert.patientId ? toValidUuid(cert.patientId) : null,
      patient_name: cert.patientName,
      doctor_name: cert.doctorName,
      visit_date: cert.issueDate || new Date().toISOString().split('T')[0],
      chief_complaint: `__cert__:${cert.id}`,
      diagnosis: cert.certificateType,
      icd10_code: cert.qrHash,
      notes: packMeta(cert.clinicalFindings, { cert }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', payload, {
      expectedVersion: cert.version,
      entityType: 'MedicalCertificateRecord',
      entityLabel: `${cert.certificateType} — ${cert.patientName}`,
      localData: payload,
    });
    return res.success;
  },

  async deleteCertificate(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_consultations', `cert_${id}`, deletedByStaffId);
    return res.success;
  },

  async fetchConsumables(branchId: string, updatedAfter?: string | null): Promise<ClinicConsumableItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_consumables')
          .select(
            'id, sku, name, category, stock_quantity, min_stock_alert, unit, unit_cost_dzd, lot_number, expiry_date, lots, fefo_policy, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): ClinicConsumableItem => {
        const lots: MedicalConsumableLot[] | undefined = Array.isArray(row.lots)
          ? row.lots
          : undefined;
        return {
          id: row.id,
          itemCode: row.sku,
          name: row.name,
          category: (row.category || 'Hygiène & Protection') as ClinicConsumableItem['category'],
          currentStock: Number(row.stock_quantity || 0),
          currentStockUnits: Number(row.stock_quantity || 0),
          minStockAlert: Number(row.min_stock_alert || 10),
          reorderThresholdUnits: Number(row.min_stock_alert || 10),
          unit: row.unit || 'Boite',
          unitCostDzd: Number(row.unit_cost_dzd || 0),
          lotNumber: row.lot_number || undefined,
          expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : undefined,
          lots,
          version: row.version != null ? Number(row.version) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertConsumable(item: ClinicConsumableItem, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const stock = Number(item.currentStock ?? item.currentStockUnits ?? 0);
    const threshold = Number(item.minStockAlert ?? item.reorderThresholdUnits ?? 10);
    const payload = {
      id: toValidUuid(item.id),
      ...trace,
      sku: item.itemCode || item.id,
      name: item.name,
      category: item.category,
      unit: item.unit || 'Boite',
      stock_quantity: stock,
      min_stock_alert: threshold,
      unit_cost_dzd: Number(item.unitCostDzd || 0),
      lot_number: item.lotNumber || item.lots?.[0]?.lotNumber || null,
      expiry_date: item.expiryDate || item.lots?.[0]?.expiryDate || null,
      lots: item.lots || [],
      fefo_policy: true,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consumables', payload, {
      expectedVersion: item.version,
      entityType: 'ClinicConsumable',
      entityLabel: item.name,
      localData: payload,
    });
    return res.success;
  },

  async consumeSupplyFefo(
    consumableId: string,
    qty: number,
    referenceDate = new Date().toISOString().slice(0, 10),
    expectedVersion?: number
  ): Promise<boolean> {
    const id = toValidUuid(consumableId);
    const res = await syncCoordinator.rpcOrQueue(
      'medical_consume_supply_fefo',
      {
        p_consumable_id: id,
        p_qty: qty,
        p_reference_date: referenceDate.slice(0, 10),
      },
      {
        table: 'medical_consumables',
        recordId: id,
        expectedVersion,
        entityType: 'ClinicConsumable',
        entityLabel: consumableId,
      }
    );
    return res.success;
  },

  async deleteConsumable(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_consumables', id, deletedByStaffId);
    return res.success;
  },

  async fetchNgapActs(branchId: string): Promise<NgapActDefinition[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('medical_ngap_acts')
          .select(
            'id, code, label, category, convention_fee_centimes, cnas_reimbursement_centimes, ticket_moderateur_centimes, linked_consumables'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('code', { ascending: true })
          .range(from, to)
      );

      return data.map((row: any): NgapActDefinition => ({
        code: (row.code || 'C') as NgapActDefinition['code'],
        label: row.label,
        category: row.category || 'Consultation',
        conventionFeeDzd: centimesToDzd(Number(row.convention_fee_centimes || 0)),
        cnasReimbursementDzd: centimesToDzd(Number(row.cnas_reimbursement_centimes || 0)),
        ticketModerateurDzd: centimesToDzd(Number(row.ticket_moderateur_centimes || 0)),
        linkedConsumables: Array.isArray(row.linked_consumables) ? row.linked_consumables : [],
      }));
    } catch {
      return [];
    }
  },

  async upsertNgapAct(act: NgapActDefinition, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(`ngap_${ctx.branchId}_${act.code}`),
      ...trace,
      code: act.code,
      label: act.label,
      category: act.category,
      convention_fee_centimes: dzdToCentimes(act.conventionFeeDzd),
      cnas_reimbursement_centimes: dzdToCentimes(act.cnasReimbursementDzd),
      ticket_moderateur_centimes: dzdToCentimes(act.ticketModerateurDzd),
      linked_consumables: act.linkedConsumables || [],
      is_active: true,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_ngap_acts', payload, {
      entityType: 'NgapAct',
      entityLabel: `${act.code} — ${act.label}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchChifaClaims(branchId: string, updatedAfter?: string | null): Promise<ChifaClaimRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_invoices')
          .select('id, items, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('invoice_number', 'CHIFA-%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): ChifaClaimRecord | null => {
          const entry = Array.isArray(row.items) ? row.items[0] : null;
          if (!entry || entry.kind !== 'chifa_claim' || !entry.claim) return null;
          return {
            ...(entry.claim as ChifaClaimRecord),
            version: row.version != null ? Number(row.version) : (entry.claim as ChifaClaimRecord).version,
          };
        })
        .filter((c: ChifaClaimRecord | null): c is ChifaClaimRecord => Boolean(c));
    } catch {
      return [];
    }
  },

  async upsertChifaClaim(claim: ChifaClaimRecord, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const payload = {
      id: toValidUuid(`chifa_${claim.id}`),
      ...trace,
      invoice_number: `CHIFA-${claim.claimNumber || claim.id}`,
      patient_id: claim.patientId ? toValidUuid(claim.patientId) : null,
      patient_name: claim.patientName,
      invoice_date: claim.claimDate || claim.submissionDate || new Date().toISOString().split('T')[0],
      items: [{ kind: 'chifa_claim', claim }],
      total_amount_dzd: Number(claim.totalAmountDzd || 0),
      cnas_coverage_dzd: Number(claim.chifaShareDzd ?? claim.cnasShareDzd ?? 0),
      patient_due_dzd: Number(claim.copayPaidDzd ?? claim.ticketModerateurDzd ?? 0),
      paid_amount_dzd: Number(claim.copayPaidDzd ?? claim.ticketModerateurDzd ?? 0),
      payment_method: 'Chifa',
      status: claim.status === 'Reimbursed' ? 'Paid' : 'Partial',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_invoices', payload, {
      expectedVersion: claim.version,
      entityType: 'ChifaClaimRecord',
      entityLabel: claim.claimNumber || claim.patientName,
      localData: payload,
    });
    return res.success;
  },

  async deleteChifaClaim(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_invoices', `chifa_${id}`, deletedByStaffId);
    return res.success;
  },

  async fetchChifaBordereaux(branchId: string, updatedAfter?: string | null): Promise<MedicalChifaBordereau[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_chifa_bordereaux')
          .select(
            'id, account_id, business_id, branch_id, bordereau_number, period_month, cnas_center_code, status, claims_count, total_fee_centimes, total_cnas_centimes, total_copay_centimes, claim_ids, transmitted_at, reimbursed_at, settlement_reference, unified_payment_id, journal_entry_id, notes, version, created_at, updated_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): MedicalChifaBordereau => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        bordereauNumber: row.bordereau_number,
        periodMonth: row.period_month,
        cnasCenterCode: row.cnas_center_code || '1601',
        status: row.status || 'Draft',
        claimsCount: Number(row.claims_count || 0),
        totalFeeCentimes: Number(row.total_fee_centimes || 0),
        totalCnasCentimes: Number(row.total_cnas_centimes || 0),
        totalCopayCentimes: Number(row.total_copay_centimes || 0),
        claimIds: Array.isArray(row.claim_ids) ? row.claim_ids : [],
        transmittedAt: row.transmitted_at || undefined,
        reimbursedAt: row.reimbursed_at || undefined,
        settlementReference: row.settlement_reference || undefined,
        unifiedPaymentId: row.unified_payment_id || undefined,
        journalEntryId: row.journal_entry_id || undefined,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async transmitChifaBordereau(bordereau: MedicalChifaBordereau): Promise<boolean> {
    const id = toValidUuid(bordereau.id);
    const res = await syncCoordinator.rpcOrQueue(
      'medical_transmit_chifa_bordereau',
      {
        p_bordereau_id: id,
        p_account_id: toValidUuid(bordereau.accountId),
        p_business_id: toValidUuid(bordereau.businessId),
        p_branch_id: toValidUuid(bordereau.branchId),
        p_bordereau_number: bordereau.bordereauNumber,
        p_period_month: bordereau.periodMonth,
        p_cnas_center_code: bordereau.cnasCenterCode || '1601',
        p_claim_ids: bordereau.claimIds || [],
        p_claims_count: Number(bordereau.claimsCount || 0),
        p_total_fee_centimes: Number(bordereau.totalFeeCentimes || 0),
        p_total_cnas_centimes: Number(bordereau.totalCnasCentimes || 0),
        p_total_copay_centimes: Number(bordereau.totalCopayCentimes || 0),
      },
      {
        table: 'medical_chifa_bordereaux',
        recordId: id,
        expectedVersion: bordereau.version,
        entityType: 'MedicalChifaBordereau',
        entityLabel: bordereau.bordereauNumber,
      }
    );
    return res.success;
  },

  async settleChifaBordereau(params: {
    bordereauId: string;
    settlementReference: string;
    unifiedPaymentId?: string;
    journalEntryId?: string;
    expectedVersion?: number;
  }): Promise<boolean> {
    const id = toValidUuid(params.bordereauId);
    const res = await syncCoordinator.rpcOrQueue(
      'medical_settle_chifa_bordereau',
      {
        p_bordereau_id: id,
        p_settlement_reference: params.settlementReference,
        p_unified_payment_id: params.unifiedPaymentId ? normalizeUuidOrNull(params.unifiedPaymentId) : null,
        p_journal_entry_id: params.journalEntryId ? normalizeUuidOrNull(params.journalEntryId) : null,
      },
      {
        table: 'medical_chifa_bordereaux',
        recordId: id,
        expectedVersion: params.expectedVersion,
        entityType: 'MedicalChifaBordereau',
        entityLabel: params.settlementReference,
      }
    );
    return res.success;
  },

  async fetchDoctorPayouts(branchId: string, updatedAfter?: string | null): Promise<MedicalDoctorPayout[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_doctor_payouts')
          .select(
            'id, account_id, business_id, branch_id, practitioner_id, practitioner_ref, practitioner_name, period_month, consultations_count, gross_turnover_centimes, commission_rate_bps, doctor_payout_centimes, polyclinic_share_centimes, status, payroll_run_id, journal_entry_id, issued_at, notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('issued_at', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): MedicalDoctorPayout => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        practitionerId: row.practitioner_ref || row.practitioner_id || '',
        practitionerRef: row.practitioner_ref || undefined,
        practitionerName: row.practitioner_name,
        periodMonth: row.period_month,
        consultationsCount: Number(row.consultations_count || 0),
        grossTurnoverCentimes: Number(row.gross_turnover_centimes || 0),
        commissionRateBps: Number(row.commission_rate_bps || 7000),
        doctorPayoutCentimes: Number(row.doctor_payout_centimes || 0),
        polyclinicShareCentimes: Number(row.polyclinic_share_centimes || 0),
        status: row.status || 'issued',
        payrollRunId: row.payroll_run_id || undefined,
        journalEntryId: row.journal_entry_id || undefined,
        issuedAt: row.issued_at || undefined,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async issuePractitionerPayout(payout: MedicalDoctorPayout, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: payout.accountId || ctx.accountId,
      businessId: payout.businessId || ctx.businessId,
      branchId: payout.branchId || ctx.branchId,
      staffId: ctx.staffId,
    });
    const id = toValidUuid(payout.id);
    const payload = {
      id,
      ...trace,
      practitioner_id: payout.practitionerId ? normalizeUuidOrNull(payout.practitionerId) : null,
      practitioner_ref: payout.practitionerRef || payout.practitionerId,
      practitioner_name: payout.practitionerName,
      period_month: payout.periodMonth,
      consultations_count: Number(payout.consultationsCount || 0),
      gross_turnover_centimes: Number(payout.grossTurnoverCentimes || 0),
      commission_rate_bps: Number(payout.commissionRateBps || 7000),
      doctor_payout_centimes: Number(payout.doctorPayoutCentimes || 0),
      polyclinic_share_centimes: Number(payout.polyclinicShareCentimes || 0),
      status: payout.status || 'issued',
      payroll_run_id: payout.payrollRunId ? normalizeUuidOrNull(payout.payrollRunId) : null,
      journal_entry_id: payout.journalEntryId ? normalizeUuidOrNull(payout.journalEntryId) : null,
      notes: payout.notes || null,
    };
    const res = await syncCoordinator.rpcOrQueue(
      'medical_issue_practitioner_payout',
      { p_payload: payload },
      {
        table: 'medical_doctor_payouts',
        recordId: id,
        expectedVersion: payout.version,
        entityType: 'MedicalDoctorPayout',
        entityLabel: `${payout.practitionerName} (${payout.periodMonth})`,
        localData: payload,
      }
    );
    return res.success;
  },

  async fetchCashClosures(branchId: string, updatedAfter?: string | null): Promise<DailyCashClosure[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const normalizedData = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_cash_closures')
          .select(
            'id, account_id, business_id, branch_id, staff_id, closure_date, closed_by_name, opening_float_centimes, expected_cash_centimes, counted_cash_centimes, total_cash_collected_centimes, total_baridimob_centimes, total_card_centimes, total_chifa_vouchers_centimes, discrepancy_centimes, consultations_count, status, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('closure_date', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      const normalizedList = normalizedData.map((row: any): DailyCashClosure => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || undefined,
        date: row.closure_date,
        closureDate: row.closure_date,
        closedByStaffName: row.closed_by_name,
        closedBySecretary: row.closed_by_name,
        openingCashFloatDzd: centimesToDzd(Number(row.opening_float_centimes || 0)),
        openingFloatDzd: centimesToDzd(Number(row.opening_float_centimes || 0)),
        expectedCashDzd: centimesToDzd(Number(row.expected_cash_centimes || 0)),
        countedCashDzd: centimesToDzd(Number(row.counted_cash_centimes || 0)),
        totalCashCollectedDzd: centimesToDzd(Number(row.total_cash_collected_centimes || 0)),
        totalBaridiMobDzd: centimesToDzd(Number(row.total_baridimob_centimes || 0)),
        totalCardDzd: centimesToDzd(Number(row.total_card_centimes || 0)),
        totalChifaVouchersDzd: centimesToDzd(Number(row.total_chifa_vouchers_centimes || 0)),
        discrepancyDzd: centimesToDzd(Number(row.discrepancy_centimes || 0)),
        totalConsultationsCount: Number(row.consultations_count || 0),
        status: row.status || 'balanced',
        notes: row.notes || undefined,
        isClosed: true,
        version: row.version != null ? Number(row.version) : undefined,
      }));

      // Legacy fallback read from medical_invoices CLOSE-% rows so older rows remain visible
      const legacyData = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('medical_invoices')
          .select('id, items, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('invoice_number', 'CLOSE-%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      const legacyList = legacyData
        .map((row: any): DailyCashClosure | null => {
          const entry = Array.isArray(row.items) ? row.items[0] : null;
          if (!entry || entry.kind !== 'cash_closure' || !entry.closure) return null;
          return {
            ...(entry.closure as DailyCashClosure),
            version: row.version != null ? Number(row.version) : (entry.closure as DailyCashClosure).version,
          };
        })
        .filter((c: DailyCashClosure | null): c is DailyCashClosure => Boolean(c));

      const merged = new Map<string, DailyCashClosure>();
      legacyList.forEach((c) => merged.set(c.id, c));
      normalizedList.forEach((c) => merged.set(c.id, c));
      return Array.from(merged.values());
    } catch {
      return [];
    }
  },

  async upsertCashClosure(closure: DailyCashClosure, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: closure.accountId || ctx.accountId,
      businessId: closure.businessId || ctx.businessId,
      branchId: closure.branchId || ctx.branchId,
      staffId: closure.staffId || ctx.staffId,
    });
    const id = toValidUuid(closure.id);
    const expectedDzd = Number(closure.expectedCashDzd ?? closure.theoreticalCashDzd ?? 0);
    const countedDzd = Number(closure.countedCashDzd ?? closure.actualCashInDrawerDzd ?? 0);
    const payload = {
      id,
      ...trace,
      closure_date: (closure.closureDate || closure.date || new Date().toISOString().split('T')[0]).slice(0, 10),
      closed_by_name: closure.closedByStaffName || closure.closedBySecretary || 'Secrétariat',
      opening_float_centimes: dzdToCentimes(Number(closure.openingCashFloatDzd ?? closure.openingFloatDzd ?? 0)),
      expected_cash_centimes: dzdToCentimes(expectedDzd),
      counted_cash_centimes: dzdToCentimes(countedDzd),
      total_cash_collected_centimes: dzdToCentimes(Number(closure.totalCashCollectedDzd ?? expectedDzd)),
      total_baridimob_centimes: dzdToCentimes(Number(closure.totalBaridiMobDzd ?? 0)),
      total_card_centimes: dzdToCentimes(Number(closure.totalCardDzd ?? 0)),
      total_chifa_vouchers_centimes: dzdToCentimes(Number(closure.totalChifaVouchersDzd ?? 0)),
      consultations_count: Number(closure.totalConsultationsCount ?? 0),
      notes: closure.notes || null,
    };
    const res = await syncCoordinator.rpcOrQueue(
      'medical_close_daily_cash',
      { p_payload: payload },
      {
        table: 'medical_cash_closures',
        recordId: id,
        expectedVersion: closure.version,
        entityType: 'DailyCashClosure',
        entityLabel: payload.closure_date,
        localData: payload,
      }
    );
    return res.success;
  },

  async deleteCashClosure(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_cash_closures', id, deletedByStaffId);
    return res.success;
  },
};

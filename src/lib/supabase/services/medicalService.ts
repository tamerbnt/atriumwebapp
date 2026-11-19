import { getSupabaseClient, toValidUuid } from '../client';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
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
      let query = (client as any)
        .from('medical_staff')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): MedicalPractitioner => {
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
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPractitioner(doc: MedicalPractitioner, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_staff', {
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
      const { data, error } = await (client as any)
        .from('medical_departments')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('code', 'ORDCFG:%');

      if (error) return {};

      const configs: Record<string, DoctorOrdonnanceConfig> = {};
      (data || []).forEach((row: any) => {
        const { meta } = unpackMeta(row.head_doctor_name);
        if (meta.config && meta.config.doctorId) {
          configs[meta.config.doctorId] = meta.config as DoctorOrdonnanceConfig;
        }
      });
      return configs;
    } catch {
      return {};
    }
  },

  async upsertOrdonnanceConfig(config: DoctorOrdonnanceConfig, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_departments', {
      id: toValidUuid(`ordcfg_${ctx.branchId}_${config.doctorId}`),
      ...trace,
      name: `Ordonnance Config — ${config.doctorName}`,
      code: `ORDCFG:${config.doctorId}`,
      head_doctor_name: packMeta(config.doctorName, { config }),
      room_count: 1,
    });
    return res.success;
  },

  async fetchPatients(branchId: string, updatedAfter?: string | null): Promise<MedicalPatient[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('medical_patients')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): MedicalPatient => {
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

        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          fullName: row.full_name,
          nationalId: meta.nationalId || undefined,
          phone: row.phone || '',
          gender: (row.gender === 'Male' ? 'Male' : 'Female'),
          dateOfBirth: row.birth_date || '1990-01-01',
          bloodGroup: row.blood_group || undefined,
          allergies,
          chronicConditions,
          chifaCardNumber: row.chifa_card_number || undefined,
          socialSecurityNumber: meta.socialSecurityNumber || undefined,
          hasChifa100PercentAld: Boolean(meta.hasChifa100PercentAld),
          emergencyContact: row.emergency_contact || undefined,
          emergencyPhone: meta.emergencyPhone || undefined,
          notes: plain || undefined,
          vitalsHistory: Array.isArray(meta.vitalsHistory) ? meta.vitalsHistory : [],
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPatient(patient: MedicalPatient): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: patient.accountId || 'acc_01',
      businessId: patient.businessId,
      branchId: patient.branchId,
      staffId: patient.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_patients', {
      id: toValidUuid(patient.id),
      ...trace,
      file_number: patient.id.slice(0, 12).toUpperCase(),
      full_name: patient.fullName,
      birth_date: patient.dateOfBirth || null,
      gender: patient.gender || 'Female',
      blood_group: patient.bloodGroup || null,
      phone: patient.phone || null,
      chifa_card_number: patient.chifaCardNumber || null,
      allergies: (patient.allergies || []).join(', ') || null,
      chronic_conditions: (patient.chronicConditions || []).join(', ') || null,
      emergency_contact: patient.emergencyContact || null,
      notes: packMeta(patient.notes, {
        nationalId: patient.nationalId,
        socialSecurityNumber: patient.socialSecurityNumber,
        hasChifa100PercentAld: patient.hasChifa100PercentAld,
        emergencyPhone: patient.emergencyPhone,
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
        vitalsHistory: patient.vitalsHistory || [],
      }),
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
      let query = (client as any)
        .from('medical_appointments')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('appointment_date', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): MedicalAppointmentSlot => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          doctorId: row.doctor_id || meta.doctorId || '',
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
          isEmergencyBypass: Boolean(meta.isEmergencyBypass),
          emergencyBypassReason: meta.emergencyBypassReason || undefined,
          notes: plain || undefined,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertAppointment(appt: MedicalAppointmentSlot, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_appointments', {
      id: toValidUuid(appt.id),
      ...trace,
      patient_id: appt.patientId ? toValidUuid(appt.patientId) : null,
      patient_name: appt.patientName,
      patient_phone: appt.patientPhone || null,
      doctor_id: null,
      doctor_name: appt.doctorName,
      appointment_date: appt.date || new Date().toISOString().split('T')[0],
      start_time: appt.startTime || '09:00',
      duration_minutes: Number(appt.durationMinutes || 30),
      reason: appt.reason || null,
      triage_priority: appt.isEmergencyBypass ? 'Emergency' : appt.urgency === 'Prioritaire' ? 'Urgent' : 'Normal',
      status: mapAppointmentStatusToDb(appt.status),
      notes: packMeta(appt.notes, {
        doctorId: appt.doctorId,
        uiStatus: appt.status,
        isEmergencyBypass: appt.isEmergencyBypass,
        emergencyBypassReason: appt.emergencyBypassReason,
      }),
    });
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
      let query = (client as any)
        .from('medical_consultations')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .filter((row: any) => !String(row.chief_complaint || '').startsWith('__'))
        .map((row: any): MedicalConsultation => {
          const { plain, meta } = unpackMeta(row.notes);
          const vitalsObj = row.vitals && typeof row.vitals === 'object' ? row.vitals : {};
          return {
            id: row.id,
            accountId: row.account_id,
            businessId: row.business_id,
            branchId: row.branch_id,
            staffId: row.staff_id || meta.staffId || 'staff_01',
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
            urgencyLevel: meta.urgencyLevel || 'Normal',
            ticketNumber: meta.ticketNumber || undefined,
            ngapCode: meta.ngapCode || 'C',
            consultationFeeDzd: Number(meta.consultationFeeDzd ?? 2000),
            copayAmountDzd: Number(meta.copayAmountDzd ?? 2000),
            insuranceShareDzd: Number(meta.insuranceShareDzd ?? 0),
            isPaid: Boolean(meta.isPaid),
            paymentMethod: meta.paymentMethod || 'Cash',
            notes: plain || undefined,
            createdAt: row.created_at,
          };
        });
    } catch {
      return [];
    }
  },

  async upsertConsultation(con: MedicalConsultation): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: con.accountId || 'acc_01',
      businessId: con.businessId,
      branchId: con.branchId,
      staffId: con.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', {
      id: toValidUuid(con.id),
      ...trace,
      patient_id: con.patientId ? toValidUuid(con.patientId) : null,
      patient_name: con.patientName,
      doctor_id: null,
      doctor_name: con.doctorName || 'Médecin',
      visit_date: con.consultationDate || new Date().toISOString().split('T')[0],
      vitals: con.vitals || {},
      chief_complaint: con.chiefComplaint || '',
      diagnosis: con.diagnosis || '',
      icd10_code: con.icdCode || null,
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
      }),
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
      let query = (client as any)
        .from('medical_consultations')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('chief_complaint', '__rx__:%')
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): MedicalPrescription => {
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
          doctorConfig: meta.doctorConfig,
          notes: plain || undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertPrescription(rx: MedicalPrescription, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: rx.accountId || ctx.accountId || 'acc_01',
      businessId: rx.businessId || ctx.businessId,
      branchId: rx.branchId || ctx.branchId,
      staffId: rx.staffId || ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', {
      id: toValidUuid(`rx_${rx.id}`),
      ...trace,
      patient_id: rx.patientId ? toValidUuid(rx.patientId) : null,
      patient_name: rx.patientName,
      doctor_name: rx.prescribingDoctorName || rx.doctorName || 'Médecin',
      visit_date: rx.prescriptionDate || new Date().toISOString().split('T')[0],
      chief_complaint: `__rx__:${rx.id}`,
      diagnosis: rx.qrCodeHash || '',
      icd10_code: rx.isSigned ? 'SIGNED' : 'UNSIGNED',
      prescription_items: rx.items || [],
      notes: packMeta(rx.notes, {
        origId: rx.id,
        staffId: rx.staffId,
        patientId: rx.patientId,
        doctorSpecialty: rx.doctorSpecialty,
        prescribingDoctorId: rx.prescribingDoctorId,
        prescribingDoctorName: rx.prescribingDoctorName,
        consultationId: rx.consultationId,
        patientAge: rx.patientAge,
        doctorConfig: rx.doctorConfig,
      }),
    });
    return res.success;
  },

  async fetchLabRecords(branchId: string, updatedAfter?: string | null): Promise<MedicalLabRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('medical_consultations')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('chief_complaint', '__lab__:%')
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): MedicalLabRecord => {
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
        };
      });
    } catch {
      return [];
    }
  },

  async upsertLabRecord(lab: MedicalLabRecord, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', {
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
    });
    return res.success;
  },

  async fetchCertificates(branchId: string, updatedAfter?: string | null): Promise<MedicalCertificateRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('medical_consultations')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('chief_complaint', '__cert__:%')
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): MedicalCertificateRecord | null => {
          const { meta } = unpackMeta(row.notes);
          return meta.cert ? (meta.cert as MedicalCertificateRecord) : null;
        })
        .filter((c: MedicalCertificateRecord | null): c is MedicalCertificateRecord => Boolean(c));
    } catch {
      return [];
    }
  },

  async upsertCertificate(cert: MedicalCertificateRecord, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consultations', {
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
    });
    return res.success;
  },

  async fetchConsumables(branchId: string, updatedAfter?: string | null): Promise<ClinicConsumableItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('medical_consumables')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): ClinicConsumableItem => ({
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
      }));
    } catch {
      return [];
    }
  },

  async upsertConsumable(item: ClinicConsumableItem, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const stock = Number(item.currentStock ?? item.currentStockUnits ?? 0);
    const threshold = Number(item.minStockAlert ?? item.reorderThresholdUnits ?? 10);
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_consumables', {
      id: toValidUuid(item.id),
      ...trace,
      sku: item.itemCode || item.id,
      name: item.name,
      category: item.category,
      unit: item.unit || 'Boite',
      stock_quantity: stock,
      min_stock_alert: threshold,
      unit_cost_dzd: Number(item.unitCostDzd || 0),
    });
    return res.success;
  },

  async deleteConsumable(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('medical_consumables', id, deletedByStaffId);
    return res.success;
  },

  async fetchChifaClaims(branchId: string, updatedAfter?: string | null): Promise<ChifaClaimRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('medical_invoices')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('invoice_number', 'CHIFA-%')
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): ChifaClaimRecord | null => {
          const entry = Array.isArray(row.items) ? row.items[0] : null;
          return entry && entry.kind === 'chifa_claim' ? (entry.claim as ChifaClaimRecord) : null;
        })
        .filter((c: ChifaClaimRecord | null): c is ChifaClaimRecord => Boolean(c));
    } catch {
      return [];
    }
  },

  async upsertChifaClaim(claim: ChifaClaimRecord, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId || 'acc_01',
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_invoices', {
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
    });
    return res.success;
  },

  async fetchCashClosures(branchId: string, updatedAfter?: string | null): Promise<DailyCashClosure[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('medical_invoices')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('invoice_number', 'CLOSE-%')
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): DailyCashClosure | null => {
          const entry = Array.isArray(row.items) ? row.items[0] : null;
          return entry && entry.kind === 'cash_closure' ? (entry.closure as DailyCashClosure) : null;
        })
        .filter((c: DailyCashClosure | null): c is DailyCashClosure => Boolean(c));
    } catch {
      return [];
    }
  },

  async upsertCashClosure(closure: DailyCashClosure, ctx: MedicalBranchContext): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: closure.accountId || ctx.accountId || 'acc_01',
      businessId: closure.businessId || ctx.businessId,
      branchId: closure.branchId || ctx.branchId,
      staffId: closure.staffId || ctx.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('medical_invoices', {
      id: toValidUuid(`close_${closure.id}`),
      ...trace,
      invoice_number: `CLOSE-${closure.closureDate || closure.date || closure.id}`,
      patient_name: closure.closedByStaffName || closure.closedBySecretary || 'Clôture Caisse',
      invoice_date: closure.closureDate || closure.date || new Date().toISOString().split('T')[0],
      items: [{ kind: 'cash_closure', closure }],
      total_amount_dzd: Number(closure.expectedCashDzd ?? closure.theoreticalCashDzd ?? 0),
      paid_amount_dzd: Number(closure.countedCashDzd ?? closure.actualCashInDrawerDzd ?? 0),
      payment_method: 'Cash',
      status: 'Paid',
    });
    return res.success;
  },
};

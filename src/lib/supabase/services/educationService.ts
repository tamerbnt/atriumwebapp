import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  EduAdmissionLead,
  EduAttendance,
  EduCertificate,
  EduClassroom,
  EduCohort,
  EduCourse,
  EduDrivingLog,
  EduEnrollment,
  EduGrade,
  EduGradeScale,
  EduK12Service,
  EduParentCommunication,
  EduSession,
  EduStudent,
  EduTradeMode,
  EduVacataireLog,
} from '../../../types/index';

export const mapEduCourseFromDb = (row: any): EduCourse => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  code: row.code,
  title: row.title,
  category: row.category || row.subject || 'Language',
  description: row.description || '',
  durationWeeks: Number(row.duration_weeks || 8),
  totalHours: Number(row.total_hours ?? row.duration_hours ?? 0),
  defaultPrice: Number(row.default_price ?? row.default_tuition_fee ?? 0),
  currency: row.currency || 'DZD',
  gradeScale: Number(row.grade_scale) === 100 ? (100 as EduGradeScale) : (20 as EduGradeScale),
  tradeMode: (row.trade_mode || 'academy') as EduTradeMode,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapEduClassroomFromDb = (row: any): EduClassroom => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  name: row.name,
  capacity: Number(row.capacity || 20),
  hasProjector: Boolean(row.has_projector),
  hasComputers: Boolean(row.has_computers),
  colorHex: row.color_hex || '#3B82F6',
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapEduCohortFromDb = (row: any): EduCohort => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  cohortCode: row.cohort_code || row.code || undefined,
  name: row.name,
  courseId: row.course_id,
  courseTitle: row.course_title,
  instructorId: row.instructor_id || '',
  instructorName: row.instructor_name || '',
  classroomId: row.classroom_id || undefined,
  classroomName: row.classroom_name || undefined,
  startDate: row.start_date,
  endDate: row.end_date,
  maxStudents: Number(row.max_students || 25),
  enrolledCount: Number(row.enrolled_count || 0),
  tuitionFee: Number(row.tuition_fee || 0),
  currency: row.currency || 'DZD',
  scheduleSummary: row.schedule_summary || '',
  status: (row.status || 'Enrolling') as EduCohort['status'],
  gradeScale: Number(row.grade_scale) === 100 ? (100 as EduGradeScale) : (20 as EduGradeScale),
  tradeMode: (row.trade_mode || 'academy') as EduTradeMode,
  waitlistEnabled: row.waitlist_enabled !== false,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapEduStudentFromDb = (row: any): EduStudent => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  fullName: row.full_name,
  email: row.email || '',
  phone: row.phone || '',
  guardianName: row.guardian_name || undefined,
  guardianPhone: row.guardian_phone || undefined,
  guardianRelation: row.guardian_relation || undefined,
  birthDate: row.birth_date || undefined,
  rfidBadgeCode: row.rfid_badge_code || undefined,
  studentCardNumber: row.student_card_number || undefined,
  studentCardQr: row.student_card_qr || undefined,
  familyGroupId: row.family_group_id || undefined,
  crmPartyId: row.crm_party_id || undefined,
  portalAccessEnabled: Boolean(row.portal_access_enabled),
  portalToken: row.portal_token || undefined,
  drivingCategory: row.driving_category || undefined,
  k12TransportRoute: row.k12_transport_route || undefined,
  k12CanteenPlan: row.k12_canteen_plan || undefined,
  schoolGrade: row.school_grade || undefined,
  attendanceRatePercent: Number(row.attendance_rate_percent || 100),
  status: row.status || 'Active',
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapEduEnrollmentFromDb = (row: any): EduEnrollment => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  studentId: row.student_id,
  studentName: row.student_name,
  cohortId: row.cohort_id,
  cohortName: row.cohort_name,
  enrolledAt: row.enrolled_at || row.created_at,
  agreedTuition: Number(row.agreed_tuition || 0),
  discountAmount: Number(row.discount_amount || 0),
  discountReason: row.discount_reason || undefined,
  discountType: (row.discount_type || 'none') as EduEnrollment['discountType'],
  scholarshipAmount: Number(row.scholarship_amount || 0),
  siblingDiscountAmount: Number(row.sibling_discount_amount || 0),
  refundedAmount: Number(row.refunded_amount || 0),
  refundedAmountCentimes: Number(row.refunded_amount_centimes || 0),
  paidAmount: Number(row.paid_amount || 0),
  balanceDue: Number(row.balance_due || 0),
  currency: row.currency || 'DZD',
  paymentStatus: (row.payment_status || 'Pending') as EduEnrollment['paymentStatus'],
  status: (row.status || 'Active') as EduEnrollment['status'],
  contractNumber: row.contract_number || undefined,
  contractSignedAt: row.contract_signed_at || undefined,
  contractSignerName: row.contract_signer_name || undefined,
  unifiedDocumentId: row.unified_document_id || undefined,
  creditNoteDocumentId: row.credit_note_document_id || undefined,
  transferredFromCohortId: row.transferred_from_cohort_id || undefined,
  transferHistory: Array.isArray(row.transfer_history) ? row.transfer_history : [],
  dunningLevel: row.dunning_level != null ? Number(row.dunning_level) : 0,
  lastDunningAt: row.last_dunning_at || undefined,
  installments: Array.isArray(row.installments) ? row.installments : [],
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapEduSessionFromDb = (row: any): EduSession => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  cohortId: row.cohort_id,
  cohortName: row.cohort_name,
  classroomId: row.classroom_id || undefined,
  classroomName: row.classroom_name || undefined,
  instructorId: row.instructor_id || '',
  instructorName: row.instructor_name || '',
  topic: row.topic || undefined,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  status: (row.status || 'Scheduled') as EduSession['status'],
  isVacataire: Boolean(row.is_vacataire),
  hourlyRateDzd: Number(row.hourly_rate_dzd || 0),
  durationHours: Number(row.duration_hours ?? 2),
  payrollPosted: Boolean(row.payroll_posted),
  payrollRunId: row.payroll_run_id || undefined,
  vehicleId: row.vehicle_id || undefined,
  vehicleLabel: row.vehicle_label || undefined,
  sessionKind: (row.session_kind || 'lecture') as EduSession['sessionKind'],
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapEduAttendanceFromDb = (row: any): EduAttendance => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  sessionId: row.session_id,
  cohortId: row.cohort_id,
  studentId: row.student_id,
  studentName: row.student_name,
  status: row.status,
  minutesLate: row.minutes_late ?? undefined,
  excuseNote: row.excuse_note || undefined,
  recordedAt: row.recorded_at,
  markedBy: row.marked_by || undefined,
  markedAt: row.marked_at || undefined,
  isLocked: Boolean(row.is_locked),
  changeHistory: Array.isArray(row.change_history) ? row.change_history : [],
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapEduGradeFromDb = (row: any): EduGrade => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  cohortId: row.cohort_id,
  studentId: row.student_id,
  studentName: row.student_name,
  assessmentTitle: row.assessment_title,
  score: Number(row.score || 0),
  maxScore: Number(row.max_score || 20),
  weightPercent: Number(row.weight_percent ?? row.coefficient ?? 100),
  teacherRemarks: row.teacher_remarks || row.feedback || undefined,
  gradedAt: row.graded_at,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapEduCertificateFromDb = (row: any): EduCertificate => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  studentId: row.student_id,
  studentName: row.student_name,
  cohortId: row.cohort_id,
  courseTitle: row.course_title,
  certificateNumber: row.certificate_number,
  verificationHash: row.verification_hash,
  issueDate: row.issue_date || row.issued_at || row.created_at,
  averageGradeScore: row.average_grade_score ?? row.grade_average ?? undefined,
  honors: row.honors || undefined,
  signatoryName: row.signatory_name || 'Direction Académique',
  signatoryTitle: row.signatory_title || 'Directeur Pédagogique',
  status: (row.status || 'active') as 'active' | 'revoked',
  revokedAt: row.revoked_at || undefined,
  revokedReason: row.revoked_reason || undefined,
  reissuedFromId: row.reissued_from_id || undefined,
  reissueCount: row.reissue_count != null ? Number(row.reissue_count) : 0,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapEduAdmissionFromDb = (row: any): EduAdmissionLead => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  studentName: row.student_name || row.full_name || '',
  email: row.email || undefined,
  phone: row.phone || '',
  desiredCourseId: row.desired_course_id || '',
  desiredCourseTitle: row.desired_course_title || row.interested_course_title || '',
  stage: (row.stage || row.status || 'Inquiry') as EduAdmissionLead['stage'],
  guardianName: row.guardian_name || undefined,
  placementScore: row.placement_score || undefined,
  source: row.source || 'Web Form',
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapEduParentCommFromDb = (row: any): EduParentCommunication => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  studentId: row.student_id,
  studentName: row.student_name,
  guardianName: row.guardian_name || undefined,
  guardianPhone: row.guardian_phone || undefined,
  crmPartyId: row.crm_party_id || undefined,
  direction: row.direction || 'outbound',
  channel: row.channel || 'portal',
  category: row.category || 'general',
  subject: row.subject,
  body: row.body,
  portalToken: row.portal_token || undefined,
  readAt: row.read_at || undefined,
  sentAt: row.sent_at || row.created_at,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
  deletedAt: row.deleted_at || undefined,
});

export const mapEduVacataireLogFromDb = (row: any): EduVacataireLog => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  instructorId: row.instructor_id,
  instructorName: row.instructor_name,
  sessionId: row.session_id || undefined,
  cohortId: row.cohort_id || undefined,
  cohortName: row.cohort_name || undefined,
  workDate: row.work_date,
  hoursWorked: Number(row.hours_worked || 0),
  hourlyRateCentimes: Number(row.hourly_rate_centimes || 0),
  grossAmountCentimes: Number(row.gross_amount_centimes || 0),
  status: row.status || 'pending',
  payrollRunId: row.payroll_run_id || undefined,
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
  deletedAt: row.deleted_at || undefined,
});

export const mapEduDrivingLogFromDb = (row: any): EduDrivingLog => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  studentId: row.student_id,
  studentName: row.student_name,
  instructorId: row.instructor_id,
  instructorName: row.instructor_name,
  vehicleId: row.vehicle_id || undefined,
  vehicleLabel: row.vehicle_label || undefined,
  vehiclePlate: row.vehicle_plate || undefined,
  logKind: row.log_kind || 'driving_hours',
  scheduledDate: row.scheduled_date,
  startTime: row.start_time || '09:00',
  endTime: row.end_time || '10:00',
  hoursLogged: Number(row.hours_logged || 0),
  examResult: row.exam_result || 'pending',
  dossierRef: row.dossier_ref || undefined,
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
  deletedAt: row.deleted_at || undefined,
});

export const mapEduK12ServiceFromDb = (row: any): EduK12Service => ({
  id: row.id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  studentId: row.student_id,
  studentName: row.student_name,
  serviceType: row.service_type || 'canteen',
  planName: row.plan_name,
  routeOrDiet: row.route_or_diet || undefined,
  pickupStop: row.pickup_stop || undefined,
  monthlyFeeCentimes: Number(row.monthly_fee_centimes || 0),
  status: row.status || 'active',
  startDate: row.start_date,
  endDate: row.end_date || undefined,
  checkInToday: Boolean(row.check_in_today),
  lastCheckInAt: row.last_check_in_at || undefined,
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
  deletedAt: row.deleted_at || undefined,
});

export const educationService = {
  async fetchCourses(branchId: string, updatedAfter?: string | null): Promise<EduCourse[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('edu_courses')
        .select(
          'id, account_id, business_id, branch_id, staff_id, code, title, category, description, duration_weeks, total_hours, default_price, currency, grade_scale, trade_mode, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map(mapEduCourseFromDb);
  },

  async upsertCourse(course: EduCourse): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: course.accountId || course.tenantId,
      businessId: course.businessId,
      branchId: course.branchId || course.facilityId,
      staffId: course.staffId,
    });
    const payload = {
      id: toValidUuid(course.id),
      ...trace,
      code: course.code,
      title: course.title,
      category: course.category,
      duration_weeks: course.durationWeeks,
      total_hours: course.totalHours,
      default_price: course.defaultPrice,
      currency: course.currency,
      description: course.description || null,
      grade_scale: course.gradeScale || 20,
      trade_mode: course.tradeMode || 'academy',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_courses', payload, {
      expectedVersion: course.version,
      entityType: 'EduCourse',
      entityLabel: course.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchClassrooms(branchId: string): Promise<EduClassroom[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_classrooms')
        .select(
          'id, account_id, business_id, branch_id, staff_id, name, capacity, has_projector, has_computers, color_hex, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map(mapEduClassroomFromDb);
  },

  async upsertClassroom(room: EduClassroom): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: room.accountId || room.tenantId,
      businessId: room.businessId,
      branchId: room.branchId || room.facilityId,
      staffId: room.staffId,
    });
    const payload = {
      id: toValidUuid(room.id),
      ...trace,
      name: room.name,
      capacity: room.capacity,
      has_projector: room.hasProjector,
      has_computers: room.hasComputers,
      color_hex: room.colorHex,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_classrooms', payload, {
      expectedVersion: room.version,
      entityType: 'EduClassroom',
      entityLabel: room.name,
      localData: payload,
    });
    return res.success;
  },

  async fetchCohorts(branchId: string, updatedAfter?: string | null): Promise<EduCohort[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('edu_cohorts')
        .select(
          'id, account_id, business_id, branch_id, staff_id, code, name, course_id, course_title, instructor_id, instructor_name, classroom_id, classroom_name, start_date, end_date, max_students, enrolled_count, tuition_fee, currency, schedule_summary, status, grade_scale, trade_mode, waitlist_enabled, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map(mapEduCohortFromDb);
  },

  async upsertCohort(cohort: EduCohort): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: cohort.accountId || cohort.tenantId,
      businessId: cohort.businessId,
      branchId: cohort.branchId || cohort.facilityId,
      staffId: cohort.staffId,
    });
    const payload = {
      id: toValidUuid(cohort.id),
      ...trace,
      code: cohort.cohortCode || cohort.id,
      name: cohort.name,
      course_id: toValidUuid(cohort.courseId),
      course_title: cohort.courseTitle,
      instructor_id: cohort.instructorId || null,
      instructor_name: cohort.instructorName,
      classroom_id: cohort.classroomId ? toValidUuid(cohort.classroomId) : null,
      classroom_name: cohort.classroomName || null,
      start_date: cohort.startDate,
      end_date: cohort.endDate,
      max_students: cohort.maxStudents,
      enrolled_count: cohort.enrolledCount,
      tuition_fee: cohort.tuitionFee,
      currency: cohort.currency,
      schedule_summary: cohort.scheduleSummary,
      status: cohort.status,
      grade_scale: cohort.gradeScale || 20,
      trade_mode: cohort.tradeMode || 'academy',
      waitlist_enabled: cohort.waitlistEnabled !== false,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_cohorts', payload, {
      expectedVersion: cohort.version,
      entityType: 'EduCohort',
      entityLabel: cohort.name,
      localData: payload,
    });
    return res.success;
  },

  async deleteCohort(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('edu_cohorts', id, deletedByStaffId);
    return res.success;
  },

  async fetchStudents(branchId: string, updatedAfter?: string | null): Promise<EduStudent[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('edu_students')
        .select(
          'id, account_id, business_id, branch_id, staff_id, full_name, email, phone, guardian_name, guardian_phone, guardian_relation, birth_date, rfid_badge_code, student_card_number, student_card_qr, family_group_id, crm_party_id, portal_access_enabled, portal_token, driving_category, k12_transport_route, k12_canteen_plan, school_grade, attendance_rate_percent, status, notes, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map(mapEduStudentFromDb);
  },

  async upsertStudent(student: EduStudent): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: student.accountId || student.tenantId,
      businessId: student.businessId,
      branchId: student.branchId || student.facilityId,
      staffId: student.staffId,
    });
    const payload = {
      id: toValidUuid(student.id),
      ...trace,
      full_name: student.fullName,
      email: student.email || null,
      phone: student.phone || null,
      guardian_name: student.guardianName || null,
      guardian_phone: student.guardianPhone || null,
      guardian_relation: student.guardianRelation || null,
      birth_date: student.birthDate || null,
      rfid_badge_code: student.rfidBadgeCode || null,
      student_card_number: student.studentCardNumber || null,
      student_card_qr: student.studentCardQr || null,
      family_group_id: student.familyGroupId || null,
      crm_party_id: student.crmPartyId ? toValidUuid(student.crmPartyId) : null,
      portal_access_enabled: Boolean(student.portalAccessEnabled),
      portal_token: student.portalToken || null,
      driving_category: student.drivingCategory || null,
      k12_transport_route: student.k12TransportRoute || null,
      k12_canteen_plan: student.k12CanteenPlan || null,
      school_grade: student.schoolGrade || null,
      attendance_rate_percent: student.attendanceRatePercent ?? 100,
      status: student.status,
      notes: student.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_students', payload, {
      expectedVersion: student.version,
      entityType: 'EduStudent',
      entityLabel: student.fullName,
      localData: payload,
    });
    return res.success;
  },

  async deleteStudent(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('edu_students', id, deletedByStaffId);
    return res.success;
  },

  async fetchEnrollments(branchId: string): Promise<EduEnrollment[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_enrollments')
        .select(
          'id, account_id, business_id, branch_id, staff_id, student_id, student_name, cohort_id, cohort_name, enrolled_at, agreed_tuition, discount_amount, discount_reason, discount_type, scholarship_amount, sibling_discount_amount, refunded_amount, refunded_amount_centimes, paid_amount, balance_due, currency, payment_status, status, contract_number, contract_signed_at, contract_signer_name, unified_document_id, credit_note_document_id, transferred_from_cohort_id, transfer_history, dunning_level, last_dunning_at, installments, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map(mapEduEnrollmentFromDb);
  },

  async upsertEnrollment(en: EduEnrollment): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: en.accountId || en.tenantId,
      businessId: en.businessId,
      branchId: en.branchId || en.facilityId,
      staffId: en.staffId,
    });
    const payload = {
      id: toValidUuid(en.id),
      ...trace,
      student_id: toValidUuid(en.studentId),
      student_name: en.studentName,
      cohort_id: toValidUuid(en.cohortId),
      cohort_name: en.cohortName,
      enrolled_at: en.enrolledAt,
      agreed_tuition: en.agreedTuition,
      discount_amount: en.discountAmount,
      discount_reason: en.discountReason || null,
      discount_type: en.discountType || 'none',
      scholarship_amount: en.scholarshipAmount || 0,
      sibling_discount_amount: en.siblingDiscountAmount || 0,
      refunded_amount: en.refundedAmount || 0,
      refunded_amount_centimes: en.refundedAmountCentimes || 0,
      paid_amount: en.paidAmount,
      balance_due: en.balanceDue,
      currency: en.currency,
      payment_status: en.paymentStatus,
      status: en.status,
      contract_number: en.contractNumber || null,
      contract_signed_at: en.contractSignedAt || null,
      contract_signer_name: en.contractSignerName || null,
      unified_document_id: en.unifiedDocumentId ? toValidUuid(en.unifiedDocumentId) : null,
      credit_note_document_id: en.creditNoteDocumentId ? toValidUuid(en.creditNoteDocumentId) : null,
      transferred_from_cohort_id: en.transferredFromCohortId ? toValidUuid(en.transferredFromCohortId) : null,
      transfer_history: en.transferHistory || [],
      dunning_level: en.dunningLevel || 0,
      last_dunning_at: en.lastDunningAt || null,
      installments: en.installments || [],
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_enrollments', payload, {
      expectedVersion: en.version,
      entityType: 'EduEnrollment',
      entityLabel: `${en.studentName} — ${en.cohortName}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchSessions(branchId: string): Promise<EduSession[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_sessions')
        .select(
          'id, account_id, business_id, branch_id, staff_id, cohort_id, cohort_name, classroom_id, classroom_name, instructor_id, instructor_name, topic, date, start_time, end_time, status, is_vacataire, hourly_rate_dzd, duration_hours, payroll_posted, payroll_run_id, vehicle_id, vehicle_label, session_kind, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map(mapEduSessionFromDb);
  },

  async upsertSession(se: EduSession): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: se.accountId || se.tenantId,
      businessId: se.businessId,
      branchId: se.branchId || se.facilityId,
      staffId: se.staffId,
    });
    const payload = {
      id: toValidUuid(se.id),
      ...trace,
      cohort_id: toValidUuid(se.cohortId),
      cohort_name: se.cohortName,
      classroom_id: se.classroomId ? toValidUuid(se.classroomId) : null,
      classroom_name: se.classroomName || null,
      instructor_id: se.instructorId || null,
      instructor_name: se.instructorName,
      topic: se.topic || null,
      date: se.date,
      start_time: se.startTime,
      end_time: se.endTime,
      status: se.status,
      is_vacataire: Boolean(se.isVacataire),
      hourly_rate_dzd: Number(se.hourlyRateDzd || 0),
      duration_hours: Number(se.durationHours ?? 2),
      payroll_posted: Boolean(se.payrollPosted),
      payroll_run_id: se.payrollRunId ? toValidUuid(se.payrollRunId) : null,
      vehicle_id: se.vehicleId || null,
      vehicle_label: se.vehicleLabel || null,
      session_kind: se.sessionKind || 'lecture',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_sessions', payload, {
      expectedVersion: se.version,
      entityType: 'EduSession',
      entityLabel: `${se.cohortName} (${se.date})`,
      localData: payload,
    });
    return res.success;
  },

  async deleteSession(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('edu_sessions', id, deletedByStaffId);
    return res.success;
  },

  async fetchAttendance(branchId: string, updatedAfter?: string | null): Promise<EduAttendance[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('edu_attendance')
        .select(
          'id, account_id, business_id, branch_id, staff_id, session_id, cohort_id, student_id, student_name, status, minutes_late, excuse_note, recorded_at, marked_by, marked_at, is_locked, change_history, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map(mapEduAttendanceFromDb);
  },

  async upsertAttendance(att: EduAttendance): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: att.accountId || att.tenantId,
      businessId: att.businessId,
      branchId: att.branchId || att.facilityId,
      staffId: att.staffId,
    });
    const payload = {
      id: toValidUuid(att.id),
      ...trace,
      session_id: toValidUuid(att.sessionId),
      cohort_id: toValidUuid(att.cohortId),
      student_id: toValidUuid(att.studentId),
      student_name: att.studentName,
      status: att.status,
      minutes_late: att.minutesLate ?? 0,
      excuse_note: att.excuseNote || null,
      recorded_at: att.recordedAt,
      marked_by: att.markedBy ? toValidUuid(att.markedBy) : null,
      marked_at: att.markedAt || att.recordedAt,
      is_locked: Boolean(att.isLocked),
      change_history: Array.isArray(att.changeHistory) ? att.changeHistory : [],
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_attendance', payload, {
      expectedVersion: att.version,
      entityType: 'EduAttendance',
      entityLabel: att.studentName,
      localData: payload,
    });
    return res.success;
  },

  async fetchGrades(branchId: string): Promise<EduGrade[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_grades')
        .select(
          'id, account_id, business_id, branch_id, staff_id, cohort_id, student_id, student_name, assessment_title, score, max_score, weight_percent, teacher_remarks, graded_at, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map(mapEduGradeFromDb);
  },

  async upsertGrade(grade: EduGrade): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: grade.accountId || grade.tenantId,
      businessId: grade.businessId,
      branchId: grade.branchId || grade.facilityId,
      staffId: grade.staffId,
    });
    const payload = {
      id: toValidUuid(grade.id),
      ...trace,
      cohort_id: toValidUuid(grade.cohortId),
      student_id: toValidUuid(grade.studentId),
      student_name: grade.studentName,
      assessment_title: grade.assessmentTitle,
      score: grade.score,
      max_score: grade.maxScore,
      weight_percent: grade.weightPercent,
      teacher_remarks: grade.teacherRemarks || null,
      graded_at: grade.gradedAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_grades', payload, {
      expectedVersion: grade.version,
      entityType: 'EduGrade',
      entityLabel: `${grade.studentName} — ${grade.assessmentTitle}`,
      localData: payload,
    });
    return res.success;
  },

  async deleteGrade(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('edu_grades', id, deletedByStaffId);
    return res.success;
  },

  async fetchCertificates(branchId: string): Promise<EduCertificate[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_certificates')
        .select(
          'id, account_id, business_id, branch_id, staff_id, student_id, student_name, cohort_id, course_title, certificate_number, verification_hash, issue_date, average_grade_score, honors, signatory_name, signatory_title, status, revoked_at, revoked_reason, reissued_from_id, reissue_count, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map(mapEduCertificateFromDb);
  },

  async upsertCertificate(cert: EduCertificate): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: cert.accountId || cert.tenantId,
      businessId: cert.businessId,
      branchId: cert.branchId || cert.facilityId,
      staffId: cert.staffId,
    });
    const payload = {
      id: toValidUuid(cert.id),
      ...trace,
      student_id: toValidUuid(cert.studentId),
      student_name: cert.studentName,
      cohort_id: toValidUuid(cert.cohortId),
      course_title: cert.courseTitle,
      certificate_number: cert.certificateNumber,
      verification_hash: cert.verificationHash,
      issue_date: cert.issueDate,
      average_grade_score: cert.averageGradeScore ?? null,
      honors: cert.honors || null,
      signatory_name: cert.signatoryName,
      signatory_title: cert.signatoryTitle,
      status: cert.status || 'active',
      revoked_at: cert.revokedAt || null,
      revoked_reason: cert.revokedReason || null,
      reissued_from_id: cert.reissuedFromId ? toValidUuid(cert.reissuedFromId) : null,
      reissue_count: cert.reissueCount || 0,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_certificates', payload, {
      expectedVersion: cert.version,
      entityType: 'EduCertificate',
      entityLabel: `${cert.studentName} — ${cert.certificateNumber}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchAdmissions(branchId: string): Promise<EduAdmissionLead[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_admissions')
        .select(
          'id, account_id, business_id, branch_id, staff_id, student_name, email, phone, desired_course_id, desired_course_title, stage, guardian_name, placement_score, source, notes, version, created_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    );
    return data.map(mapEduAdmissionFromDb);
  },

  async upsertAdmission(lead: EduAdmissionLead): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: lead.accountId || lead.tenantId,
      businessId: lead.businessId,
      branchId: lead.branchId || lead.facilityId,
      staffId: lead.staffId,
    });
    const payload = {
      id: toValidUuid(lead.id),
      ...trace,
      student_name: lead.studentName,
      email: lead.email || null,
      phone: lead.phone || null,
      desired_course_id: lead.desiredCourseId ? toValidUuid(lead.desiredCourseId) : null,
      desired_course_title: lead.desiredCourseTitle,
      guardian_name: lead.guardianName || null,
      placement_score: lead.placementScore || null,
      source: lead.source || null,
      stage: lead.stage,
      notes: lead.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_admissions', payload, {
      expectedVersion: lead.version,
      entityType: 'EduAdmissionLead',
      entityLabel: lead.studentName,
      localData: payload,
    });
    return res.success;
  },

  async deleteAdmission(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('edu_admissions', id, deletedByStaffId);
    return res.success;
  },

  async fetchParentCommunications(branchId: string): Promise<EduParentCommunication[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_parent_communications')
        .select(
          'id, account_id, business_id, branch_id, staff_id, student_id, student_name, guardian_name, guardian_phone, crm_party_id, direction, channel, category, subject, body, portal_token, read_at, sent_at, version, created_at, updated_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('sent_at', { ascending: false })
        .range(from, to)
    );
    return data.map(mapEduParentCommFromDb);
  },

  async upsertParentCommunication(comm: EduParentCommunication): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: comm.accountId || comm.tenantId,
      businessId: comm.businessId,
      branchId: comm.branchId || comm.facilityId,
      staffId: comm.staffId,
    });
    const payload = {
      id: toValidUuid(comm.id),
      ...trace,
      student_id: toValidUuid(comm.studentId),
      student_name: comm.studentName,
      guardian_name: comm.guardianName || null,
      guardian_phone: comm.guardianPhone || null,
      crm_party_id: comm.crmPartyId ? toValidUuid(comm.crmPartyId) : null,
      direction: comm.direction,
      channel: comm.channel,
      category: comm.category,
      subject: comm.subject,
      body: comm.body,
      portal_token: comm.portalToken || null,
      read_at: comm.readAt || null,
      sent_at: comm.sentAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_parent_communications', payload, {
      expectedVersion: comm.version,
      entityType: 'EduParentCommunication',
      entityLabel: comm.subject,
      localData: payload,
    });
    return res.success;
  },

  async fetchVacataireLogs(branchId: string): Promise<EduVacataireLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_vacataire_logs')
        .select(
          'id, account_id, business_id, branch_id, staff_id, instructor_id, instructor_name, session_id, cohort_id, cohort_name, work_date, hours_worked, hourly_rate_centimes, gross_amount_centimes, status, payroll_run_id, notes, version, created_at, updated_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('work_date', { ascending: false })
        .range(from, to)
    );
    return data.map(mapEduVacataireLogFromDb);
  },

  async upsertVacataireLog(log: EduVacataireLog): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || log.tenantId,
      businessId: log.businessId,
      branchId: log.branchId || log.facilityId,
      staffId: log.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      instructor_id: log.instructorId,
      instructor_name: log.instructorName,
      session_id: log.sessionId ? toValidUuid(log.sessionId) : null,
      cohort_id: log.cohortId ? toValidUuid(log.cohortId) : null,
      cohort_name: log.cohortName || null,
      work_date: log.workDate,
      hours_worked: log.hoursWorked,
      hourly_rate_centimes: log.hourlyRateCentimes,
      gross_amount_centimes: log.grossAmountCentimes,
      status: log.status,
      payroll_run_id: log.payrollRunId ? toValidUuid(log.payrollRunId) : null,
      notes: log.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_vacataire_logs', payload, {
      expectedVersion: log.version,
      entityType: 'EduVacataireLog',
      entityLabel: `${log.instructorName} (${log.hoursWorked}h)`,
      localData: payload,
    });
    return res.success;
  },

  async fetchDrivingLogs(branchId: string): Promise<EduDrivingLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_driving_logs')
        .select(
          'id, account_id, business_id, branch_id, staff_id, student_id, student_name, instructor_id, instructor_name, vehicle_id, vehicle_label, vehicle_plate, log_kind, scheduled_date, start_time, end_time, hours_logged, exam_result, dossier_ref, notes, version, created_at, updated_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false })
        .range(from, to)
    );
    return data.map(mapEduDrivingLogFromDb);
  },

  async upsertDrivingLog(log: EduDrivingLog): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || log.tenantId,
      businessId: log.businessId,
      branchId: log.branchId || log.facilityId,
      staffId: log.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      student_id: toValidUuid(log.studentId),
      student_name: log.studentName,
      instructor_id: log.instructorId,
      instructor_name: log.instructorName,
      vehicle_id: log.vehicleId || null,
      vehicle_label: log.vehicleLabel || null,
      vehicle_plate: log.vehiclePlate || null,
      log_kind: log.logKind,
      scheduled_date: log.scheduledDate,
      start_time: log.startTime,
      end_time: log.endTime,
      hours_logged: log.hoursLogged,
      exam_result: log.examResult,
      dossier_ref: log.dossierRef || null,
      notes: log.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_driving_logs', payload, {
      expectedVersion: log.version,
      entityType: 'EduDrivingLog',
      entityLabel: `${log.studentName} — ${log.logKind}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchK12Services(branchId: string): Promise<EduK12Service[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_k12_services')
        .select(
          'id, account_id, business_id, branch_id, staff_id, student_id, student_name, service_type, plan_name, route_or_diet, pickup_stop, monthly_fee_centimes, status, start_date, end_date, check_in_today, last_check_in_at, notes, version, created_at, updated_at'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
    return data.map(mapEduK12ServiceFromDb);
  },

  async upsertK12Service(svc: EduK12Service): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: svc.accountId || svc.tenantId,
      businessId: svc.businessId,
      branchId: svc.branchId || svc.facilityId,
      staffId: svc.staffId,
    });
    const payload = {
      id: toValidUuid(svc.id),
      ...trace,
      student_id: toValidUuid(svc.studentId),
      student_name: svc.studentName,
      service_type: svc.serviceType,
      plan_name: svc.planName,
      route_or_diet: svc.routeOrDiet || null,
      pickup_stop: svc.pickupStop || null,
      monthly_fee_centimes: svc.monthlyFeeCentimes,
      status: svc.status,
      start_date: svc.startDate,
      end_date: svc.endDate || null,
      check_in_today: Boolean(svc.checkInToday),
      last_check_in_at: svc.lastCheckInAt || null,
      notes: svc.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('edu_k12_services', payload, {
      expectedVersion: svc.version,
      entityType: 'EduK12Service',
      entityLabel: `${svc.studentName} — ${svc.planName}`,
      localData: payload,
    });
    return res.success;
  },

  async transferCohortAtomic(params: {
    enrollmentId: string;
    targetCohortId: string;
    transferDate?: string;
    allowWaitlist?: boolean;
    reason?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('edu_transfer_student_cohort_atomic', {
      p_enrollment_id: toValidUuid(params.enrollmentId),
      p_target_cohort_id: toValidUuid(params.targetCohortId),
      p_transfer_date: params.transferDate || new Date().toISOString().slice(0, 10),
      p_allow_waitlist: Boolean(params.allowWaitlist),
      p_reason: params.reason || null,
    });
    return res.success;
  },

  async reissueOrRevokeCertificate(params: {
    certificateId: string;
    action: 'reissue' | 'revoke';
    reason?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('edu_reissue_or_revoke_certificate', {
      p_certificate_id: toValidUuid(params.certificateId),
      p_action: params.action,
      p_reason: params.reason || null,
    });
    return res.success;
  },

  async postVacataireLogsToPayroll(logIds: string[], payrollRunId?: string): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('edu_post_vacataire_hours_to_payroll', {
      p_log_ids: logIds.map((id) => toValidUuid(id)),
      p_payroll_run_id: payrollRunId ? toValidUuid(payrollRunId) : null,
    });
    return res.success;
  },
};

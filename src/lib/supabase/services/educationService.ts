import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  EduCourse,
  EduClassroom,
  EduCohort,
  EduStudent,
  EduEnrollment,
  EduSession,
  EduAttendance,
  EduGrade,
  EduCertificate,
  EduAdmissionLead,
} from '../../../types/index';

export const educationService = {
  async fetchCourses(branchId: string, updatedAfter?: string | null): Promise<EduCourse[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('edu_courses')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map((row: any): EduCourse => ({
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
      version: row.version != null ? Number(row.version) : undefined,
      createdAt: row.created_at,
    }));
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map((row: any): EduClassroom => ({
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
    }));
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map((row: any): EduCohort => ({
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
      version: row.version != null ? Number(row.version) : undefined,
      createdAt: row.created_at,
    }));
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
      classroom_name: cohort.classroomName || null,
      start_date: cohort.startDate,
      end_date: cohort.endDate,
      max_students: cohort.maxStudents,
      enrolled_count: cohort.enrolledCount,
      tuition_fee: cohort.tuitionFee,
      currency: cohort.currency,
      schedule_summary: cohort.scheduleSummary,
      status: cohort.status,
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map((row: any): EduStudent => ({
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
      schoolGrade: row.school_grade || undefined,
      attendanceRatePercent: Number(row.attendance_rate_percent || 100),
      status: row.status || 'Active',
      notes: row.notes || undefined,
      version: row.version != null ? Number(row.version) : undefined,
      createdAt: row.created_at,
    }));
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map((row: any): EduEnrollment => ({
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
      paidAmount: Number(row.paid_amount || 0),
      balanceDue: Number(row.balance_due || 0),
      currency: row.currency || 'DZD',
      paymentStatus: (row.payment_status || 'Pending') as EduEnrollment['paymentStatus'],
      status: (row.status || 'Active') as EduEnrollment['status'],
      installments: Array.isArray(row.installments) ? row.installments : [],
      version: row.version != null ? Number(row.version) : undefined,
    }));
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
      paid_amount: en.paidAmount,
      balance_due: en.balanceDue,
      currency: en.currency,
      payment_status: en.paymentStatus,
      status: en.status,
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map((row: any): EduSession => ({
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
      version: row.version != null ? Number(row.version) : undefined,
      createdAt: row.created_at,
    }));
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

  async fetchAttendance(branchId: string): Promise<EduAttendance[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('edu_attendance')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map((row: any): EduAttendance => ({
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
      version: row.version != null ? Number(row.version) : undefined,
    }));
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map((row: any): EduGrade => ({
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
    }));
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map((row: any): EduCertificate => ({
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
      version: row.version != null ? Number(row.version) : undefined,
      createdAt: row.created_at,
    }));
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
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    );
    return data.map((row: any): EduAdmissionLead => ({
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
    }));
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
};

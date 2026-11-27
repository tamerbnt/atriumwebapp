import {
  centimesToDzd,
  dzdToCentimes,
  roundHalfAwayFromZero,
} from './money';
import type {
  EduAttendance,
  EduCertificate,
  EduCohort,
  EduDiscountType,
  EduDrivingLog,
  EduEnrollment,
  EduGrade,
  EduGradeScale,
  EduK12Service,
  EduSession,
  EduStudent,
  EduTermReportCard,
  EduVacataireLog,
} from '../types/index';

export interface CohortCapacityCheck {
  allowed: boolean;
  waitlisted: boolean;
  remainingSeats: number;
  reasonCode?: 'COHORT_FULL';
}

export function checkCohortCapacity(
  cohort: Pick<EduCohort, 'maxStudents' | 'enrolledCount' | 'waitlistEnabled'> | null | undefined,
  allowWaitlist = false
): CohortCapacityCheck {
  if (!cohort) {
    return { allowed: false, waitlisted: false, remainingSeats: 0, reasonCode: 'COHORT_FULL' };
  }
  const maxSeats = Math.max(0, Number(cohort.maxStudents || 0));
  const enrolled = Math.max(0, Number(cohort.enrolledCount || 0));
  const remainingSeats = Math.max(0, maxSeats - enrolled);

  if (remainingSeats > 0) {
    return { allowed: true, waitlisted: false, remainingSeats };
  }
  if (allowWaitlist && cohort.waitlistEnabled !== false) {
    return { allowed: true, waitlisted: true, remainingSeats: 0 };
  }
  return { allowed: false, waitlisted: false, remainingSeats: 0, reasonCode: 'COHORT_FULL' };
}

export interface TuitionDiscountSummary {
  baseTuitionCentimes: number;
  discountCentimes: number;
  agreedTuitionCentimes: number;
  refundedCentimes: number;
  paidCentimes: number;
  balanceDueCentimes: number;
  baseTuitionDzd: number;
  discountDzd: number;
  agreedTuitionDzd: number;
  balanceDueDzd: number;
}

export function computeTuitionWithDiscountsAndRefund(input: {
  baseTuitionDzd: number;
  discountType?: EduDiscountType;
  siblingDiscountDzd?: number;
  scholarshipDzd?: number;
  customDiscountDzd?: number;
  paidDzd?: number;
  refundedDzd?: number;
}): TuitionDiscountSummary {
  const baseTuitionCentimes = Math.max(0, dzdToCentimes(Number(input.baseTuitionDzd || 0)));
  const rawDiscountCentimes =
    Math.max(0, dzdToCentimes(Number(input.siblingDiscountDzd || 0))) +
    Math.max(0, dzdToCentimes(Number(input.scholarshipDzd || 0))) +
    Math.max(0, dzdToCentimes(Number(input.customDiscountDzd || 0)));
  const discountCentimes = Math.min(baseTuitionCentimes, rawDiscountCentimes);
  const agreedTuitionCentimes = Math.max(0, baseTuitionCentimes - discountCentimes);
  const paidCentimes = Math.max(0, dzdToCentimes(Number(input.paidDzd || 0)));
  const refundedCentimes = Math.min(
    paidCentimes,
    Math.max(0, dzdToCentimes(Number(input.refundedDzd || 0)))
  );
  const netPaidCentimes = Math.max(0, paidCentimes - refundedCentimes);
  const balanceDueCentimes = Math.max(0, agreedTuitionCentimes - netPaidCentimes);

  return {
    baseTuitionCentimes,
    discountCentimes,
    agreedTuitionCentimes,
    refundedCentimes,
    paidCentimes: netPaidCentimes,
    balanceDueCentimes,
    baseTuitionDzd: centimesToDzd(baseTuitionCentimes),
    discountDzd: centimesToDzd(discountCentimes),
    agreedTuitionDzd: centimesToDzd(agreedTuitionCentimes),
    balanceDueDzd: centimesToDzd(balanceDueCentimes),
  };
}

export interface CohortTransferProrationResult {
  totalDays: number;
  elapsedDays: number;
  remainingRatio: number;
  unusedTuitionCreditCentimes: number;
  carriedCreditCentimes: number;
  targetTuitionCentimes: number;
  newBalanceDueCentimes: number;
  excessRefundDueCentimes: number;
  carriedCreditDzd: number;
  newBalanceDueDzd: number;
  excessRefundDueDzd: number;
}

export function computeCohortTransferProration(input: {
  sourceCohortStart: string;
  sourceCohortEnd: string;
  transferDate: string;
  sourceAgreedTuitionDzd: number;
  sourcePaidDzd: number;
  targetTuitionDzd: number;
}): CohortTransferProrationResult {
  const startMs = Date.parse(input.sourceCohortStart);
  const endMs = Date.parse(input.sourceCohortEnd);
  const transferMs = Date.parse(input.transferDate);
  const dayMs = 86_400_000;

  const totalDays =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? Math.max(1, Math.round((endMs - startMs) / dayMs))
      : 30;
  const elapsedDays =
    Number.isFinite(startMs) && Number.isFinite(transferMs)
      ? Math.max(0, Math.min(totalDays, Math.round((transferMs - startMs) / dayMs)))
      : 0;
  const remainingRatio = Math.max(0, Math.min(1, (totalDays - elapsedDays) / totalDays));

  const srcAgreedCentimes = Math.max(0, dzdToCentimes(Number(input.sourceAgreedTuitionDzd || 0)));
  const srcPaidCentimes = Math.max(0, dzdToCentimes(Number(input.sourcePaidDzd || 0)));
  const targetTuitionCentimes = Math.max(0, dzdToCentimes(Number(input.targetTuitionDzd || 0)));

  const unusedTuitionCreditCentimes = roundHalfAwayFromZero(srcAgreedCentimes * remainingRatio);
  const carriedCreditCentimes = Math.min(srcPaidCentimes, unusedTuitionCreditCentimes);
  const newBalanceDueCentimes = Math.max(0, targetTuitionCentimes - carriedCreditCentimes);
  const excessRefundDueCentimes = Math.max(0, carriedCreditCentimes - targetTuitionCentimes);

  return {
    totalDays,
    elapsedDays,
    remainingRatio: Math.round(remainingRatio * 10_000) / 10_000,
    unusedTuitionCreditCentimes,
    carriedCreditCentimes,
    targetTuitionCentimes,
    newBalanceDueCentimes,
    excessRefundDueCentimes,
    carriedCreditDzd: centimesToDzd(carriedCreditCentimes),
    newBalanceDueDzd: centimesToDzd(newBalanceDueCentimes),
    excessRefundDueDzd: centimesToDzd(excessRefundDueCentimes),
  };
}

export function normalizeGradeScore(
  score: number,
  sourceMaxScore: number,
  targetScale: EduGradeScale = 20
): number {
  const safeMax = Number(sourceMaxScore || 0);
  if (safeMax <= 0) return 0;
  const clamped = Math.max(0, Number(score || 0));
  const scaled = (clamped / safeMax) * targetScale;
  return Math.round(scaled * 100) / 100;
}

export function computeWeightedAverageOnScale(
  grades: Pick<EduGrade, 'score' | 'maxScore' | 'weightPercent'>[],
  targetScale: EduGradeScale = 20
): number {
  if (!grades || grades.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const g of grades) {
    const w = Math.max(0, Number(g.weightPercent || 0)) || 1;
    const scaled = normalizeGradeScore(g.score, g.maxScore, targetScale);
    weightedSum += scaled * w;
    totalWeight += w;
  }
  if (totalWeight <= 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function buildStudentTermReportCard(input: {
  student: Pick<EduStudent, 'id' | 'fullName' | 'attendanceRatePercent'>;
  cohort: Pick<EduCohort, 'id' | 'name' | 'gradeScale'>;
  cohortGrades: EduGrade[];
  studentAttendance: EduAttendance[];
  language?: string;
}): EduTermReportCard {
  const gradeScale: EduGradeScale = input.cohort.gradeScale === 100 ? 100 : 20;
  const studentGrades = input.cohortGrades.filter((g) => g.studentId === input.student.id);
  const cohortStudentIds = Array.from(new Set(input.cohortGrades.map((g) => g.studentId)));
  const cohortStudentAverages = cohortStudentIds.map((sid) =>
    computeWeightedAverageOnScale(
      input.cohortGrades.filter((g) => g.studentId === sid),
      gradeScale
    )
  );
  const classAverageOnScale =
    cohortStudentAverages.length > 0
      ? Math.round(
          (cohortStudentAverages.reduce((s, v) => s + v, 0) / cohortStudentAverages.length) * 100
        ) / 100
      : 0;

  const weightedAverageOnScale = computeWeightedAverageOnScale(studentGrades, gradeScale);
  const normalizedPercent =
    gradeScale > 0 ? Math.round((weightedAverageOnScale / gradeScale) * 1000) / 10 : 0;

  const att = input.studentAttendance.filter(
    (a) => a.studentId === input.student.id && a.cohortId === input.cohort.id
  );
  const presentCount = att.filter((a) => a.status === 'Present').length;
  const lateCount = att.filter((a) => a.status === 'Late').length;
  const absentCount = att.filter((a) => a.status === 'Absent').length;
  const attendanceRatePercent =
    att.length > 0
      ? Math.round(((presentCount + lateCount) / att.length) * 1000) / 10
      : Number(input.student.attendanceRatePercent ?? 100);

  const lang = input.language || 'fr';
  const passThreshold = gradeScale === 100 ? 50 : 10;
  const honorsThreshold = gradeScale === 100 ? 80 : 16;
  let decisionLabel = '';
  if (studentGrades.length === 0) {
    decisionLabel = lang === 'ar' ? 'قيد التقييم' : lang === 'en' ? 'In Progress' : 'En cours d’évaluation';
  } else if (weightedAverageOnScale >= honorsThreshold) {
    decisionLabel =
      lang === 'ar'
        ? 'ناجح بتفوق (تهنئة)'
        : lang === 'en'
        ? 'Passed with Distinction'
        : 'Admis — Félicitations';
  } else if (weightedAverageOnScale >= passThreshold) {
    decisionLabel = lang === 'ar' ? 'ناجح' : lang === 'en' ? 'Passed' : 'Admis(e)';
  } else {
    decisionLabel = lang === 'ar' ? 'استدراك مطلوب' : lang === 'en' ? 'Remedial Review' : 'Rattrapage requis';
  }

  return {
    studentId: input.student.id,
    studentName: input.student.fullName,
    cohortId: input.cohort.id,
    cohortName: input.cohort.name,
    gradeScale,
    weightedAverageOnScale,
    normalizedPercent,
    classAverageOnScale,
    attendanceRatePercent,
    presentCount,
    lateCount,
    absentCount,
    decisionLabel,
    lines: studentGrades.map((g) => ({
      assessmentTitle: g.assessmentTitle,
      rawScore: g.score,
      rawMaxScore: g.maxScore,
      scaledScore: normalizeGradeScore(g.score, g.maxScore, gradeScale),
      weightPercent: g.weightPercent,
      teacherRemarks: g.teacherRemarks,
      gradedAt: g.gradedAt,
    })),
  };
}

export interface SessionConflictResult {
  hasConflict: boolean;
  reasonCode?: 'INVALID_TIME_WINDOW' | 'INSTRUCTOR_CONFLICT' | 'CLASSROOM_CONFLICT' | 'VEHICLE_CONFLICT';
  conflictingSession?: EduSession;
}

export function detectEduSessionConflicts(
  candidate: Pick<
    EduSession,
    'date' | 'startTime' | 'endTime' | 'instructorId' | 'classroomId' | 'vehicleId' | 'status'
  > & { id?: string },
  existingSessions: EduSession[]
): SessionConflictResult {
  if (!candidate.date || !candidate.startTime || !candidate.endTime || candidate.endTime <= candidate.startTime) {
    return { hasConflict: true, reasonCode: 'INVALID_TIME_WINDOW' };
  }
  if (candidate.status === 'Cancelled') {
    return { hasConflict: false };
  }

  for (const existing of existingSessions) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (existing.status === 'Cancelled') continue;
    if (existing.date !== candidate.date) continue;

    // Half-open [start, end) overlap check on HH:MM strings
    if (candidate.startTime < existing.endTime && existing.startTime < candidate.endTime) {
      if (candidate.instructorId && existing.instructorId && candidate.instructorId === existing.instructorId) {
        return {
          hasConflict: true,
          reasonCode: 'INSTRUCTOR_CONFLICT',
          conflictingSession: existing,
        };
      }
      if (candidate.classroomId && existing.classroomId && candidate.classroomId === existing.classroomId) {
        return {
          hasConflict: true,
          reasonCode: 'CLASSROOM_CONFLICT',
          conflictingSession: existing,
        };
      }
      if (candidate.vehicleId && existing.vehicleId && candidate.vehicleId === existing.vehicleId) {
        return {
          hasConflict: true,
          reasonCode: 'VEHICLE_CONFLICT',
          conflictingSession: existing,
        };
      }
    }
  }

  return { hasConflict: false };
}

export function computeSessionDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = String(startTime || '09:00').split(':').map((n) => parseInt(n, 10) || 0);
  const [eh, em] = String(endTime || '11:00').split(':').map((n) => parseInt(n, 10) || 0);
  const diffMin = eh * 60 + em - (sh * 60 + sm);
  if (diffMin <= 0) return 0;
  return Math.round((diffMin / 60) * 100) / 100;
}

export function computeVacataireSessionPay(hoursWorked: number, hourlyRateDzd: number): {
  hoursWorked: number;
  hourlyRateCentimes: number;
  grossAmountCentimes: number;
  grossAmountDzd: number;
} {
  const safeHours = Math.max(0, Math.round(Number(hoursWorked || 0) * 100) / 100);
  const hourlyRateCentimes = Math.max(0, dzdToCentimes(Number(hourlyRateDzd || 0)));
  const grossAmountCentimes = roundHalfAwayFromZero(hourlyRateCentimes * safeHours);
  return {
    hoursWorked: safeHours,
    hourlyRateCentimes,
    grossAmountCentimes,
    grossAmountDzd: centimesToDzd(grossAmountCentimes),
  };
}

export function summarizeVacatairePayroll(logs: EduVacataireLog[]): {
  pendingHours: number;
  pendingTotalCentimes: number;
  pendingTotalDzd: number;
  postedTotalCentimes: number;
  postedTotalDzd: number;
  byInstructor: Array<{
    instructorId: string;
    instructorName: string;
    pendingHours: number;
    pendingCentimes: number;
    postedCentimes: number;
  }>;
} {
  let pendingHours = 0;
  let pendingTotalCentimes = 0;
  let postedTotalCentimes = 0;
  const map = new Map<
    string,
    { instructorId: string; instructorName: string; pendingHours: number; pendingCentimes: number; postedCentimes: number }
  >();

  for (const log of logs) {
    if (log.deletedAt || log.status === 'cancelled') continue;
    const entry = map.get(log.instructorId) || {
      instructorId: log.instructorId,
      instructorName: log.instructorName,
      pendingHours: 0,
      pendingCentimes: 0,
      postedCentimes: 0,
    };
    if (log.status === 'pending') {
      pendingHours += Number(log.hoursWorked || 0);
      pendingTotalCentimes += Number(log.grossAmountCentimes || 0);
      entry.pendingHours += Number(log.hoursWorked || 0);
      entry.pendingCentimes += Number(log.grossAmountCentimes || 0);
    } else if (log.status === 'posted_to_payroll') {
      postedTotalCentimes += Number(log.grossAmountCentimes || 0);
      entry.postedCentimes += Number(log.grossAmountCentimes || 0);
    }
    map.set(log.instructorId, entry);
  }

  return {
    pendingHours: Math.round(pendingHours * 100) / 100,
    pendingTotalCentimes,
    pendingTotalDzd: centimesToDzd(pendingTotalCentimes),
    postedTotalCentimes,
    postedTotalDzd: centimesToDzd(postedTotalCentimes),
    byInstructor: Array.from(map.values()),
  };
}

export interface DunningEvaluation {
  enrollmentId: string;
  isOverdue: boolean;
  overdueAmountDzd: number;
  daysOverdue: number;
  escalationLevel: 0 | 1 | 2 | 3;
  recommendedChannel: 'in_app' | 'sms' | 'whatsapp';
}

export function evaluateEnrollmentDunning(
  enrollment: EduEnrollment,
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): DunningEvaluation {
  const refDay = referenceDateIso.slice(0, 10);
  const unpaidOverdue = (enrollment.installments || []).filter(
    (inst) => !inst.isPaid && inst.dueDate && inst.dueDate < refDay
  );
  const balanceDue = Math.max(0, Number(enrollment.balanceDue || 0));
  if (balanceDue <= 0) {
    return {
      enrollmentId: enrollment.id,
      isOverdue: false,
      overdueAmountDzd: 0,
      daysOverdue: 0,
      escalationLevel: 0,
      recommendedChannel: 'in_app',
    };
  }

  let oldestDue = '';
  for (const inst of unpaidOverdue) {
    if (!oldestDue || inst.dueDate < oldestDue) oldestDue = inst.dueDate;
  }

  let daysOverdue = 0;
  if (oldestDue) {
    const diffMs = Date.parse(refDay) - Date.parse(oldestDue);
    daysOverdue = Number.isFinite(diffMs) ? Math.max(0, Math.floor(diffMs / 86_400_000)) : 0;
  }

  const isOverdue = enrollment.paymentStatus === 'Overdue' || unpaidOverdue.length > 0;
  let escalationLevel: 0 | 1 | 2 | 3 = 0;
  if (isOverdue) {
    if (daysOverdue >= 30) escalationLevel = 3;
    else if (daysOverdue >= 10) escalationLevel = 2;
    else escalationLevel = 1;
  }

  const overdueAmountDzd =
    unpaidOverdue.length > 0
      ? Math.min(
          balanceDue,
          unpaidOverdue.reduce((sum, inst) => sum + Number(inst.amount || 0), 0)
        )
      : balanceDue;

  return {
    enrollmentId: enrollment.id,
    isOverdue,
    overdueAmountDzd,
    daysOverdue,
    escalationLevel,
    recommendedChannel: escalationLevel >= 2 ? 'whatsapp' : escalationLevel === 1 ? 'sms' : 'in_app',
  };
}

export function buildReissuedCertificatePayload(
  sourceCert: EduCertificate,
  newId: string,
  issueDateIso: string = new Date().toISOString().slice(0, 10)
): EduCertificate {
  if (sourceCert.status === 'revoked') {
    throw new Error('CANNOT_REISSUE_REVOKED_CERTIFICATE');
  }
  const nextCount = Number(sourceCert.reissueCount || 0) + 1;
  const baseNumber = sourceCert.certificateNumber.replace(/-R\d+$/, '');
  return {
    ...sourceCert,
    id: newId,
    certificateNumber: `${baseNumber}-R${nextCount}`,
    verificationHash: sourceCert.verificationHash, // Strictly preserved across reissues!
    issueDate: issueDateIso,
    status: 'active',
    revokedAt: undefined,
    revokedReason: undefined,
    reissuedFromId: sourceCert.id,
    reissueCount: nextCount,
    createdAt: new Date().toISOString(),
  };
}

export function buildStudentCardQrPayload(student: Pick<EduStudent, 'id' | 'studentCardNumber' | 'fullName' | 'facilityId'>): string {
  const cardNo = student.studentCardNumber || `STU-${student.id.slice(-6).toUpperCase()}`;
  return `ATR:STU:${student.facilityId}:${student.id}:${cardNo}`;
}

export function renderEduEnrollmentContract(input: {
  institutionName: string;
  student: EduStudent;
  enrollment: EduEnrollment;
  cohort?: EduCohort;
  language?: string;
}): string {
  const lang = input.language || 'fr';
  const contractNo =
    input.enrollment.contractNumber ||
    `CTR-EDU-${input.enrollment.id.slice(-6).toUpperCase()}`;
  const signedLine = input.enrollment.contractSignedAt
    ? `${input.enrollment.contractSignerName || input.student.guardianName || input.student.fullName} · ${input.enrollment.contractSignedAt.slice(0, 10)}`
    : lang === 'ar'
    ? 'بانتظار التوقيع'
    : lang === 'en'
    ? 'Pending Signature'
    : 'En attente de signature';

  if (lang === 'ar') {
    return [
      `عقد التسجيل والدراسة رقم ${contractNo}`,
      `المؤسسة: ${input.institutionName}`,
      `الطالب: ${input.student.fullName} (${input.student.phone || '—'})`,
      `ولي الأمر: ${input.student.guardianName || '—'} (${input.student.guardianPhone || '—'})`,
      `الفوج / التكوين: ${input.enrollment.cohortName}`,
      `الفترة: ${input.cohort?.startDate || '—'} إلى ${input.cohort?.endDate || '—'}`,
      `المبلغ الصافي المتفق عليه: ${input.enrollment.agreedTuition.toLocaleString()} ${input.enrollment.currency}`,
      `التخفيضات / المنح: ${(input.enrollment.discountAmount || 0).toLocaleString()} ${input.enrollment.currency}`,
      `المبلغ المدفوع: ${input.enrollment.paidAmount.toLocaleString()} ${input.enrollment.currency} | المتبقي: ${input.enrollment.balanceDue.toLocaleString()} ${input.enrollment.currency}`,
      `التوقيع: ${signedLine}`,
    ].join('\n');
  }

  if (lang === 'en') {
    return [
      `ENROLLMENT AGREEMENT #${contractNo}`,
      `Institution: ${input.institutionName}`,
      `Student: ${input.student.fullName} (${input.student.phone || '—'})`,
      `Guardian: ${input.student.guardianName || '—'} (${input.student.guardianPhone || '—'})`,
      `Cohort / Program: ${input.enrollment.cohortName}`,
      `Schedule: ${input.cohort?.startDate || '—'} to ${input.cohort?.endDate || '—'} (${input.cohort?.scheduleSummary || 'Standard'})`,
      `Agreed Tuition: ${input.enrollment.agreedTuition.toLocaleString()} ${input.enrollment.currency}`,
      `Discounts / Scholarship: ${(input.enrollment.discountAmount || 0).toLocaleString()} ${input.enrollment.currency}`,
      `Paid: ${input.enrollment.paidAmount.toLocaleString()} ${input.enrollment.currency} | Balance Due: ${input.enrollment.balanceDue.toLocaleString()} ${input.enrollment.currency}`,
      `Signature: ${signedLine}`,
    ].join('\n');
  }

  return [
    `CONTRAT D'INSCRIPTION & SCOLARITÉ N° ${contractNo}`,
    `Établissement : ${input.institutionName}`,
    `Apprenant : ${input.student.fullName} (${input.student.phone || '—'})`,
    `Tuteur / Parent : ${input.student.guardianName || '—'} (${input.student.guardianPhone || '—'})`,
    `Cohorte / Formation : ${input.enrollment.cohortName}`,
    `Période : Du ${input.cohort?.startDate || '—'} au ${input.cohort?.endDate || '—'} (${input.cohort?.scheduleSummary || 'Standard'})`,
    `Frais nets convenus : ${input.enrollment.agreedTuition.toLocaleString()} ${input.enrollment.currency}`,
    `Remises & Bourses : ${(input.enrollment.discountAmount || 0).toLocaleString()} ${input.enrollment.currency}`,
    `Montant réglé : ${input.enrollment.paidAmount.toLocaleString()} ${input.enrollment.currency} | Solde dû : ${input.enrollment.balanceDue.toLocaleString()} ${input.enrollment.currency}`,
    `Signature : ${signedLine}`,
  ].join('\n');
}

export function detectDrivingVehicleOrInstructorConflict(
  candidate: Pick<EduDrivingLog, 'scheduledDate' | 'startTime' | 'endTime' | 'vehicleId' | 'instructorId'> & { id?: string },
  existingLogs: EduDrivingLog[]
): { hasConflict: boolean; reason?: 'VEHICLE_CONFLICT' | 'INSTRUCTOR_CONFLICT'; conflictingLog?: EduDrivingLog } {
  for (const log of existingLogs) {
    if (log.deletedAt) continue;
    if (candidate.id && log.id === candidate.id) continue;
    if (log.scheduledDate !== candidate.scheduledDate) continue;
    if (candidate.startTime < log.endTime && log.startTime < candidate.endTime) {
      if (candidate.vehicleId && log.vehicleId && candidate.vehicleId === log.vehicleId) {
        return { hasConflict: true, reason: 'VEHICLE_CONFLICT', conflictingLog: log };
      }
      if (candidate.instructorId && log.instructorId && candidate.instructorId === log.instructorId) {
        return { hasConflict: true, reason: 'INSTRUCTOR_CONFLICT', conflictingLog: log };
      }
    }
  }
  return { hasConflict: false };
}

export function summarizeDrivingStudentProgress(logs: EduDrivingLog[], studentId: string): {
  totalDrivingHours: number;
  codePassed: boolean;
  circuitPassed: boolean;
  roadPassed: boolean;
  readyForRoadExam: boolean;
} {
  const list = logs.filter((l) => l.studentId === studentId && !l.deletedAt);
  const totalDrivingHours =
    Math.round(
      list
        .filter((l) => l.logKind === 'driving_hours')
        .reduce((s, l) => s + Number(l.hoursLogged || 0), 0) * 100
    ) / 100;
  const codePassed = list.some((l) => l.logKind === 'code_exam' && l.examResult === 'passed');
  const circuitPassed = list.some((l) => l.logKind === 'circuit_exam' && l.examResult === 'passed');
  const roadPassed = list.some((l) => l.logKind === 'road_exam' && l.examResult === 'passed');
  return {
    totalDrivingHours,
    codePassed,
    circuitPassed,
    roadPassed,
    readyForRoadExam: codePassed && circuitPassed && totalDrivingHours >= 20,
  };
}

export function summarizeK12Services(services: EduK12Service[]): {
  activeCanteenCount: number;
  activeTransportCount: number;
  checkedInTodayCount: number;
  monthlyRecurringCentimes: number;
  monthlyRecurringDzd: number;
  routes: string[];
} {
  const active = services.filter((s) => !s.deletedAt && s.status === 'active');
  const activeCanteenCount = active.filter((s) => s.serviceType === 'canteen').length;
  const activeTransportCount = active.filter((s) => s.serviceType === 'transport').length;
  const checkedInTodayCount = active.filter((s) => Boolean(s.checkInToday)).length;
  const monthlyRecurringCentimes = active.reduce((s, item) => s + Number(item.monthlyFeeCentimes || 0), 0);
  const routes = Array.from(
    new Set(
      active
        .filter((s) => s.serviceType === 'transport' && s.routeOrDiet)
        .map((s) => String(s.routeOrDiet))
    )
  );
  return {
    activeCanteenCount,
    activeTransportCount,
    checkedInTodayCount,
    monthlyRecurringCentimes,
    monthlyRecurringDzd: centimesToDzd(monthlyRecurringCentimes),
    routes,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReissuedCertificatePayload,
  buildStudentCardQrPayload,
  buildStudentTermReportCard,
  checkCohortCapacity,
  computeCohortTransferProration,
  computeSessionDurationHours,
  computeTuitionWithDiscountsAndRefund,
  computeVacataireSessionPay,
  computeWeightedAverageOnScale,
  detectDrivingVehicleOrInstructorConflict,
  detectEduSessionConflicts,
  evaluateEnrollmentDunning,
  normalizeGradeScore,
  renderEduEnrollmentContract,
  summarizeDrivingStudentProgress,
  summarizeK12Services,
  summarizeVacatairePayroll,
} from './educationDepth';
import type {
  EduCertificate,
  EduCohort,
  EduDrivingLog,
  EduEnrollment,
  EduGrade,
  EduK12Service,
  EduSession,
  EduStudent,
  EduVacataireLog,
} from '../types/index';

test('cohort capacity guard blocks when full and permits waitlist when explicitly allowed', () => {
  const fullCohort = { maxStudents: 15, enrolledCount: 15, waitlistEnabled: true };
  assert.deepEqual(checkCohortCapacity(fullCohort, false), {
    allowed: false,
    waitlisted: false,
    remainingSeats: 0,
    reasonCode: 'COHORT_FULL',
  });
  assert.deepEqual(checkCohortCapacity(fullCohort, true), {
    allowed: true,
    waitlisted: true,
    remainingSeats: 0,
  });
  assert.equal(checkCohortCapacity({ maxStudents: 15, enrolledCount: 12 }, false).remainingSeats, 3);
});

test('tuition sibling/scholarship discounts and refunds use exact integer centimes math', () => {
  const res = computeTuitionWithDiscountsAndRefund({
    baseTuitionDzd: 45000,
    discountType: 'sibling',
    siblingDiscountDzd: 4500,
    scholarshipDzd: 2500,
    paidDzd: 25000,
    refundedDzd: 5000,
  });
  assert.equal(res.discountDzd, 7000);
  assert.equal(res.agreedTuitionDzd, 38000);
  assert.equal(res.paidCentimes, 2000000);
  assert.equal(res.balanceDueDzd, 18000);
});

test('mid-term cohort transfer proration calculates carried credit & target balance accurately', () => {
  const proration = computeCohortTransferProration({
    sourceCohortStart: '2026-10-01',
    sourceCohortEnd: '2026-10-31',
    transferDate: '2026-10-16',
    sourceAgreedTuitionDzd: 30000,
    sourcePaidDzd: 30000,
    targetTuitionDzd: 36000,
  });
  assert.equal(proration.totalDays, 30);
  assert.equal(proration.elapsedDays, 15);
  assert.equal(proration.remainingRatio, 0.5);
  assert.equal(proration.carriedCreditDzd, 15000);
  assert.equal(proration.newBalanceDueDzd, 21000);
});

test('grade normalization and report card builder support mixed /20 and /100 scales', () => {
  assert.equal(normalizeGradeScore(15, 20, 100), 75);
  assert.equal(normalizeGradeScore(85, 100, 20), 17);

  const grades: EduGrade[] = [
    {
      id: 'g1',
      tenantId: 'a',
      facilityId: 'b',
      cohortId: 'c1',
      studentId: 's1',
      studentName: 'Amina',
      assessmentTitle: 'Midterm',
      score: 16,
      maxScore: 20,
      weightPercent: 40,
      gradedAt: '2026-11-10T10:00:00Z',
    },
    {
      id: 'g2',
      tenantId: 'a',
      facilityId: 'b',
      cohortId: 'c1',
      studentId: 's1',
      studentName: 'Amina',
      assessmentTitle: 'Final Project',
      score: 90,
      maxScore: 100,
      weightPercent: 60,
      gradedAt: '2026-11-20T10:00:00Z',
    },
  ];

  // (80 * 40 + 90 * 60) / 100 = 86 / 100
  assert.equal(computeWeightedAverageOnScale(grades, 100), 86);
  assert.equal(computeWeightedAverageOnScale(grades, 20), 17.2);

  const bulletin = buildStudentTermReportCard({
    student: { id: 's1', fullName: 'Amina', attendanceRatePercent: 95 },
    cohort: { id: 'c1', name: 'Fullstack', gradeScale: 100 },
    cohortGrades: grades,
    studentAttendance: [],
    language: 'en',
  });
  assert.equal(bulletin.weightedAverageOnScale, 86);
  assert.equal(bulletin.decisionLabel, 'Passed with Distinction');
});

test('timetable conflict check rejects teacher/classroom overlap and ignores cancelled sessions', () => {
  const existing: EduSession[] = [
    {
      id: 'se_1',
      tenantId: 'a',
      facilityId: 'b',
      cohortId: 'c1',
      cohortName: 'C1',
      classroomId: 'r1',
      instructorId: 't1',
      instructorName: 'Karim',
      date: '2026-12-01',
      startTime: '09:00',
      endTime: '11:00',
      status: 'Scheduled',
      createdAt: '2026-11-01',
    },
    {
      id: 'se_cancelled',
      tenantId: 'a',
      facilityId: 'b',
      cohortId: 'c2',
      cohortName: 'C2',
      classroomId: 'r2',
      instructorId: 't2',
      instructorName: 'Lina',
      date: '2026-12-01',
      startTime: '14:00',
      endTime: '16:00',
      status: 'Cancelled',
      createdAt: '2026-11-01',
    },
  ];

  const teacherOverlap = detectEduSessionConflicts(
    {
      date: '2026-12-01',
      startTime: '10:00',
      endTime: '12:00',
      instructorId: 't1',
      classroomId: 'r9',
      status: 'Scheduled',
    },
    existing
  );
  assert.equal(teacherOverlap.hasConflict, true);
  assert.equal(teacherOverlap.reasonCode, 'INSTRUCTOR_CONFLICT');

  const adjacentSlot = detectEduSessionConflicts(
    {
      date: '2026-12-01',
      startTime: '11:00',
      endTime: '13:00',
      instructorId: 't1',
      classroomId: 'r1',
      status: 'Scheduled',
    },
    existing
  );
  assert.equal(adjacentSlot.hasConflict, false);
});

test('vacataire session pay and summary aggregate pending vs posted hours accurately', () => {
  assert.equal(computeSessionDurationHours('09:00', '11:30'), 2.5);
  const pay = computeVacataireSessionPay(2.5, 2200);
  assert.equal(pay.grossAmountDzd, 5500);
  assert.equal(pay.grossAmountCentimes, 550000);

  const logs: EduVacataireLog[] = [
    {
      id: 'v1',
      tenantId: 'a',
      facilityId: 'b',
      instructorId: 'inst_1',
      instructorName: 'Prof. Yacine',
      workDate: '2026-11-20',
      hoursWorked: 3,
      hourlyRateCentimes: 200000,
      grossAmountCentimes: 600000,
      status: 'pending',
      createdAt: '2026-11-20',
    },
    {
      id: 'v2',
      tenantId: 'a',
      facilityId: 'b',
      instructorId: 'inst_1',
      instructorName: 'Prof. Yacine',
      workDate: '2026-11-18',
      hoursWorked: 2,
      hourlyRateCentimes: 200000,
      grossAmountCentimes: 400000,
      status: 'posted_to_payroll',
      createdAt: '2026-11-18',
    },
  ];
  const sum = summarizeVacatairePayroll(logs);
  assert.equal(sum.pendingHours, 3);
  assert.equal(sum.pendingTotalDzd, 6000);
  assert.equal(sum.postedTotalDzd, 4000);
});

test('certificate reissue preserves verificationHash and blocks revoked certificate reissue', () => {
  const cert: EduCertificate = {
    id: 'cert_1',
    tenantId: 'a',
    facilityId: 'b',
    certificateNumber: 'ATRIUM-CERT-2026-1001',
    studentId: 's1',
    studentName: 'Meriem',
    cohortId: 'c1',
    courseTitle: 'Python Pro',
    issueDate: '2026-10-01',
    signatoryName: 'Direction',
    signatoryTitle: 'Dean',
    verificationHash: '0x99aabbccddeeff11',
    status: 'active',
    reissueCount: 0,
    createdAt: '2026-10-01',
  };
  const reissued = buildReissuedCertificatePayload(cert, 'cert_2', '2026-11-25');
  assert.equal(reissued.verificationHash, cert.verificationHash);
  assert.equal(reissued.reissuedFromId, 'cert_1');
  assert.equal(reissued.reissueCount, 1);
  assert.equal(reissued.certificateNumber, 'ATRIUM-CERT-2026-1001-R1');

  assert.throws(
    () => buildReissuedCertificatePayload({ ...cert, status: 'revoked' }, 'cert_3'),
    /CANNOT_REISSUE_REVOKED_CERTIFICATE/
  );
});

test('dunning, enrollment contracts, student card QR, driving school & K-12 helpers work cleanly', () => {
  const enr: EduEnrollment = {
    id: 'enr_1',
    tenantId: 'a',
    facilityId: 'b',
    studentId: 's1',
    studentName: 'Sami',
    cohortId: 'c1',
    cohortName: 'Permis B',
    enrolledAt: '2026-10-01',
    agreedTuition: 28000,
    discountAmount: 0,
    paidAmount: 10000,
    balanceDue: 18000,
    currency: 'DZD',
    paymentStatus: 'Overdue',
    status: 'Active',
    installments: [{ dueDate: '2026-11-01', amount: 18000, isPaid: false }],
  };
  const dunning = evaluateEnrollmentDunning(enr, '2026-11-25');
  assert.equal(dunning.isOverdue, true);
  assert.equal(dunning.escalationLevel, 2);
  assert.equal(dunning.recommendedChannel, 'whatsapp');

  const student: EduStudent = {
    id: 'stu_abc',
    tenantId: 'a',
    facilityId: 'br_1',
    fullName: 'Sami',
    phone: '+213555',
    status: 'Active',
    studentCardNumber: 'CARD-007',
    createdAt: '2026-10-01',
  };
  assert.equal(buildStudentCardQrPayload(student), 'ATR:STU:br_1:stu_abc:CARD-007');
  const contractText = renderEduEnrollmentContract({
    institutionName: 'Auto-École El Wiam',
    student,
    enrollment: enr,
    cohort: {
      id: 'c1',
      tenantId: 'a',
      facilityId: 'br_1',
      courseId: 'cr1',
      courseTitle: 'Permis B',
      instructorId: 'i1',
      instructorName: 'Ali',
      name: 'Permis B',
      startDate: '2026-10-01',
      endDate: '2026-12-30',
      maxStudents: 20,
      enrolledCount: 5,
      tuitionFee: 28000,
      currency: 'DZD',
      scheduleSummary: 'Sam-Jeu',
      status: 'InProgress',
      createdAt: '2026-10-01',
    } as EduCohort,
    language: 'fr',
  });
  assert.ok(contractText.includes('Auto-École El Wiam'));

  const drivingLogs: EduDrivingLog[] = [
    {
      id: 'd1',
      tenantId: 'a',
      facilityId: 'br_1',
      studentId: 'stu_abc',
      studentName: 'Sami',
      instructorId: 'i1',
      instructorName: 'Ali',
      vehicleId: 'veh_clio_1',
      vehicleLabel: 'Clio 5',
      logKind: 'driving_hours',
      scheduledDate: '2026-11-26',
      startTime: '09:00',
      endTime: '11:00',
      hoursLogged: 22,
      examResult: 'passed',
      createdAt: '2026-11-26',
    },
    {
      id: 'd2',
      tenantId: 'a',
      facilityId: 'br_1',
      studentId: 'stu_abc',
      studentName: 'Sami',
      instructorId: 'i1',
      instructorName: 'Ali',
      logKind: 'code_exam',
      scheduledDate: '2026-11-20',
      startTime: '08:00',
      endTime: '09:00',
      hoursLogged: 1,
      examResult: 'passed',
      createdAt: '2026-11-20',
    },
    {
      id: 'd3',
      tenantId: 'a',
      facilityId: 'br_1',
      studentId: 'stu_abc',
      studentName: 'Sami',
      instructorId: 'i1',
      instructorName: 'Ali',
      logKind: 'circuit_exam',
      scheduledDate: '2026-11-24',
      startTime: '08:00',
      endTime: '09:00',
      hoursLogged: 1,
      examResult: 'passed',
      createdAt: '2026-11-24',
    },
  ];
  assert.equal(
    detectDrivingVehicleOrInstructorConflict(
      {
        scheduledDate: '2026-11-26',
        startTime: '10:00',
        endTime: '11:30',
        vehicleId: 'veh_clio_1',
        instructorId: 'i9',
      },
      drivingLogs
    ).hasConflict,
    true
  );
  assert.equal(summarizeDrivingStudentProgress(drivingLogs, 'stu_abc').readyForRoadExam, true);

  const k12: EduK12Service[] = [
    {
      id: 'k1',
      tenantId: 'a',
      facilityId: 'br_1',
      studentId: 'stu_abc',
      studentName: 'Sami',
      serviceType: 'canteen',
      planName: 'Pension Complète',
      monthlyFeeCentimes: 650000,
      status: 'active',
      startDate: '2026-09-01',
      checkInToday: true,
      createdAt: '2026-09-01',
    },
    {
      id: 'k2',
      tenantId: 'a',
      facilityId: 'br_1',
      studentId: 'stu_abc',
      studentName: 'Sami',
      serviceType: 'transport',
      planName: 'Bus Circuit Hydra',
      routeOrDiet: 'Ligne A - Hydra',
      monthlyFeeCentimes: 450000,
      status: 'active',
      startDate: '2026-09-01',
      checkInToday: false,
      createdAt: '2026-09-01',
    },
  ];
  const k12Sum = summarizeK12Services(k12);
  assert.equal(k12Sum.activeCanteenCount, 1);
  assert.equal(k12Sum.activeTransportCount, 1);
  assert.equal(k12Sum.monthlyRecurringDzd, 11000);
});

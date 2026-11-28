import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  selectCurrentEduAdmissionsFromState,
  selectCurrentEduAttendanceFromState,
  selectCurrentEduCertificatesFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentEduDrivingLogsFromState,
  selectCurrentEduEnrollmentsFromState,
  selectCurrentEduGradesFromState,
  selectCurrentEduK12ServicesFromState,
  selectCurrentEduParentCommsFromState,
  selectCurrentEduStudentsFromState,
  selectCurrentEduVacataireLogsFromState,
  selectCurrentStaffFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  buildStudentTermReportCard,
  summarizeDrivingStudentProgress,
  summarizeK12Services,
} from '../../utils/educationDepth';
import { selectEducationDashboard } from '../../utils/dashboardSelectors/coreVerticals';
import { centimesToDzd, dzdToCentimes } from '../../utils/money';
import { EducationDashboardView } from '../../components/screens/education/EducationDashboardView';
import { EducationCohortsView } from '../../components/screens/education/EducationCohortsView';
import { EducationStudentsView } from '../../components/screens/education/EducationStudentsView';
import { EducationTimetableView } from '../../components/screens/education/EducationTimetableView';
import { EducationAttendanceView } from '../../components/screens/education/EducationAttendanceView';
import { EducationFinanceView } from '../../components/screens/education/EducationFinanceView';
import { EducationAdmissionsView } from '../../components/screens/education/EducationAdmissionsView';
import { EducationStaffView } from '../../components/screens/education/EducationStaffView';
import { VacatairePayrollPanel } from '../../components/screens/education/VacatairePayrollPanel';
import { CertificateModal } from '../../components/screens/education/CertificateModal';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

function seedEducationTestEntities(actions: ReturnType<typeof useAtriumActions>) {
  const teacher1 = actions.createStaffMember({
    fullName: 'Prof. Amine Mansouri',
    role: 'Senior Instructor',
    roleRank: 2,
    pinCode: '1111',
    phoneNumber: '0551100200',
    email: 'amine@atlas.dz',
    salary: 65000,
    hireDate: '2026-01-15',
    paymentDay: 28,
    contractType: 'cdd',
    status: 'active',
    isActive: true,
    allowedModules: ['all'],
  });
  const teacher2 = actions.createStaffMember({
    fullName: 'Mme. Salima Khelifi',
    role: 'Language Instructor',
    roleRank: 2,
    pinCode: '2222',
    phoneNumber: '0552200300',
    email: 'salima@atlas.dz',
    salary: 58000,
    hireDate: '2026-02-01',
    paymentDay: 28,
    contractType: 'cdi',
    status: 'active',
    isActive: true,
    allowedModules: ['all'],
  });

  const room = actions.addEduClassroom({
    name: 'Salle Alpha A1',
    capacity: 25,
    hasProjector: true,
    hasComputers: true,
    colorHex: '#d4522f',
  });

  const course = actions.addEduCourse({
    title: 'Full-Stack Web Bootcamp',
    code: 'WEB-101',
    category: 'Technology',
    durationWeeks: 12,
    totalHours: 120,
    defaultPrice: 45000,
    currency: 'DZD',
    description: 'TypeScript, React & SQL systems track',
    gradeScale: 20,
    tradeMode: 'academy',
  });

  const cohort1 = actions.addEduCohort({
    courseId: course.id,
    courseTitle: course.title,
    instructorId: teacher1.id,
    instructorName: teacher1.fullName,
    classroomId: room.id,
    classroomName: room.name,
    name: 'Web Dev Batch 01',
    cohortCode: 'WD-01',
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    maxStudents: 20,
    tuitionFee: 45000,
    currency: 'DZD',
    scheduleSummary: 'Mon & Wed 18:00 - 20:00',
    status: 'InProgress',
    gradeScale: 20,
    tradeMode: 'academy',
    waitlistEnabled: true,
  });

  const cohort2 = actions.addEduCohort({
    courseId: course.id,
    courseTitle: course.title,
    instructorId: teacher2.id,
    instructorName: teacher2.fullName,
    classroomId: room.id,
    classroomName: room.name,
    name: 'Web Dev Weekend Batch 02',
    cohortCode: 'WD-02',
    startDate: '2026-10-05',
    endDate: '2026-12-20',
    maxStudents: 25,
    tuitionFee: 40000,
    currency: 'DZD',
    scheduleSummary: 'Sat 09:00 - 13:00',
    status: 'Enrolling',
    gradeScale: 100,
    tradeMode: 'academy',
    waitlistEnabled: true,
  });

  const student1 = actions.addEduStudent({
    fullName: 'Yacine Benahmed',
    phone: '0661001122',
    email: 'yacine@parent.dz',
    guardianName: 'Karim Benahmed',
    guardianPhone: '0550001122',
    guardianRelation: 'Father',
    status: 'Active',
    attendanceRatePercent: 95,
  });

  const student2 = actions.addEduStudent({
    fullName: 'Meriem Boudiaf',
    phone: '0662003344',
    guardianName: 'Nadia Boudiaf',
    guardianPhone: '0555003344',
    guardianRelation: 'Mother',
    status: 'Active',
    attendanceRatePercent: 90,
  });

  const enrollment1 = actions.addEduEnrollment({
    studentId: student1.id,
    studentName: student1.fullName,
    cohortId: cohort1.id,
    cohortName: cohort1.name,
    agreedTuition: 45000,
    discountAmount: 0,
    paidAmount: 20000,
    balanceDue: 25000,
    currency: 'DZD',
    paymentStatus: 'Partial',
    status: 'Active',
    installments: [
      { dueDate: '2026-10-01', amount: 20000, isPaid: true, paidAt: '2026-10-01T10:00:00Z' },
      { dueDate: '2026-11-01', amount: 25000, isPaid: false },
    ],
  });

  return { teacher1, teacher2, room, course, cohort1, cohort2, student1, student2, enrollment1 };
}

describe('Phase 3 Step 6 (7.6 education_cohort) — Deep Vertical Integration', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('en');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
    const eduBiz = getGlobalState().businesses.find((b) => b.category === 'education_cohort');
    expect(eduBiz).toBeTruthy();
    if (eduBiz) {
      switchBusinessAction(eduBiz.id);
    }
  });

  it('enforces cohort over-capacity block unless waitlist is enabled & allowWaitlist=true', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { cohort1, student2 } = seedEducationTestEntities(actions);

    // Force cohort full with waitlist disabled
    actions.updateEduCohort(cohort1.id, {
      maxStudents: 5,
      enrolledCount: 5,
      waitlistEnabled: false,
    });

    const blocked = actions.addEduEnrollment({
      studentId: student2.id,
      studentName: student2.fullName,
      cohortId: cohort1.id,
      cohortName: cohort1.name,
      agreedTuition: cohort1.tuitionFee,
      discountAmount: 0,
      paidAmount: 0,
      balanceDue: cohort1.tuitionFee,
      currency: cohort1.currency,
      paymentStatus: 'Pending',
      status: 'Active',
      installments: [],
    });
    expect(blocked).toBeNull();

    // Even with allowWaitlist=true, waitlistEnabled=false on cohort must still block
    const stillBlocked = actions.addEduEnrollment(
      {
        studentId: student2.id,
        studentName: student2.fullName,
        cohortId: cohort1.id,
        cohortName: cohort1.name,
        agreedTuition: cohort1.tuitionFee,
        discountAmount: 0,
        paidAmount: 0,
        balanceDue: cohort1.tuitionFee,
        currency: cohort1.currency,
        paymentStatus: 'Pending',
        status: 'Active',
        installments: [],
      },
      { allowWaitlist: true }
    );
    expect(stillBlocked).toBeNull();

    // Enable waitlist on cohort and allowWaitlist=true -> queues student as Waitlisted without bumping enrolledCount
    actions.updateEduCohort(cohort1.id, { waitlistEnabled: true });
    const waitlisted = actions.addEduEnrollment(
      {
        studentId: student2.id,
        studentName: student2.fullName,
        cohortId: cohort1.id,
        cohortName: cohort1.name,
        agreedTuition: cohort1.tuitionFee,
        discountAmount: 0,
        paidAmount: 0,
        balanceDue: cohort1.tuitionFee,
        currency: cohort1.currency,
        paymentStatus: 'Pending',
        status: 'Active',
        installments: [],
      },
      { allowWaitlist: true }
    );
    expect(waitlisted).toBeTruthy();
    expect(waitlisted?.status).toBe('Waitlisted');

    const refreshedCohort = selectCurrentEduCohortsFromState(getGlobalState()).find(
      (c) => c.id === cohort1.id
    );
    expect(refreshedCohort?.enrolledCount).toBe(5);
  });

  it('transfers a student mid-term with prorated fee carry-over and updates cohort seat counts', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { cohort1, cohort2, enrollment1 } = seedEducationTestEntities(actions);
    expect(enrollment1).toBeTruthy();
    if (!enrollment1) return;

    actions.updateEduCohort(cohort1.id, {
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      enrolledCount: 6,
    });
    actions.updateEduCohort(cohort2.id, {
      maxStudents: 25,
      enrolledCount: 4,
      tuitionFee: 40000,
    });

    const newEn = actions.transferStudentCohort(enrollment1.id, cohort2.id, {
      transferDate: '2026-10-31',
      reason: 'Schedule conflict',
    });
    expect(newEn).toBeTruthy();
    expect(newEn?.cohortId).toBe(cohort2.id);
    expect(newEn?.status).toBe('Active');
    expect(newEn?.transferredFromCohortId).toBe(cohort1.id);
    expect((newEn?.transferHistory || []).length).toBeGreaterThan(0);

    const updatedSource = selectCurrentEduEnrollmentsFromState(getGlobalState()).find(
      (e) => e.id === enrollment1.id
    );
    expect(updatedSource?.status).toBe('Transferred');

    const updatedCohorts = selectCurrentEduCohortsFromState(getGlobalState());
    expect(updatedCohorts.find((c) => c.id === cohort1.id)?.enrolledCount).toBe(5);
    expect(updatedCohorts.find((c) => c.id === cohort2.id)?.enrolledCount).toBe(5);
  });

  it('applies sibling discounts, scholarships, and issues 6.1 credit note + 6.2 outflow payment on refund', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { cohort1, enrollment1 } = seedEducationTestEntities(actions);
    expect(enrollment1).toBeTruthy();
    if (!enrollment1) return;

    const baseFee = cohort1.tuitionFee;
    const res = actions.applyEnrollmentDiscountOrRefund(enrollment1.id, {
      discountType: 'sibling',
      siblingDiscountDzd: 3000,
      scholarshipDzd: 2000,
      discountReason: 'Sibling 10% + Merit Grant',
      refundDzd: 4000,
      refundReason: 'Partial withdrawal credit',
      refundMethod: 'cash',
    });
    expect(res).toBeTruthy();
    expect(res?.enrollment.discountAmount).toBe(5000);
    expect(res?.enrollment.agreedTuition).toBe(Math.max(0, baseFee - 5000));
    expect(res?.enrollment.refundedAmount).toBe(4000);
    expect(res?.creditNote).toBeTruthy();
    expect(res?.creditNote?.docType).toBe('avoir');

    const stateAfter = getGlobalState();
    expect(
      stateAfter.unifiedPayments.some(
        (p) =>
          p.direction === 'outflow' &&
          p.sourceVertical === 'education_cohort' &&
          p.amountCentimes === dzdToCentimes(4000)
      )
    ).toBe(true);
  });

  it('dispatches multi-channel installment dunning reminders into CRM & parent portal logs', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { enrollment1 } = seedEducationTestEntities(actions);
    expect(enrollment1).toBeTruthy();
    if (!enrollment1) return;

    const result = actions.dispatchEducationDunningReminders([enrollment1.id], '2026-12-15');
    expect(result.dispatchedCount).toBe(1);

    const stateAfter = getGlobalState();
    const updatedEn = selectCurrentEduEnrollmentsFromState(stateAfter).find(
      (e) => e.id === enrollment1.id
    );
    expect(updatedEn?.dunningLevel).toBeGreaterThanOrEqual(1);
    expect(updatedEn?.lastDunningAt).toBeTruthy();

    const comms = selectCurrentEduParentCommsFromState(stateAfter).filter(
      (c) => c.studentId === enrollment1.studentId && c.category === 'dunning'
    );
    expect(comms.length).toBeGreaterThan(0);
    expect(stateAfter.crmCommunicationLogs.length).toBeGreaterThan(0);
  });

  it('issues Student QR Cards, sends parent portal comms, and marks portal messages read', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { student1 } = seedEducationTestEntities(actions);

    const withQr = actions.issueStudentCardQr(student1.id);
    expect(withQr?.studentCardQr).toMatch(/^ATR:STU:/);
    expect(withQr?.portalToken).toBeTruthy();

    const comm = actions.sendEduParentCommunication({
      studentId: student1.id,
      channel: 'portal',
      category: 'announcement',
      subject: 'Midterm Schedule Published',
      body: 'Please check the attached dates on your parent portal.',
    });
    expect(comm).toBeTruthy();
    expect(comm?.portalToken).toBeTruthy();

    actions.markEduParentCommRead(comm!.id);
    const updatedComm = selectCurrentEduParentCommsFromState(getGlobalState()).find(
      (c) => c.id === comm!.id
    );
    expect(updatedComm?.readAt).toBeTruthy();
  });

  it('blocks overlapping instructor, classroom, or vehicle sessions cleanly', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { teacher1, teacher2, cohort1 } = seedEducationTestEntities(actions);

    const first = actions.addEduSession({
      cohortId: cohort1.id,
      cohortName: cohort1.name,
      classroomId: 'room_conflict_test',
      classroomName: 'Lab Conflict Test',
      instructorId: teacher1.id,
      instructorName: teacher1.fullName,
      date: '2026-12-05',
      startTime: '10:00',
      endTime: '12:00',
      vehicleId: 'VEH-TEST-1',
      status: 'Scheduled',
    });
    expect(first).toBeTruthy();

    // Same instructor overlapping time window -> blocked
    const instructorOverlap = actions.addEduSession({
      cohortId: cohort1.id,
      cohortName: cohort1.name,
      classroomId: 'room_other',
      classroomName: 'Other Room',
      instructorId: teacher1.id,
      instructorName: teacher1.fullName,
      date: '2026-12-05',
      startTime: '11:00',
      endTime: '13:00',
      status: 'Scheduled',
    });
    expect(instructorOverlap).toBeNull();

    // Same vehicle overlapping -> blocked
    const vehicleOverlap = actions.addEduSession({
      cohortId: cohort1.id,
      cohortName: cohort1.name,
      classroomId: 'room_other_2',
      classroomName: 'Other Room 2',
      instructorId: teacher2.id,
      instructorName: teacher2.fullName,
      date: '2026-12-05',
      startTime: '11:30',
      endTime: '12:30',
      vehicleId: 'VEH-TEST-1',
      status: 'Scheduled',
    });
    expect(vehicleOverlap).toBeNull();

    // Adjacent non-overlapping slot succeeds
    const adjacent = actions.addEduSession({
      cohortId: cohort1.id,
      cohortName: cohort1.name,
      classroomId: 'room_conflict_test',
      classroomName: 'Lab Conflict Test',
      instructorId: teacher1.id,
      instructorName: teacher1.fullName,
      date: '2026-12-05',
      startTime: '12:00',
      endTime: '14:00',
      vehicleId: 'VEH-TEST-1',
      status: 'Scheduled',
    });
    expect(adjacent).toBeTruthy();
  });

  it('logs vacataire hours, posts to Workforce payroll, and folds them into payroll slips', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { teacher1 } = seedEducationTestEntities(actions);

    const log = actions.recordEduVacataireLog({
      instructorId: teacher1.id,
      instructorName: teacher1.fullName,
      workDate: '2026-11-22',
      hoursWorked: 4,
      hourlyRateDzd: 2500, // 10,000 DZD gross
      notes: 'Algorithmic Coaching',
    });
    expect(centimesToDzd(log.grossAmountCentimes)).toBe(10000);
    expect(log.status).toBe('pending');

    const posted = actions.postVacataireLogsToPayroll([log.id]);
    expect(posted.length).toBe(1);
    expect(posted[0].status).toBe('posted_to_payroll');

    actions.generateStaffPayrollRun(11, 2026, 'education_cohort');
    const stateAfter = getGlobalState();
    const slip = stateAfter.staffPayrollSlips.find(
      (sl) => sl.staffId === teacher1.id && sl.periodMonth === 11 && sl.periodYear === 2026
    );
    expect(slip).toBeTruthy();
    expect(
      (slip?.primesCotisables || []).some(
        (p) => p.label.toLowerCase().includes('vacation') && p.amount >= 10000
      )
    ).toBe(true);

    const refreshedLog = selectCurrentEduVacataireLogsFromState(stateAfter).find(
      (v) => v.id === log.id
    );
    expect(refreshedLog?.status).toBe('posted_to_payroll');
  });

  it('normalizes mixed grade scales (/20 vs /100) across report cards and dashboard selectors', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { cohort1, student1 } = seedEducationTestEntities(actions);

    actions.updateEduCohort(cohort1.id, { gradeScale: 20 });
    actions.recordEduGrade({
      cohortId: cohort1.id,
      studentId: student1.id,
      studentName: student1.fullName,
      assessmentTitle: 'Normalized Exam',
      score: 80,
      maxScore: 100, // 80/100 => 16/20
      weightPercent: 100,
    });

    const stateAfter = getGlobalState();
    const cohortGrades = selectCurrentEduGradesFromState(stateAfter).filter(
      (g) => g.cohortId === cohort1.id
    );
    const card = buildStudentTermReportCard({
      student: student1,
      cohort: { ...cohort1, gradeScale: 20 },
      cohortGrades,
      studentAttendance: selectCurrentEduAttendanceFromState(stateAfter),
      language: 'en',
    });
    expect(card.gradeScale).toBe(20);
    expect(card.weightedAverageOnScale).toBe(16);

    const dash20 = selectEducationDashboard({
      students: selectCurrentEduStudentsFromState(stateAfter),
      cohorts: selectCurrentEduCohortsFromState(stateAfter),
      attendance: selectCurrentEduAttendanceFromState(stateAfter),
      grades: selectCurrentEduGradesFromState(stateAfter),
      admissions: selectCurrentEduAdmissionsFromState(stateAfter),
      certificates: selectCurrentEduCertificatesFromState(stateAfter),
      enrollments: selectCurrentEduEnrollmentsFromState(stateAfter),
      period: '30d',
      language: 'en',
      cardFilters: { gradeScale: '20' },
    });
    expect(dash20.gradeScale).toBe(20);
    expect(dash20.gradeBins.find((b) => b.label === '16–18')?.value).toBe(1);

    const dash100 = selectEducationDashboard({
      students: selectCurrentEduStudentsFromState(stateAfter),
      cohorts: selectCurrentEduCohortsFromState(stateAfter),
      attendance: selectCurrentEduAttendanceFromState(stateAfter),
      grades: selectCurrentEduGradesFromState(stateAfter),
      admissions: selectCurrentEduAdmissionsFromState(stateAfter),
      certificates: selectCurrentEduCertificatesFromState(stateAfter),
      enrollments: selectCurrentEduEnrollmentsFromState(stateAfter),
      period: '30d',
      language: 'en',
      cardFilters: { gradeScale: '100' },
    });
    expect(dash100.gradeScale).toBe(100);
    expect(dash100.gradeBins.find((b) => b.label === '70–84')?.value).toBe(1);
  });

  it('preserves verificationHash on certificate reissue and blocks reissue after revocation', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { cohort1, student1 } = seedEducationTestEntities(actions);

    const orig = actions.issueEduCertificate({
      studentId: student1.id,
      studentName: student1.fullName,
      cohortId: cohort1.id,
      courseTitle: cohort1.courseTitle,
      averageGradeScore: 92,
      honors: 'Très Bien',
      signatoryName: 'Dean Test',
      signatoryTitle: 'Academic Director',
    });

    const reissued = actions.reissueEduCertificate(orig.id);
    expect(reissued).toBeTruthy();
    expect(reissued?.verificationHash).toBe(orig.verificationHash);
    expect(reissued?.certificateNumber).toMatch(/-R1$/);
    expect(reissued?.reissuedFromId).toBe(orig.id);

    const revoked = actions.revokeEduCertificate(reissued!.id, 'Academic review hold');
    expect(revoked).toBe(true);

    const blockedReissue = actions.reissueEduCertificate(reissued!.id);
    expect(blockedReissue).toBeNull();
    const storedRevoked = selectCurrentEduCertificatesFromState(getGlobalState()).find(
      (c) => c.id === reissued!.id
    );
    expect(storedRevoked?.status).toBe('revoked');
  });

  it('supports Driving School exam progression + vehicle conflicts and K-12 canteen/transport check-ins', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { student1, teacher1 } = seedEducationTestEntities(actions);

    const drv1 = actions.addEduDrivingLog({
      studentId: student1.id,
      studentName: student1.fullName,
      instructorId: teacher1.id,
      instructorName: teacher1.fullName,
      vehicleId: 'CAR-16-01',
      vehicleLabel: 'Clio 5',
      logKind: 'driving_hours',
      scheduledDate: '2026-12-10',
      startTime: '08:00',
      endTime: '10:00',
      hoursLogged: 20,
      examResult: 'passed',
    });
    expect(drv1).toBeTruthy();

    // Vehicle conflict blocked
    const conflictDrv = actions.addEduDrivingLog({
      studentId: student1.id,
      studentName: student1.fullName,
      instructorId: 'other_inst',
      instructorName: 'Other Moniteur',
      vehicleId: 'CAR-16-01',
      vehicleLabel: 'Clio 5',
      logKind: 'driving_hours',
      scheduledDate: '2026-12-10',
      startTime: '09:00',
      endTime: '11:00',
      hoursLogged: 2,
      examResult: 'pending',
    });
    expect(conflictDrv).toBeNull();

    actions.addEduDrivingLog({
      studentId: student1.id,
      studentName: student1.fullName,
      instructorId: teacher1.id,
      instructorName: teacher1.fullName,
      logKind: 'code_exam',
      scheduledDate: '2026-12-11',
      startTime: '09:00',
      endTime: '10:00',
      hoursLogged: 0,
      examResult: 'passed',
    });
    actions.addEduDrivingLog({
      studentId: student1.id,
      studentName: student1.fullName,
      instructorId: teacher1.id,
      instructorName: teacher1.fullName,
      logKind: 'circuit_exam',
      scheduledDate: '2026-12-12',
      startTime: '09:00',
      endTime: '10:00',
      hoursLogged: 0,
      examResult: 'passed',
    });
    const drvLogs = selectCurrentEduDrivingLogsFromState(getGlobalState());
    const prog = summarizeDrivingStudentProgress(drvLogs, student1.id);
    expect(prog.readyForRoadExam).toBe(true);

    // K-12 Canteen & Transport + check-in
    const k12 = actions.upsertEduK12Service({
      studentId: student1.id,
      studentName: student1.fullName,
      serviceType: 'transport',
      planName: 'Bus Circuit Hydra',
      routeOrDiet: 'Line A — Hydra',
      pickupStop: 'Place El Qods',
      monthlyFeeCentimes: dzdToCentimes(6500),
      status: 'active',
      startDate: '2026-09-15',
      checkInToday: false,
    });
    actions.toggleK12ServiceCheckIn(k12.id);
    const services = selectCurrentEduK12ServicesFromState(getGlobalState());
    const k12Sum = summarizeK12Services(services);
    expect(k12Sum.activeTransportCount).toBeGreaterThanOrEqual(1);
    expect(k12Sum.checkedInTodayCount).toBeGreaterThanOrEqual(1);
  });

  it('renders all Education views, Vacataire panel, and Certificate modal in SSR without throwing', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { cohort1, student1 } = seedEducationTestEntities(actions);
    const cert = actions.issueEduCertificate({
      studentId: student1.id,
      studentName: student1.fullName,
      cohortId: cohort1.id,
      courseTitle: cohort1.courseTitle,
      averageGradeScore: 90,
      honors: 'Très Bien',
      signatoryName: 'Dean',
      signatoryTitle: 'Director',
    });

    const state = getGlobalState();
    const staff = selectCurrentStaffFromState(state);

    expect(renderToStaticMarkup(<EducationDashboardView />)).toContain('div');
    expect(renderToStaticMarkup(<EducationCohortsView />)).toContain('div');
    expect(renderToStaticMarkup(<EducationStudentsView />)).toContain('div');
    expect(renderToStaticMarkup(<EducationTimetableView />)).toContain('div');
    expect(renderToStaticMarkup(<EducationAttendanceView />)).toContain('div');
    expect(renderToStaticMarkup(<EducationFinanceView />)).toContain('div');
    expect(renderToStaticMarkup(<EducationAdmissionsView />)).toContain('div');
    expect(renderToStaticMarkup(<EducationStaffView />)).toContain('div');
    expect(
      renderToStaticMarkup(
        <VacatairePayrollPanel
          staffList={staff}
          payrollRuns={state.staffPayrollRuns}
          language="en"
        />
      )
    ).toContain('Vacataire');
    expect(
      renderToStaticMarkup(
        <CertificateModal
          isOpen
          onClose={() => {}}
          certificate={cert}
        />
      )
    ).toContain('div');
  });
});

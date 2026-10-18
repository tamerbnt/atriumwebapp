# Education, Academy & Tutoring Operational Architecture

Comprehensive operational blueprint for the **Education, Academy & Tutoring** vertical (`education_cohort`) in Atrium ERP & CRM. Engineered to seamlessly power any training or educational enterprise—from software bootcamps and foreign language schools to K-12 tutoring centers, music conservatories, driving schools, and professional certification academies.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Universal Education Model Confirmation**:
> - **Multi-Business Agility**: The vertical architecture is parameterized to fit 6 distinct archetypes:
>   1. **Cohort-Based Bootcamps** (e.g., Coding, UX, Data Science: term dates, project evaluations, tuition installments, mentor check-ins).
>   2. **Language & Continuing Academies** (e.g., EFL, French Alliance: level frameworks A1–C2, recurring group classes, placement tests).
>   3. **Tutoring & Test Prep Centers** (e.g., Kumon, SAT/Baccalaureate prep: subject-based micro-groups, 1-on-1 sessions, guardian progress reporting, credit-pack deduction).
>   4. **Driving & Heavy Equipment Schools** (e.g., Theory code classes, dual-control vehicle & instructor dispatch, exam readiness milestones).
>   5. **Arts, Music & Performance Schools** (e.g., Conservatories, dance studios: masterclasses, practice room reservations, recital tracking).
>   6. **Vocational & Corporate Training** (e.g., Culinary, Safety/OSHA, barista: compliance certifications, corporate group invoicing).
> - **Execution Mode**: Research and planning only as requested (`don't code for now`). No application source files are modified until this specification is reviewed and approved.

---

## 1. Overview & Core Concept

### What It Does
The Education & Training vertical transforms Atrium into an institutional-grade Academy Operations Engine. It bridges student admissions, cohort timetable scheduling, instructor load management, real-time classroom attendance roll calls, academic evaluations, multi-installment tuition payment schedules, and automated completion certificate generation into a unified, high-velocity workstation.

### Target Personas
- **Academy Director / Owner**: Tracks enrollment capacity, tuition collection velocity, teacher utilization, and institutional retention.
- **Academic Registrar / Coordinator**: Manages student rosters, timetables, classroom allocation, and teacher-student scheduling conflicts.
- **Instructors / Coaches**: Accesses daily class rolls, performs 10-second attendance check-ins, tracks syllabus progression, and logs student grades.
- **Students & Guardians**: Receives transparent tuition payment milestones, attendance notices, and verifiable digital certificates.

---

## 2. Features Breakdown: Basic Needed vs. Advanced

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   ATRIUM EDUCATION & TRAINING FEATURE SPECTRUM                   │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│ BASIC / ESSENTIAL CORE                 │ ADVANCED / INSTITUTIONAL GRADE          │
├────────────────────────────────────────┼─────────────────────────────────────────┤
│ • Student CRM Directory & Profiles     │ • Multi-Stage Admissions & Funnel       │
│ • Courses & Cohort Session Catalog     │ • Level Placement Tests (e.g. A1-C2)    │
│ • Weekly Timetable / Master Schedule   │ • Classroom & Equipment Conflict Engine │
│ • 1-Click Roll Call Attendance         │ • Multi-Tranche Tuition Installments    │
│ • Fixed & Hourly Tuition Invoicing     │ • Hourly Credit-Pack Decrementing       │
│ • Guardian / Minor Linkage             │ • Guardian WhatsApp/Email Auto-Notices  │
│ • Instructor Assignments & Bios        │ • Instructor Hourly Payroll Calculation │
│ • Basic Gradebook & Pass/Fail Status   │ • Weighted Evaluation Scales (GPA/%)    │
│ • Student Attendance Rate Calculation  │ • Cryptographic PDF Certificate Issuer  │
│ • CSV Student Roster Import/Export     │ • Multi-Branch Cross-Campus Timetables  │
└────────────────────────────────────────┴─────────────────────────────────────────┘
```

### A. Essential Core Features (Foundational Tier)
1. **Student 360° Directory**:
   - Complete learner registry with contact details, enrollment history, guardian/parent links for minors, emergency contact, and status (`Active`, `Enrolled`, `On Leave`, `Graduated`, `Withdrawn`).
2. **Programs & Cohort Architecture**:
   - Courses defined with curriculum modules, target skill levels, prerequisites, duration (weeks/hours), and tuition pricing.
   - Cohorts instantiated from courses with concrete start/end dates, max seat capacity, assigned classrooms/labs, and primary instructors.
3. **Master Class Timetable**:
   - Visual daily and weekly scheduling grid showing room, instructor, cohort, and time slot.
   - Visual status indicators for completed vs. upcoming sessions.
4. **Fast Roll Call Attendance Engine**:
   - Mobile and tablet-optimized attendance ledger for instructors.
   - 4-state attendance model: `Present`, `Absent (Unexcused)`, `Excused`, `Late` (with minute tracking).
   - Real-time calculation of overall attendance percentage per student and cohort.
5. **Tuition & Payment Receipts**:
   - Flexible tuition tracking: Full upfront payment, deposit + balance, or fixed tuition.
   - Multi-currency payment receipt generation with instant PDF export.

### B. Advanced Institutional Features (Power Tier)
1. **Multi-Tranche Installment Engine**:
   - Automated installment plan generation (e.g., 30% Registration Deposit, 35% Midterm Tranche, 35% Final Tranche).
   - Aging accounts receivable matrix (Current, 15-30 days overdue, 30+ days overdue) with 1-click payment logging.
2. **Hour/Credit Pack Decrementing (For 1-on-1 & Tutoring)**:
   - Prepaid packages (e.g., 10-Hour Private Math Pack).
   - Automatic deduction upon instructor session completion with remaining balance alerts.
3. **Classroom & Facility Resource Allocation**:
   - Physical space allocation (Classroom A, Computer Lab 2, Sound Booth, Vehicle #4).
   - Hardware/asset tagging (Projector, VR Headsets, Dual-Control Fleet).
   - Automatic hard-conflict detection preventing overlapping room or instructor double-bookings.
4. **Weighted Gradebook & Exam Milestones**:
   - Customizable grading frameworks: Percentage (0-100%), US GPA (4.0 scale), Letter (A+ to F), or Competency-Based (Mastered / In Progress / Needs Support).
   - Weightings per category (e.g., 20% Homework, 30% Midterm Exam, 40% Final Project, 10% Participation).
5. **Cryptographic Certificate Generator**:
   - One-click issuance of official Completion Certificates with student name, cohort code, completion date, honors/grade, and unique verification ID.
6. **Instructor Load & Payroll Engine**:
   - Tracks teaching hours logged per instructor per week/month.
   - Calculates contract pay based on hourly rate or flat per-cohort stipend.
7. **Admissions & Trial Class Pipeline**:
   - Kanban pipeline tracking prospects: `Inquiry` → `Placement Test` → `Trial Class` → `Admitted` → `Enrolled`.

---

## 3. Dedicated User Interface & Screens Architecture

When the active business category is `education_cohort`, Atrium adapts the core navigation into 8 dedicated screens:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATRIUM EDUCATION DOCK                           │
├───────────────┬───────────────────────────┬────────────────────────────┤
│ SCREEN ID     │ NAVIGATION LABEL          │ OPERATIONAL PURPOSE        │
├───────────────┼───────────────────────────┼────────────────────────────┤
│ dashboard     │ Academy Pulse             │ KPIs, Today's Classes, Rev │
│ scheduler     │ Timetable & Rooms         │ Conflict-free Weekly Grid  │
│ members       │ Students & Guardians      │ 360° Student CRM Directory │
│ shop          │ Cohorts & Courses         │ Curriculum & Cohort Roster │
│ registrations │ Admissions & Inquiries    │ Prospect Conversion Funnel │
│ analytics     │ Attendance & Grades       │ Roll Call & Gradebook      │
│ finance       │ Tuition & Installments    │ Tranches, Aging AR & Rev   │
│ settings      │ Academy Setup             │ Rooms, Terms, Cert Config  │
└───────────────┴───────────────────────────┴────────────────────────────┘
```

### Screen 1: Academy Pulse Dashboard (`EducationDashboardView`)
- **Key Metric Tiles**:
  - `Active Students`: Total enrolled across all running cohorts.
  - `Today's Sessions`: Number of scheduled classes today + next up.
  - `Weekly Attendance`: System-wide roll call average percentage.
  - `Tuition Collection Rate`: Percentage of current term tuition collected vs outstanding.
- **Action Station**: Quick buttons for `Take Today's Attendance`, `Enroll New Student`, `Schedule Class`, `Create Cohort`.
- **Today's Class Schedule Queue**: Time-ordered cards with Course, Cohort Code, Room, Instructor, and a prominent 1-click `Launch Roll Call` button.
- **Attention Radar**: Highlights students with $\ge 3$ consecutive absences and tuition installments overdue $>14$ days.

### Screen 2: Timetable & Master Schedule (`EducationTimetableView`)
- **Interactive Calendar Grid**: Switchable between Weekly View, Daily View, and Room Matrix View.
- **Filter Bar**: Filter timetable instantly by Cohort, Instructor, Subject, or Classroom.
- **Conflict Prevention Engine**: Visual red clash warning if an instructor or room is assigned to overlapping sessions.
- **Class Detail Modal**: Shows topic/lesson objectives, required materials, student roster preview, and quick roll call entry.

### Screen 3: Students & Guardians CRM (`EducationStudentsView`)
- **Directory Table**: Clean typography layout with Student Avatar, Full Name, Current Cohort, Level/Grade, Attendance %, Tuition Status, and Guardian Contact.
- **Filter Capsules**: `All Students`, `Active Cohorts`, `Graduated`, `Minors (Guardian Linked)`, `Overdue Tuition`.
- **Student 360° Profile Drawer**:
  - *Academic Tab*: Active and past cohorts, attendance calendar heat-map, exam grades.
  - *Financial Tab*: Tuition plan, payment ledger, outstanding installments, download receipts.
  - *Guardian Tab*: Primary contact, phone, email, emergency pickup authorization.
  - *Documents Tab*: Identification, enrollment agreement, medical notes.

### Screen 4: Cohorts & Programs Hub (`EducationCohortsView`)
- **Cohort Cards Grid**:
  - Header: Course Name & Cohort Code (e.g. `DATA-ENG-2026-B`).
  - Dates: `Oct 15, 2026 — Dec 18, 2026 (Week 6 of 10)`.
  - Seat Occupancy Meter: Visual progress bar (e.g., `18 / 20 Seats Enrolled`).
  - Instructor & Classroom badge.
  - Status badge: `Enrolling`, `In Progress`, `Exam Week`, `Completed`.
- **Cohort Deep-Dive View**:
  - Roster list with student progress and individual attendance rate.
  - Syllabus schedule and completed milestones.
  - Cohort Gradebook summary.

### Screen 5: Admissions & Enrollment Funnel (`EducationAdmissionsView`)
- **Kanban Pipeline**: Columns for `New Inquiries`, `Evaluation / Test Scheduled`, `Offer Extended`, `Deposit Paid / Enrolled`.
- **Quick Enrollment Action**: Convert admitted lead into an active student with 1-click, automatically creating their tuition tranche schedule.

### Screen 6: Attendance Hub & Gradebook (`EducationAttendanceView`)
- **Mode A: Live Roll Call Terminal**:
  - Roster of student cards with large touch-friendly buttons: `[Present]`, `[Absent]`, `[Late]`, `[Excused]`.
  - Live summary tally: `19/20 Present (95%)`.
  - Option to send automated SMS/Email alert to guardians of absent minors upon submission.
- **Mode B: Cohort Gradebook Matrix**:
  - Spreadsheet-style interactive table with student rows and assignment/quiz columns.
  - Automatic calculation of cumulative weighted average and letter grade.

### Screen 7: Tuition, Installments & Finance (`EducationFinanceView`)
- **Accounts Receivable Aging Radar**: Visual breakdown of current, 1-30 days, 31-60 days, and 60+ days outstanding balances.
- **Installment Payment Plan Generator**:
  - Configure deposit amount, number of installments (e.g., 2, 3, or 4), and due dates tied to academic milestones.
- **Payment Logging Terminal**: Record cash, bank transfer, card, or voucher payments with immediate receipt generation.

### Screen 8: Academy Settings & Academic Catalog (`EducationSettingsView`)
- **Room & Lab Catalog**: Configure room names, max capacities, and audiovisual capabilities.
- **Grading Scale Customization**: Define letter thresholds (e.g., A = 90-100%, B = 80-89%, etc.).
- **Certificate Template Designer**: Configure school branding, signatory title, and seal.

---

## 4. Technical Architecture & Data Strategy

### System Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATRIUM CLIENT ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────┤
│                           App.tsx (Router)                             │
│     │ (Category: 'education_cohort')                                   │
│     ├── EducationDashboardView    (Academy pulse & today's roll call)  │
│     ├── EducationTimetableView    (Weekly matrix & room allocator)     │
│     ├── EducationStudentsView     (360° student directory & drawer)    │
│     ├── EducationCohortsView      (Course syllabi & cohort rosters)    │
│     ├── EducationAdmissionsView   (Prospect intake & trial funnel)     │
│     ├── EducationAttendanceView   (High-speed roll call & gradebook)   │
│     ├── EducationFinanceView      (Installments, aging AR & receipts)  │
│     └── EducationSettingsView     (Rooms, terms & certificate issuer)  │
├────────────────────────────────────────────────────────────────────────┤
│                          STATE MANAGEMENT                              │
│                    useAtriumStore() in store.ts                        │
│     ├── students[]           : StudentRecord[]                         │
│     ├── courses[]            : CourseProgram[]                         │
│     ├── cohorts[]            : CohortSession[]                         │
│     ├── timetableSlots[]     : TimetableSlot[]                         │
│     ├── attendanceRecords[]  : AttendanceRecord[]                      │
│     ├── gradeEntries[]       : GradeEntry[]                            │
│     ├── tuitionPlans[]       : TuitionInstallmentPlan[]                │
│     ├── certificates[]       : IssuedCertificate[]                     │
│     └── classrooms[]         : ClassroomResource[]                     │
├────────────────────────────────────────────────────────────────────────┤
│                    PERSISTENCE & SYNC (SUPABASE)                       │
│    Local Cache (IndexedDB/Storage) <───> Supabase PostgreSQL / RLS     │
│    educationService.ts (CRUD, Bulk Roll Call, Tranche Reminders)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Entities (TypeScript Specification)

```typescript
// 1. Student Record with Guardian & Enrollment Linkage
export interface StudentRecord {
  id: string;
  facilityId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  status: 'Active' | 'Enrolled' | 'On Leave' | 'Graduated' | 'Withdrawn';
  currentCohortId?: string;
  attendanceRate: number; // e.g. 94.5%
  tuitionStatus: 'Paid' | 'Partial' | 'Overdue';
  avatarUrl?: string;
  enrollmentDate: string;
  notes?: string;
}

// 2. Course Program (Template for Cohorts)
export interface CourseProgram {
  id: string;
  facilityId: string;
  code: string; // e.g. "PY-101"
  name: string; // e.g. "Full-Stack Python Bootcamp"
  category: 'Tech' | 'Language' | 'Vocational' | 'Tutoring' | 'Arts' | 'Driving';
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  durationWeeks: number;
  totalHours: number;
  baseTuition: number;
  syllabusModules: { title: string; hours: number }[];
}

// 3. Concrete Cohort Instance
export interface CohortSession {
  id: string;
  courseId: string;
  facilityId: string;
  cohortCode: string; // e.g. "PY-2026-OCT"
  name: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  enrolledCount: number;
  instructorId: string;
  instructorName: string;
  classroomId: string;
  classroomName: string;
  status: 'Enrolling' | 'In Progress' | 'Exam Week' | 'Completed' | 'Archived';
  tuitionAmount: number;
}

// 4. Timetable Scheduled Slot
export interface TimetableSlot {
  id: string;
  facilityId: string;
  cohortId: string;
  cohortName: string;
  instructorId: string;
  instructorName: string;
  classroomId: string;
  classroomName: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
  startTime: string; // "09:00"
  endTime: string;   // "11:30"
  subjectTopic?: string;
  isRecurring: boolean;
}

// 5. Attendance Roll Call Record
export interface AttendanceRecord {
  id: string;
  sessionId: string;
  cohortId: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  minutesLate?: number;
  instructorNotes?: string;
  recordedBy: string;
  recordedAt: string;
}

// 6. Tuition Installment Plan
export interface TuitionInstallmentPlan {
  id: string;
  studentId: string;
  cohortId: string;
  totalTuition: number;
  depositAmount: number;
  depositPaid: boolean;
  tranches: {
    id: string;
    title: string; // "Deposit", "Term 1 Tranche", "Final Exam Tranche"
    amount: number;
    dueDate: string;
    status: 'Pending' | 'Paid' | 'Overdue';
    paidAt?: string;
    receiptNumber?: string;
    paymentMethod?: 'Card' | 'Cash' | 'Bank Transfer' | 'Voucher';
  }[];
}

// 7. Academic Evaluation & Grade Entry
export interface GradeEntry {
  id: string;
  cohortId: string;
  studentId: string;
  assessmentTitle: string; // "Project 1: API", "Midterm Oral Exam"
  assessmentType: 'Quiz' | 'Homework' | 'Project' | 'Exam' | 'Participation';
  weight: number; // e.g. 25%
  score: number;  // e.g. 88
  maxScore: number; // 100
  letterGrade?: string;
  feedback?: string;
}

// 8. Issued Official Certificate
export interface IssuedCertificate {
  id: string;
  certificateNumber: string; // e.g. "ATRIUM-CERT-2026-9812"
  studentId: string;
  studentName: string;
  courseName: string;
  cohortCode: string;
  issueDate: string;
  gradeAverage: number;
  verificationHash: string;
  signatoryName: string;
  signatoryTitle: string;
}
```

---

## 5. Visual Styling & Design System Rules

In compliance with the Universal Frontend Design Constitution:
- **Zero-Pill Discipline**:
  - Metadata such as cohort codes (`PY-2026-OCT`), dates (`Oct 15 — Dec 18`), and class schedules are rendered with clean typographic separation (`·` / `/`), avoiding nested colorful pill capsules.
  - Interactive status badges use subtle status dots (`bg-emerald-500`, `bg-amber-500`, `bg-rose-500`) with legible uppercase caption typography.
- **Color Palette & Atmosphere**:
  - Primary Base: Deep Academic Navy (`#0F172A`) and warm ivory desktop container (`#F8FAFC`).
  - Accent Color: Terracotta / Amber Scholar (`#D97706` / `#F59E0B`) communicating prestige, scholarship, and focus.
  - High Contrast Dark Mode: `#18181B` container background with `#27272A` borders.
- **Typography Hierarchy**:
  - Display headers: Medium-weight geometric sans-serif for numbers and cohort identifiers.
  - Table cells: Tabular lining figures (`font-mono` / `tabular-nums`) for grades, attendance rates, and tuition figures.
- **Layout Math**:
  - Desktop baseline layout at 1440px with responsive collapse for tablet roll calls.
  - $r_{\text{inner}} = r_{\text{outer}} - \text{padding}$ geometry for classroom and student cards.

---

## 6. Implementation Phasing Strategy

Once approved by the user, the execution will follow 3 structured milestones:

1. **Milestone 1: State, Types & Mock Data Foundation**:
   - Add TypeScript schemas (`StudentRecord`, `CohortSession`, `TimetableSlot`, `AttendanceRecord`, `TuitionInstallmentPlan`, `GradeEntry`, `IssuedCertificate`) to `/src/types/index.ts`.
   - Seed realistic academy data in `/src/services/seedData.ts` (1 Coding Bootcamp cohort, 1 Language Institute cohort, 1 Tutoring cohort with students, timetable, and attendance).
   - Wire state hooks and actions into `/src/services/store.ts`.

2. **Milestone 2: Navigation & Screen Construction**:
   - Update `Sidebar.tsx` to mount the dedicated Education & Training dock items.
   - Build `EducationDashboardView`, `EducationTimetableView`, `EducationStudentsView`, `EducationCohortsView`, `EducationAttendanceView`, and `EducationFinanceView`.
   - Update `App.tsx` routing switch to render the views when `category === 'education_cohort'`.

3. **Milestone 3: Interactive Workstations & Certification**:
   - Implement the interactive 1-click Roll Call modal with live attendance rate computation.
   - Implement the Student 360° Drawer with Guardian contact and tuition history.
   - Implement the Certificate PDF Generation preview modal.
   - Verify compilation, linting, and responsive UI behavior.

---

> [!NOTE]
> This completes the comprehensive specification of the basic and advanced features and screens for the **Education & Training** category. Please review the plan above and select **Proceed** when ready to begin coding!

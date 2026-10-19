import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  MapPin,
  Clock,
  Plus,
  X,
  CheckCircle2,
  Circle,
  DollarSign,
  ChevronRight,
  Trash2,
  Edit3,
  Check,
  Eye,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { CohortStatus, EduCohort } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { ActionNode } from '../../ui/ActionNode';

type CourseCat = 'All' | 'Language' | 'Technology' | 'Academic' | 'Arts';

export const EducationCohortsView: React.FC = () => {
  const {
    eduCohorts,
    eduCourses,
    eduClassrooms,
    eduEnrollments,
    eduStudents,
    staff,
    addEduCohort,
    updateEduCohort,
    deleteEduCohort,
  } = useAtriumStore();

  const [categoryFilter, setCategoryFilter] = useState<CourseCat>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<EduCohort | null>(null);
  const [isAddCohortModalOpen, setIsAddCohortModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    courseId: eduCourses[0]?.id || '',
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    maxStudents: 20,
    instructorId: staff[0]?.id || '',
    classroomId: eduClassrooms[0]?.id || '',
    scheduleSummary: 'Mon & Wed 18:00 - 20:00',
    tuitionFee: 35000,
    status: 'Enrolling' as CohortStatus,
  });

  const filteredCohorts = eduCohorts.filter((c) => {
    if (categoryFilter !== 'All') {
      const course = eduCourses.find((co) => co.id === c.courseId);
      if (course?.category !== categoryFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = c.name.toLowerCase().includes(q);
      const matchesCode = (c.cohortCode || '').toLowerCase().includes(q);
      const matchesInstructor = (c.instructorName || '').toLowerCase().includes(q);
      const matchesCourse = (c.courseTitle || '').toLowerCase().includes(q);
      if (!matchesName && !matchesCode && !matchesInstructor && !matchesCourse) return false;
    }
    return true;
  });

  const totalSeats = eduCohorts.reduce((sum, c) => sum + c.maxStudents, 0);
  const totalEnrolled = eduCohorts.reduce((sum, c) => sum + c.enrolledCount, 0);
  const globalOccupancy = totalSeats > 0 ? Math.round((totalEnrolled / totalSeats) * 100) : 0;

  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    const course = eduCourses.find((co) => co.id === formData.courseId);
    const room = eduClassrooms.find((r) => r.id === formData.classroomId);
    const instructor = staff.find((s) => s.id === formData.instructorId);

    if (!course) return;

    const newCohort = addEduCohort({
      courseId: course.id,
      courseTitle: course.title,
      instructorId: instructor?.id || staff[0]?.id || 'staff_01',
      instructorName: instructor?.fullName || staff[0]?.fullName || 'Instructor',
      classroomId: room?.id,
      classroomName: room?.name,
      name: formData.name || `${course.title} - Batch 01`,
      startDate: formData.startDate,
      endDate: formData.endDate,
      maxStudents: formData.maxStudents,
      tuitionFee: formData.tuitionFee,
      currency: 'DZD',
      scheduleSummary: formData.scheduleSummary,
      status: formData.status,
      syllabusMilestones: [
        { title: 'Orientation & Core Fundamentals', completed: true },
        { title: 'Intermediate Hands-on Labs & Projects', completed: false },
        { title: 'Midterm Evaluation & Progress Reviews', completed: false },
        { title: 'Final Capstone Project & Certification', completed: false },
      ],
    });

    setSelectedCohort(newCohort);
    setIsAddCohortModalOpen(false);
  };

  const handleToggleMilestone = (cohortId: string, milestoneIndex: number) => {
    const cohort = eduCohorts.find((c) => c.id === cohortId);
    if (!cohort || !cohort.syllabusMilestones) return;

    const updated = cohort.syllabusMilestones.map((m, idx) =>
      idx === milestoneIndex ? { ...m, completed: !m.completed } : m
    );

    updateEduCohort(cohortId, { syllabusMilestones: updated });
    if (selectedCohort?.id === cohortId) {
      setSelectedCohort({
        ...selectedCohort,
        syllabusMilestones: updated,
      });
    }
  };

  const cohortEnrolledStudents = selectedCohort
    ? eduEnrollments
        .filter((e) => e.cohortId === selectedCohort.id)
        .map((e) => {
          const student = eduStudents.find((s) => s.id === e.studentId);
          return { enrollment: e, student };
        })
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Cohorts, Courses & Syllabi
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {eduCohorts.length} active batches · {eduCourses.length} syllabus courses
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Curriculum progression, seat occupancy tracking, syllabus milestones, and cohort deep-dives
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddCohortModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>Create New Cohort</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Active Cohort Batches
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {eduCohorts.length}
            </span>
            <span className="text-xs text-neutral-500">running terms</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Seat Occupancy Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {globalOccupancy}%
            </span>
            <span className="text-xs text-neutral-500">{totalEnrolled} / {totalSeats} seats</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Total Enrolled Students
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {totalEnrolled}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">in cohorts</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Course Catalog
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {eduCourses.length}
            </span>
            <span className="text-xs text-neutral-500">accredited curricula</span>
          </div>
        </div>
      </div>

      {/* Search & Segmented Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search cohorts by name, code, instructor..."
          shutSize={36}
          openWidth={260}
        />

        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'All', label: 'All Categories' },
            { id: 'Language', label: 'Languages' },
            { id: 'Technology', label: 'Technology & Code' },
            { id: 'Academic', label: 'Academic & BAC' },
            { id: 'Arts', label: 'Arts & Music' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id as CourseCat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cohort Cards Grid with ActionNode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCohorts.map((cohort) => {
          const occupancyPercent = Math.min(
            100,
            Math.round((cohort.enrolledCount / cohort.maxStudents) * 100)
          );
          const isSelected = selectedCohort?.id === cohort.id;

          const cohortEnrollments = eduEnrollments.filter((e) => e.cohortId === cohort.id);
          const studentAvatars = cohortEnrollments.map((enr) => {
            const student = eduStudents.find((s) => s.id === enr.studentId);
            return {
              id: enr.id,
              name: student?.fullName || enr.studentName,
              color: '#C4785A',
            };
          });

          return (
            <ActionNode
              key={cohort.id}
              title={cohort.name}
              description={`${cohort.courseTitle} · ${cohort.scheduleSummary}`}
              tag={`${cohort.cohortCode || 'COHORT'} · ${cohort.status}`}
              selected={isSelected}
              onClick={() => setSelectedCohort(cohort)}
              width="100%"
              air={16}
              corner={20}
              avatars={studentAvatars}
              moreAvatarsCount={
                cohort.enrolledCount > studentAvatars.length
                  ? cohort.enrolledCount - studentAvatars.length
                  : undefined
              }
              actions={[
                {
                  id: 'inspect',
                  label: 'Inspect Cohort',
                  icon: <Eye size={14} />,
                  onClick: () => setSelectedCohort(cohort),
                },
                {
                  id: 'edit',
                  label: 'Edit Cohort',
                  icon: <Edit3 size={14} />,
                  onClick: () => {
                    setSelectedCohort(cohort);
                  },
                },
                {
                  id: 'delete',
                  label: 'Delete Cohort',
                  icon: <Trash2 size={14} />,
                  onClick: () => {
                    if (confirm(`Delete cohort ${cohort.name}?`)) {
                      deleteEduCohort(cohort.id);
                    }
                  },
                },
              ]}
            >
              <div className="space-y-2 mt-2 pt-2 border-t border-[#EDF1F3] dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-neutral-400" />
                    <span>{cohort.startDate} — {cohort.endDate}</span>
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                    {formatMoney(cohort.tuitionFee)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>{cohort.enrolledCount} of {cohort.maxStudents} Seats</span>
                  <span className="text-[#C4785A] font-bold tabular-nums">{occupancyPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-[#C4785A] rounded-full transition-all"
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
              </div>
            </ActionNode>
          );
        })}
      </div>

      {/* 360° Cohort Slide-over Drawer */}
      {selectedCohort && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#18181B] h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#C4785A] uppercase tracking-wider block">
                  Cohort 360° Deep Dive
                </span>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedCohort.name}
                </h2>
                <p className="text-xs text-neutral-500">
                  {selectedCohort.courseTitle} · {selectedCohort.scheduleSummary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCohort(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-[#EDF1F3] dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block uppercase font-medium">Instructor</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedCohort.instructorName}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-[#EDF1F3] dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block uppercase font-medium">Classroom</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedCohort.classroomName || 'Room 1'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-[#EDF1F3] dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block uppercase font-medium">Tuition Fee</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {formatMoney(selectedCohort.tuitionFee)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-[#EDF1F3] dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block uppercase font-medium">Seats Filled</span>
                  <span className="font-semibold text-[#C4785A]">
                    {selectedCohort.enrolledCount} / {selectedCohort.maxStudents} ({Math.round((selectedCohort.enrolledCount / selectedCohort.maxStudents) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Syllabus Milestones */}
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-2.5">
                  Syllabus Milestones & Progress
                </h3>
                <div className="space-y-2">
                  {selectedCohort.syllabusMilestones?.map((milestone, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleToggleMilestone(selectedCohort.id, idx)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        milestone.completed
                          ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <button
                        type="button"
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          milestone.completed
                            ? 'bg-emerald-600 text-white'
                            : 'border border-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        {milestone.completed && <Check size={12} />}
                      </button>
                      <div className="min-w-0">
                        <span
                          className={`font-semibold text-xs block ${
                            milestone.completed
                              ? 'text-neutral-500 dark:text-neutral-400 line-through'
                              : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {milestone.title}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {milestone.completed ? 'Milestone Cleared' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrolled Students Roster */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Enrolled Students Roster ({cohortEnrolledStudents.length})
                  </h3>
                </div>

                {cohortEnrolledStudents.length === 0 ? (
                  <p className="text-neutral-400 italic">No students enrolled yet in this cohort.</p>
                ) : (
                  <div className="space-y-1.5">
                    {cohortEnrolledStudents.map(({ enrollment, student }) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900"
                      >
                        <div>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                            {enrollment.studentName}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {student?.phone || 'No phone'} · Paid: {formatMoney(enrollment.paidAmount)}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            enrollment.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {enrollment.paymentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Cohort Modal */}
      {isAddCohortModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Create New Cohort Batch
              </h2>
              <button
                type="button"
                onClick={() => setIsAddCohortModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCohort} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Course Curriculum *
                </label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                >
                  {eduCourses.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.title} ({co.category})
                    </option>
                  ))}
                </select>
              </div>

              <LabelInput
                field="CohortName"
                label="Cohort Name / Batch Title *"
                required
                value={formData.name}
                onChange={(val) => setFormData({ ...formData, name: val?.target?.value ?? val })}
                placeholder="e.g. Full-Stack Dev - Autumn Batch"
                width="100%"
                height={46}
                corner={14}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Instructor
                  </label>
                  <select
                    value={formData.instructorId}
                    onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Assigned Classroom
                  </label>
                  <select
                    value={formData.classroomId}
                    onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    {eduClassrooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Cap: {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="StartDate"
                  label="Start Date *"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(val) => setFormData({ ...formData, startDate: val?.target?.value ?? val })}
                  width="100%"
                  height={46}
                  corner={14}
                />
                <LabelInput
                  field="EndDate"
                  label="End Date *"
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(val) => setFormData({ ...formData, endDate: val?.target?.value ?? val })}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="TuitionFee"
                  label="Tuition Fee (DZD) *"
                  type="number"
                  required
                  value={formData.tuitionFee}
                  onChange={(val) => setFormData({ ...formData, tuitionFee: Number(val?.target?.value ?? val) })}
                  width="100%"
                  height={46}
                  corner={14}
                />
                <LabelInput
                  field="SeatLimit"
                  label="Seat Limit *"
                  type="number"
                  required
                  value={formData.maxStudents}
                  onChange={(val) => setFormData({ ...formData, maxStudents: Number(val?.target?.value ?? val) })}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              <LabelInput
                field="ScheduleSummary"
                label="Schedule Summary"
                value={formData.scheduleSummary}
                onChange={(val) => setFormData({ ...formData, scheduleSummary: val?.target?.value ?? val })}
                placeholder="e.g. Sat & Tue 14:00 - 16:30"
                width="100%"
                height={46}
                corner={14}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddCohortModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Create Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
